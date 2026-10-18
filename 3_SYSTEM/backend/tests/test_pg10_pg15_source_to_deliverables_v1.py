"""Source completeness is not the same as a confirmed or publishable diagnosis."""
import json
from pathlib import Path
from aunea_backend.models import EngagementInput,PainSignalInput,Evidence
from aunea_backend.orchestrator import Orchestrator

FIXTURE=Path(__file__).parent/'fixtures'/'qa55_positive_owner_sources_v1.json'

def study():
    return EngagementInput.model_validate(json.loads(FIXTURE.read_text('utf-8')))

def confirmed(e):
    e.pain_signals=[
        PainSignalInput(pain_id='P13',direct_mechanism_present=True,
            concrete_evidence_present=True,signal_present=True,
            evidence_ids=['EV-P13'],rationale='Incidencias observadas'),
        PainSignalInput(pain_id='P20',direct_mechanism_present=True,
            concrete_evidence_present=True,signal_present=True,
            evidence_ids=['EV-P20'],rationale='Búsqueda manual repetida')]
    e.evidence=[Evidence(evidence_id='EV-P13',type='CLIENT_DECLARED',description='Fallos de clasificación'),
        Evidence(evidence_id='EV-P20',type='CLIENT_DECLARED',description='Búsqueda de información')]
    return e

def test_all_55_covered_inputs_cannot_replace_confirmed_findings():
    o=Orchestrator();d=o.diagnose(study())
    assert d.input_coverage.status=='COMPLETE'
    assert not d.pain_results
    pack=o.generate_deliverables(d)
    assert pack.status=='BLOCKED_SCENARIO_NOT_SELECTABLE'
    assert any('hallazgos suficientes' in issue for issue in pack.issues)
    assert all('NO AUTORIZADO' in a.content for a in pack.artifacts
               if a.media_type in ('text/html','text/markdown'))

def test_confirmed_findings_do_not_override_quote_and_implementation_gates():
    o=Orchestrator();e=confirmed(study());d=o.diagnose(e)
    assert d.input_coverage.status=='COMPLETE'
    assert all(p.state.value=='CONFIRMED' and p.confidence!='UNKNOWN' for p in d.pain_results)
    pack=o.generate_deliverables(d)
    assert pack.status=='DRAFT'
    assert any('cotización' in issue for issue in pack.issues)
    spec=o.generate_solution_specification(e,d)
    assert spec.status=='DRAFT_MISSING_IMPLEMENTATION_INPUTS'
    assert spec.missing_information
