import pytest
from fastapi.testclient import TestClient

from aunea_backend.api import app

client = TestClient(app)


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:8010",
        "http://127.0.0.1:8020",
    ],
)
def test_local_origins_are_allowed(origin: str):
    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


def test_non_local_origin_is_not_allowed():
    response = client.get("/health", headers={"Origin": "https://example.com"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
