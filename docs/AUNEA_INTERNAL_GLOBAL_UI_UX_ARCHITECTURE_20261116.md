# AUNEA Internal — Arquitectura UI/UX transversal y PG11 migrada a componentes comunes

**Fecha de validación:** 16/11/2026  
**Rama:** `work/as-is-ux-simplification-20260930` · **Estado:** REVIEW (no merge a `main`, no PRODUCTION)  
**Fuente:** 00_AUNEA_INTERNAL_MASTER_INDEX, PROJECT_RULES.md, AUNEA_SYSTEM_SIMULATOR_CANONICAL v1.14, AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL v1.7, decisiones vigentes DEC-050/052/055/056, DESIGN_SYSTEM_AUNEA, TOKENS_AUNEA y CATALOGO_COMPONENTES_AUNEA DS-001–DS-020.  
**Precedente:** docs/AUNEA_INTERNAL_SHARED_UI_CONTRACT_20261113.md; F0–F6 y docs/AUNEA_INTERNAL_PG11_UX_CONSISTENCY_20261116.md.

## 1. Objetivo y alcance real

Evitar corregir cada sección a mano. Las etapas y grupos equivalentes deben utilizar **un único renderer** y un único propietario de tipografía, geometría, márgenes, apertura, cierre y foco. La vista concreta sigue aportando datos, controles, ayudas, permisos y reglas de negocio. No se rediseñan las nueve páginas FROZEN: su aspecto sigue protegido por sus referencias técnicas.

**Implementado y probado:** componente transversal de desplegable etapa/grupo, consumido por PG11 (03.1, 03.2, 03.3 y grupos 00–05) y disponible mediante la variante de compatibilidad de PG10. La aplicación continúa reutilizando los componentes globales preexistentes `pageTop()`, `section()`, `auneaSelectControl()`, tokens, botones, avisos, tablas y estados a lo largo de CRM, captura, diagnóstico, TO-BE y comparación. **No significa que todas las páginas se hayan migrado físicamente a un nuevo renderer ni que se haya aprobado toda la experiencia visual.**

## 2. Arquitectura propietaria

| Capa | Owner | Responsabilidad | Consumidores acreditados |
| --- | --- | --- | --- |
| Composición general | `core/state.js` | `pageTop`, `section` y estructura de página | CRM, cuestionario, diagnóstico, posteriores |
| Tokens y primitivos | `styles.css` | Colores, tipo, botones, tarjetas, inputs, avisos, tablas | Todas las páginas, con FROZEN protegido |
| **Desplegables globales** | `ui/renderer.js` — `AUNEA-FE-GLOBAL-DISCLOSURE-450` | `auneaUiDisclosureStart/End/Open`, `details/summary`, estado de navegación local, variantes `stage`, `group`, `legacy` | PG11 y compatibilidad PG10 |
| **Estilos desplegables** | `styles.css` — `AUNEA-FE-GLOBAL-DISCLOSURE-451` | Misma cabecera, flecha, número, padding, estado, foco y responsive; opt-in | 03.1–03.3; grupos 00–05 |
| Contenido especializado | `pages/tobe.js`, `pages/tobe-review.js`, `pages/tobe-flow.js` | Campos, fuentes, intervenciones, IA, rutas, previsualización y decisiones | PG11 |
| Datos y cálculos oficiales | Dominio y backend canónico | Versionado, transacciones, estimaciones, reglas, trazabilidad | No se trasladan a CSS o al renderer |

**Regla de responsabilidad:** las páginas pueden decidir qué contenido y qué estado funcional mostrar, pero no crear un segundo componente de cabecera con otro tamaño o margen. El estado `open` no implica una validación ni aceptación de propuesta. Los elementos FROZEN siguen en compatibilidad, sin modificar su DOM.

## 3. Migración real de PG11

- 03.1 «Entender el AS-IS» → variante `stage`, solo lectura, con información original.
- 03.2 «Revisar oportunidades de mejora» → la misma variante `stage`, con reglas, IA y fuentes existentes.
- 03.3 «Configurar la actividad futura» → la misma variante `stage`, título y estado en cabecera, texto explicativo en el cuerpo.
- Grupos 00 (actividad nueva), 01 (transformación), 02 (funcionamiento), 03 (recursos), 04 (impacto), 05 (tiempo) → **el mismo renderer `group`**, con contenido y condiciones de cada grupo intactos.
- `auneaUiDisclosureOpen()` preserva la apertura/cierre al redibujar la misma actividad. La navegación entre subsecciones puede abrir el destino. No se modifica la persistencia de negocio.
- `auneaWorkDisclosure()`, usado en PG10, utiliza el mismo renderer en variante `legacy` y mantiene **exactamente** la estructura anterior exigida por la compatibilidad visual.

