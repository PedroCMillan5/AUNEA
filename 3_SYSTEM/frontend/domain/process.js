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
function migrateProcessCaptureIntegrity(engagements=[]){
  let changed=0;
  (engagements||[]).forEach(e=>{
    let engagementChanged=false;
    (e.frictions||[]).forEach(f=>{
      const zeroWhen=(obj,modes)=>{if(obj&&modes.includes(String(obj.mode||''))&&Number(obj.value||0)!==0){obj.value=0;engagementChanged=true}};
      zeroWhen(f.active_time_loss,['UNKNOWN','ZERO']);
      zeroWhen(f.wait_time_loss,['UNKNOWN','ZERO']);
      zeroWhen(f.direct_loss,['UNKNOWN','NONE']);
      if(f.frequency?.mode==='percent'&&f.frequency.period){f.frequency.period='';engagementChanged=true}
    });
    if(engagementChanged){
      changed++;
      if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'frictions');
      else{e.confirmedAsIs=false;if(e.layerConfirmations){e.layerConfirmations.frictions=false;e.layerConfirmations.risks=false;e.layerConfirmations.impact=false}}
      if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'normalización de fricciones heredadas');
    }
  });
  return changed;
}
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
function selectedOtherMissingDetail(opts,selected,detail){const other=catalogOtherOption(opts);return !!other&&normalizeArray(selected).map(String).includes(String(other.value))&&!String(detail||'').trim()}

/* [AUNEA-FE-PROC-CHOICES-025] START — Preserve canonical dropdowns.
   Existing MULTICHECK and MULTISELECT options wrap horizontally; applies-to uses its original dropdown. */
/* [AUNEA-FE-PROC-CHOICES-025] END */
function processDecisionStep(s){
  return s?(typeof s._ui?.has_decision==='boolean'?s._ui.has_decision:!!(['ST04','ST05'].includes(String(s.step_type||''))||normalizeArray(s.decision_criteria).length||s.exception_path)):false;
}

// [AUNEA-FE-PROC-BRANCH-075] START — One-level decision branches.
// PURPOSE: keep a decision as one main lane plus one temporary alternative lane; nested decisions are
//          not offered inside either branch until both routes reconverge.
// SOURCE: explicit owner UAT decision 2026-10-01; DEC-050/063 ownership and ProcessStep routing model.
// INPUTS: active ProcessSteps and their normal_next_step / exception_path.destination_step.
// OUTPUTS: branch membership used only by editor constraints and graph layout; no duplicate routing data.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.
function processBranchStructure(e,steps=activeSteps(e)){
  const byId=new Map(steps.map(x=>[x.id,x])),order=new Map(steps.map((x,i)=>[x.id,i]));
  const nextOf=step=>{
    if(!step)return '__END__';
    if(step.normal_next_step==='__END__')return '__END__';
    if(byId.has(step.normal_next_step))return step.normal_next_step;
    if(processDecisionStep(step))return '';
    const i=order.get(step.id);return steps[i+1]?.id||'__END__';
  };
  const trace=start=>{
    const out=[],seen=new Set();let id=start,guard=0;
    while(id&&id!=='__END__'&&byId.has(id)&&!seen.has(id)&&guard++<steps.length+2){
      out.push(id);seen.add(id);id=nextOf(byId.get(id));
    }
    if(id==='__END__')out.push('__END__');
    return out;
  };
  const branches=[],branchStepIds=new Set();
  steps.filter(processDecisionStep).forEach(decision=>{
    const yesStart=decision.normal_next_step==='__END__'?'__END__':(byId.has(decision.normal_next_step)?decision.normal_next_step:'');
    const rawNo=decision.exception_path?.destination_step;
    const noStart=rawNo==='__END__'?'__END__':(byId.has(rawNo)?rawNo:'');
    if(!yesStart||!noStart)return;
    const yesTrace=trace(yesStart),noTrace=trace(noStart),noSet=new Set(noTrace);
    const merge=yesTrace.find(id=>noSet.has(id))||'__END__';
    const beforeMerge=arr=>{const i=arr.indexOf(merge);return (i<0?arr:arr.slice(0,i)).filter(id=>id!=='__END__')};
    const yesSteps=beforeMerge(yesTrace),noSteps=beforeMerge(noTrace);
    yesSteps.forEach(id=>branchStepIds.add(id));noSteps.forEach(id=>branchStepIds.add(id));
    branches.push({decisionId:decision.id,yesSteps,noSteps,merge});
  });
  return {branches,branchStepIds,nextOf};
}
function processStepInsideBranch(e,stepId){
  return !!stepId&&processBranchStructure(e).branchStepIds.has(stepId);
}
// [AUNEA-FE-PROC-BRANCH-075] END

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
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),existing=stepId?e.processSteps.find(x=>x.id===stepId):null;
  const base={id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0};
  const s=stepMeta(existing?structuredClone(existing):{...base,...(preset||{}),_ui:{...(preset?._ui||{})}});
  const stepTypes=fieldOptions('OS_STEP_TYPE'),artifacts=fieldOptions('OS_ARTIFACT_TYPE'),decisions=fieldOptions('OS_DECISION_CRITERIA'),manual=fieldOptions('OS_MANUAL_ACTION'),auto=fieldOptions('OS_AUTOMATION_STATE'),channels=fieldOptions('OS_COMM_CHANNEL'),evid=fieldOptions('OS_EVIDENCE_TYPE');
  const decisionOther=catalogOtherOption(decisions),decisionOtherOpen=!!decisionOther&&normalizeArray(s.decision_criteria).map(String).includes(String(decisionOther.value));
  const existingDecision=processDecisionStep(s);
  const decisionBlocked=(!existingDecision&&existing?.id&&processStepInsideBranch(e,existing.id))||(!existingDecision&&linkFromStepId&&processStepInsideBranch(e,linkFromStepId));
  const hasDecision=decisionBlocked?false:existingDecision;
  s._ui.has_decision=hasDecision;
  const decisionSelector=decisionBlocked
    ?'<div class="branch-decision-blocked"><b>No disponible en una rama</b><span>Este paso ya está dentro de una bifurcación. Para abrir otra, las rutas anteriores deben volver a unirse primero.</span></div>'
    :'<div class="segmented"><button type="button" class="segment '+(hasDecision?'active':'')+'" data-step-decision-flag="1" data-value="YES">Sí</button><button type="button" class="segment '+(!hasDecision?'active':'')+'" data-step-decision-flag="1" data-value="NO">No</button></div>';
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
    <div class="field"><label>Error / repetición</label><div class="compound-control"><input id="step_error" type="number" min="0" step="any" value="${attr(s.error_rate&&typeof s.error_rate==='object'?s.error_rate.value:(s.error_rate||''))}" placeholder="5">${auneaDropdownControl('step_error_mode',[{value:'percent',label:'%'},{value:'count',label:'casos'}],s.error_rate?.mode||'percent','Unidad')}<span data-step-error-period-wrap${(s.error_rate?.mode||'percent')==='count'?'':' style="display:none"'}>${auneaDropdownControl('step_error_period',[{value:'',label:'Selecciona periodo…'},{value:'day',label:'por día'},{value:'week',label:'por semana'},{value:'month',label:'por mes'},{value:'year',label:'por año'}],s.error_rate?.period||'','Periodo')}</span></div><div class="field-help">Con % se interpreta como proporción de casos y no lleva periodo. Si eliges casos, indica también el periodo.</div></div>
  </div></details>
  <details class="step-group"><summary>D. Flujo y decisiones</summary><div class="form-grid">
    <div class="field full"><label>¿Este paso incluye una decisión o bifurcación?</label>${decisionSelector}</div>
    <div class="field full"><div class="decision-route-card route-yes"><div class="decision-route-head"><b data-step-next-label>${hasDecision?'Ruta SÍ / afirmativa':'Siguiente paso normal'}</b><span>${hasDecision?'Cuando se cumple la condición principal':'Continuación del flujo'}</span></div><label>Destino ${hasDecision?requiredMark():''}</label>${auneaDropdownControl('step_next',decisionDestinationOptions(e,s),s.normal_next_step||'','Selecciona destino…')}</div></div>
    <div class="field full" data-step-decision-area${hasDecision?'':' style="display:none"'}><label>Criterios de decisión</label>${selectedHtml('step_decisions',decisions,s.decision_criteria)}${!existing&&normalizeArray(e.answers?.DF020).length?'<div class="field-help">Preselección sugerida desde las variantes declaradas en Alcance del proceso. Puedes ajustarla durante la validación del AS-IS.</div>':''}<div class="detail-wrap"><label>Condición principal</label><input id="step_decisions_detail" value="${attr(s._details.decision_criteria||'')}" placeholder="Ej. Importe > 1.500 € o existe una discrepancia"><div class="field-help">Regla concreta que activa la ruta SÍ / afirmativa.</div></div></div>
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
    const occurrenceRaw=document.getElementById('step_occ').value,occurrence=occurrenceRaw===''?1:Number(occurrenceRaw);s.step_name=document.getElementById('step_name').value.trim();s.step_type=document.getElementById('step_type').value;s.actor=resolveCatalogInput(document.getElementById('step_actor'));s.tool=resolveCatalogInput(document.getElementById('step_tool'));s.occurrences_per_case=occurrence;
    const am=document.getElementById('step_applies_mode').value,av=document.getElementById('step_applies_value').value.trim();s.applies_to={mode:am,value:am==='PERCENT'?av:'',condition:am==='CONDITION'?av:''};
    if(decisionBlocked&&s._ui.has_decision===true&&!existingDecision)return toast('No se puede crear otra bifurcación dentro de una rama. Une primero las rutas anteriores.');
    const collect=k=>[...document.querySelectorAll(`[data-v1-multi="${k}"]:checked`)].map(x=>x.value);s.inputs=collect('step_inputs');s.outputs=collect('step_outputs');s.manual_actions=collect('step_manual');s.communication_channels=collect('step_channels');s.evidence=collect('step_evidence');const hasDecisionNow=s._ui.has_decision===true;s.decision_criteria=hasDecisionNow?collect('step_decisions'):[];
    s._details.inputs=document.getElementById('step_inputs_detail')?.value.trim()||'';s._details.outputs=document.getElementById('step_outputs_detail')?.value.trim()||'';s._details.decision_criteria=hasDecisionNow?(document.getElementById('step_decisions_detail')?.value.trim()||''):'';s._details.communication_channels=document.getElementById('step_channels_other')?.value.trim()||'';s._details.manual_actions=s.manual_actions.some(x=>String(x).toUpperCase()==='OTHER')?(document.getElementById('step_manual_other')?.value.trim()||''):'';
    s._ui.active_unit=document.getElementById('step_active_unit').value;s._ui.wait_unit=document.getElementById('step_wait_unit').value;s._ui.rework_unit=document.getElementById('step_rework_unit').value;s.active_time=minutesFrom(document.getElementById('step_active').value,s._ui.active_unit);s.wait_time=minutesFrom(document.getElementById('step_wait').value,s._ui.wait_unit);s.rework_time=minutesFrom(document.getElementById('step_rework').value,s._ui.rework_unit);
    const errorMode=document.getElementById('step_error_mode').value,errorPeriod=document.getElementById('step_error_period').value;
    s.error_rate={value:Number(document.getElementById('step_error').value||0),mode:errorMode,period:errorMode==='count'?errorPeriod:''};
    const nextVal=document.getElementById('step_next').value;
    const et=document.getElementById('step_exc_type').value,ec=document.getElementById('step_exc_condition').value.trim(),ed=document.getElementById('step_exc_dest').value,eo=resolveCatalogInput(document.getElementById('step_exc_owner'));
    if(!s.step_name||s.step_name.length<3||!s.step_type||!s.actor)return toast('Nombre (mín. 3 caracteres), tipo y responsable son obligatorios.');
    if(!Number.isFinite(s.occurrences_per_case)||s.occurrences_per_case<0)return toast('Veces por caso debe ser un número igual o mayor que 0.');
    if([s.active_time,s.wait_time,s.rework_time].some(v=>!Number.isFinite(Number(v))||Number(v)<0))return toast('Los tiempos del paso deben ser valores iguales o mayores que 0.');
    if(am==='PERCENT'&&(av===''||!Number.isFinite(Number(av))||Number(av)<0||Number(av)>100))return toast('Indica un porcentaje válido entre 0 y 100.');
    if(am==='CONDITION'&&!av)return toast('Describe la condición observable cuando el paso no aplica a todos los casos.');
    if(s.error_rate.mode==='percent'&&(s.error_rate.value<0||s.error_rate.value>100))return toast('El porcentaje de error o repetición debe estar entre 0 y 100.');
    if(s.error_rate.mode==='count'&&s.error_rate.value>0&&!s.error_rate.period)return toast('Si el error se registra en casos, indica también el periodo.');
    if(selectedOtherMissingDetail(artifacts,s.inputs,s._details.inputs)||selectedOtherMissingDetail(artifacts,s.outputs,s._details.outputs)||selectedOtherMissingDetail(manual,s.manual_actions,s._details.manual_actions)||selectedOtherMissingDetail(channels,s.communication_channels,s._details.communication_channels))return toast('Completa el detalle de cada opción «Otro» seleccionada.');
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
  const stepErrorMode=document.getElementById('step_error_mode');
  if(stepErrorMode)stepErrorMode.addEventListener('change',()=>{
    const wrap=document.querySelector('[data-step-error-period-wrap]');
    if(wrap)wrap.style.display=stepErrorMode.value==='count'?'':'none';
  });
  document.querySelectorAll('[data-step-auto]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-step-auto]').forEach(x=>x.classList.remove('active'));b.classList.add('active');s.automation_state=b.dataset.value});
  document.querySelectorAll('[data-step-decision-flag]').forEach(b=>b.onclick=()=>{s._ui.has_decision=b.dataset.value==='YES';document.querySelectorAll('[data-step-decision-flag]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-step-decision-area]').forEach(x=>x.style.display=s._ui.has_decision?'':'none');const label=document.querySelector('[data-step-next-label]');if(label)label.textContent=s._ui.has_decision?'Ruta SÍ / afirmativa':'Siguiente paso normal'});
  document.querySelectorAll('[data-catalog-reference]').forEach(el=>el.addEventListener('change',()=>{const otherValue=String(el.dataset.otherValue||'__OTHER__'),wrap=document.querySelector(`[data-catalog-other-wrap="${el.dataset.catalogReference}"]`);if(wrap)wrap.style.display=String(el.value)===otherValue?'':'none';if(String(el.value)!==otherValue){const other=document.getElementById(`${el.id}_other`);if(other)other.value=''}}));
  document.querySelectorAll('[data-v1-other-toggle]').forEach(el=>el.addEventListener('change',()=>{
    const key=el.dataset.v1OtherToggle,wrap=document.querySelector(`[data-v1-other-wrap="${key}"]`);
    if(!wrap)return;
    wrap.style.display=el.checked?'':'none';
    if(!el.checked){const input=wrap.querySelector('input,textarea');if(input)input.value=''}
  }));
}

