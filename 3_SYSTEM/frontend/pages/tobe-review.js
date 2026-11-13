// [AUNEA-FE-PG11-ORIGINAL-FACTS-243] START — source-only ProcessStep facts
// alongside the future proposal, without a second edit owner or invented measurement.
// SOURCE: Simulator CANONICAL PG11; DEC-050; confirmed snapshot for this TO-BE version.
function tobeOriginalStepFacts(e,item){
  const p=latestTobe(e),
    source=tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item?.sourceStepId));
  if(!source)return '<p class="notice warn">El paso de origen no está disponible en el AS-IS confirmado de esta versión.</p>';
  const label=(table,v)=>{
    if(v===null||v===undefined||v==='')return '';
    const named=typeof labelFrom==='function'?labelFrom(table,v):'';
    return named||String(v);
  };
  const data=v=>Array.isArray(v)?v.filter(x=>x!==null&&x!==undefined&&x!=='').map(String).join(' · '):
    (v===null||v===undefined?'':String(v));
  const fields=[
    ['Responsable original',label('OS_ACTOR_ROLE',source.actor)],
    ['Tipo de actividad',label('OS_STEP_TYPE',source.step_type)],
    ['Herramienta original',label('OS_TOOL_CATEGORY',source.tool)],
    ['Entradas AS-IS',Array.isArray(source.inputs)?source.inputs.map(x=>label('OS_ARTIFACT_TYPE',x)).join(' · '):data(source.inputs)],
    ['Salidas AS-IS',Array.isArray(source.outputs)?source.outputs.map(x=>label('OS_ARTIFACT_TYPE',x)).join(' · '):data(source.outputs)],
    ['Trabajo activo declarado',source.active_time===null||source.active_time===undefined||source.active_time===''?'':String(source.active_time)+' min'],
    ['Espera declarada',source.wait_time===null||source.wait_time===undefined||source.wait_time===''?'':String(source.wait_time)+' min'],
    ['Retrabajo declarado',source.rework_time===null||source.rework_time===undefined||source.rework_time===''?'':String(source.rework_time)+' min']
  ];
  const cards=entries=>'<dl>'+entries.map(([name,val])=>
    '<div><dt>'+esc(name)+'</dt><dd>'+esc(val||'No registrado')+'</dd></div>').join('')+'</dl>';
  return '<div class="tobe-original-facts">'+
    '<p class="tobe-origin-provenance">Sólo lectura: valores capturados del AS-IS confirmado. No son ahorros ni tiempos futuros.</p>'+
    '<div class="tobe-origin-fact-group"><h4>Actividad actual</h4>'+cards(fields.slice(0,5))+'</div>'+
    '<div class="tobe-origin-fact-group"><h4>Duraciones declaradas</h4>'+cards(fields.slice(5))+'</div>'+
    '</div>';
}
function tobeSnapshotIssueCards(e,item){
  const snap=tobeProposalSnapshot(e,latestTobe(e)),id=String(item.sourceStepId),
    fr=(snap?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'&&
      (Array.isArray(x.affected_steps)?x.affected_steps:[]).map(String).includes(id)),
    risks=(snap?.risks||[]).filter(x=>x.status!=='SUPERSEDED'&&
      (Array.isArray(x.step_ids)?x.step_ids:[]).map(String).includes(id));
  const number=v=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v));
  const hasNumber=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
  const ref=x=>x===null||x===undefined||String(x).trim()===''?'':'<small class="tobe-origin-reference">Referencia ('+esc(String(x))+')</small>';
  const fact=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
  const frequency=x=>{
    const q=x.frequency;
    if(!q||!hasNumber(q.value))return '';
    if(q.mode==='percent')return number(q.value)+' % de los casos';
    if(q.mode==='count'){
      const periods={day:'día',week:'semana',month:'mes',year:'año'};
      return number(q.value)+' casos'+(periods[q.period]?' por '+periods[q.period]:' (periodo no indicado)');
    }
    return '';
  };
  const timeDetails=x=>{
    const details=[],freq=frequency(x),
      active=x.active_time_loss,
      wait=x.wait_time_loss,
      attribution=x.time_attribution||{};
    if(freq)details.push(fact('Frecuencia declarada',freq));
    if(active&&hasNumber(active.value)&&Number(active.value)>0&&
       !['UNKNOWN','ZERO'].includes(String(active.mode||'').toUpperCase())){
      details.push(fact('Trabajo activo asociado',number(active.value)+' min por caso afectado'));
      const modes={ADDITIONAL:'Adicional al tiempo del paso',INCLUDED:'Ya incluido en el tiempo del paso',
        BREAKDOWN:'Desglose del retrabajo del paso'};
      const mode=String(attribution.mode||''),
        ownerId=String(attribution.step_id||''),
        owner=(snap?.processSteps||[]).find(step=>step.status!=='SUPERSEDED'&&
          String(step.id)===ownerId),
        ownerLabel=owner?String(owner.step_name||owner.name||'Actividad sin nombre'):'';
      const own=ownerId===id;
      const location=own?'Responsable: esta actividad.':
        ownerLabel?'Responsable: '+ownerLabel+' ('+ownerId+'). No sumar aquí.':
        'No se puede identificar una actividad responsable vigente'+
          (ownerId?' ('+ownerId+')':' (sin identificador)')+'. No sumar hasta aclarar la atribución.';
      details.push(fact('Atribución temporal',
        (modes[mode]||'Relación temporal pendiente de clasificar')+'. '+location+
        (mode==='ADDITIONAL'&&own?
          ' Su incorporación al total requiere validar frecuencia y evidencia.':'')+
        (mode!=='ADDITIONAL'&&own?' No sumar de nuevo.':'')));
    }
    if(wait&&hasNumber(wait.value)&&Number(wait.value)>0&&
       !['UNKNOWN','ZERO'].includes(String(wait.mode||'').toUpperCase())){
      details.push(fact('Espera / retraso asociado',number(wait.value)+' min por caso afectado; no es trabajo activo'));
    }
    return details.length?'<dl class="tobe-origin-issue-data">'+details.join('')+'</dl>':'';
  };
  const frHtml=fr.map(x=>{
    const code=x.id||'',
      alias=String(code).match(/(F\d+)$/i)?.[1],
      signal=String(x.observable_signal||'').trim(),
      readableSignal=alias?signal.replace(new RegExp('^'+alias+'\\s*:\\s*','i'),''):signal;
    const structured=timeDetails(x);
    return '<li class="tobe-origin-issue">'+
      '<div class="tobe-origin-issue-head"><b>Fricción</b><span>'+
        esc(x.client_label||labelFrom('OS_FRICTION_TYPE',x.friction_type)||'Sin descripción')+'</span></div>'+
      ref(code)+structured+
      (readableSignal?(structured?
        '<details class="tobe-origin-issue-signal-details"><summary>Ver señal original</summary>'+
          '<p class="tobe-origin-issue-signal"><b>Señal registrada:</b> '+esc(readableSignal)+'</p></details>':
        '<p class="tobe-origin-issue-signal"><b>Señal registrada:</b> '+esc(readableSignal)+'</p>'):'')+
      '</li>';
  }).join('');
  const riskHtml=risks.map(x=>
    '<li class="tobe-origin-issue"><div class="tobe-origin-issue-head">'+
      '<b>Riesgo</b><span>'+esc(x.description||x.category||'Sin descripción')+'</span></div>'+
      ref(x.risk_id||x.id)+'</li>').join('');
  return '<div class="tobe-origin-issues"><h4>Fricciones y riesgos vinculados</h4>'+
    (frHtml||riskHtml?'<ul class="tobe-source-list">'+frHtml+riskHtml+'</ul>':
      '<p class="tobe-muted">No hay fricciones ni riesgos vinculados directamente a esta actividad en el AS-IS confirmado. Consulta el diagnóstico global antes de justificar una transformación.</p>')+
    '</div>';
}