## 4. Retirada de código obsoleto

| Clasificación | Elemento | Evidencia | Decisión |
| --- | --- | --- | --- |
| SUSTITUIDO | `tobeDisclosureOpen`, lógica de apertura solo PG11 | El renderer global asume esa responsabilidad | Retirado de `pages/tobe.js`, sustituido por propietario global |
| SUSTITUIDO | HTML específico de cabeceras 03.1/03.2/03.3 y 00–05 | Las nueve instancias llaman a `auneaUiDisclosureStart()` | Eliminado HTML duplicado; mismo marcado en runtime |
| OBSOLETO | CSS local `AUNEA-FE-PG11-DISCLOSURE-UI-422` y overrides de cabecera/grupos 03/05 | Owner global 451 y navegación protegida | Retirados ~4,8 KB en primer lote |
| OBSOLETO ACREDITADO | 16 reglas de `ui-system.css` con `tobe-design-group-head`, `tobe-design-group-number`, `tobe-stage-body` y márgenes antiguos | Búsqueda literal sobre los 50 módulos activos; regresión en frontend/Edge/Chromium | Retirados 2.119 bytes; geometría verificada |
| CONSERVAR | CSS de campos, fuentes IA, mapas, riesgos, ayudas y rutas | Consumidores vigentes y reglas especializadas | No eliminar |
| CONSERVAR PROTEGIDO | Código y estilos de las nueve páginas FROZEN | 18 referencias fijas de escritorio/móvil | No modificar |
| REVISAR EN FUTUROS LOTES | Otras clases duplicadas que figuran en el inventario F0 | Una coincidencia textual no prueba uso muerto ni seguridad de eliminación | Sin eliminación sin consumidor/QA |

El objetivo es eliminar **duplicados demostrados**, no maximizar líneas eliminadas. No se ha introducido otra hoja CSS ni otra biblioteca paralela. Los IDs de bloque sustituidos 421/422 se retiraron del índice activo; nuevos propietarios 450/451 aparecen en `CODE_BLOCK_INDEX.md`.

## 5. Evidencia de QA

**Versión funcional y CSS limpiado:** `2a77a1ea46c39425e4b486f20d4dd59ff2013c0d`.

