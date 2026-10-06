# P0-B · Pain discovery — REVIEW

Fecha: 06/10/2026

Implementación cerrada en esta rama:

- `PainCandidateEngine` server-owned.
- Endpoint `POST /v1/diagnostic/pain-candidates`.
- La detección produce únicamente `DERIVE_CANDIDATE`; nunca crea ni confirma Friction/Pain.
- En Fricciones aparece `Revisar posibles fricciones`.
- Una candidata abre el builder existente con tipo y pasos preseleccionados.
- Señal observable, causa y evidencia siguen siendo obligatorias antes de guardar.
- Las candidatas ya cubiertas por una Friction existente no deben convertirse en una segunda copia editable.
- La ausencia de candidata no equivale a `NOT_DETECTED`.

Familias con señales estructuradas conservadoras implementadas:
P01, P03, P05, P06, P07, P08, P09, P10, P11, P12, P13, P14, P15 y P19.

No se han añadido preguntas DF ni reglas de confirmación automática.

Pendiente tras P0-B:
P0-C Recommendation, P0-D Risk context, P0-E Economics coverage y UAT nativa.
