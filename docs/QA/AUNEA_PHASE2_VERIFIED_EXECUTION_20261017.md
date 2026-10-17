# AUNEA Internal — Fase 2 · QA y reconciliación parcial verificada
**Corte:** 2026-10-17 · **Rama:** `work/as-is-ux-simplification-20260930`
**Estado:** REVIEW / FASE 2 PARCIAL, **NO** PRODUCTION / UAT INTEGRAL **NO** VALIDADA.
**Baseline:** 6a1603d2ae4e6097dc96e1c08ec635dd41602bc8.
**Rama evaluada antes de este informe:** 5731bebfe7db686929cc83640891c7ba26d5266a.
**Sesión original negativa:** `AUNEA_Sesion_Actual.json`, SHA-256 `72ed2c9c42bb731373992c79f2f7727a9fbae5da1f9736e40b827a8e4ca885bd`; NO COMMIT / NO MUTACIÓN.

## 1. Fuentes consultadas directamente
- `00_AUNEA_INTERNAL_MASTER_INDEX` v1.58, Drive ID `16ZaNWcBHZ0WoHKH1aizAfrxnAJLeD89O9_ruu5Q1OZ4`.
- `PROJECT_RULES.md` v1.7 de la rama.
- `AUNEA_DIAGNOSTIC_DATABASE_v0.9.2_DIAGNOSTIC_MASTER_V1.2.xlsx`, Drive ID `1HRlB30kpziDc3WNPxMVj0HfXuRUdOgbW`. Se cotejaron directamente sus hojas de campos y requisitos de entrada de engines.
- `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14, Drive ID `1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM`.
- `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7`, Drive ID `1K5jfYePIEU25LYH1KAEgWa8QOEvV9HpgQoGN6pWelyM`: consultado desde Drive (es una hoja de cálculo, no un Google Doc). El contenido exportado conserva en su primera hoja un rótulo v1.5; cualquier controversia de versión requiere verificar sus pestañas, no reutilizar el rótulo como contrato anterior.
- `DECISIONES_AUNEA` v1.34: DEC-050/065/068/070/071/072/073; Process Suggestion Rules v1.3, Drive ID `1vBnltfnWSwmZsE6Um3lBnocTKKXcJM4XIGWbKtRHz1A`.
- Código actual de la rama; matriz anterior `docs/QA/AUNEA_DF001_DF100_TRACEABILITY_REVIEW_20261017.csv`.

## 2. Reconciliación 2.A — datos y consumidores
Nuevo CSV: `docs/QA/AUNEA_PHASE2_DF001_DF100_RECONCILIATION_20261017.csv`.
- 100/100 Field_ID presentes en workbook y runtime; 100 identificadores únicos en runtime.
- Cotejados **13 atributos** por Field_ID contra el workbook (1.300 comparaciones).
- **96** campos idénticos en esos atributos.
- **3** campos con delta aprobado y visible: DF012 y DF013 (DEC-070), DF074 (DEC-072).
- **1** campo aún divergente sin decisión identificada en esta fase: **DF051**, workbook `STEP_PAIR_SELECTOR` frente a runtime `STEP_PAIR_LIST_SELECTOR`, con cardinalidad/validación ampliadas. No se ha supuesto que deba revertirse.
- **78** Field_ID enlazados a al menos un `IN-*` de la hoja de 55 requisitos de entrada de engines. Los 22 restantes no demuestran inutilidad: los `Engine_Consumers` del catálogo pueden no tener `IN-*` individualizado; su justificación de salida concreta requiere auditoría inversa.
- Cada fila conserva owner/write target, capture mode, fuente, No-Reask, consumidores, requisitos de engine y estado QA. **Ningún campo está certificado E2E** por este cotejo.

## 3. Reconciliación 2.B — DF011–DF020 y ProcessStep
- Corregida ausencia de alerta para el **desacuerdo DF017**: si los participantes de alcance previamente guardados divergen de `ProcessStep.Actor` activo, PG09 expone **ambas diferencias** bajo código `DF017_PARTICIPANT_SCOPE`; NO se sobrescriben roles. Es REVIEW, no bloqueo automático: puede haber participantes contextuales que no ejecutan pasos. La revisión requiere juicio humano.
- Caso negativo de referencia: participantes S02 `CUSTOMER, SALES, OPERATIONS, MANAGER` frente a actores activos `ADMIN, FINANCE, MANAGER`, con exclusión de pasos SUPERSEDED.
- Permanecen pendientes como prueba de aceptación: coherencia semántica DF011/DF012/DF013/DF014/DF015 contra el mapa real (la sesión negativa confunde solicitudes de cliente con facturas); dueño DF016; trigger/outcome de la realidad; alcance de `businessAreaId`. **No se infieren hechos mediante comparación de cadenas.**
- El parche del grafo y de evidencia del traspaso sigue en rama; no se han cambiado `normal_next_step` faltantes en el JSON sintético.

## 4. Reconciliación 2.C — No-Reask
El workbook original tiene **49** campos con `Reuse_From`. `reusedValue()` contiene **20** Field_ID directos en código; de ellos **19 pertenecen a los 49 del workbook**. El vigésimo es **DF074**, un derivado por DEC-072, aunque el workbook todavía no registra `Reuse_From`. Por tanto la clasificación de campo vigente es **19 directos + 30 rutas alternativas pendientes**, no una sentencia sobre fallos.
- 20/20 ramas `reusedValue` ejercitadas en el runtime JavaScript V8, con fixtures controlados/mocks, y resultados esperados. Prueba adicional: proyección temporal obsoleta DF078/079 devuelve `undefined`; riesgo con reversibilidad incompleta no produce DF074; `effectiveValue` prefiere fuente vigente para DF017.
- `isDerivedConfirmed` con DF050: fingerprint coincide antes de editar la fuente y **deja de coincidir tras cambiar un canal en ProcessStep**.
- Los **30 alternativos sin aceptación E2E** están explícitos en la matriz: `DF003, DF004, DF007, DF014, DF015, DF016, DF023, DF026, DF028, DF033, DF034, DF035, DF036, DF042, DF051, DF054, DF059, DF075, DF076, DF077, DF080, DF081, DF082, DF083, DF087, DF088, DF089, DF090, DF091, DF096`. Debe seguirse cada uno por owner/editor/CRM/sugerencia/derivación y probar recarga e invalidación. No están declarados FAIL.

## 5. Correcciones implementadas en GitHub
1. `717b0be7cadc835e78b1489646fd65a288fe80d4` — REVIEW de DF017 vs actores actuales (sin inventar scope).
2. `88d15c1a65f78dc8e9cedf5fe263428b979bf0e4` — seis tests Node sobre participantes, invalidación conceptual, superseded, no mutación y review PG09.
3. `70230c85c3179e3952f46623f5052859a8df110d` — CODE_BLOCK_INDEX.
4. `aa35f353332c0431a13b83f0a912854e32d343e4` — `source` runtime apunta a workbook v1.2 + delta DEC-072; DF050.Reuse_From alineado al owner `RT_PROCESS_STEP.Communication_Channels`.
5. `b91734430908e29481a6be1af27f0c183c8b93f6` — DF074 runtime como derivado de `RT_RISK.Reversibility`, no pregunta adicional S06; queda explícita la divergencia del workbook pendiente de consolidar.
6. `0c3db3e9329e6b39d10236ff2f513172a8d630a0` — nueva matriz de 100 campos y requisitos de engines.
7. `2cc73cb76949897a7c1f24b3c7a09f699072c6f3` — adaptador elimina siempre `answers.DF074` heredado antes de proyectar desde el riesgo vigente. **Defecto previo reproducido**: la respuesta manual persistía en el payload si el derivado no existía; negativo y positivo verificados con la función real en V8.
8. `51c02b7e5fdf3b744e0d844f7ae35fcf04698181` — `node:test` de 20 rutas directas + proyección temporal + fingerprint.
9. `76675a1d022fc58695797d5d17cae89424a82a9a` — `node:test` DEC-072 runtime/adapter.
10. `5731bebfe7db686929cc83640891c7ba26d5266a` — CODE_BLOCK_INDEX actualizado.

## 6. Evidencias de pruebas, límites de ejecución
**Ejecutado en runtime JS V8 sobre fuente descargada de la rama** (sin Node runner):
- 5 aserciones directas (DF017: divergencia, caso conciliado, fuente ausente, no mutación, aparición PG09).
- 20/20 ramas de `reusedValue` con fixtures; negativo de cache DF078/079; negativo DF074; precedencia `effectiveValue`.
- Prueba de invalidación `isDerivedConfirmed` tras modificación de ProcessStep: `true -> false`.
- Defecto en adaptador `questionnaireAnswersForEngine` reproducido antes/después; 3 aserciones, salida vieja no válida eliminada; derivación de riesgo válida conservada.
- Evaluación sintáctica `new Function` de **9/9** archivos JS/CJS de código y tests de esta intervención/anterior, PASS; JSON schema reparseado, 100 IDs únicos, PASS.

**No ejecutado:** `node --test` en un checkout real, pytest/backend, GitHub CI, navegador/persistencia/recarga, `/v1/diagnose`, snapshot sellado, 9 páginas y entregables. El contenedor local de esta intervención no resuelve `github.com`, por lo que no ha podido obtener un checkout; el conector GitHub sí permitió leer código y crear commits. La búsqueda de workflow runs de esta rama devolvió 0. **Los tests versionados son reproducibles pero su ejecución por Node sigue pendiente; no presentar PASS de suite.**

Reproducción en checkout del HEAD correspondiente:
```bash
git checkout work/as-is-ux-simplification-20260930
node --test 3_SYSTEM/frontend/tests/asis-participants-scope-regression-v1.test.cjs
node --test 3_SYSTEM/frontend/tests/no-reask-direct-reuse-phase2-v1.test.cjs
node --test 3_SYSTEM/frontend/tests/df074-risk-owner-phase2-v1.test.cjs
node --test 3_SYSTEM/frontend/tests/asis-graph-integrity-regression-v1.test.cjs
node --test 3_SYSTEM/frontend/tests/evidence-provenance-regression-v1.test.cjs
```

## 7. Criterios y trabajo restante
**P0:**
- Ejecución Node/frontend + Python/backend en una rama checkout y guardar logs con SHA.
- Demostrar las 30 rutas alternativas, confirmaciones y Deshacer, edición del owner, invalidación por cambio de fuente, persistencia/recarga, consumidores.
- Coherencia negocio DF011–DF020 ↔ ProcessStep: caso negativo real de traspaso + positivo sintético autorizado, revisión humana del proceso, no inventar cambios.
- Reconciliación DEC-068 de `time_attribution` vs retrabajo y proyección temporal vs inputs económicos; ejecutar motores sobre snapshot confirmado, confrontar con cálculo independiente.
- Trazabilidad inversa de conclusiones/recomendaciones a variables, evidence, Rule_ID, versiones, gaps; evaluar suficiencia, redundancias y no reask en contexto real.
- Consolidar delta DEC-072 del Diagnostic Master en el workbook cuando se apruebe próxima versión; resolver divergencia DF051 conforme a fuentes antes de editar control de negocio.

**P1/validación:** UAT de 9 páginas con cliente/consultor, navegación multi-tab, snapshot, trabajo interno, entregables y vista cliente. Diseñar un estudio independiente para medir exactitud/concordancia de hallazgos y recomendaciones; **el 90–95 % no se ha medido ni acreditado**.

**Gobierno:** sin cambios de versiones o estados CANONICAL/PRODUCTION. `main` intacto. No se editó el JSON de sesión. Actualización de Master Index/DECISIONES/ESTADO/ROADMAP sólo al aprobar cambio de fuente/versión o cerrar el hito; las referencias de código se registraron en CODE_BLOCK_INDEX. No tratar los tests parciales como cierre.
