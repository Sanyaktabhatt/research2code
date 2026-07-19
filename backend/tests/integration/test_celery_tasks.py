"""Celery tasks are plain functions wrapped by `@celery_app.task` - calling
them directly (rather than via `.delay()`) runs the task body synchronously
in-process with no broker involved, which is exactly what's wanted here.
They use the *sync* engine/session (`get_sync_db`), which points at the same
Postgres database as the async test fixtures, so data committed through
`db_session` is immediately visible to the task.
"""

from unittest.mock import patch

from app.execution import celery_tasks
from app.models.paper import Paper, PaperProcessingStatus
from app.models.project import Project
from app.parser.schemas import ParsedPaper, Section


async def test_process_paper_task_marks_paper_completed(db_session, test_user) -> None:
    project = Project(owner_id=test_user.id, name="Test project")
    db_session.add(project)
    await db_session.flush()

    paper = Paper(
        project_id=project.id,
        original_filename="paper.pdf",
        storage_key="papers/test/paper.pdf",
        status=PaperProcessingStatus.PENDING,
    )
    db_session.add(paper)
    await db_session.commit()
    await db_session.refresh(paper)

    parsed = ParsedPaper(sections=[Section(name="title", text="A Test Paper")])

    with (
        patch.object(celery_tasks, "_download_pdf", return_value=b"%PDF-1.4 fake"),
        patch.object(celery_tasks.PaperParsingPipeline, "run", return_value=parsed),
        patch.object(celery_tasks.generate_paper_embeddings_task, "delay"),
    ):
        celery_tasks.process_paper_task(str(paper.id))

    await db_session.refresh(paper)
    assert paper.status == PaperProcessingStatus.COMPLETED
    assert paper.parsed_data["sections"][0]["text"] == "A Test Paper"


async def test_process_paper_task_records_failure_and_reraises(db_session, test_user) -> None:
    project = Project(owner_id=test_user.id, name="Test project")
    db_session.add(project)
    await db_session.flush()

    paper = Paper(
        project_id=project.id,
        original_filename="paper.pdf",
        storage_key="papers/test/paper.pdf",
        status=PaperProcessingStatus.PENDING,
    )
    db_session.add(paper)
    await db_session.commit()
    await db_session.refresh(paper)

    with patch.object(celery_tasks, "_download_pdf", side_effect=ConnectionError("minio down")):
        try:
            celery_tasks.process_paper_task(str(paper.id))
        except ConnectionError:
            pass
        else:
            raise AssertionError("expected process_paper_task to re-raise")

    await db_session.refresh(paper)
    assert paper.status == PaperProcessingStatus.FAILED
    assert "minio down" in paper.error_message


async def test_process_paper_task_skips_when_paper_missing(db_session) -> None:
    # Should return quietly rather than raising when the paper row no longer
    # exists (e.g. deleted between enqueue and worker pickup). Depends on
    # `db_session` purely to ensure migrations have run before this hits the
    # (real, migrated) database.
    celery_tasks.process_paper_task("00000000-0000-0000-0000-000000000000")
