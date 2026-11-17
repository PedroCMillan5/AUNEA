# AUNEA Internal — Contrato maestro de UI/UX y matriz de unificación

**Versión:** v0.2 · **Estado:** REVIEW · **Fecha:** 17/11/2026  
**Ámbito:** CRM, PG00–PG12+, Proyectos, navegación, formularios y componentes de Internal.  
**Este documento:** especificación técnica de la interfaz; **no** redefine campos, datos, pricing, recomendaciones, resultados o decisiones empresariales. No autoriza cambiar referencias FROZEN.  
**Registro estructurado:** `docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json`.

## 0. Fuentes y precedencia

1. `IDENTIDAD_AUNEA`, `TOKENS_AUNEA v1.0`, `DESIGN_SYSTEM_AUNEA v1.0`, `CATALOGO_COMPONENTES_AUNEA DS-001–020`: identidad, escalas, paleta corporativa y gramática visual.
2. `AUNEA_SYSTEM_SIMULATOR_CANONICAL v1.14`, Diagnostic Master, `DECISIONES_AUNEA` DEC-050/055/056 y `PROJECT_RULES.md v1.7`: semántica, datos, owners, reglas, navegación y permisos.
3. Referencias aprobadas de las **nueve páginas FROZEN**: disposición visible, controles, orden y comportamiento protegido. Las normas nuevas no se aplican retroactivamente sin reapertura expresa.
4. Contratos técnicos F1/F2 y arquitectura global UI/UX 16/11/2026: implementaciones compartidas ya existentes. Este contrato **completa** su taxonomía; no crea una segunda biblioteca.
5. Auditoría de color digital de 17/11/2026: pares WCAG contrastados, restricciones y evidencia de captura; no respalda reparto 60/30/10 ni otro porcentaje como óptimo universal.

**Regla de cambio:** `datos → reglas → interfaz → entregables`. La interfaz consume un dato; jamás decide su valor, su propietario, ni la aceptación humana. Una plantilla visual no es fuente de negocio.

## 1. Definiciones semánticas completas

```text
Aplicación (shell)
└── Página (única finalidad, H1)
    ├── Cabecera/contexto + acciones de página
    ├── Workspace (contenido principal + inspector opcional)
    │   └── Sección (actividad principal, H2)
    │       ├── Subsección (fase interna, H3 cuando corresponde)
    │       │   └── Bloque (objeto operable: registro/paso/riesgo/alternativa)
    │       │       └── Grupo (conjunto lógico)
    │       │           ├── Campo (editable por un único owner)
    │       │           └── Dato (lectura, unidad, fuente, estado)
    │       └── Bloque / Grupo / Campo / Dato (si no requiere subsección)
    └── Barra de acciones contextual
```

| Nivel | Significado y cuándo usarlo | Prohibiciones |
|---|---|---|
| **Página** | Una pantalla con contexto único, título H1, navegación y objetivo | Duplicar H1 o construir un shell local alternativo |
| **Sección** | Tarea principal reconocible, título H2, descripción opcional y acciones propias | Convertir siempre en card aunque esté dentro de otra card |
| **Subsección** | Fase subordinada de una sección, sin propiedad de dato | Cambiar espaciado/tipografía según pantalla o generar card por defecto |
| **Bloque** | Una entidad o unidad operativa con identidad/acciones (paso, riesgo, registro) | Crear otro editor o persistencia para la misma entidad |
| **Grupo** | Campos/datos que forman una unidad lógica y se leen juntos | Encadenar bordes, tarjetas o colores sin significado funcional |
| **Campo** | Etiqueta + control editable + ayuda/error/required/procedencia | Duplicar la captura; crear opciones o requiredness desde CSS |
| **Dato** | Etiqueta + valor + unidad + estado/fuente cuando procede | Usar 0 para ausente, mezclar derivado con editable, ocultar procedencia |

Una **card es una superficie**, no un nivel semántico; puede representar un bloque o sección, pero no justifica anidar más cards. Un **disclosure es una interacción**, no una nueva categoría jerárquica. Un **inspector** presenta selección y evidencia, y sólo edita a través del owner autorizado.

### 1.1 Reglas de anidamiento y densidad
- Una sola superficie enmarcada por nivel salvo función independiente demostrable (selección, scroll propio, bloque editado, aviso).
- Separar grupos por título, espaciado y divisores antes de añadir fondos de color. No crear `card > card > card` por costumbre.
- Las acciones se posicionan junto a la unidad que modifican. La acción principal de página/etapa se concentra en su barra; no multiplicar CTAs primarios equivalentes.
- El plegado es opt-in y explícito, con affordance/chevron, nombre y estado persistente durante el redibujado compatible; no todos los grupos se pliegan.
- Al pasar de edición a confirmación, las vistas confirmadas son read-only hasta la ruta canónica de revisión/deshacer. Una apariencia verde no confirma datos.
- La cantidad de contenido no dicta excepciones cromáticas: un bloque largo utiliza jerarquía y progressive disclosure, no paletas nuevas.

