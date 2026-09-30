// [AUNEA-FE-PAGE-SESSION-DISPLAY-010] START — Session Display (C90-00 … C90-04) + Session 2 Results Mode
// PURPOSE: Client-facing surfaces. Session Display shows the live client-safe AS-IS projection during
//          the 90-minute session; Results Mode shows only confirmed + approved outputs in Session 2.
// SOURCE: DEC-048/049/053/055; 90MIN UI SPEC §§3.2,3.3,5; Architecture Contract v1.3 Session Display/S2.
// INPUTS: published client-safe projections only. Neither shared surface reads live editable engagement state.
// OUTPUTS: read-only client markup for Session 1 and Session 2.
// SIDE_EFFECTS: localStorage publication channel and DOM of the display windows.
// CHANGE_RISK: HIGH.

// [AUNEA-FE-CLIENT-PAUSE-056] START — Temporary product gate; no data or snapshot deletion.
const CLIENT_DISPLAY_PAUSED=false;
const CLIENT_DISPLAY_PAUSE_REASON='Vista cliente temporalmente bloqueada. Se está revisando la coherencia del diagnóstico; utiliza la Consola y el editor AS-IS.';
function bootPausedClientDisplay(){
  removeConsoleChrome();
  document.body.classList.add('session-display');
  const host=document.getElementById('content');
  if(host)host.innerHTML='<div class="empty session-idle" role="status"><h2>Vista cliente temporalmente bloqueada</h2><p>'+esc(CLIENT_DISPLAY_PAUSE_REASON)+'</p></div>';
}
// [AUNEA-FE-CLIENT-PAUSE-056] END
const RESULTS_DISPLAY_KEY='aunea_results_display_v1';

