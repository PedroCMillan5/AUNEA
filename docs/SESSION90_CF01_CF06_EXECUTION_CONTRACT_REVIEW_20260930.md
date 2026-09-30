# AUNEA Internal — Contrato de ejecución CF-01 a CF-06 + lenguaje claro
Estado: REVIEW · 2026-09-30
Rama: work/cf01-cf06-functional-language-20260930
Origen: work/astra-session90-b04 (no alterar main ni FROZEN).
Naturaleza: handoff técnico / matriz de diferencias. No sustituye Diagnostic Master v1.2, Simulator CANONICAL v1.14 ni documentos de gobierno en Drive.

## Precedencia y límites
Consultar 00_AUNEA_INTERNAL_MASTER_INDEX, PROJECT_RULES.md, DECISIONES (especialmente DEC-050, 055, 063, 064, 065, 066 y 068), Diagnostic Master v1.2 y Simulator CANONICAL v1.14. B02/B03 siguen REVIEW. Tres activos B02 candidatos en Drive siguen REVIEW, no son CANONICAL. No promover a producción sin UAT visual Windows/Chrome/Edge y reconciliación documental.
Orden: DATOS → REGLAS → INTERFAZ → ENTREGABLES. Mantener DF001–DF100, options sets y dropdowns/multicheck. Las páginas FROZEN no se modifican sin reapertura explícita. No inventar tarifas, calendarios, probabilidades, ahorro ni evidencia.

## Resultado de las seis definiciones funcionales
- CF-01 (aprobado): Alcance (DF011–020) y Demanda (DF021–030) alimentan el mismo Engagement y el mapa AS-IS (DF031–055). DF014/015 son anclas fijas Inicio/Fin, nunca ProcessStep duplicados. El contexto global no se vuelve a capturar. Las divergencias entre ciclo declarado y modelo se explican sin rellenar huecos.
- CF-02 (definición de trabajo): un ProcessStep es el punto de referencia operativo, no owner de Friction, RiskInput o EconomicInput. Friction.affected_steps vincula uno o más pasos; RiskInput/EconomicInput.step_ids aportan trazabilidad. Crear/editar desde mapa y Console afecta al mismo registro. Relación individual Risk↔Friction y riesgo directo del paso requieren reconciliación de esquema/contrato antes de implementarse, sin añadir DF. No borrar en cascada: preservar histórico SUPERSEDED.
- CF-03 (DEC-068): Friction.time_attribution con INCLUDED (tiempo ya en paso, no sumar), BREAKDOWN (parte del DF039, no sumar), ADDITIONAL (sólo agregar con frecuencia/evidencia comparables). Un solo step_id propietario temporal aunque affected_steps incluya varios. DF063 y DF082 concilian por evento antes de agregar. Espera nunca se monetiza como trabajo.
- CF-04: al elegir un paso en Riesgo, ofrecer sólo fricciones vinculadas a ese paso; admitir riesgo directamente relacionado al paso. Categoría contextual sugerida, nunca confirmación automática; conservar catálogos y reglas de riesgo actuales. Riesgo potencial no se transforma sin evidencia en pérdida realizada.
- CF-05: Actor → perfil/tarifa acreditada DF076 → volumen/frecuencia/tiempo aplicable → cálculo server-owned. Si tarifa o evidencia faltan, resultado pendiente o estimado claramente distinguido. Diferenciar activo, retrabajo, espera, pérdida directa, herramientas, capacidad liberable y ahorro de caja. DF080/081 y DF063/082 no duplican inputs preexistentes. Respetar EAR-001–014 y auditados overlap guards B03.
- CF-06: validación cruzada de alcance, rutas, demanda, atribución temporal, vínculos, economics y procedencia. Confirmar por capas mapa, fricción, riesgo, impacto (DEC-065); cambio upstream invalida confirmación propia y dependientes vivos, pero nunca reescribe snapshots/outputs históricos.

## Reglas de lenguaje visible: hablar como habla el cliente
Conservar IDs y enums técnicos sólo internamente. Interfaz, ayudas, avisos, errores, resultados y entregables en español simple; preguntas concretas; una idea por frase; mostrar unidades junto a números. No presentar un cálculo condicionado como hecho. No usar siglas técnicas como texto principal.

