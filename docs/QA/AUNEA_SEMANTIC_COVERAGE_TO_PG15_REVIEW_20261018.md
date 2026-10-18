# AUNEA Internal — semantic coverage → PG10–PG15 (18 October 2026)
**Status: REVIEW / no CANONICAL change, not production certified.**

## Sources
- Master Index v1.58, PROJECT_RULES.md v1.7 and DECISIONES_AUNEA v1.34; Diagnostic Master v1.2; Simulator CANONICAL v1.14 and Architecture Contract.
- Actual branch: `work/as-is-ux-simplification-20260930`. No work on main.

## Tested and integrated
1. **Single owner**: an answer object that asserts `DF031/033/044/056/058/059/068–074/076/078–083/085` cannot supplant the real owner in ProcessStep/Friction/RiskInput/EconomicInput. The QA-only counterfactual uses a deliberately false loose DF value.
2. **Structural graph**: IN-P-03 must have unique step IDs, valid next/END and alternative references, complete reachability from first step, and a path to END for all steps. Tested positive legitimate branched loop, negative orphan, duplicate, disconnected and endless-loop examples.
3. **Economic evidence**: `EconomicInput.evidence_type` accepts only the five already-governed source categories or no source, not an invented evidence string.
4. **Governance**: `_coverage_ack=False/None` is not a confirmed closeout. The affirmative route and derived DF094/DF095 still need independent review of evidence sufficiency; no new DF was introduced.
5. **Pain evidence linkage**: a PainSignal claiming concrete evidence is only auto-CONFIRMED when the referenced Evidence_ID actually exists; IN-R-01 mirrors the PainEngine rule. Explicit client confirmation is separately allowed with LOW confidence if unmeasured.
6. **Deliverables**: MD/HTML/PDF disclose DRAFT or BLOCKED; a technically READY draft still requires consultant/client publication approval. PDF preview rendered and inspected. No economic or recommendation engine is rerun during rendering.

## Actual regression
- **272/272 backend pytest cases passed locally** in a safe code copy reconciled with GitHub changes. This is **not** a GitHub Actions CI result for the branch tip.
- The previous 55 source input test remains positive on its synthetic owner-consistent fixture; 11 input groups have focused joint/record/confirmation rules and 44 use mainly contractual alternative-presence logic.
- Those 44 have NOT been certified as semantically sufficient to generate individual business conclusions. `COVERED` is not equivalent to `CONFIRMED PAIN`, `VALID ECONOMIC BENEFIT`, `APPROVED TO-BE` or `PUBLISHED`.

## Two output oracles (synthetic, not real client cases)
- QA55 without confirmed findings: 55/55 input sources COVERED; 0 PainResults; recommendation ACT00; **pack BLOCKED_SCENARIO_NOT_SELECTABLE**. No invented findings.
- QA55 with two direct mechanisms and two linked CLIENT_DECLARED Evidence records: 55/55 input sources COVERED; P13/P20 CONFIRMED with MEDIUM confidence; quote PROVISIONAL; pack **DRAFT**; solution specification **DRAFT_MISSING_IMPLEMENTATION_INPUTS**. Technical source completeness does not override price/implementation approval gates.
- PDF preview from a separate synthetic fixture: real PDF, banner 'BORRADOR NO AUTORIZADO PARA ENTREGA AL CLIENTE' and 'Estado del paquete: DRAFT' verified with text extraction and rendered cover.

## Remaining blockers
- Semantic independent oracles for 44 source groups and business conclusions; conditionally missing fields subject to canonic governance.
- Browser-driven complete 9-screen UAT, with persistent save, confirm/undo, recalculation and final results from approved snapshot; browser is blocked in the current execution environment.
- PG11 TO-BE and PG12 comparison validated against independently defined processes, PG13 implementation feasibility, PG14 selectable economically sound scenarios and PG15 client publication.
- Independent business expert validation, live 90-minute interview timing and outcome reliability. No 90–95% quality claim.
- A correct process with confirmed evidence and governed pricing/solution approval is required for a true full positive PG10–PG15 case. Do not override blocked synthetic quotes just to green-test a release.

## Reproducible files
- `test_owner_graph_semantic_sufficiency_v1.py`, `test_pg10_pg15_source_to_deliverables_v1.py`, `test_pain_evidence_link_integrity_v1.py`, `test_pg15_draft_disclosure_v1.py`, `test_pg15_pdf_status_v1.py`, `test_governance_ack_is_true_v1.py`.
- External QA artifacts: `MATRIZ_55_QUE_DEMUESTRA_Y_QUE_NO.csv`, `PG10_PG15_CASOS_Y_RESULTADOS_REALES.json`, PDF preview and reproduction notes.

**Release verdict:** do not declare DF001–DF100 minimally sufficient or the diagnostic customer-ready from technical coverage/regression scores.
