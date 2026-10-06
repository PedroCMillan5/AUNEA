# AUNEA Internal — Auditoría de suficiencia diagnóstica AS-IS

**Fecha:** 06/10/2026  
**Rama:** `work/as-is-ux-simplification-20260930`  
**Estado:** REVIEW  
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
La captura contiene las dimensiones necesarias, pero **la suficiencia diagnóstica todavía NO está cerrada**. No falta una familia completa de información, pero hay gaps concretos que pueden impedir capturar o utilizar información crítica.

### Estado por bloque
| Bloque | Estado |
|---|---|
| Mapa AS-IS | PASS |
| Fricciones / Pain | PASS estructural / PARTIAL semántico |
| Economics | PARTIAL |
| Riesgo | PARTIAL |
| Estado objetivo / restricciones | PARTIAL |
| Recommendation | PARTIAL |
| Snapshot / Single Owner / No-Reask | PASS conceptual |

## Matriz de suficiencia

| Capacidad diagnóstica | Inputs | Owner | Payload | Consumo real | Estado |
|---|---|---|---|---|---|
| Delimitar proceso | DF011–DF015 | RT_PROCESS | Sí | Contexto + downstream Solution Spec | PASS/PARTIAL |
| Actores/ownership | DF016/017 + actor por paso | Process/Step | Sí | Contexto + Solution Spec | PASS |
| Flujo, decisiones y excepciones | DF031–DF045 | ProcessStep | Sí en _process_steps | Proyección temporal + downstream | PASS |
| Reentrada manual | DF044/051 + P03 | Step/Finding/Friction | Sí | Pain sólo vía Friction | PARTIAL |
| Búsqueda/visibilidad | DF027/044/053 + P09/P14 | Process/Finding/Friction | Sí | Pain vía Friction | GAP ACTIVACIÓN |
| Versionado/documentos | DF019/049/052 + P08 | Process/Finding/Friction | Sí | Pain vía Friction | GAP ACTIVACIÓN |
| Calidad de datos | DF047/048/055 + P13/P03 | Process/Finding/Friction | Sí | Pain vía Friction | GAP ACTIVACIÓN |
| Integración manual | DF034/044/050/054 + P15/P03 | Step/Finding/Friction | Sí | Pain vía Friction | PASS con confirmación |
| Aprobaciones | DF041/067 + P07 | Step/Process/Friction | Sí | Pain + Recommendation | PASS |
| Excepciones ad hoc | DF043/066 + P10 | Step/Process/Friction | Sí | Pain + gate interno | PASS |
| Demanda | DF021/022 | RT_PROCESS | Sí | Backend time-projection | PASS |
| Tiempo activo | DF037 + ED01–08 | Step/EconomicInput | Sí | Economics | PASS/PARTIAL |
| Espera | DF038 + ED13 | Step/EconomicInput | Sí | Economics separado | PASS |
| Retrabajo | DF039/040 + DF060/062 + ED05 | Step/Friction/EconomicInput | Sí | Projection + Economics | PASS |
| Pérdida directa | DF063 + DF082 / ED09–11 | Friction/EconomicInput | Sí | Economics | PASS/PARTIAL |
| Coste herramientas | DF046 + DF083 / ED12 | Process/EconomicInput | Sí | Economics | PASS/PARTIAL |
| Coste capacidad | DF076 / ED14 | EconomicInput | Sí | Economics | PASS |
| Capacidad práctica/productiva | **DF077** | RT_ECONOMIC_INPUT | **No hay atributo equivalente** | No | **GAP REAL** |
| Riesgo | DF068–072 + RiskInput flags | RiskInput | Sí | RiskEngine | PASS/PARTIAL |
| Sensibilidad/irreversibilidad | DF073–075 | RT_PROCESS | Sí | No entra directamente en RiskEngine | PARTIAL |
| Resultado futuro | DF086 | RT_PROCESS | Sí | Solution Spec; no core Recommendation | PASS/PARTIAL |
| No automatizar / IA | DF088 | RT_PROCESS | Sí si visible | Solution Spec | **GAP ACTIVACIÓN** |
| Plataforma/seguridad/cambio | DF089–091 | RT_PROCESS | Sí | 089/090 downstream; 091 contexto | PARTIAL |
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

### P0-03 — DF077 no tiene ruta física completa
Diagnostic Master: DF077 = capacidad práctica/productiva del rol, Write_Target RT_ECONOMIC_INPUT.

Backend EconomicInput no dispone de un atributo equivalente y el builder económico tampoco captura ese concepto.

**Impacto:** el Master declara un input que la implementación no puede representar end-to-end.

## P1

### P1-01 — DF052 llega tarde
DF052 es signal de PG04, pero usa BR-PAIN, que se activa cuando ya existe una fricción. Puede invertirse la secuencia PG04 signal → PG05 friction.

### P1-02 — DF055 puede quedar oculto
BR-DATA depende de DF055 o P13/P03. Si el problema de calidad todavía no se ha convertido en fricción, la propia pregunta puede no aparecer.

### P1-03 — DF053 no usa SEARCH como trigger
Su Reuse_From contempla pasos + acción SEARCH, pero BR-VISIBILITY no comprueba manual_action SEARCH.

### P1-04 — Engine_Consumers no equivale a consumo ejecutable
Los 100 DF declaran Engine_Consumers, pero core diagnose ejecuta:
- PainEngine sobre pain_signals/evidence
- EconomicsEngine sobre economics
- RiskEngine sobre risks
- RecommendationEngine sobre Pain + Risk + 5 gates

questionnaire_answers viaja completo, pero muchos DF son contexto o inputs downstream, no inputs directos de esos cuatro motores.

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

**Resultado:** 20/20 tienen ruta estructural Friction → pain_signal → PainEngine.  
**Condición:** señales PG04 no deben perderse antes de PG05; Pain no se auto-confirma desde ProcessStep.

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

## Orden de cierre
1. Reconciliar BR-RISK.
2. Reconciliar BR-AI / DF088.
3. Resolver contrato DF077.
4. Corregir continuidad DF052/053/055.
5. Reconciliar Engine_Consumers core vs downstream.
6. Ejecutar UAT diagnóstica por capacidades, no por número de campos.

## Criterio final
AUNEA será diagnósticamente suficiente cuando:
- no haya P0 de branching/contrato;
- 20 Pain tengan cobertura UAT;
- Economics tenga ruta completa para inputs aplicables;
- Risk no dependa de preguntas ocultas por su propio branch;
- Recommendation/AI gates tengan trazabilidad explícita;
- la matriz capacidad → input → owner → payload → motor/output no tenga GAP bloqueante.

**Estado actual: SUFICIENCIA DIAGNÓSTICA = PARTIAL / NO CERRADA.**
