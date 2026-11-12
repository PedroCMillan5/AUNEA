# AUNEA Internal — Arquitectura actual → arquitectura objetivo PG10–PG15

**Estado:** REVIEW — análisis de arquitectura, sin implementación ni promoción canónica.  
**Fecha:** 12/11/2026.  
**Rama examinada:** `work/as-is-ux-simplification-20260930`.  
**Referencia de código:** `369fcafb1aed4be786b57e9eb03b22d493af7ce1` (18:42:03 UTC).  
**Finalidad:** terminar PG11 con una experiencia consultor usable y permitir PG12–PG15, Modo Resultados y entregables coherentes, sin crear segundos propietarios de datos, reglas, diseño visual ni resultados.

## 1. Contratos que gobiernan este análisis

1. `00_AUNEA_INTERNAL_MASTER_INDEX` v1.59: fuentes de verdad y activos vigentes.
2. `PROJECT_RULES.md` v1.7: propietario único, datos → reglas → UI → entregables; Block_ID y QA; respeto a FROZEN.
3. `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14: funciones y secuencia PG10–PG15.
4. `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL` v1.7: propietarias, superficies, snapshots, publicación.
5. `DECISIONES_AUNEA`, especialmente DEC-034, 050, 052, 053, 055 y 056.
6. `DESIGN_SYSTEM_AUNEA`, `TOKENS_AUNEA` y catálogo visual: una gramática y componentes compartidos.
7. `3_SYSTEM/frontend/STYLE_SYSTEM_AUDIT.md` (REVIEW) y `FROZEN_PAGES.json`: excepcionalidad y regresión visual.

**Principios inalterables:** AS-IS confirmado de PG09 inmutable; diagnóstico, economics, riesgo, recommendation, pricing y escenarios derivados pertenecen al backend; IA propone/orquesta y no autoriza; TO-BE pertenece a su versión DRAFT revisable por consultor; REVIEWED no equivale a APPROVED_FOR_CLIENT; PG12 y entregables consumen versiones, no recrean cálculos.

## 2. Inventario comprobado: realidad del repositorio

| Archivo o conjunto actual | Responsabilidad efectiva | Evaluación |
|---|---|---|
| `frontend/styles.css` (285 líneas) | Tokens y apariencia compartida, variantes de botones y primitivas `.aunea-ui-*` | **CONSERVAR** como owner visual transversal |
| `frontend/ui-system.css` (5.041 líneas) | Shell, layouts, mapa, responsive, excepciones; 95 bloques identificados, 37 etiquetados PG11 | **CONSERVAR Y NORMALIZAR GRADUALMENTE**; no crear un segundo Design System |
| `frontend/ui/renderer.js` (774 líneas) | Controles canónicos y helpers de formulario | **REUTILIZAR**; no duplicar inputs PG11 |
| `frontend/ui/shell.js` | Navegación, registro de páginas, acciones de shell | **CONSERVAR** como infraestructura compartida |
| `frontend/pages/results.js` (4.996 líneas) | PG10, PG11, PG12, recomendación, escenarios, cotización, vista de revisión y listeners PG11 | **DESACOPLAR POR RESPONSABILIDAD**, manteniendo APIs y Block_ID |
| `frontend/domain/internal-ai-pilot.js` (1.576 líneas) | Ejecución/reintentos/checkpoints IA **y** manipulación directa del DOM PG11 | **AISLAR** ejecución de vista sin perder checkpoints ni recuperación |
| `frontend/domain/internal-ai-global-quality.js` (152 líneas) | Calidad de salida global IA | **CONSERVAR** y mantener separado del owner TO-BE |
| `frontend/domain/output-review.js` (38 líneas) | Vincula revisión/autoridad de resultados a snapshot, TO-BE y escenario | **CONSERVAR** como owner transversal de aprobación de outputs; NO confundir con decisiones locales de actividad |
| `frontend/core/state.js` (671 líneas) | Estado, navegación y conservación de histórico; clave local `aunea_internal_v1` | **CONSERVAR**; no recrear almacén TO-BE |
| `frontend/services/persistence.js` (213 líneas) | Recuperación local, backup y conciliación multiventana | **CONSERVAR**; migrar sólo con protocolo de datos/QA |
| `frontend/services/backend-client.js` (99 líneas) | Descubrimiento backend; transportes de IA aparecen también en el piloto | **CONSERVAR**, revisar después consolidación de transporte |
| `frontend/services/engine-adapter.js` (481 líneas) | Cobertura, gates, payload al backend y ejecución de diagnóstico | **CONSERVAR** como adaptación oficial |
| `backend/aunea_backend/tobe_optimization.py` (188 líneas) | Reglas deterministas de alternativas por hallazgo, sin escritura | **CONSERVAR** como owner de propuestas por reglas |
| `backend/aunea_backend/internal_ai_*.py` | IA global, IA por paso, validación y provider | **CONSERVAR** como lógica especializada |
| `backend/aunea_backend/orchestrator.py` y `engines.py` | Pain→Economics→Risk→Recommendation→Pricing→Scenario | **CONSERVAR**; no recalcular en frontend |
| `backend/aunea_backend/solution_spec.py`, `deliverables.py`, `system_builder.py` | Especificación, entregables y planificación técnica | **REUTILIZAR** para PG13/PG15, sin inventar otro motor |
| `backend/aunea_backend/store.py` (SQLite) | Engagements, salidas diagnósticas y auditoría backend | **ACTUAL**; la persistencia viva objetivo AUNEA Operations no está acreditada como implementada por esta inspección |

### 2.1. Acoplamientos observados, no hipotéticos

- `pages/results.js` contiene `resultsPage()` (PG10, línea ~643), modelo TO-BE desde ~735, `tobePage()` (~3883), `tobeComparisonPage()` (~4020), `scenariosPage()` (~4091), `quotePage()` (~4169), `registerInternalWorkPages()` (~4229) y `outputReviewPage()` (~4988). `recommendationPage()` está alrededor de la línea 730.
- `registerInternalWorkPages()` tiene listeners delegados de PG11, mezclando composición y control de eventos en el mismo archivo de resultados.
- `internal-ai-pilot.js` llama a funciones de presentación `tobeGlobalOverviewHtml`, `tobeAlternativesHtml` y `tobeAiAdviceHtml` y sustituye fragmentos del DOM: dependencia cruzada servicio → UI.
- El proyecto funciona con **39 scripts clásicos** declarados en `module-manifest.json`, cargados en orden en `index.html`. No son ES modules y no existe build de frontend. Reordenar es un cambio de contrato.
- Hay pruebas que extraen bloques de `pages/results.js` mediante marcadores `[AUNEA-...]` y rangos. Moverlos exige adaptar pruebas sin cambiar su Block_ID.
- `styles.css` se carga antes de `ui-system.css`, y `tests/design-system-common.test.cjs` comprueba propiedad de tokens y componentes.
- La navegación de Trabajo Interno registra `escenarios` antes de `recomendacion`; contrastar con la secuencia funcional canónica PG13→PG14 sin reordenar ciegamente.
- `frontend/README.md` sigue citando Diagnostic Master v0.9.1 pese a que Master Index/PROJECT_RULES designan v0.9.2. Es deuda documental, no una autorización para sustituir schemas.

## 3. Arquitectura objetivo (responsabilidad, no número arbitrario de ficheros)

### A. Capa transversal de presentación

**Owner único:** el Design System vigente y primitivas compartidas.

- Tokens, tipografía, colores, escalas y variantes visuales de botones: `styles.css` como origen actual.
- Shell, responsive, mapa y layouts: `ui-system.css`, sujeto a consolidación dirigida.
- Componentes de presentación compartidos (título de sección, estado, tarjeta, tabla, diálogo, controles, barra de acciones, evidencia) reutilizables en PG10–PG15.
- Toda nueva excepción contextual debe estar acotada, documentada y probada; no copiar estilos de componentes comunes a cada página.
- **No** crear CSS independiente por página como otro sistema visual; si se dividen archivos físicamente, han de consumir tokens/roles compartidos y mantener la misma cascada/contrato.

### B. Capa transversal de resultados

**No es una nueva entidad que reescribe outputs.** Es una proyección de lectura y presentación común, con:

- Referencias explícitas a Engagement, snapshot AS-IS, versión TO-BE, Engine Run, escenario y estado de vigencia cuando corresponda.
- Composición de tarjetas, tablas, mensajes de calidad, evidencias y enlaces a sus propietarios mediante componentes compartidos.
- Mecanismos comunes para estado de revisión/publicación y bloqueo de salidas obsoletas, **sin fusionar** la revisión de una actividad TO-BE con el gate de publicación de resultados.
- `domain/output-review.js` sigue siendo el owner actual de revisión de resultados; cada output derivado sigue perteneciendo a su engine/versión.
- Corregir datos se realiza en el propietario o por write-through explícito; no mantener copias editables de fuentes.

### C. Responsabilidades por página y dominio

| Área | Hace | No hace |
|---|---|---|
| PG10 Diagnóstico | Proyecta diagnóstico/evidencia desde el backend y fuentes confirmadas | No reescribe economics/pains/risk ni captura un segundo AS-IS |
| PG11 Diseño TO-BE | Presenta oportunidades, edita un único borrador versionado, opera transacciones y grafo, revisa coherencia | No aprueba propuestas IA automáticamente, no modifica AS-IS ni calcula pricing/ahorros |
| PG12 Comparación | Deriva diferencias entre versiones AS-IS y TO-BE, con indicadores sólo cuando hay soporte | No crea un segundo modelo de proceso ni infiere beneficios |
| PG13 Solución AUNEA System | Consume `SolutionSpecification`, recomendación y alcance gobernado; liga al catálogo oficial | No inventa producto, categoría, precio ni stack comercial |
| PG14 Escenarios | Compara alternativas con óptimo inmutable, usando motor oficial | No sobreescribe el óptimo ni recalcula en cliente |
| PG15 Resultados y entregables | Revisión/aprobación versionada, vista cliente de sólo lectura y artefactos del backend | No recalcula engines ni publica automáticamente |
| IA/Reglas | Devuelven alternativas, trazabilidad y restricciones; servicios controlan retries/checkpoints | No escriben directamente campos TO-BE o aprobaciones sin decisión humana |

### D. Límites de dependencia objetivo

```text
PG09 AS-IS sellado (owner)
     │
     ├── Backend diagnóstico (outputs server-owned) ── PG10
     │                                             ├─ PG11 (fuentes para propuestas)
     │                                             ├─ PG13 (solución/recommendation)
     │                                             └─ PG14 (escenarios)
     │
     └── PG11 TO-BE versionado (único owner editable)
              ├─ PG12 comparación derivada con AS-IS
              ├─ PG13 solución y alcance
              └─ PG15 entregables (más diagnóstico/escenario)
                                   │
                         revisión y autorización transversal
                                   │
                         Modo Resultados / Client View