// [AUNEA-FE-CLIENT-STABILITY-073] START — Compact client cards; details never change navigation.
function sessionCanvas(snap,interactive=true) {
  const graph=snap.graph;if(!graph)return '<div class="flow-canvas session-map-canvas"></div>';
  const nodes=graph.nodes.map(n=>{
    const s=(snap.steps||[]).find(s=>s.id===n.id),tag=interactive?'button':'div';
    const card=s?'<'+tag+(interactive?' type="button" data-session-step="'+attr(s.id)+'"':'')+' class="flow-step session-compact-step '+(s.isDecision?'is-decision ':'')+(snap.confirmedAsIs?'confirmed':'')+'">'
      +'<span class="boundary-kicker">'+(s.isDecision?'Decisión':'Paso '+esc(s.n))+'</span><h4>'+esc(s.name)+'</h4><small>'+esc(s.actor||'Responsable pendiente')+'</small>'
      +(interactive?'<span class="session-step-more">Ver detalle →</span>':'')+'</'+tag+'>':
      n.kind==='pending'?'<div class="graph-route-pending">'+esc(n.route)+' · Destino pendiente</div>':
      flowBoundaryNode(n.kind,n.kind==='start'?(snap.boundaries?.start||'Inicio pendiente'):(snap.boundaries?.end||'Fin pendiente'));
    return '<div class="process-graph-cell" data-graph-node="'+attr(n.id)+'" style="grid-row:'+n.row+';grid-column:'+n.col+'">'+card+'</div>';
  }).join('');
  return '<div class="flow-canvas session-map-canvas"><div class="process-graph-board" style="--graph-cols:'+graph.cols+';--graph-rows:'+graph.rows+'" data-graph-edges="'+attr(JSON.stringify(graph.edges))+'">'
    +'<svg class="process-graph-lines" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>'+nodes+'</div></div>';
}
// Patch data in place: the scroll containers, keyed cards and focused controls keep their identity.
// No full-page replacement, delayed scroll restoration or forced navigation on storage events.
function patchSessionNode(current,next){
  if(current.nodeType===3){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;return}
  for(const a of [...current.attributes])if(!next.hasAttribute(a.name))current.removeAttribute(a.name);
  for(const a of [...next.attributes])if(current.getAttribute(a.name)!==a.value)current.setAttribute(a.name,a.value);
  if(current.matches('.process-graph-lines'))return; // Measured edges are drawn after layout.
  const key=n=>n.nodeType===1?(n.id||n.getAttribute('data-graph-node')||n.getAttribute('data-session-step')||''):'';
  const compatible=(a,b)=>a&&a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&key(a)===key(b);
  let cursor=current.firstChild;
  for(const desired of [...next.childNodes]){
    let match=compatible(cursor,desired)?cursor:null;
    if(!match&&key(desired))match=[...current.childNodes].find(n=>compatible(n,desired));
    if(!match){match=desired.cloneNode(true);current.insertBefore(match,cursor)}
    else{if(match!==cursor)current.insertBefore(match,cursor);patchSessionNode(match,desired)}
    cursor=match.nextSibling;
  }
  while(cursor){const nextSibling=cursor.nextSibling;cursor.remove();cursor=nextSibling}
}
function patchSessionHtml(host,html){
  const next=host.cloneNode(false);next.innerHTML=html;patchSessionNode(host,next);
}
function showSessionStepDetails(stepId,updateOnly=false){
  const snap=readSessionSnapshot();const s=(snap?.steps||[]).find(x=>x.id===stepId);if(!s)return;
  const fr=(snap.frictions||[]).filter(f=>(f.steps||[]).includes(s.id));
  let overlay=document.getElementById('sessionStepDetails');
  const fresh=!overlay;if(fresh){overlay=document.createElement('div');overlay.id='sessionStepDetails';overlay.className='session-detail-overlay'}
  overlay.dataset.stepId=stepId;
  patchSessionHtml(overlay,'<div class="session-detail-dialog" role="dialog" aria-modal="true" aria-label="Detalle del paso">'
    +'<div class="session-detail-heading"><h2>'+esc(s.n+'. '+s.name)+'</h2><button type="button" data-close-session-detail aria-label="Cerrar">×</button></div>'
    +'<dl class="kv"><dt>Responsable</dt><dd>'+esc(s.actor||'Pendiente')+'</dd>'
    +'<dt>Herramienta</dt><dd>'+esc(s.tool||'Pendiente')+'</dd>'
    +'<dt>Tipo de paso</dt><dd>'+esc(s.type||'Pendiente')+'</dd>'
    +'<dt>Tiempo de trabajo</dt><dd>'+(s.activeMin===null?'Pendiente':esc(s.activeMin)+' min')+'</dd>'
    +'<dt>Tiempo de espera</dt><dd>'+(s.waitMin===null?'Pendiente':esc(s.waitMin)+' min')+'</dd>'
    +'<dt>Tiempo de retrabajo</dt><dd>'+(s.reworkMin===null?'Pendiente':esc(s.reworkMin)+' min')+'</dd>'
    +[['Necesita',s.inputs],['Produce',s.outputs],['Decisiones',s.decisions],['Acciones manuales',s.manual],['Canales',s.channels],['Automatización actual',s.automation?[s.automation]:[]]].filter(([,v])=>v?.length).map(([label,values])=>'<dt>'+label+'</dt><dd>'+values.map(esc).join(', ')+'</dd>').join('')+'</dl>'
    +'<h3>Continuación del proceso</h3>'+(snap.graph?.edges||[]).filter(edge=>edge.from===s.id).map(edge=>'<p>'+esc((edge.label?edge.label+' → ':'')+(snap.steps.find(step=>step.id===edge.to)?.name||(edge.to==='__END__'?'Fin del proceso':'Destino pendiente')))+'</p>').join('')
    +(fr.length?'<h3>Problemas observados</h3>'+fr.map(f=>'<p><b>'+esc(f.label)+'</b> · '+esc(f.signal||'Sin descripción')+'</p>').join(''):'')
    +'<div class="session-detail-foot"><button class="btn btn-primary" type="button" data-close-session-detail>Cerrar</button></div></div>');
  overlay.onclick=ev=>{if(ev.target===overlay||ev.target.closest('[data-close-session-detail]'))closeSessionStepDetails()};
  if(fresh)document.body.appendChild(overlay);
  if(!updateOnly)overlay.querySelector('[data-close-session-detail]')?.focus({preventScroll:true});
}

