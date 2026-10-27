// [AUNEA-FE-RESULTS-VIEW-010] START — Resultados, recomendación, escenarios y cotización
// PURPOSE: Vistas de sólo lectura sobre DiagnosticOutput y escenarios ligados al snapshot exacto mostrado.
// SOURCE: Diagnostic Master v1.1; DEC-034/040/041/052/053/055; Architecture Contract v1.3 PG10–PG15/S2.
// INPUTS: schema canónico, Engagement, snapshot confirmado, TO-BE versionado y DiagnosticOutput calculado por backend.
// OUTPUTS: diagnóstico, TO-BE, comparación AS-IS/TO-BE, recomendación, escenarios, cotización y Modo Resultados.
// SIDE_EFFECTS: DOM/state; HTTP sólo para comparar escenarios y descargar PDF.
// CHANGE_RISK: HIGH.

function hasConfirmedEngagementSnapshot(e){
  if(!e || e.confirmedAsIs !== true) return false;
  if(typeof hasConfirmedSnapshot === 'function') return hasConfirmedSnapshot(e);
  return Array.isArray(e.confirmedSnapshots) && e.confirmedSnapshots.length > 0;
}

function currentDiagnosticOutput(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  return snap&&e?.lastEngineSnapshotVersion===snap.version&&(typeof engineGateOutputFresh!=='function'||engineGateOutputFresh(e))?e.diagnosticOutput:null;
}
function diagnosticOutputFreshness(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap)return {status:'BLOCKED',label:'Sin snapshot confirmado',snapshotVersion:null};
  if(!e?.diagnosticOutput)return {status:'PENDING',label:'Diagnóstico pendiente',snapshotVersion:snap.version};
  if(e.lastEngineSnapshotVersion!==snap.version)return {status:'OBSOLETE',label:'Resultado obsoleto',snapshotVersion:snap.version,outputSnapshotVersion:e.lastEngineSnapshotVersion??null};
  if(typeof engineGateOutputFresh==='function'&&!engineGateOutputFresh(e))return {status:'OBSOLETE',label:'Resultado obsoleto: decisiones internas modificadas',snapshotVersion:snap.version,outputSnapshotVersion:e.lastEngineSnapshotVersion};
  return {status:'CURRENT',label:'Resultado vigente',snapshotVersion:snap.version,outputSnapshotVersion:e.lastEngineSnapshotVersion};
}
function diagnosisStepName(record,id){
  const step=(record?.processSteps||[]).find(s=>String(s.id)===String(id));
  return step?.step_name||step?.name||id||'Paso';
}
function diagnosisPainLabel(painId){
  // REF_PAIN is an internal English technical catalogue; the approved client-facing
  // Spanish label belongs to the canonical friction-to-Pain mapping.
  const mapped=(schema.friction_pain_map||[]).find(x=>String(x.Pain_ID)===String(painId));
  const ref=(schema.tables.REF_PAIN||[]).find(x=>String(x.Pain_ID)===String(painId));
  return mapped?.Label_ES||ref?.Label_ES||'Hallazgo del diagnóstico';
}
function diagnosisLinkedFrictions(record,painId){
  const mapping=Object.fromEntries((schema.friction_pain_map||[]).map(x=>[String(x.Friction_Type_ID),String(x.Pain_ID)]));
  return (record?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'&&String(mapping[String(x.friction_type)]||x.derived_pain_id||'')===String(painId));
}
function diagnosisImpactMetric(x){
  const active=Number(x?.annual_active_hours||0),wait=Number(x?.annual_wait_hours||0),direct=Number(x?.direct_loss_eur_annual||0),tool=Number(x?.current_tool_cost_eur_annual||0),cash=Number(x?.realized_cash_saving_eur_annual||0);
  if(wait)return `${num(wait)} h/año de espera`;
  if(active)return `${num(active)} h/año`;
  if(direct)return `${eur(direct)}/año de pérdida directa`;
  if(tool)return `${eur(tool)}/año de herramienta`;
  if(cash)return `${eur(cash)}/año de ahorro realizado`;
  return 'Registrado sin importe agregado';
}
function diagnosisTrace(record,p){
  const frictions=diagnosisLinkedFrictions(record,p.pain_id);
  const stepIds=[...new Set(frictions.flatMap(f=>normalizeArray(f.affected_steps)).filter(Boolean))];
  const economics=(record?.economicInputs||[]).filter(x=>{
    const ids=normalizeArray(x.step_ids).filter(Boolean);
    return String(x.pain_id||'')===String(p.pain_id)||ids.some(id=>stepIds.includes(id));
  });
  const risks=(record?.risks||[]).filter(r=>normalizeArray(r.step_ids).some(id=>stepIds.includes(id)));
  return {frictions,stepIds,economics,risks};
}
function diagnosisReadonlyMap(e,record){
  if(typeof processGraphHtml!=='function')return '<div class="notice info">Mapa AS-IS confirmado disponible en la captura.</div>';
  const steps=(record.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),fr=(record.frictions||[]).filter(x=>x.status!=='SUPERSEDED');
  const start=typeof processBoundaryValue==='function'?processBoundaryValue(record,'DF014','Límite inicial pendiente','DF012'):(record.answers?.DF014||'Inicio');
  const finish=typeof processBoundaryValue==='function'?processBoundaryValue(record,'DF015','Límite final pendiente','DF013'):(record.answers?.DF015||'Fin');
  return processGraphHtml(record,steps,fr,start,finish,'impacto',true);
}
function diagnosisFindingsHtml(record,pains){
  if(!pains.length)return '<div class="empty"><p>El backend no ha devuelto hallazgos para este snapshot.</p></div>';
  return '<div class="diagnosis-findings">'+pains.map((p,i)=>{
    const trace=diagnosisTrace(record,p),steps=trace.stepIds.map(id=>diagnosisStepName(record,id));
    const frictionText=trace.frictions.map(f=>f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type)).filter(Boolean);
    const evidence=trace.frictions.map(f=>f.observable_signal).filter(Boolean);
    const impacts=trace.economics.map(x=>`${typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id}: ${diagnosisImpactMetric(x)}`);
    const riskText=trace.risks.map(r=>r.description||labelFrom('OS_RISK_CATEGORY',r.category)).filter(Boolean);
    const causes=trace.frictions.flatMap(f=>normalizeArray(f.cause)).filter(Boolean).map(x=>labelFrom('OS_FRICTION_CAUSE',x)||x);
    const priorityIds=normalizeArray(record?.answers?.DF096).map(String);
    const priorityKnown=priorityIds.length>0;
    const prioritySelected=trace.frictions.some(f=>priorityIds.includes(String(f.id)));
    const confidenceText=p.confidence?engineLabel('confidence',p.confidence):'Sin clasificar';
    const firstStep=trace.stepIds[0];
    return `<article class="diagnosis-finding">
      <div class="diagnosis-finding-head"><div><span class="diagnosis-rank">${i+1}</span><div><h3>${esc(diagnosisPainLabel(p.pain_id))}</h3><p>${p.rationale?esc(p.rationale):'Hallazgo calculado por el backend a partir de la captura confirmada.'}</p></div></div><div class="diagnosis-state"><span>${p.state?esc(engineLabel('pain_state',p.state)):'—'}</span><small>Confianza: ${p.confidence?esc(engineLabel('confidence',p.confidence)):'—'}</small></div></div>
      <div class="diagnosis-trace-grid">
        <div><small>Dónde</small><b>${esc(steps.join(' · ')||'Sin paso trazable')}</b></div>
        <div><small>Fricción observada</small><b>${esc(frictionText.join(' · ')||'Sin fricción enlazada')}</b></div>
        <div><small>Causa declarada</small><b>${esc([...new Set(causes)].join(' · ')||'Causa no especificada en el origen')}</b></div>
        <div><small>Prioridad indicada por el cliente</small><b>${priorityKnown?(prioritySelected?'Entre las prioridades seleccionadas':'No figura entre las prioridades seleccionadas'):'No consta una prioridad confirmada (DF096)'}</b></div>
        <div><small>Evidencia</small><b>${esc(evidence.join(' · ')||'Sin evidencia textual enlazada')}</b></div>
        <div><small>Impacto relacionado</small><b>${esc(impacts.join(' · ')||'Sin impacto económico/temporal enlazado')}</b></div>
        <div><small>Riesgos en los mismos pasos</small><b>${esc(riskText.join(' · ')||'Ninguno registrado')}</b></div>
      </div>
      ${firstStep?'<a class="btn btn-outline" href="#asis-source-step-'+attr(String(firstStep))+'">Ver punto de análisis en esta página</a>':''}
      <details class="diagnosis-source-review">
        <summary>Ver trazabilidad del hallazgo</summary>
        <div class="notice info"><b>Origen del análisis</b><br>Hallazgo producido por el motor a partir del diagnóstico confirmado. La relación con los pasos se obtiene de los vínculos registrados, no demuestra por sí sola causalidad.</div>
        <div class="diagnosis-trace-grid">
          <div><small>Pasos relacionados</small><b>${esc(steps.join(' · ')||'Sin paso enlazado: revisar atribución')}</b></div>
          <div><small>Fricciones de origen</small><b>${esc(trace.frictions.map(f=>[f.id||'Sin identificador',f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type),f.evidence_type||'Evidencia no clasificada'].filter(Boolean).join(' · ')).join(' | ')||'Sin fricción enlazada')}</b></div>
          <div><small>Eventos económicos con pasos compartidos (relación contextual, no causal)</small><b>${esc(trace.economics.map(x=>[x.deduplication_key||'Evento sin clave',typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id,x.evidence_type||'Evidencia sin clasificar'].join(' · ')).join(' | ')||'Sin registro económico enlazado')}</b></div>
          <div><small>Riesgos en esos pasos</small><b>${esc(trace.risks.map(r=>r.description||labelFrom('OS_RISK_CATEGORY',r.category)).join(' · ')||'Sin riesgo enlazado')}</b></div>
          <div><small>Estado del motor</small><b>${esc(p.state?engineLabel('pain_state',p.state):'Pendiente')} · Confianza: ${esc(confidenceText)}</b><small>Clasificación basada en el tipo de evidencia disponible; no equivale a validación adicional del cliente.</small></div>
          <div><small>Fuente editable</small><b>AS-IS confirmado · Revisar AS-IS para corregir el origen; después recalcular</b></div>
        </div>
        <button type="button" class="btn btn-outline" data-page="proceso">Revisar AS-IS de origen</button>
      </details>
      <div class="internal-only diagnosis-tech"><span class="code internal-only">${esc(p.pain_id)}</span> Trazabilidad por anclajes registrados; las asociaciones no acreditan causalidad ni ahorros futuros.</div>
    </article>`;
  }).join('')+'</div>';
}
// [AUNEA-FE-PG10-PROCESS-BASELINE-091] START — Server-owned AS-IS baseline, separate from EconomicInput.
// SOURCE: DEC-034/041/068; Simulator CANONICAL PG10/PG12.
function diagnosisProcessBaselineHtml(p,record){
  if(!p)return '<div class="notice info">Proyección temporal del proceso no disponible; no se sustituye por inputs económicos parciales.</div>';
  const cell=k=>p[k]==null?'No calculado':num(p[k]);
  const declared=record&&typeof asisSourceBoundary==='function'?asisSourceBoundary(record,'DF026'):'No disponible';
  const gaps=Array.isArray(p.gaps)?p.gaps:[];
  return `<div class="grid g4 diagnosis-process-baseline">
    <div class="notice"><b>Casos al año</b><br>${cell('annual_cases')}<small>Volumen habitual anualizado</small></div>
    <div class="notice"><b>Trabajo activo de los pasos</b><br>${p.annual_active_hours==null?'No calculado':cell('annual_active_hours')+' h/año'}<small>Ponderado por recorrido; no incluye fricciones adicionales</small></div>
    <div class="notice"><b>Trabajo adicional de fricciones</b><br>${p.annual_friction_additional_hours==null?'Pendiente de atribución':cell('annual_friction_additional_hours')+' h/año'}<small>Solo clasificaciones ADICIONAL con frecuencia y propietario válidos</small></div>
    <div class="notice"><b>Trabajo activo total con adicionales</b><br>${p.annual_total_active_hours==null?'No conciliado':cell('annual_total_active_hours')+' h/año'}<small>Trabajo de pasos más adicionales válidos; excluye retrabajo y espera</small></div>
    <div class="notice"><b>Exposición a espera</b><br>${p.annual_wait_exposure_hours==null?'No calculado':cell('annual_wait_exposure_hours')+' caso-horas/año'}<small>Espera pasiva, no horas laborales ni ahorro</small></div>
    <div class="notice"><b>Retrabajo anual</b><br>${p.annual_rework_hours==null?'No calculado':cell('annual_rework_hours')+' h/año'}<small>Sin doble sumar fricciones incluidas o desglosadas</small></div>
    <div class="notice"><b>Ciclo end-to-end declarado</b><br>${esc(declared)}<small>Referencia del diagnóstico (DF026); no se sustituye por una suma de exposiciones</small></div>
    <div class="notice"><b>Estado de la proyección</b><br>${p.status==='CALCULATED'?'Componentes calculados':'Componentes incompletos'}<small>Calculado no significa ciclo conciliado ni ahorro acreditado</small></div>
  </div><div class="notice info" style="margin-top:10px"><b>Conciliación end-to-end pendiente de acreditar</b><br>La proximidad entre componentes temporales y la duración declarada no demuestra equivalencia: hay que verificar fronteras, frecuencias y posibles solapamientos. No se convierten caso-horas de espera en coste de personal ni capacidad recuperable en ahorro de caja.</div>
  ${gaps.length?'<div class="notice warn" style="margin-top:10px"><b>Datos o atribuciones pendientes</b><ul>'+gaps.slice(0,5).map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul></div>':''}`;
}
function diagnosisEconomicsHtml(econ,record){
  const inputs=record?.economicInputs||[];
  return `<div class="grid g3 diagnosis-econ-grid">
    <div class="notice"><b>Tiempo en inputs económicos</b><br>${econ.annual_active_hours==null?'Sin cuantificar':num(econ.annual_active_hours)+' h/año'}<small>No es el tiempo activo total del mapa.</small></div>
    <div class="notice"><b>Espera en inputs económicos</b><br>${econ.annual_wait_hours==null?'Sin cuantificar':num(econ.annual_wait_hours)+' h/año'}<small>No sustituye la exposición a espera del mapa.</small></div>
    <div class="notice"><b>Valor de capacidad</b><br>${econ.capacity_value_eur_annual==null?'No disponible':eur(econ.capacity_value_eur_annual)+'/año'}<small>No equivale a ahorro de caja.</small></div>
    <div class="notice"><b>Pérdida directa registrada</b><br>${econ.direct_loss_eur_annual==null?'Sin cuantificar':eur(econ.direct_loss_eur_annual)+'/año'}</div>
    <div class="notice"><b>Coste actual registrado de herramientas</b><br>${econ.current_tool_cost_eur_annual==null?'Sin cuantificar':eur(econ.current_tool_cost_eur_annual)+'/año'}</div>
    <div class="notice"><b>Ahorro de caja realizado registrado</b><br>${econ.realized_cash_saving_eur_annual==null?'Sin cuantificar':eur(econ.realized_cash_saving_eur_annual)+'/año'}<small>No es una previsión de ahorro futuro.</small></div>
  </div>
  <div class="notice info" style="margin-top:10px"><b>Alcance de estos importes</b><br>Estos valores proceden de registros EconomicInput. No reconstruyen el tiempo total del mapa: una tarifa de capacidad por rol no acredita ahorro de caja, y el coste de una herramienta existente no equivale a un coste eliminable.</div>
  ${inputs.length?`<div class="diagnosis-inputs"><b>Inputs que sustentan el cálculo</b><div>${inputs.map(x=>`<span class="closing-impact-item"><strong>${esc(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id)}</strong><small>${esc(diagnosisImpactMetric(x))} · ${esc(engineLabel('evidence_quality',evidenceTypeBackend(x.evidence_type)))}</small></span>`).join('')}</div></div>`:''}`;
}
function diagnosisRisksHtml(risk,record){
  const rows=record?.risks||[];
  return `<div class="grid g3 diagnosis-risk-summary">
      <div class="notice"><b>Riesgo inherente</b><br>${risk.inherent_level?esc(engineLabel('risk_level',risk.inherent_level)):'—'}</div>
      <div class="notice"><b>Riesgo residual</b><br>${risk.residual_level?esc(engineLabel('risk_level',risk.residual_level)):'—'}</div>
      <div class="notice"><b>Estado</b><br>${risk.status?esc(engineLabel('risk_status',risk.status)):'—'}</div>
    </div>
    ${risk.rationale?`<div class="notice info diagnosis-risk-rationale"><b>Lectura del motor</b><br>${esc(risk.rationale)}</div>`:''}
    ${rows.length?`<div class="result-list diagnosis-risk-list">${rows.map(r=>`<div class="result-item"><b>${esc(r.description||labelFrom('OS_RISK_CATEGORY',r.category))}</b><p>Pasos: ${esc(normalizeArray(r.step_ids).map(id=>diagnosisStepName(record,id)).join(' · ')||'—')} · Probabilidad ${esc(r.likelihood_1_5||'—')}/5 · Impacto ${esc(r.impact_1_5||'—')}/5 · Controles: ${r.controls_present===true?'Sí':r.controls_present===false?'No':'No indicado'}</p></div>`).join('')}</div>`:''}`;
}
function diagnosisRecommendationHtml(o){
  const r=o.recommendation||{};
  return `<div class="grid g4 diagnosis-rec-grid">
    ${codedField('Acción preliminar',r.action_id,actionLabel(r.action_id))}
    ${codedField('Nivel funcional',r.functional_level_id,funcLevelLabel(r.functional_level_id))}
    ${codedField('IA',r.ai_level_id,aiLevelLabel(r.ai_level_id))}
    <div class="notice"><b>Confianza</b><br>${r.confidence?esc(engineLabel('confidence',r.confidence)): '—'}</div>
  </div>
  <div class="notice info diagnosis-rec-rationale"><b>Por qué lo propone el motor</b><br>${(r.rationale||[]).map(esc).join(' · ')||'Sin racional adicional.'}</div>
  <div class="field-help">Es una recomendación estructurada del diagnóstico. El diseño concreto del proceso futuro se realiza en TO-BE y requiere revisión humana antes de publicación.</div>`;
}

