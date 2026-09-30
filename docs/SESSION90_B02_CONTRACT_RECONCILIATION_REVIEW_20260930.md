# AUNEA Internal · B02/B03 data–rules–architecture reconciliation

State: REVIEW (technical reconciliation completed; canonical promotion not authorised by outstanding gates).
Branch: work/cf01-cf06-functional-language-20260930
Baseline: work/astra-session90-b04. This is not a replacement for any Drive CANONICAL.

## Governing sources inspected
- 00_AUNEA_INTERNAL_MASTER_INDEX: v1.44, Drive 16ZaNWcBHZ0WoHKH1aizAfrxnAJLeD89O9_ruu5Q1OZ4.
- PROJECT_RULES.md: v1.7; data → rules → interface → deliverables; one owner, one capture; FROZEN protected.
- DECISIONES_AUNEA v1.27: DEC-050, DEC-055, DEC-063/064/065, DEC-066 and approved DEC-068.
- Diagnostic Master v1.2 CANONICAL: XLSX Drive 1HRlB30kpziDc3WNPxMVj0HfXuRUdOgbW.
- Simulator CANONICAL v1.14: Google Doc 1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM.
- Architecture Contract CANONICAL v1.7 by file title: native Sheet 1K5jfYePIEU25LYH1KAEgWa8QOEvV9HpgQoGN6pWelyM.
- Candidate Diagnostic Master v1.3_B02_REVIEW: XLSX 1sHGwsiOhG4FAOaLLDvKu8AXGQP6N3eBZ.
- Candidate Simulator REVIEW v1.15_B02: Doc 1HCsrj75N2Z5AMVcGTEgpYophZanaQkeedoGK-971J5E.
- Candidate Architecture REVIEW v1.8_B02: XLSX 1pDIyvYeEE0lkmMB1L5K09LmMkG5skISO.

## 1. Candidate Diagnostic Master — comparison with governing v1.2
Read the respective Drive XLSX files and compared text-extracted records as a multiset, avoiding the misleading row-offset differences caused by inserted rows. Changes detected:
- document version/date/status metadata advance to v1.3_B02_REVIEW, NOT CANONICAL;
- RT_FRICTION gains technical Time_Attribution {mode,step_id};
- new EAR-015 REVIEW derives DEC-068; INCLUDED and BREAKDOWN never add DF062; ADDITIONAL only aggregates once if frequency, calendar, evidence and unique owning step are valid;
- OS_FRICTION_TIME_ATTRIBUTION introduces exactly INCLUDED/BREAKDOWN/ADDITIONAL;
- friction model and RT_FRICTION contract gain the unique-owner relation without adding a new DF question;
- DF062 description changes from “trabajo activo adicional” to neutral “trabajo activo de la fricción”; attribution determines additionality.
No replacement of DF001–DF100 or standalone creation of a duplicate cost question was found in the compared records. This comparison is structural, NOT full Excel formula/format/validation QA; source remains REVIEW pending workbook-native QA and release gate.

## 2. Candidate Simulator — comparison with v1.14
The candidate's extracted text begins with the full byte-identical 139,102-character v1.14 content and appends sections 47 (B02) and 48 (B03). It correctly records:
- Friction owns time_attribution, owner step must be active and in affected_steps;
- backend time projection separates work, rework, passive waiting and validated ADDITIONAL;
- ED01/ED05/ED13 and cached DF078/DF079 remain server-derived;
- EAR-001/004/006/012 preflight/HTTP409 prevents ambiguous economic totals;
- DF063 is context for monetary reconciliation, never an automatically additional DF082 line;
- no extra field in FROZEN or new role costs/rules.
Adenda contains historical CI counts for its former baseline; these must be refreshed before any promotion. Keep v1.15 REVIEW.

## 3. Candidate Architecture — comparison with v1.7 titled asset
The text comparison identifies: status/header change; PG05 time attribution added to existing page relationship; Friction owner augmented; new N:1 conditional TIME_OWNED_BY ProcessStep with superseded-owner pending state; new DG-B02 and QA-B02. These statements agree with DEC-068 and the candidate Diagnostic Master.
Material pre-existing metadata inconsistency: the Drive file is named *AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7*, but its live 00_RESUMEN first cell says *CANONICAL v1.5* (and has older governance references). Resolve the internal version/governance pointers in the native source before any promotion. Candidate v1.8 explicitly remains REVIEW and DG-B02 marks promotion as blocked.

## 4. Economics-by-actor reconciliation (DF076)
Existing governing field DF076 is ROLE_RATE_TABLE (EUR/hour per role + evidence; CONDITIONAL, only if defensible). It belongs in PG07 and reuses ProcessStep.actor. No new DF code, price, fixed default or blanket wage range is introduced.
Implementation in REVIEW: one rate with evidence for each distinct step role, saved once via Engagement.answers.DF076; an EconomicInput scoped to steps of exactly one role reuses the documented rate in existing capacity_cost_rate_eur_hour. Mixed-role scope may store time but receives NO fabricated blended rate. A changed owner rate invalidates the active Impact confirmation and any previously owner-derived rate is synchronised; pre-existing unmatched amounts are flagged for explicit review. The existing backend EconomicsEngine owns annual active hours × capacity rate, never converts waiting into working time or capacity value into realised cash saving.
Known evidence limitation: the backend EconomicInput currently carries a single evidence_type for the whole record rather than independent per-component evidence links. The DF076 table keeps its own rate evidence in the engagement, but native evidence-per-claim and allocation/ED12 require their separate QA gate. Do not present a combined confidence claim beyond what these records support.

## 5. Gate and decision
Approved business rule: DEC-068 remains the governing decision. No new decision needed to restate it. The three candidate assets are semantically aligned for their B02 changes as detailed above, but NONE is promoted here:
- native workbook QA (formulas/validation) and Architecture's internal version metadata need reconciliation;
- money-event overlap across ED02–ED08 and documented direct-loss event identities still requires evidence-based QA;
- UAT visual/nativa Windows/Chrome/Edge has not been performed;
- updated cross-asset version metadata and Master Index need publication together after those gates.
Do not update Master Index to claim a new CANONICAL while the governing asset has not changed. No main merge, no FROZEN mutation, no false PRODUCTION status.

## 6. Executed code/QA
On work/cf01-cf06-functional-language-20260930: frontend/domain/economics.js DF076 role table, one-profile scoping and read-through; core/state.js rate-change invalidation; process-lifecycle.js blocks confirmation of rate mismatches; test coverage in frontend/tests/economic-builder-v1.test.cjs and CODE_BLOCK_INDEX.md. GitHub frontend CI run 36720856866: 367/367 PASS (HEAD 0a62677425f76707ee6ead033c16ca5f5814b2c1). Subsequent docs-only changes do not change executable code. Existing B02/B03 backend QA is historical as documented in SESSION90_EXECUTION_HANDOFF_20260929.md; it was not rerun for this frontend-only iteration.

Next remaining gate: native visual UAT and explicit publication of reconciled candidates; keep all candidate labels REVIEW until accomplished.
