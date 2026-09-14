# DRIVE_CLEANUP_RECOMMENDATIONS

Status: RECOMMENDATIONS — no Drive action taken
Date: 2026-09-14
Scope: AUNEA Internal v2.0.0 REVIEW — cleanup baseline

## What this is, and what it is not

This manifest was produced **without access to Google Drive**. Every row below is derived
exclusively from references that exist inside this repository. Nothing here has been moved,
renamed or deleted in Drive, and **Drive is not declared clean** — it has not been inspected.

Per `PROJECT_RULES.md`, Drive governs human documentation and GitHub governs code, schemas,
engines and runtime. Where the two disagree, Drive and the canonical asset it names govern.
The effective Drive cleanup must be done later, with real Drive access, using this as input.

Actions use: **KEEP** · **ARCHIVE** · **REMOVE_DUPLICATE** · **VERIFY**.

---

## 1. Canonical Diagnostic Master — three conflicting version pointers (highest priority)

**VERIFY.** The repository points at three different versions of the canonical diagnostic asset.
The live runtime is self-consistent; the governance documents are not.

| Source in repo | Version claimed | Drive ID |
|---|---|---|
| `docs/AUNEA_INTERNAL_MASTER_INDEX.md` (lines 12-14) | v0.9 / DIAGNOSTIC_MASTER_V1 | `1f0WPb0BMElYbwB5oDBv-ypiyGKvURv4V` |
| `PROJECT_RULES.md` (line 47) | v0.9 / DIAGNOSTIC_MASTER_V1 | — |
| `3_SYSTEM/backend/README.md` (line 6) | v0.8 | — |
| `3_SYSTEM/frontend/app-schema-v11.js` (lines 3, 10) | v0.9.1 / MASTER_V1.1 | `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1` |
| `3_SYSTEM/frontend/data/diagnostic-master.source.json` (line 2) | v0.9.1 / MASTER_V1.1 | `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1` |
| `3_SYSTEM/frontend/README.md` (line 13) | v0.9.1 / MASTER_V1.1 | `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1` |
| `3_SYSTEM/frontend/tests/schema-v11.test.cjs` (line 15) | asserts `1qKjb…` | `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1` |

**Evidence:** the shipped runtime loads and CI asserts the v0.9.1 / Master v1.1 ID; the 100-field,
25-domain, 249-country projection in `data/diagnostic-master.min.json` corresponds to it.

**Recommended action:** confirm in Drive which asset is CANONICAL today, then align
`docs/AUNEA_INTERNAL_MASTER_INDEX.md`, `PROJECT_RULES.md` and `3_SYSTEM/backend/README.md`
in a single change set — as the mirror's own `## Rule` section already requires.

**Deliberately not done here:** correcting these pointers unilaterally would mean rewriting a
canonical-source reference in an ACTIVE governance document from repository inference alone.
That is exactly the class of change this cleanup was instructed not to invent.

---

## 2. Master Index mirror

`docs/AUNEA_INTERNAL_MASTER_INDEX.md` — 2,350 bytes.

