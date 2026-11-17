# AUNEA Internal — Contrato maestro de UI/UX y matriz de unificación

**Versión:** v0.1 · **Estado:** REVIEW · **Fecha:** 17/11/2026  
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
| `shell` | Carcasa de aplicación | DS-001, 002 | `ui/shell.js` | EXISTING |
| `page` | Página/cabecera | DS-002 | `core/state.js` | EXISTING |
| `workspace` | Área de trabajo | DS-004 | `core/state.js` | EXISTING |
| `section` | Sección funcional | DS-002, 004 | `core/state.js` | EXISTING |
| `subsection` | Subsección | DS-002, 003 | `styles.css` | REVIEW |
| `block` | Bloque operativo | DS-004 | `styles.css` | REVIEW |
| `group` | Grupo de campos/datos | DS-003, 020 | `ui/renderer.js` | REVIEW |
| `card` | Tarjeta/superficie | DS-004 | `styles.css` | EXISTING |
| `field` | Campo editable | DS-020 | `ui/renderer.js` | EXISTING |
| `datum` | Dato/valor | DS-003 | `core/state.js` | EXISTING |
| `button` | Botón/acción | DS-017 | `styles.css` | EXISTING |
| `select` | Selector simple | DS-020 | `ui/renderer.js` | EXISTING |
| `multiselect` | Selector múltiple | DS-020 | `ui/renderer.js` | REVIEW |
| `disclosure` | Desplegable/acordeón | DS-002, 004 | `ui/renderer.js` | EXISTING |
| `modal` | Modal/diálogo | DS-004, 017 | `core/state.js` | EXISTING |
| `context-menu` | Menú contextual | DS-017 | `styles.css` | REVIEW |
| `tabs` | Pestañas | DS-002 | `styles.css` | EXISTING |
| `navigation` | Navegación/etapas | DS-012, 013 | `core/state.js` | EXISTING |
| `search-filter` | Búsqueda/filtros | DS-008, 020 | `styles.css` | REVIEW |
| `table` | Tabla de datos | DS-008 | `styles.css` | EXISTING |
| `pagination` | Paginación | DS-008 | `styles.css` | REVIEW |
| `status-chip` | Estado/etiqueta | DS-019 | `core/state.js` | EXISTING |
| `notice` | Aviso contextual | DS-006, 007 | `ui/renderer.js` | EXISTING |
| `toast` | Notificación transitoria | DS-006 | `core/state.js` | EXISTING |
| `empty-state` | Estado sin datos | DS-003, 004 | `ui/renderer.js` | EXISTING |
| `loading-state` | Carga/progreso | DS-019 | `styles.css` | REVIEW |
| `inspector` | Inspector contextual | DS-004 | `core/state.js` | EXISTING |
| `action-bar` | Barra de acciones | DS-017 | `core/state.js` | EXISTING |
| `process-map` | Mapa de proceso | DS-012, 014 | `domain/process.js` | EXISTING |
| `risk-warning` | Riesgos y alertas | DS-007 | `styles.css` | EXISTING |
| `kpi` | Indicador | DS-005 | `styles.css` | EXISTING |
| `comparison` | Comparación de escenarios | DS-010, 011 | `pages/comparison.js` | REVIEW |
| `roadmap` | Cronología/etapas | DS-013 | `styles.css` | REVIEW |
| `diagram` | Diagrama | DS-014 | `domain/process.js` | REVIEW |
| `provenance` | Fuente y trazabilidad | DS-018, 019 | `core/state.js` | EXISTING |
| `tooltip-help` | Ayuda contextual | DS-003, 020 | `styles.css` | REVIEW |
| `responsive` | Adaptación responsive | DS-020 | `ui-system.css` | REVIEW |
| `keyboard-focus` | Foco y teclado | DS-020 | `styles.css` | REVIEW |
| `motion` | Movimiento/transiciones | DS-020 | `styles.css` | REVIEW |
| `feedback-confirm` | Confirmación/errores de acción | DS-006, 017 | `core/state.js` | REVIEW |

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
