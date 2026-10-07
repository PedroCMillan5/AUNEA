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
function econNullableNumber(value){
  if(value===''||value===null||value===undefined)return null;
  const n=Number(value);return Number.isFinite(n)?n:NaN;
}
function econHoursFrom(value,unit='h'){
  if(value===''||value===null||value===undefined)return null;
  const n=Number(value);if(!Number.isFinite(n)||n<0)return NaN;
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
    available:output.status==='CALCULATED'||output.annual_active_hours!=null||output.annual_wait_exposure_hours!=null||output.annual_rework_hours!=null,
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
  if(!projection?.available)return null;
  const hasActive=projection.active!==null&&projection.active!==undefined;
  const hasWait=projection.wait!==null&&projection.wait!==undefined;
  const hasRework=projection.rework!==null&&projection.rework!==undefined;
  if(driver==='ED01'&&hasActive)
    return {active:projection.active,wait:0,label:'Trabajo activo anual'};
  if(driver==='ED05'&&hasRework)
    return {active:projection.rework,wait:0,label:'Retrabajo anual'};
  if(driver==='ED13'&&hasWait)
    return {active:0,wait:projection.wait,label:'Exposición anual a espera'};
  return null;
}

function economicDriverUi(driver){
  const activeTime=new Set(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08']);
  const directLoss=new Set(['ED09','ED10','ED11']);
  return {
    showActive:activeTime.has(driver),
    showWait:driver==='ED13',
    showRate:activeTime.has(driver)||driver==='ED14',
    showDirect:directLoss.has(driver),
    showTool:driver==='ED12',
    showCash:directLoss.has(driver)||driver==='ED12',
    activeLabel:driver==='ED05'?'Retrabajo anual':driver==='ED02'?'Tiempo de entrada duplicada anual':driver==='ED03'?'Tiempo de búsqueda / recuperación anual':driver==='ED04'?'Tiempo de seguimiento anual':driver==='ED06'?'Tiempo de consolidación de reporting anual':driver==='ED07'?'Tiempo de gestión de aprobaciones anual':driver==='ED08'?'Tiempo de gestión de traspasos anual':'Trabajo anual asociado',
    resultTitle:driver==='ED13'?'Espera anual cuantificada':driver==='ED05'?'Retrabajo anual cuantificado':activeTime.has(driver)?'Tiempo anual cuantificado':driver==='ED12'?'Coste de herramienta':'Impacto económico'
  };
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
function economicMetricShape(driver,row={}){
  const activeDrivers=new Set(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08']);
  return {
    active:activeDrivers.has(driver)?Number(row.annual_active_hours||0):0,
    wait:driver==='ED13'?Number(row.annual_wait_hours||0):0
  };
}

function normalizedEconomicDriverRecord(row={}){
  const x={...row},knownDrivers=new Set((schema?.tables?.REF_ECON_DRIVER||[]).map(r=>String(r.Economic_Driver_ID||r.Driver_ID||r.id||r.value||'')));
  if(!x.driver_id||knownDrivers.size&&!knownDrivers.has(String(x.driver_id)))return x;
  const ui=economicDriverUi(x.driver_id||'');
  const activeDrivers=new Set(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08']);
  if(!activeDrivers.has(x.driver_id))x.annual_active_hours=0;
  if(x.driver_id!=='ED13')x.annual_wait_hours=0;
  if(!ui.showRate)x.capacity_cost_rate_eur_hour=null;
  if(!ui.showDirect)x.direct_loss_eur_annual=0;
  if(!ui.showTool)x.current_tool_cost_eur_annual=0;
  if(!ui.showCash)x.realized_cash_saving_eur_annual=0;
  return x;
}
function migrateEconomicInputsToDriverShape(engagements=[]){
  let changed=0;
  (engagements||[]).forEach(e=>{
    let engagementChanged=false;
    (e.economicInputs||[]).forEach(x=>{
      const normalized=normalizedEconomicDriverRecord(x);
      for(const key of ['annual_active_hours','annual_wait_hours','capacity_cost_rate_eur_hour','direct_loss_eur_annual','current_tool_cost_eur_annual','realized_cash_saving_eur_annual']){
        if(JSON.stringify(x[key]??null)!==JSON.stringify(normalized[key]??null)){x[key]=normalized[key];engagementChanged=true}
      }
    });
    if(engagementChanged){
      changed++;
      if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'impact');
      else{e.confirmedAsIs=false;if(e.layerConfirmations)e.layerConfirmations.impact=false}
      if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'normalización de impactos heredados');
    }
  });
  return changed;
}
function economicInputIntegrityIssues(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):(e?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const byId=new Map(steps.map(s=>[s.id,s])),issues=[];
  (e?.economicInputs||[]).forEach((x,index)=>{
    const ids=normalizeArray(x.step_ids).filter(Boolean),selected=ids.map(id=>byId.get(id)).filter(Boolean);
    if(x.driver_id==='ED15')issues.push({index,kind:'DUPLICATE_OWNER',message:'Volumen de casos pertenece a Demanda (DF021/DF022). Este registro económico legacy debe revisarse y no se utilizará como segundo owner.'});
    if(x.driver_id==='ED13'&&Number(x.annual_active_hours||0)>0)
      issues.push({index,kind:'LEGACY_CROSS_METRIC',message:'Tiempo de espera contiene horas activas heredadas de una versión anterior. Se excluirán del cálculo al recalcular.'});
    if(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08'].includes(x.driver_id)&&Number(x.annual_wait_hours||0)>0)
      issues.push({index,kind:'LEGACY_CROSS_METRIC',message:'Un impacto de tiempo activo contiene horas de espera heredadas. Se excluirán del cálculo al recalcular.'});
    if(x.driver_id==='ED05'&&ids.length&&selected.length&&selected.every(s=>Number(s.rework_time||0)<=0)){
      const frictions=typeof activeFrictions==='function'?activeFrictions(e):(e?.frictions||[]).filter(f=>f.status!=='SUPERSEDED');
      const withFriction=new Set(frictions.flatMap(fr=>normalizeArray(fr.affected_steps)));
      const candidateSteps=steps.filter(s=>Number(s.rework_time||0)>0&&withFriction.has(s.id)),candidates=candidateSteps.map(s=>s.step_name||s.id);
      issues.push({index,kind:'SCOPE_MISMATCH',suggestedStepId:candidateSteps.length===1?candidateSteps[0].id:null,suggestedStepName:candidateSteps.length===1?(candidateSteps[0].step_name||candidateSteps[0].id):null,message:'Tiempo de retrabajo está asociado a un paso sin retrabajo registrado. '+(candidates.length?'Revisa el ámbito; pasos con retrabajo y fricción registrada: '+candidates.join(' · ')+'.':'Revisa el paso relacionado.')});
    }
    if(x.driver_id==='ED13'&&ids.length&&selected.length&&selected.every(s=>Number(s.wait_time||0)<=0)){
      const candidates=steps.filter(s=>Number(s.wait_time||0)>0).map(s=>s.step_name||s.id);
      issues.push({index,kind:'SCOPE_MISMATCH',message:'Tiempo de espera está asociado a un paso sin espera registrada. '+(candidates.length?'Pasos con espera registrada: '+candidates.join(' · ')+'.':'Revisa el paso relacionado.')});
    }
  });
  return issues;
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

let __auneaEconomicCandidates=[];
function economicReviewCandidates(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const existing=e.economicInputs||[];
  const existingCovers=(driver,ids)=>{
    const wanted=new Set(normalizeArray(ids));
    return existing.some(x=>x.driver_id===driver&&normalizeArray(x.step_ids).some(id=>wanted.has(id)));
  };
  const candidates=[];
  const add=(driver,ids,rationale,questions=[])=>{
    const stepIds=[...new Set(normalizeArray(ids).filter(Boolean))];
    if(!stepIds.length||existingCovers(driver,stepIds))return;
    candidates.push({driver_id:driver,step_ids:stepIds,rationale,review_questions:questions});
  };
  const active=steps.filter(s=>Number(s.active_time||0)>0).map(s=>s.id);
  const wait=steps.filter(s=>Number(s.wait_time||0)>0).map(s=>s.id);
  const rework=steps.filter(s=>Number(s.rework_time||0)>0).map(s=>s.id);
  if(active.length)add('ED01',active,'El mapa contiene trabajo manual medido en estos pasos. Conviene revisar si debe cuantificarse como carga anual del proceso, sin asumir que equivale a ahorro.',[
    '¿Este tiempo representa trabajo real recurrente?','¿El volumen y calendario permiten anualizarlo con evidencia suficiente?'
  ]);
  if(rework.length)add('ED05',rework,'El mapa contiene retrabajo en varios pasos. Conviene revisar su impacto anual como un único concepto y evitar contarlo otra vez dentro del tiempo activo general.',[
    '¿El retrabajo ya está incluido en otro impacto registrado?','¿Qué pasos concentran realmente el retrabajo?'
  ]);
  if(wait.length)add('ED13',wait,'El mapa contiene esperas. Conviene cuantificar la exposición anual a espera separadamente del trabajo activo; la espera no se monetiza automáticamente.',[
    '¿La espera ocurre de forma recurrente?','¿Qué pasos explican la mayor parte del tiempo de espera?'
  ]);
  const directLossSteps=[...new Set((typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[])
    .filter(f=>Number(f.direct_loss?.value||0)>0).flatMap(f=>normalizeArray(f.affected_steps)))];
  if(directLossSteps.length)add('ED09',directLossSteps,'Hay pérdidas monetarias directas declaradas en fricciones. Conviene revisar si existe un único evento económico validado que deba registrarse, evitando duplicarlo entre fricción e impacto.',[
    '¿La pérdida está evidenciada y puede anualizarse?','¿Es el mismo evento económico que ya aparece en otra fricción o impacto?'
  ]);
  return candidates;
}
async function reviewEconomicCandidates(){
  const e=currentEng();if(!e)return;
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  __auneaEconomicCandidates=economicReviewCandidates(e);
  const body=__auneaEconomicCandidates.length
    ?'<div class="notice info"><b>Impactos que conviene revisar con el cliente</b><p>AUNEA reutiliza el mapa, las fricciones y los tiempos ya capturados. Son oportunidades de cuantificación, no resultados económicos confirmados.</p></div><div class="result-list">'
      +__auneaEconomicCandidates.map((x,i)=>{
        const names=normalizeArray(x.step_ids).map(id=>steps.find(s=>s.id===id)?.step_name||'').filter(Boolean);
        const qs=normalizeArray(x.review_questions).filter(Boolean);
        return '<div class="result-item economic-review-card"><div class="result-item-head"><div><b>'+esc(econDriverLabel(x.driver_id))+'</b>'
          +'<p>'+esc(x.rationale||'')+'</p>'
          +(names.length?'<p><b>Dónde revisar:</b> '+names.map(esc).join(', ')+'</p>':'')
          +(names.length>1?'<p class="field-help">AUNEA ha agrupado el mismo tipo de impacto detectado en varios pasos para evitar recomendaciones repetidas.</p>':'')
          +(qs.length?'<div class="field-help"><b>Preguntas para validarlo:</b><br>'+qs.map(q=>'• '+esc(q)).join('<br>')+'</div>':'')
          +'</div><div class="result-actions"><button type="button" class="btn btn-small btn-primary" data-review-economic-candidate="'+i+'">Revisar impacto</button></div></div></div>';
      }).join('')+'</div>'
    :'<div class="empty"><h2>No hay nuevos impactos que revisar</h2><p>Los impactos detectables desde el AS-IS ya están registrados o no hay señal suficiente para sugerir otro.</p></div>';
  openModal('Impactos que conviene revisar',body,closeModal,'Cerrar');
  document.querySelectorAll('[data-review-economic-candidate]').forEach(b=>b.onclick=()=>{
    const x=__auneaEconomicCandidates[Number(b.dataset.reviewEconomicCandidate)];
    if(x){closeModal();addEconomic(x.step_ids,null,false,x)}
  });
}
function economicEvidenceLabel(value){
  const backend=typeof evidenceTypeBackend==='function'?evidenceTypeBackend(value):value;
  return typeof engineLabel==='function'?engineLabel('evidence_quality',backend):(backend||'—');
}
function economicRecordSummary(x){
  const evidence='Evidencia: '+economicEvidenceLabel(x.evidence_type);
  const num=v=>Number(v||0).toLocaleString('es-ES',{maximumFractionDigits:2});
  if(x.driver_id==='ED14'){
    const role=labelFrom('OS_ACTOR_ROLE',x.role_or_resource)||x.role_or_resource||'Rol pendiente';
    const capacity=x.value==null?'Capacidad práctica pendiente':num(x.value)+' '+(x.unit||'h')+(x.period?' / '+(labelFrom('OS_PERIOD',x.period)||x.period):'');
    const rate=x.capacity_cost_rate_eur_hour==null?'Coste/hora pendiente':num(x.capacity_cost_rate_eur_hour)+' €/h';
    return [rate,'Rol: '+role,capacity,evidence].join(' · ');
  }
  if(x.driver_id==='ED12'){
    const tools=x.current_tool_cost_eur_annual==null?'Coste pendiente':num(x.current_tool_cost_eur_annual)+' €/año';
    return [tools,evidence].join(' · ');
  }
  if(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08'].includes(x.driver_id)){
    const hours=x.annual_active_hours==null?'Tiempo pendiente':num(x.annual_active_hours)+' h/año';
    const rate=x.capacity_cost_rate_eur_hour==null?'':num(x.capacity_cost_rate_eur_hour)+' €/h';
    return [hours,rate,evidence].filter(Boolean).join(' · ');
  }
  if(x.driver_id==='ED13'){
    return [(x.annual_wait_hours==null?'Espera pendiente':num(x.annual_wait_hours)+' h/año de espera'),evidence].join(' · ');
  }
  if(['ED09','ED10','ED11'].includes(x.driver_id)){
    return [(x.direct_loss_eur_annual==null?'Pérdida pendiente':num(x.direct_loss_eur_annual)+' €/año'),evidence].join(' · ');
  }
  return evidence;
}
function economicRecordCompletenessIssues(x,index=0){
  const label=econDriverLabel(x.driver_id||'')||('impacto '+(index+1)),issues=[];
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
  if(!x.driver_id)return ['Selecciona el tipo de impacto del registro '+(index+1)+'.'];
  if(!x.evidence_type)issues.push('Selecciona la evidencia de "'+label+'".');
  if(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08'].includes(x.driver_id)&&!finite(x.annual_active_hours))
    issues.push('Completa el tiempo anual de "'+label+'".');
  if(x.driver_id==='ED13'&&!finite(x.annual_wait_hours))issues.push('Completa la espera anual de "'+label+'".');
  if(['ED09','ED10','ED11'].includes(x.driver_id)&&!finite(x.direct_loss_eur_annual))
    issues.push('Completa la pérdida anual de "'+label+'".');
  if(x.driver_id==='ED12'&&!finite(x.current_tool_cost_eur_annual))
    issues.push('Completa el coste anual de herramientas.');
  if(x.driver_id==='ED14'){
    if(!finite(x.capacity_cost_rate_eur_hour))issues.push('Completa el coste de capacidad por hora.');
    if(!x.role_or_resource)issues.push('Selecciona el rol/recurso del coste de capacidad.');
    if(!finite(x.value))issues.push('Completa la capacidad práctica/productiva del rol.');
    if(!x.period)issues.push('Selecciona el periodo de la capacidad práctica/productiva.');
  }
  return issues;
}

function economicBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  const fmt=v=>v===null||v===undefined||v===''?'—':String(v);
  return section('Impactos registrados','Añade sólo impactos que no estén ya capturados en Demanda o en el mapa. Cada registro tiene un único concepto y una evidencia.',
    '<div class="result-list">'+((e.economicInputs||[]).length?e.economicInputs.map((x,i)=>{
      const legacy=x.driver_id==='ED15';
      return '<div class="result-item"><div class="result-item-head"><div><b>'+esc(legacy?'Volumen de casos — registro legacy':econDriverLabel(x.driver_id))+'</b>'
        +(legacy?'<div class="notice warn economic-row-warning"><b>No se usa como impacto económico.</b><br>El volumen pertenece a Demanda (DF021/DF022). Elimina este registro duplicado para mantener un único owner.</div>':'<p>'+esc(economicRecordSummary(x))+'</p>')
        +'<p>Pasos: '+normalizeArray(x.step_ids).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')+'</p></div>'
        +'<div class="result-actions">'+(legacy?'':'<button class="btn btn-small" data-edit-economic-index="'+i+'">Editar</button>')+'<button class="btn btn-small btn-danger" data-delete-economic-index="'+i+'">Eliminar</button></div></div></div>';
    }).join(''):'<div class="empty"><p>Todavía no hay impactos registrados.</p></div>')+'</div>',
    '<button type="button" class="btn btn-outline" id="reviewEconomicCandidates">Revisar posibles impactos</button><button type="button" class="btn btn-primary" id="addEconomic" data-add-economic-global>Añadir impacto</button>')
}
function addEconomic(preselectedSteps=[],editIndex=null,forceSuggestedScope=false,candidate=null){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const eng=currentEng(),steps=typeof activeSteps==='function'?activeSteps(eng):[];
  const roleOptions=[...new Set(steps.map(s=>s.actor).filter(Boolean))].map(value=>({value,label:labelFrom('OS_ACTOR_ROLE',value)||value}));
  const capacityPeriods=typeof fieldOptions==='function'?fieldOptions('OS_PERIOD'):[];
  const existing=editIndex===null?null:eng.economicInputs[editIndex];
  if(!existing&&candidate?.step_ids?.length&&!preselectedSteps.length)preselectedSteps=normalizeArray(candidate.step_ids);
  if(editIndex!==null&&!existing)return;
  if(existing?.driver_id==='ED15')return toast('Volumen de casos ya pertenece a Demanda (DF021/DF022). Elimina este registro legacy; no puede editarse como impacto económico.');
  const requestedSteps=normalizeArray(preselectedSteps).filter(Boolean),existingSteps=normalizeArray(existing?.step_ids).filter(Boolean);
  const useSuggested=!!existing&&forceSuggestedScope&&requestedSteps.length>0;
  if(existing)preselectedSteps=useSuggested?requestedSteps:existingSteps;
  let preserveCapturedTime=!!existing&&!useSuggested;
  const drivers=schema.tables.REF_ECON_DRIVER||[],selectableDrivers=drivers.filter(d=>d.Economic_Driver_ID!=='ED15');
  const activeContributors=activeTimeContributors(eng),waitContributors=waitTimeContributors(eng);
  const allFrictions=typeof activeFrictions==='function'?activeFrictions(eng):eng.frictions||[];
  const economicContextHtml=stepIds=>{
    const selectedIds=normalizeArray(stepIds);
    const selectedSteps=selectedIds.length?steps.filter(s=>selectedIds.includes(s.id)):[];
    const linkedFrictions=selectedIds.length?allFrictions.filter(f=>normalizeArray(f.affected_steps).some(x=>selectedIds.includes(x))):[];
    const linkedRisks=selectedIds.length?(eng.risks||[]).filter(r=>normalizeArray(r.step_ids).some(x=>selectedIds.includes(x))):[];
    const selectedTools=[...new Set(selectedSteps.flatMap(s=>normalizeArray(s.tool)).filter(Boolean))];
    const attributedLosses=linkedFrictions.filter(f=>Number(f.direct_loss?.value||0)>0);
    const volume=eng.answers?.DF021,period=eng.answers?.DF022;
    const volumeText=volume!==undefined&&volume!==null&&volume!==''?esc(volume)+' casos'+(period?' · '+esc(labelFrom('OS_PERIOD',String(period).toUpperCase())||period):''):'Volumen pendiente';
    const stepSummary=selectedSteps.length
      ?selectedSteps.map(s=>'<div class="economic-context-step"><b>'+esc(s.step_name||s.id)+'</b><span>'+Number(s.active_time||0)+' min trabajo · '+Number(s.wait_time||0)+' min espera · '+Number(s.rework_time||0)+' min retrabajo</span></div>').join('')
      :'<div class="economic-context-empty">Selecciona uno o varios pasos para acotar el impacto.</div>';
    return '<div class="client-inherited-context economic-context-card"><div class="economic-context-head"><div><b>Contexto del impacto</b><span>'+volumeText+'</span></div></div>'
      +'<div class="economic-context-steps">'+stepSummary+'</div>'
      +'<div class="economic-context-links">'
      +(linkedFrictions.length?'<p><b>Fricciones relacionadas:</b> '+linkedFrictions.map(f=>esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))).join(' · ')+'</p>':'<p><b>Fricciones relacionadas:</b> Ninguna.</p>')
      +(linkedRisks.length?'<p><b>Riesgos relacionados:</b> '+linkedRisks.map(r=>esc(r.description||labelFrom('OS_RISK_CATEGORY',r.category))).join(' · ')+'</p>':'<p><b>Riesgos relacionados:</b> Ninguno.</p>')
      +'</div>'
      +(selectedTools.length?'<p class="economic-context-meta">Herramientas de los pasos seleccionados: '+selectedTools.map(x=>esc(labelFrom('OS_TOOL_CATEGORY',x))).join(' · ')+'. Registra sólo el coste atribuible; no presupongas su eliminación.</p>':'')
      +(attributedLosses.length?'<p class="economic-context-meta">Pérdidas directas ya declaradas en fricciones: '+attributedLosses.map(f=>esc(f.client_label||f.id)).join(' · ')+'. Evita volver a contabilizar el mismo evento.</p>':'')
      +'<small>Los tiempos y el volumen se reutilizan del AS-IS. La espera no equivale a coste y el trabajo activo no equivale automáticamente a ahorro.</small></div>';
  };
  const inheritedContext='<div id="economicInheritedContext">'+economicContextHtml(preselectedSteps)+'</div>';
  let serverProjection=null,serverSelection='',requestSequence=0;
  let capturedTimeFields={};
  const capturedHours=(id,field)=>{
    const input=document.getElementById(id),unit=document.getElementById(id+'_unit').value||'h';
    return preserveCapturedTime&&input.value===capturedTimeFields[id]&&unit==='h'
      ?(existing[field]??0):econHoursFrom(input.value,unit);
  };
  const preview=value=>Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:2});
  const initialPreview='Comprobando los datos de volumen, tiempo y calendario con el backend…';
  const candidateNotice=!existing&&candidate?'<div class="notice info economic-candidate-prefill"><b>Señal para revisar — no es un impacto confirmado</b><p>'+esc(candidate.rationale||'')+'</p>'+(normalizeArray(candidate.review_questions).length?'<div class="field-help"><b>Comprueba antes de guardar:</b><br>'+normalizeArray(candidate.review_questions).map(q=>'• '+esc(q)).join('<br>')+'</div>':'')+'</div>':'';
  openModal(existing?'Editar impacto':'Añadir impacto',`<div class="step-groups process-modal-form economic-modal-form">${candidateNotice}${inheritedContext}
    <details class="step-group" open><summary>1. Ámbito del impacto</summary><div class="form-grid">
      <div class="field full"><label>Pasos del proceso relacionados</label><div class="choice-grid">${steps.map(s=>`<div class="choice"><input type="checkbox" id="econ_step_${attr(s.id)}" data-econ-step="${attr(s.id)}" ${preselectedSteps.includes(s.id)?'checked':''}><label for="econ_step_${attr(s.id)}">${esc(s.step_name||s.id)}</label></div>`).join('')}</div></div>
    </div></details>
    <details class="step-group" open><summary>2. Qué quieres cuantificar</summary><div class="form-grid">
      <div class="field full"><label>Concepto económico</label>${econDropdown('econDriver',[{value:'',label:'Selecciona…'},...selectableDrivers.map(d=>({value:d.Economic_Driver_ID,label:econDriverLabel(d.Economic_Driver_ID)}))],existing?.driver_id||candidate?.driver_id||'','Selecciona…')}</div>
      <div class="field full economic-derived-card"><div class="economic-derived-kicker" id="economicResultTitle">Impacto calculado</div><div class="notice info" id="economicDerivedPreview" role="status">${esc(initialPreview)}</div><div class="field-help" id="economicResultHelp">AUNEA reutiliza volumen y tiempos ya capturados. Los cálculos derivados pertenecen al backend.</div></div>
      <div class="field" data-econ-ui="active"><label id="econActiveLabel">Trabajo anual asociado</label>${econAnnualTimeControl('econActive',existing?.annual_active_hours||0,'h')}<div class="field-help" id="econActiveHelp">Si el backend puede derivarlo, el dato se completa automáticamente. En caso contrario requiere validación manual y evidencia.</div></div>
      <div class="field" data-econ-ui="wait"><label>Espera anual cuantificada</label>${econAnnualTimeControl('econWait',existing?.annual_wait_hours||0,'h')}<div class="field-help">Exposición a espera del proceso. No se monetiza automáticamente como trabajo ni como ahorro.</div></div>
      <div class="field full"><label>Tipo de evidencia</label>${econDropdown('econEvidence',Object.entries(I18N_LABELS_ES.evidence_quality).map(([value,label])=>({value,label})),existing?.evidence_type||'','Selecciona…')}</div>
    </div></details>
    <details class="step-group" open id="economicValueGroup"><summary>3. Valor económico cuando proceda</summary><div class="form-grid">
      <div class="field" data-econ-ui="rate"><label>Coste de capacidad por hora</label><div class="compound-control"><input id="econRate" value="${attr(existing?.capacity_cost_rate_eur_hour??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/h</span></div><div class="field-help">Valor de capacidad del perfil. No equivale por sí solo a ahorro de caja.</div></div>
      <div class="field" data-econ-ui="capacity-meta"><label>Rol / recurso</label>${econDropdown('econRole',[{value:'',label:'Selecciona…'},...roleOptions],existing?.role_or_resource||'','Selecciona…')}</div>
      <div class="field" data-econ-ui="capacity-meta"><label>Capacidad práctica/productiva del rol</label><div class="compound-control"><input id="econCapacityValue" value="${attr(existing?.value??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">h</span></div><div class="field-help">Horas prácticas disponibles del mismo rol y periodo; no se presupone ningún porcentaje de utilización.</div></div>
      <div class="field" data-econ-ui="capacity-meta"><label>Periodo de la capacidad práctica</label>${econDropdown('econCapacityPeriod',[{value:'',label:'Selecciona…'},...capacityPeriods],existing?.period||'','Selecciona…')}</div>
      <div class="field" data-econ-ui="direct"><label>Pérdida directa anual</label><div class="compound-control"><input id="econDirect" value="${attr(existing?.direct_loss_eur_annual??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Pérdida financiera directa evidenciada y atribuible al proceso.</div></div>
      <div class="field" data-econ-ui="tool"><label>Coste actual de herramientas</label><div class="compound-control"><input id="econTool" value="${attr(existing?.current_tool_cost_eur_annual??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Gasto actual atribuible. No se presume eliminable.</div></div>
      <div class="field" data-econ-ui="cash"><label>Ahorro de caja ya realizado</label><div class="compound-control"><input id="econCash" value="${attr(existing?.realized_cash_saving_eur_annual??'')}" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Sólo ahorro real ya materializado; nunca una estimación futura.</div></div>
      <div class="field full economic-value-empty" id="economicValueEmpty">Este concepto no necesita un importe económico adicional para registrarse.</div>
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
    let draft={step_ids,driver_id:document.getElementById('econDriver').value,annual_active_hours:activeHours,annual_wait_hours:waitHours,capacity_cost_rate_eur_hour:econNullableNumber(document.getElementById('econRate').value),role_or_resource:document.getElementById('econRole')?.value||null,value:econNullableNumber(document.getElementById('econCapacityValue')?.value),unit:document.getElementById('econCapacityValue')?.value!==''?'h':null,period:document.getElementById('econCapacityPeriod')?.value||null,direct_loss_eur_annual:econNullableNumber(document.getElementById('econDirect').value),current_tool_cost_eur_annual:econNullableNumber(document.getElementById('econTool').value),realized_cash_saving_eur_annual:econNullableNumber(document.getElementById('econCash').value),evidence_type:document.getElementById('econEvidence').value,derivation_source:projected?'DF021/DF022 + RT_PROCESS_STEP':(preserveCapturedTime&&activeHours===existing?.annual_active_hours&&waitHours===existing?.annual_wait_hours?existing.derivation_source:'MANUAL_VALIDATION'),deduplication_key:existing?.deduplication_key??null};
    if(!draft.driver_id)return toast('Selecciona el tipo de impacto antes de guardar.');
    if(draft.driver_id==='ED15')return toast('El volumen de casos pertenece a Demanda (DF021/DF022); no se crea un EconomicInput duplicado para ED15.');
    draft=normalizedEconomicDriverRecord(draft);
    if(['annual_active_hours','annual_wait_hours','capacity_cost_rate_eur_hour','direct_loss_eur_annual','current_tool_cost_eur_annual','realized_cash_saving_eur_annual'].some(k=>draft[k]!==null&&draft[k]!==undefined&&(!Number.isFinite(Number(draft[k]))||Number(draft[k])<0)))return toast('Los valores económicos deben ser números iguales o mayores que 0.');
    if(draft.driver_id!=='ED14'){draft.role_or_resource=null;draft.value=null;draft.unit=null;draft.period=null}
    if(draft.driver_id==='ED14'&&draft.value!=null&&(!draft.role_or_resource||!draft.period))return toast('Para registrar capacidad práctica, selecciona el rol y el periodo.');
    if(!draft.evidence_type)return toast('Selecciona la evidencia correspondiente al dato económico; no se presupone que sea medido.');
    const scopeCheck=economicInputIntegrityIssues({...eng,economicInputs:[draft]}).filter(x=>x.kind==='SCOPE_MISMATCH');
    if(scopeCheck.length)return toast(scopeCheck.map(x=>x.message).join(' '));

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
  const applyEconomicDriverUi=()=>{
    const driver=document.getElementById('econDriver')?.value||'';
    const ui=economicDriverUi(driver);
    if(typeof document.querySelectorAll==='function'){
      document.querySelectorAll('[data-econ-ui="active"]').forEach(x=>x.style.display=ui.showActive?'':'none');
      document.querySelectorAll('[data-econ-ui="wait"]').forEach(x=>x.style.display=ui.showWait?'':'none');
      document.querySelectorAll('[data-econ-ui="rate"]').forEach(x=>x.style.display=ui.showRate?'':'none');
      document.querySelectorAll('[data-econ-ui="direct"]').forEach(x=>x.style.display=ui.showDirect?'':'none');
      document.querySelectorAll('[data-econ-ui="tool"]').forEach(x=>x.style.display=ui.showTool?'':'none');
      document.querySelectorAll('[data-econ-ui="cash"]').forEach(x=>x.style.display=ui.showCash?'':'none');
      document.querySelectorAll('[data-econ-ui="capacity-meta"]').forEach(x=>x.style.display=driver==='ED14'?'':'none');
    }
    const activeLabel=document.getElementById('econActiveLabel');if(activeLabel)activeLabel.textContent=ui.activeLabel;
    const resultTitle=document.getElementById('economicResultTitle');if(resultTitle)resultTitle.textContent=ui.resultTitle;
    const empty=document.getElementById('economicValueEmpty');
    if(empty)empty.style.display=(ui.showRate||ui.showDirect||ui.showTool||ui.showCash)?'none':'';
  };
  applyEconomicDriverUi();
  capturedTimeFields=Object.fromEntries(['econActive','econWait'].map(id=>[id,document.getElementById(id).value]));
  const refresh=async()=>{
    const ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    const contextTarget=document.getElementById('economicInheritedContext');
    if(contextTarget)contextTarget.innerHTML=economicContextHtml(ids);
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
    if(target){
      const selectedDriver=document.getElementById('econDriver')?.value||'';
      const auto=economicProjectionForDriver(projection,selectedDriver);
      const context='Contexto backend: '+(projection.active==null?'—':preview(projection.active))+' h/año trabajo · '+(projection.wait==null?'—':preview(projection.wait))+' h/año espera · '+(projection.rework==null?'—':preview(projection.rework))+' h/año retrabajo';
      const chosen=auto?' · Se registrará automáticamente: '+auto.label+' = '+preview(auto.active||auto.wait)+' h/año':' · Este concepto no tiene una derivación automática gobernada; introduce sólo un dato validado cuando corresponda.';
      target.textContent=projection.available?context+chosen+(projection.missing?.length?' · Datos pendientes: '+projection.missing.join(' · '):''):projection.reason;
    }
    for(const [field,value] of [['econActive',suggested?.active],['econWait',suggested?.wait]]){
      const input=document.getElementById(field),unit=document.getElementById(field+'_unit');
      if(!input)continue;
      const ui=economicDriverUi(document.getElementById('econDriver')?.value||'');
      const relevant=field==='econActive'?ui.showActive:ui.showWait;
      const isDerived=!!suggested&&relevant;
      input.disabled=isDerived;
      if(isDerived){
        input.value=Number(value||0).toFixed(2);
        if(unit)unit.value='h';
      }else if(!relevant){
        input.value='0';
        if(unit)unit.value='h';
      }else if(input.dataset?.autoDerived==='true')input.value='';
      if(input.dataset)input.dataset.autoDerived=isDerived?'true':'false';
      if(unit){
        unit.disabled=isDerived;
        const unitBox=unit.closest?.('.canonical-aunea-select')?.querySelector?.('details.aunea-select');
        if(unitBox){
          unitBox.classList.toggle('is-disabled',isDerived);
          unitBox.dataset.disabled=isDerived?'1':'0';
          if(isDerived)unitBox.open=false;
        }
      }
    }
  };
  if(typeof document.querySelectorAll==='function')document.querySelectorAll('[data-econ-step]').forEach(el=>el.addEventListener?.('change',()=>{preserveCapturedTime=false;refresh()}));
  document.getElementById('econDriver')?.addEventListener?.('change',()=>{preserveCapturedTime=false;applyEconomicDriverUi();refresh()});
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