// [AUNEA-FE-PG11-ORIGINAL-FACTS-243] END
// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] START — display-only comparison.
const TOBE_AI_REVIEW_FIELDS=[
 ['transformation','transformation','Qué cambia','transformation'],
 ['problem_resolved','problemResolved','Motivo del diseño futuro','text'],
 ['future_actor','futureActor','Responsable futuro','OS_ACTOR_ROLE'],
 ['tool','tool','Herramienta / arquitectura','OS_TOOL_CATEGORY'],
 ['inputs','inputs','Datos de entrada','OS_ARTIFACT_TYPE'],
 ['outputs','outputs','Datos de salida','OS_ARTIFACT_TYPE'],
 ['automation_ai','automationAi','Automatización e IA','text'],
 ['human_supervision','humanSupervision','Supervisión humana','text'],
 ['controls_risk','controlsRisk','Control / riesgo','text']
];
function tobeAiReviewDiff(e,p,id){
  const out={issue:'',warnings:[],fields:[],allFields:[],skipped:[],decision:null};
  if(!tobeEditable(p))
    out.issue='El TO-BE ya no está en borrador editable.';
  else out.decision='CONFIRM_PER_CHANGE';
  const source=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  const ai=source?.items?.find(x=>String(x.source_step_id)===String(id));
  const item=p.items.find(x=>String(x.sourceStepId)===String(id));
  if(!source?.review||!ai||!item||!Array.isArray(ai.source_refs)||
     !ai.source_refs.map(String).includes(String(id))){
    out.issue='No existe una recomendación guardada y trazable a esta actividad.';return out;
  }
  const blocked=source.review?.blocking_step_ids?.includes(String(id))||
    source.review?.issues?.some(x=>x.category==='BLOCKING'&&
      (!x.step_id||x.step_id==='GLOBAL'||String(x.step_id)===String(id)));
  const reviewerIssues=(source.review?.issues||[]).filter(issue=>
    issue.category==='BLOCKING'&&
    (!issue.step_id||issue.step_id==='GLOBAL'||String(issue.step_id)===String(id)));
  const wholeProcessBlocked=reviewerIssues.some(issue=>
    !issue.step_id||issue.step_id==='GLOBAL');
  if(wholeProcessBlocked)
    out.issue='El revisor ha bloqueado el uso de esta propuesta para todo el proceso. Corrige la fuente y vuelve a analizar.';
  if(blocked)
    out.warnings.push('La revisión detecta un bloqueo en esta actividad: sólo se pueden considerar campos independientes y sin incidencias propias.');
  if(source.review?.review_mode==='RULES_ONLY')
    out.warnings.push('Sólo se han ejecutado comprobaciones por reglas; la vista previa no demuestra viabilidad técnica.');
  const fieldIssues=(key,sourceKey)=>reviewerIssues.filter(issue=>{
    const evidence=String(issue.evidence||'').toLowerCase();
    return evidence.split(/[^a-z_]/).includes(sourceKey)||
      evidence.split(/[^a-z_]/).includes(key.toLowerCase());
  });
  const narrative=typeof internalAiPilotNarrative==='function'?internalAiPilotNarrative(ai.rationale):{action:''};
  const contradiction=ai.transformation==='Se mantiene'&&
    /automatiz|implement|integr|modific|rediseñ|sustitu/i.test(
      String(narrative.action||'')+' '+String(ai.automation_ai||''));
  if(contradiction)out.warnings.push('La IA indica «Se mantiene» pero recomienda cambios: selecciona «Qué cambia» manualmente.');
  for(const [sourceKey,key,label,type] of TOBE_AI_REVIEW_FIELDS){
    const raw=String(ai[sourceKey]??'').trim();
    if(!raw||/^(no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(raw))continue;
    const directBlockers=fieldIssues(key,sourceKey);
    if(directBlockers.length){
      out.skipped.push({key,label,raw,reason:directBlockers.map(x=>x.issue).join(' ')});
      continue;
    }
    if(type==='transformation'&&(!TOBE_TRANSFORMATIONS.includes(raw)||contradiction)){
      out.skipped.push({key,label,raw,reason:'La transformación IA contiene una contradicción o no es válida; revísala en el selector existente.'});
      continue;
    }
    let value=raw,display=raw;
    if(type.startsWith('OS_')){
      const opts=fieldOptions(type);
      const parts=type==='OS_ARTIFACT_TYPE'?raw.split(/[,;|]/).map(x=>x.trim()).filter(Boolean):[raw];
      const selected=parts.map(x=>opts.find(o=>String(o.value)===x||
        String(o.label||'').toLowerCase()===x.toLowerCase()));
      if(!parts.length||selected.some(x=>!x)||(
        type==='OS_ARTIFACT_TYPE'&&selected.some(x=>String(x.value).toUpperCase()==='OTHER'))){
        out.warnings.push('«'+label+'» contiene opciones no confirmadas en el catálogo. Revísalas manualmente.');
        out.skipped.push({key,label,raw,reason:'El valor no corresponde a una opción de catálogo aplicable sin revisión.'});
        continue;
      }
      value=type==='OS_ARTIFACT_TYPE'?selected.map(x=>String(x.value)):String(selected[0].value);
      display=selected.map(x=>x.label).join(' · ');
    }
    // Multiselect order and duplicates do not change the selected set.
    const comparable=v=>type==='OS_ARTIFACT_TYPE'&&Array.isArray(v)?
      [...new Set(v.map(String))].sort():v;
    const same=JSON.stringify(comparable(item[key]))===JSON.stringify(comparable(value));
    const before=type==='OS_ARTIFACT_TYPE'?
      tobeArtifactDisplay(item[key],item._details?.[key]):
      type.startsWith('OS_')?
        labelFrom(type,item[key])||String(item[key]||'Sin definir'):
        String(item[key]||'Sin definir');
    const entry={key,label,value,display,before,changed:!same};
    out.allFields.push(entry);
    if(!same)out.fields.push(entry);
  }
  return out;
}
// A DRAFT with 4/4 analyzed activities may still have incomplete fields;
// report those counts separately without implying missing AS-IS evidence.
function tobeHumanReadableRefs(e,refs){
  const snap=typeof tobeProposalSnapshot==='function'&&typeof latestTobe==='function'?
    tobeProposalSnapshot(e,latestTobe(e)):null;
  return (Array.isArray(refs)?refs:[]).map(ref=>{
    const code=String(ref);
    const step=(snap?.processSteps||[]).find(x=>String(x.id)===code);
    if(step)return String(step.step_name||step.name||'Actividad')+' ('+code+')';
    const friction=(snap?.frictions||[]).find(x=>String(x.id)===code);
    if(friction)return 'Fricción: '+String(friction.client_label||friction.observable_signal||'Sin descripción')+' ('+code+')';
    const risk=(snap?.risks||[]).find(x=>String(x.risk_id||x.id)===code);
    if(risk)return 'Riesgo: '+String(risk.description||risk.category||'Sin descripción')+' ('+code+')';
    if(typeof internalAiReadableRefs==='function'){
      const readable=internalAiReadableRefs(e,[code]);
      if(readable&&readable!==code)return readable;
    }
    return 'Referencia de origen no identificada ('+code+')';
  }).join(' · ');
}
function tobeAiFieldCoverageHtml(e,p,item){
  if(item?.isAddition||typeof internalAiSavedDraft!=='function')return '';
  const saved=internalAiSavedDraft(e);
  if(!saved?.items?.some(x=>String(x.source_step_id)===String(item.sourceStepId)))return '';
  const diff=tobeAiReviewDiff(e,p,item.sourceStepId),
    candidate=diff.allFields.length,
    invalid=diff.skipped.length,
    blank=TOBE_AI_REVIEW_FIELDS.filter(([sourceKey,key])=>
      !diff.allFields.some(x=>x.key===key)&&!diff.skipped.some(x=>x.key===key)),
    incomplete=blank.filter(([sourceKey])=>
      (saved.review?.issues||[]).some(x=>
        x.category==='BLOCKING'&&String(x.step_id)===String(item.sourceStepId)&&
        String(x.evidence||'').split(/[^a-z_]/i).includes(sourceKey))).length,
    absent=blank.length-incomplete;
  return '<div class="tobe-ai-field-summary" role="status">'+
    '<b>Campos sugeridos por IA ('+TOBE_AI_REVIEW_FIELDS.length+')</b> '+
    '<span class="tobe-ai-field-count"><strong>'+candidate+'</strong> con sugerencia</span>'+
    '<span class="tobe-ai-field-count"><strong>'+invalid+'</strong> sugerencias incompatibles</span>'+
    (incomplete?'<span class="tobe-ai-field-count"><strong>'+incomplete+'</strong> que la IA debe corregir</span>':'')+
    '<span class="tobe-ai-field-count"><strong>'+absent+'</strong> sin sugerencia</span>'+
    '<details class="tobe-subdetails"><summary>Qué significa cada estado y cómo actuar</summary>'+
    '<p><b>Con sugerencia:</b> la IA propone un valor, pero no está aplicado. '+
    '<b>Incompatible:</b> la propuesta contradice la transformación o el catálogo, y necesita revisión. '+
    '<b>Debe corregir:</b> el revisor automático detectó un problema concreto. '+
    '<b>Sin sugerencia:</b> la IA omitió este campo; no significa que falte información del cliente. '+
    'Las cantidades se refieren a los campos de esta actividad, no al número de actividades analizadas. '+
    '<b>Acciones únicas en 03.3:</b> Aplicar abre una vista previa sin modificar todavía el TO-BE; '+
    'confirmar registra el cambio y su origen. Mantener guarda la elección de conservar tu valor. '+
    'Editar modifica el único campo del borrador. Los candidatos incompatibles no se importan. '+
    'No necesitas aprobar primero la propuesta completa en 03.2.</p></details>'+
    '</div>';
}
// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] END

// [AUNEA-FE-PG11-FIELD-INLINE-263] START — existing input controls remain sole owners.
// SOURCE: Simulator CANONICAL PG11; DEC-050, DEC-056; IA versioned proposal.
// INPUT: existing TO-BE item and source-linked IA; OUTPUT: read-only, field-adjacent advice.
// SIDE EFFECTS: none. An explicit existing human decision gates any apply action.
function tobeAiInlineHint(e,p,item,key){
  if(item.isAddition)return '';
  const currentData=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  const id=String(item.sourceStepId),
    keyForAi=typeof internalAiPilotKey==='function'?internalAiPilotKey(e):null,
    partial=!currentData&&keyForAi&&typeof internalAiPendingSteps==='function'?
      internalAiPendingSteps(e,keyForAi)?.items?.get(id):null,
    history=!currentData&&!partial&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null;
  const data=currentData||history?.proposal;
  const ai=partial||data?.items?.find(x=>String(x.source_step_id)===id);
  if(!ai||!Array.isArray(ai.source_refs)||
     !ai.source_refs.map(String).includes(id))return '';
  if((history&&!currentData)||partial){
    const info=TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key);
    if(!info)return '';
    const raw=String(ai[info[0]]??'').trim();
    const options=info[3].startsWith('OS_')?fieldOptions(info[3]):[];
    const parts=info[3]==='OS_ARTIFACT_TYPE'?raw.split(/[,;|]/):[raw];
    const display=raw&&options.length?parts.filter(Boolean).map(v=>{
      const value=v.trim(),found=options.find(x=>String(x.value)===value||
        String(x.label||'').trim().toLowerCase()===value.toLowerCase());
      return String(found?.label||value);
    }).join(' · '):raw;
    const narrative=typeof internalAiPilotNarrative==='function'?
      internalAiPilotNarrative(ai.rationale):{reason:''};
    return '<div class="tobe-ai-inline" data-tobe-ai-field-key="'+attr(key)+'">'+
      '<p class="field-help"><b>'+(partial?'IA · Propuesta individual pendiente':
        'IA histórica · v'+esc(history.version))+
      ':</b> '+esc(display||'Sin valor propuesto')+'</p>'+
      '<p class="field-help tobe-ia-provenance">'+(partial?
        'Sólo consulta hasta completar las actividades y comprobar coherencia.':
        'Solo lectura · borrador actual v'+esc(p.version)+'.')+'</p>'+
      (raw?'<details class="tobe-subdetails"><summary>Fundamento y fuentes de la propuesta IA</summary>'+
        '<p><b>Justificación general de la actividad:</b> '+esc(narrative.reason||'Sin justificación adicional')+'</p>'+
        '<p><b>Referencias de origen:</b> '+esc(tobeHumanReadableRefs(e,ai.source_refs))+'</p>'+
        '<p><b>Condiciones pendientes:</b> '+esc(ai.limitations||'No declaradas')+'</p>'+
        '</details>':'')+
      '</div>';
  }
  const diff=tobeAiReviewDiff(e,p,item.sourceStepId),
    matched=diff.allFields.find(x=>x.key===key),
    skipped=diff.skipped.find(x=>x.key===key),
    field=TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key);
  if(!field)return '';
  const decision=tobeHumanReviewRecord(e,p)?.decisions?.[String(item.sourceStepId)],
    legacyDiscard=decision?.status==='DISCARD',
    refs=tobeHumanReadableRefs(e,ai.source_refs),
    pending=String(ai.limitations||'').trim(),
    value=matched?.display||skipped?.raw||'';
  const lastChoice=(p.aiDraft?.applyHistory||[]).filter(x=>
    String(x.sourceStepId)===String(item.sourceStepId)&&
    Array.isArray(x.fields)&&x.fields.includes(key)&&
    x.proposalFingerprint===tobeCandidateFingerprint(p)).slice(-1)[0];
  const kept=lastChoice?.action==='KEEP';
  const applied=lastChoice?.action==='APPLY'&&!!matched&&!matched.changed;
  // A narrative can describe automation without producing a field candidate.
  // Explain the gap but never populate the consultant-owned field implicitly.
  const narrative=typeof internalAiPilotNarrative==='function'?
    internalAiPilotNarrative(ai.rationale):{action:''};
  const missingAutomationCandidate=key==='automationAi'&&!matched&&!skipped&&
    /automatiz|autom[aá]tic/i.test(String(narrative.action||''));
  const structuredIssue=(!matched&&!skipped)?(data?.review?.issues||[]).find(issue=>
    issue.category==='BLOCKING'&&String(issue.step_id)===id&&
    String(issue.evidence||'').split(/[^a-z_]/i).includes(field[0])):null;
  // Do not fill the design with nine repetitions of "no candidate".
  // The count remains in the traceability drawer; only actionable evidence
  // and known deficiencies appear next to the unique consultant-owned editor.
  if(!matched&&!skipped&&!structuredIssue&&!missingAutomationCandidate&&!lastChoice)return '';
  return '<div class="tobe-ai-inline'+(!matched&&!skipped?' tobe-ai-no-candidate':'')+
    '" data-tobe-ai-field-key="'+attr(key)+'">'+
    '<p class="field-help"><b>'+(!matched&&!skipped?'IA: sin candidato estructurado para este campo':'IA propone:')+'</b> '+esc(value)+
    (skipped?' · <b>Revisión manual necesaria</b>':
      matched&&!matched.changed?' · Coincide con el TO-BE':'')+'</p>'+
    (skipped?'<p class="field-help">'+esc(skipped.reason)+'</p>':'')+
    (structuredIssue?
      '<p class="field-help tobe-ai-candidate-gap" role="alert"><b>Por qué no se puede aplicar:</b> '+
        esc(structuredIssue.issue||'La propuesta IA no contiene un valor estructurado válido.')+
        ' <b>Siguiente paso:</b> corrige la propuesta en 03.2 o conserva el valor TO-BE. No vuelvas a preguntar al cliente un dato ya capturado.</p>':
      missingAutomationCandidate?
      '<p class="field-help tobe-ai-candidate-gap"><b>La propuesta está incompleta:</b> en 03.2 se menciona automatización, pero no se especifica una acción utilizable en este campo. '+
      'Indica si se ejecutaría con reglas o con IA, con qué condiciones y quién revisaría excepciones. No se habilita aplicar hasta disponer de esa definición.</p>':'')+
    ((matched||skipped)?'<details class="tobe-subdetails"><summary>Fuentes y condiciones del campo</summary>'+
      '<p><b>Referencias de origen:</b> '+esc(refs||'No identificadas')+'</p>'+
      (pending?'<p><b>Por verificar:</b> '+esc(pending)+'</p>':'')+
    '</details>':'')+
    (kept?'<p class="field-help"><b>Estado del campo:</b> mantener el valor TO-BE guardado.</p>':
      applied?'<p class="field-help"><b>Estado del campo:</b> sugerencia IA aplicada y guardada.</p>':
      lastChoice?.action==='EDIT'?'<p class="field-help"><b>Estado del campo:</b> alternativa editada por el consultor.</p>':'')+
    (legacyDiscard?'<p class="field-help">Consta un descarte de la propuesta completa en el historial anterior. '+
      'Este registro no bloquea las decisiones individuales de 03.3.</p>':
      skipped?'<p class="field-help">Valor no aplicable: revísalo en el control original.</p>':'')+
    '</div>';
}
// [AUNEA-FE-PG11-CLIENT-CONTEXT-269] START — Read-only evidence and conditions.
// The IA limitations are proposals to verify, NEVER confirmed client claims.
function tobeAiOperationalContextHtml(e,item){
  if(item.isAddition)return '';
  const saved=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  const id=String(item.sourceStepId),
    keyForAi=typeof internalAiPilotKey==='function'?internalAiPilotKey(e):null,
    partial=!saved&&keyForAi&&typeof internalAiPendingSteps==='function'?
      internalAiPendingSteps(e,keyForAi)?.items?.get(id):null,
    history=!saved&&!partial&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null;
  const proposal=saved||history?.proposal;
  const ai=partial||proposal?.items?.find(x=>String(x.source_step_id)===id);
  if(!ai)return '<p class="tobe-ai-operational-context tobe-muted">Sin propuesta IA vigente para esta actividad. El diseño debe basarse en el AS-IS y las evidencias confirmadas.</p>';
  const limitations=String(ai.limitations||'').trim();
  const refs=typeof tobeHumanReadableRefs==='function'?tobeHumanReadableRefs(e,ai.source_refs):
    (typeof internalAiReadableRefs==='function'?internalAiReadableRefs(e,ai.source_refs):
    (Array.isArray(ai.source_refs)?ai.source_refs:[]).join(' · '));
  const historical=!!history;
  return '<details class="tobe-ai-operational-context" role="note">'+
    '<summary>Limitaciones sugeridas por IA · '+(limitations?'Contrastar con datos declarados':'Sin detalle específico')+
      (historical?' · Histórica v'+esc(history.version):
        partial?' · Sin consolidar':'')+'</summary>'+
    '<div class="tobe-ai-operational-body">'+
      '<p><b>Texto generado por IA, pendiente de contrastar:</b> '+esc(limitations||'La IA no ha detallado restricciones para esta actividad.')+'</p>'+
      '<p><b>Referencias de origen:</b> '+esc(refs||'Sin referencias identificadas')+'</p>'+
      '<p><b>Criterio:</b> una limitación propuesta por IA no es una restricción confirmada. Los tiempos, frecuencias y condiciones que consten en el AS-IS siguen siendo datos declarados por el cliente. '+
      'La IA no puede considerarlos hipotéticos sólo porque no haya reconocido su fuente. Contrasta cualquier contradicción con el dato original antes de concluir que está pendiente.</p>'+
      (historical?'<p>Propuesta anterior: sólo lectura, no aplicable a esta versión.</p>':
        partial?'<p>Propuesta guardada sin consolidar: no se puede aplicar todavía.</p>':'')+
    '</div></details>';
}
// [AUNEA-FE-PG11-CLIENT-CONTEXT-269] END
// [AUNEA-FE-PG11-APPROVED-ROW-ACTIONS-273] START — Only the current
// version's reviewed IA can be applied. All values remain consultant-owned.
// [AUNEA-FE-PG11-ROW-DECISION-278] START — Consultant-owned actions; historical IA is never imported automatically.
function tobeAiRowActions(e,p,item,key){
  if(item.isAddition||!tobeEditable(p))return '';
  const id=String(item.sourceStepId),
    isCurrent=typeof internalAiSavedDraft==='function'&&
      internalAiSavedDraft(e)?.items?.some(x=>String(x.source_step_id)===id),
    diff=isCurrent?tobeAiReviewDiff(e,p,id):null,
    candidate=diff?.allFields?.find(x=>x.key===key),
    incompatible=diff?.skipped?.find(x=>x.key===key),
    canApply=!!candidate?.changed&&!diff.issue,
    history=(p.aiDraft?.applyHistory||[]).filter(x=>String(x.sourceStepId)===id&&
      Array.isArray(x.fields)&&x.fields.includes(key)&&
      x.proposalFingerprint===tobeCandidateFingerprint(p)).slice(-1)[0],
    applied=history?.action==='APPLY'&&!!candidate&&!candidate.changed;
  const action=(label,attribute,active=false,title='')=>
    '<button type="button" class="btn btn-outline btn-small'+(active?' is-selected':'')+
    '" '+attribute+' title="'+attr(title||label)+'">'+esc(label)+'</button>';
  if(!candidate&&!incompatible)return '';
  return '<div class="tobe-ai-row-actions aunea-ui-button-row" aria-label="Decisión sobre la propuesta IA de '+esc(
    TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key)?.[2]||'este campo')+'">'+
    (canApply?
      action('Aplicar IA',
        'data-tobe-ai-use-field="'+attr(key)+'" data-tobe-ai-action-source="'+attr(id)+'"',
        false,'Aplicar sugerencia IA autorizada'):
      applied?'<span class="field-help" role="status">IA aplicada</span>':'')+
    action('Mantener','data-tobe-ai-keep-field="'+attr(key)+
      '" data-tobe-ai-action-source="'+attr(id)+'"',history?.action==='KEEP',
      'Conservar mi valor TO-BE; no aplicar la alternativa IA')+
    action('Editar','data-tobe-ai-edit-field="'+attr(key)+
      '" data-tobe-ai-action-source="'+attr(id)+'"',false,
      'Abrir el editor único del campo del borrador TO-BE')+'</div>';
}
// [AUNEA-FE-PG11-ROW-DECISION-278] END
// [AUNEA-FE-PG11-APPROVED-ROW-ACTIONS-273] END
function tobeWithAiHint(e,p,item,key,html){
  // [AUNEA-FE-PG11-GUIDED-FIELD-267] START — The existing field keeps sole edit
  // ownership; the suggestion is a read-only sibling, not another control.
  if(item.isAddition)return html;
  const applied=(p?.aiDraft?.applyHistory||[]).findLast(x=>x.transaction&&!x.undoneAt&&x.sourceStepId===String(item.sourceStepId)&&x.fields?.includes(key));
  const patch=applied?.transaction?.changes?.find(x=>x.path[0]==='items'&&x.path.at(-1)===key);
  const ruleHint=applied?.provenance==='RULES'?'<p class="field-help"><b>Procedencia:</b> '+
    (patch&&JSON.stringify(item[key])===JSON.stringify(patch.after)?
      (applied.consultantModified?'Reglas ajustadas y confirmadas por el consultor.':'Reglas confirmadas por el consultor.'):
      'Edición del consultor posterior a la propuesta por reglas.')+'</p>':'';
  const advice=tobeAiInlineHint(e,p,item,key)+ruleHint;
  const original=typeof tobeProposalSourceSteps==='function'?tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item.sourceStepId)):null;
  const sourceKey=({futureActor:'actor',tool:'tool',inputs:'inputs',outputs:'outputs'})[key];
  const sourceValue=original&&sourceKey?original[sourceKey]:null;
  const category=key==='futureActor'?'OS_ACTOR_ROLE':key==='tool'?'OS_TOOL_CATEGORY':'OS_ARTIFACT_TYPE';
  const readable=x=>String((typeof labelFrom==='function'&&labelFrom(category,x))||x);
  const sourceLabel=sourceValue===null||sourceValue===undefined||sourceValue===''?'':(
    Array.isArray(sourceValue)?sourceValue.map(readable).join(' · '):readable(sourceValue));
  return '<div class="tobe-ai-field-row'+(advice?' has-ai-review':' is-without-proposal')+
    '" data-tobe-row-key="'+attr(key)+'">'+
    '<div class="tobe-ai-field-control">'+
      (sourceLabel?'<p class="tobe-ai-source-value"><b>Origen AS-IS:</b> '+esc(sourceLabel)+'</p>':'')+
      html+'</div>'+
    (advice?'<div class="tobe-ai-field-review">'+
      advice+tobeAiRowActions(e,p,item,key)+'</div>':'')+'</div>';
}
// [AUNEA-FE-PG11-GUIDED-FIELD-267] END
// [AUNEA-FE-PG11-FIELD-INLINE-263] END
