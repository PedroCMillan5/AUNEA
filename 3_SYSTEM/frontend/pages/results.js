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
    if(x.status==='SUPERSEDED')return false;
    const ids=normalizeArray(x.step_ids).filter(Boolean);
    return String(x.pain_id||'')===String(p.pain_id)||ids.some(id=>stepIds.includes(id));
  });
  const risks=(record?.risks||[]).filter(r=>r.status!=='SUPERSEDED'&&normalizeArray(r.step_ids).some(id=>stepIds.includes(id)));
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
    const distinctCauses=[...new Set(causes)].filter(x=>!frictionText.includes(x));
    const firstStep=trace.stepIds[0];
    return `<article class="diagnosis-finding">
      <div class="diagnosis-finding-head"><div><span class="diagnosis-rank">${i+1}</span><div><h3>${esc(diagnosisPainLabel(p.pain_id))}</h3><p>${p.rationale?esc(p.rationale):'Hallazgo calculado por el backend a partir de la captura confirmada.'}</p></div></div><div class="diagnosis-state"><span>${p.state?esc(engineLabel('pain_state',p.state)):'—'}</span><small>Confianza: ${p.confidence?esc(engineLabel('confidence',p.confidence)):'—'}</small></div></div>
      <div class="diagnosis-trace-grid">
        <div><small>Dónde</small><b>${esc(steps.join(' · ')||'Sin paso trazable')}</b></div>
        <div><small>Fricción observada</small><b>${esc(frictionText.join(' · ')||'Sin fricción enlazada')}</b></div>
        <div><small>Factores declarados (no demuestran causa raíz)</small><b>${esc(distinctCauses.join(' · ')||'No se ha acreditado una causa distinta del problema observado')}</b></div>
        <div><small>Evidencia registrada</small><b>${esc(evidence.join(' · ')||'Sin descripción adicional')}</b></div>
        ${priorityKnown&&prioritySelected?'<div><small>Prioridad del cliente</small><b>Seleccionada</b></div>':''}
      </div>
      ${firstStep?'<a class="btn btn-outline" href="#asis-source-step-'+attr(String(firstStep))+'">Ver punto de análisis en esta página</a>':''}
      <details class="diagnosis-source-review">
        <summary>Ver trazabilidad del hallazgo</summary>
        <div class="notice info"><b>Origen del análisis</b><br>Hallazgo producido por el motor a partir del diagnóstico confirmado. La relación con los pasos se obtiene de los vínculos registrados, no demuestra por sí sola causalidad.</div>
        <div class="diagnosis-trace-grid">
          <div><small>Pasos relacionados</small><b>${esc(steps.join(' · ')||'Sin paso enlazado: revisar atribución')}</b></div>
          <div><small>Fricciones de origen</small><b>${esc(trace.frictions.map(f=>[f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type),
            f.evidence_type?engineLabel('evidence_quality',evidenceTypeBackend(f.evidence_type)):'Sin calidad de evidencia registrada'].filter(Boolean).join(' · ')).join(' | ')||'Sin fricción enlazada')}</b></div>
          <div><small>Eventos económicos con pasos compartidos (relación contextual, no causal)</small><b>${esc(trace.economics.map(x=>[typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):'Registro económico',
            x.evidence_type?engineLabel('evidence_quality',evidenceTypeBackend(x.evidence_type)):'Sin calidad de evidencia registrada'].join(' · ')).join(' | ')||'Sin registro económico enlazado')}</b></div>
          <div><small>Riesgos en esos pasos</small><b>${esc(trace.risks.map(r=>r.description||labelFrom('OS_RISK_CATEGORY',r.category)).join(' · ')||'Sin riesgo enlazado')}</b></div>
          <div><small>Impactos relacionados por pasos compartidos</small><b>${esc(impacts.join(' · ')||'Sin registro enlazado')}</b><small>La relación es contextual: no permite asignar pérdidas ni ahorros a este hallazgo.</small></div>
          <div><small>Prioridad del cliente</small><b>${priorityKnown?(prioritySelected?'Seleccionada':'No seleccionada'):'No registrada'}</b></div>
          <div><small>Estado del motor</small><b>${esc(p.state?engineLabel('pain_state',p.state):'Pendiente')} · Confianza: ${esc(confidenceText)}</b><small>Clasificación basada en el tipo de evidencia disponible; no equivale a validación adicional del cliente.</small></div>
          <div><small>Fuente editable</small><b>AS-IS confirmado · Revisar AS-IS para corregir el origen; después recalcular</b></div>
        </div>
        <details class="pg10-technical-trace"><summary>Consultar identificadores técnicos de la fuente</summary>
          <p>${esc(trace.frictions.map(f=>'Fricción: '+String(f.id||'sin ID')+' · Evidencia: '+String(f.evidence_type||'sin código')).join(' | ')||'Sin fricción enlazada')}</p>
          <p>${esc(trace.economics.map(x=>'Evento: '+String(x.deduplication_key||'sin clave')+' · Evidencia: '+String(x.evidence_type||'sin código')).join(' | ')||'Sin evento económico enlazado')}</p>
        </details>
        <button type="button" class="btn btn-outline" data-page="proceso">Revisar AS-IS de origen</button>
      </details>

    </article>`;
  }).join('')+'</div>';
}
// [AUNEA-FE-PG10-STEP-TIMELINE-169] START — Temporal walkthrough from sealed steps and backend contributions.
// SOURCE: DEC-034/050/068/074, Diagnostic Master DF037–DF040/DF060/DF062, session_time.py.
// No frontend annualization, elapsed-cycle inference or duplicate friction attribution.
// The step line is schematic, not a proportional elapsed-time graph.
function diagnosisProcessStepTimelineHtml(p,record){
  const steps=(record?.processSteps||[]).filter(s=>s.status!=='SUPERSEDED');
  const calculated=Array.isArray(p?.step_breakdown)?p.step_breakdown:[];
  const extras=Array.isArray(p?.additional_friction_breakdown)?p.additional_friction_breakdown:[];
  const frictions=(record?.frictions||[]).filter(f=>f.status!=='SUPERSEDED');
  const byId=new Map(steps.map(s=>[String(s.id),s]));
  const byCalc=id=>calculated.find(x=>String(x.step_id)===String(id));
  const minutes=x=>{
    const v=x&&typeof x==='object'?x.value:x;
    return v===null||v===undefined||v===''||!Number.isFinite(Number(v))?'Sin dato':num(Number(v))+' min';
  };
  const yearly=x=>x===null||x===undefined?'Sin cálculo anual':num(x)+' h/año';
  const applicability=(s,b)=>{
    const a=b?.applies_to??s.applies_to??{mode:'ALL'};
    const mode=String(a?.mode||a||'ALL').toUpperCase();
    return mode==='ALL'?'Todos los casos':
      mode==='PERCENT'&&a?.value!=null&&Number(a.value)>=0&&Number(a.value)<=100
        ?num(a.value)+' % de los casos':'Ruta condicional sin proporción acreditada';
  };
  const eventFrequency=frequency=>{
    if(!frequency||frequency.value===null||frequency.value===undefined)return 'Frecuencia no acreditada';
    const amount=Number(frequency.value);
    if(!Number.isFinite(amount)||amount<0)return 'Frecuencia no acreditada';
    if(String(frequency.mode).toLowerCase()==='percent')return num(amount)+' % de los casos';
    if(String(frequency.mode).toLowerCase()==='count'){
      const period={case:'caso',month:'mes',year:'año',day:'día'}[frequency.period];
      return period?num(amount)+' eventos por '+period:'Frecuencia sin periodo comparable';
    }
    return 'Frecuencia no comparable';
  };
  if(!steps.length)return '<p class="field-help">No existen pasos activos de los que mostrar tiempos.</p>';
  // Read precisely the same YES/NO routes as the confirmed AS-IS map.
  // Do not derive routing from a percentage or visual array position.
  const branches=typeof processBranchStructure==='function'?processBranchStructure(record,steps).branches:[];
  const routeHtml=branches.length?
    '<div class="pg10-time-branches"><h5>Bifurcaciones del proceso confirmado</h5>'+
    branches.map(branch=>{
      const decision=byId.get(String(branch.decisionId));
      const merge=branch.merge==='__END__'?'Fin del proceso':(byId.get(String(branch.merge))?.step_name||'Reincorporación no identificada');
      const names=ids=>ids.map(id=>byId.get(String(id))?.step_name).filter(Boolean);
      const describe=ids=>[...names(ids),merge].join(' → ');
      return '<div class="pg10-time-branch"><b>Decisión: '+esc(decision?.step_name||'Paso de decisión')+'</b>'+
        '<div class="pg10-time-branch-paths">'+
        '<div class="pg10-time-branch-yes"><strong>Sí</strong><span>'+esc(describe(branch.yesSteps))+'</span></div>'+
        '<div class="pg10-time-branch-no"><strong>No</strong><span>'+esc(describe(branch.noSteps))+'</span></div>'+
        '</div></div>';
    }).join('')+
    '<p class="field-help">Rutas derivadas de los destinos confirmados del mapa. Cada paso aparece una sola vez en los datos temporales.</p></div>':'';
  const cards=steps.map((step,i)=>{
    const b=byCalc(step.id);
    const work=b?.active_minutes_per_execution??step.active_time;
    const wait=b?.wait_minutes_per_execution??step.wait_time;
    const rework=b?.rework_minutes_per_event??step.rework_time;
    const applicabilityText=applicability(step,b);
    const rawRate=b?.error_rate??step.error_rate;
    const reworkFrequency=rawRate&&typeof rawRate==='object'
      ?(String(rawRate.mode||'percent').toLowerCase()==='percent'&&rawRate.value!=null
        ?num(rawRate.value)+' % de las ejecuciones de este paso':'Frecuencia sin porcentaje comparable')
      :rawRate!==undefined&&rawRate!==null&&rawRate!==''?num(rawRate)+' % de las ejecuciones de este paso':null;
    const related=Number(wait)>0?frictions.filter(f=>Array.isArray(f.affected_steps)&&
      f.affected_steps.map(String).includes(String(step.id))).map(f=>
      f.client_label||f.observable_signal||(typeof labelFrom==='function'?labelFrom('OS_FRICTION_TYPE',f.friction_type):'')||'Fricción registrada'):[];
    const extra=extras.filter(x=>String(x.owner_step_id)===String(step.id)).map(x=>{
      const f=frictions.find(f=>String(f.id)===String(x.friction_id));
      return '<li><span>'+esc(f?.client_label||f?.observable_signal||'Trabajo adicional registrado')+'</span>'+
        '<b>'+esc(minutes(x.minutes_per_event))+' por incidencia · '+esc(yearly(x.annual_additional_hours))+'</b>'+
        '<small>Frecuencia: '+esc(eventFrequency(x.frequency))+'</small></li>';
    }).join('');
    const annual=b?
      '<div class="pg10-time-year"><b>Aportación anual ponderada</b>'+
      '<div>Trabajo: <strong>'+esc(yearly(b.annual_active_hours))+'</strong></div>'+
      (b.annual_wait_exposure_hours!=null?'<div>Exposición a espera: '+esc(yearly(b.annual_wait_exposure_hours))+'</div>':'')+
      (b.annual_rework_hours!=null?'<div>Retrabajo: '+esc(yearly(b.annual_rework_hours))+'</div>':'')+
      '</div>':
      '<div class="pg10-time-year"><small>Desglose anual por paso no disponible; recalcula el AS-IS para obtenerlo del backend.</small></div>';
    const repeat=Number(b?.occurrences_per_case??step.occurrences_per_case??1);
    return '<li class="pg10-time-step"><div class="pg10-time-node"><span>'+esc(String(i+1))+'</span></div>'+
      '<div class="pg10-time-card"><div class="pg10-time-card-header"><b>'+esc(step.step_name||'Paso sin nombre')+'</b>'+
      '<small>'+esc(applicabilityText)+(Number.isFinite(repeat)&&repeat>1?' · '+esc(String(repeat))+' veces por caso':'')+'</small></div>'+
      '<div class="pg10-time-lanes">'+
      '<div class="pg10-time-lane pg10-time-work"><span>Trabajo</span><strong>'+esc(minutes(work))+'</strong></div>'+
      '<div class="pg10-time-lane pg10-time-wait"><span>Espera</span><strong>'+esc(minutes(wait))+'</strong></div>'+
      '<div class="pg10-time-lane pg10-time-rework"><span>Retrabajo por incidencia</span><strong>'+esc(minutes(rework))+'</strong></div></div>'+
      (Number(wait)>0?'<p class="pg10-time-explainer">Espera en '+esc(applicabilityText.toLowerCase())+'; exposición pasiva, no trabajo activo.</p>'+
        (related.length?'<p class="pg10-time-explainer">Fricciones relacionadas con este paso: '+esc([...new Set(related)].join(' · '))+'. Relación contextual, sin duplicar la espera.</p>':''):'')+
      (Number(rework)>0?'<p class="pg10-time-explainer">Frecuencia de retrabajo: '+esc(reworkFrequency||'no acreditada')+'.</p>':'')+
      annual+(extra?'<div class="pg10-time-extra"><b>Trabajo adicional atribuido a este paso</b><ul>'+extra+'</ul></div>':'')+
      '<a href="#asis-source-step-'+attr(String(step.id))+'" class="pg10-time-source">Consultar este paso en el mapa y su ficha</a></div></li>';
  }).join('');
  return '<section class="pg10-temporal-walkthrough"><div class="pg10-temporal-heading"><h4>Recorrido temporal por pasos</h4>'+
    '<p>Tiempo por ejecución de cada paso y su contribución anual calculada por el backend.</p></div>'+
    '<div class="pg10-time-legend"><span class="pg10-time-work">Trabajo</span><span class="pg10-time-wait">Espera</span><span class="pg10-time-rework">Retrabajo</span></div>'+
    routeHtml+'<ol class="pg10-time-route'+(branches.length?' pg10-time-route-branched':'')+'">'+cards+'</ol>'+
    '<p class="field-help pg10-time-warning">El recorrido indica orden y bifurcaciones, no una escala cronológica. Las esperas pueden solaparse. Los minutos y horas mostrados no sustituyen la duración end-to-end declarada ni acreditan ahorro.</p></section>';
}
// [AUNEA-FE-PG10-STEP-TIMELINE-169] END

