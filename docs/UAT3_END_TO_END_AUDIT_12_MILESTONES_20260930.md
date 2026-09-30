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
| H01 | DF047 y DF049 | La copia idéntica `inputs+outputs` se sustituyó por proyecciones diferenciadas del mismo ProcessStep: entradas/orígenes e información estructurada para DF047; artefactos documentales de entradas/salidas para DF049. Tipos como PDF, email y Excel pueden coincidir legítimamente. | MITIGACIÓN VERIFICADA en tres casos; permanece REVIEW la identificación individual/adjuntos y uso real de artefactos mixtos. No se inventan nuevas preguntas ni evidencias. |
| H02 | DF028 y DF040 | Demanda presenta la tasa global declarada junto a cada DF040 de pasos vigentes, aclara que los casos pueden solaparse y no calcula su suma. Cambiar un DF040 no reemplaza la declaración global. | DIFERENCIACIÓN/PROPAGACIÓN VERIFICADA; conciliación de población/evidencia permanece REVIEW hasta datos de incidencia únicos. |
| H03 | DF080/081 vs acciones CHASE/REPORT y tiempos de pasos | En S07 la UI muestra los pasos y fricciones que ya contienen estos trabajos; UAT3 presenta los valores concretos de cada caso junto al contexto. No se trasladan automáticamente a EconomicInput ni se les atribuye ahorro. | MITIGACIÓN VISIBLE Y PROBADA; reconciliación de ámbito/evidencia antes de cualquier suma permanece REVIEW. |
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

## Bloque 2 — Captura única y propagación, 30/09/2026
Fuente de contraste: los tres JSON UAT3, Diagnostic Master v1.2 y DEC-050/065. Se comprueba con el runtime de todos los módulos que cada estudio conserva su Company/Contact ID y la corrección de DF001 escribe al owner Company. Añadir una entrada API en el primer paso altera DF047 automáticamente sin introducir otra respuesta DF047 editable; DF049 deriva solamente tipos documentales realmente presentes en el mapa. Cambiar el porcentaje de error de un paso actualiza la comparación contextual en Demanda sin sustituir DF028 ni simular una tasa global.

| Expediente | DF047 Fuentes (derivado) | DF049 Documentos (derivado) | DF028 declarado | DF040 relevantes |
|---|---|---|---:|---|
| Facturas | EMAIL, PDF, MASTER_DATA, RECORD | EMAIL, PDF, DOC | 8 % | Validar: 8 %; cotejar: 6 % |
| Peticiones unificadas | EMAIL, FORM, TEXT, RECORD | EMAIL, FORM, TEXT | 18 % | Completar requisitos: 18 % |
| Tickets desde email | EMAIL, PDF, SHEET, RECORD, MASTER_DATA | EMAIL, PDF, SHEET | 11 % | Extraer: 11 %; crear ticket: 7 % |

Un artefacto puede aparecer legítimamente en ambas vistas; el objetivo no es una partición excluyente sino **dos finalidades canónicas distintas**. Los códigos del catálogo OS_ARTIFACT_TYPE no representan instancias individuales, origen documental ni adjuntos vinculados; no se declara que H01 esté resuelto para todos los documentos reales. DF028 y DF040 no comparten forzosamente denominador, y una suma de errores por paso podría contar un mismo caso más de una vez: no se fabrica reconciliación ni porcentaje derivado. Se mantiene PG03 en REVIEW, sin modificar su composición FROZEN/otras pantallas ni reglas económicas del Bloque 3.

QA dirigida: nueva prueba del runtime para los tres expedientes que inspecciona las dos proyecciones, los tres DF028, la actualización al cambiar datos de paso y write-through DF001. Gate y captura navegador se consignan sólo tras confirmar el estado final del commit.

## Bloque 3 — Fricciones, riesgos e impacto · 30/09/2026

Se audita contra Diagnostic Master v1.2, Simulator CANONICAL v1.14 y DEC-033/050/065/068. No se modifica el Economics Engine ni se introducen reglas o porcentajes nuevos. Los tres JSON de UAT3 se envían al endpoint REAL de proyección temporal con las seis etapas y las tres fricciones originales de cada uno. A diferencia de la comprobación inicial (no nulo), se contrastan valores numéricos exactos calculados independientemente.

| Caso sintético | Casos/año | Activo de pasos (h/año) | Exposición a espera (h/año) | Retrabajo ponderado, desglose (h/año) | Fricción adicional (h/año) | DF026 declarado (elapsed) |
|---|---:|---:|---:|---:|---:|---|
| Facturas | 1.920 | 848,00 | 10.560,00 | 54,40 | 0 | 72 h |
| Peticiones unificadas | 1.320 | 698,50 | 5.280,00 | 27,72 | 0 | 40 h |
| Tickets desde email | 3.720 | 1.485,52 | 6.435,60 | 75,64 | 0 | 15 h |

**Interpretación obligatoria:** `annual_total_active_hours` contiene trabajo activo base más fricciones `ADDITIONAL` acreditadas, NO añade de nuevo el retrabajo (es un desglose). Las esperas son exposición acumulada por paso y jamás se identifican con tiempo transcurrido end-to-end DF026 ni con coste de trabajo activo. Los tres ejemplos incluyen únicamente relaciones `INCLUDED`/`BREAKDOWN`; las nueve fricciones no generan horas nuevas. Una fricción puede relacionarse con varios pasos pero sólo un propietario temporal cuenta su evento.

### Trazabilidad y dinero
- Los seis riesgos de los tres ejemplos mantienen `step_ids` en el Engagement y en `RiskInput` del backend, sin alterar su scoring. Las nueve fricciones conservan `affected_steps` y `time_attribution.step_id`, que pertenece a sus pasos afectados.
- DF080/DF081 se muestran como declaración sintética y con contexto derivado de los pasos `CHASE`/`REPORT` y fricciones ya capturadas; no se convierten automáticamente en horas `ADDITIONAL`, ahorro o cash saving. La superposición de poblaciones/eventos H03 sigue necesitando evidencia antes de monetizarse.
- ED14 tarifa/hora de escenario: 26 €/h (facturas), 24 €/h (peticiones), 23 €/h (tickets). ED12 coste atribuible de herramientas declarado: 960 €/año, 720 €/año, 1.080 €/año respectivamente. Son declaraciones SINTÉTICAS separadas, sin `annual_active_hours` monetizados ni beneficio, y no se presume eliminable el coste de software.
- Prueba de duplicación de pérdida monetaria sin identidad de evento: el backend detecta el solapamiento `EAR-006/012` y no acepta sumar dos entradas como pérdida acreditada. DF063/DF082 permanecen sujetos a conciliación económica específica.
- H05 continúa ABIERTO: 72/40/15 h declaradas no se sustituyen por la suma de esperas del grafo. Faltan datos observados de cola, concurrencia y distribución de casos para reconciliar duración de ciclo. **No hay ROI ni ahorro de caja validado.**

### Resultado de aceptación del Bloque 3
La QA dirigida ejecuta el mismo frontend runtime con las tres empresas/estudios, verifica los avisos visibles DF080/DF081, trazabilidad de Risk y que EconomicInput no contiene ahorros inventados. El backend contrasta valores exactos de proyección y las tres entradas ED12/ED14 de escenario y detecta una pérdida monetaria duplicada artificial de control. Permanecen pendientes de evidencia empresarial H03/H05 y la monetización oficial; no son un PASS de diagnóstico final ni cierre de PG09. No se inicia Bloque 4 con este trabajo.
