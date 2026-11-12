function saveTobeFromDom(e){
  const p=latestTobe(e);if(!tobeEditable(p))return false;
  const beforeFields=p.aiDraft?.proposal?JSON.parse(JSON.stringify(p.items)):null;
  document.querySelectorAll('[data-tobe-item]').forEach(el=>{
    const item=[...p.items,...tobeAddedSteps(p)].find(x=>x.id===el.dataset.tobeItem);
    if(item)item[el.dataset.tobeField]=el.value;
  });
  document.querySelectorAll('[data-tobe-catalog-item]').forEach(box=>{
    const item=[...p.items,...tobeAddedSteps(p)].find(x=>String(x.id)===box.dataset.tobeCatalogItem);
    const field=box.dataset.tobeCatalogField,select=box.querySelector('[data-model-set]');
    if(item&&select&&['futureActor','tool'].includes(field)){
      const next=String(resolveCatalogInput(select)||''),
        previous=String(item[field]||''),
        setId=field==='futureActor'?'OS_ACTOR_ROLE':'OS_TOOL_CATEGORY',
        option=fieldOptions(setId).find(o=>String(o.value)===previous||
          String(o.label||'').trim().toLowerCase()===previous.trim().toLowerCase());
      // A read-only navigation must not rewrite a client/consultant value from
      // its Spanish label to an internal code merely because the picker rendered.
      // A real change to another option is still recorded using its canonical ID.
      if(next!==previous&&(!option||String(option.value)!==next))item[field]=next;
    }
  });
  document.querySelectorAll('[data-tobe-multi-item]').forEach(box=>{
    if(box.dataset.tobeMultiReadonly==='1')return;
    const item=[...p.items,...tobeAddedSteps(p)].find(x=>String(x.id)===box.dataset.tobeMultiItem);
    if(!item)return;
    const key=box.dataset.tobeMultiKey,id=box.dataset.tobeMultiId;
    if(key!=='inputs'&&key!=='outputs')return;
    const chosen=[...box.querySelectorAll('[data-v1-multi]')].filter(x=>x.checked).map(x=>String(x.value));
    const current=tobeArtifactValues(item[key]);
    const removeLegacy=box.querySelector('[data-tobe-drop-legacy]')?.checked;
    item[key]=removeLegacy?chosen:[...chosen,...current.unknown];
    const other=typeof catalogOtherOption==='function'?
      catalogOtherOption(fieldOptions('OS_ARTIFACT_TYPE')):null;
    const detail=box.querySelector('[id="'+id+'_detail"]');
    if(!item._details||typeof item._details!=='object')item._details={};
    item._details[key]=detail?.value||'';
    if(other&&item._details[key]&&!item[key].includes(String(other.value)))
      item[key].push(String(other.value));
  });
  const start=document.querySelector('[data-tobe-flow-start]');
  const routes=[...document.querySelectorAll('[data-tobe-route-step]')];
  const decisionFields=[...document.querySelectorAll('[data-tobe-decision-criterion]')];
  if(start||routes.length||decisionFields.length){
    const flow=tobeMutableFlow(e,p);
    if(start)flow.startStepId=String(start.value);
    for(const el of routes){
      const id=String(el.dataset.tobeRouteStep),field=el.dataset.tobeRoute;
      if(field!=='normal'&&field!=='exception')continue;
      if(!flow.routes[id])flow.routes[id]={normal:'__PENDING__',exception:''};
      flow.routes[id][field]=String(el.value);
    }
    for(const el of decisionFields){
      const id=String(el.dataset.tobeDecisionCriterion||'');
      if(!id||!tobeFlowItem(e,p,id))continue;
      const value=String(el.value||'').trim();
      if(value)flow.decisionCriteria[id]=value;
      else delete flow.decisionCriteria[id]; // empty means inherit AS-IS (or unconfigured for new steps)
    }
  }
  if(typeof persistTobeAiDraft==='function'&&!persistTobeAiDraft(e))return false;
  // [AUNEA-FE-PG11-EDIT-AUDIT-298] START
  // PURPOSE: Audit actual consultant changes from the sole canonical controls.
  // SOURCE: DEC-050/052/055; PG11 field decisions. INPUTS: before/after DRAFT fields.
  // OUTPUTS: version-owned EDIT history. SIDE_EFFECTS: pending draft metadata only.
  // CHANGE_RISK: HIGH. Persistence remains the caller's existing saveState gate.
  if(beforeFields){
    for(const item of p.items){
      const before=beforeFields.find(x=>x.id===item.id);
      if(!before)continue;
      const fields=TOBE_AI_REVIEW_FIELDS.map(x=>x[1]).filter(key=>
        JSON.stringify(before[key])!==JSON.stringify(item[key]));
      if(!fields.length)continue;
      p.aiDraft.applyHistory=[...(p.aiDraft.applyHistory||[]),{
        sourceStepId:String(item.sourceStepId),fields,action:'EDIT',decision:'MANUAL_EDIT',
        proposalFingerprint:tobeCandidateFingerprint(p),
        previousValues:Object.fromEntries(fields.map(key=>[key,before[key]??null])),
        appliedValues:Object.fromEntries(fields.map(key=>[key,JSON.parse(JSON.stringify(item[key]??null))])),
        appliedAt:now()
      }].slice(-100);
    }
  }
  // [AUNEA-FE-PG11-EDIT-AUDIT-298] END
  p.updatedAt=now();markDirty('TO-BE v'+p.version+' actualizado');
  return true;
}
// [AUNEA-FE-PG11-CANONICAL-CONTROLS-251] START
// Reuse AS-IS process editor selections and catalogs; legacy drafts may contain
// CSV labels/codes. Never replace an unrecognized legacy value silently.
function tobeArtifactValues(value){
  const opts=typeof fieldOptions==='function'?fieldOptions('OS_ARTIFACT_TYPE'):[];
  const candidates=Array.isArray(value)?value:String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const resolved=[],unknown=[];
  for(const raw of candidates){
    const v=String(raw).trim(),option=opts.find(x=>
      String(x.value)===v||String(x.label||'').trim().toLowerCase()===v.toLowerCase());
    if(option){if(!resolved.includes(String(option.value)))resolved.push(String(option.value));}
    else if(v)unknown.push(v);
  }
  return {resolved,unknown};
}
function tobeArtifactDisplay(value,otherDetail=''){
  const v=tobeArtifactValues(value),other=catalogOtherOption(fieldOptions('OS_ARTIFACT_TYPE'));
  const labels=v.resolved.map(x=>x===String(other?.value)&&String(otherDetail||'').trim()?
    (labelFrom('OS_ARTIFACT_TYPE',x)||'Otro')+': '+String(otherDetail).trim():
    labelFrom('OS_ARTIFACT_TYPE',x)||x);
  return [...labels,...v.unknown].join(' · ')||'No documentado';
}
function tobeCatalogField(item,key,label,setId,disabled=false){
  const raw=String(item[key]||''),opts=fieldOptions(setId),
    match=opts.find(o=>String(o.value)===raw||
      String(o.label||'').trim().toLowerCase()===raw.trim().toLowerCase());
  const selected=match?String(match.value):raw;
  const id='tobe_catalog_'+key+'_'+String(item.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const control=disabled?'<input disabled value="'+attr(match?.label||raw)+'">':
    datalistControl(id,setId,selected,'Selecciona una opción del catálogo vigente');
  return '<div class="field" data-tobe-catalog-item="'+attr(item.id)+
    '" data-tobe-catalog-field="'+attr(key)+'"><label>'+esc(label)+'</label>'+
    control+'</div>';
}
// [AUNEA-FE-PG11-ARTIFACT-PROVENANCE-312] START
// SOURCE: PG04/ProcessStep DF035/036, Simulator CANONICAL PG11,
// DEC-050, DEC-055/056 and AUNEA System palette.
// INPUTS: source confirmed AS-IS and versioned, consultant-owned TO-BE item.
// OUTPUTS: single canonical selectedHtml multi-select; color is computed, not stored.
// SIDE EFFECTS: none. The AS-IS baseline is read-only. Change risk: MEDIUM.
function tobeArtifactField(item,key,label,disabled=false,sourceStep=null){
  const opts=typeof fieldOptions==='function'?fieldOptions('OS_ARTIFACT_TYPE'):[],
    selected=tobeArtifactValues(item[key]),
    source=tobeArtifactValues(sourceStep?.[key]||[]),
    sourceSet=new Set(source.resolved.map(String)),
    htmlId='tobe_artifact_'+key+'_'+String(item.id).replace(/[^a-zA-Z0-9_-]/g,'_'),
    details=String(item._details?.[key]||''),
    sourceDetails=String(sourceStep?._details?.[key]||''),
    other=catalogOtherOption(opts),
    otherId=String(other?.value||''),
    current=details&&other&&!selected.resolved.includes(otherId)?
      [...selected.resolved,otherId]:selected.resolved,
    visible=[...new Set([...source.resolved,...current])],
    origin=value=>sourceSet.has(String(value))&&
      (String(value)!==otherId||details.trim()===sourceDetails.trim())?
      'asis':'improvement',
    controls=typeof selectedHtml==='function'?
      selectedHtml(htmlId,opts,current,{
        wrapped:true,detailId:htmlId+'_detail',detailValue:details,
        detailPlaceholder:'Especifica '+(key==='inputs'?'el dato de entrada':'el resultado')+
          ' al seleccionar Otro',
        preferredValues:[],choiceOrigin:origin
      }):
      '<p class="notice warn">No se ha cargado el componente canónico de multiselección.</p>';
  return '<div class="field full tobe-artifact-field process-modal-form"'+
    ' data-tobe-multi-item="'+attr(item.id)+'" data-tobe-multi-key="'+attr(key)+
    '" data-tobe-multi-id="'+attr(htmlId)+'"'+
    (disabled?' data-tobe-multi-readonly="1"':'')+'><label>'+esc(label)+'</label>'+
    '<p class="tobe-artifact-provenance-help">Verde: original conservado. Dorado: nuevo en TO-BE. '+
      'Sombreado: original retirado. Sin marca: no seleccionado. Todas las opciones están visibles; el AS-IS no cambia.</p>'+
    (disabled?'<fieldset disabled class="tobe-readonly-options">'+controls+'</fieldset>':controls)+
    (selected.unknown.length?'<p class="notice warn">Valor anterior no reconocido por el catálogo vigente: '+
      esc(selected.unknown.join(' · '))+
      '. Se conserva hasta que indiques expresamente que quieres retirarlo.</p>'+
      (disabled?'':'<label class="field-help"><input type="checkbox" data-tobe-drop-legacy="1"> '+
        'Eliminar estos valores antiguos no reconocidos al guardar</label>'):'')+
    '</div>';
}
// [AUNEA-FE-PG11-ARTIFACT-PROVENANCE-312] END
// [AUNEA-FE-PG11-CANONICAL-CONTROLS-251] END
// [AUNEA-FE-PG11-FIELD-GUIDANCE-246] START — field help never persists as data.
const TOBE_FIELD_HELP={
 stepName:'Nombra la actividad futura con una acción y un resultado claros.',
 problemResolved:'Explica qué problema diagnosticado resuelve esta decisión, por qué y con qué evidencia.',
 futureActor:'Indica el rol responsable en el proceso futuro; no inventes nombres ni responsables.',
 tool:'Indica la herramienta o sistema sólo si existe decisión o evidencia que lo respalde.',
 inputs:'Describe qué datos o documentos entran en este paso y de dónde proceden.',
 outputs:'Describe qué resultado, documento o registro produce este paso y su destinatario.',
 automationAi:'Distingue qué se automatiza con reglas y qué requiere IA, si corresponde.',
 humanSupervision:'Indica quién valida, autoriza o atiende excepciones y en qué momento.',
 controlsRisk:'Describe los riesgos aplicables, controles previstos y pruebas de cumplimiento.',
 futureTime:'Introduce un tiempo futuro con unidad únicamente si está sustentado por un supuesto.',
 futureTimeAssumption:'Explica la fuente, condiciones y límites del tiempo futuro propuesto.'
};
// [AUNEA-FE-PG11-TRANSFORMATION-UX-258] START
// Same persisted field in every state; only its visible label, guidance and
// validation vary. Switching transformation must never clear a draft value.
function tobeTransformationRationaleLabel(transformation){
  switch(String(transformation||'')){
    case 'Se mantiene':return 'Motivo para conservar la actividad';
    case 'Se elimina':return 'Motivo para retirar la actividad del TO-BE';
    case 'Se modifica':return 'Motivo de la modificación y problema que resuelve';
    case 'Se automatiza':return 'Problema que resuelve la automatización';
    case 'Se asiste con IA':return 'Problema que resuelve la asistencia con IA';
    case 'Requiere decisión humana':return 'Motivo de la decisión humana';
    case 'Se incorpora control':return 'Riesgo o problema que resuelve el control';
    default:return 'Motivo del diseño futuro';
  }
}
function tobeMeaningfulRationale(value){
  return !!String(value??'').trim()&&
    !/^(?:no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(String(value).trim());
}
// [AUNEA-FE-PG11-TRANSFORMATION-UX-258] END
function tobeFieldHelp(key,item){
 if(key==='problemResolved'&&item?.transformation==='Se mantiene')
   return 'Explica por qué debe mantenerse la actividad sin rediseño, con qué evidencia y cómo se controlan sus hallazgos.';
 if(key==='problemResolved'&&item?.transformation==='Se elimina')
   return 'Justifica por qué se elimina la actividad y cómo se mantienen sus controles, datos y obligaciones.';
 if(key==='problemResolved'&&item?.transformation==='Se modifica')
   return 'Describe qué cambia respecto al AS-IS, qué problema documentado atiende y cuál es la justificación.';
 if(key==='problemResolved'&&item?.transformation==='Se automatiza')
   return 'Indica qué tarea manual se automatizaría, la necesidad diagnosticada y la evidencia disponible.';
 if(key==='problemResolved'&&item?.transformation==='Se asiste con IA')
   return 'Indica qué tarea necesita asistencia de IA y qué problema documentado atiende.';
 if(key==='problemResolved'&&item?.transformation==='Requiere decisión humana')
   return 'Explica por qué se necesita una decisión humana y qué riesgo o excepción debe atender.';
 if(key==='problemResolved'&&item?.transformation==='Se incorpora control')
   return 'Indica el riesgo detectado y el control que se propone incorporar.';
 return TOBE_FIELD_HELP[key]||'Describe la información solicitada y su justificación.';
}
function tobeField(item,key,label,value,type='text',disabled=false){
 const help=tobeFieldHelp(key,item),raw=String(value??'');
 const suspect=/^(no|n\/a|ninguno)$/i.test(raw.trim())&&['problemResolved','automationAi','humanSupervision','controlsRisk'].includes(key);
 const warning=suspect?'<p class="field-help">Valor heredado sin explicación («'+esc(raw)+'»). Revísalo: no equivale a una justificación.</p>':'';
 const shown=raw; // Never silently discard legacy consultant/AI text while editing.
 return '<div class="field"'+(key==='problemResolved'?' data-tobe-rationale-wrapper="1"':'')+
   '><label'+(key==='problemResolved'?' data-tobe-rationale-label="1"':'')+'>'+esc(label)+'</label>'+
 (type==='textarea'?'<textarea data-tobe-item="'+attr(item.id)+'" data-tobe-field="'+attr(key)+'" placeholder="'+attr(help)+'" '+(disabled?'disabled':'')+'>'+esc(shown)+'</textarea>':
 '<input data-tobe-item="'+attr(item.id)+'" data-tobe-field="'+attr(key)+'" value="'+attr(shown)+'" placeholder="'+attr(help)+'" '+(disabled?'disabled':'')+'>')+
 warning+'</div>';
}
// [AUNEA-FE-PG11-FIELD-GUIDANCE-246] END
// [AUNEA-FE-PG11-WORKSPACE-205] START — single versioned TO-BE canvas and contextual inspector.
// SOURCE: Simulator CANONICAL v1.14 PG11; DEC-050/052/055; PG04 graph source.
// INPUTS: confirmed AS-IS snapshot, official diagnostic, TO-BE DRAFT and bounded AI suggestions.
// OUTPUTS: read-only source graph projection, human-editable TO-BE inspector; no new data owner.
let __auneaTobeSelection={engagementId:'',version:0,stepId:''};
let __auneaTobeMode='guided'; // UI-only display preference; not a business data field.
function tobeSelectedItem(e,p){
  if(!p?.items?.length)return null;
  if(__auneaTobeSelection.engagementId!==e.id||__auneaTobeSelection.version!==p.version){
    __auneaTobeSelection={engagementId:e.id,version:p.version,stepId:String(p.items[0].sourceStepId)};
  }
  const selected=tobeFlowItem(e,p,__auneaTobeSelection.stepId);
  if(!selected)__auneaTobeSelection.stepId=tobeFlowItemId(p.items[0]);
  return selected||p.items[0];
}
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

// [AUNEA-FE-PG11-AI-STEP-APPLY-230] START — source-linked,
 // field-selected manual application with explicit review and persistent audit.
 // No new route or automatic technical/client approval.
// SOURCE: DEC-050/052/055; PG11 CANONICAL; existing reviewer and human decisions.
// [AUNEA-FE-PG11-KEEP-FIELD-270] START — Explicit, versioned KEEP decision.
// It records intent without changing the canonical editable value.
function tobeKeepAiReviewedField(e,sourceId,key){
  if(!e||state.activePage!=='tobe')return false;
  const p=latestTobe(e),item=p?.items?.find(x=>String(x.sourceStepId)===String(sourceId)),
    valid=TOBE_AI_REVIEW_FIELDS.some(x=>x[1]===key);
  if(!tobeEditable(p)||!item||!valid)
    return toast('No se puede conservar este campo en el borrador actual.'),false;
  // KEEP is a consultant-owned choice even if IA is historical or incomplete.
  // This never approves or imports a historical AI proposal.
  if(!saveTobeFromDom(e)||!saveState('Guardar valor manual antes de mantener'))
    return toast('El valor actual no pudo guardarse.'),false;
  const live=currentEng(),draft=latestTobe(live),
    prior=JSON.parse(JSON.stringify(draft.aiDraft?.applyHistory||[]));
  if(!draft.aiDraft)draft.aiDraft={};
  draft.aiDraft.applyHistory=[...prior,{
    sourceStepId:String(sourceId),fields:[key],action:'KEEP',
    decision:'KEEP_VALUE',proposalFingerprint:tobeCandidateFingerprint(draft),
    appliedAt:now()
  }].slice(-100);
  markDirty('PG11: mantener valor '+key);
  if(!saveState('Guardar elección de mantener valor')){
    draft.aiDraft.applyHistory=prior;
    return toast('No se guardó la elección. El valor anterior se conserva.'),false;
  }
  const last=(latestTobe(currentEng())?.aiDraft?.applyHistory||[]).slice(-1)[0];
  if(last?.action!=='KEEP'||last.sourceStepId!==String(sourceId)||last.fields?.[0]!==key)
    return toast('No se ha podido verificar la decisión guardada.'),false;
  render();
  toast('Se mantiene tu valor TO-BE. No se ha aplicado la IA.');
  return true;
}
// [AUNEA-FE-PG11-KEEP-FIELD-270] END
function tobeApplyAiReviewedFields(e,sourceId,keys){
  if(!e||state.activePage!=='tobe')return false;
  const draft=latestTobe(e),first=tobeAiReviewDiff(e,draft,sourceId),
    wanted=new Set((keys||[]).map(String));
  if(first.issue)return toast(first.issue),false;
  if(!wanted.size)return toast('Selecciona primero los campos que quieres trasladar.'),false;
  if([...wanted].some(k=>!first.fields.some(x=>x.key===k)))
    return toast('La selección ya no coincide con la propuesta IA vigente.'),false;
  // Save all the consultant's pending edits before applying anything from the IA.
  if(!saveTobeFromDom(e)||!saveState('Guardar diseño antes de aplicar selección IA'))
    return toast('No se guardó el diseño manual; no se aplicó ningún cambio IA.'),false;
  const live=currentEng(),p=latestTobe(live),fresh=tobeAiReviewDiff(live,p,sourceId);
  if(fresh.issue||[...wanted].some(k=>!fresh.fields.some(x=>x.key===k)))
    return toast(fresh.issue||'El contenido ha cambiado. Revisa nuevamente los campos.'),false;
  const item=p.items.find(x=>String(x.sourceStepId)===String(sourceId)),
    previous=JSON.parse(JSON.stringify(item)),
    oldHistory=JSON.parse(JSON.stringify(p.aiDraft?.applyHistory||[])),
    chosen=fresh.fields.filter(x=>wanted.has(x.key));
  for(const field of chosen)item[field.key]=Array.isArray(field.value)?
    [...field.value]:field.value;
  // Audit metadata belongs to this versioned proposal, not to a second business owner.
  p.aiDraft.applyHistory=[...oldHistory,{
    sourceStepId:String(sourceId),fields:chosen.map(x=>x.key),action:'APPLY',
    decision:fresh.decision,proposalFingerprint:tobeCandidateFingerprint(p),
    previousValues:Object.fromEntries(chosen.map(field=>[field.key,previous[field.key]??null])),
    appliedValues:Object.fromEntries(chosen.map(field=>[field.key,JSON.parse(JSON.stringify(field.value))])),
    sourceRefs:[...(internalAiSavedDraft(live)?.items?.find(x=>String(x.source_step_id)===String(sourceId))?.source_refs||[])],
    appliedAt:now()
  }].slice(-100);
  p.updatedAt=now();markDirty('PG11: campos IA seleccionados por el consultor');
  if(!saveState('Guardar cambios IA autorizados en '+sourceId)){
    Object.assign(item,previous);p.aiDraft.applyHistory=oldHistory;
    markDirty('PG11: cambios IA pendientes de persistencia');
    return toast('No se guardaron los cambios. El diseño anterior se conserva en memoria.'),false;
  }
  const stored=latestTobe(currentEng())?.items.find(x=>String(x.sourceStepId)===String(sourceId));
  if(!stored||chosen.some(x=>JSON.stringify(stored[x.key])!==JSON.stringify(x.value))){
    toast('No se verificó la persistencia; no marques esta versión como revisada.');
    return false;
  }
  render();
  if(typeof requestAnimationFrame==='function')
    requestAnimationFrame(()=>document.getElementById('tobeStepDesign')?.
      scrollIntoView({behavior:'smooth',block:'start'}));
  toast('Aplicados '+chosen.length+' campos autorizados. Revisa el diseño y las rutas; el TO-BE no queda aprobado.');
  return true;
}
// [AUNEA-FE-PG11-AI-STEP-APPLY-230] END
// [AUNEA-FE-PG11-INSPECTOR-CHECKPOINT-214] START — show the existing verified
// per-step suggestion only when it matches the current DRAFT's versioned IA checkpoint.
// SOURCE: PG11 CANONICAL; DEC-050/052/055; no new business field or data owner.
// SIDE_EFFECTS: display-only. Never transfers an unreviewed item into TO-BE.
function tobeAiAdviceHtml(e,item,includeDecision=true){
  if(item?.isAddition)return '<div class="tobe-ai-empty"><p class="tobe-muted">Actividad incorporada por el consultor, vinculada a '+esc(item.sourceStepName)+'. La IA generada sobre el AS-IS no propone pasos nuevos automáticamente. Justifica la incorporación, su responsable y sus rutas antes de revisión.</p></div>';
  const key=typeof internalAiPilotKey==='function'?internalAiPilotKey(e):null;
  const cached=key&&typeof __auneaAiPreview!=='undefined'?__auneaAiPreview.get(key):null;
  const current=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  // Reuse the same version/hash/coverage gate as the IA panel, not a raw checkpoint
  // read: an older snapshot or a different Engagement must never be shown as current.
  const pending=key&&!cached&&!current&&typeof internalAiPendingSteps==='function'?
    internalAiPendingSteps(e,key):null;
  const approvedReadOnly=!tobeEditable(latestTobe(e))?latestTobe(e)?.aiDraft?.proposal:null;
  const archived=!cached&&!current&&!approvedReadOnly&&!pending?.items?.size&&
    typeof internalAiHistoricalDraft==='function'?internalAiHistoricalDraft(e):null;
  const draft=cached||current||approvedReadOnly||archived?.proposal;
  const stepId=String(item.sourceStepId);
  const fromCheckpoint=!draft&&!!pending?.items?.has(stepId);
  const remainingStepIds=fromCheckpoint?(latestTobe(e)?.items||[]).filter(x=>
    !pending.items.has(String(x.sourceStepId))).map(x=>String(x.sourceStepName||x.sourceStepId)):[];
  const suggestion=draft?.items?.find(x=>String(x.source_step_id)===stepId)||
    (fromCheckpoint?pending.items.get(stepId):null);
  if(!suggestion)return '<div class="tobe-ai-empty"><p class="tobe-muted">Todavía no hay una sugerencia de IA vigente para esta actividad. Si existen actividades verificadas pendientes de revisión, se mostrarán únicamente en sus pasos correspondientes.</p></div>';
  const narrative=typeof internalAiPilotNarrative==='function'?internalAiPilotNarrative(suggestion.rationale):{action:'',expected:'',reason:String(suggestion.rationale||'')};
  const issues=(draft?.review?.issues||[]).filter(x=>String(x.step_id||'GLOBAL')===stepId||
    String(x.step_id||'GLOBAL')==='GLOBAL');
  const blocking=issues.some(x=>x.category==='BLOCKING')||
    (draft?.review?.blocking_step_ids||[]).map(String).includes(stepId);
  const reviewMode=draft?.review?.review_mode==='RULES_ONLY'?
    'Revisión básica por reglas: no equivale a revisión semántica de IA.':
    draft?.review?'Revisión de coherencia guardada; no supone validación del cliente.':
    'Propuesta sin revisión de coherencia disponible.';
  const issueName=x=>x.category==='BLOCKING'?'Bloqueo':
    x.category==='PENDING'?'Pendiente de contraste':'Advertencia';
  const snapshot=typeof tobeProposalSnapshot==='function'&&typeof latestTobe==='function'?
    tobeProposalSnapshot(e,latestTobe(e)):null;
  const evidenceLabels={EV01:'Medición',EV02:'Declarado por el cliente',
    EV03:'Estimación AUNEA',EV04:'Hipótesis registrada',EV05:'Referencia comparable'};
  const facts=(snapshot?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'&&
    (Array.isArray(x.affected_steps)?x.affected_steps:Array.isArray(x.step_ids)?x.step_ids:[])
      .map(String).includes(stepId)).map(x=>{
      const parts=[],freq=x.frequency||{},effort=x.active_time_loss||{},
        frequency=Number(freq.value),duration=Number(effort.value);
      if(freq.mode==='percent'&&freq.value!==null&&freq.value!==undefined&&
         Number.isFinite(frequency))parts.push(frequency+' % de casos');
      if(effort.value!==null&&effort.value!==undefined&&Number.isFinite(duration)&&
         duration>0)parts.push(duration+' '+(effort.unit||'min')+' por caso afectado');
      if(!parts.length)return '';
      return String(x.client_label||'Fricción')+' ('+String(x.id||'')+'): '+
        parts.join(' · ')+'. Procedencia: '+
        (evidenceLabels[String(x.evidence_type||'').toUpperCase()]||'No especificada')+'.';
    }).filter(Boolean);
  return '<div class="tobe-advice-content" data-tobe-ai-transform="'+
    attr(suggestion.transformation||'')+'">'+
    (fromCheckpoint?'<div class="notice warn"><b>Propuesta individual guardada; pendiente de consolidación.</b> '+
      (remainingStepIds.length?'Falta analizar '+remainingStepIds.length+
        (remainingStepIds.length===1?' actividad: ':' actividades: ')+esc(remainingStepIds.join(' · '))+'. '+
        'Al terminar se comprobará la coherencia entre actividades. ':'')+
      'No se ha aplicado ni aprobado ningún cambio.'+
      (remainingStepIds.length?'<div><button type="button" class="btn btn-outline btn-small" data-tobe-generate-all-remaining>Analizar actividades pendientes</button></div>':'')+
      '</div>':'')+
    (archived?'<p class="notice warn"><b>Propuesta histórica, sólo lectura.</b> Corresponde al TO-BE v'+
      esc(archived.version)+'. No se aplica al proceso vigente sin una revisión del consultor.</p>':'')+
    '<div class="tobe-advice-label">'+esc(suggestion.transformation||'Sin clasificar')+
      (fromCheckpoint?' · Sin consolidar':
        blocking?' · Requiere corrección':' · Propuesta sin aprobar')+'</div>'+
    '<p class="tobe-ai-review-method" role="status">'+esc(reviewMode)+'</p>'+
    (facts.length?'<div class="tobe-ai-confirmed-facts" role="note"><b>Datos ya registrados en el AS-IS:</b> '+
      esc(facts.join(' '))+
      ' Estas cifras conservan su procedencia; no son por sí solas mediciones ni ahorros futuros.</div>':'')+
    '<p class="notice info" data-tobe-ai-difference="1"'+
      (item.transformation&&item.transformation!==suggestion.transformation?'':' hidden')+'>'+
      'La IA propone «'+esc(suggestion.transformation||'Sin clasificar')+
      '» y tu diseño indica «'+esc(item.transformation||'Sin definir')+
      '». Revisa la diferencia: aceptar la propuesta no modifica automáticamente el proceso.'+
    '</p>'+
    '<dl class="tobe-advice-pairs">'+
    '<div><dt>Problema identificado</dt><dd>'+esc(suggestion.problem_resolved||'No concretado')+'</dd></div>'+
    '<div><dt>Intervención recomendada</dt><dd>'+esc(narrative.action||'No concretada')+'</dd></div>'+
    '<div><dt>Resultado esperado</dt><dd>'+esc(narrative.expected||'No declarado')+'</dd></div>'+
    '</dl>'+
    '<details class="tobe-subdetails"><summary>Justificación, fuentes y aspectos por revisar</summary>'+
      '<p><b>Justificación:</b> '+esc(narrative.reason||'No declarada')+'</p>'+
      '<p><b>Referencias del AS-IS:</b> '+esc((typeof tobeHumanReadableRefs==='function'?
        tobeHumanReadableRefs(e,suggestion.source_refs):
        (typeof internalAiReadableRefs==='function'?internalAiReadableRefs(e,suggestion.source_refs):
          (suggestion.source_refs||[]).join(' · ')))||'No identificadas')+'</p>'+
      '<p><b>Limitaciones redactadas por IA (no confirmadas):</b> '+
        esc(suggestion.limitations||'La IA no ha propuesto limitaciones específicas.')+'</p>'+
      (fromCheckpoint?'<p>Consolidación entre actividades pendiente. No se puede aplicar ni aprobar esta propuesta.</p>':
        issues.length?'<div class="tobe-ai-quality-issues"><b>Qué debe resolverse antes de utilizar la propuesta:</b>'+
          '<ul>'+issues.map(x=>'<li><strong>'+issueName(x)+':</strong> '+
            esc(x.issue||'Observación sin descripción')+
            (x.evidence?'<span><b>Fuente o dato:</b> '+esc(x.evidence)+'</span>':'')+
            (x.action?'<span><b>Qué hacer:</b> '+esc(x.action)+'</span>':'')+
          '</li>').join('')+'</ul></div>':
        '<p>El revisor no registró observaciones específicas. La viabilidad técnica y las decisiones siguen pendientes de validación humana.</p>')+
    '</details>'+
    ''+
    (includeDecision?tobeHumanReviewHtml(e,item,!!archived):'')+
    '<p class="tobe-muted">Las oportunidades globales y la propuesta individual son información para contrastar. '+
      'Decide únicamente en 03.3, campo por campo o mediante la vista previa de una alternativa estructural. '+
      'El borrador no cambia por leer o volver a analizar estas propuestas.</p>'+
    '</div>';
}
// [AUNEA-FE-PG11-INSPECTOR-CHECKPOINT-214] END
// [AUNEA-FE-PG11-HUMAN-DECISIONS-223] START — one deliberate review decision
// per source activity, stored only in the existing versioned TO-BE aiDraft owner.
// SOURCE: PG11 CANONICAL (consultant decision); DEC-050/052/055; PG11 plan C.
// No new client capture; no AI-to-TOBE field copy; decision is not approval.
const TOBE_HUMAN_DECISIONS=Object.freeze(['ACCEPT','MODIFY','DISCARD']);
const TOBE_HUMAN_LABELS=Object.freeze({
  ACCEPT:'Aceptar recomendación',MODIFY:'Modificar antes de usar',
  DISCARD:'Descartar recomendación'
});
function tobeCandidateFingerprint(p,sourceId=null){
  const items=p?.aiDraft?.proposal?.items||p?.aiDraft?.checkpoint?.items||[];
  // A decision depends on its own evidence and on relevant consolidation findings.
  // Legacy whole-proposal fingerprints remain valid only for that exact proposal.
  const review=p?.aiDraft?.proposal?.review;
  const candidate=sourceId===null?items:{
    item:items.find(x=>String(x.source_step_id)===String(sourceId))||null,
    reviewMode:review?.review_mode||null,
    blocked:(review?.blocking_step_ids||[]).map(String).includes(String(sourceId)),
    issues:(review?.issues||[]).filter(x=>!x.step_id||x.step_id==='GLOBAL'||String(x.step_id)===String(sourceId))
  };
  const raw=JSON.stringify(candidate);
  let hash=2166136261;
  for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619)>>>0;
  return hash.toString(16)+':'+raw.length;
}
function tobeHumanReviewRecord(e,p){
  const h=p?.aiDraft?.humanReview,diag=currentDiagnosticOutput(e),
    input=p?.aiDraft?.proposal?.input_hash||p?.aiDraft?.checkpoint?.inputHash;
  if(!h||!diag||!input||h.tobeVersion!==p.version||
    h.sourceSnapshotVersion!==p.sourceSnapshotVersion||
    h.diagnosticInputHash!==diag.input_snapshot_hash||h.proposalInputHash!==input)return null;
  if(h.proposalFingerprint===tobeCandidateFingerprint(p))return h;
  const decisions=Object.fromEntries(Object.entries(h.decisions||{}).filter(([id,decision])=>
    decision.proposalStepFingerprint===tobeCandidateFingerprint(p,id)));
  return Object.keys(decisions).length?{...h,proposalFingerprint:tobeCandidateFingerprint(p),decisions}:null;
}
// [AUNEA-FE-PG11-AI-ACCEPT-GATE-355] START — checked proposal only.
function tobeAiAcceptanceIssue(e,p,sourceId){
  const current=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null,
    id=String(sourceId),
    candidate=current?.items?.find(x=>String(x.source_step_id)===id),
    review=current?.review;
  if(!candidate||!review)return 'No hay una propuesta consolidada y revisada para esta actividad.';
  const issues=(review.issues||[]).filter(x=>String(x.step_id||'GLOBAL')==='GLOBAL'||
    String(x.step_id)===id);
  if((review.blocking_step_ids||[]).map(String).some(x=>x===id||x==='GLOBAL')||
     issues.some(x=>x.category==='BLOCKING'))
    return 'La propuesta tiene bloqueos de calidad sin resolver. Corrígela o registra «Modificar antes de usar».';
  if(candidate.transformation==='Se mantiene'){
    const narrative=typeof internalAiPilotNarrative==='function'?
      internalAiPilotNarrative(candidate.rationale):{action:String(candidate.rationale||'')};
    if(/\b(?:implementar|implantar|automatizar|integrar|rediseñar|sustituir|crear)\b/i.test(
      String(narrative.action||'')+' '+String(candidate.automation_ai||'')))
      return '«Se mantiene» contradice la intervención nueva. Revisa la clasificación antes de aceptar.';
  }
  if(issues.some(x=>x.category==='PENDING'&&x.origin==='CONTROL_FUENTE_ASIS'))
    return 'Hay afirmaciones IA sin contraste con el AS-IS. Modifica la propuesta o vuelve a analizar tras corregirlas.';
  return '';
}
// [AUNEA-FE-PG11-AI-ACCEPT-GATE-355] END
function tobeHumanReviewHtml(e,item,historical){
  const p=latestTobe(e);
  if(historical||!tobeEditable(p))return '';
  const record=tobeHumanReviewRecord(e,p)?.decisions?.[String(item.sourceStepId)]||null;
  const label=TOBE_HUMAN_LABELS[record?.status]||'Sin decisión';
  const id=String(item.sourceStepId),
    acceptIssue=tobeAiAcceptanceIssue(e,p,id);
  return '<section class="tobe-human-review" aria-label="Decisión humana sobre la propuesta">'+
    '<h4>Decisión del consultor sobre la propuesta</h4>'+
    '<p class="tobe-muted"><b>Aceptar:</b> registra tu conformidad sólo si la propuesta no tiene bloqueos. '+
      '<b>Modificar:</b> conserva tu criterio para ajustar el TO-BE sin importar campos IA bloqueados. '+
      '<b>Descartar:</b> conserva tu diseño y rechaza la propuesta. Ninguna acción modifica automáticamente el proceso.</p>'+ 
    (acceptIssue?'<p class="notice warn tobe-ai-accept-explanation" role="status"><b>Aceptación no disponible:</b> '+
      esc(acceptIssue)+' Puedes modificar o descartar, o volver a analizar tras resolver el problema.</p>':'')+
    '<p class="tobe-human-review-status"><b>Estado:</b> '+esc(label)+'</p>'+
    '<div class="field"><label for="tobeHumanReviewNote">Justificación de la decisión</label>'+
    '<textarea id="tobeHumanReviewNote" rows="3" placeholder="Explica qué evidencia y condiciones sustentan tu decisión. No inventes datos.">'+
    esc(record?.note||'')+'</textarea></div>'+
    '<div class="tobe-human-review-actions">'+
      TOBE_HUMAN_DECISIONS.map(status=>'<button type="button" class="btn '+
        (record?.status===status?'btn-primary':'btn-outline')+
        '" data-tobe-human-decision="'+status+'" data-tobe-human-source="'+attr(id)+'"'+
        (status==='ACCEPT'&&acceptIssue?' disabled title="'+attr(acceptIssue)+'"':'')+'>'+
        esc(TOBE_HUMAN_LABELS[status])+'</button>').join('')+
    '</div><p class="tobe-muted">La decisión no modifica el proceso. Después de guardarla, revisa cada propuesta junto a su campo TO-BE; utiliza únicamente los valores que autorices.</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-HUMAN-DECISIONS-223] END
// [AUNEA-FE-PG11-COHERENCE-239] START — deterministic constraints over
// consultant-owned TO-BE design. Complements (never replaces) the Ollama reviewer.
// SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
// No invented future economics, actors, time metrics, or automatic authorization.
function tobeCoherenceFindings(e,p){
  const findings=[],items=[...(p?.items||[]),...tobeAddedSteps(p)];
  const add=(item,severity,message)=>findings.push({
    stepId:tobeFlowItemId(item),severity,message,
    name:tobeFlowItemName(item)
  });
  for(const item of items){
    const t=String(item.transformation||''),name=tobeFlowItemName(item),
      auto=String(item.automationAi||'').trim(),
      supervisor=String(item.humanSupervision||'').trim(),
      control=String(item.controlsRisk||'').trim();
    if(['Se automatiza','Se asiste con IA'].includes(t)){
      if(!auto||/^(no|n\/a|ninguno|sin definir|pendiente)$/i.test(auto))
        add(item,'BLOCKING','Describe qué ejecutará el sistema y qué parte corresponde a automatización por reglas o IA.');
      if(!supervisor||/^(no|n\/a|ninguno|sin definir|pendiente)$/i.test(supervisor))
        add(item,'BLOCKING','Indica la supervisión humana y qué sucede ante errores o excepciones.');
    }
    if(t==='Requiere decisión humana'&&!supervisor)
      add(item,'BLOCKING','El responsable o punto de decisión humana debe estar explícito.');
    if(t==='Se incorpora control'&&(!control||/^(no|n\/a|ninguno|sin definir|pendiente)$/i.test(control)))
      add(item,'BLOCKING','Describe el control que se incorpora y el riesgo que atiende.');
    if(t==='Se mantiene'&&/^(automatizar|modificar|eliminar|implementar|integrar|rediseñar)\b/i.test(auto))
      add(item,'BLOCKING','«Se mantiene» contradice la intervención indicada en automatización/IA.');
    if(item.isAddition&&['Se mantiene','Se elimina'].includes(t))
      add(item,'BLOCKING','Una actividad nueva debe justificar su incorporación o descartarse; no se clasifica como existente o eliminada.');
    if(t==='Se elimina'&&item.futureTime)
      add(item,'WARNING','Se propone eliminar la actividad pero conserva un tiempo futuro; confirma si pertenece a otro paso.');
    if(['Se automatiza','Se asiste con IA'].includes(t)&&
       /\b(sin supervisi[oó]n|aprueba autom[aá]ticamente|sin intervenci[oó]n humana)\b/i.test(auto))
      add(item,'BLOCKING','La intervención describe autonomía sin un control humano explícito.');
    if(TOBE_TRANSFORMATIONS.includes(t)&&!tobeMeaningfulRationale(item.problemResolved))
      add(item,'BLOCKING','Completa «'+tobeTransformationRationaleLabel(t)+
        '»; un campo vacío o «NO» no justifica esta decisión.');
    if(item.futureTime&&item.futureTimeAssumption)
      add(item,'WARNING','El tiempo futuro es un supuesto; no equivale a medición ni autoriza un ahorro.');
  }
  // [AUNEA-FE-PG11-SOURCE-CONSTRAINTS-336] START — only explicit step references block.
  if(!e)return findings;
  const constraints=tobeProposalSnapshot(e,p)?.answers||{};
  const linked=(value,id)=>Array.isArray(value)?value.some(x=>typeof x==='string'?x===id:
    x&&typeof x==='object'&&(String(x.step_id||x.stepId||'')===id||x.step_ids?.map(String).includes(id))):value===id;
  for(const item of items){
    const id=String(item.sourceStepId);
    if(linked(constraints.DF075,id)&&item.transformation==='Se elimina')
      add(item,'BLOCKING','El AS-IS exige aprobación humana en esta actividad. Conserva la aprobación y su ruta antes de aprobar el TO-BE.');
    if(linked(constraints.DF088,id)&&['Se automatiza','Se asiste con IA'].includes(item.transformation))
      add(item,'BLOCKING','La actividad está referenciada expresamente en las restricciones de automatización/IA. Mantén su ejecución permitida.');
    for(const finding of tobeOptimizationFindings(e,p,item))
      add(item,'WARNING',finding.message+(finding.related.length?' Actividades: '+finding.related.join(' · '):''));
  }
  // [AUNEA-FE-PG11-SOURCE-CONSTRAINTS-336] END
  return findings;
}
// [AUNEA-FE-PG11-GLOBAL-SCAN-280] START — One-pass QA summary; complete issues remain expandable.
function tobeActivityDecisionRecorded(e,p,item){
  // Legacy function identifier retained for existing callers; the state is now
  // derived solely from the actual single-owner TO-BE design, not a second
  // ACCEPT/MODIFY/DISCARD approval of the entire IA response.
  return !tobeActivityDesignIssue(item);
}
function tobeCoherencePanel(e,p){
  const findings=tobeCoherenceFindings(e,p),
    steps=p?.items||[],
    reviewed=steps.filter(x=>tobeActivityDecisionRecorded(e,p,x)).length,
    added=tobeAddedSteps(p).length,
    integrity=tobeFlowIntegrity(e,p),
    blocked=findings.filter(x=>x.severity==='BLOCKING'),
    notes=findings.filter(x=>x.severity!=='BLOCKING'),
    errors=blocked.length+(integrity?1:0),
    items=[...(integrity?[{stepId:'',severity:'BLOCKING',message:integrity,name:'Mapa futuro'}]:[]),...findings],
    ready=errors===0&&reviewed===steps.length,
    headline=ready?'Diseño configurado sin bloqueos detectados; listo para comprobar requisitos y marcar como revisado':
      errors?'Se han detectado '+errors+' bloqueos que deben resolverse':
      'Quedan '+(steps.length-reviewed)+' actividades por configurar';
  return '<div class="tobe-coherence">'+
    '<div class="tobe-global-indicators" role="status">'+
      '<div><strong>'+reviewed+' / '+steps.length+'</strong><span>Actividades configuradas</span></div>'+
      '<div><strong>'+errors+'</strong><span>Bloqueos</span></div>'+
      '<div><strong>'+notes.length+'</strong><span>Observaciones</span></div>'+
      '<div><strong>'+added+'</strong><span>Actividades nuevas</span></div>'+
    '</div>'+
    '<p class="tobe-global-headline">'+esc(headline)+'</p>'+
    '<details class="tobe-global-evidence"><summary>Ver comprobaciones y acciones pendientes'+
      (items.length?' ('+items.length+')':'')+'</summary>'+
      (items.length?'<ul class="tobe-coherence-list">'+items.map(x=>
        '<li><span class="tobe-coherence-severity">'+
        (x.severity==='BLOCKING'?'Bloqueo':'Observación')+'</span>'+
        '<span>'+esc(x.name)+': '+esc(x.message)+'</span>'+
        (x.stepId?'<button type="button" class="btn btn-outline btn-small" data-tobe-select="'+
          attr(x.stepId)+'">Revisar actividad</button>':'')+'</li>').join('')+'</ul>':
        '<p>Sin contradicciones detectadas por las reglas disponibles.</p>')+
      '<p class="tobe-muted">Las comprobaciones estructurales no certifican viabilidad técnica ni ahorros. Valida las fuentes y los supuestos con el cliente.</p>'+
    '</details></div>';
}
// [AUNEA-FE-PG11-GLOBAL-SCAN-280] END
// [AUNEA-FE-PG11-COHERENCE-239] END
// [AUNEA-FE-PG11-FUTURE-FLOW-228] START — version-owned future routing overlay.
// SOURCE: Simulator CANONICAL PG11/PG12; DEC-050/052/055.
// The AS-IS snapshot remains immutable. Added steps are linked to an existing AS-IS
// step, stored only within this TO-BE version, and cannot be auto-approved.
// No new DF question, pricing assumption, or deterministic engine calculation.
function tobeProposalSnapshot(e,p){
  const stored=(e?.confirmedSnapshots||[]).find(x=>x.version===p?.sourceSnapshotVersion);
  return stored||(typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null);
}
function tobeProposalSourceSteps(e,p){
  return (tobeProposalSnapshot(e,p)?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
}
function tobeFlowOwner(e,p){
  const original=tobeProposalSourceSteps(e,p),branching=original.some(s=>processDecisionStep(s));
  const routes={};
  original.forEach((s,i)=>{
    const id=String(s.id);
    routes[id]={
      normal:String(s.normal_next_step||(!branching?(original[i+1]?.id||'__END__'):'__PENDING__')),
      exception:processDecisionStep(s)?String(s.exception_path?.destination_step||'__PENDING__'):''
    };
  });
  const stored=p?.flow;
  return {
    startStepId:String(stored?.startStepId||original[0]?.id||''),
    routes:{...routes,...(stored?.routes||{})},
    addedSteps:Array.isArray(stored?.addedSteps)?stored.addedSteps:[],
    decisionCriteria:stored?.decisionCriteria&&typeof stored.decisionCriteria==='object'?
      {...stored.decisionCriteria}:{},
    positions:stored?.positions&&typeof stored.positions==='object'?{...stored.positions}:{}
  };
}
function tobeMutableFlow(e,p){
  if(!p.flow)p.flow=tobeFlowOwner(e,p);
  if(!p.flow.positions)p.flow.positions={};
  if(!p.flow.decisionCriteria)p.flow.decisionCriteria={};
  return p.flow;
}
function tobeAddedSteps(p,includeSuperseded=false){
  return Array.isArray(p?.flow?.addedSteps)?
    p.flow.addedSteps.filter(x=>includeSuperseded||x.status!=='SUPERSEDED'):[];
}
function tobeFlowItemId(item){return String(item?.isAddition?item.id:item?.sourceStepId||'')}
function tobeFlowItem(e,p,stepId){
  return [...(p?.items||[]),...tobeAddedSteps(p)].find(x=>tobeFlowItemId(x)===String(stepId))||null;
}
function tobeFlowItemName(item){
  return String((item?.isAddition?item.stepName:item?.sourceStepName)||'Actividad sin nombre');
}
// [AUNEA-FE-PG11-FUTURE-PROJECTION-314] START
// Source: confirmed ProcessStep and TO-BE DRAFT (DEC-050/055).
// No second owner: derives the graph's operative attributes from p.items.
function tobeFutureCatalogValue(setId,raw){
  const value=String(raw||''),opts=typeof fieldOptions==='function'?fieldOptions(setId):[];
  const found=opts.find(x=>String(x.value)===value||
    String(x.label||'').trim().toLowerCase()===value.trim().toLowerCase());
  return String(found?.value??value);
}
function tobeFutureArtifacts(raw){
  if(typeof tobeArtifactValues==='function'){
    const v=tobeArtifactValues(raw);
    return [...v.resolved,...v.unknown];
  }
  return Array.isArray(raw)?[...raw]:String(raw||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function tobeFutureStepDetails(source,item){
  return {...(source?._details||{}),inputs:String(item._details?.inputs||''),
    outputs:String(item._details?.outputs||'')};
}
// [AUNEA-FE-PG11-FUTURE-PROJECTION-314] END
function tobeFutureSteps(e,p){
  const original=tobeProposalSourceSteps(e,p),byId=new Map(original.map(x=>[String(x.id),x]));
  const f=tobeFlowOwner(e,p);
  const existing=(p?.items||[]).filter(x=>x.transformation!=='Se elimina').map(item=>{
    const source=byId.get(String(item.sourceStepId));
    if(!source)return null;
    const route=f.routes[String(source.id)]||{};
    const decision=processDecisionStep(source);
    return {...source,id:String(source.id),step_name:tobeFlowItemName(item),
      actor:tobeFutureCatalogValue('OS_ACTOR_ROLE',item.futureActor),
      tool:tobeFutureCatalogValue('OS_TOOL_CATEGORY',item.tool),
      inputs:tobeFutureArtifacts(item.inputs),outputs:tobeFutureArtifacts(item.outputs),
      _details:tobeFutureStepDetails(source,item),
      tobe_transformation:item.transformation,
      tobe_automation_ai:item.automationAi||'',
      tobe_human_supervision:item.humanSupervision||'',
      tobe_controls_risk:item.controlsRisk||'',
      tobe_decision_criterion:String(f.decisionCriteria?.[String(source.id)]||''),
      normal_next_step:String(route.normal??'__PENDING__'),
      exception_path:decision?{...(source.exception_path||{}),
        destination_step:String(route.exception??'__PENDING__')}:undefined};
  }).filter(Boolean);
  const additions=tobeAddedSteps(p).map(item=>{
    const route=f.routes[String(item.id)]||{},
      isDecision=String(item.stepType||'ST02')==='ST04';
    return {id:String(item.id),step_name:tobeFlowItemName(item),
      step_type:isDecision?'ST04':'ST02',
      actor:tobeFutureCatalogValue('OS_ACTOR_ROLE',item.futureActor),
      tool:tobeFutureCatalogValue('OS_TOOL_CATEGORY',item.tool),
      inputs:tobeFutureArtifacts(item.inputs),outputs:tobeFutureArtifacts(item.outputs),
      _details:tobeFutureStepDetails(null,item),
      tobe_transformation:item.transformation,
      tobe_automation_ai:item.automationAi||'',
      tobe_human_supervision:item.humanSupervision||'',
      tobe_controls_risk:item.controlsRisk||'',
      tobe_decision_criterion:String(f.decisionCriteria?.[String(item.id)]||''),
      normal_next_step:String(route.normal??'__PENDING__'),
      exception_path:isDecision?{destination_step:String(route.exception||'__PENDING__')}:undefined};
  });
  const steps=[...existing,...additions];
  const first=steps.findIndex(x=>String(x.id)===f.startStepId);
  if(first>0)steps.unshift(steps.splice(first,1)[0]);
  return steps;
}
function tobeFlowIntegrity(e,p){
  const f=tobeFlowOwner(e,p),steps=tobeFutureSteps(e,p),ids=new Set(steps.map(x=>String(x.id))),
    originals=new Map(tobeProposalSourceSteps(e,p).map(x=>[String(x.id),x]));
  if(!ids.size)return 'El TO-BE debe tener al menos una actividad futura.';
  if(!ids.has(String(f.startStepId)))return 'El inicio del TO-BE apunta a una actividad eliminada o inexistente. Selecciona un inicio válido.';
  for(const added of tobeAddedSteps(p)){
    if(String(added.stepType||'ST02')==='ST04'&&
       !String(f.decisionCriteria?.[String(added.id)]||'').trim())
      return 'La nueva decisión '+tobeFlowItemName(added)+
        ' necesita una condición futura explícita antes de conectar las rutas SÍ/NO.';
    if(!originals.has(String(added.sourceStepId)))
      return 'La actividad añadida '+tobeFlowItemName(added)+' no tiene origen AS-IS confirmado.';
    if(!['ST02','ST04'].includes(String(added.stepType||'ST02')))
      return 'El tipo de la nueva actividad '+tobeFlowItemName(added)+' no está permitido.';
    if(!String(added.stepName||'').trim())
      return 'Asigna un nombre a la actividad añadida vinculada a '+added.sourceStepName+'.';
    if(!TOBE_TRANSFORMATIONS.includes(added.transformation))
      return 'Selecciona una transformación válida para '+tobeFlowItemName(added)+'.';
    if(!String(added.problemResolved||'').trim())
      return 'Describe el problema u oportunidad diagnosticada que justifica la actividad '+tobeFlowItemName(added)+'.';
    if(!String(added.futureActor||'').trim())
      return 'Indica responsable futuro de '+tobeFlowItemName(added)+'.';
    if(String(added.futureTime||'').trim()&&!String(added.futureTimeAssumption||'').trim())
      return 'El tiempo futuro de '+tobeFlowItemName(added)+' requiere un supuesto explícito.';
  }
  const outgoing=new Map();
  for(const s of steps){
    const route=f.routes[String(s.id)]||{},original=originals.get(String(s.id));
    const next=String(route.normal??s.normal_next_step??'__PENDING__');
    const exception=processDecisionStep(s)?
      String(route.exception??s.exception_path?.destination_step??'__PENDING__'):'';
    const targets=[next,...(exception?[exception]:[])];
    for(const dest of targets)if(dest!=='__END__'&&!ids.has(dest))
      return 'La ruta de '+s.step_name+' apunta a una actividad eliminada o pendiente de conectar. Revisa sus destinos.';
    outgoing.set(String(s.id),targets);
  }
  const reachable=new Set(),queue=[String(f.startStepId)];
  while(queue.length){
    const id=queue.shift();if(reachable.has(id))continue;reachable.add(id);
    for(const next of outgoing.get(id)||[])if(next!=='__END__'&&!reachable.has(next))queue.push(next);
  }
  if(steps.some(s=>!reachable.has(String(s.id))))
    return 'Hay actividades futuras desconectadas del inicio. Revisa las rutas y los pasos añadidos.';
  const canEnd=new Set(['__END__']);let changed=true;
  while(changed){changed=false;
    for(const [id,links] of outgoing)if(!canEnd.has(id)&&links.some(dest=>canEnd.has(dest))){
      canEnd.add(id);changed=true;
    }
  }
  if(steps.some(s=>!canEnd.has(String(s.id))))
    return 'Existe una ruta futura sin camino hasta el final del proceso.';
  return null;
}
function tobeFlowOptions(e,p,item){
  return [{value:'__PENDING__',label:'Pendiente de conectar'},
    ...tobeFutureSteps(e,p).filter(s=>String(s.id)!==tobeFlowItemId(item))
      .map(s=>({value:String(s.id),label:s.step_name})),
    {value:'__END__',label:'Fin del proceso'}];
}
// [AUNEA-FE-PG11-DECISION-READOUT-297] START — source-backed decision logic.
// AS-IS criteria remain immutable. TO-BE destinations are edited only in Map.
function tobeDecisionReadoutHtml(e,p,item){
  const original=tobeProposalSourceSteps(e,p),
    source=original.find(x=>String(x.id)===String(item.sourceStepId));
  const decision=item.isAddition?String(item.stepType)==='ST04':
    !!source&&processDecisionStep(source);
  if(!decision||item.transformation==='Se elimina')return '';
  const future=tobeFutureSteps(e,p),
    routes=tobeFlowOwner(e,p).routes[tobeFlowItemId(item)]||{},
    name=(id,steps)=>{
      const key=String(id||'__PENDING__');
      if(key==='__END__')return 'Fin del proceso';
      if(key==='__PENDING__')return 'Pendiente de conectar';
      return steps.find(x=>String(x.id)===key)?.step_name||'Destino no disponible';
    },
    raw=item.isAddition?'':source?._details?.decision_criteria||source?.decision_criteria||'',
    values=Array.isArray(raw)?raw:raw?[raw]:[],
    setId=typeof schema!=='undefined'?
      schema.fields?.find(x=>x.Field_ID==='DF041')?.Option_Set_ID:'',
    readable=v=>String((typeof labelFrom==='function'&&setId?
      labelFrom(setId,v):'')||v),
    criteria=values.map(readable).filter(Boolean).join(' · '),
    draftCriterion=String(tobeFlowOwner(e,p).decisionCriteria?.[tobeFlowItemId(item)]||'').trim(),
    asYes=!item.isAddition&&source?name(source.normal_next_step,original):'No existía en el AS-IS',
    asNo=!item.isAddition&&source?name(source.exception_path?.destination_step,original):'No existía en el AS-IS';
  return '<section class="tobe-decision-readout" aria-label="Lógica de decisión y rutas">'+
    '<h4>Decisión y rutas de la actividad</h4>'+
    '<p class="field-help"><b>Criterio AS-IS confirmado:</b> '+
      esc(criteria||'No consta un criterio detallado en el snapshot.')+'</p>'+
    '<p class="field-help"><b>Criterio TO-BE:</b> '+
      esc(draftCriterion||(!item.isAddition&&criteria?
        'Se conserva el criterio del AS-IS; sin cambio registrado.':
        'Pendiente de definir en Mapa TO-BE.'))+'</p>'+
    '<dl><div><dt>Si se cumple · SÍ</dt><dd>AS-IS: '+esc(asYes)+
      ' · TO-BE: '+esc(name(routes.normal,future))+'</dd></div>'+
      '<div><dt>Si no se cumple · NO</dt><dd>AS-IS: '+esc(asNo)+
      ' · TO-BE: '+esc(name(routes.exception,future))+'</dd></div></dl>'+
    '<p class="field-help">Modifica las rutas en «Mapa TO-BE». Esta vista no altera el AS-IS ni confirma nuevas condiciones.</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-DECISION-READOUT-297] END
function tobeFlowInspector(e,p,item){
  if(item.transformation==='Se elimina'){
    return '<section class="tobe-route-editor" id="tobeStepRoutes">'+
      '<h3>03.4 · Conectar el proceso futuro</h3>'+
      '<p class="notice warn">Esta actividad se retira únicamente del TO-BE. Reconecta las rutas entrantes y, si corresponde, selecciona un inicio válido. El AS-IS se conserva intacto.</p></section>';
  }
  const flow=tobeFlowOwner(e,p),stepId=tobeFlowItemId(item),routes=flow.routes[stepId]||{},
    origin=tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item.sourceStepId)),
    decision=item.isAddition?String(item.stepType||'ST02')==='ST04':
      !!origin&&processDecisionStep(origin),editable=tobeEditable(p);
  const opts=tobeFlowOptions(e,p,item);
  const field=(kind,label,value)=>
    '<div class="field"><label>'+label+'</label>'+
    (editable?auneaSelectControl('tobeRoute_'+kind+'_'+stepId,opts,String(value||'__PENDING__'),{
      extra:'data-tobe-route="'+kind+'" data-tobe-route-step="'+attr(stepId)+'"',
      placeholder:'Selecciona destino'}):'<input disabled value="'+attr(opts.find(x=>x.value===value)?.label||value||'Pendiente')+'">')+
    '<p class="field-help">Selecciona el destino de esta ruta en el proceso futuro. Una ruta pendiente bloquea la revisión.</p></div>';
  return '<section class="tobe-route-editor" id="tobeStepRoutes"><h3>03.4 · Conectar el proceso futuro</h3>'+
    '<p class="tobe-muted">Edita aquí las rutas del TO-BE. No se modificarán las conexiones del AS-IS confirmado.</p>'+
    (decision?tobeDecisionReadoutHtml(e,p,item):'')+
    (decision?'<div class="field tobe-decision-criterion-edit">'+
      '<label for="tobeDecisionCriterion_'+attr(stepId)+'">Condición futura que determina SÍ y NO</label>'+
      (editable?'<textarea id="tobeDecisionCriterion_'+attr(stepId)+
        '" data-tobe-decision-criterion="'+attr(stepId)+
        '" rows="3" maxlength="1200" placeholder="'+
        attr(item.isAddition?'Describe la condición de esta nueva decisión':
          'Dejar vacío conserva el criterio original; escribe aquí solo si debe cambiar')+'">'+
        esc(String(flow.decisionCriteria?.[stepId]||''))+'</textarea>':
        '<p>'+esc(String(flow.decisionCriteria?.[stepId]||'Se conserva el criterio AS-IS'))+'</p>')+
      '<p class="field-help">Define la condición para cada resultado. Los destinos se editan debajo; ningún cambio modifica el AS-IS confirmado ni autoriza una aprobación automática.</p>'+
      '</div>':'')+
    '<div class="form-grid">'+field('normal','Siguiente actividad'+(decision?' · ruta SÍ':''),routes.normal)+
    (decision?field('exception','Ruta NO / excepción',routes.exception):'')+
    '</div></section>';
}
// [AUNEA-FE-PG11-OPTIMIZATION-CHECK-313] START
// SOURCE: CANONICAL PG11, ProcessStep DF035/036/041–043, friction and
// restriction snapshot; DEC-050/052/055. INPUTS: immutable AS-IS and
// consultant-owned TO-BE DRAFT. OUTPUTS: deterministic, source-linked checks.
// SIDE EFFECTS: none. Never alters routes, approves IA, or invents savings.
// CHANGE RISK: MEDIUM. Works on any service process, without sector heuristics.
function tobeOptimizationFindings(e,p,item){
  if(!e||!p||!item)return [];
  const future=tobeFutureSteps(e,p),flow=tobeFlowOwner(e,p),
    source=tobeProposalSourceSteps(e,p),
    sourceStep=source.find(x=>String(x.id)===String(item.sourceStepId)),
    id=tobeFlowItemId(item),
    owner=future.find(x=>String(x.id)===id),
    futureMap=new Map(future.map(x=>[String(x.id),x])),
    predecessors=future.filter(step=>String(step.normal_next_step)===id||
      String(step.exception_path?.destination_step)===id),
    successors=owner?[owner.normal_next_step,owner.exception_path?.destination_step]
      .map(x=>futureMap.get(String(x||''))).filter(Boolean):[],
    set=value=>new Set(tobeFutureArtifacts(value).map(x=>String(x).trim().toUpperCase())),
    diff=(a,b)=>[...a].filter(x=>!b.has(x)),
    beforeInput=set(sourceStep?.inputs||[]),afterInput=set(item.inputs||[]),
    beforeOutput=set(sourceStep?.outputs||[]),afterOutput=set(item.outputs||[]),
    newInputs=diff(afterInput,beforeInput),
    newOutputs=diff(afterOutput,beforeOutput),
    droppedOutputs=diff(beforeOutput,afterOutput),
    results=[],
    add=(severity,code,message,related=[])=>results.push({
      severity,code,message,related:related.map(x=>String(x.step_name||x.stepName||x.id||x))
    }),
    names=steps=>steps.map(x=>x.step_name||x.stepName||String(x.id)).join(', ');
  if(item.transformation==='Se elimina'){
    add('REVIEW','REMOVED_ACTIVITY','La actividad se propone eliminar. Revisa quién asume su trabajo, entradas y salidas y redirige las conexiones en Mapa TO-BE.',successors);
    return results;
  }
  if(!owner){
    add('REVIEW','MISSING_NODE','La actividad no está conectada en el grafo futuro. Comprueba su inclusión y rutas en Mapa TO-BE.');
    return results;
  }
  if(newInputs.length){
    const supplied=new Set(predecessors.flatMap(s=>[...set(s.outputs)]));
    const notLinked=newInputs.filter(x=>!supplied.has(x));
    if(notLinked.length)add('REVIEW','INPUT_SOURCE',
      'Entradas incorporadas ('+notLinked.join(', ')+
      '): confirma el paso proveedor o la fuente externa. No consta su suministro en las salidas de los pasos anteriores conectados.',
      predecessors);
  }
  if(droppedOutputs.length){
    const consumers=successors.filter(x=>droppedOutputs.some(code=>set(x.inputs).has(code)));
    if(consumers.length)add('REVIEW','OUTPUT_CONSUMER',
      'Una categoría de salida retirada coincide con una categoría de entrada posterior. Comprueba si es el mismo documento o dato antes de concluir que falta suministro; documenta su fuente.',
      consumers);
  }
  if(newOutputs.length&&!successors.some(x=>newOutputs.some(code=>set(x.inputs).has(code)))){
    add('CHECK','OUTPUT_DESTINATION',
      'Salidas nuevas ('+newOutputs.join(', ')+
      '): confirma si alimentan otra actividad, se entregan fuera del proceso o constituyen el resultado final.',
      successors);
  }
  const automation=String(item.automationAi||'').trim(),
    hasAutomation=!!automation&&!/^(no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(automation);
  if(hasAutomation&&['Se mantiene','Se elimina'].includes(item.transformation)){
    add('REVIEW','INACTIVE_AUTOMATION_DETAIL',
      'La actividad figura como «'+item.transformation+'» pero conserva texto en Automatización/IA. '+
      'Aclara si es información histórica o una intervención futura antes de validar el TO-BE.');
  }
  if(hasAutomation&&!['Se mantiene','Se elimina'].includes(item.transformation)){
    const oldTool=tobeFutureCatalogValue('OS_TOOL_CATEGORY',sourceStep?.tool),
      currentTool=tobeFutureCatalogValue('OS_TOOL_CATEGORY',item.tool);
    if(!currentTool||sourceStep&&oldTool===currentTool)
      add('REVIEW','AUTOMATION_CAPABILITY',
        'La intervención incorpora automatización o asistencia. Verifica capacidades, permisos e integración de la herramienta prevista; mantener la herramienta actual no acredita viabilidad.');
    if(!String(item.humanSupervision||'').trim())
      add('REVIEW','HUMAN_SUPERVISION',
        'La propuesta operativa incorpora automatización, pero no documenta quién revisa las excepciones.');
    const answers=tobeProposalSnapshot(e,p)?.answers||{},
      flagged=[['DF075','aprobaciones humanas'],['DF088','límites de automatización'],
        ['DF089','plataformas'],['DF090','seguridad y accesos']].filter(([key])=>{
        const v=answers[key];return v!=null&&String(v).trim()!==''&&
          !(Array.isArray(v)&&!v.length);
      }).map(x=>x[1]);
    if(flagged.length)add('REVIEW','CONFIRMED_CONSTRAINTS',
      'Contrasta la intervención con los requisitos confirmados de '+flagged.join(', ')+
      '. La IA no puede sustituir ni relajar una obligación del cliente.');
  }
  if(sourceStep&&processDecisionStep(sourceStep)){
    const route=flow.routes[id]||{},
      changed=String(route.normal||'')!==String(sourceStep.normal_next_step||'')||
        String(route.exception||'')!==String(sourceStep.exception_path?.destination_step||'')||
        !!String(flow.decisionCriteria?.[id]||'').trim();
    if(changed)add('REVIEW','DECISION_BRANCH',
      'Se ha cambiado la condición o alguna ruta de esta decisión. Comprueba ambos destinos, el responsable de autorizar y las condiciones obligatorias.',
      successors);
  }
  const originalFrictions=(tobeProposalSnapshot(e,p)?.frictions||[]).filter(f=>
    f.status!=='SUPERSEDED'&&
    (f.affected_steps||f.step_ids||[]).map(String).includes(String(item.sourceStepId)));
  const relatedRisks=(tobeProposalSnapshot(e,p)?.risks||[]).filter(f=>
    f.status!=='SUPERSEDED'&&(f.step_ids||[]).map(String).includes(String(item.sourceStepId)));
  if((originalFrictions.length||relatedRisks.length)&&!String(item.problemResolved||'').trim())
    add('REVIEW','UNJUSTIFIED_CHANGE',
      'Hay hallazgos vinculados al paso, pero falta justificar qué problema resuelve el diseño futuro.');
  return results;
}
function tobeOptimizationPanelHtml(e,p,item){
  const results=tobeOptimizationFindings(e,p,item),
    id=tobeFlowItemId(item),future=tobeFutureSteps(e,p),
    owner=future.find(s=>String(s.id)===id),
    predecessors=future.filter(s=>String(s.normal_next_step)===id||
      String(s.exception_path?.destination_step)===id),
    successorIds=owner?[owner.normal_next_step,owner.exception_path?.destination_step]:[],
    successors=successorIds.map(id=>future.find(s=>String(s.id)===String(id))).filter(Boolean),
    names=steps=>steps.map(x=>x.step_name).join(' · ')||'Sin actividad conectada en esta dirección',
    review=results.filter(x=>x.severity==='REVIEW').length,
    block=tobeFlowIntegrity(e,p),
    prior=typeof document!=='undefined'?document.querySelector('#tobeStepOptimization .tobe-optimization-details'):null,
    open=!!block||!!prior?.open,
    rows=results.map(x=>'<li class="tobe-optimization-finding" data-optimization-code="'+attr(x.code)+'">'+
      '<span class="tobe-optimization-severity">'+
        (x.severity==='REVIEW'?'Revisar':'Comprobar')+'</span>'+
      '<p>'+esc(x.message)+'</p>'+
      (x.related.length?'<small>Actividades relacionadas: '+esc(x.related.join(' · '))+'</small>':'')+
    '</li>').join('');
  return '<section class="tobe-design-group tobe-optimization-panel"'+
    ' id="tobeStepOptimization" aria-label="Comprobación de dependencias del flujo">'+
    '<div class="tobe-design-group-head"><span class="tobe-design-group-number">04</span>'+
    '<div><h4>Impacto del cambio sobre el flujo</h4>'+
    '<p>Revisión de rutas y dependencias; no modifica conexiones ni acepta propuestas.</p></div></div>'+
    '<div class="tobe-optimization-body">'+
      '<div class="tobe-optimization-connections">'+
        '<div><b>Pasos anteriores</b><span>'+esc(names(predecessors))+'</span></div>'+
        '<div><b>Actividad revisada</b><span>'+esc(tobeFlowItemName(item))+'</span></div>'+
        '<div><b>Pasos siguientes</b><span>'+esc(names(successors))+'</span></div>'+
      '</div>'+
      '<details class="tobe-optimization-details"'+(open?' open':'')+'>'+
        '<summary>'+(block?'Bloqueo de integridad detectado':
          results.length?results.length+' '+(results.length===1?'observación para revisar':'observaciones para revisar'):
          'Sin incompatibilidades evidentes · Ver comprobaciones')+'</summary>'+
        (block?'<p class="notice warn"><b>Integridad del flujo:</b> '+esc(block)+'</p>':'')+
        (results.length?'<p class="tobe-optimization-summary">'+review+' observaciones requieren contrastar un dato o decisión.</p>'+
          '<ul class="tobe-optimization-findings">'+rows+'</ul>':
          '<p class="tobe-optimization-empty">No se han identificado incompatibilidades evidentes entre los datos declarados de este paso y sus conexiones.</p>')+
        '<p class="field-help">Las comprobaciones no acreditan por sí solas viabilidad ni ahorro. '+
          'Dos actividades con una categoría documental común no necesariamente comparten el mismo archivo.</p>'+
      '</details>'+
      (tobeEditable(p)?'<button type="button" class="btn btn-outline" data-tobe-recheck-optimization="1">'+
        'Guardar y actualizar comprobaciones</button>':'')+
    '</div></section>';
}
// [AUNEA-FE-PG11-OPTIMIZATION-CHECK-313] END
// [AUNEA-FE-PG11-FUTURE-FLOW-228] END
// [AUNEA-FE-PG11-FREE-CANVAS-248] START — persisted visual positions
// are separate from flow.routes. The confirmed AS-IS is never mutated.
function tobeCanvasHtml(e,p){
  const steps=tobeFutureSteps(e,p);
  if(typeof processGraphData!=='function')
    return '<div class="notice warn">No está disponible el mapa; no se modificaron datos.</div>';
  const graph=processGraphData(e,steps),selected=tobeSelectedItem(e,p),
    flow=tobeFlowOwner(e,p),editable=tobeEditable(p);
  const placements=graph.nodes.map(n=>{
    const pos=graph.positions.get(n.id);
    if(!pos)return null;
    const saved=flow.positions?.[String(n.id)];
    const x=saved&&Number.isFinite(Number(saved.x))?Number(saved.x):24+Math.max(0,pos.col-1)*272;
    const y=saved&&Number.isFinite(Number(saved.y))?Number(saved.y):40+Math.max(0,pos.row-1)*325;
    return {node:n,x:Math.max(0,Math.min(10000,Math.round(x))),
      y:Math.max(0,Math.min(10000,Math.round(y)))};
  }).filter(Boolean);
  const boardWidth=Math.max(850,...placements.map(p=>p.x+252));
  const boardHeight=Math.max(380,...placements.map(p=>p.y+320));
  const cells=placements.map(({node:n,x,y})=>{
    const step=n.kind==='step'?steps.find(s=>String(s.id)===String(n.id)):null;
    const item=step?tobeFlowItem(e,p,String(step.id)):null;
    let content='';
    if(n.kind==='start'||n.kind==='end'){
      content='<div class="tobe-boundary flow-boundary"><b>'+
        (n.kind==='start'?'Inicio del proceso':'Fin del proceso')+
        '</b><small>TO-BE</small></div>';
    }else if(n.kind==='pending'){
      content='<div class="graph-route-pending"><b>'+esc(n.route||'Ruta')+
        '</b><span>Conexión pendiente</span></div>';
    }else if(item){
      const id=attr(step.id),isSelected=tobeFlowItemId(selected)===String(step.id),
        decision=String(step.step_type)==='ST04';
      content='<button type="button" class="graph-flow-step tobe-graph-node'+
        (isSelected?' is-selected':'')+
        '" data-tobe-select="'+id+'" draggable="false" aria-pressed="'+String(isSelected)+
        '" aria-label="Seleccionar y mover actividad '+attr(tobeFlowItemName(item))+'">'+
        '<span class="tobe-node-count">Actividad '+(steps.indexOf(step)+1)+'</span>'+
        '<span class="tobe-node-icon">'+processNodeIconSvg(processNodeIconName(step))+'</span>'+
        '<strong>'+esc(tobeFlowItemName(item))+'</strong>'+
        '<span class="tobe-node-status">'+esc(item.transformation||'Pendiente de diseño')+'</span>'+
        '<small>'+esc((typeof labelFrom==='function'?labelFrom('OS_ACTOR_ROLE',item.futureActor):'')||
          item.futureActor||'Responsable pendiente')+'</small></button>'+
        (editable?'<div class="tobe-node-tools" aria-label="Acciones de actividad">'+
          '<button type="button" class="btn btn-outline btn-small" data-tobe-move="'+id+'" title="Mover tarjeta por el mapa">Mover</button>'+
          '<button type="button" class="btn btn-outline btn-small" data-tobe-connect="'+id+'" data-tobe-kind="normal" title="Selecciona después la actividad de destino">Conectar</button>'+
          (decision?'<button type="button" class="btn btn-outline btn-small" data-tobe-connect="'+id+'" data-tobe-kind="exception" title="Conectar ruta NO">Ruta NO</button>':'')+
          (item.isAddition?'<button type="button" class="btn btn-outline btn-small" data-tobe-discard-added="'+id+'" title="Descartar sólo esta actividad nueva">Eliminar</button>':
           '<button type="button" class="btn btn-outline btn-small" data-tobe-remove-original="'+id+'" title="Retirar sólo del proceso futuro, sin alterar el AS-IS">Retirar</button>')+
          '</div>':'');
    }
    return '<div class="process-graph-cell" style="left:'+x+'px;top:'+y+
      'px" data-graph-node="'+attr(n.id)+'">'+content+'</div>';
  }).join('');
  const routes=graph.edges.some(x=>x.label==='NO')?
    '<div class="process-graph-legend"><span class="legend-main"><i></i>Ruta SÍ / principal</span><span class="legend-alt"><i></i>Ruta NO / alternativa</span></div>':'';
  return '<div class="tobe-canvas-viewport" aria-label="Editor de posiciones y rutas del proceso futuro">'+
    '<div class="flow-canvas process-graph-canvas tobe-process-canvas">'+routes+
    '<div class="process-graph-board tobe-free-board" style="width:'+boardWidth+
      'px;height:'+boardHeight+'px" data-graph-edges="'+attr(JSON.stringify(graph.edges))+
      '" data-graph-branches="'+attr(JSON.stringify(graph.branchLayouts))+'">'+
    '<svg class="process-graph-lines" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>'+
    cells+'</div></div></div>'+
    ((p.items||[]).some(it=>it.transformation==='Se elimina')?
      '<div class="tobe-removed-list"><b>Actividades originales propuestas para eliminar (AS-IS conservado)</b>'+
      p.items.filter(it=>it.transformation==='Se elimina').map(it=>
        '<button type="button" class="btn btn-outline" data-tobe-select="'+attr(it.sourceStepId)+'">'+
        esc(tobeFlowItemName(it))+'</button>').join('')+'</div>':'');
}
// [AUNEA-FE-PG11-FREE-CANVAS-248] END
// [AUNEA-FE-PG11-READABLE-CODES-209] START — display-only translation for inherited source codes.
function tobeSourceDataExplanation(raw){
  const dictionary={EMAIL:'Correo electrónico',PDF:'Documento PDF',
    DOC:'Documento',RECORD:'Registro'};
  const codes=String(raw||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!codes.length||!codes.every(x=>Object.prototype.hasOwnProperty.call(dictionary,x)))return '';
  return '<p class="tobe-data-explanation">Significado de los códigos: '+
    esc(codes.map(x=>dictionary[x]).join(' · '))+
    '. Esta explicación no modifica los datos.</p>';
}
// [AUNEA-FE-PG11-READABLE-CODES-209] END
// __AUNEA_PG11_TRANSACTIONS_MODULE__
// [AUNEA-FE-PG11-INTEGRATION-PROJECTION-341] START
// PURPOSE: Single read-only projection for downstream consumers, including new nodes and routes.
// SOURCE: PG11→PG12–PG15 contract; DEC-050/055. No persistence or scenario calculations.
// INPUTS: versioned TO-BE. OUTPUTS: client-safe operational design. CHANGE_RISK: HIGH.
function tobeIntegrationProjection(e,p){
  const source=tobeProposalSourceSteps(e,p),flow=tobeFlowOwner(e,p);
  return {version:p.version,sourceSnapshotVersion:p.sourceSnapshotVersion,
    items:[...(p.items||[]),...tobeAddedSteps(p)].map(x=>({
      step:tobeFlowItemName(x),
      currentActor:x.isAddition?'':source.find(s=>String(s.id)===String(x.sourceStepId))?.actor||'',
      currentTool:x.isAddition?'':source.find(s=>String(s.id)===String(x.sourceStepId))?.tool||'',
      transformation:x.transformation||'',problemResolved:x.problemResolved||'',
      futureActor:x.futureActor||'',tool:x.tool||'',inputs:tobeFutureArtifacts(x.inputs),outputs:tobeFutureArtifacts(x.outputs),
      automationAi:x.automationAi||'',humanSupervision:x.humanSupervision||'',controlsRisk:x.controlsRisk||'',
      futureTime:x.futureTime||'',futureTimeAssumption:x.futureTimeAssumption||'',isAddition:x.isAddition===true
    })),
    flow:{startStepId:flow.startStepId,positions:tobeClone(flow.positions),
      activities:tobeFutureSteps(e,p).map(s=>({id:s.id,name:s.step_name,type:s.step_type,
        normal:s.normal_next_step,exception:s.exception_path?.destination_step||'',
        criterion:s.tobe_decision_criterion||s._details?.decision_criteria||'',
        transformation:s.tobe_transformation,automationAi:s.tobe_automation_ai,
        humanSupervision:s.tobe_human_supervision,controlsRisk:s.tobe_controls_risk}))}
  };
}
// [AUNEA-FE-PG11-INTEGRATION-PROJECTION-341] END


// [AUNEA-FE-PG11-TIME-REVIEW-352] START — read-only comparison with evidence.
function tobeFutureTimeReviewHtml(item,sourceStep){
  const value=sourceStep?.active_time;
  const baseline=Number(value),hasBaseline=value!==null&&value!==undefined&&
    value!==''&&Number.isFinite(baseline)&&baseline>=0;
  const previous=String(item.futureTime||'').trim();
  const match=previous.match(/^(\\d+(?:[.,]\\d+)?)\\s*(?:min|mins|minuto|minutos)$/i);
  const future=match?Number(match[1].replace(',','.')):NaN;
  const comparable=hasBaseline&&Number.isFinite(future)&&future>=0;
  const round=n=>String(Math.round(n*100)/100);
  let comparison='<p><b>Estimación futura:</b> aún no puede calcularse con evidencia suficiente. '+
    'No tienes que inventar una duración: la reducción debe derivarse de una intervención concreta '+
    'y de parámetros de ejecución verificables antes de estimar escenarios.</p>';
  if(comparable){
    const delta=baseline-future;
    comparison='<p><b>Tiempo futuro ya registrado:</b> '+esc(round(future))+' min por ejecución. '+
      '<b>Diferencia calculada:</b> '+esc(round(Math.abs(delta)))+' min '+
      (delta>=0?'menos':'más')+' por ejecución. No constituye un ahorro validado.</p>'+
      '<p><b>Supuesto guardado:</b> '+esc(item.futureTimeAssumption||
      'Sin evidencia documentada para acreditar la estimación.')+'</p>';
  }else if(previous){
    comparison+='<p><b>Valor anterior preservado:</b> '+esc(previous)+
      '. No es comparable hasta documentar la unidad y el supuesto.</p>';
  }
  return '<details class="tobe-design-time tobe-design-group">'+
    '<summary><span class="tobe-design-group-number">05</span><span>'+
      '<b>Tiempo futuro y estimación</b><small>Cálculo con datos comparables, no captura manual</small>'+
    '</span></summary>'+
    '<div class="tobe-time-readout">'+
      '<p><b>Trabajo activo AS-IS:</b> '+(hasBaseline?esc(round(baseline))+' min por ejecución':
        'Sin tiempo de referencia comparable.')+'</p>'+
      comparison+
      '<p class="field-help">La espera no se suma al trabajo activo y la capacidad liberada no equivale a ahorro de caja.</p>'+
    '</div></details>';
}
// [AUNEA-FE-PG11-TIME-REVIEW-352] END
// [AUNEA-FE-PG11-UNIFIED-DECISIONS-357] START
// Single decision surface: sources remain read-only and traceable;
// only TO-BE owner, existing preview-confirm and KEEP journal mutate draft.
function tobeDecisionSourceSummaryHtml(e,p,item){
  if(item.isAddition)return '<p class="tobe-decision-context">Actividad incorporada al TO-BE; configura sus datos y conexiones utilizando el editor único.</p>';
  const globalCount=typeof tobeGlobalLinksForStep==='function'?tobeGlobalLinksForStep(e,p,item).length:0,
    ai=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null,
    hasAi=!!ai?.items?.some(x=>String(x.source_step_id)===String(item.sourceStepId)),
    actions=(p.aiDraft?.applyHistory||[]).filter(x=>
      String(x.sourceStepId)===String(item.sourceStepId)&&!x.undoneAt),
    relevant=actions.filter(x=>x.action==='APPLY'||x.action==='KEEP'),
    count=relevant.length;
  return '<details class="tobe-decision-context tobe-decision-context-compact">'+
    '<summary>Fuentes y decisiones registradas · '+count+' '+(count===1?'decisión':'decisiones')+
    ' sobre esta actividad</summary><div class="tobe-decision-context-body">'+
    '<p><b>Análisis global:</b> '+globalCount+' '+(globalCount===1?'oportunidad vinculada':'oportunidades vinculadas')+'.</p>'+
    '<p><b>IA por actividad:</b> '+(hasAi?'Propuesta guardada y consultable en 03.2.':'Sin propuesta vigente consolidada.')+'</p>'+
    '<p><b>Reglas:</b> alternativas disponibles en 03.2 tras generar.</p>'+
    '<p>El TO-BE tiene un único editor. Las decisiones confirmadas se registran en el historial reversible; '+
    'las sugerencias no cambian el proceso automáticamente.</p></div></details>';
}
// [AUNEA-FE-PG11-UNIFIED-DECISIONS-357] END
function tobeInspectorHtml(e,p){
  const item=tobeSelectedItem(e,p),editable=tobeEditable(p);
  if(!item)return '<div class="notice warn">No hay actividades TO-BE vinculadas al AS-IS.</div>';
  const allItems=[...(p.items||[]),...tobeAddedSteps(p)],
    itemIndex=allItems.findIndex(x=>tobeFlowItemId(x)===tobeFlowItemId(item)),
    nextItem=itemIndex>=0?allItems[itemIndex+1]:null,
    previousItem=itemIndex>0?allItems[itemIndex-1]:null;
  const historicalChoice=tobeHumanReviewRecord(e,p)?.decisions?.[String(item.sourceStepId)];
  const originWasExpanded=typeof document!=='undefined'?
    !!document.querySelector('#tobeStepOrigin > details')?.open:false;
  const aiDetailWasExpanded=typeof document!=='undefined'?
    !!document.getElementById('tobeAiTechnicalDetails')?.open:false;
  const previousOpportunitySection=typeof document!=='undefined'?
    document.querySelector('#tobeStepAdvice > .tobe-subdetails'):null;
  const opportunitiesWereExpanded=!previousOpportunitySection||!!previousOpportunitySection.open;
  const hasCurrentAi=typeof internalAiSavedDraft==='function'&&
    internalAiSavedDraft(e)?.items?.some(x=>String(x.source_step_id)===String(item.sourceStepId));
  const pendingKey=editable&&!item.isAddition&&typeof internalAiPilotKey==='function'?
    internalAiPilotKey(e):null;
  const hasPendingAi=!!pendingKey&&typeof internalAiPendingSteps==='function'&&
    !!internalAiPendingSteps(e,pendingKey)?.items?.has(String(item.sourceStepId));
  // Keep an expanded execution-data group open across rerenders for this step.
  const previousExecution=typeof document!=='undefined'?
    document.getElementById?.('tobeExecutionFields'):null;
  // A newly added TO-BE-only activity has no own IA proposal and must expose
  // its required execution data immediately, even if it links to an analyzed AS-IS step.
  const executionOpen=item.isAddition||!!(previousExecution?.open&&
    previousExecution.dataset?.sourceStepId===String(item.sourceStepId));
  const prevEvidence=typeof document!=='undefined'?
    document.getElementById?.('tobeDesignEvidence'):null;
  const evidenceOpen=!!prevEvidence?.open&&
    prevEvidence.dataset?.sourceStepId===String(item.sourceStepId);
  const savedReview=hasCurrentAi?internalAiSavedDraft(e)?.review:null;
  const fieldBlockers=(savedReview?.issues||[]).filter(issue=>
    issue.category==='BLOCKING'&&String(issue.step_id)===String(item.sourceStepId)).length;
  const sourceStep=item.isAddition?null:
    tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item.sourceStepId))||null;
  const withAi=(key,html)=>tobeWithAiHint(e,p,item,key,html);
  const statusField='<div class="field"><label for="tobe_'+attr(item.id)+'_transformation">Qué cambia</label>'+
    (editable?auneaSelectControl('tobe_'+item.id+'_transformation',TOBE_TRANSFORMATIONS.map(v=>({value:v,label:v})),
      item.transformation||'',{extra:'data-tobe-item="'+attr(item.id)+'" data-tobe-field="transformation"',placeholder:'Selecciona una transformación'}):
      '<input value="'+attr(item.transformation||'Sin definir')+'" disabled>')+'</div>';
  const supportingInformation=
    '<section class="tobe-origin" id="tobeStepOrigin"><details class="tobe-subdetails"'+
      (originWasExpanded?' open':'')+'><summary class="aunea-ui-section-title tobe-stage-heading">'+
        '<span>03.1 · Entender el AS-IS</span>'+
        '<span class="tobe-origin-header-status">AS-IS confirmado · Solo lectura</span></summary>'+
      tobeOriginalStepFacts(e,item)+tobeSnapshotIssueCards(e,item)+'</details></section>'+
    // [AUNEA-FE-PG11-ONE-WORKBENCH-365] START
    // View-only sources and one action path: no duplicate AI approval.
    '<section class="tobe-advice" id="tobeStepAdvice" aria-label="Oportunidades y fuentes">'+
      '<details class="tobe-subdetails"'+(opportunitiesWereExpanded?' open':'')+'><summary class="aunea-ui-section-title tobe-stage-heading">03.2 · Revisar oportunidades de mejora</summary>'+
      '<div class="tobe-stage-body">'+
        '<p class="tobe-stage-intro">Estudia las oportunidades vinculadas al AS-IS y selecciona una intervención para comparar sus efectos. '+
          'El diseño se modifica únicamente en 03.3 o al confirmar una vista previa.</p>'+
        (item.isAddition?'<p class="tobe-muted">Actividad creada sólo en TO-BE. Sus campos, controles y conexiones se configuran en 03.3.</p>':
          tobeAlternativesHtml(e,p,item))+
        '<details class="tobe-ai-context-disclosure" id="tobeAiTechnicalDetails"'+
          (aiDetailWasExpanded?' open':'')+'>'+
          '<summary>Consultar análisis IA y referencias de origen'+
            (hasCurrentAi?' · Propuesta individual disponible':hasPendingAi?' · Análisis individual parcial':'')+
          '</summary><div class="tobe-ai-context-body">'+
          '<p class="tobe-muted">Estas fuentes no constituyen decisiones. El análisis global se relaciona por sus referencias; '+
            'la IA por actividad se consulta sin atribuirle un hallazgo específico cuando su fuente no lo permite.</p>'+
          (editable&&!item.isAddition?'<div class="tobe-ai-per-step-action"><button type="button" class="btn btn-primary" data-tobe-generate-selected="'+attr(item.sourceStepId)+'">'+
            (hasCurrentAi?'Volver a analizar este paso':'Analizar este paso con IA')+'</button>'+
            '<span class="tobe-muted">Reanálisis independiente; no modifica el TO-BE automáticamente.</span></div>':'')+
          '<p id="tobeStepAiProgress" role="status" aria-live="polite" class="tobe-muted">Estado del análisis individual: '+(hasCurrentAi?'propuesta disponible':'sin propuesta consolidada')+'.</p>'+
          (typeof internalAiProgressHtml==='function'?internalAiProgressHtml(e,'steps'):'')+
          '<div id="tobeAiRecommendation">'+tobeAiAdviceHtml(e,item,false)+'</div>'+
          (!item.isAddition&&Array.isArray(sourceStep?.outputs)&&
            sourceStep.outputs.some(value=>String(value)==='RECORD')?
            '<p class="tobe-ai-source-context"><b>Dato confirmado del AS-IS:</b> ya se ha declarado una salida de tipo registro estructurado. '+
              'Antes de proponer otro registro, verifica qué se guarda y cómo se genera actualmente.</p>':'')+
          (historicalChoice?'<details class="tobe-legacy-review" role="note">'+
            '<summary>Historial de revisión anterior (solo lectura)</summary>'+
            '<p>Decisión registrada en la arquitectura anterior: '+
              esc(TOBE_HUMAN_LABELS[historicalChoice.status]||historicalChoice.status)+'.</p>'+
            '<p><b>Justificación histórica:</b> '+esc(historicalChoice.note||'No consta')+'</p>'+
            '<p>La revisión antigua se conserva como evidencia y no constituye una segunda aprobación.</p>'+
            '</details>':'')+
          '</div></details>'+
      '</div></details></section>';
    // [AUNEA-FE-PG11-ONE-WORKBENCH-365] END
  return '<header class="tobe-inspector-head"><div><span class="tobe-eyebrow">'+
      (item.isAddition?'ACTIVIDAD NUEVA · VINCULADA A AS-IS':'ACTIVIDAD SELECCIONADA · ORIGEN AS-IS')+
      '</span><h2>'+(itemIndex>=0?'P'+(itemIndex+1)+' · ':'')+esc(tobeFlowItemName(item))+'</h2>'+
      (item.isAddition?'<p class="tobe-muted">Origen confirmado: '+esc(item.sourceStepName)+
        ' · Esta actividad existe sólo en el borrador TO-BE.</p>':'')+
      '</div><div class="tobe-inspector-navigation"><span class="tobe-selected-status">'+
        esc(item.transformation||'Sin definir')+'</span>'+
        (previousItem?'<button type="button" class="btn btn-outline btn-small" data-tobe-select="'+
          attr(tobeFlowItemId(previousItem))+'">Anterior</button>':'')+
        (nextItem?'<button type="button" class="btn btn-outline btn-small" data-tobe-select="'+
          attr(tobeFlowItemId(nextItem))+'">Siguiente actividad</button>':'')+
      '</div></header>'+
    '<nav class="tobe-review-steps" aria-label="Orden de revisión">'+
      '<button type="button" class="btn btn-outline btn-small" data-tobe-jump="tobeStepOrigin">03.1 · Entender el AS-IS</button>'+
      '<button type="button" class="btn btn-outline btn-small" data-tobe-jump="tobeStepAdvice">03.2 · Revisar oportunidades de mejora</button>'+
      '<button type="button" class="btn btn-outline btn-small" data-tobe-jump="tobeStepDesign">03.3 · Configurar la actividad futura</button>'+

    '</nav>'+supportingInformation+
    // [AUNEA-FE-PG11-DESIGN-COMPOSITION-310] START — PG11.03, UI only.
    // Existing version-owned TO-BE inputs remain sole edit owners; IA remains
    // advisory. Snapshot AS-IS remains immutable. No new business fields.
    '<section class="tobe-edit tobe-design-workspace" id="tobeStepDesign">'+
      '<header class="tobe-design-header"><div>'+
        '<h3 class="aunea-ui-section-title tobe-stage-heading">03.3 · Configurar la actividad futura</h3>'+
        '<p class="tobe-design-lede" data-tobe-transformation-message="1" role="status" aria-live="polite">'+
          'Aquí decides el diseño: conserva, modifica o aplica valores mediante vista previa. '+
          'No es necesario aceptar una recomendación completa antes. Nada se importa automáticamente.</p>'+
        '</div><span class="tobe-design-status">'+(editable?'Borrador editable':'Solo lectura')+'</span></header>'+
      tobeDecisionSourceSummaryHtml(e,p,item)+
      '<details class="tobe-design-evidence" id="tobeDesignEvidence" data-source-step-id="'+
        attr(item.sourceStepId)+'"'+(evidenceOpen?' open':'')+'>'+
        '<summary>Propuestas IA y condiciones de viabilidad'+
          (fieldBlockers?'<span class="tobe-design-warning-count">'+fieldBlockers+' '+(fieldBlockers===1?'bloqueo IA':'bloqueos IA')+'</span>':'')+
        '</summary>'+
        '<div class="tobe-design-evidence-content">'+
          tobeAiFieldCoverageHtml(e,p,item)+
          tobeAiOperationalContextHtml(e,item)+
        '</div>'+
      '</details>'+
      (item.isAddition?
        '<section class="tobe-design-group tobe-design-new-activity" aria-label="Datos de la nueva actividad">'+
          '<div class="tobe-design-group-head"><span class="tobe-design-group-number">00</span>'+
          '<div><h4>Identificar la nueva actividad</h4>'+
          '<p>Esta actividad sólo existe en TO-BE y mantiene su vínculo con el AS-IS.</p></div></div>'+
          '<div class="form-grid tobe-design-fields">'+
            tobeField(item,'stepName','Nombre de actividad futura',item.stepName,'text',!editable)+
            '<div class="field"><label>Tipo de actividad futura</label>'+
              (editable?auneaSelectControl('tobeStepType_'+item.id,
                [{value:'ST02',label:'Actividad operativa'},{value:'ST04',label:'Decisión · rutas SÍ / NO'}],
                item.stepType||'ST02',{extra:'data-tobe-item="'+attr(item.id)+'" data-tobe-field="stepType"',
                  placeholder:'Selecciona tipo'}):
                '<input disabled value="'+attr(item.stepType==='ST04'?'Decisión · rutas SÍ / NO':'Actividad operativa')+'">')+
              '<p class="field-help">Actividad operativa: ejecuta trabajo. Decisión: requiere rutas SÍ y NO.</p></div>'+
          '</div></section>':'')+
      '<section class="tobe-design-group tobe-design-transformation" aria-label="Transformación y propósito">'+
        '<div class="tobe-design-group-head"><span class="tobe-design-group-number">01</span>'+
          '<div><h4>Transformación y propósito</h4>'+
            '<p>Qué cambia y qué problema del AS-IS resuelve tu diseño.</p></div></div>'+
        (item.transformation==='Se mantiene'&&/^(no|n\/a|ninguno)$/i.test(String(item.problemResolved||'').trim())?
          '<p class="notice warn"><b>Justificación pendiente:</b> «Se mantiene» conserva esta actividad sin rediseño. El valor «NO» no explica cómo se controlan sus hallazgos; revisa la decisión antes de validar.</p>':'')+
        '<div class="form-grid tobe-design-fields">'+
          withAi('transformation',statusField)+
          withAi('problemResolved',tobeField(item,'problemResolved',
            tobeTransformationRationaleLabel(item.transformation),
            item.problemResolved,'textarea',!editable))+
        '</div></section>'+
      '<section class="tobe-design-group tobe-design-operation" aria-label="Funcionamiento operativo futuro">'+
        '<div class="tobe-design-group-head"><span class="tobe-design-group-number">02</span>'+
          '<div><h4>Funcionamiento futuro</h4>'+
            '<p>Cómo se ejecuta, qué supervisión exige y cómo se controlan sus riesgos.</p></div></div>'+
        '<div class="form-grid tobe-design-fields">'+
          withAi('automationAi',tobeField(item,'automationAi','Automatización e IA',item.automationAi,'textarea',!editable))+
          withAi('humanSupervision',tobeField(item,'humanSupervision','Supervisión humana',item.humanSupervision,'textarea',!editable))+
          withAi('controlsRisk',tobeField(item,'controlsRisk','Control / riesgo',item.controlsRisk,'textarea',!editable))+
        '</div></section>'+
      '<details class="tobe-execution-fields tobe-design-group" id="tobeExecutionFields"'+
        ' data-source-step-id="'+attr(item.sourceStepId)+'"'+(executionOpen?' open':'')+'>'+
        '<summary><span class="tobe-design-group-number">03</span><span>'+
          '<b>Recursos y datos de ejecución</b><small>Responsable, herramientas, entradas y salidas · 4 campos</small>'+
        '</span></summary>'+
        '<div class="tobe-artifact-origin-legend" aria-label="Origen de los datos de entrada y salida">'+
          '<span class="tobe-artifact-origin-sample is-asis">Del estudio AS-IS</span>'+
          '<span class="tobe-artifact-origin-sample is-improvement">Nuevo en TO-BE</span>'+
          '<span class="tobe-artifact-origin-sample is-removed">Original retirado del TO-BE</span>'+
          '<span class="tobe-artifact-origin-note">Los colores identifican procedencia, no aprobación.</span>'+
        '</div>'+
        '<div class="form-grid tobe-design-fields">'+
          withAi('futureActor',tobeCatalogField(item,'futureActor','Responsable futuro','OS_ACTOR_ROLE',!editable))+
          withAi('tool',tobeCatalogField(item,'tool','Herramienta / arquitectura','OS_TOOL_CATEGORY',!editable))+
          '<div class="tobe-data-pair">'+withAi('inputs',tobeArtifactField(item,'inputs','Datos de entrada',!editable,sourceStep))+'</div>'+
          '<div class="tobe-data-pair">'+withAi('outputs',tobeArtifactField(item,'outputs','Datos de salida',!editable,sourceStep))+'</div>'+
        '</div>'+
      '</details>'+
      tobeDecisionReadoutHtml(e,p,item)+
      tobeOptimizationPanelHtml(e,p,item)+
      tobeFutureTimeReviewHtml(item,sourceStep)+
      '<div class="tobe-guided-field-actions">'+
        (editable?'<button type="button" class="btn btn-outline" data-tobe-guided-save="1">Guardar borrador</button>':'')+
        '<button type="button" class="btn btn-outline" data-tobe-guided-check="1">Comprobar requisitos</button>'+
        (nextItem?'<button type="button" class="btn btn-primary" data-tobe-select="'+
          attr(tobeFlowItemId(nextItem))+'">Siguiente actividad</button>':'')+
      '</div></section>'+
      // [AUNEA-FE-PG11-DESIGN-COMPOSITION-310] END
      tobeFlowInspector(e,p,item)+
    (item.isAddition&&editable?'<button type="button" class="btn btn-outline" data-tobe-discard-added="'+attr(item.id)+'">Descartar actividad añadida</button>':'');
}
function createNextTobeVersion(e){
  const previous=latestTobe(e),snap=confirmedSnapshot(e);
  if(!previous||previous.status==='DRAFT'||!snap||previous.sourceSnapshotVersion!==snap.version)return false;
  const h=tobeHistory(e),version=h.length+1;
  const items=previous.items.map((it,i)=>({...it,id:'TOBE-'+version+'-'+(i+1)}));
  h.push({version,status:'DRAFT',sourceSnapshotVersion:snap.version,createdAt:now(),
    updatedAt:now(),items,flow:JSON.parse(JSON.stringify(tobeFlowOwner(e,previous)))});
  __auneaTobeSelection={engagementId:'',version:0,stepId:''};
  markDirty('Nueva versión TO-BE '+version+' desde versión revisada '+previous.version);
  return true;
}
// [AUNEA-FE-PG11-CONTEXT-289] START — compact PG11 read-only source projection.
// Read the sealed Contact snapshot first. DF016 is a Contact reference or OTHER,
// not a printable label: never expose a CRM id as the person's name.
// This remains display-only (no writes, new owners, or AS-IS mutations).
function tobeContextProcessOwnerLabel(snap,raw,e){
  const ref=String(raw??'').trim();
  if(!ref)return 'No consta';
  if(ref==='OTHER')return String(snap?.answerDetails?.DF016||'').trim()||
    'Rol del responsable no especificado';
  if(ref==='UNKNOWN')return 'Responsable pendiente de confirmar';
  const historical=(snap?.contacts||[]).find(ct=>String(ct.id)===ref);
  const live=typeof contactById==='function'?contactById(ref):null;
  const companyId=String(snap?.company?.id||e?.companyId||'');
  const owner=historical||(live&&companyId&&String(live.companyId)===companyId?live:null);
  if(owner){
    const name=typeof contactFullName==='function'?contactFullName(owner):
      ([owner.firstName,owner.lastName].filter(Boolean).join(' ').trim()||owner.name||'');
    const readable=String(name||'').trim();
    if(!readable||readable===ref)return 'Contacto sin nombre disponible';
    const role=String(owner.role||'').trim();
    return readable+(role?' · '+role:'');
  }
  // Historical free-text roles remain readable; ID-shaped references do not.
  return /^[A-Za-zÀ-ÿ][-A-Za-zÀ-ÿ\s/,.()]{1,119}$/.test(ref)?
    ref:'Referencia de contacto no resuelta';
}

// SOURCE: confirmed AS-IS snapshot / Simulator CANONICAL v1.14 PG11; DEC-050/052/055.
// Only existing DF fields are projected; no second owner, derived target or client re-ask.
function tobeContextOverviewHtml(e,p){
  const snap=tobeProposalSnapshot(e,p),answers=snap?.answers||{};
  const fieldById=id=>(schema?.fields||[]).find(f=>f.Field_ID===id)||{Field_ID:id,Option_Set_ID:null};
  const display=id=>{
    const raw=answers[id];
    if(raw===null||raw===undefined||raw===''||(Array.isArray(raw)&&!raw.length))return 'No consta';
    if(id==='DF016')return tobeContextProcessOwnerLabel(snap,raw,e);
    const field=fieldById(id);
    const readable=typeof formatContextValue==='function'?formatContextValue(field,raw):
      (Array.isArray(raw)?raw.map(x=>String(x)).join(' · '):String(raw));
    return String(readable||'No consta');
  };
  const line=(label,value)=>'<div class="tobe-context-fact"><dt>'+esc(label)+
    '</dt><dd>'+esc(value||'No consta')+'</dd></div>';
  const primary=[
    ['Inicio del proceso',display(answers.DF014?'DF014':'DF012')],
    ['Fin del proceso',display(answers.DF015?'DF015':'DF013')],
    ['Objetivo declarado',display('DF008')],
    ['Resultado deseado',display('DF086')]
  ];
  const secondary=[
    ['Criterios de éxito','DF009'],
    ['Responsable del proceso','DF016'],
    ['Restricciones iniciales','DF010'],
    ['Elementos que deben mantenerse','DF087'],
    ['Qué no debe automatizarse','DF088'],
    ['Aprobaciones humanas obligatorias','DF075'],
    ['Preferencias o límites de plataforma','DF089'],
    ['Seguridad y acceso','DF090'],
    ['Adopción y cambio','DF091'],
    ['Contexto de presupuesto (si se declaró)','DF092']
  ];
  const process=String(snap?.processName||answers.DF011||'Proceso sin nombre confirmado');
  const company=String(snap?.company?.name||'Empresa no consignada en el snapshot');
  const diagnostic=diagnosticOutputFreshness(e).label;
  const status={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',
    PUBLISHED:'Publicado'}[p?.status]||'Pendiente';
  return '<section class="tobe-context aunea-ui-work-surface" aria-label="Información general del proceso">'+
    '<div class="tobe-context-head"><div><span class="tobe-eyebrow">01 · INFORMACIÓN GENERAL</span>'+
    '<h2 class="aunea-ui-section-title">'+esc(process)+'</h2><p class="aunea-ui-section-caption">'+esc(company)+
    ' · Origen AS-IS confirmado v'+esc(snap?.version||p?.sourceSnapshotVersion||'—')+
    ' · '+esc((snap?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED').length)+' actividades</p></div>'+
    '<span class="tobe-context-status">'+esc(status)+'</span></div>'+
    '<div class="tobe-context-diagnostic"><strong>Diagnóstico oficial</strong>'+
    '<p>'+esc(diagnostic)+' · Información histórica confirmada, sólo lectura.</p></div>'+
    '<dl class="tobe-context-facts">'+primary.map(([label,value])=>line(label,value)).join('')+'</dl>'+
    '<details class="tobe-context-details"><summary>Consultar criterios y restricciones del cliente</summary>'+
    '<dl class="tobe-context-facts tobe-context-facts-secondary">'+
    secondary.map(([label,id])=>line(label,display(id))).join('')+'</dl>'+
    '<p>Los valores proceden de la captura confirmada. Se revisan en sus páginas de origen, no se modifican aquí.</p>'+
    '</details></section>';
}
// [AUNEA-FE-PG11-CONTEXT-289] END

// [AUNEA-FE-PG11-GLOBAL-OVERVIEW-284] START — read-only, version-bound global IA.
// SOURCE: Simulator CANONICAL v1.14 PG11; DEC-050/052/055; existing AUNEA System controls.
// The global source and per-step view share ONE version/snapshot/diagnosis gate.
// All links below are derived from the confirmed AS-IS, not from live edits.
function tobeGlobalStored(e,p){
  const entry=p?.aiGlobal,diag=typeof currentDiagnosticOutput==='function'?
    currentDiagnosticOutput(e):null;
  if(!e||!p||!entry||entry.tobeVersion!==p.version||
     entry.sourceSnapshotVersion!==p.sourceSnapshotVersion||
     entry.diagnosticInputHash!==diag?.input_snapshot_hash||
     entry.result?.status!=='DRAFT'||entry.result.engagement_id!==e.id||
     entry.result.snapshot_version!==p.sourceSnapshotVersion)return null;
  const preflight=typeof internalAiGlobalWorking==='function'&&
    internalAiGlobalWorking(e)&&
    typeof internalAiGlobalMessage==='function'&&
    internalAiGlobalMessage(e)?.phase==='PREFLIGHT';
  return preflight?null:entry.result;
}
function tobeGlobalSourceIdsForStep(e,p,sourceId){
  const id=String(sourceId||''),ids=new Set(id?[id]:[]),
    snapshot=typeof tobeProposalSnapshot==='function'?tobeProposalSnapshot(e,p):null;
  // Friction and risk relations come from the confirmed snapshot only.
  for(const friction of snapshot?.frictions||[]){
    if(friction?.status==='SUPERSEDED')continue;
    const affected=friction.affected_steps||friction.step_ids||[];
    if(Array.isArray(affected)&&affected.map(String).includes(id)&&friction.id)
      ids.add(String(friction.id));
  }
  for(const risk of snapshot?.risks||[]){
    if(risk?.status==='SUPERSEDED')continue;
    const affected=risk.step_ids||[];
    if(Array.isArray(affected)&&affected.map(String).includes(id)&&(risk.id||risk.risk_id))
      ids.add(String(risk.id||risk.risk_id));
  }
  return ids;
}
function tobeGlobalLinksForStep(e,p,item){
  if(!item||item.isAddition)return [];
  const result=tobeGlobalStored(e,p),sources=tobeGlobalSourceIdsForStep(e,p,item.sourceStepId);
  return (result?.opportunities||[]).flatMap((recommendation,index)=>{
    const refs=[...(recommendation.source_refs||[]),
      ...(recommendation.related||[]).flatMap(x=>x.source_refs||[])];
    return refs.some(id=>sources.has(String(id)))?[{recommendation,index:index+1}]:[];
  });
}
function tobeGlobalLinkedStepHtml(e,p,item){
  const linked=tobeGlobalLinksForStep(e,p,item),result=tobeGlobalStored(e,p);
  if(!result||!linked.length)return '';
  const complete=result.complete!==false;
  const progress=result.progress||{},
    done=Number.isInteger(progress.completed)?progress.completed:
      Array.isArray(progress.focus_done)?progress.focus_done.length:null,
    total=Number.isInteger(progress.total)?progress.total:null,
    scope=done!==null&&total!==null?' ('+done+' de '+total+' fuentes verificadas)':'';
  return '<details class="tobe-subdetails tobe-global-step-context">'+
    '<summary>Recomendaciones del análisis global vinculadas · '+linked.length+'</summary>'+
    (!complete?'<p class="notice warn">El análisis global por fuentes de la sección 02 está incompleto'+scope+'. La cobertura de actividades analizadas por IA en la sección 03 es independiente.</p>':'')+
    '<ul class="tobe-source-list">'+linked.map(({recommendation:r,index})=>
      '<li><b>'+index+' · '+esc(r.objective)+'</b>'+
      '<p>'+esc(r.how)+'</p>'+
      (r.review?.status==='INCOMPATIBLE'?
        '<p><b>Incompatibilidad detectada:</b> '+esc(r.review.reason||'Pendiente de revisión.')+'</p>':
        '<p><b>Viabilidad pendiente:</b> '+esc(r.review?.reason||'Requiere comprobación.')+'</p>')+
      (r.alternative?'<p><b>Alternativa propuesta:</b> '+esc(r.alternative.how)+'</p>':'')+
      '<p><b>Referencias de origen:</b> '+
        esc((()=>{
          const refs=[...(r.source_refs||[]),...(r.related||[]).flatMap(x=>x.source_refs||[])]
            .filter((x,i,a)=>a.indexOf(x)===i);
          return typeof tobeHumanReadableRefs==='function'?tobeHumanReadableRefs(e,refs):
            (typeof internalAiReadableRefs==='function'?internalAiReadableRefs(e,refs):refs.join(' · '));
        })())+'</p></li>').join('')+
    '</ul><p class="tobe-muted">Contexto de solo lectura. Estas propuestas no sustituyen '+
    'el análisis individual, ni aplican cambios o decisiones al TO-BE.</p></details>';
}
// Read-only PG11 presentation of client conditions: labels come from the
// CANONICAL diagnostic option sets (or from source-backed backend metadata).
// Business codes/DF ids stay in stored evidence, never become screen labels.
function tobeGlobalHumanConditions(snapshot,review){
  const canonical=typeof schema!=='undefined'?schema:null;
  const answers=snapshot?.answers||{};
  const conditions=Array.isArray(review?.declared_conditions)?
    review.declared_conditions:[];
  const ids=['DF010','DF073','DF075','DF087','DF088','DF089','DF090','DF091','DF092'];
  const visible=[];
  for(const id of ids){
    const field=(canonical?.fields||[]).find(x=>x.Field_ID===id);
    const set=canonical?.option_sets?.[field?.Option_Set_ID];
    const allowed=Array.isArray(set?.options)?set.options:[];
    const raw=answers[id];
    const vals=Array.isArray(raw)?raw:
      (raw===undefined||raw===null||raw===''?[]:[raw]);
    const declarations=conditions.filter(x=>x?.source===id);
    const values=vals.length?vals.map(value=>{
      const code=String(value??'').trim();
      if(!code)return '';
      const option=allowed.find(x=>String(x.value)===code);
      const fromBackend=declarations.find(x=>String(x.value)===code)?.meaning;
      const readable={
        COMPLIANCE:'Cumplimiento legal y normativo',
        OWNERSHIP:'Propiedad y responsabilidad de los datos',
        PLATFORM:'Herramientas y plataformas',
        RBAC:'Acceso según permisos de cada usuario',
        AUDIT_LOG:'Registro de auditoría de las acciones',
        CRM_NATIVE:'Funciones existentes del CRM o ERP',
        FINANCIAL:'Información financiera',
        CONFIDENTIAL:'Información comercial confidencial',
        UNKNOWN:'No especificado',
      };
      // Presentation only: canonical values, meanings and provenance remain intact.
      return String(readable[code]||option?.label||fromBackend||
        (/^[A-Z][A-Z0-9_]{2,}$/.test(code)?
          'Condición registrada pendiente de aclaración':code));
    }).filter(Boolean):
      declarations.map(x=>String(x.meaning||'').trim()).filter(Boolean);
    if(!values.length)continue;
    visible.push({label:String(field?.Pregunta_o_etiqueta_ES||'Condición declarada'),
      values:[...new Set(values)]});
  }
  return visible;
}
function tobeGlobalReadableChecks(rows,property){
  return [...new Set((Array.isArray(rows)?rows:[])
    .map(x=>String(x?.[property]||'').trim()).filter(Boolean))];
}
// Section 02 renders implementation questions per recommendation; repeated
// checks are shown only once for the thematic group. All original evidence,
// option codes, rule traces and IA text remain saved on aiGlobal.result.
function tobeGlobalImplementationQuestions(item){
  return [...new Set([
    ...(item?.review?.verifications||[]).map(x=>String(x?.question||'').trim()),
    ...(item?.review?.operational_checks||[]).map(x=>String(x?.question||'').trim())
  ].filter(Boolean))];
}
function tobeGlobalSharedQuestions(group,globallyShared=[]){
  const sets=(group?.entries||[]).map(({item})=>tobeGlobalImplementationQuestions(item));
  const global=new Set(globallyShared);
  return sets.length>1?
    sets[0].filter(q=>!global.has(q)&&sets.slice(1).every(values=>values.includes(q))):[];
}
function tobeGlobalSpecificQuestions(group,item,globallyShared=[]){
  const shared=new Set([...tobeGlobalSharedQuestions(group,globallyShared),...globallyShared]);
  return tobeGlobalImplementationQuestions(item).filter(q=>!shared.has(q));
}
// PG11 section 02: separate business objective, option, evidence and conditions.
// Identical questions/alerts shared by all sources are rendered only once.
// These helpers are projections: they never edit the confirmed snapshot or IA output.
function tobeGlobalUniversalQuestions(opportunities){
  const sets=(opportunities||[]).map(tobeGlobalImplementationQuestions);
  return sets.length>1?sets[0].filter(q=>sets.slice(1).every(other=>other.includes(q))):[];
}
function tobeGlobalGroupWarnings(group){
  return [...new Set((group?.entries||[]).flatMap(entry=>entry.issues||[])
    .map(x=>String(x||'').trim()).filter(Boolean))];
}
function tobeGlobalOptionWarnings(group,entry){
  const repeated=new Set((group?.entries||[]).length>1?
    tobeGlobalGroupWarnings(group).filter(q=>group.entries.every(e=>(e.issues||[]).includes(q))):[]);
  return (entry?.issues||[]).filter(q=>!repeated.has(q));
}
function tobeGlobalReadableProposal(item,steps){
  const original=String(item?.how||'');
  const linked=Array.isArray(steps)?steps:[];
  return original.replace(/\bP\d+\b/g,()=>{
    const name=linked.length===1?String(linked[0]?.sourceStepName||'').trim():'';
    return name?'la actividad «'+name+'»':'una actividad vinculada del proceso';
  });
}
// Mirror the PG11 backend's conservative, punctuation-neutral completeness
// heuristic. A full sentence may legitimately be returned without a full stop.
function tobeGlobalTextIsComplete(value){
  if(typeof value!=='string')return false;
  const text=value.trim();
  if(!text)return false;
  if(/[.!?…]["'”’)\]]*$/.test(text))return true;
  if(text.split(/\s+/).length<4||/[,;:/\\-]$/.test(text))return false;
  for(const [opening,closing] of [['(',')'],['[',']'],['«','»']]){
    if(text.split(opening).length!==text.split(closing).length)return false;
  }
  const words=text.match(/[\p{L}\p{N}]+/gu)||[];
  if(!words.length)return false;
  const last=words[words.length-1];
  const normalized=last.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dangling=new Set(
    ('a al ante bajo con contra de del desde durante en entre hacia hasta '+
     'mediante para por segun sin sobre tras y e o u que quien quienes cuyo '+
     'cuya cuyos cuyas el la los las un una unos unas lo le les se su sus '+
     'mi mis tu tus este esta estos estas ese esa esos esas otro otra otros '+
     'otras cada como cuando donde mientras aunque porque si no').split(' '));
  // Same bounded fragment check as the backend; not semantic certification.
  if(last===last.toLowerCase()&&['term','clie'].includes(normalized))return false;
  if(dangling.has(normalized)||last.length===1)return false;
  if(last.length===2&&last!==last.toUpperCase())return false;
  return true;
}
function tobeGlobalOverviewHtml(e,p){
  const working=typeof internalAiGlobalWorking==='function'&&internalAiGlobalWorking(e),
    feedback=typeof internalAiGlobalMessage==='function'?internalAiGlobalMessage(e):null,
    preflight=working&&feedback?.phase==='PREFLIGHT',
    result=tobeGlobalStored(e,p),
    historical=(Array.isArray(e?.tobeProposals)?[...e.tobeProposals].reverse():[])
      .find(draft=>draft!==p&&draft?.aiGlobal?.result)?.aiGlobal,
    previous=p?.aiGlobal||historical,
    notCurrent=!working&&!result&&!!previous,
    notCurrentReason=previous?.tobeVersion!==p?.version?
      'El análisis corresponde a otra versión del borrador TO-BE.':
      previous?.sourceSnapshotVersion!==p?.sourceSnapshotVersion?
        'El análisis corresponde a otra versión del AS-IS confirmado.':
      previous?.diagnosticInputHash!==(typeof currentDiagnosticOutput==='function'?
        currentDiagnosticOutput(e)?.input_snapshot_hash:undefined)?
        'El diagnóstico vigente no coincide con el utilizado para este análisis.':
        'El resultado guardado no cumple el contrato de vigencia del estudio.',
    complete=!!result&&Array.isArray(result.opportunities)&&
      [result.summary,...result.opportunities.flatMap(item=>[
        item.how,item.why,...(item.related||[]).flatMap(x=>[x.how,x.why]),
        ...(item.alternative?[item.alternative.how,item.alternative.why]:[])])]
        .every(value=>tobeGlobalTextIsComplete(value)),
    legacy=!!result&&!complete,
    opportunities=Array.isArray(result?.opportunities)?result.opportunities:[],
    progress=result?.progress||null,
    analysisFinished=result?.complete!==false,
    successful=progress?.focus_done?.length??progress?.completed??0,
    outstanding=Math.max(0,(progress?.total||0)-successful),
    retryable=!!result&&result.complete===false&&outstanding>0&&Array.isArray(progress?.focus_done),
    incompatible=opportunities.filter(x=>x.review?.status==='INCOMPATIBLE').length,
    alternatives=opportunities.filter(x=>!!x.alternative).length,
    pending=opportunities.filter(x=>x.review?.status!=='INCOMPATIBLE').length,
    variants=opportunities.reduce((n,x)=>n+(x.related||[]).length,0),
    qualityPlan=result&&typeof tobeGlobalQualityGroups==='function'?
      tobeGlobalQualityGroups(opportunities):null,
    thematicGroups=qualityPlan?.groups||
      opportunities.map((item,index)=>({title:item.objective,
        entries:[{item,index,issues:[]}],expectedOutcome:'Por verificar.',
        technicalChecks:[],evidenceRefs:item.source_refs||[]})),
    expandedGlobalGroups=typeof document!=='undefined'?new Set(
      [...document.querySelectorAll('#tobeGlobalAnalysis .tobe-global-opportunity-detail[open]')]
        .map(x=>x.getAttribute('data-global-group-key'))):new Set(),
    monitoringWasOpen=typeof document!=='undefined'?
      !!document.querySelector('#tobeGlobalAnalysis .tobe-global-monitoring')?.open:false;
  const source=tobeProposalSourceSteps(e,p),
    confirmed=typeof tobeProposalSnapshot==='function'?tobeProposalSnapshot(e,p):null,
    record=confirmed||{frictions:[],risks:[]};
  const refs=ids=>(ids||[]).map(id=>{
    const step=source.find(s=>String(s.id)===String(id)),
      friction=(record?.frictions||[]).find(f=>String(f.id)===String(id)&&f.status!=='SUPERSEDED'),
      risk=(record?.risks||[]).find(r=>String(r.id||r.risk_id)===String(id)&&r.status!=='SUPERSEDED');
    if(friction){
      const measures=[],freq=friction.frequency,
        effort=friction.active_time_loss,wait=friction.wait_time_loss,
        attribution=friction.time_attribution?.mode,
        timing=attribution==='INCLUDED'?'ya incluido en el paso':
          attribution==='BREAKDOWN'?'desglose del retrabajo':
          attribution==='ADDITIONAL'?'adicional atribuido':'atribución por comprobar';
      if(freq?.value!==undefined&&freq?.value!==null&&
         String(freq.mode||'').toLowerCase()==='percent')
        measures.push('Frecuencia '+freq.value+' %');
      if(effort?.value!==undefined&&effort?.value!==null&&Number(effort.value)>0)
        measures.push('Trabajo '+effort.value+' '+(effort.unit||'unidad sin especificar')+' ('+timing+')');
      if(wait?.value!==undefined&&wait?.value!==null&&Number(wait.value)>0)
        measures.push('Espera '+wait.value+' '+(wait.unit||'unidad sin especificar'));
      const provenance=typeof evidenceTypeBackend==='function'?
        evidenceTypeBackend(friction.evidence_type):({
          EV01:'MEASURED',EV02:'CLIENT_DECLARED',
          EV03:'AUNEA_ESTIMATE',EV04:'HYPOTHESIS',EV05:'SPECIFIC_BENCHMARK'
        })[friction.evidence_type]||friction.evidence_type;
      const provenanceLabel=({
        MEASURED:'Dato medido',CLIENT_DECLARED:'Declarado por el cliente',
        AUNEA_ESTIMATE:'Estimación de AUNEA',HYPOTHESIS:'Hipótesis',
        SPECIFIC_BENCHMARK:'Referencia comparable'
      })[provenance]||'Procedencia pendiente de confirmar';
      return 'Fricción: '+(friction.client_label||'Fricción confirmada sin descripción')+
        (measures.length?' · '+measures.join(' · '):'')+
        (friction.evidence_type?' · Origen: '+provenanceLabel:' · Origen: no especificado');
    }
    return step?'Paso: '+(step.step_name||step.name||'Actividad confirmada sin nombre'):
      risk?'Riesgo: '+(risk.description||'Riesgo confirmado sin descripción'):
        'Referencia de origen sin descripción disponible en el AS-IS';
  });
  const completeCards=opportunities.filter(item=>
    [item.how,item.why,...(item.related||[]).flatMap(x=>[x.how,x.why]),
      ...(item.alternative?[item.alternative.how,item.alternative.why]:[])]
      .every(value=>tobeGlobalTextIsComplete(value))).length,
    decisions=typeof tobeHumanReviewRecord==='function'?
      Object.values(tobeHumanReviewRecord(e,p)?.decisions||{})
        .filter(x=>['ACCEPT','MODIFY','DISCARD'].includes(x?.status)).length:0;
  const linkedSteps=rec=>{
    const refs=new Set([...(rec.source_refs||[]),
      ...(rec.related||[]).flatMap(x=>x.source_refs||[])].map(String));
    return (p?.items||[]).filter(item=>
      [...tobeGlobalSourceIdsForStep(e,p,item.sourceStepId)].some(id=>refs.has(id)));
  };
  const groupSteps=group=>{
    const targets=group.entries.flatMap(({item})=>linkedSteps(item));
    return [...new Map(targets.map(step=>[String(step.sourceStepId),step])).values()];
  };
  const globallyShared=tobeGlobalUniversalQuestions(opportunities);
  const state=working?'Analizando por fuentes…':result&&!analysisFinished?'Análisis parcial · Revisar':legacy?'Propuesta incompleta · Reanalizar':result?'Propuesta guardada · Sin aprobar':notCurrent?'Análisis anterior no vigente':'Pendiente de análisis';
  return '<section class="tobe-global-analysis aunea-ui-work-surface" id="tobeGlobalAnalysis" aria-label="Análisis global IA del proceso">'+
    '<header class="tobe-global-analysis-head"><div><span class="tobe-eyebrow">02 · ANÁLISIS IA GLOBAL DEL PROCESO</span>'+
      '<h2 class="aunea-ui-section-title">Objetivos y recomendaciones de mejora</h2>'+
      '<p>Primero, qué mejorar en el conjunto del proceso y cómo conseguirlo. Las decisiones sobre cada actividad se realizan después.</p></div>'+
      (tobeEditable(p)?'<div class="tobe-global-head-actions">'+
        (retryable?'<button type="button" class="btn btn-outline" id="retryTobeGlobal"'+
          (working?' disabled aria-busy="true"':'')+'>Reintentar fuentes pendientes</button>':'')+
        '<button type="button" class="btn btn-primary" id="analyzeTobeGlobal"'+
        (working?' disabled aria-busy="true"':'')+'>'+
        (working?'Analizando proceso…':result||legacy?'Volver a analizar':'Analizar proceso con IA')+
        '</button></div>':'')+'</header>'+
    '<div class="tobe-global-summary"><div class="tobe-global-summary-top">'+
      '<strong>'+(working?'Analizando proceso…':legacy?'Análisis anterior incompleto':result?'Síntesis del proceso':notCurrent?'Análisis guardado no vigente':'Análisis pendiente')+'</strong>'+
      '<span class="tobe-global-state" aria-live="polite">'+esc(state)+'</span></div>'+
      '<p>'+esc(preflight?'Comprobando que el backend admite el análisis por bloques. No se ha borrado ninguna propuesta.':working&&!result?'Se ha retirado el análisis anterior. Preparando una propuesta nueva con el AS-IS confirmado…':notCurrent?
        'Existe un análisis anterior guardado, pero no se puede utilizar como propuesta vigente. '+notCurrentReason+
        ' No se ha borrado al consultar esta pantalla; verifica la versión del estudio antes de volver a analizar.':
        result?.summary||'No se ha registrado una propuesta global vigente en este borrador. El análisis no se ha ejecutado o no se ha guardado para esta versión; no se alterarán campos del TO-BE.')+'</p></div>'+
    (typeof internalAiProgressHtml==='function'?internalAiProgressHtml(e,'global'):'')+
    '<details class="tobe-global-monitoring"'+
      ((monitoringWasOpen||feedback?.type==='warn'||!!progress?.failures?.length)?' open':'')+'>'+
      '<summary>Ver seguimiento, fuentes y comprobaciones'+
        (progress?.total?' · '+successful+' de '+progress.total+' fuentes':'')+
        (opportunities.length?' · '+opportunities.length+' propuestas':'')+
        '</summary><div class="tobe-global-monitoring-body">'+
    (opportunities.length?'<p class="tobe-global-feedback">Consolidación de propuestas: '+
      opportunities.length+' intervenciones registradas (candidatas a consolidación) · '+incompatible+
      ' incompatibilidades detectadas · '+alternatives+' alternativas sugeridas · '+
      pending+' intervenciones por verificar'+
      (variants?' · '+variants+' variantes relacionadas conservadas':'')+
      (qualityPlan?' · '+thematicGroups.length+' líneas relacionadas para revisión':'')+
      '. Ninguna equivale a aprobación del consultor.</p>':'')+
    (opportunities.length&&tobeGlobalHumanConditions(record,opportunities[0]?.review).length?
      '<details class="tobe-global-detail tobe-global-client-conditions">'+
        '<summary>Condiciones del cliente confirmadas en el AS-IS ('+
        tobeGlobalHumanConditions(record,opportunities[0]?.review).length+')</summary>'+
        '<ul class="tobe-source-list">'+tobeGlobalHumanConditions(record,opportunities[0]?.review)
          .map(c=>'<li><b>'+esc(c.label)+':</b> '+esc(c.values.join(' · '))+'</li>')
          .join('')+'</ul>'+
        '<p class="tobe-muted">Estas condiciones afectan al conjunto del análisis. '+
        'Las incompatibilidades de cada intervención se muestran en su propia tarjeta.</p>'+
      '</details>':'')+
    (progress?'<div class="tobe-global-progress" role="status" aria-live="polite">'+
      '<p><b>Generación:</b> Fuentes revisadas: '+successful+' de '+progress.total+
        (outstanding?' · Pendientes: '+outstanding:'')+
        (progress.failed?' · Incidencias: '+progress.failed:'')+
        (analysisFinished&&!outstanding?' · Análisis de fuentes completado':
          ' · Resultado parcial; no aprobar todavía')+'</p>'+
      '<p><b>Integridad:</b> '+completeCards+' de '+opportunities.length+
        ' recomendaciones con texto completo'+
        (legacy?' · Existen frases incompletas: conservar y reanalizar.':
          ' · Sin cortes detectados.')+'</p>'+
      '<p><b>Coherencia (revisión pendiente):</b> '+
        (qualityPlan?qualityPlan.reviewCount+' alertas de reglas y '+
          (qualityPlan.operationalReviewCount||0)+' intervenciones con comprobación operativa pendiente'+
          (qualityPlan.operationalNotEvaluated?' · '+qualityPlan.operationalNotEvaluated+
            ' sin evaluación operativa registrada (análisis anterior)':'')+
          ', de '+opportunities.length+' intervenciones.':
          'Sin comprobar.')+'</p>'+
      '<p><b>Revisión humana:</b> '+decisions+
        ' decisiones sobre actividades registradas; propuestas globales sin aprobar.</p>'+
      '</div>':'')+
    (opportunities.length?'<p class="tobe-global-caution">Priorización pendiente: contrastar impacto, evidencias y dependencias con el consultor. El orden visual no es una prioridad aprobada.</p>':'')+
    (!result&&!working?'<p class="tobe-global-feedback"><b>Coherencia sin evaluar:</b> no hay una propuesta global vigente sobre la que comprobar alertas o viabilidad.</p>':'')+
    (!progress&&qualityPlan?'<p class="tobe-global-feedback"><b>Coherencia (revisión pendiente):</b> '+
      qualityPlan.reviewCount+' alertas de reglas y '+
        (qualityPlan.operationalReviewCount||0)+' intervenciones con comprobación operativa pendiente. '+
        (qualityPlan.operationalNotEvaluated?qualityPlan.operationalNotEvaluated+
          ' sin evaluación operativa registrada; vuelve a analizar para obtenerla. ':'')+
        'Ninguna recomendación está aprobada.</p>':'')+
    (progress?.failures?.length?'<details class="tobe-global-detail"><summary>Fuentes pendientes e incidencias</summary>'+
      '<p>'+esc(progress.failures.map(x=>x.source_id+': '+x.reason).join(' · '))+
      '</p></details>':'')+
    (feedback?'<p class="tobe-global-feedback'+(feedback.type==='warn'?' is-warning':'')+
      '" role="status" aria-live="polite">'+esc(feedback.message)+'</p>':'')+
    (opportunities.length&&globallyShared.length?
      '<details class="tobe-global-universal-checks"><summary>Requisitos de implantación compartidos por todas las propuestas ('+
      globallyShared.length+')</summary><ul class="tobe-source-list">'+globallyShared
        .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
    '</div></details>'+
    (opportunities.length?'<div class="tobe-global-opportunities" aria-label="Objetivos y recomendaciones">'+
      thematicGroups.map((group,i)=>
      '<article class="tobe-global-opportunity">'+
      '<details class="tobe-global-opportunity-detail" data-global-group-key="'+encodeURIComponent(String(group.title))+'"'+
        (expandedGlobalGroups.has(encodeURIComponent(String(group.title)))?' open':'')+'>'+
      '<summary class="tobe-global-opportunity-summary">'+
      '<span class="tobe-global-number" aria-hidden="true">'+(i+1)+'</span>'+
      '<div class="tobe-global-goal-block">'+
        '<span class="tobe-global-item-label">'+(group.entries.length>1?'Línea de mejora':'Objetivo de mejora')+'</span>'+
        '<h3 class="tobe-global-goal">'+esc(group.title)+'</h3>'+
        '<p class="tobe-global-goal-meta">'+group.entries.length+
          (group.entries.length===1?' propuesta IA pendiente de revisión':' propuestas IA por comparar, sin seleccionar')+'</p>'+
      '</div>'+
      '<span class="tobe-global-brief-indicator">'+
        esc(group.incompatible?'Incompatibilidad':group.entries.some(x=>x.item?.review?.status==='CONDITIONED')?
          'Viabilidad por comprobar':'Pendiente de revisión')+'</span>'+
      '</summary><div class="tobe-global-opportunity-body">'+
      '<div class="tobe-global-brief-grid">'+
        '<div class="tobe-global-brief-result"><span class="tobe-global-kicker">RESULTADO QUE SE BUSCA</span>'+
          '<p>'+esc(group.expectedOutcome||'Resultado por definir a partir de la evidencia.')+'</p></div>'+
        '<div class="tobe-global-brief-status"><span class="tobe-global-kicker">VIABILIDAD</span>'+
          '<p>'+esc(group.incompatible?
            'Existe una incompatibilidad confirmada: no aplicar la propuesta afectada.':
            group.entries.some(x=>x.item?.review?.status==='CONDITIONED')?
              'Condicionada: hace falta comprobar sus capacidades y restricciones.':
              'Pendiente de evaluación. No aprobada.')+'</p></div>'+
      '</div>'+
      (group.entries.length===1&&group.entries[0]?.item?.how?
        '<div class="tobe-global-single-proposal"><span class="tobe-global-kicker">PROPUESTA DE LA IA</span>'+
        '<p>'+esc(tobeGlobalReadableProposal(group.entries[0].item,groupSteps(group)))+'</p></div>':'')+
      (group.entries.length>1?
        '<p class="tobe-global-variants-lead">Las propuestas persiguen una misma mejora. Abrir la comparación para comprobar si son alternativas o pueden combinarse.</p>':'')+
      (tobeGlobalGroupWarnings(group).length?
        '<details class="tobe-global-group-warnings"><summary>Observaciones de calidad ('+
          tobeGlobalGroupWarnings(group).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalGroupWarnings(group).map(q=>
            '<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
      (groupSteps(group).length?'<div class="tobe-global-review-links">'+
        '<span class="tobe-global-review-label">Revisar en actividades:</span>'+
        '<div class="tobe-global-review-actions">'+groupSteps(group).map(step=>
          '<button type="button" class="btn btn-outline btn-small" '+
          'data-tobe-select="'+attr(String(step.sourceStepId))+'" data-tobe-global-link="1">'+
          esc(step.sourceStepName||step.stepName||String(step.sourceStepId))+
          '</button>').join('')+'</div></div>':'')+
      '<details class="tobe-global-card-details"><summary>Comparar propuestas y consultar evidencias'+
        ' ('+group.entries.length+')</summary><div class="tobe-global-card-detail-body">'+
      group.entries.map(({item,issues},j)=>
      '<section class="tobe-global-intervention">'+
      '<div class="tobe-global-option-head">'+
        '<h4 class="tobe-global-option-title">Propuesta '+(j+1)+' de '+group.entries.length+'</h4>'+
        '<span class="tobe-global-option-state">'+
          esc(item.review?.status==='INCOMPATIBLE'?'Incompatible · revisar alternativa':
            'Pendiente de validar')+'</span>'+
      '</div>'+
      '<p class="tobe-global-option-action">'+
        esc(tobeGlobalReadableProposal(item,linkedSteps(item)))+'</p>'+
      (tobeGlobalOptionWarnings(group,{issues}).length?
        '<div class="tobe-global-option-caveat"><b>Qué hay que cuestionar</b><ul>'+
          tobeGlobalOptionWarnings(group,{issues}).map(q=>'<li>'+esc(q)+'</li>').join('')+
        '</ul></div>':'')+
      (item.alternative?'<p class="tobe-global-action"><b>Alternativa propuesta:</b> '+
        esc(item.alternative.how)+'</p>':
        item.alternative_note?'<p class="tobe-global-assessment">'+
          esc(item.alternative_note)+'</p>':'')+
      '<div class="tobe-global-option-evidence">'+
        '<div><span class="tobe-global-kicker">POR QUÉ SE PROPONE</span>'+
          '<p>'+esc(item.why)+'</p></div>'+
        '<div><span class="tobe-global-kicker">EVIDENCIA DEL AS-IS</span>'+
          '<p>'+esc(refs(item.source_refs).join(' · ')||'No consta una fuente legible')+'</p></div>'+
      '</div>'+
      '<details class="tobe-global-option-more"><summary>Consultar objetivo, incompatibilidades y comprobaciones</summary>'+
        '<div class="tobe-global-detail">'+
      '<p><b>Objetivo original:</b> '+esc(item.objective)+'</p>'+
      (item.review?.status==='INCOMPATIBLE'?
        '<p><b>Evaluación:</b> Incompatibilidad confirmada: no aplicar sin corregir la propuesta.</p>':'')+
      (item.alternative?'<p><b>Alternativa:</b> Mantenerla como posibilidad pendiente de evaluación; no se aplica automáticamente.</p>':'')+
      ((item.related||[]).length?'<p><b>Enfoques relacionados (sin descartar):</b></p>'+
        '<ul class="tobe-source-list">'+item.related.map(other=>
          '<li><b>'+esc(other.objective)+':</b> '+esc(other.how)+
          ' <small>Motivo: '+esc(other.why)+' · Fuentes: '+
          esc(refs(other.source_refs).join(' · '))+'</small></li>').join('')+
        '</ul>':'')+
      (item.review?.conflicts?.length?
        '<p><b>Incompatibilidad detectada:</b> '+
          esc(tobeGlobalReadableChecks(item.review.conflicts,'reason').join(' · '))+'</p>':'')+
      (item.alternative?.source_refs?.length?
        '<p><b>Evidencia de la alternativa:</b> '+
          esc(refs(item.alternative.source_refs).join(' · '))+'</p>':'')+
      (tobeGlobalSpecificQuestions(group,item,globallyShared).length?
        '<details class="tobe-global-evidence-detail">'+
          '<summary>Qué debe comprobarse para esta intervención ('+
            tobeGlobalSpecificQuestions(group,item,globallyShared).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalSpecificQuestions(group,item,globallyShared)
            .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul>'+
        '</details>':'')+
      '</div></details></section>').join('')+
      (tobeGlobalSharedQuestions(group,globallyShared).length?
        '<details class="tobe-global-shared-checks"><summary>Comprobaciones compartidas por estas propuestas ('+
          tobeGlobalSharedQuestions(group,globallyShared).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalSharedQuestions(group,globallyShared)
            .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
      '</div></details></div></details></article>').join('')+'</div>':
      result?'<p class="tobe-global-empty">'+
        (analysisFinished&&outstanding===0?
          'No se han identificado mejoras justificadas en las fuentes completadas. Revisa la evidencia antes de cerrar.':
          'Análisis parcial: quedan fuentes por revisar. Aún no se puede concluir que no existan otras mejoras.')+
        '</p>':'')+
    (legacy?'<p class="tobe-global-feedback is-warning" role="status">La salida anterior contiene una frase que puede estar incompleta. Se muestra íntegra tal como la devolvió Ollama. Regenera antes de aprobar.</p>':'')+
    (result?'<p class="tobe-global-caution">Propuesta sin aprobar. Contrasta las cifras con las referencias del AS-IS confirmado; no son promesas de ahorro ni tiempos futuros. La revisión humana sigue siendo obligatoria.</p>':'')+
    '</section>';
}
// [AUNEA-FE-PG11-GLOBAL-OVERVIEW-284] END

// [AUNEA-FE-PG11-GUIDED-NAV-266] START — navigation derives from selected owner.
function tobeGuidedNavHtml(e,p){
  const guidedItems=[...(p.items||[]),...tobeAddedSteps(p)],
    focused=tobeSelectedItem(e,p),selectedId=tobeFlowItemId(focused),
    focusedIndex=Math.max(0,guidedItems.findIndex(x=>tobeFlowItemId(x)===selectedId));
  const modeButton=(mode,label)=>'<button type="button" class="btn '+
    (__auneaTobeMode===mode?'btn-primary':'btn-outline')+
    '" data-tobe-mode-switch="'+mode+'" aria-pressed="'+String(__auneaTobeMode===mode)+'">'+label+'</button>';
  return '<nav class="tobe-guided-nav" aria-label="Navegación del diseño TO-BE">'+
    '<div class="tobe-guided-modes">'+modeButton('guided','Revisión por actividad')+
    modeButton('map','Mapa TO-BE')+'</div>'+
    '<div class="tobe-guided-tabs" aria-label="Actividades del proceso">'+
    guidedItems.map((step,i)=>'<button type="button" class="btn btn-outline btn-small '+
      (tobeFlowItemId(step)===selectedId?'is-selected':'')+'" data-tobe-select="'+
      attr(tobeFlowItemId(step))+'" aria-pressed="'+String(tobeFlowItemId(step)===selectedId)+'">'+
      '<b>P'+(i+1)+'</b> '+esc(tobeFlowItemName(step).split(/\s+/).slice(0,3).join(' '))+
      '</button>').join('')+'</div>'+
    '<div class="tobe-guided-switch"><span class="tobe-muted">Actividad '+
      (focusedIndex+1)+' de '+guidedItems.length+'</span>'+ 
    '</div></nav>';}
// [AUNEA-FE-PG11-GUIDED-NAV-266] END
function tobePage(){
  const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap)return pageTop('Diseño TO-BE','Necesita un AS-IS confirmado.',
    '<button class="btn" data-page="diagnostico">Volver al AS-IS</button>')+
    '<div class="notice warn">Confirma el cierre del AS-IS antes de diseñar el proceso futuro.</div>';
  if(!currentDiagnosticOutput(e))return pageTop('TO-BE preliminar',
    'Vista de orientación para preparar el diseño futuro; todavía no es un proceso propuesto ni una recomendación aprobada.',
    '<button class="btn btn-primary" data-page="resultados">Volver a revisión del AS-IS</button>')+
    section('Para qué sirve esta vista','Antes de diseñar, revisa el alcance de la transformación y las necesidades detectadas.',
      '<div class="notice info"><b>Qué puedes hacer ahora</b><p>Consultar problemas vinculados al AS-IS y vías de intervención pendientes de validar; no son pasos futuros aprobados.</p>'+
      '<p><b>Qué falta para diseñar:</b> revisar y confirmar las cinco decisiones técnicas internas desde PG10 y obtener la recomendación oficial vigente del backend.</p>'+
      '<p><b>Qué no sucede aquí:</b> no se modifican datos del AS-IS, no se crea ni aprueba un TO-BE y no se calculan ahorros o precios futuros.</p></div>')+
    section('Problemas de origen','Referencias AS-IS para orientar el diseño. No se editan aquí.',asisPointCardsHtml(asisAnalysisSource(e)))+
    section('Vías de intervención pendientes de validar','Opciones de análisis, no alternativas seleccionadas.',asisDirectionCardsHtml(e))+
    '<div class="notice warn">La edición y aprobación de un TO-BE definitivo requiere la recomendación oficial vigente. Regresa a PG10 para revisar las decisiones técnicas y comprobar requisitos.</div>';const p=latestTobe(e);
  if(!p)return pageTop('Diseño TO-BE','El proceso futuro parte del AS-IS confirmado.',
    '<button class="btn btn-primary" id="createTobeDraft">Crear borrador desde AS-IS confirmado</button>')+
    section('Fuente confirmada','El diseño comienza como propuesta sin aprobar.',
      '<div class="notice info">AS-IS confirmado v'+esc(snap.version)+
      '. El diagnóstico oficial se reutiliza; no se vuelve a capturar.</div>');
  const editable=tobeEditable(p),statusLabel={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'}[p.status]||p.status;
  const previousAudit=typeof document!=='undefined'?document.getElementById('tobeAiWorkspace'):null,
    keepAuditOpen=!!previousAudit?.open&&
      previousAudit.dataset?.engagementId===String(e.id)&&
      previousAudit.dataset?.tobeVersion===String(p.version);
  const actions='<button class="btn" data-page="resultados">Volver al diagnóstico</button>'+
    (['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status)?'<button class="btn" data-page="comparacion">Ir a comparación PG12</button>':'')+
    (editable?'<button class="btn" id="saveTobe">Guardar borrador</button>':'')+
    (editable?'<button class="btn btn-primary" id="advanceTobe">Marcar como revisado</button>':
      p.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceTobe">Aprobar para cliente</button>':'')+
    (!editable&&p.status!=='PUBLISHED'?'<button class="btn" id="newTobeVersion">Crear nueva versión</button>':'');
  const review=tobeHumanReviewRecord(e,p),activityItems=[...(p.items||[]),...tobeAddedSteps(p)],
    reviewed=activityItems.filter(it=>tobeActivityDecisionRecorded(e,p,it)).length;
  const savedAi=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null,
    pendingAi=!savedAi&&typeof internalAiPendingSteps==='function'&&
      typeof internalAiPilotKey==='function'?internalAiPendingSteps(e,internalAiPilotKey(e)):null,
    pastAi=!savedAi&&!pendingAi?.items?.size&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null,
    activeItem=tobeSelectedItem(e,p),
    itemId=String(activeItem?.sourceStepId||''),
    itemAi=savedAi?.items?.find(x=>String(x.source_step_id)===itemId)||
      pendingAi?.items?.get(itemId)||pastAi?.proposal?.items?.find(x=>String(x.source_step_id)===itemId),
    proposedCount=itemAi?TOBE_AI_REVIEW_FIELDS.filter(([source])=>{
      const v=String(itemAi[source]??'').trim();
      return !!v&&!['no','n/a','ninguno','sin definir','pendiente','—'].includes(v.toLowerCase());
    }).length:0,
    pendingSteps=pendingAi?.items?.size?p.items.filter(step=>
      !pendingAi.items.has(String(step.sourceStepId))):[],
    pendingStepNames=pendingSteps.map(step=>step.sourceStepName||step.stepName||String(step.sourceStepId)),
    aiSummaryTitle=savedAi?'Propuesta IA vigente':
      pendingAi?.items?.size?'IA generada en '+(p.items.length-pendingSteps.length)+' de '+p.items.length+' pasos'+
      (pendingSteps.length?' · '+pendingSteps.length+(pendingSteps.length===1?' pendiente':' pendientes'):''):
      pastAi?'Propuesta IA histórica · v'+pastAi.version:'Sin propuesta IA vigente',
    aiSummaryDescription=savedAi?
      'Esta actividad contiene '+proposedCount+' campos sugeridos de 9. Contrasta cada valor y confirma únicamente los cambios útiles en 03.3.':
      pendingAi?.items?.size?'En esta actividad: '+proposedCount+' de 9 campos con valor propuesto.'+
      (pendingStepNames.length?' '+(pendingStepNames.length===1?'Paso pendiente de analizar: ':'Pasos pendientes de analizar: ')+pendingStepNames.join(' · ')+'.':''):
      pastAi?'La IA anterior propone '+proposedCount+' de 9 campos para esta actividad; son de consulta, no aplicables en v'+p.version+'.':
      'Analiza la actividad para obtener valores IA concretos sin modificar el AS-IS.';
  return pageTop('Diseño TO-BE','Versión '+p.version+' · '+statusLabel+
    ' · Origen AS-IS v'+esc(p.sourceSnapshotVersion)+'. Las decisiones pertenecen al consultor.',actions)+
    '<main class="tobe-workspace" data-tobe-version="'+p.version+
    '" data-tobe-mode="'+attr(__auneaTobeMode)+'">'+
      '<section class="tobe-task-guide" aria-label="Qué hacer en Diseño TO-BE">'+
        '<div class="tobe-task-guide-intro"><div><h2>Diseñar el proceso futuro</h2>'+
          '<p>Revisa las oportunidades y configura cada actividad. Las reglas y la IA proponen; '+
          'el consultor decide qué entra en el TO-BE. El AS-IS no se modifica.</p></div>'+
          '<span class="tobe-task-guide-progress">'+reviewed+' de '+activityItems.length+' actividades configuradas</span></div>'+
        '<div class="tobe-ia-guide-summary" role="status"><strong>'+esc(aiSummaryTitle)+'</strong>'+
          '<p>'+esc(aiSummaryDescription)+'</p></div>'+
        '<div class="tobe-task-guide-steps">'+
          '<span><b>03.1 · Entender el AS-IS</b></span>'+ 
          '<span><b>03.2 · Revisar oportunidades de mejora</b></span>'+ 
          '<span><b>03.3 · Configurar la actividad futura</b></span></div>'+ 
        '<p class="tobe-task-guide-result">Revisa las rutas en «Mapa TO-BE». Después guarda, comprueba requisitos y marca el diseño como revisado para abrir PG12.</p>'+
      '</section>'+
      tobeContextOverviewHtml(e,p)+
      tobeGlobalOverviewHtml(e,p)+
      '<header class="tobe-review-section-head aunea-ui-work-surface"><span class="tobe-eyebrow">03 · DISEÑO TO-BE</span>'+ 
        '<h2 class="aunea-ui-section-title">Revisión por actividad</h2>'+ 
        '<p class="aunea-ui-section-caption">Revisa el origen, la recomendación IA, los campos y las conexiones del proceso futuro.</p></header>'+
      tobeGuidedNavHtml(e,p)+
      '<section class="tobe-map-area"><header class="tobe-workspace-head"><div><span class="tobe-eyebrow">CONSTRUIR EL PROCESO FUTURO</span>'+
      '<h2>Mapa del proceso propuesto</h2></div><p>Selecciona una actividad para revisar su transformación y editar el TO-BE.</p></header>'+
      (editable?'<div class="tobe-flow-actions"><button type="button" class="btn btn-outline" id="addTobeStep">Añadir actividad vinculada al AS-IS</button>'+
        
        '<span class="tobe-muted">Selecciona una tarjeta para revisarla y arrástrala para moverla. Para conectar, pulsa «Conectar» o «Ruta NO» y selecciona el destino. «Retirar» sólo cambia el TO-BE.</span>'+
        '<span id="tobeFlowModeStatus" role="status" aria-live="polite"></span></div>':'')+
      tobeCanvasHtml(e,p)+
      '<div class="tobe-flow-start field"><label>Inicio del proceso futuro</label>'+
        (editable?auneaSelectControl('tobeFlowStart',tobeFutureSteps(e,p).map(x=>({value:String(x.id),label:x.step_name})),
          tobeFlowOwner(e,p).startStepId,{extra:'data-tobe-flow-start="1"',placeholder:'Selecciona actividad inicial'}):
          '<input disabled value="'+attr(tobeFutureSteps(e,p).find(x=>String(x.id)===tobeFlowOwner(e,p).startStepId)?.step_name||'Pendiente')+'">')+
      '<p class="field-help">Indica la actividad de inicio del TO-BE. El AS-IS no se modifica.</p></div>'+
      '<p class="tobe-map-note"><b>Rutas del TO-BE:</b> comienzan como copia del AS-IS confirmado, pero pueden rediseñarse en el inspector. Los pasos incorporados o eliminados sólo pertenecen a la versión TO-BE. Una ruta pendiente, desconectada o sin final bloquea la revisión.</p></section>'+
      '<section id="tobeInspector" class="tobe-inspector" aria-label="Decisión TO-BE por actividad">'+tobeInspectorHtml(e,p)+'</section>'+
      (editable?'<details class="tobe-ai-stage" id="tobeAiWorkspace" data-engagement-id="'+attr(e.id)+
        '" data-tobe-version="'+attr(p.version)+'"'+(keepAuditOpen?' open':'')+'>'+
        '<summary><strong class="aunea-ui-aux-heading">Auditoría IA · Detalle técnico (opcional)</strong>'+
        '<span class="tobe-muted">Opcional: consulta el detalle completo. Revisa cada propuesta desde el inspector de su actividad.</span></summary>'+
        '<div id="tobeAiMount"></div></details>':'')+
      '<section class="tobe-completion"><div><h2 class="aunea-ui-section-title">04 · Validación global</h2><p class="aunea-ui-section-caption">Vista rápida del estado y acciones pendientes. El detalle técnico sigue disponible.</p></div>'+
        '<button type="button" class="btn btn-outline" id="checkTobeReadiness">Comprobar requisitos</button>'+
        '<div id="tobeReadinessStatus" role="status" aria-live="polite"></div>'+
        tobeCoherencePanel(e,p)+'</section>'+
      '</main>';
}
// [AUNEA-FE-PG11-WORKSPACE-205] END