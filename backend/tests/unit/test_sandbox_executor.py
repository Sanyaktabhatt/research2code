import io
import zipfile

import pytest

from app.execution.sandbox_executor import _safe_extractall


def _make_zip(entries: dict[str, bytes]) -> zipfile.ZipFile:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    buffer.seek(0)
    return zipfile.ZipFile(buffer)


def test_safe_extractall_allows_normal_entries(tmp_path) -> None:
    archive = _make_zip({"config.yaml": b"a: 1", "src/train.py": b"print(1)"})

    _safe_extractall(archive, str(tmp_path))

    assert (tmp_path / "config.yaml").read_bytes() == b"a: 1"
    assert (tmp_path / "src" / "train.py").read_bytes() == b"print(1)"


def test_safe_extractall_rejects_path_traversal(tmp_path) -> None:
    archive = _make_zip({"../../etc/passwd": b"malicious"})

    with pytest.raises(ValueError, match="outside destination"):
        _safe_extractall(archive, str(tmp_path))


def test_safe_extractall_rejects_absolute_path_entries(tmp_path) -> None:
    # zipfile normalizes absolute paths on write, so craft the ZipInfo directly.
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        info = zipfile.ZipInfo("/etc/passwd")
        archive.writestr(info, "malicious")
    buffer.seek(0)

    with zipfile.ZipFile(buffer) as archive:
        with pytest.raises(ValueError, match="outside destination"):
            _safe_extractall(archive, str(tmp_path))