## 2. Diseño visual: tokens, tipografía, ritmo y superficies

### 2.1 Tipografía y unidades **ya aprobadas**
- Titulares `Sora` 700/600, cuerpo `Inter` 400/500. Escala corporativa: Display 48/56; H1 36/44; H2 28/36; H3 22/30; Body 16/24; Small 14/20; Caption 12/16.
- Espaciado `4, 8, 12, 16, 24, 32, 48, 64, 96px`. Uso documental: **4–8** microespacios, **12–16** contenido interior, **24–32** bloques relacionados, **48–64** secciones en soportes corporativos. En Internal mantener densidad compatible con la referencia aprobada.
- Radios `4/8/12/16px`; card por defecto `12px`, controles `8px`, pills redondas. Borde estándar 1px `#E6E6E6`; borde destacado 2px del color de línea.
- Icono base 24px, trazo lineal 1.5–2px. No mezclar familias ni utilizar isotipo como icono funcional.
- **No existe** aprobación de reducir toda la tipografía de Internal a H1 24px/H2 18px, ni de fijar paddings nuevos globales. El CSS actual `pageTop/section` tiene adaptaciones de densidad aprobadas por pantalla: se conservan. Las variantes futuras deben declararse como opt-in y pasar UAT.

### 2.2 Roles de color: composición antes que porcentajes
| Rol | Color/pareja | Uso permitido |
|---|---|---|
| Lectura | `#FAFAF8` + carbón `#1E1E1E` | Texto y superficie base |
| Trabajo | `#FFFFFF` + carbón | Campos, tablas, tarjetas |
| Contexto | `#EAF2ED` + `#0F3B2E` | Contexto/selección documentada, nunca cada tarjeta automáticamente |
| Navegación/CTA | `#0F3B2E` + blanco | Superficie corporativa oscura, acción primaria |
| Dorado marca | `#D4AF37` | Isotipo y detalles gráficos; **no** texto pequeño sobre blanco ni estado funcional |
| Salvia | `#6FA885` | Apoyo/ornamento con semántica textual; no texto blanco ordinario |
| Semánticos | Success `#2E7D32`, Info `#2F5DA8`, Warning `#A66300`, Error `#B42318` | Estados acompañados de etiquetas/iconos, nunca identificación solamente cromática |

Criterio: WCAG 2.2 texto AA `≥4.5:1`, texto grande y componentes visuales esenciales `≥3:1`, según aplicabilidad. Los divisores puramente decorativos pueden contrastar menos. Revisar opacidades y estados reales del navegador. La distribución cromática `80/14/5.5/0.5` es **hipótesis de la auditoría**, no cuota canónica ni condición de QA. Tampoco 70/20/9/1 ni 60/30/10 son decisiones aprobadas.

### 2.3 Geometría del shell existente — no universalizar sin prueba
- `styles.css` contiene shell de sidebar de **230px**, workspace con inspector **340px** (variante 440px), grid y barras; `ui-system.css` aplica overrides que cambian la topbar a **76px** y otras geometrías según pantalla.
- No convertir esos números observados en tokens inmutables de todo el producto sin compararlos con referencias FROZEN y responsive.
- En web corporativa, el grid documental es 12 columnas desktop y 4 móvil; Internal utiliza composiciones operativas particulares ya implementadas.
- La distribución horizontal debe minimizar scroll lateral; el inspector no estrecha irreversiblemente la captura, y en móvil debe apilarse si la referencia/patrón permite. Menús y modales deben mantenerse dentro del viewport.

## 3. Contrato transversal de interacción — estados y resultados

### 3.1 Componentes de entrada
- Input/textarea/select/checkbox/radio/multiselect: `label` visible, ayuda junto al campo, errores específicos y vínculo `label-control`. El valor pertenece al Field_ID canónico; los tipos, opciones, límites y requiredness NO se infieren de la interfaz.
- Estados: idle, hover cuando procede, focus-visible, filled/selected, invalid, disabled, read-only, pending-save, saved. `disabled` no sustituye una explicación cuando el usuario intenta una acción bloqueada; comunicar motivo y corrección posible.
- Selector: usar `auneaSelectControl()` donde haya contrato compatible; sus estados abierto/cerrado/foco/elección/teclado se prueban; no crear nuevas variantes por PG.
- Multiselect: límite, exclusividad y chips proceden de la fuente propietaria, no de un theme local.
- Recuperación: cancelar no confirma ni pierde datos persistidos; guardar muestra resultado real y error visible, sin cerrar el diálogo en fallo.

