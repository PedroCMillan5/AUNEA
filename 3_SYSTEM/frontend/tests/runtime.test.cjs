// [AUNEA-UAT-RUNTIME-TEST-010] START — Regresión de arranque modular
// PURPOSE: Ejecutar recursos reales y recorrido de captura en un DOM aislado.
// SOURCE: REQ-CRM-002, REQ-DIAG-002, REQ-FRIC-001, REQ-UX-001, REQ-UAT-001; baseline v1.0.4 + V2.0.0 REVIEW runtime.
// INPUTS: frontend servido por HTTP; fixtures sintéticos locales.
// OUTPUTS: assertions ejecutadas; no equivale a validación visual en Chromium.
// SIDE_EFFECTS: servidores efímeros y almacenamiento de prueba en memoria.
// CHANGE_RISK: HIGH.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM, VirtualConsole} = require('jsdom');
const {createServer} = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('HTTP, arranque, modos UX, CRM, navegación, pasos, fricciones y persistencia aislada', async t => {
  const requests=[], errors=[];
  const server=createServer(async(req,res)=>{
    const name=req.url==='/'?'index.html':req.url.slice(1);
    requests.push(name);
    try { const bytes=await fs.readFile(path.join(root,name));
      res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html');
      res.end(bytes);
    } catch {res.statusCode=404;res.end('missing');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=await JSDOM.fromURL(url,{resources:'usable',runScripts:'dangerously',virtualConsole:console,beforeParse(w){
    w.structuredClone=structuredClone;
    w.fetch=(input,options)=>fetch(new URL(input,url),options);
    w.confirm=()=>true;
    w.URL.createObjectURL=()=> 'blob:uat';w.URL.revokeObjectURL=()=>{};
  }});
  t.after(()=>dom.window.close());
  const w=dom.window,d=w.document;
  async function until(fn){const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+d.body.textContent.slice(-1000));await new Promise(r=>setTimeout(r,20));}}
  const click=s=>{const el=d.querySelector(s);assert.ok(el,s);el.click();};
  const fill=(s,v)=>{const el=d.querySelector(s);assert.ok(el,s);el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  await until(()=>d.querySelector('h1'));
  assert.match(d.querySelector('h1').textContent,/Cockpit/);
  assert.match(d.title,/AUNEA Internal v2\.0\.0 REVIEW/);
  // The rail carries the AUNEA SYSTEM brand, per the approved references. The product version is
  // not shown there and is surfaced on Configuración/Admin instead, so this checks both: the rail
  // reproduces the reference, and the version is still reachable rather than quietly dropped.
  const railLogo=d.querySelector('#railHead .aunea-brand-logo');
  assert.ok(railLogo,'el rail usa el logo oficial');
  assert.match(railLogo.getAttribute('src'),/assets\/brand\/Logo\.png/);
  assert.doesNotMatch(d.querySelector('.sidebar').textContent,/v?2\.0\.0/i,'the rail must not carry a product version string');
  assert.equal(d.querySelectorAll('script:not([src])').length,0);
  for(const file of ['core/state.js','core/i18n.js','services/backend-client.js','services/schema.js','pages/diagnostic-stages.js','ui/renderer.js','domain/no-reask.js','domain/risk.js','domain/economics.js','domain/process-lifecycle.js','pages/results.js','domain/process.js','ui/process-help.js','services/engine-adapter.js','domain/completion.js','ui/shell.js','services/persistence.js','uat/visible.js','uat/crm-fixtures.js','uat/study-fixtures.js','boot.js','styles.css','data/diagnostic-master.min.json'])assert.ok(requests.includes(file),file);
  for(const retired of ['uat/fixtures.js','uat/asis-suite.js','uat/study-suite.js'])assert.ok(!requests.includes(retired),retired+' must be retired from the runtime after the UAT reset');
  assert.ok(!requests.includes('app-no-reask-capacity-v1.js'),'retired capacity wrapper must not be part of the runtime');
  assert.ok(!requests.includes('app-persistence-uat-v1.js'),'retired mixed persistence/UAT module must not be part of the runtime');
  assert.ok(!requests.includes('app-process-editor.js'),'retired mixed risk/economics/lifecycle module must not be part of the runtime');
  const schema=await (await fetch(url+'data/diagnostic-master.min.json')).json();
  assert.equal(new Set(schema.fields.map(f=>f.Field_ID)).size,100);
  assert.equal(schema.no_reask_rules.length,15);
  const phase1=JSON.parse(w.eval('JSON.stringify(phase1CrmSeed())'));
  assert.equal(phase1.companies.length,12,'Fase 1 UAT genera 12 empresas completas');
  assert.equal(phase1.contacts.length,24,'Fase 1 UAT genera 24 contactos completos');
  assert.equal(phase1.interactions.length,24,'Fase 1 UAT genera 24 interacciones completas');
  assert.equal(phase1.opportunities.length,16,'Fase 1 UAT genera 16 oportunidades completas');
  assert.equal('engagements' in phase1,false,'Fase 1 UAT no genera estudios');
  assert.equal('projects' in phase1,false,'Fase 1 UAT no genera proyectos');
  assert.equal(
    w.eval("auneaWorkspaceBackendCandidate({protocol:'https:',hostname:'sample-space-5500.app.github.dev'})"),
    'https://sample-space-8000.app.github.dev'
  );
  assert.equal(
    w.eval("auneaWorkspaceBackendCandidate({protocol:'http:',hostname:'127.0.0.1'})"),
    ''
  );
  assert.equal(typeof w.top,'object');assert.equal(typeof w.status,'string');
  assert.equal(d.querySelector('#uiModeToggle'),null);
  assert.ok(d.body.classList.contains('mode-internal'));
  click('[data-page="contactos"]');click('#addCompanyBtn');fill('#cCoName','UAT Runtime empresa');click('#modalSave');
  click('#addContactBtn');fill('#cContactFirst','UAT Contacto');fill('#cContactEmail','uat@example.invalid');click('#modalSave');
  click('[data-contact-study]');
  // Opening a study lands on the session surface: the top bar switches to the session context and
  // the private-console marker, and the open study is identified in the rail context card.
  assert.match(d.querySelector('#breadcrumb').textContent,/Sesión de diagnóstico/);
  assert.match(d.querySelector('#topbarContext').textContent,/Consola interna/);
  assert.match(d.querySelector('.rail-context').textContent,/UAT Runtime empresa/);
  assert.match(d.querySelector('#stepProgress').textContent,/Paso 1 de 9/);
  // DF001 arrives prefilled from the Company and carries its provenance chip — an ordinary filled
  // control, as the references show, not a blank question and not a read-only panel.
  const df001=d.querySelector('.field[data-field="DF001"]');
  assert.ok(df001,'DF001 debe renderizarse en la etapa de contexto');
  assert.ok(df001.innerHTML.includes('UAT Runtime empresa'),'DF001 llega prerrellenado desde la empresa');
  assert.ok(df001.querySelector('.prefill-chip'),'y declara de dónde viene');
  // C01: Teléfono is the prefix+number compound IMG90-01 shows, and both boxes write the single
  // Contact.Teléfono value that DEC-057 closes — not a second attribute.
  await t.test('PG01 Contexto uses only the shared AUNEA Select and no native dropdowns',()=>{
    w.eval("currentEng().stageId='S01';render()");
    const stage=d.querySelector('.stage-card');
    assert.ok(stage,'PG01 stage card exists');
    assert.equal(stage.querySelectorAll('select').length,0,'PG01 must not render any browser-native select');
    for(const selector of ['[data-pg01-contact-ref]','[data-pg01-company="sector"]','[data-pg01-company="orgType"]','[data-pg01-company="entryChannel"]']){
      const hidden=stage.querySelector(selector);
      assert.ok(hidden,selector+' exists');
      assert.ok(hidden.closest('.canonical-aunea-select')?.querySelector('.aunea-select'),'control is wrapped by the single AUNEA Select');
    }
  });
  await t.test('C01 PG01 phone compound writes one Contact field',()=>{
    const prefix=d.querySelector('[data-pg01-phone="prefix"]'),number=d.querySelector('[data-pg01-phone="number"]');
    assert.ok(prefix&&number,'Teléfono se compone de prefijo y número');
    const type=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))};
    type(prefix,'+34');type(number,'612 345 678');
    assert.equal(w.eval('state.contacts[0].phone'),'+34 612 345 678');
    assert.equal(w.eval('typeof state.contacts[0].phonePrefix'),'undefined','no second phone attribute is created');
  });
  await t.test('active context survives Inicio and Abrir / Continuar returns to the open diagnostic',()=>{
    w.eval("setPage('diagnostico')");
    const engId=w.eval('currentEng().id');
    click('#nav [data-page="inicio"]');
    assert.equal(w.eval('state.activePage'),'inicio');
    const open=d.querySelector(`[data-open-context="${engId}"]`);assert.ok(open,'el contexto activo ofrece Abrir / Continuar');
    open.click();
    assert.equal(w.eval('state.activeEngagementId'),engId);
    assert.equal(w.eval('state.activePage'),'diagnostico');
    assert.ok(d.querySelector('[data-field="DF008"]'),'PG01 vuelve a renderizarse');
  });

  await t.test('PG01 contextual Contact creation, conditional Otra and help popovers work in the real DOM',()=>{
    const contactsBefore=w.eval('state.contacts.length');
    const create=d.querySelector('[data-create-contact-for-field="DF007"]');assert.ok(create,'DF007 ofrece crear contacto');
    create.click();
    fill('#cContactFirst','Nueva decisora');
    fill('#cContactEmail','decision@example.invalid');
    click('#modalSave');
    assert.equal(w.eval('state.contacts.length'),contactsBefore+1,'el contacto se crea en CRM');
    const newId=w.eval('state.contacts[state.contacts.length-1].id');
    assert.ok(Array.from(w.currentEng().answers.DF007||[]).includes(newId),'y queda seleccionado en DF007');

    const other=d.querySelector('[data-multi="DF010"][value="OTHER"]');assert.ok(other,'DF010 incluye Otra');
    const detail=d.querySelector('[data-detail-wrap="DF010"]');assert.ok(detail);
    assert.equal(detail.style.display,'none','el detalle de Otra empieza oculto');
    other.checked=true;other.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.notEqual(detail.style.display,'none','el detalle aparece al seleccionar Otra');

    const help=d.querySelector('.field[data-field="DF008"] [data-help-toggle]');assert.ok(help,'DF008 tiene ayuda');
    const pop=d.getElementById(help.dataset.helpToggle);assert.ok(pop);
    help.click();
    assert.ok(pop.classList.contains('open'),'la ayuda se abre');
    assert.match(pop.textContent,/Para qué sirve:/);
  });

  // C01: Continuar refuses to skip a REQUIRED_90M field of S01; the canonical block is always visible.
  await t.test('C01 Continuar stops on a pending required field in the always-open block',()=>{
    const block=d.querySelector('section.pg01-disclosure');
    assert.ok(block,'PG01 mantiene visible Objetivo, criterios y restricciones');
    assert.match(block.textContent,/Objetivo, criterios y restricciones de la sesión/);
    assert.equal(w.eval('currentEng().stageId'),'S01');
    click('#nextStage');
    assert.equal(w.eval('currentEng().stageId'),'S01','no avanza mientras falte un obligatorio');
    assert.ok(d.querySelector('.field-pending'),'y el campo pendiente queda señalado');
    // With every S01 obligation answered, Continuar advances.
    w.eval(`(()=>{const e=currentEng();(schema.fields||[]).filter(f=>f.Stage_ID==='S01'&&f.Requiredness==='REQUIRED_90M').forEach(f=>{e.answers[f.Field_ID]=e.answers[f.Field_ID]||(f.Control_UI&&String(f.Control_UI).includes('MULTISELECT')?['__uat__']:'__uat__')});render()})()`);
    click('#nextStage');
    assert.equal(w.eval('currentEng().stageId'),'S02','con los obligatorios resueltos sí avanza');
    w.eval(`(()=>{const e=currentEng();e.stageId='S01';render()})()`);
  });
  // The rail no longer carries a single "Diagnóstico" entry: the approved references replace it with
  // the nine numbered session steps, so step 1 is how the diagnostic surface is reached.
  click('[data-stage-nav="S01"]');assert.ok(d.querySelector('h1'),'diagnostico');
  // B01 / VR-02: exercise the rendered navigation and its real click handlers in every context.
  const railPages=()=>Array.from(d.querySelectorAll('#nav [data-page]'),el=>el.dataset.page);
  const railStages=()=>Array.from(d.querySelectorAll('#nav [data-stage-nav]'),el=>el.dataset.stageNav);
  const crmPages=['inicio','empresas','contactos','interacciones','oportunidades','estudios','proyectos'];
  const internalPages=['resultados','tobe','comparacion','recomendacion','escenarios','quote','revision','modoresultados','implementacion'];
  const reached=new Set(['diagnostico']);
  await t.test('VR-02 CRM keeps all relationship pages reachable with an open engagement',()=>{
    click('#nav [data-page="inicio"]');
    for(const page of [...crmPages,'uat','admin']){
      click(`#nav [data-page="${page}"]`);reached.add(page);
      for(const target of crmPages)assert.ok(railPages().includes(target),`${page} -> ${target}`);
      assert.deepEqual(railStages(),[],'CRM must not mix in the diagnostic questionnaire');
      assert.ok(d.querySelector('h1'),page);
    }
    assert.match(d.querySelector('#breadcrumb').textContent,/UAT Runtime empresa/);
    click('#nav [data-page="contactos"]');
    assert.equal(d.querySelector('#breadcrumb').textContent,'CRM · Contactos');
  });
  await t.test('VR-02 Studies opens internal work for the selected engagement and keeps every output reachable',()=>{
    click('#nav [data-page="estudios"]');
    const engagementBefore=w.eval('JSON.stringify(currentEng())');
    click('[data-open-eng-page="resultados"]');
    for(const page of internalPages){
      click(`#nav [data-page="${page}"]`);reached.add(page);
      assert.ok(d.querySelector('h1'),page);
      for(const target of internalPages)assert.ok(railPages().includes(target),`${page} -> ${target}`);
      assert.ok(!railPages().includes('interacciones'));
      assert.ok(!railPages().includes('oportunidades'));
      assert.deepEqual(railStages(),[]);
    }
    assert.equal(w.eval('JSON.stringify(currentEng())'),engagementBefore,'navigation must not mutate capture, lifecycle, snapshots or outputs');
    click('#nav [data-page="diagnostico"]');
  });
  await t.test('VR-02 PG01–PG09 keep nine schema steps and exclude CRM/internal work in the Console',()=>{
    const ids=Array.from(w.eval('schema.flow.map(s=>s.Stage_ID)'));
    assert.equal(ids.length,9);
    assert.deepEqual(ids,['S01','S02','S03','S08','S04','S05','S06','S07','S09']);
    for(const mode of ['INTERNAL']){
      for(const stage of schema.flow){
        w.eval(`currentEng().stageId='${stage.Stage_ID}';render()`);
        assert.deepEqual(railStages(),ids,`${mode} / ${stage.Stage_ID}`);
        assert.deepEqual(railPages(),['inicio','proceso']);
        assert.doesNotMatch(d.querySelector('#nav').textContent,/Interacciones|Oportunidades|Trabajo interno|UAT|Configuración/);
        assert.equal(d.querySelector('#nav .nav-step.active').dataset.stageNav,stage.Stage_ID);
        assert.equal(w.eval('currentEng().stageId'),stage.Stage_ID);
        assert.ok(d.querySelector('h1'));
        const activeIndex=ids.indexOf(stage.Stage_ID);
        Array.from(d.querySelectorAll('#nav [data-stage-nav]')).forEach((el,i)=>assert.equal(el.disabled,i>activeIndex));
      }
      click('#nav [data-page="proceso"]');reached.add('proceso');
      assert.deepEqual(railPages(),['inicio','proceso']);
      assert.deepEqual(railStages(),ids);
      click(`#nav [data-stage-nav="${ids[0]}"]`);
    }
  });
  await t.test('PG04 target state keeps Otro conditional and questions 2/3 on full rows',async()=>{
    const html=w.eval(`(()=>{const f=schema.fields.find(x=>x.Field_ID==='DF086');return renderControl(f,[],fieldOptions(f.Option_Set_ID),currentEng())})()`);
    assert.match(html,/value="OTHER"/,'DF086 expone la opción canónica Otro');
    assert.match(html,/data-multi="DF086"/,'la opción Otro escribe sobre DF086');
    assert.match(html,/data-detail-wrap="DF086" style="display:none"/,'el detalle de Otro empieza oculto');
    const css=await fs.readFile(path.join(root,'ui-system.css'),'utf8');
    assert.match(css,/\.field\[data-field="DF087"\],[\s\S]*?\.field\[data-field="DF088"\]\{grid-column:1\/-1\}/,'DF087 y DF088 ocupan filas completas independientes');
  });
  await t.test('VR-02 stage labels and order react to schema changes without a second list',()=>{
    w.eval('window.__flowBefore=schema.flow; schema.flow=schema.flow.slice().reverse().map((s,i)=>i===0?{...s,Stage_ES:"Etapa de prueba del schema"}:s); render()');
    try{
      assert.deepEqual(railStages(),Array.from(w.eval('schema.flow.map(s=>s.Stage_ID)')));
      assert.match(d.querySelector('#nav .nav-step').textContent,/Etapa de prueba del schema/);
    }finally{w.eval('schema.flow=window.__flowBefore; delete window.__flowBefore; render()');}
  });
  await t.test('VR-02 session can return to CRM and reopen the same study without losing its stage',()=>{
    w.eval("currentEng().stageId='S04';render()");
    const before=w.eval('JSON.stringify(currentEng())');
    click('#nav [data-page="inicio"]');
    click('#nav [data-page="estudios"]');
    click('[data-open-eng]:not([data-open-eng-page])');
    assert.equal(w.eval('JSON.stringify(currentEng())'),before);
    assert.equal(d.querySelector('#nav .nav-step.active').dataset.stageNav,'S04');
    assert.deepEqual([...reached].sort(),Array.from(w.eval('Object.keys(pages)')).sort(),'every registered Console page was reached by real navigation');
  });
  click('[data-page="proceso"]');click('#addStepFromClient');fill('#step_name','Validar solicitud');fill('#step_type','ST02');fill('#step_actor','OPERATIONS');
  fill('#step_active','12');fill('#step_wait','60');fill('#step_rework','3');click('#modalSave');
  assert.equal(d.querySelector('#modalSave'),null);
  click('[data-process-tab="fricciones"]');click('#addFriction');click('[data-aunea-select-option="fr_type"]:not([data-value=""])');fill('#fr_signal','UAT: faltan datos en la solicitud');click('#modalSave');
  assert.ok(d.querySelector('#modalSave'),'La fricción sin paso ni causa debe seguir abierta');
  const stepChoice=d.querySelector('[data-v1-multi="fr_steps"]'),causeChoice=d.querySelector('[data-v1-multi="fr_causes"]');assert.ok(stepChoice);assert.ok(causeChoice);stepChoice.checked=true;causeChoice.checked=true;click('#modalSave');assert.equal(d.querySelector('#modalSave'),null);
  click('[data-process-tab="cliente"]');click('#confirmAsIs');
  click('[data-process-tab="fricciones"]');click('#confirmAsIs');
  click('[data-process-tab="riesgos"]');click('#confirmAsIs');
  click('[data-process-tab="impacto"]');click('#confirmAsIs');
  click('#saveBtn');
  const saved=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved.companies.length,1);assert.equal(saved.contacts.length,2);assert.equal(saved.engagements.length,1);
  assert.equal(saved.engagements[0].processSteps[0].active_time,12);
  assert.equal(saved.engagements[0].processSteps[0].wait_time,60);
  assert.equal(saved.engagements[0].processSteps[0].rework_time,3);
  assert.equal(saved.engagements[0].frictions[0].affected_steps.length,1);
  assert.ok(saved.engagements[0].frictions[0].derived_pain_id,'La fricción debe persistir Pain derivado');
  assert.equal(saved.engagements[0].confirmedAsIs,true);
  assert.equal(saved.recoveryMeta.format,'AUNEA_INTERNAL_STATE_V1');
  assert.equal(saved.recoveryMeta.productVersion,'2.0.0');
  await t.test('C07 internal review → results → decision → Project → Actuals/Outcomes',async()=>{
    w.eval(`(()=>{const e=currentEng();e.lastEngineSnapshotVersion=confirmedSnapshot(e).version;e.diagnosticOutput={optimal_scenario:{scenario_id:'SC-UAT',scenario_name:'Escenario UAT',economics:{annual_active_hours:12}},recommendation:{},economic_result:{},risk_result:{},pain_results:[]};state.activePage='tobe';render()})()`);
    click('#createTobeDraft');
    const tobeBefore=w.eval('JSON.stringify(confirmedSnapshot(currentEng()))');
    d.querySelectorAll('[data-tobe-field="transformation"]').forEach(el=>el.value='Se mantiene');
    click('#advanceTobe');click('#advanceTobe');
    assert.equal(w.eval('JSON.stringify(confirmedSnapshot(currentEng()))'),tobeBefore);
    click('#nav [data-page="revision"]');click('#createOutputReview');click('#advanceOutputReview');click('#advanceOutputReview');
    assert.equal(w.eval('engagementStatus(currentEng())'),'Listo para resultados');
    w.open=()=>({});click('#nav [data-page="modoresultados"]');click('#openResultsMode');
    assert.equal(w.eval('engagementStatus(currentEng())'),'Sesión 2');
    const originalFetch=w.fetch;
    w.fetch=async(input,options)=>{if(String(input).includes('/v1/solution-specifications/generate')){const body=JSON.parse(options.body);assert.equal(body.request.selected_scenario.scenario_id,'SC-UAT');return {ok:true,json:async()=>({specification_id:'SPEC-UAT',engagement_id:body.engagement.engagement_id,source_scenario_id:'SC-UAT',status:'BLOCKED_NOT_SYSTEM',outputs:[]})}}return originalFetch(input,options)};
    click('#nav [data-page="implementacion"]');click('#generateSpecification');await until(()=>d.querySelector('#approveSpecification'));click('#approveSpecification');click('#approveSpecification');click('#decideImplementation');
    assert.equal(w.eval('state.projects.length'),1);assert.equal(w.eval('engagementStatus(currentEng())'),'Cerrado');
    click('[data-project-actual]');fill('#actualPhase','Entrega');fill('#actualHours','2');fill('#actualEvidence','Parte de trabajo UAT');click('#modalSave');
    click('[data-project-outcome]');fill('#outcomeValue','10');fill('#outcomePeriod','2026');fill('#outcomeEvidence','Medición anual UAT');click('#modalSave');
    assert.equal(w.eval('state.projects[0].actuals[0].hours'),2);assert.equal(w.eval('projectLearning(state.projects[0])[0].delta'),-2);
    assert.match(d.querySelector('#content').textContent,/Estimado frente a real/);w.fetch=originalFetch;
  });
  click('#nav [data-page="inicio"]');click('[data-page="contactos"]');click('[data-contact-study]');click('#saveBtn');
  const saved2=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved2.companies.length,1);assert.equal(saved2.contacts.length,2);assert.equal(saved2.engagements.length,2);
  await t.test('client windows boot read-only without loading or saving Console records',async()=>{
    for(const hash of ['#session','#results']){
      const reads=[],writes=[],calls=[],clientErrors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>clientErrors.push(e.message));
      const client=await JSDOM.fromURL(url+hash,{resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(c){
        c.localStorage.setItem('aunea_internal_v1',JSON.stringify({companies:[{id:'SECRET',name:'Internal only'}]}));
        for(const key of ['aunea_session_display_v1','aunea_results_display_v1']){const value=w.localStorage.getItem(key);if(value)c.localStorage.setItem(key,value)}
        const proto=c.Storage.prototype,get=proto.getItem,set=proto.setItem;proto.getItem=function(k){reads.push(k);return get.call(this,k)};proto.setItem=function(k,v){writes.push(k);return set.call(this,k,v)};
        c.fetch=(...args)=>{calls.push(args);throw Error('Client must never call backend')};
      }});
      try{
        await new Promise(resolve=>client.window.addEventListener('load',resolve));
        const cd=client.window.document;
        assert.ok(cd.querySelector('h1,h2'));assert.equal(cd.querySelector('.sidebar,.topbar,input,select,textarea,button'),null);
        assert.equal(client.window.eval('state.companies.length'),0);assert.ok(!reads.includes('aunea_internal_v1'));
        cd.dispatchEvent(new client.window.Event('visibilitychange'));client.window.dispatchEvent(new client.window.Event('beforeunload'));
        assert.deepEqual(writes,[]);assert.deepEqual(calls,[]);assert.deepEqual(clientErrors,[]);
      }finally{client.window.close()}
    }
  });
  assert.deepEqual(errors,[]);
});
// [AUNEA-UAT-RUNTIME-TEST-010] END
