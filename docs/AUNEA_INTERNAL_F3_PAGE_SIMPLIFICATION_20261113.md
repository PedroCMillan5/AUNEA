# AUNEA Internal — F3 · Simplificación de PG10 y PG11 por responsabilidades

**Fecha:** 13/11/2026  
**Rama:** `work/as-is-ux-simplification-20260930` (REVIEW, sin merge a main).  
**Estado:** F3 **CLOSED TÉCNICO** (13/11/2026), rama REVIEW; F6 aceptación visual/manual pendiente. Los apartados 1–5 conservan el registro del primer lote.  
**Contrato:** F0–F6 (Drive); `PROJECT_RULES.md`; Simulator CANONICAL PG10/PG11/PG12; DEC-050/052/055/056; FROZEN_PAGES v10.

## 1. Cambio implementado

Se separan responsabilidades existentes, **sin reescribir funciones, atributos, decisiones, eventos, reglas o datos**:

| Página original | Antes | Después | Módulo extraído | Líneas extraídas | Funciones |
| --- | ---: | ---: | --- | ---: | ---: |
| `pages/tobe.js` | 2.058 | 1.209 | `pages/tobe-flow.js` (overlay de rutas, integridad, proyección, inspector del mapa) | 401 | 18 |
| `pages/tobe.js` | — | — | `pages/tobe-review.js` (fuentes originales, comparación IA y composición de campos) | 452 | 9 |
| `pages/results.js` | 871 | 685 | `pages/results-analysis.js` (economics y riesgos de PG10, sólo lectura) | 188 | 2 |

La reducción de **1.035 líneas en los dos archivos originales** es un reparto en módulos de propietario acotado, **no 1.035 líneas eliminadas del producto**: el total combinado se conserva prácticamente igual. El runtime pasa de **46 a 49** módulos ordenados. Se preserva un mismo backend como propietario de resultados, precios, riesgos y cálculos.

## 2. Prueba de equivalencia del código

Las tres extracciones conservan sus bloques START/END y Block_ID (15 responsabilidades trasladadas). El `CODE_BLOCK_INDEX.md` apunta a sus nuevos propietarios.

La lectura de GitHub del estado previo (commit `4e3a2aa70a3567faab46a3f11cd623fd09adffe2`) y la recomposición del código modular actual mediante los tres marcadores de compatibilidad dieron **igualdad exacta carácter a carácter**:

- PG11 original `pages/tobe.js`: **139.407 caracteres originales = 139.407 reconstruidos**, sin primera diferencia. Git blob original: `9436c5bcfa920d6d7eab0d50f10603f051926de0`.
- PG10 original `pages/results.js`: **88.562 caracteres originales = 88.562 reconstruidos**, sin primera diferencia. Git blob original: `9ba7f52a69b33f1538ff1c4c0927c81395021777`.

La equivalencia fuente verifica que **no se ha alterado la lógica de las funciones trasladadas**, aunque el QA browser sigue siendo obligatorio para el orden de carga real.

## 3. Contratos y carga del navegador

- `module-manifest.json` e `index.html`: `results-analysis.js` se carga tras `results.js`; `tobe-review.js` y `tobe-flow.js` después de `tobe.js` y antes de Comparación. Sin `import` mixtos ni scripts paralelos.
- `tests/pg11-source.cjs` reconstituye el árbol histórico de código para los oráculos de Node/JSDOM, sin formar parte del runtime.
- `tests/module-manifest.test.cjs` y `tests/pg11-module-boundaries.test.cjs`: propietarios, dependencias, presencia única y oráculo de compatibilidad.
- `tools/aunea-design-system-audit.cjs`: PG10 y PG11 incluyen los nuevos módulos en sus familias y consumidores CSS. Los estilos siguen bajo los propietarios de F1/F2, sin hojas nuevas.
- No se modifican los nueve archivos de página/DOM FROZEN. Se mantienen sus 18 checksums de evidencia fija a 1365/390 px.

## 4. QA de este lote

