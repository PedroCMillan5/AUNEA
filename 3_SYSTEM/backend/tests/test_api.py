from fastapi.testclient import TestClient
from aunea_backend.api import app

def test_health_and_registry():
    c=TestClient(app)
    h=c.get('/health')
    assert h.status_code==200 and h.json()['status']=='ok'
    r=c.get('/registry/status').json()
    assert r['version']=='v0.8' and r['tables']>=10 and r['rows']>=80
