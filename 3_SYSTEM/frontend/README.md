# AUNEA Internal V2.0 REVIEW — CORE

Status: REVIEW / automated acceptance PASS; native browser/Windows UAT pending
Date: 2026-09-14

## Fuente de verdad

El frontend y el backend ejecutables viven en GitHub. La interfaz no gobierna reglas de negocio.

La captura canónica vigente procede de:
`AUNEA_DIAGNOSTIC_DATABASE_v0.9.1_DIAGNOSTIC_MASTER_V1.1.xlsx`

Drive ID: `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1`

El runtime efectivo conserva la proyección aceptada y aplica únicamente el delta gobernado de Master v1.1 mediante `services/schema.js`. El resultado validado contiene 100 campos, 25 dominios, 249 países y 20 atributos de Process Step, incluido `communication_channels`.

## Arquitectura de módulos

El runtime es una sola aplicación de scripts clásicos con `defer` sobre un ámbito global compartido.
No hay framework ni paso de build: los módulos se cargan en un orden que **es un contrato**, porque
algunos extienden deliberadamente a los anteriores. Ese orden vive en `module-manifest.json`, del que
se genera el bloque `<script>` de `index.html`, y `tests/module-manifest.test.cjs` impide que se
separen.

| Capa | Responsabilidad |
|---|---|
| `core/` | Estado compartido, identidad, fechas e idioma |
| `services/` | Contacto con fuentes externas: schema canónico, backend, adapter de motores, persistencia |
| `domain/` | Reglas de negocio de cliente: No-Reask, proceso, fricción, riesgo, economics, completitud |
| `ui/` | Renderer canónico, shell, navegación, modos y ayuda |
| `pages/` | Composición de pantallas sobre las capas anteriores |
| `uat/` | Sistema temporal de UAT, aislado del runtime operativo |
| `boot.js` | Arranque |

Los nombres de fichero no llevan sufijo de versión. Por DEC-043 la versión vive en el Release
Manifest, no en los identificadores, y un `-v1` en un nombre de fichero es el primer paso de la
acumulación v1/v2/v3 que las reglas de release existen para evitar. Los Block_ID **no cambian al
mover un fichero**: identifican una responsabilidad, no una ubicación (CODE_CONVENTIONS.md §4).

Mapa de la reorganización (movimientos byte a byte, sin cambio de contenido):

| Antes | Ahora | Block_ID |
|---|---|---|
| `app-core.js` | `core/state.js` | `AUNEA-FE-CORE-STATE-020` |
| `app-i18n-labels-v1.js` | `core/i18n.js` | `AUNEA-FE-I18N-LABELS-010` |
| `app-backend-discovery-v1.js` | `services/backend-client.js` | `AUNEA-FE-BACKEND-DISCOVERY-060` |
| `app-schema-v11.js` | `services/schema.js` | `AUNEA-DATA-DIAG-ADAPTER-010` |
| `app-engine-adapter-v1.js` | `services/engine-adapter.js` | `AUNEA-FE-ENGINE-ADAPTER-020` |
| `app-persistence-v1.js` | `services/persistence.js` | `AUNEA-FE-PERSIST-050` |
| `app-no-reask-v1.js` | `domain/no-reask.js` | `AUNEA-FE-DIAG-NOREASK-050` |
| `app-risk-v1.js` | `domain/risk.js` | `AUNEA-FE-RISK-CAPTURE-030` |
| `app-economics-v1.js` | `domain/economics.js` | `AUNEA-FE-ECON-CAPTURE-030` |
| `app-process-v1.js` | `domain/process.js` | `AUNEA-FE-PROC-EDITOR-020` |
| `app-process-lifecycle-v1.js` | `domain/process-lifecycle.js` | `AUNEA-FE-PROC-LIFECYCLE-030` |
| `app-completion-model-v1.js` | `domain/completion.js` | `AUNEA-FE-DIAG-COMPLETION-070` |
| `app-renderer-v1.js` | `ui/renderer.js` | `AUNEA-FE-DIAG-RENDER-040` |
| `app-process-help-v1.js` | `ui/process-help.js` | `AUNEA-FE-PROC-HELP-025` |
| `app-shell.js` | `ui/shell.js` | `AUNEA-FE-SHELL-NAV-010` |
| `app-mode-v1.js` | `ui/mode.js` | `AUNEA-FE-UX-MODE-040` |
| `app-diagnostic-fields.js` | `pages/diagnostic-stages.js` | `AUNEA-FE-DIAG-CONTROL-030` |
| `app-results.js` | `pages/results.js` | `AUNEA-FE-RESULTS-VIEW-010` |
| `app-uat-visible-v1.js` | `uat/visible.js` | `AUNEA-FE-UAT-VISIBLE-055` |
| `app-uat-fixtures-v1.js` | `uat/fixtures.js` | `AUNEA-UAT-RUNTIME-FIXTURE-020` |
| `app.js` | `boot.js` | `AUNEA-FE-BOOT-INIT-010` |

