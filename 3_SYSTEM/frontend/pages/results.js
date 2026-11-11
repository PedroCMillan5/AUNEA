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
  const ready=!!official||recommendationReady;
  // One primary action, defined by gate state. No new validation rules or side effects:
  // the existing reviewEngineGates, runDiag and data-page=tobe handlers retain ownership.
  const main=official
    ?'<button class="btn btn-primary" data-page="tobe">Continuar al diseño TO-BE</button>'
    :recommendationReady
      ?'<button class="btn btn-primary" id="runDiag">Calcular recomendación oficial</button>'
      :miss.length
        ?'<button class="btn btn-primary" id="pg10OpenAsisSources">Revisar los datos obligatorios del AS-IS</button>'
        :'<button class="btn btn-primary" id="reviewEngineGates">Revisar las cinco decisiones técnicas</button>';
  const next=official?'':'<button class="btn btn-outline" data-page="tobe">Consultar TO-BE preliminar</button>';
  const readiness=!official&&!recommendationReady
    ?'<details class="pg10-recommendation-check" id="pg10RecommendationStatus">'+
      '<summary>Ver condiciones para generar la recomendación</summary>'+
      '<p>'+(miss.length?'Faltan '+miss.length+' datos obligatorios de captura.':
        'La captura no tiene datos obligatorios pendientes.')+'</p>'+
      '<p>'+(unresolved.length?'Quedan '+unresolved.length+' decisiones técnicas del consultor sin confirmar para el AS-IS vigente.':
        'Las cinco decisiones técnicas están confirmadas.')+'</p>'+
      '<p>Las cinco decisiones son del consultor, no preguntas pendientes del cliente. AUNEA recupera los fundamentos disponibles y señala lo que falta verificar. Debes confirmar cada respuesta; una propuesta no se aprueba automáticamente.</p>'+
      '<p>Primero revisa y confirma las decisiones técnicas. Después se calculará la recomendación oficial, si se cumplen sus condiciones. Esta consulta no modifica el estudio.</p></details>'
    :'';
  const audit='<details class="pg10-review-support"><summary>Consultar fuentes y opciones de revisión</summary>'+
    '<div class="pg10-review-support-actions">'+
      (!official&&!recommendationReady&&miss.length?'':'<button class="btn btn-outline" id="pg10OpenAsisSources">Consultar fuentes AS-IS</button>')+
      (ready||miss.length?'<button class="btn btn-outline" id="reviewEngineGates">Revisar decisiones técnicas</button>':'')+
      (official?'<button class="btn btn-outline" id="runDiag">Recalcular resultado oficial</button>':'')+
    '</div></details>';
  return '<div class="pg10-review-summary"><p>'+esc(msg)+' '+esc(analyzed)+'</p>'+
    (freshness?.status==='OBSOLETE'?'<div class="notice warn">Existe un resultado oficial anterior no vigente: recalcula antes de utilizarlo.</div>':'')+
    '<p>'+esc(pending)+' No son errores de captura ni equivalen a hallazgos confirmados; condicionan la recomendación y la edición del TO-BE, no la consulta del diagnóstico.</p>'+
    '<p class="field-help">Para corregir un hallazgo, modifica únicamente su fuente en el AS-IS y vuelve a calcular. No hay una segunda aprobación ni publicación automática de resultados.</p>'+
    (!official?'<p class="field-help">La vista TO-BE preliminar solo permite explorar problemas y posibles vías de intervención. No crea ni aprueba el proceso futuro, y no calcula ahorros.</p>':'')+
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
function createTobeDraft(e){const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;if(!e||!snap)return null;const h=tobeHistory(e),p={version:h.length+1,status:'DRAFT',sourceSnapshotVersion:snap.version,createdAt:now(),updatedAt:now(),items:tobeSourceSteps(e).map((s,i)=>({id:`TOBE-${h.length+1}-${i+1}`,sourceStepId:s.id||'',sourceStepName:s.name||s.step_name||`Paso ${i+1}`,transformation:'',problemResolved:'',futureActor:labelFrom('OS_ACTOR_ROLE',s.actor)||'',tool:labelFrom('OS_TOOL_CATEGORY',s.tool)||'',inputs:Array.isArray(s.inputs)?[...s.inputs]:(s.inputs||[]),outputs:Array.isArray(s.outputs)?[...s.outputs]:(s.outputs||[]),
  _details:{inputs:String(s._details?.inputs||''),outputs:String(s._details?.outputs||'')},automationAi:'',humanSupervision:'',controlsRisk:'',futureTime:'',futureTimeAssumption:''}))};p.flow=tobeFlowOwner(e,p);h.push(p);markDirty(`TO-BE v${p.version} creado como DRAFT desde snapshot confirmado v${snap.version}`);return p}
