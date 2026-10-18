# AUNEA Internal — ejecución del ciclo datos → diagnóstico → resultados (18/10/2026)
**Estado: REVIEW. No es cierre CANONICAL ni certificación de fiabilidad.**

## Fuente de verdad
- Master Index Drive v1.58; PROJECT_RULES.md v1.7.
- Diagnostic Master v1.2; DECISIONES_AUNEA v1.34 (DEC-050, DEC-065, DEC-068, DEC-070/071/072/073).
- Simulator CANONICAL v1.14: PG10 Diagnóstico, PG11 TO-BE, PG12 comparación, PG13 solución, PG14 escenarios/business case, PG15 entregables.
- GitHub rama `work/as-is-ux-simplification-20260930`, sin modificar `main`.

## Matriz de cierre
- 100/100 campos vigentes inventariados con captura, propietario, fuente de reutilización, consumidores y contribución PG10–PG15 (la contribución es mapeo analítico REVIEW, **no** trazabilidad individual comprobada).
- 55/55 entradas de cobertura enlazadas; 78 DF aparecen como fuente explícita, 22 no aparecen directamente. No clasificar automáticamente esos 22 como innecesarios.
- 38 alternativas evaluadas fuera de los 100 DF: 10 no son preguntas universales, 6 ya son atributos/controles existentes, 6 son evidencias condicionales, 7 son diseño posterior, 9 permanecen como posibles requisitos condicionales. **No se han aprobado campos nuevos ni retiradas.**
- Fichero de referencia de esta revisión: `docs/QA/AUNEA_DF001_DF100_RESULTADO_A_CAMPO_REVIEW_20261018.csv`.
- La referencia exhaustiva de decisiones sobre los 38 candidatos se guarda en el paquete de trabajo QA de este cierre, pendiente de decisión de gobierno.

## Correcciones ya aplicadas en esta rama
1. `input_coverage.py` [AUNEA-BE-COVERAGE-SUFFICIENCY-016]: exige fuentes conjuntas para IN-P-01/02/03, IN-E-01/09, IN-R-03. Un campo alternativo aislado no sustituye trigger+outcome, volumen+periodo, pasos completos, evidencia económica o estado objetivo.
2. `models.py`: `EconomicInput.evidence_type` tiene valor por defecto `None`, no `CLIENT_DECLARED`; el frontend ya dispone de normalizador que solo transmite evidencia conocida.
3. `deliverables.py` [AUNEA-BE-PG15-PUBLICATION-GATE-011]: una cobertura PARTIAL/BLOCKED/NOT_EVALUATED no puede marcar el paquete `READY`. El estado DRAFT **no significa** aprobación o publicación.
4. `process-lifecycle.js` [AUNEA-FE-ASIS-SCOPE-079]: comparación transparente de alcance y mapa, solicitud explícita de revisión humana y huella invalidable al cambiar fuentes. Las heurísticas léxicas son **señales de revisión**, no diagnóstico semántico certificado.
5. Fixtures y pruebas de regresión actualizadas; fixture de bifurcación declara conexión explícita a END.

## QA ejecutado en copia local equivalente
- Backend `pytest`: **114/114 PASS**, con 4 pruebas nuevas de provenance/publicación y 13 aserciones dirigidas de suficiencia.
- Frontend, pruebas dirigidas de alcance/participantes/suficiencia: **24/24 PASS** en la copia ensayada. La versión de tests publicada en GitHub tiene un conjunto reducido de assertions de alcance.
- Frontend total en la copia antes de corregir la fixture de ramas: **564/575 PASS, 11 FAIL**; 3 afectados por `jsdom` ausente y el resto requiere reconciliación test↔implementación. La fixture de ramas corregida supera **18/18**, pero **NO** se ha pasado toda la suite sin fallos.
- QA100: 100 casos sintéticos derivados de **10 arquetipos** (NO 100 compañías independientes); 900 estados/etapas; 10 000 trazas de campos; 200 incidencias esperadas reconocidas; 400 comprobaciones derivadas coinciden; 100 cálculos temporales coinciden. Son pruebas técnicas con oráculos generados, **no** un porcentaje de fiabilidad empresarial.
- Ensayos sombra de 30 casos con confirmaciones artificiales: 30 diagnósticos computados, 30 cotizaciones bloqueadas y 30 paquetes bloqueados. No han generado una presentación cliente publicable.
- Prueba Chromium: el entorno responde `ERR_BLOCKED_BY_ADMINISTRATOR` a URLs `http://127.0.0.1` y `file://`; la UAT visual no se ha podido ejecutar.
- La última consulta de estados CI no informó checks; **no declarar GitHub CI PASS**.

## Regla de publicación PG10–PG15
- La sesión 1 confirma AS-IS y produce snapshot; el trabajo interno genera diagnosis, TO-BE, recommendation, pricing/scenarios.
- Una salida no tiene autorización cliente solo porque un motor pueda calcularla.
- Si faltan evidencia, comparabilidad, supuestos o aprobaciones, mostrar DRAFT/PENDIENTE/NO DISPONIBLE; no generar afirmación cuantitativa ficticia, cash saving automático, payback improcedente, precio fallback ni producto inexistente.
- Diferenciar capacidad liberada de ahorro de caja; espera de trabajo activo; benchmark de evidencia medida.
- Snapshot confirmado, output REVIEWED y APPROVED_FOR_CLIENT/PUBLISHED siguen siendo gates separados; no están completos en el backend de esta rama.

## Bloqueos de cierre que NO se han resuelto
- 100 campos: no existe validación empírica que demuestre minimalidad/suficiencia definitiva.
- PG10–PG15: falta un diagnóstico completado y aprobado con TO-BE, scenario seleccionado y todos los entregables contrastados frente a oráculo empresarial independiente.
- Faltan pruebas piloto de duración 90 minutos y una evaluación independiente de fiabilidad.
- Once fallos previos de suite frontend y UAT visual real siguen sin cierre integral.
- Riesgos: `controls_present` y `reversible` tienen defaults en RiskInput; está pendiente verificar su procedencia y suficiencia para riesgo residual. No se modifica la fórmula canónica por intuición.
- Los nueve candidatos condicionales requieren cierre formal en modelo/contrato, sin duplicar captura.
- No existe un mecanismo completo de publicación PG15 vinculada a outputs aprobados en `DiagnosticOutput`; la nueva barrera de cobertura es **necesaria pero no suficiente**.

## Dictamen
**Modelo de 100 identificadores: conservado en REVIEW, todavía NO definitivo.**
**Backend con controles reforzados: 114/114 pruebas locales PASS.**
**Fiabilidad diagnóstica real: NO MEDIDA.**
**Aptitud comercial/producción: NO ACREDITADA.**

No modificar Master Index/DECISIONES/ESTADO/ROADMAP ni mover CANONICAL a ARCHIVED mientras la suficiencia y publicación PG15 no estén aprobadas. Registrar esta intervención como QA/revisión, no como lanzamiento.
