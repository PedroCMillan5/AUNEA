"""Technical generation and client approval are separate gates."""
from aunea_backend.orchestrator import Orchestrator
from aunea_backend.deliverables import DeliverablesEngine
from aunea_backend.models import InputCoverageResult
from test_deliverables import fixture_engagement

def test_draft_or_blocked_artifacts_marked_nonpublishable():
    d=Orchestrator().diagnose(fixture_engagement())
    pack=DeliverablesEngine().generate(d)
    assert pack.status!='READY'
    for a in pack.artifacts:
        if a.media_type in ('text/markdown','text/html'):
            assert 'NO AUTORIZADO PARA ENTREGA AL CLIENTE' in a.content
            assert pack.status in a.content

def test_ready_is_still_subject_to_client_authorization():
    d=Orchestrator().diagnose(fixture_engagement())
    d.input_coverage=InputCoverageResult(status='COMPLETE')
    pack=DeliverablesEngine().generate(d)
    if pack.status=='READY':
        for a in pack.artifacts:
            if a.media_type in ('text/markdown','text/html'):
                assert 'REQUIERE APROBACIÓN EXPRESA DEL CONSULTOR' in a.content
