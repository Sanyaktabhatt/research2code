"""Resource + training-progress monitoring for one execution run.

Two independent signal sources are combined here:
- Container-level resource usage (CPU/memory from Docker, GPU from pynvml,
  disk from the host filesystem) - infrastructure-level, always available.
- Training progress (current epoch/step) - only knowable from the training
  script's own output, so it's parsed from the `PROGRESS {...}` marker lines
  the generated `train.py` prints (see `app/codegen/templates/pytorch/
  train.py.j2::emit_progress`). Any other stdout/stderr line is ignored by
  this parser but still forwarded to the caller as a raw log line.
"""

import json
import re
import shutil
import time

_PROGRESS_LINE_PATTERN = re.compile(r"^PROGRESS (\{.*\})\s*$")


def parse_progress_line(line: str) -> dict | None:
    match = _PROGRESS_LINE_PATTERN.match(line.strip())
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def get_disk_usage_percent(path: str) -> float | None:
    try:
        usage = shutil.disk_usage(path)
    except OSError:
        return None
    if usage.total == 0:
        return None
    return (usage.used / usage.total) * 100.0


def get_gpu_stats() -> tuple[float | None, float | None]:
    """Returns (utilization_percent, memory_used_mb) for GPU 0.

    Executions request all available GPUs (see `DockerExecutionBackend`);
    reporting device 0 is a reasonable representative sample for the
    single-GPU case this platform is primarily built for. Returns
    `(None, None)` when pynvml or the driver isn't available (e.g. CPU-only
    hosts), which is the common case and not an error.
    """
    try:
        import pynvml

        pynvml.nvmlInit()
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            utilization = pynvml.nvmlDeviceGetUtilizationRates(handle).gpu
            memory = pynvml.nvmlDeviceGetMemoryInfo(handle).used / (1024 * 1024)
            return float(utilization), float(memory)
        finally:
            pynvml.nvmlShutdown()
    except Exception:  # noqa: BLE001 - pynvml raises its own exception hierarchy; absence is expected on CPU hosts
        return None, None


class RunProgressTracker:
    """Tracks epoch/step/elapsed/ETA for one run from parsed PROGRESS lines."""

    def __init__(self) -> None:
        self.started_at = time.monotonic()
        self.epoch: int | None = None
        self.total_epochs: int | None = None
        self.step: int | None = None
        self.total_steps: int | None = None

    def update(self, progress: dict) -> None:
        if "epoch" in progress:
            self.epoch = progress["epoch"]
        if "total_epochs" in progress:
            self.total_epochs = progress["total_epochs"]
        if "step" in progress:
            self.step = progress["step"]
        if "total_steps" in progress:
            self.total_steps = progress["total_steps"]

    def snapshot(self) -> dict:
        elapsed_seconds = time.monotonic() - self.started_at
        eta_seconds = self._estimate_eta(elapsed_seconds)

        return {
            "epoch": self.epoch,
            "total_epochs": self.total_epochs,
            "step": self.step,
            "total_steps": self.total_steps,
            "elapsed_seconds": round(elapsed_seconds, 1),
            "eta_seconds": round(eta_seconds, 1) if eta_seconds is not None else None,
        }

    def _estimate_eta(self, elapsed_seconds: float) -> float | None:
        if not self.total_epochs or self.epoch is None or self.total_epochs <= 0:
            return None

        # Fold in intra-epoch step progress when available for a smoother estimate.
        fractional_epoch = self.epoch
        if self.step and self.total_steps:
            fractional_epoch += self.step / self.total_steps

        progress_fraction = fractional_epoch / self.total_epochs
        if progress_fraction <= 0:
            return None

        total_estimated_seconds = elapsed_seconds / progress_fraction
        return max(0.0, total_estimated_seconds - elapsed_seconds)
