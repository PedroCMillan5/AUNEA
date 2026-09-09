# AUNEA Internal — Master Index

Status: ACTIVE  
Version: 1.0  
Date: 2026-09-09

This repository document mirrors the Drive master index sufficiently to orient code work. Drive remains the human documentation source of truth; this file is a navigation aid for repository work.

## Current canonical assets

### Diagnostic / rules
- Drive canonical: `AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1.xlsx`
- Drive path: `02_NEGOCIO_CATALOGO/01_MAPA_OFERTA/00_DIAGNOSTIC_CANONICO`
- Drive file ID: `1f0WPb0BMElYbwB5oDBv-ypiyGKvURv4V`
- Previous v0.8 moved to `00_DIAGNOSTIC_CANONICO/99_ARCHIVO`.

### Backend
- Path: `3_SYSTEM/backend/`
- Current backend core: v1.1
- Includes Pain, Economics, Risk, Recommendation, Pricing, Scenario Comparator, Deliverables Engine, Solution Specification, Component Library and System Builder.
- Latest recorded local suite at closure: 19 tests passed.

### Frontend
- Current state: prototype under active UX/diagnostic refinement.
- The frontend must consume the Diagnostic Master and backend contracts; it must not define independent business rules.

## Layers

- L1 CRM & Relationships — target model defined; Airtable Operations consolidation pending.
- L2 Engagement & History — conceptual model defined; live persistence consolidation pending.
- L3 Diagnostic Capture — Diagnostic Master v1 canonical.
- L4 Process & Friction Model — Process Step Model v1 + Friction Model v1 canonical.
- L5 Evidence & Economics — rules/backend implemented; real calibration pending.
- L6 Decision Engines — implemented.
- L7 Scenario / Product / Pricing — implemented in backend; frontend refinement pending.
- L8 Client Experience & Deliverables — Deliverables backend implemented; Client Web and PPTX master pending.
- L9 System Delivery & Learning — Solution Specification + System Builder implemented; Learning Loop awaits real projects.

## Mandatory navigation

Before code work, read `PROJECT_RULES.md` and confirm the current canonical source for the layer being changed.

## Drive governance docs

- `00_AUNEA_INTERNAL_MASTER_INDEX`
- `01_METODOLOGIA_AUNEA_INTERNAL`
- `ESTADO_AUNEA`
- `ROADMAP_AUNEA`
- `DECISIONES_AUNEA`
- `BITACORA`

## Rule

If this file and Drive disagree, Drive governance documents + the canonical asset named there govern. Update this mirror in the same change set.