// [AUNEA-FE-WORKFLOW-READINESS-153] START — Read-only continuity of the internal review
// PURPOSE: Make PG10–PG15 and the client publication gate legible from existing versioned sources.
// SOURCE: DEC-034/050/052/053/055; Simulator CANONICAL PG10–PG15; end-to-end contract REVIEW 2026-10-23.
// INPUTS: confirmed snapshot, optional AS-IS analysis, official engine output, TO-BE, scenarios, output review.
// OUTPUTS: navigation/readiness labels only; no state transitions, price or time calculation.
// SIDE_EFFECTS: none.
// CHANGE_RISK: LOW. No new DF, data owner, gate or approval decision.
function workbenchContinuityModel(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap||!e?.confirmedAsIs)return [];
  const official=currentDiagnosticOutput(e);
  const analysis=typeof asisAnalysisResult==='function'?asisAnalysisResult(e):null;
  const candidate=typeof latestTobe==='function'?latestTobe(e):null;
  const tobe=candidate&&candidate.sourceSnapshotVersion===snap.version?candidate:null;
  const reviewedTobe=!!tobe&&['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(tobe.status);
  const reviewed=typeof currentOutputReview==='function'?currentOutputReview(e):null;
  const approved=typeof approvedOutputReview==='function'?approvedOutputReview(e):null;
  const alternativeCount=official?Number((e.scenarioResults||[]).length):0;
  return [
    {title:'Diagnóstico',status:official?'Resultado oficial vigente':analysis?'AS-IS analizado · solución pendiente':'Análisis disponible · ejecutar backend',page:'resultados'},
    {title:'Diseño TO-BE',status:tobe?(tobe.status==='DRAFT'?'Borrador sin aprobar':tobe.status==='REVIEWED'?'Revisado':tobe.status==='PUBLISHED'?'Publicado':'Aprobado para cliente'):'Propuesta pendiente',page:'tobe'},
    {title:'Comparación',status:reviewedTobe?'Vista de cambios disponible':'Necesita TO-BE revisado',page:'comparacion'},
    {title:'Solución',status:official?'Recomendación de backend disponible':'Recomendación oficial pendiente',page:'recomendacion'},
    {title:'Escenarios',status:official?.optimal_scenario?'Óptimo calculado · '+alternativeCount+' alternativa(s) registradas':'Simulación oficial pendiente',page:'escenarios'},
    {title:'Aprobación',status:approved?'Aprobado para cliente':reviewed?(reviewed.status==='REVIEWED'?'Revisado · falta autorización':reviewed.status==='DRAFT'?'Borrador · falta revisión': 'Pendiente de autorización'):'Sin paquete aprobado',page:'revision'}
  ];
}
function workbenchContinuityHtml(e){
  const stages=workbenchContinuityModel(e);
  if(!stages.length)return '<div class="notice warn">Confirma el AS-IS antes de comenzar el trabajo interno.</div>';
  const approved=typeof approvedOutputReview==='function'?approvedOutputReview(e):null;
  return '<div class="grid g3">'+stages.map((s,i)=>
    '<div class="notice"><small>Etapa '+(i+1)+'</small><br><b>'+esc(s.title)+'</b><br><small>'+esc(s.status)+'</small><div style="margin-top:8px"><button class="btn btn-outline" data-page="'+s.page+'">Abrir etapa</button></div></div>'
  ).join('')+'</div><div class="notice info" style="margin-top:12px"><b>Presentación al cliente</b><br>'+
    (approved?'Existe una revisión autorizada para el snapshot y escenario vigentes.':'Todavía no hay una revisión vigente aprobada para cliente. El análisis interno no se publica automáticamente.')+
    (approved?' <button class="btn" data-page="modoresultados">Ver Modo Resultados</button>':'')+
    '<small class="client-presentation-note" style="display:block;margin-top:8px">Los tiempos futuros, la inversión y el ahorro solo aparecen cuando los motores los calculan a partir de supuestos y alcance válidos.</small></div>';
}
// [AUNEA-FE-WORKFLOW-READINESS-153] END

