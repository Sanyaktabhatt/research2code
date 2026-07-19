import uuid

from fastapi import Depends, HTTPException, Query, WebSocket, WebSocketException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import TokenType, decode_token
from app.auth.oauth import oauth2_scheme
from app.config.database import get_db
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import InvalidTokenError


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token, TokenType.ACCESS)
        user_id = uuid.UUID(payload["sub"])
    except (InvalidTokenError, ValueError, KeyError) as exc:
        raise credentials_exception from exc

    user = await UserRepository(session).get_by_id(user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    return user


def require_roles(*allowed_roles: UserRole):
    async def dependency(user: User = Depends(get_current_active_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency


require_admin = require_roles(UserRole.ADMIN)


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    session: AsyncSession = Depends(get_db),
) -> User:
    """WebSocket equivalent of `get_current_user`.

    Browsers can't attach an Authorization header to a WebSocket handshake,
    so the access token is passed as a `?token=` query parameter instead.
    """
    try:
        payload = decode_token(token, TokenType.ACCESS)
        user_id = uuid.UUID(payload["sub"])
    except (InvalidTokenError, ValueError, KeyError) as exc:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token") from exc

    user = await UserRepository(session).get_by_id(user_id)
    if user is None or not user.is_active:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or inactive user")

    return user
