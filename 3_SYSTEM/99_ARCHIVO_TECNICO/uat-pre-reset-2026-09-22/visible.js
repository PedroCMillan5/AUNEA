// [AUNEA-FE-UAT-VISIBLE-055] START — UAT visible aislada
// PURPOSE: Expose internal-only canonical UAT execution/results without owning persistence or recovery behavior.
// SOURCE: REQ-UAT-001/002/003; DEC-040/042.
// INPUTS: shared application state; /v1/uat/run backend response.
// OUTPUTS: visible expected/actual PASS/FAIL view stored in state.uatLastRun.
// SIDE_EFFECTS: isolated backend UAT HTTP call and QA-only state update.
// CHANGE_RISK: HIGH.
if(!SYSTEM_NAV.some(x=>x.length>1&&x[0]==='uat')){const i=SYSTEM_NAV.findIndex(x=>x.length>1&&x[0]==='admin');SYSTEM_NAV.splice(i<0?SYSTEM_NAV.length:i,0,['uat','✓','UAT / QA'])}
function uatStatusBadge(ok){return `<span class="status ${ok?'green':'red'}">${ok?'PASS':'FAIL'}</span>`}
function uatPage(){
  const u=state.uatLastRun;
  const summary=u?`<div class="grid g4"><div class="card metric"><small>Fixtures</small><strong>${u.fixture_count}</strong><span>canónicos</span></div><div class="card metric"><small>Assertions</small><strong>${u.assertion_count}</strong><span>expected vs actual</span></div><div class="card metric"><small>PASS</small><strong>${u.pass_count}</strong><span>comprobaciones</span></div><div class="card metric"><small>FAIL</small><strong>${u.fail_count}</strong><span>${u.pass?'suite válida':'revisión necesaria'}</span></div></div>`:'';
  const fixtures=u?.fixtures||[];
  return pageTop('UAT / QA','Pruebas automáticas aisladas: backend canónico + CRM automático. Los 40 UATs CRM manuales se ejecutan aparte con el dataset dummy.',`<button class="btn" id="exportBackup">Exportar backup</button><button class="btn" id="importBackup">Restaurar backup</button><button class="btn btn-primary" id="runVisibleUAT">Ejecutar UATs automáticos</button>`)+summary+
    section('Persistencia y recuperación','El estado del Engagement se guarda localmente y se recupera al volver a abrir la herramienta.',`<div class="notice good"><strong>Recovery snapshot:</strong> ${esc(state.recoveryMeta?.savedAt?fmtDate(state.recoveryMeta.savedAt):'se crea al editar/guardar')}<br>Relaciones activas: ${state.companies.length} empresas · ${state.contacts.length} contactos · ${state.engagements.length} estudios · ${state.projects.length} proyectos.</div>`)+
    section('Resultado de la suite',u?`${uatStatusBadge(u.pass)} <span class="field-help">${esc(u.suite)} · ejecución aislada=${u.isolated?'sí':'no'}</span><div class="result-list" style="margin-top:12px">${fixtures.map(f=>`<div class="result-item"><div style="display:flex;justify-content:space-between;gap:12px"><b>${esc(f.test_id)} · ${esc(f.title)}</b>${uatStatusBadge(f.pass)}</div><p>${esc(f.input_summary)}</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Assertion</th><th>Expected</th><th>Actual</th><th>Estado</th><th>Refs</th></tr></thead><tbody>${f.assertions.map(a=>`<tr><td><b>${esc(a.assertion_id)}</b></td><td>${esc(JSON.stringify(a.expected))}</td><td>${esc(JSON.stringify(a.actual))}</td><td>${uatStatusBadge(a.pass)}</td><td>${esc((a.refs||[]).join(' · '))}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>`:`<div class="empty"><h2>UAT todavía no ejecutada</h2><p>Conecta el backend y pulsa “Ejecutar UATs automáticos”. La suite usa cinco fixtures canónicos independientes de tus datos.</p></div>`)
}
pages.uat=uatPage;
async function runVisibleUAT(){
  if(!state.backendOnline){await checkBackend();if(!state.backendOnline){render();return toast('Backend no disponible. Inícialo antes de ejecutar la UAT.')}}
  const btn=document.getElementById('runVisibleUAT');if(btn){btn.disabled=true;btn.textContent='Ejecutando…'}
  try{
    const r=await fetch(`${state.backendUrl}/v1/uat/run`,{method:'POST',headers:{'Content-Type':'application/json'}});if(!r.ok)throw new Error(await r.text());
    const out=await r.json();if(out.fixture_count!==5||out.assertion_count!==26)throw new Error(`Contrato UAT inesperado: ${out.fixture_count} fixtures / ${out.assertion_count} assertions`);
    state.uatLastRun={...out,ranAt:now()};persistRecoverySnapshot('uat');audit(`UAT ${out.pass?'PASS':'FAIL'}: ${out.pass_count}/${out.assertion_count}`);render();toast(out.pass?'UAT PASS: 26/26.':'UAT con fallos: revisa el detalle.');
  }catch(err){toast('Error ejecutando UAT: '+err.message);if(btn){btn.disabled=false;btn.textContent='Ejecutar UATs automáticos'}}
}
const __auneaPostBindUatBase=postBind;
postBind=function(){
  __auneaPostBindUatBase();
  const u=document.getElementById('runVisibleUAT'),ex=document.getElementById('exportBackup'),im=document.getElementById('importBackup');
  if(u)u.onclick=runVisibleUAT;if(ex)ex.onclick=exportStateBackup;if(im)im.onclick=importStateBackup;
};
// [AUNEA-FE-UAT-VISIBLE-055] END
