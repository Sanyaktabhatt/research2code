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
from app.schemas.user import TokenResponse, UserSignup
from app.utils.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    UserAlreadyExistsError,
)

# A precomputed bcrypt hash of an unguessable value, verified against on every
# login for a nonexistent email so that this branch takes roughly the same
# time as a real password check - otherwise the short-circuited `user is
# None` case responds measurably faster, letting an attacker enumerate valid
# emails purely from response latency.
_DUMMY_PASSWORD_HASH = hash_password("not-a-real-password-used-only-for-timing-equalization")


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
        password_hash = user.hashed_password if user is not None else _DUMMY_PASSWORD_HASH

        if not verify_password(password, password_hash) or user is None:
            raise InvalidCredentialsError()
        if not user.is_active:
            raise InactiveUserError()

        return self._issue_tokens(user)

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

        return self._issue_tokens(user)

    def _issue_tokens(self, user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(str(user.id), user.role),
            refresh_token=create_refresh_token(str(user.id), user.role),
        )
