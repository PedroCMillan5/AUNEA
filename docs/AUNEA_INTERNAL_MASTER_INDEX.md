# AUNEA Internal — Master Index (espejo técnico)

Estado: ACTIVE · versión del espejo: 1.2 · verificación: 30/09/2026.
Drive continúa como fuente de gobierno humano. Este archivo es únicamente navegación.

## Fuentes vigentes consultadas

- `00_AUNEA_INTERNAL_MASTER_INDEX` v1.37: Drive `16ZaNWcBHZ0WoHKH1aizAfrxnAJLeD89O9_ruu5Q1OZ4`.
- `PROJECT_RULES.md` v1.7 y `CODE_CONVENTIONS.md` en el repositorio.
- `DECISIONES_AUNEA`: DEC-065 (anclajes técnicos), DEC-066 (FROZEN), DEC-068 (atribución temporal) aplican a esta auditoría.
- Diagnostic Master **v0.9.2 / v1.2 CANONICAL**: Drive `1HRlB30kpziDc3WNPxMVj0HfXuRUdOgbW`. Gobierna DF001–DF100, relaciones, opciones y reglas; versiones v1/v1.1 anteriores son ARCHIVED.
- Simulator **v1.14 CANONICAL**: Drive `1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM`. Orquesta páginas y superficies sin sustituir reglas del Diagnostic Master.
- Architecture Contract identificado como **v1.7 CANONICAL** por el índice de Drive: `1K5jfYePIEU25LYH1KAEgWa8QOEvV9HpgQoGN6pWelyM`. La portada extraída aún indica v1.5: inconsistencia documental registrada, sin modificar su estado.

## Estado técnico de esta rama

Repositorio: PedroCMillan5/AUNEA. Backend `3_SYSTEM/backend/`; frontend `3_SYSTEM/frontend/`.
AUNEA Internal v2.0.0 permanece REVIEW; la baseline v1.0.4 no queda sustituida por esta auditoría.

- Base remota exacta: `fix/session90-snapshot-invalidation-20260929` en `c4280744f2595decbb859264b46f4fc5573fcaa9`.
- Rama única vigente: `reconcile/frontend-v1.0.4-source`. Contiene todo B01/B02/B03, incluida la auditoría publicada originalmente desde Astra. B04 no iniciado.
- Alcance: auditar/corregir exclusivamente B02/B03 existentes.
- Informe: [Auditoría B02/B03](SESSION90_B02_B03_AUDIT_20260930.md).
- QA en la rama única: 356/356 frontend y 76/76 backend PASS en Acceptance Gate run 36688583671. Integración DOM + HTTP PASS como script independiente; no equivale a UAT visual/nativa Windows.
- Handoff: `3_SYSTEM/02_HERRAMIENTAS/simulador/SESSION90_EXECUTION_HANDOFF_20260929.md`.
- Sin merge a main ni promoción automática.

## Candidatos que no gobiernan todavía

- Diagnostic Master v1.3 B02 REVIEW: `1sHGwsiOhG4FAOaLLDvKu8AXGQP6N3eBZ`.
- Simulator v1.15 B02 REVIEW (incluye adenda B03): `1HCsrj75N2Z5AMVcGTEgpYophZanaQkeedoGK-971J5E`.
- Architecture Contract v1.8 B02 REVIEW: `1pDIyvYeEE0lkmMB1L5K09LmMkG5skISO`.

## Protección y continuidad

FROZEN: Inicio, Empresas, Contactos, Interacciones, Oportunidades, Estudios, S01, S02 y S08. La auditoría no cambia páginas, estilos o snapshots protegidos. S03 y editor client-first permanecen REVIEW.

Datos → reglas → interfaz → entregables. Drive = documentación; GitHub = implementación; Airtable = operación viva; entorno cliente = producción. Revisar las fuentes actuales antes de cada cambio. Actualizar decisiones sólo si cambia una regla, estado si cambia materialmente, roadmap si cambia secuencia/dependencias, y registrar hitos en BITACORA. Ningún resultado de esta auditoría promociona los candidatos REVIEW.

## Consolidación de ramas · 30/09/2026

