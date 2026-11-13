# AUNEA Internal — Plan de reducción y simplificación técnica

Estado: F0 CLOSED — inventario estático reproducible PASS con evidencia CI; F1–F6 EN EJECUCIÓN/PENDIENTES
Fecha: 2026-11-12
Rama objetivo: `work/as-is-ux-simplification-20260930`
Ámbito: reducción y simplificación del software existente. Sin nuevas funciones ni cambios de reglas.
Naturaleza: plan técnico de trabajo, **no** fuente canónica de reglas de negocio ni promoción a PRODUCTION.

## 1. Fuentes y precedencia
- Master Index gobernante Drive `00_AUNEA_INTERNAL_MASTER_INDEX` v1.59 (27/10/2026); su espejo GitHub no gobierna.
- `PROJECT_RULES.md` v1.7; build order: datos → reglas/contratos → interfaz → entregables.
- `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14: owner único, snapshots y reglas server-owned.
- `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7` (Drive, identificar las decisiones afectadas antes de tocar código).
- `module-manifest.json`: 44 scripts y orden contractual; el runtime comparte ámbito global.
- `FROZEN_PAGES.json`, `CODE_CONVENTIONS.md`, `CODE_BLOCK_INDEX.md` y pruebas aplicables.
- Antes de una modificación de código: contrastar también `DECISIONES_AUNEA` vigentes (en particular ownership, UI FROZEN y gobierno del cambio).

## 2. Propósito / límites
Reducir duplicación efectiva de CSS, HTML, eventos y lógica, mejorar cohesión y reutilización, sin reducir comportamiento ni romper cargas, snapshots, datos, resultados ni regresiones. No medir éxito solamente en líneas. No añadir frameworks, migraciones masivas, fuentes de verdad nuevas, ni rediseño creativo.

## 3. Línea base inicial verificable (lectura de la rama, 12/11/2026)
| Archivo | Líneas aproximadas |
| --- | ---: |
| `ui-system.css` | 5.041 |
| `pages/tobe.js` | 2.545 |
| `pages/results.js` | 1.592 |
| `domain/analysis-workbench.js` | 661 |
| `domain/tobe-transactions.js` | 586 |
| `styles.css` | 285 |
| `ui/shell.js` | 247 |
| `pages/comparison.js` | 148 |
| `domain/tobe-model.js` | 128 |

Suma de los tres mayores: **9.178 líneas**. En `ui-system.css`, un conteo exploratorio identificó aprox. **2.484 bloques de selectores** y **263 selectores con apariciones múltiples**. Estas cifras son indicios, NO 263 errores: incluyen posibles media queries, variantes y overrides válidos; comprobar cascada, contexto y uso antes de eliminar.

Otras observaciones de lectura:
- `pages/tobe.js` incluye captura DOM y edición de borrador; candidato a adelgazar su composición, sin mover ownership de operaciones de negocio.
- `pages/results.js` aglutina diagnóstico, recomendaciones, escenarios y cotización; revisar responsabilidades y duplicación antes de separar.
- `domain/tobe-transactions.js` ya centraliza previsualización y aplicación/undo; preservar ese owner y sus restricciones.
- `styles.css` define tokens/controles y `ui-system.css` layout; no crear tercera fuente de estilos genéricos.
- El backend es propietario de los cálculos oficiales: jamás trasladar fórmulas al navegador.
- El inventario de todo el repositorio, sus líneas totales y el uso real de clases sigue PENDIENTE.

## 4. Mapa de responsabilidades objetivo (sin crear aún archivos)
```
core/state + services/schema/backend-client/persistence (existentes)
        ↓
domain/result-context, tobe-model, tobe-transactions,
       process-suggestions, output-review (existentes)
        ↓
ui/renderer + styles.css + ui-system.css + shell.js (existentes)
        ↓
