from httpx import AsyncClient


async def test_create_and_list_projects(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    create_response = await client.post(
        "/api/v1/projects",
        json={"name": "My Research Project", "description": "Reproducing a paper"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    project = create_response.json()
    assert project["name"] == "My Research Project"

    list_response = await client.get("/api/v1/projects", headers=auth_headers)
    assert list_response.status_code == 200
    body = list_response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == project["id"]


async def test_get_project_not_found(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert response.status_code == 404


async def test_update_and_delete_project(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    create_response = await client.post(
        "/api/v1/projects", json={"name": "Original name"}, headers=auth_headers
    )
    project_id = create_response.json()["id"]

    update_response = await client.patch(
        f"/api/v1/projects/{project_id}", json={"name": "Renamed"}, headers=auth_headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Renamed"

    delete_response = await client.delete(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert delete_response.status_code == 204

    get_response = await client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert get_response.status_code == 404


async def test_another_users_project_is_not_accessible(
    client: AsyncClient, auth_headers: dict[str, str], db_session
) -> None:
    from app.auth.jwt_handler import create_access_token, hash_password
    from app.models.user import User, UserRole

    other_user = User(
        email="other-owner@example.com",
        hashed_password=hash_password("correct-horse-battery-staple"),
        role=UserRole.USER,
        is_active=True,
    )
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)
    other_headers = {
        "Authorization": f"Bearer {create_access_token(str(other_user.id), other_user.role)}"
    }

    create_response = await client.post(
        "/api/v1/projects", json={"name": "Owner-only project"}, headers=auth_headers
    )
    project_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/projects/{project_id}", headers=other_headers)
    assert response.status_code == 403