// [AUNEA-FE-PG10-PROCESS-BASELINE-091] START — Server-owned AS-IS baseline, separate from EconomicInput.
// SOURCE: DEC-034/041/068; Simulator CANONICAL PG10/PG12.
function diagnosisProcessBaselineHtml(p,record){
  if(!p)return '<div class="notice info">Proyección temporal del proceso no disponible; no se sustituye por inputs económicos parciales.</div>';
  const cell=k=>p[k]==null?'No calculado':num(p[k]);
  const declared=record&&typeof asisSourceBoundary==='function'?asisSourceBoundary(record,'DF026'):'No disponible';
  const gaps=Array.isArray(p.gaps)?p.gaps:[];
  // [AUNEA-FE-PG10-NUMERIC-SUMMARY-171] START — Backend numeric comparison, source overlap hint, no elapsed auto-approval.
  // SOURCE: DEC-074 and session_time.numeric_time_consistency; read-only UI for PG10.
  const numeric=p.numeric_comparison;
  const comparable=numeric&&Number.isFinite(numeric.declared_minutes)&&Number.isFinite(numeric.component_minutes)
    &&Number.isFinite(numeric.difference_percent);
  const comparison=comparable
    ?'<div class="pg10-numeric-comparison"><b>'+
      (numeric.status==='WITHIN_REVIEW_THRESHOLD'?'Comparación numérica orientativa · tiempo de ciclo no conciliado':'Diferencia temporal para revisar · tiempo de ciclo no conciliado')+'</b>'+
      '<div class="pg10-numeric-comparison-values">'+
      '<span>Declarado <strong>'+esc(num(numeric.declared_minutes))+' min</strong></span>'+
      '<span>Componentes ponderados <strong>'+esc(num(numeric.component_minutes))+' min</strong></span>'+
      '<span>Diferencia <strong>'+(numeric.difference_minutes>0?'+':'')+esc(num(numeric.difference_minutes))+
      ' min ('+(numeric.difference_percent>0?'+':'')+esc(num(numeric.difference_percent))+' %)</strong></span></div>'+
      '<p>Se aplica el umbral de revisión del ±'+esc(num(numeric.review_threshold_percent))+
      ' % que ya utiliza el mapa AS-IS. Es solo un umbral para revisar diferencias, no un criterio para validar la duración real. La suma incluye exposición a espera, que puede solaparse con otras actividades; la proximidad de cifras no acredita el tiempo end-to-end. No se monetiza la espera ni se infieren ahorros.</p></div>'
    :'<div class="notice info pg10-numeric-comparison"><b>Comparación numérica no disponible</b>'+
      '<p>Los componentes aún no son íntegramente comparables o el análisis es anterior a esta comprobación. Puedes actualizar el análisis, sin modificar datos confirmados.</p></div>';
  // Informative coincidence only: INCLUDED/BREAKDOWN never add time; matching minutes are not proof of duplication.
  const timeOwnerOverlap=(record?.frictions||[]).filter(f=>f.status!=='SUPERSEDED'&&
    ['INCLUDED','BREAKDOWN'].includes(String(f.time_attribution?.mode||'').toUpperCase())).flatMap(f=>{
      const owner=(record?.processSteps||[]).find(s=>String(s.id)===String(f.time_attribution?.step_id));
      const raw=f.active_time_loss&&typeof f.active_time_loss==='object'?f.active_time_loss.value:f.active_time_loss;
      const a=Number(raw),b=Number(owner?.rework_time);
      return owner&&raw!=null&&Number.isFinite(a)&&Number.isFinite(b)&&a>0&&a===b
        ?[{owner:owner.step_name||'Paso',minutes:a,friction:f.client_label||f.observable_signal||'Fricción incluida'}]:[];
    });
  const overlapNotice=timeOwnerOverlap.length?
    '<div class="notice info pg10-time-overlap"><b>Comprobación de posibles actividades coincidentes</b><p>'+
    esc(timeOwnerOverlap.map(x=>x.owner+': '+num(x.minutes)+' min en «'+x.friction+
    '» ya incluidos y otros '+num(x.minutes)+' min de retrabajo por incidencia').join(' · '))+
    '. La coincidencia no demuestra duplicidad: comprueba si son actividades distintas en su evidencia de origen. No se suma dos veces la fricción incluida.</p></div>':'';

  // [AUNEA-FE-PG10-NUMERIC-SUMMARY-171] END
  const card=(title,value,note)=>'<div class="notice pg10-time-summary-card"><b>'+esc(title)+'</b><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>';
  const main=[
    card('Casos al año',cell('annual_cases'),'Volumen habitual anualizado'),
    card('Trabajo activo total',p.annual_total_active_hours==null?'No conciliado':cell('annual_total_active_hours')+' h/año','Trabajo ponderado de pasos y fricciones adicionales; excluye espera y retrabajo'),
    card('Exposición a espera',p.annual_wait_exposure_hours==null?'No calculado':cell('annual_wait_exposure_hours')+' caso-horas/año','Espera pasiva, no horas laborales ni ahorro; tampoco equivale a duración end-to-end'),
    card('Retrabajo anual',p.annual_rework_hours==null?'No calculado':cell('annual_rework_hours')+' h/año','Frecuencias registradas; sin duplicar fricciones')
  ].join('');
  const additional=[
    card('Trabajo activo de los pasos',p.annual_active_hours==null?'No calculado':cell('annual_active_hours')+' h/año','No incluye fricciones adicionales'),
    card('Trabajo adicional de fricciones',p.annual_friction_additional_hours==null?'Pendiente de atribución':cell('annual_friction_additional_hours')+' h/año','Solo fricciones ADICIONAL con propietario y frecuencia válidos'),
    card('Ciclo end-to-end declarado',declared,'Referencia declarada; no es la suma de exposiciones'),
    card('Estado de la proyección',p.status==='CALCULATED'?'Componentes calculados':'Componentes incompletos','No equivale a tiempo de ciclo conciliado')
  ].join('');
  return diagnosisProcessStepTimelineHtml(p,record)+
    '<div class="pg10-time-summary"><div class="pg10-temporal-heading"><h4>Resumen anual del proceso</h4>'+
    '<p>Magnitudes de distinta naturaleza, no una única duración.</p></div>'+
    '<div class="grid g4 diagnosis-process-baseline">'+main+'</div>'+
    '<details class="pg10-time-summary-detail"><summary>Ver desglose de trabajo, ciclo declarado y estado del cálculo</summary>'+
    '<div class="grid g4 diagnosis-process-baseline">'+additional+'</div></details>'+
    comparison+overlapNotice+
    (gaps.length?'<div class="notice warn pg10-time-gaps"><b>Datos o atribuciones pendientes</b><ul>'+gaps.slice(0,5).map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul></div>':'')+
    '</div>';
}
// [AUNEA-FE-PG10-PROCESS-BASELINE-091] END
// [AUNEA-FE-PG10-ANALYSIS-UX-166] START — Source-owned economic/risk results with progressive evidence.
// Source: backend EconomicsResult and RiskResult, DEC-034/050/068; no recomputation or scoring.
function diagnosisEconomicsHtml(econ,record,projection){
  const inputs=(record?.economicInputs||[]).filter(x=>x.status!=='SUPERSEDED');
  const capacity=projection?.process_labor_capacity;
  const money=x=>x==null?'No cuantificado':eur(x)+'/año';
  const euroValue=x=>typeof x==='number'&&Number.isFinite(x)
    ?x.toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2})+' €':'No calculado';
  const euroCents=x=>typeof x==='number'&&Number.isFinite(x)
    ?x.toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'No calculado';
  const hours=x=>x==null?'No calculado':num(x)+' h/año';
  const roleLabel=code=>{
    const raw=String(code||'').trim();
    const fromSource=raw?labelFrom('OS_ACTOR_ROLE',raw):'';
    if(fromSource&&fromSource!==raw)return fromSource;
    return {ADMIN:'Administración',MANAGER:'Dirección / responsable'}[raw]||raw||'Rol sin identificar';
  };
  const evidence=x=>x?.evidence_type?engineLabel('evidence_quality',evidenceTypeBackend(x.evidence_type)):'Sin evidencia clasificada';
  const evidenceLabel=x=>({HYPOTHESIS:'Hipótesis',CLIENT_DECLARED:'Declaración del cliente',
    MEASURED:'Medición',AUNEA_ESTIMATE:'Estimación AUNEA',SPECIFIC_BENCHMARK:'Referencia específica',
    NOT_RECORDED:'Sin acreditar'})[x]||'Sin clasificar';

  // [AUNEA-FE-PG10-OPERATING-COST-172] START — Values owned by backend, never recomputed in UI.
  // SOURCE: process_time_projection/process_labor_capacity, EconomicResult, DEC-021/032/034/050/068.
  const roleRows=Array.isArray(capacity?.role_breakdown)?capacity.role_breakdown:[];
  const complete=capacity?.status==='COMPLETE'&&
    typeof capacity.annual_labor_capacity_value_eur==='number'&&Number.isFinite(capacity.annual_labor_capacity_value_eur);
  const costIntro=complete
    ?'<div class="pg10-econ-hero"><div><small>Capacidad anual valorada</small><strong>'+
      esc(euroValue(capacity.annual_labor_capacity_value_eur))+
      '</strong></div><div><small>Valor de capacidad por caso</small><strong>'+
      esc(euroCents(capacity.capacity_value_eur_per_case))+'</strong></div></div>'
    :'<div class="notice info pg10-econ-incomplete"><b>Valoración laboral incompleta</b><p>No se puede calcular un importe total fiable: falta una tarifa única por rol, tiempo suficiente o un análisis actualizado.</p>'+
      (capacity?.unvalued_steps?.length?'<p>Por comprobar: '+esc(capacity.unvalued_steps.join(' · '))+'</p>':'')+'</div>';

  const roleTable=complete&&roleRows.length
    ?'<section class="pg10-cost-roles"><h5>Distribución anual por rol</h5>'+
      '<div class="pg10-cost-roles-scroll"><table><thead><tr><th scope="col">Rol</th>'+
      '<th scope="col">Horas/año</th><th scope="col">Tarifa</th>'+
      '<th scope="col">Valor anual</th><th scope="col">Por caso</th></tr></thead><tbody>'+
      roleRows.map(x=>'<tr><th scope="row">'+esc(roleLabel(x.role))+'</th>'+
        '<td>'+esc(x.annual_hours==null?'Pendiente':num(x.annual_hours))+'</td>'+
        '<td>'+esc(x.hourly_rate==null?'Pendiente':euroValue(x.hourly_rate)+'/h')+'</td>'+
        '<td>'+esc(euroValue(x.annual_capacity_value_eur))+'</td>'+
        '<td>'+esc(euroCents(x.capacity_value_eur_per_case))+'</td></tr>').join('')+
      '</tbody><tfoot><tr><th scope="row">Total</th><td>'+esc(hours(capacity.covered_hours).replace(' h/año',''))+'</td><td>—</td>'+
      '<td>'+esc(euroValue(capacity.annual_labor_capacity_value_eur))+'</td>'+
      '<td>'+esc(euroCents(capacity.capacity_value_eur_per_case))+'</td></tr></tfoot></table></div></section>'
    :'<p class="pg10-cost-roles-missing">'+(complete
      ?'No se dispone del desglose por rol en este análisis. Actualiza el análisis con el AS-IS vigente.'
      :'El desglose por rol se mostrará cuando exista una valoración completa.')+'</p>';

  const hasTools=inputs.some(x=>x.current_tool_cost_eur_annual!=null);
  const hasLoss=inputs.some(x=>x.direct_loss_eur_annual!=null);
  const hasCash=inputs.some(x=>x.realized_cash_saving_eur_annual!=null);
  const moneyKnown=(flag,value)=>flag&&value!=null?money(value):'No consignado';
  const otherImpacts='<section class="pg10-econ-other"><h5>Otros importes registrados</h5><div class="grid g3 pg10-econ-other-grid">'+
    '<div class="notice"><b>Herramientas</b><strong>'+esc(moneyKnown(hasTools,econ.current_tool_cost_eur_annual))+
      '</strong><small>Coste actual. No se presupone eliminable.</small></div>'+
    '<div class="notice"><b>Retrabajo (valoración separada)</b><strong>'+
      esc(capacity?.rework_separate_value_eur==null?'No calculado':euroCents(capacity.rework_separate_value_eur)+'/año')+
      '</strong><small>No se suma: podría solaparse con trabajo ya contabilizado.</small></div>'+
    '<div class="notice"><b>Pérdidas directas / ahorro de caja realizado</b><strong>'+
      esc(((hasLoss&&Number(econ.direct_loss_eur_annual)>0)||(hasCash&&Number(econ.realized_cash_saving_eur_annual)>0))
        ?'Ver importes registrados':'Sin importe acreditado')+
      '</strong><small>Importes distintos de la capacidad laboral estimada.</small></div></div></section>';
  const mainExplanation='<p class="field-help pg10-econ-summary-note">La capacidad se valora con trabajo activo de los pasos, esfuerzo adicional atribuido y tarifas registradas. La espera pasiva no es trabajo laboral. Los importes son estimaciones condicionadas a los datos y su evidencia; no son gasto contable ni ahorro realizable.</p>';
  // [AUNEA-FE-PG10-OPERATING-COST-172] END

  const extras=Array.isArray(projection?.additional_friction_breakdown)?projection.additional_friction_breakdown:[];
  const sourceFriction=id=>(record?.frictions||[]).find(f=>String(f.id)===String(id)&&f.status!=='SUPERSEDED');
  const extraDetail=extras.length
    ?'<div class="pg10-cost-conditional"><b>Esfuerzo adicional atribuido a fricciones</b>'+
      '<p>Estas horas se han incluido como trabajo activo porque así constan en su fuente. Frecuencia y propietario no prueban por sí solos que sean trabajo y no espera: si la clasificación es errónea, se corrige en el AS-IS y se recalcula.</p><ul>'+
      extras.map(x=>{const f=sourceFriction(x.friction_id);
        return '<li><b>'+esc(f?.client_label||f?.observable_signal||'Fricción registrada')+'</b> · '+
          esc(hours(x.annual_additional_hours))+' adicionales · '+
          esc(x.minutes_per_event==null?'Duración por ocurrencia no disponible':num(x.minutes_per_event)+' min por ocurrencia')+
          (x.frequency?.mode==='percent'&&x.frequency?.value!=null?' · Frecuencia registrada: '+esc(num(x.frequency.value))+' % de los casos':'')+
          ' · Evidencia: '+esc(evidence(f))+'</li>';
      }).join('')+'</ul></div>'
    :(Number(projection?.annual_friction_additional_hours)>0
      ?'<p class="field-help">Esta proyección contiene trabajo adicional sin detalle de atribución. Actualiza el análisis con el AS-IS vigente.</p>'
      :'<p class="field-help">No consta trabajo adicional por fricciones en este cálculo.</p>');
  const stepDetail=Array.isArray(capacity?.steps)&&capacity.steps.length
    ?'<section class="pg10-econ-detail-group"><h5>Procedencia por paso</h5><div class="pg10-cost-steps">'+
      capacity.steps.map(x=>{
        const base=x.base_annual_hours,additional=x.additional_annual_hours;
        const basis=base!=null&&additional!=null&&additional>0
          ?'<small class="pg10-step-hour-split">'+esc(hours(base))+' del paso + '+esc(hours(additional))+
             ' adicionales = '+esc(hours(x.annual_hours))+'</small>'
          :'<small class="pg10-step-hour-split">'+esc(x.annual_hours==null?'Horas pendientes':hours(x.annual_hours))+
             (base==null?' · desglose de horas no disponible':' · trabajo del paso')+'</small>';
        return '<div class="pg10-step-source-row"><span>'+esc(x.step_name||'Paso')+' · '+esc(roleLabel(x.role))+
          basis+'</span><b>'+esc(x.annual_hours==null?'Horas pendientes':hours(x.annual_hours))+' × '+
          esc(x.hourly_rate==null?'Tarifa pendiente':euroValue(x.hourly_rate)+'/h')+' = '+
          esc(euroValue(x.capacity_value))+'</b></div>';
      }).join('')+'</div>'+
      '<p class="field-help">El valor por paso usa las horas atribuidas por el backend: trabajo propio más fricciones adicionales válidas, sin incluir espera pasiva ni retrabajo pendiente de conciliación.</p>'+
      '<p class="field-help">Calidad de las tarifas: '+esc([...new Set(capacity.steps.flatMap(x=>x.evidence||[]))].map(evidenceLabel).join(', ')||'No especificada')+'.</p></section>'
    :'<p class="field-help">No existe aún un desglose por pasos valorados; la valoración no debe completarse en la interfaz.</p>';
  const inputDescription=x=>{
    const parts=[];
    if(x.capacity_cost_rate_eur_hour!=null)parts.push(num(x.capacity_cost_rate_eur_hour)+' €/hora de capacidad');
    if(x.current_tool_cost_eur_annual!=null&&Number(x.current_tool_cost_eur_annual)>0)parts.push(money(x.current_tool_cost_eur_annual)+' de herramientas');
    if(x.annual_active_hours!=null&&Number(x.annual_active_hours)!==0)parts.push(hours(x.annual_active_hours)+' de trabajo consignado directamente');
    if(x.annual_wait_hours!=null&&Number(x.annual_wait_hours)!==0)parts.push(hours(x.annual_wait_hours)+' de espera consignada directamente');
    if(x.direct_loss_eur_annual!=null&&Number(x.direct_loss_eur_annual)>0)parts.push(money(x.direct_loss_eur_annual)+' de pérdida directa');
    const role=x.role_or_resource?roleLabel(x.role_or_resource):'';
    const zeros=[x.annual_active_hours===0?'Trabajo declarado: 0 h/año':'',
      x.annual_wait_hours===0?'Espera declarada: 0 h/año':'',
      x.direct_loss_eur_annual===0?'Pérdida directa declarada: 0 €/año':'',
      x.realized_cash_saving_eur_annual===0?'Ahorro realizado declarado: 0 €/año':''].filter(Boolean);
    const optionalZeros=zeros.length?'<details class="pg10-econ-zero-fields"><summary>Ver campos consignados con valor cero ('+
      zeros.length+')</summary><p>'+esc(zeros.join(' · '))+'</p></details>':'';
    return '<li><b>'+esc(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id||'Registro económico')+
      '</b>'+(role?'<span>'+esc(role)+'</span>':'')+
      '<span>'+esc(parts.join(' · ')||'Sin importe anual adicional consignado')+'</span>'+
      '<small>Calidad de la evidencia: '+esc(evidence(x))+'</small>'+optionalZeros+'</li>';
  };
  const directNonzero=[
    Number(econ.direct_loss_eur_annual)>0&&hasLoss?'Pérdidas directas: '+money(econ.direct_loss_eur_annual):'',
    Number(econ.realized_cash_saving_eur_annual)>0&&hasCash?'Ahorro de caja ya realizado: '+money(econ.realized_cash_saving_eur_annual):''
  ].filter(Boolean);
  // [AUNEA-FE-PG10-ECON-SOURCE-CONCILIATION-174] START — one auditable source detail, no duplicate summary cards.
  const detail='<details class="diagnosis-economic-detail"><summary>Consultar cálculos, pasos y fuentes ('+inputs.length+' registros)</summary>'+
    '<div class="pg10-econ-detail-group"><h5>Cómo se obtienen las horas</h5>'+
    '<p>Trabajo activo de pasos: <b>'+esc(hours(projection?.annual_active_hours))+'</b> · Trabajo adicional atribuido: <b>'+
      esc(hours(projection?.annual_friction_additional_hours))+'</b> · Trabajo activo total: <b>'+
      esc(hours(projection?.annual_total_active_hours))+'</b>.</p>'+
    '<p>Horas con tarifa asignada: <b>'+esc(hours(capacity?.covered_hours))+
      '</b>. La espera pasiva se mantiene fuera del coste laboral y el retrabajo se valora aparte. No se suman horas ni importes procedentes de fuentes coincidentes.</p></div>'+
    stepDetail+extraDetail+
    '<section class="pg10-econ-detail-group"><h5>Registros económicos originales</h5>'+
      '<p>Estos registros conservan las tarifas y otros costes originales. Los campos con valor cero se ocultan en el resumen para evitar confundirlos con las horas del mapa; puedes consultarlos en cada registro. Un cero explícito no significa ausencia de trabajo en el proceso.</p>'+
      (directNonzero.length?'<p>'+esc(directNonzero.join(' · '))+'</p>':'<p>No hay pérdidas directas ni ahorros de caja positivos acreditados en los registros.</p>')+
      (inputs.length?'<ul class="diagnosis-economic-input-list">'+inputs.map(inputDescription).join('')+'</ul>':'<p>No se han registrado entradas económicas.</p>')+
    '</section></details>';
  // [AUNEA-FE-PG10-ECON-SOURCE-CONCILIATION-174] END
  return '<div class="pg10-econ-overview">'+costIntro+roleTable+otherImpacts+mainExplanation+detail+'</div>';
}
function diagnosisRisksHtml(risk,record){
  // [AUNEA-FE-PG10-RISK-EXPLANATION-172] START — Plain language only; backend risk rating unchanged.
  // SOURCE: RiskEngine R0-R3 and recorded RiskInput, DEC-034/050 and Simulator PG10.
  const rows=(record?.risks||[]).filter(x=>x.status!=='SUPERSEDED');
  const level=x=>x?esc(engineLabel('risk_level',x)):'Sin valoración';
  const missing=rows.filter(x=>x.controls_present===false).length;
  const unknown=rows.filter(x=>x.controls_present==null).length;
  const withControls=rows.filter(x=>x.controls_present===true).length;
  const card=(title,value,help)=>'<div class="notice pg10-risk-card"><b>'+title+'</b><strong>'+value+'</strong><small>'+help+'</small></div>';
  const summary='<div class="pg10-risk-lead"><b>¿Qué riesgos presenta el proceso actual?</b>'+
    '<p>Se '+(rows.length===1?'ha registrado ':'han registrado ')+rows.length+' '+(rows.length===1?'riesgo':'riesgos')+'. La clasificación procede de los datos declarados y de las reglas del motor, no de una auditoría externa. AUNEA utiliza el nivel más alto para resumir el proceso; no implica que todos los riesgos tengan igual gravedad.</p></div>'+
    '<div class="grid g3 diagnosis-risk-summary">'+
    card('Gravedad antes de controles',level(risk.inherent_level),
      'Valoración calculada antes de considerar controles. Depende de los factores de riesgo registrados.')+
    card('Gravedad con controles registrados',level(risk.residual_level),
      'Clasificación calculada teniendo en cuenta solo los controles registrados; no prueba su aplicación ni eficacia real.')+
    card('Situación de los controles',risk.status?esc(engineLabel('risk_status',risk.status)):'Sin valoración',
      missing+' sin controles registrados · '+withControls+' con controles registrados'+(unknown?' · '+unknown+' sin información':'')+'.')+
    '</div>'+
    (missing?'<p class="pg10-risk-context">No constan controles para '+missing+' de '+rows.length+
       ' riesgos. Esto no prueba que no existan en la empresa: indica que el diagnóstico no puede acreditar su protección.</p>':'')+
    '<p class="pg10-risk-context">Si el nivel antes y después de controles es crítico, no hay evidencia suficiente para reducir la clasificación. «Crítico» es un nivel de riesgo estimado por reglas, no un incidente ocurrido ni una pérdida monetaria calculada.</p>';
  const reason=r=>{
    const f=[];
    if(r.critical_trigger===true)f.push('Tiene un factor de criticidad declarado');
    if(r.sensitive_or_high_impact===true&&Number(r.impact_1_5)>=4)
      f.push('Afecta a información sensible o de alto impacto ('+esc(String(r.impact_1_5))+'/5)');
    if(!f.length&&Number(r.impact_1_5)>=4)f.push('Impacto declarado elevado ('+esc(String(r.impact_1_5))+'/5)');
    if(r.material_financial_or_compliance===true)f.push('Posible consecuencia financiera o normativa declarada');
    if(r.reversible===false)f.push('Consecuencia declarada difícil de revertir');
    if(r.controls_present===false)f.push('No constan controles que permitan justificar una reducción');
    return f.join(' · ')||'Revisar el fundamento en la fuente confirmada';
  };
  const items=rows.length?'<div class="pg10-risk-explain-list">'+rows.map((r,i)=>
    '<div class="result-item pg10-risk-item"><b>'+(i+1)+'. '+esc(r.description||labelFrom('OS_RISK_CATEGORY',r.category)||'Riesgo')+'</b>'+
    '<p><b>¿Dónde puede ocurrir?</b> '+esc(normalizeArray(r.step_ids).map(id=>diagnosisStepName(record,id)).join(' · ')||'Sin paso enlazado')+'</p>'+
    '<p><b>Probabilidad declarada:</b> '+esc(r.likelihood_1_5??'No consta')+'/5 · <b>Gravedad de la consecuencia:</b> '+esc(r.impact_1_5??'No consta')+'/5</p>'+
    '<p><b>Controles registrados:</b> '+(r.controls_present===true?'Sí':r.controls_present===false?'No constan':'No determinado')+'</p>'+
    '<p class="pg10-risk-explanation"><b>Factores registrados para la valoración:</b> '+reason(r)+'</p>'+
    '</div>').join('')+'</div>':'<p>No hay riesgos registrados para este proceso.</p>';
  return summary+items+
    '<p class="pg10-risk-context"><b>Cómo interpretar el nivel global:</b> los factores consignados para cada riesgo fundamentan su evaluación. El nivel máximo resume el proceso; no se asigna ese nivel automáticamente a todos los riesgos. No se declara eficacia de controles sin evidencia.</p>'+
    '<p class="pg10-risk-context"><b>Qué revisar:</b> comprobar si existen medidas para prevenir o detectar cada riesgo y si hay evidencia de que se aplican. Las propuestas de control se definirán en el diseño TO-BE; no se suponen implantadas.</p>';
  // [AUNEA-FE-PG10-RISK-EXPLANATION-172] END
}
// [AUNEA-FE-PG10-ANALYSIS-UX-166] END
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

