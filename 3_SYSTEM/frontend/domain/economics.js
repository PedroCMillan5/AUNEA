// [AUNEA-FE-ECON-CAPTURE-030] START — Captura de inputs económicos
// PURPOSE: Render and capture explicit EconomicInput records while preserving active/wait/direct-loss/tool/cash categories; never annualize Process Step time or calculate official economics in the browser.
// SOURCE: Diagnostic Master v1.2 RULE_ECON_AGGREGATION EAR-001/004/006/008/009/013; DEC-021/033/034/040/068; REF_ECON_DRIVER; governed evidence labels.
// INPUTS: current Engagement, explicit consultant-entered annual values and evidence quality.
// OUTPUTS: engagement.economicInputs records matching the backend EconomicInput contract.
// SIDE_EFFECTS: modal DOM and engagement state mutation; no official economics calculation.
// CHANGE_RISK: HIGH.
const ECON_DRIVER_LABELS_ES=Object.freeze({
  ED01:'Tiempo de ejecución manual',
  ED02:'Tiempo dedicado a introducir datos dos veces',
  ED03:'Tiempo dedicado a buscar información',
  ED04:'Tiempo dedicado a hacer seguimiento',
  ED05:'Tiempo dedicado a corregir o repetir tareas',
  ED06:'Tiempo dedicado a preparar informes',
  ED07:'Tiempo dedicado a gestionar aprobaciones',
  ED08:'Tiempo dedicado a pasar trabajo entre personas',
  ED09:'Coste directo de error / defecto',
  ED10:'Facturación perdida / fuga de ingresos',
  ED11:'Penalización / pérdida evitable',
  ED12:'Coste de herramientas',
  ED13:'Tiempo en que el caso queda pendiente',
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
  const req=economicTimeRequest(e,stepIds);
  if(!state.backendOnline&&!(await checkBackend()))
    return {available:false,reason:'Backend no conectado. No se calcularán cifras en el navegador.',missing:['Backend no disponible']};
  const response=await fetch(`${state.backendUrl}/v1/diagnostic/time-projection`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req)
  });
  if(!response.ok)throw new Error('El backend no pudo normalizar el tiempo del proceso.');
  const output=await response.json();
  // One backend projection may serve No-Reask DF078/DF079 for the whole process.
  // Never cache a selected subset as if it were the full AS-IS.
  if(!stepIds.length)e._sessionTimeProjection={requestKey:JSON.stringify(req),output};
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
    stepCount:req.steps.length,
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

/* [AUNEA-FE-ECON-ROLE-RATES-037] START — DF076 is the single owner of role-specific rates.
   SOURCE: Diagnostic Master v1.2 DF076 ROLE_RATE_TABLE; DEC-050/065, EAR-001/004.
   Role cost is a capacity valuation input, never realized cash saving. */
