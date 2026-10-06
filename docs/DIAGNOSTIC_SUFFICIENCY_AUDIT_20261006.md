# AUNEA Internal — Auditoría de suficiencia diagnóstica AS-IS

**Fecha:** 06/10/2026  
**Rama:** `work/as-is-ux-simplification-20260930`  
**Estado:** CLOSED / PASS  
**Objetivo:** demostrar si PG01–PG09 captura exactamente lo necesario para un diagnóstico defendible, sin re-asks ni campos innecesarios.

## Fuentes revisadas
- 00_AUNEA_INTERNAL_MASTER_INDEX v1.46
- PROJECT_RULES.md v1.7
- Diagnostic Master v1.2 / diagnostic-master.min.json
- AUNEA_SYSTEM_SIMULATOR_CANONICAL v1.14
- DEC-050, DEC-052, DEC-065, DEC-068, DEC-070, DEC-071
- engine-adapter.js
- PainEngine, EconomicsEngine, RiskEngine, RecommendationEngine
- SolutionSpecificationEngine

## Conclusión
La suficiencia diagnóstica de PG01–PG09 queda **CERRADA para el contrato canónico vigente**. No quedan gaps bloqueantes de branching, ownership, payload o consumo directo que impidan construir un diagnóstico defendible. La precisión económica y de evidencia puede seguir siendo parcial cuando el cliente no aporta datos suficientes; en esos casos el sistema conserva `NOT_CALCULATED`/evidencia pendiente en lugar de inventar cifras.

### Estado por bloque
| Bloque | Estado |
|---|---|
| Mapa AS-IS | PASS |
| Fricciones / Pain | PASS |
| Economics | PASS — precisión evidence-gated |
| Riesgo | PASS |
| Estado objetivo / restricciones | PASS |
| Recommendation | PASS técnico / trazable |
| Snapshot / Single Owner / No-Reask | PASS |

## Matriz de suficiencia

| Capacidad diagnóstica | Inputs | Owner | Payload | Consumo real | Estado |
|---|---|---|---|---|---|
| Delimitar proceso | DF011–DF015 | RT_PROCESS | Sí | Contexto + downstream Solution Spec | PASS/PARTIAL |
| Actores/ownership | DF016/017 + actor por paso | Process/Step | Sí | Contexto + Solution Spec | PASS |
| Flujo, decisiones y excepciones | DF031–DF045 | ProcessStep | Sí en _process_steps | Proyección temporal + downstream | PASS |
| Reentrada manual | DF044/051 + P03 | Step/Finding/Friction | Sí | Pain vía Friction tras confirmación humana | PASS |
| Búsqueda/visibilidad | DF027/044/053 + P09/P14/P20 | Process/Finding/Friction | Sí | SEARCH reutiliza pasos; Pain vía Friction | PASS |
| Versionado/documentos | DF019/049/052 + P08 | Process/Finding/Friction | Sí | DF052 se habilita con múltiples artefactos; Pain vía Friction | PASS |
| Calidad de datos | DF047/048/055 + P13/P03 | Process/Finding/Friction | Sí | DF055 probe no bloqueante; Pain vía Friction | PASS |
| Integración manual | DF034/044/050/054 + P15/P03 | Step/Finding/Friction | Sí | Pain vía Friction | PASS con confirmación |
| Aprobaciones | DF041/067 + P07 | Step/Process/Friction | Sí | Pain + Recommendation | PASS |
| Excepciones ad hoc | DF043/066 + P10 | Step/Process/Friction | Sí | Pain + gate interno | PASS |
| Demanda | DF021/022 | RT_PROCESS | Sí | Backend time-projection | PASS |
| Tiempo activo | DF037 + ED01–08 | Step/EconomicInput | Sí | Economics | PASS |
| Espera | DF038 + ED13 | Step/EconomicInput | Sí | Economics separado | PASS |
| Retrabajo | DF039/040 + DF060/062 + ED05 | Step/Friction/EconomicInput | Sí | Projection + Economics | PASS |
| Pérdida directa | DF063 + DF082 / ED09–11 | Friction/EconomicInput | Sí | Economics separado | PASS |
| Coste herramientas | DF046 + DF083 / ED12 | Process/EconomicInput | Sí | Economics separado | PASS |
| Coste capacidad | DF076 / ED14 | EconomicInput | Sí | Economics | PASS |
| Capacidad práctica/productiva | DF077 / ED14 | RT_ECONOMIC_INPUT | Sí: role_or_resource + value + unit + period + evidence | Economics payload; soporte de rate/capacity | PASS |
| Riesgo | DF068–072 + RiskInput flags | RiskInput | Sí | RiskEngine | PASS |
| Sensibilidad/irreversibilidad | DF073–075 | RT_PROCESS / RiskInput contextual | Sí | Activa/cualifica captura; RiskEngine consume RiskInput | PASS |
| Resultado futuro | DF086 | RT_PROCESS | Sí | Gate de visibilidad + Solution Spec; no input directo del core Recommendation | PASS |
| No automatizar / IA | DF088 | RT_PROCESS | Sí | Probe no bloqueante + gates/Recommendation downstream | PASS |
| Plataforma/seguridad/cambio | DF089–091 | RT_PROCESS | Sí | downstream/contexto gobernado | PASS |
| Advisory vs tool vs System vs AI | Pain + Risk + 5 gates | Backend/consultor | Sí | RecommendationEngine | PASS técnico |

