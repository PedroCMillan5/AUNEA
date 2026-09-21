// [AUNEA-FE-PROC-EDITOR-020] START — Process Step + Friction canonical editor v1.1
// PURPOSE: Build/review the AS-IS with the 20 canonical Process Step attributes and anchored Friction records.
// SOURCE: Diagnostic Master v1.1 00_PROCESS_STEP_MODEL_V1 / 00_FRICTION_MODEL_V1 / MAP_FRICTION_PAIN_V1; REQ-PROC-001/002; REQ-FRIC-001/002; DEC-040.
// INPUTS: canonical schema option sets, engagement Process Steps/Frictions and user edits.
// OUTPUTS: RT_PROCESS_STEP-compatible local records and RT_FRICTION-compatible local records; Pain_ID remains derived.
// SIDE_EFFECTS: engagement state, AS-IS confirmation invalidation, audit trail.
// CHANGE_RISK: HIGH.

function minutesFrom(value,unit='min'){
  const n=Number(value||0);if(!Number.isFinite(n)||n<0)return 0;
  return n*({min:1,h:60,day:1440,week:10080}[unit]||1);
}
function displayDuration(minutes,unit='min'){
  const n=Number(minutes||0),d={min:1,h:60,day:1440,week:10080}[unit]||1;return d?+(n/d).toFixed(2):n;
}
function stepMeta(s){s._ui=s._ui||{};s._details=s._details||{};return s}
function frictionMeta(f){f._ui=f._ui||{};f._details=f._details||{};return f}
function painForFriction(type){return schema.friction_pain_map.find(x=>String(x.Friction_Type_ID)===String(type))?.Pain_ID||null}
function selectedHtml(id,opts,selected){const arr=normalizeArray(selected).map(String);return `<div class="choice-grid">${opts.map(o=>`<div class="choice"><input type="checkbox" id="${id}_${attr(o.value)}" value="${attr(o.value)}" data-v1-multi="${id}" ${arr.includes(String(o.value))?'checked':''}><label for="${id}_${attr(o.value)}">${esc(o.label)}</label></div>`).join('')}</div>`}
function catalogOtherOption(opts){return (opts||[]).find(o=>String(o.value).toUpperCase()==='OTHER'||['otro','otra'].includes(String(o.label||'').trim().toLowerCase()))||null}
function datalistControl(id,setId,value,placeholder){const opts=fieldOptions(setId),match=opts.find(o=>String(o.value)===String(value)),other=catalogOtherOption(opts),isCustom=!!value&&!match;return `<div class="catalog-reference-control"><select id="${id}" data-model-set="${attr(setId||'')}" data-catalog-reference="${id}" data-other-target="${id}_other"><option value="">${attr(placeholder||'Selecciona…')}</option>${opts.map(o=>`<option value="${attr(o.value)}" ${String(value)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}${other?'':`<option value="__OTHER__" ${isCustom?'selected':''}>Otro / nuevo…</option>`}</select><div class="detail-wrap" data-catalog-other-wrap="${id}"${isCustom?'':' style="display:none"'}><input id="${id}_other" value="${attr(isCustom?value:'')}" placeholder="Especifica el valor"></div></div>`}
function resolveCatalogInput(el){if(!el)return '';const opts=fieldOptions(el.dataset.modelSet),raw=String(el.value||'');if(raw==='__OTHER__')return document.getElementById(`${el.id}_other`)?.value.trim()||'';const m=opts.find(o=>String(o.value)===raw);return m?.value||raw}
function timeControl(id,minutes,unit='min',allowSpecial=false){return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(displayDuration(minutes,unit))}" placeholder="0"><select id="${id}_unit"><option value="min" ${unit==='min'?'selected':''}>min</option><option value="h" ${unit==='h'?'selected':''}>h</option><option value="day" ${unit==='day'?'selected':''}>días</option><option value="week" ${unit==='week'?'selected':''}>semanas</option></select>${allowSpecial?`<select id="${id}_mode"><option value="">Dato disponible</option><option value="UNKNOWN">No disponible</option><option value="ZERO">Cero</option></select>`:''}</div>`}
function appliesControl(s){const a=s.applies_to&&typeof s.applies_to==='object'?s.applies_to:{mode:s.applies_to||'ALL',value:'',condition:''};return `<div class="compound-control"><select id="step_applies_mode"><option value="ALL" ${a.mode==='ALL'?'selected':''}>Todos los casos</option><option value="PERCENT" ${a.mode==='PERCENT'?'selected':''}>Porcentaje de casos</option><option value="CONDITION" ${a.mode==='CONDITION'?'selected':''}>Sólo si se cumple una condición</option></select><input id="step_applies_value" value="${attr(a.value||a.condition||'')}" placeholder="100% / condición breve"></div>`}
function exceptionControl(s,e){const x=s.exception_path&&typeof s.exception_path==='object'?s.exception_path:{};const types=fieldOptions('OS_EXCEPTION_TYPE');return `<div class="form-grid nested"><div class="field"><label>Tipo</label><select id="step_exc_type"><option value="">Sin excepción</option>${types.map(o=>`<option value="${attr(o.value)}" ${String(x.type)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div><div class="field"><label>Condición</label><input id="step_exc_condition" value="${attr(x.condition||'')}" placeholder="Cuándo ocurre"></div><div class="field"><label>Destino</label><select id="step_exc_dest"><option value="">Fin / por definir</option>${activeSteps(e).filter(z=>z.id!==s.id).map(z=>`<option value="${z.id}" ${x.destination_step===z.id?'selected':''}>${esc(z.step_name||z.id)}</option>`).join('')}</select></div><div class="field"><label>Owner</label>${datalistControl('step_exc_owner','OS_ACTOR_ROLE',x.owner||'','Rol responsable')}</div></div>`}

function openStepModal(stepId=null,linkFromStepId=null){
  const e=currentEng(),existing=stepId?e.processSteps.find(x=>x.id===stepId):null;
  const s=stepMeta(existing?structuredClone(existing):{id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0});
  const stepTypes=fieldOptions('OS_STEP_TYPE'),artifacts=fieldOptions('OS_ARTIFACT_TYPE'),decisions=fieldOptions('OS_DECISION_CRITERIA'),manual=fieldOptions('OS_MANUAL_ACTION'),auto=fieldOptions('OS_AUTOMATION_STATE'),channels=fieldOptions('OS_COMM_CHANNEL'),evid=fieldOptions('OS_EVIDENCE_TYPE');
  const decisionOther=catalogOtherOption(decisions),decisionOtherOpen=!!decisionOther&&normalizeArray(s.decision_criteria).map(String).includes(String(decisionOther.value));
  // Progressive disclosure over the same 20 canonical Process Step attributes — no schema change, just
  // grouped presentation. Group A (info básica) starts open; the rest collapse behind <summary> so the
  // editor reads as "3 essentials, then detail on demand" instead of one 20-field wall of inputs. The
  // step list row (processPage) already shows a readable per-step summary outside this modal.
  const body=`<div class="step-groups">
  <details class="step-group" open><summary>A. Información básica</summary><div class="form-grid">
    <div class="field full"><label>Nombre del paso ${requiredMark()}</label><input id="step_name" maxlength="80" value="${attr(s.step_name||'')}" placeholder="Verbo + objeto, ej. Validar requisitos"></div>
    <div class="field"><label>Tipo de paso ${requiredMark()}</label><select id="step_type"><option value="">Selecciona…</option>${stepTypes.map(o=>`<option value="${attr(o.value)}" ${String(s.step_type)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>
    <div class="field"><label>Responsable / actor ${requiredMark()}</label>${datalistControl('step_actor','OS_ACTOR_ROLE',s.actor||'','Rol existente o nuevo')}</div>
  </div></details>
  <details class="step-group"><summary>B. Entradas y salidas</summary><div class="form-grid">
    <div class="field full"><label>¿A qué casos aplica?</label>${appliesControl(s)}</div>
    <div class="field"><label>Veces por caso</label><input id="step_occ" type="number" min="0" step="any" value="${attr(s.occurrences_per_case??1)}"></div>
    <div class="field full"><label>Inputs</label>${selectedHtml('step_inputs',artifacts,s.inputs)}<input id="step_inputs_detail" value="${attr(s._details.inputs||'')}" placeholder="Detalle sólo si el catálogo no basta"></div>
    <div class="field full"><label>Outputs</label>${selectedHtml('step_outputs',artifacts,s.outputs)}<input id="step_outputs_detail" value="${attr(s._details.outputs||'')}" placeholder="Detalle sólo si el catálogo no basta"></div>
  </div></details>
  <details class="step-group"><summary>C. Tiempo y rendimiento</summary><div class="form-grid">
    <div class="field"><label>Tiempo activo típico</label>${timeControl('step_active',s.active_time,s._ui.active_unit||'min')}</div>
    <div class="field"><label>Tiempo de espera</label>${timeControl('step_wait',s.wait_time,s._ui.wait_unit||'min')}<div class="field-help">Tiempo en el que el caso está parado o esperando antes de poder continuar. Se mantiene separado del trabajo activo y no se monetiza como trabajo.</div></div>
    <div class="field"><label>Tiempo de retrabajo</label>${timeControl('step_rework',s.rework_time,s._ui.rework_unit||'min')}</div>
    <div class="field"><label>Error / repetición</label><div class="compound-control"><input id="step_error" type="number" min="0" step="any" value="${attr(s.error_rate&&typeof s.error_rate==='object'?s.error_rate.value:(s.error_rate||''))}" placeholder="5"><select id="step_error_mode"><option value="percent" ${(s.error_rate?.mode||'percent')==='percent'?'selected':''}>%</option><option value="count" ${s.error_rate?.mode==='count'?'selected':''}>casos</option></select><select id="step_error_period"><option value="case">por caso</option><option value="month" ${s.error_rate?.period==='month'?'selected':''}>por mes</option><option value="year" ${s.error_rate?.period==='year'?'selected':''}>por año</option></select></div></div>
  </div></details>
  <details class="step-group"><summary>D. Decisiones y routing</summary><div class="form-grid">
    <div class="field full"><label>Criterios de decisión</label>${selectedHtml('step_decisions',decisions,s.decision_criteria)}<div class="detail-wrap" data-step-decision-other-wrap${decisionOtherOpen?'':' style="display:none"'}><input id="step_decisions_detail" value="${attr(decisionOtherOpen?(s._details.decision_criteria||''):'')}" placeholder="Especifica el criterio sólo al seleccionar Otro"></div></div>
    <div class="field full"><label>Siguiente paso normal</label><select id="step_next"><option value="">Fin / por definir</option><option value="__NEW__">+ Crear nuevo paso como siguiente</option>${activeSteps(e).filter(x=>x.id!==s.id).map(x=>`<option value="${x.id}" ${s.normal_next_step===x.id?'selected':''}>${esc(x.step_name||x.id)}</option>`).join('')}</select></div>
    <div class="field full"><label>Ruta de excepción</label>${exceptionControl(s,e)}</div>
  </div></details>
  <details class="step-group"><summary>E. Automatización y sistemas</summary><div class="form-grid">
    <div class="field"><label>Herramienta / sistema</label>${datalistControl('step_tool','OS_TOOL_CATEGORY',s.tool||'','Herramienta principal')}</div>
    <div class="field full"><label>Acciones manuales</label>${selectedHtml('step_manual',manual,s.manual_actions)}</div>
    <div class="field full"><label>Automatización actual</label>${segmented('step_auto',auto,s.automation_state,'data-step-auto')}</div>
    <div class="field full"><label>Canal(es) de comunicación</label>${selectedHtml('step_channels',channels,s.communication_channels)}<input id="step_channels_other" value="${attr(s._details.communication_channels||'')}" placeholder="Otro canal sólo si no existe en el catálogo"></div>
  </div></details>
  <details class="step-group"><summary>F. Evidencia y notas</summary><div class="form-grid">
    <div class="field full"><label>Evidencia del paso</label>${selectedHtml('step_evidence',evid,s.evidence)}</div>
    <div class="field full"><label>Nota breve excepcional</label><input id="step_notes" maxlength="200" value="${attr(s.notes||'')}" placeholder="Sólo si los campos estructurados no bastan"></div>
  </div></details>
  </div>`;
  openModal(existing?'Editar paso':'Añadir paso',body,()=>{
    s.step_name=document.getElementById('step_name').value.trim();s.step_type=document.getElementById('step_type').value;s.actor=resolveCatalogInput(document.getElementById('step_actor'));s.tool=resolveCatalogInput(document.getElementById('step_tool'));s.occurrences_per_case=Math.max(0,Number(document.getElementById('step_occ').value||1));
    const am=document.getElementById('step_applies_mode').value,av=document.getElementById('step_applies_value').value.trim();s.applies_to={mode:am,value:am==='PERCENT'?av:'',condition:am==='CONDITION'?av:''};
    const collect=k=>[...document.querySelectorAll(`[data-v1-multi="${k}"]:checked`)].map(x=>x.value);s.inputs=collect('step_inputs');s.outputs=collect('step_outputs');s.decision_criteria=collect('step_decisions');s.manual_actions=collect('step_manual');s.communication_channels=collect('step_channels');s.evidence=collect('step_evidence');
    s._details.inputs=document.getElementById('step_inputs_detail').value.trim();s._details.outputs=document.getElementById('step_outputs_detail').value.trim();const decisionOtherSelected=decisionOther&&s.decision_criteria.map(String).includes(String(decisionOther.value));s._details.decision_criteria=decisionOtherSelected?document.getElementById('step_decisions_detail').value.trim():'';s._details.communication_channels=document.getElementById('step_channels_other').value.trim();
    s._ui.active_unit=document.getElementById('step_active_unit').value;s._ui.wait_unit=document.getElementById('step_wait_unit').value;s._ui.rework_unit=document.getElementById('step_rework_unit').value;s.active_time=minutesFrom(document.getElementById('step_active').value,s._ui.active_unit);s.wait_time=minutesFrom(document.getElementById('step_wait').value,s._ui.wait_unit);s.rework_time=minutesFrom(document.getElementById('step_rework').value,s._ui.rework_unit);
    s.error_rate={value:Number(document.getElementById('step_error').value||0),mode:document.getElementById('step_error_mode').value,period:document.getElementById('step_error_period').value};
    const nextVal=document.getElementById('step_next').value;s.normal_next_step=nextVal==='__NEW__'?'':nextVal;
    const et=document.getElementById('step_exc_type').value,ec=document.getElementById('step_exc_condition').value.trim(),ed=document.getElementById('step_exc_dest').value,eo=resolveCatalogInput(document.getElementById('step_exc_owner'));s.exception_path=(et||ec||ed||eo)?{type:et,condition:ec,destination_step:ed,owner:eo}:null;s.notes=document.getElementById('step_notes').value.trim();
    if(!s.step_name||s.step_name.length<3||!s.step_type||!s.actor)return toast('Nombre (mín. 3 caracteres), tipo y responsable son obligatorios.');
    if(existing){Object.assign(existing,s);audit(`Paso editado ${existing.id}`)}else{e.processSteps.push(s);audit(`Paso creado ${s.id}`);if(linkFromStepId){const origin=e.processSteps.find(x=>x.id===linkFromStepId);if(origin)origin.normal_next_step=s.id}}if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');e.confirmedAsIs=false;e.answers.DF093='';e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();
    if(nextVal==='__NEW__'){render();openStepModal(null,s.id)}else{render()}
  },existing?'Guardar cambios':'Añadir paso');
  document.querySelectorAll('[data-step-auto]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-step-auto]').forEach(x=>x.classList.remove('active'));b.classList.add('active');s.automation_state=b.dataset.value});
  document.querySelectorAll('[data-catalog-reference]').forEach(el=>el.addEventListener('change',()=>{const wrap=document.querySelector(`[data-catalog-other-wrap="${el.dataset.catalogReference}"]`);if(wrap)wrap.style.display=el.value==='__OTHER__'?'':'none';if(el.value!=='__OTHER__'){const other=document.getElementById(`${el.id}_other`);if(other)other.value=''}}));
  const decisionOtherBox=decisionOther?document.querySelector(`[data-v1-multi="step_decisions"][value="${CSS.escape(String(decisionOther.value))}"]`):null;
  if(decisionOtherBox)decisionOtherBox.addEventListener('change',()=>{const wrap=document.querySelector('[data-step-decision-other-wrap]');if(wrap)wrap.style.display=decisionOtherBox.checked?'':'none';if(!decisionOtherBox.checked){const input=document.getElementById('step_decisions_detail');if(input)input.value=''}});
}

function frictionNumberControl(id,obj,kind='number'){const p=obj&&typeof obj==='object'?obj:{value:obj||'',unit:'',period:'',mode:''};if(kind==='time')return timeControl(id,p.value||0,p.unit||'min',true);if(kind==='money')return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(p.value||'')}" placeholder="0"><span class="unit-label">€</span><select id="${id}_period"><option value="case">por caso</option><option value="month" ${p.period==='month'?'selected':''}>por mes</option><option value="year" ${p.period==='year'?'selected':''}>por año</option></select><select id="${id}_mode"><option value="">Dato disponible</option><option value="NONE" ${p.mode==='NONE'?'selected':''}>No aplica</option><option value="UNKNOWN" ${p.mode==='UNKNOWN'?'selected':''}>No disponible</option></select></div>`;return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(p.value||'')}" placeholder="0"><select id="${id}_mode"><option value="percent" ${p.mode==='percent'?'selected':''}>%</option><option value="count" ${p.mode==='count'?'selected':''}>casos</option></select><select id="${id}_period"><option value="case">por caso</option><option value="month" ${p.period==='month'?'selected':''}>por mes</option><option value="year" ${p.period==='year'?'selected':''}>por año</option></select></div>`}
function openFrictionModal(frId=null,preselectedSteps=[]){
  const e=currentEng();if(!activeSteps(e).length)return toast('Añade al menos un paso antes de registrar una fricción.');const existing=frId?e.frictions.find(x=>x.id===frId):null;const f=frictionMeta(existing?structuredClone(existing):{id:id('FRI'),status:'ACTIVE',affected_steps:preselectedSteps,friction_type:'',cause:[],non_time_impact:[],workaround:[],evidence_ids:[],evidence_type:'EV02',frequency:{},active_time_loss:{},wait_time_loss:{},direct_loss:{}});
  const types=fieldOptions('OS_FRICTION_TYPE'),causes=fieldOptions('OS_FRICTION_CAUSE'),impacts=fieldOptions('OS_SCALE_1_5'),nonTime=fieldOptions('OS_NON_TIME_IMPACT'),work=fieldOptions('OS_WORKAROUND'),evid=fieldOptions('OS_EVIDENCE_TYPE');
  // Layer 1/2 progressive disclosure: tipo/pasos/señal/contexto-impacto are what a consultant needs to
  // register a friction on the spot; causa/workaround/evidencia/resto stay available but collapsed.
  // Same field ids, same save logic — presentation-only, never a Friction Model change.
  const body=`<div class="step-groups">
  <details class="step-group" open><summary>Fricción</summary><div class="form-grid">
  <div class="field full"><label>Tipo de fricción ${requiredMark()}</label><select id="fr_type"><option value="">Selecciona…</option>${types.map(o=>`<option value="${attr(o.value)}" ${String(f.friction_type)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select><div class="field-help">Pain_ID se deriva internamente; el cliente no lo selecciona.</div></div>
  <div class="field full"><label>Pasos afectados ${requiredMark()}</label>${selectedHtml('fr_steps',activeSteps(e).map(s=>({value:s.id,label:s.step_name||s.id})),f.affected_steps)}</div>
  <div class="field full"><label>Señal observable ${requiredMark()}</label><input id="fr_signal" value="${attr(f.observable_signal||'')}" placeholder="Hecho verificable, ej. casos >48h esperando aprobación"></div>
  <div class="field"><label>Frecuencia</label>${frictionNumberControl('fr_frequency',f.frequency)}</div>
  <div class="field"><label>Impacto percibido</label><select id="fr_impact"><option value="">—</option>${impacts.map(o=>`<option value="${attr(o.value)}" ${String(f.impact)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>
  </div></details>
  <details class="step-group"><summary>Causa, workaround y evidencia</summary><div class="form-grid">
  <div class="field full"><label>Causa / condición ${requiredMark()}</label>${selectedHtml('fr_causes',causes,f.cause)}<div class="choice"><input type="checkbox" id="fr_cause_other_toggle" data-fr-other-toggle="fr_cause_other" ${f._details.cause?'checked':''}><label for="fr_cause_other_toggle">+ Otro</label></div><div class="detail-wrap" data-fr-other-wrap="fr_cause_other"${f._details.cause?'':' style="display:none"'}><input id="fr_cause_other" value="${attr(f._details.cause||'')}" placeholder="Otro sólo si no existe en catálogo"></div></div>
  <div class="field full"><label>Cómo se compensa hoy</label>${selectedHtml('fr_workaround',work,f.workaround)}<div class="choice"><input type="checkbox" id="fr_workaround_other_toggle" data-fr-other-toggle="fr_workaround_other" ${f._details.workaround?'checked':''}><label for="fr_workaround_other_toggle">+ Otro</label></div><div class="detail-wrap" data-fr-other-wrap="fr_workaround_other"${f._details.workaround?'':' style="display:none"'}><input id="fr_workaround_other" value="${attr(f._details.workaround||'')}" placeholder="Otro workaround sólo si no existe en catálogo"></div></div>
  <div class="field"><label>Tipo de evidencia principal <span class="internal-tag">interno</span></label><select id="fr_evidence_type">${evid.map(o=>`<option value="${attr(o.value)}" ${String(f.evidence_type)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>
  <div class="field"><label>Trabajo activo adicional</label>${frictionNumberControl('fr_active',f.active_time_loss,'time')}</div>
  <div class="field"><label>Espera / retraso atribuible</label>${frictionNumberControl('fr_wait',f.wait_time_loss,'time')}</div>
  <div class="field"><label>Pérdida monetaria directa</label>${frictionNumberControl('fr_direct',f.direct_loss,'money')}</div>
  <div class="field full"><label>Otros impactos</label>${selectedHtml('fr_non_time',nonTime,f.non_time_impact)}</div>
  <div class="field"><label>Prioridad cliente (cierre)</label><input id="fr_priority" type="number" min="1" max="99" value="${attr(f.priority_client||'')}" placeholder="1, 2, 3…"></div>
  <div class="field full"><label>Cómo lo describe el cliente</label><input id="fr_label" maxlength="160" value="${attr(f.client_label||'')}" placeholder="Opcional"></div>
  <div class="field full"><label>Nota excepcional</label><input id="fr_notes" maxlength="200" value="${attr(f.notes||'')}" placeholder="Sólo si los campos estructurados no bastan"></div>
  </div></details>
  </div>`;
  openModal(existing?'Editar fricción':'Añadir fricción',body,()=>{const collect=k=>[...document.querySelectorAll(`[data-v1-multi="${k}"]:checked`)].map(x=>x.value);f.friction_type=document.getElementById('fr_type').value;f.affected_steps=collect('fr_steps');f.cause=collect('fr_causes');f._details.cause=document.getElementById('fr_cause_other').value.trim();f.observable_signal=document.getElementById('fr_signal').value.trim();f.frequency={value:Number(document.getElementById('fr_frequency').value||0),mode:document.getElementById('fr_frequency_mode').value,period:document.getElementById('fr_frequency_period').value};f.impact=document.getElementById('fr_impact').value;
    const atUnit=document.getElementById('fr_active_unit').value,wtUnit=document.getElementById('fr_wait_unit').value;f.active_time_loss={value:minutesFrom(document.getElementById('fr_active').value,atUnit),unit:'min',source_unit:atUnit,mode:document.getElementById('fr_active_mode').value};f.wait_time_loss={value:minutesFrom(document.getElementById('fr_wait').value,wtUnit),unit:'min',source_unit:wtUnit,mode:document.getElementById('fr_wait_mode').value};f.direct_loss={value:Number(document.getElementById('fr_direct').value||0),unit:'EUR',period:document.getElementById('fr_direct_period').value,mode:document.getElementById('fr_direct_mode').value};f.non_time_impact=collect('fr_non_time');f.workaround=collect('fr_workaround');f._details.workaround=document.getElementById('fr_workaround_other').value.trim();f.evidence_type=document.getElementById('fr_evidence_type').value||'EV02';f.priority_client=Number(document.getElementById('fr_priority').value||0)||null;f.client_label=document.getElementById('fr_label').value.trim();f.notes=document.getElementById('fr_notes').value.trim();f.derived_pain_id=painForFriction(f.friction_type);
    if(!f.friction_type||!f.affected_steps.length||!f.cause.length&&!f._details.cause||!f.observable_signal)return toast('Tipo, al menos un paso, causa y señal observable son obligatorios.');if(existing){Object.assign(existing,f);audit(`Fricción editada ${existing.id}`)}else{e.frictions.push(f);audit(`Fricción creada ${f.id}`)}if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');e.confirmedAsIs=false;e.answers.DF093='';e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();render();},existing?'Guardar cambios':'Añadir fricción');
}

// "Añadir varios pasos" is a normal-use convenience over the SAME model openStepModal uses for a new
// step (id/status/empty collections) — it never invents step_name/actor/step_type/tool/times/routing/
// frictions/evidence. Each created step is exactly as empty as one added individually, only technical
// id + array position (= visual numbering in the list) exist until the consultant edits it. Distinct
// from the Internal/QA stress-test tool (app-uat-fixtures-v1.js), which is not normal use.
function addMultipleSteps(){
  openModal('Añadir varios pasos',`<div class="form-grid"><div class="field full"><label>Número de pasos ${requiredMark()}</label><input id="bulk_step_count" type="number" min="1" max="50" value="5"><div class="field-help">Crea pasos vacíos, sólo con id técnico y posición. Edítalos individualmente después para darles nombre, tipo, responsable, etc.</div></div></div>`,()=>{
    const e=currentEng(),n=Math.max(1,Math.min(50,Number(document.getElementById('bulk_step_count').value||0)));
    if(!n)return toast('Indica un número de pasos válido (1-50).');
    for(let i=0;i<n;i++)e.processSteps.push({id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0});
    audit(`${n} paso(s) vacío(s) añadidos en bloque`);if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');e.confirmedAsIs=false;e.answers.DF093='';e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();render();
    toast(`${n} paso(s) añadidos. Edita cada uno para completarlo.`);
  },'Crear pasos');
}

function removeStepFromFlow(stepId){
  const e=currentEng(),step=e?.processSteps?.find(x=>x.id===stepId&&x.status!=='SUPERSEDED');if(!step)return;
  const linkedFrictions=activeFrictions(e).filter(f=>normalizeArray(f.affected_steps).includes(stepId));
  const body=`<div class="notice warn"><b>¿Eliminar “${esc(step.step_name||'este paso')}” del flujo?</b><p>Dejará de aparecer en el mapa. La trazabilidad histórica se conservará internamente. Las rutas que apunten a este paso quedarán pendientes de redefinir${linkedFrictions.length?` y ${linkedFrictions.length} fricción(es) perderán este vínculo`:''}.</p></div>`;
  openModal('Eliminar paso del flujo',body,()=>{
    step.status='SUPERSEDED';
    e.processSteps.filter(x=>x.status!=='SUPERSEDED').forEach(x=>{if(x.normal_next_step===stepId)x.normal_next_step='';if(x.exception_path?.destination_step===stepId)x.exception_path={...x.exception_path,destination_step:''}});
    linkedFrictions.forEach(f=>{f.affected_steps=normalizeArray(f.affected_steps).filter(id=>id!==stepId);if(!f.affected_steps.length)f.status='SUPERSEDED'});
    e.confirmedAsIs=false;e.answers.DF093='';e.diagnosticOutput=null;e.updatedAt=now();
    audit(`Paso eliminado del flujo ${stepId}`);markDirty('Paso eliminado del flujo');closeModal();render();
  },'Eliminar del flujo');
}

function moveStep(stepId,direction){
  const e=currentEng(),idx=e.processSteps.findIndex(x=>x.id===stepId);
  if(idx===-1||e.processSteps[idx].status==='SUPERSEDED')return;
  let j=idx+direction;
  while(j>=0&&j<e.processSteps.length&&e.processSteps[j].status==='SUPERSEDED')j+=direction;
  if(j<0||j>=e.processSteps.length)return;
  [e.processSteps[idx],e.processSteps[j]]=[e.processSteps[j],e.processSteps[idx]];
  markDirty(`Paso ${stepId} reordenado`);render();
}
// Visual order (array position) is independent of normal_next_step/exception_path routing — moveStep never
// writes either. This only flags when they drift apart so a consultant can notice, never auto-corrects.
function stepOrderDiscrepancies(steps){
  const out=[];
  steps.forEach((s,i)=>{
    if(!s.normal_next_step)return;
    const expected=steps[i+1];
    if(!expected||expected.id!==s.normal_next_step)out.push({from:s,to:steps.find(x=>x.id===s.normal_next_step)||null});
  });
  return out;
}

const PROCESS_STARTER_TEMPLATES=Object.freeze([
  {id:'TPL-PROC-LINEAR-001',version:1,name:'Flujo lineal',description:'Dos actividades intermedias entre los límites ya definidos.',steps:[
    {step_name:'Actividad principal',step_type:'ST02',actor:'OPERATIONS'},
    {step_name:'Validación',step_type:'ST02',actor:'OPERATIONS'}
  ]},
  {id:'TPL-PROC-APPROVAL-001',version:1,name:'Flujo con aprobación',description:'Preparación, revisión y aprobación antes del límite final.',steps:[
    {step_name:'Preparar',step_type:'ST02',actor:'OPERATIONS'},
    {step_name:'Revisar',step_type:'ST02',actor:'OPERATIONS'},
    {step_name:'Aprobar',step_type:'ST05',actor:'MANAGER'}
  ]},
  {id:'TPL-PROC-DECISION-001',version:1,name:'Flujo con decisión',description:'Actividad, decisión y ejecución posterior.',steps:[
    {step_name:'Preparar información',step_type:'ST02',actor:'OPERATIONS'},
    {step_name:'Decidir',step_type:'ST04',actor:'MANAGER'},
    {step_name:'Ejecutar decisión',step_type:'ST02',actor:'OPERATIONS'}
  ]}
]);
const STEP_STARTER_TEMPLATES=Object.freeze([
  {id:'TPL-STEP-TASK-001',version:1,name:'Tarea operativa',step:{step_name:'Nueva actividad',step_type:'ST02',actor:'OPERATIONS'}},
  {id:'TPL-STEP-DECISION-001',version:1,name:'Decisión',step:{step_name:'Tomar decisión',step_type:'ST04',actor:'MANAGER'}},
  {id:'TPL-STEP-APPROVAL-001',version:1,name:'Aprobación',step:{step_name:'Aprobar',step_type:'ST05',actor:'MANAGER'}}
]);

function processBoundaryValue(e,fid,fallback,secondaryFid=''){
  const valueFor=id=>{const f=schema?.fields?.find(x=>x.Field_ID===id);return f&&typeof effectiveValue==='function'?effectiveValue(f,e):e.answers?.[id]};
  const primary=valueFor(fid);if(primary!==undefined&&primary!==null&&String(primary).trim()!=='')return String(primary);
  if(secondaryFid){const secondary=valueFor(secondaryFid);if(secondary!==undefined&&secondary!==null&&String(secondary).trim()!=='')return String(secondary)}
  return fallback;
}
function processDraftStep(data={},templateMeta=null){
  return stepMeta({
    id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],
    decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0,
    ...data,
    template_provenance:templateMeta?{template_id:templateMeta.id,template_version:templateMeta.version,instantiated_at:now(),state:'DRAFT'}:null
  });
}
function instantiateProcessTemplate(templateId){
  const e=currentEng(),tpl=PROCESS_STARTER_TEMPLATES.find(x=>x.id===templateId);if(!e||!tpl)return;
  const active=activeSteps(e);
  if(active.length&&!confirm('Ya existen pasos intermedios. ¿Sustituirlos por esta plantilla de flujo? Los pasos actuales se eliminarán del flujo visible.'))return;
  active.forEach(x=>x.status='SUPERSEDED');
  const created=tpl.steps.map(x=>processDraftStep(x,tpl));
  created.forEach((x,i)=>x.normal_next_step=created[i+1]?.id||'');
  e.processSteps.push(...created);e.confirmedAsIs=false;e.answers.DF093='';e.processTab='cliente';
  audit(`Plantilla de flujo ${tpl.id} v${tpl.version} instanciada como borrador`);
  markDirty('Plantilla de flujo instanciada como borrador');closeModal();render();
}
function instantiateStepTemplate(templateId){
  const e=currentEng(),tpl=STEP_STARTER_TEMPLATES.find(x=>x.id===templateId);if(!e||!tpl)return;
  e.processSteps.push(processDraftStep(tpl.step,tpl));e.confirmedAsIs=false;e.answers.DF093='';
  audit(`Plantilla de paso ${tpl.id} v${tpl.version} instanciada como borrador`);
  markDirty('Plantilla de paso instanciada como borrador');closeModal();render();
}
function openProcessTemplatePicker(){
  const body=`<div class="field full"><label>Plantilla de flujo</label><select id="processTemplateSelect">
    ${PROCESS_STARTER_TEMPLATES.map(x=>`<option value="${attr(x.id)}">${esc(x.name)} · v${x.version}</option>`).join('')}
  </select><div class="field-help">La plantilla crea pasos intermedios como borrador. Los límites inicial y final proceden de PG02 y no se sustituyen.</div></div>
  <div class="template-catalog">${PROCESS_STARTER_TEMPLATES.map(x=>`<div class="notice template-preview"><b>${esc(x.name)}</b><br>${esc(x.description)}<div class="field-help">${x.steps.map(s=>esc(s.step_name)).join(' → ')}</div></div>`).join('')}</div>`;
  openModal('Usar plantilla de flujo',body,()=>instantiateProcessTemplate(document.getElementById('processTemplateSelect').value),'Usar plantilla');
}
function openStepTemplatePicker(){
  const body=`<div class="field full"><label>Plantilla de paso</label><select id="stepTemplateSelect">
    ${STEP_STARTER_TEMPLATES.map(x=>`<option value="${attr(x.id)}">${esc(x.name)} · v${x.version}</option>`).join('')}
  </select><div class="field-help">Se añade como borrador editable entre los límites del proceso.</div></div>`;
  openModal('Añadir paso desde plantilla',body,()=>instantiateStepTemplate(document.getElementById('stepTemplateSelect').value),'Añadir paso');
}

function flowBoundaryNode(kind,label){
  return `<div class="flow-step flow-boundary ${kind}"><span class="boundary-kicker">${kind==='start'?'Inicio':'Fin'}</span><h4>${esc(label)}</h4><p>Límite definido en Alcance del proceso</p></div>`;
}
function flowIntermediateNodes(e,steps,fr){
  return steps.map((s,i)=>`<div class="flow-connector"></div><div class="flow-step ${e.confirmedAsIs?'confirmed':''}" data-edit-step="${s.id}">
    <h4>${i+1}. ${esc(s.step_name||'Paso sin nombre')}</h4>
    <p>${esc(labelFrom('OS_ACTOR_ROLE',s.actor)||'—')} · ${esc(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—')}</p>
    <p>${num(s.active_time)?`${num(s.active_time)} min trabajo`:''}${num(s.wait_time)?` · ${num(s.wait_time)} min espera`:''}</p>
    <div class="friction-badges">${fr.filter(x=>normalizeArray(x.affected_steps).includes(s.id)).map(x=>`<span class="friction-badge" data-edit-friction="${x.id}">${esc(labelFrom('OS_FRICTION_TYPE',x.friction_type))}</span>`).join('')}</div>
  </div>`).join('');
}
function clientProcessView(e,steps,fr){
  const start=processBoundaryValue(e,'DF014','Límite inicial pendiente','DF012');
  const finish=processBoundaryValue(e,'DF015','Límite final pendiente','DF013');
  const riskCount=(e.risks||[]).length,econCount=(e.economicInputs||[]).length;
  const company=companyById(e.companyId)?.name||e.answers?.DF001||'Empresa';
  const processName=e.answers?.DF011||e.processName||'Proceso sin nombre';
  const clientBar=`<div class="client-process-topbar"><img src="./assets/brand/Logo.png" alt="AUNEA"><div class="client-process-context"><span>${esc(company)}</span><b>${esc(processName)}</b></div><div class="client-process-state"><span>Sesión de diagnóstico</span><b>AS-IS compartido</b></div></div>`;
  const flow=`<div class="flow-canvas client-process-canvas"><div class="flow-track">${flowBoundaryNode('start',start)}${flowIntermediateNodes(e,steps,fr)}<div class="flow-connector"></div>${flowBoundaryNode('end',finish)}</div></div>`;
  const layerRail=`<aside class="client-process-layer-rail" aria-label="Capas del diagnóstico">
    <div class="client-rail-title">Capas del diagnóstico</div>
    <button class="client-rail-item active" data-process-tab="cliente"><b>Mapa del proceso</b><span>${steps.length} paso(s) intermedio(s)</span></button>
    <button class="client-rail-item" data-process-tab="fricciones"><b>Fricciones y evidencia</b><span>${fr.length} registrada(s)</span></button>
    <button class="client-rail-item" data-process-tab="riesgos"><b>Riesgos y controles</b><span>${riskCount} registrado(s)</span></button>
    <button class="client-rail-item" data-process-tab="impacto"><b>Impacto económico</b><span>${econCount} input(s)</span></button>
    <div class="client-rail-note">El cliente ve siempre el mismo AS-IS. Cambia la capa, no el proceso.</div>
  </aside>`;
  const confirm=`<div class="flow-confirm"><div><b>${e.confirmedAsIs?'AS-IS confirmado':'Confirmación pendiente'}</b><div class="field-help">${e.confirmedAsIs?`Confirmado ${fmtDate(e.asIsConfirmedAt)}`:'La confirmación se invalida si cambia el mapa.'}</div></div><button class="btn ${e.confirmedAsIs?'btn-outline':'btn-primary'}" id="confirmAsIs">${e.confirmedAsIs?'Reconfirmar flujo':'Confirmar flujo AS-IS'}</button></div>`;
  const workspace=`${clientBar}<div class="client-process-workspace">${layerRail}<div class="client-process-main">${flow}${confirm}</div></div>`;
  return section('Vista con cliente','La sesión se conduce sobre un único mapa. Inicio y fin proceden del alcance ya definido; aquí sólo se añaden actividades intermedias.',
    workspace,
    `<button class="btn btn-outline" id="openSessionDisplayFromProcess">Abrir pantalla cliente</button><button class="btn btn-outline" id="useProcessTemplate">Elegir plantilla de flujo</button><button class="btn btn-outline" id="addStepTemplate">Plantilla de paso</button><button class="btn btn-primary" id="addStepFromClient">Añadir paso intermedio</button>`);
}
function stepsEditor(e,steps,fr){
  const discrepancies=stepOrderDiscrepancies(steps);
  const discNotice=discrepancies.length?`<div class="notice warn"><strong>Orden visual distinto del flujo real:</strong> ${discrepancies.map(d=>`"${esc(d.from.step_name)}" enruta a "${esc(d.to?d.to.step_name:'Fin')}"`).join('; ')}.</div>`:'';
  const start=processBoundaryValue(e,'DF014','Límite inicial pendiente','DF012'),finish=processBoundaryValue(e,'DF015','Límite final pendiente','DF013');
  const rows=steps.length?`<div class="process-list">${steps.map((s,i)=>`<div class="process-row">
    <div class="process-index">${i+1}</div><div><b>${esc(s.step_name)||'<span class="internal-tag">Sin nombre — editar</span>'}</b>
    <p>${esc(labelFrom('OS_STEP_TYPE',s.step_type))||'Sin tipo'} · ${esc(labelFrom('OS_ACTOR_ROLE',s.actor))} · ${esc(labelFrom('OS_TOOL_CATEGORY',s.tool)||'Sin herramienta')}</p>
    <p><b>Activo:</b> ${num(s.active_time)} min · <b>Espera:</b> ${num(s.wait_time)} min · <b>Retrabajo:</b> ${num(s.rework_time)} min</p></div>
    <div class="row-actions"><button class="btn btn-small" data-move-step-up="${s.id}" ${i===0?'disabled':''}>↑</button><button class="btn btn-small" data-move-step-down="${s.id}" ${i===steps.length-1?'disabled':''}>↓</button><button class="btn btn-small" data-add-friction-step="${s.id}">+ Fricción</button><button class="btn btn-small" data-edit-step="${s.id}">Editar</button><button class="btn btn-small btn-danger" data-delete-step="${s.id}">Eliminar</button></div>
  </div>`).join('')}</div>`:'<div class="empty"><h2>Sin pasos intermedios</h2><p>Los límites inicial y final ya forman el marco del flujo. Añade sólo las actividades que ocurren entre ambos.</p></div>';
  return section('Pasos intermedios',`${start} → … → ${finish}`,discNotice+rows,
    '<button class="btn btn-primary" id="addStep">Añadir paso</button><button class="btn btn-outline" id="addMultipleSteps">+ Añadir varios pasos</button><button class="btn btn-outline" id="addStepTemplate">Plantilla de paso</button><button class="btn btn-outline" id="useProcessTemplate">Plantilla de flujo</button>');
}
function frictionsEditor(e,steps,fr){
  return section('Fricciones y evidencia','El cliente describe el problema observable; AUNEA registra causa, evidencia e impacto sin mostrar Pain_ID.',
    fr.length?`<div class="process-list">${fr.map(x=>`<div class="process-row"><div class="process-index">!</div><div><b>${esc(x.client_label||labelFrom('OS_FRICTION_TYPE',x.friction_type))}</b><p>${esc(x.observable_signal)} · Pasos: ${normalizeArray(x.affected_steps).map(id=>steps.find(s=>s.id===id)?.step_name).filter(Boolean).map(esc).join(', ')}</p><p>Evidencia: ${esc(labelFrom('OS_EVIDENCE_TYPE',x.evidence_type))}</p></div><div class="row-actions"><button class="btn btn-small" data-edit-friction="${x.id}">Editar</button><button class="btn btn-small btn-danger" data-delete-friction="${x.id}">Eliminar</button></div></div>`).join('')}</div>`:'<div class="empty"><h2>Sin fricciones registradas</h2><p>Añade problemas observables sobre los pasos del flujo.</p></div>',
    '<button class="btn btn-primary" id="addFriction">Añadir fricción</button>');
}
function processPage(){
  const e=currentEng(),steps=activeSteps(e),fr=activeFrictions(e),tab=e.processTab||'cliente';
  const tabs=`<div class="subtabs process-workspace-tabs">
    <button class="subtab ${tab==='cliente'?'active':''}" data-process-tab="cliente">Vista con cliente</button>
    <button class="subtab ${tab==='pasos'?'active':''}" data-process-tab="pasos">Pasos (${steps.length})</button>
    <button class="subtab ${tab==='fricciones'?'active':''}" data-process-tab="fricciones">Fricciones y evidencia (${fr.length})</button>
    <button class="subtab ${tab==='riesgos'?'active':''}" data-process-tab="riesgos">Riesgo y controles (${(e.risks||[]).length})</button>
    <button class="subtab ${tab==='impacto'?'active':''}" data-process-tab="impacto">Impacto económico (${(e.economicInputs||[]).length})</button>
  </div>`;
  let body=tab==='pasos'?stepsEditor(e,steps,fr)
    :tab==='fricciones'?frictionsEditor(e,steps,fr)
    :tab==='riesgos'?riskBuilder(e)
    :tab==='impacto'?economicBuilder(e)
    :clientProcessView(e,steps,fr);
  const returnBtn=state.returnTo?`<button class="btn btn-primary" id="returnToStage">← Volver a ${esc(schema.flow.find(x=>x.Stage_ID===state.returnTo.stageId)?.Stage_ES||state.returnTo.stageId)}</button>`:'';
  return pageTop('Editor del proceso','Trabaja el AS-IS con el cliente sobre un único flujo; las capas de detalle se editan sin abandonar el contexto.',
    `${returnBtn}<button class="btn" data-page="diagnostico">Volver al cuestionario</button>`) + tabs + body;
}
function flowReview(e,steps,fr){return clientProcessView(e,steps,fr)}

const __auneaNoReaskBindForms=bindForms;
bindForms=function(){
  __auneaNoReaskBindForms();
  document.querySelectorAll('[data-add-friction-step]').forEach(b=>b.onclick=()=>openFrictionModal(null,[b.dataset.addFrictionStep]));
  document.querySelectorAll('[data-move-step-up]').forEach(b=>b.onclick=()=>moveStep(b.dataset.moveStepUp,-1));
  document.querySelectorAll('[data-move-step-down]').forEach(b=>b.onclick=()=>moveStep(b.dataset.moveStepDown,1));
  document.querySelectorAll('[data-fr-other-toggle]').forEach(el=>el.addEventListener('change',()=>{const targetId=el.dataset.frOtherToggle,wrap=document.querySelector(`[data-fr-other-wrap="${targetId}"]`);if(!wrap)return;wrap.style.display=el.checked?'':'none';if(!el.checked){const input=document.getElementById(targetId);if(input)input.value=''}}));
  const pTpl=document.getElementById('useProcessTemplate');if(pTpl)pTpl.onclick=openProcessTemplatePicker;
  const sTpl=document.getElementById('addStepTemplate');if(sTpl)sTpl.onclick=openStepTemplatePicker;
  const addClient=document.getElementById('addStepFromClient');if(addClient)addClient.onclick=()=>openStepModal();
  const addMany=document.getElementById('addMultipleSteps');if(addMany)addMany.onclick=()=>addMultipleSteps();
  const share=document.getElementById('openSessionDisplayFromProcess');if(share)share.onclick=()=>openSessionDisplay();
  document.querySelectorAll('[data-delete-step]').forEach(b=>b.onclick=()=>removeStepFromFlow(b.dataset.deleteStep));
};
// [AUNEA-FE-PROC-EDITOR-020] END
