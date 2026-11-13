# AUNEA Internal — F3 · Simplificación de PG10 y PG11 por responsabilidades

**Fecha:** 13/11/2026  
**Rama:** `work/as-is-ux-simplification-20260930` (REVIEW, sin merge a main).  
**Estado:** F3 — primer lote de separación y QA técnica PASS; **NO CLOSED** para el conjunto de páginas.  
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

## 5. Pendientes concretos de F3 y límites de F4

- Continuar la descomposición de **composición de página/eventos** en el trabajo interno y las páginas de resultados únicamente si hay un propietario funcional claro, evitando fraccionar por número arbitrario de líneas.
- Medir y eliminar duplicación real de estructura y condiciones de renderizado donde exista evidencia; no crear componentes para cada fragmento.
- Revisar todas las páginas abiertas, jerarquía de encabezados, controles y estados a nivel navegador nativo. FROZEN no se reabre sin autorización.
- **No mover ni reescribir** reglas de negocio, optimización, IA o persistencia en F3: pertenecen a F4 y mantienen sus propietarios.
- F3 **permanece REVIEW / PARCIAL** hasta completar esas responsabilidades y el QA de cierre. F6 visual manual continúa pendiente y main no recibe cambios.

**Fuentes:** `docs/AUNEA_INTERNAL_SHARED_UI_CONTRACT_20261113.md`, `CODE_BLOCK_INDEX.md`, `FROZEN_PAGES.json` y plan F0–F6 en Drive.
