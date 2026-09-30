# AUNEA Internal — PREFLIGHT de la implementación end-to-end

Estado: REGISTRO DE ENTRADA — no gobierna reglas de negocio
Fecha: 2026-09-16
Ámbito: reconciliación visual + arquitectura modular + recorrido CRM → Engagement → Sesión 1 → trabajo interno → Sesión 2 → Project

Este documento deja constancia del estado real verificado **antes del primer cambio de código**.
No sustituye ninguna fuente canónica: las referencia.

---

## 1. Base de implementación

| Clave | Valor |
|---|---|
| `IMPLEMENTATION_BASE_BRANCH` | `reconcile/frontend-v1.0.4-source` |
| `IMPLEMENTATION_BASE_SHA` | `cac3031f9151bf54ec39dddda44c749ad5768c41` |
| `VISUAL_SOURCE_BRANCH` | `reconcile/frontend-v1.0.4-source` |
| `VISUAL_SOURCE_SHA` | `cac3031f9151bf54ec39dddda44c749ad5768c41` |
| `RECONCILIATION_STRATEGY` | Fast-forward puro — sin merge, cherry-pick, rebase ni force-push |

### Por qué no había nada que reconciliar

El encargo asumía dos ramas divergentes. La verificación directa demuestra lo contrario:

```
merge-base(cleanup/v2.0.0-core, reconcile/frontend-v1.0.4-source) = 6adc807  ← HEAD de reconcile
merge-base(cleanup/v2.0.0-core, main)                             = 44edbf2  ← HEAD de main
restructure/system-products-tools @ 892e5b9                       → ancestro de cleanup
```

`cleanup/v2.0.0-core @ cac3031` es **descendiente estricto** de las tres referencias. No existe
trabajo exclusivo en ninguna otra rama, por lo que no hay regresión ni funcionalidad que perder.

Operación aplicada:

```
git checkout reconcile/frontend-v1.0.4-source
git merge --ff-only cac3031        # 6adc807 → cac3031
```

`main` permanece intacto en `44edbf2` y no se promociona.

---

## 2. Baseline de calidad registrado antes del primer cambio

| Medida | Valor |
|---|---|
| Tests frontend | **147 / 147 PASS** |
| Tests backend | **39 / 39 PASS** |
| Working tree | limpio |
| Filas en `CODE_BLOCK_INDEX.md` | 80 |
| Módulos JS de runtime | 21 (1.818 líneas) |
| Campos canónicos cargados | 100 · 42 option sets · 9 etapas S01–S09 |

---

## 3. Fuentes canónicas consultadas

Jerarquía aplicada: `DATA → RULES → INTERFACE → DELIVERABLES`.
El código existente nunca prevalece sobre una fuente canónica. Una imagen no inventa semántica.

| Capa | Activo | Versión | Drive ID |
|---|---|---|---|
| DATA | `AUNEA_DIAGNOSTIC_DATABASE_..._DIAGNOSTIC_MASTER_V1.1.xlsx` | v0.9.1 / Master v1.1 | `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1` |
| RULES | `DECISIONES_AUNEA` | v1.12 | `1OU8K48Dh4tEHmZYKDKllujcIxlPk7xKKvsh0LspbBuk` |
| RULES | `PROJECT_RULES.md` | v1.5 | en repositorio |
| RULES | `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL` | v1.2 · `CORE_ARCHITECTURE = PASS` | `1K5jfYePIEU25LYH1KAEgWa8QOEvV9HpgQoGN6pWelyM` (Sheet) |
| GOB | `00_AUNEA_INTERNAL_MASTER_INDEX` | v1.15 | `16ZaNWcBHZ0WoHKH1aizAfrxnAJLeD89O9_ruu5Q1OZ4` |
| INTERFACE | `AUNEA_SYSTEM_SIMULATOR_CANONICAL` | v1.7 | `1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM` |
| INTERFACE | `AUNEA_SYSTEM_90MIN_UI_SPEC_REVIEW_v1` | REVIEW | `1Pc9rOetBnAcP9HwFeNx5ZQ1GI7izAt_fffa5MSbbr5k` |
| INTERFACE | `AUNEA_SYSTEM_90MIN_SCREEN_MATRIX_REVIEW_v1` | REVIEW | `1d7y26tVh_h40R7MwJHvrQSc9fAttetm4epT6eEcR29c` (Sheet) |

