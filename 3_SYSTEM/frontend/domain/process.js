// [AUNEA-FE-PROC-EDITOR-020] START — Process Step + Friction canonical editor v1.1
// PURPOSE: Build/review the AS-IS with the 20 canonical Process Step attributes and anchored Friction records.
// SOURCE: Diagnostic Master v1.2 CANONICAL (v1.3 B02 REVIEW candidate), Process/Friction/Pain models; REQ-PROC-001/002; REQ-FRIC-001/002; DEC-040/063/068.
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
function processLayerState(e){return typeof processLayerConfirmations==='function'?processLayerConfirmations(e):(e.layerConfirmations||(e.layerConfirmations={map:false,frictions:false,risks:false,impact:false}))}
function processLayerKeySafe(tab){return typeof processLayerKey==='function'?processLayerKey(tab):(tab==='fricciones'?'frictions':tab==='riesgos'?'risks':tab==='impacto'?'impact':'map')}
function invalidateProcessLayersSafe(e,from='map'){if(typeof invalidateProcessLayers==='function')return invalidateProcessLayers(e,from);e.confirmedAsIs=false;e.answers.DF093=''}
function selectedHtml(id,opts,selected,{detailId='',detailValue='',detailPlaceholder='Especifica la opción',wrapped=false}={}){
  const arr=normalizeArray(selected).map(String),other=catalogOtherOption(opts),otherValue=other?String(other.value):'',otherOpen=!!other&&arr.includes(otherValue);
  const choices=`<div class="choice-grid${wrapped?' choice-grid-wrapped':''}">${opts.map(o=>{const isOther=!!other&&String(o.value)===otherValue;return `<div class="choice"><input type="checkbox" id="${id}_${attr(o.value)}" value="${attr(o.value)}" data-v1-multi="${id}" ${isOther?`data-v1-other-toggle="${id}"`:''} ${arr.includes(String(o.value))?'checked':''}><label for="${id}_${attr(o.value)}">${esc(o.label)}</label></div>`}).join('')}</div>`;
  if(!detailId||!other)return choices;
  return choices+`<div class="detail-wrap" data-v1-other-wrap="${id}"${otherOpen?'':' style="display:none"'}><input id="${detailId}" value="${attr(otherOpen?detailValue:'')}" placeholder="${attr(detailPlaceholder)}"></div>`;
}
function catalogOtherOption(opts){return (opts||[]).find(o=>String(o.value).toUpperCase()==='OTHER'||['otro','otra'].includes(String(o.label||'').trim().toLowerCase()))||null}

/* [AUNEA-FE-PROC-CHOICES-025] START — Preserve canonical dropdowns.
   Existing MULTICHECK and MULTISELECT options wrap horizontally; applies-to uses its original dropdown. */
/* [AUNEA-FE-PROC-CHOICES-025] END */
function processDecisionStep(s){
  return s?(typeof s._ui?.has_decision==='boolean'?s._ui.has_decision:!!(['ST04','ST05'].includes(String(s.step_type||''))||normalizeArray(s.decision_criteria).length||s.exception_path)):false;
}

function auneaDropdownControl(id,opts,value='',placeholder='Selecciona…',extra=''){
  // All previously single-select/combobox controls remain canonical dropdowns.
  // Horizontal wrapping belongs exclusively to pre-existing multi-choice controls.
  return auneaSelectControl(id,opts,value,{extra,placeholder});
}
function datalistControl(id,setId,value,placeholder){
  const opts=fieldOptions(setId),match=opts.find(o=>String(o.value)===String(value)),other=catalogOtherOption(opts),isCustom=!!value&&!match,isOther=!!other&&(String(value)===String(other.value)||isCustom),selectedValue=isCustom&&other?other.value:value,otherValue=other?.value||'__OTHER__',all=other?opts:[...opts,{value:'__OTHER__',label:'Otro / nuevo…'}];
  return `<div class="catalog-reference-control">${auneaDropdownControl(id,all,selectedValue,placeholder,`data-model-set="${attr(setId||'')}" data-other-value="${attr(otherValue)}" data-catalog-reference="${attr(id)}"`)}<div class="detail-wrap" data-catalog-other-wrap="${id}"${isOther?'':' style="display:none"'}><input id="${id}_other" value="${attr(isCustom?value:'')}" placeholder="Especifica el valor"></div></div>`;
}
function resolveCatalogInput(el){if(!el)return '';const opts=fieldOptions(el.dataset.modelSet),raw=String(el.value||''),otherValue=String(el.dataset.otherValue||'__OTHER__');if(raw===otherValue)return document.getElementById(`${el.id}_other`)?.value.trim()||raw;const m=opts.find(o=>String(o.value)===raw);return m?.value||raw}
function bindProcessDropdownDelegation(){
  if(typeof document==='undefined'||typeof document.addEventListener!=='function'||document.__auneaProcessDropdownBound)return;
  document.__auneaProcessDropdownBound=true;
  document.addEventListener('click',ev=>{
    const chip=ev.target.closest?.('[data-process-chip]');
    if(chip){
      ev.preventDefault();ev.stopPropagation();
      const input=document.getElementById(chip.dataset.processChip);if(!input)return;
      input.value=chip.dataset.value??'';
      chip.closest('.process-chip-control')?.querySelectorAll('[data-process-chip]').forEach(x=>{
        const active=x===chip;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));
      });
      input.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    const option=ev.target.closest?.('[data-process-select-option]');if(!option)return;
    ev.preventDefault();ev.stopPropagation();
    const id=option.dataset.processSelectOption,input=document.getElementById(id),box=option.closest('details.aunea-select');
    if(!input)return;
    input.value=option.dataset.value||'';
    box?.querySelectorAll('[data-process-select-option]').forEach(x=>x.classList.toggle('selected',x===option));
    const label=box?.querySelector('summary span');if(label)label.textContent=option.dataset.label||option.textContent||'';
    if(box)box.open=false;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
}
bindProcessDropdownDelegation();
function timeControl(id,minutes,unit='min',allowSpecial=false){
  const units=[{value:'min',label:'min'},{value:'h',label:'h'},{value:'day',label:'días'},{value:'week',label:'semanas'}],modes=[{value:'',label:'Dato disponible'},{value:'UNKNOWN',label:'No disponible'},{value:'ZERO',label:'Cero'}];
  return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(displayDuration(minutes,unit))}" placeholder="0">${auneaDropdownControl(id+'_unit',units,unit,'Unidad')}${allowSpecial?auneaDropdownControl(id+'_mode',modes,'','Estado'):''}</div>`;
}
function appliesControl(s){
  const a=s.applies_to&&typeof s.applies_to==='object'?s.applies_to:{mode:s.applies_to||'ALL',value:'',condition:''};
  const mode=a.mode||'ALL',opts=[{value:'ALL',label:'Todos los casos'},{value:'PERCENT',label:'Porcentaje de casos'},{value:'CONDITION',label:'Sólo si se cumple una condición'}];
  const val=mode==='ALL'?'100':(mode==='CONDITION'?(a.condition||''):(a.value||''));
  return `<div class="process-applies-control">${auneaDropdownControl('step_applies_mode',opts,mode,'Aplicación')}
    <div class="field process-applies-detail" data-process-applies-detail><label data-process-applies-label>${mode==='CONDITION'?'Condición':'Porcentaje de casos'}</label>
      <input id="step_applies_value" ${mode==='CONDITION'?'type="text"':'type="number" min="0" max="100" step="any"'} value="${attr(val)}" ${mode==='ALL'?'disabled':''} placeholder="${mode==='CONDITION'?'Describe cuándo aplica':'0–100'}">
      <span class="field-help" data-process-applies-help>${mode==='ALL'?'Se aplica al 100 % de los casos; el porcentaje está bloqueado.':mode==='PERCENT'?'Indica el porcentaje de casos al que aplica.':'Describe la condición observable.'}</span>
    </div></div>`;
}
function bindProcessAppliesControl(){
  const mode=document.getElementById('step_applies_mode'),input=document.getElementById('step_applies_value');
  const label=typeof document.querySelector==='function'?document.querySelector('[data-process-applies-label]'):null,help=typeof document.querySelector==='function'?document.querySelector('[data-process-applies-help]'):null;
  if(!mode||!input||typeof mode.addEventListener!=='function')return;
  mode.addEventListener('change',()=>{
    const m=mode.value;input.disabled=m==='ALL';input.type=m==='CONDITION'?'text':'number';
    if(m==='CONDITION'){input.removeAttribute('min');input.removeAttribute('max');input.placeholder='Describe cuándo aplica';}
    else{input.min='0';input.max='100';input.placeholder='0–100';}
    input.value=m==='ALL'?'100':'';
    if(label)label.textContent=m==='CONDITION'?'Condición':'Porcentaje de casos';
    if(help)help.textContent=m==='ALL'?'Se aplica al 100 % de los casos; el porcentaje está bloqueado.':m==='PERCENT'?'Indica el porcentaje de casos al que aplica.':'Describe la condición observable.';
  });
}
function decisionDestinationOptions(e,s){return [{value:'',label:'Selecciona destino…'},{value:'__END__',label:'Fin del proceso'},{value:'__NEW__',label:'+ Crear nuevo paso como destino'},...activeSteps(e).filter(z=>z.id!==s.id).map(z=>({value:z.id,label:z.step_name||'Paso sin nombre'}))]}
function blankDecisionDestination(){return stepMeta({id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0})}
function exceptionControl(s,e){
  const x=s.exception_path&&typeof s.exception_path==='object'?s.exception_path:{},types=[{value:'',label:'Sin clasificación adicional'},...fieldOptions('OS_EXCEPTION_TYPE')],dest=decisionDestinationOptions(e,s);
  return `<div class="decision-route-card route-no"><div class="decision-route-head"><b>Ruta NO / alternativa</b><span>Cuando no se cumple la condición principal</span></div><div class="form-grid nested">
    <div class="field full"><label>Destino de la ruta NO ${requiredMark()}</label>${auneaDropdownControl('step_exc_dest',dest,x.destination_step||'','Selecciona destino…')}</div>
    <div class="field"><label>Condición / criterio de salida</label><input id="step_exc_condition" value="${attr(x.condition||'')}" placeholder="Ej. No cumple requisitos"></div>
    <div class="field"><label>Tipo de excepción</label>${auneaDropdownControl('step_exc_type',types,x.type||'','Sin clasificación adicional')}</div>
    <div class="field full"><label>Responsable de la excepción</label>${datalistControl('step_exc_owner','OS_ACTOR_ROLE',x.owner||'','Rol responsable')}</div>
  </div></div>`;
}