- **Full Acceptance Gate** en `dd7f3b1e`: backend pytest, frontend npm y Chromium **PASS**. [Evidencia](https://github.com/PedroCMillan5/AUNEA/actions/runs/43422647600).
- **Full Acceptance Gate** después de corregir la publicación del inventario en `76caac8e`: backend/frontend/Chromium **PASS**. [Evidencia](https://github.com/PedroCMillan5/AUNEA/actions/runs/43422966900).
- **Design System Runtime Inventory**, `76caac8e`: **PASS**, 49 módulos declarados, 9 FROZEN, 20 categorías DS. [Evidencia](https://github.com/PedroCMillan5/AUNEA/actions/runs/43422966962).
- El workflow de inventario ya no permite que una ejecución anterior sobrescriba el informe de un commit posterior: verifica el HEAD y conserva siempre el artefacto de la ejecución. Se registra la colisión de publicación como evento de auditoría no como fallo del producto.
- Es equivalencia automática, **no certificación visual manual ni QA del software completo en Windows/Edge**.

## 5. Pendientes revisados tras el primer lote y límites de F4 (registro histórico)

- Continuar la descomposición de **composición de página/eventos** en el trabajo interno y las páginas de resultados únicamente si hay un propietario funcional claro, evitando fraccionar por número arbitrario de líneas.
- Medir y eliminar duplicación real de estructura y condiciones de renderizado donde exista evidencia; no crear componentes para cada fragmento.
- Revisar todas las páginas abiertas, jerarquía de encabezados, controles y estados a nivel navegador nativo. FROZEN no se reabre sin autorización.
- **No mover ni reescribir** reglas de negocio, optimización, IA o persistencia en F3: pertenecen a F4 y mantienen sus propietarios.
- F3 **permanece REVIEW / PARCIAL** hasta completar esas responsabilidades y el QA de cierre. F6 visual manual continúa pendiente y main no recibe cambios.

**Fuentes:** `docs/AUNEA_INTERNAL_SHARED_UI_CONTRACT_20261113.md`, `CODE_BLOCK_INDEX.md`, `FROZEN_PAGES.json` y plan F0–F6 en Drive.


## 6. Cierre completo F3 · 13/11/2026

**La fase F3 se declara CLOSED TÉCNICO en la rama REVIEW.** Se cierra la separación de responsabilidades de las vistas **sin** reescribir los engines, el modelo, los campos ni las decisiones humanas. Este hito no convierte PG11 funcional ni todo AUNEA Internal en producto APPROVED_FOR_CLIENT o PRODUCTION. F6 aún incluye aceptación visual manual.

### Propietarios finales

| Superficie | Owner vista/DOM | Responsabilidad y límites |
| --- | --- | --- |
| PG10 diagnóstico | `pages/results.js` | Síntesis, trazabilidad, estado/review, navegación por evidencias. **590 líneas** actuales, frente a 871 al inicio de F3. |
| PG10 proyección analítica | `pages/results-analysis.js` | Economía y riesgos read-only desde outputs canónicos; **188 líneas**. |
| Recomendación / escenarios / cotización | `pages/results-official.js` | Vista comercial gobernada, petición de comparaciones al backend y PDF autorizado; **94 líneas** y 14 funciones trasladadas sin alteraciones. |
| PG11 página/composición | `pages/tobe.js` | Inspector, navegación, contexto y composición de tareas TO-BE; **1.209 líneas**, frente a 2.058 al inicio de F3. |
| PG11 información original/revisión IA | `pages/tobe-review.js` | Proyección read-only de hechos, propuesta IA y campos de trabajo; **452 líneas**. |
| PG11 grafo futuro/validación visual | `pages/tobe-flow.js` | Overlay versionado, integridad de rutas y proyección; **401 líneas**. |
| PG10/PG11 eventos globales | `pages/internal-work-events.js` | Registro único de acciones de trabajo interno (22 listeners delegados), sin crearlos dentro de las seis vistas anteriores; `ui/shell.js` conserva los eventos globales generales. |
| UI y datos compartidos | `ui/renderer.js` / owners `domain/*` y backend | Select, disclosure, empty, notice; no segundo registro del diagnóstico, TO-BE o resultados. |

Los **50 módulos runtime** están declarados una sola vez en `module-manifest.json` y el orden de `index.html` coincide con el manifiesto. `CODE_BLOCK_INDEX.md` conserva todos los Block_ID migrados y registra el owner nuevo `AUNEA-FE-RESULTS-OFFICIAL-PAGES-410`.

### Duplicación demostrada y eliminada

- Antes, los clics de nodos del mapa PG10 y los enlaces de origen repetían el mismo bloque para deseleccionar, desplegar, enfocar y desplazar la tarjeta.
- Ahora ambos llaman a **una única función local `focusDiagnosticEvidence(target)`** dentro de `bindDiagnosticMapPointNavigation()`. Desaparece la copia de la acción sin alterar rutas, clases, apertura, teclado, persistencia ni modo read-only. Se eliminan **363 caracteres netos** del renderizador PG10 en esta refactorización.
- Test directo de equivalencia de conducta: `tests/internal-work-p0.test.cjs` ejecuta nodos y enlaces sintéticos, contempla teclado, estado, apertura y no mutación. Test de regresión explícito `tests/results-v1.test.cjs` exige un único owner de selección y eventos globales fuera de las vistas.
- No se han añadido componentes paralelos ni separado bloques por tamaño sin ganancia funcional. Las funciones `tobeKeepAiReviewedField` y otras que manipulan versión/IA permanecen tal cual hasta la fase F4 de dominio, pues moverlas/reimplementarlas en F3 violaría su límite.

### Igualdad de código migrado (prueba de conservación de negocio)

Comparación contra el commit previo a F3 `4e3a2aa70a3567faab46a3f11cd623fd09adffe2`, leyendo archivos GitHub de ambas revisiones:

- `results-official.js`, quitando sólo su Block_ID envolvente: **18.474/18.474 caracteres idénticos** al tramo original de `results.js`.
- `results-analysis.js`: **17.340/17.340 caracteres idénticos** al tramo original.
- `tobe-flow.js`: **24.175/24.175 caracteres idénticos** al tramo original.
- `tobe-review.js`: **29.587/29.587 caracteres idénticos** al tramo original.
- El único cambio intencional posterior de comportamiento interno es deduplicar la selección en el mapa PG10, manteniendo HTML, contrato, accesibilidad, eventos y resultados idénticos bajo tests y Chromium. Los comentarios de ownership se actualizaron para reflejar las responsabilidades nuevas.
- La suma de líneas de runtime no disminuye en proporción a las líneas extraídas: **se ha reducido acoplamiento, no fingido una eliminación masiva de código**. La limpieza de material muerto corresponde a F5.

### QA y aceptación del alcance F3

- `AUNEA Internal V2 REVIEW Acceptance Gate` **SUCCESS** para el código posterior al cuarto módulo y a la deduplicación (SHA `abbc9e54626ae4952746b25467cc5377bf9f878d`, run **43429613462**): backend pytest PASS, frontend npm PASS, browser Chromium PASS y publicación PASS. Ver https://github.com/PedroCMillan5/AUNEA/actions/runs/43429613462.
- `AUNEA Frontend Tests` **PASS** (run **43429604344**), `AUNEA Shared UI Contract Gate` **PASS** (run **43429604243**) y `AUNEA Design System Runtime Inventory` **PASS** (run **43429604234**). Las modificaciones posteriores al commit de esos tres runs están cubiertas por el Acceptance Gate final.
- Chromium compara las **18 capturas FROZEN** (9 páginas × escritorio 1365px/móvil 390px) con los hashes SHA-256 fijos. Resultado PASS; referencia técnica no se regenera al detectar diferencias. Los nueve FROZEN no se han reabierto ni modificado.
- Auditoría final: **50 módulos**, **20 categorías documentales DS**, **107 clases CSS entre hojas**, **139 grupos selector/contexto repetidos** con **0 owner técnico sin clasificar**; estilos inline del runtime **29**, sin incremento respecto a F1/F2.
- `F3 CLOSED` requiere todas las pruebas integrales sin regresiones conocidas. La lectura de las suites y el resultado Chromium sostienen el cierre técnico, no una homologación de todas las combinaciones de UI en Windows/Edge.

### Delimitación de fases restantes

- **F4:** depurar ownership y derivaciones de dominio, IA, reglas, validaciones y transacciones, sin cambiar el backend como owner del resultado.
- **F5:** analizar referencias activas, duplicaciones y material realmente muerto y archivar lo sustituido cuando corresponda.
- **F6:** aceptación visual y funcional final, Windows/Edge, flujo completo AS-IS→TO-BE→PG12→escenarios→revisión→entregables y cierre de producto.
- Sin merge a `main`, sin modificar DECISIONES/ROADMAP, sin nuevas preguntas, reglas, KPI, precios ni acciones autónomas.
