"""IN-R-01 cannot treat INDICATED signals as already confirmed.

The confirmation conditions mirror PainEngine's structured signal classification;
complete DF056/DF058/DF059 plus DF093 is the other canonical source route.
"""
import pytest
from aunea_backend.models import EngagementInput, PainObservation, PainSignalInput, PainState
from aunea_backend.input_coverage import InputCoverageEngine


def study(pains=None, signals=None, answers=None):
    return EngagementInput(
        engagement_id="QA-R01", process_instance_id="QA-R01", process_name="Review case",
        questionnaire_answers={"_process_steps":[], **(answers or {})},
        pains=pains or [], pain_signals=signals or [])


def status(e):
    return next(row for row in InputCoverageEngine().run(e).items
                if row.input_id=="IN-R-01").status


@pytest.mark.parametrize("state",[
    PainState.INDICATED, PainState.INSUFFICIENT_EVIDENCE, PainState.NOT_DETECTED])
def test_unconfirmed_pain_does_not_count_as_confirmed(state):
    assert status(study(pains=[PainObservation(pain_id="P03",state=state)]))=="GAP"


def test_weak_signal_does_not_count_as_confirmed():
    assert status(study(signals=[PainSignalInput(pain_id="P03",signal_present=True)]))=="GAP"


def test_confirmed_observation_counts():
    assert status(study(pains=[PainObservation(pain_id="P03",state=PainState.CONFIRMED)]))=="COVERED"


def test_concrete_direct_mechanism_counts_like_pain_engine():
    assert status(study(signals=[PainSignalInput(
        pain_id="P03",direct_mechanism_present=True,concrete_evidence_present=True)]))=="COVERED"


def test_exclusion_defeats_mechanism():
    assert status(study(signals=[PainSignalInput(
        pain_id="P03",direct_mechanism_present=True,concrete_evidence_present=True,
        exclusion_condition_present=True)]))=="GAP"


def test_global_confirmation_alone_does_not_validate_incomplete_friction():
    assert status(study(answers={"DF093":"YES","_frictions":[
        {"id":"F1","friction_type":"P03"}]}))=="GAP"


def test_complete_friction_requires_global_df093_confirmation():
    row={"id":"F1","friction_type":"P03","cause":"Manual duplicate entry",
         "affected_steps":["S1"]}
    assert status(study(answers={"_frictions":[row]}))=="GAP"
    assert status(study(answers={"DF093":"YES","_frictions":[row]}))=="COVERED"
