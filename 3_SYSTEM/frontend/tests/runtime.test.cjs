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
  assert.match(d.querySelector('.brand strong').textContent,/AUNEA/);
  assert.match(d.querySelector('.brand span').textContent,/SYSTEM/);
  assert.doesNotMatch(d.querySelector('.sidebar').textContent,/v?2\.0\.0/i,'the rail must not carry a product version string');
  assert.equal(d.querySelectorAll('script:not([src])').length,0);
  for(const file of ['core/state.js','core/i18n.js','services/backend-client.js','services/schema.js','pages/diagnostic-stages.js','ui/renderer.js','domain/no-reask.js','domain/risk.js','domain/economics.js','domain/process-lifecycle.js','pages/results.js','domain/process.js','ui/process-help.js','services/engine-adapter.js','domain/completion.js','ui/shell.js','ui/mode.js','services/persistence.js','uat/visible.js','uat/fixtures.js','boot.js','styles.css','data/diagnostic-master.min.json'])assert.ok(requests.includes(file),file);
  assert.ok(!requests.includes('app-no-reask-capacity-v1.js'),'retired capacity wrapper must not be part of the runtime');
  assert.ok(!requests.includes('app-persistence-uat-v1.js'),'retired mixed persistence/UAT module must not be part of the runtime');
  assert.ok(!requests.includes('app-process-editor.js'),'retired mixed risk/economics/lifecycle module must not be part of the runtime');
  const schema=await (await fetch(url+'data/diagnostic-master.min.json')).json();
  assert.equal(new Set(schema.fields.map(f=>f.Field_ID)).size,100);
  assert.equal(schema.no_reask_rules.length,15);
  assert.equal(typeof w.top,'object');assert.equal(typeof w.status,'string');
  assert.ok(d.querySelector('#uiModeToggle'));
  click('#uiModeToggle');assert.ok(d.body.classList.contains('mode-session'));assert.equal(d.querySelector('[data-page="admin"]'),null);
  click('#uiModeToggle');assert.ok(d.body.classList.contains('mode-internal'));
  click('[data-page="contactos"]');click('#addCompanyBtn');fill('#cCoLegal','UAT Runtime empresa');click('#modalSave');
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
  // The rail no longer carries a single "Diagnóstico" entry: the approved references replace it with
  // the nine numbered session steps, so step 1 is how the diagnostic surface is reached.
  click('[data-stage-nav="S01"]');assert.ok(d.querySelector('h1'),'diagnostico');
  for(const page of ['inicio','contactos','estudios','proyectos','proceso','resultados','recomendacion','escenarios','quote','uat','admin']){click(`[data-page="${page}"]`);assert.ok(d.querySelector('h1'),page);}
  // Every one of the nine canonical stages is reachable from the rail.
  for(const s of ['S01','S02','S03','S04','S05','S06','S07','S08','S09'])assert.ok(d.querySelector(`[data-stage-nav="${s}"]`),s);
  click('[data-page="proceso"]');click('#addStep');fill('#step_name','Validar solicitud');fill('#step_type','ST02');fill('#step_actor','OPERATIONS');
  fill('#step_active','12');fill('#step_wait','60');fill('#step_rework','3');click('#modalSave');
  assert.equal(d.querySelector('#modalSave'),null);
  click('[data-process-tab="fricciones"]');click('#addFriction');d.querySelector('#fr_type').selectedIndex=1;fill('#fr_signal','UAT: faltan datos en la solicitud');click('#modalSave');
  assert.ok(d.querySelector('#modalSave'),'La fricción sin paso ni causa debe seguir abierta');
  const stepChoice=d.querySelector('[data-v1-multi="fr_steps"]'),causeChoice=d.querySelector('[data-v1-multi="fr_causes"]');assert.ok(stepChoice);assert.ok(causeChoice);stepChoice.checked=true;causeChoice.checked=true;click('#modalSave');assert.equal(d.querySelector('#modalSave'),null);
  click('[data-process-tab="revision"]');click('#confirmAsIs');click('#saveBtn');
  const saved=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved.companies.length,1);assert.equal(saved.contacts.length,1);assert.equal(saved.engagements.length,1);
  assert.equal(saved.engagements[0].processSteps[0].active_time,12);
  assert.equal(saved.engagements[0].processSteps[0].wait_time,60);
  assert.equal(saved.engagements[0].processSteps[0].rework_time,3);
  assert.equal(saved.engagements[0].frictions[0].affected_steps.length,1);
  assert.ok(saved.engagements[0].frictions[0].derived_pain_id,'La fricción debe persistir Pain derivado');
  assert.equal(saved.engagements[0].confirmedAsIs,true);
  assert.equal(saved.recoveryMeta.format,'AUNEA_INTERNAL_STATE_V1');
  assert.equal(saved.recoveryMeta.productVersion,'2.0.0');
  click('[data-page="contactos"]');click('[data-contact-study]');click('#saveBtn');
  const saved2=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved2.companies.length,1);assert.equal(saved2.contacts.length,1);assert.equal(saved2.engagements.length,2);
  assert.deepEqual(errors,[]);
});
// [AUNEA-UAT-RUNTIME-TEST-010] END