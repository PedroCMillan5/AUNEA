# AUNEA Internal — Contrato de componentes compartidos para TODO el producto

**Fecha:** 13/11/2026 · **Rama:** `work/as-is-ux-simplification-20260930` · **Estado:** IMPLEMENTACIÓN PARCIAL / REVIEW.  
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