### 3.2 Acciones y diálogos
- Botón primario de una unidad, secundarios neutros, destructivo explícito. Texto verbal inequívoco; no esconder la justificación de un bloqueo solo en toast fugaz.
- Modal: título específico, objeto/acción, contenido, botón Cancelar y acción positiva; validar antes de persistir, mostrar errores y evitar doble envío; foco inicial y retorno al disparador, Escape solo cuando no causa pérdida de datos sin confirmación.
- Menú contextual `•••`: solo acciones pertinentes y habilitadas; navegación teclado, cierre al salir y sin solapamiento/corte; acción destructiva distinguible.
- Confirmación `AS-IS/TO-BE`: no extrapolar de color. Si la versión cambió, preservar borrador, explicar fuente/versiones y ruta de revisión; nunca aplicar a espaldas del owner. La previsualización no equivale a commit.
- Toast: uso para confirmaciones no críticas; bloqueos, conflictos y errores persistentes se muestran junto a la acción afectada.

### 3.3 Navegación y disclosure
- Tabs: un solo activo, título de panel asociado, foco y navegación compatibles; conservar selección al redibujar cuando corresponda.
- Etapas de diagnóstico: la navegación y bloqueos provienen del estado de Engagement, no del color ni del índice visual.
- `auneaUiDisclosureStart/End/Open()` es el propietario de variantes `stage/group/inline`; `legacy` conserva compatibilidad PG10. Mismo título, chevron, foco, espaciado y comportamiento en instancias equivalentes.
- Abrir otra subsección no confirma una propuesta ni recalcula engines. El estado `open` no es dato de negocio.
- Los patrones FROZEN conservan su DOM y estilos aprobados, aunque sean históricos.

### 3.4 Tablas, datos, riesgos y diagramas
- Tablas: cabecera textual, orden observable, filas operables cuando aplique, alineación de números, paginación consistente, filtros reversibles y distinción `sin datos` / `sin resultados por filtro` / `fallo de carga`. No inferir valores faltantes.
- KPI: título, valor, unidad, periodo, origen, fecha/estado de cálculo; nada ficticio. Los valores derivados son de solo lectura y se trazan al engine.
- Paso/fricción/riesgo/impacto: selección ilumina y conecta con evidencia; editar solo el owner. El mismo AS-IS se reutiliza, no se recrea un grafo distinto por pestaña.
- Comparativa/TO-BE: líneas AS-IS y TO-BE diferenciadas con etiquetas y capas; no depender solo de verde/rojo, y no reescribir el AS-IS confirmado.
- Indicadores de procedencia: distinguir valor introducido, reutilizado, derivado, candidato y confirmado; la codificación visual no reemplaza nombres de estado.

## 4. Responsive, accesibilidad, animación y errores

- Mantener las anchuras y breakpoints que ya gobiernan las referencias FROZEN; en futuras pantallas: verificar desktop 1365px y móvil 390px como mínimo más anchuras intermedias, sin truncar acciones, field labels ni inspector.
- Teclado: todos los controles alcanzables, foco visible, jerarquía semántica de headings, acciones con nombre accesible, modal con foco controlado, sin trampas no justificadas.
- Color: contraste calculado sobre fondo *renderizado* incluyendo transparencia; simulación de deficiencia cromática y comprobación sin color; iconos y etiquetas para estados críticos.
- Zoom y texto: validar reflow 200%/400% según criterios aplicables; sin scroll horizontal bidimensional salvo gráficos/tablas que lo requieran y sean navegables.
- Motion: animación ligera sólo para indicar transición o desplegado, no para decorar; respetar `prefers-reduced-motion`; no añadir un token de duración nuevo sin pasar QA.
- Errores: mensaje específico, contenido conservado, origen técnico explicado en términos operables; no toast como único canal. Confirmado, dirty, stale, blocked y readonly no son intercambiables.

## 5. Inventario de familias y propietarios verificables

**Estado `existing` = existe al menos una base reutilizable en el runtime, NO significa migración completa ni UAT final.**  
**Estado `review` = contrato de la familia especificado, pero aún requiere completar/verificar consumidores o variantes.**

