# AUNEA Internal — Contrato de componentes compartidos para TODO el producto

**Fecha:** 13/11/2026 · **Rama:** `work/as-is-ux-simplification-20260930` · **Estado:** F1/F2 IMPLEMENTACIÓN TÉCNICA CERRADA; QA AUTOMATIZADO PASS; ACEPTACIÓN VISUAL DEL PROPIETARIO PENDIENTE / REVIEW.  
**Ámbito:** CRM + PG00 + sesión PG01–PG09 + Diagnóstico PG10 + TO-BE PG11 + Comparación PG12 + Implementación/Proyectos + vista de cliente y módulos transversales. No introduce reglas de negocio ni cambia fuente de datos.

## 1. Fuentes gobernantes y criterio
- `00_AUNEA_INTERNAL_MASTER_INDEX`, `PROJECT_RULES.md` v1.7, `DECISIONES_AUNEA` DEC-050/052/055/056, `AUNEA_SYSTEM_SIMULATOR_CANONICAL`, `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7`.
- `DESIGN_SYSTEM_AUNEA` v1.0, `TOKENS_AUNEA` v1.0 y `CATALOGO_COMPONENTES_AUNEA` v1.0 (DS-001–DS-020).
- Referencias FROZEN prevalecen para composición visible y estados aprobados. La compatibilidad funcional y la precedencia de datos nunca se rediseñan desde CSS.
- F0: `docs/AUNEA_INTERNAL_F0_BASELINE_20261113.md`; auditoría integral técnica: `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json`.
- Auditoría visual consumidora de todas las páginas: `docs/audit/AUNEA_INTERNAL_DESIGN_CONSUMERS.json`; script: `tools/aunea-design-system-audit.cjs`.

## 2. Observaciones verificadas sobre la base real
- 46 módulos JS runtime y los dos estilos `styles.css`/`ui-system.css`. **Todos los módulos** están inventariados, no sólo PG11.
- 1.083 nombres de clase CSS; 107 aparecen en ambos CSS; 146 grupos selector+contexto repetidos en el análisis conjunto (123 en `ui-system.css` por separado); 35 atributos inline literales en módulos runtime. **No interpretarlos como 35 errores o 146 reglas eliminables**.
- 20 categorías DS documentales. Son **catálogo visual**, no 20 componentes HTML completos garantizados. Los prototipos de gráficos, comparativas y pricing son especializados y consumen datos oficiales.
- 90 de las clases definidas en ambos CSS están relacionadas mediante referencias textuales con algún módulo de CRM/PG01–09: **riesgo de afectar FROZEN**. La identificación es conservadora, no prueba de uso DOM.
- El análisis de consumidores es estático (cadenas/clases); no prueba inexistencia de usos dinámicos o en HTML, ni cambios de CSS computado.

## 3. Componentes que YA sirven al conjunto de páginas

