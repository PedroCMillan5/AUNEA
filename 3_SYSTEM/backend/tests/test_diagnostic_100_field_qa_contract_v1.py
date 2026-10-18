"""Read-only regression: no DF orphan, no invented 55-input source, correct governed owner."""
import csv
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]


def test_traceability_review_covers_all_100_canonical_field_owners_and_55_sources():
    fields=json.loads((ROOT/'3_SYSTEM/frontend/data/diagnostic-master.min.json').read_text(encoding='utf-8'))['fields']
    input_rows=json.loads((ROOT/'3_SYSTEM/backend/data/diagnostic_input_contract_v12.json').read_text(encoding='utf-8'))['rows']
    report=ROOT/'docs/QA/AUNEA_DF001_DF100_RESULTADO_A_CAMPO_REVIEW_20261018.csv'
    with report.open(encoding='utf-8-sig',newline='') as handle:
        qa=list(csv.DictReader(handle,delimiter=';'))
    assert len(fields)==len(qa)==100
    assert len(input_rows)==55
    canonical={f['Field_ID']:f for f in fields}
    mapped={q['Field_ID']:q for q in qa}
    assert set(canonical)==set(mapped)=={f'DF{i:03}' for i in range(1,101)}
    for fid,field in canonical.items():
        row=mapped[fid]
        assert row['Owner']==str(field['Write_Target'] or '')
        assert row['Fuente_reutilizacion']==str(field['Reuse_From'] or '')
        declared={x['Input_ID'] for x in input_rows if fid in x['Source_Fields']}
        assert set(filter(None,row['Entradas_backend_que_lo_mencionan'].split('|')))==declared
        assert row['Estado'].startswith('REVIEW:')
    assert sum(bool(x['Entradas_backend_que_lo_mencionan']) for x in qa)==78
