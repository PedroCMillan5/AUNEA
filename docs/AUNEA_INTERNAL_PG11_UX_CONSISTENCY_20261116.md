# AUNEA Internal — PG11 · Contrato único de secciones y grupos

**Fecha:** 16/11/2026
**Rama:** `work/as-is-ux-simplification-20260930`; estado REVIEW, no merge a `main`.
**Clasificación:** UI funcional y presentación; preservación del gobierno de datos y de reglas.
**Fuentes vigentes:** Master Index; PROJECT_RULES.md; Simulator CANONICAL v1.14; Architecture Contract CANONICAL v1.7; DEC-050, DEC-052, DEC-055, DEC-056, DEC-075.

## 1. Incidencia acreditada

La revisión de PG11 mostraba:
- 03.1 se iniciaba cerrada; 03.2 abierta; 03.3 era fija e imposible de cerrar.
- Los grupos 01, 02 y 04 utilizaban `section`; 03 y 05 utilizaban `details`, con fondos e iconos diferentes.
- La navegación 03.1/03.2 no abría 03.3 porque la cabecera carecía de `details`.
- El aviso «Análisis guardado no vigente» heredaba el mismo tono verde que secciones operativas normales.

Las diferencias procedían de estructuras HTML, reglas de apertura y CSS separadas; no se podían resolver solo reescribiendo colores.

## 2. Implementación

1. `pages/tobe.js`: nuevo helper `tobeDisclosureOpen(id,sourceId,defaultOpen)` en Block_ID `AUNEA-FE-PG11-DISCLOSURE-CONTRACT-421`. Los paneles conservan su estado `open` al redibujar la misma actividad. No escribe en negocio ni aprueba datos.
2. 03.1, 03.2 y 03.3 utilizan `details/summary` nativos, con estado inicial **abierto** común. Mantienen su contenido y fuente original.
3. Los grupos numerados 00 (actividad nueva), 01 (transformación), 02 (funcionamiento), 03 (recursos), 04 (impacto) y 05 (tiempo) utilizan `details/summary` y están **abiertos inicialmente** en la actividad seleccionada. Todos permiten plegarse y recuperar el estado tras render.
4. `pages/tobe-flow.js`: grupo 04 pasa al contrato de acordeón sin alterar integridad, rutas ni comprobaciones. Se preserva `tobeFlowInspector` como editor independiente y se corrigieron expresamente sus cierres HTML.
5. `pages/internal-work-events.js`: `data-tobe-jump` abre la sección de destino 03.1/03.2/03.3 antes del scroll, incluso si el consultor la había cerrado.
6. `ui-system.css`: Block_ID `AUNEA-FE-PG11-DISCLOSURE-UI-422`, un solo tratamiento visual scoped PG11 guided de cabeceras y flecha para abierto/cerrado, foco de teclado, padding y responsive. Fondo igual para grupos 00–05 independientemente de `open`. No representa la aceptación de una propuesta.
7. `pages/tobe-global.js`: el estado ya existente `notCurrent` del análisis global añade atributo visual `data-analysis-state="stale"`; CSS distingue el aviso del verde operativo. No cambia frescura, reanálisis ni persistencia.
8. `CODE_BLOCK_INDEX.md` registra 421/422.

## 3. QA final acreditada

