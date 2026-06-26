def test_login_success(client):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "TestAdmin123!"})
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "admin"
    assert "access_token" in body and "refresh_token" in body


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_user_same_error_as_wrong_password(client):
    """Не должно быть видно, существует ли логин — иначе это утечка информации (user enumeration)."""
    r1 = client.post("/api/auth/login", data={"username": "ghost", "password": "whatever"})
    r2 = client.post("/api/auth/login", data={"username": "admin", "password": "wrong"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["detail"] == r2.json()["detail"]


def test_objects_require_authentication(client):
    r = client.get("/api/objects")
    assert r.status_code == 401


def test_viewer_can_read_objects(client, viewer_headers):
    r = client.get("/api/objects", headers=viewer_headers)
    assert r.status_code == 200
    assert "items" in r.json()


def test_viewer_cannot_create_object(client, viewer_headers):
    r = client.post("/api/objects", headers=viewer_headers, json={"display_name": "Hack attempt"})
    assert r.status_code == 403


def test_admin_can_create_object(client, auth_headers):
    r = client.post("/api/objects", headers=auth_headers, json={
        "display_name": "Test Canal", "commission_year": 1980, "condition_source": "удов.",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["display_name"] == "Test Canal"
    assert body["status"] in ("ok", "watch", "repair", "critical")


def test_viewer_cannot_delete_object(client, viewer_headers, auth_headers):
    created = client.post("/api/objects", headers=auth_headers, json={"display_name": "To delete"}).json()
    r = client.delete(f"/api/objects/{created['id']}", headers=viewer_headers)
    assert r.status_code == 403


def test_viewer_cannot_manage_users(client, viewer_headers):
    r = client.get("/api/auth/users", headers=viewer_headers)
    assert r.status_code == 403


def test_admin_can_create_and_list_users(client, auth_headers):
    r = client.post("/api/auth/users", headers=auth_headers, json={
        "username": "inspector1", "password": "Inspector123!", "role": "inspector",
    })
    assert r.status_code == 200
    r = client.get("/api/auth/users", headers=auth_headers)
    usernames = [u["username"] for u in r.json()]
    assert "inspector1" in usernames


def test_admin_cannot_demote_own_role(client, auth_headers):
    me = client.get("/api/auth/me", headers=auth_headers).json()
    r = client.put(f"/api/auth/users/{me['id']}", headers=auth_headers, json={"role": "viewer"})
    assert r.status_code == 400


def test_short_password_rejected(client, auth_headers):
    r = client.post("/api/auth/users", headers=auth_headers, json={
        "username": "shortpw", "password": "123", "role": "viewer",
    })
    assert r.status_code == 400
