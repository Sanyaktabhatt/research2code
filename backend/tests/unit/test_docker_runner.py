from unittest.mock import MagicMock

from docker.errors import NotFound

from app.execution.backends import MountSpec, RunSpec
from app.execution.docker_runner import DockerExecutionBackend


def _make_backend() -> tuple[DockerExecutionBackend, MagicMock]:
    mock_client = MagicMock()
    return DockerExecutionBackend(client=mock_client), mock_client


def test_build_and_start_applies_hardened_defaults() -> None:
    backend, mock_client = _make_backend()
    mock_client.images.build.return_value = (MagicMock(id="sha256:abc"), iter([]))
    mock_client.containers.run.return_value = MagicMock(id="container-123")

    spec = RunSpec(
        build_context="/tmp/project",
        command=None,
        mounts=[MountSpec(host_path="/host/data", container_path="/workspace/data", read_only=True)],
        device="cpu",
        cpu_limit=2.0,
        memory_limit_mb=4096,
        network_disabled=True,
    )

    handle = backend.build_and_start(spec)

    assert handle.backend == "docker"
    assert handle.external_id == "container-123"

    _, run_kwargs = mock_client.containers.run.call_args
    assert run_kwargs["cap_drop"] == ["ALL"]
    assert run_kwargs["security_opt"] == ["no-new-privileges"]
    assert run_kwargs["network_disabled"] is True
    assert run_kwargs["device_requests"] == []  # cpu run requests no GPU


def test_build_and_start_requests_gpu_when_device_is_gpu() -> None:
    backend, mock_client = _make_backend()
    mock_client.images.build.return_value = (MagicMock(id="sha256:abc"), iter([]))
    mock_client.containers.run.return_value = MagicMock(id="container-123")

    spec = RunSpec(build_context="/tmp/project", command=None, device="gpu")
    backend.build_and_start(spec)

    _, run_kwargs = mock_client.containers.run.call_args
    assert len(run_kwargs["device_requests"]) == 1
    assert run_kwargs["device_requests"][0]["Capabilities"] == [["gpu"]]


def test_is_running_returns_false_when_container_gone() -> None:
    backend, mock_client = _make_backend()
    mock_client.containers.get.side_effect = NotFound("gone")

    from app.execution.backends import RunHandle

    assert backend.is_running(RunHandle(backend="docker", external_id="missing")) is False


def test_stop_swallows_not_found() -> None:
    backend, mock_client = _make_backend()
    mock_client.containers.get.side_effect = NotFound("gone")

    from app.execution.backends import RunHandle

    backend.stop(RunHandle(backend="docker", external_id="missing"))  # should not raise
