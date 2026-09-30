# UAT3 — Auditoría funcional integral sobre los tres procesos
Fecha: 30/09/2026 · Estado: REVIEW · Rama única: `reconcile/frontend-v1.0.4-source`

## Alcance y jerarquía de fuentes
Base: Master Index v1.40, PROJECT_RULES.md v1.7, Diagnostic Master v1.2, Simulator CANONICAL v1.14 y DEC-050/065/068 vigentes. La infografía «Flujo completo de AUNEA System» se utiliza como mapa de doce hitos de negocio; DEC-065 gobierna el orden actual visible de Sesión 1: S01 → S02 → S03 → S08 → S04 → S05 → S06 → S07 → S09. No se cambian campos, reglas comerciales ni cálculos mediante esta auditoría.

Los casos de facturas, peticiones unificadas y emails de pedido son **sintéticos, no clientes ni evidencias observadas**. Cada uno crea una empresa, dos contactos, oportunidad, interacción, Engagement, seis pasos, tres fricciones, dos riesgos y dos entradas económicas declaradas. Los resultados automáticos no se introducen a mano.

## Matriz de aceptación de los 12 hitos
| Hito de infografía | Comprobación realizada | Resultado y limitación |
|---|---|---|
| 1–3 CRM | UAT3 crea y enlaza Company, Contacts, Opportunity e Interaction; identidades referenciadas desde el Engagement. | Validado estructuralmente en los tres casos; no confirma CRM de clientes reales. |
| 4 Estudio | Se crea exactamente un Engagement por caso con referencias y se recupera tras recarga. | Validado en jsdom integral y Chromium real. |
| 5 Sesión, contexto y alcance | Clic real de UAT a S01, S02, S03 y S08; comprobación de campos `REQUIRED_90M` con el Diagnostic Master y owner CRM. | Validado en entorno de pruebas; queda pendiente validación factual del cliente. |
| 6 Mapa AS-IS | Seis pasos por caso, rutas afirmativa/alternativa y reconvergencia; navegación horizontal en navegador real. | Validado Chromium en los tres mapas. |
| 7 Fricciones, riesgos e impacto | Tres fricciones y dos riesgos por caso relacionados con pasos; cambio entre cuatro capas; datos económicos declarados no equivalen a ahorro. | Navegación y referencias verificadas; las tres fixtures se enviaron al endpoint real /v1/diagnostic/time-projection: anualización de volumen y tiempos no nulos; las nueve fricciones INCLUDED/BREAKDOWN añaden exactamente cero horas adicionales. Persiste revisión del ciclo declarado DF026 y de claims monetarios. |
| 8 Validación y cierre | Las cuatro confirmaciones generan DF093/snapshot según DEC-065; editar DF021 invalida capas y resultado, preserva el histórico. | Validado con clicks en sesiones UAT aisladas, sin confirmar los expedientes visibles del usuario. |
| 9 Trabajo interno | `buildBackendPayload` consume el mismo Engagement con 6 pasos, 3 fricciones, 2 riesgos y 2 inputs; se mantiene la referencia `RiskInput.step_ids`. | Validado el payload y su contrato Pydantic; **NO** se ha ejecutado /v1/diagnose en cada caso con gates/histórico real confirmados. |
| 10 Vista cliente | `buildSessionSnapshot` no comparte PG01–PG03 ni payload de scoring, precio o coste interno. | Validado estructuralmente; vista HTML final derivada de diagnóstico no declarada validada. |
| 11 Solución asistida | Sin diagnóstico confirmado ni revisión de outputs no corresponde producir recomendación/TO-BE para estos tres casos. | PENDIENTE, sin solución inventada ni AI ficticia. |
| 12 Propuesta y ejecución | Depende de decisión comercial, alcance, entregables y referencias versionadas posteriores. | PENDIENTE, no se crea Project ni propuesta ficticia. |

