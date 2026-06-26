import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ADMIN_PASSWORD"] = "TestAdmin123!"
os.environ["DEMO_VIEWER_PASSWORD"] = "TestViewer123!"
os.environ["RATE_LIMIT_LOGIN"] = "1000/minute"  # тесты логинятся много раз подряд — лимит не должен мешать им

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base
from app import database as database_module
from app.main import app
from app.seed import seed_default_users

# Общий in-memory SQLite на тестовый процесс (StaticPool, чтобы все
# подключения видели одну и ту же базу — иначе каждое :memory: подключение
# было бы своей пустой базой).
from sqlalchemy.pool import StaticPool

test_engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSessionLocal = sessionmaker(bind=test_engine)

database_module.engine = test_engine
database_module.SessionLocal = TestSessionLocal


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


from app.database import get_db
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    seed_default_users(db)
    db.close()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "TestAdmin123!"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def viewer_token(client):
    r = client.post("/api/auth/login", data={"username": "viewer", "password": "TestViewer123!"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def viewer_headers(viewer_token):
    return {"Authorization": f"Bearer {viewer_token}"}
