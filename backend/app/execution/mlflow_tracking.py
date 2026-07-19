"""Thin wrapper over `MlflowClient` for the operations `SandboxExecutor`
needs: auto-creating experiments/runs, logging params/metrics/artifacts, and
terminating a run. Kept separate from the raw client so the rest of the
execution platform depends on this small interface, not the MLflow SDK
directly.
"""

from app.config.mlflow_client import get_mlflow_client


class MLflowTrackingService:
    def __init__(self) -> None:
        self.client = get_mlflow_client()

    def get_or_create_experiment(self, name: str) -> str:
        experiment = self.client.get_experiment_by_name(name)
        if experiment is not None:
            return experiment.experiment_id
        return self.client.create_experiment(name)

    def start_run(self, experiment_id: str, run_name: str, tags: dict[str, str]) -> str:
        run = self.client.create_run(experiment_id, tags=tags, run_name=run_name)
        return run.info.run_id

    def log_params(self, run_id: str, params: dict[str, object]) -> None:
        for key, value in params.items():
            # MLflow param values are strings; truncate defensively since
            # backend stores commonly cap param values around 6000 chars.
            self.client.log_param(run_id, key, str(value)[:6000])

    def log_metrics(self, run_id: str, metrics: dict[str, float], step: int) -> None:
        for key, value in metrics.items():
            try:
                self.client.log_metric(run_id, key, float(value), step=step)
            except (TypeError, ValueError):
                continue  # non-numeric metric value; skip rather than fail the whole run

    def log_artifact(self, run_id: str, local_path: str, artifact_path: str | None = None) -> None:
        self.client.log_artifact(run_id, local_path, artifact_path=artifact_path)

    def log_artifacts(self, run_id: str, local_dir: str, artifact_path: str | None = None) -> None:
        self.client.log_artifacts(run_id, local_dir, artifact_path=artifact_path)

    def end_run(self, run_id: str, status: str) -> None:
        self.client.set_terminated(run_id, status=status)
