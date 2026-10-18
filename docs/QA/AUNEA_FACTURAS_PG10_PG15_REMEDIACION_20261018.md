# AUNEA Internal — Remediación E2E del caso sintético de facturas (18/10/2026)

**Estado:** REVIEW · QA automatizada PASS, UAT integral del negocio PENDING.
**Rama única:** `work/as-is-ux-simplification-20260930`.
**Código verificado (antes de publicar este informe):** `f16349e478b97748e00ec17cfe6b310be7decf13`.
**Acceptance Gate:** [run 39146039085](https://github.com/PedroCMillan5/AUNEA/actions/runs/39146039085): frontend **605/605 PASS**, backend **285/285 PASS** (1 warning externo), navegador **CHROMIUM_UAT_PASS** (un estudio, navegación y recuperación tras refresco).
**Referencia del caso:** paquete adjunto `AUNEA_CASO_REFERENCIA_FACTURAS_E2E_V1(1).zip`, 01 importable, 02 oráculo independiente, 06 payload adaptado, 09 resultados QA, 14 comparación. No se añade un cliente real ni se simula su consentimiento.

## 1. Resultado y origen de los cambios

| Desviación detectada | Corrección verificada en código | Límite de la demostración |
|---|---|---|
| PG10 muestra tres `Hallazgo` indiferenciados | `deliverables.py`, `pdf_export.py`: catálogo REF_PAIN, con fallback a la descripción/rationale capturada; mantiene nombres distintos sin filtrar IDs internos | Rationale no sustituye una ficha causal por paso/evidencia en PG15 |
| PG10 llama trabajo activo a 14,4 h de retrabajo económico | `orchestrator.py` anexa `process_time_projection` al `DiagnosticOutput` usando `session_time.py`; PG10 y PG12 la muestran separada de `EconomicResult` | El input económico registrado puede seguir representando sólo una categoría parcial |
| PG10 muestra 0 h de espera pese a 6.480 caso-horas | PG10/PG12 y entregables muestran espera operativa de fuente temporal backend como `caso-horas`, nunca horas laborales, ahorro o pérdida económica | No equivale a ciclo end-to-end ni a ahorro medible |
| PG12/PG14/PG15 presentan ceros de futuro no documentado | Escenarios sin hipótesis cuantificada indican `Sin hipótesis` / `No calculado`; reducción futura se distingue de duración TO-BE restante. Cotizaciones `BLOCKED` indican `Sin precio autorizado`. | No se inventa TO-BE ni presupuesto, alcance o aprobación |
| PG05 opciones condicionales y confirmaciones | Se restituye acceso explícito a seis controles opcionales; confirmación/deshacer reversibles, candidatos DF053 pendientes y selección persistida sin auto-confirmación | No implica aceptar hallazgos de una empresa real |

## 2. Oráculo reproducible de facturas

La nueva regresión `3_SYSTEM/backend/tests/test_reference_invoice_oracle_pg10_pg15_v1.py` comprueba la regla determinista existente de tiempo para **180 casos/mes**, **seis pasos**, ruta de aprobación **25 %**, **720 min de espera condicional** y retrabajo de **4 min en 10 % de casos**, con fricciones `INCLUDED`/`BREAKDOWN` no aditivas.

| Métrica | Resultado esperado y contrastado |
|---|---:|
| Casos anuales | 2.160 |
| Tiempo activo anual del mapa, ponderado por ruta | 792 h |
| Exposición anual a espera | 6.480 caso-horas |
| Retrabajo anual | 14,4 h |
| Horas adicionales atribuibles a fricciones INCLUDED/BREAKDOWN | 0 h |

La regresión comprueba también que el documento Markdown mantiene los tres nombres de hallazgo, muestra los tres tiempos separados, no expone cero TO-BE ficticio y no cambia `DiagnosticOutput`. Los importables QA originales permanecen **sin confirmaciones ni diagnóstico precargado**.

## 3. Contratos preservados

- `PROJECT_RULES.md`: datos → reglas → interfaz → entregables, fuente única y entregables en español.
- `DEC-034`: solo backend calcula temporalidad, riesgo, economía, recomendaciones y precio; la UI únicamente presenta.
- `DEC-041`: todos los formatos derivan del mismo `DiagnosticOutput`; los entregables no recalculan.
- `DEC-068`: `INCLUDED` y `BREAKDOWN` no añaden de nuevo horas; una fricción tiene un propietario.
- `PG10–PG15` del `AUNEA_SYSTEM_SIMULATOR_CANONICAL`: no transformar un estado `UNKNOWN` o una hipótesis ausente en un cero supuesto.
- No se han añadido `DF001–DF100`, productos, precios, KPIs o capacidades; no se ha modificado `main`.
- Las cuatro responsabilidades nuevas tienen Block_ID rastreado en `CODE_BLOCK_INDEX.md`.
- Cambios técnicos y tests siguen en REVIEW, sin promoción de CANONICAL, PRODUCTION ni FROZEN.

## 4. Pruebas ejecutadas y pendientes

**Automáticas completadas:**
- GitHub Actions 39146039085 con backend/frontend/Chromium PASS en la rama indicada.
- Confirmación de recuperación tras recargar un estudio sintético en Chromium (la UAT existente no cubre PG01–PG15 completos).
- Prueba determinista del oráculo temporal, presentación separada de `EconomicInput`, y control de mutación de salidas.
- Pruebas de PG05 con descubrimiento opcional, información derivada, confirmaciones reversibles y persistencia.

**Pendiente de aceptación integral:**
1. Importar el expediente original en un perfil QA aislado y recorrer PG01–PG09 por interfaz.
2. Medir la sesión real y confirmar el objetivo de 90 minutos.
3. Confirmar las cuatro capas a través de la interfaz sin falsificar estados, validar invalidación/reconfirmación por cambios y sellar snapshot.
4. Reejecutar diagnóstico desde ese snapshot y contrastar todos los hallazgos, causas, evidencias y salidas PG10.
5. Revisar humana y explícitamente un TO-BE PG11, comparar PG12 y definir alcance técnico viable PG13.
6. Validar supuestos y escenarios PG14, y autorizar cualquier cotización solo si el engine la habilita.
7. Completar revisión/aprobación, generación de Client View y entregables PG15 con mismo snapshot autorizado.

**Conclusión:** remediación de las cuatro desviaciones de presentación y de regresiones PG05 implementada, con CI PASS; **no** se declara terminado el diagnóstico completo ni los resultados de un cliente real.
