# AUNEA Internal — F0 · Inventario, propietarios, consumidores y riesgos

**Fecha de corte:** 13/11/2026. **Rama:** `work/as-is-ux-simplification-20260930`. **Referencia técnica de la auditoría:** `d26cb0337ea21c2fa715c3c0944ce7ff4b78d8a6` (los siguientes commits añaden documentación).  
**Estado: F0 CERRADA — INVENTARIO REPRODUCIBLE PASS (13/11/2026).** El workflow `.github/workflows/aunea-f0-inventory.yml` ha publicado el JSON verificado en `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json`. Este cierre es del inventario F0; **no acredita** pruebas funcionales, UAT visual ni cierre F1–F6.

## A. Fuentes verificadas
- `00_AUNEA_INTERNAL_MASTER_INDEX` (Drive, v1.59), `PROJECT_RULES.md` (v1.7), `DECISIONES_AUNEA` (v1.34), `AUNEA_SYSTEM_SIMULATOR_CANONICAL` (v1.14), `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7`.
- GitHub: `module-manifest.json`, `index.html`, `FROZEN_PAGES.json`, `CODE_BLOCK_INDEX.md`, CSS, los 46 módulos JS manifestados y las 49 rutas simples de backend registradas en el índice.
- **Precedencia:** fuentes canónicas de datos y decisiones → reglas → UI → entregables. El backend y los owners de dominio no pueden reemplazarse por lógica en vistas.
- Las 512 filas de `CODE_BLOCK_INDEX.md` corresponden a 512 Block_ID diferentes. El campo Archivo combina a veces varios archivos o texto de retirada; no tratar cada celda como una ruta física.

### Inventario total de checkout (F0 CI PASS)

| Cobertura | Recuento |
|---|---:|
| Archivos activos | **336** |
| Archivos archivados | **13** |
| Archivos bajo frontend / backend | **167 / 86** |
| Workflows `.github/workflows` | **5** |
| Tests frontend / backend | **82 / 42** |
| IDs indexados / rutas normalizadas | **512 / 172** |
| Referencias léxicas entre módulos | **924** (heurísticas; no call graph ejecutado) |
| Clases CSS únicas rastreadas | **1.083** |
| Clases presentes en ambos CSS | **107** (no equivale a duplicación) |
| Clases sin consumidor textual identificado | **197** (pueden utilizarse en HTML o dinámicamente) |

**Trazabilidad:** [Inventario F0 ejecutado](../docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json) y workflow `AUNEA F0 Inventory`. Los conteos del grafo CSS se obtienen mediante análisis léxico, sin ejecución del DOM.

## B. Línea base del runtime vigente

| Métrica | Resultado | Evidencia/alcance |
|---|---:|---|
| Módulos JS en manifiesto | **46** | `module-manifest.json` y `index.html` |
| Líneas JS de esos 46 módulos | **17.527** | lectura de archivos, `split("\\n").length`, incluye blancos/comentarios |
| Líneas CSS compartido `styles.css` | **305** | lectura del archivo |
| Líneas CSS de layout `ui-system.css` | **5.028** | lectura del archivo |
| JS + los dos CSS | **22.860** | no incluye backend, HTML ni pruebas |
| Archivos Python de paquete backend referenciados | **33** | índice técnico; no confundir con toda la carpeta |
| Líneas de esos 33 archivos Python | **7.445** | lectura de los archivos indexados |
| Otras rutas backend simples del índice | **16** | 13 pruebas y 3 archivos de configuración/script |
| Bloques de reglas analizados en `ui-system.css` | **2.672** | parser de llaves/contextos |
| Grupos de selectores repetidos en el mismo contexto | **123** | 136 apariciones adicionales; **NO equivalen a 136 errores** |
| Atributos `style="` en los 46 JS | **35** | búsqueda literal, incluye páginas FROZEN/UAT |
| Páginas FROZEN | **9** | `FROZEN_PAGES.json` v10 |
| Snapshots FROZEN distintos verificados accesibles | **13/13** | comprobación individual de ruta |
| Block_ID registrados | **512** | 512 únicos |
| Celdas Archivo compuestas/multirruta o descriptivas | **24** | requieren normalización documental antes de automatizar ownership |

**Inventario del árbol completo ahora acreditado por ejecución CI:** **336 archivos activos y 13 archivados**, excluyendo `node_modules`, temporales y carpetas ignoradas. Se localizaron 167 archivos bajo frontend, 86 bajo backend y 5 workflows. El informe computa 82 pruebas frontend `.test.cjs` y 42 pruebas backend `test_*.py`. Esos recuentos son del checkout real, no del índice Block_ID. El script clasifica ARCHIVED en `3_SYSTEM/99_ARCHIVO_TECNICO` y carpetas archivadas.

