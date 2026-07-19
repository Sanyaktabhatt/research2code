import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User, UserRole
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.utils.exceptions import PermissionDeniedError, ProjectNotFoundError


class ProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.project_repository = ProjectRepository(session)

    async def create_project(self, owner: User, payload: ProjectCreate) -> Project:
        project = Project(
            owner_id=owner.id,
            name=payload.name,
            description=payload.description,
        )
        project = await self.project_repository.add(project)
        await self.session.commit()
        return project

    async def list_projects(self, owner: User, offset: int, limit: int) -> tuple[list[Project], int]:
        return await self.project_repository.list_by_owner(owner.id, offset, limit)

    async def get_project(self, project_id: uuid.UUID, owner: User) -> Project:
        project = await self.project_repository.get_by_id(project_id)
        if project is None:
            raise ProjectNotFoundError(project_id)
        self._ensure_access(project, owner)
        return project

    async def update_project(
        self, project_id: uuid.UUID, owner: User, payload: ProjectUpdate
    ) -> Project:
        project = await self.get_project(project_id, owner)

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(project, field, value)

        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete_project(self, project_id: uuid.UUID, owner: User) -> None:
        project = await self.get_project(project_id, owner)
        await self.project_repository.delete(project)
        await self.session.commit()

    def _ensure_access(self, project: Project, owner: User) -> None:
        if project.owner_id != owner.id and owner.role != UserRole.ADMIN:
            raise PermissionDeniedError("You do not have access to this project")