Decisiones aplicadas: DEC-005/006/007/008/009/010/021/023/031/032/033/034/040/041/042/043/044/
045/046/047/048/049/050/051/052/053/054/055/056/057/058.

Las versiones de esta tabla son **baseline de entrada**. `RELEASE_MANIFEST.json` registrará las
versiones y SHA vigentes en el momento del cierre, no éstas.

---

## 4. Set visual aprobado

Carpeta Drive `15EJ8rKoOKUlzUCayVqcw-EcINjYCl1hm` — **23 referencias**: 21 de sesión + 2 de CRM.

```
IMG90-00-01 Empresas          IMG90-00-02 Contactos
IMG90-01 Contexto             IMG90-02 Alcance            IMG90-03 Demanda
IMG90-04 A/B/C Mapa AS-IS     IMG90-05 A/B/C Fricciones   IMG90-06 A/B/C Riesgo
IMG90-07 A/B/C Impacto        IMG90-08 A/B/C Objetivo     IMG90-09 A/B/C Cierre
```

A/B/C son **estados de un mismo componente** (vista completa → elemento seleccionado → edición),
no tres pantallas ni tres ficheros. Bajo DEC-056 gobiernan composición, jerarquía, campos visibles,
orden, tipos de control, distribución, estados, relación canvas/inspector, navegación, densidad,
lógica de selección, acciones visibles y lenguaje visual.

**Restricción de acceso registrada:** la política de red del entorno bloquea `drive.google.com`,
por lo que las referencias no se descargan por HTTP. Se obtienen por el conector de Drive y se
decodifican localmente antes de compararlas. El procedimiento queda documentado para que la
comparación sea reproducible y no dependa de memoria.

---

## 5. Contrato de shell derivado de las referencias

Verificado sobre IMG90-00-01, IMG90-00-02 e IMG90-01:

- **Rail izquierdo** verde System, ancho fijo, con marca AUNEA SYSTEM arriba y firma abajo.
  Grupos: contexto CRM (`Inicio` · `Empresas` · `Contactos` · `Proyectos`) → separador →
  `Diagnóstico 90 min` con los nueve pasos numerados → separador →
  `Notas rápidas` · `Recursos` · `Configuración`.
- Con sesión activa, la cabecera del rail se sustituye por la tarjeta «Proyecto seleccionado».
- **Barra superior contextual**: en CRM muestra `CRM · <página>` + buscador global; en sesión
  muestra `Sesión de diagnóstico · 90 min`, el distintivo `Consola interna`, `Paso n de 9` con
  nueve segmentos de progreso y el cronómetro del tramo.
- **Cuerpo a tres zonas**: identificador de pantalla + título + subtítulo; contenido principal;
  columna derecha de inspector/ayuda.
- **Barra de acciones inferior fija**, con la acción destructiva a la izquierda y la primaria a la derecha.
- Campos con etiqueta, marca de obligatoriedad, **chip de procedencia No-Reask**
  («Prerrellenado desde Empresas» / «…desde Contactos») y texto de ayuda.
- Tarjeta `Cobertura` con los chips de rango `DF0xx – DF0yy` y `Stage_ID`: trazabilidad interna,
  nunca visible para cliente.

Identidad visual gobernada por UI Spec §11: fondo `#FAFAF8`, System `#0F3B2E`, salvia `#6FA885`,
superficie `#EAF2ED`, charcoal `#1E1E1E`, gold `#D4AF37` sólo como acento; Sora en titulares e
Inter en cuerpo.

---

## 6. Distancia verificada entre runtime y contrato de arquitectura

