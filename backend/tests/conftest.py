import os
import tempfile

import pytest

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["DEMO_PASSWORD"] = "test-pass"
os.environ.pop("ANTHROPIC_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def auth(client, username):
    r = client.post("/auth/login", data={"username": username, "password": "test-pass"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def eng(client):
    return auth(client, "engineer1")


@pytest.fixture()
def appr(client):
    return auth(client, "approver1")


@pytest.fixture()
def viewer(client):
    return auth(client, "viewer1")
