// [AUNEA-FE-PAGE-SESSION-DISPLAY-010] START — Session Display (C90-00 … C90-04) + Session 2 Results Mode
// PURPOSE: Client-facing surfaces. Session Display shows the live client-safe AS-IS projection during
//          the 90-minute session; Results Mode shows only confirmed + approved outputs in Session 2.
// SOURCE: DEC-048/049/053/055; 90MIN UI SPEC §§3.2,3.3,5; Architecture Contract v1.3 Session Display/S2.
// INPUTS: published client-safe projections only. Neither shared surface reads live editable engagement state.
// OUTPUTS: read-only client markup for Session 1 and Session 2.
// SIDE_EFFECTS: localStorage publication channel and DOM of the display windows.
// CHANGE_RISK: HIGH.

const RESULTS_DISPLAY_KEY='aunea_results_display_v1';

function sessionCanvas(snap) {
  if (!snap.steps.length) {
    return `<div class="empty"><h2>Construyendo el mapa</h2><p>Estamos representando el proceso tal y como funciona hoy.</p></div>`;
  }
  const badgesFor = id => snap.frictions.filter(f => f.steps.includes(id));
  return `<div class="flow-canvas"><div class="flow-track">${snap.steps.map((s, i) => `
    ${i ? '<div class="flow-connector"></div>' : ''}
    <div class="flow-step ${snap.confirmedAsIs ? 'confirmed' : ''} ${s.isDecision ? 'is-decision' : ''}" data-session-step="${attr(s.id)}">
      <h4>${s.n}. ${esc(s.name)}</h4>
      <p>${esc([s.actor, s.tool].filter(Boolean).join(' · ') || '—')}</p>
      <p>${s.activeMin ? `${s.activeMin} min de trabajo` : ''}${s.activeMin && s.waitMin ? ' · ' : ''}${s.waitMin ? `${s.waitMin} min de espera` : ''}</p>
      <div class="friction-badges">${badgesFor(s.id).map(f => `<span class="friction-badge">${esc(f.label)}</span>`).join('')}</div>
    </div>`).join('')}</div></div>`;
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
  const head = `<div class="session-display-head">
      <div><div class="screen-id">${esc(snap.state)}</div><h1>${esc(snap.process || 'Proceso actual')}</h1>
      <p class="subtitle">${esc(snap.company || '')}</p></div>
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
  const host = document.getElementById('content');
  if (!host) return;
  host.innerHTML = sessionDisplayPage();
  const sync = document.getElementById('sessionSync');
  const snap = readSessionSnapshot();
  if (sync) sync.innerHTML = snap
    ? `<span class="badge ok">Actualizado ${esc(formatDateEs(snap.publishedAt))}</span>`
    : `<span class="badge wait">Esperando a la consola</span>`;
}

function bootSessionDisplay() {
  document.body.classList.add('session-display');
  renderSessionDisplay();
  window.addEventListener('storage', ev => { if (ev.key === SESSION_DISPLAY_KEY) renderSessionDisplay(); });
}

function openSessionDisplay() {
  const res = publishSessionSnapshot(currentEng());
  if (!res.ok) return toast('No se ha podido publicar la vista de sesión: ' + res.error);
  const w = window.open(`${location.pathname}#session`, 'aunea_session_display');
  if (!w) toast('El navegador ha bloqueado la ventana. Permite ventanas emergentes para compartir la sesión.');
}

