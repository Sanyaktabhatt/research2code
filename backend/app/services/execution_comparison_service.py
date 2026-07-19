import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.execution_run import ExecutionRun
from app.models.user import User, UserRole
from app.repositories.execution_run_repository import ExecutionRunRepository
from app.repositories.paper_repository import PaperRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.execution import ComparisonRequest, ComparisonResult, MetricDiff, ParameterDiff
from app.utils.exceptions import ExecutionRunNotFoundError, PaperNotFoundError, PermissionDeniedError


class ExecutionComparisonService:
    """Compares multiple execution runs' hyperparameters and metrics.

    Diffs are computed from the compact `params_snapshot`/`metrics_summary`
    stored on each `ExecutionRun` row rather than re-querying MLflow, so
    comparisons stay fast even across many runs.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.execution_repository = ExecutionRunRepository(session)
        self.paper_repository = PaperRepository(session)
        self.project_repository = ProjectRepository(session)

    async def compare(self, request: ComparisonRequest, owner: User) -> ComparisonResult:
        runs = await self.execution_repository.list_by_ids(request.execution_run_ids)
        found_ids = {run.id for run in runs}
        missing = [str(run_id) for run_id in request.execution_run_ids if run_id not in found_ids]
        if missing:
            raise ExecutionRunNotFoundError(", ".join(missing))

        await self._verify_ownership(runs, owner)

        # Preserve the caller's requested order in the response.
        runs_by_id = {run.id: run for run in runs}
        ordered_runs = [runs_by_id[run_id] for run_id in request.execution_run_ids]

        parameter_diffs = self._diff_params(ordered_runs)
        metric_diffs = self._diff_metrics(ordered_runs)
        best_run_id, best_metric, best_value = self._pick_best(
            ordered_runs, metric_diffs, request.primary_metric, request.higher_is_better
        )

        return ComparisonResult(
            execution_run_ids=request.execution_run_ids,
            parameter_diffs=parameter_diffs,
            metric_diffs=metric_diffs,
            best_run_id=best_run_id,
            best_metric=best_metric,
            best_value=best_value,
        )

    def _diff_params(self, runs: list[ExecutionRun]) -> list[ParameterDiff]:
        all_keys: set[str] = set()
        for run in runs:
            all_keys.update((run.params_snapshot or {}).keys())

        diffs = []
        for key in sorted(all_keys):
            values = {str(run.id): _stringify((run.params_snapshot or {}).get(key)) for run in runs}
            distinct_values = {value for value in values.values()}
            diffs.append(ParameterDiff(key=key, values=values, differs=len(distinct_values) > 1))
        return diffs

    def _diff_metrics(self, runs: list[ExecutionRun]) -> list[MetricDiff]:
        all_keys: set[str] = set()
        for run in runs:
            all_keys.update((run.metrics_summary or {}).keys())

        diffs = []
        for key in sorted(all_keys):
            values: dict[str, float | None] = {}
            for run in runs:
                raw_value = (run.metrics_summary or {}).get(key)
                values[str(run.id)] = float(raw_value) if isinstance(raw_value, (int, float)) else None

            distinct_values = {value for value in values.values() if value is not None}
            diffs.append(MetricDiff(key=key, values=values, differs=len(distinct_values) > 1))
        return diffs

    def _pick_best(
        self,
        runs: list[ExecutionRun],
        metric_diffs: list[MetricDiff],
        primary_metric: str | None,
        higher_is_better: bool,
    ) -> tuple[uuid.UUID | None, str | None, float | None]:
        metric_key = primary_metric
        if metric_key is None:
            # Best-effort fallback: the first metric every run actually
            # reported. `metrics_summary` mixes real training metrics with
            # infra telemetry (elapsed time, CPU%, ...), so passing
            # `primary_metric` explicitly is strongly recommended over
            # relying on this auto-detection.
            for diff in metric_diffs:
                if all(value is not None for value in diff.values.values()):
                    metric_key = diff.key
                    break

        if metric_key is None:
            return None, None, None

        candidates = {
            run.id: (run.metrics_summary or {}).get(metric_key)
            for run in runs
            if isinstance((run.metrics_summary or {}).get(metric_key), (int, float))
        }
        if not candidates:
            return None, metric_key, None

        best_id = (
            max(candidates, key=lambda run_id: candidates[run_id])
            if higher_is_better
            else min(candidates, key=lambda run_id: candidates[run_id])
        )
        return best_id, metric_key, float(candidates[best_id])

    async def _verify_ownership(self, runs: list[ExecutionRun], owner: User) -> None:
        """Batch equivalent of resolving each run's paper -> project and
        checking ownership one at a time (an O(n) round-trip pattern for an
        n-run comparison) - two queries total instead of 2n."""
        paper_ids = list({run.paper_id for run in runs})
        papers = await self.paper_repository.list_by_ids(paper_ids)
        papers_by_id = {paper.id: paper for paper in papers}

        missing_paper_ids = set(paper_ids) - papers_by_id.keys()
        if missing_paper_ids:
            raise PaperNotFoundError(next(iter(missing_paper_ids)))

        project_ids = list({paper.project_id for paper in papers})
        projects = await self.project_repository.list_by_ids(project_ids)
        projects_by_id = {project.id: project for project in projects}

        is_admin = owner.role == UserRole.ADMIN
        for run in runs:
            project = projects_by_id.get(papers_by_id[run.paper_id].project_id)
            if project is None or (project.owner_id != owner.id and not is_admin):
                raise PermissionDeniedError("You do not have access to one or more of these execution runs")


def _stringify(value: object) -> str | None:
    return None if value is None else str(value)