function openStepModal(stepId=null,linkFromStepId=null,preset=null){
  const e=currentEng(),existing=stepId?e.processSteps.find(x=>x.id===stepId):null;
  const base={id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0};
  const s=stepMeta(existing?structuredClone(existing):{...base,...(preset||{}),_ui:{...(preset?._ui||{})}});
  const stepTypes=fieldOptions('OS_STEP_TYPE'),artifacts=fieldOptions('OS_ARTIFACT_TYPE'),decisions=fieldOptions('OS_DECISION_CRITERIA'),manual=fieldOptions('OS_MANUAL_ACTION'),auto=fieldOptions('OS_AUTOMATION_STATE'),channels=fieldOptions('OS_COMM_CHANNEL'),evid=fieldOptions('OS_EVIDENCE_TYPE');
  const decisionOther=catalogOtherOption(decisions),decisionOtherOpen=!!decisionOther&&normalizeArray(s.decision_criteria).map(String).includes(String(decisionOther.value));
  const hasDecision=processDecisionStep(s);
  s._ui.has_decision=hasDecision;
  const stepTypeControl=auneaDropdownControl('step_type',[{value:'',label:'Selecciona…'},...stepTypes],s.step_type||'','Selecciona…');
  // Progressive disclosure over the same 20 canonical Process Step attributes — no schema change, just
  // grouped presentation. Group A (info básica) starts open; the rest collapse behind <summary> so the
  // editor reads as "3 essentials, then detail on demand" instead of one 20-field wall of inputs. The
  // step list row (processPage) already shows a readable per-step summary outside this modal.
  const body=`<div class="step-groups process-modal-form">
  <details class="step-group" open><summary>A. Información básica</summary><div class="form-grid">
    <div class="field full"><label>¿Qué se hace en este paso? ${requiredMark()}</label><input id="step_name" maxlength="80" value="${attr(s.step_name||'')}" placeholder="Verbo + objeto, ej. Validar requisitos"></div>
    <div class="field"><label>Tipo de paso ${requiredMark()}</label>${stepTypeControl}</div>
    <div class="field"><label>¿Quién lo realiza? ${requiredMark()}</label>${datalistControl('step_actor','OS_ACTOR_ROLE',s.actor||'','Rol existente o nuevo')}</div>
  </div></details>
  <details class="step-group"><summary>B. Entradas y salidas</summary><div class="form-grid">
    <div class="field full"><label>¿A qué casos aplica?</label>${appliesControl(s)}</div>
    <div class="field"><label>Veces por caso</label><input id="step_occ" type="number" min="0" step="any" value="${attr(s.occurrences_per_case??1)}"></div>
    <div class="field full"><label>¿Qué necesita para empezar?</label>${selectedHtml('step_inputs',artifacts,s.inputs,{wrapped:true,detailId:'step_inputs_detail',detailValue:s._details.inputs||'',detailPlaceholder:'Especifica el input sólo al seleccionar Otro'})}</div>
    <div class="field full"><label>¿Qué produce este paso?</label>${selectedHtml('step_outputs',artifacts,s.outputs,{wrapped:true,detailId:'step_outputs_detail',detailValue:s._details.outputs||'',detailPlaceholder:'Especifica el output sólo al seleccionar Otro'})}</div>
  </div></details>
  <details class="step-group"><summary>C. Tiempo y rendimiento</summary><div class="form-grid">
    <div class="field"><label>¿Cuánto tiempo de trabajo requiere?</label>${timeControl('step_active',s.active_time,s._ui.active_unit||'min')}</div>
    <div class="field"><label>¿Cuánto tiempo queda esperando?</label>${timeControl('step_wait',s.wait_time,s._ui.wait_unit||'min')}<div class="field-help">Tiempo en el que el caso está parado o esperando antes de poder continuar. Se mantiene separado del trabajo activo y no se monetiza como trabajo.</div></div>
    <div class="field"><label>Tiempo de retrabajo</label>${timeControl('step_rework',s.rework_time,s._ui.rework_unit||'min')}</div>
    <div class="field"><label>Error / repetición</label><div class="compound-control"><input id="step_error" type="number" min="0" step="any" value="${attr(s.error_rate&&typeof s.error_rate==='object'?s.error_rate.value:(s.error_rate||''))}" placeholder="5">${auneaDropdownControl('step_error_mode',[{value:'percent',label:'%'},{value:'count',label:'casos'}],s.error_rate?.mode||'percent','Unidad')}${auneaDropdownControl('step_error_period',[{value:'case',label:'por caso'},{value:'month',label:'por mes'},{value:'year',label:'por año'}],s.error_rate?.period||'case','Periodo')}</div></div>
  </div></details>
  <details class="step-group"><summary>D. Flujo y decisiones</summary><div class="form-grid">
    <div class="field full"><label>¿Este paso incluye una decisión o bifurcación?</label><div class="segmented"><button type="button" class="segment ${hasDecision?'active':''}" data-step-decision-flag="1" data-value="YES">Sí</button><button type="button" class="segment ${!hasDecision?'active':''}" data-step-decision-flag="1" data-value="NO">No</button></div></div>
    <div class="field full"><div class="decision-route-card route-yes"><div class="decision-route-head"><b data-step-next-label>${hasDecision?'Ruta SÍ / afirmativa':'Siguiente paso normal'}</b><span>${hasDecision?'Cuando se cumple la condición principal':'Continuación del flujo'}</span></div><label>Destino ${hasDecision?requiredMark():''}</label>${auneaDropdownControl('step_next',decisionDestinationOptions(e,s),s.normal_next_step||'','Selecciona destino…')}</div></div>
    <div class="field full" data-step-decision-area${hasDecision?'':' style="display:none"'}><label>Criterios de decisión</label>${selectedHtml('step_decisions',decisions,s.decision_criteria)}<div class="detail-wrap" data-step-decision-other-wrap${decisionOtherOpen?'':' style="display:none"'}><input id="step_decisions_detail" value="${attr(decisionOtherOpen?(s._details.decision_criteria||''):'')}" placeholder="Especifica el criterio sólo al seleccionar Otro"></div></div>
    <div class="field full" data-step-decision-area${hasDecision?'':' style="display:none"'}>${exceptionControl(s,e)}</div>
  </div></details>
  <details class="step-group"><summary>E. Automatización y sistemas</summary><div class="form-grid">
    <div class="field"><label>Herramienta / sistema</label>${datalistControl('step_tool','OS_TOOL_CATEGORY',s.tool||'','Herramienta principal')}</div>
    <div class="field full"><label>Acciones manuales</label>${selectedHtml('step_manual',manual,s.manual_actions,{detailId:'step_manual_other',detailValue:s._details.manual_actions||'',detailPlaceholder:'Especifica la otra acción manual'})}</div>
    <div class="field full"><label>Automatización actual</label>${segmented('step_auto',auto,s.automation_state,'data-step-auto')}</div>
    <div class="field full"><label>Canal(es) de comunicación</label>${selectedHtml('step_channels',channels,s.communication_channels,{detailId:'step_channels_other',detailValue:s._details.communication_channels||'',detailPlaceholder:'Especifica el canal sólo al seleccionar Otro'})}</div>
  </div></details>
  <details class="step-group"><summary>F. Evidencia y notas</summary><div class="form-grid">
    <div class="field full"><label>Evidencia del paso</label>${selectedHtml('step_evidence',evid,s.evidence)}</div>
    <div class="field full"><label>Nota breve excepcional</label><input id="step_notes" maxlength="200" value="${attr(s.notes||'')}" placeholder="Sólo si los campos estructurados no bastan"></div>
  </div></details>
  </div>`;
  openModal(existing?'Editar paso':'Añadir paso',body,()=>{
    s.step_name=document.getElementById('step_name').value.trim();s.step_type=document.getElementById('step_type').value;s.actor=resolveCatalogInput(document.getElementById('step_actor'));s.tool=resolveCatalogInput(document.getElementById('step_tool'));s.occurrences_per_case=Math.max(0,Number(document.getElementById('step_occ').value||1));
    const am=document.getElementById('step_applies_mode').value,av=document.getElementById('step_applies_value').value.trim();s.applies_to={mode:am,value:am==='PERCENT'?av:'',condition:am==='CONDITION'?av:''};
    const collect=k=>[...document.querySelectorAll(`[data-v1-multi="${k}"]:checked`)].map(x=>x.value);s.inputs=collect('step_inputs');s.outputs=collect('step_outputs');s.manual_actions=collect('step_manual');s.communication_channels=collect('step_channels');s.evidence=collect('step_evidence');const hasDecisionNow=s._ui.has_decision===true;s.decision_criteria=hasDecisionNow?collect('step_decisions'):[];
    s._details.inputs=document.getElementById('step_inputs_detail')?.value.trim()||'';s._details.outputs=document.getElementById('step_outputs_detail')?.value.trim()||'';const decisionOtherSelected=decisionOther&&s.decision_criteria.map(String).includes(String(decisionOther.value));s._details.decision_criteria=decisionOtherSelected?document.getElementById('step_decisions_detail').value.trim():'';s._details.communication_channels=document.getElementById('step_channels_other')?.value.trim()||'';s._details.manual_actions=s.manual_actions.some(x=>String(x).toUpperCase()==='OTHER')?(document.getElementById('step_manual_other')?.value.trim()||''):'';
    s._ui.active_unit=document.getElementById('step_active_unit').value;s._ui.wait_unit=document.getElementById('step_wait_unit').value;s._ui.rework_unit=document.getElementById('step_rework_unit').value;s.active_time=minutesFrom(document.getElementById('step_active').value,s._ui.active_unit);s.wait_time=minutesFrom(document.getElementById('step_wait').value,s._ui.wait_unit);s.rework_time=minutesFrom(document.getElementById('step_rework').value,s._ui.rework_unit);
    s.error_rate={value:Number(document.getElementById('step_error').value||0),mode:document.getElementById('step_error_mode').value,period:document.getElementById('step_error_period').value};
    const nextVal=document.getElementById('step_next').value;
    const et=document.getElementById('step_exc_type').value,ec=document.getElementById('step_exc_condition').value.trim(),ed=document.getElementById('step_exc_dest').value,eo=resolveCatalogInput(document.getElementById('step_exc_owner'));
    if(!s.step_name||s.step_name.length<3||!s.step_type||!s.actor)return toast('Nombre (mín. 3 caracteres), tipo y responsable son obligatorios.');
    if(am==='PERCENT'&&(av===''||!Number.isFinite(Number(av))||Number(av)<0||Number(av)>100))return toast('Indica un porcentaje válido entre 0 y 100.');
    if(hasDecisionNow&&(!nextVal||!ed))return toast('Una decisión necesita destino para la ruta SÍ y para la ruta NO. También puedes elegir Fin del proceso.');
    let yesDestination=nextVal,noDestination=ed;
    const createdDestinations=[];
    if(hasDecisionNow&&yesDestination==='__NEW__'){const draft=blankDecisionDestination();e.processSteps.push(draft);yesDestination=draft.id;createdDestinations.push(draft.id)}
    if(hasDecisionNow&&noDestination==='__NEW__'){const draft=blankDecisionDestination();e.processSteps.push(draft);noDestination=draft.id;createdDestinations.push(draft.id)}
    s.normal_next_step=hasDecisionNow?yesDestination:(nextVal==='__NEW__'?'':nextVal);
    s.exception_path=hasDecisionNow?{type:et,condition:ec,destination_step:noDestination,owner:eo}:null;s.notes=document.getElementById('step_notes').value.trim();
    if(existing){Object.assign(existing,s);audit(`Paso editado ${existing.id}`)}else{e.processSteps.push(s);audit(`Paso creado ${s.id}`);if(linkFromStepId){const origin=e.processSteps.find(x=>x.id===linkFromStepId);if(origin)origin.normal_next_step=s.id}}if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');invalidateProcessLayersSafe(e,'map');e.diagnosticOutput=null;e.updatedAt=now();markDirty('Paso guardado');const persisted=typeof persistRecoverySnapshot==='function'?persistRecoverySnapshot('paso-guardado'):true;closeModal();
    if(createdDestinations.length)toast(`${createdDestinations.length} destino(s) vacío(s) creados. Edítalos para completar el flujo.`);
    if(!hasDecisionNow&&nextVal==='__NEW__'){render();openStepModal(null,s.id)}else{render()}
    if(persisted===false)toast('No se ha podido persistir este paso.');else toast(existing?'Cambios del paso guardados.':'Paso guardado.');
  },existing?'Guardar cambios':'Añadir paso');
  bindProcessAppliesControl();
  document.querySelectorAll('[data-step-auto]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-step-auto]').forEach(x=>x.classList.remove('active'));b.classList.add('active');s.automation_state=b.dataset.value});
  document.querySelectorAll('[data-step-decision-flag]').forEach(b=>b.onclick=()=>{s._ui.has_decision=b.dataset.value==='YES';document.querySelectorAll('[data-step-decision-flag]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-step-decision-area]').forEach(x=>x.style.display=s._ui.has_decision?'':'none');const label=document.querySelector('[data-step-next-label]');if(label)label.textContent=s._ui.has_decision?'Ruta SÍ / afirmativa':'Siguiente paso normal'});
  document.querySelectorAll('[data-catalog-reference]').forEach(el=>el.addEventListener('change',()=>{const otherValue=String(el.dataset.otherValue||'__OTHER__'),wrap=document.querySelector(`[data-catalog-other-wrap="${el.dataset.catalogReference}"]`);if(wrap)wrap.style.display=String(el.value)===otherValue?'':'none';if(String(el.value)!==otherValue){const other=document.getElementById(`${el.id}_other`);if(other)other.value=''}}));
  document.querySelectorAll('[data-v1-other-toggle]').forEach(el=>el.addEventListener('change',()=>{
    const key=el.dataset.v1OtherToggle,wrap=document.querySelector(`[data-v1-other-wrap="${key}"]`);
    if(!wrap)return;
    wrap.style.display=el.checked?'':'none';
    if(!el.checked){const input=wrap.querySelector('input,textarea');if(input)input.value=''}
  }));
  const decisionOtherBox=decisionOther?[...document.querySelectorAll('[data-v1-multi="step_decisions"]')].find(x=>String(x.value)===String(decisionOther.value)):null;
  if(decisionOtherBox)decisionOtherBox.addEventListener('change',()=>{const wrap=document.querySelector('[data-step-decision-other-wrap]');if(wrap)wrap.style.display=decisionOtherBox.checked?'':'none';if(!decisionOtherBox.checked){const input=document.getElementById('step_decisions_detail');if(input)input.value=''}});
}

