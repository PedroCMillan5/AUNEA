"""Six contract-derived conjunctive source checks; independent paired oracles."""
import pytest
from aunea_backend.input_coverage import InputCoverageEngine
from aunea_backend.models import EngagementInput, EconomicInput


def engagement(answers=None, economics=None):
    return EngagementInput(
        engagement_id="QA-SUFF-FINAL", process_instance_id="QA-P", process_name="Proceso",
        questionnaire_answers={"_process_steps": [], **(answers or {})},
        economics=economics or [],
    )


def check(e, input_id):
    return next(i for i in InputCoverageEngine().run(e).items if i.input_id == input_id)


@pytest.mark.parametrize("case,input_id,answers,economics", [
    ("trigger_solo", "IN-P-01", {"DF012": "EMAIL"}, None),
    ("pico_solo", "IN-P-02", {"DF023": 120}, None),
    ("paso_incompleto", "IN-P-03", {"_process_steps": [
        {"id":"A", "step_name":"Recibir", "step_type":"ST02", "actor":"ADMIN", "normal_next_step":"B"},
        {"id":"B", "step_name":"Registrar", "step_type":"ST02", "actor":"", "normal_next_step":"__END__"}
    ]}, None),
    ("anual_sin_periodo", "IN-E-01", {"DF021": 120,"DF023": 300}, None),
    ("evidencia_solo_gaps", "IN-E-09", {"DF094": ["Pendiente"]}, None),
    ("resultado_de_sesion_no_objetivo", "IN-R-03", {"DF009": "Informe claro"}, None),
])
def test_incomplete_sources_do_not_cover(case, input_id, answers, economics):
    item = check(engagement(answers,economics),input_id)
    assert item.status == "GAP", (case,item.status)


@pytest.mark.parametrize("case,input_id,answers,economics", [
    ("trigger_and_outcome", "IN-P-01", {"DF012": "EMAIL", "DF013": "ARCHIVED"}, None),
    ("volume_and_unit", "IN-P-02", {"DF021": 120,"DF022":"MONTH"}, None),
    ("all_actors", "IN-P-03", {"_process_steps": [
        {"id":"A", "step_name":"Recibir", "step_type":"ST02", "actor":"ADMIN", "normal_next_step":"B"},
        {"id":"B", "step_name":"Registrar", "step_type":"ST02", "actor":"ADMIN", "normal_next_step":"__END__"}
    ]}, None),
    ("annual_volume", "IN-E-01", {"DF021": 120,"DF022":"MONTH"}, None),
    ("all_evidence", "IN-E-09", {}, [EconomicInput(driver_id="ED05",evidence_type="CLIENT_DECLARED")]),
    ("client_target", "IN-R-03", {"DF086": ["REDUCE_REWORK"]}, None),
])
def test_valid_joint_sources_cover(case,input_id,answers,economics):
    item=check(engagement(answers,economics),input_id)
    assert item.status=="COVERED",(case,item.status)


def test_partial_economics_cannot_mark_all_material_evidence_as_covered():
    e=engagement({},[
        EconomicInput(driver_id="ED05",evidence_type="CLIENT_DECLARED"),
        EconomicInput(driver_id="ED06",evidence_type=""),
    ])
    assert check(e,"IN-E-09").status=="GAP"