function closeSessionStepDetails(){
  const overlay=document.getElementById('sessionStepDetails'),id=overlay?.dataset.stepId;overlay?.remove();
  [...document.querySelectorAll('[data-session-step]')].find(el=>el.dataset.sessionStep===id)?.focus({preventScroll:true});
}
function sessionLayerPanels(snap) {
  const panels = [];
  if (snap.frictions.length) {
    panels.push(insCard(`Fricciones sobre el proceso (${snap.frictions.length})`,
      `<div class="result-list">${snap.frictions.map(f => `<div class="result-item"><b>${esc(f.label)}</b>${f.signal ? `<p>${esc(f.signal)}</p>` : ''}</div>`).join('')}</div>`, { icon: '◆' }));
  }
  if (snap.risks.length) {
    panels.push(insCard(`Riesgos reconocidos (${snap.risks.length})`,
      `<div class="result-list">${snap.risks.map(r => `<div class="result-item"><b>${esc(r.label)}</b>${r.description ? `<p>${esc(r.description)}</p>` : ''}${r.hasControls ? '<p class="field-help">Con controles ya existentes</p>' : ''}</div>`).join('')}</div>`, { icon: '▲' }));
  }
  if (snap.impacts.length) {
    panels.push(insCard(`Dónde se concentra el impacto (${snap.impacts.length})`,
      `<div class="result-list">${snap.impacts.map(x => `<div class="result-item"><b>${esc(x.label)}</b><p>${x.activeHours ? `${x.activeHours} h de trabajo activo al año` : ''}${x.activeHours && x.waitHours ? ' · ' : ''}${x.waitHours ? `${x.waitHours} h de espera al año` : ''}</p>${x.note ? `<p class="field-help">${esc(x.note)}</p>` : ''}</div>`).join('')}</div>`, { icon: '◈' }));
  }
  return panels.join('');
}

function sessionClosurePanel(snap) {
  const c = snap.closure || {};
  return insCard('¿Refleja esto cómo funciona hoy?',
    kvRows([
      ['Pasos del proceso', String(c.steps ?? 0)],
      ['Fricciones identificadas', String(c.frictions ?? 0)],
      ['Riesgos reconocidos', String(c.risks ?? 0)],
      ['Impactos confirmados', String(c.impacts ?? 0)],
      ['Siguiente paso acordado', c.nextStep ? esc(c.nextStep) : 'Pendiente de acordar']
    ]) + `<p class="ins-note" style="margin-top:10px">Confirmamos juntos el proceso actual, sus fricciones, los riesgos reconocidos y dónde se concentra el impacto.</p>`,
    { accent: true, icon: '✓' });
}

function sessionDisplayPage() {
  const snap = readSessionSnapshot() || { state: 'C90-00', shared: false, steps: [], frictions: [], risks: [], impacts: [] };
  const head = `<div class="session-display-head session-client-topbar" data-session-state="${attr(snap.state||'')}">
      <div class="session-client-brand"><img src="./assets/brand/Logo.png" alt="AUNEA"><div><span>${esc(snap.company || 'Empresa')}</span><h1>${esc(snap.process || 'Proceso actual')}</h1></div></div>
      <div id="sessionSync" class="session-sync"></div>
    </div>`;

  if (!snap.shared) {
    return head + `<div class="empty session-idle"><h2>La sesión empieza en un momento</h2>
      <p>Estamos preparando el contexto. En cuanto empecemos a dibujar el proceso, aparecerá aquí.</p></div>`;
  }
  const panels = snap.state === 'C90-04'
    ? sessionClosurePanel(snap) + sessionLayerPanels(snap)
    : sessionLayerPanels(snap) || insCard('El proceso actual',
        `<p>Vamos construyendo el mapa de cómo funciona hoy. Dinos si falta algún paso o si alguno no es así.</p>`, { accent: true, icon: '◉' });

  return head + workspace(`<div class="card card-pad">${sessionCanvas(snap)}</div>`, panels);
}