La rama original `reconcile/frontend-v1.0.4-source` avanzó sin force push desde `0ed29e1` hasta `5b8fbc1` (69 commits, sin divergencia). Un commit de preservación histórica `2d12588a` incorpora como ascendencia la antigua rama `tmp-b03-build` sin cambios en archivos ni runtime. `fix/session90-snapshot-invalidation-20260929`, `work/astra-session90-b04` y `tmp-b03-build` son referencias auxiliares pendientes de eliminación remota; nunca bases futuras. `main` permanece intacta. Master Index gobernante de Drive v1.38, ESTADO y BITACORA sincronizados; sin decisión nueva ni variación del ROADMAP. B02/B03 siguen REVIEW y los tres candidatos documentales no se promocionan.

## Continuidad multiventana · 30/09/2026 · Master Index Drive v1.39

La rama única `reconcile/frontend-v1.0.4-source` incorpora: descarte de proyección temporal HTTP desactualizada, invalidación de confirmación cuando cambia captura upstream y conciliación de cambios de Console/editor compartido frente a la última versión aceptada. Los cambios independientes se conservan, el borrador de formulario abierto no se reemplaza y los conflictos sobre un mismo valor detienen la escritura; Session Display sólo recibe un registro publicado después de la persistencia aceptada. HEAD de implementación `d76a924d860bfba6ad29fde8c8529214ace4000b`; acceptance run 36692340512, frontend 363/363 y backend 76/76 PASS. UAT visual de dos ventanas y recorrido completo pendientes. El sistema sigue REVIEW: `localStorage` no se declara almacén transaccional ni se promociona B04, `main` o los activos CANONICAL. DECISIONES y ROADMAP permanecen sin cambio.

## UAT3 de procesos integrales · 30/09/2026 · Master Index Drive v1.40

En UAT / QA, tras las fases UAT1 CRM y UAT2 Estudios, existe Fase 3 con tres casos sintéticos completos de captura: facturas de proveedor y aprobación condicional, petición unificada, email de pedido convertido en ticket. Los expedientes están en `3_SYSTEM/frontend/uat/cases/*.json`, generador `uat/endtoend-cases.js`, controles visibles `uat/visible.js` y reporte `docs/UAT3_THREE_BUSINESS_CASES_COHERENCE_20260930.md`. Son revisables desde UAT / QA (Diagnóstico, Demanda y Mapa AS-IS) y P05 Estudios. Gate automatizado sobre commit `68902ef520c231a491929e186c01d603958caa86`: run 36696285190, frontend 369/369 y backend 76/76 PASS. Hallazgos H01–H07 pendientes; UAT visual nativa y confirmación humana del AS-IS sin ejecutar. REVIEW, no PRODUCTION; no modificación de reglas canónicas, `main`, DECISIONES ni ROADMAP.

## UAT3 · Auditoría funcional de 12 hitos y prueba nativa · Master Index Drive v1.41

La referencia vigente es `docs/UAT3_END_TO_END_AUDIT_12_MILESTONES_20260930.md`; la revisión preliminar `docs/UAT3_THREE_BUSINESS_CASES_COHERENCE_20260930.md` pasa a ARCHIVED. En la rama única `reconcile/frontend-v1.0.4-source`, UAT3 crea los tres casos independientes y permite abrir directamente S01 → S02 → S03 → S08 → S04 → S05 → S06 → S07 → S09, sin confirmar ficticiamente DF093 ni representar DF099=YES sin autorización real (se conserva UNKNOWN). Se amplía QA ejecutando el HTML/manifest completo y sus tres expedientes: confirmación simulada explícita de cuatro capas, DF021 cambiado, invalidación de confirmaciones/derivados, snapshot anterior inmutable y payload backend con `RiskInput.step_ids` según DEC-065. Chromium real en Actions 36705357563: los tres mapas conservan desplazamiento al pasar a Impacto, se recargan los estudios y se adjuntan tres screenshots. Backend 77/77 y frontend 378/378 PASS. Pendientes H01 (DF047/DF049), H02 (DF028/040), H03 (DF080/081), H05 (DF026/ciclo global) y confirmación comercial real; la proyección temporal de las tres fixtures ya está validada por backend, 78/78, sin doble conteo de fricciones; pasos internos 9–12 no se consideran validados end-to-end por disponer sólo de estudios sintéticos no confirmados. Estado REVIEW, sin cambios en main ni CANONICAL, DECISIONES o ROADMAP.

## Bloque 2 UAT3 · captura única y propagación · Master Index Drive v1.42 · 30/09/2026