### Módulos mayores y acoplamiento detectado
| Archivo | Líneas | Indicadores observados | Destino de trabajo |
|---|---:|---|---|
| `domain/process.js` | 2.081 | 91 funciones y 277 referencias DOM (medida heurística) | F4: separar modelo/flujo de UI sólo tras mapear consumidores |
| `pages/tobe.js` | 2.058 | 58 funciones, 19 referencias `latestTobe` | F3: separar composición sin alterar datos |
| `domain/internal-ai-pilot.js` | 1.576 | 45 funciones, 55 referencias DOM, 42 `latestTobe` | F4: orquestación vs presentación |
| `pages/results.js` | 871 | 37 funciones, 0 estilos inline | F2/F3: vistas y componentes |
| `ui/renderer.js` | 784 | 57 funciones, 185 referencias DOM | F2: componentes compartidos |
| `pages/internal-work-events.js` | 730 | 22 registros `addEventListener` textuales, 24 `saveState` | F3: mantener evento/acción en owner único |
| `core/state.js` | 671 | 67 funciones, 123 referencias DOM | F4: acoplamiento UI/estado |
| `domain/analysis-workbench.js` | 661 | vista/asistencia sobre fuentes | F4, solo con pruebas de equivalencia |
| `domain/tobe-transactions.js` | 586 | owner de transacción/undo; 4 `saveState` | PROTEGER invariantes |
| `pages/tobe-global.js` | 492 | proyección global IA read-only | No duplicar IA en vistas |

Los indicadores DOM cuentan menciones de `document.`, `querySelector` o `addEventListener(`; no constituyen automáticamente incidencias.

## C. Ownership y rutas consumidoras relevantes

| Responsabilidad | Fuente propietaria | Consumidores clave | Límite del refactor |
|---|---|---|---|
| Datos canónicos, DF001–100, relaciones | Diagnostic Master + propietarios de datos | servicios/schema, páginas de captura, engines | no añadir ni duplicar captura |
| Snapshots AS-IS y versionado | `domain/session-snapshot.js`, ciclo de proceso | Diagnóstico, PG10, TO-BE, backend | mantener inmutabilidad histórica |
| Cálculos oficiales y reglas | `3_SYSTEM/backend/aunea_backend/` | `services/engine-adapter.js`, `pages/results.js`, `pages/tobe-global.js` | no mover cálculos al frontend |
| Versiones TO-BE y validación | `domain/tobe-model.js`, `domain/tobe-transactions.js` | `pages/tobe.js`, `pages/internal-work-events.js` | previews/confirmación/undo se mantienen |
| IA de apoyo | `domain/internal-ai-pilot.js` + backend IA | `pages/tobe-global.js`, actividad TO-BE | IA nunca aprueba sola |
| Estado local y persistencia | `core/state.js`, `services/persistence.js` | páginas, eventos, UAT | no múltiples writers paralelos |
| Controles y estilos generales | `styles.css` + `ui/renderer.js` | vistas que utilicen `aunea-ui-*` | propiedad compartida única |
| Layout y excepciones visuales | `ui-system.css` | pantallas específicas y FROZEN | analizar cascada, responsive y selectores |
| Navegación y acciones de interfaz | `ui/shell.js`, `pages/internal-work-events.js` | registro de páginas, PG10/PG11 | no duplicar listeners |
| Visualización de resultados | `pages/results.js` | PG10 y resultados posteriores | sólo proyección, no nuevo engine |

**Contrato de carga:** 46 scripts clásicos `defer` comparten el ámbito global y están ordenados por manifiesto. Una extracción exige preservar orden e invariantes. La auditoría de consumidores de CSS es **heurística**: ausencia de referencia textual no prueba código muerto; también hay HTML, clases dinámicas y snapshots.

## D. Clasificación de CSS: investigación, NO borrado

