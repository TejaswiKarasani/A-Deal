def test_register_login_and_status_use_valid_jwt_subject(client):
    register = client.post(
        "/auth/register",
        json={"name": "Praveen", "email": "praveen@example.com", "password": "safe-password"},
    )
    assert register.status_code == 200
    token = register.json()["access_token"]

    status = client.get("/onboarding/status", headers={"Authorization": f"Bearer {token}"})
    assert status.status_code == 200
    assert status.json()["complete"] is False

    login = client.post(
        "/auth/token",
        data={"username": "praveen@example.com", "password": "safe-password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login.status_code == 200
    login_token = login.json()["access_token"]
    assert client.get("/onboarding/status", headers={"Authorization": f"Bearer {login_token}"}).status_code == 200
