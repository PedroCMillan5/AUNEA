# AUNEA — Project Rules

Status: ACTIVE  
Version: 1.0  
Date: 2026-09-09

This file is the repository-side operating contract for future work on AUNEA Internal.

## Sources of truth

- **Google Drive**: human documentation, knowledge, assets and deliverables.
- **GitHub**: code, schemas, engines, runtime registry, component library and frontend.
- **Airtable**: live AUNEA operations.
- **Client environment**: client production data, credentials and systems.
- **AUNEA Internal**: UI only; never a fourth source of truth.

## Mandatory build order

1. Data model
2. Rules and contracts
3. Interface
4. Deliverables

The UI represents business logic; it does not define it.

## Core rules

1. One rule, one source.
2. No UI field without a defined data target.
3. No diagnostic question without a documented objective.
4. Do not re-ask captured information unless validating evidence, resolving a contradiction, changing scope or confirming a derived value.
5. Prefer structured controls: single-select, dropdown, multiselect, checkbox, number+unit, date and structured tables. Use free text only when the information cannot reasonably be tabulated.
6. Evidence classes are not interchangeable: measured, client-declared, estimated and hypothesis must remain distinct.
7. Waiting time is not active labour. Released capacity is not cash saving.
8. The optimal recommendation is immutable; consultant changes create governed alternatives/overrides.
9. Do not present demos as paid client cases.
10. Never store credentials or secrets in Drive or GitHub.

## Diagnostic contract

The canonical diagnostic is maintained in Drive under:
`02_NEGOCIO_CATALOGO/01_MAPA_OFERTA/00_DIAGNOSTIC_CANONICO`.

Current canonical asset at this version of the rules:
`AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1.xlsx`.

Every diagnostic field must define, where applicable:
- canonical ID;
- Spanish label/question;
- objective;
- UI control;
- option set;
- requiredness;
- branching;
- validation;
- example;
- source/evidence behavior;
- engine/output consumer.

Every friction must link to one or more process steps. The client describes/selects the friction; AUNEA derives the internal Pain mapping.

## Change classification

Before implementing, classify the change:

- **Visual**: layout/style/copy with no semantic effect.
- **Functional UI**: workflow/control over existing data.
- **Schema/Data**: entities, fields, relations or ownership.
- **Rule/Engine**: calculations, branching, recommendation, risk, economics or pricing.
- **Commercial**: products, scope, price or TCO policy.
- **Architecture**: source of truth, ownership or platform boundary.

Rule, commercial and architecture changes require explicit governance updates.

## Definition of Done

A change is closed only when:

- implemented in the correct source;
- no contradictory duplicate rule remains;
- applicable tests/QA pass;
- frontend/backend contracts remain coherent;
- superseded versions are archived when needed;
- the Master Index is updated if version/location/status changed;
- DECISIONES_AUNEA is updated if a rule/architecture decision changed;
- ESTADO_AUNEA is updated if project status materially changed;
- ROADMAP_AUNEA is updated if sequence/dependencies changed;
- BITACORA records the milestone.

## Required session startup

Before changing AUNEA:

1. Read `00_AUNEA_INTERNAL_MASTER_INDEX` in Drive.
2. Identify the affected layer.
3. Open the current canonical asset for that layer.
4. Review related active decisions.
5. Define acceptance criteria before implementation.

## Required session close

1. Run QA/tests.
2. Confirm one source of truth.
3. Update version/status.
4. Update Master Index.
5. Update Decision/State/Roadmap/Bitacora when applicable.
6. Archive superseded artifacts.

## Status vocabulary

- `DRAFT`: incomplete, does not govern.
- `REVIEW`: candidate undergoing QA/approval.
- `CANONICAL`: current governing source.
- `ARCHIVED`: historical, does not govern.
- `PILOT`: implemented for real testing but not calibrated enough for production claims.
- `PRODUCTION`: validated for real use under defined controls.

Do not use “closed” as a synonym for production when only design, rules or backend core are complete.