function resultsPage(){
  const e=currentEng();
  if(!e) return pageTop('Diagnóstico interno','Debes confirmar el cierre del mapa y del diagnóstico antes de entrar en Trabajo interno.',`<button class="btn" data-page="diagnostico">Volver a Sesión 1</button>`) + `<div class="empty"><h2>AS-IS confirmado requerido</h2><p>La sesión termina al confirmar Validación y cierre. El diagnóstico interno siempre parte de un snapshot confirmado.</p></div>`;
  if(!hasConfirmedEngagementSnapshot(e)) return pageTop('Diagnóstico interno','Debes confirmar el cierre del mapa y del diagnóstico antes de entrar en Trabajo interno.',`<button class="btn" data-page="diagnostico">Volver a Sesión 1</button>`) + `<div class="empty"><h2>AS-IS confirmado requerido</h2><p>La sesión termina al confirmar Validación y cierre. El diagnóstico interno siempre parte de un snapshot confirmado.</p></div>`;
  const activeSnapshot=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  const freshness=diagnosticOutputFreshness(e),o=currentDiagnosticOutput(e),miss=missingRequired(e),record=typeof engagementOfRecord==='function'?engagementOfRecord(e):e,steps=(record.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),fr=(record.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),risks=record.risks||[],econInputs=record.economicInputs||[];
  if(!o){
    const unresolved=typeof unresolvedEngineGates==='function'?unresolvedEngineGates(e):[];
    const ready=miss.length===0&&!!activeSnapshot&&unresolved.length===0;
    return pageTop('Diagnóstico interno','El snapshot de Sesión 1 está sellado. Ejecuta los motores canónicos para convertir la captura confirmada en diagnóstico.',`<button class="btn" data-page="diagnostico">Volver a Sesión 1</button><button class="btn btn-outline" id="reviewEngineGates">Revisar decisiones</button><button class="btn btn-primary" id="runDiag">${unresolved.length?'Evaluar condiciones para la recomendación':'Calcular recomendación y escenarios oficiales'}</button>`)
      +`<div class="grid g4 diagnosis-readiness">
        <div class="card metric"><small>Snapshot</small><strong>v${esc(activeSnapshot?.version||'—')}</strong><span>AS-IS confirmado</span></div>
        <div class="card metric"><small>Pasos</small><strong>${steps.length}</strong><span>${fr.length} fricciones · ${risks.length} riesgos</span></div>
        <div class="card metric"><small>Impactos</small><strong>${econInputs.length}</strong><span>${miss.length} gap(s) obligatorio(s)</span></div>
        <div class="card metric"><small>Backend</small><strong>${state.backendOnline?'OK':'—'}</strong><span>${state.backendOnline?'disponible':'se comprobará al ejecutar'}</span></div>
      </div>`
      +section('Recorrido de Trabajo Interno','Las etapas se alimentan del mismo AS-IS. Los estados indican disponibilidad, no aprobación automática.',workbenchContinuityHtml(e))
      +section('Estado actual y tiempo de referencia','Los valores declarados se muestran sin convertir un SLA en objetivo de mejora ni inferir un ahorro.',`
        <div class="grid g3 diagnosis-reference-grid">
          <div class="notice diagnosis-reference-card">
            <b>Duración end-to-end actual</b>
            <div class="diagnosis-reference-value">${esc(asisSourceBoundary(record,'DF026'))}</div>
            <p class="diagnosis-reference-note">Duración total declarada; la conciliación con los pasos se revisa por separado.</p>
          </div>
          <div class="notice diagnosis-reference-card">
            <b>SLA del servicio</b>
            <div class="diagnosis-reference-value">${esc(asisSourceBoundary(record,'DF025'))}</div>
            <p class="diagnosis-reference-note">Compromiso de servicio; no equivale al objetivo de reducción.</p>
          </div>
          <div class="notice diagnosis-reference-card">
            <b>Objetivos del negocio</b>
            <div class="diagnosis-reference-value">${esc(normalizeArray(record.answers?.DF086).map(x=>labelFrom('OS_FUTURE_OUTCOME',x)||x).join(' · ')||'No declarados')}</div>
            <p class="diagnosis-reference-note">Sin tiempo futuro calculado ni asumido.</p>
          </div>
        </div>`)
      +section('Mapa y puntos críticos del AS-IS','Mapa confirmado en lectura. Las fichas muestran el origen de cada problema y permiten consultar el detalle sin duplicar tres alternativas por paso.',diagnosisReadonlyMap(e,record)+asisPointCardsHtml(record))
      +section('Cobertura de los 100 campos y gaps','Se examina cada fuente, incluidas condiciones y datos opcionales; los gaps técnicos se contrastan en el backend.',asisCoverageHtml(e,asisAnalysisResult(e)))
      +section('Diagnóstico de problemas sin elegir tecnología','Pain, economía, riesgo y tiempos se calculan en el backend sin fabricar respuestas Sí/No para soluciones.',asisBaselineHtml(e))
      +section('Alternativas de intervención a contrastar','Una comparación única de las tres vías, basada en los pasos confirmados. La viabilidad y los beneficios requieren revisión posterior.',asisDirectionCardsHtml(e))
      +section('Preparación de recomendación y escenarios oficiales','La evaluación tecnológica permanece condicionada; no bloquea el análisis anterior.',`<div class="notice ${ready?'good':'warn'}">${ready?'La captura confirmada está preparada para diagnóstico.':'Hay información obligatoria pendiente: '+esc(miss.join(', '))}</div>${freshness.status==='OBSOLETE'?`<div class="notice warn" style="margin-top:10px"><b>Resultado anterior obsoleto</b><br>El diagnóstico existente corresponde al snapshot v${esc(freshness.outputSnapshotVersion??'—')} y no puede utilizarse para el snapshot confirmado v${esc(freshness.snapshotVersion)}. Recalcula antes de continuar.</div>`:''}${unresolved.length?`<div class="notice info" style="margin-top:10px"><b>Condiciones de solución pendientes</b><br>${unresolved.length} dimensión(es) por contrastar antes de calcular una recomendación técnica y precios oficiales. El análisis del AS-IS de arriba sigue disponible.</div>`:''}`)
      +section('Qué ocurrirá al calcular la recomendación','El análisis AS-IS anterior es independiente. La recomendación y las cotizaciones oficiales siguen el contrato vigente del backend.',`<div class="diagnosis-pipeline"><span>Problemas</span><i>→</i><span>Impacto económico</span><i>→</i><span>Riesgos</span><i>→</i><span>Recomendación</span><i>→</i><span>Precio</span><i>→</i><span>Escenarios</span></div>`);
  }
  const pains=o.pain_results||[],econ=o.economic_result||{},risk=o.risk_result||{},processTime=o.process_time_projection||null,confirmed=pains.filter(x=>x.state==='CONFIRMED').length;
  const runDate=e.lastEngineRunAt?(typeof formatDateEs==='function'?formatDateEs(e.lastEngineRunAt):String(e.lastEngineRunAt)):'—';
  return pageTop('Diagnóstico interno',`Snapshot v${esc(activeSnapshot?.version||'—')} · diagnóstico backend ${esc(runDate)} · ${esc(freshness.label)}. Los resultados están ligados a la versión confirmada del AS-IS.`,`<button class="btn" data-page="diagnostico">Volver a Sesión 1</button><button class="btn" data-page="proceso">Revisar AS-IS</button><button class="btn btn-outline" id="reviewEngineGates">Revisar decisiones</button><button class="btn btn-primary" id="runDiag">Recalcular diagnóstico</button>`)
    +`<div class="grid g4 diagnosis-result-kpis">
      <div class="card metric"><small>Hallazgos confirmados</small><strong>${confirmed}</strong><span>de ${pains.length} evaluados</span></div>
      <div class="card metric"><small>Trabajo activo del proceso</small><strong>${processTime?.annual_active_hours!=null?num(processTime.annual_active_hours)+' h/año':'No calculado'}</strong><span>Proyección AS-IS, no EconomicInput</span></div>
      <div class="card metric"><small>Exposición a espera</small><strong>${processTime?.annual_wait_exposure_hours!=null?num(processTime.annual_wait_exposure_hours)+' caso-horas':'No calculado'}</strong><span>no son horas laborales</span></div>
      <div class="card metric"><small>Riesgo residual</small><strong>${risk.residual_level?esc(engineLabel('risk_level',risk.residual_level)):'—'}</strong><span>${risk.status?esc(engineLabel('risk_status',risk.status)):''}</span></div>
    </div>`
    +section('Recorrido de Trabajo Interno','Qué está preparado, qué necesita revisión y qué puede mostrarse al cliente.',workbenchContinuityHtml(e))
    +section('Mapa AS-IS con contexto de diagnóstico','El mismo snapshot confirmado, en lectura, con fricciones, riesgos e impactos anclados a sus pasos.',diagnosisReadonlyMap(e,record))
    +section('Puntos críticos y alternativas a contrastar','Primero se revisan los hechos de cada paso; a continuación, una única comparación de las tres vías sin cifras futuras asumidas.',asisPointCardsHtml(record)+asisDirectionCardsHtml(e))
    +section('Cobertura de fuentes y gaps','Los datos de las 100 preguntas y las entradas del backend se revisan sin requerir una segunda captura.',asisCoverageHtml(e,{input_coverage:o.input_coverage,status:'ANALYZED'}))
    +section('Hallazgos','Qué ocurre, dónde y con qué trazabilidad. El motor determina estado y confianza; la UI sólo enlaza contexto capturado.',diagnosisFindingsHtml(record,pains))
    +section('Línea base operativa AS-IS','Proyección del backend sobre pasos del snapshot confirmado.',diagnosisProcessBaselineHtml(processTime,record))
     +section('Impactos económicos registrados','EconomicInput refleja un alcance parcial; capacidad, espera y ahorro de caja permanecen separados.',diagnosisEconomicsHtml(econ,record))
    +section('Riesgos','Resultado agregado del motor y riesgos capturados que lo sustentan.',diagnosisRisksHtml(risk,record))
    +section('Recomendación preliminar','Dirección estructurada calculada por el backend. No sustituye el diseño TO-BE ni constituye todavía una propuesta al cliente.',diagnosisRecommendationHtml(o))
    +section('Decisiones técnicas utilizadas','Trazabilidad entre la revisión interna del consultor y el cálculo del backend.',diagnosisEngineDecisionTraceHtml(e))
    +section('Siguiente paso','El diagnóstico ya existe para el snapshot vigente. El siguiente bloque gobernado es diseñar el TO-BE sobre esta misma versión.',`<div class="notice good"><b>Diagnóstico generado correctamente</b><br>Revisa los hallazgos anteriores antes de diseñar el proceso futuro.</div>`,`<button class="btn btn-primary" data-page="tobe">Continuar al diseño TO-BE →</button>`);
}
// [AUNEA-FE-RESULT-GATE-TRACE-151] START — Display the reviewed technical inputs that produced PG10
// SOURCE: DEC-034/041/052/053 and the existing ENGINE_GATE_CONTRACT, snapshot and consultant audit.
// OUTPUT: read-only provenance; not a new diagnostic question or a second rules engine.
function diagnosisEngineDecisionTraceHtml(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  const review=e?.engineGateReview;
  const contracts=typeof ENGINE_GATE_CONTRACT!=='undefined'?ENGINE_GATE_CONTRACT:[];
  if(!snap||!review||review.snapshotVersion!==snap.version)return '<div class="notice warn">Las decisiones técnicas de este diagnóstico requieren revisión para el AS-IS vigente.</div>';
  const decisions=review.decisions||{};
  const rows=contracts.map(c=>{
    const v=decisions[c.key],actual=e?.engineGates?.[c.key];
    if(!v||v.answer!==actual||!['YES','NO'].includes(actual))return '';
    const title=typeof ENGINE_GATE_GUIDE!=='undefined'?ENGINE_GATE_GUIDE[c.key]?.title:c.label;
    const basis=v.basis==='CONSULTANT_ASSERTION'
      ?'Criterio del consultor; la captura no acredita por sí sola esta conclusión'
      :v.basis==='PROPOSAL'
        ?(v.answer===v.suggestion?'Propuesta de AUNEA aceptada por el consultor; su evidencia conserva las limitaciones declaradas':'Decisión del consultor distinta de la propuesta de AUNEA; contrastar su fundamento')
        :'Decisión del consultor apoyada en información contextual del AS-IS, no necesariamente acreditada';
    return '<div class="result-item"><b>'+esc(title||c.label)+'</b><p>Respuesta utilizada: '+(actual==='YES'?'Sí':'No')+' · '+esc(basis)+'</p></div>';
  }).filter(Boolean);
  return rows.length===contracts.length&&contracts.length===5
    ?'<p>Estas son las cinco respuestas técnicas utilizadas por el backend, vinculadas al AS-IS confirmado v'+esc(snap.version)+'. Son decisiones internas; no sustituyen las evidencias del cliente.</p><div class="result-list">'+rows.join('')+'</div>'
    :'<div class="notice warn">Falta la trazabilidad completa de las decisiones técnicas. Revisa las cinco respuestas antes de continuar.</div>';
}
// [AUNEA-FE-RESULT-GATE-TRACE-151] END

