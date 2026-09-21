from fastapi.testclient import TestClient
from aunea_backend.api import app

def test_health_and_registry():
    c=TestClient(app)
    h=c.get('/health')
    assert h.status_code==200 and h.json()['status']=='ok'
    r=c.get('/registry/status').json()
    assert r['version']=='v0.8' and r['tables']>=10 and r['rows']>=80

def test_cors_allows_local_and_codespaces_frontend_origins():
    c=TestClient(app)
    for origin in (
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://example-codespace-5500.app.github.dev",
    ):
        r=c.get('/health', headers={"Origin": origin})
        assert r.status_code==200
        assert r.headers.get("access-control-allow-origin")==origin
