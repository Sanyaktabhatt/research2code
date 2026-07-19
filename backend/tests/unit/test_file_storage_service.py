from app.services.file_storage_service import _sanitize_filename


def test_sanitize_filename_strips_directory_components() -> None:
    assert _sanitize_filename("../../etc/passwd") == "passwd"
    assert _sanitize_filename("a/b/c/paper.pdf") == "paper.pdf"


def test_sanitize_filename_strips_unsafe_characters() -> None:
    assert _sanitize_filename("weird name!.pdf") == "weird_name_.pdf"


def test_sanitize_filename_falls_back_when_empty() -> None:
    assert _sanitize_filename("") == "file"
    assert _sanitize_filename("...") == "file"


def test_sanitize_filename_preserves_normal_names() -> None:
    assert _sanitize_filename("paper-v2_final.pdf") == "paper-v2_final.pdf"