## Qué incluye esta rama

- CRM local de revisión: empresas y contactos vinculados a engagements y proyectos.
- Diagnóstico de 90 minutos schema-driven en español.
- Renderer canónico para controles estructurados; un control estructurado desconocido no degrada silenciosamente a texto libre.
- No-Reask NR01–NR15: CRM, roles, herramientas, artefactos, canales, tiempos, aprobaciones, excepciones y fricciones se reutilizan o derivan cuando corresponde.
- Editor AS-IS con los 20 atributos canónicos de Process Step.
- Tiempo activo, espera y retrabajo separados.
- Fricciones vinculadas obligatoriamente a al menos un paso; Pain_ID derivado internamente.
- Captura estructurada de riesgos e inputs económicos.
- Adapter frontend → backend sin cálculo oficial de negocio en JavaScript.
- Secuencia server-owned: Pain → Economics → Risk → Recommendation → Pricing → Scenario.
- Modo Sesión y Modo Interno sobre el mismo estado y la misma lógica.
- Persistencia local recuperable, autosave y backup/restauración JSON.
- UAT visible one-click con 5 fixtures canónicos y 26 assertions expected/actual/PASS/FAIL/refs, ejecutadas de forma aislada.
- Design System AUNEA (Solutions skin) con tokens exactos de `TOKENS_AUNEA`/`DESIGN_SYSTEM_AUNEA` y labels ES gobernados para los enums que devuelve el backend.
- Modelo de completitud compuesto (`domain/completion.js`): jerarquía etapas revisadas → obligatorios aplicables completos → pendientes concretos → evidencia pendiente → listo para calcular, sin denominador fijo de 100 campos.
- Procedencia "Tomado de: <origen>" con enlace a editar la fuente, sin fugas técnicas de No-Reask/Reuse_From crudo.
- CRM con pestañas Contactos/Empresas, filtro "ocultar perdidos" y edición de contacto con histórico derivado del log de auditoría existente.
- Reordenación de pasos del mapa AS-IS (posición visual) sin alterar `normal_next_step`, rutas de excepción ni fricciones vinculadas.
- Pantalla de cierre real en la última etapa: resumen factual de proceso/fricciones/riesgos/economics/obligatorios/siguiente paso, con CTA único `CALCULAR DIAGNÓSTICO Y RECOMENDACIÓN` cuando la captura está completa.
- Auditoría automática de gobernanza de Block_ID sobre todo el runtime vigente (frontend, backend, build/launcher, CI) — `tests/block-id-audit.test.cjs`.

### V2.0 CORE (esta iteración)

