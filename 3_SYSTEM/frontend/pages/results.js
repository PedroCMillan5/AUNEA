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
  if(typeof processGraphHtml!=='function')return auneaNoticeMessage('info','Mapa AS-IS confirmado disponible en la captura.');
  const steps=(record.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),fr=(record.frictions||[]).filter(x=>x.status!=='SUPERSEDED');
  const start=typeof processBoundaryValue==='function'?processBoundaryValue(record,'DF014','Límite inicial pendiente','DF012'):(record.answers?.DF014||'Inicio');
  const finish=typeof processBoundaryValue==='function'?processBoundaryValue(record,'DF015','Límite final pendiente','DF013'):(record.answers?.DF015||'Fin');
  return processGraphHtml(record,steps,fr,start,finish,'impacto',true);
}
function diagnosisFindingsHtml(record,pains){
  if(!pains.length)return auneaEmptyMessage('El backend no ha devuelto hallazgos para este snapshot.');
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
  if(!p)return auneaNoticeMessage('info','Proyección temporal del proceso no disponible; no se sustituye por inputs económicos parciales.');
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
// __AUNEA_PG10_ANALYSIS_MODULE__
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
  if(!stages.length)return auneaNoticeMessage('warn','Confirma el AS-IS antes de comenzar el trabajo interno.');
  const approved=typeof approvedOutputReview==='function'?approvedOutputReview(e):null;
  return '<div class="grid g3">'+stages.map((s,i)=>
    '<div class="notice"><small>Etapa '+(i+1)+'</small><br><b>'+esc(s.title)+'</b><br><small>'+esc(s.status)+'</small><div class="aunea-ui-mt-8"><button class="btn btn-outline" data-page="'+s.page+'">Abrir etapa</button></div></div>'
  ).join('')+'</div><div class="notice info aunea-ui-mt-12"><b>Presentación al cliente</b><br>'+
    (approved?'Existe una revisión autorizada para el snapshot y escenario vigentes.':'Todavía no hay una revisión vigente aprobada para cliente. El análisis interno no se publica automáticamente.')+
    (approved?' <button class="btn" data-page="modoresultados">Ver Modo Resultados</button>':'')+
    '<small class="client-presentation-note aunea-ui-block aunea-ui-mt-8">Los tiempos futuros, la inversión y el ahorro solo aparecen cuando los motores los calculan a partir de supuestos y alcance válidos.</small></div>';
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
    return auneaNoticeMessage('info','Todavía no existe un análisis de problemas vigente. Ejecuta el análisis AS-IS para obtener conclusiones basadas en los datos confirmados.');
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
      auneaNoticeMessage('info','No hay hallazgos confirmados o indicados en el análisis actual. Esto no equivale a demostrar que el proceso no tenga problemas.'))+
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
    (freshness?.status==='OBSOLETE'?auneaNoticeMessage('warn','Existe un resultado oficial anterior no vigente: recalcula antes de utilizarlo.'):'')+
    '<p>'+esc(pending)+' No son errores de captura ni equivalen a hallazgos confirmados; condicionan la recomendación y la edición del TO-BE, no la consulta del diagnóstico.</p>'+
    '<p class="field-help">Para corregir un hallazgo, modifica únicamente su fuente en el AS-IS y vuelve a calcular. No hay una segunda aprobación ni publicación automática de resultados.</p>'+
    (!official?'<p class="field-help">La vista TO-BE preliminar solo permite explorar problemas y posibles vías de intervención. No crea ni aprueba el proceso futuro, y no calcula ahorros.</p>':'')+
    (official?auneaWorkDisclosure('pg10-decision-trace','Consultar decisiones utilizadas por el resultado oficial',diagnosisEngineDecisionTraceHtml(e)):'')+
    '<div class="pg10-review-actions">'+main+next+'</div>'+readiness+audit+'</div>';
}
function resultsPage(){
  const e=currentEng();
  if(!e) return pageTop('Diagnóstico interno','Confirma Validación y cierre antes de iniciar el análisis.','<button class="btn" data-page="diagnostico">Volver a Sesión 1</button>')+'<div class="empty">AS-IS confirmado requerido.</div>';
  if(!hasConfirmedEngagementSnapshot(e)) return pageTop('Diagnóstico interno','Confirma Validación y cierre antes de iniciar el análisis.','<button class="btn" data-page="diagnostico">Volver a Sesión 1</button>')+
      auneaEmptyState('AS-IS confirmado requerido','Trabajo Interno consume el snapshot de PG09.');
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
    auneaWorkDisclosure('pg10-stage-nav','Consultar las etapas del Trabajo Interno',workbenchContinuityHtml(e));
  const reference='<div class="grid g3 diagnosis-reference-grid">'+
    '<div class="notice diagnosis-reference-card"><b>Duración end-to-end actual</b><div class="diagnosis-reference-value">'+esc(asisSourceBoundary(record,'DF026'))+'</div><p class="diagnosis-reference-note">Duración declarada; conciliación independiente.</p></div>'+
    '<div class="notice diagnosis-reference-card"><b>SLA del servicio</b><div class="diagnosis-reference-value">'+esc(asisSourceBoundary(record,'DF025'))+'</div><p class="diagnosis-reference-note">Compromiso de servicio, no objetivo de reducción.</p></div>'+
    '<div class="notice diagnosis-reference-card"><b>Objetivos del negocio</b><div class="diagnosis-reference-value">'+esc(normalizeArray(record.answers?.DF086).map(x=>labelFrom('OS_FUTURE_OUTCOME',x)||x).join(' · ')||'No declarados')+'</div><p class="diagnosis-reference-note">Sin tiempo futuro supuesto.</p></div></div>';
  const map=diagnosisReadonlyMap(e,record)+
    auneaWorkDisclosure('pg10-critical-points','Consultar fichas y evidencias de los puntos críticos',asisPointCardsHtml(record));
  const coverage=asisCoverageHtml(e,official?{status:'ANALYZED',input_coverage:official.input_coverage}:asis);
  const diagnostic=official
    ?auneaNoticeMessage('good','Resultados vinculados al snapshot confirmado. La solución técnica se evalúa en las páginas posteriores.')+
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
  if(!snap||!review||review.snapshotVersion!==snap.version)return auneaNoticeMessage('warn','Las decisiones técnicas de este diagnóstico requieren revisión para el AS-IS vigente.');
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
    :auneaNoticeMessage('warn','Falta la trazabilidad completa de las decisiones técnicas. Revisa las cinco respuestas antes de continuar.');
}
// [AUNEA-FE-RESULT-GATE-TRACE-151] END