## P0

### P0-01 — BR-RISK puede ocultar el dato que debería descubrir el riesgo — RESUELTO EN RUNTIME
Runtime auditado originalmente:
`BR-RISK = risks.length > 0 || DF018=4/5 || DF073/DF074/DF090 ya tienen valor`.

DF073, DF074 y DF090 usaban BR-RISK. Si estaban vacíos y no existía riesgo previo ni criticidad alta, podían no aparecer. Era una activación auto-referencial.

**Resolución implementada:** DF073, DF074 y DF090 permanecen disponibles como probes de descubrimiento sin convertirse en REQUIRED_90M. El bloque BR-RISK se activa después por señales materiales canónicas ya capturadas: criticidad alta DF018, restricciones iniciales de seguridad/compliance/residencia/ownership en DF010, impacto no temporal DF064 almacenado en Friction, dato sensible distinto de NONE, reversibilidad distinta de REVERSIBLE, restricción de seguridad DF090 o RiskInput activo. Las respuestas negativas NONE/REVERSIBLE no generan por sí solas un riesgo.

**QA:** regresiones específicas BR-RISK PASS. Suite frontend tras el cambio: 422 tests, 369 PASS, 53 FAIL; coincide con el baseline previo de 53 fallos ya existentes en la rama, por lo que este bloque no añade regresiones nuevas.

**Commits:** `eb190416ad162bcaa727a119f54b2111be531f42`, `2619424d531ab399dfb73f3501baacb3fc1481fe`, `dcd298096b9d1d56a6aaeb61293043731b0e9502`.

### P0-02 — DF088 / BR-AI es auto-referencial — RESUELTO EN RUNTIME
Runtime auditado originalmente:
`BR-AI = DF088 ya tiene valor || DF008 contiene AI/IA`.

La pregunta “¿Qué no debe automatizarse o delegarse a IA?” podía ocultarse si el cliente no mencionaba IA al inicio, aunque después AUNEA valorase automatización o IA.

**Resolución implementada:** el DF088 canónico de S08 (owner `RT_PROCESS.Must_Not_Automate`) permanece disponible como probe de descubrimiento aunque BR-AI todavía sea falso. Sigue siendo `CONDITIONAL_90M`, por lo que su mera visibilidad no lo convierte en obligatorio ni bloquea Readiness. La visibilidad del probe tampoco activa por sí sola BR-AI: se mantiene la separación entre preguntar por el guardrail y afirmar que IA sea adecuada. No se infiere IA sólo por existir documentos, emails u otros artefactos ordinarios.

**QA:** 2 regresiones específicas DF088 PASS. Suite frontend tras el cambio: 424 tests, 371 PASS, 53 FAIL; el baseline previo era 53 FAIL, por lo que este bloque añade 0 regresiones nuevas.