Se revisaron los tres expedientes UAT3 en CRM, Demanda y AS-IS. `domain/no-reask.js` incorpora Block_ID `AUNEA-FE-DIAG-OWNER-053`: DF047 y DF049 muestran proyecciones diferenciadas del ProcessStep, sin duplicar capturas, admitiendo solapamiento legítimo de tipos documentales; editar los inputs actualiza las vistas. Demanda muestra DF028 global declarado y DF040 por paso sin sumar porcentajes ni reescribir la tasa global; DF001 conserva write-through hacia Company. Informe por caso actualizado `docs/UAT3_END_TO_END_AUDIT_12_MILESTONES_20260930.md`. QA run `36707101510`: frontend 379/379, backend 78/78, Chromium real PASS. H01/H02 mitigados con limitación explícita sobre instancias/evidencia y conciliación de poblaciones; PG03 sigue REVIEW. No inicia Bloque 3; no se promueven CANONICAL/FROZEN, ni se modifican DECISIONES, ROADMAP, main o motores económicos.

## Bloque 3 UAT3 · fricciones/riesgos/impacto · Master Index Drive v1.43 · 30/09/2026

Se ejecutan tres escenarios sintéticos con proyección temporal exacta del backend: facturas 1920 casos/año / activo 848 h / espera 10560 h / retrabajo desglosado 54,4 h; peticiones 1320 / 698,5 / 5280 / 27,72; emails a tickets 3720 / 1485,52 / 6435,6 / 75,64. Las nueve fricciones INCLUDED/BREAKDOWN no añaden horas y una fricción sólo tiene un propietario temporal. El riesgo mantiene step_ids; ED12 costes y ED14 tarifas siguen declaraciones sintéticas separadas, con 0 ahorro y bloqueo de pérdidas duplicadas sin evento identificable. En S07 DF080/081 incluyen ayuda contextual CHASE/REPORT/fricciones y auditoría visible por caso; no sumar sin conciliar ámbito/evidencia. Informe actualizado `docs/UAT3_END_TO_END_AUDIT_12_MILESTONES_20260930.md`. H03/H05 permanecen REVIEW (sin evidencia factual ni igualdad entre espera y DF026). No se modifican CANONICAL, engines, DECISIONES, ROADMAP, main ni se inicia Bloque 4.

## Pausa Client View / coherencia transversal · Master Index Drive v1.44 · 30/09/2026

Por indicación del propietario, `#session` y `#results` y sus launchers están temporalmente bloqueados mediante `CLIENT_DISPLAY_PAUSED` con mensaje explícito, sin borrar proyecciones históricas ni modificar Console/editor AS-IS. Commit funcional/test `237d6c0ad66dee2746a06af0168afa904f42cd84`; run `36711692358` frontend 381/381, backend 79/79, Chromium PASS. Se congela el avance al Bloque 4 para definir coherencia funcional de Contexto/Alcance/Demanda→Mapa→Fricciones→Riesgos→Impacto. UAT facturas revela que la fricción de aprobación tiene `wait_time_loss=0` aun existiendo 720 min en el paso condicional; otras brechas de contexto: demanda ausente de mapa, filtros contextualizados de riesgos, semántica comprensible de pérdida monetaria directa y actor→coste empresa/hora anualizado. Estos cambios son propuestas en REVIEW, no implementación ni modificación de CANONICAL, DECISIONES o ROADMAP. La pausa es reversible y no suprime AS-IS interno.


## Cierre UX AS-IS · Single Owner / Riesgos / Impacto · 06/10/2026

En `work/as-is-ux-simplification-20260930` se cierra la revisión de captura AS-IS sin introducir funcionalidad de negocio nueva. La visibilidad genérica pasa a aplicar Single Owner por `Write_Target`: 39 campos estructurados del Diagnostic Master quedan exclusivamente en sus builders (15 ProcessStep, 10 Friction/RT_PAIN, 5 RiskInput/RT_RISK y 9 EconomicInput), sin listas manuales por Field_ID. `CONDITIONAL_90M` no se eleva a obligatorio y los seis `DERIVE_AND_CONFIRM` canónicos siguen siendo condicionales. Riesgos conserva `step_ids` como único anclaje persistente; las fricciones del paso sólo se reutilizan como contexto y no se inventa una relación Risk→Friction ni una categoría recomendada en frontend. Impacto no preselecciona driver, excluye ED15 porque el volumen pertenece a DF021/DF022 y conserva vacíos relevantes como null en vez de convertirlos silenciosamente a 0. El backend económico no se modifica. PG09 continúa siendo el cierre explícito de “Confirmar AS-IS”. Estado REVIEW pendiente únicamente de UAT visual nativa del recorrido PG01–PG09; sin cambios en CANONICAL, DECISIONES o ROADMAP.