- Prioridad F1: `.topbar`, `.topbar-right`, `.topbar-left`, `.aunea-select` y `.aunea-select-menu`; intervienen superficies globales o FROZEN. No modificar sin comparar computed styles en pantallas afectadas.
- Prioridad F1/TO-BE: `.tobe-alternative-dialog`, `.tobe-inspector`, `.tobe-ai-row-actions`, `.pg10-review-actions`. Resolver especificidad, contexto y media queries antes de fusionar.
- Prioridad F2: títulos, botones, inputs, tarjetas y modales con apariencia equivalente; reutilizar owner existente (`styles.css` + `ui/renderer.js`), sin imponer una estructura única a comportamientos diferentes.
- `aunea-ui-work-surface`, `aunea-ui-work-stage` y `aunea-ui-work-disclosure` ya disponen de owner compartido; proteger sus consumidores.

## E. FROZEN y límites de intervención
Pantallas bloqueadas: **Inicio, Empresas, Contactos, Interacciones, Oportunidades, Estudios, Contexto y objetivos, Alcance del proceso, Estado objetivo y restricciones**. `FROZEN_PAGES.json` v10; **13 archivos de snapshot** accesibles. No modificar código ni estilo que altere su presentación sin reapertura explícita. Los estilos transversales requieren prueba visual contra estos snapshots aunque el selector modificado parezca general.

## F. Matriz de riesgo con gates de entrada a F1–F6

| Riesgo | Severidad | Control previo |
|---|---|---|
| Regresión en pantallas FROZEN por CSS global | CRÍTICO | tests FROZEN y capturas comparables; no refactor visual sin PASS |
| Cambio involuntario de orden global de scripts | CRÍTICO | `module-manifest.test.cjs`, validación HTML↔manifest |
| Mutación de snapshot o output server-owned | CRÍTICO | tests de ownership, `tobe-transactions`, recuperación/undo |
| Duplicar listeners o acciones al separar UI | ALTO | UAT de eventos PG10/PG11 en navegador |
| Eliminar override CSS legítimo | ALTO | contexto selector, especificidad, media, imágenes antes/después |
| Desacoplar IA sin preservar estados parciales | ALTO | UAT Ollama/proveedores, respuestas vacías, errores y persistencia |
| Romper tests atados a cadenas fuente | ALTO | revisar `pg11-source.cjs` y tests de source-oracle |
| Confundir archivo archivado con runtime | MEDIO | inventario de árbol con `archived` y manifiesto |
| Confundir celdas del índice compuestas con rutas | MEDIO | normalizar propietarios del índice sólo cuando proceda |
| Fusionar rama con main muy divergente | ALTO | reconciliación controlada y gates; no merge automático |

## G. Gates y estado

- **Hecho:** lectura de fuentes canónicas; inventario manifestado JS completo; lectura de 49 rutas backend indexadas; CSS escaneado; propietarios clave; matriz de riesgos; FROZEN 9 páginas / 13 snapshots verificados.
- **Automatizado y publicado:** `tools/aunea-f0-audit.cjs` (inventario integral + dependencias léxicas + candidatos CSS) y `.github/workflows/aunea-f0-inventory.yml` (Node 22, chequeos y artefacto `aunea-f0-inventory`).
- **Verificación CI acreditada:** existe el archivo `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json` generado por el workflow de F0; `status=STATIC_INVENTORY_GENERATED`, `errors=[]`, `warnings=[]`, `runtimeModules=46`, `frozenPages=9`. Los 13 snapshots FROZEN no presentan faltantes. El job valida esos campos antes de persistir el artefacto en GitHub. **Gate F0 PASS**. No confundirlo con los gates funcionales F6.
- **F1–F6:** permanecen abiertos; nadie puede declarar equivalencia de UI únicamente por estas métricas.

## H. Reproducción y cierre del gate F0

Desde raíz de checkout de la rama:

```bash
node tools/aunea-f0-audit.cjs > f0-inventory.json
node -e "const r=require('./f0-inventory.json'); if(r.errors.length||r.counts.runtimeModules!==46||r.counts.frozenPages!==9) process.exit(1); console.log(r.counts)"
```

**Gate F0 cumplido:** JSON publicado en `docs/audit/AUNEA_INTERNAL_F0_INVENTORY.json`, 336 activos/13 archivados, 46 scripts, 512 Block_ID, 9 FROZEN, cero errores y sin snapshots faltantes. El inventario muestra 924 referencias léxicas entre módulos, 2 nombres de funciones duplicados dentro de `ui/renderer.js` y 107 clases CSS presentes en ambos estilos; son **candidatos a inspección**, no defectos confirmados. Hay 197 clases sin consumidor detectado por el barrido heurístico, incluidas clases presentes en HTML: no eliminarlas sin verificar DOM y usos dinámicos. La ejecución de `npm test`, `pytest` y navegador sigue perteneciendo a estabilización/F6.