function num(x){return Number(x||0).toLocaleString('es-ES',{maximumFractionDigits:1})}
function eur(x){return Number(x||0).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})}
function businessLabel(rows,idField,id){const hit=(rows||[]).find(x=>String(x[idField])===String(id));if(hit?.Name)return hit.Name;return state.uiMode==='INTERNAL'?(id||'—'):'No disponible'}
function actionLabel(id){return businessLabel(schema.tables.REF_ACTION,'Action_ID',id)}
function funcLevelLabel(id){return businessLabel(schema.tables.REF_LEVEL_FUNC,'Functional_Level_ID',id)}
function aiLevelLabel(id){return businessLabel(schema.tables.REF_LEVEL_AI,'AI_Level_ID',id)}
function codedField(label,rawId,resolved){return `<div class="notice"><b>${esc(label)}</b><br>${esc(resolved)}${rawId?`<span class="internal-tag">${esc(rawId)}</span>`:''}</div>`}

function recommendationPage(){const e=currentEng();if(!e)return noOfficial('Recomendación','La recomendación oficial sólo se muestra después de ejecutar el backend.');const o=currentDiagnosticOutput(e);if(!o)return noOfficial('Recomendación','El diagnóstico no existe o ya no corresponde al snapshot confirmado actual. Recalcula antes de continuar.');const r=o.recommendation||{},q=o.quote||{},record=typeof engagementOfRecord==='function'?engagementOfRecord(e):e,hot=(record.frictions||[]).filter(x=>x.status!=='SUPERSEDED').sort((a,b)=>Number(b.impact||0)-Number(a.impact||0)).slice(0,5);return pageTop('Recomendación','Recap de la reunión + recomendación estructurada del backend.',`<button class="btn" data-page="resultados">Ver resultados</button>`)+section('Recomendación óptima','La acción óptima no se sobrescribe; las alternativas se crean como escenarios.',`<div class="grid g4">${codedField('Acción',r.action_id,actionLabel(r.action_id))}${codedField('Nivel funcional',r.functional_level_id,funcLevelLabel(r.functional_level_id))}${codedField('IA',r.ai_level_id,aiLevelLabel(r.ai_level_id))}<div class="notice"><b>Precio base</b><br>${eur(q.one_off_eur)}</div></div>${state.uiMode==='INTERNAL'?`<div class="notice info" style="margin-top:12px"><strong>Racional interno:</strong> ${(r.rationale||[]).map(esc).join(' · ')||'Sin racional adicional.'}</div>`:''}`)+section('Puntos calientes','Se muestran desde las fricciones capturadas.',`<div class="result-list">${hot.map(x=>`<div class="result-item"><b>${esc(labelFrom('OS_FRICTION_TYPE',x.friction_type))}</b><p>${esc(x.observable_signal)} · Impacto ${esc(x.impact||'—')}/5</p></div>`).join('')||'<div class="empty"><p>Sin fricciones priorizadas.</p></div>'}</div>`)+section('Resumen final de la reunión','Texto de devolución editable para cerrar la conversación sin perder el hilo.',`<textarea id="meetingRecap" style="width:100%;min-height:150px;border:1px solid #d6d1c8;border-radius:8px;padding:12px">${esc(e.meetingRecap||buildRecap(e,o))}</textarea>`,`<button class="btn btn-outline" id="saveRecap">Guardar resumen</button>`)}
function buildRecap(e,o){const record=typeof engagementOfRecord==='function'?engagementOfRecord(e):e,c=companyById(e.companyId),fs=(record.frictions||[]).filter(x=>x.status!=='SUPERSEDED').slice(0,4).map(x=>labelFrom('OS_FRICTION_TYPE',x.friction_type)).join(', ');return `Hemos revisado con ${c?.name||'el cliente'} el proceso ${record.answers?.DF011||e.title}. El flujo actual se ha estructurado en ${(record.processSteps||[]).filter(x=>x.status!=='SUPERSEDED').length} pasos y las principales fricciones identificadas son: ${fs||'pendientes de priorizar'}. La recomendación del motor es ${actionLabel(o.recommendation?.action_id)}, con nivel ${funcLevelLabel(o.recommendation?.functional_level_id)} e inteligencia ${aiLevelLabel(o.recommendation?.ai_level_id)}. Antes de cerrar propuesta deben revisarse las evidencias y gaps indicados.`}
function noOfficial(title,msg){return pageTop(title,msg,`<button class="btn" data-page="diagnostico">Volver al diagnóstico</button>`)+`<div class="empty"><h2>Resultado oficial pendiente</h2><p>Conecta AUNEA Backend y calcula el diagnóstico. La interfaz no reproduce reglas de negocio en JavaScript.</p></div>`}

