# AUNEA Internal — F6 · Aceptación integral y evidencia de QA

**Fecha:** 13/11/2026
**Estado general F6:** **REVIEW — ACEPTACIÓN AUTOMATIZADA SUPERADA, CIERRE FINAL PENDIENTE.**
**Rama:** `work/as-is-ux-simplification-20260930`. Sin merge a `main`, sin aprobación para cliente ni PRODUCTION.
**Contrato:** Plan F0–F6, PROJECT_RULES.md, Simulator CANONICAL v1.14, Architecture Contract CANONICAL v1.7, DEC-050/052/055/056/075, FROZEN_PAGES v10.

## 1. Evidencia automatizada final

**Linux / Chromium / frontend / backend:**
- [AUNEA Internal V2 REVIEW Acceptance Gate 43439139873](https://github.com/PedroCMillan5/AUNEA/actions/runs/43439139873) — **SUCCESS**, cuatro jobs: backend, frontend, browser_uat y publish_gate_status.
- **Frontend:** 959/959 tests PASS, 0 FAIL.
- **Backend:** 493 tests PASS, 1 warning (sin fallo del gate).
- **Chromium:** `FROZEN_TECHNICAL_PIXEL_EQUIVALENCE_PASS` 18/18 sobre SHA-256 de referencia fija (9 páginas desktop 1365 y mobile 390); referencias no regeneradas. Es equivalencia técnica, **no aprobación humana visual**.
- **Chromium:** `PG11_PG12_SOURCE_LINKED_BROWSER_PASS`; rutas y comparación versionada AS-IS/TO-BE; `CHROMIUM_UAT_PASS` sobre estudio sintético creado, navegado y recuperado tras recarga.
- **Chromium:** `PG11_BROWSER_INVOICE_PASS` y `PG11_BROWSER_LOGISTICS_PASS`: backend real, preview/cancel/confirm, rutas, persistencia, reload, undo, AS-IS inmutable, sin inferencia Ollama.

**Windows / Microsoft Edge:**
- Nuevo workflow [AUNEA F6 Windows Edge Browser UAT 43438732008](https://github.com/PedroCMillan5/AUNEA/actions/runs/43438732008) — **SUCCESS**.
- Windows GitHub runner, Edge instalado y backend health PASS. Casos `invoice` y `logistics` pasan PG11 browser journey con backend real, preview/cancel/confirm, rutas, persistencia, reload, undo y AS-IS inmutable; no se requiere Ollama.
- Es **UAT automatizada en Windows/Edge de PG11**, no validación visual manual completa ni de PG12–PG15 en Edge.

## 2. Matriz de aceptación F6

| Componente / criterio | Evidencia | Estado |
|---|---|---|
| Contratos y módulos runtime | Test manifiesto, Block_ID y carga; Acceptance Gate | PASS AUTOMÁTICO |
| Backend y reglas server-owned | 493 pytest PASS | PASS AUTOMÁTICO |
| Frontend y regresión funcional | 959 tests PASS | PASS AUTOMÁTICO |
| AS-IS/PG01–PG09 (caso sintético) | Chromium browser_uat | PASS AUTOMÁTICO EN ALCANCE |
| PG11 reglas, preview, confirmación, undo y recarga | Chromium y Windows Edge, invoice/logistics | PASS AUTOMÁTICO |
| PG12 doble mapa, versiones y rutas | Chromium browser_uat | PASS AUTOMÁTICO |
| FROZEN desktop/mobile | 18 SHA-256 de referencia fija Chromium | PASS EQUIVALENCIA TÉCNICA |
| Publicación humana, escenarios y entrega de PG13–PG15 de extremo a extremo en navegador | Pruebas unitarias/integración parciales; no se acredita una única sesión UI completa hasta entregables | **PENDIENTE UAT FINAL** |
| Windows/Edge: PG01–PG15 y todos los tamaños de pantalla | Edge automatiza PG11; no existen pruebas manuales finales aportadas | **PENDIENTE** |
| Revisión humana de los 18 PNG, accesibilidad y comportamiento visual con datos de cliente | Screenshots Chromium disponibles como artefactos del workflow; sin firma humana | **PENDIENTE** |
| Ollama/IA real y calibración con cliente | Sin Ollama en los journeys obligatorios y sin evidencia de caso real | **NO CERTIFICADO** |
| Fusión en main / producto para cliente | Requiere aprobación después de cerrar las filas anteriores | **NO AUTORIZADA** |

## 3. Pasos concretos de aceptación restante

1. Abrir la rama REVIEW en Windows y validar PG01–PG09 con estudio de prueba, editar cada capa y confirmar el AS-IS. Verificar persistencia en recargas y ausencia de pérdida de datos.
2. En PG10–PG12, contrastar resultados oficiales con evidencias de backend; ejecutar propuesta de reglas y, si Ollama está disponible, IA; revisar, cancelar, confirmar y deshacer cambios; validar integración del mapa y discrepancias humanas.
3. Completar **en una misma sesión** PG12 → escenarios → revisión humana del output → cotización/entregable y aprobación/publicación permitida. Verificar PDFs/links y que valores sin fuente, ahorros y costes no se inventen.
4. Inspeccionar manualmente las 18 referencias FROZEN y las pantallas abiertas, en Windows Chrome y Microsoft Edge, desktop/tablet/móvil; comprobar jerarquía de estilos, foco/teclado, scroll, modales, responsive, ayudas, accesibilidad y ausencia de solapes.
5. Registrar hallazgos por página, evidencia, versión, usuario responsable, decisión de aceptación o rechazo. Resolver defectos y repetir los gates pertinentes. Sólo entonces decidir la promoción a main y el estado de producto.

## 4. Dictamen

**F5 CLOSED TÉCNICO. F6 AUTOMATED QA PASS, FINAL ACCEPTANCE PENDING.** Se preservan las nueve pantallas FROZEN, los owners, los motores y las decisiones humanas. La QA en Chromium y Edge permite continuar la aceptación sin reestructurar otra vez. No existe evidencia suficiente para afirmar **F6 CLOSED**, `APPROVED_FOR_CLIENT` o `PRODUCTION`; las pruebas sintéticas y los screenshots por sí solos no equivalen a una UAT de cliente.

Ni los motores ni la arquitectura contractual se modificaron en F5/F6. No se alteran DECISIONES ni ROADMAP. La documentación de F5/F6, Master Index, ESTADO y BITACORA reflejan explícitamente este dictamen.