| DS | Componente | Implementación técnica existente | Consumo / notas |
|---|---|---|---|
| DS-001/002 | Página + sección | `pageTop()`, `section()` en `core/state.js`; `.page-head`, `.section`, `.section-title` en `styles.css` | CRM, sesión, Resultados, Comparación, Implementación, Proyectos; no crear otro header genérico |
| DS-003 | Texto y ayuda | `.subtitle`, `.field-help`, `.aunea-ui-section-caption` | Variantes tipográficas por fase; migración gradual |
| DS-004 | Card | `.card`, `.card-pad`, `.result-item`, `.aunea-ui-work-surface` | `card` tiene propietario global; superficies de trabajo son opt-in |
| DS-005 | KPI | `.metric`, layout `.grid` | CRM/Resultados, sin sustituir cálculo server-owned |
| DS-006/007 | Aviso / riesgo | `.notice`, `.notice.warn`, `.notice.info`, `.notice.good` | Patrones funcionales existentes; conservar semántica |
| DS-008 | Tabla | `.table-wrap`, `.data-table`, `.table-foot` | CRM y Proyectos/Comparación usan la misma base |
| DS-009 | Gráfico | Gráficos y canvas especializados de dominio | No inferir un único renderer a partir del nombre DS-009 |
| DS-010/011 | Comparativa / actual-futuro | `pages/comparison.js`, `tobeComparisonPage()` y estructuras PG12 | Sólo proyecciones; no crear estimaciones artificiales |
| DS-012/014 | Proceso / diagrama | `processGraphHtml()`, `tobeCanvasHtml()`, `.flow-canvas` | Especialización por AS-IS/TO-BE obligatoria; el contrato semántico es diferente |
| DS-013 | Etapas | `.stage-nav`, navegación común y flujo guiado | La progresión depende del estado canónico |
| DS-015 | Testimonial | Elemento del catálogo corporativo; **sin requisito común comprobado en Internal** | No agregar componentes ficticios |
| DS-016 | Pricing / inversión | Vistas oficiales de resultados y servicios backend | No trasladar engines a CSS/UI |
| DS-017 | Acciones | `.btn`, `.btn-primary`, `.btn-outline`, `.btn-small`, `.aunea-ui-button-row` | Usados de CRM a PG12/Proyectos; eventos siguen en sus owners |
| DS-018 | Metadata | `.table-foot`, pie y metadatos del shell | Variantes por zona sin duplicar fuente |
| DS-019 | Estado | `statusBadge()`, `.status`, `.badge`, `.chip` | Estatus derivado del dueño, no reeditable por UI |
| DS-020 | Formulario | `.field`, `.form-grid`, `auneaSelectControl()`, `.aunea-select` | CRM y diagnóstico; preservar accesibilidad, estados y captura única |

**Conclusión:** existe YA un esqueleto transversal común, pero no hay una biblioteca completa de 20 renderizadores unificados. No replicar `pageTop`, `section`, `openModal`, `statusBadge` ni `auneaSelectControl` en una segunda implementación. Separar físicamente estas funciones sólo tras probar la equivalencia de las nueve páginas FROZEN.

## 4. Matriz de familias inspeccionadas

| Familia | Fuentes de runtime analizadas | FROZEN | Tratamiento |
|---|---|---|---|
| Home / CRM / PG00 | `ui/shell.js`, `pages/crm-companies.js`, `pages/crm-contacts.js`, `pages/crm-interactions.js`, `pages/crm-opportunities.js` + `domain/company/contact/interaction/opportunity` | Inicio, Empresas, Contactos, Interacciones, Oportunidades | Consumidores registrados; **NO modificar** su aspecto o lógica |
| Estudios y captura PG01–PG09 | `pages/diagnostic-stages.js`, `ui/renderer.js`, `domain/process.js`, `domain/risk.js`, `domain/economics.js`, `pages/session-display.js` | Estudios, Contexto, Alcance, Estado objetivo | Preservar snapshots; propuestas de migración sólo donde no exista freeze |
| Diagnóstico PG10 | `pages/results.js`, `domain/analysis-workbench.js`, `domain/result-context.js` | No marcado FROZEN en el manifiesto consultado | Reutiliza `auneaWorkDisclosure` y estructura compartida |
| TO-BE PG11 | `pages/tobe.js`, `pages/tobe-global.js`, `pages/internal-work-events.js`, `domain/tobe-model.js`, `domain/tobe-transactions.js` | No marcado FROZEN | Etapas `aunea-ui-work-stage`, estilo común; conservar transacciones |
| PG12 y posteriores | `pages/comparison.js`, `pages/projects.js`, módulos de dominio `project/completion/output-review` | Revisar QA de página, sin reapertura implícita | Componer los patrones existentes `section/btn/data-table` |

## 5. Propietario único de cada capa de UI

