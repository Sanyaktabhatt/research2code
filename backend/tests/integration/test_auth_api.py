from httpx import AsyncClient


async def test_signup_then_login_then_me(client: AsyncClient) -> None:
    signup_response = await client.post(
        "/api/v1/auth/signup",
        json={"email": "new-user@example.com", "password": "correct-horse-battery-staple"},
    )
    assert signup_response.status_code == 201
    assert signup_response.json()["email"] == "new-user@example.com"

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "new-user@example.com", "password": "correct-horse-battery-staple"},
    )
    assert login_response.status_code == 200
    tokens = login_response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    me_response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "new-user@example.com"


async def test_signup_rejects_duplicate_email(client: AsyncClient) -> None:
    payload = {"email": "dupe@example.com", "password": "correct-horse-battery-staple"}
    first = await client.post("/api/v1/auth/signup", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/signup", json=payload)
    assert second.status_code == 409


async def test_login_rejects_wrong_password(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "wrongpw@example.com", "password": "correct-horse-battery-staple"},
    )

    response = await client.post(
        "/api/v1/auth/login", json={"email": "wrongpw@example.com", "password": "totally-wrong"}
    )
    assert response.status_code == 401


async def test_login_rejects_unknown_email(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever123"}
    )
    assert response.status_code == 401


async def test_me_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
