// [AUNEA-FE-ECON-CAPTURE-030] START — Captura de inputs económicos
// PURPOSE: Render and capture explicit EconomicInput records while preserving active/wait/direct-loss/tool/cash categories; never annualize Process Step time or calculate official economics in the browser.
// SOURCE: Diagnostic Master v1.2 RULE_ECON_AGGREGATION EAR-001/004/006/008/009/013; DEC-021/033/034/040/068; REF_ECON_DRIVER; governed evidence labels.
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

/* [AUNEA-FE-ECON-DERIVATION-035] START — backend-only preview of captured time.
   SOURCE: Diagnostic Master v1.2 RULE_ECON_ANNUALIZE and DEC-033/034/050.
   No DAY×365, WEEK×52, branch, rework or friction formulas may live here. */
function economicTimeRequest(e,stepIds=[]){
  const raw=e.answers?.DF021;
  const value=raw&&typeof raw==='object'?raw.value:raw;
  const steps=typeof activeSteps==='function'?activeSteps(e):e.processSteps||[];
  return {
    volume:value===null||value===undefined||value===''?null:Number(value),
    period:e.answers?.DF022||null,
    // No invented operating calendar: weekly/daily projections stay conditional
    // until governed operating weeks/days are captured by their canonical owner.
    steps,frictions:typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[],
    // Backend scopes the arithmetic while validating anchors against the complete map.
    scope_step_ids:stepIds.length?stepIds:null
  };
}
async function economicTimeProjection(e,stepIds=[]){
  // Capture the exact request before any asynchronous operation: Process Step and Friction
  // objects are mutable while the consultant edits the same Engagement in another surface.
  const requestKey=JSON.stringify(economicTimeRequest(e,stepIds));
  if(!state.backendOnline&&!(await checkBackend()))
    return {available:false,reason:'Backend no conectado. No se calcularán cifras en el navegador.',missing:['Backend no disponible']};
  const response=await fetch(`${state.backendUrl}/v1/diagnostic/time-projection`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:requestKey
  });
  if(!response.ok)throw new Error('El backend no pudo normalizar el tiempo del proceso.');
  const output=await response.json();
  // Never attribute a response calculated from an earlier input snapshot to a later
  // version of the AS-IS; a selected subset cannot overwrite the global DF078/DF079 cache.
  if(JSON.stringify(economicTimeRequest(e,stepIds))!==requestKey)
    return {available:false,status:'STALE',reason:'Los datos del proceso cambiaron durante el cálculo. Actualiza la vista previa.',missing:['Cálculo anterior invalidado por un cambio en el proceso']};
  if(!stepIds.length)e._sessionTimeProjection={requestKey,output};
  return {
    available:output.status==='CALCULATED',
    annualCases:output.annual_cases,
    active:output.annual_active_hours,
    wait:output.annual_wait_exposure_hours,
    rework:output.annual_rework_hours,
    additional:output.annual_friction_additional_hours,
    totalActive:output.annual_total_active_hours,
    monetaryPending:output.monetary_reconciliation||[],
    missing:output.gaps||[],
    pendingFrictions:output.frictions_pending_overlap_review||[],
    stepCount:JSON.parse(requestKey).steps.length,
    status:output.status,
    reason:(output.gaps||[]).join('; ')||'Cálculo no disponible'
  };
}
function economicProjectionForDriver(projection,driver){
  if(!projection?.available||projection.missing?.length)return null;
  if(driver==='ED01'&&projection.active!==null)
    return {active:projection.active,wait:0,label:'Trabajo activo total actual'};
  if(driver==='ED05'&&projection.rework!==null)
    return {active:projection.rework,wait:0,label:'Retrabajo ponderado por frecuencia'};
  if(driver==='ED13'&&projection.wait!==null)
    return {active:0,wait:projection.wait,label:'Exposición de espera, no ciclo end-to-end'};
  return null;
}
/* [AUNEA-FE-ECON-DERIVATION-035] END */