// [AUNEA-FE-PG10-WORKSPACE-167] START — One six-section diagnosis for all engine states.
// SOURCE: Simulator CANONICAL PG10–PG15; DEC-034/050/052/055/068/074.
// INPUT: PG09 sealed snapshot, capture validators, ASIS_ONLY/official backend results.
// OUTPUT: context → integrity → diagnosis → evidence-bound conclusions → human review.
// SIDE EFFECTS: none. No new approval state, ranking, calculation or price.
// CHANGE RISK: HIGH. Keep server-owned outputs and existing navigation/actions.
function pg10SynthesisHtml(record,data){
  if(!data||data.status==='INPUT_GAPS')
    return '<div class="notice info">Todavía no existe un análisis de problemas vigente. Ejecuta el análisis AS-IS para obtener conclusiones basadas en los datos confirmados.</div>';
  // Server-owned findings and time contributions are read only. Step proximity is
  // contextual; it is never a proof of cause, a priority score, or a cash saving.
  const pains=Array.isArray(data.pain_results)?data.pain_results:[];
  const detected=pains.filter(p=>p.state==='CONFIRMED'||p.state==='INDICATED');
  const needingEvidence=pains.filter(p=>p.state==='INSUFFICIENT_EVIDENCE').length;
  const pTime=data.process_time_projection||{};
  const extras=Array.isArray(pTime.additional_friction_breakdown)?pTime.additional_friction_breakdown:[];
  const timeSteps=Array.isArray(pTime.step_breakdown)?pTime.step_breakdown:[];
  const chosen=normalizeArray(record?.answers?.DF096).map(String);
  const known=chosen.length>0;
  const yearly=x=>typeof x==='number'&&Number.isFinite(x)?num(x)+' h/año':'Sin cálculo';
  const items=detected.map(p=>{
    const trace=diagnosisTrace(record,p);
    const frictionIds=new Set(trace.frictions.map(f=>String(f.id)));
    const stepIds=new Set(trace.stepIds.map(String));
    const priority=known&&trace.frictions.some(f=>chosen.includes(String(f.id)));
    const steps=trace.stepIds.map(id=>diagnosisStepName(record,id)).filter(Boolean);
    const labels=[...new Set(trace.frictions.map(f=>f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type)).filter(Boolean))];
    const qualities=[...new Set(trace.frictions.map(f=>f.evidence_type
      ?engineLabel('evidence_quality',evidenceTypeBackend(f.evidence_type))
      :'Sin evidencia clasificada'))];
    const signals=[...new Set(trace.frictions.map(f=>f.observable_signal).filter(Boolean))];
    const relatedRisks=[...new Set(trace.risks.map(r=>r.description||labelFrom('OS_RISK_CATEGORY',r.category)).filter(Boolean))];
    const ownedExtra=extras.filter(x=>frictionIds.has(String(x.friction_id))&&x.mode==='ADDITIONAL');
    const relatedWait=timeSteps.filter(x=>stepIds.has(String(x.step_id))&&
      Number.isFinite(x.annual_wait_exposure_hours)&&x.annual_wait_exposure_hours>0);
    const relatedRework=timeSteps.filter(x=>stepIds.has(String(x.step_id))&&
      Number.isFinite(x.annual_rework_hours)&&x.annual_rework_hours>0);
    const measures=[];
    if(ownedExtra.length)measures.push('Trabajo adicional de fricciones enlazadas: '+
      ownedExtra.map(x=>yearly(x.annual_additional_hours)).join(' · ')+'. Ya incluido en el diagnóstico económico; no es un ahorro.');
    if(relatedWait.length)measures.push('Espera en pasos relacionados: '+
      relatedWait.map(x=>diagnosisStepName(record,x.step_id)+' ('+yearly(x.annual_wait_exposure_hours)+')').join(' · ')+
      '. Exposición contextual, no atribuida como causa exclusiva de este hallazgo ni valorada como trabajo.');
    if(relatedRework.length)measures.push('Retrabajo en pasos relacionados: '+
      relatedRework.map(x=>diagnosisStepName(record,x.step_id)+' ('+yearly(x.annual_rework_hours)+')').join(' · ')+
      '. Puede solaparse con otras actividades; no equivale a ahorro.');
    const observation=signals.length?signals.join(' · '):labels.length?labels.join(' · '):
      'Sin descripción de una señal enlazada; revisar el origen.';
    const confidence=p.confidence?engineLabel('confidence',p.confidence):'Sin determinar';
    const state=p.state?engineLabel('pain_state',p.state):'Sin clasificación';
    const need=p.state==='CONFIRMED'
      ?'Comprobar que la evidencia sigue vigente para este proceso.'
      :'Contrastar el mecanismo observado y aportar evidencia suficiente antes de confirmar el hallazgo.';
    const source=trace.stepIds[0]
      ?'<a class="pg10-conclusion-source" href="#asis-source-step-'+attr(String(trace.stepIds[0]))+'">Consultar paso y evidencias de origen</a>'
      :'<span class="pg10-conclusion-source-unavailable">Falta vincular un paso: revisar trazabilidad del AS-IS.</span>';
    return '<li class="pg10-conclusion-item"><b>'+esc(diagnosisPainLabel(p.pain_id))+'</b>'+
      '<span>Estado del motor: '+esc(state)+' · Confianza de la evidencia: '+esc(confidence)+
        (priority?' · Prioridad señalada por el cliente':'')+'</span>'+
      '<small><b>Dónde:</b> '+esc(steps.length?steps.join(' · '):'Sin paso vinculado')+'</small>'+
      '<small><b>Qué consta:</b> '+esc(observation)+'</small>'+
      '<small><b>Calidad de evidencia:</b> '+esc(qualities.join(' · ')||'No registrada')+'</small>'+ 
      (relatedRisks.length?'<small><b>Riesgos en los mismos pasos:</b> '+esc(relatedRisks.join(' · '))+'. Relación contextual, no causal.</small>':'')+
      (measures.length?'<div class="pg10-conclusion-measures"><b>Magnitudes relacionadas</b>'+
        measures.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':
        '<small>Impacto específico no cuantificado en las fuentes relacionadas; no se estima ni se asigna uno nuevo.</small>')+
      '<small><b>Qué comprobar:</b> '+esc(need)+'</small>'+source+'</li>';
  });
  const client=known
    ?'Se han registrado '+chosen.length+' prioridades del cliente. Solo se señalan en los hallazgos vinculados a ellas.'
    :'El cliente no ha señalado prioridades de problemas en el AS-IS. Esto no impide revisar el diagnóstico.';
  return '<div class="pg10-conclusions"><p>'+esc(client)+'</p>'+
    (items.length?'<ul class="pg10-conclusion-list">'+items.join('')+'</ul>':
      '<div class="notice info">No hay hallazgos confirmados o indicados en el análisis actual. Esto no equivale a demostrar que el proceso no tenga problemas.</div>')+
    (needingEvidence?'<p class="field-help">'+(needingEvidence===1?'Hay 1 señal sin evidencia suficiente para considerarla un hallazgo.':'Hay '+needingEvidence+' señales sin evidencia suficiente para considerarlas hallazgos.')+' Consulta el diagnóstico y sus fuentes antes de confirmar estos casos.</p>':'')+
    '<p class="field-help">Estos hallazgos no constituyen un ranking ni una prioridad analítica calculada. Pueden compartir pasos y magnitudes: las cifras mostradas proceden del diagnóstico existente y no deben sumarse entre tarjetas.</p>'+
    '<div class="pg10-conclusion-boundaries"><b>Alcance del diagnóstico actual</b>'+
      '<p>Se describe la situación AS-IS y su evidencia. La proximidad de datos no demuestra una causa raíz ni un incumplimiento; cualquier comparación con objetivos o referencias necesita medidas y periodos compatibles.</p>'+
      '<p>El diseño del TO-BE, la comparación de mejoras y la valoración de alternativas y ahorros corresponden a las fases siguientes.</p></div></div>';
}
function pg10ReviewHtml(e,official,analysis,miss,unresolved,freshness,recommendationReady){
  const available=!!official||analysis?.status==='ANALYZED';
  const msg=miss.length?'Existen '+miss.length+' datos obligatorios pendientes en la captura.':'Sin datos obligatorios pendientes en la captura.';
  const analyzed=available?'El análisis AS-IS está disponible para consultar.':'El AS-IS necesita un análisis vigente para mostrar sus conclusiones.';
  const pending=unresolved.length?'Quedan '+unresolved.length+' decisiones técnicas internas para preparar una recomendación oficial.':'No constan decisiones técnicas internas pendientes.';
  // PG11 preview deliberately remains read-only without an official recommendation;
  // actual TO-BE authoring/approval is gated in tobePage and never bypassed here.
  const main=official
    ?'<button class="btn btn-primary" data-page="tobe">Continuar al diseño TO-BE</button>'
    :recommendationReady
      ?'<button class="btn btn-primary" id="runDiag">Calcular recomendación oficial</button>'
      :'<button class="btn btn-primary" id="checkRecommendationReadiness">Comprobar requisitos para la recomendación</button>';
  const readiness=!official&&!recommendationReady
    ?'<details class="pg10-recommendation-check" id="pg10RecommendationStatus">'+
      '<summary>Estado de los requisitos de recomendación</summary>'+
      '<p>'+(miss.length?'Faltan '+miss.length+' datos obligatorios de captura.':
        'La captura no tiene datos obligatorios pendientes.')+'</p>'+
      '<p>'+(unresolved.length?'Quedan '+unresolved.length+' decisiones técnicas del consultor sin confirmar para el AS-IS vigente.':
        'Las cinco decisiones técnicas están confirmadas.')+'</p>'+
      '<p>Estas decisiones se completan ahora, antes de generar una recomendación oficial, no al finalizar el TO-BE. El sistema propone fundamentos, pero la confirmación corresponde al consultor. Usa «Revisar decisiones técnicas» para abrir el formulario; esta comprobación no ejecuta el cálculo ni modifica el estudio.</p></details>'
    :'';
  const next=official?'':'<button class="btn btn-outline" data-page="tobe">Consultar TO-BE preliminar</button>';
  const audit='<details class="pg10-review-support"><summary>Consultar fuentes y decisiones internas</summary>'+
    '<div class="pg10-review-support-actions">'+
      '<button class="btn btn-outline" id="pg10OpenAsisSources">Consultar fuentes AS-IS</button>'+
      '<button class="btn btn-outline" id="reviewEngineGates">Revisar decisiones técnicas</button>'+
      (official?'<button class="btn btn-outline" id="runDiag">Recalcular resultado oficial</button>':'')+
    '</div></details>';
  return '<div class="pg10-review-summary"><p>'+esc(msg)+' '+esc(analyzed)+'</p>'+
    (freshness?.status==='OBSOLETE'?'<div class="notice warn">Existe un resultado oficial anterior no vigente: recalcula antes de utilizarlo.</div>':'')+
    '<p>'+esc(pending)+' No son errores de captura ni equivalen a hallazgos confirmados; condicionan la recomendación y la edición del TO-BE, no la consulta del diagnóstico.</p>'+
    '<p class="field-help">Para corregir un hallazgo, modifica únicamente su fuente en el AS-IS y vuelve a calcular. No hay una segunda aprobación ni publicación automática de resultados.</p>'+
    (!official?'<p class="field-help">Puedes consultar la siguiente fase de forma preliminar, pero la edición del diseño TO-BE requiere una recomendación oficial vigente.</p>':'')+
    (official?'<details class="pg10-decision-trace"><summary>Consultar decisiones utilizadas por el resultado oficial</summary>'+diagnosisEngineDecisionTraceHtml(e)+'</details>':'')+
    '<div class="pg10-review-actions">'+main+next+'</div>'+readiness+audit+'</div>';
}
function resultsPage(){
  const e=currentEng();
  if(!e) return pageTop('Diagnóstico interno','Confirma Validación y cierre antes de iniciar el análisis.','<button class="btn" data-page="diagnostico">Volver a Sesión 1</button>')+'<div class="empty">AS-IS confirmado requerido.</div>';
  if(!hasConfirmedEngagementSnapshot(e)) return pageTop('Diagnóstico interno','Confirma Validación y cierre antes de iniciar el análisis.','<button class="btn" data-page="diagnostico">Volver a Sesión 1</button>')+
      '<div class="empty"><h2>AS-IS confirmado requerido</h2><p>Trabajo Interno consume el snapshot de PG09.</p></div>';
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  const record=typeof engagementOfRecord==='function'?engagementOfRecord(e):e;
  const steps=(record.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const fr=(record.frictions||[]).filter(x=>x.status!=='SUPERSEDED');
  const risks=(record.risks||[]).filter(x=>x.status!=='SUPERSEDED');
  const econ=(record.economicInputs||[]).filter(x=>x.status!=='SUPERSEDED');
  const official=currentDiagnosticOutput(e);
  const asis=typeof asisAnalysisResult==='function'?asisAnalysisResult(e):null;
  const data=official||asis;
  const freshness=diagnosticOutputFreshness(e);
  const missing=missingRequired(e);
  const unresolved=typeof unresolvedEngineGates==='function'?unresolvedEngineGates(e):[];
  const analyzed=!!official||asis?.status==='ANALYZED';
  const recommendationReady=!!snap&&missing.length===0&&unresolved.length===0;
  const confirmedCount=Array.isArray(data?.pain_results)?data.pain_results.filter(p=>p.state==='CONFIRMED').length:0;
  const heading='<div class="grid g4 diagnosis-readiness pg10-overview-metrics">'+
    '<div class="card metric"><small>AS-IS confirmado</small><strong>v'+esc(snap?.version||'—')+'</strong><span>Fuente del diagnóstico</span></div>'+
    '<div class="card metric"><small>Pasos activos</small><strong>'+steps.length+'</strong><span>'+fr.length+' fricciones · '+risks.length+' riesgos</span></div>'+
    '<div class="card metric"><small>Entradas económicas</small><strong>'+econ.length+'</strong><span>Registros, no ahorro estimado</span></div>'+
    '<div class="card metric"><small>'+(analyzed?'Hallazgos confirmados':'Estado del análisis')+'</small><strong>'+(analyzed?confirmedCount: 'Pendiente')+
      '</strong><span>'+(data?.status==='INPUT_GAPS'?'Revisar fuentes y relaciones':official?'Resultado oficial vigente':analyzed?'AS-IS analizado':'Análisis sin calcular')+'</span></div></div>'+
    '<details class="pg10-stage-nav"><summary>Consultar las etapas del Trabajo Interno</summary>'+workbenchContinuityHtml(e)+'</details>';
  const reference='<div class="grid g3 diagnosis-reference-grid">'+
    '<div class="notice diagnosis-reference-card"><b>Duración end-to-end actual</b><div class="diagnosis-reference-value">'+esc(asisSourceBoundary(record,'DF026'))+'</div><p class="diagnosis-reference-note">Duración declarada; conciliación independiente.</p></div>'+
    '<div class="notice diagnosis-reference-card"><b>SLA del servicio</b><div class="diagnosis-reference-value">'+esc(asisSourceBoundary(record,'DF025'))+'</div><p class="diagnosis-reference-note">Compromiso de servicio, no objetivo de reducción.</p></div>'+
    '<div class="notice diagnosis-reference-card"><b>Objetivos del negocio</b><div class="diagnosis-reference-value">'+esc(normalizeArray(record.answers?.DF086).map(x=>labelFrom('OS_FUTURE_OUTCOME',x)||x).join(' · ')||'No declarados')+'</div><p class="diagnosis-reference-note">Sin tiempo futuro supuesto.</p></div></div>';
  const map=diagnosisReadonlyMap(e,record)+
    '<details class="pg10-critical-points"><summary>Consultar fichas y evidencias de los puntos críticos</summary>'+asisPointCardsHtml(record)+'</details>';
  const coverage=asisCoverageHtml(e,official?{status:'ANALYZED',input_coverage:official.input_coverage}:asis);
  const diagnostic=official
    ?'<div class="notice good">Resultados vinculados al snapshot confirmado. La solución técnica se evalúa en las páginas posteriores.</div>'+
      '<div class="pg10-diagnostic-parts">'+
      '<section><h3>Línea base temporal</h3>'+diagnosisProcessBaselineHtml(official.process_time_projection,record)+'</section>'+
      '<section><h3>Problemas y evidencias</h3>'+diagnosisFindingsHtml(record,official.pain_results||[])+'</section>'+
      '<section><h3>Línea base económica del proceso</h3>'+diagnosisEconomicsHtml(official.economic_result||{},record,official.process_time_projection)+'</section>'+
      '<section><h3>Riesgos y controles</h3>'+diagnosisRisksHtml(official.risk_result||{},record)+'</section></div>'
    :asisBaselineHtml(e);
  return pageTop('Diagnóstico interno','Diagnóstico del proceso confirmado: problemas, causas, impactos y evidencias. Las soluciones se definen en las etapas siguientes.',
    '<button class="btn" data-page="diagnostico">Volver a Sesión 1</button><button class="btn btn-outline" data-page="proceso">Revisar AS-IS</button>')+
    section('1. Resumen del estudio','Snapshot confirmado y navegación por etapas.',heading)+
    section('2. Estado actual y mapa AS-IS','Los tiempos declarados y el mapa permiten localizar el origen de cada problema.',reference+map)+
    section('3. Integridad de datos y gaps','Cobertura, coherencia y evidencias, sin nueva captura de datos.',coverage)+
    section('4. Diagnóstico calculado','Problemas, tiempos, impactos y riesgos a partir de las fuentes confirmadas.',diagnostic)+
    section('5. Conclusiones y prioridades','Hallazgos, evidencia y magnitudes ya calculadas, sin atribuir causas ni inventar un ranking.',pg10SynthesisHtml(record,data))+
    '<div id="pg10-review-section">'+section('6. Revisión y continuación','Revisar el diagnóstico, corregir únicamente en origen y continuar al TO-BE sin una aprobación nueva.',pg10ReviewHtml(e,official,asis,missing,unresolved,freshness,recommendationReady))+'</div>';
}
// [AUNEA-FE-PG10-WORKSPACE-167] END

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
// [AUNEA-FE-PG10-MAP-NAV-160] START — Read-only map nodes open source-bound diagnostic point details.
// SOURCE: Simulator CANONICAL PG10; DEC-050/065. No mutations to the confirmed AS-IS.
function bindDiagnosticMapPointNavigation(){
  if(state.activePage!=='resultados'||typeof document==='undefined')return;
  document.querySelectorAll('.process-graph-readonly [data-graph-node]').forEach(node=>{
    const id=String(node.dataset.graphNode||'');
    const target=document.getElementById('asis-source-step-'+id);
    if(!target)return; // Boundaries and steps without an analysis card are not actionable.
    const heading=target.querySelector('.asis-opportunity-head>b')?.textContent||'paso del proceso';
    const open=()=>{
      document.querySelectorAll('.asis-opportunity-point.is-selected').forEach(x=>x.classList.remove('is-selected'));
      document.querySelectorAll('.asis-opportunity-point .asis-point-review').forEach(x=>{x.open=false;});
      const parent=target.closest?.('.pg10-critical-points');
      if(parent)parent.open=true;
      target.classList.add('is-selected');
      const details=target.querySelector('.asis-point-review');
      if(details)details.open=true;
      target.scrollIntoView?.({block:'start',behavior:'smooth'});
    };
    node.setAttribute('role','button');
    node.setAttribute('tabindex','0');
    node.setAttribute('aria-label','Consultar análisis: '+heading);
    node.setAttribute('title','Consultar las evidencias y relaciones de este paso');
    node.classList.add('diagnosis-map-selectable');
    node.addEventListener('click',open);
    node.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}
    });
  });
  // A shared friction can name a different time owner. Following that link opens
  // the existing owner's diagnostic card, never an editor or a second data record.
  document.querySelectorAll('.asis-point-review a[href^="#asis-source-step-"], .diagnosis-finding a[href^="#asis-source-step-"], .pg10-conclusion-source[href^="#asis-source-step-"], .pg10-time-source[href^="#asis-source-step-"]').forEach(link=>{
    link.addEventListener('click',event=>{
      const href=link.getAttribute('href')||'';
      const dest=document.getElementById(href.slice(1));
      if(!dest)return;
      event.preventDefault();
      document.querySelectorAll('.asis-opportunity-point.is-selected').forEach(x=>x.classList.remove('is-selected'));
      document.querySelectorAll('.asis-opportunity-point .asis-point-review').forEach(x=>{x.open=false;});
      const parent=dest.closest?.('.pg10-critical-points');
      if(parent)parent.open=true;
      dest.classList.add('is-selected');
      const detail=dest.querySelector('.asis-point-review');
      if(detail)detail.open=true;
      dest.scrollIntoView?.({block:'start',behavior:'smooth'});
    });
  });
  // Manual expansion uses the same one-step-at-a-time rule; source details remain read-only.
  document.querySelectorAll('.asis-opportunity-point .asis-point-review').forEach(details=>{
    details.addEventListener('toggle',()=>{
      if(!details.open)return;
      document.querySelectorAll('.asis-opportunity-point .asis-point-review').forEach(other=>{
        if(other!==details)other.open=false;
      });
    });
  });
}
// [AUNEA-FE-PG10-MAP-NAV-160] END