function frictionNumberControl(id,obj,kind='number'){
  const p=obj&&typeof obj==='object'?obj:{value:obj||'',unit:'',period:'',mode:''};
  if(kind==='time')return timeControl(id,p.value||0,p.unit||'min',true);
  const periods=[{value:'case',label:'por caso'},{value:'month',label:'por mes'},{value:'year',label:'por año'}];
  if(kind==='money')return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(p.value||'')}" placeholder="0"><span class="unit-label">€</span>${auneaDropdownControl(id+'_period',periods,p.period||'case','Periodo')}${auneaDropdownControl(id+'_mode',[{value:'',label:'Dato disponible'},{value:'NONE',label:'No aplica'},{value:'UNKNOWN',label:'No disponible'}],p.mode||'','Estado')}</div>`;
  return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(p.value||'')}" placeholder="0">${auneaDropdownControl(id+'_mode',[{value:'percent',label:'%'},{value:'count',label:'casos'}],p.mode||'percent','Unidad')}${auneaDropdownControl(id+'_period',periods,p.period||'case','Periodo')}</div>`;
}
function openFrictionModal(frId=null,preselectedSteps=[]){
  const e=currentEng();if(!activeSteps(e).length)return toast('Añade al menos un paso antes de registrar una fricción.');const existing=frId?e.frictions.find(x=>x.id===frId):null;const f=frictionMeta(existing?structuredClone(existing):{id:id('FRI'),status:'ACTIVE',affected_steps:preselectedSteps,friction_type:'',cause:[],non_time_impact:[],workaround:[],evidence_ids:[],evidence_type:'EV02',frequency:{},active_time_loss:{},wait_time_loss:{},direct_loss:{}});
  const types=fieldOptions('OS_FRICTION_TYPE'),causes=fieldOptions('OS_FRICTION_CAUSE'),impacts=fieldOptions('OS_SCALE_1_5'),nonTime=fieldOptions('OS_NON_TIME_IMPACT'),work=fieldOptions('OS_WORKAROUND'),evid=fieldOptions('OS_EVIDENCE_TYPE');
  // Layer 1/2 progressive disclosure: tipo/pasos/señal/contexto-impacto are what a consultant needs to
  // register a friction on the spot; causa/workaround/evidencia/resto stay available but collapsed.
  // Same field ids, same save logic — presentation-only, never a Friction Model change.
  const body=`<div class="step-groups process-modal-form friction-modal-form">
  <details class="step-group" open><summary>Fricción</summary><div class="form-grid">
  <div class="field full"><label>Tipo de fricción ${requiredMark()}</label>${auneaDropdownControl('fr_type',[{value:'',label:'Selecciona…'},...types],f.friction_type||'','Selecciona…')}<div class="field-help">Pain_ID se deriva internamente; el cliente no lo selecciona.</div></div>
  <div class="field full"><label>Pasos afectados ${requiredMark()}</label>${selectedHtml('fr_steps',activeSteps(e).map(s=>({value:s.id,label:s.step_name||s.id})),f.affected_steps)}</div>
  <div class="field full"><label>¿Qué problema ocurre aquí? ${requiredMark()}</label><input id="fr_signal" value="${attr(f.observable_signal||'')}" placeholder="Hecho verificable, ej. casos >48h esperando aprobación"></div>
  <div class="field"><label>Frecuencia</label>${frictionNumberControl('fr_frequency',f.frequency)}</div>
  <div class="field"><label>Impacto percibido</label>${auneaDropdownControl('fr_impact',[{value:'',label:'—'},...impacts],f.impact||'','—')}</div>
  </div></details>
  <details class="step-group"><summary>Causa, solución provisional y evidencia</summary><div class="form-grid">
  <div class="field full"><label>Causa / condición ${requiredMark()}</label>${selectedHtml('fr_causes',causes,f.cause,{detailId:'fr_cause_other',detailValue:f._details.cause||'',detailPlaceholder:'Especifica otra causa sólo al seleccionar Otro'})}</div>
  <div class="field full"><label>Cómo se compensa hoy</label>${selectedHtml('fr_workaround',work,f.workaround,{detailId:'fr_workaround_other',detailValue:f._details.workaround||'',detailPlaceholder:'Especifica otro workaround sólo al seleccionar Otro'})}</div>
  <div class="field"><label>Tipo de evidencia principal <span class="internal-tag">interno</span></label>${auneaDropdownControl('fr_evidence_type',evid,f.evidence_type||'EV02','Selecciona…')}</div>
  <div class="field"><label>Tiempo asociado a la fricción</label>${frictionNumberControl('fr_active',f.active_time_loss,'time')}</div>
  <div class="field full"><label>Relación con el tiempo del paso</label>${auneaDropdownControl('fr_time_mode',[{value:'',label:'Pendiente de clasificar'},{value:'INCLUDED',label:'Incluido: ya está contabilizado en el paso'},{value:'BREAKDOWN',label:'Desglose: explica una parte del retrabajo'},{value:'ADDITIONAL',label:'Adicional: trabajo no registrado en el paso'}],f.time_attribution?.mode||'','Selecciona relación…')}<div class="field-help">Sólo Adicional podrá incrementar el esfuerzo total tras validar frecuencia y evidencia. Incluido y Desglose no se suman.</div></div>
  <div class="field full"><label>Paso responsable del tiempo</label>${auneaDropdownControl('fr_time_owner',[{value:'',label:'Selecciona un paso afectado…'},...activeSteps(e).map(s=>({value:s.id,label:s.step_name||s.id}))],f.time_attribution?.step_id||'','Selecciona paso…')}<div class="field-help">Una fricción puede afectar a varios pasos, pero su tiempo sólo tiene un propietario para evitar multiplicarlo.</div></div>
  <div class="field"><label>Espera / retraso atribuible</label>${frictionNumberControl('fr_wait',f.wait_time_loss,'time')}</div>
  <div class="field"><label>Pérdida monetaria directa</label>${frictionNumberControl('fr_direct',f.direct_loss,'money')}</div>
  <div class="field full"><label>Otros impactos</label>${selectedHtml('fr_non_time',nonTime,f.non_time_impact)}</div>
  <div class="field"><label>Prioridad cliente (cierre)</label>${auneaDropdownControl('fr_priority',[{value:'',label:'Sin priorizar'},{value:'1',label:'1 — Prioridad principal'},{value:'2',label:'2 — Segunda prioridad'},{value:'3',label:'3 — Tercera prioridad'}],f.priority_client?String(f.priority_client):'','Sin priorizar')}<div class="field-help">Ranking de cierre; top 3 recomendado por el modelo canónico.</div></div>
  <div class="field full"><label>Cómo lo describe el cliente</label><input id="fr_label" maxlength="160" value="${attr(f.client_label||'')}" placeholder="Opcional"></div>
  <div class="field full"><label>Nota excepcional</label><input id="fr_notes" maxlength="200" value="${attr(f.notes||'')}" placeholder="Sólo si los campos estructurados no bastan"></div>
  </div></details>
  </div>`;
  openModal(existing?'Editar fricción':'Añadir fricción',body,()=>{const collect=k=>[...document.querySelectorAll(`[data-v1-multi="${k}"]:checked`)].map(x=>x.value);f.friction_type=document.getElementById('fr_type').value;f.affected_steps=collect('fr_steps');f.cause=collect('fr_causes');f._details.cause=document.getElementById('fr_cause_other').value.trim();f.observable_signal=document.getElementById('fr_signal').value.trim();f.frequency={value:Number(document.getElementById('fr_frequency').value||0),mode:document.getElementById('fr_frequency_mode').value,period:document.getElementById('fr_frequency_period').value};f.impact=document.getElementById('fr_impact').value;
    const atUnit=document.getElementById('fr_active_unit').value,wtUnit=document.getElementById('fr_wait_unit').value;f.active_time_loss={value:minutesFrom(document.getElementById('fr_active').value,atUnit),unit:'min',source_unit:atUnit,mode:document.getElementById('fr_active_mode').value};f.time_attribution={mode:document.getElementById('fr_time_mode').value,step_id:document.getElementById('fr_time_owner').value};f.wait_time_loss={value:minutesFrom(document.getElementById('fr_wait').value,wtUnit),unit:'min',source_unit:wtUnit,mode:document.getElementById('fr_wait_mode').value};f.direct_loss={value:Number(document.getElementById('fr_direct').value||0),unit:'EUR',period:document.getElementById('fr_direct_period').value,mode:document.getElementById('fr_direct_mode').value};f.non_time_impact=collect('fr_non_time');f.workaround=collect('fr_workaround');f._details.workaround=document.getElementById('fr_workaround_other').value.trim();f.evidence_type=document.getElementById('fr_evidence_type').value||'EV02';f.priority_client=Number(document.getElementById('fr_priority').value||0)||null;f.client_label=document.getElementById('fr_label').value.trim();f.notes=document.getElementById('fr_notes').value.trim();f.derived_pain_id=painForFriction(f.friction_type);
    if(!f.friction_type||!f.affected_steps.length||!f.cause.length&&!f._details.cause||!f.observable_signal)return toast('Tipo, al menos un paso, causa y señal observable son obligatorios.');
    if(f.active_time_loss.value>0&&(!['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(f.time_attribution.mode)||!f.affected_steps.includes(f.time_attribution.step_id)))return toast('Para atribuir el tiempo, selecciona Incluido, Desglose o Adicional y un paso afectado responsable.');if(existing){Object.assign(existing,f);audit(`Fricción editada ${existing.id}`)}else{e.frictions.push(f);audit(`Fricción creada ${f.id}`)}if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');invalidateProcessLayersSafe(e,'frictions');e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();render();},existing?'Guardar cambios':'Añadir fricción');
  document.querySelectorAll('[data-v1-other-toggle]').forEach(el=>el.addEventListener('change',()=>{const key=el.dataset.v1OtherToggle,wrap=document.querySelector(`[data-v1-other-wrap="${key}"]`);if(!wrap)return;wrap.style.display=el.checked?'':'none';if(!el.checked){const input=wrap.querySelector('input,textarea');if(input)input.value=''}}));
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
    audit(`${n} paso(s) vacío(s) añadidos en bloque`);if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');invalidateProcessLayersSafe(e,'map');e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();render();
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
    invalidateProcessLayersSafe(e,'map');e.diagnosticOutput=null;e.updatedAt=now();
    audit(`Paso eliminado del flujo ${stepId}`);markDirty('Paso eliminado del flujo');
    if(typeof persistRecoverySnapshot==='function')persistRecoverySnapshot('eliminar-paso');
    closeModal();render();
  },'Eliminar del flujo');
}