- [Acceptance Gate 43844474448](https://github.com/PedroCMillan5/AUNEA/actions/runs/43844474448): **SUCCESS** en frontend (960/960 pruebas, 0 fallos), backend (493 PASS, 1 warning), Chromium y publicación.
- Chromium: **18/18 referencias FROZEN** sin diferencias, comprobación técnica basada en referencia fija (la aceptación humana es otra cosa).
- Chromium: **PG11_BROWSER_INVOICE_PASS**, **PG11_BROWSER_LOGISTICS_PASS**, **PG11_PG12_SOURCE_LINKED_BROWSER_PASS**, recuperación tras recarga y `CHROMIUM_UAT_PASS`.
- [Windows/Microsoft Edge 43844474413](https://github.com/PedroCMillan5/AUNEA/actions/runs/43844474413): **SUCCESS**, expedientes sintéticos invoice/logistics con backend real, confirmación, cancelación, undo, recarga y fuentes AS-IS inmutables.
- [Shared UI Contract Gate 43844474358](https://github.com/PedroCMillan5/AUNEA/actions/runs/43844474358): **SUCCESS**; [Design System Runtime Inventory 43844474512](https://github.com/PedroCMillan5/AUNEA/actions/runs/43844474512): **SUCCESS**.
- Captura real: [evidencia Chromium del mismo gate](https://github.com/PedroCMillan5/AUNEA/actions/runs/43844474448), artefacto `aunea-single-uat-chromium-evidence`: `pg11-section03-reviewed-fields-desktop.png`, `pg11-aunea-consultant-desktop.png` y `pg11-aunea-consultant-mobile.png`.

## 6. Límites y criterio de no repetir errores

Esta entrega **sí contiene una implementación común real y migración de PG11**, pero **no certifica la UI/UX definitiva de toda AUNEA Internal**, ni que PG11 tenga toda su funcionalidad desarrollada, ni que PG12–PG15 hayan terminado su E2E comercial. Se mantiene pendiente aceptación visual del propietario; no confundir los tests automáticos con dicha aceptación. La homogeneización de otros patrones todavía requiere migraciones justificadas por consumidor y, especialmente para FROZEN, respetar sus contratos sin modificar su apariencia. No se altera lógica IA, backend, fórmulas, estado de aprobación ni decisiones canónicas. No se fusiona a `main`.

**Regla preventiva:** cuando aparezca una sección equivalente, primero reutilizar el componente 450/451; no se admite añadir otro `<summary>` con geometría definida localmente sin documentar una excepción funcional y sus consumidores.

## 7. Corrección de composición completa PG11 · 16/11/2026 (captura del propietario)

La captura de la página completa demostró que el lote anterior **no** había homogeneizado el nivel superior de PG11: 01 cerraba con un desplegable plano, 02 con otro diseño, y 03 estaba visualmente dividida en tres tarjetas independientes (cabecera, navegación, inspector). Esta incidencia se reconoce explícitamente: aprobar 03.1–03.3 no acreditaba que las secciones 01–03 fueran homogéneas.

**Corrección estructural implementada:**
- `ui/renderer.js` añade variante opt-in `inline` al mismo propietario global `auneaUiDisclosureStart/End/Open` (Block_ID 450), con tipografía, chevron, foco, fondo y bordes definidos en `styles.css` (Block_ID 451).
- `pages/tobe.js`: 01 «Consultar criterios y restricciones del cliente» consume la variante `inline`, con estado de apertura conservado al repintar el mismo borrador.
- `pages/tobe-global.js`: 02 «Ver seguimiento, fuentes y comprobaciones» consume exactamente la misma variante `inline`, conservando informes, fuentes, incidencias y lógica de apertura por aviso.
- `pages/tobe.js`: 03 contiene ahora **una sola** superficie `tobe-review-workbench aunea-ui-work-surface`: cabecera, controles «Revisión por actividad» / «Mapa TO-BE», navegación, mapa e inspector están bajo un mismo marco; no existen tres tarjetas independientes.
- `ui-system.css`: se eliminan los estilos individuales de los dos desplegables y se limita el layout de 03 al contexto de su nueva superficie (Block_ID `AUNEA-FE-PG11-SECTION-COMPOSITION-453`, indexado). Las dimensiones de cabecera y contenido siguen perteneciendo al componente compartido.
- Se corrigió una regresión detectada mediante inspección de la primera captura: el nuevo contenedor no debe forzar `display:grid` en `.tobe-map-area` porque anula su ocultación en modo guiado. El CSS final respeta ambos modos.
- No se altera el diagnóstico, las propuestas IA, la lógica de aprobación, la base de datos ni las rutas de negocio.

**Regresiones y evidencia final (revisión `9b9b5a43032a43dd8f0ab688c509ff5e37598e40`):**
- [Acceptance Gate 43847649180](https://github.com/PedroCMillan5/AUNEA/actions/runs/43847649180) **SUCCESS**: 960/960 pruebas frontend; 493 backend PASS; Chromium browser UAT PASS; 18/18 FROZEN SHA-256; PG11 invoice/logistics PASS; PG11→PG12 PASS.
- [Edge Windows 43847649367](https://github.com/PedroCMillan5/AUNEA/actions/runs/43847649367) **SUCCESS**.
- [Frontend Tests 43847649435](https://github.com/PedroCMillan5/AUNEA/actions/runs/43847649435) **SUCCESS**.
- Artefacto con capturas reales: `aunea-single-uat-chromium-evidence`, dentro de Acceptance Gate 43847649180. Se revisaron `pg11-aunea-consultant-desktop.png` y `pg11-section03-reviewed-fields-desktop.png`. El primero muestra las tres secciones con card exterior equivalente y despliegues 01/02 coincidentes; el segundo muestra inspector 03 sin mapa en modo guiado.
- Se añadieron aserciones de navegador para anchos, padding, borde, títulos de los controles finales 01/02, apertura/cierre, contenedor único 03, modo guiado sin mapa, modo mapa visible y vuelta a guiado sin mapa.

**Alcance del cierre:** corregidas estructuralmente y probadas visualmente por captura automatizada las dos discrepancias mostradas por el propietario. **No implica aceptación humana final ni que se hayan migrado a un único renderer todos los patrones y pantallas del producto**. La rama permanece REVIEW y sin merge.
