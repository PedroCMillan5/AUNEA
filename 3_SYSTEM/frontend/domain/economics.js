// [AUNEA-FE-ECON-CAPTURE-030] START — Captura de inputs económicos
// PURPOSE: Render and capture explicit EconomicInput records while preserving active/wait/direct-loss/tool/cash categories; never annualize Process Step time or calculate official economics in the browser.
// SOURCE: DEC-021/033/034/040; REF_ECON_DRIVER; governed evidence labels.
// INPUTS: current Engagement, explicit consultant-entered annual values and evidence quality.
// OUTPUTS: engagement.economicInputs records matching the backend EconomicInput contract.
// SIDE_EFFECTS: modal DOM and engagement state mutation; no official economics calculation.
// CHANGE_RISK: HIGH.
const ECON_DRIVER_LABELS_ES=Object.freeze({
  ED01:'Tiempo de ejecución manual',
  ED02:'Tiempo de entrada duplicada',
  ED03:'Tiempo de búsqueda / recuperación',
  ED04:'Tiempo de seguimiento',
  ED05:'Tiempo de retrabajo',
  ED06:'Tiempo de consolidación de reporting',
  ED07:'Tiempo de gestión de aprobaciones',
  ED08:'Tiempo de gestión de traspasos',
  ED09:'Coste directo de error / defecto',
  ED10:'Facturación perdida / fuga de ingresos',
  ED11:'Penalización / pérdida evitable',
  ED12:'Coste de herramientas',
  ED13:'Tiempo de espera',
  ED14:'Coste de capacidad por hora',
  ED15:'Volumen de casos'
});
function econDriverLabel(driverId){
  const drivers=schema?.tables?.REF_ECON_DRIVER||[];
  const d=drivers.find(x=>x.Economic_Driver_ID===driverId);
  return ECON_DRIVER_LABELS_ES[driverId]||d?.Name||driverId;
}
function econHoursFrom(value,unit='h'){
  const n=Number(value||0);if(!Number.isFinite(n)||n<0)return 0;
  return n*({min:1/60,h:1,day:24,week:168}[unit]||1);
}
function econAnnualTimeControl(id,hours=0,unit='h'){
  const units=[{value:'min',label:'min'},{value:'h',label:'h'},{value:'day',label:'días'},{value:'week',label:'semanas'}];
  const factor={min:1/60,h:1,day:24,week:168}[unit]||1,display=hours?+(Number(hours)/factor).toFixed(2):'';
  return `<div class="compound-control economic-time-control"><input id="${id}" type="number" min="0" step="any" value="${attr(display)}" placeholder="0">${econDropdown(id+'_unit',units,unit,'Unidad')}<span class="unit-label">al año</span></div>`;
}

function econDropdown(id,opts,value='',placeholder='Selecciona…'){
  return auneaSelectControl(id,opts,value,{placeholder});
}

/* [AUNEA-FE-ECON-DERIVATION-035] START — preview of time from captured volume and step timing.
   SOURCE: Diagnostic Master DF021/DF022, DF037–040; client validates source on Save.
   Never infer wasted time from all labour, monetary savings, or official server economics. */