function registerInternalWorkPages(){if(typeof pages==='undefined'||registerInternalWorkPages.done)return;registerInternalWorkPages.done=true;pages.revision=outputReviewPage;pages.tobe=tobePage;pages.comparacion=tobeComparisonPage;const originalPostBind=postBind;postBind=function(){originalPostBind();const e=currentEng(),by=id=>document.getElementById(id);if(by('createOutputReview'))by('createOutputReview').onclick=()=>{createOutputReview(e);render()};if(by('advanceOutputReview'))by('advanceOutputReview').onclick=()=>{advanceOutputReview(e,!!by('authorizeResultsPrice')?.checked);render()};if(by('analyzeAsisOnly'))by('analyzeAsisOnly').onclick=()=>runAsisAnalysis(e);
  bindDiagnosticMapPointNavigation();
  document.querySelectorAll('[data-draft-conditional-scenario]').forEach(x=>x.onclick=()=>createScenario(Number(x.dataset.draftConditionalScenario)));if(by('createTobeDraft'))by('createTobeDraft').onclick=()=>{createTobeDraft(e);render()};if(by('saveTobe'))by('saveTobe').onclick=()=>{saveTobeFromDom(e);render()};if(by('advanceTobe'))by('advanceTobe').onclick=()=>{saveTobeFromDom(e);if(advanceTobeStatus(e))render()}}}