| ID | Familia | Referencia DS | Propietario técnico actual | Base |
|---|---|---|---|---|
| `shell` | Carcasa de aplicación | DS-001, DS-002 | `ui/shell.js` | EXISTING |
| `page` | Página/cabecera | DS-002 | `core/state.js` | EXISTING |
| `workspace` | Área de trabajo | DS-004 | `core/state.js` | EXISTING |
| `section` | Sección funcional | DS-002, DS-004 | `core/state.js` | EXISTING |
| `subsection` | Subsección | DS-002, DS-003 | `core/state.js` | REVIEW |
| `block` | Bloque operativo | DS-004 | `core/state.js` | REVIEW |
| `group` | Grupo de campos/datos | DS-003, DS-020 | `core/state.js` | REVIEW |
| `card` | Tarjeta/superficie | DS-004 | `styles.css` | EXISTING |
| `field` | Campo editable | DS-020 | `ui/renderer.js` | EXISTING |
| `datum` | Dato/valor | DS-003 | `core/state.js` | EXISTING |
| `button` | Botón/acción | DS-017 | `styles.css` | EXISTING |
| `select` | Selector simple | DS-020 | `ui/renderer.js` | EXISTING |
| `multiselect` | Selector múltiple | DS-020 | `ui/renderer.js` | REVIEW |
| `disclosure` | Desplegable/acordeón | DS-002, DS-004 | `ui/renderer.js` | EXISTING |
| `modal` | Modal/diálogo | DS-004, DS-017 | `core/state.js` | EXISTING |
| `context-menu` | Menú contextual | DS-017 | `styles.css` | REVIEW |
| `tabs` | Pestañas | DS-002 | `styles.css` | EXISTING |
| `navigation` | Navegación/etapas | DS-012, DS-013 | `core/state.js` | EXISTING |
| `search-filter` | Búsqueda/filtros | DS-008, DS-020 | `styles.css` | REVIEW |
| `table` | Tabla de datos | DS-008 | `styles.css` | EXISTING |
| `pagination` | Paginación | DS-008 | `styles.css` | REVIEW |
| `status-chip` | Estado/etiqueta | DS-019 | `core/state.js` | EXISTING |
| `notice` | Aviso contextual | DS-006, DS-007 | `ui/renderer.js` | EXISTING |
| `toast` | Notificación transitoria | DS-006 | `core/state.js` | EXISTING |
| `empty-state` | Estado sin datos | DS-003, DS-004 | `ui/renderer.js` | EXISTING |
| `loading-state` | Carga/progreso | DS-019 | `styles.css` | REVIEW |
| `inspector` | Inspector contextual | DS-004 | `core/state.js` | EXISTING |
| `action-bar` | Barra de acciones | DS-017 | `core/state.js` | EXISTING |
| `process-map` | Mapa de proceso | DS-012, DS-014 | `domain/process.js` | EXISTING |
| `risk-warning` | Riesgos y alertas | DS-007 | `styles.css` | EXISTING |
| `kpi` | Indicador | DS-005 | `styles.css` | EXISTING |
| `comparison` | Comparación de escenarios | DS-010, DS-011 | `pages/comparison.js` | REVIEW |
| `roadmap` | Cronología/etapas | DS-013 | `styles.css` | REVIEW |
| `diagram` | Diagrama | DS-014 | `domain/process.js` | REVIEW |
| `provenance` | Fuente y trazabilidad | DS-018, DS-019 | `core/state.js` | EXISTING |
| `tooltip-help` | Ayuda contextual | DS-003, DS-020 | `styles.css` | REVIEW |
| `responsive` | Adaptación responsive | DS-020 | `ui-system.css` | REVIEW |
| `keyboard-focus` | Foco y teclado | DS-020 | `styles.css` | REVIEW |
| `motion` | Movimiento/transiciones | DS-020 | `styles.css` | REVIEW |
| `feedback-confirm` | Confirmación/errores de acción | DS-006, DS-017 | `core/state.js` | REVIEW |

Se prohíbe crear un nuevo renderer cuando el propietario existente ya ofrece la misma semántica y estados. Para excepciones reales: documentar diferencia funcional, owner, consumidor, fuente, Block_ID y regresión. Las 20 categorías DS no equivalen a 20 renderizadores completos.

## 6. Propiedad física vigente, sin tercera biblioteca

| Responsabilidad | Propietario |
|---|---|
| Tokens y aspecto base: botones, controles, cards, mensajes, status, tipografía | `3_SYSTEM/frontend/styles.css` |
| Geometría, responsive, composición especial y protecciones FROZEN | `3_SYSTEM/frontend/ui-system.css` |
| Shell, `pageTop()`, `workspace()`, `section()`, `insCard()`, `kvRows()`, `actionBar()`, `statusBadge()`, `openModal()` | `3_SYSTEM/frontend/core/state.js` y shell ya existente |
| Controles canónicos, select, disclosures, empty/notice | `3_SYSTEM/frontend/ui/renderer.js` |
| Proceso AS-IS, riesgo, economía, TO-BE, escenarios | módulos de dominio y páginas actuales, sin duplicar datos ni cálculos |
| Contrato verificable de todas las familias | `docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json` |
| QA de integridad de contrato | `3_SYSTEM/frontend/tests/ui-ux-master-contract.test.cjs` |

**Deuda declarada:** `section()` genera directamente una `card card-pad section`. Es una adaptación histórica que impide separar completamente semántica de presentación; no alterar FROZEN. Habilitar una variante opt-in en pantallas no congeladas después de la UAT de componentes. `ui-system.css` conserva excepciones justificadas y no puede limpiarse por búsqueda textual.

## 7. Gates técnicos y aceptación (bloqueantes para CANONICAL)

