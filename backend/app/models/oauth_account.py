import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"
    GITHUB = "github"


class OAuthAccount(BaseModel):
    """Links one external identity-provider account to one local `User`.

    A separate table (rather than provider columns on `User`) lets a user
    have any number of linked providers, and keeps `User` itself provider-
    agnostic - `AuthService` never needs to know which providers exist.
    """

    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_oauth_accounts_provider_subject"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[OAuthProvider] = mapped_column(
        Enum(OAuthProvider, name="oauth_provider", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    # The provider's own stable subject/user id (Google's `sub`, GitHub's
    # numeric `id`) - not the email, which a provider account can change.
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
