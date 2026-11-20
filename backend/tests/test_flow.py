BODY = {"title": "Resize cache cluster", "description": "Scale the cache cluster from 3 to 5 nodes."}


def test_requires_auth(client):
    assert client.get("/changes").status_code == 401


def test_bad_login(client):
    r = client.post("/auth/login", data={"username": "engineer1", "password": "wrong"})
    assert r.status_code == 401


def test_viewer_cannot_create(client, viewer):
    assert client.post("/changes", json=BODY, headers=viewer).status_code == 403


def test_input_validation(client, eng):
    r = client.post("/changes", json={"title": "x", "description": "short"}, headers=eng)
    assert r.status_code == 422


def test_full_flow_and_audit(client, eng, appr):
    r = client.post("/changes", json=BODY, headers=eng)
    assert r.status_code == 201
    cid = r.json()["id"]
    assert r.json()["status"] == "pending_approval"
    assert r.json()["plan"]["steps"]

    # gate: cannot execute before approval
    assert client.post(f"/changes/{cid}/execute", headers=eng).status_code == 409

    r = client.post(f"/changes/{cid}/approve", json={"comment": "ok"}, headers=appr)
    assert r.status_code == 200 and r.json()["status"] == "approved"

    r = client.post(f"/changes/{cid}/execute", headers=eng)
    assert r.status_code == 200 and r.json()["status"] == "executed"

    actions = [a["action"] for a in client.get(f"/changes/{cid}/audit", headers=eng).json()]
    assert actions == ["created", "plan_drafted", "approved", "executed"]


def test_engineer_cannot_approve(client, eng):
    cid = client.post("/changes", json=BODY, headers=eng).json()["id"]
    assert client.post(f"/changes/{cid}/approve", json={}, headers=eng).status_code == 403


def test_reject_blocks_execution(client, eng, appr):
    cid = client.post("/changes", json=BODY, headers=eng).json()["id"]
    assert client.post(f"/changes/{cid}/reject", json={"comment": "no"}, headers=appr).status_code == 200
    assert client.post(f"/changes/{cid}/execute", headers=eng).status_code == 409


def test_cannot_review_twice(client, eng, appr):
    cid = client.post("/changes", json=BODY, headers=eng).json()["id"]
    client.post(f"/changes/{cid}/approve", json={}, headers=appr)
    assert client.post(f"/changes/{cid}/reject", json={}, headers=appr).status_code == 409


def test_not_found(client, eng):
    assert client.get("/changes/99999", headers=eng).status_code == 404


def test_metrics_and_health(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert "http_requests_total" in client.get("/metrics").text


def test_me_returns_role(client, appr):
    r = client.get("/auth/me", headers=appr)
    assert r.status_code == 200
    assert r.json() == {"username": "approver1", "role": "approver"}
