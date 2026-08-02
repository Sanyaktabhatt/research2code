import logging
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.config.settings import settings
from app.models.oauth_account import OAuthProvider
from app.models.user import User
from app.schemas.user import (
    OAuthProvidersResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserLogin,
    UserRead,
    UserSignup,
    UserUpdate,
)
from app.services.auth_service import AuthService
from app.services.oauth_service import (
    OAUTH_STATE_COOKIE,
    OAuthLoginService,
    build_authorization_url,
    configured_providers,
    fetch_profile,
    generate_state,
)
from app.utils.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    OAuthExchangeError,
    OAuthProviderNotConfiguredError,
    UserAlreadyExistsError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup, session: AsyncSession = Depends(get_db)) -> UserRead:
    try:
        user = await AuthService(session).signup(payload)
    except UserAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, session: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        return await AuthService(session).login(payload.email, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InactiveUserError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/oauth/providers", response_model=OAuthProvidersResponse)
async def list_oauth_providers() -> OAuthProvidersResponse:
    return OAuthProvidersResponse(providers=[p.value for p in configured_providers()])


@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(provider: OAuthProvider) -> Response:
    """Starts the flow: sets a short-lived CSRF state cookie, then sends the
    browser to the provider's own consent screen. Not called via `fetch` -
    the frontend just points a full-page navigation (`<a href>`) here.
    """
    try:
        state = generate_state()
        url = build_authorization_url(provider, state)
    except OAuthProviderNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        # "lax" (not "strict") is required here: the cookie must still be
        # sent when the provider's own domain redirects the browser back to
        # our callback via a top-level GET navigation - that's a cross-site
        # request from the cookie's perspective.
        samesite="lax",
        secure=settings.OAUTH_REDIRECT_BASE_URL.startswith("https://"),
    )
    return response


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: OAuthProvider,
    request: Request,
    session: AsyncSession = Depends(get_db),
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> Response:
    """Runs entirely server-side (code exchange, profile fetch, user
    lookup/creation, our own JWT issuance) and only ever hands the *result*
    - our tokens, or a short error reason - to the browser, via a redirect
    to the frontend. Errors redirect rather than raising an HTTPException:
    this is a top-level browser navigation the provider lands the user on
    directly, not a `fetch` call the frontend could catch a JSON body from.
    """
    cookie_state = request.cookies.get(OAUTH_STATE_COOKIE)
    user: User | None = None
    reason: str | None = None

    if error:
        reason = "access_denied"
    elif not code or not state or not cookie_state or not secrets.compare_digest(state, cookie_state):
        reason = "state_mismatch"
    else:
        try:
            profile = await fetch_profile(provider, code)
            user = await OAuthLoginService(session).find_or_create_user(provider, profile)
        except OAuthProviderNotConfiguredError:
            reason = "provider_not_configured"
        except OAuthExchangeError as exc:
            logger.warning("OAuth exchange failed for provider %s: %s", provider.value, exc)
            reason = "exchange_failed"
        except InactiveUserError:
            reason = "inactive_account"

    response: RedirectResponse
    if user is None:
        response = RedirectResponse(
            f"{settings.FRONTEND_BASE_URL}/login?{urlencode({'oauth_error': reason or 'unknown_error'})}",
            status_code=status.HTTP_302_FOUND,
        )
    else:
        tokens = AuthService(session).issue_tokens(user)
        # The URL *fragment* (`#...`), not a query string: fragments are
        # never sent to any server (ours or a proxy/CDN in front of it) on
        # the follow-up request the browser makes for `/auth/callback`, and
        # never appear in server access logs - only client-side JS on that
        # page ever sees the tokens.
        fragment = urlencode({"access_token": tokens.access_token, "refresh_token": tokens.refresh_token})
        response = RedirectResponse(f"{settings.FRONTEND_BASE_URL}/auth/callback#{fragment}", status_code=status.HTTP_302_FOUND)

    response.delete_cookie(OAUTH_STATE_COOKIE)
    return response


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_active_user)) -> UserRead:
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> UserRead:
    return await AuthService(session).update_profile(current_user, payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest, session: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        return await AuthService(session).refresh(payload.refresh_token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InactiveUserError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