**KEEP as a mirror, VERIFY its content.** It already declares itself correctly (line 7: *"This
repository document mirrors the Drive master index sufficiently to orient code work. Drive remains
the human documentation source of truth"*) and carries the precedence rule (line 54). That is the
right shape: a navigation aid, not a second mutable source.

Its *content* is stale on two counts: the v0.9 pointer above, and its description of the runtime
("backend v1.1, 19 tests passed"; frontend "prototype under active UX/diagnostic refinement"),
which no longer matches v2.0.0 REVIEW at 147 frontend / 39 backend tests.

**Recommended action:** refresh the mirror from Drive in the same change set as §1 — do not
delete or replace it, and do not let it grow into a full copy of the Drive index.

---

## 3. Drive-exported binaries held in the repository

20 `.docx` + 1 `.xlsx`, all Google-Docs/Sheets exports stamped `2026-09-07 00:05`
(`A3_CALCULADORA.xlsx`: `2026-09-02 20:50`). Full list in `0_SISTEMA/`, `1_NEGOCIO/`,
`2_ADVISORY/`, `3_SYSTEM/`, `4_CANALES/`, `6_MARCA_ACTIVOS/`, `9_ARCHIVO/`.

**REFERENCE_ONLY + VERIFY.** Per `PROJECT_RULES.md` line 11, Drive is the source of truth for human
documentation, so these are point-in-time snapshots, not sources. They are not referenced by any
code or test.

Two concrete observations:

- **Redundant payload:** 17 of the 20 `.docx` embed the same Roboto Mono TTF set (~330 KB per file;
  `1_NEGOCIO/13_MARCA.docx` adds Nova Mono at 298,700 bytes). Roughly **3.9 MB** of the repository
  is duplicated embedded-font data from Google-Docs export defaults, not content. For comparison,
  the three `9_ARCHIVO/2026-08_0{1,2,3}` files embed no fonts and are 15–22 KB instead of 220 KB+.
- **`0_SISTEMA/PLAN_BASE (CONGELADO — no editar).docx`** is held as `.docx` while the Drive map
  (`0_SISTEMA/00_MAPA_DRIVE.docx`) prescribes a **`.pdf`**, on the stated reasoning that a frozen
  file which can be edited ends up edited.

**Recommended action:** decide with Drive access whether these snapshots belong in the repository at
all. If they stay, re-export without embedded fonts and honour the `.pdf` rule for `PLAN_BASE`.
No file was removed here: they are human documentation, and removing them is a Drive-governance call.

---

## 4. Already-superseded assets

| Asset | Action | Evidence |
|---|---|---|
| `9_ARCHIVO/2026-08_17_identidad_SUSTITUIDO_por_13_MARCA.docx` | **ARCHIVE** (already archived in repo) | Filename declares supersession by `1_NEGOCIO/13_MARCA.docx`; content overlaps it. Confirm the Drive counterpart is archived too. |
| `9_ARCHIVO/AUNEA_System_Simulador_v2_SUSTITUIDO_por_v3.html` | **ARCHIVE** — done in this cleanup | `v3` carries the identical `<title>` and is a superset; nothing references either. |

---

## 5. NEEDS_REVIEW — insufficient evidence to act from the repository alone

| Asset | Why it needs review |
|---|---|
| `3_SYSTEM/AUNEA_System_Simulador_v1.html` | Named as a simulator but is a **marketing landing page** (`<title>Diagnóstico Operativo \| AUNEA Solutions</title>`) with a placeholder canonical URL `https://EJEMPLO-DOMINIO-PENDIENTE/` and a broken `assets/favicon.png`. Not superseded by v3 — a different artefact. Decide whether it is a live marketing asset or history. |
| `3_SYSTEM/AUNEA_System_Simulador_v3.html` | Newest simulator, orphaned (no reference anywhere), broken `assets/favicon.png`. Presumably superseded by the live `3_SYSTEM/frontend/`, but that is an inference, not proof. |
| `2_ADVISORY/A5_PRESENTACION.html` | 16:9 deck in a bronze/gold skin (`--bronce:#B87333`) distinct from the Solutions carbon/gold skin. The Drive map prescribes `A5_PRESENTACION.pptx`. Confirm which format governs and whether the skin is intentional. |
| `3_SYSTEM/AUNEA System - Templates/TEMPLATE - Client Request Brief.docx` | English, mustache-templated (`{{ClientName}}`), and **absent from the Drive map** entirely. Orphan folder — confirm ownership. |
| `3_SYSTEM/reconciliation/AUNEA_INTERNAL_v1.0.4_BASELINE.md` | References `AUNEA_INTERNAL_v1.0.4_REVIEW_CANDIDATE.zip` and `run.bat`, neither of which exists in the repository, and records hashes for a monolithic `app.js` that has since been split into modules. The baseline is no longer reconcilable as written. Keep as history or supersede it explicitly. |
| `AUNEA_INTERNAL_INVENTARIO_VISUAL_2026-09-09` (Drive) | `CODE_CONVENTIONS.md` line 108 names it as the live `CODIGO_BLOQUES` inventory *"during consolidation"*. `CODE_BLOCK_INDEX.md` is now the maintained inventory and is enforced in CI by `block-id-audit.test.cjs`. Confirm the Drive inventory is retired so there are not two competing block inventories. |
| Drive-map folders absent from the repo | The map names `5_CLIENTES/_PLANTILLA_CLIENTE/`, `1_NEGOCIO/12_ESTRATEGIA`, `6_MARCA_ACTIVOS/laminas/`, `6_MARCA_ACTIVOS/volumenes/` and `9_ARCHIVO/2026-08_analisis_inicial/`. Their absence here is expected if they are Drive-only, but worth confirming rather than assuming. |

---

## 6. KEEP — canonical Drive assets the runtime legitimately depends on

These are referenced by code/governance and must not be archived or renamed without a coordinated
change in this repository.

| Drive asset | Referenced from |
|---|---|
| `TOKENS_AUNEA` v1.0 (`01_MARCA_ACTIVOS/04_PLANTILLAS/00_DESIGN_SYSTEM/01_TOKENS`) | `3_SYSTEM/frontend/styles.css` (lines 2, 3, 7, 10, 14, 16, 18, 114); `CODE_BLOCK_INDEX.md`; `tests/style-tokens.test.cjs` |
| `DESIGN_SYSTEM_AUNEA` v1.0 | `styles.css` (lines 2, 3, 78); `CODE_BLOCK_INDEX.md`; `3_SYSTEM/frontend/README.md` |
| `CATALOGO_COMPONENTES_AUNEA` v1.0 (DS-004/005/008/010/012/019/020) | `styles.css` (lines 27, 49, 87, 96); `CODE_BLOCK_INDEX.md` |
| `DECISIONES_AUNEA` | `PROJECT_RULES.md` line 102; `docs/AUNEA_INTERNAL_MASTER_INDEX.md` line 49 |
| `00_AUNEA_INTERNAL_MASTER_INDEX`, `01_METODOLOGIA_AUNEA_INTERNAL`, `ESTADO_AUNEA`, `ROADMAP_AUNEA`, `BITACORA` | `PROJECT_RULES.md` lines 103-105, 111; `docs/AUNEA_INTERNAL_MASTER_INDEX.md` lines 45-50 |
| Canonical diagnostic workbook (version per §1) | `app-schema-v11.js`, `data/diagnostic-master.source.json`, `tests/schema-v11.test.cjs` |

**VERIFY** only that the DS-0xx component numbers cited in `styles.css` still match the current
catalogue; the token values themselves are already mirrored exactly into `:root`.

---

## 7. Note on scope

No `drive.google.com`, `docs.google.com` or `sheets.google.com` URL appears anywhere in the
repository — including inside the `.docx`/`.xlsx` payloads. All Drive references are by file ID,
asset name or folder path, which is why this manifest is organised that way.
