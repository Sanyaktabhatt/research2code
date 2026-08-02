import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserSignup(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_must_fit_bcrypt(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes")
        return password


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Only the display name is editable - email is the login identifier
    (changing it would need re-verification, out of scope here) and role/
    is_active are admin-only concerns with no endpoint exposed yet."""

    full_name: str = Field(min_length=1, max_length=255)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class OAuthProvidersResponse(BaseModel):
    """Only providers with both a client id and secret set - the frontend
    uses this to decide which "Continue with ..." buttons to render, so a
    half-configured provider never shows a button that would just 500."""

    providers: list[str]


class TokenPayload(BaseModel):
    sub: str
    role: UserRole
    type: str
    exp: datetime
