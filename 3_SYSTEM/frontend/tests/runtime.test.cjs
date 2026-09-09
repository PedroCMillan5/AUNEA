// [AUNEA-UAT-RUNTIME-TEST-010] START — Regresión de arranque modular
// PURPOSE: Ejecutar recursos reales y recorrido de captura en un DOM aislado.
// SOURCE: REQ-CRM-002, REQ-DIAG-002, REQ-FRIC-001 y baseline v1.0.4.
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

test('HTTP, arranque, CRM, navegación, pasos, fricciones y persistencia aislada', async t => {
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
  }});
  t.after(()=>dom.window.close());
  const w=dom.window,d=w.document;
  async function until(fn){const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+d.body.textContent.slice(-1000));await new Promise(r=>setTimeout(r,20));}}
  const click=s=>{const el=d.querySelector(s);assert.ok(el,s);el.click();};
  const fill=(s,v)=>{const el=d.querySelector(s);assert.ok(el,s);el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  await until(()=>d.querySelector('h1'));
  assert.match(d.querySelector('h1').textContent,/Cockpit/);
  assert.equal(d.querySelectorAll('script:not([src])').length,0);
  for(const file of ['app-core.js','app-diagnostic-fields.js','app-process-editor.js','app-results.js','app-shell.js','app.js','styles.css','data/diagnostic-master.min.json'])assert.ok(requests.includes(file),file);
  const schema=await (await fetch(url+'data/diagnostic-master.min.json')).json();
  assert.equal(new Set(schema.fields.map(f=>f.Field_ID)).size,100);
  assert.equal(schema.no_reask_rules.length,15);
  assert.equal(typeof w.top,'object');assert.equal(typeof w.status,'string');
  click('[data-page="contactos"]');click('#addCompany');fill('#mCompany','UAT Runtime empresa');click('#modalSave');
  click('#addContact');fill('#mContactName','UAT Contacto');fill('#mContactEmail','uat@example.invalid');click('#modalSave');
  click('[data-contact-study]');
  assert.match(d.querySelector('#breadcrumb').textContent,/UAT Runtime empresa/);
  const q=d.querySelector('[data-answer="DF001"]');assert.equal(q.value,'UAT Runtime empresa');
  for(const page of ['inicio','contactos','estudios','proyectos','diagnostico','proceso','resultados','recomendacion','escenarios','quote','admin']){click(`[data-page="${page}"]`);assert.ok(d.querySelector('h1'),page);}
  click('[data-page="proceso"]');click('#addStep');fill('#step_step_name','Validar solicitud');fill('#step_step_type','ST02');fill('#step_actor','OPERATIONS');
  if(!d.querySelector('#step_actor').value) d.querySelector('#step_actor').selectedIndex=1;
  fill('#step_active_time','12');fill('#step_wait_time','60');fill('#step_rework_time','3');click('#modalSave');
  assert.equal(d.querySelector('#modalSave'),null);
  click('[data-process-tab="fricciones"]');click('#addFriction');d.querySelector('#fr_type').selectedIndex=1;fill('#fr_signal','UAT: faltan datos en la solicitud');click('#modalSave');
  assert.ok(d.querySelector('#modalSave'),'La fricción sin paso debe seguir abierta');
  d.querySelector('[data-fr-step]').checked=true;click('#modalSave');assert.equal(d.querySelector('#modalSave'),null);
  click('[data-process-tab="revision"]');click('#confirmAsIs');click('#saveBtn');
  const saved=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved.companies.length,1);assert.equal(saved.contacts.length,1);assert.equal(saved.engagements.length,1);
  assert.equal(saved.engagements[0].processSteps[0].active_time,'12');
  assert.equal(saved.engagements[0].processSteps[0].wait_time,'60');
  assert.equal(saved.engagements[0].processSteps[0].rework_time,'3');
  assert.equal(saved.engagements[0].frictions[0].affected_steps.length,1);
  assert.equal(saved.engagements[0].confirmedAsIs,true);
  click('[data-page="contactos"]');click('[data-contact-study]');click('#saveBtn');
  const saved2=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved2.companies.length,1);assert.equal(saved2.contacts.length,1);assert.equal(saved2.engagements.length,2);
  assert.deepEqual(errors,[]);
});
// [AUNEA-UAT-RUNTIME-TEST-010] END