function relinkNormalFlow(e){
  const steps=activeSteps(e);
  // Reordering a branching map must not overwrite SÍ/NO routes or its reconvergences.
  if(steps.some(processDecisionStep))return;
  steps.forEach((s,i)=>{s.normal_next_step=steps[i+1]?.id||''});
}
function moveStep(stepId,direction){
  const e=currentEng(),active=activeSteps(e),i=active.findIndex(x=>x.id===stepId),j=i+direction;
  if(i<0||j<0||j>=active.length)return;
  const ai=e.processSteps.indexOf(active[i]),aj=e.processSteps.indexOf(active[j]);
  [e.processSteps[ai],e.processSteps[aj]]=[e.processSteps[aj],e.processSteps[ai]];
  relinkNormalFlow(e);invalidateProcessLayersSafe(e,'map');markDirty(`Paso ${stepId} reordenado`);render();
}
function reorderStepBefore(stepId,targetId){
  const e=currentEng(),step=e.processSteps.find(x=>x.id===stepId),target=e.processSteps.find(x=>x.id===targetId);
  if(!step||!target||step===target||step.status==='SUPERSEDED'||target.status==='SUPERSEDED')return;
  const from=e.processSteps.indexOf(step),to=e.processSteps.indexOf(target);
  e.processSteps.splice(from,1);e.processSteps.splice(from<to?to-1:to,0,step);
  relinkNormalFlow(e);invalidateProcessLayersSafe(e,'map');markDirty(`Paso ${stepId} reordenado por arrastre`);render();
}
function addDecisionStep(){
  openStepModal(null,null,{step_name:'Decisión',step_type:'ST04',_ui:{has_decision:true}});
}
function stepOrderDiscrepancies(){return []}