function nextTobeStatus(p){const i=TOBE_PUBLICATION_STATES.indexOf(p?.status);return i>=0&&i<TOBE_PUBLICATION_STATES.length-1?TOBE_PUBLICATION_STATES[i+1]:null}
// [AUNEA-FE-PG11-REVIEW-GATE-199] START — only canonical source/field readiness, not engine approval.
// SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
// INPUTS: versioned TO-BE DRAFT and confirmed AS-IS; OUTPUT: missing-field reason.
// SIDE_EFFECTS: none. Does not score AI quality or approve for client.
function tobeReviewReadiness(e,p){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap||p?.sourceSnapshotVersion!==snap.version)
    return 'El TO-BE no corresponde al AS-IS confirmado vigente. Revisa el origen antes de continuar.';
  const originals=tobeSourceSteps(e);
  if(!Array.isArray(p?.items)||p.items.length!==originals.length||
      new Set(p.items.map(x=>String(x.sourceStepId))).size!==p.items.length||
      p.items.some(x=>!originals.some(y=>String(y.id)===String(x.sourceStepId))))
    return 'Los pasos del TO-BE no coinciden con el AS-IS confirmado; no se puede enviar a revisión.';
  for(const item of p.items){
    const name=item.sourceStepName||item.sourceStepId||'actividad sin identificar';
    if(!TOBE_TRANSFORMATIONS.includes(item.transformation))
      return 'Selecciona una transformación válida para '+name+'.';
    if(item.transformation!=='Se elimina'&&!String(item.futureActor||'').trim())
      return 'Indica el responsable futuro de '+name+' antes de enviar a revisión.';
    if(!tobeMeaningfulRationale(item.problemResolved))
      return 'Completa «'+tobeTransformationRationaleLabel(item.transformation)+
        '» en '+name+' con una justificación concreta; «NO» no es suficiente.';
    if(String(item.futureTime||'').trim()&&!String(item.futureTimeAssumption||'').trim())
      return 'El tiempo futuro de '+name+' requiere un supuesto trazable.';
    if(item.transformation!=='Se elimina'&&['inputs','outputs'].some(k=>
      selectedOtherMissingDetail(fieldOptions('OS_ARTIFACT_TYPE'),
        tobeArtifactValues(item[k]).resolved,item._details?.[k])))
      return 'Completa la descripción de «Otro» en las entradas o salidas de '+name+'.';
  }
  // [AUNEA-FE-PG11-HUMAN-GATE-225] START — a rules-only check is never
  // equivalent to acceptance. A source-linked consultant must decide each
  // AI suggestion AND complete the operational design before REVIEWED.
  const proposed=p?.aiDraft?.proposal||p?.aiDraft?.checkpoint;
  if(proposed){
    const human=typeof tobeHumanReviewRecord==='function'?tobeHumanReviewRecord(e,p):null;
    if(!human)return 'Falta la revisión humana de las propuestas IA de esta versión TO-BE.';
    const meaningful=v=>!!String(v||'').trim()&&
      !/^(?:no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(String(v).trim());
    for(const item of p.items){
      const sid=String(item.sourceStepId),name=item.sourceStepName||sid;
      const decision=human.decisions?.[sid];
      if(!decision||!['ACCEPT','MODIFY','DISCARD'].includes(decision.status)||
         String(decision.note||'').trim().length<20)
        return 'Falta aceptar, modificar o descartar con justificación la propuesta de '+name+'.';
      if(!tobeMeaningfulRationale(item.problemResolved))
        return 'Completa la justificación del diseño futuro de '+name+' (no basta «NO»).';
      if(!['Se mantiene','Se elimina'].includes(item.transformation)&&
         (['tool','controlsRisk'].some(k=>!meaningful(item[k]))||
          ['inputs','outputs'].some(k=>!tobeArtifactValues(item[k]).resolved.length)))
        return 'Completa herramienta, datos y controles del diseño futuro de '+name+'.';
      if(['Se automatiza','Se asiste con IA'].includes(item.transformation)&&
         (!meaningful(item.automationAi)||!meaningful(item.humanSupervision)))
        return 'Describe automatización y supervisión humana de '+name+' antes de revisar.';
      const suggested=(Array.isArray(proposed.items)?proposed.items:[]).find(x=>
        String(x.source_step_id)===sid);
      if(decision.status==='ACCEPT'&&suggested?.transformation&&
         item.transformation!==suggested.transformation)
        return 'La propuesta IA de '+name+' indica «'+suggested.transformation+
          '», pero el diseño está en «'+item.transformation+
          '». Para cambiarla, selecciona «Modificar antes de usar» y justifica.';
      const originalIssues=(p.aiDraft?.proposal?.review?.issues||[]).filter(x=>
        String(x.step_id)===sid&&x.category==='BLOCKING');
      if(originalIssues.length&&decision.status==='ACCEPT'&&item.transformation==='Se mantiene')
        return 'La recomendación de '+name+' contiene bloqueos; no puede aceptarse sin rediseñar su transformación.';
    }
  }
  for(const added of tobeAddedSteps(p)){
    if(!TOBE_TRANSFORMATIONS.includes(added.transformation)||
       ['Se mantiene','Se elimina'].includes(added.transformation))
      return 'Selecciona una transformación aplicable a la actividad nueva '+tobeFlowItemName(added)+'.';
    if(!String(added.stepName||'').trim()||
       !String(added.futureActor||'').trim()||
       !tobeMeaningfulRationale(added.problemResolved))
      return 'Completa nombre, responsable y motivo de la actividad nueva '+tobeFlowItemName(added)+'.';
  }
  // [AUNEA-FE-PG11-HUMAN-GATE-225] END
  const flowIssue=tobeFlowIntegrity(e,p);
  if(flowIssue)return flowIssue;
  // Semantic design constraints complement source and route readiness.
  const blocking=typeof tobeCoherenceFindings==='function'?
    tobeCoherenceFindings(e,p).find(x=>x.severity==='BLOCKING'):null;
  if(blocking)return 'Coherencia de '+blocking.name+': '+blocking.message;
  return null;
}
function advanceTobeStatus(e){
  const p=latestTobe(e),next=nextTobeStatus(p);
  if(!p||!next||next==='PUBLISHED')return false;
  if(p.sourceSnapshotVersion!==confirmedSnapshot(e)?.version){
    toast('El origen AS-IS cambió; no se puede aprobar esta versión TO-BE.');
    return false;
  }
  if(typeof currentDiagnosticOutput==='function'&&!currentDiagnosticOutput(e)){
    toast('El diagnóstico ya no está vigente. Revisa PG10 antes de aprobar TO-BE.');
    return false;
  }
  if(p.status==='DRAFT'){
    const issue=tobeReviewReadiness(e,p);
    if(issue){toast(issue);return false}
  }
  p.status=next;
  p.updatedAt=now();
  markDirty(`TO-BE v${p.version}: ${next}`);
  return true;
}
// [AUNEA-FE-PG11-REVIEW-GATE-199] END
function saveTobeFromDom(e){
  const p=latestTobe(e);if(!tobeEditable(p))return false;
  const beforeFields=p.aiDraft?.proposal?JSON.parse(JSON.stringify(p.items)):null;
  document.querySelectorAll('[data-tobe-item]').forEach(el=>{
    const item=[...p.items,...tobeAddedSteps(p)].find(x=>x.id===el.dataset.tobeItem);
    if(item)item[el.dataset.tobeField]=el.value;
  });
  document.querySelectorAll('[data-tobe-catalog-item]').forEach(box=>{
    const item=[...p.items,...tobeAddedSteps(p)].find(x=>String(x.id)===box.dataset.tobeCatalogItem);
    const field=box.dataset.tobeCatalogField,select=box.querySelector('[data-model-set]');
    if(item&&select&&['futureActor','tool'].includes(field)){
      const next=String(resolveCatalogInput(select)||''),
        previous=String(item[field]||''),
        setId=field==='futureActor'?'OS_ACTOR_ROLE':'OS_TOOL_CATEGORY',
        option=fieldOptions(setId).find(o=>String(o.value)===previous||
          String(o.label||'').trim().toLowerCase()===previous.trim().toLowerCase());
      // A read-only navigation must not rewrite a client/consultant value from
      // its Spanish label to an internal code merely because the picker rendered.
      // A real change to another option is still recorded using its canonical ID.
      if(next!==previous&&(!option||String(option.value)!==next))item[field]=next;
    }
  });
  document.querySelectorAll('[data-tobe-multi-item]').forEach(box=>{
    if(box.dataset.tobeMultiReadonly==='1')return;
    const item=[...p.items,...tobeAddedSteps(p)].find(x=>String(x.id)===box.dataset.tobeMultiItem);
    if(!item)return;
    const key=box.dataset.tobeMultiKey,id=box.dataset.tobeMultiId;
    if(key!=='inputs'&&key!=='outputs')return;
    const chosen=[...box.querySelectorAll('[data-v1-multi]')].filter(x=>x.checked).map(x=>String(x.value));
    const current=tobeArtifactValues(item[key]);
    const removeLegacy=box.querySelector('[data-tobe-drop-legacy]')?.checked;
    item[key]=removeLegacy?chosen:[...chosen,...current.unknown];
    const other=typeof catalogOtherOption==='function'?
      catalogOtherOption(fieldOptions('OS_ARTIFACT_TYPE')):null;
    const detail=box.querySelector('[id="'+id+'_detail"]');
    if(!item._details||typeof item._details!=='object')item._details={};
    item._details[key]=detail?.value||'';
    if(other&&item._details[key]&&!item[key].includes(String(other.value)))
      item[key].push(String(other.value));
  });
  const start=document.querySelector('[data-tobe-flow-start]');
  const routes=[...document.querySelectorAll('[data-tobe-route-step]')];
  const decisionFields=[...document.querySelectorAll('[data-tobe-decision-criterion]')];
  if(start||routes.length||decisionFields.length){
    const flow=tobeMutableFlow(e,p);
    if(start)flow.startStepId=String(start.value);
    for(const el of routes){
      const id=String(el.dataset.tobeRouteStep),field=el.dataset.tobeRoute;
      if(field!=='normal'&&field!=='exception')continue;
      if(!flow.routes[id])flow.routes[id]={normal:'__PENDING__',exception:''};
      flow.routes[id][field]=String(el.value);
    }
    for(const el of decisionFields){
      const id=String(el.dataset.tobeDecisionCriterion||'');
      if(!id||!tobeFlowItem(e,p,id))continue;
      const value=String(el.value||'').trim();
      if(value)flow.decisionCriteria[id]=value;
      else delete flow.decisionCriteria[id]; // empty means inherit AS-IS (or unconfigured for new steps)
    }
  }
  if(typeof persistTobeAiDraft==='function'&&!persistTobeAiDraft(e))return false;
  // [AUNEA-FE-PG11-EDIT-AUDIT-298] START
  // PURPOSE: Audit actual consultant changes from the sole canonical controls.
  // SOURCE: DEC-050/052/055; PG11 field decisions. INPUTS: before/after DRAFT fields.
  // OUTPUTS: version-owned EDIT history. SIDE_EFFECTS: pending draft metadata only.
  // CHANGE_RISK: HIGH. Persistence remains the caller's existing saveState gate.
  if(beforeFields){
    for(const item of p.items){
      const before=beforeFields.find(x=>x.id===item.id);
      if(!before)continue;
      const fields=TOBE_AI_REVIEW_FIELDS.map(x=>x[1]).filter(key=>
        JSON.stringify(before[key])!==JSON.stringify(item[key]));
      if(!fields.length)continue;
      p.aiDraft.applyHistory=[...(p.aiDraft.applyHistory||[]),{
        sourceStepId:String(item.sourceStepId),fields,action:'EDIT',decision:'MANUAL_EDIT',
        proposalFingerprint:tobeCandidateFingerprint(p),
        previousValues:Object.fromEntries(fields.map(key=>[key,before[key]??null])),
        appliedValues:Object.fromEntries(fields.map(key=>[key,JSON.parse(JSON.stringify(item[key]??null))])),
        appliedAt:now()
      }].slice(-100);
    }
  }
  // [AUNEA-FE-PG11-EDIT-AUDIT-298] END
  p.updatedAt=now();markDirty('TO-BE v'+p.version+' actualizado');
  return true;
}
// [AUNEA-FE-PG11-CANONICAL-CONTROLS-251] START
// Reuse AS-IS process editor selections and catalogs; legacy drafts may contain
// CSV labels/codes. Never replace an unrecognized legacy value silently.
function tobeArtifactValues(value){
  const opts=typeof fieldOptions==='function'?fieldOptions('OS_ARTIFACT_TYPE'):[];
  const candidates=Array.isArray(value)?value:String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const resolved=[],unknown=[];
  for(const raw of candidates){
    const v=String(raw).trim(),option=opts.find(x=>
      String(x.value)===v||String(x.label||'').trim().toLowerCase()===v.toLowerCase());
    if(option){if(!resolved.includes(String(option.value)))resolved.push(String(option.value));}
    else if(v)unknown.push(v);
  }
  return {resolved,unknown};
}
function tobeArtifactDisplay(value,otherDetail=''){
  const v=tobeArtifactValues(value),other=catalogOtherOption(fieldOptions('OS_ARTIFACT_TYPE'));
  const labels=v.resolved.map(x=>x===String(other?.value)&&String(otherDetail||'').trim()?
    (labelFrom('OS_ARTIFACT_TYPE',x)||'Otro')+': '+String(otherDetail).trim():
    labelFrom('OS_ARTIFACT_TYPE',x)||x);
  return [...labels,...v.unknown].join(' · ')||'No documentado';
}
function tobeCatalogField(item,key,label,setId,disabled=false){
  const raw=String(item[key]||''),opts=fieldOptions(setId),
    match=opts.find(o=>String(o.value)===raw||
      String(o.label||'').trim().toLowerCase()===raw.trim().toLowerCase());
  const selected=match?String(match.value):raw;
  const id='tobe_catalog_'+key+'_'+String(item.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const control=disabled?'<input disabled value="'+attr(match?.label||raw)+'">':
    datalistControl(id,setId,selected,'Selecciona una opción del catálogo vigente');
  return '<div class="field" data-tobe-catalog-item="'+attr(item.id)+
    '" data-tobe-catalog-field="'+attr(key)+'"><label>'+esc(label)+'</label>'+
    control+'</div>';
}
function tobeArtifactField(item,key,label,disabled=false){
  const opts=typeof fieldOptions==='function'?fieldOptions('OS_ARTIFACT_TYPE'):[];
  const {resolved,unknown}=tobeArtifactValues(item[key]);
  const htmlId='tobe_artifact_'+key+'_'+String(item.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const details=String(item._details?.[key]||'');
  const other=catalogOtherOption(opts);
  const current=details&&other&&!resolved.includes(String(other.value))?
    [...resolved,String(other.value)]:resolved;
  const controls=typeof selectedHtml==='function'?
    selectedHtml(htmlId,opts,current,{wrapped:true,detailId:htmlId+'_detail',
      detailValue:details,detailPlaceholder:'Especifica '+(key==='inputs'?'el dato de entrada':'el resultado')+' al seleccionar Otro'}):
    '<p class="notice warn">No se ha cargado el componente canónico de multiselección.</p>';
  const chips=current.map(value=>{
    const option=opts.find(x=>String(x.value)===String(value));
    return '<span class="tobe-selected-data-chip">'+esc(option?.label||value)+'</span>';
  }).join('');
  const compact='<details class="tobe-artifact-compact"><summary aria-label="Editar '+esc(label)+'">'+
    '<span class="tobe-artifact-chips">'+(chips||'<span class="tobe-muted">Selecciona formatos</span>')+
    '</span><span class="tobe-artifact-chevron" aria-hidden="true">⌄</span></summary>'+
    '<div class="tobe-artifact-options">'+controls+'</div></details>';
  return '<div class="field full tobe-artifact-field" data-tobe-multi-item="'+attr(item.id)+
    '" data-tobe-multi-key="'+attr(key)+'" data-tobe-multi-id="'+attr(htmlId)+'"'+
    (disabled?' data-tobe-multi-readonly="1"':'')+'><label>'+esc(label)+'</label>'+
    (disabled?'<fieldset disabled class="tobe-readonly-options">'+compact+'</fieldset>':compact)+
    (unknown.length?'<p class="notice warn">Valor anterior no reconocido por el catálogo vigente: '+
      esc(unknown.join(' · '))+'. Se conserva hasta que indiques expresamente que quieres retirarlo.</p>'+
      (disabled?'':'<label class="field-help"><input type="checkbox" data-tobe-drop-legacy="1"> Eliminar estos valores antiguos no reconocidos al guardar</label>'):'')+
    '</div>';
}
// [AUNEA-FE-PG11-CANONICAL-CONTROLS-251] END
// [AUNEA-FE-PG11-FIELD-GUIDANCE-246] START — field help never persists as data.
const TOBE_FIELD_HELP={
 stepName:'Nombra la actividad futura con una acción y un resultado claros.',
 problemResolved:'Explica qué problema diagnosticado resuelve esta decisión, por qué y con qué evidencia.',
 futureActor:'Indica el rol responsable en el proceso futuro; no inventes nombres ni responsables.',
 tool:'Indica la herramienta o sistema sólo si existe decisión o evidencia que lo respalde.',
 inputs:'Describe qué datos o documentos entran en este paso y de dónde proceden.',
 outputs:'Describe qué resultado, documento o registro produce este paso y su destinatario.',
 automationAi:'Distingue qué se automatiza con reglas y qué requiere IA, si corresponde.',
 humanSupervision:'Indica quién valida, autoriza o atiende excepciones y en qué momento.',
 controlsRisk:'Describe los riesgos aplicables, controles previstos y pruebas de cumplimiento.',
 futureTime:'Introduce un tiempo futuro con unidad únicamente si está sustentado por un supuesto.',
 futureTimeAssumption:'Explica la fuente, condiciones y límites del tiempo futuro propuesto.'
};
// [AUNEA-FE-PG11-TRANSFORMATION-UX-258] START
// Same persisted field in every state; only its visible label, guidance and
// validation vary. Switching transformation must never clear a draft value.
function tobeTransformationRationaleLabel(transformation){
  switch(String(transformation||'')){
    case 'Se mantiene':return 'Motivo para conservar la actividad';
    case 'Se elimina':return 'Motivo para retirar la actividad del TO-BE';
    case 'Se modifica':return 'Motivo de la modificación y problema que resuelve';
    case 'Se automatiza':return 'Problema que resuelve la automatización';
    case 'Se asiste con IA':return 'Problema que resuelve la asistencia con IA';
    case 'Requiere decisión humana':return 'Motivo de la decisión humana';
    case 'Se incorpora control':return 'Riesgo o problema que resuelve el control';
    default:return 'Motivo del diseño futuro';
  }
}
function tobeMeaningfulRationale(value){
  return !!String(value??'').trim()&&
    !/^(?:no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(String(value).trim());
}
// [AUNEA-FE-PG11-TRANSFORMATION-UX-258] END
function tobeFieldHelp(key,item){
 if(key==='problemResolved'&&item?.transformation==='Se mantiene')
   return 'Explica por qué debe mantenerse la actividad sin rediseño, con qué evidencia y cómo se controlan sus hallazgos.';
 if(key==='problemResolved'&&item?.transformation==='Se elimina')
   return 'Justifica por qué se elimina la actividad y cómo se mantienen sus controles, datos y obligaciones.';
 if(key==='problemResolved'&&item?.transformation==='Se modifica')
   return 'Describe qué cambia respecto al AS-IS, qué problema documentado atiende y cuál es la justificación.';
 if(key==='problemResolved'&&item?.transformation==='Se automatiza')
   return 'Indica qué tarea manual se automatizaría, la necesidad diagnosticada y la evidencia disponible.';
 if(key==='problemResolved'&&item?.transformation==='Se asiste con IA')
   return 'Indica qué tarea necesita asistencia de IA y qué problema documentado atiende.';
 if(key==='problemResolved'&&item?.transformation==='Requiere decisión humana')
   return 'Explica por qué se necesita una decisión humana y qué riesgo o excepción debe atender.';
 if(key==='problemResolved'&&item?.transformation==='Se incorpora control')
   return 'Indica el riesgo detectado y el control que se propone incorporar.';
 return TOBE_FIELD_HELP[key]||'Describe la información solicitada y su justificación.';
}
function tobeField(item,key,label,value,type='text',disabled=false){
 const help=tobeFieldHelp(key,item),raw=String(value??'');
 const suspect=/^(no|n\/a|ninguno)$/i.test(raw.trim())&&['problemResolved','automationAi','humanSupervision','controlsRisk'].includes(key);
 const warning=suspect?'<p class="field-help">Valor heredado sin explicación («'+esc(raw)+'»). Revísalo: no equivale a una justificación.</p>':'';
 const shown=raw; // Never silently discard legacy consultant/AI text while editing.
 return '<div class="field"'+(key==='problemResolved'?' data-tobe-rationale-wrapper="1"':'')+
   '><label'+(key==='problemResolved'?' data-tobe-rationale-label="1"':'')+'>'+esc(label)+'</label>'+
 (type==='textarea'?'<textarea data-tobe-item="'+attr(item.id)+'" data-tobe-field="'+attr(key)+'" placeholder="'+attr(help)+'" '+(disabled?'disabled':'')+'>'+esc(shown)+'</textarea>':
 '<input data-tobe-item="'+attr(item.id)+'" data-tobe-field="'+attr(key)+'" value="'+attr(shown)+'" placeholder="'+attr(help)+'" '+(disabled?'disabled':'')+'>')+
 warning+'</div>';
}
// [AUNEA-FE-PG11-FIELD-GUIDANCE-246] END
// [AUNEA-FE-PG11-WORKSPACE-205] START — single versioned TO-BE canvas and contextual inspector.
// SOURCE: Simulator CANONICAL v1.14 PG11; DEC-050/052/055; PG04 graph source.
// INPUTS: confirmed AS-IS snapshot, official diagnostic, TO-BE DRAFT and bounded AI suggestions.
// OUTPUTS: read-only source graph projection, human-editable TO-BE inspector; no new data owner.
let __auneaTobeSelection={engagementId:'',version:0,stepId:''};
let __auneaTobeMode='guided'; // UI-only display preference; not a business data field.
function tobeSelectedItem(e,p){
  if(!p?.items?.length)return null;
  if(__auneaTobeSelection.engagementId!==e.id||__auneaTobeSelection.version!==p.version){
    __auneaTobeSelection={engagementId:e.id,version:p.version,stepId:String(p.items[0].sourceStepId)};
  }
  const selected=tobeFlowItem(e,p,__auneaTobeSelection.stepId);
  if(!selected)__auneaTobeSelection.stepId=tobeFlowItemId(p.items[0]);
  return selected||p.items[0];
}
// [AUNEA-FE-PG11-ORIGINAL-FACTS-243] START — source-only ProcessStep facts
// alongside the future proposal, without a second edit owner or invented measurement.
// SOURCE: Simulator CANONICAL PG11; DEC-050; confirmed snapshot for this TO-BE version.
function tobeOriginalStepFacts(e,item){
  const p=latestTobe(e),
    source=tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item?.sourceStepId));
  if(!source)return '<p class="notice warn">El paso de origen no está disponible en el AS-IS confirmado de esta versión.</p>';
  const label=(table,v)=>{
    if(v===null||v===undefined||v==='')return '';
    const named=typeof labelFrom==='function'?labelFrom(table,v):'';
    return named||String(v);
  };
  const data=v=>Array.isArray(v)?v.filter(x=>x!==null&&x!==undefined&&x!=='').map(String).join(' · '):
    (v===null||v===undefined?'':String(v));
  const fields=[
    ['Responsable original',label('OS_ACTOR_ROLE',source.actor)],
    ['Tipo de actividad',label('OS_STEP_TYPE',source.step_type)],
    ['Herramienta original',label('OS_TOOL_CATEGORY',source.tool)],
    ['Entradas AS-IS',Array.isArray(source.inputs)?source.inputs.map(x=>label('OS_ARTIFACT_TYPE',x)).join(' · '):data(source.inputs)],
    ['Salidas AS-IS',Array.isArray(source.outputs)?source.outputs.map(x=>label('OS_ARTIFACT_TYPE',x)).join(' · '):data(source.outputs)],
    ['Trabajo activo declarado',source.active_time===null||source.active_time===undefined||source.active_time===''?'':String(source.active_time)+' min'],
    ['Espera declarada',source.wait_time===null||source.wait_time===undefined||source.wait_time===''?'':String(source.wait_time)+' min'],
    ['Retrabajo declarado',source.rework_time===null||source.rework_time===undefined||source.rework_time===''?'':String(source.rework_time)+' min']
  ];
  return '<div class="tobe-original-facts"><dl>'+fields.map(([name,val])=>
    '<div><dt>'+esc(name)+'</dt><dd>'+esc(val||'No registrado')+'</dd></div>').join('')+
    '</dl><p class="tobe-muted">Sólo lectura: valores capturados del AS-IS confirmado. No son ahorros ni tiempos futuros.</p></div>';
}
// [AUNEA-FE-PG11-ORIGINAL-FACTS-243] END
function tobeSnapshotIssueCards(e,item){
  const snap=tobeProposalSnapshot(e,latestTobe(e)),id=String(item.sourceStepId),fr=(snap?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'&&
    (Array.isArray(x.affected_steps)?x.affected_steps:[]).map(String).includes(id));
  const risks=(snap?.risks||[]).filter(x=>x.status!=='SUPERSEDED'&&
    (Array.isArray(x.step_ids)?x.step_ids:[]).map(String).includes(id));
  const frHtml=fr.map(x=>'<li><b>Fricción:</b> '+esc(x.client_label||labelFrom('OS_FRICTION_TYPE',x.friction_type)||'Sin etiqueta')+
    (x.observable_signal?' · '+esc(x.observable_signal):'')+'</li>').join('');
  const riskHtml=risks.map(x=>'<li><b>Riesgo:</b> '+esc(x.description||x.category||'Sin descripción')+'</li>').join('');
  return frHtml||riskHtml?'<ul class="tobe-source-list">'+frHtml+riskHtml+'</ul>':
    '<p class="tobe-muted">No hay fricciones o riesgos vinculados directamente a este paso en el snapshot. Consulta el diagnóstico global antes de justificar una transformación.</p>';
}
// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] START — display-only comparison.
const TOBE_AI_REVIEW_FIELDS=[
 ['transformation','transformation','Qué cambia','transformation'],
 ['problem_resolved','problemResolved','Motivo del diseño futuro','text'],
 ['future_actor','futureActor','Responsable futuro','OS_ACTOR_ROLE'],
 ['tool','tool','Herramienta / arquitectura','OS_TOOL_CATEGORY'],
 ['inputs','inputs','Datos de entrada','OS_ARTIFACT_TYPE'],
 ['outputs','outputs','Datos de salida','OS_ARTIFACT_TYPE'],
 ['automation_ai','automationAi','Automatización e IA','text'],
 ['human_supervision','humanSupervision','Supervisión humana','text'],
 ['controls_risk','controlsRisk','Control / riesgo','text']
];
function tobeAiReviewDiff(e,p,id){
  const out={issue:'',warnings:[],fields:[],allFields:[],skipped:[],decision:null};
  const d=tobeHumanReviewRecord(e,p)?.decisions?.[String(id)];
  if(!tobeEditable(p)||!d||!['ACCEPT','MODIFY'].includes(d.status)){
    out.issue='Primero registra tu decisión y justificación sobre la propuesta IA.';
  }else out.decision=d.status;
  const source=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  const ai=source?.items?.find(x=>String(x.source_step_id)===String(id));
  const item=p.items.find(x=>String(x.sourceStepId)===String(id));
  if(!source?.review||!ai||!item||!Array.isArray(ai.source_refs)||
     !ai.source_refs.map(String).includes(String(id))){
    out.issue='No existe una recomendación guardada y trazable a esta actividad.';return out;
  }
  const blocked=source.review?.blocking_step_ids?.includes(String(id))||
    source.review?.issues?.some(x=>x.category==='BLOCKING'&&
      (!x.step_id||x.step_id==='GLOBAL'||String(x.step_id)===String(id)));
  if(blocked||source.review?.review_mode==='RULES_ONLY'){
    if(d?.status==='ACCEPT'){out.issue='Hay bloqueos en la propuesta IA: utiliza «Modificar antes de usar» para seleccionar cambios concretos.';}
    out.warnings.push('La propuesta tiene observaciones o sólo revisión por reglas. Cada campo seleccionado es una hipótesis que debes verificar.');
  }
  const narrative=typeof internalAiPilotNarrative==='function'?internalAiPilotNarrative(ai.rationale):{action:''};
  const contradiction=ai.transformation==='Se mantiene'&&
    /automatiz|implement|integr|modific|rediseñ|sustitu/i.test(
      String(narrative.action||'')+' '+String(ai.automation_ai||''));
  if(contradiction)out.warnings.push('La IA indica «Se mantiene» pero recomienda cambios: selecciona «Qué cambia» manualmente.');
  for(const [sourceKey,key,label,type] of TOBE_AI_REVIEW_FIELDS){
    const raw=String(ai[sourceKey]??'').trim();
    if(!raw||/^(no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(raw))continue;
    if(type==='transformation'&&(!TOBE_TRANSFORMATIONS.includes(raw)||contradiction)){
      out.skipped.push({key,label,raw,reason:'La transformación IA contiene una contradicción o no es válida; revísala en el selector existente.'});
      continue;
    }
    let value=raw,display=raw;
    if(type.startsWith('OS_')){
      const opts=fieldOptions(type);
      const parts=type==='OS_ARTIFACT_TYPE'?raw.split(/[,;|]/).map(x=>x.trim()).filter(Boolean):[raw];
      const selected=parts.map(x=>opts.find(o=>String(o.value)===x||
        String(o.label||'').toLowerCase()===x.toLowerCase()));
      if(!parts.length||selected.some(x=>!x)||(
        type==='OS_ARTIFACT_TYPE'&&selected.some(x=>String(x.value).toUpperCase()==='OTHER'))){
        out.warnings.push('«'+label+'» contiene opciones no confirmadas en el catálogo. Revísalas manualmente.');
        out.skipped.push({key,label,raw,reason:'El valor no corresponde a una opción de catálogo aplicable sin revisión.'});
        continue;
      }
      value=type==='OS_ARTIFACT_TYPE'?selected.map(x=>String(x.value)):String(selected[0].value);
      display=selected.map(x=>x.label).join(' · ');
    }
    // Multiselect order and duplicates do not change the selected set.
    const comparable=v=>type==='OS_ARTIFACT_TYPE'&&Array.isArray(v)?
      [...new Set(v.map(String))].sort():v;
    const same=JSON.stringify(comparable(item[key]))===JSON.stringify(comparable(value));
    const before=type==='OS_ARTIFACT_TYPE'?
      tobeArtifactDisplay(item[key],item._details?.[key]):
      type.startsWith('OS_')?
        labelFrom(type,item[key])||String(item[key]||'Sin definir'):
        String(item[key]||'Sin definir');
    const entry={key,label,value,display,before,changed:!same};
    out.allFields.push(entry);
    if(!same)out.fields.push(entry);
  }
  return out;
}
// A DRAFT with 4/4 analyzed activities may still have incomplete fields;
// report those counts separately without implying missing AS-IS evidence.
function tobeAiFieldCoverageHtml(e,p,item){
  if(item?.isAddition||typeof internalAiSavedDraft!=='function')return '';
  const saved=internalAiSavedDraft(e);
  if(!saved?.items?.some(x=>String(x.source_step_id)===String(item.sourceStepId)))return '';
  const diff=tobeAiReviewDiff(e,p,item.sourceStepId),
    candidate=diff.allFields.length,
    invalid=diff.skipped.length,
    blank=TOBE_AI_REVIEW_FIELDS.filter(([sourceKey,key])=>
      !diff.allFields.some(x=>x.key===key)&&!diff.skipped.some(x=>x.key===key)),
    incomplete=blank.filter(([sourceKey])=>
      (saved.review?.issues||[]).some(x=>
        x.category==='BLOCKING'&&String(x.step_id)===String(item.sourceStepId)&&
        String(x.evidence||'').split(/[^a-z_]/i).includes(sourceKey))).length,
    absent=blank.length-incomplete;
  return '<div class="tobe-ai-field-summary" role="status">'+
    '<b>Propuestas IA por campo</b> '+
    '<span class="tobe-ai-field-count"><strong>'+candidate+'</strong> con candidato</span>'+
    '<span class="tobe-ai-field-count"><strong>'+invalid+'</strong> no aplicables</span>'+
    (incomplete?'<span class="tobe-ai-field-count"><strong>'+incomplete+'</strong> incompletos según revisor</span>':'')+
    '<span class="tobe-ai-field-count"><strong>'+absent+'</strong> sin propuesta</span>'+
    '<details class="tobe-subdetails"><summary>Cómo interpretar los estados</summary>'+
    '<p>La cobertura de estos nueve campos es distinta de las actividades analizadas. Un campo vacío no prueba falta de datos, conformidad, ni aprobación. La IA no indica la razón de cada omisión.</p></details>'+
    '</div>';
}
// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] END

// [AUNEA-FE-PG11-FIELD-INLINE-263] START — existing input controls remain sole owners.
// SOURCE: Simulator CANONICAL PG11; DEC-050, DEC-056; IA versioned proposal.
// INPUT: existing TO-BE item and source-linked IA; OUTPUT: read-only, field-adjacent advice.
// SIDE EFFECTS: none. An explicit existing human decision gates any apply action.
function tobeAiInlineHint(e,p,item,key){
  if(item.isAddition)return '';
  const currentData=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  const id=String(item.sourceStepId),
    keyForAi=typeof internalAiPilotKey==='function'?internalAiPilotKey(e):null,
    partial=!currentData&&keyForAi&&typeof internalAiPendingSteps==='function'?
      internalAiPendingSteps(e,keyForAi)?.items?.get(id):null,
    history=!currentData&&!partial&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null;
  const data=currentData||history?.proposal;
  const ai=partial||data?.items?.find(x=>String(x.source_step_id)===id);
  if(!ai||!Array.isArray(ai.source_refs)||
     !ai.source_refs.map(String).includes(id))return '';
  if((history&&!currentData)||partial){
    const info=TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key);
    if(!info)return '';
    const raw=String(ai[info[0]]??'').trim();
    const options=info[3].startsWith('OS_')?fieldOptions(info[3]):[];
    const parts=info[3]==='OS_ARTIFACT_TYPE'?raw.split(/[,;|]/):[raw];
    const display=raw&&options.length?parts.filter(Boolean).map(v=>{
      const value=v.trim(),found=options.find(x=>String(x.value)===value||
        String(x.label||'').trim().toLowerCase()===value.toLowerCase());
      return String(found?.label||value);
    }).join(' · '):raw;
    const narrative=typeof internalAiPilotNarrative==='function'?
      internalAiPilotNarrative(ai.rationale):{reason:''};
    return '<div class="tobe-ai-inline" data-tobe-ai-field-key="'+attr(key)+'">'+
      '<p class="field-help"><b>'+(partial?'IA · Propuesta individual pendiente':
        'IA histórica · v'+esc(history.version))+
      ':</b> '+esc(display||'Sin valor propuesto')+'</p>'+
      '<p class="field-help tobe-ia-provenance">'+(partial?
        'Sólo consulta hasta completar las actividades y comprobar coherencia.':
        'Solo lectura · borrador actual v'+esc(p.version)+'.')+'</p>'+
      (raw?'<details class="tobe-subdetails"><summary>Fundamento y fuentes de la propuesta IA</summary>'+
        '<p><b>Justificación general de la actividad:</b> '+esc(narrative.reason||'Sin justificación adicional')+'</p>'+
        '<p><b>Referencias:</b> '+esc(typeof internalAiReadableRefs==='function'?
          internalAiReadableRefs(e,ai.source_refs):ai.source_refs.join(' · '))+'</p>'+
        '<p><b>Condiciones pendientes:</b> '+esc(ai.limitations||'No declaradas')+'</p>'+
        '</details>':'')+
      '</div>';
  }
  const diff=tobeAiReviewDiff(e,p,item.sourceStepId),
    matched=diff.allFields.find(x=>x.key===key),
    skipped=diff.skipped.find(x=>x.key===key),
    field=TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key);
  if(!field)return '';
  const decision=tobeHumanReviewRecord(e,p)?.decisions?.[String(item.sourceStepId)],
    dismissed=decision?.status==='DISCARD',
    refs=typeof internalAiReadableRefs==='function'?
      internalAiReadableRefs(e,ai.source_refs):
      ai.source_refs.join(' · '),
    pending=String(ai.limitations||'').trim(),
    value=matched?.display||skipped?.raw||'';
  const lastChoice=(p.aiDraft?.applyHistory||[]).filter(x=>
    String(x.sourceStepId)===String(item.sourceStepId)&&
    Array.isArray(x.fields)&&x.fields.includes(key)&&
    x.proposalFingerprint===tobeCandidateFingerprint(p)).slice(-1)[0];
  const kept=lastChoice?.action==='KEEP';
  const applied=lastChoice?.action==='APPLY'&&!!matched&&!matched.changed;
  // A narrative can describe automation without producing a field candidate.
  // Explain the gap but never populate the consultant-owned field implicitly.
  const narrative=typeof internalAiPilotNarrative==='function'?
    internalAiPilotNarrative(ai.rationale):{action:''};
  const missingAutomationCandidate=key==='automationAi'&&!matched&&!skipped&&
    /automatiz|autom[aá]tic/i.test(String(narrative.action||''));
  const structuredIssue=(!matched&&!skipped)?(data?.review?.issues||[]).find(issue=>
    issue.category==='BLOCKING'&&String(issue.step_id)===id&&
    String(issue.evidence||'').split(/[^a-z_]/i).includes(field[0])):null;
  return '<div class="tobe-ai-inline'+(!matched&&!skipped?' tobe-ai-no-candidate':'')+
    '" data-tobe-ai-field-key="'+attr(key)+'">'+
    '<p class="field-help"><b>'+(!matched&&!skipped?'IA: sin candidato estructurado para este campo':'IA propone:')+'</b> '+esc(value)+
    (skipped?' · <b>Revisión manual necesaria</b>':
      matched&&!matched.changed?' · Coincide con el TO-BE':'')+'</p>'+
    (skipped?'<p class="field-help">'+esc(skipped.reason)+'</p>':'')+
    (structuredIssue?
      '<p class="field-help tobe-ai-candidate-gap" role="alert"><b>Incoherencia de propuesta:</b> '+
        esc(structuredIssue.issue||'Falta contenido estructurado.')+
        ' Consulta la revisión en 03.2. No se puede aplicar este campo.</p>':
      missingAutomationCandidate?
      '<p class="field-help tobe-ai-candidate-gap">03.2 describe automatización, pero la IA no ha generado un valor estructurado para este campo. No puede aplicarse; revisa el borrador manualmente.</p>':'')+
    ((matched||skipped)?'<details class="tobe-subdetails"><summary>Fuentes y condiciones del campo</summary>'+
      '<p><b>Referencias:</b> '+esc(refs||'No identificadas')+'</p>'+
      (pending?'<p><b>Por verificar:</b> '+esc(pending)+'</p>':'')+
    '</details>':'')+
    (kept?'<p class="field-help"><b>Estado del campo:</b> mantener el valor TO-BE guardado.</p>':
      applied?'<p class="field-help"><b>Estado del campo:</b> sugerencia IA aplicada y guardada.</p>':
      lastChoice?.action==='EDIT'?'<p class="field-help"><b>Estado del campo:</b> alternativa editada por el consultor.</p>':'')+
    (dismissed?'<p class="field-help">Recomendación descartada. Se conserva tu valor.</p>':
      skipped?'<p class="field-help">Valor no aplicable: revísalo en el control original.</p>':'')+
    '</div>';
}
// [AUNEA-FE-PG11-CLIENT-CONTEXT-269] START — Read-only evidence and conditions.
// The IA limitations are proposals to verify, NEVER confirmed client claims.
function tobeAiOperationalContextHtml(e,item){
  if(item.isAddition)return '';
  const saved=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  const id=String(item.sourceStepId),
    keyForAi=typeof internalAiPilotKey==='function'?internalAiPilotKey(e):null,
    partial=!saved&&keyForAi&&typeof internalAiPendingSteps==='function'?
      internalAiPendingSteps(e,keyForAi)?.items?.get(id):null,
    history=!saved&&!partial&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null;
  const proposal=saved||history?.proposal;
  const ai=partial||proposal?.items?.find(x=>String(x.source_step_id)===id);
  if(!ai)return '<p class="tobe-ai-operational-context tobe-muted">Sin propuesta IA vigente para esta actividad. El diseño debe basarse en el AS-IS y las evidencias confirmadas.</p>';
  const limitations=String(ai.limitations||'').trim();
  const refs=typeof internalAiReadableRefs==='function'?
    internalAiReadableRefs(e,ai.source_refs):(ai.source_refs||[]).join(' · ');
  const historical=!!history;
  return '<details class="tobe-ai-operational-context" role="note">'+
    '<summary>Condiciones y viabilidad · '+(limitations?'Revisión necesaria':'Sin detalle específico')+
      (historical?' · Histórica v'+esc(history.version):
        partial?' · Sin consolidar':'')+'</summary>'+
    '<div class="tobe-ai-operational-body">'+
      '<p>'+esc(limitations||'La IA no ha detallado restricciones para esta actividad.')+'</p>'+
      '<p><b>Fuentes:</b> '+esc(refs||'Sin fuentes especificadas')+'</p>'+
      '<p>Una limitación propuesta por IA no es una restricción confirmada. Contrasta capacidades, permisos, interrupciones y controles antes de implantar.</p>'+
      (historical?'<p>Propuesta anterior: sólo lectura, no aplicable a esta versión.</p>':
        partial?'<p>Propuesta guardada sin consolidar: no se puede aplicar todavía.</p>':'')+
    '</div></details>';
}
// [AUNEA-FE-PG11-CLIENT-CONTEXT-269] END
// [AUNEA-FE-PG11-APPROVED-ROW-ACTIONS-273] START — Only the current
// version's reviewed IA can be applied. All values remain consultant-owned.
// [AUNEA-FE-PG11-ROW-DECISION-278] START — Consultant-owned actions; historical IA is never imported automatically.
function tobeAiRowActions(e,p,item,key){
  if(item.isAddition||!tobeEditable(p))return '';
  const id=String(item.sourceStepId),
    isCurrent=typeof internalAiSavedDraft==='function'&&
      internalAiSavedDraft(e)?.items?.some(x=>String(x.source_step_id)===id),
    diff=isCurrent?tobeAiReviewDiff(e,p,id):null,
    candidate=diff?.allFields?.find(x=>x.key===key),
    canApply=!!candidate?.changed&&!diff.issue,
    history=(p.aiDraft?.applyHistory||[]).filter(x=>String(x.sourceStepId)===id&&
      Array.isArray(x.fields)&&x.fields.includes(key)&&
      x.proposalFingerprint===tobeCandidateFingerprint(p)).slice(-1)[0],
    applied=history?.action==='APPLY'&&!!candidate&&!candidate.changed,
    blockedReason=!isCurrent?
      'La propuesta por actividad no está vigente o aún no ha superado la comprobación de coherencia entre actividades. El análisis global de la sección 02 no sustituye esta comprobación.':
      diff?.issue||(!candidate?
        'No hay valor IA fundamentado y compatible para este campo.':
        'La propuesta coincide con el valor actual.');
  const action=(label,attribute,active=false,title='')=>
    '<button type="button" class="btn btn-outline btn-small'+(active?' is-selected':'')+
    '" '+attribute+' title="'+attr(title||label)+'">'+esc(label)+'</button>';
  return '<div class="tobe-ai-row-actions aunea-ui-button-row" aria-label="Acciones de '+esc(
    TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key)?.[2]||'este campo')+'">'+
    (canApply?
      action('Aplicar IA',
        'data-tobe-ai-use-field="'+attr(key)+'" data-tobe-ai-action-source="'+attr(id)+'"',
        false,'Aplicar sugerencia IA autorizada'):
      applied?'<span class="field-help" role="status">IA aplicada</span>':'')+
    (candidate?action('Mantener','data-tobe-ai-keep-field="'+attr(key)+
      '" data-tobe-ai-action-source="'+attr(id)+'"',history?.action==='KEEP',
      'Conservar valor TO-BE sin aplicar IA'):'')+
    action('Editar','data-tobe-ai-edit-field="'+attr(key)+'"',false,
      'Abrir el editor original de este campo')+'</div>';
}
// [AUNEA-FE-PG11-ROW-DECISION-278] END
// [AUNEA-FE-PG11-APPROVED-ROW-ACTIONS-273] END
function tobeWithAiHint(e,p,item,key,html){
  // [AUNEA-FE-PG11-GUIDED-FIELD-267] START — The existing field keeps sole edit
  // ownership; the suggestion is a read-only sibling, not another control.
  if(item.isAddition)return html;
  const advice=tobeAiInlineHint(e,p,item,key);
  const original=typeof tobeProposalSourceSteps==='function'?tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item.sourceStepId)):null;
  const sourceKey=({futureActor:'actor',tool:'tool',inputs:'inputs',outputs:'outputs'})[key];
  const sourceValue=original&&sourceKey?original[sourceKey]:null;
  const category=key==='futureActor'?'OS_ACTOR_ROLE':key==='tool'?'OS_TOOL_CATEGORY':'OS_ARTIFACT_TYPE';
  const readable=x=>String((typeof labelFrom==='function'&&labelFrom(category,x))||x);
  const sourceLabel=sourceValue===null||sourceValue===undefined||sourceValue===''?'':(
    Array.isArray(sourceValue)?sourceValue.map(readable).join(' · '):readable(sourceValue));
  const fallback='<div class="tobe-ai-inline tobe-ai-inline-empty" data-tobe-ai-field-key="'+
    attr(key)+'"><p class="field-help"><b>IA:</b> Sin propuesta vigente para esta actividad.'+
    ' Conserva el valor TO-BE o complétalo con evidencia.</p></div>';
  return '<div class="tobe-ai-field-row" data-tobe-row-key="'+attr(key)+'">'+
    '<div class="tobe-ai-field-control">'+
      (sourceLabel?'<p class="tobe-ai-source-value"><b>Valor AS-IS confirmado:</b> '+esc(sourceLabel)+'</p>':'')+
      html+'</div>'+
    (advice||fallback)+tobeAiRowActions(e,p,item,key)+'</div>';
}
// [AUNEA-FE-PG11-GUIDED-FIELD-267] END
// [AUNEA-FE-PG11-FIELD-INLINE-263] END