1. **G0 fuentes**: sin contradicción con identidad, DEC-050/055/056, Diagnostic Master y el diseño FROZEN.
2. **G1 contrato**: las 40 familias del registro tienen id, definición, propietario, variantes/estados y categoría documental; sin duplicados. La suite comprueba la presencia de propietarios base.
3. **G2 contraste**: tests matemáticos de tokens + inspector de estilos *computados* en hover/focus/disabled/error/carga, con WCAG según aplicabilidad.
4. **G3 componente**: capturar cada familia en sus estados y densidades, estructura/semántica de markup, foco, Escape, navegación, scroll y acciones.
5. **G4 pantallas**: CRM, PG00/PG01–PG09, PG10, PG11, PG12 y Proyectos; modo normal/vacío/edición/error/confirmado donde existe. Desktop/móvil y Chrome/Edge Windows.
6. **G5 recorrido**: CRM→Estudios→PG01–PG09→Diagnóstico→TO-BE 03.1/03.2/03.3→Comparación→resultados/entregables sin islas ni estados inconsistentes.
7. **G6 FROZEN**: 18/18 snapshots técnicos idénticos y aceptación de las referencias originales; no rediseñar una página FROZEN sin aprobación.
8. **G7 propietario**: revisión humana de equivalencia visual, fluidez y carga cognitiva. La suite automatizada PASS no equivale a producto aceptado.

**No presentar contrato como CANONICAL** hasta G0–G7. Un bloque parcial de QA puede cerrar técnicamente sin declarar que toda la aplicación está unificada.

## 8. Plan cerrado de implementación, sin improvisar nuevos conceptos

| Lote | Actividad concreta | Estado después de este documento |
|---|---|---|
| L0 | Registro de 40 familias, definiciones de niveles, fuentes y estados, test de estructura | Especificación documental creada / QA de registro pendiente |
| L1 | Resolver semántica `page/section/subsection/block/group/field/datum` y variantes opt-in no-FROZEN | Pendiente de implementación y UAT |
| L2 | Homologar controles, select, disclosure, modales, botones y estados en consumidores compatibles | Parcial; faltan revisión y migración |
| L3 | Tablas/filtros/inspector/status/diagramas, sin modificar business owners | Parcial; faltan revisión y migración |
| L4 | Auditoría visual color/contraste/densidad y prueba de alternativas | REVIEW, hipótesis sin aprobar |
| L5 | UAT integral y aprobación; versionado CANONICAL, sincronización gobierno | Pendiente |

Cierre de esta entrega: **el contrato documental y la matriz estructurada existen; no se afirma implementación integral, aprobación estética, merge a main ni producción.**