**Tokens y aspecto de componentes generales:** `styles.css`. Ya aloja los estilos globales de botón, card, tabla, aviso, estados, inputs y primitives `aunea-ui-*`.  
**Estructura HTML compartida:** `core/state.js` (`pageTop`, `section`, `statusBadge`, `openModal`) y `ui/renderer.js` (`auneaSelectControl`, `auneaWorkDisclosure`). Existen dos ubicaciones históricas: **no crear más propietarios** mientras no se extraigan de forma probada.  
**Geometría, responsive y excepciones por pantalla:** `ui-system.css`. Debe ir perdiendo reglas de aspecto genérico, pero algunos overrides gobiernan FROZEN y no pueden trasladarse sólo por patrón textual.  
**Páginas:** sólo composición y estados/actions propios. No deben definir nuevos tonos, radios, tamaños de botones ni tarjetas visualmente equivalentes.  
**Datos y reglas:** owners canónicos + engines/backend; nunca un componente CSS.

## 6. Cómo construir la biblioteca única sin romper el software

1. **Contrato y fotografía por componente:** identificar clase global, owner renderer, variantes, estados y consumidores. Guardar capturas actuales de todas las familias, incluidas las nueve FROZEN.
2. **Migración CSS segura:** para cada una de las 107 clases cruzadas y 146 grupos selector/contexto, decidir `GLOBAL`, `SCOPED_EXCEPTION`, `FROZEN_PROTECTED`, `OBSOLETE_PROVEN` o `PENDING_BROWSER_QA`. No borrar por ausencia de consumidor léxico.
3. **Componentes estructurales:** usar `pageTop/section`, `statusBadge/openModal`, `auneaSelectControl` como primitivas existentes. Extraer nuevos renderers sólo si hay **misma estructura y comportamiento** en más de un consumidor no-FROZEN.
4. **Etapas y paneles:** armonizar PG10, PG11, PG12 y posteriores sin duplicar estructuras. Mantener nombres y estados del negocio en la vista, no en el componente común.
5. **FROZEN:** no tocar código ni estilo que cambie apariencia aprobada. Un cambio transversal exige PASS de snapshots, browser y UAT; si supone cambio de apariencia, reapertura explícita.
6. **Anti-regresión automática:** `tests/design-system-common.test.cjs` ejecuta el inventario completo, comprueba 46 módulos, 20 categorías, nueve FROZEN y prohíbe aumentar simultaneidad de propietarios CSS, duplicación de reglas o inline attributes frente a `docs/audit/AUNEA_INTERNAL_DESIGN_CONSUMERS.json`.
7. **Cierre real:** cero overrides generales no justificados, jerarquías homogéneas, componentes con un solo owner, snapshots/FROZEN PASS y pruebas frontend/backend/browser. No confundir inventario PASS con visual PASS.

## 7. Alcance efectivamente realizado en esta intervención

- Script de inspección de **46** módulos, CRM/PG00→PG12+, **20** categorías y dos CSS: `tools/aunea-design-system-audit.cjs`.
- Inventario JSON versionado por CI: `docs/audit/AUNEA_INTERNAL_DESIGN_CONSUMERS.json`.
- Guardarraíl automatizado y ejecutado: `tests/design-system-common.test.cjs`, `.github/workflows/aunea-ui-shared-check.yml`; el estado `success` de Node está en `docs/audit/AUNEA_INTERNAL_UI_SHARED_GATE.json`.
- Contrato de gestión: no introducir componentes paralelos cuando ya existan, preservar las nueve FROZEN y no mover reglas o outputs de negocio al frontend.

**Estado de F1/F2: PARCIAL, no CLOSED.** La migración de los 107 casos CSS y de todos los consumidores requiere lotes visualmente verificados. El inventario completo habilita la ejecución, pero no demuestra que el aspecto de toda la aplicación sea ya uniforme.

## 8. Implementación y aceptación automatizada · 13/11/2026

