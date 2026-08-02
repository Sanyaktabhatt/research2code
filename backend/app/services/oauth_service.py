import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.models.oauth_account import OAuthAccount, OAuthProvider
from app.models.user import User, UserRole
from app.repositories.oauth_account_repository import OAuthAccountRepository
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import (
    InactiveUserError,
    OAuthExchangeError,
    OAuthProviderNotConfiguredError,
)

#: Name of the httpOnly cookie holding the CSRF state value between the
#: authorize redirect and the callback (double-submit-cookie pattern - no
#: server-side session store needed for a value this short-lived).
OAUTH_STATE_COOKIE = "r2c_oauth_state"
_STATE_COOKIE_MAX_AGE_SECONDS = 600


@dataclass(frozen=True)
class _ProviderConfig:
    authorize_url: str
    token_url: str
    scope: str
    client_id: str | None
    client_secret: str | None


@dataclass(frozen=True)
class OAuthProfile:
    provider_user_id: str
    email: str
    full_name: str | None


def _provider_config(provider: OAuthProvider) -> _ProviderConfig:
    if provider == OAuthProvider.GOOGLE:
        return _ProviderConfig(
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scope="openid email profile",
            client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
            client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
        )
    return _ProviderConfig(
        authorize_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        scope="read:user user:email",
        client_id=settings.GITHUB_OAUTH_CLIENT_ID,
        client_secret=settings.GITHUB_OAUTH_CLIENT_SECRET,
    )


def is_provider_configured(provider: OAuthProvider) -> bool:
    config = _provider_config(provider)
    return bool(config.client_id and config.client_secret)


def configured_providers() -> list[OAuthProvider]:
    return [p for p in OAuthProvider if is_provider_configured(p)]


def _redirect_uri(provider: OAuthProvider) -> str:
    return f"{settings.OAUTH_REDIRECT_BASE_URL}/auth/oauth/{provider.value}/callback"


def generate_state() -> str:
    return secrets.token_urlsafe(32)


def build_authorization_url(provider: OAuthProvider, state: str) -> str:
    config = _provider_config(provider)
    if not config.client_id:
        raise OAuthProviderNotConfiguredError(provider.value)

    params = {
        "client_id": config.client_id,
        "redirect_uri": _redirect_uri(provider),
        "response_type": "code",
        "scope": config.scope,
        "state": state,
    }
    if provider == OAuthProvider.GOOGLE:
        # Skips the "choose which app" account chooser only when there's no
        # ambiguity; otherwise behaves like a normal consent screen. Neither
        # `access_type=offline` nor a refresh token is needed - the provider
        # token is used once, synchronously, during the callback and then
        # discarded, never stored.
        params["prompt"] = "select_account"

    return f"{config.authorize_url}?{urlencode(params)}"


async def fetch_profile(provider: OAuthProvider, code: str) -> OAuthProfile:
    """Exchanges an authorization `code` for the caller's stable id + email.

    Runs entirely server-side within the callback request - the provider's
    own access token is used once, right here, to fetch a profile, and is
    never persisted or returned to the frontend. Only *our* JWTs leave this
    function's caller.
    """
    config = _provider_config(provider)
    if not (config.client_id and config.client_secret):
        raise OAuthProviderNotConfiguredError(provider.value)

    async with httpx.AsyncClient(timeout=15.0) as client:
        if provider == OAuthProvider.GOOGLE:
            return await _fetch_google_profile(client, config, code)
        return await _fetch_github_profile(client, config, code)


async def _fetch_google_profile(client: httpx.AsyncClient, config: _ProviderConfig, code: str) -> OAuthProfile:
    token_response = await client.post(
        config.token_url,
        data={
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "redirect_uri": _redirect_uri(OAuthProvider.GOOGLE),
            "grant_type": "authorization_code",
        },
        headers={"Accept": "application/json"},
    )
    if token_response.status_code != 200:
        raise OAuthExchangeError(f"Google rejected the code exchange: {token_response.text[:200]}")
    access_token = token_response.json().get("access_token")
    if not access_token:
        raise OAuthExchangeError("Google token response had no access_token")

    profile_response = await client.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if profile_response.status_code != 200:
        raise OAuthExchangeError("Google rejected the userinfo request")
    data = profile_response.json()

    email = data.get("email")
    if not email or not data.get("email_verified"):
        raise OAuthExchangeError("Google account has no verified email to sign in with")

    return OAuthProfile(provider_user_id=str(data["sub"]), email=email, full_name=data.get("name"))


async def _fetch_github_profile(client: httpx.AsyncClient, config: _ProviderConfig, code: str) -> OAuthProfile:
    token_response = await client.post(
        config.token_url,
        data={
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "redirect_uri": _redirect_uri(OAuthProvider.GITHUB),
        },
        headers={"Accept": "application/json"},
    )
    if token_response.status_code != 200:
        raise OAuthExchangeError(f"GitHub rejected the code exchange: {token_response.text[:200]}")
    token_data = token_response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise OAuthExchangeError(token_data.get("error_description") or "GitHub token response had no access_token")

    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    profile_response = await client.get("https://api.github.com/user", headers=headers)
    if profile_response.status_code != 200:
        raise OAuthExchangeError("GitHub rejected the user profile request")
    profile = profile_response.json()

    # GitHub's `/user` only includes `email` when the account's email is
    # public - most aren't, so the primary+verified address has to be looked
    # up separately via the scoped `user:email` grant instead.
    email = profile.get("email")
    if not email:
        emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
        if emails_response.status_code == 200:
            for entry in emails_response.json():
                if entry.get("primary") and entry.get("verified"):
                    email = entry["email"]
                    break

    if not email:
        raise OAuthExchangeError(
            "GitHub account has no verified email available - add and verify one on GitHub, or make it public"
        )

    return OAuthProfile(
        provider_user_id=str(profile["id"]),
        email=email,
        full_name=profile.get("name") or profile.get("login"),
    )


class OAuthLoginService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repository = UserRepository(session)
        self.oauth_account_repository = OAuthAccountRepository(session)

    async def find_or_create_user(self, provider: OAuthProvider, profile: OAuthProfile) -> User:
        existing_link = await self.oauth_account_repository.get_by_provider_subject(
            provider, profile.provider_user_id
        )
        if existing_link is not None:
            user = await self.user_repository.get_by_id(existing_link.user_id)
            # The account row can't outlive its user (ON DELETE CASCADE), so
            # a missing user here would mean the FK constraint itself was
            # violated - not a state this code should paper over.
            assert user is not None
            if not user.is_active:
                raise InactiveUserError()
            return user

        user = await self.user_repository.get_by_email(profile.email)
        if user is None:
            user = User(
                email=profile.email,
                full_name=profile.full_name,
                hashed_password=None,
                role=UserRole.USER,
            )
            user = await self.user_repository.create(user)
        elif not user.is_active:
            raise InactiveUserError()

        # Reached either by a brand-new user or by an existing
        # password-based account signing in with a provider for the first
        # time (same verified email) - link this provider to it either way.
        link = OAuthAccount(user_id=user.id, provider=provider, provider_user_id=profile.provider_user_id)
        await self.oauth_account_repository.create(link)

        await self.session.commit()
        return user