// C04 · PG11/PG12 — TO-BE is a versioned AUNEA proposal, never a second discovery flow.
const TOBE_TRANSFORMATIONS=Object.freeze(['Se mantiene','Se modifica','Se elimina','Se automatiza','Se asiste con IA','Requiere decisión humana','Se incorpora control']);
const TOBE_PUBLICATION_STATES=Object.freeze(['DRAFT','REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED']);
function tobeHistory(e){return e.tobeProposals||(e.tobeProposals=[])}
function latestTobe(e){const h=e?.tobeProposals||[];return h[h.length-1]||null}
function tobeEditable(p){return !!p&&p.status==='DRAFT'}
function tobeSourceSteps(e){const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;return (snap?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED')}
function createTobeDraft(e){const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;if(!e||!snap)return null;const h=tobeHistory(e),p={version:h.length+1,status:'DRAFT',sourceSnapshotVersion:snap.version,createdAt:now(),updatedAt:now(),items:tobeSourceSteps(e).map((s,i)=>({id:`TOBE-${h.length+1}-${i+1}`,sourceStepId:s.id||'',sourceStepName:s.name||s.step_name||`Paso ${i+1}`,transformation:'',problemResolved:'',futureActor:labelFrom('OS_ACTOR_ROLE',s.actor)||'',tool:labelFrom('OS_TOOL_CATEGORY',s.tool)||'',inputs:Array.isArray(s.inputs)?s.inputs.join(', '):(s.inputs||''),outputs:Array.isArray(s.outputs)?s.outputs.join(', '):(s.outputs||''),automationAi:'',humanSupervision:'',controlsRisk:'',futureTime:'',futureTimeAssumption:''}))};h.push(p);markDirty(`TO-BE v${p.version} creado como DRAFT desde snapshot confirmado v${snap.version}`);return p}
function nextTobeStatus(p){const i=TOBE_PUBLICATION_STATES.indexOf(p?.status);return i>=0&&i<TOBE_PUBLICATION_STATES.length-1?TOBE_PUBLICATION_STATES[i+1]:null}
function advanceTobeStatus(e){const p=latestTobe(e),next=nextTobeStatus(p);if(!p||!next)return false;if(p.status==='DRAFT'&&p.items.some(x=>!x.transformation))return toast('Define el estado de transformación de todos los pasos antes de enviar a revisión.'),false;p.status=next;p.updatedAt=now();markDirty(`TO-BE v${p.version}: ${next}`);return true}
function saveTobeFromDom(e){const p=latestTobe(e);if(!tobeEditable(p))return false;document.querySelectorAll('[data-tobe-item]').forEach(el=>{const item=p.items.find(x=>x.id===el.dataset.tobeItem);if(item)item[el.dataset.tobeField]=el.value});p.updatedAt=now();markDirty(`TO-BE v${p.version} actualizado`);return true}
function tobeField(item,key,label,value,type='text',disabled=false){return `<div class="field"><label>${esc(label)}</label>${type==='textarea'?`<textarea data-tobe-item="${attr(item.id)}" data-tobe-field="${attr(key)}" ${disabled?'disabled':''}>${esc(value||'')}</textarea>`:`<input data-tobe-item="${attr(item.id)}" data-tobe-field="${attr(key)}" value="${attr(value||'')}" ${disabled?'disabled':''}>`}</div>`}
function tobePage(){const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;if(!snap)return pageTop('TO-BE','El diseño del proceso futuro requiere un mapa del proceso actual confirmado.',`<button class="btn" data-page="diagnostico">Volver a captura</button>`)+`<div class="empty"><h2>AS-IS confirmado requerido</h2><p>Confirma Validación y cierre antes de diseñar el proceso propuesto.</p></div>`;if(!currentDiagnosticOutput(e))return pageTop('Diseño TO-BE','Consulta oportunidades vinculadas al AS-IS mientras se completa la recomendación gobernada.',`<button class="btn btn-primary" data-page="resultados">Volver al análisis AS-IS</button>`)
  +section('Problemas de origen','Los puntos del AS-IS no se editan desde el proceso futuro.',asisPointCardsHtml(asisAnalysisSource(e)))
  +section('Vías de intervención pendientes de validar','Las alternativas no equivalen a TO-BE aprobado.',asisDirectionCardsHtml(e))
  +'<div class="notice warn">La edición y aprobación de un TO-BE definitivo requiere la recomendación oficial vigente.</div>';const p=latestTobe(e);if(!p)return pageTop('Diseño TO-BE','Representa cómo funcionaría el proceso propuesto sin abrir una segunda ronda de discovery.',`<button class="btn btn-primary" id="createTobeDraft">Crear borrador desde AS-IS confirmado</button>`)+section('Fuente','El borrador se instancia desde el snapshot confirmado y queda DRAFT hasta revisión humana.',`<div class="notice info">Snapshot confirmado v${snap.version}. Ningún cambio se considera aprobado automáticamente.</div>`);const editable=tobeEditable(p),statusLabel=p.status==='APPROVED_FOR_CLIENT'?'Aprobado para cliente':p.status==='REVIEWED'?'Revisado':p.status==='PUBLISHED'?'Publicado':'Borrador';const cards=p.items.map((it,i)=>`<div class="card card-pad section"><div class="section-title"><div><small>Origen AS-IS · ${esc(it.sourceStepName)}</small><h2>${i+1}. ${esc(it.sourceStepName)}</h2></div><span class="status ${p.status==='DRAFT'?'amber':'green'}">${esc(it.transformation||'Pendiente de diseño')}</span></div><div class="form-grid"><div class="field"><label>Qué cambia</label>${editable?auneaSelectControl(`tobe_${it.id}_transformation`,TOBE_TRANSFORMATIONS.map(v=>({value:v,label:v})),it.transformation||'',{extra:`data-tobe-item="${attr(it.id)}" data-tobe-field="transformation"`,placeholder:'Selecciona…'}):`<input value="${attr(it.transformation||'')}" disabled>`}</div>${tobeField(it,'problemResolved','Qué problema resuelve',it.problemResolved,'text',!editable)}${tobeField(it,'futureActor','Responsable futuro',it.futureActor,'text',!editable)}${tobeField(it,'tool','Herramienta / arquitectura',it.tool,'text',!editable)}${tobeField(it,'inputs','Datos de entrada',it.inputs,'text',!editable)}${tobeField(it,'outputs','Datos de salida',it.outputs,'text',!editable)}${tobeField(it,'automationAi','Automatización e IA',it.automationAi,'text',!editable)}${tobeField(it,'humanSupervision','Supervisión humana',it.humanSupervision,'text',!editable)}${tobeField(it,'controlsRisk','Control / riesgo',it.controlsRisk,'text',!editable)}${tobeField(it,'futureTime','Tiempo futuro',it.futureTime,'text',!editable)}${tobeField(it,'futureTimeAssumption','Supuesto trazable del tiempo futuro',it.futureTimeAssumption,'textarea',!editable)}</div></div>`).join('');const next=nextTobeStatus(p),actions=`<button class="btn" data-page="resultados">Diagnóstico</button><button class="btn" data-page="comparacion">Comparar AS-IS / TO-BE</button>${editable?'<button class="btn" id="saveTobe">Guardar borrador</button>':''}${next?`<button class="btn btn-primary" id="advanceTobe">${next==='REVIEWED'?'Enviar a revisión':next==='APPROVED_FOR_CLIENT'?'Aprobar para cliente':'Publicar'}</button>`:''}`;return pageTop('Diseño TO-BE',`Versión ${p.version} · ${statusLabel}. Cada propuesta conserva el snapshot AS-IS del que parte.`,actions)+cards}
function comparable(v){return v===null||v===undefined||v===''?'No disponible con evidencia suficiente':String(v)}
function stepMetric(step,key){return step?.[key]??step?.[key.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())]??''}
function tobeComparisonPage(){const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null,p=latestTobe(e);if(!snap||!p||!['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status))return pageTop('AS-IS vs TO-BE','La comparación reutiliza las fuentes versionadas; no captura datos nuevos.',`<button class="btn" data-page="tobe">Volver a TO-BE</button>`)+`<div class="empty"><h2>TO-BE revisado requerido</h2><p>La comparación se habilita cuando el TO-BE ha pasado revisión humana.</p></div>`;const source=(e.confirmedSnapshots||[]).find(s=>s.version===p.sourceSnapshotVersion)||snap;const asis=(source.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');const rows=p.items.map((it,i)=>{const a=asis.find(s=>String(s.id)===String(it.sourceStepId))||asis[i]||{};return `<tr><td>${esc(it.sourceStepName)}</td><td>${esc(comparable(stepMetric(a,'actor')))}</td><td>${esc(comparable(it.futureActor))}</td><td>${esc(comparable(stepMetric(a,'tool')))}</td><td>${esc(comparable(it.tool))}</td><td>${esc(it.transformation||'—')}</td><td>${esc(comparable(it.automationAi))}</td><td>${esc(comparable(it.humanSupervision))}</td><td>${esc(comparable(it.controlsRisk))}</td></tr>`}).join('');const current=currentDiagnosticOutput(e),econ=current?.economic_result||{},pt=current?.process_time_projection||null;return pageTop('AS-IS vs TO-BE','Comparación derivada del snapshot confirmado y del TO-BE revisado; ninguna métrica económica se calcula en el navegador.',`<button class="btn" data-page="tobe">Propuesto</button><button class="btn btn-primary" data-page="comparacion">Comparación</button>`)+section('Qué cambia','Correspondencia de cada paso actual con la propuesta.',`<div class="table-wrap"><table class="data-table"><thead><tr><th>Paso</th><th>Actor actual</th><th>Actor propuesto</th><th>Herramienta actual</th><th>Herramienta propuesta</th><th>Transformación</th><th>Automatización / IA</th><th>Intervención humana</th><th>Control</th></tr></thead><tbody>${rows}</tbody></table></div>`)+section('Métricas comparables','Sólo se muestran outputs vigentes del backend; los valores futuros permanecen pendientes hasta que exista una regla o supuesto trazable.',`<div class="grid g3"><div class="notice"><b>Impacto activo cuantificado AS-IS</b><br>${pt?.annual_active_hours!=null?num(pt.annual_active_hours)+' h/año':'No disponible con evidencia suficiente'}<small>Proyección AS-IS, sin hipótesis futura.</small></div><div class="notice"><b>Espera anual AS-IS</b><br>${pt?.annual_wait_exposure_hours!=null?num(pt.annual_wait_exposure_hours)+' caso-horas/año':'No disponible con evidencia suficiente'}<small>Exposición a espera, no trabajo activo.</small></div><div class="notice"><b>Retrabajo AS-IS</b><br>${pt?.annual_rework_hours!=null?num(pt.annual_rework_hours)+' h/año':'No disponible con evidencia suficiente'}<small>TO-BE aún sin cifra comparable aprobada.</small></div><div class="notice"><b>Capacidad liberada</b><br>No disponible con evidencia suficiente</div><div class="notice"><b>Ahorro de caja</b><br>No disponible con evidencia suficiente</div><div class="notice"><b>Riesgo residual futuro</b><br>No disponible con evidencia suficiente</div></div>`)}

function scenariosPage(){const e=currentEng();if(!e) return noOfficial('Escenarios','Se necesita una recomendación óptima calculada antes de comparar alternativas.');const o=currentDiagnosticOutput(e);if(!o)return pageTop('Escenarios','Explora alternativas condicionadas; la cotización y los ahorros oficiales exigen diagnóstico vigente.',`<button class="btn" data-page="resultados">Consultar análisis AS-IS</button>`)
  +section('Puntos críticos y oportunidades','Basado únicamente en el snapshot confirmado.',asisPointCardsHtml(asisAnalysisSource(e)))
  +section('Tres alternativas a contrastar','Sin cálculos futuros ni precios mientras no existan supuestos y propuesta canónica.',asisDirectionCardsHtml(e));const optimal=o.optimal_scenario;return pageTop('Escenarios','Compara la recomendación óptima con alternativas gobernadas sobre el mismo snapshot.',`<button class="btn btn-primary" id="newScenario">Crear alternativa</button>`)+`<div class="scenario-grid"><div class="card scenario-card optimal"><h3>Óptimo</h3>${scenarioBody(optimal)}</div>${(e.scenarioResults||[]).map((s,i)=>`<div class="card scenario-card"><h3>Alternativa ${i+1}</h3>${scenarioBody(s)}</div>`).join('')}</div>`+section('Opciones que aún deben contrastarse','Estas tres vías no sustituyen los escenarios calculados por el motor, ni implican precios sin alcance.',asisDirectionCardsHtml(e))+`<div class="internal-only">${section('Biblioteca interna','Consulta de productos, niveles y acciones; la cotización final sigue el backend.',libraryHtml())}</div>`}
function scenarioBody(s){
  if(!s)return'<p>—</p>';
  const econ=s.economics||{},assumptions=s.assumptions||[],econReady=econ.status&&econ.status!=='NOT_CALCULATED'&&assumptions.length>0;
  const has=(...keys)=>assumptions.some(a=>keys.some(k=>a[k]!==null&&a[k]!==undefined));
  const hrs=(field,...keys)=>has(...keys)&&econ[field]!=null?num(econ[field])+' h/año':'Sin hipótesis';
  const money=(field,...keys)=>has(...keys)&&econ[field]!=null?eur(econ[field]):'Sin hipótesis';
  const econHtml=econReady?`
    <div class="scenario-kpi"><small>Horas activas recuperables estimadas</small><b>${hrs('annual_active_hours','future_active_hours','explicit_reduction_factor')}</b></div>
    <div class="scenario-kpi"><small>Espera reducible estimada</small><b>${hrs('annual_wait_hours','future_wait_hours')}</b></div>
    <div class="scenario-kpi"><small>Valor de capacidad</small><b>${econ.capacity_value_eur_annual==null?'No calculado':eur(econ.capacity_value_eur_annual)}</b><span>no es ahorro de caja</span></div>
    <div class="scenario-kpi"><small>Pérdida directa evitable</small><b>${money('direct_loss_eur_annual','preventable_loss_fraction')}</b></div>
    <div class="scenario-kpi"><small>Ahorro de caja declarado</small><b>${money('realized_cash_saving_eur_annual','realized_cash_saving_eur_annual')}</b></div>
    <div class="scenario-kpi"><small>Payback</small><b>${s.payback_months==null?'No calculado':num(s.payback_months)+' meses'}</b></div>`
    :`<div class="scenario-kpi"><small>Mejora económica del escenario</small><b>No calculada</b><span>Sin hipótesis futura cuantificada; ningún cero indica tiempo TO-BE.</span></div>`;
  const price=s.quote?.status==='BLOCKED'?'Sin precio autorizado':s.quote?.one_off_eur==null?'No disponible':eur(s.quote.one_off_eur);
  return `<div class="scenario-kpis"><div class="scenario-kpi"><small>Acción</small><b>${esc(actionLabel(s.action_id))}</b><span class="internal-tag">${esc(s.action_id||'—')}</span></div><div class="scenario-kpi"><small>Nivel</small><b>${esc(funcLevelLabel(s.functional_level_id))} / ${esc(aiLevelLabel(s.ai_level_id))}</b><span class="internal-tag">${esc(s.functional_level_id||'—')} / ${esc(s.ai_level_id||'—')}</span></div><div class="scenario-kpi"><small>Precio</small><b>${price}</b></div><div class="scenario-kpi"><small>Riesgo</small><b>${s.risk?.residual_level?esc(engineLabel('risk_level',s.risk.residual_level)):'—'}</b></div>${econHtml}</div>`;
}
function libraryHtml(){const products=schema.tables.REF_PRODUCT||[],levels=schema.tables.REF_LEVEL_FUNC||[],ais=schema.tables.REF_LEVEL_AI||[];return `<div class="internal-only"><div class="grid g3"><div><b>Productos</b><div class="field-help">${products.map(x=>esc(x.Product_Name)).join('<br>')}</div></div><div><b>Niveles funcionales</b><div class="field-help">${levels.map(x=>esc(x.Name)).join('<br>')}</div></div><div><b>Inteligencia</b><div class="field-help">${ais.map(x=>esc(x.Name)).join('<br>')}</div></div></div></div>`}
async function createScenario(presetIndex=null){
  // [AUNEA-FE-SCENARIO-PRESETS-152] START — Canonical options, never assumed savings or automatic approval
  const preset=Number.isInteger(presetIndex)&&typeof ASIS_CONDITIONAL_DIRECTIONS!=='undefined'
    ?ASIS_CONDITIONAL_DIRECTIONS[presetIndex]||null:null;
  // [AUNEA-FE-SCENARIO-PRESETS-152] END
  const e=currentEng(),o=currentDiagnosticOutput(e);
  if(!o)return toast('Recalcula el diagnóstico vigente antes de comparar escenarios.');
  if(!state.backendOnline)return toast('Conecta el backend para comparar escenarios.');
  const econRows=typeof normalizeEconomicInputs==='function'?normalizeEconomicInputs(e):[];
  const painIds=[...new Set(econRows.map(x=>x.pain_id).filter(Boolean))];
  const assumptionCards=painIds.length?painIds.map((pid,i)=>`<div class="card card-pad" style="margin-top:12px"><h3>Supuesto futuro · ${esc(pid)}</h3><p class="field-help">Introduce únicamente valores que puedas justificar. El backend calcula la recuperación; la interfaz no aplica porcentajes por defecto.</p><div class="form-grid">
    <div class="field"><label>Horas activas futuras/año</label><input type="number" min="0" step="0.01" id="scFutureActive_${i}" placeholder="Opcional"></div>
    <div class="field"><label>Horas de espera futuras/año</label><input type="number" min="0" step="0.01" id="scFutureWait_${i}" placeholder="Opcional"></div>
    <div class="field"><label>Reducción explícita (0–1)</label><input type="number" min="0" max="1" step="0.01" id="scReduction_${i}" placeholder="Opcional"></div>
    <div class="field"><label>Fracción de pérdida evitable (0–1)</label><input type="number" min="0" max="1" step="0.01" id="scLossFraction_${i}" placeholder="Opcional"></div>
    <div class="field"><label>Ahorro de caja realizable €/año</label><input type="number" min="0" step="0.01" id="scCash_${i}" placeholder="Opcional"></div>
    <div class="field"><label>Tipo de evidencia</label>${auneaSelectControl('scConfidence_'+i,[{value:'HYPOTHESIS',label:'Hipótesis'},{value:'AUNEA_ESTIMATE',label:'Estimación AUNEA'},{value:'CLIENT_DECLARED',label:'Declarado por cliente'},{value:'MEASURED',label:'Medido'}],'HYPOTHESIS',{placeholder:'Selecciona…'})}</div>
    <div class="field span-2"><label>Fundamento / fuente del supuesto</label><textarea id="scRationale_${i}" placeholder="Por qué este valor es defendible; referencia a TO-BE, evidencia o validación."></textarea></div>
  </div></div>`).join(''):`<div class="notice info" style="margin-top:12px">No hay impactos económicos vinculados a un Pain. El escenario puede comparar solución, nivel y riesgo, pero no calcular recuperación económica hasta que exista una base económica trazable.</div>`;
  openModal('Crear escenario alternativo',`<div class="form-grid"><div class="field"><label>Nombre</label><input id="scName" value="${attr(preset?.name||'Alternativa '+(e.scenarioResults.length+1))}"></div><div class="field"><label>Acción</label>${auneaSelectControl('scAction',[{value:'',label:'Mantener óptima'},...(schema.tables.REF_ACTION||[]).map(x=>({value:x.Action_ID,label:x.Name||x.Action_ID}))],preset?.actionId||'',{placeholder:'Mantener óptima'})}</div><div class="field"><label>Nivel funcional</label>${auneaSelectControl('scN',[{value:'',label:'Mantener'},...(schema.tables.REF_LEVEL_FUNC||[]).map(x=>({value:x.Functional_Level_ID,label:x.Name||x.Functional_Level_ID}))],'',{placeholder:'Mantener'})}</div><div class="field"><label>Nivel IA</label>${auneaSelectControl('scI',[{value:'',label:'Mantener'},...(schema.tables.REF_LEVEL_AI||[]).map(x=>({value:x.AI_Level_ID,label:x.Name||x.AI_Level_ID}))],preset?.aiId||'',{placeholder:'Mantener'})}</div></div><div class="notice" style="margin-top:14px"><b>Economía futura</b><br>Los supuestos siguientes son internos y explícitos. No se derivan automáticamente del nivel N/I ni de la cobertura del Pain.</div>${assumptionCards}`,async()=>{
    const optionalNumber=(id,min=0,max=null)=>{
      const raw=document.getElementById(id)?.value;
      if(raw===undefined||raw===null||raw==='')return null;
      const n=Number(raw);
      if(!Number.isFinite(n)||n<min||(max!==null&&n>max))throw new Error(`Valor no válido en ${id}.`);
      return n;
    };
    const assumptions=[];
    painIds.forEach((pid,i)=>{
      const future_active_hours=optionalNumber('scFutureActive_'+i);
      const future_wait_hours=optionalNumber('scFutureWait_'+i);
      const explicit_reduction_factor=optionalNumber('scReduction_'+i,0,1);
      const preventable_loss_fraction=optionalNumber('scLossFraction_'+i,0,1);
      const realized_cash_saving_eur_annual=optionalNumber('scCash_'+i);
      const hasValue=[future_active_hours,future_wait_hours,explicit_reduction_factor,preventable_loss_fraction,realized_cash_saving_eur_annual].some(v=>v!==null);
      if(!hasValue)return;
      const rationale=(document.getElementById('scRationale_'+i)?.value||'').trim();
      if(!rationale)throw new Error(`Explica el fundamento del supuesto económico para ${pid}.`);
      assumptions.push({
        pain_id:pid,future_active_hours,future_wait_hours,explicit_reduction_factor,
        preventable_loss_fraction,realized_cash_saving_eur_annual,
        confidence_type:document.getElementById('scConfidence_'+i)?.value||'HYPOTHESIS',
        rationale,source_or_rule_id:'RULE_SCENARIO_ECONOMICS'
      });
    });
    const scenario={scenario_name:document.getElementById('scName').value,action_id:document.getElementById('scAction').value||null,functional_level_id:document.getElementById('scN').value||null,ai_level_id:document.getElementById('scI').value||null,assumptions,commercial_scope:null};
    try{
      const r=await fetch(`${state.backendUrl}/v1/scenarios/compare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engagement:buildBackendPayload(e),diagnostic:o,scenario})});
      if(r.status===409)throw new Error('El diagnóstico ya no coincide con los inputs actuales. Recalcula antes de crear una alternativa.');
      if(!r.ok)throw new Error(await r.text());
      const j=await r.json();
      if(j.input_snapshot_hash!==o.input_snapshot_hash||j.rule_bundle_version!==o.rule_bundle_version)throw new Error('El backend devolvió un escenario asociado a otro snapshot.');
      e.scenarioResults.push(j.compared);markDirty('Escenario alternativo calculado sobre el snapshot vigente y supuestos futuros explícitos');closeModal();render()
    }catch(err){toast(err.message)}
  })
}
async function downloadQuotePdf(){const e=currentEng(),o=currentDiagnosticOutput(e);if(!o)return toast('Calcula un diagnóstico vigente antes de generar el PDF.');if(typeof approvedOutputReview==='function'&&!approvedOutputReview(e))return toast('Aprueba los resultados en Revisión humana antes de generar un entregable para cliente.');if(!state.backendOnline)return toast('Conecta el backend para generar el PDF.');const scenarios=[o.optimal_scenario,...(e.scenarioResults||[])],sel=e.selectedScenarioIndex??0,selectedScenario=scenarios[sel]||o.optimal_scenario,company=companyById(e.companyId),record=typeof engagementOfRecord==='function'?engagementOfRecord(e):e;const request={selected_scenario:selectedScenario,client_name:company?.name||'',process_name:record.answers?.DF011||e.title||'',next_step:record.answers?.DF098||'',include_internal_appendix:false};const btn=document.getElementById('printQuote');if(btn){btn.disabled=true;btn.textContent='Generando…'}try{const r=await fetch(`${state.backendUrl}/v1/deliverables/pdf`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({diagnostic:o,request})});if(!r.ok)throw new Error(await r.text());const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');const raw=`${company?.name||'Cliente'}_${record.answers?.DF011||'Diagnostico'}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'Diagnostico';a.href=url;a.download=`AUNEA_${raw}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast('PDF generado y descargado.')}catch(err){toast('No se pudo generar el PDF: '+err.message)}finally{if(btn){btn.disabled=false;btn.textContent='Descargar PDF'}}}
function quotePage(){const e=currentEng();if(!e) return noOfficial('Cotización','La cotización consume el escenario seleccionado y Pricing Engine.');const o=currentDiagnosticOutput(e);if(!o)return noOfficial('Cotización','El diagnóstico no existe o ya no corresponde al snapshot confirmado actual. Recalcula antes de preparar cotización o entregables.');const scenarios=[{name:'Recomendación óptima',data:o.optimal_scenario},...(e.scenarioResults||[]).map((s,i)=>({name:`Alternativa ${i+1}`,data:s}))],sel=e.selectedScenarioIndex??0,q=scenarios[sel]?.data?.quote||o.quote||{};return pageTop('Cotización','Selecciona qué escenario cotizar. La recomendación óptima sigue siendo inmutable.',`<button class="btn" id="printQuote">Descargar PDF</button><button class="btn btn-primary" id="createProject">Crear proyecto</button>`)+section('Escenario a cotizar','Puedes usar la recomendación o una alternativa calculada.',`<div class="field">${auneaSelectControl('quoteScenario',scenarios.map((s,i)=>({value:String(i),label:s.name})),String(sel),{placeholder:'Selecciona escenario'})}</div><div class="grid g4" style="margin-top:14px"><div class="card metric"><small>One-off</small><strong>${q.status==='BLOCKED'?'Sin precio autorizado':eur(q.one_off_eur)}</strong></div><div class="card metric"><small>Recurrente</small><strong>${q.status==='BLOCKED'?'Sin precio autorizado':eur(q.recurring_monthly_eur)+'/m'}</strong></div><div class="card metric"><small>TCO 12m</small><strong>${q.status==='BLOCKED'?'Sin precio autorizado':eur(q.tco_12m_eur)}</strong></div><div class="card metric"><small>Estado</small><strong style="font-size:19px">${q.status?esc(engineLabel('quote_status',q.status)):'—'}</strong></div></div>`)+`<div class="internal-only">${section('Biblioteca de productos y niveles','Consulta interna para preparar escenarios; no sustituye Pricing Engine.',libraryHtml())}</div>`}
function registerInternalWorkPages(){if(typeof pages==='undefined'||registerInternalWorkPages.done)return;registerInternalWorkPages.done=true;pages.revision=outputReviewPage;pages.tobe=tobePage;pages.comparacion=tobeComparisonPage;const originalPostBind=postBind;postBind=function(){originalPostBind();const e=currentEng(),by=id=>document.getElementById(id);if(by('createOutputReview'))by('createOutputReview').onclick=()=>{createOutputReview(e);render()};if(by('advanceOutputReview'))by('advanceOutputReview').onclick=()=>{advanceOutputReview(e,!!by('authorizeResultsPrice')?.checked);render()};if(by('analyzeAsisOnly'))by('analyzeAsisOnly').onclick=()=>runAsisAnalysis(e);
  document.querySelectorAll('[data-draft-conditional-scenario]').forEach(x=>x.onclick=()=>createScenario(Number(x.dataset.draftConditionalScenario)));if(by('createTobeDraft'))by('createTobeDraft').onclick=()=>{createTobeDraft(e);render()};if(by('saveTobe'))by('saveTobe').onclick=()=>{saveTobeFromDom(e);render()};if(by('advanceTobe'))by('advanceTobe').onclick=()=>{saveTobeFromDom(e);if(advanceTobeStatus(e))render()}}}
function outputReviewPage(){
  const e=currentEng(),r=currentOutputReview(e),sources=reviewSources(e);
  if(!sources)return pageTop('Revisión humana','Confirma el AS-IS, calcula el diagnóstico y aprueba el TO-BE de esa versión antes de revisar resultados.');
  const labels={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'};
  const actions=!r?'<button class="btn btn-primary" id="createOutputReview">Crear revisión</button>':r.status==='DRAFT'?'<button class="btn btn-primary" id="advanceOutputReview">Marcar como revisado</button>':r.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceOutputReview">Aprobar resultados para cliente</button>':'<button class="btn" data-page="modoresultados">Presentar resultados</button>';
  return pageTop('Revisión humana',r?`Versión ${r.version} · ${labels[r.status]}`:'Revisión pendiente',actions)+section('Fuentes de la devolución',`AS-IS v${sources.snapshotVersion} · TO-BE v${sources.tobeVersion}. Cambiar las fuentes exige una nueva revisión.`,scenarioBody(sources.scenario))+section('Contenido que se aprueba','Revisa hallazgos, riesgos, impacto, recomendación y escenario antes de autorizar su presentación.',`<button class="btn" data-page="resultados">Revisar diagnóstico</button><button class="btn" data-page="comparacion">Revisar comparación</button><button class="btn" data-page="escenarios">Revisar escenarios</button>${r?.status==='REVIEWED'?'<label><input type="checkbox" id="authorizeResultsPrice"> Autorizar mostrar el precio canónico de este escenario</label>':''}`);
}
// [AUNEA-FE-RESULTS-VIEW-010] END