**Commits:** `5823007ac93e200c766725a3827b0215f8664d18`, `cbdce9b51c39d477f72dc4b926aeee126b7e1045`, `23ebaa95313a23d0c2d5cd198098ddeaa5fa583b`, `7e595c26886dece06d56861ac5454fbe3353a6d9`.

### P0-03 — DF077 no tenía ruta física completa — RESUELTO EN RUNTIME
Diagnostic Master: DF077 = capacidad práctica/productiva del rol, Write_Target `RT_ECONOMIC_INPUT`.

**Resolución implementada:** el builder económico ED14 captura el rol/recurso, horas de capacidad práctica, periodo y evidencia; `normalizeEconomicInputs()` conserva `role_or_resource`, `value`, `unit` y `period`; el modelo backend `EconomicInput` acepta esos atributos sin convertir capacidad en ahorro de caja ni inventar porcentaje de utilización. DF076 continúa representando el rate €/h y DF077 su base práctica cuando aplica.

**QA:** captura frontend + roundtrip backend PASS.

## P1

### P1-01 — DF052 llegaba tarde — RESUELTO
DF052 se habilita en S04 cuando el mapa ya contiene múltiples artefactos documentales, o existe señal Pain/valor previo. No se abre todo BR-PAIN por esa causa y sigue siendo `CONDITIONAL_90M`.

### P1-02 — DF055 podía quedar oculto — RESUELTO
DF055 permanece disponible en S04 como probe de descubrimiento no bloqueante. Además BR-DATA reutiliza señales ya capturadas como REKEY/COPY, DF051 y fricciones P03/P13.

### P1-03 — DF053 no usaba SEARCH como trigger — RESUELTO
`manual_action=SEARCH` activa BR-VISIBILITY y DF053 reutiliza directamente los `step_id` correspondientes; también reutiliza pasos afectados por P09/P20.

### P1-04 — Engine_Consumers no equivale a consumo ejecutable — RECONCILIADO
`Engine_Consumers` se interpreta como consumidor semántico/downstream, no como promesa de argumento directo. El contrato ejecutable queda fijado y probado así:
- `PainEngine` consume directamente `pains`, `pain_signals` y `evidence`.
- `EconomicsEngine` consume directamente `economics` (`EconomicInput[]`).
- `RiskEngine` consume directamente `risks` (`RiskInput[]`).
- `RecommendationEngine` consume resultados Pain/Risk + los cinco gates gobernados (`process_design_preconditions_ok`, `existing_tool_can_cover`, `requires_unstructured_ai_assistance`, `requires_bounded_agent_action`, `requires_management_visibility`).
- `questionnaire_answers` y ProcessStep/Finding pueden aportar contexto, trazabilidad, candidatos, gates o consumo downstream sin convertirse por ello en argumentos directos del core engine.

## Cobertura Pain 20/20
| Pain | Fricción | Captura mínima | Estado |
|---|---|---|---|
| P01 | Entrada fragmentada | P01 + señal observable + evidencia | PASS estructural |
| P02 | Información incompleta | P02 + señal observable + evidencia | PASS estructural |
| P03 | Reintroducción manual de datos | P03 + señal observable + evidencia | PASS estructural |
| P04 | Responsabilidad poco clara | P04 + señal observable + evidencia | PASS estructural |
| P05 | Clasificación / routing lento | P05 + señal observable + evidencia | PASS estructural |
| P06 | Incumplimiento de plazos / SLA | P06 + señal observable + evidencia | PASS estructural |
| P07 | Cuello de botella en aprobaciones | P07 + señal observable + evidencia | PASS estructural |
| P08 | Caos de versiones / documentos | P08 + señal observable + evidencia | PASS estructural |
| P09 | Falta de visibilidad | P09 + señal observable + evidencia | PASS estructural |
| P10 | Excepciones gestionadas ad hoc | P10 + señal observable + evidencia | PASS estructural |
| P11 | Errores / retrabajo | P11 + señal observable + evidencia | PASS estructural |
| P12 | Seguimiento dependiente de memoria | P12 + señal observable + evidencia | PASS estructural |
| P13 | Datos inconsistentes | P13 + señal observable + evidencia | PASS estructural |
| P14 | Reporting manual | P14 + señal observable + evidencia | PASS estructural |
| P15 | Herramientas fragmentadas | P15 + señal observable + evidencia | PASS estructural |
| P16 | Falta de trazabilidad / auditoría | P16 + señal observable + evidencia | PASS estructural |
| P17 | Desequilibrio de carga / capacidad | P17 + señal observable + evidencia | PASS estructural |
| P18 | Comunicación al cliente insuficiente | P18 + señal observable + evidencia | PASS estructural |
| P19 | Fuga de coste / pérdida directa | P19 + señal observable + evidencia | PASS estructural |
| P20 | Conocimiento concentrado en personas | P20 + señal observable + evidencia | PASS estructural |

