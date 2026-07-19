import time

import pytest

from app.utils.circuit_breaker import CircuitBreaker, CircuitOpenError, CircuitState


def _failing() -> None:
    raise ValueError("boom")


def _succeeding() -> str:
    return "ok"


def test_breaker_opens_after_threshold_failures() -> None:
    breaker = CircuitBreaker(name="test", failure_threshold=3, recovery_seconds=60)

    for _ in range(3):
        with pytest.raises(ValueError):
            breaker.call(_failing)

    assert breaker.state == CircuitState.OPEN
    with pytest.raises(CircuitOpenError):
        breaker.call(_succeeding)


def test_breaker_stays_closed_below_threshold() -> None:
    breaker = CircuitBreaker(name="test", failure_threshold=3, recovery_seconds=60)

    for _ in range(2):
        with pytest.raises(ValueError):
            breaker.call(_failing)

    assert breaker.state == CircuitState.CLOSED
    assert breaker.call(_succeeding) == "ok"


def test_breaker_success_resets_failure_count() -> None:
    breaker = CircuitBreaker(name="test", failure_threshold=3, recovery_seconds=60)

    with pytest.raises(ValueError):
        breaker.call(_failing)
    breaker.call(_succeeding)

    with pytest.raises(ValueError):
        breaker.call(_failing)
    with pytest.raises(ValueError):
        breaker.call(_failing)

    # Only 2 consecutive failures since the reset - still closed.
    assert breaker.state == CircuitState.CLOSED


def test_breaker_half_opens_after_recovery_window() -> None:
    breaker = CircuitBreaker(name="test", failure_threshold=1, recovery_seconds=0.05)

    with pytest.raises(ValueError):
        breaker.call(_failing)
    assert breaker.state == CircuitState.OPEN

    time.sleep(0.1)
    assert breaker.call(_succeeding) == "ok"
    assert breaker.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_breaker_acall_records_failures() -> None:
    breaker = CircuitBreaker(name="test-async", failure_threshold=1, recovery_seconds=60)

    async def _afail() -> None:
        raise ValueError("boom")

    with pytest.raises(ValueError):
        await breaker.acall(_afail)

    assert breaker.state == CircuitState.OPEN
