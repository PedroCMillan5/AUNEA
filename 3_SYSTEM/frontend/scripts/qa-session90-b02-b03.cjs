// [AUNEA-UAT-SESSION90-INTEGRATION-080] START — B02/B03 runtime against real HTTP backend
// PURPOSE: Exercise real dropdowns, modal saves, reload persistence and backend projections.
// SOURCE: DEC-065/068; Diagnostic Master v1.2 EAR-001/004/006/012.
// INPUTS: Local HTTP backend and synthetic isolated state. OUTPUTS: assertions.
// SIDE_EFFECTS: Temporary HTTP server and in-memory DOM/storage only. CHANGE_RISK: HIGH.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const {createServer}=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const backend=process.env.AUNEA_QA_BACKEND||'http://127.0.0.1:8010';
test('B02/B03 real HTTP capture, projection, persistence and incomplete states',async t=>{
  assert.equal((await fetch(backend+'/health')).status,200);
  const server=createServer(async(req,res)=>{
    const name=req.url==='/'?'index.html':req.url.slice(1);
    try {const bytes=await fs.readFile(path.join(root,name));res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html');res.end(bytes)}catch{res.statusCode=404;res.end('missing')}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>server.close(r)));
  const url=`http://127.0.0.1:${server.address().port}/`,errors=[];
  const until=async fn=>{const end=Date.now()+5000;while(!fn()){assert.ok(Date.now()<end,'runtime timeout');await new Promise(r=>setTimeout(r,10))}};
  async function boot(saved){
    const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
    const dom=await JSDOM.fromURL(url,{resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.fetch=(u,o)=>fetch(new URL(u,url),o);w.confirm=()=>true;if(saved)w.localStorage.setItem('aunea_internal_v1',saved)}});
    t.after(()=>dom.window.close());await until(()=>dom.window.document.querySelector('h1'));return dom.window;
  }
  let w=await boot(),d=w.document;
  const click=s=>{assert.ok(d.querySelector(s),s);d.querySelector(s).click()};
  const fill=(s,v)=>{assert.ok(d.querySelector(s),s);d.querySelector(s).value=v;d.querySelector(s).dispatchEvent(new w.Event('change',{bubbles:true}))};
  const select=(id,value)=>click(`[data-aunea-select-option="${id}"][data-value="${value}"]`);
  click('[data-page="contactos"]');click('#addCompanyBtn');fill('#cCoName','QA B02 B03');click('#modalSave');
  click('#addContactBtn');fill('#cContactFirst','QA');fill('#cContactEmail','qa@example.invalid');click('#modalSave');click('[data-contact-study]');
  w.eval(`state.backendUrl=${JSON.stringify(backend)};state.backendOnline=true;Object.assign(currentEng().answers,{DF021:100,DF022:'MONTH'});currentEng().processSteps=[
    {id:'S1',status:'ACTIVE',step_name:'Validar',active_time:10,wait_time:20,rework_time:5,error_rate:{mode:'percent',value:10},applies_to:{mode:'ALL'},occurrences_per_case:1},
    {id:'S2',status:'ACTIVE',step_name:'Registrar',active_time:4,wait_time:0,rework_time:0,applies_to:{mode:'ALL'},occurrences_per_case:1}];setPage('proceso')`);
  let fid;
  for(const mode of ['INCLUDED','BREAKDOWN','ADDITIONAL']){
    w.eval(`openFrictionModal(${fid?JSON.stringify(fid):'null'},['S1','S2'])`);
    if(!fid){click('[data-aunea-select-option="fr_type"]:not([data-value=""])');d.querySelector('[data-v1-multi="fr_causes"]').checked=true;fill('#fr_signal','Faltan datos')}
    fill('#fr_active',3);select('fr_active_mode','');fill('#fr_frequency',20);select('fr_frequency_mode','percent');select('fr_time_mode',mode);select('fr_time_owner','S1');
    click('#modalSave');assert.equal(d.querySelector('#modalSave'),null,'friction saved');
    fid=w.eval('currentEng().frictions[0].id');assert.equal(w.eval('currentEng().frictions.length'),1);
    w.eval('persistRecoverySnapshot("B02 QA")');
    const saved=JSON.parse(w.localStorage.getItem('aunea_internal_v1')).engagements[0].frictions[0];
    assert.equal(saved.time_attribution.mode,mode);assert.equal(saved.time_attribution.step_id,'S1');assert.equal(saved.affected_steps.length,2);
    const projection=await w.economicTimeProjection(w.eval('currentEng()'));
    assert.equal(projection.available,true,projection.reason);
    assert.equal(projection.additional,mode==='ADDITIONAL'?12:0);assert.equal(projection.active,280);assert.equal(projection.rework,10);assert.equal(projection.wait,400);
  }
  const saved=w.localStorage.getItem('aunea_internal_v1');w.close();w=await boot(saved);d=w.document;
  assert.equal(w.eval('currentEng().frictions[0].time_attribution.mode'),'ADDITIONAL');
  w.eval(`state.backendUrl=${JSON.stringify(backend)};state.backendOnline=true`);
  const subset=await w.economicTimeProjection(w.eval('currentEng()'),['S1']);
  assert.equal(subset.available,true,subset.reason);assert.equal(subset.additional,12);assert.equal(subset.active,200);
  await w.economicTimeProjection(w.eval('currentEng()'));
  assert.equal(w.eval('reusedValue("DF078",currentEng()).value'),14);
  assert.equal(w.eval('reusedValue("DF079",currentEng()).value'),0.5);
  for(const [driver,active,wait] of [['ED01',280,0],['ED05',10,0],['ED13',0,400]]){
    w.eval('currentEng().economicInputs=[];addEconomic()');
    select('econDriver',driver);await until(()=>d.querySelector('#econActive')?.disabled);
    select('econEvidence','CLIENT_DECLARED');click('#modalSave');
    assert.equal(w.eval('currentEng().economicInputs[0].annual_active_hours'),active);
    assert.equal(w.eval('currentEng().economicInputs[0].annual_wait_hours'),wait);
  }
  w.eval("currentEng().answers.DF022='WEEK';currentEng().economicInputs=[];addEconomic()");
  await until(()=>/semanas operativas/.test(d.querySelector('#economicDerivedPreview')?.textContent));
  assert.equal(d.querySelector('#econActive').disabled,false);
  assert.equal(w.eval('reusedValue("DF078",currentEng()).value'),14,'per-case measure is known even when annual calendar is missing');
  fill('#econActive',15);click('#modalSave');assert.equal(w.eval('currentEng().economicInputs.length'),0);
  select('econEvidence','CLIENT_DECLARED');click('#modalSave');assert.equal(w.eval('currentEng().economicInputs[0].annual_active_hours'),15);
  assert.equal(w.eval('currentEng().economicInputs[0].derivation_source'),'MANUAL_VALIDATION');
  const cases=[
    ['ED01','ED05',false,'active'],['ED01','ED01',false,'active'],
    ['ED02','ED02',false,'active'],['ED02','ED03',false,'active'],
    ['ED01','ED05',true,'active'],['ED09','ED11',false,'loss'],
    ['ED11','ED11',false,'loss'],['ED09','ED11',true,'loss'],
  ];
  for(const [left,right,disjoint,kind] of cases){
    const measure=kind==='active'?'annual_active_hours':'direct_loss_eur_annual';
    const one={driver_id:left,step_ids:['S1'],[measure]:100};
    const two={driver_id:right,step_ids:[disjoint?'S2':'S1'],[measure]:20};
    const blocked=w.economicCaptureIssues({economicInputs:[one]},two).length>0;
    const response=await fetch(backend+'/v1/diagnose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engagement_id:'QA-PARITY',process_instance_id:'QA-PROCESS',process_name:'QA',economics:[one,two]})});
    assert.equal(response.status,blocked?409:200,JSON.stringify({left,right,disjoint,kind}));
  }
  // A changed upstream input invalidates DF078/079 even before another HTTP call.
  w.eval('currentEng().processSteps[0].active_time=99');
  assert.equal(w.eval('reusedValue("DF078",currentEng())'),undefined);
  assert.deepEqual(errors,[]);
});
// [AUNEA-UAT-SESSION90-INTEGRATION-080] END
