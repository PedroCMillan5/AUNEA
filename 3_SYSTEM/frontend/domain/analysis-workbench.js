// [AUNEA-FE-ASIS-WORKBENCH-152] START — Read-only source coverage and conditional alternatives
// PURPOSE: Show what captured AS-IS data supports, what remains unknown, and where options differ.
// SOURCE: Diagnostic Master v1.2 (all DF001–DF100); DEC-034/052/053; Simulator CANONICAL PG10–PG15.
// INPUTS: sealed Engagement snapshot, canonical schema and optional server-owned AS-IS analysis.
// OUTPUTS: source audit, traceable point cards and conditional exploration; no official prices/savings.
// SIDE_EFFECTS: none on Engagement or AS-IS; server call results live in memory, bound to snapshot.
const __asisAnalysisCache=new Map();
const ASIS_CONDITIONAL_DIRECTIONS=Object.freeze([
  {name:'Optimización sin IA',actionId:'ACT03',aiId:'I0',condition:'Si las actividades se resuelven con reglas y entradas suficientemente estructuradas',
   approach:'Rediseño puntual, reglas, integraciones y avisos que se puedan verificar.',
   advantage:'Menor variabilidad de comportamiento y controles deterministas.',
   drawback:'Necesita comprobar calidad de datos, integraciones y excepciones; no interpreta libremente documentos variables.',
   dependencies:['Capacidad real de conexión o configuración de las herramientas','Reglas y excepciones documentadas','Responsable de las aprobaciones']},
  {name:'Optimización asistida por IA',actionId:'ACT04',aiId:'I1',condition:'Si existe interpretación material de contenido variable que no sea razonable resolver con reglas',
   approach:'Las mismas reglas gobernadas, con interpretación o redacción asistida y revisión humana donde proceda.',
   advantage:'Puede abordar documentos y mensajes heterogéneos cuando una prueba de calidad lo confirme.',
   drawback:'Mayor coste operativo, errores posibles y necesidad de supervisión y prueba de calidad.',
   dependencies:['Muestras de documentos y validación de extracción','Permisos y datos tratados','Costes de operación y aceptación de calidad']},
  {name:'Rediseño y tecnología existente',actionId:'ACT02',aiId:'I0',condition:'Si simplificar pasos o configurar capacidades disponibles resuelve las fricciones materiales',
   approach:'Revisar secuencia, responsables, criterios y funcionalidades nativas antes de añadir software.',
   advantage:'Puede reducir integraciones nuevas y costes de mantenimiento.',
   drawback:'Depende de capacidades, licencias, restricciones y aceptación del cambio que aún deben verificarse.',
   dependencies:['Capacidades y licencias de herramientas existentes','Políticas reales y cambios organizativos','Evidencia de tiempos tras el rediseño']}
]);
function asisAnalysisSnapshot(e){
  return typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
}
function asisAnalysisSource(e){
  return typeof engagementOfRecord==='function'?engagementOfRecord(e):e;
}
function asisAnalysisKey(e){
  const snap=asisAnalysisSnapshot(e);
  if(!snap||!e?.confirmedAsIs)return null;
  // Current sealed record is the only authority; unrelated gates cannot change this key.
  return String(e.id)+'|'+String(snap.version)+'|'+JSON.stringify({
    answers:snap.answers,processSteps:snap.processSteps,frictions:snap.frictions,
    risks:snap.risks,economicInputs:snap.economicInputs,answerDetails:snap.answerDetails
  });
}
function asisAnalysisResult(e){
  const key=asisAnalysisKey(e);
  return key?__asisAnalysisCache.get(key)||null:null;
}
async function runAsisAnalysis(e){
  const key=asisAnalysisKey(e);
  if(!key)return toast('Confirma el AS-IS antes de analizarlo.');
  if(typeof checkBackend==='function'&&!state.backendOnline&&!(await checkBackend()))
    return toast('El análisis necesita el backend para calcular Pain, economía, riesgo y tiempos.');
  const payload=buildBackendPayload(e);
  const button=document.getElementById('analyzeAsisOnly');
  if(button){button.disabled=true;button.textContent='Analizando datos confirmados…'}
  try{
    const response=await fetch(state.backendUrl+'/v1/diagnostic/asis-analysis',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error(await response.text());
    const data=await response.json();
    if(data.diagnostic_type!=='ASIS_ONLY'||data.engagement_id!==e.id||data.recommendation||data.quote||data.optimal_scenario)
      throw new Error('El endpoint no cumple el contrato de análisis sin recomendación.');
    if(asisAnalysisKey(e)!==key||currentEng()?.id!==e.id)
      throw new Error('El AS-IS cambió durante el análisis. No se utilizan resultados antiguos.');
    __asisAnalysisCache.set(key,data);
    render();
  }catch(err){toast('No se pudo analizar el AS-IS: '+String(err.message||err));render()}
}
function asisFieldInventory(record){
  const fields=Array.isArray(schema?.fields)?schema.fields:[];
  const order=(schema?.flow||[]).map(x=>x.Stage_ID);
  const stages=new Map(order.map(id=>[id,[]]));
  for(const f of fields){
    const stage=f.Stage_ID||'OTROS',fid=f.Field_ID,mode=String(f.Ask_Mode||'');
    const raw=record?.answers?.[fid];
    let value=raw;
    if(typeof effectiveValue==='function'){
      try{const effective=effectiveValue(f,record);if(effective!==undefined&&effective!==null&&effective!=='')value=effective}catch(_){}
    }
    const present=typeof valuePresent==='function'?valuePresent(value):
      !(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length));
    let requiredNow=false;
    if(typeof canonicalFieldRequiredNow==='function'){
      try{requiredNow=!!canonicalFieldRequiredNow(f,record)}catch(_){}
    }
    const status=present?(mode==='DERIVED'||mode==='SYSTEM_GENERATED'?'DERIVED':'AVAILABLE')
      :requiredNow?'MISSING_REQUIRED'
      :mode==='DERIVED'||mode==='SYSTEM_GENERATED'?'DERIVATION_NOT_AVAILABLE':'NOT_CAPTURED_OR_CONDITIONAL';
    const item={id:fid,label:f.Pregunta_o_etiqueta_ES||f.Field_Name||'Dato del estudio',
      stage,mode,required:f.Requiredness||'',consumers:String(f.Engine_Consumers||''),
      status,filled:present};
    if(!stages.has(stage))stages.set(stage,[]);
    stages.get(stage).push(item);
  }
  return [...stages.entries()].map(([stage,items])=>({
    stage,title:(schema?.flow||[]).find(x=>x.Stage_ID===stage)?.Stage_ES||'Datos vinculados',
    items,filled:items.filter(x=>x.filled).length
  }));
}
function asisSourceTime(v){
  if(v===null||v===undefined||v==='')return 'Sin cuantificar';
  const n=Number(v);return Number.isFinite(n)?n.toLocaleString('es-ES',{maximumFractionDigits:2})+' min':'Sin cuantificar';
}
function asisSourceBoundary(record,fid){
  const v=record?.answers?.[fid];
  if(!v||typeof v!=='object')return v==null||v===''?'No consta':String(v);
  const n=Number(v.value);if(!Number.isFinite(n))return 'No consta';
  const unit=({min:'min',h:'horas',hour:'horas',day:'días'})[String(v.unit||'').toLowerCase()]||v.unit||'';
  return n.toLocaleString('es-ES')+' '+unit;
}
function asisPointRecords(record){
  const steps=(record?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    fr=(record?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
    risks=(record?.risks||[]).filter(x=>x.status!=='SUPERSEDED'),
    impacts=(record?.economicInputs||[]).filter(x=>x.status!=='SUPERSEDED');
  const ids=x=>Array.isArray(x)?x.map(String):x==null?[]:[String(x)];
  const points=steps.map((step,index)=>{
    const match=(rows,key)=>rows.filter(x=>ids(x[key]).includes(String(step.id)));
    const frictions=match(fr,'affected_steps'),linkedRisks=match(risks,'step_ids'),economics=match(impacts,'step_ids');
    const gaps=[];
    if(step.active_time==null)gaps.push('Tiempo de trabajo del paso sin cuantificar');
    frictions.forEach((f,i)=>{
      if(!String(f.observable_signal||'').trim())gaps.push('Fricción '+(i+1)+': señal observable sin describir');
      if(!f.evidence_type)gaps.push('Fricción '+(i+1)+': tipo de evidencia pendiente');
    });
    linkedRisks.forEach((r,i)=>{if(r.controls_present===null||r.controls_present===undefined)
      gaps.push('Riesgo '+(i+1)+': controles no declarados')});
    economics.forEach((x,i)=>{if(!x.evidence_type)gaps.push('Impacto '+(i+1)+': evidencia no declarada')});
    return {step,index,frictions,risks:linkedRisks,impacts:economics,gaps,
      critical:frictions.length>0||linkedRisks.length>0||economics.length>0};
  });
  return {points,orphanFrictions:fr.filter(x=>!ids(x.affected_steps).some(id=>steps.some(s=>String(s.id)===id))),
    orphanRisks:risks.filter(x=>!ids(x.step_ids).some(id=>steps.some(s=>String(s.id)===id))),
    orphanImpacts:impacts.filter(x=>!ids(x.step_ids).some(id=>steps.some(s=>String(s.id)===id)))};
}
// Three contextual options per critical ProcessStep, all sourced from the same confirmed AS-IS.
// Applicability is deliberately undecided: no Pain→step economics or future-time rule is assumed.
function asisPointReviewHtml(p){
  const label=x=>x.client_label||x.observable_signal||labelFrom('OS_FRICTION_TYPE',x.friction_type)||'Fricción registrada';
  const attribution={INCLUDED:'Incluido en el paso',BREAKDOWN:'Desglose del retrabajo',ADDITIONAL:'Adicional al paso'};
  const list=(items,fn)=>items.length?'<ul>'+items.map(x=>'<li>'+fn(x)+'</li>').join('')+'</ul>':'<p class="field-help">Sin registros vinculados a este paso.</p>';
  const frictions=list(p.frictions,f=>{
    const mode=attribution[f.time_attribution?.mode]||'Atribución pendiente de verificar';
    return '<b>'+esc(label(f))+'</b> · '+esc(mode)
      +(f.observable_signal?'<small>'+esc(f.observable_signal)+'</small>':'<small>Señal observable no documentada</small>');
  });
  const risks=list(p.risks,r=>esc(r.description||labelFrom('OS_RISK_CATEGORY',r.category)||'Riesgo registrado'));
  const costs=list(p.impacts,x=>esc(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id||'Entrada económica')
    +'<small>Evento vinculado por paso; no implica causa, importe recuperable ni ahorro.</small>');
  return '<details class="asis-point-review"><summary>Consultar evidencias y relaciones del paso</summary>'
    +'<div class="asis-point-review-grid">'
    +'<div><b>Fricciones</b>'+frictions+'</div>'
    +'<div><b>Riesgos</b>'+risks+'</div>'
    +'<div><b>Registros económicos relacionados</b>'+costs+'</div>'
    +'</div>'
    +(p.gaps.length?'<div class="asis-opportunity-gaps"><b>Información que requiere comprobación</b><ul>'+p.gaps.map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul></div>':'')
    +'<p class="field-help">Las tres vías de mejora se contrastan en una única sección inferior. Ninguna alternativa está elegida y no se asignan ahorros futuros a este paso.</p>'
    +'</details>';
}
function asisPointCardsHtml(record){
  const source=asisPointRecords(record),rows=source.points.filter(p=>p.critical);
  const card=p=>{
    const step=p.step;
    const observed=p.frictions.map(f=>f.client_label||f.observable_signal||labelFrom('OS_FRICTION_TYPE',f.friction_type)||'Fricción registrada');
    const headline=observed.length?observed.join(' · '):p.risks.length
      ?'Paso con riesgo registrado':'Paso relacionado con entradas económicas';
    return '<article class="asis-opportunity-point" id="asis-source-step-'+attr(String(step.id))+'">'
      +'<div class="asis-opportunity-head"><b>Paso '+(p.index+1)+' · '+esc(step.step_name||'Sin título')+'</b>'
      +'<span>'+p.frictions.length+' fricciones · '+p.risks.length+' riesgos · '+p.impacts.length+' registros económicos</span></div>'
      +'<p class="asis-point-headline">'+esc(headline)+'</p>'
      +'<div class="asis-opportunity-times"><span>Trabajo: '+esc(asisSourceTime(step.active_time))+'</span>'
      +'<span>Espera: '+esc(asisSourceTime(step.wait_time))+'</span>'
      +'<span>Retrabajo declarado: '+esc(asisSourceTime(step.rework_time))+'</span></div>'
      +asisPointReviewHtml(p)+'</article>';
  };
  const orphan=source.orphanFrictions.length+source.orphanRisks.length+source.orphanImpacts.length;
  return '<div class="asis-opportunity-summary"><b>'+rows.length+' pasos con relaciones registradas</b> de '+source.points.length+' pasos activos. El vínculo ayuda a investigar; no atribuye causalidad, beneficios o soluciones.</div>'
    +(rows.length?'<div class="asis-opportunity-list">'+rows.map(card).join('')+'</div>':'<p>No hay pasos con relaciones de fricciones, riesgos o eventos económicos. No se inventan incidencias.</p>')
    +(orphan?'<div class="notice warn">'+orphan+' registro(s) sin vínculo directo con un paso activo. Revisar su ámbito antes de atribuir efectos.</div>':'');
}
function asisCoverageHtml(e,baseline){
  const record=asisAnalysisSource(e),groups=asisFieldInventory(record),all=groups.flatMap(g=>g.items),total=all.length;
  const available=all.filter(x=>x.status==='AVAILABLE').length;
  const derived=all.filter(x=>x.status==='DERIVED').length;
  const noValue=total-available-derived;
  const captureGaps=typeof canonicalMissingRequired==='function'
    ?canonicalMissingRequired(e).filter(x=>x!=='Confirmación AS-IS'&&x!=='DF093'):[];
  const inputCoverage=baseline?.input_coverage,issues=inputCoverage?.items||[];
  const gaps=issues.filter(x=>x.status==='GAP'||x.status==='UNKNOWN_APPLICABILITY');
  const sourceLabel=x=>{
    const df=normalizeArray(x.source_fields).filter(fid=>String(fid).startsWith('DF'));
    const names=df.map(fid=>(schema.fields||[]).find(f=>f.Field_ID===fid)?.Pregunta_o_etiqueta_ES).filter(Boolean);
    return names.join(' · ')||'Entrada técnica de motor sin pregunta directa';
  };
  const statusLabel=x=>x.status==='GAP'?'Fuente aplicable pendiente':'Aplicabilidad por determinar';
  const fieldStatus=x=>({
    AVAILABLE:'Valor disponible',
    DERIVED:'Valor derivado accesible',
    MISSING_REQUIRED:'Pendiente según la regla de captura',
    DERIVATION_NOT_AVAILABLE:'Derivación sin valor accesible',
    NOT_CAPTURED_OR_CONDITIONAL:'Sin valor accesible; comprobar aplicabilidad'
  })[x.status]||'Sin clasificar';
  return '<div class="asis-coverage-overview"><b>'+total+' campos canónicos examinados</b> · '+available+' valores accesibles · '+derived+' derivados accesibles · '+noValue+' sin valor accesible o condicionales. <b>Estos últimos no equivalen a preguntas obligatorias pendientes.</b></div>'
    +'<div class="notice '+(captureGaps.length?'warn':'good')+'"><b>Integridad de la captura confirmada</b><br>'
    +(captureGaps.length?'Datos exigibles que requieren revisión: '+esc(captureGaps.join(', ')):'No constan datos obligatorios pendientes según las reglas vigentes de captura.')
    +'<small>La cobertura de entradas del motor es un control independiente.</small></div>'
    +(baseline?'<div class="asis-coverage-backend"><b>Entradas del motor:</b> '+esc(({COMPLETE:'Completa',PARTIAL:'Parcial',BLOCKED:'Bloqueada',NOT_EVALUATED:'No evaluada'})[inputCoverage?.status]||inputCoverage?.status||'No evaluada')+' · '+gaps.length+' entrada(s) pendientes o de aplicabilidad incierta.'
    +(gaps.length?'<ul>'+gaps.slice(0,15).map(x=>'<li><b>'+esc(sourceLabel(x))+'</b> · '+esc(statusLabel(x))+(x.blocking?' · Bloqueante':' · No bloqueante')+'</li>').join('')+'</ul>':'<p>Sin entradas pendientes identificadas por el motor.</p>')
    +'</div>':'<p class="field-help">La cobertura del motor se comprueba al analizar el AS-IS sin imponer decisiones de tecnología.</p>')
    +'<details class="asis-field-ledger"><summary>Consultar procedencia y estado de los 100 campos</summary>'
    +groups.map(g=>'<details><summary>'+esc(g.title)+' · '+g.filled+' de '+g.items.length+' con valor accesible</summary><ul>'+g.items.map(f=>'<li><span>'+esc(f.label)+'</span><small>'+esc(fieldStatus(f))+(f.consumers?' · Consumidores: '+esc(f.consumers):'')+'</small></li>').join('')+'</ul></details>').join('')+'</details>';
}
function asisDirectionCardsHtml(e){
  const record=asisAnalysisSource(e),steps=(record?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const officialReady=typeof currentDiagnosticOutput==='function'&&!!currentDiagnosticOutput(e);
  const gateEvidence=typeof engineGateReviewEvidence==='function'&&typeof ENGINE_GATE_CONTRACT!=='undefined'
    ?ENGINE_GATE_CONTRACT.map(g=>({name:ENGINE_GATE_GUIDE[g.key]?.title||g.label,...engineGateReviewEvidence(g,e)})):[];
  const names=items=>items.length?items.map(x=>x.step_name||'Paso sin título').join(' · '):'No consta un paso específico que permita adelantar una conclusión.';
  const manual=steps.filter(s=>normalizeArray(s.manual_actions).length>0);
  const documents=steps.filter(s=>normalizeArray(s.inputs).some(x=>['PDF','DOC','EMAIL','TEXT','DOCUMENT'].includes(String(x).toUpperCase())));
  const decisions=steps.filter(s=>['ST04','ST05'].includes(String(s.step_type))||
    normalizeArray(s.decision_criteria).length>0||!!s.exception_path?.destination_step);
  const contexts=[
    'Acciones manuales registradas en: '+names(manual)+'. La posibilidad de automatizarlas sigue sin comprobarse.',
    'Documentos o mensajes registrados como entrada en: '+names(documents)+'. Su variabilidad y necesidad real de IA deben contrastarse.',
    'Decisiones, excepciones o aprobaciones registradas en: '+names(decisions)+'. Su simplificación y las capacidades actuales deben verificarse.'
  ];
  return '<p class="field-help">Las tres vías se presentan una sola vez para todo el AS-IS; cada ficha muestra datos del proceso relevantes para evaluar su viabilidad. No son soluciones aprobadas ni escenarios cuantificados.</p>'
    +'<div class="asis-direction-grid">'+ASIS_CONDITIONAL_DIRECTIONS.map((d,i)=>
      '<article class="asis-direction-card"><h3>'+(i+1)+'. '+esc(d.name)+'</h3>'
      +'<p class="asis-direction-source"><b>Qué muestra este AS-IS</b><span>'+esc(contexts[i])+'</span></p>'
      +'<p><b>Se consideraría si:</b> '+esc(d.condition)+'</p>'
      +'<p><b>Intervención a contrastar:</b> '+esc(d.approach)+'</p>'
      +'<details class="asis-direction-detail"><summary>Ver ventajas, límites y comprobaciones</summary>'
      +'<p><b>Ventaja posible:</b> '+esc(d.advantage)+'</p>'
      +'<p><b>Limitación:</b> '+esc(d.drawback)+'</p>'
      +'<b>Comprobaciones necesarias</b><ul>'+d.dependencies.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>'
      +'<p class="asis-direction-pending">Tiempo futuro, ahorro y precio pendientes de hipótesis verificadas y simulación canónica.</p>'
      +'<button type="button" class="btn btn-outline" data-draft-conditional-scenario="'+i+'"'+(officialReady?'':' disabled title="Primero calcula el diagnóstico oficial"')+'>'+(officialReady?'Explorar esta alternativa con el motor':'Disponible tras calcular el diagnóstico oficial')+'</button></article>'
    ).join('')+'</div>'
    +(gateEvidence.length?'<details class="asis-conditional-gates"><summary>Condiciones técnicas evaluadas con los datos disponibles</summary>'+gateEvidence.map(g=>
      '<div class="asis-conditional-gate"><b>'+esc(g.name)+'</b><p>'+esc(g.reason||'Sin conclusión demostrada')+'</p><small>Evaluación: '+esc(g.status==='PROPOSAL'?'Propuesta para contrastar':g.status==='REVIEW'?'Pendiente de comprobar':'Información insuficiente')+'</small></div>').join('')+'</details>':'');
}
function asisBaselineHtml(e){
  const data=asisAnalysisResult(e);
  if(!data)return '<div class="notice info">Puedes examinar ya el mapa, los puntos críticos y los gaps. El análisis adicional del backend no necesita contestar las cinco decisiones de solución.</div><button class="btn btn-primary" id="analyzeAsisOnly">Analizar AS-IS y cuantificar línea base</button>';
  if(data.status!=='ANALYZED')return '<div class="notice warn"><b>Análisis parcial: entradas o relaciones pendientes.</b> No se calculan resultados derivados con fuentes incoherentes.</div>'
    +asisCoverageHtml(e,data)+'<button class="btn btn-outline" id="analyzeAsisOnly">Volver a comprobar fuentes</button>';
  const record=asisAnalysisSource(e);
  return '<div class="notice good"><b>Análisis AS-IS calculado por backend.</b> Sin seleccionar tecnología, sin precios y sin nuevas respuestas al cliente. No constituye aún una recomendación de solución.</div>'
    +(typeof diagnosisProcessBaselineHtml==='function'?diagnosisProcessBaselineHtml(data.process_time_projection,record):'')
    +(typeof diagnosisFindingsHtml==='function'?diagnosisFindingsHtml(record,data.pain_results||[]):'')
    +(typeof diagnosisRisksHtml==='function'&&data.risk_result?diagnosisRisksHtml(data.risk_result,record):'')
    +'<button class="btn btn-outline" id="analyzeAsisOnly">Actualizar análisis con el AS-IS vigente</button>';
}
// [AUNEA-FE-ASIS-WORKBENCH-152] END