- [Acceptance Gate 43831570990](https://github.com/PedroCMillan5/AUNEA/actions/runs/43831570990): **SUCCESS** en backend, frontend, Chromium browser UAT y publicación del estado. Fuente funcional final `e8797c2faf916ce964048a7c5fd4edee25bbc02f`.
- [Windows/Edge 43831570929](https://github.com/PedroCMillan5/AUNEA/actions/runs/43831570929): **SUCCESS** en PG11 con expediente invoice y logistics, backend real y casos sintéticos.
- [Shared UI Contract Gate 43831571124](https://github.com/PedroCMillan5/AUNEA/actions/runs/43831571124): **SUCCESS**.
- [Frontend Tests 43831570946](https://github.com/PedroCMillan5/AUNEA/actions/runs/43831570946): **SUCCESS**.
- El Browser UAT de PG11 verifica ahora que los cinco grupos 01–05 son `DETAILS`, tienen `SUMMARY`, comienzan abiertos, comparten el mismo fondo calculado y admiten cerrar y reabrir sin perder los controles. El recorrido principal sigue validando edición, rutas, persistencia, recarga, cancelación, confirmación y undo con AS-IS inmutable.
- Acceptance Gate mantiene comprobación técnica de 18/18 screenshots FROZEN; no se altera ninguna fuente FROZEN.
- La prueba antigua que esperaba 03.1 cerrada se actualizó para reflejar el mismo estado inicial abierto que 03.2/03.3. Se eliminó la instrumentación temporal de diagnóstico de DOM.

## 4. Límites explícitos

**Cierre técnico del lote de homogeneización PG11.** No es cierre funcional de PG11 ni de PG12–PG15, no es validación manual de la interfaz del propietario ni una certificación de homogeneidad de todas las páginas de AUNEA Internal. 01/02 mantienen cabeceras de sección de proceso; 03 tiene navegación de actividad. La diferencia de contenido es funcional y no se confunde con el componente acordeón de subsecciones 03.1–03.3.

No se cambian diagnóstico, reglas IA, cifras, modelos, snapshots, estado del consultor, decisiones ni APIs. No se promueven las páginas a PRODUCCIÓN ni se modifica `main`. Las decisiones vigentes se aplican, sin nueva decisión comercial o de arquitectura.

**Siguiente validación visual:** revisar manualmente la interfaz PG11 en Windows/Edge y su coherencia con las referencias aprobadas. El QA automatizado no sustituye esa aprobación.

## 5. Corrección adicional de geometría 03.2 / 03.3 · 16/11/2026

**Motivo:** la revisión del propietario mostró que, pese a pasar el gate anterior, 03.3 conservaba un margen lateral adicional, un segundo contenedor y una cabecera de dos líneas, frente al patrón visual existente de 03.2. Se reabre exclusivamente el alcance UX de PG11; no se cambia ninguna regla comercial.

**Cambios acreditados:**
- `pages/tobe.js`: cabecera 03.3 compacta, con título y estado. El texto de ayuda sale del `summary` y pasa al cuerpo, como en 03.2.
- `ui-system.css`: se retiran las reglas que añadían 16 px de margen a todo el contenedor `tobe-stage-disclosure` en lugar de solamente a su contenido. Se elimina la cuadrícula innecesaria en el contenedor exterior, se mantiene un solo borde externo y se alinean los encabezados de 03.2/03.3, los contenidos y el primer grupo 01.
- Igualación final del `line-height` (22,4 px en ambos títulos) y altura de cabecera (53 px), reduciendo exclusivamente el padding del estado `Borrador editable`. Los estados y propietarios de edición permanecen intactos.
- `tests/pg11-browser-journey.cjs`: nuevas aserciones basadas en medidas reales del navegador, con tolerancia de 1,5 px, para bordes externos, límites del resumen, margen de inicio del primer grupo y altura del encabezado; se ejecutan en Chromium y Windows/Microsoft Edge con los expedientes invoice y logistics.

**QA de la versión funcional corregida:**
- [Acceptance Gate 43833434075](https://github.com/PedroCMillan5/AUNEA/actions/runs/43833434075) **SUCCESS**: frontend, backend, Chromium/browser UAT y publicación.
- [Windows Edge 43833434185](https://github.com/PedroCMillan5/AUNEA/actions/runs/43833434185) **SUCCESS**.
- [Shared UI Contract Gate 43833434023](https://github.com/PedroCMillan5/AUNEA/actions/runs/43833434023) **SUCCESS**.
- Versión funcional: `6de632d56e1957204793f2a455d2312640793c45`.

**Dictamen:** corregida y probada técnicamente la diferencia concreta de cabecera y márgenes entre 03.2 y 03.3. **No se declara aceptación visual humana del propietario ni homogeneidad definitiva de toda AUNEA**, que son ámbitos distintos. La rama sigue en REVIEW y sin merge a main.

## 6. Rectificación del nivel superior 01–03 · 16/11/2026

La revisión del propietario evidenció otra divergencia que no cubría el test de 03.1–03.3: el desplegable final de 01 tenía un diseño diferente al de 02, y 03 arrancaba con cabecera, barra de navegación e inspector en tres tarjetas separadas. Se reabrió la composición completa de PG11.

Se implementó el mismo componente `auneaUiDisclosureStart` variante `inline` para los finales de 01/02; `aunea-ui-work-surface` envuelve ahora conjuntamente cabecera, navegación y contenido de 03; se eliminaron reglas individuales desplazadas a los propietarios globales. Se comprobó en captura Chromium la desaparición de la triple tarjeta. También se corrigió la regresión del mapa visible en modo guiado causada por un `display:grid` indebido.

Fuente e inventario de cambio: `docs/AUNEA_INTERNAL_GLOBAL_UI_UX_ARCHITECTURE_20261116.md`, apéndice 7. QA definitivo: Acceptance Gate 43847649180 SUCCESS, frontend 960 PASS, backend 493 PASS, Chromium 18 FROZEN PASS; Windows Edge 43847649367 SUCCESS. Estado REVIEW sin merge; pendiente aceptación visual del propietario y desarrollo funcional incompleto de AUNEA.