### Componentes y estilos implementados sin alterar las nueve pantallas FROZEN
- `tools/aunea-ui-component-map.cjs`: correspondencia técnica única de DS-001–DS-020, consumida por el inventario; **no** supone 20 renderizadores completos.
- `ui/renderer.js`: `auneaEmptyState()` como HTML semántico compartido. `pages/comparison.js` (PG12) y `pages/projects.js` lo reutilizan sin alterar su HTML ni los estados de negocio.
- `styles.css`: `.aunea-ui-code-pre` para pruebas/auditoría de IA; `domain/internal-ai-pilot.js` deja de repetir estilos inline estáticos. `pages/session-display.js` reutiliza `aunea-ui-mt-12`.
- `ui-system.css`: 22 declaraciones repetidas retiradas solo de selectores `.pg10-*` / `.tobe-*`, con mapa final de declaración por selector/contexto equivalente antes y después. Los posicionamientos calculados del mapa conservan atributos dinámicos.
- Contratos globales de componentes ampliados en `tests/design-system-common.test.cjs`, incluidos consumidores CRM, PG00/PG01–PG09, PG10, PG11 y PG12+, catálogo DS20, FROZEN y prohibición de aumentar duplicaciones respecto al baseline.
- `docs/audit/AUNEA_INTERNAL_DESIGN_BASELINE_20261113.json` retiene la primera fotografía inmutable; `docs/audit/AUNEA_INTERNAL_DESIGN_CONSUMERS.json` es la fotografía viva, refrescada por CI tras cambios.

### Corrección de integración descubierta al ejecutar toda la suite
La extracción histórica de `registerInternalWorkPages()` dejó `pages/internal-work-events.js` **después** de `domain/internal-ai-pilot.js` en el manifiesto; este último intenta envolver `registerInternalWorkPages` durante su carga y provocaba `ReferenceError`. Se ha movido la declaración de eventos inmediatamente **antes** del módulo IA, manteniendo el resto del runtime y todos los 46 módulos. `index.html` y `tests/module-manifest.test.cjs` gobiernan explícitamente ese orden. Tests antiguos que dependían de literales CSS/HTML anteriores ahora comprueban el componente compartido real; se reparó el alcance de dos fixtures (`read`/`root`) sin modificar código de negocio.

### Gates acreditados
- **GitHub Actions, run `43399133707`**, SHA `23fa4a2419bc7ca3ec5947c5f44e5c3354defa6c`: backend `pytest` = **success**, frontend `npm test` = **success**, `browser_uat` Chromium = **success**; publicación de estado = **success**. Registro versionado: `docs/audit/AUNEA_INTERNAL_ACCEPTANCE_GATE.json`, `overall: PASS`, fecha `2026-11-13T09:12:30Z`.
- `AUNEA Shared UI Contract Gate`: 27 pruebas selectivas de estilos/manifest = **success**.
- `AUNEA Design System Runtime Inventory`: ejecución de inventario completa = **success**.
- **No acreditado:** comparación visual manual pixel/estados de todas las páginas, especialmente nueve FROZEN, ni migración física de todas las clases cruzadas. Estos controles mantienen F1/F2 abiertos y cualquier cambio visual global bloqueado si no existe su QA.

### Continuación recomendada para cerrar F1/F2
1. Capturar y comparar las nueve pantallas FROZEN en Chrome/Edge y distintas resoluciones; no cambiar su apariencia sin reapertura explícita.
2. Clasificar las 107 clases compartidas por tipo de owner y los 146 grupos de selectores/contextos (ambos estilos) con consumidores, responsive y computed styles. Conservar excepciones necesarias.
3. Migrar por lotes solo las pantallas no FROZEN; unificar variantes de modal, formulario y panel operativo que realmente compartan estados/DOM.
4. Ejecutar **nuevamente** todas las UAT Node/Python/Chromium después de cada lote, conservar referencias visuales y documentar la reducción real de estilos. No atribuir a F1/F2 el estado CLOSED por tener una única auditoría PASS.

**Cierre de este lote:** Inventario y contrato global publicados; estabilización automatizada PASS; implementación visual transversal todavía **PARCIAL / REVIEW**.


## 10. Consolidación F1/F2 — cierre técnico y QA verificable · 13/11/2026

**Precedencia temporal:** este apartado actualiza el estado de implementación de los apartados 7–9, que permanecen como registro histórico de avances. Se cierra el trabajo técnico comprometido de F1/F2 en la rama REVIEW; **NO** equivale a aceptación visual manual ni autoriza merge a main.

