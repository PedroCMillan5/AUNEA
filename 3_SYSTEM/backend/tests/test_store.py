from aunea_backend.models import *
from aunea_backend.store import SQLiteStore
from aunea_backend.orchestrator import Orchestrator

def test_persistence_and_signal_derived_pain(tmp_path):
    store=SQLiteStore(tmp_path/'db.sqlite')
    eng=EngagementInput(
        engagement_id='SIG-1',process_instance_id='P',process_name='Signal test',
        evidence=[Evidence(evidence_id='E',type='CLIENT_DECLARED')],
        pain_signals=[PainSignalInput(pain_id='P05',direct_mechanism_present=True,concrete_evidence_present=True,signal_present=True,evidence_ids=['E'])],
        risks=[RiskInput(category='op',likelihood_1_5=1,impact_1_5=1)],
        commercial_scope=CommercialScope(scope_bounded=True,integrations_known=True,tool_tco_current=True)
    )
    out=Orchestrator(store=store).diagnose(eng)
    assert out.pain_results[0].state==PainState.CONFIRMED
    assert store.get_engagement('SIG-1') is not None
    assert store.latest_output('SIG-1') is not None
    assert len(store.list_runs('SIG-1'))==6


def test_latest_output_uses_insert_order_when_timestamps_tie(tmp_path):
    store=SQLiteStore(tmp_path/'db.sqlite')
    eng=EngagementInput(
        engagement_id='LATEST-1',process_instance_id='P',process_name='Latest output',
        risks=[RiskInput(category='op',likelihood_1_5=1,impact_1_5=1)],
        commercial_scope=CommercialScope(scope_bounded=True,integrations_known=True,tool_tco_current=True)
    )
    orch=Orchestrator(store=store)
    first=orch.diagnose(eng)
    second_eng=eng.model_copy(update={'process_name':'Latest output revised'})
    second=orch.diagnose(second_eng)
    # Force the same created_at to reproduce SQLite CURRENT_TIMESTAMP second-level ties deterministically.
    with store._connect() as con:
        con.execute("UPDATE diagnostic_outputs SET created_at='2026-09-14 19:00:00' WHERE engagement_id=?",('LATEST-1',))
    latest=store.latest_output('LATEST-1')
    assert first.input_snapshot_hash != second.input_snapshot_hash
    assert latest is not None
    assert latest.input_snapshot_hash == second.input_snapshot_hash