function economicRoleRates(e){return Array.isArray(e?.answers?.DF076)?e.answers.DF076:[]}
function economicRoles(e){return [...new Set((typeof activeSteps==='function'?activeSteps(e):e.processSteps||[]).map(s=>s.actor).filter(Boolean))]}
function economicRateForRole(e,role){return economicRoleRates(e).find(x=>x.role===role&&Number(x.eur_hour)>0&&x.evidence_type)||null}
function economicInputRole(e,item){
  const steps=typeof activeSteps==='function'?activeSteps(e):e.processSteps||[];
  const ids=normalizeArray(item.step_ids);
  const roles=[...new Set(steps.filter(x=>ids.includes(x.id)).map(x=>x.actor).filter(Boolean))];
  return roles.length===1?roles[0]:null;
}
function economicRoleRateMismatch(e,item){
  const role=economicInputRole(e,item),rate=role?economicRateForRole(e,role):null;
  return !!(item.capacity_cost_rate_eur_hour!=null&&(!rate||Number(item.capacity_cost_rate_eur_hour)!==Number(rate.eur_hour)));
}
function economicRoleRateIssues(e){return (e.economicInputs||[]).filter(x=>economicRoleRateMismatch(e,x))}
function applyEconomicRoleRate(index){
  const e=currentEng(),item=e.economicInputs?.[index],role=item&&economicInputRole(e,item);
  const rate=role?economicRateForRole(e,role):null;
  if(!item||!rate)return toast('Selecciona pasos de un solo perfil y registra primero su coste y evidencia.');
  item.capacity_cost_rate_eur_hour=Number(rate.eur_hour);
  if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'impact');
  markDirty('Coste económico sincronizado con DF076');render();
}
function economicRoleRateTable(e){
  const roles=economicRoles(e),rates=economicRoleRates(e);
  const rows=roles.map(role=>{
    const rate=rates.find(x=>x.role===role)||{},label=typeof labelFrom==='function'?labelFrom('OS_ACTOR_ROLE',role):role;
    const evidence=Object.entries(I18N_LABELS_ES.evidence_quality).map(([value,text])=>({value,label:text}));
    return '<div class="form-grid" data-econ-role-row="'+attr(role)+'"><div class="field"><label>¿Cuánto cuesta una hora de '+esc(label)+'?</label>'
      +'<div class="compound-control"><input type="number" min="0" step="any" data-econ-role-value="'+attr(role)+'" value="'+attr(rate.eur_hour??'')+'" placeholder="Sin dato"><span class="unit-label">€/h</span></div></div>'
      +'<div class="field"><label>¿Cómo sabemos este coste?</label>'+econDropdown('econ_role_evidence_'+roles.indexOf(role),[{value:'',label:'Pendiente'},...evidence],rate.evidence_type||'','Selecciona evidencia…')+'</div></div>';
  }).join('');
  return '<div class="notice info" data-economic-role-rates="true"><b>Coste por perfil</b>'
    +'<p>Usamos los responsables ya indicados en los pasos. Indica el coste de una hora y su procedencia sólo si existe un dato defendible. La espera no se convierte en coste laboral.</p>'
    +(rows||'<p>Indica primero quién realiza cada paso del proceso.</p>')
    +(roles.length?'<button type="button" class="btn btn-outline" id="saveEconomicRoleRates">Guardar costes por perfil</button>':'')
    +'</div>';
}
function saveEconomicRoleRates(){
  const e=currentEng(),roles=economicRoles(e),rows=[],existing=economicRoleRates(e);
  for(const [i,role] of roles.entries()){
    const row=document.querySelectorAll('[data-econ-role-row]')[i];
    const raw=row?.querySelector('[data-econ-role-value]')?.value??'';
    const evid=document.getElementById('econ_role_evidence_'+i)?.value||'';
    if(raw===''){continue}
    const rate=Number(raw);
    if(!Number.isFinite(rate)||rate<=0)return toast('Indica un coste por hora válido para cada perfil que quieras valorar.');
    if(!evid)return toast('Indica de dónde sale el coste por hora de cada perfil.');
    rows.push({role,eur_hour:rate,evidence_type:evid});
  }
  // Reconcile only rate values that were demonstrably derived from the former DF076 owner.
  // Legacy one-off rates remain visible for explicit review, never silently overwritten.
  if(JSON.stringify(rows)!==JSON.stringify(existing)){
    const before=new Map(existing.map(x=>[x.role,Number(x.eur_hour)]));
    const after=new Map(rows.map(x=>[x.role,Number(x.eur_hour)]));
    (e.economicInputs||[]).forEach(item=>{
      const role=economicInputRole(e,item),oldRate=before.get(role);
      if(role&&oldRate!==undefined&&Number(item.capacity_cost_rate_eur_hour)===oldRate)
        item.capacity_cost_rate_eur_hour=after.get(role)??null;
    });
    setAnswer('DF076',rows);
    if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'impact');
  }
  markDirty('Costes por perfil revisados');render();toast('Costes por perfil guardados.');
}
/* [AUNEA-FE-ECON-ROLE-RATES-037] END */

function economicBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  return section('Tiempo y costes del proceso','Usamos los datos que ya tenemos y preguntamos sólo lo que falta. El trabajo, la espera, las pérdidas y el ahorro real se muestran por separado.',economicRoleRateTable(e)+`<div class="result-list">${e.economicInputs.length?e.economicInputs.map((x,i)=>`<div class="result-item"><b>${esc(econDriverLabel(x.driver_id))}</b>${economicRoleRateMismatch(e,x)?`<p class="notice warn">El coste de este registro no coincide con el perfil actual. ${economicRateForRole(e,economicInputRole(e,x))?`<button type="button" class="btn btn-small" data-econ-apply-rate="${i}">Usar coste del perfil</button>`:'Registra el coste del perfil para poder revisarlo.'}</p>`:''}<p>Activo ${x.annual_active_hours||0} h/año · Espera ${x.annual_wait_hours||0} h/año · Pérdida directa ${x.direct_loss_eur_annual||0} €/año · Evidencia: ${esc(engineLabel('evidence_quality',x.evidence_type))}</p><p>Pasos: ${(Array.isArray(x.step_ids)?x.step_ids:(x.step_ids?[x.step_ids]:[])).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')||'Sin anclar'}</p></div>`).join(''):'<div class="empty"><p>Todavía no se han registrado datos económicos.</p></div>'}</div>`,`<button class="btn btn-outline" id="addEconomic">Añadir dato económico</button>`)
}

function addEconomic(preselectedSteps=[]){
  const eng=currentEng(),steps=typeof activeSteps==='function'?activeSteps(eng):[];
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
    +'<small>El cálculo previo reutiliza los tiempos de los pasos y el volumen capturado. El tiempo de espera no es tiempo trabajado. El trabajo actual no equivale automáticamente a pérdida ni a ahorro.</small></div>';
  let serverProjection=null,serverSelection='',requestSequence=0;
  const preview=value=>Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:2});
  const initialPreview='Comprobando los datos de volumen, tiempo y calendario con el backend…';
  const activeHelp=activeContributors.length?`<div class="field-help">Pasos con tiempo activo registrado: ${esc(activeContributors.join(', '))}. Se reutilizan para obtener un cálculo revisable cuando el volumen y la aplicación están completos.</div>`:'<div class="field-help">Cuando faltan tiempos o volumen, indica el dato anual manualmente con su evidencia.</div>';
  const waitHelp=waitContributors.length?`<div class="field-help">Pasos con espera registrada: ${esc(waitContributors.join(', '))}. Se calcula por separado del trabajo; no constituye por sí misma ahorro económico.</div>`:'<div class="field-help">La espera se cuenta por separado. Si faltan datos, indica una cifra anual que puedas justificar.</div>';
  openModal('Registrar tiempo o coste',`<div class="step-groups process-modal-form economic-modal-form">${inheritedContext}
    <details class="step-group" open><summary>Impacto en tiempo y evidencia</summary><div class="form-grid"><div class="field full"><div class="notice info" id="economicDerivedPreview" role="status">${esc(initialPreview)}</div><div class="field-help">Este cálculo usa el volumen y los tiempos ya registrados. El tiempo total de trabajo no es tiempo desperdiciado. No sumaremos dos veces un mismo problema.</div></div>
      <div class="field full"><label>Pasos del proceso relacionados</label><div class="choice-grid">${steps.map(s=>`<div class="choice"><input type="checkbox" id="econ_step_${attr(s.id)}" data-econ-step="${attr(s.id)}" ${preselectedSteps.includes(s.id)?'checked':''}><label for="econ_step_${attr(s.id)}">${esc(s.step_name||s.id)}</label></div>`).join('')}</div></div>
      <div class="field full"><label>¿Qué tiempo o coste estamos registrando?</label>${econDropdown('econDriver',drivers.map(d=>({value:d.Economic_Driver_ID,label:econDriverLabel(d.Economic_Driver_ID)})),drivers[0]?.Economic_Driver_ID||'','Selecciona…')}</div>
      <div class="field"><label>¿Cuántas horas de trabajo supone al año?</label>${econAnnualTimeControl('econActive',0,'h')}${activeHelp}</div>
      <div class="field"><label>¿Cuánto tiempo queda esperando el caso?</label>${econAnnualTimeControl('econWait',0,'h')}${waitHelp}</div>
      <div class="field full"><label>¿De dónde salen estos datos?</label>${econDropdown('econEvidence',Object.entries(I18N_LABELS_ES.evidence_quality).map(([value,label])=>({value,label})),'','Selecciona…')}</div>
    </div></details>
    <details class="step-group" open><summary>Costes, pérdidas y ahorro realizado</summary><div class="form-grid">
      <div class="field"><label>Coste por hora del perfil que realiza el trabajo</label><div class="compound-control"><input id="econRate" type="number" min="0" step="any" inputmode="decimal" placeholder="Se reutiliza de DF076" readonly><span class="unit-label">€/h</span></div><div class="field-help" id="econRoleRateHelp">Se reutiliza el coste registrado en este apartado. Para valorar varios perfiles, selecciona y guarda sus pasos por separado. No equivale a ahorro efectivo.</div></div>
      <div class="field"><label>¿Cuánto dinero se ha perdido directamente al año?</label><div class="compound-control"><input id="econDirect" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Pérdida financiera directa evidenciada y atribuible al proceso.</div></div>
      <div class="field"><label>¿Cuánto cuestan hoy las herramientas al año?</label><div class="compound-control"><input id="econTool" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Gasto actual atribuible; no se presume eliminable.</div></div>
      <div class="field"><label>¿Qué ahorro real de dinero se ha conseguido ya?</label><div class="compound-control"><input id="econCash" type="number" min="0" step="any" inputmode="decimal" placeholder="0"><span class="unit-label">€/año</span></div><div class="field-help">Sólo ahorro real ya materializado; no es una estimación futura.</div></div>
    </div></details>
  </div>`,()=>{
    const step_ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    const selection=JSON.stringify({step_ids,request:economicTimeRequest(eng,step_ids)});
    const projected=serverSelection===selection?economicProjectionForDriver(serverProjection,document.getElementById('econDriver').value):null;
    // An automatic value belongs to its exact upstream version. It cannot become
    // a manual declaration merely because an async refresh or another tab changed it.
    if(!projected&&['econActive','econWait'].some(id=>document.getElementById(id)?.dataset?.autoDerived==='true'))
      return toast('Han cambiado los datos del proceso. Actualiza el cálculo antes de guardar.');
    const activeHours=projected?projected.active:econHoursFrom(document.getElementById('econActive').value,document.getElementById('econActive_unit').value||'h');
    const waitHours=projected?projected.wait:econHoursFrom(document.getElementById('econWait').value,document.getElementById('econWait_unit').value||'h');
    const selectedRoles=[...new Set(steps.filter(x=>step_ids.includes(x.id)).map(x=>x.actor).filter(Boolean))];
    if(selectedRoles.length>1&&document.getElementById('econRate')?.value)return toast('Estos pasos tienen responsables distintos. Puedes guardar el tiempo sin coste, o separar los pasos por perfil para valorar cada uno.');
    const selectedRate=selectedRoles.length===1?economicRateForRole(eng,selectedRoles[0]):null;
    if(document.getElementById('econRate')?.value&&selectedRoles.length===1&&!selectedRate)return toast('Indica primero el coste y la evidencia de este perfil en Coste por perfil.');
    const draft={step_ids,driver_id:document.getElementById('econDriver').value,annual_active_hours:activeHours,annual_wait_hours:waitHours,capacity_cost_rate_eur_hour:selectedRate&&activeHours>0?Number(selectedRate.eur_hour):null,direct_loss_eur_annual:+document.getElementById('econDirect').value||0,current_tool_cost_eur_annual:+document.getElementById('econTool').value||0,realized_cash_saving_eur_annual:+document.getElementById('econCash').value||0,evidence_type:document.getElementById('econEvidence').value,derivation_source:projected?'DF021/DF022 + RT_PROCESS_STEP':'MANUAL_VALIDATION',deduplication_key:null};
    if(!draft.evidence_type)return toast('Indica de dónde sale este dato: no lo trataremos como medido si no lo está.');
    const overlaps=economicCaptureIssues(eng,draft);
    if(overlaps.length)return toast(overlaps.join(' '));
    // Do not generate a random per-row key and pretend it identifies a unique economic event.
    // Event-level reconciliation is pending; the backend retains an explicit null instead.
    eng.economicInputs.push(draft);
    if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(eng,'impact');markDirty('Input económico añadido');closeModal();render();
    const zeroWithEvidence=[];if(activeHours===0&&activeContributors.length)zeroWithEvidence.push('trabajo activo');if(waitHours===0&&waitContributors.length)zeroWithEvidence.push('espera');
    if(zeroWithEvidence.length)toast(`Guardado con ${zeroWithEvidence.join(' y ')} anual en 0 aunque Proceso registra tiempo en esos pasos — revisa si falta transcribirlo.`);
    else if(selectedRoles.length>1&&activeHours>0)toast('Horas guardadas sin coste: hay varios perfiles. Para valorar su tiempo, registra por separado los pasos de cada perfil.');
  });
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
    if(token!==requestSequence||!document.getElementById('economicDerivedPreview'))return;
    const currentIds=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-econ-step]:checked')].map(x=>x.dataset.econStep):[];
    if(JSON.stringify({step_ids:currentIds,request:economicTimeRequest(eng,currentIds)})!==selection)return;
    serverProjection=projection;serverSelection=selection;
    const selectedRoles=[...new Set(steps.filter(x=>ids.includes(x.id)).map(x=>x.actor).filter(Boolean))];
    const rate=selectedRoles.length===1?economicRateForRole(eng,selectedRoles[0]):null;
    const rateInput=document.getElementById('econRate'),rateHelp=document.getElementById('econRoleRateHelp');
    if(rateInput)rateInput.value=rate?String(rate.eur_hour):'';
    if(rateHelp)rateHelp.textContent=selectedRoles.length>1?'Hay varios perfiles. Selecciona sólo los pasos de un perfil para valorar su tiempo.':selectedRoles.length===1?(rate?'Coste reutilizado de DF076 con evidencia '+(I18N_LABELS_ES.evidence_quality[rate.evidence_type]||rate.evidence_type)+'. No es ahorro realizado.':'Coste pendiente para este perfil: puedes guardar las horas sin monetizarlas.'):'Selecciona los pasos de un perfil. Si no existe un coste defendible, el valor monetario quedará pendiente.';
    const suggested=economicProjectionForDriver(projection,document.getElementById('econDriver')?.value);
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
  if(typeof document.querySelectorAll==='function')document.querySelectorAll('[data-econ-step]').forEach(el=>el.addEventListener?.('change',refresh));
  document.getElementById('econDriver')?.addEventListener?.('change',()=>{if(serverProjection){const suggestion=economicProjectionForDriver(serverProjection,document.getElementById('econDriver')?.value);for(const [field,value] of [['econActive',suggestion?.active],['econWait',suggestion?.wait]]){const input=document.getElementById(field);if(!input)continue;input.disabled=!!suggestion;if(suggestion)input.value=Number(value||0).toFixed(2);else if(input.dataset?.autoDerived==='true')input.value='';if(input.dataset)input.dataset.autoDerived=suggestion?'true':'false';}}else refresh()});
  refresh();
}
if(typeof bindForms==='function'){
  const __auneaEconomicsRateBindForms=bindForms;
  bindForms=function(){__auneaEconomicsRateBindForms();const button=document.getElementById('saveEconomicRoleRates');if(button)button.onclick=saveEconomicRoleRates;document.querySelectorAll('[data-econ-apply-rate]').forEach(b=>b.onclick=()=>applyEconomicRoleRate(Number(b.dataset.econApplyRate)));};
}
// [AUNEA-FE-ECON-CAPTURE-030] END