// [AUNEA-FE-ECON-OVERLAP-036] START — Conservative pre-save checks under EAR-001/004/006.
// SOURCE: Diagnostic Master v1.2 RULE_ECON_AGGREGATION; DEC-068 single-source ownership.
// INPUTS: Current Engagement EconomicInputs, active Frictions and draft EconomicInput.
// OUTPUTS: Spanish reasons to hold unproven additive entries; no calculations or new fields.
// SIDE_EFFECTS: None. CHANGE_RISK: HIGH.
function economicScopeOverlaps(a=[],b=[]){
  const x=normalizeArray(a),y=normalizeArray(b);
  return !x.length||!y.length||x.some(id=>y.includes(id));
}
function economicCaptureIssues(e,draft){
  const issues=[],rows=e.economicInputs||[],active=Number(draft.annual_active_hours||0);
  for(const x of rows){
    if(!economicScopeOverlaps(x.step_ids,draft.step_ids))continue;
    const prev=Number(x.annual_active_hours||0);
    if(active>0&&prev>0&&(x.driver_id===draft.driver_id||x.driver_id==='ED01'||draft.driver_id==='ED01')){
      issues.push('EAR-001/004: ya existe tiempo activo de este ámbito que puede contener el mismo trabajo. Revisa el registro original; no se suman totales y componentes sin desglose acreditado.');
      break;
    }
  }
  if(Number(draft.direct_loss_eur_annual||0)>0){
    const duplicateRows=rows.some(x=>Number(x.direct_loss_eur_annual||0)>0&&economicScopeOverlaps(x.step_ids,draft.step_ids));
    // DF063 is contextual evidence, not an automatically aggregated EconomicInput.
    // One validated DF082 row may therefore represent it, but a second overlapping
    // monetary EconomicInput with no event identity is held for reconciliation.
    if(duplicateRows)issues.push('DF063/DF082: ya existe una pérdida directa económica en este ámbito sin conciliación por evento. Verifica su propietario y evita registrarla otra vez.');
  }
  return [...new Set(issues)];
}
// [AUNEA-FE-ECON-OVERLAP-036] END

function economicBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  return section('Impactos registrados','Registramos por separado: trabajo activo, espera, pérdida directa, herramienta y ahorro de caja realizado. No se inventan porcentajes de recuperación.',`<div class="result-list">${e.economicInputs.length?e.economicInputs.map((x,i)=>`<div class="result-item"><div class="result-item-head"><div><b>${esc(econDriverLabel(x.driver_id))}</b><p>Activo ${x.annual_active_hours||0} h/año · Espera ${x.annual_wait_hours||0} h/año · Pérdida directa ${x.direct_loss_eur_annual||0} €/año · Evidencia: ${esc(engineLabel('evidence_quality',x.evidence_type))}</p><p>Pasos: ${(Array.isArray(x.step_ids)?x.step_ids:(x.step_ids?[x.step_ids]:[])).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')||'Sin anclar'}</p></div><div class="result-actions"><button class="btn btn-small" data-edit-economic-index="${i}">Editar</button><button class="btn btn-small btn-danger" data-delete-economic-index="${i}">Eliminar</button></div></div></div>`).join(''):'<div class="empty"><p>Todavía no hay impactos registrados.</p></div>'}</div>`,`<button class="btn btn-outline" id="addEconomic">Añadir impacto</button>`)
}

function addEconomic(preselectedSteps=[],editIndex=null){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const eng=currentEng(),steps=typeof activeSteps==='function'?activeSteps(eng):[];
  const existing=editIndex===null?null:eng.economicInputs[editIndex];
  if(editIndex!==null&&!existing)return;
  if(existing)preselectedSteps=normalizeArray(existing.step_ids);
  let preserveCapturedTime=!!existing;
  const drivers=schema.tables.REF_ECON_DRIVER||[];
  const activeContributors=activeTimeContributors(eng),waitContributors=waitTimeContributors(eng);
  const allFrictions=typeof activeFrictions==='function'?activeFrictions(eng):eng.frictions||[];
  const linkedFrictions=preselectedSteps.length?allFrictions.filter(f=>normalizeArray(f.affected_steps).some(x=>preselectedSteps.includes(x))):allFrictions;
  const linkedRisks=preselectedSteps.length?(eng.risks||[]).filter(r=>normalizeArray(r.step_ids).some(x=>preselectedSteps.includes(x))):(eng.risks||[]);
  const mappedTools=[...new Set(steps.flatMap(s=>normalizeArray(s.tool)).filter(Boolean))];
  const attributedLosses=linkedFrictions.filter(f=>Number(f.direct_loss?.value||0)>0);
  const inheritedContext='<div class="client-inherited-context"><b>Contexto reutilizado del AS-IS</b>'
    +'<p>'+steps.length+' pasos · '+linkedFrictions.length+' fricciones · '+linkedRisks.length+' riesgos disponibles como evidencia contextual.</p>'
    +(linkedFrictions.length?'<p>Fricciones: '+linkedFrictions.map(f=>esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))).join(' · ')+'</p>':'')
    +(mappedTools.length?'<p>Herramientas registradas en el mapa (DF046): '+mappedTools.map(x=>esc(labelFrom('OS_TOOL_CATEGORY',x))).join(' · ')+' · Registra sólo el coste atribuible a este proceso; no presupongas su eliminación.</p>':'')
    +(attributedLosses.length?'<p>Pérdidas directas declaradas en fricciones (DF063): '+attributedLosses.map(f=>esc(f.client_label||f.id)).join(' · ')+' · Comprueba que DF082 no vuelva a contabilizar el mismo evento.</p>':'')
    +'<small>El cálculo previo reutiliza los tiempos de los pasos y el volumen capturado. La espera no equivale a coste ni el trabajo activo equivale a desperdicio o ahorro.</small></div>';
  let serverProjection=null,serverSelection='',requestSequence=0;
  let capturedTimeFields={};
  const capturedHours=(id,field)=>{
    const input=document.getElementById(id),unit=document.getElementById(id+'_unit').value||'h';
    return preserveCapturedTime&&input.value===capturedTimeFields[id]&&unit==='h'
      ?(existing[field]??0):econHoursFrom(input.value,unit);
  };
  const preview=value=>Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:2});
  const initialPreview='Comprobando los datos de volumen, tiempo y calendario con el backend…';
  const activeHelp=activeContributors.length?`<div class="field-help">Pasos con tiempo activo registrado: ${esc(activeContributors.join(', '))}. Se reutilizan para obtener un cálculo revisable cuando el volumen y la aplicación están completos.</div>`:'<div class="field-help">Cuando faltan tiempos o volumen, indica el dato anual manualmente con su evidencia.</div>';
  const waitHelp=waitContributors.length?`<div class="field-help">Pasos con espera registrada: ${esc(waitContributors.join(', '))}. Se calcula por separado del trabajo; no constituye por sí misma ahorro económico.</div>`:'<div class="field-help">La espera se registra aparte del trabajo. Si faltan datos, introduce una cifra anual validada.</div>';
  openModal(existing?'Editar impacto':'Añadir impacto',`<div class="step-groups process-modal-form economic-modal-form">${inheritedContext}
    <details class="step-group" open><summary>Impacto en tiempo y evidencia</summary><div class="form-grid"><div class="field full"><div class="notice info" id="economicDerivedPreview" role="status">${esc(initialPreview)}</div><div class="field-help">Vista previa procedente del backend con DF021/DF022 y los tiempos registrados. El trabajo total no es tiempo desperdiciado; sólo el retrabajo medido se muestra como posible ineficiencia, sin sumar fricciones que pudieran solaparse.</div></div>
      <div class="field full"><label>Pasos del proceso relacionados</label><div class="choice-grid">${steps.map(s=>`<div class="choice"><input type="checkbox" id="econ_step_${attr(s.id)}" data-econ-step="${attr(s.id)}" ${preselectedSteps.includes(s.id)?'checked':''}><label for="econ_step_${attr(s.id)}">${esc(s.step_name||s.id)}</label></div>`).join('')}</div></div>
      <div class="field full"><label>Concepto económico</label>${econDropdown('econDriver',drivers.map(d=>({value:d.Economic_Driver_ID,label:econDriverLabel(d.Economic_Driver_ID)})),existing?.driver_id||drivers[0]?.Economic_Driver_ID||'','Selecciona…')}</div>
      <div class="field"><label>Tiempo activo atribuible</label>${econAnnualTimeControl('econActive',existing?.annual_active_hours||0,'h')}${activeHelp}</div>
      <div class="field"><label>Tiempo de espera atribuible</label>${econAnnualTimeControl('econWait',existing?.annual_wait_hours||0,'h')}${waitHelp}</div>
      <div class="field full"><label>Tipo de evidencia</label>${econDropdown('econEvidence',Object.entries(I18N_LABELS_ES.evidence_quality).map(([value,label])=>({value,label})),existing?.evidence_type||'','Selecciona…')}</div>
    </div></details>
    <details class="step-group" open><summary>Costes, pérdidas y ahorro realizado</summary><div class="form-grid">
      <div class="field"><label>¿Cuánto cuesta una hora de este perfil?</label><div class="compound-control"><input id="econRate" value="${attr(existing?.capacity_cost_rate_eur_hour??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/h</span></div><div class="field-help">Valor de capacidad; no equivale por sí solo a ahorro de caja.</div></div>
      <div class="field"><label>Pérdida directa anual</label><div class="compound-control"><input id="econDirect" value="${attr(existing?.direct_loss_eur_annual??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Pérdida financiera directa evidenciada y atribuible al proceso.</div></div>
      <div class="field"><label>Coste actual de herramientas</label><div class="compound-control"><input id="econTool" value="${attr(existing?.current_tool_cost_eur_annual??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Gasto actual atribuible; no se presume eliminable.</div></div>
      <div class="field"><label>Ahorro de caja ya realizado</label><div class="compound-control"><input id="econCash" value="${attr(existing?.realized_cash_saving_eur_annual??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Sólo ahorro real ya materializado; no es una estimación futura.</div></div>
    </div></details>
  </div>`,()=>{
    const step_ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    const selection=JSON.stringify({step_ids,request:economicTimeRequest(eng,step_ids)});
    const projected=!preserveCapturedTime&&serverSelection===selection?economicProjectionForDriver(serverProjection,document.getElementById('econDriver').value):null;
    // An automatic value belongs to its exact upstream version. It cannot become
    // a manual declaration merely because an async refresh or another tab changed it.
    if(!projected&&['econActive','econWait'].some(id=>document.getElementById(id)?.dataset?.autoDerived==='true'))
      return toast('Los datos del proceso han cambiado. Actualiza la vista previa antes de guardar el impacto.');
    const activeHours=projected?projected.active:capturedHours('econActive','annual_active_hours');
    const waitHours=projected?projected.wait:capturedHours('econWait','annual_wait_hours');
    const draft={step_ids,driver_id:document.getElementById('econDriver').value,annual_active_hours:activeHours,annual_wait_hours:waitHours,capacity_cost_rate_eur_hour:+document.getElementById('econRate').value||null,direct_loss_eur_annual:+document.getElementById('econDirect').value||0,current_tool_cost_eur_annual:+document.getElementById('econTool').value||0,realized_cash_saving_eur_annual:+document.getElementById('econCash').value||0,evidence_type:document.getElementById('econEvidence').value,derivation_source:projected?'DF021/DF022 + RT_PROCESS_STEP':(preserveCapturedTime&&activeHours===existing?.annual_active_hours&&waitHours===existing?.annual_wait_hours?existing.derivation_source:'MANUAL_VALIDATION'),deduplication_key:existing?.deduplication_key??null};
    if(!draft.evidence_type)return toast('Selecciona la evidencia correspondiente al dato económico; no se presupone que sea medido.');
    if(existing&&!eng.economicInputs.includes(existing))return toast('Este impacto ya no existe. Cierra el detalle y revisa la lista.');
    const overlaps=economicCaptureIssues({...eng,economicInputs:eng.economicInputs.filter(x=>x!==existing)},draft);
    if(overlaps.length)return toast(overlaps.join(' '));
    // Do not generate a random per-row key and pretend it identifies a unique economic event.
    // Event-level reconciliation is pending; the backend retains an explicit null instead.
    if(existing)Object.assign(existing,draft);else eng.economicInputs.push(draft);
    if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(eng,'impact');markDirty(existing?'Impacto modificado':'Impacto añadido');closeModal();render();
    const zeroWithEvidence=[];if(activeHours===0&&activeContributors.length)zeroWithEvidence.push('trabajo activo');if(waitHours===0&&waitContributors.length)zeroWithEvidence.push('espera');
    if(zeroWithEvidence.length)toast(`Guardado con ${zeroWithEvidence.join(' y ')} anual en 0 aunque Proceso registra tiempo en esos pasos — revisa si falta transcribirlo.`);
  });
  capturedTimeFields=Object.fromEntries(['econActive','econWait'].map(id=>[id,document.getElementById(id).value]));
  const refresh=async()=>{
    const ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    const selection=JSON.stringify({step_ids:ids,request:economicTimeRequest(eng,ids)});
    const token=++requestSequence;
    serverProjection=null;serverSelection='';
    const target=document.getElementById('economicDerivedPreview');
    if(target)target.textContent='Consultando el backend…';
    let projection;
    try{
      // Populate DF078/DF079 exclusively from the current full-process backend fingerprint.
      // A selected subset never masquerades as the global AS-IS projection.
      if(ids.length){const pair=await Promise.all([economicTimeProjection(eng,ids),economicTimeProjection(eng)]);projection=pair[0]}
      else projection=await economicTimeProjection(eng);
    }
    catch(error){projection={available:false,reason:error.message,missing:[error.message]}}
    if(token!==requestSequence||!target?.isConnected)return;
    const currentIds=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    if(JSON.stringify({step_ids:currentIds,request:economicTimeRequest(eng,currentIds)})!==selection)return;
    serverProjection=projection;serverSelection=selection;
    const suggested=preserveCapturedTime?null:economicProjectionForDriver(projection,document.getElementById('econDriver')?.value);
    if(target)target.textContent=projection.available
      ?'Según backend: '+preview(projection.active)+' h/año de trabajo activo · '+preview(projection.wait)+' h/año de exposición a espera · '+preview(projection.rework)+' h/año de retrabajo; esfuerzo adicional validado de fricciones: '+preview(projection.additional)+' h/año (separado, nunca duplicado)'+(projection.monetaryPending?.length?' · Pérdidas directas pendientes de conciliar con DF082.':'')
      :projection.reason;
    for(const [field,value] of [['econActive',suggested?.active],['econWait',suggested?.wait]]){
      const input=document.getElementById(field),unit=document.getElementById(field+'_unit');
      if(!input)continue;
      input.disabled=!!suggested;
      if(suggested){input.value=Number(value||0).toFixed(2);if(unit)unit.value='h'}
      else if(input.dataset?.autoDerived==='true')input.value='';
      if(input.dataset)input.dataset.autoDerived=suggested?'true':'false';
    }
  };
  if(typeof document.querySelectorAll==='function')document.querySelectorAll('[data-econ-step]').forEach(el=>el.addEventListener?.('change',()=>{preserveCapturedTime=false;refresh()}));
  document.getElementById('econDriver')?.addEventListener?.('change',()=>{preserveCapturedTime=false;refresh()});
  refresh();
}
function deleteEconomic(index){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),item=e?.economicInputs?.[index];if(!item)return;
  if(!confirm('¿Eliminar este impacto del estudio? Los informes históricos confirmados no se modificarán.'))return;
  if(typeof persistRecoverySnapshot==='function')persistRecoverySnapshot('eliminar-impacto');
  e.economicInputs.splice(index,1);invalidateProcessLayers(e,'impact');
  markDirty('Impacto eliminado');render();
}
// [AUNEA-FE-ECON-CAPTURE-030] END
