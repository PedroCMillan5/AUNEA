# AUNEA Internal — Auditoría del sistema visual compartido

**Estado:** REVIEW — auditoría de código y normalización inicial realizadas; aceptación visual nativa pendiente.  
**Fecha:** 2026-11-07  
**Rama:** `work/as-is-ux-simplification-20260930`  
**Alcance:** software activo en `3_SYSTEM/frontend`, desde CRM y PG01 hasta PG11; no modifica PG12+ ni artefactos históricos.  
**Gobierno:** `00_AUNEA_INTERNAL_MASTER_INDEX`, `PROJECT_RULES.md`, `DECISIONES_AUNEA` (DEC-027, DEC-056), `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14, `DESIGN_SYSTEM_AUNEA`, `TOKENS_AUNEA` y `CATALOGO_COMPONENTES_AUNEA`.

## 1. Arquitectura constatada (fuente única por responsabilidad)

| Archivo | Owner | Regla |
|---|---|---|
| `styles.css` | Tokens globales y primitivas visuales reutilizables: tipografía Sora/Inter, colores, espacios, bordes, botones `.btn`, `.btn-primary`, `.btn-outline`, `.btn-small` | **Único CSS base de componentes**. No copiar su apariencia en otras pantallas |
| `ui-system.css` | Composición del App Shell, estructura de páginas, layouts por modo, geometría del mapa, responsive, estados específicos | Puede ajustar **distribución y estados**, no redefinir fuentes/tamaños/colores de botones genéricos |
| `index.html` | Orden de hojas: primero `styles.css`, después `ui-system.css` | Una carga de cada hoja; no CSS inline global |
| `pages/*.js`, `ui/*.js`, `domain/*.js` | Markup, reglas/estados y composición semántica | Usar componentes existentes; no crear estilos aislados en cada botón |
| `tests/design-system-common.test.cjs` | Contract tests de CSS común | Evitar regresiones de propiedad, tokens y PG11 |
| `FROZEN_PAGES.json` y `tests/frozen/` | Baselines aprobadas | No modificar sin autorización y UAT de reapertura |

No se introduce una segunda definición de tokens ni otro sistema de componentes. Los ajustes nuevos son **opt-in**, sin selector global sobre pantallas congeladas.

## 2. Cobertura de inventario

Se han inspeccionado los archivos ejecutables de `pages` (8), `domain` (18), `ui` (3), `core` (2) y `services` (4): **35 módulos JS**, además de ambas hojas CSS, manifiesto, entrada HTML y registros FROZEN.

| Área | Situación del CSS | Clasificación |
|---|---|---|
| Shell / navegación | Controles propios de navegación y barra; reutilización de tokens compartidos, con excepciones de composición | Revisado en código; mantener baseline |
| CRM: inicio, empresas, contactos, interacciones y oportunidades | Varios `button` sin `.btn` son opciones de selectores custom o menús, no CTA estándar | FROZEN; no cambiar apariencia |
| CRM: estudios y proyectos | Acciones sobre clases `.btn`; estados y navegación específicos | Revisado; estudios FROZEN |
| PG01–PG09 / diagnóstico 90 min | UI del renderer compartido, segmentos, ayudas y controles de entrada; algunas excepciones de captura | Las pantallas FROZEN requieren reapertura para cambios visuales |
| PG10 / AS-IS | Mapa, inspector, grafo y controles semánticos de proceso; ciertos estilos dinámicos de posición/tamaño justificables | Revisado en código; UAT visual pendiente |
| PG11 / TO-BE | Encabezados de sección no homogéneos, botones de acción con tipografía/espaciado repetidos, auditoría técnica como etapa numerada | **Primer lote corregido**; UAT visual pendiente |
| Session Display | Canvas de lectura, layout y variables dinámicas de grafo | Mantener separación visual; no aplicar aspecto de formulario a nodos |
| Ayudas, selectores y chips | Son controles funcionales, no botones genéricos | Conservar semántica y accesibilidad |

**Excepción importante:** los botones `role="option"`, iconos de ayuda, menús flotantes, navegación lateral, segmentos y nodos de grafo pueden tener estilo especializado. No deben llevar `.btn` indiscriminadamente. Las modificaciones de `top`/`left` de menús, `--graph-cols` y parámetros de la visualización son estilos calculados, no necesariamente deuda de diseño.

## 3. Deuda técnica detectada

Recuento preliminar de inspección estática, no equivalente a errores de usuario:

- `ui-system.css`: cerca de **250 KB**, ~80 bloques etiquetados y **105 referencias a `!important`**. Requieren clasificación por motivo y riesgo antes de retirarlas.
- Apariciones repetidas de selectores, especialmente PG11, topbar, responsive y vistas de diagnóstico. La repetición entre media queries es ocasionalmente necesaria; no borrar reglas por coincidencia literal.
- Numerosos tamaños en px y estilos inline repartidos por páginas y domain; algunos son cosméticos, otros son necesarios para render dinámico. Hay que separar ambos tipos antes de migrar.
- Mezcla de `h2`, `h3` y `strong` como encabezados, en ocasiones con tamaños locales. Esto debe convertirse progresivamente en **roles visuales compartidos**, sin alterar estructura semántica funcional.
- Variantes `btn` genéricas correctas en `styles.css`, pero varias pantallas acumulan CSS de apariencia sobre `.btn` por clase local. Necesitan limpieza dirigida y QA por pantalla.

No se considera correcto sustituir las dos hojas por una de golpe: el riesgo sobre pantallas FROZEN es alto y el frontend depende de una cascada ya existente.

## 4. Normalización implementada en este lote

**Bloque `AUNEA-FE-SHARED-COMPONENTS-311` — `styles.css`**

Primitivas opt-in: `.aunea-ui-section-title`, `.aunea-ui-section-caption`, `.aunea-ui-aux-heading`, `.aunea-ui-button-row`. Consumen tokens canónicos y proporcionan las reglas de aspecto/alineación para futuras páginas. No modifican `:root` ni el aspecto global de pantallas FROZEN.

**PG11 — `pages/results.js` y `ui-system.css`**

- Encabezados 01, 02 y 04 consumen el mismo primitivo compartido; se retiran las modificaciones locales que impedían su aplicación.
- Auditoría IA se mantiene accesible en su desplegable con el mismo `id` y montura, pero como **detalle técnico no numerado**, no como una etapa principal. Validación global pasa a **04**.
- `Aplicar IA`, `Mantener` y `Editar` conservan sus eventos y `.btn btn-outline btn-small`, pero ahora usan `.aunea-ui-button-row` para centrado y línea única. Se eliminan tres reglas de apariencia de botones solapadas y se mantiene el layout contextual.
- Se retiran cuatro márgenes inline de botones de navegación dentro del inspector. Ninguna ruta ni decisión humana cambia.

**Bloque `AUNEA-UAT-DESIGN-COMMON-312` — pruebas nuevas**

Verifica orden y unicidad de CSS, tokens/variantes, opt-in de componentes nuevos, numeración de PG11, botón compartido y conservación de IDs/acciones. Coexiste con pruebas `FROZEN` anteriores, `style-tokens.test.cjs` y pruebas funcionales PG11.

## 5. Gates de aceptación

| Gate | Estado |
|---|---|
| Lectura de fuentes canónicas y decisiones vigentes | Hecho |
| Inventario estático de módulos y propietarios CSS | Hecho |
| Primitivas comunes definidas y conectadas en PG11 | Implementado |
| Eliminación de reglas de apariencia duplicadas **identificadas en PG11** | Implementado |
| Proteger interfaces FROZEN sin cambio implícito | Por diseño; requiere ejecutar suites FROZEN |
| Ejecutar `npm test` completo en CI Linux | **PASS** — AUNEA Frontend Tests, run 42409158408 |
| Acceptance Gate automatizado (frontend, backend y Chromium) | **PASS** — run 42409158446 |
| UAT visual manual Windows/Chrome/Edge, desktop/tablet/móvil | **Pendiente** |
| Reducir globalmente el resto de excepciones históricas `ui-system.css` | **Pendiente de clasificación y pruebas** |
| Validación usuario del sistema visual consolidado | Pendiente |

**Comando de QA:** desde `3_SYSTEM/frontend`, ejecutar `npm ci` y `npm test`; después comprobar las páginas CRM y PG01–PG11 en Chrome/Edge con los datos existentes.

## 6. Política permanente para cambios de UI

1. Identificar si el elemento corresponde a DS-002 (encabezado), DS-003 (texto), DS-004 (card), DS-017 (acción), DS-019 (estado) o DS-020 (control).
2. Utilizar la clase compartida `styles.css`; añadir solo layout contextual en `ui-system.css`.
3. No crear nuevos `font-size`, `padding`, `border-radius`, `background` para un `.btn` ya cubierto por el sistema.
4. Usar `--font-*`, `--space-*` y colores funcionales; no repetir hexadecimales en los componentes.
5. No modificar páginas FROZEN sin autorización expresa de reapertura, nuevas capturas y aceptación.
6. Mantener semántica HTML y estados de accesibilidad; controles especiales no son botones CTA.
7. Ejecutar pruebas CSS y funcionales antes de cerrar una pantalla. Código actualizado ≠ pantalla validada.
8. Mantener excepciones justificadas en este registro y retirar reglas antiguas **solo** con evidencia de que ya no se consumen.

**Estado final:** consolidación estructural parcial aplicada con trazabilidad. CI frontend y Acceptance Gate automatizado pasan en el commit `f4a395c473`; queda la UAT visual manual y la limpieza dirigida de excepciones. No marcar sistema visual completo como `PRODUCTION` hasta cerrar ambas.


## 7. PG01 — revisión dirigida, 07/11/2026

Petición del propietario: «Asegura la primera pg01». Alcance autorizado: estilos de Contexto y objetivo y corrección de su distribución; sin rediseñar el flujo ni los datos.

- El encabezado del bloque de objetivos reutiliza `.section-title` y un `h2` asociado a la sección. Se elimina su tipografía local; conserva 22 px mediante `--font-h3`.
- La superficie plana pasa al componente opt-in `.aunea-ui-form-section` en `styles.css`. Se elimina una declaración PG01 anterior sobrescrita; `ui-system.css` conserva únicamente su geometría.
- Botones, campos, ayudas, segmentos y selectores siguen usando sus componentes existentes. No se crea CSS por botón ni se modifican los handlers.
- A 1180 px o menos, el inspector pasa debajo de la captura para no comprimir campos. En móvil, acciones y menú permanecen accesibles. Todos los ajustes están limitados al marcador S01.
- El snapshot PG01 cambia únicamente en la línea de markup del encabezado y la clase compartida. El resto de snapshots FROZEN permanece intacto; no se presume una nueva aceptación visual del propietario.

| Comprobación | Evidencia |
|---|---|
| Frontend completo | 862/862 PASS; baseline anterior 861/861 PASS |
| Estilos efectivos | Chromium: título 22 px, botón 14 px/radio 8 px; tamaños 1440, 1024 y 390 px |
| Captura usable | Campos de empresa ≥250 px; sin desbordamiento horizontal; inspector posterior en tablet/móvil |
| Menú móvil | Apertura y cierre reales tras completar transición |
| Persistencia PG01 | Editar contexto → Guardar borrador → recargar → recuperar valor |
| Reglas de avance | DF008/DF009 inválidos bloquean Continuar/rail; criterios opcionales vacíos permiten avance |
| Integración | Suite Chromium completa existente, con PG01 añadido; sin Ollama real |

Limitación tipográfica heredada: el CSS declara Sora/Inter y sus fallbacks; este cambio no añade ni distribuye fuentes. Las mediciones de font-family prueban la declaración CSS, no que la fuente esté instalada en Windows. La inspección visual local se ha realizado con Chromium 133; CI usa la versión fijada por el repositorio. UAT visual del propietario en Windows pendiente. Esta revisión no certifica el resto del sistema visual ni el motor IA.

No cambia ninguna regla de negocio, roadmap o versión de producto. El hito se registra en BITACORA y el Master Index enlaza esta revisión. Las versiones anteriores de código y snapshot quedan preservadas en Git.


## 8. PG11 — homogeneización visual de Información general y Análisis IA, 10/11/2026

Alcance de la corrección: exclusivamente sección 01 de PG11 y la definición compartida de superficie con sección 02, sin cambios funcionales ni reescritura de datos.

- El fondo completo verde de Información general se sustituye por la misma tarjeta blanca, borde, radio, padding y espaciado que utiliza Análisis IA global. Una sola regla CSS `.tobe-context,.tobe-global-analysis` es propietaria del contenedor común.
- Cabecera 01 usa la misma jerarquía de encabezado y descripción que 02, con primitivas `.tobe-eyebrow`, `.aunea-ui-section-title` y `.aunea-ui-section-caption`; estado del TO-BE visible sin afectar su ciclo de vida.
- La franja de «Diagnóstico oficial» reutiliza la composición visual de síntesis verde de la sección 02. Las fichas mantienen datos confirmados en lectura y la misma escala tipográfica de tokens.
- El modo de revisión guiada usa grid coherente; tablet y móvil comparten densidad, padding y tarjetas responsive. Se conserva el desplegable de restricciones y el resolvedor DF016 del snapshot.
- No se modifican CSS base de botones, tokens globales, otros módulos, motores IA, snapshot AS-IS, DF001–DF100 ni páginas FROZEN.
- QA estático de contrato aplicado al código actualizado: 9/9 comprobaciones de estructura, jerarquía y reglas CSS PASS; se actualizó `pg11-global-overview.test.cjs` para impedir regresiones visuales entre 01/02. La suite Node/CI completa y aceptación visual real Windows (1440/1024/390 px, abierto/cerrado y recarga) siguen **PENDIENTES**, por lo que no se promueve PG11 a FROZEN/PRODUCTION.

## 9. PG11 — revisión de la sección 02, 10/11/2026 (REVIEW)

- Se conserva el diseño aprobado en la revisión visual del consultor: tarjetas de una columna, contenido resumido, navegación a actividades visible y detalles de evidencia bajo demanda. No se reconstruye el diseño System ni se crean campos de negocio.
- El backend identifica posible carga manual adicional como verificación operativa pendiente, no como prohibición ni beneficio cuantificado. Se conserva el estado CONDITIONED/INCOMPATIBLE y se muestra en las tarjetas compactas.
- La proyección de calidad deja de depender de nombres de sectores; detecta solapamientos y posibles contradicciones sin fusionar, descartar o aprobar intervenciones. La cifra visible es «intervenciones registradas», nunca «distintas» en ausencia de acreditación semántica.
- Los resultados anteriores a la nueva evaluación se muestran «sin evaluación operativa registrada» en lugar de falso 0. La recuperación global verifica su checkpoint local tras cada guardado y exige confirmación al sustituir una propuesta existente.
- Regresión frontend de los dos archivos específicos (pg11-global-quality.test.cjs y pg11-global-overview.test.cjs): 49/49 casos PASS ejecutados en harness JS aislado contra el código actualizado; NO equivale a `npm test`/CI GitHub ni UAT real Windows con Ollama. GitHub Actions para el último commit: sin runs asociados disponibles. Sección 02 sigue REVIEW hasta pruebas reales de backend/Ollama y aceptación de persistencia con recarga/cancelación.
- Pendiente de comprobar en una ejecución nueva de Ollama: calidad de las propuestas, fuente/cita correcta, duplicidad semántica, volumen variable, cumplimiento de restricciones y eficacia de alternativas, además de errores HTTP 409/503, OOM, corte de salida y guardado. Persistencia actual: checkpoint `localStorage`, no AUNEA Operations duradero.


## 10. PG11 — etiquetas legibles y recomendaciones revisables, 10/11/2026 (REVIEW)

- Se mantiene la geometría, tarjetas, componentes y CSS existente de la sección 02. No se retoca la composición visual aprobada.
- Las restricciones que el consultor ve provienen de `snapshot.answers` y de las etiquetas/opciones del Diagnostic Master v1.2 CANONICAL, o del significado fuente-confirmado incluido en el resultado de revisión backend. No se presenta el texto arbitrario de la IA como si fuese una declaración validada del cliente.
- Las comprobaciones, condiciones y evidencias originales se preservan. Las preguntas generales de implantación se despliegan bajo demanda y los códigos/Field_ID internos sólo aparecen en un segundo desplegable explícito de auditoría técnica. El consultor ve antes la condición explicada y la evidencia original.
- La agrupación por finalidad sigue siendo no destructiva: dos intervenciones relacionadas se presentan como posibles alternativas o complementos a decidir, nunca como fusión aplicada. Se añaden avisos orientativos sobre formularios que puedan duplicar capturas, avisos sin procedencia de estado y registros intermedios con carga manual potencial, sin reglas específicas del sector ni aprobación automática.
- QA aislado de `pg11-global-overview.test.cjs` y `pg11-global-quality.test.cjs`: 53/53 PASS contra el contenido de la rama. Añadida regresión backend para los metadatos de etiquetas fuente-validada; la ejecución pytest no está acreditada. GitHub no resolvió vía red desde el entorno de pruebas, no se acredita CI remoto ni UAT Windows/Ollama. PG11 sigue REVIEW.
- No se modifican campos canónicos, owners, AS-IS confirmado, cálculos económicos, aprobaciones humanas, esquema de persistencia ni páginas FROZEN.


## 11. PG11 — retirada de códigos técnicos del informe del consultor, 10/11/2026 (REVIEW)

- La captura UAT detectó que «Ver texto y referencias técnicas originales» aún mostraba DF089, KEEP_EXISTING, RBAC, AUDIT_LOG, CAPACIDAD_TECNICA y repetía condiciones y verificaciones entre las dos intervenciones de un mismo grupo. La corrección previa no resolvía el problema.
- Se retira **del HTML de la sección 02** el bloque de auditoría técnica de cada intervención; el objeto versionado `aiGlobal.result` conserva intactos `constraints`, `review.reason`, `review.checks`, `review.verifications`, conflictos, fuentes y demás trazas. No se borra ni sobrescribe información original.
- Las condiciones confirmadas del AS-IS se proyectan **una sola vez** en un panel global desplegable. Se reutilizan el Diagnostic Master y las etiquetas canónicas, con equivalentes explicativos de presentación para «compliance», «ownership», «audit log», «RBAC» y preferencias técnicas. No se modifican opciones ni se introducen nuevos campos de negocio.
- En cada grupo, las comprobaciones verificables compartidas aparecen una sola vez; cada intervención muestra únicamente las comprobaciones adicionales pertinentes. Los controles generales tipo «Contrastar la condición declarada: unknown/compliance/etc.» dejan de aparecer como 19 tareas presuntamente específicas, aunque siguen disponibles internamente en el resultado IA.
- Se conservan las incompatibilidades realmente detectadas, los objetivos, razones, fuentes legibles y las alternativas. Ante una referencia sin descripción en el snapshot, no se filtra el identificador técnico al HTML; la referencia se conserva en el modelo.
- No se modifica CSS ni el diseño compacto de tarjetas aprobado. QA aislado de `pg11-global-overview.test.cjs` y `pg11-global-quality.test.cjs` sobre las fuentes de esta rama: **54/54 PASS**; no implica aceptación visual local, suite de CI integrada ni UAT real Ollama. PG11 sigue **REVIEW**.


## 12. PG11 — jerarquía de datos y UAT 07–10, 10/11/2026 (REVIEW)

- En la sección 02 se establece una jerarquía visual explícita: objetivo de mejora y número de propuestas; resultado buscado (hipótesis) y viabilidad; intervenciones comparadas sin selección automática; explicación y evidencia del snapshot AS-IS; comprobaciones de implantación desplegables y sin repetir requisitos generales por propuesta.
- Se conserva el CSS compartido System y el estilo de tarjetas aceptado. Nuevas clases locales `tobe-global-goal-*`, `tobe-global-option-*` y `tobe-global-brief-*` sólo para composición, con responsive.
- `UAT-02-07`: enlaces globales seleccionan la actividad del inspector existente, guardan campos antes de cambiar y navegan a sección 03; no aprueban ni aplican propuestas.
- `UAT-02-08`: comprobación aislada de serialización/hidratación del DRAFT del análisis, sin borrar las intervenciones. Queda pendiente recarga visual real en Windows.
- `UAT-02-09`: los tests de contrato y orquestación abarcan regeneración con confirmación, eliminación de texto obsoleto, reintento selectivo y estado parcial; falta inferencia real local.
- `UAT-02-10`: ante imposibilidad de verificar un checkpoint, el generador aborta inmediatamente en lugar de interpretar el fallo de guardado como una fuente de IA fallida. Se verifican rutas de cancelación/503 y que no se declara completo un resultado parcial. Las pruebas reales 409, OOM, vacío y pérdida de almacenamiento siguen pendientes de acreditación.
- El runner `3_SYSTEM/backend/scripts/pg11_block5_local_uat.ps1` ejecuta primero los tests frontend de PG11, después `pytest tests/test_internal_ai_global.py` y por último el gate sintético de inferencia Ollama en Windows.
- **QA aislado** ejecutado desde los ficheros de la rama actual en harness JS: `pg11-global-overview.test.cjs` y `pg11-global-quality.test.cjs`, **59/59 PASS**. No hay ejecución certificada de la suite Node integrada, CI, pytest, UAT real Windows ni Ollama desde el entorno GitHub; sección 02 y PG11 permanecen REVIEW. No se modifica el CANONICAL, las decisiones humanas ni el AS-IS.
