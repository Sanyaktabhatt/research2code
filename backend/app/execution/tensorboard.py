"""TensorBoard log-directory management.

Rather than spinning up one TensorBoard server process per run (heavyweight,
port-management overhead), a single long-lived TensorBoard instance (see the
`tensorboard` service in docker-compose.yml) serves a shared root log
directory; each run gets its own subdirectory under it, auto-discovered by
TensorBoard's directory watcher. Execution containers mount that
subdirectory directly at their `runs/` path (matching the generated
project's own `TensorBoardLogger` convention), so training writes land
straight into the shared, host-visible directory with no extra sync step.
"""

import os

from app.config.settings import settings


def prepare_run_log_dir(execution_run_id: str) -> tuple[str, str]:
    """Creates the run's TensorBoard log directory.

    Returns `(worker_path, host_path)`: `worker_path` is what this process
    uses to create the directory; `host_path` is what must be passed as the
    bind-mount source when starting the sibling container (see the
    Docker-outside-of-Docker note in `app.config.settings`).
    """
    worker_path = os.path.join(settings.TENSORBOARD_LOG_ROOT, execution_run_id)
    os.makedirs(worker_path, exist_ok=True)

    host_path = os.path.join(settings.tensorboard_host_log_root, execution_run_id)
    return worker_path, host_path


def get_tensorboard_url(execution_run_id: str) -> str:
    """Deep link into the shared TensorBoard instance, filtered to this run.

    TensorBoard's UI accepts a `regexInput` hash param to filter the run list
    by name; since each run's subdirectory is named after its own id, this
    reliably scopes the view to just this run.
    """
    return f"{settings.TENSORBOARD_BASE_URL}/#scalars&regexInput={execution_run_id}"
