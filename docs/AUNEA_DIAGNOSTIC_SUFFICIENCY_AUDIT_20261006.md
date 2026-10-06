# AUNEA Internal — Auditoría de suficiencia diagnóstica AS-IS

Fecha: 06/10/2026  
Estado: REVIEW  
Rama: `work/as-is-ux-simplification-20260930`

## Fuentes
Master Index v1.46, PROJECT_RULES v1.7, Diagnostic Master v1.2 CANONICAL, MAP_QUESTION_ENGINE_INPUT, Simulator CANONICAL v1.14, DEC-034/050/052/065/068/070/071 y runtime actual.

## Conclusión
La captura canónica es suficiente en diseño, pero la implementación actual no consume todavía toda esa suficiencia.

El Diagnostic Master define 55 inputs de engine:
- 20 Pain
- 10 Economics
- 14 Recommendation
- 7 Risk
- 4 Governance

Los 100 DF tienen Engine_Consumers. El frontend transporta answers, ProcessSteps, Frictions, EconomicInputs, RiskInputs, evidence y cinco gates internos.

El gap aparece después de la captura.

### P0-1 — InputCoverageEngine no está implementado
El Diagnostic Master declara InputCoverageEngine para comprobar requiredness, branches, gaps e input confidence y exige: "No critical engine input without source".

En backend no existe actualmente InputCoverageEngine.

`canonicalMissingRequired()` no es equivalente: controla REQUIRED_90M y cierre AS-IS, pero correctamente no obliga CONDITIONAL_90M y tampoco demuestra que cada input CRITICAL/MATERIAL activado para un engine tenga fuente suficiente.

### P0-2 — Pain discovery depende de una Friction ya creada
PainEngine consume `pains`, `pain_signals` y `evidence`.

El adapter crea `pain_signals` sólo desde Friction activa usando:
- friction_type
- observable_signal
- evidence_type

No usa directamente para descubrir candidatos el conjunto canónico de process scope, volumen, pasos, tiempos, acciones manuales, DF051–DF055, etc.

Consecuencia: AUNEA puede diagnosticar una fricción ya identificada, pero aún no demuestra que descubrirá consistentemente una fricción material a partir del mapa.

### P0-3 — RecommendationEngine no consume todos los IN-R
Sí consume de forma efectiva:
- confirmed pains
- process-design-first gate
- existing-tool-can-close gate
- management visibility gate
- unstructured interpretation gate
- bounded action gate

No tiene ruta equivalente demostrable para varios inputs canónicos, entre ellos:
- desired outcome
- must keep
- must not automate como límite explícito
- platform/security constraints
- change constraints
- deterministic rules
- exception complexity
- human oversight como gate independiente

Los datos viajan en questionnaire_answers, pero el motor de recomendación no los usa directamente.

### P0-4 — Risk context se reduce
RiskEngine consume RiskInput estructurado y clasifica correctamente categoría/probabilidad/impacto/reversibilidad/sensibilidad/materialidad/criticidad/controls_present.

Pero parte del contexto canónico no llega como input independiente del motor:
- criticidad global del proceso
- detalle de controles
- seguridad
- aprobación humana requerida

No hace falta preguntar más: hace falta conservar/usar el contexto ya capturado o marcar gap cuando la regla lo exija.

### P0-5 — Economics suma bien, pero no prueba cobertura
EconomicsEngine agrega EconomicInput, separa activo/espera/caja y bloquea solapamientos.

La proyección temporal backend reutiliza parte de volumen/pasos/fricciones.

Falta una capa de cobertura que diga:
- qué mecanismos aplicables están cuantificados
- cuáles no
- qué evidencia falta
- si COMPLETE significa realmente cobertura suficiente o sólo "hay filas EconomicInput"

## Estado por capacidad

| Capacidad | Estado |
|---|---|
| Delimitar proceso | PARTIAL |
| Volumen/cadencia | PARTIAL |
| Pasos/actor/tipo | PARTIAL |
| Trabajo activo/espera/retrabajo | PASS/PARTIAL |
| Descubrir pains desde mapa/señales | GAP |
| Confirmar pain desde Friction+evidence | PASS |
| Economics agregado | PASS |
| Economics coverage | GAP |
| RiskInput estructural | PASS |
| Contexto crítico de Risk | PARTIAL |
| Recommendation pains/capabilities | PASS |
| Recommendation constraints/outcome | GAP/PARTIAL |
| AS-IS confirmado | PASS |
| Missing information / evidence-to-request integrales | GAP |
| Prioridad cliente separada de severity | PASS |

## Qué NO hacer
- No añadir preguntas nuevas.
- No convertir CONDITIONAL_90M en obligatorio global.
- No duplicar ProcessStep/Friction/Risk/EconomicInput.
- No mover lógica de engine al frontend.
- No usar los cinco gates como sustituto de toda la matriz canónica.
- No declarar diagnóstico completo sólo porque canonicalMissingRequired=[].

## Plan de cierre
1. Implementar InputCoverage server-owned desde MAP_QUESTION_ENGINE_INPUT.
2. Reconciliar Pain discovery: señales del mapa → candidatos dirigidos → confirmación de Friction → PainEngine.
3. Reconciliar los 14 IN-R: captura → input/gate normalizado → RecommendationEngine.
4. Reconciliar IN-K críticos en Risk.
5. Añadir cobertura económica sin cambiar fórmulas.
6. Validar con casos por familia diagnóstica: capture → payload → engine → output.

## Criterio final
La Sesión 1 será suficiente cuando:
- REQUIRED_90M esté completo;
- AS-IS esté confirmado;
- no haya CRITICAL gaps aplicables;
- pains materiales tengan señal/fricción/evidencia;
- economics explicite cobertura;
- risk tenga inputs críticos aplicables;
- recommendation tenga IN-R críticos resueltos o indique further discovery;
- ningún unknown se convierta en 0/NO;
- cada output sea trazable al snapshot.

No se modifica el Diagnostic Master ni TO-BE en esta auditoría.
