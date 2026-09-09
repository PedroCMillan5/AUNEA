# AUNEA Internal Frontend

Status: PROTOTYPE / UX refinement  
Historical prototype version: v0.3.1  
Next product version: v1.0  
Date: 2026-09-09

## Source-of-truth rule

Frontend code belongs in GitHub. Business rules do not.

The historical prototype artifact has been preserved in Drive as a development reference:
`09_OPERACION_INTERNA/06_AUNEA_INTERNAL/01_DOCUMENTACION_FUNCIONAL/AUNEA_INTERNAL_FRONTEND_v0.3.1_PROTOTYPE_REFERENCE.zip`
Drive file ID: `1eeaj_5Agjv2f_gr3TviEtDpEda3aCQhV`.

This ZIP is a reference artifact, not a canonical rule source.

## AUNEA Internal v1.0

v1.0 is the first integrated functional product version of AUNEA Internal. It must consume the canonical diagnostic/data model rather than carrying provisional questionnaire logic from the prototype.

v1.0 is built against:
- `AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1.xlsx`
- backend contracts under `3_SYSTEM/backend/` (backend v1.1)
- `PROJECT_RULES.md`

No question, field, branching rule, recommendation, pricing rule or scenario rule may be introduced in the browser without a canonical data/rule source.

## v1.0 core acceptance scope

- Home / Cockpit
- Companies / Contacts / Interactions / Opportunities
- Engagements / Studies
- Diagnostic 90m schema-driven
- Process-step structured capture
- Frictions linked to process steps
- Editable process + friction review with the client
- Results
- Recommendation and meeting recap
- Scenario Comparator
- Quote
- Save/persistence contract prepared for AUNEA Operations
- Admin / Audit

Client View publishing, final PPTX automation and email handoff consume the same Engagement snapshot and may continue as the next L8 delivery increment after the v1.0 internal flow is stable.

## Version semantics

- `v0.3.1`: historical prototype/reference only.
- `v1.0`: first integrated functional version.
- `PILOT`: v1.0 can be used in controlled real diagnostics before empirical calibration is complete.
- `PRODUCTION`: only after applicable validation, persistence/security/deployment controls and real-use QA are complete.

## Development preview

A local build may be served with:

```bash
python -m http.server 5173
```

The historical prototype is not production and must not be treated as a source of business logic.