function renderSessionDisplay() {
  const host=document.getElementById('content');if(!host)return;
  const snap=readSessionSnapshot();
  // Publication time may change while the data is identical: do not rebuild the page or reset position.
  const signature=JSON.stringify(snap?{...snap,publishedAt:null}:null);
  if(host.dataset.sessionSignature===signature)return;
  patchSessionHtml(host,sessionDisplayPage());host.dataset.sessionSignature=signature;
  const sync=document.getElementById('sessionSync');
  if(sync)sync.textContent=snap?'Vista actualizada':'Esperando a la consola';
  const detail=document.getElementById('sessionStepDetails');
  if(detail){
    if(snap?.steps?.some(s=>s.id===detail.dataset.stepId))showSessionStepDetails(detail.dataset.stepId,true);
    else closeSessionStepDetails();
  }
  requestAnimationFrame(drawProcessGraph);
}
function removeConsoleChrome(){document.querySelectorAll('.sidebar,.topbar,#modalRoot,#toast').forEach(el=>el.remove())}
function bootSessionDisplay() {
  removeConsoleChrome();document.body.classList.add('session-display');
  renderSessionDisplay();
  document.addEventListener('click',ev=>{const step=ev.target.closest?.('[data-session-step]');if(step)showSessionStepDetails(step.dataset.sessionStep)});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeSessionStepDetails()});
  window.addEventListener('storage',ev=>{if(ev.storageArea===localStorage&&ev.key===SESSION_DISPLAY_KEY)renderSessionDisplay()});
}
let sessionDisplayWindow=null;
function openSessionDisplay() {
  if(CLIENT_DISPLAY_PAUSED)return toast(CLIENT_DISPLAY_PAUSE_REASON);
  const res=publishSessionSnapshot(currentEng());
  if(!res.ok)return toast('No se ha podido actualizar la vista del cliente: '+res.error);
  const url=new URL(location.href);url.hash='session';url.searchParams.delete('engagement');
  const w=sessionDisplayWindow&&!sessionDisplayWindow.closed?sessionDisplayWindow:window.open('', 'aunea_session_display');
  sessionDisplayWindow=w;
  if(!w)return toast('Permite las ventanas emergentes para abrir la vista del cliente.');
  // Never navigate an existing session window again: it would lose its scroll and open detail.
  if(w.location.pathname!==url.pathname||w.location.hash!=='#session')w.location.replace(url.toString());
  w.focus();
}

// [AUNEA-FE-CLIENT-STABILITY-073] END