**Resultado:** 20/20 tienen ruta estructural Friction → pain_signal → PainEngine. La continuidad S04→PG05 queda cerrada para búsqueda/visibilidad, versionado y calidad de datos; Pain no se auto-confirma desde ProcessStep y mantiene confirmación/evidencia gobernada.

## Lo que no debe cambiarse
- No hacer CONDITIONAL_90M obligatorio.
- No volver a duplicar ProcessStep/Friction/Risk/Economic en formularios genéricos.
- No crear ED15.
- No inferir Pain en frontend.
- No calcular Economics oficial en frontend.
- No monetizar espera.
- No convertir capacidad en cash saving.
- No introducir CommercialScope en Sesión 1.
- PG09 sigue siendo Confirmar AS-IS.

## Cierre ejecutado
1. BR-RISK reconciliado.
2. BR-AI / DF088 reconciliado.
3. DF077 representado end-to-end en `RT_ECONOMIC_INPUT` / backend.
4. Continuidad DF052/DF053/DF055 corregida.
5. `Engine_Consumers` reconciliado entre consumo core directo y consumo contextual/downstream.
6. QA de suficiencia por capacidades y suite completa ejecutados.

## Criterio final
AUNEA será diagnósticamente suficiente cuando:
- no haya P0 de branching/contrato;
- 20 Pain tengan cobertura UAT;
- Economics tenga ruta completa para inputs aplicables;
- Risk no dependa de preguntas ocultas por su propio branch;
- Recommendation/AI gates tengan trazabilidad explícita;
- la matriz capacidad → input → owner → payload → motor/output no tenga GAP bloqueante.

**QA final:** 464 tests, 464 PASS, 0 FAIL, CI SUCCESS.

**Estado actual: SUFICIENCIA DIAGNÓSTICA = PASS / CERRADA para PG01–PG09 bajo el contrato canónico vigente.**


## Hardening PG09 — validación visible de coherencia

Implementado después del cierre de suficiencia para hacer visible al consultor, antes de sellar DF093, la misma coherencia que el runtime ya exigía internamente.

- PG09 muestra una sección **Validación de coherencia** antes del resumen final.
- **Bloqueante**: capa AS-IS sin confirmar, obligatorio aplicable pendiente o error de integridad Step/Friction/Risk/EconomicInput/campo canónico. Impide confirmar DF093 y ofrece navegación al owner.
- **Revisar**: discrepancia entre un valor reutilizado y su fuente propietaria, proyección temporal obsoleta o evidencia pendiente. Se muestra explícitamente, pero no se convierte artificialmente en obligatorio.
- **Información**: cuando no existe ningún hallazgo, se informa de que no se detectan incoherencias estructurales.
- `confirmClosingAsIs()` consume exactamente `preCloseConsistencyReview()`: la UI y el gate de cierre no mantienen dos reglas distintas.
- No se añade ningún DF, no se crea un segundo owner, no se persisten overrides y no se modifica Pain/Economics/Risk/Recommendation.
- Regresión añadida en `process-lifecycle-v1.test.cjs` y Block_ID `AUNEA-FE-ASIS-CONSISTENCY-076`.

Estado: **IMPLEMENTADO EN REVIEW**. La promoción a main mantiene los gates existentes de la rama.