function outputReviewPage(){
  const e=currentEng(),r=currentOutputReview(e),sources=reviewSources(e);
  if(!sources)return pageTop('Revisión humana','Confirma el AS-IS, calcula el diagnóstico y aprueba el TO-BE de esa versión antes de revisar resultados.');
  const labels={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'};
  const actions=!r?'<button class="btn btn-primary" id="createOutputReview">Crear revisión</button>':r.status==='DRAFT'?'<button class="btn btn-primary" id="advanceOutputReview">Marcar como revisado</button>':r.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceOutputReview">Aprobar resultados para cliente</button>':'<button class="btn" data-page="modoresultados">Presentar resultados</button>';
  return pageTop('Revisión humana',r?`Versión ${r.version} · ${labels[r.status]}`:'Revisión pendiente',actions)+section('Fuentes de la devolución',`AS-IS v${sources.snapshotVersion} · TO-BE v${sources.tobeVersion}. Cambiar las fuentes exige una nueva revisión.`,scenarioBody(sources.scenario))+section('Contenido que se aprueba','Revisa hallazgos, riesgos, impacto, recomendación y escenario antes de autorizar su presentación.',`<button class="btn" data-page="resultados">Revisar diagnóstico</button><button class="btn" data-page="comparacion">Revisar comparación</button><button class="btn" data-page="escenarios">Revisar escenarios</button>${r?.status==='REVIEWED'?'<label><input type="checkbox" id="authorizeResultsPrice"> Autorizar mostrar el precio canónico de este escenario</label>':''}`);
}
// [AUNEA-FE-RESULTS-VIEW-010] END
