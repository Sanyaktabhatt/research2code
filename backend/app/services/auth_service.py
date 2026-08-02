import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.user import TokenResponse, UserSignup, UserUpdate
from app.utils.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    UserAlreadyExistsError,
)

# Precomputed bcrypt hash for the literal ``dummy-password``. It is verified
# for an unknown account to make that path take roughly as long as a normal
# password check, preventing account enumeration through response timing.
#
# Keep this as a constant: bcrypt hashing is intentionally expensive and must
# never run during module import (or every Uvicorn/Celery worker startup).
_DUMMY_PASSWORD_HASH = "$2b$12$DUg.WU7PTqFD493zrULe1uqfDeendz4t7m1HIVmWS.cIqauz/uHqi"

class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repository = UserRepository(session)

    async def signup(self, payload: UserSignup) -> User:
        existing_user = await self.user_repository.get_by_email(payload.email)
        if existing_user is not None:
            raise UserAlreadyExistsError(payload.email)

        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            role=UserRole.USER,
        )
        user = await self.user_repository.create(user)
        await self.session.commit()
        return user

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self.user_repository.get_by_email(email)
        # Falls back to the dummy hash both when there's no such user AND
        # when the user exists but signed up via OAuth only (hashed_password
        # is None) - either way there's no real password to check, and both
        # must fail the same way (InvalidCredentialsError, same timing) so a
        # login attempt can't be used to enumerate which emails are
        # registered or which auth method they used.
        password_hash = user.hashed_password if (user is not None and user.hashed_password) else _DUMMY_PASSWORD_HASH

        if not verify_password(password, password_hash) or user is None:
            raise InvalidCredentialsError()
        if not user.is_active:
            raise InactiveUserError()

        return self.issue_tokens(user)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token, TokenType.REFRESH)
        try:
            user_id = uuid.UUID(payload["sub"])
        except ValueError as exc:
            raise InvalidTokenError("Malformed token subject") from exc

        user = await self.user_repository.get_by_id(user_id)
        if user is None:
            raise InvalidTokenError("User no longer exists")
        if not user.is_active:
            raise InactiveUserError()

        return self.issue_tokens(user)

    async def update_profile(self, user: User, payload: UserUpdate) -> User:
        # `user` is already attached to this request's session (loaded by
        # the `get_current_active_user` dependency), so mutating it and
        # committing is all that's needed - no separate repository write.
        user.full_name = payload.full_name
        await self.session.commit()
        await self.session.refresh(user)
        return user

    def issue_tokens(self, user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(str(user.id), user.role),
            refresh_token=create_refresh_token(str(user.id), user.role),
        )
