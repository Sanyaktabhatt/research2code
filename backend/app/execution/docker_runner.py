import logging
from collections.abc import Iterator

import docker
from docker.errors import NotFound
from docker.types import DeviceRequest, Mount

from app.config.settings import settings
from app.execution.backends import ExecutionBackend, ResourceUsage, RunHandle, RunSpec

logger = logging.getLogger(__name__)


class DockerExecutionBackend(ExecutionBackend):
    """Runs a generated project inside an isolated Docker container.

    Builds the project's own Dockerfile (already produced by the Code
    Generation Engine) as the image, then runs it detached with hardened
    defaults: all capabilities dropped, no privilege escalation, and
    (optionally) networking disabled. GPU support is opt-in per run via
    `RunSpec.device`.

    This talks to the Docker daemon over its socket - when the worker
    process itself runs inside a container (Docker-outside-of-Docker), the
    mount sources in `RunSpec.mounts` must already be host-visible paths;
    see `app.config.settings` and `SandboxExecutor` for how those are
    resolved.
    """

    def __init__(self, client: docker.DockerClient | None = None) -> None:
        if client is not None:
            self.client = client
        elif settings.DOCKER_HOST:
            self.client = docker.DockerClient(base_url=settings.DOCKER_HOST)
        else:
            self.client = docker.from_env()

    def build_and_start(self, spec: RunSpec) -> RunHandle:
        image, _build_logs = self.client.images.build(
            path=spec.build_context,
            rm=True,
            forcerm=True,
        )

        mounts = [
            Mount(target=mount.container_path, source=mount.host_path, type="bind", read_only=mount.read_only)
            for mount in spec.mounts
        ]

        device_requests = []
        if spec.device == "gpu":
            device_requests.append(DeviceRequest(count=-1, capabilities=[["gpu"]]))

        container = self.client.containers.run(
            image.id,
            command=spec.command,
            detach=True,
            environment=spec.env,
            mounts=mounts,
            device_requests=device_requests,
            nano_cpus=int(spec.cpu_limit * 1_000_000_000),
            mem_limit=f"{spec.memory_limit_mb}m",
            network_disabled=spec.network_disabled,
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            labels=spec.labels,
        )
        return RunHandle(backend="docker", external_id=container.id)

    def stream_logs(self, handle: RunHandle) -> Iterator[str]:
        container = self.client.containers.get(handle.external_id)
        for chunk in container.logs(stream=True, follow=True, stdout=True, stderr=True):
            yield chunk.decode("utf-8", errors="replace")

    def wait(self, handle: RunHandle, timeout_seconds: int | None = None) -> int:
        container = self.client.containers.get(handle.external_id)
        result = container.wait(timeout=timeout_seconds) if timeout_seconds else container.wait()
        return result.get("StatusCode", -1)

    def get_resource_usage(self, handle: RunHandle) -> ResourceUsage:
        try:
            container = self.client.containers.get(handle.external_id)
            stats = container.stats(stream=False)
        except NotFound:
            return ResourceUsage()

        memory_stats = stats.get("memory_stats", {})
        return ResourceUsage(
            cpu_percent=_compute_cpu_percent(stats),
            memory_mb=memory_stats.get("usage", 0) / (1024 * 1024) or None,
            memory_limit_mb=memory_stats.get("limit", 0) / (1024 * 1024) or None,
            # GPU utilization isn't in Docker's own stats API; the resource
            # monitor (see app.execution.resource_monitor) fills this in via
            # pynvml when the run was started with device="gpu".
        )

    def stop(self, handle: RunHandle) -> None:
        try:
            container = self.client.containers.get(handle.external_id)
            container.stop(timeout=10)
        except NotFound:
            logger.warning("Container %s already gone when stopping", handle.external_id)

    def is_running(self, handle: RunHandle) -> bool:
        try:
            container = self.client.containers.get(handle.external_id)
            container.reload()
            return container.status in ("running", "created", "restarting")
        except NotFound:
            return False


def _compute_cpu_percent(stats: dict) -> float | None:
    try:
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"] - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = stats["cpu_stats"]["system_cpu_usage"] - stats["precpu_stats"]["system_cpu_usage"]
        online_cpus = stats["cpu_stats"].get("online_cpus") or len(
            stats["cpu_stats"]["cpu_usage"].get("percpu_usage") or [1]
        )
        if system_delta > 0 and cpu_delta > 0:
            return (cpu_delta / system_delta) * online_cpus * 100.0
    except (KeyError, ZeroDivisionError, TypeError):
        pass
    return None