function economicAnnualVolume(e){
  const raw=e.answers?.DF021,period=String(e.answers?.DF022||'').toUpperCase(),n=Number(raw&&typeof raw==='object'?raw.value:raw);
  const factor={DAY:365,WEEK:52,MONTH:12,QUARTER:4,YEAR:1}[period];
  return n>0&&Number.isFinite(n)&&factor?n*factor:null;
}
function economicTimeProjection(e,stepIds=[]){
  const annualCases=economicAnnualVolume(e);
  const steps=(typeof activeSteps==='function'?activeSteps(e):e.processSteps||[]).filter(s=>!stepIds.length||stepIds.includes(s.id));
  if(!annualCases||!steps.length)return {available:false,reason:!annualCases?'Falta volumen y periodo habitual válidos en Demanda, volumen y servicio.':'No hay pasos seleccionados con tiempos.'};
  let active=0,wait=0,rework=0,hasRework=false,missing=[];
  steps.forEach(s=>{
    const a=s.applies_to&&typeof s.applies_to==='object'?s.applies_to:{mode:s.applies_to||'ALL'};
    const mode=a.mode||'ALL',share=mode==='ALL'?1:mode==='PERCENT'?Number(a.value)/100:NaN;
    if(!Number.isFinite(share)||share<0||share>1){missing.push('Aplicación de '+(s.step_name||s.id));return}
    const cases=annualCases*share*Math.max(0,Number(s.occurrences_per_case??1));
    if(Number.isFinite(Number(s.active_time)))active+=cases*Number(s.active_time)/60;
    if(Number.isFinite(Number(s.wait_time)))wait+=cases*Number(s.wait_time)/60;
    const rate=s.error_rate&&typeof s.error_rate==='object'?s.error_rate:{value:s.error_rate||0,mode:'percent'};
    const rateValue=Number(rate.value);
    if(Number(s.rework_time)>0&&rate.mode==='percent'&&Number.isFinite(rateValue)&&rateValue>=0&&rateValue<=100){
      hasRework=true;rework+=cases*Number(s.rework_time)*(rateValue/100)/60;
    }else if(Number(s.rework_time)>0)missing.push('Frecuencia de retrabajo: '+(s.step_name||s.id));
  });
  // Friction-specific additional work is shown separately: it may overlap with rework and
  // must never be silently added to baseline hours or represented as recoverable saving.
  let frictionExtra=0,hasFrictionExtra=false;
  const selected=new Set(steps.map(x=>x.id));
  (typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[]).filter(f=>
    (Array.isArray(f.affected_steps)?f.affected_steps:[]).some(id=>selected.has(id))
  ).forEach(f=>{
    const extra=Number(f.active_time_loss?.value||0),freq=Number(f.frequency?.value||0),
      mode=String(f.frequency?.mode||'').toLowerCase(),period=String(f.frequency?.period||'').toLowerCase();
    if(extra<=0||freq<=0)return;
    let cases=null;
    if(mode==='percent'&&freq<=100)cases=annualCases*freq/100;
    else if(mode==='count'){
      const periods={case:annualCases,day:365,week:52,month:12,year:1};
      if(periods[period])cases=freq*periods[period];
    }
    if(cases!==null){hasFrictionExtra=true;frictionExtra+=extra*cases/60}
  });
  return {available:true,annualCases,active,wait,rework,hasRework,frictionExtra,hasFrictionExtra,missing,stepCount:steps.length};
}
function economicProjectionForDriver(projection,driver){
  if(!projection.available||projection.missing.length)return null;
  if(driver==='ED01')return {active:projection.active,wait:projection.wait,label:'Tiempo total actual de ejecución y espera'};
  if(driver==='ED05'&&projection.hasRework)return {active:projection.rework,wait:0,label:'Retrabajo ponderado por tasa de error registrada'};
  if(driver==='ED13')return {active:0,wait:projection.wait,label:'Espera actual, separada del trabajo'};
  return null;
}
/* [AUNEA-FE-ECON-DERIVATION-035] END */

function economicBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  return section('Inputs económicos materiales','Los inputs se mantienen separados: trabajo activo, espera, pérdida directa, herramienta y ahorro de caja realizado. No se inventan porcentajes de recuperación.',`<div class="result-list">${e.economicInputs.length?e.economicInputs.map(x=>`<div class="result-item"><b>${esc(econDriverLabel(x.driver_id))}</b><p>Activo ${x.annual_active_hours||0} h/año · Espera ${x.annual_wait_hours||0} h/año · Pérdida directa ${x.direct_loss_eur_annual||0} €/año · Evidencia: ${esc(engineLabel('evidence_quality',x.evidence_type))}</p><p>Pasos: ${(Array.isArray(x.step_ids)?x.step_ids:(x.step_ids?[x.step_ids]:[])).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')||'Sin anclar'}</p></div>`).join(''):'<div class="empty"><p>Sin inputs económicos explícitos añadidos.</p></div>'}</div>`,`<button class="btn btn-outline" id="addEconomic">Añadir input económico</button>`)
}

function addEconomic(preselectedSteps=[]){
  const eng=currentEng(),steps=typeof activeSteps==='function'?activeSteps(eng):[];
  const drivers=schema.tables.REF_ECON_DRIVER||[];
  const activeContributors=activeTimeContributors(eng),waitContributors=waitTimeContributors(eng);
  const allFrictions=typeof activeFrictions==='function'?activeFrictions(eng):eng.frictions||[];
  const linkedFrictions=preselectedSteps.length?allFrictions.filter(f=>normalizeArray(f.affected_steps).some(x=>preselectedSteps.includes(x))):allFrictions;
  const linkedRisks=preselectedSteps.length?(eng.risks||[]).filter(r=>normalizeArray(r.step_ids).some(x=>preselectedSteps.includes(x))):(eng.risks||[]);
  const inheritedContext='<div class="client-inherited-context"><b>Contexto reutilizado del AS-IS</b>'
    +'<p>'+steps.length+' pasos · '+linkedFrictions.length+' fricciones · '+linkedRisks.length+' riesgos disponibles como evidencia contextual.</p>'
    +(linkedFrictions.length?'<p>Fricciones: '+linkedFrictions.map(f=>esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))).join(' · ')+'</p>':'')
    +'<small>El cálculo previo reutiliza los tiempos de los pasos y el volumen capturado. La espera no equivale a coste ni el trabajo activo equivale a desperdicio o ahorro.</small></div>';
  const initialProjection=economicTimeProjection(eng,preselectedSteps);
  const initialDriver=drivers[0]?.Economic_Driver_ID||'';
  const initialSuggested=economicProjectionForDriver(initialProjection,initialDriver);
  const preview=(value)=>Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:2});
  const initialPreview=initialProjection.available
    ?'Volumen de referencia: '+preview(initialProjection.annualCases)+' casos/año · Trabajo activo '+preview(initialProjection.active)+' h/año · Espera '+preview(initialProjection.wait)+' h/año'+(initialProjection.hasRework?' · Retrabajo '+preview(initialProjection.rework)+' h/año':'')+(initialProjection.hasFrictionExtra?' · Trabajo adicional declarado en fricciones '+preview(initialProjection.frictionExtra)+' h/año (posible solapamiento con retrabajo)':'')
    :initialProjection.reason;
  const activeHelp=activeContributors.length?`<div class="field-help">Pasos con tiempo activo registrado: ${esc(activeContributors.join(', '))}. Se reutilizan para obtener un cálculo revisable cuando el volumen y la aplicación están completos.</div>`:'<div class="field-help">Cuando faltan tiempos o volumen, indica el dato anual manualmente con su evidencia.</div>';
  const waitHelp=waitContributors.length?`<div class="field-help">Pasos con espera registrada: ${esc(waitContributors.join(', '))}. Se calcula por separado del trabajo; no constituye por sí misma ahorro económico.</div>`:'<div class="field-help">La espera se registra aparte del trabajo. Si faltan datos, introduce una cifra anual validada.</div>';
  openModal('Añadir input económico',`<div class="step-groups process-modal-form economic-modal-form">${inheritedContext}
    <details class="step-group" open><summary>Impacto en tiempo y evidencia</summary><div class="form-grid"><div class="field full"><div class="notice info" id="economicDerivedPreview" role="status">${esc(initialPreview)}</div><div class="field-help">Vista previa calculada con DF021/DF022 y los tiempos registrados. El trabajo total no es tiempo desperdiciado; sólo el retrabajo medido se muestra como posible ineficiencia, sin sumar fricciones que pudieran solaparse.</div></div>
      <div class="field full"><label>Pasos del proceso relacionados</label><div class="choice-grid">${steps.map(s=>`<div class="choice"><input type="checkbox" id="econ_step_${attr(s.id)}" data-econ-step="${attr(s.id)}" ${preselectedSteps.includes(s.id)?'checked':''}><label for="econ_step_${attr(s.id)}">${esc(s.step_name||s.id)}</label></div>`).join('')}</div></div>
      <div class="field full"><label>Concepto económico</label>${econDropdown('econDriver',drivers.map(d=>({value:d.Economic_Driver_ID,label:econDriverLabel(d.Economic_Driver_ID)})),drivers[0]?.Economic_Driver_ID||'','Selecciona…')}</div>
      <div class="field"><label>Tiempo activo atribuible</label>${econAnnualTimeControl('econActive',initialSuggested?.active||0,'h')}${activeHelp}</div>
      <div class="field"><label>Tiempo de espera atribuible</label>${econAnnualTimeControl('econWait',initialSuggested?.wait||0,'h')}${waitHelp}</div>
      <div class="field full"><label>Tipo de evidencia</label>${econDropdown('econEvidence',Object.entries(I18N_LABELS_ES.evidence_quality).map(([value,label])=>({value,label})),Object.keys(I18N_LABELS_ES.evidence_quality)[0]||'','Selecciona…')}</div>
    </div></details>
    <details class="step-group" open><summary>Costes, pérdidas y ahorro realizado</summary><div class="form-grid">
      <div class="field"><label>Coste de capacidad por hora</label><div class="compound-control"><input id="econRate" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/h</span></div><div class="field-help">Valor de capacidad; no equivale por sí solo a ahorro de caja.</div></div>
      <div class="field"><label>Pérdida directa anual</label><div class="compound-control"><input id="econDirect" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Pérdida financiera directa evidenciada y atribuible al proceso.</div></div>
      <div class="field"><label>Coste actual de herramientas</label><div class="compound-control"><input id="econTool" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Gasto actual atribuible; no se presume eliminable.</div></div>
      <div class="field"><label>Ahorro de caja ya realizado</label><div class="compound-control"><input id="econCash" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Sólo ahorro real ya materializado; no es una estimación futura.</div></div>
    </div></details>
  </div>`,()=>{
    const step_ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    const projected=economicProjectionForDriver(economicTimeProjection(eng,step_ids),document.getElementById('econDriver').value);
    const activeHours=projected?projected.active:econHoursFrom(document.getElementById('econActive').value,document.getElementById('econActive_unit').value||'h');
    const waitHours=projected?projected.wait:econHoursFrom(document.getElementById('econWait').value,document.getElementById('econWait_unit').value||'h');
    eng.economicInputs.push({step_ids,driver_id:document.getElementById('econDriver').value,annual_active_hours:activeHours,annual_wait_hours:waitHours,capacity_cost_rate_eur_hour:+document.getElementById('econRate').value||null,direct_loss_eur_annual:+document.getElementById('econDirect').value||0,current_tool_cost_eur_annual:+document.getElementById('econTool').value||0,realized_cash_saving_eur_annual:+document.getElementById('econCash').value||0,evidence_type:document.getElementById('econEvidence').value,derivation_source:projected?'DF021/DF022 + RT_PROCESS_STEP':'MANUAL_VALIDATION',deduplication_key:id('ECON')});
    if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(eng,'impact');markDirty('Input económico añadido');closeModal();render();
    const zeroWithEvidence=[];if(activeHours===0&&activeContributors.length)zeroWithEvidence.push('trabajo activo');if(waitHours===0&&waitContributors.length)zeroWithEvidence.push('espera');
    if(zeroWithEvidence.length)toast(`Guardado con ${zeroWithEvidence.join(' y ')} anual en 0 aunque Proceso registra tiempo en esos pasos — revisa si falta transcribirlo.`);
  });
  const refresh=()=>{
    const ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    const projection=economicTimeProjection(eng,ids);
    const suggested=economicProjectionForDriver(projection,document.getElementById('econDriver')?.value);
    const target=document.getElementById('economicDerivedPreview');
    if(target)target.textContent=projection.available
      ?'Según pasos y volumen: '+preview(projection.active)+' h/año activas · '+preview(projection.wait)+' h/año de espera'+(projection.hasRework?' · '+preview(projection.rework)+' h/año de retrabajo':'')+(projection.hasFrictionExtra?' · '+preview(projection.frictionExtra)+' h/año de fricciones (no sumar sin comprobar solapamientos)':'')+(projection.missing.length?' · Pendiente: '+projection.missing.join('; '):'')
      :projection.reason;
    for(const [field,value] of [['econActive',suggested?.active],['econWait',suggested?.wait]]){
      const input=document.getElementById(field),unit=document.getElementById(field+'_unit');
      if(!input)continue;
      input.disabled=!!suggested;
      if(suggested){input.value=Number(value||0).toFixed(2);if(unit){unit.value='h';unit.dispatchEvent?.(new Event('change',{bubbles:true}))}}
      else if(input.dataset?.autoDerived==='true'){input.value='';}
      if(input.dataset)input.dataset.autoDerived=suggested?'true':'false';
    }
  };
  if(typeof document.querySelectorAll==='function')document.querySelectorAll('[data-econ-step]').forEach(el=>el.addEventListener?.('change',refresh));
  document.getElementById('econDriver')?.addEventListener?.('change',refresh);
  refresh();
}
// [AUNEA-FE-ECON-CAPTURE-030] END