## 9. Referencias
- AUNEA Internal Master Index — `00_AUNEA_INTERNAL_MASTER_INDEX` (Drive).
- `PROJECT_RULES.md` v1.7; `DECISIONES_AUNEA` DEC-027/050/055/056; `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14.
- `DESIGN_SYSTEM_AUNEA` v1.0; `TOKENS_AUNEA` v1.0; `CATALOGO_COMPONENTES_AUNEA` v1.0.
- Contrato F1/F2 — https://docs.google.com/document/d/1KOXX5zH7EI7zvgNDTQdfqyEqpamHh5qxtKVrtchy6FM/edit
- Auditoría de color — https://docs.google.com/document/d/18BE1EH7BX6Sx3RdOn1fjPXaUFFgkKzOwVSfnP-_EmZ4/edit
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/

## 10. L1 — Primera migración técnica verificada (17/11/2026)

**Estado:** IMPLEMENTACIÓN PARCIAL / REVIEW. No es certificación global ni promoción CANONICAL. Este apartado prevalece sobre la fila L1 original del plan del §8, que se escribió antes de iniciar la implementación.

### 10.1 Arquitectura compartida, sin alterar la compatibilidad
- `AUNEA-FE-UI-SEMANTIC-475`, `core/state.js`: `auneaUiStructureStart/End()` genera la estructura semántica allowlisted de `section/subsection/block/group`. El renderer `auneaUiDatum()` representa valores read-only dentro de un `dl`, escapando etiqueta y valor. Todas las nuevas superficies tienen `data-aunea-ui-level` y permiten mantener las clases y referencias de cada pantalla. Rechaza niveles/variantes no definidos.
- `AUNEA-FE-UI-SEMANTIC-STYLE-476`, `styles.css`: `flow` y `surface` son variantes **explícitas**. `inherit` no tiene CSS: las pantallas migradas conservan geometría/computed style preexistente. No se han añadido reglas globales para `section`, `div`, `.card` ni selectores FROZEN.
- `section()` histórico y `pageTop()` siguen intactos para las páginas FROZEN. Los campos de negocio y su owner siguen siendo los canónicos; no hay un segundo motor de formularios ni nuevos datos.

### 10.2 Primeros consumidores reales
- **PG12 (Comparación):** las tres secciones principales, el detalle seleccionado como subsección, el detalle de actividad como bloque y seis datos de comparación consumen las funciones semánticas comunes. Se mantienen los mismos IDs, clases de página, encabezados, fuentes, acciones y flujo AS-IS→TO-BE.
- **PG11 (revisión AS-IS en 03.1):** dos grupos `Actividad actual` y `Duraciones declaradas` consumen `auneaUiStructureStart/End('group')`. Se conservan ocho datos y dos valores declarados de `0 min`. Se trata exclusivamente de presentación de un snapshot confirmado, sin editor duplicado.

### 10.3 QA efectuada
- Compilación V8 de los seis JS modificados y pruebas (sintaxis): PASS.
- PG12: se ejecutó el **harness sintético real** con funciones/owner compartidos sobre las versiones anterior y actual. El HTML normalizado (descontando exclusivamente atributos/clases semánticas nuevas) fue **idéntico carácter a carácter**: 9381 caracteres. Conteos finales: tres secciones, una subsección, un bloque y seis datos.
- PG11: renderización anterior y actual del fixture de AS-IS. HTML idéntico tras eliminar solamente la marca semántica nueva; dos grupos, ocho datos, dos valores `0 min`.
- `core/state.js` y `styles.css` vigentes, retirando el nuevo bloque opt-in, son **idénticos byte a byte** al baseline previo de la rama; `ui-system.css` no se modificó.
- Test `AUNEA-UAT-UI-SEMANTIC-477` creado y registrado; los harnesses de `pg11-guided-inline.test.cjs` y `pg12-overlay.test.cjs` cargan ahora el owner real. **No se acredita todavía ejecución completa del `npm test`, CI/Chromium ni snapshots FROZEN después de estos commits.**

### 10.4 Próximo tramo necesario para cerrar L1
- Extender el renderer a los consumidores estructuralmente equivalentes de PG10, PG11, PG12 y Proyectos tras inspeccionar sus tests; no reemplazar `section()` sobre FROZEN.
- Evitar paneles anidados sin función, evaluar casos de inspector/contexto y concretar los grupos/formularios compatibles con `Control_UI` canónico.
- Ejecutar todos los tests Node, backend, Chromium, Edge/Windows y snapshots FROZEN 18/18; revisar visualmente desktop/móvil. Solo entonces podría proponerse L1 técnicamente cerrado; aceptación humana F6 permanece separada.

**Registro único de familias/consumidores:** `docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json`.  
**Trazabilidad de código:** `CODE_BLOCK_INDEX.md` con Block_ID 475/476/477.

## 11. L1 — Corrección de QA de inventario y referencias DS (17/11/2026)

La primera ejecución del Acceptance Gate posterior al contrato no fue satisfactoria: backend PASS, frontend FAIL y Chromium FAIL. No se declara el gate cerrado.

**Defectos localizados y corregidos:**
- Quince familias del registro UI/UX tenían una segunda referencia DS abreviada (`DS-001, 002` en lugar de `DS-001, DS-002`). Registro JSON, contrato técnico y documento humano normalizados. Las 40 familias conservan los mismos nombres, estados y fuentes; `subsection/block/group` ahora apuntan al propietario ejecutable `core/state.js`.
- `AUNEA-FE-PG12-GRAPH-STYLE-236`, `ui-system.css`: dos reglas que usaban la clase global `.aunea-ui-work-surface` se acotaron a `.pg12-workspace > .pg12-primary` y `.pg12-workspace > .pg12-secondary`. La especificidad y los valores `min-width:0` y `padding:14px` en móvil se preservan en los tres paneles directos de PG12. El aspecto genérico `.aunea-ui-work-surface` pertenece únicamente a `styles.css`; no se modifica esa clase global.

**Nueva comprobación de inventario generada:** 107 clases compartidas entre ambos CSS (límite 107), 138 grupos repetidos (límite 146), 30 atributos inline (límite 35), 0 clases sin owner, 0 grupos sin clasificar y 9 FROZEN protegidas. Este resultado estático PASS no acredita por sí solo las capturas ni la aceptación visual.

**Pruebas dirigidas V8 ejecutadas:** 15/15 comprobaciones del contrato cromático, 6/6 del contrato maestro, 6/6 de estructura semántica L1 y 7/7 del harness PG12; validación independiente de la renderización PG11 y de la paridad HTML PG12 respecto al baseline. Se mantiene pendiente el **nuevo** Acceptance Gate remoto completo y sus logs para declarar QA integral.

Estas correcciones no modifican reglas de negocio, datos, esquemas, AS-IS/TO-BE ni la apariencia protegida FROZEN. L1 permanece **PARCIAL / REVIEW**, no `CANONICAL` ni `PRODUCTION`.

## 12. L1 — CIERRE TÉCNICO VERIFICADO / REVIEW (17/11/2026)

**Resultado técnico:** L1 **CLOSED_TECHNICAL_REVIEW**. Este apartado sustituye el estado "L1 parcial" de los §§8–11; aquellos apartados permanecen como historial de ejecución y correcciones. **No** representa aprobación visual del propietario, `main`, `CANONICAL` del sistema maestro ni `PRODUCTION`.

### Alcance implementado
- `core/state.js` `AUNEA-FE-UI-SEMANTIC-475`: estructura única opt-in para sección, subsección, bloque, grupo y campo; filas de dato solo lectura; variante `auneaUiLegacySection()` que reutiliza el HTML existente de `section()` y agrega una marca semántica en páginas no FROZEN, sin duplicar renderer. El `section()` histórico no se alteró.
- `styles.css` `AUNEA-FE-UI-SEMANTIC-STYLE-476`: superficies y flujos opt-in; la presentación heredada permanece intacta salvo opt-in explícito. La clase global `.aunea-ui-work-surface` pertenece a `styles.css` y los overrides PG12 se limitan a `.pg12-primary/.pg12-secondary`.
- **PG10 + revisión de resultados**: 8 secciones con el adaptador compartido.
- **PG11**: 4 secciones auxiliares/fallback con el mismo adaptador; 2 grupos de hechos AS-IS en 03.1, con ocho datos originales y conservación explícita de valores cero. Las demás secciones nativas ya mantienen estructura semántica `<section>` y patrones globales `aunea-ui-work-stage/work-surface`, sin recableado innecesario.
- **PG12**: 3 secciones, 1 subsección, 1 bloque y 6 filas de dato; comparación sobre un único mapa AS-IS versionado con capa TO-BE. No altera cálculos ni versiones históricas.
- **Proyectos + implementación**: 2 secciones y 1 campo opt-in; acciones, validaciones y datos continúan bajo sus propietarios canónicos.
- Los tests obsoletos que exigían dos mapas PG12 fueron alineados al mapa único vigente. El lector de tests PG11 incorpora el helper compartido real, no mocks de producción. Los IDs del antiguo PG12 dual-map 234/235 están ARCHIVED y los activos 469/470/471 figuran correctamente en manifest/index.
- No se han creado nuevas preguntas, precios, variables económicas, reglas de negocio, engines, confirmaciones, ni campos de dominio.

### Pruebas ejecutadas con resultados de GitHub Actions

| Control | Resultado | Evidencia |
|---|---|---|
| Suite frontend Node | **PASS 1006/1006**, fallos 0 | [Frontend](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900901) |
| Backend pytest | **PASS 493** | [Acceptance Gate](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900865) |
| Chromium UAT E2E | **PASS**, incluye PG12 single-map, selección/rutas y persistencia | [Acceptance Gate](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900865) |
| PG11 Chromium con backend, sintéticos factura/logística | **PASS**, PG09/PG10→PG11, validación, previsualización, confirmación, undo, reload, AS-IS inmutable | [Acceptance Gate](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900865) |
| FROZEN técnica | **PASS 18/18** capturas contra referencia fija | [Acceptance Gate](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900865) |
| Windows Edge | **PASS** | [Edge](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900902) |
| Design System Inventory | **PASS**, 107 clases cross-CSS, 138 contextos repetidos, 30 inline, conflictos sin clasificar 0 | [Inventario](https://github.com/PedroCMillan5/AUNEA/actions/runs/44066900966) |

El artefacto `docs/audit/AUNEA_INTERNAL_ACCEPTANCE_GATE.json` confirma `overall: PASS` para el head `14a40a2946ccacfc6b427478f6ddaa750ec6f7e7`. Los commits posteriores son documentales y deben conservar este alcance de pruebas sin presentarlos como una ejecución posterior de CI.

### Límites del cierre
**Sigue pendiente F6**, aceptación manual del propietario del diseño/experiencia en Windows y comprobación visual transversal final, además de L2–L5 (controles, interacciones, datos, accesibilidad de todos los estados y unificación cromática). La referencia oficial de identidad y las nueve pantallas FROZEN no se rediseñan desde este lote. No se hace merge a `main`.

**Registro verificable:** `docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json` (estado L1 `CLOSED_TECHNICAL_REVIEW`).  
**Siguiente lote:** L2 según contrato, sin reabrir L1 salvo regresión acreditada.

## 13. L2 — CIERRE TÉCNICO DE CONTROLES, ACCIONES Y ESTADOS (17/11/2026)

**Estado vigente: CLOSED_TECHNICAL_REVIEW.** Los estados «L2 parcial» del contrato inicial son históricos, sustituidos por este cierre. No implica que todas las páginas de Internal hayan sido rediseñadas ni la aprobación visual manual F6.

### 13.1 Componentes únicos y comportamiento aprobado

| Familia L2 | Propietario actual | Contrato y consumidores migrados |
|---|---|---|
| Select | `ui/renderer.js` `auneaSelectControl()` + opt-in `auneaUiNamedSelect()` | Mismo input oculto y catálogo, sin segunda captura; ARIA name en summary. PG11 transformación, tipo de actividad nueva, inicio del flujo y rutas; Proyectos campo de medición real. |
| Disclosure | `ui/renderer.js` `auneaUiDisclosureStart/End()` | Variantes `stage`, `group`, `inline` y `legacy`, preservando estructura/estado, sin accordion nuevo. PG11 ya utiliza las variantes principales; PG12 reutiliza el owner en dos detalles read-only (conteos y cambios). |
| Mode buttons | `ui/renderer.js` `auneaUiModeButton()` | Una plantilla de botón y `aria-pressed` para modos `guided/map` (PG11) y `actual/proposed/comparison` (PG12). Atributos de eventos validados; cada página mantiene su estado de presentación. |
| Acciones IA | `ui/renderer.js` `auneaUiFieldDecisionButton()` | PG11 03.3 mantiene los mismos handlers; `Mantener` activo utiliza `aria-pressed`; Aplicar y Editar son comandos, no falsos botones de alternancia. No se modifica la decisión humana, el AS-IS ni las transacciones. |
| Diálogo | `core/state.js` `auneaUiOpenModal()/auneaUiCloseModal()` | Adaptador **opt-in** del `openModal()` vigente, sin reemplazar el modal FROZEN. Proyectos: Registrar ejecución real y Registrar resultado medido; `role=dialog`, `aria-modal`, título nombrado, foco inicial en campo, contención Tab, retorno del foco, Escape seguro, cambios sin guardar protegidos y prevención de envíos simultáneos. Los validadores son los originales del Project. |
| Feedback | `ui/renderer.js` `auneaUiFeedbackMessage()` | Avisos PG12 de origen/mapa no disponible con `role=status` y `aria-live=polite`; tono restringido a `info/warn/good` existente, sin inventar color. `auneaNoticeMessage()` sigue gobernando los avisos generales. |

**Block_ID:** `AUNEA-FE-UI-CHOICES-L2-478`, `AUNEA-FE-UI-DIALOG-L2-479`, `AUNEA-UAT-UI-CONTROLS-L2-480`. Registrados en `CODE_BLOCK_INDEX.md`. No hay nuevos archivos de CSS ni cambios de nombres de clase/variables de negocio. Se preservan los selectores de eventos preexistentes.

### 13.2 Evidencia de prueba y regresión

| Gate ejecutado | Resultado | GitHub Actions |
|---|---|---|
| Frontend Node, incluido nuevo test L2 | **PASS 1.014/1.014; 0 fallos** | https://github.com/PedroCMillan5/AUNEA/actions/runs/44070230759 |
| Backend pytest | **PASS 493** | https://github.com/PedroCMillan5/AUNEA/actions/runs/44070230620 |
| Chromium E2E completo | **PASS**: PG11/PG12 versiones, selección, rutas, confirmación/undo/reload; nuevo `L2_ACCESSIBLE_DIALOG_BROWSER_PASS` verifica ARIA, foco, Escape limpio, cambios sin guardar y Cancelar | https://github.com/PedroCMillan5/AUNEA/actions/runs/44070230620 |
| FROZEN técnica | **PASS 18/18** capturas frente a referencia fija; no equivale a aprobación visual humana | https://github.com/PedroCMillan5/AUNEA/actions/runs/44070230620 |
| Windows Edge | **PASS** | https://github.com/PedroCMillan5/AUNEA/actions/runs/44070230768 |
| Inventario/ownership CSS | **PASS**: 107 clases cross-file, 138 contextos, 30 inline, cero conflictos sin clasificar | https://github.com/PedroCMillan5/AUNEA/actions/runs/44070230495 |

**Acceptance Gate: `overall=PASS`**, `backend_pytest=success`, `frontend_node=success`, `chromium_ua=success` para el commit de runtime probado `ee610cc765225c7350ccf1a80fa537ab16ad8957`. El análisis de QA detectó y corrigió un defecto real de foco inicial del modal, más los lectores de test aislados que no cargaban el nuevo propietario; las correcciones preceden a este gate verde.

### 13.3 Límites explícitos de L2
- Las nueve pantallas **FROZEN** conservan `section()`, `openModal()/closeModal()`, renderer Diagnostic Master, selectores y estilos originales. Las excepciones de detalles nativos de evidencia en PG10/PG11 no se convierten forzosamente a tarjetas nuevas; se mantienen `<details>` cuando su semántica y owner ya son correctos.
- No hay nuevas reglas, flujos, decisiones de IA, campos DF, precios ni persistencias paralelas; las pruebas usan casos sintéticos sin Ollama.
- **F6 sigue pendiente:** aprobación manual del propietario de la experiencia visual y pruebas reales de todos los controles/estados de Windows. L3 (datos, filtros, tablas, inspectores y diagramas), L4 (color/accesibilidad transversal) y L5 (UAT total) siguen en ROADMAP.
- No se modifica `main`, no se declara `PRODUCTION` ni se altera la identidad corporativa CANONICAL.

**Registro estructurado vivo:** `docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json` v0.2.0, `l2.status=CLOSED_TECHNICAL_REVIEW`. La ejecución integral para el código usado en este cierre quedó en PASS; los commits posteriores que solo actualizan documentación requieren validar que no alteran el runtime.
