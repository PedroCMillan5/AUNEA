# AUNEA Internal Frontend

Status: PROTOTYPE / UX refinement  
Current prototype version: v0.3.1  
Date: 2026-09-09

## Source-of-truth rule

Frontend code belongs in GitHub. Business rules do not.

The current prototype artifact has been preserved in Drive as a development reference:
`09_OPERACION_INTERNA/06_AUNEA_INTERNAL/01_DOCUMENTACION_FUNCIONAL/AUNEA_INTERNAL_FRONTEND_v0.3.1_PROTOTYPE_REFERENCE.zip`
Drive file ID: `1eeaj_5Agjv2f_gr3TviEtDpEda3aCQhV`.

This ZIP is a reference artifact, not a canonical rule source.

## Current implementation rule

The next frontend iteration must be updated against:
- `AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1.xlsx`
- backend contracts under `3_SYSTEM/backend/`
- `PROJECT_RULES.md`

No question, field, branching rule, recommendation, pricing rule or scenario rule may be introduced in the browser without a canonical data/rule source.

## Expected modules

- Home / Cockpit
- Companies / Contacts / Interactions / Opportunities
- Engagements / Studies
- Diagnostic 90m
- Process flow + friction review
- Results
- Recommendation
- Scenario Comparator
- Quote
- Client View publishing
- Deliverables / PPTX / email handoff
- Admin / Audit

## Next frontend milestone

Implement Diagnostic Master v1 + Process/Friction Model v1 faithfully, then connect the frontend to backend v1.1.

## Development preview

A local prototype can still be served with:

```bash
python -m http.server 5173
```

The current prototype is not production and must not be treated as a source of business logic.