| Técnico / ambiguo | Texto visible preferido | Ayuda contextual breve |
| --- | --- | --- |
| Trigger | ¿Qué hace que empiece este proceso? | Ej.: llega una factura por correo. |
| Outcome | ¿Cuándo podemos darlo por terminado? | Explica qué debe estar hecho al final. |
| Límite inicial | ¿Desde qué momento vamos a analizarlo? | Lo anterior queda fuera de este estudio. |
| Límite final | ¿Hasta qué momento vamos a analizarlo? | Lo posterior queda fuera de este estudio. |
| Variantes materiales | ¿Hay casos que siguen un camino distinto? | Por ejemplo, facturas que necesitan aprobación. |
| Volumen habitual | ¿Cuántos casos se gestionan normalmente? | Indica también si es al día, semana, mes o año. |
| Volumen pico | ¿Cuántos casos llegan en los momentos de más trabajo? | No usarlo como volumen habitual. |
| SLA objetivo | ¿En cuánto tiempo debería terminarse cada caso? | Compromiso u objetivo de servicio. |
| Ciclo end-to-end | ¿Cuánto tarda normalmente un caso desde que empieza hasta que termina? | Incluye los tiempos en los que queda esperando. |
| Backlog | ¿Cuántos casos quedan pendientes? | Casos que todavía no se han terminado. |
| Process Step | ¿Qué se hace en este paso? | Describe una actividad concreta. |
| Actor | ¿Quién realiza este paso? | Selecciona el rol, no lo escribas de nuevo si ya existe. |
| Tiempo activo | ¿Cuánto tiempo dedica una persona a realizarlo? | No cuentes aquí el tiempo de espera. |
| Espera | ¿Cuánto tiempo queda pendiente antes de continuar? | No significa que alguien esté trabajando durante todo ese tiempo. |
| Retrabajo | Cuando hay un error, ¿cuánto se tarda en corregirlo? | Comprueba si este tiempo ya está registrado. |
| Fricción | ¿Qué problema ocurre en este paso? | Explica lo que pasa en la práctica. |
| Frecuencia de fricción | ¿Cada cuánto ocurre este problema? | Indica el número o porcentaje y a qué casos se refiere. |
| Pérdida de tiempo activa atribuible | ¿Cuánto trabajo extra provoca este problema? | No incluyas esperas. |
| INCLUDED | Ya está contado en el paso | No se vuelve a sumar. |
| BREAKDOWN | Es parte del tiempo de corrección del paso | Sirve para explicar el tiempo ya registrado. |
| ADDITIONAL | Es tiempo extra que aún no está contado | Se añade sólo cuando hay datos suficientes. |
| Paso propietario de atribución | ¿En qué paso vamos a contar este tiempo? | Aunque afecte a varios, sólo se cuenta una vez. |
| Riesgo concreto | ¿Qué podría salir mal? | Una posibilidad futura no equivale a una pérdida ocurrida. |
| Controles | ¿Qué se hace hoy para evitarlo o detectarlo? | Describe la medida existente. |
| Probabilidad | ¿Con qué frecuencia podría ocurrir? | Aplicar escala canónica y su ayuda, sin prometer predicción. |
| Impacto | ¿Qué consecuencias tendría si ocurre? | Aplicar escala canónica, no calcular pérdidas por defecto. |
| Economic Input | ¿Qué coste o consecuencia económica queremos registrar? | Mantener procedencia y evidencia. |
| Coste de capacidad/hora | ¿Cuánto cuesta una hora de trabajo de este perfil? | Aclarar tipo de coste y fuente. |
| Pérdida monetaria directa | ¿Se ha perdido dinero por este problema? | Indica cuánto y con qué justificante, si existe. |
| Released capacity | Tiempo de trabajo que podría liberarse | No equivale por sí solo a dinero ahorrado. |
| Cash saving | Ahorro real de dinero | Requiere un cambio económico demostrado. |
| Evidence | ¿Cómo sabemos que este dato es correcto? | Medido, declarado, estimado o hipótesis no son equivalentes. |
| Stale/invalidation | Este resultado necesita revisarse | Ha cambiado un dato usado para calcularlo. |
| Gap | Nos falta información para cerrar este punto | Indica qué dato o justificante falta. |
| Confirm AS-IS | ¿Confirmamos que así funciona hoy el proceso? | Se revisan por separado las cuatro capas. |
| Duplicate overlap | Este tiempo o coste parece estar ya incluido | Revisa su origen antes de sumarlo otra vez. |

## Microtextos de la sesión
- Inicio del mapa: «Ya tenemos el alcance y los volúmenes. Ahora vamos a ordenar lo que sucede en cada paso».
- Rama: «¿En qué casos se sigue este camino?»; fin: «Después de este paso, ¿puede terminar el proceso?».
- Fricción: «¿Qué problema aparece aquí?». Si se elige INCLUDED: «Este tiempo ya está recogido. No lo sumaremos dos veces».
- Riesgos: «Al seleccionar este paso, mostramos sólo sus problemas relacionados. También puedes añadir un riesgo que no tenga un problema registrado».
- Impacto: «Usaremos los datos que ya hemos recogido. Te preguntaremos sólo lo que falte para calcular».
- Falta frecuencia: «Sabemos que existe esta ruta, pero necesitamos saber cuántos casos pasan por ella para calcular su impacto».
- Espera: «El tiempo de espera no es tiempo de trabajo de una persona».
- Diferencia de ciclo: «El cliente indica 72 horas, pero los tiempos registrados todavía no explican esa duración. Revisemos las esperas o actividades que faltan».
- Cierre: «Hay datos pendientes. Podemos guardar el trabajo, pero todavía no presentar estos cálculos como definitivos».

## Matriz de diferencias y secuencia
1. DATA: conciliar candidatos B02 (Diagnostic Master v1.3, Simulator REVIEW v1.15, Architecture Contract v1.8) con CANONICAL vigente; aprobar o resolver relación individual Risk↔Friction si no existe; verificar propietario, claves de evento y provenance. No promocionar REVIEW unilateralmente.
2. RULES: auditar CF-01 herencia DF014/015 y DF021–030; CF-02 referencias/integridad; CF-03 DEC-068; CF-04 filtros por paso; CF-05 ownership DF076 y deduplicación EAR-001–014; CF-06 dependencias de confirmación. No recalcular economics en frontend.
3. INTERFACE REVIEW: revisión de copy visible PG03–PG07 y PG09 usando esta matriz, preservando controles existentes y estructura FROZEN. Editor de izquierda a derecha, bifurcaciones que permiten llegar a Fin, sin multiplicar pasos por ramas.
4. QA: checks por CF; caso Levante (160 facturas/mes, pico 230, SLA 48h, ciclo declarado 72h; 6 pasos, aprobación 25%, 3 fricciones, 2 riesgos); comprobar No-Reask, enlaces entre capas, no doble conteo, invalidación y recarga. Ejecutar CI y UAT nativa antes de cerrar.

## Gate de salida
No cambiar página FROZEN ni diseño global; no modificar preguntas/fields canónicos desde esta nota. Cualquier nuevo dato requiere gobernanza en DATA primero. Sólo después aplicar cambios al código en ramas REVIEW. Sin aprobación y QA específica no promover a CANONICAL, main ni PRODUCTION.
