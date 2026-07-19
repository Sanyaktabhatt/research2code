import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.redis_config import redis_client
from app.execution.celery_tasks import execute_run_task
from app.execution.tensorboard import get_tensorboard_url
from app.models.execution_run import ExecutionRun, ExecutionRunStatus
from app.models.generated_project import GeneratedProjectStatus
from app.models.paper import Paper
from app.models.user import User
from app.repositories.execution_run_repository import ExecutionRunRepository
from app.repositories.generated_project_repository import GeneratedProjectRepository
from app.repositories.paper_repository import PaperRepository
from app.schemas.execution import TriggerExecutionRequest
from app.services.project_service import ProjectService
from app.storage.file_storage import generate_presigned_url
from app.utils.exceptions import (
    ExecutionRunNotCancellableError,
    ExecutionRunNotFoundError,
    GeneratedProjectNotFoundError,
    GeneratedProjectNotReadyError,
    PaperNotFoundError,
)

_CANCEL_KEY_PREFIX = "execution:cancel:"


class ExecutionService:
    """Triggers, tracks, and manages one `GeneratedProject`'s execution runs.

    Unlike code generation, there is no orchestrator gate here - a direct
    REST trigger is the natural, expected entry point for "run this
    project", so `trigger_run` is exposed straight through the API.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.execution_repository = ExecutionRunRepository(session)
        self.project_repository = GeneratedProjectRepository(session)
        self.paper_repository = PaperRepository(session)
        self.project_service = ProjectService(session)

    async def trigger_run(
        self, generated_project_id: uuid.UUID, owner: User, request: TriggerExecutionRequest
    ) -> ExecutionRun:
        project = await self.project_repository.get_by_id(generated_project_id)
        if project is None:
            raise GeneratedProjectNotFoundError(generated_project_id)

        await self._get_owned_paper(project.paper_id, owner)

        if project.status != GeneratedProjectStatus.COMPLETED or not project.storage_key:
            raise GeneratedProjectNotReadyError(generated_project_id)

        next_version = await self.execution_repository.get_latest_version_number(generated_project_id) + 1
        run = ExecutionRun(
            generated_project_id=generated_project_id,
            paper_id=project.paper_id,
            version=next_version,
            device=request.device,
        )
        run = await self.execution_repository.create(run)
        await self.session.commit()

        execute_run_task.delay(str(run.id))
        return run

    async def cancel_run(self, execution_run_id: uuid.UUID, owner: User) -> ExecutionRun:
        run = await self._get_owned_run(execution_run_id, owner)

        if run.status == ExecutionRunStatus.QUEUED:
            run.status = ExecutionRunStatus.CANCELLED
            await self.session.commit()
            # Belt-and-braces: also set the flag in case the worker picks the
            # task up between this check and the commit above.
            await redis_client.set(f"{_CANCEL_KEY_PREFIX}{execution_run_id}", "1", ex=86400)
            return run

        if run.status == ExecutionRunStatus.RUNNING:
            # The task itself observes this flag and transitions the status
            # to CANCELLED once it has actually stopped the container -
            # cancellation of a live run is inherently asynchronous.
            await redis_client.set(f"{_CANCEL_KEY_PREFIX}{execution_run_id}", "1", ex=86400)
            return run

        raise ExecutionRunNotCancellableError(execution_run_id)

    async def get_by_id(self, execution_run_id: uuid.UUID, owner: User) -> ExecutionRun:
        return await self._get_owned_run(execution_run_id, owner)

    async def get_latest(self, generated_project_id: uuid.UUID, owner: User) -> ExecutionRun:
        await self._get_owned_project(generated_project_id, owner)

        run = await self.execution_repository.get_latest(generated_project_id)
        if run is None:
            raise ExecutionRunNotFoundError(generated_project_id)
        return run

    async def get_version(
        self, generated_project_id: uuid.UUID, version: int, owner: User
    ) -> ExecutionRun:
        await self._get_owned_project(generated_project_id, owner)

        run = await self.execution_repository.get_by_project_and_version(generated_project_id, version)
        if run is None:
            raise ExecutionRunNotFoundError(f"{generated_project_id} (version {version})")
        return run

    async def list_versions(self, generated_project_id: uuid.UUID, owner: User) -> list[ExecutionRun]:
        await self._get_owned_project(generated_project_id, owner)
        return await self.execution_repository.list_by_project(generated_project_id)

    async def list_recent(
        self, owner: User, limit: int, statuses: list[ExecutionRunStatus] | None = None
    ) -> list[ExecutionRun]:
        """Cross-project recent execution runs for the dashboard's "Recent
        experiment runs" / "Running jobs" widgets."""
        return await self.execution_repository.list_recent_for_owner(owner.id, limit, statuses)

    async def get_log_download_url(self, execution_run_id: uuid.UUID, owner: User) -> str:
        run = await self._get_owned_run(execution_run_id, owner)
        if not run.log_storage_key:
            raise ExecutionRunNotFoundError(execution_run_id)
        return await generate_presigned_url(run.log_storage_key)

    async def get_tensorboard_url_for_run(self, execution_run_id: uuid.UUID, owner: User) -> str:
        run = await self._get_owned_run(execution_run_id, owner)
        return get_tensorboard_url(str(run.id))

    async def _get_owned_run(self, execution_run_id: uuid.UUID, owner: User) -> ExecutionRun:
        run = await self.execution_repository.get_by_id(execution_run_id)
        if run is None:
            raise ExecutionRunNotFoundError(execution_run_id)

        await self._get_owned_paper(run.paper_id, owner)
        return run

    async def _get_owned_project(self, generated_project_id: uuid.UUID, owner: User):
        project = await self.project_repository.get_by_id(generated_project_id)
        if project is None:
            raise GeneratedProjectNotFoundError(generated_project_id)

        await self._get_owned_paper(project.paper_id, owner)
        return project

    async def _get_owned_paper(self, paper_id: uuid.UUID, owner: User) -> Paper:
        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None:
            raise PaperNotFoundError(paper_id)

        await self.project_service.get_project(paper.project_id, owner)
        return paper
