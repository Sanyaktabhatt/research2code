"""Abstract execution-backend interface.

`DockerExecutionBackend` (see `app.execution.docker_runner`) is the only
concrete implementation today. A future Kubernetes Job runner or a managed
cloud-training backend can be added by implementing `ExecutionBackend` -
nothing above this layer (`SandboxExecutor`, the Celery task, the service
layer) depends on Docker specifically.
"""

from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass, field


@dataclass
class MountSpec:
    """A single bind mount. `host_path` must already be resolved to whatever
    path the *backend* (not necessarily the caller) needs to see it at - for
    Docker-outside-of-Docker that's the real host filesystem path.
    """

    host_path: str
    container_path: str
    read_only: bool = False


@dataclass
class RunSpec:
    """Backend-agnostic description of one execution."""

    build_context: str
    command: list[str] | None
    env: dict[str, str] = field(default_factory=dict)
    mounts: list[MountSpec] = field(default_factory=list)
    device: str = "cpu"  # "cpu" | "gpu"
    cpu_limit: float = 2.0
    memory_limit_mb: int = 4096
    network_disabled: bool = False
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class RunHandle:
    """Opaque pointer to a started run; only the backend that created it
    knows how to interpret `external_id`.
    """

    backend: str
    external_id: str


@dataclass
class ResourceUsage:
    cpu_percent: float | None = None
    memory_mb: float | None = None
    memory_limit_mb: float | None = None
    gpu_utilization_percent: float | None = None
    gpu_memory_mb: float | None = None
    disk_usage_percent: float | None = None


class ExecutionBackend(ABC):
    @abstractmethod
    def build_and_start(self, spec: RunSpec) -> RunHandle: ...

    @abstractmethod
    def stream_logs(self, handle: RunHandle) -> Iterator[str]:
        """Yields decoded stdout/stderr chunks as they arrive, blocking
        until the run produces more output or exits.
        """

    @abstractmethod
    def wait(self, handle: RunHandle, timeout_seconds: int | None = None) -> int:
        """Blocks until the run finishes; returns its exit code."""

    @abstractmethod
    def get_resource_usage(self, handle: RunHandle) -> ResourceUsage: ...

    @abstractmethod
    def stop(self, handle: RunHandle) -> None: ...

    @abstractmethod
    def is_running(self, handle: RunHandle) -> bool: ...