function frictionNumberControl(id,obj,kind='number'){
  const p=obj&&typeof obj==='object'?obj:{value:obj||'',unit:'',period:'',mode:''};
  if(kind==='time')return timeControl(id,p.value||0,p.unit||'min',true);
  const periods=[{value:'',label:'Selecciona periodo…'},{value:'day',label:'por día'},{value:'week',label:'por semana'},{value:'month',label:'por mes'},{value:'year',label:'por año'}];
  if(kind==='money')return `<div class="compound-control"><input id="${id}" type="number" min="0" step="any" value="${attr(p.value||'')}" placeholder="0"><span class="unit-label">€</span>${auneaDropdownControl(id+'_period',periods,p.period||'','Periodo')}${auneaDropdownControl(id+'_mode',[{value:'',label:'Dato disponible'},{value:'NONE',label:'No aplica'},{value:'UNKNOWN',label:'No disponible'}],p.mode||'','Estado')}</div>`;
  const mode=p.mode||'percent',period=p.period||'';
  return `<div class="compound-control friction-frequency-control" data-fr-frequency-control="${id}">
    <input id="${id}" type="number" min="0" step="any" value="${attr(p.value||'')}" placeholder="0">
    ${auneaDropdownControl(id+'_mode',[{value:'percent',label:'%'},{value:'count',label:'casos'}],mode,'Unidad')}
    <span class="unit-label" data-fr-frequency-percent-suffix${mode==='percent'?'':' style="display:none"'}>de los casos</span>
    <span data-fr-frequency-period-wrap${mode==='count'?'':' style="display:none"'}>${auneaDropdownControl(id+'_period',periods,period,'Periodo')}</span>
  </div>`;
}
function bindFrictionFrequencyControl(id='fr_frequency'){
  const mode=document.getElementById(id+'_mode'),period=document.getElementById(id+'_period');
  const box=typeof document.querySelector==='function'?document.querySelector('[data-fr-frequency-control="'+id+'"]'):null;
  const suffix=box?.querySelector('[data-fr-frequency-percent-suffix]'),periodWrap=box?.querySelector('[data-fr-frequency-period-wrap]');
  if(!mode||!box||typeof mode.addEventListener!=='function')return;
  const sync=()=>{
    const isPercent=mode.value==='percent';
    if(suffix)suffix.style.display=isPercent?'':'none';
    if(periodWrap)periodWrap.style.display=isPercent?'none':'';
  };
  mode.addEventListener('change',sync);sync();
}
let __auneaPainCandidates=[];
async function reviewPainCandidates(){
  const e=currentEng();if(!e||typeof fetchPainCandidates!=='function')return toast('La revisión de señales no está disponible.');
  try{
    const r=await fetchPainCandidates(e),steps=activeSteps(e);__auneaPainCandidates=normalizeArray(r?.candidates);
    const body=__auneaPainCandidates.length?'<div class="notice info"><b>Señales para revisar, no fricciones confirmadas.</b><p>Nada se crea hasta que revises y guardes una fricción.</p></div><div class="result-list">'+__auneaPainCandidates.map((x,i)=>'<div class="result-item"><div class="result-item-head"><div><b>'+esc(labelFrom('OS_FRICTION_TYPE',x.pain_id)||x.pain_id)+'</b><p>'+esc(x.rationale||'')+'</p><p>Pasos: '+normalizeArray(x.step_ids).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')+'</p></div><div class="result-actions"><button type="button" class="btn btn-small btn-primary" data-review-pain-candidate="'+i+'">Revisar</button></div></div></div>').join('')+'</div>':'<div class="empty"><h2>No hay señales nuevas</h2><p>El mapa no contiene ahora una señal estructurada suficiente para sugerir otra fricción.</p></div>';
    openModal('Posibles fricciones detectadas',body,closeModal,'Cerrar');
    document.querySelectorAll('[data-review-pain-candidate]').forEach(b=>b.onclick=()=>{const x=__auneaPainCandidates[Number(b.dataset.reviewPainCandidate)];if(x){closeModal();openFrictionModal(null,x.step_ids,x)}});
  }catch(err){toast('No se pudieron revisar las señales del mapa: '+String(err?.message||err))}
}
function openFrictionModal(frId=null,preselectedSteps=[],candidate=null){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng();if(!activeSteps(e).length)return toast('Añade al menos un paso antes de registrar una fricción.');const existing=frId?e.frictions.find(x=>x.id===frId):null;const candidateSteps=normalizeArray(candidate?.step_ids||preselectedSteps).filter(Boolean),candidateType=String(candidate?.pain_id||'');const f=frictionMeta(existing?structuredClone(existing):{id:id('FRI'),status:'ACTIVE',affected_steps:candidateSteps,friction_type:candidateType,cause:[],non_time_impact:[],workaround:[],evidence_ids:[],evidence_type:'',frequency:{},active_time_loss:{},wait_time_loss:{},direct_loss:{}});
  const types=fieldOptions('OS_FRICTION_TYPE'),causes=fieldOptions('OS_FRICTION_CAUSE'),impacts=fieldOptions('OS_SCALE_1_5'),nonTime=fieldOptions('OS_NON_TIME_IMPACT'),work=fieldOptions('OS_WORKAROUND'),evid=fieldOptions('OS_EVIDENCE_TYPE');
  // Layer 1/2 progressive disclosure: tipo/pasos/señal/contexto-impacto are what a consultant needs to
  // register a friction on the spot; causa/workaround/evidencia/resto stay available but collapsed.
  // Same field ids, same save logic — presentation-only, never a Friction Model change.
  const candidateNotice=!existing&&candidate?'<div class="notice info pain-candidate-prefill"><b>Señal detectada en el mapa — pendiente de confirmar</b><p>'+esc(candidate.rationale||'')+'</p>'+(normalizeArray(candidate.review_questions).length?'<div class="field-help"><b>Comprueba antes de guardar:</b><br>'+normalizeArray(candidate.review_questions).map(q=>'• '+esc(q)).join('<br>')+'</div>':'')+'<p class="field-help">AUNEA sólo ha preseleccionado el tipo y los pasos. Completa la señal observable, la causa y la evidencia; guardar esta ficha es la confirmación humana de la fricción.</p></div>':'';
  const body=`<div class="step-groups process-modal-form friction-modal-form">${candidateNotice}
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
  <div class="field"><label>Tipo de evidencia principal <span class="internal-tag">interno</span></label>${auneaDropdownControl('fr_evidence_type',[{value:'',label:'Selecciona…'},...evid],f.evidence_type||'','Selecciona…')}</div>
  <div class="field"><label>Tiempo asociado a la fricción</label>${frictionNumberControl('fr_active',f.active_time_loss,'time')}</div>
  <div class="field full"><label>Relación con el tiempo del paso</label>${auneaDropdownControl('fr_time_mode',[{value:'',label:'Pendiente de clasificar'},{value:'INCLUDED',label:'Incluido: ya está contabilizado en el paso'},{value:'BREAKDOWN',label:'Desglose: explica una parte del retrabajo'},{value:'ADDITIONAL',label:'Adicional: trabajo no registrado en el paso'}],f.time_attribution?.mode||'','Selecciona relación…')}<div class="field-help">Sólo Adicional podrá incrementar el esfuerzo total tras validar frecuencia y evidencia. Incluido y Desglose no se suman.</div></div>
  <div class="field full"><label>Paso responsable del tiempo</label>${auneaDropdownControl('fr_time_owner',[{value:'',label:'Selecciona un paso afectado…'},...activeSteps(e).map(s=>({value:s.id,label:s.step_name||s.id}))],f.time_attribution?.step_id||'','Selecciona paso…')}<div class="field-help">Una fricción puede afectar a varios pasos, pero su tiempo sólo tiene un propietario para evitar multiplicarlo.</div></div>
  <div class="field"><label>Espera / retraso atribuible</label>${frictionNumberControl('fr_wait',f.wait_time_loss,'time')}</div>
  <div class="field"><label>Pérdida monetaria directa</label>${frictionNumberControl('fr_direct',f.direct_loss,'money')}</div>
  <div class="field full"><label>Otros impactos</label>${selectedHtml('fr_non_time',nonTime,f.non_time_impact,{detailId:'fr_non_time_other',detailValue:f._details.non_time||'',detailPlaceholder:'Especifica el otro impacto'})}</div>
  <div class="field"><label>Prioridad cliente (cierre)</label>${auneaDropdownControl('fr_priority',[{value:'',label:'Sin priorizar'},{value:'1',label:'1 — Prioridad principal'},{value:'2',label:'2 — Segunda prioridad'},{value:'3',label:'3 — Tercera prioridad'}],f.priority_client?String(f.priority_client):'','Sin priorizar')}<div class="field-help">Ranking de cierre; top 3 recomendado por el modelo canónico.</div></div>
  <div class="field full"><label>Cómo lo describe el cliente</label><input id="fr_label" maxlength="160" value="${attr(f.client_label||'')}" placeholder="Opcional"></div>
  <div class="field full"><label>Nota excepcional</label><input id="fr_notes" maxlength="200" value="${attr(f.notes||'')}" placeholder="Sólo si los campos estructurados no bastan"></div>
  </div></details>
  </div>`;
  openModal(existing?'Editar fricción':'Añadir fricción',body,()=>{const collect=k=>[...document.querySelectorAll(`[data-v1-multi="${k}"]:checked`)].map(x=>x.value);f.friction_type=document.getElementById('fr_type').value;f.affected_steps=collect('fr_steps');f.cause=collect('fr_causes');f._details.cause=document.getElementById('fr_cause_other').value.trim();f.observable_signal=document.getElementById('fr_signal').value.trim();const frequencyMode=document.getElementById('fr_frequency_mode').value,frequencyPeriod=document.getElementById('fr_frequency_period').value;f.frequency={value:Number(document.getElementById('fr_frequency').value||0),mode:frequencyMode,period:frequencyMode==='count'?frequencyPeriod:''};f.impact=document.getElementById('fr_impact').value;
    const atUnit=document.getElementById('fr_active_unit').value,wtUnit=document.getElementById('fr_wait_unit').value,activeMode=document.getElementById('fr_active_mode').value,waitMode=document.getElementById('fr_wait_mode').value,directMode=document.getElementById('fr_direct_mode').value;f.active_time_loss={value:['UNKNOWN','ZERO'].includes(activeMode)?0:minutesFrom(document.getElementById('fr_active').value,atUnit),unit:'min',source_unit:atUnit,mode:activeMode};f.time_attribution={mode:document.getElementById('fr_time_mode').value,step_id:document.getElementById('fr_time_owner').value};f.wait_time_loss={value:['UNKNOWN','ZERO'].includes(waitMode)?0:minutesFrom(document.getElementById('fr_wait').value,wtUnit),unit:'min',source_unit:wtUnit,mode:waitMode};f.direct_loss={value:['UNKNOWN','NONE'].includes(directMode)?0:Number(document.getElementById('fr_direct').value||0),unit:'EUR',period:['UNKNOWN','NONE'].includes(directMode)?'':document.getElementById('fr_direct_period').value,mode:directMode};f.non_time_impact=collect('fr_non_time');f._details.non_time=document.getElementById('fr_non_time_other').value.trim();f.workaround=collect('fr_workaround');f._details.workaround=document.getElementById('fr_workaround_other').value.trim();f.evidence_type=document.getElementById('fr_evidence_type').value;f.priority_client=Number(document.getElementById('fr_priority').value||0)||null;f.client_label=document.getElementById('fr_label').value.trim();f.notes=document.getElementById('fr_notes').value.trim();f.derived_pain_id=painForFriction(f.friction_type);
    if(!f.friction_type||!f.affected_steps.length||(!f.cause.length&&!f._details.cause)||!f.observable_signal)return toast('Tipo, al menos un paso, causa y señal observable son obligatorios.');
    if(!Number.isFinite(f.frequency.value)||f.frequency.value<0)return toast('La frecuencia debe ser un número igual o mayor que 0.');
    if([f.active_time_loss?.value,f.wait_time_loss?.value,f.direct_loss?.value].some(v=>!Number.isFinite(Number(v))||Number(v)<0))return toast('Los tiempos y pérdidas de la fricción deben ser valores iguales o mayores que 0.');
    if(f.frequency.mode==='percent'&&(f.frequency.value<0||f.frequency.value>100))return toast('La frecuencia porcentual debe estar entre 0 y 100.');
    if(f.frequency.mode==='count'&&f.frequency.value>0&&!f.frequency.period)return toast('Si la frecuencia se registra en casos, indica también el periodo.');
    if(f.direct_loss.value>0&&!f.direct_loss.period)return toast('Si registras una pérdida monetaria directa, indica también el periodo.');
    if(selectedOtherMissingDetail(causes,f.cause,f._details.cause)||selectedOtherMissingDetail(nonTime,f.non_time_impact,f._details.non_time)||selectedOtherMissingDetail(work,f.workaround,f._details.workaround))return toast('Completa el detalle de cada opción «Otro» seleccionada.');
    if(f.active_time_loss.value>0&&(!['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(f.time_attribution.mode)||!f.affected_steps.includes(f.time_attribution.step_id)))return toast('Para atribuir el tiempo, selecciona Incluido, Desglose o Adicional y un paso afectado responsable.');if(f.active_time_loss.value===0)f.time_attribution={mode:'',step_id:''};if(existing){Object.assign(existing,f);audit(`Fricción editada ${existing.id}`)}else{e.frictions.push(f);audit(`Fricción creada ${f.id}`)}if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');invalidateProcessLayersSafe(e,'frictions');e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();render();},existing?'Guardar cambios':'Añadir fricción');
  bindFrictionFrequencyControl('fr_frequency');
  document.querySelectorAll('[data-v1-other-toggle]').forEach(el=>el.addEventListener('change',()=>{const key=el.dataset.v1OtherToggle,wrap=document.querySelector(`[data-v1-other-wrap="${key}"]`);if(!wrap)return;wrap.style.display=el.checked?'':'none';if(!el.checked){const input=wrap.querySelector('input,textarea');if(input)input.value=''}}));
}

// "Añadir varios pasos" is a normal-use convenience over the SAME model openStepModal uses for a new
// step (id/status/empty collections) — it never invents step_name/actor/step_type/tool/times/routing/
// frictions/evidence. Each created step is exactly as empty as one added individually, only technical
// id + array position (= visual numbering in the list) exist until the consultant edits it. Distinct
// from the Internal/QA stress-test tool (app-uat-fixtures-v1.js), which is not normal use.
function addMultipleSteps(){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  openModal('Añadir varios pasos',`<div class="form-grid"><div class="field full"><label>Número de pasos ${requiredMark()}</label><input id="bulk_step_count" type="number" min="1" max="50" value="5"><div class="field-help">Crea pasos vacíos, sólo con id técnico y posición. Edítalos individualmente después para darles nombre, tipo, responsable, etc.</div></div></div>`,()=>{
    const e=currentEng(),n=Math.max(1,Math.min(50,Number(document.getElementById('bulk_step_count').value||0)));
    if(!n)return toast('Indica un número de pasos válido (1-50).');
    for(let i=0;i<n;i++)e.processSteps.push({id:id('STEP'),status:'ACTIVE',occurrences_per_case:1,inputs:[],outputs:[],manual_actions:[],decision_criteria:[],communication_channels:[],evidence:[],active_time:0,wait_time:0,rework_time:0});
    audit(`${n} paso(s) vacío(s) añadidos en bloque`);if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura de proceso');invalidateProcessLayersSafe(e,'map');e.diagnosticOutput=null;e.updatedAt=now();markDirty();closeModal();render();
    toast(`${n} paso(s) añadidos. Edita cada uno para completarlo.`);
  },'Crear pasos');
}

function removeStepFromFlow(stepId){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
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
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),active=activeSteps(e),i=active.findIndex(x=>x.id===stepId),j=i+direction;
  if(i<0||j<0||j>=active.length)return;
  const ai=e.processSteps.indexOf(active[i]),aj=e.processSteps.indexOf(active[j]);
  [e.processSteps[ai],e.processSteps[aj]]=[e.processSteps[aj],e.processSteps[ai]];
  relinkNormalFlow(e);invalidateProcessLayersSafe(e,'map');markDirty(`Paso ${stepId} reordenado`);render();
}
function reorderStepBefore(stepId,targetId){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),step=e.processSteps.find(x=>x.id===stepId),target=e.processSteps.find(x=>x.id===targetId);
  if(!step||!target||step===target||step.status==='SUPERSEDED'||target.status==='SUPERSEDED')return;
  const from=e.processSteps.indexOf(step),to=e.processSteps.indexOf(target);
  e.processSteps.splice(from,1);e.processSteps.splice(from<to?to-1:to,0,step);
  relinkNormalFlow(e);invalidateProcessLayersSafe(e,'map');markDirty(`Paso ${stepId} reordenado por arrastre`);render();
}
function decisionCriteriaPresetFromScope(e){
  const map={AMOUNT:'THRESHOLD',CASE_TYPE:'CATEGORY',CUSTOMER:'CUSTOMER',REGULATION:'RISK',OTHER:'OTHER'};
  return [...new Set(normalizeArray(e?.answers?.DF020).map(v=>map[String(v)]).filter(Boolean))];
}
function addDecisionStep(){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),criteria=decisionCriteriaPresetFromScope(e);
  openStepModal(null,null,{step_name:'Decisión',step_type:'ST04',decision_criteria:criteria,_ui:{has_decision:true}});
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
  const icon=processNodeIconSvg(kind==='start'?'start':'end');
  return `<div class="flow-step flow-boundary ${kind}"><div class="process-node-heading">${icon}<div class="process-node-title"><span class="boundary-kicker">${kind==='start'?'Inicio':'Fin'}</span><h4 title="${attr(label)}">${esc(label)}</h4></div></div><p>Límite definido en Alcance del proceso</p></div>`;
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

/* [AUNEA-FE-PROC-GRAPH-035] START — Owner-safe graph projection with explicit decision convergence.
   Reads DF042 normal_next_step and DF043 exception_path.destination_step; the gateway, SÍ/NO lanes
   and solid merge point are presentation-only and never introduce a second routing owner. */
function processGraphData(e,steps){
  const byId=new Map(steps.map(s=>[s.id,s])),nodes=[{id:'__START__',kind:'start'}],edges=[];
  const addNode=(id,kind='step',parent='',route='')=>{
    if(!nodes.some(n=>n.id===id))nodes.push({id,kind,parent,route});return id;
  };
  const valid=id=>!!id&&byId.has(id),edge=(from,to,label='')=>edges.push({from,to,label});
  steps.forEach(s=>addNode(s.id));
  if(!steps.length)edge('__START__',addNode('__END__','end'));
  else edge('__START__',steps[0].id);
  steps.forEach((step,i)=>{
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

  // The SÍ/normal route is the permanent horizontal lane. A NO route temporarily occupies
  // one lower lane and must reconverge before another decision can be created.
  const main=['__START__'],seenMain=new Set(main);let cur='__START__',guard=0;
  while(guard++<nodes.length+4){
    const outgoing=edges.filter(x=>x.from===cur);
    const chosen=outgoing.find(x=>x.label==='SÍ')||outgoing.find(x=>!x.label)||outgoing[0];
    if(!chosen||seenMain.has(chosen.to))break;
    main.push(chosen.to);seenMain.add(chosen.to);
    if(chosen.to==='__END__'||String(chosen.to).startsWith('__YES__')||String(chosen.to).startsWith('__NEXT__'))break;
    cur=chosen.to;
  }
  const mainIndex=new Map(main.map((id,i)=>[id,i])),branchLayouts=[];
  main.forEach((id,i)=>{
    const step=byId.get(id);if(!step||!processDecisionStep(step))return;
    const yesEdge=edges.find(x=>x.from===id&&x.label==='SÍ');
    const noEdge=edges.find(x=>x.from===id&&x.label==='NO');if(!noEdge)return;
    const yesStart=yesEdge?.to||'';
    const noStart=noEdge.to||'';
    const alt=[],seen=new Set([id]);let target=noStart,branchGuard=0;
    while(target&&target!=='__END__'&&!mainIndex.has(target)&&!seen.has(target)&&branchGuard++<nodes.length+2){
      alt.push(target);seen.add(target);
      if(String(target).startsWith('__NO__')||String(target).startsWith('__NEXT__'))break;
      const outgoing=edges.filter(x=>x.from===target);
      const chosen=outgoing.find(x=>x.label==='SÍ')||outgoing.find(x=>!x.label)||outgoing[0];
      if(!chosen)break;target=chosen.to;
    }
    const merge=mainIndex.has(target)?target:(target==='__END__'?'__END__':null);
    branchLayouts.push({decisionId:id,decisionIndex:i,yesStart,noStart,alt,merge});
  });

  // Projection-only branch metadata: preserve DF042/DF043 as the owners while making
  // the NO lane visually continuous and giving each real reconvergence one solid join point.
  branchLayouts.forEach(b=>{
    const mergeIndex=b.merge!=null?mainIndex.get(b.merge):null;
    b.yesSteps=mergeIndex!=null&&mergeIndex>b.decisionIndex?main.slice(b.decisionIndex+1,mergeIndex):[];
    b.yesPred=b.yesSteps.length?b.yesSteps[b.yesSteps.length-1]:b.decisionId;
    b.noPred=b.alt.length?b.alt[b.alt.length-1]:b.decisionId;
    const noChain=[b.decisionId,...b.alt,b.merge].filter(Boolean);
    for(let i=0;i<noChain.length-1;i++){
      const routeEdge=edges.find(x=>x.from===noChain[i]&&x.to===noChain[i+1]);
      if(routeEdge)routeEdge.route='NO';
    }
  });

  const gaps=Array(Math.max(0,main.length-1)).fill(1);
  branchLayouts.forEach(b=>{
    const mi=b.merge!=null?mainIndex.get(b.merge):null;
    if(mi==null||mi<=b.decisionIndex)return;
    const available=Math.max(0,mi-b.decisionIndex-1),extra=Math.max(0,b.alt.length-available);
    gaps[b.decisionIndex]=(gaps[b.decisionIndex]||1)+extra;
  });
  const positions=new Map();let col=1;
  main.forEach((id,i)=>{positions.set(id,{row:1,col});if(i<gaps.length)col+=gaps[i]});
  branchLayouts.forEach(b=>{
    const origin=positions.get(b.decisionId);if(!origin)return;
    b.alt.forEach((id,i)=>positions.set(id,{row:2,col:origin.col+i+1}));
  });

  let maxCol=Math.max(1,...Array.from(positions.values(),p=>p.col)),unplaced=0;
  nodes.forEach(n=>{
    if(positions.has(n.id))return;
    if(n.id==='__END__'){positions.set(n.id,{row:1,col:++maxCol});return}
    positions.set(n.id,{row:3,col:++maxCol});unplaced++;
  });
  const rows=unplaced?3:(branchLayouts.some(b=>b.alt.length)?2:1);
  const maxCols=Math.max(1,...Array.from(positions.values(),p=>p.col));
  return {nodes,edges,cols:maxCols,rows,positions,branchLayouts};
}
function processNodeIconName(s){
  const type=String(s?.step_type||''),manual=normalizeArray(s?.manual_actions).map(String),inputs=normalizeArray(s?.inputs).map(String),outputs=normalizeArray(s?.outputs).map(String),tool=String(s?.tool||'');
  if(type==='ST04')return 'decision';
  if(type==='ST05')return 'approval';
  if(type==='ST03')return 'system';
  if(type==='ST06')return 'wait';
  if(type==='ST07')return 'handoff';
  if(type==='ST08')return 'subprocess';
  if(type==='ST01')return 'start';
  if(type==='ST09')return 'end';
  if(manual.includes('REKEY')||manual.includes('UPLOAD')||manual.includes('UPDATE_STATUS')||outputs.includes('RECORD')&&tool==='ERP')return 'record';
  if(manual.includes('COMPARE'))return 'compare';
  if(manual.includes('CHECK'))return 'check';
  if(inputs.includes('EMAIL')||inputs.includes('PDF')||tool==='EMAIL')return 'document';
  return 'task';
}
function processNodeIconSvg(name){
  const icons={
    start:'<path d="M8 5v14l11-7z"/>',
    end:'<path d="M6 4v16M7 5h10l-2.5 4L17 13H7"/>',
    document:'<path d="M7 3h7l4 4v14H7zM14 3v5h5M9.5 12h6M9.5 16h6"/>',
    check:'<path d="M6 4h12v16H6zM9 9h6M9 13l2 2 4-5"/>',
    compare:'<path d="M5 7h11M13 4l3 3-3 3M19 17H8M11 14l-3 3 3 3"/>',
    decision:'<path d="M12 3l8 9-8 9-8-9zM8.5 12h7M12 8.5V15.5"/>',
    approval:'<path d="M12 3l7 3v5c0 4.5-2.7 8-7 10-4.3-2-7-5.5-7-10V6zM8.5 12l2.2 2.2 4.8-5"/>',
    system:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    record:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    wait:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    handoff:'<path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3"/>',
    subprocess:'<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8M8 14h8"/>',
    task:'<path d="M6 5h12v14H6zM9 9h6M9 13h6"/>'
  };
  return '<span class="process-node-icon process-node-icon-'+attr(name)+'" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">'+(icons[name]||icons.task)+'</svg></span>';
}
function graphNodeCard(e,s,i,fr,tab='cliente',readonly=false){
  const decision=processDecisionStep(s),steps=activeSteps(e),iconName=processNodeIconName(s),typeClass='step-type-'+String(s.step_type||'generic').toLowerCase();
  const frOn=fr.filter(f=>normalizeArray(f.affected_steps).includes(s.id));
  const risks=(e.risks||[]),riskOn=risks.filter(r=>normalizeArray(r.step_ids).includes(s.id));
  const economics=e.economicInputs||[],money=economics.filter(x=>normalizeArray(x.step_ids).includes(s.id));
  const dest=id=>id==='__END__'?'Fin del proceso':(steps.find(x=>x.id===id)?.step_name||'Destino pendiente');
  const actions=readonly?'':'<div class="flow-step-tools">'
    +'<button type="button" data-move-step-up="'+attr(s.id)+'" '+(i===0?'disabled':'')+'>←</button>'
    +'<button type="button" data-move-step-down="'+attr(s.id)+'" '+(i===steps.length-1?'disabled':'')+'>→</button>'
    +'<button type="button" data-edit-step="'+attr(s.id)+'">Editar</button>'
    +'<button type="button" class="danger-text" data-delete-step="'+attr(s.id)+'">Eliminar</button></div>';
  const route=decision?'<div class="graph-route-controls">'
    +'<button type="button" class="route-yes" data-graph-edit-route="'+attr(s.id)+'" data-graph-route-kind="yes"><b>SÍ</b><span>→ '+esc(dest(s.normal_next_step))+'</span></button>'
    +'<button type="button" class="route-no" data-graph-edit-route="'+attr(s.id)+'" data-graph-route-kind="no"><b>NO</b><span>→ '+esc(dest(s.exception_path?.destination_step))+'</span></button></div>':'';
  const layerAction=readonly?'':tab==='fricciones'?'<button type="button" data-add-friction-step="'+attr(s.id)+'">+ Añadir fricción</button>':
    tab==='riesgos'?'<button type="button" data-add-risk-step="'+attr(s.id)+'">+ Añadir riesgo</button>':
    tab==='impacto'?'<button type="button" data-add-economic-step="'+attr(s.id)+'">+ Añadir impacto</button>':'';
  const badge=(kind,label,editAttr)=>readonly
    ?'<span class="'+kind+'-badge" title="'+attr(label)+'"><span class="process-node-link-text">'+esc(label)+'</span></span>'
    :'<button type="button" class="'+kind+'-badge" '+editAttr+' title="'+attr(label)+'"><span class="process-node-link-text">'+esc(label)+'</span></button>';
  const linkItems=
    frOn.map(x=>{const label='Fricción · '+labelFrom('OS_FRICTION_TYPE',x.friction_type);return badge('friction',label,'data-edit-friction="'+attr(x.id)+'"')}).join('')
    +riskOn.map(x=>{const label='Riesgo · '+(x.description||x.category);return badge('risk',label,'data-edit-risk-index="'+risks.indexOf(x)+'"')}).join('')
    +money.map(x=>{const label='Impacto · '+(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id);return badge('economic',label,'data-edit-economic-index="'+economics.indexOf(x)+'"')}).join('');
  const linkCount=frOn.length+riskOn.length+money.length;
  const links=linkCount?'<div class="process-node-links">'+linkItems+'</div>':'';
  const layerActionHtml=layerAction?'<div class="process-node-actions">'+layerAction+'</div>':'';
  const stack=links||layerActionHtml?'<div class="process-node-stack">'+links+layerActionHtml+'</div>':'';
  if(decision){
    return '<div class="graph-decision-inline '+(linkCount?'has-node-links ':'')+(processLayerState(e).map?'confirmed':'')+'" '+(readonly?'':'data-drag-step="'+attr(s.id)+'"')+'>'
      +actions+'<div class="graph-decision-gateway" aria-hidden="true"><div class="graph-decision-gateway-icon">'+processNodeIconSvg('decision')+'</div></div>'
      +'<div class="graph-decision-copy"><span class="boundary-kicker">Decisión</span><h4 title="'+attr(s.step_name||'Decisión sin nombre')+'">'+esc(s.step_name||'Decisión sin nombre')+'</h4>'
      +'<p class="process-node-meta" title="'+attr((labelFrom('OS_ACTOR_ROLE',s.actor)||'—')+' · '+(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—'))+'">'+esc(labelFrom('OS_ACTOR_ROLE',s.actor)||'—')+' · '+esc(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—')+'</p>'
      +(num(s.active_time)?'<p>'+num(s.active_time)+' min trabajo</p>':'')+'</div>'
      +links+layerActionHtml+'</div>';
  }
  return '<div class="flow-step graph-flow-step '+typeClass+' '+(processLayerState(e).map?'confirmed':'')+'" '+(readonly?'':'data-drag-step="'+attr(s.id)+'"')+'>'
    +actions+'<div class="process-node-heading">'+processNodeIconSvg(iconName)+'<div class="process-node-title"><span class="boundary-kicker">Paso '+(i+1)+'</span><h4 title="'+attr(s.step_name||'Paso sin nombre')+'">'+esc(s.step_name||'Paso sin nombre')+'</h4></div></div>'
    +'<p class="process-node-meta" title="'+attr((labelFrom('OS_ACTOR_ROLE',s.actor)||'—')+' · '+(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—'))+'">'+esc(labelFrom('OS_ACTOR_ROLE',s.actor)||'—')+' · '+esc(labelFrom('OS_TOOL_CATEGORY',s.tool)||'—')+'</p>'
    +(num(s.active_time)?'<p>'+num(s.active_time)+' min trabajo</p>':'')
    +stack+'</div>';
}
function processGraphHtml(e,steps,fr,start,finish,tab='cliente',readonly=false){
  const model=processGraphData(e,steps),risks=e.risks||[],economics=e.economicInputs||[];
  const linkCountForStep=s=>fr.filter(f=>normalizeArray(f.affected_steps).includes(s.id)).length
    +risks.filter(r=>normalizeArray(r.step_ids).includes(s.id)).length
    +economics.filter(x=>normalizeArray(x.step_ids).includes(s.id)).length;
  const maxLinkCount=steps.reduce((max,s)=>Math.max(max,linkCountForStep(s)),0);
  const graphCardHeight=238+Math.max(0,maxLinkCount-1)*38;
  const yesBranchIds=new Set(model.branchLayouts.flatMap(b=>b.yesSteps||[])),cell=n=>{
    const p=model.positions.get(n.id),step=n.kind==='step'?steps.find(x=>x.id===n.id):null,isDecision=!!step&&processDecisionStep(step),isYesBranch=yesBranchIds.has(n.id);
    const style='style="grid-row:'+p.row+';grid-column:'+p.col+'"',id='data-graph-node="'+attr(n.id)+'"';
    let html='';
    if(n.kind==='start')html=flowBoundaryNode('start',start);
    else if(n.kind==='end')html=flowBoundaryNode('end',finish);
    else if(n.kind==='pending')html=readonly?'<div class="graph-route-pending"><b>'+esc(n.route)+'</b><span>→ Destino pendiente</span></div>':'<button type="button" class="graph-route-pending" data-graph-edit-route="'+attr(n.parent)+'" data-graph-route-kind="'+(n.route==='NO'?'no':'yes')+'"><b>'+esc(n.route)+'</b><span>→ Definir destino</span></button>';
    else html=graphNodeCard(e,step,steps.indexOf(step),fr,tab,readonly);
    return '<div class="process-graph-cell '+(isDecision?'process-graph-decision-cell ':'')+(isYesBranch?'process-graph-yes-branch-cell':'')+'" '+style+' '+id+'>'+html+'</div>';
  };
  const hasBranch=model.edges.some(x=>x.label==='NO');
  const legend=hasBranch?'<div class="process-graph-legend" aria-label="Leyenda de rutas"><span class="legend-main"><i></i>Ruta SÍ / principal</span><span class="legend-alt"><i></i>Ruta NO / alternativa</span></div>':'';
  return '<div class="flow-canvas client-process-canvas process-graph-canvas '+(readonly?'process-graph-readonly':'')+'">'+legend+'<div class="process-graph-board" style="--graph-cols:'+model.cols+';--graph-rows:'+model.rows+';--graph-card-height:'+graphCardHeight+'px" data-graph-edges="'+attr(JSON.stringify(model.edges))+'" data-graph-branches="'+attr(JSON.stringify(model.branchLayouts))+'">'
    +'<svg class="process-graph-lines" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>'
    +model.nodes.map(cell).join('')+'</div></div>';
}
function drawProcessGraph(){
  if(typeof document==='undefined'||typeof document.querySelector!=='function')return;
  const board=document.querySelector('.process-graph-board');if(!board)return;
  const svg=board.querySelector('.process-graph-lines');if(!svg)return;
  const ns='http://www.w3.org/2000/svg',rect=board.getBoundingClientRect(),els=new Map();
  board.querySelectorAll('[data-graph-node]').forEach(el=>els.set(el.dataset.graphNode,el));
  const nodeRect=id=>{
    const cell=els.get(id);if(!cell)return null;
    const node=cell.querySelector?.('.graph-decision-gateway,.graph-flow-step,.flow-boundary,.graph-route-pending');
    return (node||cell).getBoundingClientRect();
  };
  const edges=JSON.parse(board.dataset.graphEdges||'[]'),branches=JSON.parse(board.dataset.graphBranches||'[]');
  svg.setAttribute('viewBox','0 0 '+board.scrollWidth+' '+board.scrollHeight);
  svg.innerHTML='<defs><marker id="auneaGraphArrowMain" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#4f7563"/></marker><marker id="auneaGraphArrowAlt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#b9783c"/></marker></defs>';

  const edgeKey=(from,to)=>String(from)+'>'+String(to);
  const branchOriginEdges=new Set(),mergeIncoming=new Set();
  branches.forEach(b=>{
    if(b.yesStart)branchOriginEdges.add(edgeKey(b.decisionId,b.yesStart));
    if(b.noStart)branchOriginEdges.add(edgeKey(b.decisionId,b.noStart));
    if(b.merge&&b.yesPred)mergeIncoming.add(edgeKey(b.yesPred,b.merge));
    if(b.merge&&b.noPred)mergeIncoming.add(edgeKey(b.noPred,b.merge));
  });

  const appendPath=(d,alternative=false,arrow=true)=>{
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',d);
    path.setAttribute('class','graph-path '+(alternative?'graph-path-alternative':'graph-path-main'));
    if(arrow)path.setAttribute('marker-end',alternative?'url(#auneaGraphArrowAlt)':'url(#auneaGraphArrowMain)');
    svg.appendChild(path);
    return path;
  };
  const appendLabel=(label,x,y,alternative=false)=>{
    const textEl=document.createElementNS(ns,'text');
    textEl.setAttribute('x',String(x));textEl.setAttribute('y',String(y));
    textEl.setAttribute('class','graph-path-label '+(alternative?'graph-path-label-alt':'graph-path-label-main'));
    textEl.textContent=label;svg.appendChild(textEl);
  };
  const orthogonal=(ar,br,alternative=false)=>{
    const x1=ar.right-rect.left,y1=ar.top+ar.height/2-rect.top;
    const x2=br.left-rect.left,y2=br.top+br.height/2-rect.top;
    if(Math.abs(y2-y1)<3)return 'M'+x1+' '+y1+'H'+(x2-5);
    const xm=x1+Math.max(22,(x2-x1)/2);
    return 'M'+x1+' '+y1+'H'+xm+'V'+y2+'H'+(x2-5);
  };

  // Draw every normal connector except the two exits of a decision and the two
  // segments that converge into its independent merge point.
  edges.forEach(edge=>{
    const key=edgeKey(edge.from,edge.to);
    if(branchOriginEdges.has(key)||mergeIncoming.has(key))return;
    const ar=nodeRect(edge.from),br=nodeRect(edge.to);if(!ar||!br)return;
    appendPath(orthogonal(ar,br,edge.route==='NO'),edge.route==='NO',true);
  });

  branches.forEach(b=>{
    const dr=nodeRect(b.decisionId);if(!dr||!b.merge)return;
    const tr=nodeRect(b.merge);if(!tr)return;

    const rightX=dr.right-rect.left;
    const centerY=dr.top+dr.height/2-rect.top;
    const noStartX=dr.right-rect.left-4;
    const noStartY=dr.bottom-rect.top-8;
    const mainY=tr.top+tr.height/2-rect.top;
    const mergeX=tr.left-rect.left-32;
    const lowerY=Math.max(mainY+94,noStartY+64);

    // SÍ: leaves the gateway to the right, rises to the affirmative card,
    // then returns vertically to the convergence point.
    if(b.yesStart&&b.yesStart!==b.merge){
      const yr=nodeRect(b.yesStart);
      if(yr){
        const targetX=yr.left-rect.left,targetY=yr.top+yr.height/2-rect.top;
        appendPath('M'+rightX+' '+centerY+'H'+(rightX+26)+'V'+targetY+'H'+(targetX-5),false,true);
        appendLabel('SÍ',rightX+34,targetY-12,false);
      }
    }else{
      appendPath('M'+rightX+' '+centerY+'H'+mergeX,false,false);
      appendLabel('SÍ',rightX+34,centerY-12,false);
    }

    if(b.yesPred&&b.yesPred!==b.decisionId){
      const yr=nodeRect(b.yesPred);
      if(yr){
        const x1=yr.right-rect.left,y1=yr.top+yr.height/2-rect.top;
        appendPath('M'+x1+' '+y1+'H'+mergeX+'V'+mainY,false,false);
      }
    }

    // NO: leaves horizontally from the gateway beyond the decision-copy width, then descends
    // to the lower bypass lane. This keeps the alternative connector clear of decision text.
    if(b.noStart&&b.noStart!==b.merge){
      const nr=nodeRect(b.noStart);
      if(nr){
        const targetX=nr.left-rect.left,targetY=nr.top+nr.height/2-rect.top;
        const noLaneX=rightX+72;
        appendPath('M'+rightX+' '+centerY+'H'+noLaneX+'V'+lowerY+'H'+(targetX-18)+'V'+targetY+'H'+(targetX-5),true,true);
        appendLabel('NO',noLaneX+8,lowerY-12,true);
      }
    }else{
      const noLaneX=rightX+72;
      appendPath('M'+rightX+' '+centerY+'H'+noLaneX+'V'+lowerY+'H'+mergeX+'V'+mainY,true,false);
      appendLabel('NO',noLaneX+8,lowerY-12,true);
    }

    if(b.noPred&&b.noPred!==b.decisionId){
      const nr=nodeRect(b.noPred);
      if(nr){
        const x1=nr.right-rect.left,y1=nr.top+nr.height/2-rect.top;
        appendPath('M'+x1+' '+y1+'H'+(x1+18)+'V'+lowerY+'H'+mergeX+'V'+mainY,true,false);
      }
    }

    const dot=document.createElementNS(ns,'circle');
    dot.setAttribute('cx',String(mergeX));
    dot.setAttribute('cy',String(mainY));
    dot.setAttribute('r','10');
    dot.setAttribute('class','graph-merge-dot');
    svg.appendChild(dot);
    appendPath('M'+(mergeX+11)+' '+mainY+'H'+(tr.left-rect.left-5),false,true);
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
  const key=processLayerKeySafe(tab),layer=processLayerState(e),labels={map:'mapa AS-IS',frictions:'fricciones y evidencia',risks:'riesgos y controles',impact:'impacto económico'},integrity=typeof processLayerIntegrityIssues==='function'?processLayerIntegrityIssues(e,key):[],done=!!layer[key]&&!integrity.length;
  const confirm=`${integrity.length?`<div class="notice warn"><b>Revisión necesaria</b><br>${integrity.map(x=>esc(x.message)).join(' ')}</div>`:''}<div class="flow-confirm"><div><b>${done?'Capa confirmada':integrity.length?'Revisión necesaria':'Confirmación pendiente'}</b><div class="field-help">${esc(labels[key])}</div></div><button class="btn ${done?'btn-outline':'btn-primary'}" id="confirmAsIs">${done?'Reconfirmar':'Confirmar'} ${esc(labels[key])}</button></div>`;
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
    '<button class="btn btn-outline" id="reviewPainCandidates">Revisar posibles fricciones</button><button class="btn btn-primary" id="addFriction">Añadir fricción</button>');
}
// [AUNEA-FE-ASIS-UX-072] START — One map and four private consultant lists.
// This is presentation-only over the same Engagement, Step, Friction, Risk and EconomicInput records.
// Source: DEC-050/063/064/065/068 and UX simplification 2026-09-30 (REVIEW).
function asisOverview(e,steps,fr){
  const field=id=>(schema?.fields||[]).find(f=>f.Field_ID===id);
  const raw=id=>{
    const f=field(id);
    if(!f)return e.answers?.[id];
    if(typeof questionVisible==='function'&&!questionVisible(f,e))return {__asisState:'NA'};
    return typeof effectiveValue==='function'?effectiveValue(f,e):e.answers?.[id];
  };
  const display=id=>{
    const f=field(id),v=raw(id);
    if(v&&v.__asisState==='NA')return 'No aplica';
    if(typeof valuePresent==='function'&&!valuePresent(v))return 'Pendiente';
    if(v===undefined||v===null||v==='')return 'Pendiente';
    return esc(formatContextValue(f||{},v));
  };
  const volume=raw('DF021'),period=raw('DF022');
  const habitual=(volume&&volume.__asisState==='NA')?'No aplica':
    ((typeof valuePresent==='function'?valuePresent(volume):volume!==undefined&&volume!==null&&volume!=='')
      ?esc(typeof volume==='object'&&volume!==null&&'value' in volume?volume.value:volume)+' casos'
        +((period&&!(period.__asisState))?' · '+esc(labelFrom('OS_PERIOD',String(period).toUpperCase())||period):'')
      :'Pendiente');
  const peak=raw('DF023');
  const peakValue=peak&&peak.__asisState==='NA'?'No aplica':peak&&typeof peak==='object'
    ?(peak.mode==='NONE'?'No aplica':peak.mode==='UNKNOWN'?'No disponible':(peak.value===undefined||peak.value===null||peak.value==='')?'Pendiente':
      esc(peak.value)+' '+esc(({case:'casos',item:'elementos',request:'solicitudes',person:'personas'})[peak.unit]||peak.unit||'casos')
      +(peak.period?' · '+esc(labelFrom('OS_PERIOD',String(peak.period).toUpperCase())):''))
    :display('DF023');
  return '<div class="asis-facts">'
    +'<div><small>Proceso</small><b>'+display('DF011')+'</b></div>'
    +'<div><small>Empieza cuando</small><b>'+display('DF014')+'</b></div>'
    +'<div><small>Termina cuando</small><b>'+display('DF015')+'</b></div>'
    +'<div><small>Volumen habitual</small><b>'+habitual+'</b></div>'
    +'<div><small>Volumen máximo declarado</small><b>'+peakValue+'</b></div>'
    +'<div><small>Tiempo objetivo</small><b>'+display('DF025')+'</b></div>'
    +'<div><small>Duración habitual declarada</small><b>'+display('DF026')+'</b></div>'
    +'<div><small>Registrados</small><b>'+steps.length+' pasos · '+fr.length+' problemas · '+(e.risks||[]).length+' riesgos · '+(e.economicInputs||[]).length+' impactos</b></div>'
    +'</div>';
}
function asisVariantCandidates(e){
  const variants=normalizeArray(e.answers?.DF020).filter(Boolean);
  if(!variants.length)return '';
  const detail=answerDetails(e).DF020;
  const labels=variants.map(v=>{
    const label=labelFrom('OS_VARIANT_DIMENSION',v)||v;
    return String(v).toUpperCase()==='OTHER'&&detail?label+' — '+detail:label;
  });
  const decisions=activeSteps(e).filter(processDecisionStep).length;
  const message=decisions
    ?'Declaradas en Alcance: '+labels.map(esc).join(' · ')+'. El mapa contiene '+decisions+' decisión(es); comprueba que cubren las variantes materiales antes de confirmar.'
    :'Declaradas en Alcance: '+labels.map(esc).join(' · ')+'. Aún no hay una decisión en el mapa que represente una ruta alternativa.';
  return '<div class="asis-variant-hint" data-asis-variant-candidates="DF020"><b>Variantes del alcance</b><span>'+message+'</span></div>';
}
function asisMapPage(e,steps,fr){
  const start=processBoundaryValue(e,'DF014','Límite inicial pendiente','DF012'),finish=processBoundaryValue(e,'DF015','Límite final pendiente','DF013');
  const flow=processGraphHtml(e,steps,fr,start,finish,'impacto',true);
  return '<div data-process-engagement="'+attr(e.id)+'">'+asisOverview(e,steps,fr)
    +asisVariantCandidates(e)
    +'<div class="asis-map-hint">Este es el mismo mapa AS-IS trabajado con el cliente. Para modificarlo, utiliza Pasos, Fricciones, Riesgos o Impacto en el menú de la izquierda.</div>'
    +flow+'</div>';
}
function layerCanonicalQuestions(e,stageId){
  if(typeof renderStageFields!=='function')return '';
  const structuredOwners=new Set(['RT_PROCESS_STEP','RT_PAIN','RT_RISK','RT_ECONOMIC_INPUT']);
  const fields=(schema?.fields||[]).filter(f=>{
    if(f.Stage_ID!==stageId||typeof questionVisible!=='function'||!questionVisible(f,e))return false;
    const target=String(f.Write_Target||'').split('.')[0],mode=String(f.Ask_Mode||'');
    if(structuredOwners.has(target))return false;
    if(['CAPTURE_IN_PROCESS_STEP','CONDITIONAL_IN_STEP','CAPTURE_IN_FRICTION','CONDITIONAL_IN_FRICTION','CAPTURE_IN_RISK'].includes(mode))return false;
    return true;
  });
  if(!fields.length)return '';
  return section('Datos complementarios de la etapa','Sólo aparecen datos cuyo owner no está ya cubierto por el editor estructurado. No se duplica captura de pasos, fricciones, riesgos ni impactos.',`<div class="form-grid">${renderStageFields(fields,e)}</div>`);
}
function processPage(){
  const e=currentEng();if(!e)return pageTop('Mapa AS-IS','Abre un estudio para ver su proceso.');
  const steps=activeSteps(e),fr=activeFrictions(e);
  // The client-first editor is the existing consultant-owned surface, not the read-only #session projection.
  if(typeof isProcessEditorWindow==='function'&&isProcessEditorWindow())return clientProcessView(e,steps,fr,e.processTab||'cliente');
  const locked=typeof isAsisConsoleLocked==='function'&&isAsisConsoleLocked(e);
  const top='<button class="btn btn-primary" id="openSessionDisplayFromProcess">'+(locked?'Vista con cliente abierta ↗':'Vista con cliente ↗')+'</button>';
  return pageTop('Mapa AS-IS','Lo que sabemos del proceso actual, todo en un mismo mapa.',top)
    +(typeof asisConsoleLockNotice==='function'?asisConsoleLockNotice():'')+asisMapPage(e,steps,fr)+layerCanonicalQuestions(e,'S04');
}
function consultantLayerPage(title,intro,body,layer,stageId){
  const e=currentEng();if(!e)return pageTop(title,'Abre primero un estudio.');
  const integrity=typeof processLayerIntegrityIssues==='function'?processLayerIntegrityIssues(e,layer):[],done=!!processLayerState(e)[layer]&&!integrity.length,tabs={map:'Mapa AS-IS',frictions:'Fricciones',risks:'Riesgos',impact:'Impacto'};
  const reviewCopy=integrity.length?'<div class="flow-confirm-issues">'+integrity.map(x=>'<span>'+esc(x.message)+'</span>').join('')+'</div>':'<div class="field-help">'+(done?'La capa está validada.':'Puedes guardar y continuar sin confirmar todavía.')+'</div>';
  const confirm='<div class="flow-confirm '+(integrity.length?'flow-confirm-needs-review':'')+'"><div><b>'+(done?'Revisión confirmada':integrity.length?'Revisión necesaria':'Revisión pendiente')+'</b>'+reviewCopy+'</div><button class="btn '+(done?'btn-outline':'btn-primary')+'" data-confirm-process-layer="'+layer+'">'+(done?'Volver a confirmar':'Confirmar')+' '+tabs[layer]+'</button></div>';
  return pageTop(title,intro,'<button class="btn btn-outline" data-page="proceso">← Ver mapa AS-IS</button>')+(typeof asisConsoleLockNotice==='function'?asisConsoleLockNotice():'')+body+(stageId?layerCanonicalQuestions(e,stageId):'')+confirm;
}
function consultantStepsPage(){
  const e=currentEng();return consultantLayerPage('Pasos','Añade, edita o elimina las actividades reales del proceso.',stepsEditor(e,activeSteps(e),activeFrictions(e)),'map','S04');
}
function consultantFrictionsPage(){
  const e=currentEng();return consultantLayerPage('Fricciones','Registra los problemas de los pasos y su evidencia.',frictionsEditor(e,activeSteps(e),activeFrictions(e)),'frictions','S05');
}
function consultantRisksPage(){
  const e=currentEng();return consultantLayerPage('Riesgos','Qué podría salir mal y qué controles existen hoy.',riskBuilder(e),'risks','S06');
}
function consultantImpactPage(){
  const e=currentEng();return consultantLayerPage('Impacto','Consulta los datos existentes y añade sólo los costes o tiempos que falten.',economicBuilder(e),'impact','S07');
}
// [AUNEA-FE-ASIS-UX-072] END

function flowReview(e,steps,fr){return clientProcessView(e,steps,fr)}

const __auneaNoReaskBindForms=bindForms;
bindForms=function(){
  __auneaNoReaskBindForms();
  document.querySelectorAll('[data-add-friction-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();openFrictionModal(null,[b.dataset.addFrictionStep])});
  document.querySelectorAll('[data-add-risk-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addRisk([b.dataset.addRiskStep])});
  document.querySelectorAll('[data-add-economic-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addEconomic([b.dataset.addEconomicStep])});
  document.querySelectorAll('[data-edit-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();openStepModal(b.dataset.editStep)});
  document.querySelectorAll('[data-delete-step]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();removeStepFromFlow(b.dataset.deleteStep)});
  document.querySelectorAll('[data-move-step-up]').forEach(b=>b.onclick=()=>moveStep(b.dataset.moveStepUp,-1));
  document.querySelectorAll('[data-move-step-down]').forEach(b=>b.onclick=()=>moveStep(b.dataset.moveStepDown,1));
  document.querySelectorAll('[data-fr-other-toggle]').forEach(el=>el.addEventListener('change',()=>{const targetId=el.dataset.frOtherToggle,wrap=document.querySelector(`[data-fr-other-wrap="${targetId}"]`);if(!wrap)return;wrap.style.display=el.checked?'':'none';if(!el.checked){const input=document.getElementById(targetId);if(input)input.value=''}}));
  document.querySelectorAll('[data-edit-friction]').forEach(b=>b.onclick=()=>{if(isProcessEditorWindow()){currentEng().processTab='fricciones';render()}openFrictionModal(b.dataset.editFriction)});
  const pTpl=document.getElementById('useProcessTemplate');if(pTpl)pTpl.onclick=openProcessTemplatePicker;
  const sTpl=document.getElementById('addStepTemplate');if(sTpl)sTpl.onclick=openStepTemplatePicker;
  const addClient=document.getElementById('addStepFromClient');if(addClient)addClient.onclick=()=>openStepModal();
  const addDecision=document.getElementById('addDecisionFromClient');if(addDecision)addDecision.onclick=addDecisionStep;
  const addMany=document.getElementById('addMultipleSteps');if(addMany)addMany.onclick=()=>addMultipleSteps();
  const reviewCandidates=document.getElementById('reviewPainCandidates');if(reviewCandidates)reviewCandidates.onclick=ev=>{ev.preventDefault();ev.stopPropagation();reviewPainCandidates()};
  const addFriction=document.getElementById('addFriction');if(addFriction)addFriction.onclick=ev=>{ev.preventDefault();ev.stopPropagation();openFrictionModal()};
  // Global bottom actions are handled by delegated click binding below so they remain
  // functional after any client-layer re-render. Do not bind per-node onclick here.
  document.querySelectorAll('[data-edit-risk-index]').forEach(b=>b.onclick=()=>{if(isProcessEditorWindow()){currentEng().processTab='riesgos';render()}addRisk([],Number(b.dataset.editRiskIndex))});
  document.querySelectorAll('[data-delete-risk-index]').forEach(b=>b.onclick=()=>deleteRisk(Number(b.dataset.deleteRiskIndex)));
  document.querySelectorAll('[data-edit-economic-index]').forEach(b=>b.onclick=()=>{if(isProcessEditorWindow()){currentEng().processTab='impacto';render()}addEconomic([],Number(b.dataset.editEconomicIndex))});
  document.querySelectorAll('[data-fix-economic-scope]').forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();addEconomic([b.dataset.fixEconomicStep],Number(b.dataset.fixEconomicScope),true)});
  document.querySelectorAll('[data-delete-economic-index]').forEach(b=>b.onclick=()=>deleteEconomic(Number(b.dataset.deleteEconomicIndex)));
  const share=document.getElementById('openSessionDisplayFromProcess');if(share)share.onclick=()=>openProcessEditorWindow();
  const closeClient=document.getElementById('closeClientProcessEditor');if(closeClient)closeClient.onclick=()=>closeProcessEditorWindow();
  document.querySelectorAll('[data-confirm-process-layer]').forEach(b=>b.onclick=()=>confirmProcessLayer(({map:'cliente',frictions:'fricciones',risks:'riesgos',impact:'impacto'})[b.dataset.confirmProcessLayer]));
  document.querySelectorAll('[data-add-after]').forEach(b=>b.onclick=e=>{e.stopPropagation();openStepModal(null,b.dataset.addAfter||null)});
  document.querySelectorAll('[data-drag-step]').forEach(el=>{el.ondragstart=ev=>{ev.dataTransfer?.setData('text/plain',el.dataset.dragStep)};el.ondragover=ev=>ev.preventDefault();el.ondrop=ev=>{ev.preventDefault();const source=ev.dataTransfer?.getData('text/plain');if(source)reorderStepBefore(source,el.dataset.dragStep)}});
  document.querySelectorAll('[data-graph-edit-route]').forEach(b=>b.onclick=ev=>{
    ev.preventDefault();ev.stopPropagation();openStepModal(b.dataset.graphEditRoute);
    const details=[...document.querySelectorAll('.step-group')].find(x=>x.querySelector('summary')?.textContent?.includes('D. Flujo'));
    if(details){details.open=true;const dest=document.getElementById(b.dataset.graphRouteKind==='no'?'step_exc_dest':'step_next');const target=dest?.closest('.canonical-aunea-select')||details;target.scrollIntoView?.({block:'nearest',behavior:'smooth'});const dropdown=target.querySelector?.('details.aunea-select');if(dropdown)dropdown.open=true;}
  });
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(drawProcessGraph);
    document.querySelectorAll('[data-validated-case]').forEach(b=>b.onclick=()=>instantiateValidatedCase(b.dataset.validatedCase));
};

// Global layer actions live in content that is replaced on every process-tab render.
// Bind once at document level so "Añadir riesgo" / "Añadir impacto" never depend on
// the exact render/bindForms timing of the current layer.
if(typeof document!=='undefined'&&!document.__auneaGlobalLayerActionsBound){
  document.__auneaGlobalLayerActionsBound=true;
  document.addEventListener('click',ev=>{
    const riskButton=ev.target?.closest?.('#addRisk,[data-add-risk-global]');
    if(riskButton){
      ev.preventDefault();ev.stopPropagation();
      addRisk();
      return;
    }
    const economicButton=ev.target?.closest?.('#addEconomic,[data-add-economic-global]');
    if(economicButton){
      ev.preventDefault();ev.stopPropagation();
      addEconomic();
    }
  });
}
// [AUNEA-FE-PROC-EDITOR-020] END