// C06 · Modo Resultados. Projection is created in the Console from confirmed/approved sources and then
// stored as plain client-safe data. The second window never recalculates, edits or opens discovery.
function approvedTobeForClient(e){const h=e?.tobeProposals||[];return [...h].reverse().find(x=>x.status==='APPROVED_FOR_CLIENT'||x.status==='PUBLISHED')||null}
function painLabelForClient(p){const ref=(schema?.tables?.REF_PAIN||[]).find(x=>String(x.Pain_ID)===String(p?.pain_id));return ref?.Pain_Name||ref?.Label_ES||ref?.Pain_Pattern||'Hallazgo confirmado'}
function buildResultsProjection(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null,tobe=approvedTobeForClient(e),o=e?.diagnosticOutput;if(!snap||!tobe||!o)return null;
  const rec=o.recommendation||{},econ=o.economic_result||{},risk=o.risk_result||{},scenarios=[o.optimal_scenario,...(e.scenarioResults||[])].filter(Boolean),selected=scenarios[e.selectedScenarioIndex??0]||scenarios[0]||null;
  return {version:1,publishedAt:now(),company:snap.company?.name||companyById(e.companyId)?.name||'',process:snap.answers?.DF011||e.title||'',asis:{steps:(snap.processSteps||[]).filter(x=>x.status!=='SUPERSEDED').map((s,i)=>({n:i+1,name:s.name||s.step_name||`Paso ${i+1}`,actor:s.actor||'',tool:s.tool||''})),frictions:(snap.frictions||[]).filter(x=>x.status!=='SUPERSEDED').map(f=>({label:labelFrom('OS_FRICTION_TYPE',f.friction_type)||'Fricción',signal:f.observable_signal||''})),risks:(snap.risks||[]).map(r=>({label:labelFrom('OS_RISK_CATEGORY',r.category)||r.category||'Riesgo',description:r.description||''}))},findings:(o.pain_results||[]).filter(x=>x.state==='CONFIRMED').map(p=>({label:painLabelForClient(p),confidence:p.confidence?engineLabel('confidence',p.confidence):''})),impact:{activeHours:econ.annual_active_hours??null,waitHours:econ.annual_wait_hours??null,capacityValue:econ.capacity_value_eur_annual??null,directLoss:econ.direct_loss_eur_annual??null,residualRisk:risk.residual_level?engineLabel('risk_level',risk.residual_level):null},tobe:{version:tobe.version,items:(tobe.items||[]).map(x=>({step:x.sourceStepName||'',transformation:x.transformation||'',problemResolved:x.problemResolved||'',futureActor:x.futureActor||'',tool:x.tool||'',automationAi:x.automationAi||'',humanSupervision:x.humanSupervision||'',controlsRisk:x.controlsRisk||''}))},recommendation:{action:actionLabel(rec.action_id),functionalLevel:funcLevelLabel(rec.functional_level_id),aiLevel:aiLevelLabel(rec.ai_level_id)},businessCase:selected?{scenario:selected.scenario_name||'Escenario seleccionado',oneOff:selected.quote?.one_off_eur??o.quote?.one_off_eur??null,recurring:selected.quote?.recurring_monthly_eur??o.quote?.recurring_monthly_eur??null,tco12:selected.quote?.tco_12m_eur??o.quote?.tco_12m_eur??null}:null,nextStep:snap.answers?.DF098||''};
}
function publishResultsProjection(e){const projection=buildResultsProjection(e);if(!projection)return {ok:false,error:'Falta snapshot confirmado, TO-BE aprobado o diagnóstico oficial.'};localStorage.setItem(RESULTS_DISPLAY_KEY,JSON.stringify(projection));return {ok:true,projection}}
function readResultsProjection(){try{return JSON.parse(localStorage.getItem(RESULTS_DISPLAY_KEY)||'null')}catch{return null}}
function resultsMoney(v){return v===null||v===undefined?'No disponible':Number(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0})}
function resultsModePage(){
  const p=readResultsProjection();if(!p)return `<div class="empty session-idle"><h2>Resultados todavía no publicados</h2><p>El consultor debe aprobar y compartir los resultados desde AUNEA Internal.</p></div>`;
  const head=`<div class="session-display-head"><div><div class="screen-id">MODO RESULTADOS · SESSION 2</div><h1>${esc(p.process||'Resultados')}</h1><p class="subtitle">${esc(p.company||'')}</p></div><div class="session-sync"><span class="badge ok">Publicado ${esc(formatDateEs(p.publishedAt))}</span></div></div>`;
  const asis=`<div class="flow-canvas"><div class="flow-track">${(p.asis.steps||[]).map((s,i)=>`${i?'<div class="flow-connector"></div>':''}<div class="flow-step confirmed"><h4>${s.n}. ${esc(s.name)}</h4><p>${esc([s.actor,s.tool].filter(Boolean).join(' · ')||'—')}</p></div>`).join('')}</div></div>`;
  const findings=(p.findings||[]).map(x=>`<div class="result-item"><b>${esc(x.label)}</b><p>${x.confidence?`Confianza: ${esc(x.confidence)}`:''}</p></div>`).join('')||'<div class="empty"><p>Sin hallazgos adicionales publicados.</p></div>';
  const frictions=(p.asis.frictions||[]).map(x=>`<div class="result-item"><b>${esc(x.label)}</b>${x.signal?`<p>${esc(x.signal)}</p>`:''}</div>`).join('');
  const tobe=(p.tobe.items||[]).map((x,i)=>`<div class="result-item"><b>${i+1}. ${esc(x.step)} · ${esc(x.transformation)}</b><p>${esc([x.problemResolved,x.futureActor,x.tool,x.automationAi,x.humanSupervision,x.controlsRisk].filter(Boolean).join(' · '))}</p></div>`).join('');
  const comparison=(p.tobe.items||[]).map(x=>`<tr><td>${esc(x.step)}</td><td>${esc(x.transformation||'—')}</td><td>${esc(x.futureActor||'No disponible')}</td><td>${esc(x.tool||'No disponible')}</td><td>${esc(x.automationAi||'No disponible')}</td></tr>`).join('');
  const business=p.businessCase?`<div class="grid g3"><div class="notice"><b>Escenario</b><br>${esc(p.businessCase.scenario)}</div><div class="notice"><b>Inversión inicial</b><br>${resultsMoney(p.businessCase.oneOff)}</div><div class="notice"><b>TCO 12 meses</b><br>${resultsMoney(p.businessCase.tco12)}</div></div>`:'<div class="notice">Business case no disponible.</div>';
  return head+section('1. AS-IS confirmado','El proceso que validamos juntos.',`<div class="card card-pad">${asis}</div>`)+section('2. Qué detectamos y por qué','Hallazgos, fricciones, riesgos e impacto publicados.',`<div class="result-list">${findings}${frictions}</div><div class="grid g3" style="margin-top:12px"><div class="notice"><b>Trabajo activo anual</b><br>${p.impact.activeHours??'No disponible'}</div><div class="notice"><b>Espera anual</b><br>${p.impact.waitHours??'No disponible'}</div><div class="notice"><b>Riesgo residual</b><br>${esc(p.impact.residualRisk||'No disponible')}</div></div>`)+section('3. TO-BE aprobado','Cómo proponemos que funcione el proceso.',`<div class="result-list">${tobe}</div>`)+section('4. AS-IS vs TO-BE','Qué cambia, sin abrir una nueva captura.',`<div class="table-wrap"><table class="data-table"><thead><tr><th>Paso</th><th>Cambio</th><th>Responsable futuro</th><th>Herramienta</th><th>Automatización / IA</th></tr></thead><tbody>${comparison}</tbody></table></div>`)+section('5. Solución recomendada','Salida de los engines canónicos aprobada para esta devolución.',`<div class="grid g3"><div class="notice"><b>Acción</b><br>${esc(p.recommendation.action||'No disponible')}</div><div class="notice"><b>Nivel funcional</b><br>${esc(p.recommendation.functionalLevel||'No disponible')}</div><div class="notice"><b>IA</b><br>${esc(p.recommendation.aiLevel||'No disponible')}</div></div>`)+section('6. Escenario y business case','Datos procedentes del escenario seleccionado y Pricing Engine.',business)+section('7. Siguientes pasos','Cierre de la devolución.',`<div class="notice good"><b>Siguiente paso acordado</b><br>${esc(p.nextStep||'Pendiente de acordar')}</div>`);
}
function renderResultsMode(){const host=document.getElementById('content');if(host)host.innerHTML=resultsModePage()}
function bootResultsMode(){document.body.classList.add('session-display');renderResultsMode();window.addEventListener('storage',ev=>{if(ev.key===RESULTS_DISPLAY_KEY)renderResultsMode()})}
function openResultsMode(){const e=currentEng(),res=publishResultsProjection(e);if(!res.ok)return toast(res.error);advanceEngagementTo(e,'Sesión 2','apertura de Modo Resultados');saveState('Modo Resultados publicado para Session 2');const w=window.open(`${location.pathname}#results`,'aunea_results_mode');if(!w)toast('El navegador ha bloqueado la ventana. Permite ventanas emergentes para mostrar resultados.')}
function resultsModeLauncherPage(){const e=currentEng(),ready=!!buildResultsProjection(e);return pageTop('Modo Resultados','Superficie separada y de sólo lectura para la segunda sesión con cliente.',ready?'<button class="btn btn-primary" id="openResultsMode">Abrir Modo Resultados</button>':'')+section('Publication gate','La vista cliente sólo consume snapshot confirmado + outputs aprobados.',`<div class="notice ${ready?'good':'warn'}">${ready?'Listo para Session 2. No se recalculará nada al abrir la vista.':'Falta snapshot confirmado, TO-BE APPROVED_FOR_CLIENT/PUBLISHED o diagnóstico oficial.'}</div>`)}
function registerResultsModeLauncher(){if(typeof pages==='undefined'||registerResultsModeLauncher.done)return;registerResultsModeLauncher.done=true;pages.modoresultados=resultsModeLauncherPage;if(!INTERNAL_WORK_NAV.some(x=>x[0]==='modoresultados'))INTERNAL_WORK_NAV.push(['modoresultados','▤','Modo Resultados']);const originalPostBind=postBind;postBind=function(){originalPostBind();const b=document.getElementById('openResultsMode');if(b)b.onclick=openResultsMode}}
// [AUNEA-FE-PAGE-SESSION-DISPLAY-010] END