- Progressive disclosure en los editores de Process Step (6 grupos), Fricción/Riesgo/Economics (2 capas cada uno) — mismos campos canónicos, sólo presentación.
- "Añadir varios pasos" (bulk, técnico/vacío) distinto de "+ Crear nuevo paso como siguiente" (enlaza `normal_next_step` retroactivamente); ambos coexisten.
- Ayuda contextual discreta (icono + popover) sobre `process_step_model`/`friction_model` — nunca un bloque de texto siempre visible.
- Modo Sesión reforzado: códigos técnicos (Pain_ID, Action_ID, N/I) nunca protagonistas; se resuelven siempre contra `REF_ACTION`/`REF_LEVEL_FUNC`/`REF_LEVEL_AI`.
- **PDF real**: `aunea_backend/pdf_export.py` (reportlab) genera un `application/pdf` AUNEA-branded desde el mismo `DiagnosticOutput`/`ScenarioResult` ya calculado — nunca recalcula reglas (DEC-041). El botón "Descargar PDF" sustituye por completo el antiguo `window.print()`.
- **Sistema temporal de UAT** (exclusivamente Modo Interno, página `UAT / QA`): catálogo de 15 casos sintéticos cargables (`UAT-01`…`UAT-15`, prefijo `UAT-` en toda la jerarquía), "Limpiar datos UAT" (elimina sólo entidades `UAT-`, nunca datos reales) y una herramienta de stress "Generar N pasos UAT" (10/25/50, probado en navegador real hasta 70 pasos totales sin errores).

## Sistema de plantillas — diferido

Process/Step/Friction/Risk/Economics Templates, Pattern Library, Template Contract, `Template_ID`/`Template_Version` y la procedencia sourced-from-template quedan explícitamente **fuera de alcance** de V2.0 CORE. Llegarán mediante una especificación funcional separada. Su ausencia no bloquea este candidato.

## Regla de cálculo

Pain, Economics, Risk, Recommendation, Pricing y Scenario oficiales se calculan exclusivamente en AUNEA Backend. El navegador prepara inputs, llama al backend y representa outputs. La recomendación óptima no se sobrescribe al comparar escenarios.

## Ejecutar localmente

Desde la raíz del repositorio, instalar y arrancar backend:

```sh
python -m pip install -e 3_SYSTEM/backend
python -m uvicorn aunea_backend.api:app --host 127.0.0.1 --port 8000
```

En otro terminal, desde la raíz:

```sh
python -m http.server 5180 --bind 127.0.0.1 --directory 3_SYSTEM/frontend
```

Abrir `http://localhost:5180`.

Recorrido mínimo: Contactos → empresa → contacto → crear estudio → Diagnóstico → Proceso y fricciones → Resultados. Desde la cabecera se puede alternar entre Modo Sesión y Modo Interno. La página `UAT / QA` sólo aparece en Modo Interno.

## QA automatizada vigente

El workflow `AUNEA V1 Acceptance Gate` ejecuta backend y frontend sobre el mismo commit.

Último gate automatizado tras V2.0 CORE (Fases 0-9):

- Frontend: 136/136 PASS (incluye la auditoría de Block_ID sobre todo el runtime vigente).
- Backend: 34/34 PASS (incluye 7 tests dedicados de exportación PDF).
- UAT canónica incluida en backend: 5 fixtures / 26 assertions / 26 PASS / 0 FAIL.
- Runtime frontend: carga HTTP de módulos, CRM, No-Reask, cambio Sesión/Interno, Process Steps, Frictions, Pain derivado, persistencia y recovery snapshot.
- Catálogo UAT-01…15: verificado contra el Diagnostic Master real que UAT-12/13 son genuinamente `readyToCalculate` (cero obligatorios pendientes, cinco engine gates resueltos) sin precargar `diagnosticOutput`.

Los tests DOM/HTTP no sustituyen una comprobación visual real en Chromium/Edge ni la prueba nativa final en Windows.

## Estado de promoción

Esta rama permanece en `REVIEW` como **AUNEA Internal V2.0 REVIEW — CORE** (nunca `PRODUCTION`). No se debe fusionar a `main` ni declarar `PRODUCTION` hasta completar el gate visual/nativo final (Windows/Chrome/Edge) — ese paso lo realiza el usuario, no Claude Code. El histórico Windows-validado de v1.0.4 demuestra la baseline anterior, pero no sustituye la validación visual de los módulos incorporados ahora. `main` no ha sido tocado en ningún momento de esta iteración.
