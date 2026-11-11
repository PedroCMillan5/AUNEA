# [AUNEA-BE-PG11-ALTERNATIVES-330] START
# PURPOSE: Source-bound operational alternatives, without an LLM or automatic approval.
# SOURCE: PG11 implementation instruction 11/11/2026; DEC-034/050/052/055.
# INPUTS: validated PilotAIRequest. OUTPUTS: transient candidates targeting existing TO-BE fields.
# SIDE_EFFECTS: none. CHANGE_RISK: HIGH.
from .internal_ai import validate_pilot_source, related_step_ids
from .utils import stable_hash


def activity_alternatives(request, step_id):
    steps = validate_pilot_source(request)
    step = next((s for s in steps if str(s['id']) == step_id), None)
    if step is None:
        raise ValueError('La actividad no pertenece al AS-IS confirmado.')
    eng = request.engagement
    frictions = [f for f in eng.questionnaire_answers.get('_frictions', [])
                 if isinstance(f, dict) and f.get('status') != 'SUPERSEDED'
                 and step_id in related_step_ids(f)]
    risks = [r for r in eng.risks if step_id in r.step_ids]
    constraints = {k: eng.questionnaire_answers[k] for k in
                   ('DF075', 'DF088', 'DF089', 'DF090', 'DF091')
                   if eng.questionnaire_answers.get(k)}
    candidates = []

    def add(key, title, fields, refs, conditions, operation=None):
        candidates.append(dict(id=key + ':' + step_id, sourceId=step_id,
            title=title, provenance='RULES', fields=fields, sourceRefs=[step_id, *refs],
            conditions=conditions, constraints=constraints,
            operations=[operation] if operation else [], status='PENDING'))

    add('KEEP', 'Mantener la actividad',
        dict(transformation='Se mantiene',
             problemResolved='Conservar la función y las rutas del AS-IS; validar su necesidad y los hallazgos vinculados antes de aprobar.'),
        [], ['Mantener es una alternativa; la ausencia de hallazgos no demuestra eficiencia.'])
    for friction in frictions:
        fid = str(friction.get('id') or '')
        problem = str(friction.get('client_label') or friction.get('observable_signal') or '')
        if not problem:
            continue
        add('HANDOFF-' + fid, 'Preparar la entrega de información en esta actividad',
            dict(transformation='Se modifica', problemResolved='Atender el hallazgo: ' + problem,
                 controlsRisk='Antes de entregar el resultado, comprobar que las salidas declaradas estén completas; devolver las incidencias al responsable de esta actividad.'),
            [fid] if fid else [], ['Confirmar qué información falta y quién recibe la salida. No se presupone que documentos de igual categoría sean el mismo documento.'])
    # Manual work alone never establishes automatable work. Require explicit linked
    # repetition evidence AND the official existing-tool capability input.
    repeated = [f for f in frictions if any(word in str(f.get('client_label', '')).lower()
                + ' ' + str(f.get('observable_signal', '')).lower()
                for word in ('duplic', 'reintrodu', 'repet', 'copiar'))]
    if repeated and eng.existing_tool_can_cover and eng.process_design_preconditions_ok:
        add('RULED-TRANSFER', 'Reutilizar datos mediante reglas',
            dict(transformation='Se automatiza',
                 problemResolved='Evitar la captura repetida descrita en las fricciones vinculadas.',
                 automationAi='Transferir una sola vez los datos de entrada a la salida declarada, validar campos requeridos y detener el tratamiento ante una discrepancia. No automatizar decisiones ni aprobaciones.',
                 humanSupervision='El responsable de la actividad revisa los registros rechazados antes de continuar.',
                 controlsRisk='Verificar correspondencia de origen y destino, campos obligatorios y duplicados; conservar referencia del registro original.'),
            [str(f['id']) for f in repeated if f.get('id')],
            ['Confirmar campos, identificador único, permisos e interfaz de integración. La capacidad declarada de la herramienta no demuestra una integración concreta.',
             'Conservar aprobaciones humanas y restricciones confirmadas. No se proponen tiempos ni ahorro.'])
    for risk in risks:
        rid = str(risk.risk_id)
        problem = str(getattr(risk, 'description', '') or risk.category)
        control = 'Revisar las entradas y el resultado de esta actividad frente al riesgo «' + problem + '»; registrar incidencias para revisión del responsable.'
        fields = dict(transformation='Se incorpora control',
                      problemResolved='Introducir una comprobación del riesgo vinculado: ' + problem,
                      controlsRisk=control)
        conditions = ['Precisar el criterio de aceptación y tratamiento de incidencias antes de aprobar.',
                      'Verificar que el control no duplique uno existente. No se estima ahorro.']
        add('CONTROL-' + rid, 'Incorporar control dentro de la actividad', fields, [rid], conditions)
        # Separate activity is an explicit alternative, never the default. No branching guessed.
        if step.get('normal_next_step') and step.get('step_type') not in ('ST04', 'ST05'):
            add('CONTROL-STEP-' + rid, 'Separar el control tras esta actividad', {}, [rid],
                conditions + ['Elegir sólo si el control requiere ejecución separada. Se conserva la ruta normal explícita.'],
                dict(type='insertAfter', sourceId=step_id, item=dict(
                    stepName='Revisar resultado de ' + str(step.get('step_name') or step_id),
                    stepType='ST02', **fields)))
    return dict(status='DRAFT', requires_human_review=True, source_step_id=step_id,
                input_hash=stable_hash(eng.model_dump()), snapshot_version=request.snapshot_version,
                candidates=candidates)
# [AUNEA-BE-PG11-ALTERNATIVES-330] END
