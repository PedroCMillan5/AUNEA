# AUNEA Internal — Backend regression + 55-input coverage (18 Oct 2026)

**Status: QA REVIEW; no product/canonical release.** Branch: `work/as-is-ux-simplification-20260930`.

## Executed evidence
- Full backend local regression: **234/234 tests passed**, no failures. This is from a local code copy reconciled with the current branch changes, **not a verified GitHub Actions run at a pinned HEAD SHA**.
- Input coverage contract: **55/55** unique rows from `3_SYSTEM/backend/data/diagnostic_input_contract_v12.json`.
- Full owner-sourced synthetic fixture: **55 COVERED**.
- Empty captured fixture: **16 GAP + 39 NOT_APPLICABLE**; no false COVERED.
- Removal of all input-specific sources, including separate confirmed pain observations for IN-R-01: **50 GAP + 5 NOT_APPLICABLE**.
- Additional directed oracles: **14/14 passed** on routing/confirmed pains/risk unknowns.

## Confirmed code repairs
1. `IN-R-01 confirmed_pains`: an INDICATED observation or unevidenced pain signal is **not** a confirmed pain. Confirmed PainObservation, PainEngine-confirmable structured signal or full confirmed DF093 friction details are accepted.
2. `IN-P-03 process_steps`: every active ProcessStep needs a routing destination referencing an active step or `__END__`. One valid routing reference cannot mask an incomplete sibling.
3. `IN-K-03 likelihood_impact`: the three RiskInput classification flags consumed by RiskEngine must also be explicit; otherwise InputCoverage cannot report complete while RiskEngine reports INPUT_GAP.

The existing six jointly required groups and risk owner record-completeness tests remain in force.

## Traceability / contract caveats
- IN-R-01 accepts PainObservation and structured PainSignal as independently confirmed technical paths. The Source_Fields list only DF056, DF058, DF059, DF093. Record this difference in the next governed contract decision instead of silently editing the canonical workbook.
- Eleven input groups have deeper conjunctive/per-record rules. Forty-four groups use mostly contractual any-source semantics. Their presence/absence tests pass, but semantic sufficiency for all valid alternatives **is not certified**.
- IN-E-10 coverage is not by itself proof of monetary deduplication. Global graph reachability and economic/event accuracy require separate integration gates.
- No DF fields added/removed, no product/pricing changes, no Master Index or DECISIONES version change, and no CI pass claimed.

## Regression tests in GitHub
- `test_55_input_no_unsourced_coverage_v1.py` — 55 negative cases.
- `test_55_input_positive_owner_sources_v1.py` with fixture `fixtures/qa55_positive_owner_sources_v1.json` — 55 positive cases and fixture ownership checks.
- `test_confirmed_pains_coverage_v1.py` — confirmed vs indicated Pain sources.
- `test_coverage_joint_extras_v1.py` — every-step routing and risk flags.
- `test_risk_capture_provenance_v1.py` — risk owner provenance.

## Remaining gates
- Independent semantic interpretation and result-level sufficiency for contractual alternatives.
- End-to-end 9-page browser UAT and PG10–PG15 actual approved deliverables.
- No 90–95% diagnostic reliability claim.

Local QA artifacts: 55-input CSV matrix, 14 directed-oracle JSON, complete pytest log and standalone JSON fixtures available in the accompanying QA ZIP.