| Contrato | Estado en `3_SYSTEM/frontend/` |
|---|---|
| P00 Inicio · P05 Engagements · P06 Proyectos · ADM Admin | existen |
| P01 Empresas | existe **como subpestaña** de Contactos, sin página ni ownership propios |
| P02 Contactos | existe con schema **anterior a DEC-057** |
| P03 Interacciones | **no existe** |
| P04 Oportunidades | **no existe** |
| PG01–PG09 | existen como etapas S01–S09, sin reconciliar contra las referencias |
| Session Display C90-00…04 | **no existe** como superficie; hoy es un filtro de navegación |
| PG10 · PG13 · PG14 · PG15 | existen como Resultados / Recomendación / Escenarios / Propuesta |
| PG11 TO-BE · PG12 comparación | **no existen** |
| Agente IA interno (DEC-052) | **no existe** |
| Modo Resultados (DEC-053) | **no existe** |
| Actuals / Outcomes (DEC-054) | **no existen** |
| Gate de publicación (DEC-055) | **no existe** |
| `RELEASE_MANIFEST.json` · `CHANGELOG.md` | **no existen** |
| TPL Template System | fuera de alcance por contrato (`CLOSED_DEFERRED`) |

**Defecto de integridad detectado.** `removeCompany()` elimina en cascada los contactos de la
empresa y `removeContact()` se presenta como «Archivar» pero elimina el registro. Contradice
DEC-057 («no existe borrado en cascada de histórico») y DEC-055 («los registros relacionados no se
eliminan físicamente desde la UI ordinaria»). Se corrige en la fase de CRM.

---

## 7. Gaps registrados en el PREFLIGHT

| GAP_ID | Dónde | Hallazgo | Bloquea |
|---|---|---|---|
| GAP-01 | `02_HERRAMIENTAS/simulador/README.md` | Apunta al Simulator CANONICAL v1.3 retirado (`1l_Ror…`) mientras `PROJECT_RULES.md` v1.5 ya apunta al vigente v1.7 (`1aPc5B…`) | NO |
| GAP-02 | Screen Matrix `02_INVENTARIO` | Versiones desfasadas: Master Index v1.10 (es v1.15), DECISIONES v1.8 (es v1.12), CANONICAL v1.5 (es v1.7) | NO |
| GAP-03 | Screen Matrix `05_IMAGE_SHOTLIST` + UI Spec §15 | Registran 14 `QA_FAIL` / 7 `QA_PASS_WITH_NOTE`. El Master Index v1.15, posterior, declara ese QA «SUPERADO/NO VÁLIDO por mezcla de versiones» y las referencias se regeneraron el 15–16/09. Gobierna el set actual 23/23 | NO |
| GAP-04 | — | Retirado: no es un gap. Las pantallas sin referencia individual cierran con el sistema visual global (§8) | — |
| GAP-05 | `DRIVE_CLEANUP_RECOMMENDATIONS.md` §1 | El conflicto de versión del Diagnostic Master ya está resuelto en `3c996ba` / `8f33542` / `a38edc1`; la sección quedó obsoleta | NO |
| GAP-06 | Identidad visual | Resuelto: las referencias aprobadas usan la piel System verde. `styles.css` se reconcilia hacia ellas por DEC-056, no por preferencia | NO |
| GAP-07 | Entorno de ejecución | La política de red bloquea `drive.google.com`; las referencias se obtienen por conector y se decodifican localmente | NO |

---

## 8. Regla de cierre visual

- **Pantalla con referencia aprobada** (las 23): fidelidad 1:1 bajo DEC-056, sin rediseño creativo.
  Veredicto `PASS` / `FAIL`.
- **Pantalla sin referencia individual** (Interacciones, Oportunidades, Modo Resultados, PG11/PG12
  y demás): se construye con el sistema visual global de AUNEA System y cierra como
  **`PASS_GLOBAL_VISUAL`**. No queda pendiente ni bloquea la release.

El contrato funcional de esas pantallas sigue siendo canónico: DEC-058 para Interacciones,
DEC-051 para Oportunidades, DEC-053 para Modo Resultados.

---

## 9. Límites de este trabajo

`main` no se toca ni se promociona. No se edita el Diagnostic Master. `DECISIONES_AUNEA` sólo si
aparece una decisión nueva o cambia una vigente. No se inventan campos, preguntas, reglas,
productos, precios, KPIs ni cálculos. No se simula un agente IA sin proveedor gobernado. No se
crea una segunda copia del frontend. No se introduce framework nuevo. Template System queda fuera.
