// [AUNEA-FE-DIAG-CONTROL-030] START — Captura Diagnostic Master v1
// PURPOSE: Captura Diagnostic Master v1.
// SOURCE: v1.0.4 aceptada, SHA256 a9fb7400b000d6289224610c88d4b7dc51f75f8ae97e20e4c3873a3a8e01d6e7; Diagnostic Master v1; DEC-034/038/040.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
function fieldOptions(setId){return schema?.option_sets?.[setId]?.options||[]}
function questionVisible(f,e){
  if(['CAPTURE_IN_PROCESS_STEP','CONDITIONAL_IN_STEP'].includes(f.Ask_Mode))return false;
  if(['CAPTURE_IN_FRICTION','CONDITIONAL_IN_FRICTION'].includes(f.Ask_Mode))return false;
  if(f.Ask_Mode==='CAPTURE_IN_RISK')return false;
  if(f.Stage_ID==='S06'&&['DF068','DF069','DF070','DF071','DF072'].includes(f.Field_ID))return false;
  if(f.Stage_ID==='S07'&&['DF076','DF077','DF082','DF083','DF084'].includes(f.Field_ID))return false;
  return true;
}
function derivedValue(fid,e){
  const activeSteps=e.processSteps.filter(x=>x.status!=='SUPERSEDED'),fr=e.frictions.filter(x=>x.status!=='SUPERSEDED');
  if(fid==='DF017')return [...new Set(activeSteps.map(x=>x.actor).filter(Boolean))].map(v=>labelFrom('OS_ACTOR_ROLE',v)).join(', ');
  if(fid==='DF046')return [...new Set(activeSteps.map(x=>x.tool).filter(Boolean))].map(v=>labelFrom('OS_TOOL_CATEGORY',v)).join(', ');
  if(fid==='DF047'||fid==='DF049')return [...new Set(activeSteps.flatMap(x=>[...normalizeArray(x.inputs),...normalizeArray(x.outputs)]).filter(Boolean))].map(v=>labelFrom('OS_ARTIFACT_TYPE',v)).join(', ');
  if(fid==='DF066')return activeSteps.filter(x=>x.exception_path).map(x=>`${x.step_name}: ${x.exception_path}`).join(' · ');
  if(fid==='DF067')return activeSteps.filter(x=>x.step_type==='ST05'||normalizeArray(x.decision_criteria).length).map(x=>x.step_name).join(', ');
  if(fid==='DF078')return activeSteps.reduce((s,x)=>s+(Number(x.active_time)||0)*(Number(x.occurrences_per_case)||1),0)?`${activeSteps.reduce((s,x)=>s+(Number(x.active_time)||0)*(Number(x.occurrences_per_case)||1),0)} min/caso`:'Pendiente';
  if(fid==='DF079')return activeSteps.reduce((s,x)=>s+(Number(x.rework_time)||0),0)?`${activeSteps.reduce((s,x)=>s+(Number(x.rework_time)||0),0)} min/caso (base capturada)`:'Pendiente';
  if(fid==='DF085')return e.economicInputs.length?`${e.economicInputs.length} input(s) económico(s) con evidencia etiquetada`:'Sin inputs económicos materiales';
  if(fid==='DF093')return e.confirmedAsIs?'Sí — flujo AS-IS confirmado':'Pendiente de confirmar en Proceso y fricciones';
  if(fid==='DF094')return missingRequired(e).join(', ')||'Sin gaps requeridos detectados en la captura actual';
  if(fid==='DF095')return fr.filter(x=>!x.evidence_type||x.evidence_type!=='EV01').map(x=>`Evidencia de ${labelFrom('OS_FRICTION_TYPE',x.friction_type)}`).join(' · ')||'Sin solicitudes automáticas adicionales';
  if(fid==='DF057')return 'Se deriva de cada fricción registrada; no se pregunta al cliente.';
  return e.answers[fid]??'';
}
function missingRequired(e){
  const misses=[];schema.fields.filter(f=>f.Requiredness==='REQUIRED_90M'&&questionVisible(f,e)).forEach(f=>{const v=derivedValue(f.Field_ID,e);if(v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length))misses.push(f.Field_ID)});
  if(!e.processSteps.filter(x=>x.status!=='SUPERSEDED').length)misses.push('Mapa AS-IS');
  if(!e.confirmedAsIs)misses.push('Confirmación AS-IS');
  return [...new Set(misses)]
}
function renderQuestion(f,e){
  const val=derivedValue(f.Field_ID,e),opts=fieldOptions(f.Option_Set_ID),required=f.Requiredness==='REQUIRED_90M';
  const derived=['DERIVED','SYSTEM_GENERATED','DERIVE_AND_CONFIRM'].includes(f.Ask_Mode)||String(f.Control_UI).includes('DERIVED')||String(f.Control_UI).includes('SYSTEM_GENERATED');
  const meta=`<span class="canonical-id">${f.Field_ID}</span>${required?'<span class="required-dot" title="Obligatoria"></span>':''}${f.Requiredness==='CONDITIONAL_90M'?'<span class="conditional-tag">condicional</span>':''}`;
  return `<div class="question-card"><div class="question-head"><div><div class="question-title">${esc(f.Pregunta_o_etiqueta_ES)}</div><div class="question-purpose">${esc(f.Objetivo_concreto||'')}</div></div><div class="question-meta">${meta}</div></div><div class="question-body">${derived?`<div class="readonly-box">${esc(val||'Se completará automáticamente cuando existan datos suficientes.')}</div>`:renderControl(f,val,opts,e)}</div>${f.Reuse_From?`<div class="reuse-note"><b>No se repregunta:</b> reutiliza ${esc(f.Reuse_From)}. Sólo vuelve a validarse si cambia el dato o existe una contradicción.</div>`:''}<div class="field-help"><b>Ejemplo:</b> ${esc(f.Ejemplo_ES||'—')} · <b>Validación:</b> ${esc(f.Validation||'—')}</div></div>`
}
function renderControl(f,val,opts,e){
  const c=String(f.Control_UI||'').toUpperCase(),fid=f.Field_ID;
  if(c.includes('CONTACT')){
    const contacts=state.contacts.filter(x=>x.companyId===e.companyId);if(c.includes('MULTI'))return checkboxChoices(fid,contacts.map(x=>({value:x.id,label:`${x.name}${x.role?' · '+x.role:''}`})),normalizeArray(val));
    return `<select data-answer="${fid}"><option value="">Selecciona…</option>${contacts.map(x=>`<option value="${x.id}" ${String(val)===x.id?'selected':''}>${esc(x.name)}${x.role?' · '+esc(x.role):''}</option>`).join('')}</select>`
  }
  if(c==='CRM_REFERENCE_OR_TEXT'){
    return `<select data-answer="${fid}">${state.companies.map(x=>`<option value="${attr(x.name)}" ${String(val)===x.name?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`
  }
  if(c.includes('MULTI')||c.includes('CHECK'))return checkboxChoices(fid,opts,val);
  if(c.includes('SEGMENTED')||c.includes('BOOLEAN')){
    const o=opts.length?opts:[{value:'YES',label:'Sí'},{value:'NO',label:'No'},{value:'UNKNOWN',label:'No sabe'}];return `<div class="segmented">${o.map(x=>`<button type="button" class="segment ${String(val)===String(x.value)?'active':''}" data-segment="${fid}" data-value="${attr(x.value)}">${esc(x.label)}</button>`).join('')}</div>`
  }
  if(c.includes('DROPDOWN')||c.includes('SELECT')||c.includes('COMBOBOX')){
    if(opts.length)return `<select data-answer="${fid}"><option value="">Selecciona…</option>${opts.map(x=>`<option value="${attr(x.value)}" ${String(val)===String(x.value)?'selected':''}>${esc(x.label)}</option>`).join('')}</select>`;
    return `<input data-answer="${fid}" value="${attr(val||'')}" placeholder="Selecciona o escribe una referencia">`
  }
  if(c.includes('DATE'))return `<input type="date" data-answer="${fid}" value="${attr(val||'')}">`;
  if(c.includes('NUMBER')||c.includes('PERCENT')||c.includes('MONETARY'))return `<input type="text" inputmode="decimal" data-answer="${fid}" value="${attr(val||'')}" placeholder="Introduce valor y unidad cuando aplique">`;
  if(c.includes('TEXT_LONG')||c.includes('LONG_TEXT'))return `<textarea data-answer="${fid}" placeholder="Respuesta breve y concreta">${esc(val||'')}</textarea>`;
  if(c.includes('CLIENT_CONFIRMATION'))return `<div class="notice ${e.confirmedAsIs?'good':'warn'}">${e.confirmedAsIs?'El flujo AS-IS está confirmado.':'Confirma el flujo desde la página Proceso y fricciones.'} <button class="btn btn-small" data-page="proceso">Abrir revisión</button></div>`;
  return `<input data-answer="${fid}" value="${attr(val||'')}" placeholder="Respuesta">`
}
function checkboxChoices(fid,items,val){const arr=normalizeArray(val);return `<div class="choice-grid">${items.map(x=>`<div class="choice"><input type="checkbox" id="${fid}_${attr(x.value)}" value="${attr(x.value)}" data-multi="${fid}" ${arr.map(String).includes(String(x.value))?'checked':''}><label for="${fid}_${attr(x.value)}">${esc(x.label)}</label></div>`).join('')}</div>`}

function stagePage(){
  const e=currentEng(),stage=schema.flow.find(x=>x.Stage_ID===(e.stageId||'S01'))||schema.flow[0],fields=schema.fields.filter(f=>f.Stage_ID===stage.Stage_ID&&questionVisible(f,e));
  const answered=schema.fields.filter(f=>{const v=derivedValue(f.Field_ID,e);return !(v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length))}).length;
  const pct=Math.round(answered/schema.fields.length*100);
  const stageIndex=schema.flow.findIndex(x=>x.Stage_ID===stage.Stage_ID);
  return pageTop('Diagnóstico guiado','Cuestionario canónico en español, generado desde Diagnostic Master v1. Una información se captura una vez y se reutiliza después.',`<button class="btn" data-page="proceso">Ver mapa AS-IS</button><button class="btn btn-primary" id="runDiag">Recalcular</button>`) +
  `<div class="stage-layout"><aside class="card stage-nav">${schema.flow.map((s,i)=>`<button class="stage-btn ${s.Stage_ID===stage.Stage_ID?'active':''}" data-stage="${s.Stage_ID}"><span class="stage-num">${i+1}</span><span><b>${esc(s.Stage_ES)}</b><small>${esc(s.Objetivo)}</small></span><span class="stage-time">${s.Minutos_objetivo}m</span></button>`).join('')}</aside><div><div class="card stage-card"><div class="section-title"><div><h2>${stageIndex+1}. ${esc(stage.Stage_ES)}</h2><p>${esc(stage.Objetivo)}</p></div><div class="chip gold">${stage.Minutos_objetivo} min objetivo</div></div><div class="stage-meta"><span class="chip">Salida: ${esc(stage.Salida)}</span><span class="chip">Criterio: ${esc(stage.Criterio_de_salida)}</span></div><div class="notice"><strong>Hilo conductor:</strong> ${esc(stage.Interacción_principal)}. ${esc(stage.Regla_de_tiempo)}</div><div style="margin-top:12px">${fields.map(f=>renderQuestion(f,e)).join('')}</div>${stage.Stage_ID==='S04'?processPrompt(e):''}${stage.Stage_ID==='S05'?frictionPrompt(e):''}${stage.Stage_ID==='S06'?riskBuilder(e):''}${stage.Stage_ID==='S07'?economicBuilder(e):''}<div class="stage-footer"><button class="btn" id="prevStage" ${stageIndex===0?'disabled':''}>← Anterior</button><div style="min-width:200px"><div class="progress"><span style="width:${pct}%"></span></div><div class="field-help">${answered}/100 campos con dato o derivación disponible</div></div><button class="btn btn-primary" id="nextStage" ${stageIndex===schema.flow.length-1?'disabled':''}>Siguiente →</button></div></div></div></div>`
}
function processPrompt(e){return `<div class="notice info"><strong>Mapa AS-IS:</strong> los campos DF031–DF055 se capturan principalmente en el editor visual. Actualmente hay <b>${e.processSteps.filter(x=>x.status!=='SUPERSEDED').length}</b> pasos. <button class="btn btn-small" data-page="proceso">Abrir editor</button></div>`}
function frictionPrompt(e){return `<div class="notice info"><strong>Fricciones:</strong> DF056–DF065 se capturan vinculando cada fricción a uno o varios pasos. Actualmente hay <b>${e.frictions.filter(x=>x.status!=='SUPERSEDED').length}</b> fricciones. <button class="btn btn-small" data-page="proceso">Abrir fricciones</button></div>`}
// [AUNEA-FE-DIAG-CONTROL-030] END