```

Los datos permanecen en sus propietarios; las pantallas consumen vistas o referencias. IA y motores no se trasladan a CSS/UI.

## 4. Extracción modular propuesta, basada en el código existente

**No aprobar una nueva estructura de ficheros sin comprobar importación/carga y pruebas.** Primero mapa de Block_ID y grafo de dependencias; después mover una responsabilidad cada vez.

| Responsabilidad a aislar | Fuente actual | Capa destino lógica | Restricción |
|---|---|---|---|
| Proyecciones de lectura de resultados, estado/vigencia | `results.js` + `output-review.js` | `domain/results` / `ui` transversal (conceptual) | Sin duplicar owner de outputs ni gate |
| Vista PG10 | `results.js` | `pages/diagnosis` (conceptual) | Sin recalcular motor ni cambiar PG10 |
| Modelo/versiones del TO-BE | `results.js`, funciones `tobeHistory`/review/flow | `domain/tobe` (conceptual) | Conservar `e.tobeProposals`, versionado y schema |
| Reglas de edición, proyección, transacciones y deshacer | `results.js`, bloques de proyección y transacción | `domain/tobe` especializado | Sin afectar persistencia/AS-IS |
| Pantalla PG11, inspector, mapa y preview | `results.js`, estilos actuales | `pages/tobe` y componentes `ui` compartidos | Sin crear sistema CSS alternativo |
| Coordinación IA y persistencia de parciales | `internal-ai-pilot.js` | Servicio/controlador especializado, sin manipular DOM dentro del transporte | Mantener checkpoints, cancelación y recovery |
| Comparación PG12 | `results.js` | `pages/comparison` | Sólo consumir versiones y cálculos oficiales |
| PG13/PG14/PG15 | `results.js` y motores backend existentes | Páginas específicas sobre contrato de resultados común | No inventar catálogos, cálculos ni estados |

Estos destinos son **fronteras lógicas**, no rutas finales aprobadas. Una extracción puede mantener durante la transición un adaptador de compatibilidad en `pages/results.js`. No crear ficheros vacíos ni dividir funciones sólo por superar un umbral de líneas.

## 5. Secuencia para ejecutar sin volver a entrar en bucles de 25 minutos

| Fase | Alcance permitido | Resultado verificable | Gate |
|---|---|---|---|
| P0. Baseline | Registrar SHA, Block_ID, dependencias, contratos, pruebas y snapshots FROZEN | Baseline reproducible | Tests actuales y Chromium; no cambios de producción |
| P1. Cierre funcional PG11 | Completar el recorrido consultor: oportunidades vinculadas → preview → edición única → grafo → revisión, en la implementación actual | Un TO-BE completo de dos procesos distintos, persistente y reversible | UAT dirigida; prueba de extremo a extremo y regresión |
| P2. Extracción controlada PG11 | Mover un solo grupo funcional ya validado; actualizar manifiesto, índice de bloques y pruebas | Igual HTML y resultados antes/después; sin cambio semántico | Pruebas de equivalencia + FROZEN + Chromium |
| P3. Resultados transversales | Consolidar componentes/lectores comunes y revisión de fuentes, sin nuevos owners | PG10–PG15 comparten estado, vigencia, evidencia y presentación | Contract tests cruzados |
| P4. PG12–PG15 | Implementación página a página con los motores ya existentes | Comparación, solución, escenarios y entregables sobre versiones | UAT por página y flujo completo |
| P5. Endurecimiento producto | Persistencia viva, permisos y separación por cliente/tenant, despliegue y operativa según decisiones futuras | Evidencia de preparación operativa | Seguridad, migración, restore, auditoría y autorizaciones |

**P1 no depende de P2 para comenzar**; no bloquear cierre funcional PG11 por una refactorización masiva. P2 elimina deuda después de establecer comportamientos correctos que deban conservarse.

## 6. Reglas de modificación y pruebas rápidas

- **Visual:** tokens/componente compartido o layout contextual, prueba visual específica; no ejecutar Ollama.
- **Composición/UX:** módulo de página y helpers compartidos; prueba DOM de la interacción concreta.
- **Transacciones/grafo:** validación determinista, cancelación, confirmar, recargar, deshacer, rutas y AS-IS inmutable.
- **IA:** reintentos, salida vacía, parcial, timeout, obsolescencia, cancelación, preservación de lo correcto y revisión humana.
- **Resultados:** vigencia por hash/snapshot, coherencia PG10→PG15 y estados de publicación, con rechazo de datos obsoletos.
- **Arquitectura:** pruebas de `module-manifest.test.cjs`, `block-id-audit.test.cjs`, `design-system-common.test.cjs`, baselines FROZEN, y recorrido Chromium.
- Ejecutar pruebas dirigidas **antes** del commit; uno o pocos commits coherentes en vez de iterar ciegamente por CI. Ejecutar Acceptance Gate integral sobre el resultado integrado.
- Los workflows `AUNEA Frontend Tests` y `AUNEA Internal V2 REVIEW Acceptance Gate` pueden solaparse en esta rama, ya que el segundo también ejecuta `npm test`; revisar path/branch filters por separado, sin reducir cobertura.
- No declarar PG11 CLOSED o plataforma PRODUCTION a partir de sólo tests unitarios/CI. Requiere UAT visual y flujo real.

## 7. Definición de «fin final» y límites del análisis

**Resultado funcional final:** PG09 produce AS-IS sellado; PG10 diagnóstico sustentado; PG11 TO-BE revisado; PG12 comparación; PG13 solución construible; PG14 alternativas cuantificadas sólo cuando existan datos; PG15 entrega autorizada y recuperable. Todas las superficies usan el mismo diseño, referencias, estados, fuentes y snapshots.

**Resultado técnico final:** componentes visuales compartidos, resultados versionados con owner único, motores backend server-owned, lógica de página aislada, persistencia durable y auditada, UAT reproducible, sin cambios silenciosos en páginas FROZEN.

**Límite explícito:** esta auditoría analiza contratos y código estático en el SHA indicado; no certifica por sí sola calidad UX nativa, Ollama Windows, multiusuario real, seguridad SaaS ni completitud PG12–PG15. Backend SQLite y frontend localStorage están verificados como mecanismos actuales; AUNEA Operations es la persistencia viva objetivo canónica, no un hecho de despliegue constatado.

**No se han redefinido** reglas, preguntas DF, productos, precios, KPI ni fuentes canónicas. **No se ha modificado** código ejecutable, datos de negocio, decisiones o arquitectura oficial. Una promoción arquitectónica posterior requiere decisión y QA propios.
