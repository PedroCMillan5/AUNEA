# AUNEA — Code Conventions

Status: ACTIVE  
Version: 1.0  
Date: 2026-09-09

Purpose: make every meaningful code block uniquely searchable, auditable and safe to modify without rereading entire files.

## 1. Mandatory Block_ID

Every meaningful code block must have a stable identifier using:

`AUNEA-<LAYER>-<COMPONENT>-<TYPE>-<NNN>`

Examples:
- `AUNEA-FE-CORE-STATE-020`
- `AUNEA-FE-DIAG-DERIVE-020`
- `AUNEA-FE-PROC-FRIC-020`
- `AUNEA-BE-ORCH-DIAG-010`
- `AUNEA-UAT-ASSERT-030`

Allowed layer prefixes:
- `FE` frontend
- `BE` backend
- `UAT` user acceptance testing
- `DATA` schemas/data adapters
- `BUILD` launch/package/build
- `GOV` governance helpers

Component and type codes should be short, stable and semantic. Do not encode version numbers in Block_IDs.

## 2. Required START / END markers

### JavaScript
```js
// [AUNEA-FE-DIAG-DERIVE-020] START — Diagnostic derived values
// PURPOSE: Reuse captured process/friction data to derive canonical diagnostic fields.
// SOURCE: Diagnostic Master v1 — Field_ID / Reuse_From / Ask_Mode.
// INPUTS: engagement.answers, processSteps, frictions.
// OUTPUTS: derived values keyed by Field_ID.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.

// code...

// [AUNEA-FE-DIAG-DERIVE-020] END
```

### Python
```python
# [AUNEA-BE-ORCH-DIAG-010] START — Deterministic diagnostic orchestration
# PURPOSE: Execute Pain → Economics → Risk → Recommendation → Pricing → Scenario.
# SOURCE: DEC-034 / runtime contracts.
# INPUTS: EngagementInput.
# OUTPUTS: DiagnosticOutput.
# SIDE_EFFECTS: audit/store writes.
# CHANGE_RISK: CRITICAL.

# code...

# [AUNEA-BE-ORCH-DIAG-010] END
```

### HTML
```html
<!-- [AUNEA-FE-SHELL-NAV-010] START — Main navigation shell -->
<!-- PURPOSE: Render stable AUNEA Internal navigation. -->
<!-- CHANGE_RISK: MEDIUM. -->
<!-- markup... -->
<!-- [AUNEA-FE-SHELL-NAV-010] END -->
```

### CSS
```css
/* [AUNEA-FE-STYLE-NAV-010] START — Navigation styling
   PURPOSE: Sidebar/navigation visual rules only.
   CHANGE_RISK: LOW.
*/
/* styles... */
/* [AUNEA-FE-STYLE-NAV-010] END */
```

## 3. Metadata rules

For HIGH/CRITICAL blocks include at minimum:
- PURPOSE
- SOURCE
- INPUTS
- OUTPUTS
- SIDE_EFFECTS
- CHANGE_RISK

For LOW/MEDIUM visual/helper blocks PURPOSE + CHANGE_RISK is sufficient when the rest is obvious.

Do not repeat line-by-line comments that merely translate syntax. Comments describe responsibility, contract, dependencies and risk.

## 4. Stability rules

- A Block_ID identifies a responsibility, not a physical line range.
- Moving/refactoring a block keeps its Block_ID if responsibility is unchanged.
- Splitting one responsibility into two creates new Block_IDs and retires the old mapping in the block index.
- Merging responsibilities requires one retained ID plus explicit retirement of the others.
- Never reuse a retired Block_ID for a different purpose.
- Business Field_IDs, Rule_IDs, Error_IDs and Block_IDs are separate namespaces.

## 5. Code Block Index

`AUNEA_INTERNAL_INVENTARIO_VISUAL_2026-09-09` in Drive contains the live `CODIGO_BLOQUES` inventory during consolidation.

When GitHub main is reconciled with the accepted AUNEA Internal release, the repository should also maintain a lightweight `CODE_BLOCK_INDEX.md` generated/updated from the same Block_ID map.

Minimum index columns:
- Block_ID
- file
- responsibility
- canonical source/contract
- inputs
- outputs
- side effects
- risk
- UAT/regression coverage
- status

## 6. Performance / maintenance rationale

Block_IDs are designed so a maintainer or AI can search for one exact identifier, fetch only the relevant region, inspect its dependencies and patch it without loading unrelated code. This reduces context, response time and regression risk.

## 7. Definition of Done addition

A new or materially changed code responsibility is not complete until:
1. it has a Block_ID;
2. START/END markers are present;
3. source/contract and risk are documented where applicable;
4. its block index entry is updated;
5. relevant regression/UAT coverage is linked.

Existing code will be tagged during controlled reconciliation/refactor, not by editing a stale or superseded runtime copy.