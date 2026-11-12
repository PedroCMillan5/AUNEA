# [AUNEA-BE-PG11-ALTERNATIVES-330] START
# PURPOSE: Deterministic, finding-specific, combinable TO-BE interventions.
# SOURCE: Simulator CANONICAL PG11; PROJECT_RULES; DEC-050/052/055/056/068.
# INPUTS: validated PilotAIRequest with confirmed AS-IS, linked frictions/risks.
# OUTPUTS: transient, source-bound candidates for the existing versioned TO-BE.
# SIDE_EFFECTS: none. Only the consultant's preview-confirm transaction writes.
# CHANGE_RISK: HIGH; no new business fields, pricing, forecast or assumed tools.
import unicodedata

from .internal_ai import validate_pilot_source, related_step_ids
from .utils import stable_hash


def _normal(value):
    value = str(value or '').casefold()
    return ''.join(c for c in unicodedata.normalize('NFKD', value)
                   if not unicodedata.combining(c))


def _source_text(record):
    return _normal(' '.join(str(record.get(k) or '') for k in
                            ('client_label', 'observable_signal', 'friction_type')))


def _has_any(value, words):
    return any(word in value for word in words)


def activity_alternatives(request, step_id):
    steps = validate_pilot_source(request)
    step = next((s for s in steps if str(s['id']) == str(step_id)), None)
    if step is None:
        raise ValueError('La actividad no pertenece al AS-IS confirmado.')
    step_id = str(step['id'])
    eng = request.engagement
    answers = eng.questionnaire_answers
    frictions = [f for f in answers.get('_frictions', [])
                 if isinstance(f, dict) and f.get('status') != 'SUPERSEDED'
                 and step_id in related_step_ids(f)]
    risks = [r for r in eng.risks if step_id in r.step_ids]
    source_outputs = [str(v).upper() for v in (step.get('outputs') or [])]
    has_record = 'RECORD' in source_outputs
    existing_record = ('el registro estructurado ya declarado como salida'
                       if has_record else 'la salida existente, si permite registrar el estado')
    candidates = []
    seen = set()

    def add(key, title, fields, refs, conditions, *, target='', change='', outcome='',
            combination='COMBINABLE', constraint_keys=(), operation=None):
        if key in seen:
            return
        seen.add(key)
        constraints = {k: answers[k] for k in constraint_keys if answers.get(k)}
        candidates.append(dict(
            id=key + ':' + step_id, sourceId=step_id, title=title,
            provenance='RULES', fields=fields,
            sourceRefs=list(dict.fromkeys([step_id, *[str(x) for x in refs if x]])),
            targetFinding=target,
            changeSummary=change,
            expectedOutcome=outcome,
            combination=combination,
            conditions=conditions,
            constraints=constraints,
            operations=[operation] if operation else [],
            status='PENDING'))

    findings = [(str(f.get('client_label') or f.get('observable_signal') or f.get('id') or 'Fricción'), str(f.get('id') or ''))
                for f in frictions]
    findings += [(str(getattr(r, 'description', '') or r.category), str(r.risk_id)) for r in risks]
    unresolved = '; '.join(name for name, _ in findings)
    add('KEEP', 'Mantener la actividad sin cambios',
        dict(transformation='Se mantiene',
             problemResolved='Conservar la función y las rutas existentes del AS-IS.'),
        [], ['Esta alternativa no elimina los hallazgos vinculados. Mantener requiere justificar su aceptación.',
             'No se presupone que el proceso actual sea eficiente.'],
        target='Situación actual' if not unresolved else unresolved,
        change='No se modifica el funcionamiento ni el mapa.',
        outcome='Se conserva la operación; los hallazgos relacionados siguen pendientes.' if unresolved
        else 'Se conserva el funcionamiento confirmado.',
        combination='EXCLUSIVE')

    for friction in frictions:
        fid = str(friction.get('id') or '')
        label = str(friction.get('client_label') or friction.get('observable_signal') or '')
        signal = _source_text(friction)
        if not label:
            continue
        sources = [fid] if fid else []
        if _has_any(signal, ('visibil', 'seguimiento', 'estado', 'localiz', 'monitoriz')):
            add('STATUS-' + fid, 'Hacer visible el estado de esta actividad',
                dict(transformation='Se modifica',
                     problemResolved='Reducir la falta de visibilidad: ' + label,
                     controlsRisk='Definir el estado operativo y su responsable; registrar cada cambio de estado con una referencia a la solicitud o documento original y permitir consultar el último estado validado.'),
                sources,
                ['Confirmar dónde se conserva el estado y quién lo actualiza; no se presume automatización ni consulta en tiempo real.',
                 'Verificar si ' + existing_record + ' tiene los campos y permisos necesarios.',
                 'Conservar las decisiones y aprobaciones humanas del flujo actual.'],
                target=label,
                change='Incorporar seguimiento explícito del estado, responsable y referencia al documento sin añadir otro registro por defecto.',
                outcome='El responsable podrá consultar el último estado registrado; no se cuantifica reducción del tiempo.',
                constraint_keys=('DF075', 'DF090', 'DF091'))
        if _has_any(signal, ('incomplet', 'entrega', 'traspas', 'handoff', 'faltan datos',
                             'datos faltante', 'informacion faltante')):
            add('HANDOFF-' + fid, 'Validar la entrega de información entre actividades',
                dict(transformation='Se modifica',
                     problemResolved='Evitar la entrega incompleta que indica el hallazgo: ' + label,
                     controlsRisk='Comprobar que las entradas y salidas exigidas estén completas antes de trasladarlas; registrar la incidencia y devolverla al responsable del paso si falta información.'),
                sources, ['Confirmar qué información es imprescindible y quién recibe el resultado.',
                          'No considerar documentos del mismo tipo como un único documento sin identificación.'],
                target=label,
                change='Añadir una comprobación de integridad en la entrega, conservando la ruta del proceso.',
                outcome='La actividad receptora dispone de una entrega comprobable, sujeta a validación.',
                constraint_keys=('DF090', 'DF091'))
        if _has_any(signal, ('duplic', 'reintrodu', 'repet', 'copiar')):
            # Evidence of repetition is not evidence of tool integration.
            if eng.existing_tool_can_cover and eng.process_design_preconditions_ok:
                add('RULED-TRANSFER-' + fid, 'Reutilizar los datos ya capturados mediante reglas',
                    dict(transformation='Se automatiza',
                         problemResolved='Evitar la reintroducción identificada: ' + label,
                         automationAi='Reutilizar los datos de entrada en la salida declarada, validar los campos obligatorios y detener el tratamiento ante una discrepancia. No tomar decisiones de aprobación.',
                         humanSupervision='El responsable revisa las excepciones antes de continuar.',
                         controlsRisk='Comprobar correspondencia entre origen y destino, duplicados y referencia del registro original.'),
                    sources,
                    ['Confirmar el identificador único, los campos, permisos e interfaz concreta de integración.',
                     'La capacidad declarada de las herramientas no demuestra que esta integración esté implementada.',
                     'Preservar aprobaciones humanas, controles y rutas confirmadas. No se calculan ahorros.'],
                    target=label,
                    change='Propuesta de transferencia basada en reglas, condicionada a la capacidad declarada.',
                    outcome='Podría evitarse una recaptura identificada una vez validada la integración.',
                    constraint_keys=('DF075', 'DF088', 'DF089', 'DF090', 'DF091'))

    for risk in risks:
        rid = str(risk.risk_id)
        label = str(getattr(risk, 'description', '') or risk.category)
        risk_words = _normal(label)
        trace = _has_any(risk_words, ('trazabil', 'perdid', 'rastre', 'registro', 'identific'))
        if trace:
            control = ('Comprobar que el documento o solicitud recibida mantiene un identificador '
                       'y una referencia comprobable a ' + existing_record +
                       '; registrar excepciones y asignarlas al responsable de revisión.')
            outcome = 'Cada elemento conserva una referencia verificable entre entrada y registro; sin presumir una nueva base de datos.'
            title = 'Controlar la trazabilidad de la entrada al registro'
        else:
            control = ('Comprobar las entradas y salidas frente al riesgo «' + label +
                       '», definir un resultado de control y registrar incidencias para el responsable.')
            outcome = 'El riesgo queda cubierto por una comprobación explícita, pendiente de validar con el cliente.'
            title = 'Incorporar control del riesgo identificado'
        fields = dict(transformation='Se incorpora control',
                      problemResolved='Mitigar el riesgo vinculado: ' + label,
                      controlsRisk=control)
        conditions = [
            'Precisar criterio de aceptación, responsable, evidencia del control y tratamiento de incidencias.',
            'Comprobar si ya existe un control equivalente y evitar duplicarlo.',
            'Mantener aprobaciones y rutas vigentes. No se estima ahorro.']
        add('CONTROL-' + rid, title, fields, [rid], conditions,
            target=label,
            change='Añadir una comprobación dentro de esta actividad, sin crear otro paso.',
            outcome=outcome,
            constraint_keys=('DF075', 'DF090', 'DF091'))
        # A separate control is an *alternative placement* to the in-step control.
        # It must never be inserted blindly after a decision or a terminal step.
        next_step = str(step.get('normal_next_step') or '')
        if next_step and next_step not in ('__END__', '__PENDING__') and step.get('step_type') not in ('ST04', 'ST05'):
            add('CONTROL-STEP-' + rid, 'Separar la comprobación en una actividad posterior',
                {}, [rid], conditions + [
                    'Utilizar esta ubicación sólo cuando el control deba ejecutarse por separado.',
                    'Conservar la salida normal explícita; comprobar el impacto en las demás actividades.'],
                target=label,
                change='Añadir una actividad de control entre este paso y su siguiente destino normal.',
                outcome=outcome,
                combination='ALTERNATIVE_TO_CONTROL-' + rid,
                constraint_keys=('DF075', 'DF090', 'DF091'),
                operation=dict(type='insertAfter', sourceId=step_id, item=dict(
                    stepName='Comprobar trazabilidad tras ' + str(step.get('step_name') or step_id)
                    if trace else 'Comprobar resultado de ' + str(step.get('step_name') or step_id),
                    stepType='ST02', **fields)))
    return dict(status='DRAFT', requires_human_review=True, source_step_id=step_id,
                input_hash=stable_hash(eng.model_dump()), snapshot_version=request.snapshot_version,
                candidates=candidates)
# [AUNEA-BE-PG11-ALTERNATIVES-330] END