### F1: propietario y reducción CSS
- Capa común única: `3_SYSTEM/frontend/styles.css` (tokens, cards, botones, formularios, avisos, tablas, tipografía, paneles y utilidades opt-in). Geometría responsive y excepciones por pantalla: `3_SYSTEM/frontend/ui-system.css`. No existe tercer CSS dueño de componentes comunes.
- Auditoría completa de **46 módulos**, **20 categorías documentales DS** (sin declarar 20 renderizadores implementados), **107 clases presentes en ambos CSS** y **139 grupos selector+contexto repetidos**. Clasificación definitiva **técnica**: clases 106 `FROZEN_PROTECTED`, 1 `SCOPED_EXCEPTION`, **0 pendientes**; selectores 99 `FROZEN_PROTECTED`, 40 `SCOPED_EXCEPTION`, **0 pendientes**. Conservación intencional de cascadas, variantes y diseño histórico; no se borran reglas por coincidencia léxica.
- `ui-system.css`: aprox. **5.041 → 5.009 líneas**. Los estilos redundantes demostrados de PG10/PG11 se han eliminado; las cabeceras y captions PG11 heredan la tipografía compartida.
- Los atributos `style="` del runtime pasan de **35 a 29**. El UAT visible elimina sus cuatro estilos fijos; se conservan estilos dinámicos necesarios para posiciones de grafos, anchuras por datos y presentación condicional, además de consumidores históricos FROZEN sin reapertura. `styles.css` incluye `aunea-ui-mt-16` y `aunea-ui-flex-actions` para evitar nuevos atributos inline.

### F2: un único renderer para patrones equivalentes
- Propietarios existentes preservados: `core/state.js` para `pageTop`, `section`, `statusBadge`, `openModal`; `ui/renderer.js` para `auneaSelectControl`, `auneaWorkDisclosure`, `auneaEmptyState`, `auneaEmptyMessage` y `auneaNoticeMessage`.
- PG10/PG11 reutilizan avisos semánticos con tonos permitidos y HTML equivalente; PG10/PG12/Proyectos comparten estados vacíos, PG10 comparte `details/summary` de trabajo interno, PG11 usa superficies y etapas `aunea-ui-work-*`; el resto de las familias siguen utilizando los controles base del producto. No se creó segunda biblioteca, no se trasladaron reglas ni resultados del backend al frontend.
- El workflow `AUNEA Shared UI Contract Gate` conserva su evidencia por **artefacto inmutable asociado al SHA**, sin hacer push de un informe desde una ejecución paralela (evita colisiones con Acceptance Gate y el inventario).

### Evidencia de QA y límites de aceptación
- **Acceptance Gate SHA `185300b012472abfe17a712554f685a2837924c5`**: backend pytest, frontend npm y dos journeys Chromium **PASS**. Run: https://github.com/PedroCMillan5/AUNEA/actions/runs/43418293236.
- `AUNEA Frontend Tests`: PASS https://github.com/PedroCMillan5/AUNEA/actions/runs/43418293301. `AUNEA Shared UI Contract Gate`: PASS https://github.com/PedroCMillan5/AUNEA/actions/runs/43418293411. `Design System Runtime Inventory`: PASS https://github.com/PedroCMillan5/AUNEA/actions/runs/43418293140.
- FROZEN: las **18 capturas PNG** (nueve pantallas × 1365/390 px) comparadas con la referencia técnica versionada `tests/frozen/frozen-visual-reference-sha256.json` pasan con huellas SHA-256 exactas. La referencia no se actualiza al detectar diferencias. La comparación entre los runs 43409533847 y 43416198540 también mostró 18/18 igualdad píxel a píxel.
- **No acreditado:** aceptación visual manual del propietario frente a las referencias aprobadas y revisión nativa final en Windows/Edge; tampoco equivalencia visual completa de cada estado posible en CRM/PG00–PG12. Permanecen como gate de aceptación de F6. Las nueve FROZEN siguen protegidas; no se reabren implícitamente.
- **Estado formal:** F1 y F2 **IMPLEMENTACIÓN TÉCNICA COMPLETADA EN REVIEW**. No marcar el producto PRODUCTION ni cerrar F6/QA visual manual por este hito.
