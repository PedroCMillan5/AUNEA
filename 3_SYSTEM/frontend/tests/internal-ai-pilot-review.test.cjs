const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'domain/internal-ai-pilot.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'module-manifest.json'),'utf8'));

test('AI PG11 runs only with explicit button action and confirmed official snapshot',()=>{
  assert.match(src,/generateTobeAiPilot/);
  assert.match(src,/confirmedSnapshot\(e\)/);
  assert.match(src,/currentDiagnosticOutput\(e\)/);
  assert.match(src,/status!=='AVAILABLE'/);
  assert.match(src,/AiAgentService\.propose\('TOBE_DRAFT'/);
  assert.match(src,/requiresHumanReview|requires_human_review|status!=='DRAFT'/);
});
test('AI cannot silently overwrite user edits or publish',()=>{
  assert.match(src,/!String\(target\[dst\]\|\|''\)\.trim\(\)/);
  assert.doesNotMatch(src,/advanceTobeStatus\(/);
  assert.doesNotMatch(src,/approvedOutputReview\(/);
});
test('module is installed after engine-adapter and before boot',()=>{
  const list=manifest.modules.map(x=>x.path);
  const addon='domain/internal-ai-pilot.js';
  assert.ok(list.indexOf(addon)>list.indexOf('services/engine-adapter.js'));
  assert.ok(list.indexOf(addon)<list.indexOf('boot.js'));
  assert.match(index,/domain\/internal-ai-pilot\.js/);
});


// Behavioral regression: the button must respond to a real delegated click,
// show backend failures permanently, and keep the active consultant inputs intact.
const vm=require('node:vm');
function aiPilotHarness({fail=false,steps=['S1'],failReview=false}={}){
  const listeners=new Map(), nodes=new Map(), requests=[];
  let provider=null,renderCount=0,registrationCount=0,notice=null;
  let shouldFailReview=failReview;
  const engagement={id:'SYNTHETIC',confirmedAsIs:true};
  const snapshot={version:2};
  const diagnostic={input_snapshot_hash:'hash'};
  const proposal={status:'DRAFT',engagement_id:'SYNTHETIC',snapshot_version:2,
    item:{source_step_id:'S1',transformation:'Se modifica',problem_resolved:'Registro disperso',rationale:'Acción propuesta: registrar entradas. Resultado esperado: mayor trazabilidad. Justificación: el paso registra solicitudes',
      source_refs:['S1'],limitations:'Pendiente de revisión'},input_hash:'hash',model:'aunea-qwen3-4b:latest'};
  const button={disabled:false,textContent:'Preparar propuesta con IA'};
  notice={textContent:'',className:'notice info',outerHTML:''};
  nodes.set('generateTobeAiPilot',button);nodes.set('tobeAiPilotStatus',notice);
  const document={
    addEventListener:(type,fn)=>listeners.set(type,fn),
    getElementById:id=>nodes.get(id)||null
  };
  const ai={
    available:()=>!!provider, register:p=>{provider=p},
    clear:()=>{provider=null},
    propose:async(kind,e)=>({proposal:await provider.propose({kind,engagement:e})})
  };
  const sandbox={
    document,console,Map,Set,Error,String,JSON,Promise,
    state:{backendOnline:true,backendUrl:'http://localhost:8010'},
    confirmedSnapshot:()=>snapshot,currentDiagnosticOutput:()=>diagnostic,
    currentEng:()=>engagement,latestTobe:()=>({status:'DRAFT',items:steps.map(sourceStepId=>({sourceStepId}))}),
    tobeEditable:p=>p?.status==='DRAFT',AiAgentService:ai,
    buildBackendPayload:()=>({engagement_id:'SYNTHETIC'}),
    checkBackend:async()=>true,render:()=>{renderCount++},toast:()=>{},
    esc:x=>String(x),tobePage:()=>'<button class="btn" id="saveTobe">Guardar</button><div class="card card-pad section"></div>',
    registerInternalWorkPages:()=>{registrationCount++},postBind:()=>{},
    fetch:async(url,opts)=>{
      requests.push({url,opts});
      if(url.endsWith('/status'))return {ok:true,json:async()=>({status:'AVAILABLE',provider:'ollama',model:'aunea-qwen3-4b:latest'})};
      if(url.endsWith('/tobe-review')&&shouldFailReview)return {ok:false,status:503,json:async()=>({detail:'Sin respuesta de Ollama.'})};
      if(url.endsWith('/tobe-review'))return {ok:true,json:async()=>({status:'CHECKED',summary:'Coherencia global revisada',
        issues:[],requires_human_review:true})};
      if(fail)return {ok:false,status:409,json:async()=>({detail:'El diagnóstico no corresponde al AS-IS vigente.'})};
      return {ok:true,json:async()=>({...proposal,item:{...proposal.item,source_step_id:JSON.parse(opts.body).source_step_id,source_refs:[JSON.parse(opts.body).source_step_id]}})};
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(src,sandbox);
  vm.runInContext('registerInternalWorkPages();registerInternalWorkPages()',sandbox);
  const click=()=>listeners.get('click')({
    target:{closest:selector=>selector==='#generateTobeAiPilot'?button:null},
    preventDefault:()=>{}
  });
  const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))};
  return {sandbox,click,settle,requests,button,notice,setReviewFailure:v=>{shouldFailReview=v},
    get renderCount(){return renderCount},get registrationCount(){return registrationCount}};
}
test('AI button click reaches backend once and preserves draft inputs on success',async()=>{
  const app=aiPilotHarness();
  assert.equal(app.registrationCount,2);
  app.click();
  assert.equal(app.button.disabled,true);
  await app.settle();
  assert.equal(app.requests.length,3);
  assert.equal(app.requests[1].url,'http://localhost:8010/v1/internal-ai/tobe-step');
  assert.equal(app.requests[2].url,'http://localhost:8010/v1/internal-ai/tobe-review');
  assert.match(app.notice.outerHTML,/Resultado esperado/);
  assert.match(app.notice.outerHTML,/Propuesta TO-BE IA sin aprobar/);
  assert.equal(app.renderCount,0,'No re-render that could erase unsaved TO-BE edits');
  assert.equal(app.button.disabled,false);
});
test('failed AI request displays durable HTTP detail, re-enables the button, no silent reset',async()=>{
  const app=aiPilotHarness({fail:true});
  app.click();
  await app.settle();
  assert.equal(app.requests.length,2);
  assert.match(app.notice.textContent,/HTTP 409/);
  assert.match(app.notice.textContent,/diagnóstico no corresponde/);
  assert.equal(app.notice.className,'notice warn');
  assert.equal(app.button.disabled,false);
  assert.equal(app.renderCount,0);
});

test('one Ollama request per source activity',async()=>{
  const app=aiPilotHarness({steps:['S1','S2','S3']});
  app.click();await app.settle();
  assert.equal(app.requests.length,5);
  assert.deepEqual(app.requests.slice(1,4).map(x=>JSON.parse(x.opts.body).source_step_id),['S1','S2','S3']);
  assert.equal(JSON.parse(app.requests[4].opts.body).items.length,3);
  assert.match(app.notice.outerHTML,/Propuesta TO-BE IA sin aprobar/);
  assert.equal(app.renderCount,0);
});