// [AUNEA-FE-PG11-AI-STEP-APPLY-230] START — source-linked,
 // field-selected manual application with explicit review and persistent audit.
 // No new route or automatic technical/client approval.
// SOURCE: DEC-050/052/055; PG11 CANONICAL; existing reviewer and human decisions.
// [AUNEA-FE-PG11-KEEP-FIELD-270] START — Explicit, versioned KEEP decision.
// It records intent without changing the canonical editable value.
function tobeKeepAiReviewedField(e,sourceId,key){
  if(!e||state.activePage!=='tobe')return false;
  const p=latestTobe(e),item=p?.items?.find(x=>String(x.sourceStepId)===String(sourceId)),
    valid=TOBE_AI_REVIEW_FIELDS.some(x=>x[1]===key);
  if(!tobeEditable(p)||!item||!valid)
    return toast('No se puede conservar este campo en el borrador actual.'),false;
  // KEEP is a consultant-owned choice even if IA is historical or incomplete.
  // This never approves or imports a historical AI proposal.
  if(!saveTobeFromDom(e)||!saveState('Guardar valor manual antes de mantener'))
    return toast('El valor actual no pudo guardarse.'),false;
  const live=currentEng(),draft=latestTobe(live),
    prior=JSON.parse(JSON.stringify(draft.aiDraft?.applyHistory||[]));
  if(!draft.aiDraft)draft.aiDraft={};
  draft.aiDraft.applyHistory=[...prior,{
    sourceStepId:String(sourceId),fields:[key],action:'KEEP',
    decision:'KEEP_VALUE',proposalFingerprint:tobeCandidateFingerprint(draft),
    appliedAt:now()
  }].slice(-100);
  markDirty('PG11: mantener valor '+key);
  if(!saveState('Guardar elección de mantener valor')){
    draft.aiDraft.applyHistory=prior;
    return toast('No se guardó la elección. El valor anterior se conserva.'),false;
  }
  const last=(latestTobe(currentEng())?.aiDraft?.applyHistory||[]).slice(-1)[0];
  if(last?.action!=='KEEP'||last.sourceStepId!==String(sourceId)||last.fields?.[0]!==key)
    return toast('No se ha podido verificar la decisión guardada.'),false;
  render();
  toast('Se mantiene tu valor TO-BE. No se ha aplicado la IA.');
  return true;
}
// [AUNEA-FE-PG11-KEEP-FIELD-270] END
function tobeApplyAiReviewedFields(e,sourceId,keys){
  if(!e||state.activePage!=='tobe')return false;
  const draft=latestTobe(e),first=tobeAiReviewDiff(e,draft,sourceId),
    wanted=new Set((keys||[]).map(String));
  if(first.issue)return toast(first.issue),false;
  if(!wanted.size)return toast('Selecciona primero los campos que quieres trasladar.'),false;
  if([...wanted].some(k=>!first.fields.some(x=>x.key===k)))
    return toast('La selección ya no coincide con la propuesta IA vigente.'),false;
  // Save all the consultant's pending edits before applying anything from the IA.
  if(!saveTobeFromDom(e)||!saveState('Guardar diseño antes de aplicar selección IA'))
    return toast('No se guardó el diseño manual; no se aplicó ningún cambio IA.'),false;
  const live=currentEng(),p=latestTobe(live),fresh=tobeAiReviewDiff(live,p,sourceId);
  if(fresh.issue||[...wanted].some(k=>!fresh.fields.some(x=>x.key===k)))
    return toast(fresh.issue||'El contenido ha cambiado. Revisa nuevamente los campos.'),false;
  const item=p.items.find(x=>String(x.sourceStepId)===String(sourceId)),
    previous=JSON.parse(JSON.stringify(item)),
    oldHistory=JSON.parse(JSON.stringify(p.aiDraft?.applyHistory||[])),
    chosen=fresh.fields.filter(x=>wanted.has(x.key));
  for(const field of chosen)item[field.key]=Array.isArray(field.value)?
    [...field.value]:field.value;
  // Audit metadata belongs to this versioned proposal, not to a second business owner.
  p.aiDraft.applyHistory=[...oldHistory,{
    sourceStepId:String(sourceId),fields:chosen.map(x=>x.key),action:'APPLY',
    decision:fresh.decision,proposalFingerprint:tobeCandidateFingerprint(p),
    previousValues:Object.fromEntries(chosen.map(field=>[field.key,previous[field.key]??null])),
    appliedValues:Object.fromEntries(chosen.map(field=>[field.key,JSON.parse(JSON.stringify(field.value))])),
    sourceRefs:[...(internalAiSavedDraft(live)?.items?.find(x=>String(x.source_step_id)===String(sourceId))?.source_refs||[])],
    appliedAt:now()
  }].slice(-100);
  p.updatedAt=now();markDirty('PG11: campos IA seleccionados por el consultor');
  if(!saveState('Guardar cambios IA autorizados en '+sourceId)){
    Object.assign(item,previous);p.aiDraft.applyHistory=oldHistory;
    markDirty('PG11: cambios IA pendientes de persistencia');
    return toast('No se guardaron los cambios. El diseño anterior se conserva en memoria.'),false;
  }
  const stored=latestTobe(currentEng())?.items.find(x=>String(x.sourceStepId)===String(sourceId));
  if(!stored||chosen.some(x=>JSON.stringify(stored[x.key])!==JSON.stringify(x.value))){
    toast('No se verificó la persistencia; no marques esta versión como revisada.');
    return false;
  }
  render();
  if(typeof requestAnimationFrame==='function')
    requestAnimationFrame(()=>document.getElementById('tobeStepDesign')?.
      scrollIntoView({behavior:'smooth',block:'start'}));
  toast('Aplicados '+chosen.length+' campos autorizados. Revisa el diseño y las rutas; el TO-BE no queda aprobado.');
  return true;
}
// [AUNEA-FE-PG11-AI-STEP-APPLY-230] END
// [AUNEA-FE-PG11-INSPECTOR-CHECKPOINT-214] START — show the existing verified
// per-step suggestion only when it matches the current DRAFT's versioned IA checkpoint.
// SOURCE: PG11 CANONICAL; DEC-050/052/055; no new business field or data owner.
// SIDE_EFFECTS: display-only. Never transfers an unreviewed item into TO-BE.
function tobeAiAdviceHtml(e,item,includeDecision=true){
  if(item?.isAddition)return '<div class="tobe-ai-empty"><p class="tobe-muted">Actividad incorporada por el consultor, vinculada a '+esc(item.sourceStepName)+'. La IA generada sobre el AS-IS no propone pasos nuevos automáticamente. Justifica la incorporación, su responsable y sus rutas antes de revisión.</p></div>';
  const key=typeof internalAiPilotKey==='function'?internalAiPilotKey(e):null;
  const cached=key&&typeof __auneaAiPreview!=='undefined'?__auneaAiPreview.get(key):null;
  const current=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
  // Reuse the same version/hash/coverage gate as the IA panel, not a raw checkpoint
  // read: an older snapshot or a different Engagement must never be shown as current.
  const pending=key&&!cached&&!current&&typeof internalAiPendingSteps==='function'?
    internalAiPendingSteps(e,key):null;
  const approvedReadOnly=!tobeEditable(latestTobe(e))?latestTobe(e)?.aiDraft?.proposal:null;
  const archived=!cached&&!current&&!approvedReadOnly&&!pending?.items?.size&&
    typeof internalAiHistoricalDraft==='function'?internalAiHistoricalDraft(e):null;
  const draft=cached||current||approvedReadOnly||archived?.proposal;
  const stepId=String(item.sourceStepId);
  const fromCheckpoint=!draft&&!!pending?.items?.has(stepId);
  const remainingStepIds=fromCheckpoint?(latestTobe(e)?.items||[]).filter(x=>
    !pending.items.has(String(x.sourceStepId))).map(x=>String(x.sourceStepName||x.sourceStepId)):[];
  const suggestion=draft?.items?.find(x=>String(x.source_step_id)===stepId)||
    (fromCheckpoint?pending.items.get(stepId):null);
  if(!suggestion)return '<div class="tobe-ai-empty"><p class="tobe-muted">Todavía no hay una sugerencia de IA vigente para esta actividad. Si existen actividades verificadas pendientes de revisión, se mostrarán únicamente en sus pasos correspondientes.</p></div>';
  const narrative=typeof internalAiPilotNarrative==='function'?internalAiPilotNarrative(suggestion.rationale):{action:'',expected:'',reason:String(suggestion.rationale||'')};
  const issues=(draft?.review?.issues||[]).filter(x=>x.step_id===stepId||x.step_id==='GLOBAL');
  const blocking=issues.some(x=>x.category==='BLOCKING')||(draft?.review?.blocking_step_ids||[]).includes(stepId);
  return '<div class="tobe-advice-content" data-tobe-ai-transform="'+
    attr(suggestion.transformation||'')+'">'+
    (fromCheckpoint?'<div class="notice warn"><b>Propuesta individual guardada; pendiente de consolidación.</b> '+
      (remainingStepIds.length?'Falta analizar '+remainingStepIds.length+
        (remainingStepIds.length===1?' actividad: ':' actividades: ')+esc(remainingStepIds.join(' · '))+'. '+
        'Al terminar se comprobará la coherencia entre actividades. ':'')+
      'No se ha aplicado ni aprobado ningún cambio.'+
      (remainingStepIds.length?'<div><button type="button" class="btn btn-outline btn-small" data-tobe-generate-all-remaining>Analizar actividades pendientes</button></div>':'')+
      '</div>':'')+
    (archived?'<p class="notice warn"><b>Propuesta histórica, sólo lectura.</b> Corresponde al TO-BE v'+
      esc(archived.version)+'. No se aplica al proceso vigente sin una revisión del consultor.</p>':'')+
    '<div class="tobe-advice-label">'+esc(suggestion.transformation||'Sin clasificar')+
      (fromCheckpoint?' · Sin consolidar':
        blocking?' · Requiere corrección':' · Propuesta sin aprobar')+'</div>'+
    '<p class="notice info" data-tobe-ai-difference="1"'+
      (item.transformation&&item.transformation!==suggestion.transformation?'':' hidden')+'>'+
      'La IA propone «'+esc(suggestion.transformation||'Sin clasificar')+
      '» y tu diseño indica «'+esc(item.transformation||'Sin definir')+
      '». Revisa la diferencia: aceptar la propuesta no modifica automáticamente el proceso.'+
    '</p>'+
    '<dl class="tobe-advice-pairs">'+
    '<div><dt>Problema identificado</dt><dd>'+esc(suggestion.problem_resolved||'No concretado')+'</dd></div>'+
    '<div><dt>Intervención recomendada</dt><dd>'+esc(narrative.action||'No concretada')+'</dd></div>'+
    '<div><dt>Resultado esperado</dt><dd>'+esc(narrative.expected||'No declarado')+'</dd></div>'+
    '</dl>'+
    '<details class="tobe-subdetails"><summary>Justificación, fuentes y aspectos por revisar</summary>'+
      '<p><b>Justificación:</b> '+esc(narrative.reason||'No declarada')+'</p>'+
      '<p><b>Fuentes:</b> '+esc((typeof internalAiReadableRefs==='function'?
        internalAiReadableRefs(e,suggestion.source_refs):
        (suggestion.source_refs||[]).join(', '))||'No identificadas')+'</p>'+
      '<p><b>Condiciones pendientes:</b> '+esc(suggestion.limitations||'Ninguna declarada')+'</p>'+
      (fromCheckpoint?'<p>Consolidación entre actividades pendiente. No se puede aplicar ni aprobar esta propuesta.</p>':
        issues.length?'<ul>'+issues.map(x=>'<li>'+esc(x.issue||x.action||'Revisión pendiente')+'</li>').join('')+'</ul>':
        '<p>Sin observaciones específicas del revisor automático.</p>')+
    '</details>'+
    ''+
    (includeDecision?tobeHumanReviewHtml(e,item,!!archived):'')+
    '<p class="tobe-muted">Los valores IA y sus fuentes aparecen junto a los campos de «03.3 · Configurar». La propuesta no modifica el borrador sin una decisión humana.</p>'+
    '</div>';
}
// [AUNEA-FE-PG11-INSPECTOR-CHECKPOINT-214] END
// [AUNEA-FE-PG11-HUMAN-DECISIONS-223] START — one deliberate review decision
// per source activity, stored only in the existing versioned TO-BE aiDraft owner.
// SOURCE: PG11 CANONICAL (consultant decision); DEC-050/052/055; PG11 plan C.
// No new client capture; no AI-to-TOBE field copy; decision is not approval.
const TOBE_HUMAN_DECISIONS=Object.freeze(['ACCEPT','MODIFY','DISCARD']);
const TOBE_HUMAN_LABELS=Object.freeze({
  ACCEPT:'Aceptar recomendación',MODIFY:'Modificar antes de usar',
  DISCARD:'Descartar recomendación'
});
function tobeCandidateFingerprint(p,sourceId=null){
  const items=p?.aiDraft?.proposal?.items||p?.aiDraft?.checkpoint?.items||[];
  // A decision depends on its own evidence and on relevant consolidation findings.
  // Legacy whole-proposal fingerprints remain valid only for that exact proposal.
  const review=p?.aiDraft?.proposal?.review;
  const candidate=sourceId===null?items:{
    item:items.find(x=>String(x.source_step_id)===String(sourceId))||null,
    reviewMode:review?.review_mode||null,
    blocked:(review?.blocking_step_ids||[]).map(String).includes(String(sourceId)),
    issues:(review?.issues||[]).filter(x=>!x.step_id||x.step_id==='GLOBAL'||String(x.step_id)===String(sourceId))
  };
  const raw=JSON.stringify(candidate);
  let hash=2166136261;
  for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619)>>>0;
  return hash.toString(16)+':'+raw.length;
}
function tobeHumanReviewRecord(e,p){
  const h=p?.aiDraft?.humanReview,diag=currentDiagnosticOutput(e),
    input=p?.aiDraft?.proposal?.input_hash||p?.aiDraft?.checkpoint?.inputHash;
  if(!h||!diag||!input||h.tobeVersion!==p.version||
    h.sourceSnapshotVersion!==p.sourceSnapshotVersion||
    h.diagnosticInputHash!==diag.input_snapshot_hash||h.proposalInputHash!==input)return null;
  if(h.proposalFingerprint===tobeCandidateFingerprint(p))return h;
  const decisions=Object.fromEntries(Object.entries(h.decisions||{}).filter(([id,decision])=>
    decision.proposalStepFingerprint===tobeCandidateFingerprint(p,id)));
  return Object.keys(decisions).length?{...h,proposalFingerprint:tobeCandidateFingerprint(p),decisions}:null;
}
function tobeHumanReviewHtml(e,item,historical){
  const p=latestTobe(e);
  if(historical||!tobeEditable(p))return '';
  const record=tobeHumanReviewRecord(e,p)?.decisions?.[String(item.sourceStepId)]||null;
  const label=TOBE_HUMAN_LABELS[record?.status]||'Sin decisión';
  const id=String(item.sourceStepId);
  return '<section class="tobe-human-review" aria-label="Decisión humana sobre la propuesta">'+
    '<h4>Decisión del consultor sobre la propuesta</h4>'+
    '<p class="tobe-muted">Aceptar, modificar o descartar sólo registra tu decisión. No rellena campos ni confirma cifras, capacidades o rutas.</p>'+
    '<p class="tobe-human-review-status"><b>Estado:</b> '+esc(label)+'</p>'+
    '<div class="field"><label for="tobeHumanReviewNote">Justificación de la decisión</label>'+
    '<textarea id="tobeHumanReviewNote" rows="3" placeholder="Explica qué evidencia y condiciones sustentan tu decisión. No inventes datos.">'+
    esc(record?.note||'')+'</textarea></div>'+
    '<div class="tobe-human-review-actions">'+
      TOBE_HUMAN_DECISIONS.map(status=>'<button type="button" class="btn '+
        (record?.status===status?'btn-primary':'btn-outline')+
        '" data-tobe-human-decision="'+status+'" data-tobe-human-source="'+attr(id)+'">'+
        esc(TOBE_HUMAN_LABELS[status])+'</button>').join('')+
    '</div><p class="tobe-muted">La decisión no modifica el proceso. Después de guardarla, revisa cada propuesta junto a su campo TO-BE; utiliza únicamente los valores que autorices.</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-HUMAN-DECISIONS-223] END
// [AUNEA-FE-PG11-COHERENCE-239] START — deterministic constraints over
// consultant-owned TO-BE design. Complements (never replaces) the Ollama reviewer.
// SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
// No invented future economics, actors, time metrics, or automatic authorization.
function tobeCoherenceFindings(e,p){
  const findings=[],items=[...(p?.items||[]),...tobeAddedSteps(p)];
  const add=(item,severity,message)=>findings.push({
    stepId:tobeFlowItemId(item),severity,message,
    name:tobeFlowItemName(item)
  });
  for(const item of items){
    const t=String(item.transformation||''),name=tobeFlowItemName(item),
      auto=String(item.automationAi||'').trim(),
      supervisor=String(item.humanSupervision||'').trim(),
      control=String(item.controlsRisk||'').trim();
    if(['Se automatiza','Se asiste con IA'].includes(t)){
      if(!auto||/^(no|n\/a|ninguno|sin definir|pendiente)$/i.test(auto))
        add(item,'BLOCKING','Describe qué ejecutará el sistema y qué parte corresponde a automatización por reglas o IA.');
      if(!supervisor||/^(no|n\/a|ninguno|sin definir|pendiente)$/i.test(supervisor))
        add(item,'BLOCKING','Indica la supervisión humana y qué sucede ante errores o excepciones.');
    }
    if(t==='Requiere decisión humana'&&!supervisor)
      add(item,'BLOCKING','El responsable o punto de decisión humana debe estar explícito.');
    if(t==='Se incorpora control'&&(!control||/^(no|n\/a|ninguno|sin definir|pendiente)$/i.test(control)))
      add(item,'BLOCKING','Describe el control que se incorpora y el riesgo que atiende.');
    if(t==='Se mantiene'&&/^(automatizar|modificar|eliminar|implementar|integrar|rediseñar)\b/i.test(auto))
      add(item,'BLOCKING','«Se mantiene» contradice la intervención indicada en automatización/IA.');
    if(item.isAddition&&['Se mantiene','Se elimina'].includes(t))
      add(item,'BLOCKING','Una actividad nueva debe justificar su incorporación o descartarse; no se clasifica como existente o eliminada.');
    if(t==='Se elimina'&&item.futureTime)
      add(item,'WARNING','Se propone eliminar la actividad pero conserva un tiempo futuro; confirma si pertenece a otro paso.');
    if(['Se automatiza','Se asiste con IA'].includes(t)&&
       /\b(sin supervisi[oó]n|aprueba autom[aá]ticamente|sin intervenci[oó]n humana)\b/i.test(auto))
      add(item,'BLOCKING','La intervención describe autonomía sin un control humano explícito.');
    if(TOBE_TRANSFORMATIONS.includes(t)&&!tobeMeaningfulRationale(item.problemResolved))
      add(item,'BLOCKING','Completa «'+tobeTransformationRationaleLabel(t)+
        '»; un campo vacío o «NO» no justifica esta decisión.');
    if(item.futureTime&&item.futureTimeAssumption)
      add(item,'WARNING','El tiempo futuro es un supuesto; no equivale a medición ni autoriza un ahorro.');
  }
  return findings;
}
// [AUNEA-FE-PG11-GLOBAL-SCAN-280] START — One-pass QA summary; complete issues remain expandable.
function tobeCoherencePanel(e,p){
  const findings=tobeCoherenceFindings(e,p),
    human=typeof tobeHumanReviewRecord==='function'?tobeHumanReviewRecord(e,p):null,
    decisions=human?.decisions||{},steps=p?.items||[],
    reviewed=steps.filter(x=>['ACCEPT','MODIFY','DISCARD'].includes(
      decisions[String(x.sourceStepId)]?.status)).length,
    added=tobeAddedSteps(p).length,
    integrity=tobeFlowIntegrity(e,p),
    blocked=findings.filter(x=>x.severity==='BLOCKING'),
    notes=findings.filter(x=>x.severity!=='BLOCKING'),
    errors=blocked.length+(integrity?1:0),
    items=[...(integrity?[{stepId:'',severity:'BLOCKING',message:integrity,name:'Mapa futuro'}]:[]),...findings],
    ready=errors===0&&reviewed===steps.length,
    headline=ready?'Estructura sin bloqueos detectados; pendiente validación humana de fuentes':
      errors?'Se han detectado '+errors+' bloqueos que deben resolverse':
      'Quedan '+(steps.length-reviewed)+' actividades por revisar';
  return '<div class="tobe-coherence">'+
    '<div class="tobe-global-indicators" role="status">'+
      '<div><strong>'+reviewed+' / '+steps.length+'</strong><span>Actividades revisadas</span></div>'+
      '<div><strong>'+errors+'</strong><span>Bloqueos</span></div>'+
      '<div><strong>'+notes.length+'</strong><span>Observaciones</span></div>'+
      '<div><strong>'+added+'</strong><span>Actividades nuevas</span></div>'+
    '</div>'+
    '<p class="tobe-global-headline">'+esc(headline)+'</p>'+
    '<details class="tobe-global-evidence"><summary>Ver comprobaciones y acciones pendientes'+
      (items.length?' ('+items.length+')':'')+'</summary>'+
      (items.length?'<ul class="tobe-coherence-list">'+items.map(x=>
        '<li><span class="tobe-coherence-severity">'+
        (x.severity==='BLOCKING'?'Bloqueo':'Observación')+'</span>'+
        '<span>'+esc(x.name)+': '+esc(x.message)+'</span>'+
        (x.stepId?'<button type="button" class="btn btn-outline btn-small" data-tobe-select="'+
          attr(x.stepId)+'">Revisar actividad</button>':'')+'</li>').join('')+'</ul>':
        '<p>Sin contradicciones detectadas por las reglas disponibles.</p>')+
      '<p class="tobe-muted">Las comprobaciones estructurales no certifican viabilidad técnica ni ahorros. Valida las fuentes y los supuestos con el cliente.</p>'+
    '</details></div>';
}
// [AUNEA-FE-PG11-GLOBAL-SCAN-280] END
// [AUNEA-FE-PG11-COHERENCE-239] END
// [AUNEA-FE-PG11-FUTURE-FLOW-228] START — version-owned future routing overlay.
// SOURCE: Simulator CANONICAL PG11/PG12; DEC-050/052/055.
// The AS-IS snapshot remains immutable. Added steps are linked to an existing AS-IS
// step, stored only within this TO-BE version, and cannot be auto-approved.
// No new DF question, pricing assumption, or deterministic engine calculation.
function tobeProposalSnapshot(e,p){
  const stored=(e?.confirmedSnapshots||[]).find(x=>x.version===p?.sourceSnapshotVersion);
  return stored||(typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null);
}
function tobeProposalSourceSteps(e,p){
  return (tobeProposalSnapshot(e,p)?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
}
function tobeFlowOwner(e,p){
  const original=tobeProposalSourceSteps(e,p),branching=original.some(s=>processDecisionStep(s));
  const routes={};
  original.forEach((s,i)=>{
    const id=String(s.id);
    routes[id]={
      normal:String(s.normal_next_step||(!branching?(original[i+1]?.id||'__END__'):'__PENDING__')),
      exception:processDecisionStep(s)?String(s.exception_path?.destination_step||'__PENDING__'):''
    };
  });
  const stored=p?.flow;
  return {
    startStepId:String(stored?.startStepId||original[0]?.id||''),
    routes:{...routes,...(stored?.routes||{})},
    addedSteps:Array.isArray(stored?.addedSteps)?stored.addedSteps:[],
    decisionCriteria:stored?.decisionCriteria&&typeof stored.decisionCriteria==='object'?
      {...stored.decisionCriteria}:{},
    positions:stored?.positions&&typeof stored.positions==='object'?{...stored.positions}:{}
  };
}
function tobeMutableFlow(e,p){
  if(!p.flow)p.flow=tobeFlowOwner(e,p);
  if(!p.flow.positions)p.flow.positions={};
  if(!p.flow.decisionCriteria)p.flow.decisionCriteria={};
  return p.flow;
}
function tobeAddedSteps(p,includeSuperseded=false){
  return Array.isArray(p?.flow?.addedSteps)?
    p.flow.addedSteps.filter(x=>includeSuperseded||x.status!=='SUPERSEDED'):[];
}
function tobeFlowItemId(item){return String(item?.isAddition?item.id:item?.sourceStepId||'')}
function tobeFlowItem(e,p,stepId){
  return [...(p?.items||[]),...tobeAddedSteps(p)].find(x=>tobeFlowItemId(x)===String(stepId))||null;
}
function tobeFlowItemName(item){
  return String((item?.isAddition?item.stepName:item?.sourceStepName)||'Actividad sin nombre');
}
function tobeFutureSteps(e,p){
  const original=tobeProposalSourceSteps(e,p),byId=new Map(original.map(x=>[String(x.id),x]));
  const f=tobeFlowOwner(e,p);
  const existing=(p?.items||[]).filter(x=>x.transformation!=='Se elimina').map(item=>{
    const source=byId.get(String(item.sourceStepId));
    if(!source)return null;
    const route=f.routes[String(source.id)]||{};
    const decision=processDecisionStep(source);
    return {...source,id:String(source.id),step_name:tobeFlowItemName(item),
      normal_next_step:String(route.normal??'__PENDING__'),
      exception_path:decision?{...(source.exception_path||{}),
        destination_step:String(route.exception??'__PENDING__')}:undefined};
  }).filter(Boolean);
  const additions=tobeAddedSteps(p).map(item=>{
    const route=f.routes[String(item.id)]||{},
      isDecision=String(item.stepType||'ST02')==='ST04';
    return {id:String(item.id),step_name:tobeFlowItemName(item),
      step_type:isDecision?'ST04':'ST02',
      normal_next_step:String(route.normal??'__PENDING__'),actor:'',
      exception_path:isDecision?{destination_step:String(route.exception||'__PENDING__')}:undefined};
  });
  const steps=[...existing,...additions];
  const first=steps.findIndex(x=>String(x.id)===f.startStepId);
  if(first>0)steps.unshift(steps.splice(first,1)[0]);
  return steps;
}
function tobeFlowIntegrity(e,p){
  const f=tobeFlowOwner(e,p),steps=tobeFutureSteps(e,p),ids=new Set(steps.map(x=>String(x.id))),
    originals=new Map(tobeProposalSourceSteps(e,p).map(x=>[String(x.id),x]));
  if(!ids.size)return 'El TO-BE debe tener al menos una actividad futura.';
  if(!ids.has(String(f.startStepId)))return 'El inicio del TO-BE apunta a una actividad eliminada o inexistente. Selecciona un inicio válido.';
  for(const added of tobeAddedSteps(p)){
    if(String(added.stepType||'ST02')==='ST04'&&
       !String(f.decisionCriteria?.[String(added.id)]||'').trim())
      return 'La nueva decisión '+tobeFlowItemName(added)+
        ' necesita una condición futura explícita antes de conectar las rutas SÍ/NO.';
    if(!originals.has(String(added.sourceStepId)))
      return 'La actividad añadida '+tobeFlowItemName(added)+' no tiene origen AS-IS confirmado.';
    if(!['ST02','ST04'].includes(String(added.stepType||'ST02')))
      return 'El tipo de la nueva actividad '+tobeFlowItemName(added)+' no está permitido.';
    if(!String(added.stepName||'').trim())
      return 'Asigna un nombre a la actividad añadida vinculada a '+added.sourceStepName+'.';
    if(!TOBE_TRANSFORMATIONS.includes(added.transformation))
      return 'Selecciona una transformación válida para '+tobeFlowItemName(added)+'.';
    if(!String(added.problemResolved||'').trim())
      return 'Describe el problema u oportunidad diagnosticada que justifica la actividad '+tobeFlowItemName(added)+'.';
    if(!String(added.futureActor||'').trim())
      return 'Indica responsable futuro de '+tobeFlowItemName(added)+'.';
    if(String(added.futureTime||'').trim()&&!String(added.futureTimeAssumption||'').trim())
      return 'El tiempo futuro de '+tobeFlowItemName(added)+' requiere un supuesto explícito.';
  }
  const outgoing=new Map();
  for(const s of steps){
    const route=f.routes[String(s.id)]||{},original=originals.get(String(s.id));
    const next=String(route.normal??s.normal_next_step??'__PENDING__');
    const exception=processDecisionStep(s)?
      String(route.exception??s.exception_path?.destination_step??'__PENDING__'):'';
    const targets=[next,...(exception?[exception]:[])];
    for(const dest of targets)if(dest!=='__END__'&&!ids.has(dest))
      return 'La ruta de '+s.step_name+' apunta a una actividad eliminada o pendiente de conectar. Revisa sus destinos.';
    outgoing.set(String(s.id),targets);
  }
  const reachable=new Set(),queue=[String(f.startStepId)];
  while(queue.length){
    const id=queue.shift();if(reachable.has(id))continue;reachable.add(id);
    for(const next of outgoing.get(id)||[])if(next!=='__END__'&&!reachable.has(next))queue.push(next);
  }
  if(steps.some(s=>!reachable.has(String(s.id))))
    return 'Hay actividades futuras desconectadas del inicio. Revisa las rutas y los pasos añadidos.';
  const canEnd=new Set(['__END__']);let changed=true;
  while(changed){changed=false;
    for(const [id,links] of outgoing)if(!canEnd.has(id)&&links.some(dest=>canEnd.has(dest))){
      canEnd.add(id);changed=true;
    }
  }
  if(steps.some(s=>!canEnd.has(String(s.id))))
    return 'Existe una ruta futura sin camino hasta el final del proceso.';
  return null;
}
function tobeFlowOptions(e,p,item){
  return [{value:'__PENDING__',label:'Pendiente de conectar'},
    ...tobeFutureSteps(e,p).filter(s=>String(s.id)!==tobeFlowItemId(item))
      .map(s=>({value:String(s.id),label:s.step_name})),
    {value:'__END__',label:'Fin del proceso'}];
}
// [AUNEA-FE-PG11-DECISION-READOUT-297] START — source-backed decision logic.
// AS-IS criteria remain immutable. TO-BE destinations are edited only in Map.
function tobeDecisionReadoutHtml(e,p,item){
  const original=tobeProposalSourceSteps(e,p),
    source=original.find(x=>String(x.id)===String(item.sourceStepId));
  const decision=item.isAddition?String(item.stepType)==='ST04':
    !!source&&processDecisionStep(source);
  if(!decision||item.transformation==='Se elimina')return '';
  const future=tobeFutureSteps(e,p),
    routes=tobeFlowOwner(e,p).routes[tobeFlowItemId(item)]||{},
    name=(id,steps)=>{
      const key=String(id||'__PENDING__');
      if(key==='__END__')return 'Fin del proceso';
      if(key==='__PENDING__')return 'Pendiente de conectar';
      return steps.find(x=>String(x.id)===key)?.step_name||'Destino no disponible';
    },
    raw=item.isAddition?'':source?._details?.decision_criteria||source?.decision_criteria||'',
    values=Array.isArray(raw)?raw:raw?[raw]:[],
    setId=typeof schema!=='undefined'?
      schema.fields?.find(x=>x.Field_ID==='DF041')?.Option_Set_ID:'',
    readable=v=>String((typeof labelFrom==='function'&&setId?
      labelFrom(setId,v):'')||v),
    criteria=values.map(readable).filter(Boolean).join(' · '),
    draftCriterion=String(tobeFlowOwner(e,p).decisionCriteria?.[tobeFlowItemId(item)]||'').trim(),
    asYes=!item.isAddition&&source?name(source.normal_next_step,original):'No existía en el AS-IS',
    asNo=!item.isAddition&&source?name(source.exception_path?.destination_step,original):'No existía en el AS-IS';
  return '<section class="tobe-decision-readout" aria-label="Lógica de decisión y rutas">'+
    '<h4>Decisión y rutas de la actividad</h4>'+
    '<p class="field-help"><b>Criterio AS-IS confirmado:</b> '+
      esc(criteria||'No consta un criterio detallado en el snapshot.')+'</p>'+
    '<p class="field-help"><b>Criterio TO-BE:</b> '+
      esc(draftCriterion||(!item.isAddition&&criteria?
        'Se conserva el criterio del AS-IS; sin cambio registrado.':
        'Pendiente de definir en Mapa TO-BE.'))+'</p>'+
    '<dl><div><dt>Si se cumple · SÍ</dt><dd>AS-IS: '+esc(asYes)+
      ' · TO-BE: '+esc(name(routes.normal,future))+'</dd></div>'+
      '<div><dt>Si no se cumple · NO</dt><dd>AS-IS: '+esc(asNo)+
      ' · TO-BE: '+esc(name(routes.exception,future))+'</dd></div></dl>'+
    '<p class="field-help">Modifica las rutas en «Mapa TO-BE». Esta vista no altera el AS-IS ni confirma nuevas condiciones.</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-DECISION-READOUT-297] END
function tobeFlowInspector(e,p,item){
  if(item.transformation==='Se elimina'){
    return '<section class="tobe-route-editor" id="tobeStepRoutes">'+
      '<h3>03.4 · Conectar el proceso futuro</h3>'+
      '<p class="notice warn">Esta actividad se retira únicamente del TO-BE. Reconecta las rutas entrantes y, si corresponde, selecciona un inicio válido. El AS-IS se conserva intacto.</p></section>';
  }
  const flow=tobeFlowOwner(e,p),stepId=tobeFlowItemId(item),routes=flow.routes[stepId]||{},
    origin=tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item.sourceStepId)),
    decision=item.isAddition?String(item.stepType||'ST02')==='ST04':
      !!origin&&processDecisionStep(origin),editable=tobeEditable(p);
  const opts=tobeFlowOptions(e,p,item);
  const field=(kind,label,value)=>
    '<div class="field"><label>'+label+'</label>'+
    (editable?auneaSelectControl('tobeRoute_'+kind+'_'+stepId,opts,String(value||'__PENDING__'),{
      extra:'data-tobe-route="'+kind+'" data-tobe-route-step="'+attr(stepId)+'"',
      placeholder:'Selecciona destino'}):'<input disabled value="'+attr(opts.find(x=>x.value===value)?.label||value||'Pendiente')+'">')+
    '<p class="field-help">Selecciona el destino de esta ruta en el proceso futuro. Una ruta pendiente bloquea la revisión.</p></div>';
  return '<section class="tobe-route-editor" id="tobeStepRoutes"><h3>03.4 · Conectar el proceso futuro</h3>'+
    '<p class="tobe-muted">Edita aquí las rutas del TO-BE. No se modificarán las conexiones del AS-IS confirmado.</p>'+
    (decision?tobeDecisionReadoutHtml(e,p,item):'')+
    (decision?'<div class="field tobe-decision-criterion-edit">'+
      '<label for="tobeDecisionCriterion_'+attr(stepId)+'">Condición futura que determina SÍ y NO</label>'+
      (editable?'<textarea id="tobeDecisionCriterion_'+attr(stepId)+
        '" data-tobe-decision-criterion="'+attr(stepId)+
        '" rows="3" maxlength="1200" placeholder="'+
        attr(item.isAddition?'Describe la condición de esta nueva decisión':
          'Dejar vacío conserva el criterio original; escribe aquí solo si debe cambiar')+'">'+
        esc(String(flow.decisionCriteria?.[stepId]||''))+'</textarea>':
        '<p>'+esc(String(flow.decisionCriteria?.[stepId]||'Se conserva el criterio AS-IS'))+'</p>')+
      '<p class="field-help">Define la condición para cada resultado. Los destinos se editan debajo; ningún cambio modifica el AS-IS confirmado ni autoriza una aprobación automática.</p>'+
      '</div>':'')+
    '<div class="form-grid">'+field('normal','Siguiente actividad'+(decision?' · ruta SÍ':''),routes.normal)+
    (decision?field('exception','Ruta NO / excepción',routes.exception):'')+
    '</div></section>';
}
// [AUNEA-FE-PG11-FUTURE-FLOW-228] END
// [AUNEA-FE-PG11-FREE-CANVAS-248] START — persisted visual positions
// are separate from flow.routes. The confirmed AS-IS is never mutated.
function tobeCanvasHtml(e,p){
  const steps=tobeFutureSteps(e,p);
  if(typeof processGraphData!=='function')
    return '<div class="notice warn">No está disponible el mapa; no se modificaron datos.</div>';
  const graph=processGraphData(e,steps),selected=tobeSelectedItem(e,p),
    flow=tobeFlowOwner(e,p),editable=tobeEditable(p);
  const placements=graph.nodes.map(n=>{
    const pos=graph.positions.get(n.id);
    if(!pos)return null;
    const saved=flow.positions?.[String(n.id)];
    const x=saved&&Number.isFinite(Number(saved.x))?Number(saved.x):24+Math.max(0,pos.col-1)*272;
    const y=saved&&Number.isFinite(Number(saved.y))?Number(saved.y):40+Math.max(0,pos.row-1)*325;
    return {node:n,x:Math.max(0,Math.min(10000,Math.round(x))),
      y:Math.max(0,Math.min(10000,Math.round(y)))};
  }).filter(Boolean);
  const boardWidth=Math.max(850,...placements.map(p=>p.x+252));
  const boardHeight=Math.max(380,...placements.map(p=>p.y+320));
  const cells=placements.map(({node:n,x,y})=>{
    const step=n.kind==='step'?steps.find(s=>String(s.id)===String(n.id)):null;
    const item=step?tobeFlowItem(e,p,String(step.id)):null;
    let content='';
    if(n.kind==='start'||n.kind==='end'){
      content='<div class="tobe-boundary flow-boundary"><b>'+
        (n.kind==='start'?'Inicio del proceso':'Fin del proceso')+
        '</b><small>TO-BE</small></div>';
    }else if(n.kind==='pending'){
      content='<div class="graph-route-pending"><b>'+esc(n.route||'Ruta')+
        '</b><span>Conexión pendiente</span></div>';
    }else if(item){
      const id=attr(step.id),isSelected=tobeFlowItemId(selected)===String(step.id),
        decision=String(step.step_type)==='ST04';
      content='<button type="button" class="graph-flow-step tobe-graph-node'+
        (isSelected?' is-selected':'')+
        '" data-tobe-select="'+id+'" draggable="false" aria-pressed="'+String(isSelected)+
        '" aria-label="Seleccionar y mover actividad '+attr(tobeFlowItemName(item))+'">'+
        '<span class="tobe-node-count">Actividad '+(steps.indexOf(step)+1)+'</span>'+
        '<span class="tobe-node-icon">'+processNodeIconSvg(processNodeIconName(step))+'</span>'+
        '<strong>'+esc(tobeFlowItemName(item))+'</strong>'+
        '<span class="tobe-node-status">'+esc(item.transformation||'Pendiente de diseño')+'</span>'+
        '<small>'+esc((typeof labelFrom==='function'?labelFrom('OS_ACTOR_ROLE',item.futureActor):'')||
          item.futureActor||'Responsable pendiente')+'</small></button>'+
        (editable?'<div class="tobe-node-tools" aria-label="Acciones de actividad">'+
          '<button type="button" class="btn btn-outline btn-small" data-tobe-move="'+id+'" title="Mover tarjeta por el mapa">Mover</button>'+
          '<button type="button" class="btn btn-outline btn-small" data-tobe-connect="'+id+'" data-tobe-kind="normal" title="Selecciona después la actividad de destino">Conectar</button>'+
          (decision?'<button type="button" class="btn btn-outline btn-small" data-tobe-connect="'+id+'" data-tobe-kind="exception" title="Conectar ruta NO">Ruta NO</button>':'')+
          (item.isAddition?'<button type="button" class="btn btn-outline btn-small" data-tobe-discard-added="'+id+'" title="Descartar sólo esta actividad nueva">Eliminar</button>':
           '<button type="button" class="btn btn-outline btn-small" data-tobe-remove-original="'+id+'" title="Retirar sólo del proceso futuro, sin alterar el AS-IS">Retirar</button>')+
          '</div>':'');
    }
    return '<div class="process-graph-cell" style="left:'+x+'px;top:'+y+
      'px" data-graph-node="'+attr(n.id)+'">'+content+'</div>';
  }).join('');
  const routes=graph.edges.some(x=>x.label==='NO')?
    '<div class="process-graph-legend"><span class="legend-main"><i></i>Ruta SÍ / principal</span><span class="legend-alt"><i></i>Ruta NO / alternativa</span></div>':'';
  return '<div class="tobe-canvas-viewport" aria-label="Editor de posiciones y rutas del proceso futuro">'+
    '<div class="flow-canvas process-graph-canvas tobe-process-canvas">'+routes+
    '<div class="process-graph-board tobe-free-board" style="width:'+boardWidth+
      'px;height:'+boardHeight+'px" data-graph-edges="'+attr(JSON.stringify(graph.edges))+
      '" data-graph-branches="'+attr(JSON.stringify(graph.branchLayouts))+'">'+
    '<svg class="process-graph-lines" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>'+
    cells+'</div></div></div>'+
    ((p.items||[]).some(it=>it.transformation==='Se elimina')?
      '<div class="tobe-removed-list"><b>Actividades originales propuestas para eliminar (AS-IS conservado)</b>'+
      p.items.filter(it=>it.transformation==='Se elimina').map(it=>
        '<button type="button" class="btn btn-outline" data-tobe-select="'+attr(it.sourceStepId)+'">'+
        esc(tobeFlowItemName(it))+'</button>').join('')+'</div>':'');
}
// [AUNEA-FE-PG11-FREE-CANVAS-248] END
// [AUNEA-FE-PG11-READABLE-CODES-209] START — display-only translation for inherited source codes.
function tobeSourceDataExplanation(raw){
  const dictionary={EMAIL:'Correo electrónico',PDF:'Documento PDF',
    DOC:'Documento',RECORD:'Registro'};
  const codes=String(raw||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!codes.length||!codes.every(x=>Object.prototype.hasOwnProperty.call(dictionary,x)))return '';
  return '<p class="tobe-data-explanation">Significado de los códigos: '+
    esc(codes.map(x=>dictionary[x]).join(' · '))+
    '. Esta explicación no modifica los datos.</p>';
}
// [AUNEA-FE-PG11-READABLE-CODES-209] END
function tobeInspectorHtml(e,p){
  const item=tobeSelectedItem(e,p),editable=tobeEditable(p);
  if(!item)return '<div class="notice warn">No hay actividades TO-BE vinculadas al AS-IS.</div>';
  const allItems=[...(p.items||[]),...tobeAddedSteps(p)],
    itemIndex=allItems.findIndex(x=>tobeFlowItemId(x)===tobeFlowItemId(item)),
    nextItem=itemIndex>=0?allItems[itemIndex+1]:null,
    previousItem=itemIndex>0?allItems[itemIndex-1]:null;
  const choice=tobeHumanReviewRecord(e,p)?.decisions?.[String(item.sourceStepId)];
  const hasCurrentAi=typeof internalAiSavedDraft==='function'&&
    internalAiSavedDraft(e)?.items?.some(x=>String(x.source_step_id)===String(item.sourceStepId));
  const pendingKey=editable&&!item.isAddition&&typeof internalAiPilotKey==='function'?
    internalAiPilotKey(e):null;
  const hasPendingAi=!!pendingKey&&typeof internalAiPendingSteps==='function'&&
    !!internalAiPendingSteps(e,pendingKey)?.items?.has(String(item.sourceStepId));
  const adviceOpen=editable&&!item.isAddition&&(hasCurrentAi||hasPendingAi)&&
    !['ACCEPT','MODIFY','DISCARD'].includes(choice?.status);
  // Keep an expanded execution-data group open across rerenders for this step.
  const previousExecution=typeof document!=='undefined'?
    document.getElementById?.('tobeExecutionFields'):null;
  // A newly added TO-BE-only activity has no own IA proposal and must expose
  // its required execution data immediately, even if it links to an analyzed AS-IS step.
  const executionOpen=item.isAddition||!hasCurrentAi||!!(previousExecution?.open&&
    previousExecution.dataset?.sourceStepId===String(item.sourceStepId));
  const withAi=(key,html)=>tobeWithAiHint(e,p,item,key,html);
  const statusField='<div class="field"><label for="tobe_'+attr(item.id)+'_transformation">Qué cambia</label>'+
    (editable?auneaSelectControl('tobe_'+item.id+'_transformation',TOBE_TRANSFORMATIONS.map(v=>({value:v,label:v})),
      item.transformation||'',{extra:'data-tobe-item="'+attr(item.id)+'" data-tobe-field="transformation"',placeholder:'Selecciona una transformación'}):
      '<input value="'+attr(item.transformation||'Sin definir')+'" disabled>')+'</div>';
  const supportingInformation=
    '<section class="tobe-origin" id="tobeStepOrigin"><details class="tobe-subdetails"'+
      (hasCurrentAi?'':' open')+'><summary class="aunea-ui-section-title">03.1 · Entender el AS-IS</summary>'+
      tobeOriginalStepFacts(e,item)+tobeSnapshotIssueCards(e,item)+'</details></section>'+
    '<section class="tobe-advice" id="tobeStepAdvice" aria-label="Sugerencia IA para actividad">'+
      '<details class="tobe-subdetails" open><summary class="aunea-ui-section-title">03.2 · Revisar propuestas IA</summary>'+
      (editable&&!item.isAddition?'<div class="tobe-ai-per-step-action"><button type="button" class="btn btn-primary" data-tobe-generate-selected="'+attr(item.sourceStepId)+'">'+
        (hasCurrentAi?'Volver a analizar este paso':'Analizar este paso con IA')+'</button>'+
        '<span class="tobe-muted">Análisis independiente de esta actividad; no aplica cambios automáticamente.</span></div>':'')+
      '<p id="tobeStepAiProgress" role="status" aria-live="polite" class="tobe-muted">Propuesta individual: sin aprobar.</p>'+
      (typeof internalAiProgressHtml==='function'?internalAiProgressHtml(e,'steps'):'')+
      '<div id="tobeGlobalLinkedStep">'+tobeGlobalLinkedStepHtml(e,p,item)+'</div>'+
      '<div id="tobeAiRecommendation">'+tobeAiAdviceHtml(e,item,false)+'</div>'+
      (!item.isAddition&&hasCurrentAi?
        '<details class="tobe-human-review-shell"'+(choice?.status?'':' open')+'>'+
          '<summary>Decisión del consultor · '+esc(TOBE_HUMAN_LABELS[choice?.status]||'Pendiente')+'</summary>'+
          tobeHumanReviewHtml(e,item,false)+'</details>':'')+
      '</details></section>';
  return '<header class="tobe-inspector-head"><div><span class="tobe-eyebrow">'+
      (item.isAddition?'ACTIVIDAD NUEVA · VINCULADA A AS-IS':'ACTIVIDAD SELECCIONADA · ORIGEN AS-IS')+
      '</span><h2>'+(itemIndex>=0?'P'+(itemIndex+1)+' · ':'')+esc(tobeFlowItemName(item))+'</h2>'+
      (item.isAddition?'<p class="tobe-muted">Origen confirmado: '+esc(item.sourceStepName)+
        ' · Esta actividad existe sólo en el borrador TO-BE.</p>':'')+
      '</div><div class="tobe-inspector-navigation"><span class="tobe-selected-status">'+
        esc(item.transformation||'Sin definir')+'</span>'+
        (previousItem?'<button type="button" class="btn btn-outline btn-small" data-tobe-select="'+
          attr(tobeFlowItemId(previousItem))+'">Anterior</button>':'')+
        (nextItem?'<button type="button" class="btn btn-outline btn-small" data-tobe-select="'+
          attr(tobeFlowItemId(nextItem))+'">Siguiente actividad</button>':'')+
      '</div></header>'+
    '<nav class="tobe-review-steps" aria-label="Orden de revisión">'+
      '<button type="button" class="btn btn-outline btn-small" data-tobe-jump="tobeStepOrigin">03.1 · Entender el AS-IS</button>'+
      '<button type="button" class="btn btn-outline btn-small" data-tobe-jump="tobeStepAdvice">03.2 · Revisar propuestas IA</button>'+
      '<button type="button" class="btn btn-outline btn-small" data-tobe-jump="tobeStepDesign">03.3 · Configurar la actividad futura</button>'+

    '</nav>'+supportingInformation+
    '<section class="tobe-edit" id="tobeStepDesign"><h3 class="aunea-ui-section-title">03.3 · Configurar la actividad futura</h3>'+
      '<p class="tobe-muted" data-tobe-transformation-message="1" role="status" aria-live="polite">Elige «Qué cambia» y completa la justificación del diseño futuro. La recomendación IA no cambia tu decisión automáticamente.</p>'+
      '<p class="tobe-muted">Revisa primero la propuesta en 03.2. En cada campo, «Aplicar IA» copia un candidato autorizado, «Mantener» rechaza ese cambio y «Editar» modifica directamente tu TO-BE. Sin candidato IA sólo se ofrece Editar.</p>'+
      tobeAiOperationalContextHtml(e,item)+
      tobeAiFieldCoverageHtml(e,p,item)+
      (item.transformation==='Se mantiene'&&/^(no|n\/a|ninguno)$/i.test(String(item.problemResolved||'').trim())?
        '<p class="notice warn"><b>Justificación pendiente:</b> «Se mantiene» conserva esta actividad sin rediseño. El valor «NO» no explica por qué se mantienen los hallazgos ni cómo se controlan; revisa la decisión antes de validar.</p>':'')+
      '<div class="form-grid">'+
      (item.isAddition?tobeField(item,'stepName','Nombre de actividad futura',item.stepName,'text',!editable):'')+
      (item.isAddition?'<div class="field"><label>Tipo de actividad futura</label>'+
        (editable?auneaSelectControl('tobeStepType_'+item.id,
          [{value:'ST02',label:'Actividad operativa'},{value:'ST04',label:'Decisión · rutas SÍ / NO'}],
          item.stepType||'ST02',{extra:'data-tobe-item="'+attr(item.id)+'" data-tobe-field="stepType"',
            placeholder:'Selecciona tipo'}):
          '<input disabled value="'+attr(item.stepType==='ST04'?'Decisión · rutas SÍ / NO':'Actividad operativa')+'">')+
        '<p class="field-help">Actividad operativa: ejecuta trabajo. Decisión: requiere rutas SÍ y NO.</p></div>':'')+
      withAi('transformation',statusField)+
      withAi('problemResolved',tobeField(item,'problemResolved',
        tobeTransformationRationaleLabel(item.transformation),
        item.problemResolved,'textarea',!editable))+
      withAi('automationAi',tobeField(item,'automationAi','Automatización e IA',item.automationAi,'textarea',!editable))+
      withAi('humanSupervision',tobeField(item,'humanSupervision','Supervisión humana',item.humanSupervision,'textarea',!editable))+
      withAi('controlsRisk',tobeField(item,'controlsRisk','Control / riesgo',item.controlsRisk,'textarea',!editable))+
      '</div>'+
      '<details class="tobe-execution-fields" id="tobeExecutionFields"'+
        ' data-source-step-id="'+attr(item.sourceStepId)+'"'+(executionOpen?' open':'')+'>'+
        '<summary>Recursos y datos de ejecución <span class="tobe-muted">· Responsable, herramientas, entradas y salidas (4 campos)</span></summary>'+
        '<div class="form-grid">'+
          withAi('futureActor',tobeCatalogField(item,'futureActor','Responsable futuro','OS_ACTOR_ROLE',!editable))+
          withAi('tool',tobeCatalogField(item,'tool','Herramienta / arquitectura','OS_TOOL_CATEGORY',!editable))+
          '<div class="tobe-data-pair">'+withAi('inputs',tobeArtifactField(item,'inputs','Datos de entrada',!editable))+'</div>'+
          '<div class="tobe-data-pair">'+withAi('outputs',tobeArtifactField(item,'outputs','Datos de salida',!editable))+'</div>'+
        '</div>'+
      '</details>'+
      tobeDecisionReadoutHtml(e,p,item)+
      ''+
      '<details class="tobe-subdetails"><summary>Tiempo futuro y supuesto trazable (si existe)</summary>'+
      '<div class="form-grid">'+tobeField(item,'futureTime','Tiempo futuro',item.futureTime,'text',!editable)+
      tobeField(item,'futureTimeAssumption','Supuesto trazable',item.futureTimeAssumption,'textarea',!editable)+
      '</div></details>'+
      '<div class="tobe-guided-field-actions">'+
        (editable?'<button type="button" class="btn btn-outline" data-tobe-guided-save="1">Guardar borrador</button>':'')+
        '<button type="button" class="btn btn-outline" data-tobe-guided-check="1">Comprobar requisitos</button>'+
        (nextItem?'<button type="button" class="btn btn-primary" data-tobe-select="'+
          attr(tobeFlowItemId(nextItem))+'">Siguiente actividad</button>':'')+
      '</div></section>'+
      tobeFlowInspector(e,p,item)+
    (item.isAddition&&editable?'<button type="button" class="btn btn-outline" data-tobe-discard-added="'+attr(item.id)+'">Descartar actividad añadida</button>':'');
}
function createNextTobeVersion(e){
  const previous=latestTobe(e),snap=confirmedSnapshot(e);
  if(!previous||previous.status==='DRAFT'||!snap||previous.sourceSnapshotVersion!==snap.version)return false;
  const h=tobeHistory(e),version=h.length+1;
  const items=previous.items.map((it,i)=>({...it,id:'TOBE-'+version+'-'+(i+1)}));
  h.push({version,status:'DRAFT',sourceSnapshotVersion:snap.version,createdAt:now(),
    updatedAt:now(),items,flow:JSON.parse(JSON.stringify(tobeFlowOwner(e,previous)))});
  __auneaTobeSelection={engagementId:'',version:0,stepId:''};
  markDirty('Nueva versión TO-BE '+version+' desde versión revisada '+previous.version);
  return true;
}
// [AUNEA-FE-PG11-CONTEXT-289] START — compact PG11 read-only source projection.
// Read the sealed Contact snapshot first. DF016 is a Contact reference or OTHER,
// not a printable label: never expose a CRM id as the person's name.
// This remains display-only (no writes, new owners, or AS-IS mutations).
function tobeContextProcessOwnerLabel(snap,raw,e){
  const ref=String(raw??'').trim();
  if(!ref)return 'No consta';
  if(ref==='OTHER')return String(snap?.answerDetails?.DF016||'').trim()||
    'Rol del responsable no especificado';
  if(ref==='UNKNOWN')return 'Responsable pendiente de confirmar';
  const historical=(snap?.contacts||[]).find(ct=>String(ct.id)===ref);
  const live=typeof contactById==='function'?contactById(ref):null;
  const companyId=String(snap?.company?.id||e?.companyId||'');
  const owner=historical||(live&&companyId&&String(live.companyId)===companyId?live:null);
  if(owner){
    const name=typeof contactFullName==='function'?contactFullName(owner):
      ([owner.firstName,owner.lastName].filter(Boolean).join(' ').trim()||owner.name||'');
    const readable=String(name||'').trim();
    if(!readable||readable===ref)return 'Contacto sin nombre disponible';
    const role=String(owner.role||'').trim();
    return readable+(role?' · '+role:'');
  }
  // Historical free-text roles remain readable; ID-shaped references do not.
  return /^[A-Za-zÀ-ÿ][-A-Za-zÀ-ÿ\s/,.()]{1,119}$/.test(ref)?
    ref:'Referencia de contacto no resuelta';
}

// SOURCE: confirmed AS-IS snapshot / Simulator CANONICAL v1.14 PG11; DEC-050/052/055.
// Only existing DF fields are projected; no second owner, derived target or client re-ask.
function tobeContextOverviewHtml(e,p){
  const snap=tobeProposalSnapshot(e,p),answers=snap?.answers||{};
  const fieldById=id=>(schema?.fields||[]).find(f=>f.Field_ID===id)||{Field_ID:id,Option_Set_ID:null};
  const display=id=>{
    const raw=answers[id];
    if(raw===null||raw===undefined||raw===''||(Array.isArray(raw)&&!raw.length))return 'No consta';
    if(id==='DF016')return tobeContextProcessOwnerLabel(snap,raw,e);
    const field=fieldById(id);
    const readable=typeof formatContextValue==='function'?formatContextValue(field,raw):
      (Array.isArray(raw)?raw.map(x=>String(x)).join(' · '):String(raw));
    return String(readable||'No consta');
  };
  const line=(label,value)=>'<div class="tobe-context-fact"><dt>'+esc(label)+
    '</dt><dd>'+esc(value||'No consta')+'</dd></div>';
  const primary=[
    ['Inicio del proceso',display(answers.DF014?'DF014':'DF012')],
    ['Fin del proceso',display(answers.DF015?'DF015':'DF013')],
    ['Objetivo declarado',display('DF008')],
    ['Resultado deseado',display('DF086')]
  ];
  const secondary=[
    ['Criterios de éxito','DF009'],
    ['Responsable del proceso','DF016'],
    ['Restricciones iniciales','DF010'],
    ['Elementos que deben mantenerse','DF087'],
    ['Qué no debe automatizarse','DF088'],
    ['Aprobaciones humanas obligatorias','DF075'],
    ['Preferencias o límites de plataforma','DF089'],
    ['Seguridad y acceso','DF090'],
    ['Adopción y cambio','DF091'],
    ['Contexto de presupuesto (si se declaró)','DF092']
  ];
  const process=String(snap?.processName||answers.DF011||'Proceso sin nombre confirmado');
  const company=String(snap?.company?.name||'Empresa no consignada en el snapshot');
  const diagnostic=diagnosticOutputFreshness(e).label;
  const status={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',
    PUBLISHED:'Publicado'}[p?.status]||'Pendiente';
  return '<section class="tobe-context" aria-label="Información general del proceso">'+
    '<div class="tobe-context-head"><div><span class="tobe-eyebrow">01 · INFORMACIÓN GENERAL</span>'+
    '<h2 class="aunea-ui-section-title">'+esc(process)+'</h2><p class="aunea-ui-section-caption">'+esc(company)+
    ' · Origen AS-IS confirmado v'+esc(snap?.version||p?.sourceSnapshotVersion||'—')+
    ' · '+esc((snap?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED').length)+' actividades</p></div>'+
    '<span class="tobe-context-status">'+esc(status)+'</span></div>'+
    '<div class="tobe-context-diagnostic"><strong>Diagnóstico oficial</strong>'+
    '<p>'+esc(diagnostic)+' · Información histórica confirmada, sólo lectura.</p></div>'+
    '<dl class="tobe-context-facts">'+primary.map(([label,value])=>line(label,value)).join('')+'</dl>'+
    '<details class="tobe-context-details"><summary>Consultar criterios y restricciones del cliente</summary>'+
    '<dl class="tobe-context-facts tobe-context-facts-secondary">'+
    secondary.map(([label,id])=>line(label,display(id))).join('')+'</dl>'+
    '<p>Los valores proceden de la captura confirmada. Se revisan en sus páginas de origen, no se modifican aquí.</p>'+
    '</details></section>';
}
// [AUNEA-FE-PG11-CONTEXT-289] END

// [AUNEA-FE-PG11-GLOBAL-OVERVIEW-284] START — read-only, version-bound global IA.
// SOURCE: Simulator CANONICAL v1.14 PG11; DEC-050/052/055; existing AUNEA System controls.
// The global source and per-step view share ONE version/snapshot/diagnosis gate.
// All links below are derived from the confirmed AS-IS, not from live edits.
function tobeGlobalStored(e,p){
  const entry=p?.aiGlobal,diag=typeof currentDiagnosticOutput==='function'?
    currentDiagnosticOutput(e):null;
  if(!e||!p||!entry||entry.tobeVersion!==p.version||
     entry.sourceSnapshotVersion!==p.sourceSnapshotVersion||
     entry.diagnosticInputHash!==diag?.input_snapshot_hash||
     entry.result?.status!=='DRAFT'||entry.result.engagement_id!==e.id||
     entry.result.snapshot_version!==p.sourceSnapshotVersion)return null;
  const preflight=typeof internalAiGlobalWorking==='function'&&
    internalAiGlobalWorking(e)&&
    typeof internalAiGlobalMessage==='function'&&
    internalAiGlobalMessage(e)?.phase==='PREFLIGHT';
  return preflight?null:entry.result;
}
function tobeGlobalSourceIdsForStep(e,p,sourceId){
  const id=String(sourceId||''),ids=new Set(id?[id]:[]),
    snapshot=typeof tobeProposalSnapshot==='function'?tobeProposalSnapshot(e,p):null;
  // Friction and risk relations come from the confirmed snapshot only.
  for(const friction of snapshot?.frictions||[]){
    if(friction?.status==='SUPERSEDED')continue;
    const affected=friction.affected_steps||friction.step_ids||[];
    if(Array.isArray(affected)&&affected.map(String).includes(id)&&friction.id)
      ids.add(String(friction.id));
  }
  for(const risk of snapshot?.risks||[]){
    if(risk?.status==='SUPERSEDED')continue;
    const affected=risk.step_ids||[];
    if(Array.isArray(affected)&&affected.map(String).includes(id)&&(risk.id||risk.risk_id))
      ids.add(String(risk.id||risk.risk_id));
  }
  return ids;
}
function tobeGlobalLinksForStep(e,p,item){
  if(!item||item.isAddition)return [];
  const result=tobeGlobalStored(e,p),sources=tobeGlobalSourceIdsForStep(e,p,item.sourceStepId);
  return (result?.opportunities||[]).flatMap((recommendation,index)=>{
    const refs=[...(recommendation.source_refs||[]),
      ...(recommendation.related||[]).flatMap(x=>x.source_refs||[])];
    return refs.some(id=>sources.has(String(id)))?[{recommendation,index:index+1}]:[];
  });
}
function tobeGlobalLinkedStepHtml(e,p,item){
  const linked=tobeGlobalLinksForStep(e,p,item),result=tobeGlobalStored(e,p);
  if(!result||!linked.length)return '';
  const complete=result.complete!==false;
  const progress=result.progress||{},
    done=Number.isInteger(progress.completed)?progress.completed:
      Array.isArray(progress.focus_done)?progress.focus_done.length:null,
    total=Number.isInteger(progress.total)?progress.total:null,
    scope=done!==null&&total!==null?' ('+done+' de '+total+' fuentes verificadas)':'';
  return '<details class="tobe-subdetails tobe-global-step-context">'+
    '<summary>Recomendaciones del análisis global vinculadas · '+linked.length+'</summary>'+
    (!complete?'<p class="notice warn">El análisis global por fuentes de la sección 02 está incompleto'+scope+'. La cobertura de actividades analizadas por IA en la sección 03 es independiente.</p>':'')+
    '<ul class="tobe-source-list">'+linked.map(({recommendation:r,index})=>
      '<li><b>'+index+' · '+esc(r.objective)+'</b>'+
      '<p>'+esc(r.how)+'</p>'+
      (r.review?.status==='INCOMPATIBLE'?
        '<p><b>Incompatibilidad detectada:</b> '+esc(r.review.reason||'Pendiente de revisión.')+'</p>':
        '<p><b>Viabilidad pendiente:</b> '+esc(r.review?.reason||'Requiere comprobación.')+'</p>')+
      (r.alternative?'<p><b>Alternativa propuesta:</b> '+esc(r.alternative.how)+'</p>':'')+
      '<p><b>Referencias de origen:</b> '+
        esc([...(r.source_refs||[]),...(r.related||[]).flatMap(x=>x.source_refs||[])]
          .filter((x,i,a)=>a.indexOf(x)===i).join(' · '))+'</p></li>').join('')+
    '</ul><p class="tobe-muted">Contexto de solo lectura. Estas propuestas no sustituyen '+
    'el análisis individual, ni aplican cambios o decisiones al TO-BE.</p></details>';
}
// Read-only PG11 presentation of client conditions: labels come from the
// CANONICAL diagnostic option sets (or from source-backed backend metadata).
// Business codes/DF ids stay in stored evidence, never become screen labels.
function tobeGlobalHumanConditions(snapshot,review){
  const canonical=typeof schema!=='undefined'?schema:null;
  const answers=snapshot?.answers||{};
  const conditions=Array.isArray(review?.declared_conditions)?
    review.declared_conditions:[];
  const ids=['DF010','DF073','DF075','DF087','DF088','DF089','DF090','DF091','DF092'];
  const visible=[];
  for(const id of ids){
    const field=(canonical?.fields||[]).find(x=>x.Field_ID===id);
    const set=canonical?.option_sets?.[field?.Option_Set_ID];
    const allowed=Array.isArray(set?.options)?set.options:[];
    const raw=answers[id];
    const vals=Array.isArray(raw)?raw:
      (raw===undefined||raw===null||raw===''?[]:[raw]);
    const declarations=conditions.filter(x=>x?.source===id);
    const values=vals.length?vals.map(value=>{
      const code=String(value??'').trim();
      if(!code)return '';
      const option=allowed.find(x=>String(x.value)===code);
      const fromBackend=declarations.find(x=>String(x.value)===code)?.meaning;
      const readable={
        COMPLIANCE:'Cumplimiento legal y normativo',
        OWNERSHIP:'Propiedad y responsabilidad de los datos',
        PLATFORM:'Herramientas y plataformas',
        RBAC:'Acceso según permisos de cada usuario',
        AUDIT_LOG:'Registro de auditoría de las acciones',
        CRM_NATIVE:'Funciones existentes del CRM o ERP',
        FINANCIAL:'Información financiera',
        CONFIDENTIAL:'Información comercial confidencial',
        UNKNOWN:'No especificado',
      };
      // Presentation only: canonical values, meanings and provenance remain intact.
      return String(readable[code]||option?.label||fromBackend||
        (/^[A-Z][A-Z0-9_]{2,}$/.test(code)?
          'Condición registrada pendiente de aclaración':code));
    }).filter(Boolean):
      declarations.map(x=>String(x.meaning||'').trim()).filter(Boolean);
    if(!values.length)continue;
    visible.push({label:String(field?.Pregunta_o_etiqueta_ES||'Condición declarada'),
      values:[...new Set(values)]});
  }
  return visible;
}
function tobeGlobalReadableChecks(rows,property){
  return [...new Set((Array.isArray(rows)?rows:[])
    .map(x=>String(x?.[property]||'').trim()).filter(Boolean))];
}
// Section 02 renders implementation questions per recommendation; repeated
// checks are shown only once for the thematic group. All original evidence,
// option codes, rule traces and IA text remain saved on aiGlobal.result.
function tobeGlobalImplementationQuestions(item){
  return [...new Set([
    ...(item?.review?.verifications||[]).map(x=>String(x?.question||'').trim()),
    ...(item?.review?.operational_checks||[]).map(x=>String(x?.question||'').trim())
  ].filter(Boolean))];
}
function tobeGlobalSharedQuestions(group,globallyShared=[]){
  const sets=(group?.entries||[]).map(({item})=>tobeGlobalImplementationQuestions(item));
  const global=new Set(globallyShared);
  return sets.length>1?
    sets[0].filter(q=>!global.has(q)&&sets.slice(1).every(values=>values.includes(q))):[];
}
function tobeGlobalSpecificQuestions(group,item,globallyShared=[]){
  const shared=new Set([...tobeGlobalSharedQuestions(group,globallyShared),...globallyShared]);
  return tobeGlobalImplementationQuestions(item).filter(q=>!shared.has(q));
}
// PG11 section 02: separate business objective, option, evidence and conditions.
// Identical questions/alerts shared by all sources are rendered only once.
// These helpers are projections: they never edit the confirmed snapshot or IA output.
function tobeGlobalUniversalQuestions(opportunities){
  const sets=(opportunities||[]).map(tobeGlobalImplementationQuestions);
  return sets.length>1?sets[0].filter(q=>sets.slice(1).every(other=>other.includes(q))):[];
}
function tobeGlobalGroupWarnings(group){
  return [...new Set((group?.entries||[]).flatMap(entry=>entry.issues||[])
    .map(x=>String(x||'').trim()).filter(Boolean))];
}
function tobeGlobalOptionWarnings(group,entry){
  const repeated=new Set((group?.entries||[]).length>1?
    tobeGlobalGroupWarnings(group).filter(q=>group.entries.every(e=>(e.issues||[]).includes(q))):[]);
  return (entry?.issues||[]).filter(q=>!repeated.has(q));
}
function tobeGlobalReadableProposal(item,steps){
  const original=String(item?.how||'');
  const linked=Array.isArray(steps)?steps:[];
  return original.replace(/\bP\d+\b/g,()=>{
    const name=linked.length===1?String(linked[0]?.sourceStepName||'').trim():'';
    return name?'la actividad «'+name+'»':'una actividad vinculada del proceso';
  });
}
// Mirror the PG11 backend's conservative, punctuation-neutral completeness
// heuristic. A full sentence may legitimately be returned without a full stop.
function tobeGlobalTextIsComplete(value){
  if(typeof value!=='string')return false;
  const text=value.trim();
  if(!text)return false;
  if(/[.!?…]["'”’)\]]*$/.test(text))return true;
  if(text.split(/\s+/).length<4||/[,;:/\\-]$/.test(text))return false;
  for(const [opening,closing] of [['(',')'],['[',']'],['«','»']]){
    if(text.split(opening).length!==text.split(closing).length)return false;
  }
  const words=text.match(/[\p{L}\p{N}]+/gu)||[];
  if(!words.length)return false;
  const last=words[words.length-1];
  const normalized=last.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dangling=new Set(
    ('a al ante bajo con contra de del desde durante en entre hacia hasta '+
     'mediante para por segun sin sobre tras y e o u que quien quienes cuyo '+
     'cuya cuyos cuyas el la los las un una unos unas lo le les se su sus '+
     'mi mis tu tus este esta estos estas ese esa esos esas otro otra otros '+
     'otras cada como cuando donde mientras aunque porque si no').split(' '));
  // Same bounded fragment check as the backend; not semantic certification.
  if(last===last.toLowerCase()&&['term','clie'].includes(normalized))return false;
  if(dangling.has(normalized)||last.length===1)return false;
  if(last.length===2&&last!==last.toUpperCase())return false;
  return true;
}
function tobeGlobalOverviewHtml(e,p){
  const working=typeof internalAiGlobalWorking==='function'&&internalAiGlobalWorking(e),
    feedback=typeof internalAiGlobalMessage==='function'?internalAiGlobalMessage(e):null,
    preflight=working&&feedback?.phase==='PREFLIGHT',
    result=tobeGlobalStored(e,p),
    complete=!!result&&Array.isArray(result.opportunities)&&
      [result.summary,...result.opportunities.flatMap(item=>[
        item.how,item.why,...(item.related||[]).flatMap(x=>[x.how,x.why]),
        ...(item.alternative?[item.alternative.how,item.alternative.why]:[])])]
        .every(value=>tobeGlobalTextIsComplete(value)),
    legacy=!!result&&!complete,
    opportunities=Array.isArray(result?.opportunities)?result.opportunities:[],
    progress=result?.progress||null,
    analysisFinished=result?.complete!==false,
    successful=progress?.focus_done?.length??progress?.completed??0,
    outstanding=Math.max(0,(progress?.total||0)-successful),
    retryable=!!result&&result.complete===false&&outstanding>0&&Array.isArray(progress?.focus_done),
    incompatible=opportunities.filter(x=>x.review?.status==='INCOMPATIBLE').length,
    alternatives=opportunities.filter(x=>!!x.alternative).length,
    pending=opportunities.filter(x=>x.review?.status!=='INCOMPATIBLE').length,
    variants=opportunities.reduce((n,x)=>n+(x.related||[]).length,0),
    qualityPlan=typeof tobeGlobalQualityGroups==='function'?
      tobeGlobalQualityGroups(opportunities):null,
    thematicGroups=qualityPlan?.groups||
      opportunities.map((item,index)=>({title:item.objective,
        entries:[{item,index,issues:[]}],expectedOutcome:'Por verificar.',
        technicalChecks:[],evidenceRefs:item.source_refs||[]}));
  const source=tobeProposalSourceSteps(e,p),
    confirmed=typeof tobeProposalSnapshot==='function'?tobeProposalSnapshot(e,p):null,
    record=confirmed||{frictions:[],risks:[]};
  const refs=ids=>(ids||[]).map(id=>{
    const step=source.find(s=>String(s.id)===String(id)),
      friction=(record?.frictions||[]).find(f=>String(f.id)===String(id)&&f.status!=='SUPERSEDED'),
      risk=(record?.risks||[]).find(r=>String(r.id||r.risk_id)===String(id)&&r.status!=='SUPERSEDED');
    if(friction){
      const measures=[],freq=friction.frequency,
        effort=friction.active_time_loss,wait=friction.wait_time_loss,
        attribution=friction.time_attribution?.mode,
        timing=attribution==='INCLUDED'?'ya incluido en el paso':
          attribution==='BREAKDOWN'?'desglose del retrabajo':
          attribution==='ADDITIONAL'?'adicional atribuido':'atribución por comprobar';
      if(freq?.value!==undefined&&freq?.value!==null&&
         String(freq.mode||'').toLowerCase()==='percent')
        measures.push('Frecuencia '+freq.value+' %');
      if(effort?.value!==undefined&&effort?.value!==null&&Number(effort.value)>0)
        measures.push('Trabajo '+effort.value+' '+(effort.unit||'unidad sin especificar')+' ('+timing+')');
      if(wait?.value!==undefined&&wait?.value!==null&&Number(wait.value)>0)
        measures.push('Espera '+wait.value+' '+(wait.unit||'unidad sin especificar'));
      const provenance=typeof evidenceTypeBackend==='function'?
        evidenceTypeBackend(friction.evidence_type):({
          EV01:'MEASURED',EV02:'CLIENT_DECLARED',
          EV03:'AUNEA_ESTIMATE',EV04:'HYPOTHESIS',EV05:'SPECIFIC_BENCHMARK'
        })[friction.evidence_type]||friction.evidence_type;
      const provenanceLabel=({
        MEASURED:'Dato medido',CLIENT_DECLARED:'Declarado por el cliente',
        AUNEA_ESTIMATE:'Estimación de AUNEA',HYPOTHESIS:'Hipótesis',
        SPECIFIC_BENCHMARK:'Referencia comparable'
      })[provenance]||'Procedencia pendiente de confirmar';
      return 'Fricción: '+(friction.client_label||'Fricción confirmada sin descripción')+
        (measures.length?' · '+measures.join(' · '):'')+
        (friction.evidence_type?' · Origen: '+provenanceLabel:' · Origen: no especificado');
    }
    return step?'Paso: '+(step.step_name||step.name||'Actividad confirmada sin nombre'):
      risk?'Riesgo: '+(risk.description||'Riesgo confirmado sin descripción'):
        'Referencia de origen sin descripción disponible en el AS-IS';
  });
  const completeCards=opportunities.filter(item=>
    [item.how,item.why,...(item.related||[]).flatMap(x=>[x.how,x.why]),
      ...(item.alternative?[item.alternative.how,item.alternative.why]:[])]
      .every(value=>tobeGlobalTextIsComplete(value))).length,
    decisions=typeof tobeHumanReviewRecord==='function'?
      Object.values(tobeHumanReviewRecord(e,p)?.decisions||{})
        .filter(x=>['ACCEPT','MODIFY','DISCARD'].includes(x?.status)).length:0;
  const linkedSteps=rec=>{
    const refs=new Set([...(rec.source_refs||[]),
      ...(rec.related||[]).flatMap(x=>x.source_refs||[])].map(String));
    return (p?.items||[]).filter(item=>
      [...tobeGlobalSourceIdsForStep(e,p,item.sourceStepId)].some(id=>refs.has(id)));
  };
  const groupSteps=group=>{
    const targets=group.entries.flatMap(({item})=>linkedSteps(item));
    return [...new Map(targets.map(step=>[String(step.sourceStepId),step])).values()];
  };
  const globallyShared=tobeGlobalUniversalQuestions(opportunities);
  const state=working?'Analizando por fuentes…':result&&!analysisFinished?'Análisis parcial · Revisar':legacy?'Propuesta incompleta · Reanalizar':result?'Propuesta guardada · Sin aprobar':'Pendiente de análisis';
  return '<section class="tobe-global-analysis" id="tobeGlobalAnalysis" aria-label="Análisis global IA del proceso">'+
    '<header class="tobe-global-analysis-head"><div><span class="tobe-eyebrow">02 · ANÁLISIS IA GLOBAL DEL PROCESO</span>'+
      '<h2 class="aunea-ui-section-title">Objetivos y recomendaciones de mejora</h2>'+
      '<p>Primero, qué mejorar en el conjunto del proceso y cómo conseguirlo. Las decisiones sobre cada actividad se realizan después.</p></div>'+
      (tobeEditable(p)?'<div class="tobe-global-head-actions">'+
        (retryable?'<button type="button" class="btn btn-outline" id="retryTobeGlobal"'+
          (working?' disabled aria-busy="true"':'')+'>Reintentar fuentes pendientes</button>':'')+
        '<button type="button" class="btn btn-primary" id="analyzeTobeGlobal"'+
        (working?' disabled aria-busy="true"':'')+'>'+
        (working?'Analizando proceso…':result||legacy?'Volver a analizar':'Analizar proceso con IA')+
        '</button></div>':'')+'</header>'+
    '<div class="tobe-global-summary"><div class="tobe-global-summary-top">'+
      '<strong>'+(working?'Analizando proceso…':legacy?'Análisis anterior incompleto':result?'Síntesis del proceso':'Análisis pendiente')+'</strong>'+
      '<span class="tobe-global-state" aria-live="polite">'+esc(state)+'</span></div>'+
      '<p>'+esc(preflight?'Comprobando que el backend admite el análisis por bloques. No se ha borrado ninguna propuesta.':working&&!result?'Se ha retirado el análisis anterior. Preparando una propuesta nueva con el AS-IS confirmado…':result?.summary||'No hay una propuesta global vigente. Analiza el AS-IS confirmado para generar nuevos objetivos y recomendaciones; no se alterarán campos del TO-BE.')+'</p></div>'+
    (opportunities.length?'<p class="tobe-global-feedback">Consolidación de propuestas: '+
      opportunities.length+' intervenciones registradas (candidatas a consolidación) · '+incompatible+
      ' incompatibilidades detectadas · '+alternatives+' alternativas sugeridas · '+
      pending+' intervenciones por verificar'+
      (variants?' · '+variants+' variantes relacionadas conservadas':'')+
      (qualityPlan?' · '+thematicGroups.length+' líneas relacionadas para revisión':'')+
      '. Ninguna equivale a aprobación del consultor.</p>':'')+
    (opportunities.length&&tobeGlobalHumanConditions(record,opportunities[0]?.review).length?
      '<details class="tobe-global-detail tobe-global-client-conditions">'+
        '<summary>Condiciones del cliente confirmadas en el AS-IS ('+
        tobeGlobalHumanConditions(record,opportunities[0]?.review).length+')</summary>'+
        '<ul class="tobe-source-list">'+tobeGlobalHumanConditions(record,opportunities[0]?.review)
          .map(c=>'<li><b>'+esc(c.label)+':</b> '+esc(c.values.join(' · '))+'</li>')
          .join('')+'</ul>'+
        '<p class="tobe-muted">Estas condiciones afectan al conjunto del análisis. '+
        'Las incompatibilidades de cada intervención se muestran en su propia tarjeta.</p>'+
      '</details>':'')+
    (typeof internalAiProgressHtml==='function'?internalAiProgressHtml(e,'global'):'')+
    (progress?'<div class="tobe-global-progress" role="status" aria-live="polite">'+
      '<p><b>Generación:</b> Fuentes revisadas: '+successful+' de '+progress.total+
        (outstanding?' · Pendientes: '+outstanding:'')+
        (progress.failed?' · Incidencias: '+progress.failed:'')+
        (analysisFinished&&!outstanding?' · Análisis de fuentes completado':
          ' · Resultado parcial; no aprobar todavía')+'</p>'+
      '<p><b>Integridad:</b> '+completeCards+' de '+opportunities.length+
        ' recomendaciones con texto completo'+
        (legacy?' · Existen frases incompletas: conservar y reanalizar.':
          ' · Sin cortes detectados.')+'</p>'+
      '<p><b>Coherencia (revisión pendiente):</b> '+
        (qualityPlan?qualityPlan.reviewCount+' alertas de reglas y '+
          (qualityPlan.operationalReviewCount||0)+' intervenciones con comprobación operativa pendiente'+
          (qualityPlan.operationalNotEvaluated?' · '+qualityPlan.operationalNotEvaluated+
            ' sin evaluación operativa registrada (análisis anterior)':'')+
          ', de '+opportunities.length+' intervenciones.':
          'Sin comprobar.')+'</p>'+
      '<p><b>Revisión humana:</b> '+decisions+
        ' decisiones sobre actividades registradas; propuestas globales sin aprobar.</p>'+
      '</div>':'')+
    (opportunities.length?'<p class="tobe-global-caution">Priorización pendiente: contrastar impacto, evidencias y dependencias con el consultor. El orden visual no es una prioridad aprobada.</p>':'')+
    (!progress&&qualityPlan?'<p class="tobe-global-feedback"><b>Coherencia (revisión pendiente):</b> '+
      qualityPlan.reviewCount+' alertas de reglas y '+
        (qualityPlan.operationalReviewCount||0)+' intervenciones con comprobación operativa pendiente. '+
        (qualityPlan.operationalNotEvaluated?qualityPlan.operationalNotEvaluated+
          ' sin evaluación operativa registrada; vuelve a analizar para obtenerla. ':'')+
        'Ninguna recomendación está aprobada.</p>':'')+
    (progress?.failures?.length?'<details class="tobe-global-detail"><summary>Fuentes pendientes e incidencias</summary>'+
      '<p>'+esc(progress.failures.map(x=>x.source_id+': '+x.reason).join(' · '))+
      '</p></details>':'')+
    (feedback?'<p class="tobe-global-feedback'+(feedback.type==='warn'?' is-warning':'')+
      '" role="status" aria-live="polite">'+esc(feedback.message)+'</p>':'')+
    (opportunities.length&&globallyShared.length?
      '<details class="tobe-global-universal-checks"><summary>Requisitos de implantación compartidos por todas las propuestas ('+
      globallyShared.length+')</summary><ul class="tobe-source-list">'+globallyShared
        .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
    (opportunities.length?'<div class="tobe-global-opportunities" aria-label="Objetivos y recomendaciones">'+
      thematicGroups.map((group,i)=>
      '<article class="tobe-global-opportunity"><span class="tobe-global-number" aria-hidden="true">'+(i+1)+'</span>'+
      '<div class="tobe-global-opportunity-body">'+
      '<div class="tobe-global-goal-block">'+
        '<span class="tobe-global-item-label">'+(group.entries.length>1?'Línea de mejora':'Objetivo de mejora')+'</span>'+
        '<h3 class="tobe-global-goal">'+esc(group.title)+'</h3>'+
        '<p class="tobe-global-goal-meta">'+group.entries.length+
          (group.entries.length===1?' propuesta IA pendiente de revisión':' propuestas IA por comparar, sin seleccionar')+'</p>'+
      '</div>'+
      '<div class="tobe-global-brief-grid">'+
        '<div class="tobe-global-brief-result"><span class="tobe-global-kicker">RESULTADO QUE SE BUSCA</span>'+
          '<p>'+esc(group.expectedOutcome||'Resultado por definir a partir de la evidencia.')+'</p></div>'+
        '<div class="tobe-global-brief-status"><span class="tobe-global-kicker">VIABILIDAD</span>'+
          '<p>'+esc(group.incompatible?
            'Existe una incompatibilidad confirmada: no aplicar la propuesta afectada.':
            group.entries.some(x=>x.item?.review?.status==='CONDITIONED')?
              'Condicionada: hace falta comprobar sus capacidades y restricciones.':
              'Pendiente de evaluación. No aprobada.')+'</p></div>'+
      '</div>'+
      (group.entries.length===1&&group.entries[0]?.item?.how?
        '<div class="tobe-global-single-proposal"><span class="tobe-global-kicker">PROPUESTA DE LA IA</span>'+
        '<p>'+esc(tobeGlobalReadableProposal(group.entries[0].item,groupSteps(group)))+'</p></div>':'')+
      (group.entries.length>1?
        '<p class="tobe-global-variants-lead">Las propuestas persiguen una misma mejora. Abrir la comparación para comprobar si son alternativas o pueden combinarse.</p>':'')+
      (tobeGlobalGroupWarnings(group).length?
        '<details class="tobe-global-group-warnings"><summary>Observaciones de calidad ('+
          tobeGlobalGroupWarnings(group).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalGroupWarnings(group).map(q=>
            '<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
      (groupSteps(group).length?'<div class="tobe-global-review-links">'+
        '<span class="tobe-global-review-label">Revisar en actividades:</span>'+
        '<div class="tobe-global-review-actions">'+groupSteps(group).map(step=>
          '<button type="button" class="btn btn-outline btn-small" '+
          'data-tobe-select="'+attr(String(step.sourceStepId))+'" data-tobe-global-link="1">'+
          esc(step.sourceStepName||step.stepName||String(step.sourceStepId))+
          '</button>').join('')+'</div></div>':'')+
      '<details class="tobe-global-card-details"><summary>Comparar propuestas y consultar evidencias'+
        ' ('+group.entries.length+')</summary><div class="tobe-global-card-detail-body">'+
      group.entries.map(({item,issues},j)=>
      '<section class="tobe-global-intervention">'+
      '<div class="tobe-global-option-head">'+
        '<h4 class="tobe-global-option-title">Propuesta '+(j+1)+' de '+group.entries.length+'</h4>'+
        '<span class="tobe-global-option-state">'+
          esc(item.review?.status==='INCOMPATIBLE'?'Incompatible · revisar alternativa':
            'Pendiente de validar')+'</span>'+
      '</div>'+
      '<p class="tobe-global-option-action">'+
        esc(tobeGlobalReadableProposal(item,linkedSteps(item)))+'</p>'+
      (tobeGlobalOptionWarnings(group,{issues}).length?
        '<div class="tobe-global-option-caveat"><b>Qué hay que cuestionar</b><ul>'+
          tobeGlobalOptionWarnings(group,{issues}).map(q=>'<li>'+esc(q)+'</li>').join('')+
        '</ul></div>':'')+
      (item.alternative?'<p class="tobe-global-action"><b>Alternativa propuesta:</b> '+
        esc(item.alternative.how)+'</p>':
        item.alternative_note?'<p class="tobe-global-assessment">'+
          esc(item.alternative_note)+'</p>':'')+
      '<div class="tobe-global-option-evidence">'+
        '<div><span class="tobe-global-kicker">POR QUÉ SE PROPONE</span>'+
          '<p>'+esc(item.why)+'</p></div>'+
        '<div><span class="tobe-global-kicker">EVIDENCIA DEL AS-IS</span>'+
          '<p>'+esc(refs(item.source_refs).join(' · ')||'No consta una fuente legible')+'</p></div>'+
      '</div>'+
      '<details class="tobe-global-option-more"><summary>Consultar objetivo, incompatibilidades y comprobaciones</summary>'+
        '<div class="tobe-global-detail">'+
      '<p><b>Objetivo original:</b> '+esc(item.objective)+'</p>'+
      (item.review?.status==='INCOMPATIBLE'?
        '<p><b>Evaluación:</b> Incompatibilidad confirmada: no aplicar sin corregir la propuesta.</p>':'')+
      (item.alternative?'<p><b>Alternativa:</b> Mantenerla como posibilidad pendiente de evaluación; no se aplica automáticamente.</p>':'')+
      ((item.related||[]).length?'<p><b>Enfoques relacionados (sin descartar):</b></p>'+
        '<ul class="tobe-source-list">'+item.related.map(other=>
          '<li><b>'+esc(other.objective)+':</b> '+esc(other.how)+
          ' <small>Motivo: '+esc(other.why)+' · Fuentes: '+
          esc(refs(other.source_refs).join(' · '))+'</small></li>').join('')+
        '</ul>':'')+
      (item.review?.conflicts?.length?
        '<p><b>Incompatibilidad detectada:</b> '+
          esc(tobeGlobalReadableChecks(item.review.conflicts,'reason').join(' · '))+'</p>':'')+
      (item.alternative?.source_refs?.length?
        '<p><b>Evidencia de la alternativa:</b> '+
          esc(refs(item.alternative.source_refs).join(' · '))+'</p>':'')+
      (tobeGlobalSpecificQuestions(group,item,globallyShared).length?
        '<details class="tobe-global-evidence-detail">'+
          '<summary>Qué debe comprobarse para esta intervención ('+
            tobeGlobalSpecificQuestions(group,item,globallyShared).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalSpecificQuestions(group,item,globallyShared)
            .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul>'+
        '</details>':'')+
      '</div></details></section>').join('')+
      (tobeGlobalSharedQuestions(group,globallyShared).length?
        '<details class="tobe-global-shared-checks"><summary>Comprobaciones compartidas por estas propuestas ('+
          tobeGlobalSharedQuestions(group,globallyShared).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalSharedQuestions(group,globallyShared)
            .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
      '</div></details></div></article>').join('')+'</div>':
      result?'<p class="tobe-global-empty">'+
        (analysisFinished&&outstanding===0?
          'No se han identificado mejoras justificadas en las fuentes completadas. Revisa la evidencia antes de cerrar.':
          'Análisis parcial: quedan fuentes por revisar. Aún no se puede concluir que no existan otras mejoras.')+
        '</p>':'')+
    (legacy?'<p class="tobe-global-feedback is-warning" role="status">La salida anterior contiene una frase que puede estar incompleta. Se muestra íntegra tal como la devolvió Ollama. Regenera antes de aprobar.</p>':'')+
    '<p class="tobe-global-caution">Propuesta sin aprobar. Contrasta las cifras con las referencias del AS-IS confirmado; no son promesas de ahorro ni tiempos futuros. La revisión humana sigue siendo obligatoria.</p>'+
    '</section>';
}
// [AUNEA-FE-PG11-GLOBAL-OVERVIEW-284] END

// [AUNEA-FE-PG11-GUIDED-NAV-266] START — navigation derives from selected owner.
function tobeGuidedNavHtml(e,p){
  const guidedItems=[...(p.items||[]),...tobeAddedSteps(p)],
    focused=tobeSelectedItem(e,p),selectedId=tobeFlowItemId(focused),
    focusedIndex=Math.max(0,guidedItems.findIndex(x=>tobeFlowItemId(x)===selectedId));
  const modeButton=(mode,label)=>'<button type="button" class="btn '+
    (__auneaTobeMode===mode?'btn-primary':'btn-outline')+
    '" data-tobe-mode-switch="'+mode+'" aria-pressed="'+String(__auneaTobeMode===mode)+'">'+label+'</button>';
  return '<nav class="tobe-guided-nav" aria-label="Navegación del diseño TO-BE">'+
    '<div class="tobe-guided-modes">'+modeButton('guided','Revisión por actividad')+
    modeButton('map','Mapa TO-BE')+'</div>'+
    '<div class="tobe-guided-tabs" aria-label="Actividades del proceso">'+
    guidedItems.map((step,i)=>'<button type="button" class="btn btn-outline btn-small '+
      (tobeFlowItemId(step)===selectedId?'is-selected':'')+'" data-tobe-select="'+
      attr(tobeFlowItemId(step))+'" aria-pressed="'+String(tobeFlowItemId(step)===selectedId)+'">'+
      '<b>P'+(i+1)+'</b> '+esc(tobeFlowItemName(step).split(/\s+/).slice(0,3).join(' '))+
      '</button>').join('')+'</div>'+
    '<div class="tobe-guided-switch"><span class="tobe-muted">Actividad '+
      (focusedIndex+1)+' de '+guidedItems.length+'</span>'+ 
    '</div></nav>';}
// [AUNEA-FE-PG11-GUIDED-NAV-266] END
function tobePage(){
  const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap)return pageTop('Diseño TO-BE','Necesita un AS-IS confirmado.',
    '<button class="btn" data-page="diagnostico">Volver al AS-IS</button>')+
    '<div class="notice warn">Confirma el cierre del AS-IS antes de diseñar el proceso futuro.</div>';
  if(!currentDiagnosticOutput(e))return pageTop('TO-BE preliminar',
    'Vista de orientación para preparar el diseño futuro; todavía no es un proceso propuesto ni una recomendación aprobada.',
    '<button class="btn btn-primary" data-page="resultados">Volver a revisión del AS-IS</button>')+
    section('Para qué sirve esta vista','Antes de diseñar, revisa el alcance de la transformación y las necesidades detectadas.',
      '<div class="notice info"><b>Qué puedes hacer ahora</b><p>Consultar problemas vinculados al AS-IS y vías de intervención pendientes de validar; no son pasos futuros aprobados.</p>'+
      '<p><b>Qué falta para diseñar:</b> revisar y confirmar las cinco decisiones técnicas internas desde PG10 y obtener la recomendación oficial vigente del backend.</p>'+
      '<p><b>Qué no sucede aquí:</b> no se modifican datos del AS-IS, no se crea ni aprueba un TO-BE y no se calculan ahorros o precios futuros.</p></div>')+
    section('Problemas de origen','Referencias AS-IS para orientar el diseño. No se editan aquí.',asisPointCardsHtml(asisAnalysisSource(e)))+
    section('Vías de intervención pendientes de validar','Opciones de análisis, no alternativas seleccionadas.',asisDirectionCardsHtml(e))+
    '<div class="notice warn">La edición y aprobación de un TO-BE definitivo requiere la recomendación oficial vigente. Regresa a PG10 para revisar las decisiones técnicas y comprobar requisitos.</div>';const p=latestTobe(e);
  if(!p)return pageTop('Diseño TO-BE','El proceso futuro parte del AS-IS confirmado.',
    '<button class="btn btn-primary" id="createTobeDraft">Crear borrador desde AS-IS confirmado</button>')+
    section('Fuente confirmada','El diseño comienza como propuesta sin aprobar.',
      '<div class="notice info">AS-IS confirmado v'+esc(snap.version)+
      '. El diagnóstico oficial se reutiliza; no se vuelve a capturar.</div>');
  const editable=tobeEditable(p),statusLabel={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'}[p.status]||p.status;
  const previousAudit=typeof document!=='undefined'?document.getElementById('tobeAiWorkspace'):null,
    keepAuditOpen=!!previousAudit?.open&&
      previousAudit.dataset?.engagementId===String(e.id)&&
      previousAudit.dataset?.tobeVersion===String(p.version);
  const actions='<button class="btn" data-page="resultados">Volver al diagnóstico</button>'+
    (['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status)?'<button class="btn" data-page="comparacion">Ir a comparación PG12</button>':'')+
    (editable?'<button class="btn" id="saveTobe">Guardar borrador</button>':'')+
    (editable?'<button class="btn btn-primary" id="advanceTobe">Marcar como revisado</button>':
      p.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceTobe">Aprobar para cliente</button>':'')+
    (!editable&&p.status!=='PUBLISHED'?'<button class="btn" id="newTobeVersion">Crear nueva versión</button>':'');
  const review=tobeHumanReviewRecord(e,p),reviewed=p.items.filter(it=>
    ['ACCEPT','MODIFY','DISCARD'].includes(review?.decisions?.[String(it.sourceStepId)]?.status)).length;
  const savedAi=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null,
    pendingAi=!savedAi&&typeof internalAiPendingSteps==='function'&&
      typeof internalAiPilotKey==='function'?internalAiPendingSteps(e,internalAiPilotKey(e)):null,
    pastAi=!savedAi&&!pendingAi?.items?.size&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null,
    activeItem=tobeSelectedItem(e,p),
    itemId=String(activeItem?.sourceStepId||''),
    itemAi=savedAi?.items?.find(x=>String(x.source_step_id)===itemId)||
      pendingAi?.items?.get(itemId)||pastAi?.proposal?.items?.find(x=>String(x.source_step_id)===itemId),
    proposedCount=itemAi?TOBE_AI_REVIEW_FIELDS.filter(([source])=>{
      const v=String(itemAi[source]??'').trim();
      return !!v&&!['no','n/a','ninguno','sin definir','pendiente','—'].includes(v.toLowerCase());
    }).length:0,
    pendingSteps=pendingAi?.items?.size?p.items.filter(step=>
      !pendingAi.items.has(String(step.sourceStepId))):[],
    pendingStepNames=pendingSteps.map(step=>step.sourceStepName||step.stepName||String(step.sourceStepId)),
    aiSummaryTitle=savedAi?'Propuesta IA vigente':
      pendingAi?.items?.size?'IA generada en '+(p.items.length-pendingSteps.length)+' de '+p.items.length+' pasos'+
      (pendingSteps.length?' · '+pendingSteps.length+(pendingSteps.length===1?' pendiente':' pendientes'):''):
      pastAi?'Propuesta IA histórica · v'+pastAi.version:'Sin propuesta IA vigente',
    aiSummaryDescription=savedAi?
      'Esta actividad contiene '+proposedCount+' campos sugeridos de 9. Revisa la IA antes de aplicar.':
      pendingAi?.items?.size?'En esta actividad: '+proposedCount+' de 9 campos con valor propuesto.'+
      (pendingStepNames.length?' '+(pendingStepNames.length===1?'Paso pendiente de analizar: ':'Pasos pendientes de analizar: ')+pendingStepNames.join(' · ')+'.':''):
      pastAi?'La IA anterior propone '+proposedCount+' de 9 campos para esta actividad; son de consulta, no aplicables en v'+p.version+'.':
      'Analiza la actividad para obtener valores IA concretos sin modificar el AS-IS.';
  return pageTop('Diseño TO-BE','Versión '+p.version+' · '+statusLabel+
    ' · Origen AS-IS v'+esc(p.sourceSnapshotVersion)+'. Las decisiones pertenecen al consultor.',actions)+
    '<main class="tobe-workspace" data-tobe-version="'+p.version+
    '" data-tobe-mode="'+attr(__auneaTobeMode)+'">'+
      '<section class="tobe-task-guide" aria-label="Qué hacer en Diseño TO-BE">'+
        '<div class="tobe-task-guide-intro"><div><h2>Qué tienes que hacer aquí</h2>'+
          '<p>Diseña cómo funcionará el proceso en el futuro. Revisa una actividad cada vez; el AS-IS original no se modifica.</p></div>'+
          '<span class="tobe-task-guide-progress">'+reviewed+' de '+p.items.length+' pasos revisados por el consultor</span></div>'+
        '<div class="tobe-ia-guide-summary" role="status"><strong>'+esc(aiSummaryTitle)+'</strong>'+
          '<p>'+esc(aiSummaryDescription)+'</p></div>'+
        '<div class="tobe-task-guide-steps">'+
          '<span><b>03.1 · Entender el AS-IS</b></span>'+ 
          '<span><b>03.2 · Revisar propuestas IA</b></span>'+ 
          '<span><b>03.3 · Configurar la actividad futura</b></span>'+ 
          '<span><b>03.4 · Conectar el proceso futuro</b> (sólo en Mapa TO-BE)</span></div>'+ 
        '<p class="tobe-task-guide-result"><b>Resultado esperado:</b> un mapa TO-BE con actividades, responsables, datos y rutas definidos. Guarda el borrador, pulsa «Comprobar requisitos» y, cuando no existan bloqueos, «Marcar como revisado». Después podrás comparar AS-IS y TO-BE en PG12.</p>'+
      '</section>'+
      tobeContextOverviewHtml(e,p)+
      tobeGlobalOverviewHtml(e,p)+
      '<header class="tobe-review-section-head"><span class="tobe-eyebrow">03 · DISEÑO TO-BE</span>'+ 
        '<h2 class="aunea-ui-section-title">Revisión por actividad</h2>'+ 
        '<p class="aunea-ui-section-caption">Revisa el origen, la recomendación IA, los campos y las conexiones del proceso futuro.</p></header>'+
      tobeGuidedNavHtml(e,p)+
      '<section class="tobe-map-area"><header class="tobe-workspace-head"><div><span class="tobe-eyebrow">CONSTRUIR EL PROCESO FUTURO</span>'+
      '<h2>Mapa del proceso propuesto</h2></div><p>Selecciona una actividad para revisar su transformación y editar el TO-BE.</p></header>'+
      (editable?'<div class="tobe-flow-actions"><button type="button" class="btn btn-outline" id="addTobeStep">Añadir actividad vinculada al AS-IS</button>'+
        
        '<span class="tobe-muted">Selecciona una tarjeta para revisarla y arrástrala para moverla. Para conectar, pulsa «Conectar» o «Ruta NO» y selecciona el destino. «Retirar» sólo cambia el TO-BE.</span>'+
        '<span id="tobeFlowModeStatus" role="status" aria-live="polite"></span></div>':'')+
      tobeCanvasHtml(e,p)+
      '<div class="tobe-flow-start field"><label>Inicio del proceso futuro</label>'+
        (editable?auneaSelectControl('tobeFlowStart',tobeFutureSteps(e,p).map(x=>({value:String(x.id),label:x.step_name})),
          tobeFlowOwner(e,p).startStepId,{extra:'data-tobe-flow-start="1"',placeholder:'Selecciona actividad inicial'}):
          '<input disabled value="'+attr(tobeFutureSteps(e,p).find(x=>String(x.id)===tobeFlowOwner(e,p).startStepId)?.step_name||'Pendiente')+'">')+
      '<p class="field-help">Indica la actividad de inicio del TO-BE. El AS-IS no se modifica.</p></div>'+
      '<p class="tobe-map-note"><b>Rutas del TO-BE:</b> comienzan como copia del AS-IS confirmado, pero pueden rediseñarse en el inspector. Los pasos incorporados o eliminados sólo pertenecen a la versión TO-BE. Una ruta pendiente, desconectada o sin final bloquea la revisión.</p></section>'+
      '<section id="tobeInspector" class="tobe-inspector" aria-label="Decisión TO-BE por actividad">'+tobeInspectorHtml(e,p)+'</section>'+
      (editable?'<details class="tobe-ai-stage" id="tobeAiWorkspace" data-engagement-id="'+attr(e.id)+
        '" data-tobe-version="'+attr(p.version)+'"'+(keepAuditOpen?' open':'')+'>'+
        '<summary><strong class="aunea-ui-aux-heading">Auditoría IA · Detalle técnico (opcional)</strong>'+
        '<span class="tobe-muted">Opcional: consulta el detalle completo. Revisa cada propuesta desde el inspector de su actividad.</span></summary>'+
        '<div id="tobeAiMount"></div></details>':'')+
      '<section class="tobe-completion"><div><h2 class="aunea-ui-section-title">04 · Validación global</h2><p class="aunea-ui-section-caption">Vista rápida del estado y acciones pendientes. El detalle técnico sigue disponible.</p></div>'+
        '<button type="button" class="btn btn-outline" id="checkTobeReadiness">Comprobar requisitos</button>'+
        '<div id="tobeReadinessStatus" role="status" aria-live="polite"></div>'+
        tobeCoherencePanel(e,p)+'</section>'+
      '</main>';
}
// [AUNEA-FE-PG11-WORKSPACE-205] END
function comparable(v){return v===null||v===undefined||v===''?'No disponible con evidencia suficiente':String(v)}
function stepMetric(step,key){return step?.[key]??step?.[key.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())]??''}
// [AUNEA-FE-PG12-TOBE-GRAPH-234] START — source-aligned visual comparison of the two
// process graphs. Derived read-only; never estimates future savings or mutates PG11.
// SOURCE: Simulator CANONICAL PG12; DEC-034/050/052/055.
let __auneaPg12View='comparison';
let __auneaPg12SelectedSource='';
function tobeComparisonDetail(e,p,sourceId){
  const source=tobeProposalSourceSteps(e,p),item=tobeFlowItem(e,p,sourceId),
    original=source.find(x=>String(x.id)===String(item?.sourceStepId));
  if(!item)return '<p class="tobe-muted">Selecciona una actividad en los mapas para comprobar qué cambia y por qué.</p>';
  const removed=item.transformation==='Se elimina',added=!!item.isAddition;
  const label=added?'Actividad incorporada':removed?'Actividad propuesta para eliminar':'Actividad transformada';
  return '<div class="pg12-difference-detail">'+
    '<span class="tobe-eyebrow">'+label+'</span>'+
    '<h3>'+esc(tobeFlowItemName(item))+'</h3>'+
    '<p><b>Origen AS-IS:</b> '+esc(original?.step_name||item.sourceStepName||'Sin correspondencia')+'</p>'+
    '<p><b>Decisión TO-BE:</b> '+esc(item.transformation||'Pendiente')+'</p>'+
    '<p><b>Qué cambia y por qué:</b> '+esc(item.problemResolved||'No documentado')+'</p>'+
    '<p><b>Responsable futuro:</b> '+esc(removed?'Actividad eliminada':(labelFrom('OS_ACTOR_ROLE',item.futureActor)||comparable(item.futureActor)))+'</p>'+
    '<p><b>Herramienta futura:</b> '+esc(removed?'Actividad eliminada':(labelFrom('OS_TOOL_CATEGORY',item.tool)||comparable(item.tool)))+'</p>'+
    '<p><b>Entradas futuras:</b> '+esc(removed?'Actividad eliminada':tobeArtifactDisplay(item.inputs,item._details?.inputs))+'</p>'+
    '<p><b>Salidas futuras:</b> '+esc(removed?'Actividad eliminada':tobeArtifactDisplay(item.outputs,item._details?.outputs))+'</p>'+
    '<p><b>Automatización e IA:</b> '+esc(comparable(item.automationAi))+'</p>'+
    '<p><b>Supervisión humana:</b> '+esc(comparable(item.humanSupervision))+'</p>'+
    '<p><b>Control / riesgo:</b> '+esc(comparable(item.controlsRisk))+'</p>'+
    '<p class="tobe-muted">Los tiempos futuros y beneficios económicos no se infieren del estado de transformación.</p>'+
  '</div>';
}
function tobeComparisonPage(){
  const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null,p=latestTobe(e);
  if(!snap||!p||!['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status))
    return pageTop('AS-IS vs TO-BE','La comparación reutiliza las fuentes versionadas; no captura datos nuevos.',
      '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
      '<div class="empty"><h2>TO-BE revisado requerido</h2><p>La comparación se habilita cuando el TO-BE ha pasado revisión humana.</p></div>';
  const source=(e.confirmedSnapshots||[]).find(s=>s.version===p.sourceSnapshotVersion)||snap,
    asis=(source.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    future=[...p.items,...tobeAddedSteps(p)],originalById=new Map(asis.map(x=>[String(x.id),x]));
  const options=[['actual','Actual'],['proposed','Propuesto'],['comparison','Comparación']];
  const selector='<nav class="pg12-view-selector" aria-label="Vista de comparación">'+options.map(([value,label])=>
    '<button type="button" data-pg12-view="'+value+'" class="btn '+(__auneaPg12View===value?'btn-primary':'btn-outline')+
    '" aria-pressed="'+(__auneaPg12View===value?'true':'false')+'">'+label+'</button>').join('')+'</nav>';
  const rows=future.map(it=>{
    const orig=originalById.get(String(it.sourceStepId)),isAdded=!!it.isAddition;
    return '<tr><td>'+esc(tobeFlowItemName(it))+'</td>'+
      '<td>'+esc(isAdded?'No existe':comparable(stepMetric(orig,'actor')))+'</td>'+
      '<td>'+esc(it.transformation==='Se elimina'?'Actividad eliminada':comparable(it.futureActor))+'</td>'+
      '<td>'+esc(isAdded?'No existe':comparable(stepMetric(orig,'tool')))+'</td>'+
      '<td>'+esc(it.transformation==='Se elimina'?'No aplica':comparable(it.tool))+'</td>'+
      '<td>'+esc(isAdded?'Se incorpora':it.transformation||'—')+'</td>'+
      '<td>'+esc(comparable(it.automationAi))+'</td>'+
      '<td>'+esc(comparable(it.humanSupervision))+'</td>'+
      '<td>'+esc(comparable(it.controlsRisk))+'</td></tr>';
  }).join('');
  const fr=(source.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
    baseline={...e,processSteps:asis,frictions:fr,risks:source.risks||[],
      economicInputs:source.economicInputs||[]};
  const start=typeof processBoundaryValue==='function'?
    processBoundaryValue(e,'DF014','Inicio del proceso','DF012'):'Inicio del proceso';
  const end=typeof processBoundaryValue==='function'?
    processBoundaryValue(e,'DF015','Fin del proceso','DF013'):'Fin del proceso';
  const currentMap=typeof processGraphHtml==='function'?
    processGraphHtml(baseline,asis,fr,start,end,'cliente',true).replace(
      /data-graph-node="([^"]+)"/g,(match,id)=>String(id).startsWith('__')?match:
        match+' data-pg12-source="'+attr(id)+'" tabindex="0" role="button"'):
    '<p class="notice warn">El componente AS-IS no está disponible.</p>';
  const futureMap=tobeCanvasHtml(e,p).replace(/data-tobe-select="/g,'data-pg12-source="');
  const maps='<div class="pg12-process-comparison '+(__auneaPg12View==='comparison'?'pg12-side-by-side':'')+'">'+
    (__auneaPg12View!=='proposed'?'<section class="pg12-map" aria-label="Proceso actual AS-IS"><h3>Actual · AS-IS confirmado</h3>'+
      '<div class="pg12-map-viewport">'+currentMap+'</div></section>':'')+
    (__auneaPg12View!=='actual'?'<section class="pg12-map" aria-label="Proceso futuro TO-BE"><h3>Propuesto · TO-BE revisado</h3>'+
      futureMap+'</section>':'')+'</div>';
  const selected=__auneaPg12SelectedSource||String(p.items[0]?.sourceStepId||'');
  const diagnostic=currentDiagnosticOutput(e),pt=diagnostic?.process_time_projection||null;
  const metrics='<div class="grid g3"><div class="notice"><b>Impacto activo cuantificado AS-IS</b><br>'+
    (pt?.annual_active_hours!=null?num(pt.annual_active_hours)+' h/año':'No disponible con evidencia suficiente')+
    '<small>Proyección AS-IS, sin hipótesis futura.</small></div><div class="notice"><b>Espera anual AS-IS</b><br>'+
    (pt?.annual_wait_exposure_hours!=null?num(pt.annual_wait_exposure_hours)+' caso-horas/año':'No disponible con evidencia suficiente')+
    '<small>Exposición a espera, no trabajo activo.</small></div><div class="notice"><b>Retrabajo AS-IS</b><br>'+
    (pt?.annual_rework_hours!=null?num(pt.annual_rework_hours)+' h/año':'No disponible con evidencia suficiente')+
    '<small>TO-BE sin cifra comparable aprobada.</small></div><div class="notice"><b>Capacidad liberada</b><br>No disponible con evidencia suficiente</div>'+
    '<div class="notice"><b>Ahorro de caja</b><br>No disponible con evidencia suficiente</div>'+
    '<div class="notice"><b>Riesgo residual futuro</b><br>No disponible con evidencia suficiente</div></div>';
  return pageTop('AS-IS vs TO-BE','Versión AS-IS '+esc(source.version)+' · TO-BE v'+esc(p.version)+
    '. Comparación derivada de fuentes revisadas; ninguna métrica económica se calcula en el navegador.',
    '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
    section('Visualización del cambio','Actual | Propuesto | Comparación, manteniendo la correspondencia entre actividades.',
      selector+maps+
      '<section class="pg12-selected-detail" id="pg12SelectedDetail" aria-live="polite">'+
      tobeComparisonDetail(e,p,selected)+'</section>')+
    section('Qué cambia','Incluye actividades originales, eliminadas e incorporadas, con su correspondencia al AS-IS.',
      '<div class="table-wrap"><table class="data-table"><thead><tr>'+
      '<th>Paso</th><th>Actor actual</th><th>Actor propuesto</th>'+
      '<th>Herramienta actual</th><th>Herramienta propuesta</th><th>Transformación</th>'+
      '<th>Automatización / IA</th><th>Intervención humana</th><th>Control</th>'+
      '</tr></thead><tbody>'+rows+'</tbody></table></div>')+
    section('Métricas comparables','Se muestran sólo outputs del backend. Ninguna mejora futura se deduce de la etiqueta TO-BE.',metrics);
}
// [AUNEA-FE-PG12-TOBE-GRAPH-234] END

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

function registerInternalWorkPages(){
  if(typeof pages==='undefined'||registerInternalWorkPages.done)return;
  registerInternalWorkPages.done=true;
  pages.revision=outputReviewPage;
  pages.tobe=tobePage;
  pages.comparacion=tobeComparisonPage;
  // [AUNEA-FE-PG11-REMAINING-CTA-295] START — local button must work in guided inspector.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-tobe-generate-all-remaining]');
    if(!button||state.activePage!=='tobe')return;
    event.preventDefault();
    event.stopImmediatePropagation(); // exactly one PG11 generator dispatch
    if(button.disabled)return;
    const e=currentEng(),p=e?latestTobe(e):null;
    if(!e||!p||!tobeEditable(p))return toast('No hay un borrador TO-BE vigente.');
    if(typeof generateTobeAiPilot!=='function')return toast('El motor IA no está disponible. Recarga PG11.');
    button.textContent='Iniciando análisis pendiente…';
    button.disabled=true;
    const progress=document.getElementById('tobeStepAiProgress');
    if(progress)progress.textContent='Iniciando análisis de las actividades pendientes; se conservarán las ya verificadas…';
    void generateTobeAiPilot(e).catch(error=>{
      console.error('PG11: fallo al iniciar actividades pendientes',error);
      if(progress)progress.textContent='No se pudo iniciar el análisis: '+String(error?.message||error);
      toast('No se pudo iniciar el análisis pendiente. Revisa el estado de Ollama y del backend.');
    }).finally(()=>{
      if(button.isConnected){button.disabled=false;button.textContent='Analizar actividades pendientes';}
    });
  },true);
  // [AUNEA-FE-PG11-REMAINING-CTA-295] END
  // [AUNEA-FE-PG11-DRAFT-CLICK-181] START — Single durable action for creating a read-only-AS-IS-derived DRAFT.
  // SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055. No second data owner, no automatic proposal approval.
  // A delegated click survives UI refreshes and never relies on successful binding of unrelated page controls.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#createTobeDraft');
    if(!button)return;
    event.preventDefault();
    if(button.dataset.working==='1')return;
    button.dataset.working='1';
    button.disabled=true;
    try{
      const engagement=currentEng();
      if(!engagement||!confirmedSnapshot(engagement)){
        toast('No se puede crear el borrador: el AS-IS no está confirmado.');
        return;
      }
      if(engagement.tobeProposals!=null&&!Array.isArray(engagement.tobeProposals)){
        toast('No se puede crear el borrador: el historial TO-BE tiene un formato no reconocido. No se ha modificado el estudio.');
        return;
      }
      // If an earlier click persisted a proposal but failed to repaint the page, do not create a duplicate.
      if(latestTobe(engagement)){
        render();
        toast('Se ha recuperado el borrador TO-BE existente.');
        return;
      }
      const draft=createTobeDraft(engagement);
      if(!draft){
        toast('No se ha creado el borrador. Comprueba la confirmación del AS-IS.');
        return;
      }
      if(!saveState('Crear borrador TO-BE v'+draft.version)){
        toast('El borrador sólo está en memoria. No cambies de página hasta guardarlo.');
        return;
      }
      render();
      toast('Borrador TO-BE v'+draft.version+' creado desde AS-IS confirmado.');
    }catch(error){
      console.error('PG11: error al crear o mostrar el borrador TO-BE',error);
      try{toast('No se ha podido completar la creación del borrador TO-BE. Revisa el error y no vuelvas a confirmar el AS-IS.')}catch(_ignore){}
    }finally{
      button.dataset.working='0';
      button.disabled=false;
    }
  },true);
  // [AUNEA-FE-PG11-DRAFT-CLICK-181] END
  // [AUNEA-FE-PG11-CANVAS-MODE-250] START — separate move from route editing.
  let __auneaTobeLink=null,__auneaTobeMovedClick=false;
  // [AUNEA-FE-PG11-CANVAS-MODE-250] END
  // [AUNEA-FE-PG11-ARTIFACT-OTHER-252] START — match AS-IS Other behavior.
  document.addEventListener('change',event=>{
    const toggle=event.target?.closest?.('.tobe-artifact-field [data-v1-other-toggle]');
    if(!toggle||state.activePage!=='tobe')return;
    const wrap=toggle.closest('.tobe-artifact-field')?.querySelector(
      '[data-v1-other-wrap="'+toggle.dataset.v1OtherToggle+'"]');
    if(!wrap)return;
    wrap.style.display=toggle.checked?'':'none';
    if(!toggle.checked){const detail=wrap.querySelector('input');if(detail)detail.value='';}
  },true);
  document.addEventListener('input',event=>{
    const detail=event.target?.closest?.('.tobe-artifact-field [id$="_detail"]');
    if(!detail||state.activePage!=='tobe')return;
    const toggle=detail.closest('.tobe-artifact-field')?.querySelector('[data-v1-other-toggle]');
    if(toggle){
      toggle.checked=!!detail.value.trim()||toggle.checked;
      toggle.disabled=!!detail.value.trim();
    }
  },true);
  // [AUNEA-FE-PG11-ARTIFACT-OTHER-252] END
  // [AUNEA-FE-PG11-GUIDED-ACTIONS-264] START — UI-only review/map mode
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('[data-tobe-mode-switch]');
    if(!btn||state.activePage!=='tobe')return;
    event.preventDefault();
    const mode=btn.dataset.tobeModeSwitch;
    if(!['guided','map'].includes(mode))return;
    __auneaTobeMode=mode;
    const root=document.querySelector('.tobe-workspace');
    if(root)root.dataset.tobeMode=mode;
    document.querySelectorAll('[data-tobe-mode-switch]').forEach(el=>{
      const active=el.dataset.tobeModeSwitch===mode;
      el.classList.toggle('btn-primary',active);
      el.classList.toggle('btn-outline',!active);
      el.setAttribute('aria-pressed',String(active));
    });
    if(mode==='map'&&typeof drawProcessGraph==='function'&&typeof requestAnimationFrame==='function')
      requestAnimationFrame(drawProcessGraph);
  },true);

  document.addEventListener('click',event=>{
    const save=event.target?.closest?.('[data-tobe-guided-save]');
    const check=event.target?.closest?.('[data-tobe-guided-check]');
    if((!save&&!check)||state.activePage!=='tobe')return;
    event.preventDefault();
    const target=document.getElementById(save?'saveTobe':'checkTobeReadiness');
    if(target)target.click();
    else toast('No está disponible la acción de esta versión TO-BE.');
  },true);
  // [AUNEA-FE-PG11-GUIDED-ACTIONS-264] END
  // [AUNEA-FE-PG11-GUIDED-INSPECTOR-253] START
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-tobe-jump]');
    if(!button||state.activePage!=='tobe')return;
    event.preventDefault();
    const section=document.getElementById(button.dataset.tobeJump);
    const details=section?.querySelector('details.tobe-subdetails');
    if(details)details.open=true;
    section?.scrollIntoView({behavior:'smooth',block:'start'});
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!__auneaTobeLink||state.activePage!=='tobe')return;
    __auneaTobeLink=null;
    document.querySelector('.tobe-free-board')?.classList.remove('tobe-connect-active');
    const status=document.getElementById('tobeFlowModeStatus');
    if(status)status.textContent='Conexión cancelada; el proceso no se ha modificado.';
    toast('Conexión cancelada.');
  },true);
  // [AUNEA-FE-PG11-GUIDED-INSPECTOR-253] END
  // [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] START
  // The canonical select emits change on its hidden owner input. Update only
  // the visible label/help; values remain untouched until explicit save.
  document.addEventListener('change',event=>{
    const target=event.target;
    if(state.activePage!=='tobe'||target?.dataset?.tobeField!=='transformation')return;
    const root=target.closest('.tobe-inspector')||document.getElementById('tobeInspector');
    if(!root)return;
    const value=String(target.value||''),row=root.querySelector('[data-tobe-rationale-wrapper]'),
      label=row?.querySelector('[data-tobe-rationale-label]'),
      textarea=row?.querySelector('[data-tobe-field="problemResolved"]');
    if(label)label.textContent=tobeTransformationRationaleLabel(value);
    if(textarea){
      textarea.placeholder=tobeFieldHelp('problemResolved',{transformation:value});
      // Never rewrite text already typed under the previous transformation.
    }
    const status=root.querySelector('.tobe-selected-status');
    if(status)status.textContent=value||'Sin definir';
    const hint=root.querySelector('[data-tobe-transformation-message]');
    if(hint)hint.textContent=value==='Se mantiene'?
      'Has seleccionado «Se mantiene». Explica por qué no cambias esta actividad y cómo se atienden sus hallazgos. La recomendación IA no se aplica automáticamente.':
      value==='Se elimina'?
      'Has seleccionado «Se elimina». Justifica la retirada y revisa las conexiones afectadas en el mapa TO-BE.':
      value?
      'Has seleccionado «'+value+'». Completa el motivo del cambio y los datos operativos futuros. La recomendación IA sigue pendiente de tu decisión explícita.':
      'Selecciona «Qué cambia» y justifica la decisión antes de revisar.';
    const advice=root.querySelector('[data-tobe-ai-transform]');
    const aiTransform=advice?.dataset?.tobeAiTransform||'';
    const difference=advice?.querySelector('[data-tobe-ai-difference]');
    if(difference){
      const mismatch=!!value&&!!aiTransform&&value!==aiTransform;
      difference.hidden=!mismatch;
      if(mismatch)difference.textContent='La IA propone «'+aiTransform+
        '» y tu diseño indica «'+value+
        '». Decide si aceptar, modificar o descartar; cambiar el selector no aplica la propuesta.';
    }
  },true);
  // [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] END
  // [AUNEA-FE-PG11-SELECT-206] START — retain unsaved consultant data before switching inspector.
  document.addEventListener('click',event=>{
    const selected=event.target?.closest?.('[data-tobe-select]');
    if(!selected||state.activePage!=='tobe')return;
    const e=currentEng(),p=latestTobe(e),sourceId=selected.getAttribute('data-tobe-select');
    if(!e||!p||!tobeFlowItem(e,p,sourceId))return;
    if(__auneaTobeMovedClick){
      event.preventDefault();event.stopImmediatePropagation();
      __auneaTobeMovedClick=false;return;
    }
    if(__auneaTobeLink){
      event.preventDefault();
      const {from,kind}=__auneaTobeLink;
      __auneaTobeLink=null;
      document.querySelector('.tobe-free-board')?.classList.remove('tobe-connect-active');
      if(!tobeEditable(p)||!tobeFlowItem(e,p,from)||from===String(sourceId))
        return toast('Selecciona otra actividad futura válida para conectar.');
      if(!saveTobeFromDom(e)||!saveState('Guardar campos antes de conectar el proceso'))
        return toast('No se guardaron los campos actuales; la ruta no ha cambiado.');
      const live=currentEng(),draft=latestTobe(live),flow=tobeMutableFlow(live,draft),
        previous=JSON.parse(JSON.stringify(flow));
      if(!flow.routes[from])flow.routes[from]={normal:'__PENDING__',exception:''};
      flow.routes[from][kind]=String(sourceId);
      markDirty('Ruta '+kind+' del TO-BE '+from+' hacia '+sourceId);
      if(!saveState('Guardar conexión editada TO-BE')){
        draft.flow=previous;return toast('No se guardó la conexión; se restauró el flujo.');
      }
      render();toast('Conexión guardada. Comprueba las rutas y la coherencia antes de revisar.');
      return;
    }
    event.preventDefault();
    if(tobeEditable(p)&&(!saveTobeFromDom(e)||!saveState('Guardar edición TO-BE antes de cambiar actividad'))){
      toast('No se ha guardado la edición. Mantén la actividad actual abierta.');
      return;
    }
    const fromGlobal=selected.hasAttribute('data-tobe-global-link');
    __auneaTobeSelection={engagementId:e.id,version:p.version,stepId:String(sourceId)};
    const inspector=document.getElementById('tobeInspector');
    const savedEngagement=currentEng(),savedProposal=latestTobe(savedEngagement);
    if(inspector&&savedEngagement&&savedProposal)inspector.innerHTML=tobeInspectorHtml(savedEngagement,savedProposal);
    const navigation=document.querySelector('.tobe-guided-nav');
    if(navigation&&savedEngagement&&savedProposal)
      navigation.outerHTML=tobeGuidedNavHtml(savedEngagement,savedProposal);
    const viewport=document.querySelector('.tobe-canvas-viewport'),
      left=viewport?.scrollLeft||0,top=viewport?.scrollTop||0;
    if(viewport&&savedEngagement&&savedProposal){
      viewport.outerHTML=tobeCanvasHtml(savedEngagement,savedProposal);
      const next=document.querySelector('.tobe-canvas-viewport');
      if(next){next.scrollLeft=left;next.scrollTop=top;}
      if(typeof drawProcessGraph==='function'&&typeof requestAnimationFrame==='function')
        requestAnimationFrame(drawProcessGraph);
    }
    document.querySelectorAll('[data-tobe-select]').forEach(node=>{
      const active=node.getAttribute('data-tobe-select')===String(sourceId);
      node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active));
    });
    // A global card is above the activity inspector. Navigate to the actual
    // review only when this selection originated from a global recommendation.
    if(fromGlobal)document.getElementById('tobeInspector')?.
      scrollIntoView?.({behavior:'smooth',block:'start'});
  },true);
  // [AUNEA-FE-PG11-SELECT-206] END
  // [AUNEA-FE-PG11-FLOW-ACTIONS-229] START — explicit future-only additions and supersession.
  // SOURCE: Simulator CANONICAL PG11, DEC-050/055. Every new activity links to an AS-IS step.
  document.addEventListener('click',event=>{
    const add=event.target?.closest?.('#addTobeStep');
    const discard=event.target?.closest?.('[data-tobe-discard-added]');
    const removeOriginal=event.target?.closest?.('[data-tobe-remove-original]');
    if((!add&&!discard&&!removeOriginal)||state.activePage!=='tobe')return;
    event.preventDefault();
    const e=currentEng(),p=latestTobe(e);
    if(!e||!tobeEditable(p))return;
    if(!saveTobeFromDom(e)||!saveState('Conservar borrador antes de editar flujo TO-BE'))
      return toast('No se guardó el borrador. No se ha modificado el flujo.');
    const live=currentEng(),draft=latestTobe(live),flow=tobeMutableFlow(live,draft);
    if(add){
      const selected=tobeSelectedItem(live,draft),
        source=tobeSourceSteps(live).find(x=>String(x.id)===String(selected?.sourceStepId));
      if(!source)return toast('Selecciona primero una actividad AS-IS como origen de la nueva actividad.');
      const seq=flow.addedSteps.length+1,id='TOBE-ADD-'+draft.version+'-'+seq;
      if(flow.addedSteps.some(x=>x.id===id))return toast('Identificador duplicado; revisa la versión.');
      flow.addedSteps.push({
        id,isAddition:true,sourceStepId:String(source.id),
        sourceStepName:String(source.step_name||source.name||source.id),
        stepName:'',stepType:'ST02',status:'DRAFT',transformation:'',problemResolved:'',
        futureActor:'',tool:'',inputs:'',outputs:'',automationAi:'',
        humanSupervision:'',controlsRisk:'',futureTime:'',futureTimeAssumption:''
      });
      flow.routes[id]={normal:'__PENDING__',exception:''};
      markDirty('Actividad TO-BE incorporada como borrador con origen AS-IS '+source.id);
      if(!saveState('Guardar actividad TO-BE incorporada'))
        return toast('La actividad no se ha guardado. Conserva el estudio abierto.');
      __auneaTobeSelection={engagementId:live.id,version:draft.version,stepId:id};
      render();
      toast('Actividad vinculada al AS-IS. Define nombre, intervención, responsable y rutas.');
      return;
    }
    if(removeOriginal){
      const id=String(removeOriginal.getAttribute('data-tobe-remove-original')||''),
        original=draft.items.find(x=>String(x.sourceStepId)===id);
      if(!original||original.transformation==='Se elimina')
        return toast('La actividad ya está retirada del TO-BE.');
      const previousFlow=JSON.parse(JSON.stringify(flow)),previousTransformation=original.transformation;
      original.transformation='Se elimina';
      // Never invent replacement routes when a confirmed source activity is removed.
      for(const route of Object.values(flow.routes)){
        if(route?.normal===id)route.normal='__PENDING__';
        if(route?.exception===id)route.exception='__PENDING__';
      }
      if(flow.startStepId===id)flow.startStepId=String(draft.items.find(x=>
        x.transformation!=='Se elimina')?.sourceStepId||'');
      markDirty('Retirada de actividad original únicamente del TO-BE '+id);
      if(!saveState('Retirar actividad heredada del proceso futuro')){
        draft.flow=previousFlow;original.transformation=previousTransformation;
        return toast('No se pudo guardar la retirada; se ha recuperado la actividad.');
      }
      __auneaTobeSelection={engagementId:live.id,version:draft.version,stepId:id};
      render();
      toast('Actividad retirada del TO-BE. Permanece en el AS-IS; revisa las conexiones pendientes.');
      return;
    }
    const id=discard?.getAttribute('data-tobe-discard-added'),
      item=flow.addedSteps.find(x=>x.id===id&&x.status!=='SUPERSEDED');
    if(!item)return toast('La actividad ya no se encuentra en el TO-BE.');
    const previousFlow=JSON.parse(JSON.stringify(flow));
    item.status='SUPERSEDED';item.updatedAt=now();
    delete flow.routes[id];
    delete flow.positions?.[id];
    for(const route of Object.values(flow.routes)){
      if(route?.normal===id)route.normal='__PENDING__';
      if(route?.exception===id)route.exception='__PENDING__';
    }
    if(flow.startStepId===id)flow.startStepId=String(draft.items.find(x=>x.transformation!=='Se elimina')?.sourceStepId||'');
    markDirty('Actividad TO-BE incorporada descartada sin borrar el historial');
    if(!saveState('Descartar actividad TO-BE')){
      draft.flow=previousFlow;
      return toast('No se guardó el descarte; se restauró el flujo anterior.');
    }
    const latest=currentEng(),next=latestTobe(latest);
    __auneaTobeSelection={engagementId:latest.id,version:next.version,
      stepId:String(next.items[0]?.sourceStepId||'')};
    render();
    toast('Actividad retirada del flujo futuro. Comprueba sus conexiones entrantes.');
  },true);
  // [AUNEA-FE-PG11-FLOW-ACTIONS-229] END
  // [AUNEA-FE-PG11-FLOW-DRAG-247] START — move free-layout nodes by pointer.
  // Movement changes only flow.positions. Connection changes only flow.routes.
  let tobePointer=null, redrawQueued=false;
  const tobeRedraw=board=>{
    if(redrawQueued||typeof requestAnimationFrame!=='function')return;
    redrawQueued=true;
    requestAnimationFrame(()=>{redrawQueued=false;if(board.isConnected&&typeof drawProcessGraph==='function')drawProcessGraph(board);});
  };
  document.addEventListener('pointerdown',event=>{
    const target=event.target?.closest?.('.tobe-free-board .tobe-graph-node,.tobe-free-board [data-tobe-move]');
    if(!target||state.activePage!=='tobe'||event.button!==0)return;
    if(!tobeEditable(latestTobe(currentEng()))||__auneaTobeLink)return;
    const cell=target.closest('.process-graph-cell'),board=target.closest('.tobe-free-board');
    if(!cell||!board)return;
    const id=String(cell.dataset.graphNode||'');
    if(!tobeFlowItem(currentEng(),latestTobe(currentEng()),id))return;
    tobePointer={id,cell,board,pointerId:event.pointerId,startX:event.clientX,
      startY:event.clientY,x:parseFloat(cell.style.left)||0,y:parseFloat(cell.style.top)||0,moved:false};
  },true);
  document.addEventListener('pointermove',event=>{
    const d=tobePointer;
    if(!d||event.pointerId!==d.pointerId||state.activePage!=='tobe')return;
    const dx=event.clientX-d.startX,dy=event.clientY-d.startY;
    if(!d.moved&&Math.hypot(dx,dy)<5)return;
    d.moved=true;event.preventDefault();
    const x=Math.max(0,Math.min(10000,Math.round(d.x+dx))),
      y=Math.max(0,Math.min(10000,Math.round(d.y+dy)));
    d.cell.style.left=x+'px';d.cell.style.top=y+'px';
    d.cell.classList.add('tobe-move-active');
    d.board.style.width=Math.max(d.board.offsetWidth,x+252)+'px';
    d.board.style.height=Math.max(d.board.offsetHeight,y+320)+'px';
    tobeRedraw(d.board);
  },true);
  document.addEventListener('pointerup',event=>{
    const d=tobePointer;
    if(!d||event.pointerId!==d.pointerId)return;
    tobePointer=null;d.cell.classList.remove('tobe-move-active');
    if(!d.moved)return;
    __auneaTobeMovedClick=true;
    if(typeof setTimeout==='function')setTimeout(()=>{__auneaTobeMovedClick=false;},0);
    const e=currentEng(),p=latestTobe(e);
    if(!e||!tobeEditable(p))return;
    const point={x:parseInt(d.cell.style.left,10),y:parseInt(d.cell.style.top,10)};
    if(!saveTobeFromDom(e)||!saveState('Guardar campos antes de mover actividad')){
      render();return toast('No se guardaron los campos; el movimiento no se ha confirmado.');
    }
    const live=currentEng(),draft=latestTobe(live),flow=tobeMutableFlow(live,draft),
      previous=JSON.parse(JSON.stringify(flow));
    flow.positions[d.id]=point;
    markDirty('Posición de actividad TO-BE '+d.id);
    if(!saveState('Guardar posición visual TO-BE')){
      draft.flow=previous;render();
      return toast('No se guardó la nueva posición; se restauró la anterior.');
    }
    const viewport=document.querySelector('.tobe-canvas-viewport');
    const left=viewport?.scrollLeft||0,top=viewport?.scrollTop||0;
    render();
    const restored=document.querySelector('.tobe-canvas-viewport');
    if(restored){restored.scrollLeft=left;restored.scrollTop=top;}
    if(typeof drawProcessGraph==='function'&&typeof requestAnimationFrame==='function')
      requestAnimationFrame(drawProcessGraph);
    toast('Posición guardada en el borrador TO-BE.');
  },true);
  document.addEventListener('pointercancel',()=>{if(tobePointer){tobePointer=null;render();}},true);
  document.addEventListener('click',event=>{
    const connect=event.target?.closest?.('[data-tobe-connect]');
    if(!connect||state.activePage!=='tobe')return;
    event.preventDefault();
    const e=currentEng(),p=latestTobe(e);
    const from=String(connect.dataset.tobeConnect||''),kind=String(connect.dataset.tobeKind||'normal');
    if(!e||!tobeEditable(p)||!tobeFlowItem(e,p,from)||!['normal','exception'].includes(kind))return;
    const item=tobeFlowItem(e,p,from);
    const isDecision=item.isAddition?item.stepType==='ST04':
      processDecisionStep(tobeProposalSourceSteps(e,p).find(x=>String(x.id)===from));
    if(kind==='exception'&&!isDecision)return;
    __auneaTobeLink={from,kind};
    document.querySelector('.tobe-free-board')?.classList.add('tobe-connect-active');
    const status=document.getElementById('tobeFlowModeStatus');
    if(status)status.textContent='Conectando '+tobeFlowItemName(item)+
      ' · Ruta '+(kind==='exception'?'NO':'principal / SÍ')+
      ': selecciona la tarjeta de destino o pulsa Esc para cancelar.';
    toast('Selecciona ahora la tarjeta de destino para la ruta '+(kind==='exception'?'NO':'principal / SÍ')+'.');
  },true);
  // [AUNEA-FE-PG11-FLOW-DRAG-247] END

  // [AUNEA-FE-PG11-DECISION-TYPE-245] START — reuse canonical ProcessStep
  // decision type for a new future step, without altering AS-IS.
  document.addEventListener('change',event=>{
    const input=event.target?.closest?.('[data-tobe-field="stepType"]');
    if(!input||state.activePage!=='tobe')return;
    const live=currentEng(),draft=latestTobe(live);
    if(!tobeEditable(draft)||!tobeAddedSteps(draft).some(x=>x.id===input.dataset.tobeItem))return;
    if(!saveTobeFromDom(live)||!saveState('Guardar tipo de actividad TO-BE'))
      return toast('No se pudo guardar el tipo de actividad. No se modificó el AS-IS.');
    render();
    toast('Tipo de actividad futura actualizado. Configura sus rutas y revisa la coherencia.');
  },true);
  // [AUNEA-FE-PG11-DECISION-TYPE-245] END


  // [AUNEA-FE-PG11-HUMAN-DECISION-SAVE-224] START — explicit consultant
  // decision with durable version/source/diagnostic binding; no proposal is applied.
  document.addEventListener('click',event=>{
    const control=event.target?.closest?.('[data-tobe-human-decision]');
    if(!control||state.activePage!=='tobe')return;
    event.preventDefault();
    const choice=control.getAttribute('data-tobe-human-decision'),
      sourceId=control.getAttribute('data-tobe-human-source');
    const e=currentEng(),p=latestTobe(e),item=p?.items?.find(x=>String(x.sourceStepId)===sourceId);
    if(!e||!tobeEditable(p)||!item||!TOBE_HUMAN_DECISIONS.includes(choice))
      return toast('La actividad ya no corresponde al borrador vigente.');
    const reason=String(document.getElementById('tobeHumanReviewNote')?.value||'').trim();
    if(reason.length<20)
      return toast('Explica tu decisión con al menos 20 caracteres; identifica fuentes y condiciones sin inventar datos.');
    if(!saveTobeFromDom(e))return toast('No se pudo conservar el diseño editado. La decisión no se ha registrado.');
    const source=p.aiDraft?.proposal||p.aiDraft?.checkpoint;
    const inputHash=source?.input_hash||source?.inputHash;
    const diagnostic=currentDiagnosticOutput(e),snapshot=confirmedSnapshot(e);
    if(!inputHash||!diagnostic||!snapshot||p.sourceSnapshotVersion!==snapshot.version||
       !(p.aiDraft?.proposal&&typeof internalAiSavedDraft==='function'&&internalAiSavedDraft(e))&&
       !(typeof internalAiCheckpointValid==='function'&&internalAiCheckpointValid(e,p.aiDraft?.checkpoint)))
      return toast('La propuesta ha cambiado de versión o diagnóstico. No se registró la decisión.');
    const previous=p.aiDraft.humanReview?JSON.parse(JSON.stringify(p.aiDraft.humanReview)):null;
    const record=tobeHumanReviewRecord(e,p)||{tobeVersion:p.version,
      sourceSnapshotVersion:snapshot.version,diagnosticInputHash:diagnostic.input_snapshot_hash,
      proposalInputHash:inputHash,proposalFingerprint:tobeCandidateFingerprint(p),decisions:{}};
    record.decisions={...(record.decisions||{}),
      [sourceId]:{status:choice,note:reason,decidedAt:now(),
        proposalStepFingerprint:tobeCandidateFingerprint(p,sourceId)}};
    p.aiDraft.humanReview=record;
    markDirty('PG11: decisión del consultor sobre actividad '+sourceId);
    if(!saveState('Registrar decisión humana PG11 '+sourceId)){
      if(previous)p.aiDraft.humanReview=previous;
      else delete p.aiDraft.humanReview;
      return toast('No se pudo guardar la decisión. Conserva la página abierta; no se ha aprobado el diseño.');
    }
    const live=currentEng(),stored=tobeHumanReviewRecord(live,latestTobe(live))?.decisions?.[sourceId];
    if(!stored||stored.status!==choice||stored.note!==reason)
      return toast('No se pudo verificar la persistencia de la decisión. No se ha aprobado ningún cambio.');
    render();
    if(typeof requestAnimationFrame==='function'&&__auneaTobeMode==='guided')
      requestAnimationFrame(()=>document.getElementById('tobeStepDesign')?.
        scrollIntoView({behavior:'smooth',block:'start'}));
    toast('Decisión guardada: '+TOBE_HUMAN_LABELS[choice]+'. Revisa los campos propuestos; el diseño sigue en borrador.');
  },true);
  // [AUNEA-FE-PG11-HUMAN-DECISION-SAVE-224] END
  // [AUNEA-FE-PG11-AI-STEP-APPLY-231] START — human-authorized per-field actions.
  // Per-field IA recommendation actions; the original input remains editable.
  document.addEventListener('click',event=>{
    const apply=event.target?.closest?.('[data-tobe-ai-use-field]');
    const blocked=event.target?.closest?.('[data-tobe-ai-apply-unavailable]');
    const keep=event.target?.closest?.('[data-tobe-ai-keep-field]');
    const edit=event.target?.closest?.('[data-tobe-ai-edit-field]');
    if((!apply&&!blocked&&!keep&&!edit)||state.activePage!=='tobe')return;
    event.preventDefault();
    if(blocked){
      toast(blocked.dataset.tobeAiReason||'La propuesta IA todavía no puede aplicarse.');
      const destination=document.querySelector('.tobe-human-review-shell')||
        document.querySelector('[data-tobe-generate-selected]');
      destination?.scrollIntoView?.({behavior:'smooth',block:'center'});
      return;
    }
    if(apply){
      tobeApplyAiReviewedFields(currentEng(),apply.dataset.tobeAiActionSource,
        [apply.dataset.tobeAiUseField]);
      return;
    }
    if(keep){
      tobeKeepAiReviewedField(currentEng(),keep.dataset.tobeAiActionSource,
        keep.dataset.tobeAiKeepField);
      return;
    }
    const root=edit.closest('.tobe-ai-field-row')?.querySelector('.tobe-ai-field-control .field')||edit.closest('.field');
    const control=root?.querySelector('.tobe-artifact-compact>summary')||
      root?.querySelector('details.aunea-select>summary')||
      root?.querySelector('[data-model-set]')||
      root?.querySelector('textarea:not([disabled])')||
      root?.querySelector('input:not([type="hidden"]):not([disabled])');
    if(!control)return toast('No se ha encontrado el editor de este campo.');
    control.scrollIntoView?.({behavior:'smooth',block:'center'});
    control.focus();
    if(control.matches('.tobe-artifact-compact>summary, details.aunea-select>summary'))
      control.click();
  },true);
  // [AUNEA-FE-PG11-AI-STEP-APPLY-231] END
  // [AUNEA-FE-PG11-ARTIFACT-CHIPS-276] START — refresh chip labels
  // without unmounting the canonical multiselect or erasing unsaved edits.
  document.addEventListener('change',event=>{
    const input=event.target?.closest?.('.tobe-artifact-compact [data-v1-multi]');
    if(!input||state.activePage!=='tobe')return;
    const root=input.closest('.tobe-artifact-compact'),slot=root?.querySelector('.tobe-artifact-chips');
    if(!slot)return;
    const chosen=[...root.querySelectorAll('[data-v1-multi]:checked')];
    slot.innerHTML=chosen.length?chosen.map(control=>{
      const label=control.closest('label')?.textContent?.trim()||control.value;
      return '<span class="tobe-selected-data-chip">'+esc(label)+'</span>';
    }).join(''):'<span class="tobe-muted">Selecciona formatos</span>';
  },true);
  // [AUNEA-FE-PG11-ARTIFACT-CHIPS-276] END

  // [AUNEA-FE-PG12-MAP-SELECT-235] START — view and corresponding node selection.
  document.addEventListener('click',event=>{
    const view=event.target?.closest?.('[data-pg12-view]');
    const node=event.target?.closest?.('[data-pg12-source]');
    if(state.activePage!=='comparacion'||(!view&&!node))return;
    event.preventDefault();
    if(view){
      const next=view.getAttribute('data-pg12-view');
      if(!['actual','proposed','comparison'].includes(next))return;
      __auneaPg12View=next;render();return;
    }
    const id=String(node.getAttribute('data-pg12-source')||'');
    const e=currentEng(),p=latestTobe(e);
    if(!tobeFlowItem(e,p,id))return;
    __auneaPg12SelectedSource=id;
    const detail=document.getElementById('pg12SelectedDetail');
    if(detail)detail.innerHTML=tobeComparisonDetail(e,p,id);
    document.querySelectorAll('[data-pg12-source]').forEach(el=>{
      const selected=el.getAttribute('data-pg12-source')===id;
      el.classList.toggle('pg12-node-selected',selected);
      el.setAttribute('aria-selected',String(selected));
    });
  },true);
  document.addEventListener('keydown',event=>{
    if(state.activePage!=='comparacion'||!['Enter',' '].includes(event.key))return;
    const node=event.target?.closest?.('[data-pg12-source][role="button"]');
    if(node){event.preventDefault();node.click();}
  },true);
  // [AUNEA-FE-PG12-MAP-SELECT-235] END


  const originalPostBind=postBind;
  postBind=function(){
    originalPostBind();
    const e=currentEng(),by=id=>document.getElementById(id);
    if(by('createOutputReview'))by('createOutputReview').onclick=()=>{createOutputReview(e);render()};
    if(by('advanceOutputReview'))by('advanceOutputReview').onclick=()=>{advanceOutputReview(e,!!by('authorizeResultsPrice')?.checked);render()};
    if(by('analyzeAsisOnly'))by('analyzeAsisOnly').onclick=()=>runAsisAnalysis(e);
    bindDiagnosticMapPointNavigation();
    document.querySelectorAll('[data-draft-conditional-scenario]').forEach(x=>x.onclick=()=>createScenario(Number(x.dataset.draftConditionalScenario)));
    if(by('saveTobe'))by('saveTobe').onclick=()=>{
      // Recovery merges and replaces Engagement references; always save the live owner.
      const live=currentEng();
      if(live&&saveTobeFromDom(live)&&saveState('Guardar borrador TO-BE'))render();
    };
    if(by('advanceTobe'))by('advanceTobe').onclick=()=>{
      // Persistence reconciles and replaces state.engagements. Reacquire the live
      // owner after each save; never advance an orphaned Engagement reference.
      const before=currentEng(),current=latestTobe(before),previous=current?.status;
      if(!before||!current||(tobeEditable(current)&&!saveTobeFromDom(before))||
        !saveState('Guardar campos TO-BE antes de revisión'))return;
      const live=currentEng();
      if(!live||!advanceTobeStatus(live))return;
      if(!saveState('Confirmar revisión humana TO-BE')){
        const present=latestTobe(currentEng());
        if(present){present.status=previous;present.updatedAt=now();}
        markDirty('Cambio de estado TO-BE pendiente de guardar');
        toast('El cambio de estado no se ha guardado. Conserva el estudio abierto.');
        return;
      }
      render();
    };
    if(by('newTobeVersion'))by('newTobeVersion').onclick=()=>{
      const live=currentEng();
      if(!createNextTobeVersion(live))return toast('No es posible crear una nueva versión con las fuentes actuales.');
      if(saveState('Nueva versión TO-BE'))render();
    };
    if(by('checkTobeReadiness'))by('checkTobeReadiness').onclick=()=>{
      const live=currentEng(),current=latestTobe(live);
      if(tobeEditable(current)&&(!saveTobeFromDom(live)||
        !saveState('Guardar TO-BE antes de comprobar coherencia')))
        return toast('No se pudo guardar el diseño antes de validarlo.');
      const actual=currentEng(),issue=tobeReviewReadiness(actual,latestTobe(actual));
      const feedback=by('tobeReadinessStatus');
      if(feedback)feedback.innerHTML='<div class="notice '+(issue?'warn':'info')+'">'+
        esc(issue||'Los requisitos estructurales están completos. Revisa la coherencia y las fuentes antes de marcar como revisado.')+'</div>';
    };
    if(state.activePage==='tobe'&&by('tobeInspector')&&typeof drawProcessGraph==='function'&&
      typeof requestAnimationFrame==='function')requestAnimationFrame(drawProcessGraph);
    if(state.activePage==='comparacion'&&typeof drawProcessGraph==='function'&&
      typeof requestAnimationFrame==='function'){
      requestAnimationFrame(()=>{
        document.querySelectorAll('.pg12-map .process-graph-board').forEach(
          board=>drawProcessGraph(board));
        document.querySelectorAll('[data-pg12-source]').forEach(el=>{
          el.classList.toggle('pg12-node-selected',
            el.getAttribute('data-pg12-source')===__auneaPg12SelectedSource);
        });
      });
    }
  };
}
function outputReviewPage(){
  const e=currentEng(),r=currentOutputReview(e),sources=reviewSources(e);
  if(!sources)return pageTop('Revisión humana','Confirma el AS-IS, calcula el diagnóstico y aprueba el TO-BE de esa versión antes de revisar resultados.');
  const labels={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'};
  const actions=!r?'<button class="btn btn-primary" id="createOutputReview">Crear revisión</button>':r.status==='DRAFT'?'<button class="btn btn-primary" id="advanceOutputReview">Marcar como revisado</button>':r.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceOutputReview">Aprobar resultados para cliente</button>':'<button class="btn" data-page="modoresultados">Presentar resultados</button>';
  return pageTop('Revisión humana',r?`Versión ${r.version} · ${labels[r.status]}`:'Revisión pendiente',actions)+section('Fuentes de la devolución',`AS-IS v${sources.snapshotVersion} · TO-BE v${sources.tobeVersion}. Cambiar las fuentes exige una nueva revisión.`,scenarioBody(sources.scenario))+section('Contenido que se aprueba','Revisa hallazgos, riesgos, impacto, recomendación y escenario antes de autorizar su presentación.',`<button class="btn" data-page="resultados">Revisar diagnóstico</button><button class="btn" data-page="comparacion">Revisar comparación</button><button class="btn" data-page="escenarios">Revisar escenarios</button>${r?.status==='REVIEWED'?'<label><input type="checkbox" id="authorizeResultsPrice"> Autorizar mostrar el precio canónico de este escenario</label>':''}`);
}
// [AUNEA-FE-RESULTS-VIEW-010] END
