# AUNEA — Project Rules

Status: ACTIVE  
Version: 1.1  
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
11. Every meaningful code responsibility must have a stable Block_ID and START/END markers according to `CODE_CONVENTIONS.md`.
12. Existing runtime code is tagged only on the reconciled current version; do not add maintenance comments to stale/superseded copies and then treat them as current.

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

## Code identification contract

Detailed rules are maintained in `CODE_CONVENTIONS.md`.

Block identifier format:
`AUNEA-<LAYER>-<COMPONENT>-<TYPE>-<NNN>`

The identifier describes a responsibility, not a line range or version. A responsibility keeps its Block_ID when moved or refactored. Retired Block_IDs are never reused for another responsibility.

For HIGH/CRITICAL blocks, comments must identify purpose, canonical source/contract, inputs, outputs, side effects and change risk. Business Field_IDs, Rule_IDs, Error_IDs and code Block_IDs remain separate namespaces.

The practical goal is targeted maintenance: future work should be able to locate a Block_ID, fetch only the relevant code region, inspect its dependency contract and apply a controlled change without rereading unrelated files.

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
- new/materially changed code responsibilities have Block_ID comments and a maintained block-index entry;
- relevant UAT/regression coverage is linked for HIGH/CRITICAL blocks;
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
6. Locate affected Block_IDs or assign them before materially changing code.

## Required session close

1. Run QA/tests.
2. Confirm one source of truth.
3. Confirm Block_ID/index consistency for changed code.
4. Update version/status.
5. Update Master Index.
6. Update Decision/State/Roadmap/Bitacora when applicable.
7. Archive superseded artifacts.

## Status vocabulary

- `DRAFT`: incomplete, does not govern.
- `REVIEW`: candidate undergoing QA/approval.
- `CANONICAL`: current governing source.
- `ARCHIVED`: historical, does not govern.
- `PILOT`: implemented for real testing but not calibrated enough for production claims.
- `PRODUCTION`: validated for real use under defined controls.

Do not use “closed” as a synonym for production when only design, rules or backend core are complete.