const VALIDATED_CASE_TEMPLATES=Object.freeze([]);
function processBoundaryValue(e,fid,fallback,secondaryFid=''){
  const valueFor=id=>{const f=schema?.fields?.find(x=>x.Field_ID===id);return f&&typeof effectiveValue==='function'?effectiveValue(f,e):e.answers?.[id]};
  const primary=valueFor(fid);if(primary!==undefined&&primary!==null&&String(primary).trim()!=='')return String(primary);
  if(secondaryFid){const secondary=valueFor(secondaryFid);if(secondary!==undefined&&secondary!==null&&String(secondary).trim()!=='')return String(secondary)}
  return fallback;
}
function processDraftStep(data={},templateMeta=null){
  return stepMeta({id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0,...data,template_provenance:templateMeta?{template_id:templateMeta.id,template_version:templateMeta.version,source_case_id:templateMeta.source_case_id,instantiated_at:now(),state:'DRAFT'}:null});
}
function instantiateValidatedCase(templateId){
  const e=currentEng(),tpl=VALIDATED_CASE_TEMPLATES.find(x=>x.id===templateId);if(!e||!tpl)return;
  const active=activeSteps(e);
  if(active.length&&!confirm('Ya existen pasos intermedios. ¿Sustituirlos por este caso de referencia validado?'))return;
  active.forEach(x=>x.status='SUPERSEDED');
  const created=tpl.steps.map(x=>processDraftStep(x,tpl));e.processSteps.push(...created);relinkNormalFlow(e);
  e.confirmedAsIs=false;e.answers.DF093='';e.processTab='cliente';audit(`Caso validado ${tpl.id} instanciado como borrador`);markDirty('Caso de referencia instanciado como borrador');closeModal();render();
}
function openProcessTemplatePicker(){
  if(!VALIDATED_CASE_TEMPLATES.length){
    return openModal('Casos de referencia',`<div class="empty"><h2>Aún no hay casos reales validados disponibles</h2><p>El inventario interno de procesos y las demos no se usan como casos reales. Cuando exista un engagement validado y autorizado para reutilización, podrá aparecer aquí anonimizado para precompletar el borrador y revisarlo con el cliente.</p></div>`,()=>closeModal(),'Cerrar');
  }
  const body=`<div class="template-catalog">${VALIDATED_CASE_TEMPLATES.map(x=>`<button type="button" class="client-layer-card" data-validated-case="${attr(x.id)}"><b>${esc(x.name)}</b><span>${esc(x.description||'Caso real validado')}</span></button>`).join('')}</div>`;
  openModal('Casos de referencia',body,null,'Cerrar');
}
function openStepTemplatePicker(){openProcessTemplatePicker()}

function flowBoundaryNode(kind,label){
  return `<div class="flow-step flow-boundary ${kind}"><span class="boundary-kicker">${kind==='start'?'Inicio':'Fin'}</span><h4>${esc(label)}</h4><p>Límite definido en Alcance del proceso</p></div>`;
}
function flowIntermediateNodes(e,steps,fr,tab='cliente'){
  const risks=e.risks||[],economics=e.economicInputs||[];
  return steps.map((s,i)=>{
    const decision=s._ui?.has_decision===true||['ST04','ST05'].includes(String(s.step_type||''))||normalizeArray(s.decision_criteria).length>0;
    const stepFr=fr.filter(x=>normalizeArray(x.affected_steps).includes(s.id));
    const stepRisks=risks.filter(x=>normalizeArray(x.step_ids).includes(s.id));
    const stepEcon=economics.filter(x=>normalizeArray(x.step_ids).includes(s.id));
    const layerAction=tab==='fricciones'?'<button type="button" data-add-friction-step="'+attr(s.id)+'">+ Añadir fricción</button>':
      tab==='riesgos'?'<button type="button" data-add-risk-step="'+attr(s.id)+'">+ Añadir riesgo</button>':
      tab==='impacto'?'<button type="button" data-add-economic-step="'+attr(s.id)+'">+ Añadir impacto</button>':'';
    return `<div class="flow-connector"><button type="button" class="flow-insert" data-add-after="${i?steps[i-1]?.id||'':''}" aria-label="Añadir paso aquí">+</button></div><div class="flow-step ${decision?'is-decision':''} ${processLayerState(e).map?'confirmed':''}" draggable="true" data-drag-step="${s.id}">
      <div class="flow-step-tools"><button type="button" data-move-step-up="${s.id}" ${i===0?'disabled':''}>←</button><button type="button" data-move-step-down="${s.id}" ${i===steps.length-1?'disabled':''}>→</button><button type="button" data-edit-step="${s.id}">Editar</button><button type="button" class="danger-text" data-delete-step="${s.id}">Eliminar</button></div>
      <span class="boundary-kicker">${decision?'Decisión':`Paso ${i+1}`}</span><h4>${esc(s.step_name||'Paso sin nombre')}</h4>
      <p>${esc(labelFrom('OS_ACTOR_ROLE',s.actor)||'—')} · ${esc(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—')}</p>
      <p>${num(s.active_time)?`${num(s.active_time)} min trabajo`:''}${num(s.wait_time)?` · ${num(s.wait_time)} min espera`:''}</p>
      ${decision?'<p class="decision-route-label">Este paso decide entre dos continuaciones del flujo.</p>':''}
      <div class="process-node-links">
        ${stepFr.map(x=>`<button type="button" class="friction-badge" data-edit-friction="${attr(x.id)}">Fricción · ${esc(labelFrom('OS_FRICTION_TYPE',x.friction_type))}</button>`).join('')}
        ${stepRisks.map(x=>`<button type="button" class="risk-badge" data-edit-risk-index="${risks.indexOf(x)}">Riesgo · ${esc(x.description||x.category)}</button>`).join('')}
        ${stepEcon.map(x=>`<button type="button" class="economic-badge" data-edit-economic-index="${economics.indexOf(x)}">Impacto · ${esc(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id)}</button>`).join('')}
      </div>
      ${layerAction?'<div class="process-node-actions">'+layerAction+'</div>':''}
    </div>`;
  }).join('');
}

/* [AUNEA-FE-PROC-GRAPH-035] START — Read-only graph projection and direct route editing.
   Reads DF042 normal_next_step and DF043 exception_path.destination_step; never
   introduces an independent copy of the routing model or auto-confirms client data. */