## Hallazgos concretos y estado
| Clave | Campo / componente | Evidencia | Estado |
|---|---|---|---|
| H01 | DF047 y DF049 | `reusedValue` devuelve la misma concatenación de `inputs+outputs` pese a que las preguntas distinguen fuentes de datos de documentos. El Master diferencia sus objetivos y permite documentos/evidencias. | ABIERTO: resolver en la capa owner/derivación sin clasificar arbitrariamente categorías mixtas como SHEET/EMAIL. |
| H02 | DF028 y DF040 | DF028 es proporción de casos con error; DF040 frecuencia del fallo en cada paso. No se demuestra identidad de universos ni conciliación automática. | ABIERTO: reconciliar población y evidencia, no sumar porcentajes. |
| H03 | DF080/081 vs acciones CHASE/REPORT y tiempos de pasos | El Master dice DERIVE_THEN_VALIDATE; los datos ficticios declaran valores, pero no garantizan que sean tiempo adicional. | ABIERTO: no anualizar ni sumar sin deduplicación por evento/scope. |
| H04 | Risk → ProcessStep → backend | `Risk.step_ids` existía en estudio, pero el adaptador lo omitía y `RiskInput` no lo recibía. DEC-065 aprueba su relación técnica. | **CORREGIDO**: se incluye en frontend y contrato Pydantic, sin alterar Risk Engine ni scoring. Tests de ida/vuelta. |
| H05 | DF026 frente a mapa | Facturas declara 72 h, peticiones 40 h, pedidos 15 h; los tiempos de espera por paso no acreditan todo ese ciclo end-to-end. | ABIERTO: pedir evidencia de colas/ciclo; no forzar que la suma equivalga. |
| H06 | ED12/ED14, DF078/079 | Los gastos atribuibles y tasas/hora son entradas sintéticas; no existe ahorro de caja acreditado. La prueba backend consume los tres JSON y anualiza sin doble conteo de fricciones. | Validada proyección temporal de prueba; NO validado ahorro de caja, ROI ni reconciliación financiera por evento. |

## QA verificable
- Tests de integración con HTML y todos los módulos `module-manifest`: el usuario pulsa Generar, navega nueve pantallas por caso, cuatro capas, recarga, revisa el payload y comprueba que ninguna respuesta requerida queda ausente salvo la confirmación no ejecutada.
- Tres sesiones simuladas independientes confirman explícitamente las cuatro capas según DEC-065 y después modifican DF021: se invalidan las cuatro confirmaciones y el resultado vigente, pero sobrevive el snapshot histórico original.
- Chromium headless real: genera los tres casos, abre cada mapa AS-IS, desplaza horizontalmente, pasa a Fricciones → Riesgos → Impacto sin volver al origen, captura screenshot por expediente y recarga comprobando los tres registros.
- Referencia Chromium PASS con tres mapas y screenshots: run `36705357563`; artefacto `aunea-uat3-chromium-evidence`. El gate de frontend/backend/browser se ejecuta de nuevo tras cada cambio.
- Prueba backend de las tres fixtures JSON frente a `/v1/diagnostic/time-projection`: 78/78 backend PASS en run `36705669312`; los tres volúmenes mensuales se anualizan y todas las fricciones INCLUDED/BREAKDOWN tienen cero horas ADDITIONAL.

## Acceso en el producto
UAT / QA → Fase 3 → Generar los tres casos completos. Cada tarjeta contiene botón para Diagnóstico, Demanda y Mapa AS-IS, además de desplegable «Revisar las nueve páginas de captura». Los hallazgos aparecen dentro de la propia tarjeta. No se necesitan UAT1/2 para crear UAT3; la carga es explícita e idempotente respecto al prefijo UAT3.

## Criterio de cierre pendiente
Antes de afirmar que el negocio completo 1–12 funciona, resolver H01–H03/H05 según fuente canónica, ejecutar el diagnóstico final de backend con evidencia/confirmaciones controladas (time-projection de las tres fixtures ya contrastada), revisar los outputs reales, demostrar Client View/TO-BE/entregables con el mismo snapshot y UAT humana de la sesión. Los gates PASS prueban sólo su alcance declarado, no producción ni ventas.