pages/results, tobe, comparison y otras páginas (existentes)
```
Los componentes compartidos sólo se extraerán cuando haya duplicación funcional demostrada. Conservar Block_ID de cada responsabilidad y el orden del manifiesto. No introducir `work-components.js` ni `work-pages.js` por anticipado.

## 5. Fases y gates
- **F0 Inventario: CLOSED (13/11/2026).** Baseline y matriz de riesgos en `docs/AUNEA_INTERNAL_F0_BASELINE_20261113.md`; informe generado por CI en `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json`. 337 activos, 13 archivados, 46 módulos, 9 FROZEN, errores vacíos. Consumidores léxicos y CSS indicados como candidatos, no defectos. PASS sólo del inventario, no de UAT.
- **F1 CSS transversal:** eliminar sólo reglas duplicadas o sobrescritas sin efecto, respetando especificidad, orden y responsive. **Gate:** comparación visual de todas las pantallas afectadas, FROZEN intactas.
- **F2 UI compartida:** reutilizar controles/tarjetas/modales realmente equivalentes; preservar teclado, accesibilidad y estados. **Gate:** DOM/acciones equivalentes y regresión.
- **F3 Páginas:** simplificar `tobe.js` y `results.js` por partes, manteniendo funciones existentes hasta demostrar equivalencia. **Gate:** journeys completos y snapshots estables.
- **F4 Dominio:** centralizar derivaciones y validaciones duplicadas, nunca resultados server-owned. **Gate:** contratos, invariantes, pruebas de errores y undo.
- **F5 Limpieza:** retirar código muerto demostrado, mantener histórico en ARCHIVED cuando proceda, revisar manifiesto y Block_ID. **Gate:** auditoría de referencias.
- **F6 QA / cierre:** CI, UAT navegador Windows, persistencia, AS-IS→TO-BE→comparación→escenarios→revisión→entregables, informes antes/después. **Gate:** no regressions; doc/índices sincronizados cuando aplique.

## 6. Método de cambios
1. Identificar owner, contrato canónico, Block_ID y consumidores.
2. Capturar baseline de tests y del comportamiento.
3. Cambiar un bloque pequeño y reversible por commit; no mezclar semántica con CSS.
4. Actualizar tests que verifican comportamiento, no sólo cadenas de código.
5. Ejecutar los QA aplicables y inspeccionar diferencias.
6. Si falla, no avanzar ni descartar trabajo ajeno: investigar y corregir.
7. Medir líneas netas, duplicaciones, acoplamiento, performance y riesgo; guardar la evidencia.
8. Sincronizar Master Index, DECISIONES, ESTADO, ROADMAP y BITACORA sólo si lo exige el tipo de cambio.

## 7. Primer backlog controlado
| ID | Acción | Riesgo | Estado |
|---|---|---|---|
| SIM-00 | Identificar SHA base y árbol activo, contraste con archivos archivados | Bajo | F0 CLOSED — baseline + CI JSON verificado |
| SIM-01 | Matriz de selectores repetidos en `ui-system.css`, uso y cascada | Alto (FROZEN) | F0 inventario de 123 grupos + 107 clases compartidas; clasificación semántica y eliminación corresponden a F1 |
| SIM-02 | Inventario de responsabilidades/DOM/eventos de `tobe.js` | Alto | F0 inventariado; simplificación funcional pendiente F3 |
| SIM-03 | Inventario de responsabilidades/DOM/eventos de `results.js` | Alto | F0 inventariado; simplificación funcional pendiente F3 |
| SIM-04 | Mapa de dependencias de estado → transacciones → resultados | Crítico | F0 grafo léxico de 924 referencias y matriz de propietarios; evaluación funcional pendiente F4/F6 |
| SIM-05 | Línea base de tests/QA nativa para cada cambio | Crítico | F0 inventariadas 82 pruebas frontend y 42 backend; ejecución y PASS de regresión pendientes F6 |

## 8. Criterios de cierre
No declarar simplificación terminada por bajar líneas, cambiar apariencia o pasar tests aislados. Exigir: propietario único por dato/regla, comportamiento equivalente, cero regresiones conocidas, tests aplicables PASS, revisión FROZEN, inventario actualizado y evidencia de mejoras medibles. Los límites de líneas orientativos NO son reglas canónicas.

## 9. Registro de ejecución
- **12/11/2026:** comprobadas fuentes de Drive (Master Index v1.59, Simulator v1.14), reglas de repositorio, rama existente y manifiesto de 44 scripts. Inspección inicial de 12 archivos de frontend y conteo de selectores CSS. Publicación de este plan = inicio documental F0; no se ha modificado runtime, no se ha ejecutado CI ni se ha cerrado F0.

## 10. Ejecución posterior · 12/11/2026
- `be45b42ce9b4`: se eliminan cinco bloques CSS **idénticos** que aparecían repetidos dentro del mismo contexto, preservando la última declaración vigente. Reducción mecánica: 7 líneas / 469 caracteres. Conteo de llaves equilibrado.
- Se experimentó con fusionar seis pares de selectores contiguos (`4f434ef830f7`), pero una inspección posterior de los tests detectó aserciones que dependen de selectores literales. Se **revirtió íntegramente** esa fusión mediante `670d0f9e73b2`. El estado final conserva únicamente la reducción segura anterior.
- QA realizado en este entorno: lectura comparativa y análisis estático de CSS, verificación de duplicación y estructura. **No** se ha ejecutado `npm test`, QA backend ni UAT visual: el repositorio privado no está clonable en el contenedor y no se dispone de un runner remoto con ejecución manual accesible aquí. Los cambios permanecen REVIEW y requieren gate automatizado antes de cierre.
- F0: inventario inicial y dependencias canónicas contrastadas; inventario global exhaustivo y matriz de selectores usados aún pendientes. F1: iniciada reducción conservadora, NO cerrada. F2–F6: pendientes.
- Riesgo técnico encontrado: tests como `tests/design-system-common.test.cjs` dependen de cadenas exactas de selectores CSS. Unificar selectores puede preservar el CSS computado y aun así romper estos tests. Antes de mayor refactorizar, migrar cuidadosamente esas aserciones a equivalencia de CSS si el contrato lo permite.

## 11. Inventario completo del manifiesto (lectura estática) · 12/11/2026
Se han leído los **44 archivos JavaScript del manifiesto activo** en tres lotes. Total: **17.503 líneas de JS**, contabilizadas como saltos de línea + 1 por archivo (incluye comentarios y espacios). CSS principal: 5.041 + 285 = **5.326 líneas**; JS + estos dos CSS = **22.829 líneas**. No incluye backend, HTML, pruebas, archivos auxiliares ni archivados; por tanto no representa todo el repositorio.

Mayores módulos JS activos (líneas):
- `pages/tobe.js` 2.545, `domain/process.js` 2.081, `pages/results.js` 1.592, `domain/internal-ai-pilot.js` 1.576.
- `ui/renderer.js` 774, `core/state.js` 671, `domain/no-reask.js` 661, `domain/analysis-workbench.js` 661, `pages/diagnostic-stages.js` 643, `domain/process-lifecycle.js` 612.

**Priorización revisada:** los grandes módulos de dominio (`process.js` y `internal-ai-pilot.js`) deben entrar en el inventario de dependencias, pero **no** se deben dividir sólo por su tamaño. `tobe.js` y `results.js` siguen candidatos por mezcla de vista/eventos. Lo relevante es reducción de acoplamiento y duplicación, no el tamaño bruto.

**QA y cierre:** análisis estático realizado. No se ha confirmado que FROZEN, UAT Windows o backend sean equivalentes en ejecución. Fases 0–6 siguen abiertas, sin afirmación de finalización integral.

## 12. Consolidación de superficies y estructuras compartidas · 12/11/2026
**Cambios implementados en REVIEW, sin cambio de reglas de negocio:**
- `styles.css` / Block_ID existente `AUNEA-FE-SHARED-COMPONENTS-311`: nuevo componente opt-in `.aunea-ui-work-surface` para geometría de tarjeta (display, gap, padding, border, radio, fondo y color). Un único propietario, sin aplicar reglas globales a FROZEN.
- El mismo bloque define `.aunea-ui-work-stage` con grid/gap/min-width compartidos por las tres actividades 03.1, 03.2 y 03.3.
- `ui-system.css`: retiradas las declaraciones duplicadas de geometría y display/gap de esos seis consumidores, manteniendo selectores específicos necesarios para el contrato de pruebas. Los layout/estados concretos siguen en la hoja de composición.
- `pages/tobe.js`: 01 Información general, 02 Análisis IA global y 03 cabecera de diseño consumen `.aunea-ui-work-surface`; 03.1 Entender AS-IS, 03.2 Oportunidades y 03.3 Configuración consumen `.aunea-ui-work-stage`. No se modifica ninguna acción, evento, input ni transacción.
- `tests/design-system-common.test.cjs` (Block_ID existente 312): añade gate estático explícito para impedir que estas superficies vuelvan a tener propietarios locales de geometría.

**QA realizado:** comprobación de 12 invariantes estáticas (presencia de clases, consumidores, ausencia de reglas locales duplicadas y balance de llaves) PASS. No equivale a `npm test`, a la suite backend o a UAT visual; no se afirma identidad pixel a pixel porque las reglas ahora se cargan antes en la cascada CSS. Los tests completos y captura comparativa desktop/tablet/móvil siguen pendientes.

**Cobertura real:** consolidación inicial de seis superficies/estructuras de Trabajo interno; NO se ha unificado aún toda la UI. CRM y diagnóstico FROZEN permanecen sin modificaciones de markup y no se modifica el sistema de datos/reglas. La reducción de líneas netas de este lote no es un objetivo cumplido por sí misma: se ha cambiado ownership de estilo para evitar duplicidades futuras.

## 12. Consolidación visual y estructural incremental · 12/11/2026
- `45debdfbfa1d`: añadidas seis clases **opt-in** al bloque canónico compartido `AUNEA-FE-SHARED-COMPONENTS-311` de `styles.css`: espaciado de trabajo, bloque visible, textarea de resumen y tipografía de estado. Sin reglas globales nuevas ni modificaciones a las páginas FROZEN.
- `2a976f36b8b`: `pages/results.js` reutiliza esas clases. Eliminados **10 estilos inline** de la página (0 restantes), conservando los mismos atributos de espaciado, dimensiones y tipografía. No se alteran los contratos de datos, eventos ni las funciones de negocio.
- `7c5a8b350990`: test de regresión añadido a `tests/design-system-common.test.cjs` para comprobar ownership compartido y evitar reintroducir estilos inline en Resultados.
- **Límite de alcance:** la unificación integral de todas las estructuras del software NO está terminada. Ya existían primitivas compartidas en `styles.css` y `tobe.js` las consumía; este cambio incorpora `results.js` a la misma capa visual, pero no reestructura los grandes módulos ni modifica los estilos históricos de pantallas FROZEN.
- **QA:** inspección estática y comprobación de reemplazos realizada; test automatizado añadido pero **no ejecutado** en runner. No declarar PASS ni promover a PRODUCTION hasta ejecutar suite y UAT visual. F1/F2 en progreso.

## 13. Consolidación de componentes de Trabajo Interno · 12/11/2026
**Cambios de código publicados en la misma rama; todavía en REVIEW:**
- `20bd7df07e30`: el componente visual `.aunea-ui-work-disclosure` pasa a ser propiedad de `styles.css`, con reglas equivalentes para panel, encabezado, expandido y responsive. Uso exclusivamente **opt-in**.
- `e03f769b9922`, `3d3136c233d5`: Diagnóstico/PG10 reutiliza ese componente en tres bloques (etapas, puntos críticos y trazabilidad de decisiones), y elimina sus copias de apariencia de `ui-system.css`. La regla histórica `.pg10-source-data` se conserva por compatibilidad y se mantiene la colocación específica de contenidos de PG10.
- `6ae623928995`, `19cf39366d98`: nueva función `auneaWorkDisclosure` en el renderizador transversal; los tres consumidores de PG10 dejan de construir por duplicado el elemento `details/summary`. La función sólo renderiza y escapa encabezados; no introduce eventos, estados ni datos de negocio.
- `979910b241d5`: eliminadas dos reglas redundantes de `ui-system.css` para seis contenedores de TO-BE (03.1/03.2/03.3 y los tres paneles superiores), porque esas mismas propiedades ya pertenecen a `.aunea-ui-work-stage` y `.aunea-ui-work-surface`. Sus seis consumidores se verificaron en `pages/tobe.js`.
- `832cce7105c0`, `6ded39880724`, `e4b3dee8c21d`, `19411504b823`, `a450b2003cce`: aserciones de regresión para ownership visual, uso común, marcado HTML/escape y ausencia de duplicación.
- `8868618058ba`: incorporado Block_ID `AUNEA-FE-UI-WORK-DISCLOSURE-380` a `CODE_BLOCK_INDEX.md` para preservar la auditoría obligatoria.

**Owners ratificados**
| Responsabilidad | Owner técnico | Consumidores | Restricción |
|---|---|---|---|
| Tokens, tipografía y variantes de controles | `styles.css` | Todo frontend | Fuentes TOKENS / DS canónicas |
| Panel desplegable de Trabajo Interno | `styles.css` / `ui/renderer.js` | PG10 (3) | Opt-in; no alterar FROZEN |
| Superficie de Trabajo Interno | `styles.css` | TO-BE contexto, análisis y cabecera | Geometría compartida |
| Etapas 03.1/03.2/03.3 | `styles.css` | `pages/tobe.js` | Estructura compartida; contenido propio |
| Geometría singular de pantallas y responsive legado | `ui-system.css` | Según vista | No duplicar controles comunes |
| Datos, recomendaciones y cálculos oficiales | Backend/owners de dominio | PG10/PG11 | Nunca inventar frontend |

**QA acreditada:** lectura estática del código vigente; sintaxis JS compilable de `ui/renderer.js`, `pages/results.js` y tests modificados; llaves CSS equilibradas; tres consumidores conectados a renderer y CSS común; HTML de prueba producido por el helper coincidente con el contrato previo; seis contenedores TO-BE existentes con sus clases comunes; 0 estilos inline en `pages/results.js`. **No acreditado:** `node --test` sobre repositorio completo, pruebas de backend, comparación visual en Chrome/Edge y gates FROZEN. No promocionar ni dar por cerradas F1–F6 hasta esas evidencias.

**Límite de alcance activo:** `FROZEN_PAGES.json` v10 bloquea cambios a nueve pantallas aprobadas: inicio, empresas, contactos, interacciones, oportunidades, estudios, contexto/objetivos, alcance y estado objetivo/restricciones. La simplificación de esas páginas necesita una reapertura explícita, no se hará automáticamente.

## 14. Verificación de integridad de la consolidación · 12/11/2026
- `bcfc0662cd7f`: todas las pruebas del catálogo compartido quedan dentro del Block_ID de test existente `AUNEA-UAT-DESIGN-COMMON-312`, sin crear propietarios nuevos.
- **Resultado estático local: PASS (limitado)**. Se han leído los archivos finales de GitHub y comprobado programáticamente: sintaxis JavaScript compilable de `ui/renderer.js`, `pages/results.js` y `tests/design-system-common.test.cjs`; una apertura/cierre por cada Block_ID modificado; fila única en CODE_BLOCK_INDEX; balance de llaves CSS; tres llamadas al constructor `auneaWorkDisclosure`; tres etapas de TO-BE con componente `aunea-ui-work-stage`; ausencia de estilos inline en Resultados; ausencia de reglas visuales duplicadas para los tres disclosure de PG10.
- El conteo `styles.css + ui-system.css` actual es **5.333 líneas**. Que aumente ligeramente por reglas comunes/testabilidad frente al primer borrado de duplicados NO supone fallo: la consolidación de ownership no se mide sólo por líneas brutas. Los dos CSS contienen otros ámbitos legados que siguen pendientes de racionalización.
- **No confundir PASS estático con PASS de ejecución.** No se dispone aquí de un checkout local de la rama ni de un runner Windows con navegador; las suites Node, Python, FROZEN y UAT visual siguen NO ACREDITADAS. Se preserva el estado REVIEW y no se realiza promoción.

## 15. Separación física de responsabilidades y QA estructural · 12/11/2026

**Refactor de vistas/eventos, sin alterar semántica ni flujos:**

- `0ba0d4d9fa1`: la intersección de preguntas de recomendaciones globales y por grupo usa una única proyección read-only; se contrastaron **36 combinaciones sintéticas** antes de publicar. Test explícito en `tests/tobe-v1.test.cjs` (`683767335417`).
- `4e63b4efdc62`, `0e64d76d66ff`: `registerInternalWorkPages` (723 líneas, incluida separación final) sale de `pages/results.js` y pasa a `pages/internal-work-events.js`; `results.js` baja de **1.592 a 871 líneas**. El nuevo Block_ID `AUNEA-FE-INTERNAL-WORK-EVENTS-381` y los **16 Block_ID** existentes dentro de la función están correctamente registrados en `CODE_BLOCK_INDEX.md`.
- `caea8aacbc7a`, `1d7447471ecb`, `b1a046652c38`: manifiesto e `index.html` actualizados; la compatibilidad de tests `pg11-source.cjs` recompone el mismo código que los tests anteriores.
- `b08e4ed10dbe`, `e83c3d0353a`: la proyección global IA de PG11 conserva exactamente su bloque original `AUNEA-FE-PG11-GLOBAL-OVERVIEW-284` y pasa a `pages/tobe-global.js`. `tobe.js` baja de **2.548 a 2.058 líneas**, sin cambios en su lógica restante. `CODE_BLOCK_INDEX.md` se actualiza con el nuevo archivo owner.
- `08c24cd4e4da`, `a7db230a0d5a`, `8b580f919659`: 46 módulos en manifiesto e HTML, orden contiguo; nuevo módulo global y módulo de eventos cargados justo antes de `boot.js`; source oracle recomponible.
- `a6292dd66a79`, `66d8297ef5ff`: dos pruebas de integración contractual añadidas en `tests/module-manifest.test.cjs`; documentación actualizada en `frontend/README.md` (`748449d2d7d1`).

**QA estática de esta refactorización — PASS acotado:** se leen los archivos finales de la rama, se compilan sintácticamente los JS modificados en un entorno aislado, se verifica la identidad exacta del contenido antiguo al reinsertar las porciones movidas (TO-BE y Resultados), el ensamblaje de compatibilidad compila, todos los manifest order están contiguos, los 46 scripts coinciden en índice y manifiesto, y el registro de Block_ID refleja el propietario correcto. Esta comprobación es fuerte para **ausencia de pérdida de código**, pero no verifica ejecución DOM real.

**Cobertura adicional:** se ha confirmado que `.github/workflows/aunea-v1-gate.yml` contempla expresamente los `push` a `work/as-is-ux-simplification-20260930` y ejecuta backend pytest, frontend npm test y browser UAT; sin embargo **los resultados del workflow no son accesibles por los métodos de consulta disponibles desde aquí**. El estado de esos gates continúa **NO ACREDITADO**. El sitio de Actions se debe consultar antes de promoción.

**Medición correcta:** los archivos de vistas se han reducido físicamente, pero las líneas movidas siguen existiendo en dos módulos de responsabilidad delimitada. No presentar la reducción por archivo como disminución equivalente del volumen total de código. Se ha añadido un mínimo de marcadores y pruebas de control.

**Pendiente para cierre integral:** ejecución y corrección de los gates Node/Python/Chromium y UAT visual Windows; auditoría de duplicaciones no triviales de `ui-system.css`, `domain/process.js` y `domain/internal-ai-pilot.js`; inspección de comportamiento UI de PG10/PG11 y del ciclo completo; consolidación adicional sólo donde la matriz de consumidores demuestre equivalencia. Permanecen sin tocar los nueve FROZEN; ningún cambio de canonical, fields ni engines.

## 16. Auditoría F0 (13/11/2026) — CERRADA tras ejecución en GitHub Actions
- Informe técnico verificable: `docs/AUNEA_INTERNAL_F0_BASELINE_20261113.md`. Incluye inventario 46 JS, 33 módulos Python backend, 5.333 líneas CSS, 512 Block_ID, mapa de propietarios/consumidores, 9 páginas FROZEN y 13 snapshots, 123 grupos de selectores repetidos, riesgo y gates por fase.
- Script reproducible de árbol completo: `tools/aunea-f0-audit.cjs`; revisado en fuente, mide archivos activos/ARCHIVED y candidatos de dependencias y CSS. No borra ni modifica datos.
- Workflow específico: `.github/workflows/aunea-f0-inventory.yml`; sobre un checkout real debe generar `f0-inventory.json`, validar 46 módulos/9 FROZEN y guardar evidencia en `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json` si el token tiene permisos y el gate es PASS.
- **Evidencia CI generada y contrastada:** `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json`, `status=STATIC_INVENTORY_GENERATED`, `errors=[]`, `warnings=[]`, `activeFiles=337`, `archivedFiles=13`, `runtimeModules=46`, `frozenPages=9` y 13 snapshots disponibles. El workflow comprueba el JSON antes de incorporarlo al repositorio. **Gate F0 PASS / CLOSED.**
- El conteo antiguo de 44 módulos es histórico: el manifiesto vigente contiene 46 después de la separación de eventos y de la proyección global IA. No confundir disminución de líneas por archivo con reducción neta del producto.
- Los gates de comportamiento (Node, pytest, Chromium, UAT Windows) pertenecen a estabilización/F6 y siguen pendientes. No hacer merge ni tocar FROZEN por la publicación de un informe.

## 17. Acta de cierre F0 · 13/11/2026
- **Resultado:** F0 CLOSED, exclusivamente como auditoría/inventario. Script y workflow versionados; inventario integral CI publicado, sin errores ni avisos. Árbol de 337 archivos activos + 13 archivados, fuentes canónicas y 512 Block_ID contrastados, matriz owner/consumer y riesgos, FROZEN 9/13 verificados.
- **Evidencia:** `docs/AUNEA_INTERNAL_F0_BASELINE_20261113.md`, `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json`, `tools/aunea-f0-audit.cjs` y `.github/workflows/aunea-f0-inventory.yml`.
- **No prueba:** homogeneidad visual, ausencia de regresiones ni tests funcionales (F6). Candidatos CSS sin consumidor textual no se deben borrar sin revisar HTML/dinamismo y FROZEN.
- **Entrada F1:** estabilizar gates existentes, catalogar clases compartidas, clasificar 123 grupos de selectores repetidos y 107 clases en ambos CSS; decidir cada extracción únicamente con matriz de consumidores y capturas de UI. 

**Baseline final de F0:** 337 activos y 13 archivados. La primera ejecución indicó 336 antes de versionar el JSON de auditoría, que incorpora un archivo al árbol activo. La segunda ejecución verifica el recuento final, sin errores ni avisos.
