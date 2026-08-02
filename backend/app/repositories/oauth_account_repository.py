from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_account import OAuthAccount, OAuthProvider
from app.repositories.base_repository import BaseRepository


class OAuthAccountRepository(BaseRepository[OAuthAccount]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(OAuthAccount, session)

    async def get_by_provider_subject(
        self, provider: OAuthProvider, provider_user_id: str
    ) -> OAuthAccount | None:
        result = await self.session.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, account: OAuthAccount) -> OAuthAccount:
        return await self.add(account)