function num(x){return Number(x||0).toLocaleString('es-ES',{maximumFractionDigits:1})}
function eur(x){return Number(x||0).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})}
// __AUNEA_RESULTS_OFFICIAL_PAGES_MODULE__// [AUNEA-FE-PG10-MAP-NAV-160] START — Read-only map nodes open source-bound diagnostic point details.
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

// __AUNEA_INTERNAL_WORK_EVENTS_MODULE__
function outputReviewPage(){
  const e=currentEng(),r=currentOutputReview(e),sources=reviewSources(e);
  if(!sources)return pageTop('Revisión humana','Confirma el AS-IS, calcula el diagnóstico y aprueba el TO-BE de esa versión antes de revisar resultados.');
  const labels={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'};
  const actions=!r?'<button class="btn btn-primary" id="createOutputReview">Crear revisión</button>':r.status==='DRAFT'?'<button class="btn btn-primary" id="advanceOutputReview">Marcar como revisado</button>':r.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceOutputReview">Aprobar resultados para cliente</button>':'<button class="btn" data-page="modoresultados">Presentar resultados</button>';
  return pageTop('Revisión humana',r?`Versión ${r.version} · ${labels[r.status]}`:'Revisión pendiente',actions)+section('Fuentes de la devolución',`AS-IS v${sources.snapshotVersion} · TO-BE v${sources.tobeVersion}. Cambiar las fuentes exige una nueva revisión.`,scenarioBody(sources.scenario))+section('Contenido que se aprueba','Revisa hallazgos, riesgos, impacto, recomendación y escenario antes de autorizar su presentación.',`<button class="btn" data-page="resultados">Revisar diagnóstico</button><button class="btn" data-page="comparacion">Revisar comparación</button><button class="btn" data-page="escenarios">Revisar escenarios</button>${r?.status==='REVIEWED'?'<label><input type="checkbox" id="authorizeResultsPrice"> Autorizar mostrar el precio canónico de este escenario</label>':''}`);
}
// [AUNEA-FE-RESULTS-VIEW-010] END
