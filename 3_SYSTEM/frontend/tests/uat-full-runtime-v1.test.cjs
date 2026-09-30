// [AUNEA-UAT-RUNTIME-125] START — Executable UAT with real HTML, full manifest runtime and all three business fixtures.
// A jsdom browser-surface integration test; does NOT assert real Chromium geometry or substitute client confirmation.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),manifest=JSON.parse(read('module-manifest.json')).modules;
function buildRuntime(storage){
 const errors=[],virtualConsole=new VirtualConsole();
 virtualConsole.on('jsdomError',e=>errors.push(String(e.message||e)));
 const dom=new JSDOM(html,{url:'http://localhost:5500/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window,context=dom.getInternalVMContext();
 const run=script=>vm.runInContext(script,context);
 w.console={...console,error:(...args)=>errors.push(args.map(String).join(' '))};
 w.fetch=async url=>{
   const u=new URL(String(url),'http://localhost:5500/index.html');
   if(u.pathname.endsWith('/health'))return {ok:false,status:503,json:async()=>({})};
   if(u.pathname.endsWith('/data/diagnostic-master.min.json'))return {ok:true,json:async()=>JSON.parse(read('data/diagnostic-master.min.json'))};
   if(u.pathname.includes('/uat/cases/')){
     const name=path.posix.basename(u.pathname);
     const allowed=new Set(['invoices.json','unified-requests.json','email-orders.json']);
     if(allowed.has(name))return {ok:true,status:200,json:async()=>JSON.parse(read('uat/cases/'+name))};
   }
   throw Error('Unexpected UAT fetch '+u.href);
 };
 w.requestAnimationFrame=cb=>{cb();return 1};
 // The source of truth for a reload is exactly the previously persisted JSON.
 if(storage)w.localStorage.setItem('aunea_internal_v1',storage);
 for(const m of manifest.filter(m=>m.path!=='boot.js')){
   try{run(read(m.path)+'\n//# sourceURL='+m.path)}catch(e){throw Error('Runtime module '+m.path+': '+e.stack)}
 }
 run('schema=applyDiagnosticMasterV12('+JSON.stringify(JSON.parse(read('data/diagnostic-master.min.json')))+');');
 return {w,dom,errors,run};
}
test('whole application: UAT3 click creates, navigates and restores three studies without UAT1/UAT2 or dummy confirmation',async()=>{
 const {w,dom,errors,run}=buildRuntime();
 run("state.activePage='uat';render()");
 const button=w.document.getElementById('loadUat3');
 assert.ok(button,'Generate must be visible on actual UAT page');
 assert.equal(button.disabled,false,'independent complete cases must not require UAT1/UAT2');
 await button.onclick();
 const rows=run('uat3Cases()');
 assert.equal(rows.length,3,'real UI click must create precisely three records');
 assert.match(w.document.getElementById('uat3LoadStatus').textContent,/Cargados y guardados: 3 estudios/);
 assert.equal(rows.reduce((n,e)=>n+e.processSteps.length,0),18);
 assert.equal(rows.reduce((n,e)=>n+e.frictions.length,0),9);
 assert.equal(rows.reduce((n,e)=>n+e.risks.length,0),6);
 const saved=w.localStorage.getItem('aunea_internal_v1');
 assert.ok(saved,'the application must actually persist the complete dataset');
 assert.equal(JSON.parse(saved).engagements.filter(e=>e.id.startsWith('UAT3-CASE-')).length,3);
 for(const e of rows){
   for(const [stage,requiredField] of [['S01','DF008'],['S02','DF011'],['S03','DF021'],['S04','DF031'],['S05','DF056'],['S06','DF066'],['S07','DF076'],['S08','DF086'],['S09','DF093']]){
     run('state.activePage="uat";render()');
     const stageLink=w.document.querySelector('[data-uat3-open="'+e.id+'"][data-uat3-page="diagnostico"][data-uat3-stage="'+stage+'"]');
     assert.ok(stageLink,e.id+' '+stage+' missing direct audit entrypoint');
     stageLink.onclick();
     assert.equal(run('currentEng().stageId'),stage);
     const body=w.document.getElementById('content').textContent;
     assert.ok(body.length>40,e.id+' '+stage+' empty screen');
     assert.doesNotMatch(body,/No se ha podido iniciar AUNEA Internal/);
     assert.equal(run('currentEng().id'),e.id);
   }
   run('state.activePage="uat";render()');
   const open=w.document.querySelector('[data-uat3-open="'+e.id+'"][data-uat3-page="proceso"]');
   assert.ok(open,e.id+' must offer the real map entrypoint');
   open.onclick();
   assert.equal(run('state.activePage'),'proceso');
   assert.equal(w.document.querySelectorAll('[data-graph-node]').length>=8,true,e.id+' lacks routed graph');
   for(const tab of ['cliente','fricciones','riesgos','impacto']){
     const nav=w.document.querySelector('[data-process-tab="'+tab+'"]');
     assert.ok(nav,e.id+' missing '+tab);
     nav.onclick();
     assert.equal(run('currentEng().processTab'),tab,e.id+' reset layer');
     assert.ok(w.document.querySelector('.flow-canvas'),e.id+' lost shared canvas in '+tab);
     assert.ok(w.document.querySelector('[data-process-engagement="'+e.id+'"]'));
   }
   assert.equal(run('currentEng().confirmedAsIs'),false);
   assert.equal(run('currentEng().confirmedSnapshots.length'),0);
 }
 assert.deepEqual(errors.filter(x=>/Error|TypeError|ReferenceError/.test(x)),[],'runtime console errors: '+errors.join(' / '));
 const reloaded=buildRuntime(saved);
 const after=reloaded.run('state.engagements.filter(e=>e.id.startsWith("UAT3-CASE-"))');
 assert.equal(after.length,3,'all three must survive full app reload');
 for(const e of after)assert.equal(e.processSteps.length,6);
 dom.window.close();reloaded.dom.window.close();
});
test('actual backend payload for all three scenarios derives input from the same real engagement, without fake confirmed outputs',()=>{
 const {w,dom,run}=buildRuntime();
 for(const name of ['invoices.json','unified-requests.json','email-orders.json']){
   const row=run('uat3Seed('+JSON.stringify(JSON.parse(read('uat/cases/'+name)))+')');
   run('state.engagements.push('+JSON.stringify(row.engagement)+')');
   const payload=run('buildBackendPayload(state.engagements[state.engagements.length-1])');
   assert.equal(payload.engagement_id,row.engagement.id);
   assert.equal(payload.questionnaire_answers.DF021,row.engagement.answers.DF021);
   assert.equal(payload.questionnaire_answers._process_steps.length,6);
   assert.equal(payload.questionnaire_answers._frictions.length,3);
   assert.equal(payload.risks.length,2);
   assert.deepEqual(Array.from(payload.risks[0].step_ids),Array.from(row.engagement.risks[0].step_ids),'risk-to-step relationship must survive frontend adapter');
   assert.equal(payload.economics.length,2);
   assert.equal(row.engagement.diagnosticOutput,null);
   assert.equal(row.engagement.confirmedAsIs,false);
 }
 dom.window.close();
});

test('three isolated sessions: sequential layer confirmation seals once; upstream edit reopens all four but retains immutable history',()=>{
 for(const file of ['invoices.json','unified-requests.json','email-orders.json']){
   const {w,dom,run}=buildRuntime();
   const row=run('uat3Seed('+JSON.stringify(JSON.parse(read('uat/cases/'+file)))+')');
   run('state.companies.push('+JSON.stringify(row.company)+');state.contacts.push(...'+JSON.stringify(row.contacts)+');state.engagements.push('+JSON.stringify(row.engagement)+');state.activeEngagementId='+JSON.stringify(row.engagement.id)+';state.activePage="proceso";');
   for(const [index,tab] of ['cliente','fricciones','riesgos','impacto'].entries()){
     run('currentEng().processTab='+JSON.stringify(tab)+';render()');
     assert.ok(w.document.getElementById('confirmAsIs'),file+' '+tab+' missing confirm action');
     w.document.getElementById('confirmAsIs').onclick();
     const e=run('currentEng()');
     assert.equal(e.confirmedAsIs,index===3,file+' cannot seal before all four layers');
   }
   const before=run('currentEng()');
   assert.equal(before.answers.DF093,'YES',file);
   assert.equal(before.confirmedSnapshots.length,1,file);
   assert.equal(run('hasConfirmedSnapshot(currentEng())'),true,file);
   const originalVolume=before.answers.DF021;
   run('setAnswer("DF021",'+(originalVolume+10)+')');
   const after=run('currentEng()');
   assert.equal(after.confirmedAsIs,false,file);
   assert.equal(after.answers.DF093,'',file);
   for(const layer of ['map','frictions','risks','impact'])assert.equal(after.layerConfirmations[layer],false,file+' '+layer);
   assert.equal(run('hasConfirmedSnapshot(currentEng())'),false,file);
   assert.equal(after.confirmedSnapshots.length,1,file+' lost immutable history');
   assert.equal(after.confirmedSnapshots[0].answers.DF021,originalVolume,file+' rewrote historical demand');
   assert.equal(after.diagnosticOutput,null,file+' left an obsolete computed result');
   dom.window.close();
 }
});
test('real Session Display excludes early capture and internal risks/economics from client projection',()=>{
 const {run,dom}=buildRuntime();
 const row=run('uat3Seed('+JSON.stringify(JSON.parse(read('uat/cases/invoices.json')))+')');
 run('state.companies.push('+JSON.stringify(row.company)+');state.engagements.push('+JSON.stringify(row.engagement)+')');
 const hidden=run('buildSessionSnapshot(state.engagements[0])');
 assert.equal(hidden.shared,false);assert.equal(hidden.steps.length,0);
 run('state.engagements[0].stageId="S07"');
 const shared=run('buildSessionSnapshot(state.engagements[0])');
 assert.equal(shared.shared,true);assert.equal(shared.steps.length,6);
 const raw=JSON.stringify(shared);
 for(const forbidden of ['likelihood_1_5','capacity_cost_rate_eur_hour','realized_cash_saving_eur_annual','deduplication_key','evidence_type','Pain_ID','pricing'])assert.equal(raw.includes(forbidden),false,forbidden+' leaked to client');
 dom.window.close();
});

test('all three UAT cases declare every applicable REQUIRED_90M field before human confirmation',()=>{
 const {run,dom}=buildRuntime();
 for(const name of ['invoices.json','unified-requests.json','email-orders.json']){
   const row=run('uat3Seed('+JSON.stringify(JSON.parse(read('uat/cases/'+name)))+')');
   run('state.companies.push('+JSON.stringify(row.company)+');state.contacts.push(...'+JSON.stringify(row.contacts)+');state.engagements.push('+JSON.stringify(row.engagement)+')');
   const missing=run('canonicalMissingRequired(state.engagements[state.engagements.length-1])');
   const expected=Array.from(missing).filter(x=>!['DF093','Confirmación AS-IS'].includes(x));
   assert.deepEqual(expected,[],name+' misses required capture fields: '+expected.join(', '));
 }
 dom.window.close();
});
// [AUNEA-UAT-RUNTIME-125] END

test('Block 2: all three cases reuse distinct DF047/DF049 projections, explain DF028 vs step rates, and propagate edits without duplicate ownership',()=>{
 for(const file of ['invoices.json','unified-requests.json','email-orders.json']){
  const {w,dom,run}=buildRuntime();
  const fixture=JSON.parse(read('uat/cases/'+file));
  const row=run('uat3Seed('+JSON.stringify(fixture)+')');
  run('state.companies.push('+JSON.stringify(row.company)+');state.contacts.push(...'+JSON.stringify(row.contacts)+');state.engagements.push('+JSON.stringify(row.engagement)+');state.activeEngagementId='+JSON.stringify(row.engagement.id)+';state.activePage="diagnostico";currentEng().stageId="S04";render()');
  const id=row.engagement.id;
  const sources=Array.from(run("reusedValue('DF047',currentEng())"));
  const documents=Array.from(run("reusedValue('DF049',currentEng())"));
  assert.ok(sources.length>0&&documents.length>0,file+': each projection should derive real step artifacts');
  assert.notDeepEqual(sources,documents,file+': source list cannot simply duplicate the document list');
  assert.ok(documents.every(v=>['FORM','EMAIL','TEXT','PDF','DOC','SHEET','IMAGE'].includes(v)),file+': documents show only documentary artifact types');
  assert.equal(run('Object.hasOwn(currentEng().answers,"DF047")'),false);
  assert.equal(run('Object.hasOwn(currentEng().answers,"DF049")'),false);
  const field47=run("schema.fields.find(f=>f.Field_ID==='DF047')");
  const field49=run("schema.fields.find(f=>f.Field_ID==='DF049')");
  assert.deepEqual(Array.from(run("effectiveValue(schema.fields.find(f=>f.Field_ID==='DF047'),currentEng())")),sources);
  assert.deepEqual(Array.from(run("effectiveValue(schema.fields.find(f=>f.Field_ID==='DF049'),currentEng())")),documents);
  const before=run("JSON.stringify(reusedValue('DF047',currentEng()))");
  run("currentEng().processSteps[0].inputs.push('API');invalidateProcessLayers(currentEng(),'map');");
  const after=run("JSON.stringify(reusedValue('DF047',currentEng()))");
  assert.notEqual(after,before,file+': adding a new input is propagated to source projection');
  assert.ok(Array.from(run("reusedValue('DF047',currentEng())")).includes('API'));
  assert.equal(run('Object.hasOwn(currentEng().answers,"DF047")'),false,'source view remains derived');
  // The global percentage is a declared process metric, not the arithmetic sum of step errors.
  run("currentEng().stageId='S03';render()");
  const message=w.document.querySelector('[data-global-failure-review="DF028"]')?.textContent||'';
  assert.match(message,/Tasa global declarada/);
  assert.match(message,/No se suman ni sustituyen/);
  assert.ok(message.includes(String(fixture.answers.DF028.value)),file+': preserves the actual client-declared figure');
  const globalBefore=run('JSON.stringify(currentEng().answers.DF028)');
  run("currentEng().processSteps[1].error_rate.value=9;invalidateProcessLayers(currentEng(),'map');render()");
  assert.equal(run('JSON.stringify(currentEng().answers.DF028)'),globalBefore,'a step change never fabricates a process-wide percentage');
  assert.match(w.document.querySelector('[data-global-failure-review="DF028"]').textContent,/9 %/);
  const oldCompany=row.company.name;
  run("setAnswer('DF001','Empresa verificada en la sesión')");
  assert.equal(run('state.companies.find(c=>c.id===state.engagements[0].companyId).name'),'Empresa verificada en la sesión');
  assert.equal(run("reusedValue('DF001',currentEng())"),'Empresa verificada en la sesión');
  assert.equal(run('currentEng().answers.DF001'),'Empresa verificada en la sesión');
  assert.notEqual(oldCompany,'Empresa verificada en la sesión');
  dom.window.close();
 }
});


test('Block 3: each actual business scenario exposes overlap context in S07 without converting declared followup/reporting into cash savings',()=>{
 for(const file of ['invoices.json','unified-requests.json','email-orders.json']){
  const {w,dom,run}=buildRuntime(),fixture=JSON.parse(read('uat/cases/'+file));
  const row=run('uat3Seed('+JSON.stringify(fixture)+')');
  run('state.companies.push('+JSON.stringify(row.company)+');state.contacts.push(...'+JSON.stringify(row.contacts)+');state.engagements.push('+JSON.stringify(row.engagement)+');state.activeEngagementId='+JSON.stringify(row.engagement.id)+';state.activePage="diagnostico";currentEng().stageId="S07";render()');
  const e=run('currentEng()');
  assert.equal(e.frictions.length,3);assert.equal(e.risks.length,2);
  assert.equal(e.frictions.every(f=>f.affected_steps.includes(f.time_attribution.step_id)),true);
  assert.equal(e.risks.every(r=>r.step_ids.length&&r.step_ids.every(id=>e.processSteps.some(s=>s.id===id))),true);
  for(const fid of ['DF080','DF081']){
    const el=w.document.querySelector('[data-economic-overlap-review="'+fid+'"]');
    // May be branch-conditional; the same owner-based context must remain available.
    const context=run('economicConditionalTimeContext('+JSON.stringify(fid)+',currentEng())');
    assert.match(context,/No se considera ahorro|Sólo valorar un ámbito adicional/);
    if(el)assert.equal(el.textContent,context);
    assert.equal(run('currentEng().answers.'+fid+'.value'),fixture.answers[fid].value);
  }
  assert.equal(e.economicInputs.every(x=>x.realized_cash_saving_eur_annual===0&&x.direct_loss_eur_annual===0),true);
  const payload=run('buildBackendPayload(currentEng())');
  assert.equal(payload.risks.length,2);
  for(let i=0;i<2;i++)assert.deepEqual(Array.from(payload.risks[i].step_ids),Array.from(e.risks[i].step_ids));
  assert.equal(payload.economics.every(x=>x.realized_cash_saving_eur_annual===0),true);
  assert.equal(e.confirmedAsIs,false);
  dom.window.close();
 }
});

test('temporary customer-view pause blocks launch and direct session/results URLs, but leaves the AS-IS editor available',()=>{
 const {w,dom,run}=buildRuntime();
 assert.equal(run('CLIENT_DISPLAY_PAUSED'),true);
 let opened=0;w.open=()=>{opened++;return {}};
 const writesBefore=w.localStorage.length;
 run('openSessionDisplay();openResultsMode()');
 assert.equal(opened,0,'no client window may open during flow review');
 assert.equal(w.localStorage.getItem('aunea_results_display_v1'),null,'never publishes results while paused');
 for(const hash of ['#session','#results']){
   w.location.hash=hash;
   run('bootPausedClientDisplay()');
   assert.match(w.document.getElementById('content').textContent,/Vista cliente temporalmente bloqueada/);
 }
 assert.equal(w.localStorage.length,writesBefore,'customer pause does not mutate persisted records');
 // A client-only display intentionally removes Console chrome; use a fresh editor window.
 const editor=buildRuntime();
 editor.w.location.hash='#process-editor';
 const row=editor.run('uat3Seed('+JSON.stringify(JSON.parse(read('uat/cases/invoices.json')))+')');
 editor.run('state.companies.push('+JSON.stringify(row.company)+');state.contacts.push(...'+JSON.stringify(row.contacts)+');state.engagements.push('+JSON.stringify(row.engagement)+');state.activeEngagementId='+JSON.stringify(row.engagement.id)+';state.activePage="proceso";render()');
 assert.notEqual(editor.w.document.getElementById('content').textContent.includes('Vista cliente temporalmente bloqueada'),true,'editable AS-IS must remain available');
 assert.ok(editor.w.document.querySelector('.flow-canvas'));
 assert.ok(read('boot.js').includes('CLIENT_DISPLAY_PAUSED){bootPausedClientDisplay();}'));
 editor.dom.window.close();dom.window.close();
});