// C06 · Modo Resultados. Projection is created in the Console from confirmed/approved sources and then
// stored as plain client-safe data. The second window never recalculates, edits or opens discovery.
function approvedTobeForClient(e){const h=e?.tobeProposals||[];return [...h].reverse().find(x=>x.status==='APPROVED_FOR_CLIENT'||x.status==='PUBLISHED')||null}
function painLabelForClient(p){const ref=(schema?.tables?.REF_PAIN||[]).find(x=>String(x.Pain_ID)===String(p?.pain_id));return ref?.Pain_Name||ref?.Label_ES||ref?.Pain_Pattern||'Hallazgo confirmado'}
function buildResultsProjection(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null,tobe=approvedTobeForClient(e),review=approvedOutputReview(e),o=review?.sources.output;if(!snap||!tobe||!o||!review)return null;
  const rec=o.recommendation||{},econ=o.economic_result||{},risk=o.risk_result||{},scenarios=[o.optimal_scenario,...(e.scenarioResults||[])].filter(Boolean),selected=review.sources.scenario;
  const spec=typeof approvedSpecification==='function'?approvedSpecification(e,review):null;
  return {version:1,solutionSpecification:spec?{version:spec.version,objective:spec.data.objective||'',outputs:spec.data.outputs||[]}:null,publishedAt:now(),company:snap.company?.name||companyById(e.companyId)?.name||'',process:snap.answers?.DF011||e.title||'',asis:{steps:(snap.processSteps||[]).filter(x=>x.status!=='SUPERSEDED').map((s,i)=>({n:i+1,name:s.name||s.step_name||`Paso ${i+1}`,actor:labelFrom('OS_ACTOR_ROLE',s.actor)||'',tool:labelFrom('OS_TOOL_CATEGORY',s.tool)||''})),frictions:(snap.frictions||[]).filter(x=>x.status!=='SUPERSEDED').map(f=>({label:labelFrom('OS_FRICTION_TYPE',f.friction_type)||'Fricción',signal:f.observable_signal||''})),risks:(snap.risks||[]).map(r=>({label:labelFrom('OS_RISK_CATEGORY',r.category)||r.category||'Riesgo',description:r.description||''}))},findings:(o.pain_results||[]).filter(x=>x.state==='CONFIRMED').map(p=>({label:painLabelForClient(p),confidence:p.confidence?engineLabel('confidence',p.confidence):''})),impact:{activeHours:econ.annual_active_hours??null,waitHours:econ.annual_wait_hours??null,capacityValue:econ.capacity_value_eur_annual??null,directLoss:econ.direct_loss_eur_annual??null,residualRisk:risk.residual_level?engineLabel('risk_level',risk.residual_level):null},tobe:{version:tobe.version,items:(tobe.items||[]).map(x=>({step:x.sourceStepName||'',currentActor:(snap.processSteps||[]).find(s=>s.id===x.sourceStepId)?.actor||'',currentTool:(snap.processSteps||[]).find(s=>s.id===x.sourceStepId)?.tool||'',transformation:x.transformation||'',problemResolved:x.problemResolved||'',futureActor:x.futureActor||'',tool:x.tool||'',automationAi:x.automationAi||'',humanSupervision:x.humanSupervision||'',controlsRisk:x.controlsRisk||''}))},recommendation:{action:actionLabel(rec.action_id),functionalLevel:funcLevelLabel(rec.functional_level_id),aiLevel:aiLevelLabel(rec.ai_level_id)},businessCase:selected?{scenario:selected.scenario_name||'Escenario seleccionado',oneOff:review.includePrice?(selected.quote?.one_off_eur??null):null,recurring:review.includePrice?(selected.quote?.recurring_monthly_eur??null):null,tco12:review.includePrice?(selected.quote?.tco_12m_eur??null):null,priceAuthorized:review.includePrice}:null,nextStep:snap.answers?.DF098||''};
}
function publishResultsProjection(e){const projection=buildResultsProjection(e);if(!projection)return {ok:false,error:'Falta snapshot confirmado, TO-BE aprobado o diagnóstico oficial.'};localStorage.setItem(RESULTS_DISPLAY_KEY,JSON.stringify(projection));return {ok:true,projection}}
function readResultsProjection(){try{return JSON.parse(localStorage.getItem(RESULTS_DISPLAY_KEY)||'null')}catch{return null}}
function resultsMoney(v){return v===null||v===undefined?'No disponible':Number(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})}
function resultsModePage(){
  const p=readResultsProjection();if(!p)return `<div class="empty session-idle"><h2>Resultados todavía no publicados</h2><p>El consultor debe aprobar y compartir los resultados desde AUNEA Internal.</p></div>`;
  const head=`<div class="session-display-head"><div><div class="screen-id">MODO RESULTADOS · SESIÓN 2</div><h1>${esc(p.process||'Resultados')}</h1><p class="subtitle">${esc(p.company||'')}</p></div><div class="session-sync"><span class="badge ok">Publicado ${esc(formatDateEs(p.publishedAt))}</span></div></div>`;
  const asis=`<div class="flow-canvas"><div class="flow-track">${(p.asis.steps||[]).map((s,i)=>`${i?'<div class="flow-connector"></div>':''}<div class="flow-step confirmed"><h4>${s.n}. ${esc(s.name)}</h4><p>${esc([s.actor,s.tool].filter(Boolean).join(' · ')||'—')}</p></div>`).join('')}</div></div>`;
  const findings=(p.findings||[]).map(x=>`<div class="result-item"><b>${esc(x.label)}</b><p>${x.confidence?`Confianza: ${esc(x.confidence)}`:''}</p></div>`).join('')||'<div class="empty"><p>Sin hallazgos adicionales publicados.</p></div>';
  const frictions=(p.asis.frictions||[]).map(x=>`<div class="result-item"><b>${esc(x.label)}</b>${x.signal?`<p>${esc(x.signal)}</p>`:''}</div>`).join('');
  const tobe=(p.tobe.items||[]).map((x,i)=>`<div class="result-item"><b>${i+1}. ${esc(x.step)} · ${esc(x.transformation)}</b><p>${esc([x.problemResolved,x.futureActor,x.tool,x.automationAi,x.humanSupervision,x.controlsRisk].filter(Boolean).join(' · '))}</p></div>`).join('');
  const comparison=(p.tobe.items||[]).map(x=>`<tr><td>${esc(x.step)}</td><td>${esc(x.transformation||'—')}</td><td>${esc(x.currentActor||'No disponible')}</td><td>${esc(x.futureActor||'No disponible')}</td><td>${esc(x.currentTool||'No disponible')}</td><td>${esc(x.tool||'No disponible')}</td><td>${esc(x.automationAi||'No disponible')}</td></tr>`).join('');
  const business=p.businessCase?`<div class="grid g3"><div class="notice"><b>Escenario</b><br>${esc(p.businessCase.scenario)}</div>${p.businessCase.priceAuthorized?`<div class="notice"><b>Inversión inicial</b><br>${resultsMoney(p.businessCase.oneOff)}</div><div class="notice"><b>TCO 12 meses</b><br>${resultsMoney(p.businessCase.tco12)}</div>`:''}</div>`:'<div class="notice">Business case no disponible.</div>';
  return head+section('1. AS-IS confirmado','El proceso que validamos juntos.',`<div class="card card-pad">${asis}</div>`)+section('2. Qué detectamos y por qué','Hallazgos, fricciones, riesgos e impacto publicados.',`<div class="result-list">${findings}</div>`)+section('3. Fricciones','Fricciones confirmadas en el AS-IS.',`<div class="result-list">${frictions}</div>`)+section('4. Riesgos','Riesgos confirmados durante el diagnóstico.',`<div class="result-list">${p.asis.risks.map(r=>`<div class="result-item"><b>${esc(r.label)}</b><p>${esc(r.description)}</p></div>`).join('')||'Sin riesgos registrados.'}</div>`)+section('5. Impacto','Trabajo activo y espera se mantienen separados.',`<div class="grid g3" style="margin-top:12px"><div class="notice"><b>Trabajo activo anual</b><br>${p.impact.activeHours??'No disponible'}</div><div class="notice"><b>Espera anual</b><br>${p.impact.waitHours??'No disponible'}</div><div class="notice"><b>Riesgo residual</b><br>${esc(p.impact.residualRisk||'No disponible')}</div></div>`)+section('6. TO-BE aprobado','Cómo proponemos que funcione el proceso.',`<div class="result-list">${tobe}</div>`)+section('7. AS-IS vs TO-BE','Qué cambia, sin abrir una nueva captura.',`<div class="table-wrap"><table class="data-table"><thead><tr><th>Paso</th><th>Cambio</th><th>Responsable actual</th><th>Responsable futuro</th><th>Herramienta actual</th><th>Herramienta propuesta</th><th>Automatización / IA</th></tr></thead><tbody>${comparison}</tbody></table></div>`)+section('8. Solución recomendada','Salida de los engines canónicos aprobada para esta devolución.',`<div class="grid g3"><div class="notice"><b>Acción</b><br>${esc(p.recommendation.action||'No disponible')}</div><div class="notice"><b>Nivel funcional</b><br>${esc(p.recommendation.functionalLevel||'No disponible')}</div><div class="notice"><b>IA</b><br>${esc(p.recommendation.aiLevel||'No disponible')}</div></div>${p.solutionSpecification?`<h3>Especificación de solución aprobada · v${p.solutionSpecification.version}</h3><p>${esc(p.solutionSpecification.objective)}</p><p>${p.solutionSpecification.outputs.map(esc).join(' · ')}</p>`:''}`)+section('9. Escenario y business case','Datos procedentes del escenario seleccionado y Pricing Engine.',business)+section('10. Siguientes pasos','Cierre de la devolución.',`<div class="notice good"><b>Siguiente paso acordado</b><br>${esc(p.nextStep||'Pendiente de acordar')}</div>`);
}
function renderResultsMode(){const host=document.getElementById('content');if(host)host.innerHTML=resultsModePage()}
function bootResultsMode(){removeConsoleChrome();document.body.classList.add('session-display');renderResultsMode();window.addEventListener('storage',ev=>{if(ev.key===RESULTS_DISPLAY_KEY)renderResultsMode()})}
function openResultsMode(){if(CLIENT_DISPLAY_PAUSED)return toast(CLIENT_DISPLAY_PAUSE_REASON);const e=currentEng();if(!['Listo para resultados','Sesión 2','Cerrado'].includes(engagementStatus(e)))return toast('Aprueba los resultados antes de iniciar la segunda sesión.');const res=publishResultsProjection(e);if(!res.ok)return toast(res.error);advanceEngagementTo(e,'Sesión 2','apertura de Modo Resultados');saveState('Modo Resultados publicado para Session 2');const w=window.open(`${location.pathname}#results`,'aunea_results_mode');if(!w)toast('El navegador ha bloqueado la ventana. Permite ventanas emergentes para mostrar resultados.')}
function resultsModeLauncherPage(){if(CLIENT_DISPLAY_PAUSED)return pageTop('Modo Resultados','Acceso temporalmente bloqueado durante la revisión del flujo.')+section('Vista cliente en pausa',esc(CLIENT_DISPLAY_PAUSE_REASON),'');const e=currentEng(),ready=!!buildResultsProjection(e);return pageTop('Modo Resultados','Superficie separada y de sólo lectura para la segunda sesión con cliente.',ready?'<button class="btn btn-primary" id="openResultsMode">Abrir Modo Resultados</button>':'<button class="btn" data-page="revision">Revisar resultados</button>')+section('Aprobación y publicación','La vista cliente sólo consume snapshot confirmado + outputs aprobados.',`<div class="notice ${ready?'good':'warn'}">${ready?'Listo para Sesión 2. No se recalculará nada al abrir la vista.':'Falta snapshot confirmado, TO-BE aprobado o revisión humana de resultados.'}</div>`)}
function registerResultsModeLauncher(){if(typeof pages==='undefined'||registerResultsModeLauncher.done)return;registerResultsModeLauncher.done=true;pages.modoresultados=resultsModeLauncherPage;if(!INTERNAL_WORK_NAV.some(x=>x[0]==='modoresultados'))INTERNAL_WORK_NAV.push(['modoresultados','▤','Modo Resultados']);const originalPostBind=postBind;postBind=function(){originalPostBind();const b=document.getElementById('openResultsMode');if(b)b.onclick=openResultsMode}}
// [AUNEA-FE-PAGE-SESSION-DISPLAY-010] END