function processGraphData(e,steps){
  const byId=new Map(steps.map(s=>[s.id,s])),nodes=[{id:'__START__',kind:'start'}],edges=[];
  const addNode=(id,kind='step',parent='',route='')=>{
    if(!nodes.some(n=>n.id===id))nodes.push({id,kind,parent,route});return id;
  };
  const valid=id=>!!id&&byId.has(id),edge=(from,to,label='')=>edges.push({from,to,label});
  if(!steps.length)edge('__START__',addNode('__END__','end'));
  else edge('__START__',steps[0].id);
  steps.forEach((step,i)=>{
    addNode(step.id);
    if(processDecisionStep(step)){
      const yes=step.normal_next_step==='__END__'?addNode('__END__','end'):(valid(step.normal_next_step)?step.normal_next_step:addNode('__YES__'+step.id,'pending',step.id,'SÍ'));
      const no=step.exception_path?.destination_step==='__END__'?addNode('__END__','end'):(valid(step.exception_path?.destination_step)?step.exception_path.destination_step:addNode('__NO__'+step.id,'pending',step.id,'NO'));
      edge(step.id,yes,'SÍ');edge(step.id,no,'NO');
    }else{
      const next=step.normal_next_step==='__END__'?addNode('__END__','end'):valid(step.normal_next_step)?step.normal_next_step:
        (step.normal_next_step?addNode('__NEXT__'+step.id,'pending',step.id,'SIGUIENTE'):(steps[i+1]?.id||addNode('__END__','end')));
      edge(step.id,next);
    }
  });
  // Keep both actual routes and reconvergences, with depth on the horizontal x axis.
  // A previously visited node is never traversed again, so loops cannot hang layout.
  const depth=new Map([['__START__',0]]),q=['__START__'];
  while(q.length){const from=q.shift(),d=depth.get(from);
    edges.filter(x=>x.from===from).forEach(x=>{if(!depth.has(x.to)){depth.set(x.to,d+1);q.push(x.to)}});
  }
  nodes.forEach(n=>{if(!depth.has(n.id))depth.set(n.id,Math.max(...depth.values())+1)});
  const cols=new Map();nodes.forEach(n=>{const d=depth.get(n.id);if(!cols.has(d))cols.set(d,[]);cols.get(d).push(n)});
  const incoming=id=>edges.find(x=>x.to===id)?.label||'';
  const maxRows=Math.max(1,...Array.from(cols.values(),a=>a.length));
  const positions=new Map();
  cols.forEach((list,col)=>{
    list.sort((a,b)=>({SÍ:-1,NO:1}[incoming(a.id)]||0)-({SÍ:-1,NO:1}[incoming(b.id)]||0));
    list.forEach((n,i)=>{const row=list.length===1?Math.max(1,Math.ceil(maxRows/2)):Math.round(i*(maxRows-1)/(list.length-1))+1;positions.set(n.id,{row,col:col+1})});
  });
  // Fin is a shared sink even if a branch completes before the other.
  const end=positions.get('__END__'),endCol=Math.max(...Array.from(positions.entries()).filter(([id])=>id!=='__END__').map(([,p])=>p.col))+1;
  if(end)positions.set('__END__',{row:Math.ceil(maxRows/2),col:endCol});
  const maxCols=Math.max(endCol,...Array.from(positions.values(),p=>p.col));
  return {nodes,edges,cols:maxCols,rows:maxRows,positions};
}
function graphNodeCard(e,s,i,fr,tab='cliente'){
  const decision=processDecisionStep(s),steps=activeSteps(e);
  const frOn=fr.filter(f=>normalizeArray(f.affected_steps).includes(s.id));
  const risks=(e.risks||[]),riskOn=risks.filter(r=>normalizeArray(r.step_ids).includes(s.id));
  const economics=e.economicInputs||[],money=economics.filter(x=>normalizeArray(x.step_ids).includes(s.id));
  const dest=id=>id==='__END__'?'Fin del proceso':(steps.find(x=>x.id===id)?.step_name||'Destino pendiente');
  const actions='<div class="flow-step-tools">'
    +'<button type="button" data-move-step-up="'+attr(s.id)+'" '+(i===0?'disabled':'')+'>←</button>'
    +'<button type="button" data-move-step-down="'+attr(s.id)+'" '+(i===steps.length-1?'disabled':'')+'>→</button>'
    +'<button type="button" data-edit-step="'+attr(s.id)+'">Editar</button>'
    +'<button type="button" class="danger-text" data-delete-step="'+attr(s.id)+'">Eliminar</button></div>';
  const route=decision?'<div class="graph-route-controls">'
    +'<button type="button" class="route-yes" data-graph-edit-route="'+attr(s.id)+'" data-graph-route-kind="yes"><b>SÍ</b><span>Continúa en '+esc(dest(s.normal_next_step))+'</span></button>'
    +'<button type="button" class="route-no" data-graph-edit-route="'+attr(s.id)+'" data-graph-route-kind="no"><b>NO</b><span>Continúa en '+esc(dest(s.exception_path?.destination_step))+'</span></button></div>':'';
  const layerAction=tab==='fricciones'?'<button type="button" data-add-friction-step="'+attr(s.id)+'">+ Añadir fricción</button>':
    tab==='riesgos'?'<button type="button" data-add-risk-step="'+attr(s.id)+'">+ Añadir riesgo</button>':
    tab==='impacto'?'<button type="button" data-add-economic-step="'+attr(s.id)+'">+ Añadir impacto</button>':'';
  return '<div class="flow-step graph-flow-step '+(decision?'is-decision ':'')+(processLayerState(e).map?'confirmed':'')+'" data-drag-step="'+attr(s.id)+'">'
    +actions+'<span class="boundary-kicker">'+(decision?'Decisión':'Paso '+(i+1))+'</span><h4>'+esc(s.step_name||'Paso sin nombre')+'</h4>'
    +'<p>'+esc(labelFrom('OS_ACTOR_ROLE',s.actor)||'—')+' · '+esc(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—')+'</p>'
    +(num(s.active_time)?'<p>'+num(s.active_time)+' min trabajo</p>':'')
    +(decision?'<p class="decision-route-label">Elige qué ocurre en cada respuesta. Las líneas muestran dónde continúa cada ruta.</p>':'')
    +route+'<div class="process-node-links">'
    +frOn.map(x=>'<button type="button" class="friction-badge" data-edit-friction="'+attr(x.id)+'">Fricción · '+esc(labelFrom('OS_FRICTION_TYPE',x.friction_type))+'</button>').join('')
    +riskOn.map(x=>'<button type="button" class="risk-badge" data-edit-risk-index="'+risks.indexOf(x)+'">Riesgo · '+esc(x.description||x.category)+'</button>').join('')
    +money.map(x=>'<button type="button" class="economic-badge" data-edit-economic-index="'+economics.indexOf(x)+'">Impacto · '+esc(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id)+'</button>').join('')
    +'</div>'+(layerAction?'<div class="process-node-actions">'+layerAction+'</div>':'')+'</div>';
}
function processGraphHtml(e,steps,fr,start,finish,tab='cliente'){
  const model=processGraphData(e,steps),cell=n=>{
    const p=model.positions.get(n.id),style='style="grid-row:'+p.row+';grid-column:'+p.col+'"',id='data-graph-node="'+attr(n.id)+'"';
    let html='';
    if(n.kind==='start')html=flowBoundaryNode('start',start);
    else if(n.kind==='end')html=flowBoundaryNode('end',finish);
    else if(n.kind==='pending')html='<button type="button" class="graph-route-pending" data-graph-edit-route="'+attr(n.parent)+'" data-graph-route-kind="'+(n.route==='NO'?'no':'yes')+'"><b>'+esc(n.route)+'</b><span>Seleccionar el siguiente paso</span></button>';
    else {const step=steps.find(x=>x.id===n.id);html=graphNodeCard(e,step,steps.indexOf(step),fr,tab);}
    return '<div class="process-graph-cell" '+style+' '+id+'>'+html+'</div>';
  };
  return '<div class="flow-canvas client-process-canvas process-graph-canvas"><div class="process-graph-board" style="--graph-cols:'+model.cols+';--graph-rows:'+model.rows+'" data-graph-edges="'+attr(JSON.stringify(model.edges))+'">'
    +'<svg class="process-graph-lines" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>'
    +model.nodes.map(cell).join('')+'</div></div>';
}
function drawProcessGraph(){
  if(typeof document==='undefined'||typeof document.querySelector!=='function')return;
  const board=document.querySelector('.process-graph-board');if(!board)return;
  const svg=board.querySelector('.process-graph-lines');if(!svg)return;
  const ns='http://www.w3.org/2000/svg',rect=board.getBoundingClientRect(),els=new Map();
  board.querySelectorAll('[data-graph-node]').forEach(el=>els.set(el.dataset.graphNode,el));
  const edges=JSON.parse(board.dataset.graphEdges||'[]');
  svg.setAttribute('viewBox','0 0 '+board.scrollWidth+' '+board.scrollHeight);
  svg.innerHTML='<defs><marker id="auneaGraphArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#718e80"/></marker></defs>';
  edges.forEach(edge=>{
    const a=els.get(edge.from),b=els.get(edge.to);if(!a||!b)return;
    const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
    const forward=br.left>ar.right+6;
    let x1=ar.right-rect.left,y1=ar.top+ar.height/2-rect.top;
    let x2=br.left-rect.left,y2=br.top+br.height/2-rect.top;
    let d;
    if(forward){const xm=x1+Math.max(18,(x2-x1)/2);d='M'+x1+' '+y1+'H'+xm+'V'+y2+'H'+(x2-5);}
    else{const y=Math.max(12,Math.min(y1,y2)-55);x1=ar.left+ar.width/2-rect.left;y1=ar.top-rect.top;x2=br.left+br.width/2-rect.left;y2=br.top-rect.top;d='M'+x1+' '+y1+'V'+y+'H'+x2+'V'+(y2-5);}
    const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class','graph-path '+(edge.label==='NO'?'graph-path-alternative':''));path.setAttribute('marker-end','url(#auneaGraphArrow)');svg.appendChild(path);
    if(edge.label){const text=document.createElementNS(ns,'text');text.textContent=edge.label;text.setAttribute('class','graph-path-label');text.setAttribute('x',String(forward?x1+12:x1+9));text.setAttribute('y',String(forward?y1-9:y1-9));svg.appendChild(text);}
  });
}
if(typeof window!=='undefined'&&!window.__auneaProcessGraphResize){
  window.__auneaProcessGraphResize=true;window.addEventListener('resize',()=>drawProcessGraph());
}

/* [AUNEA-FE-PROC-GRAPH-035] END */
function clientLayerBody(e,steps,fr,tab){
  const start=processBoundaryValue(e,'DF014','Límite inicial pendiente','DF012'),finish=processBoundaryValue(e,'DF015','Límite final pendiente','DF013');
  const flow=steps.some(processDecisionStep)?processGraphHtml(e,steps,fr,start,finish,tab):`<div class="flow-canvas client-process-canvas"><div class="flow-track">${flowBoundaryNode('start',start)}${flowIntermediateNodes(e,steps,fr,tab)}<div class="flow-connector"><button type="button" class="flow-insert" data-add-after="${steps.at(-1)?.id||''}">+</button></div>${flowBoundaryNode('end',finish)}</div></div>`;
  if(tab==='fricciones')return flow+frictionsEditor(e,steps,fr);
  if(tab==='riesgos')return flow+riskBuilder(e);
  if(tab==='impacto')return flow+economicBuilder(e);
  return flow+`<div class="client-map-actions"><button class="btn btn-primary" id="addStepFromClient">Añadir paso</button><button class="btn btn-outline" id="addDecisionFromClient">Añadir decisión</button><button class="btn btn-outline" id="useProcessTemplate">Casos de referencia</button></div>`;
}
function clientProcessView(e,steps,fr,tab='cliente'){
  const riskCount=(e.risks||[]).length,econCount=(e.economicInputs||[]).length,company=(typeof companyById==='function'?companyById(e.companyId)?.name:'')||e.answers?.DF001||'Empresa',processName=e.answers?.DF011||e.processName||'Proceso sin nombre';
  const clientBar=`<div class="client-process-topbar"><img src="./assets/brand/Logo.png" alt="AUNEA"><div class="client-process-context"><span>${esc(company)}</span><b>${esc(processName)}</b></div><div class="client-process-state"><span>Sesión de diagnóstico</span><b>Editor compartido</b></div></div>`;
  
  // [AUNEA-FE-PROC-LAYERS-045] START — Continuous client journey on one AS-IS
  const stages=[
    {tab:'cliente',title:'Pasos',hint:steps.length+' registrados',done:!!processLayerState(e).map},
    {tab:'fricciones',title:'Fricciones',hint:fr.length+' vinculadas',done:!!processLayerState(e).frictions},
    {tab:'riesgos',title:'Riesgos',hint:riskCount+' registrados',done:!!processLayerState(e).risks},
    {tab:'impacto',title:'Impacto',hint:econCount+' medidos',done:!!processLayerState(e).impact}
  ];
  const sequence='<nav class="client-process-sequence" aria-label="Secuencia incremental del diagnóstico">'
    +stages.map((x,i)=>'<button type="button" class="client-sequence-stage '+(tab===x.tab?'active ':'')+(x.done?'complete':'')+'" data-process-tab="'+x.tab+'" aria-current="'+(tab===x.tab?'step':'false')+'"><span class="sequence-number">'+(i+1)+'</span><span class="sequence-copy"><b>'+x.title+'</b><small>'+x.hint+'</small></span></button>').join('')+'</nav>';
  const upstream=tab==='fricciones'?steps.length+' pasos disponibles para vincular fricciones':
    tab==='riesgos'?fr.length+' fricciones registradas · los riesgos se asocian a sus pasos afectados':
    tab==='impacto'?fr.length+' fricciones y '+riskCount+' riesgos en el mismo mapa; sólo cuantifica importes acreditados':
    'Construye la secuencia y configura las bifurcaciones reales del proceso';
  const lineage='<div class="client-process-lineage"><b>Contexto heredado</b><span>'+esc(upstream)+'</span></div>';
  const nextIndex=stages.findIndex(x=>x.tab===tab)+1,next=stages[nextIndex];
  const nextAction=next?'<button class="btn btn-outline client-process-next" type="button" data-process-tab="'+next.tab+'">Continuar a '+next.title+' →</button>':'';
// [AUNEA-FE-PROC-LAYERS-045] END
  const layerRail=`<aside class="client-process-layer-rail" aria-label="Capas del diagnóstico"><div class="client-rail-title">Capas del diagnóstico</div><button class="btn btn-outline" type="button" id="closeClientProcessEditor">← Volver a la consola</button>
    <button class="client-rail-item ${tab==='cliente'?'active':''}" data-process-tab="cliente"><b>Mapa del proceso</b><span>${steps.length} paso(s)</span></button>
    <button class="client-rail-item ${tab==='fricciones'?'active':''}" data-process-tab="fricciones"><b>Fricciones y evidencia</b><span>${fr.length}</span></button>
    <button class="client-rail-item ${tab==='riesgos'?'active':''}" data-process-tab="riesgos"><b>Riesgos y controles</b><span>${riskCount}</span></button>
    <button class="client-rail-item ${tab==='impacto'?'active':''}" data-process-tab="impacto"><b>Impacto económico</b><span>${econCount}</span></button></aside>`;
  const key=processLayerKeySafe(tab),layer=processLayerState(e),labels={map:'mapa AS-IS',frictions:'fricciones y evidencia',risks:'riesgos y controles',impact:'impacto económico'},done=!!layer[key];
  const confirm=`<div class="flow-confirm"><div><b>${done?'Capa confirmada':'Confirmación pendiente'}</b><div class="field-help">${esc(labels[key])}</div></div><button class="btn ${done?'btn-outline':'btn-primary'}" id="confirmAsIs">${done?'Reconfirmar':'Confirmar'} ${esc(labels[key])}</button></div>`;
  return section('Editor con cliente','Mapa, fricciones, riesgos e impacto se editan sobre el mismo contexto.',clientBar+`<div class="client-process-workspace" data-process-engagement="${attr(e.id)}">${layerRail}<div class="client-process-main">${sequence}${lineage}${clientLayerBody(e,steps,fr,tab)}${confirm}${nextAction}</div></div>`);
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
// [AUNEA-FE-ASIS-UX-072] START — One map and four private consultant lists.
// This is presentation-only over the same Engagement, Step, Friction, Risk and EconomicInput records.
// Source: DEC-050/063/064/065/068 and UX simplification 2026-09-30 (REVIEW).
function asisOverview(e,steps,fr){
  const ans=e.answers||{},value=(id,unit='')=>ans[id]===undefined||ans[id]===null||ans[id]===''?'Pendiente':esc(formatContextValue(schema.fields.find(f=>f.Field_ID===id)||{},ans[id]))+unit;
  return '<div class="asis-facts">'
    +'<div><small>Proceso</small><b>'+value('DF011')+'</b></div>'
    +'<div><small>Empieza cuando</small><b>'+value('DF014')+'</b></div>'
    +'<div><small>Termina cuando</small><b>'+value('DF015')+'</b></div>'
    +'<div><small>Volumen habitual</small><b>'+value('DF021')+' · '+value('DF022')+'</b></div>'
    +'<div><small>Volumen máximo declarado</small><b>'+value('DF023')+'</b></div>'
    +'<div><small>Tiempo objetivo</small><b>'+value('DF025')+'</b></div>'
    +'<div><small>Duración habitual declarada</small><b>'+value('DF026')+'</b></div>'
    +'<div><small>Registrados</small><b>'+steps.length+' pasos · '+fr.length+' problemas · '+(e.risks||[]).length+' riesgos · '+(e.economicInputs||[]).length+' impactos</b></div>'
    +'</div>';
}
function asisMapPage(e,steps,fr){
  const flow=sessionCanvas(clientProcessMap(e),false);
  return '<div data-process-engagement="'+attr(e.id)+'">'+asisOverview(e,steps,fr)
    +'<div class="asis-map-hint">Este es el proceso que estamos analizando. Para añadir, editar o eliminar elementos, utiliza las cuatro opciones del menú de la izquierda.</div>'
    +flow+'</div>';
}
function processPage(){
  const e=currentEng();if(!e)return pageTop('Mapa AS-IS','Abre un estudio para ver su proceso.');
  const steps=activeSteps(e),fr=activeFrictions(e);
  // The client-first editor is the existing consultant-owned surface, not the read-only #session projection.
  if(isProcessEditorWindow())return clientProcessView(e,steps,fr,e.processTab||'cliente');
  const top='<button class="btn btn-primary" id="openSessionDisplayFromProcess">Vista con cliente ↗</button>';
  return pageTop('Mapa AS-IS','Lo que sabemos del proceso actual, todo en un mismo mapa.',top)
    +asisMapPage(e,steps,fr);
}
function consultantLayerPage(title,intro,body,layer){
  const e=currentEng();if(!e)return pageTop(title,'Abre primero un estudio.');
  const done=!!processLayerState(e)[layer],tabs={map:'Mapa AS-IS',frictions:'Fricciones',risks:'Riesgos',impact:'Impacto'};
  const confirm='<div class="flow-confirm"><div><b>'+(done?'Revisión confirmada':'Revisión pendiente')+'</b><div class="field-help">Puedes guardar y continuar sin confirmar todavía.</div></div><button class="btn '+(done?'btn-outline':'btn-primary')+'" data-confirm-process-layer="'+layer+'">'+(done?'Volver a confirmar':'Confirmar')+' '+tabs[layer]+'</button></div>';
  return pageTop(title,intro,'<button class="btn btn-outline" data-page="proceso">← Ver mapa AS-IS</button>')+body+confirm;
}
function consultantStepsPage(){
  const e=currentEng();return consultantLayerPage('Pasos','Añade, edita o elimina las actividades reales del proceso.',stepsEditor(e,activeSteps(e),activeFrictions(e)),'map');
}
function consultantFrictionsPage(){
  const e=currentEng();return consultantLayerPage('Fricciones','Registra los problemas de los pasos y su evidencia.',frictionsEditor(e,activeSteps(e),activeFrictions(e)),'frictions');
}
function consultantRisksPage(){
  const e=currentEng();return consultantLayerPage('Riesgos','Qué podría salir mal y qué controles existen hoy.',riskBuilder(e),'risks');
}
function consultantImpactPage(){
  const e=currentEng();return consultantLayerPage('Impacto','Consulta los datos existentes y añade sólo los costes o tiempos que falten.',economicBuilder(e),'impact');
}
// [AUNEA-FE-ASIS-UX-072] END

function flowReview(e,steps,fr){return clientProcessView(e,steps,fr)}

const __auneaNoReaskBindForms=bindForms;
bindForms=function(){
  __auneaNoReaskBindForms();
  document.querySelectorAll('[data-add-friction-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();openFrictionModal(null,[b.dataset.addFrictionStep])});
  document.querySelectorAll('[data-add-risk-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addRisk([b.dataset.addRiskStep])});
  document.querySelectorAll('[data-add-economic-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addEconomic([b.dataset.addEconomicStep])});
  document.querySelectorAll('[data-move-step-up]').forEach(b=>b.onclick=()=>moveStep(b.dataset.moveStepUp,-1));
  document.querySelectorAll('[data-move-step-down]').forEach(b=>b.onclick=()=>moveStep(b.dataset.moveStepDown,1));
  document.querySelectorAll('[data-fr-other-toggle]').forEach(el=>el.addEventListener('change',()=>{const targetId=el.dataset.frOtherToggle,wrap=document.querySelector(`[data-fr-other-wrap="${targetId}"]`);if(!wrap)return;wrap.style.display=el.checked?'':'none';if(!el.checked){const input=document.getElementById(targetId);if(input)input.value=''}}));
  document.querySelectorAll('[data-edit-friction]').forEach(b=>b.onclick=()=>{if(isProcessEditorWindow()){currentEng().processTab='fricciones';render()}openFrictionModal(b.dataset.editFriction)});
  const pTpl=document.getElementById('useProcessTemplate');if(pTpl)pTpl.onclick=openProcessTemplatePicker;
  const sTpl=document.getElementById('addStepTemplate');if(sTpl)sTpl.onclick=openStepTemplatePicker;
  const addClient=document.getElementById('addStepFromClient');if(addClient)addClient.onclick=()=>openStepModal();
  const addDecision=document.getElementById('addDecisionFromClient');if(addDecision)addDecision.onclick=addDecisionStep;
  const addMany=document.getElementById('addMultipleSteps');if(addMany)addMany.onclick=()=>addMultipleSteps();
  const addFriction=document.getElementById('addFriction');if(addFriction)addFriction.onclick=ev=>{ev.preventDefault();ev.stopPropagation();openFrictionModal()};
  const addRiskBtn=document.getElementById('addRisk');if(addRiskBtn)addRiskBtn.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addRisk()};
  const addEconomicBtn=document.getElementById('addEconomic');if(addEconomicBtn)addEconomicBtn.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addEconomic()};
  document.querySelectorAll('[data-edit-risk-index]').forEach(b=>b.onclick=()=>{if(isProcessEditorWindow()){currentEng().processTab='riesgos';render()}addRisk([],Number(b.dataset.editRiskIndex))});
  document.querySelectorAll('[data-delete-risk-index]').forEach(b=>b.onclick=()=>deleteRisk(Number(b.dataset.deleteRiskIndex)));
  document.querySelectorAll('[data-edit-economic-index]').forEach(b=>b.onclick=()=>{if(isProcessEditorWindow()){currentEng().processTab='impacto';render()}addEconomic([],Number(b.dataset.editEconomicIndex))});
  document.querySelectorAll('[data-delete-economic-index]').forEach(b=>b.onclick=()=>deleteEconomic(Number(b.dataset.deleteEconomicIndex)));
  const share=document.getElementById('openSessionDisplayFromProcess');if(share)share.onclick=()=>openProcessEditorWindow();
  const closeClient=document.getElementById('closeClientProcessEditor');if(closeClient)closeClient.onclick=()=>closeProcessEditorWindow();
  document.querySelectorAll('[data-confirm-process-layer]').forEach(b=>b.onclick=()=>confirmProcessLayer(({map:'cliente',frictions:'fricciones',risks:'riesgos',impact:'impacto'})[b.dataset.confirmProcessLayer]));
  document.querySelectorAll('[data-add-after]').forEach(b=>b.onclick=e=>{e.stopPropagation();openStepModal(null,b.dataset.addAfter||null)});
  document.querySelectorAll('[data-delete-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();removeStepFromFlow(b.dataset.deleteStep)});
  document.querySelectorAll('[data-drag-step]').forEach(el=>{el.ondragstart=ev=>{ev.dataTransfer?.setData('text/plain',el.dataset.dragStep)};el.ondragover=ev=>ev.preventDefault();el.ondrop=ev=>{ev.preventDefault();const source=ev.dataTransfer?.getData('text/plain');if(source)reorderStepBefore(source,el.dataset.dragStep)}});
  document.querySelectorAll('[data-graph-edit-route]').forEach(b=>b.onclick=ev=>{
    ev.preventDefault();ev.stopPropagation();openStepModal(b.dataset.graphEditRoute);
    const details=[...document.querySelectorAll('.step-group')].find(x=>x.querySelector('summary')?.textContent?.includes('D. Flujo'));
    if(details){details.open=true;const dest=document.getElementById(b.dataset.graphRouteKind==='no'?'step_exc_dest':'step_next');const target=dest?.closest('.canonical-aunea-select')||details;target.scrollIntoView?.({block:'nearest',behavior:'smooth'});const dropdown=target.querySelector?.('details.aunea-select');if(dropdown)dropdown.open=true;}
  });
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(drawProcessGraph);
    document.querySelectorAll('[data-validated-case]').forEach(b=>b.onclick=()=>instantiateValidatedCase(b.dataset.validatedCase));
};
// [AUNEA-FE-PROC-EDITOR-020] END
