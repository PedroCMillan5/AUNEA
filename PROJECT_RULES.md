# AUNEA — Project Rules

Status: ACTIVE  
Version: 1.6  
Date: 2026-09-18

This file is the repository-side operating contract for future work on AUNEA Internal.

## Sources of truth

- **Google Drive**: human documentation, knowledge, assets and deliverables.
- **GitHub**: code, schemas, engines, runtime registry, component library and frontend.
- **Airtable**: live AUNEA operations.
- **Client environment**: client production data, credentials and systems.
- **AUNEA Internal**: UI only; never a fourth source of truth.

## AUNEA System repository taxonomy

Within `3_SYSTEM`, technical implementations are classified by purpose:

- **Producto = se vende.** A product is a System solution intended for commercialization and client implementation.
- **Herramienta = se usa.** A tool is executable software used by AUNEA to analyze, operate, calculate, demonstrate, configure or deliver work; it is not a sellable product unless a canonical source explicitly promotes it.

The active System simulator is classified as a **Herramienta** and lives under `3_SYSTEM/02_HERRAMIENTAS/simulador/`. Superseded technical versions belong under `3_SYSTEM/99_ARCHIVO_TECNICO/`.

Human/commercial documentation and business assets remain governed in Google Drive; GitHub stores only the corresponding technical implementation, schemas, components and executable artifacts.

## System simulator functional contract

The human canonical contract for the AUNEA System simulator is maintained in Google Drive:

`AUNEA_SYSTEM_SIMULATOR_CANONICAL`  
Drive ID: `1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM`  
Location: `04_SYSTEM/01_METODOLOGIA`.

The Diagnostic Master remains authoritative for DF001–DF100 semantics, requiredness, branching, option sets, evidence behavior, write targets and engine consumers. The simulator canonical governs orchestration: pages, navigation, field placement, Internal/Client/Deliverable surfaces, AS-IS → diagnosis → TO-BE → solution → scenarios → deliverables, and Template System behavior.

The technical simulator implementation in GitHub must conform to that contract; HTML/frontend code does not define or override the business contract.

Process, Step, Friction, Risk and Economic Impact templates may prefill, suggest, derive candidates or instantiate drafts, but must never auto-confirm client reality. Confirmation must come from a governed source or explicit engagement validation under the No-Reask rules.

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
13. Internal technical names, identifiers, entities and code may remain in English, but every user-visible surface for consultant or client must be presented in Spanish: page titles, labels, questions, help text, states, messages, errors, controls, explanations, results and deliverables. Internal codes may be exposed only when needed for traceability and never replace Spanish wording.

## Diagnostic contract

The canonical diagnostic is maintained in Drive under:
`02_NEGOCIO_CATALOGO/01_MAPA_OFERTA/00_DIAGNOSTIC_CANONICO`.

Current canonical asset at this version of the rules:
`AUNEA_DIAGNOSTIC_DATABASE_v0.9.2_DIAGNOSTIC_MASTER_V1.2.xlsx`  
Drive ID: `1HRlB30kpziDc3WNPxMVj0HfXuRUdOgbW`.

The previous `AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1` is ARCHIVED and no longer governs new capture. Legacy runtime/storage snapshot names do not change the human canonical source.

Sector/area ownership is explicit: `Company.Sector` / DF002 uses `REF_INDUSTRY_CNAE25` (CNAE-2025 section level). `REF_DOMAIN` represents functional/process domains and may be referenced by `RT_ENGAGEMENT.Business_Area_ID`; business area belongs to each Engagement and must never be duplicated as a Company attribute. Projects may inherit/reference the Engagement area. No engine may use Business_Area_ID unless a canonical rule explicitly declares it as a consumer.

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