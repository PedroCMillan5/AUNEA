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
     run('state.activeEngagementId='+JSON.stringify(e.id)+';state.activePage="diagnostico";currentEng().stageId='+JSON.stringify(stage)+';render()');
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
// [AUNEA-UAT-RUNTIME-125] END
