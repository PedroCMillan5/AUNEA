// [AUNEA-UAT-PG11-AUDIT-200] START — Transient audit, selective recovery and client exclusion.
// SOURCE: DEC-052/055; PG11 REVIEW. INPUTS: synthetic backend; OUTPUTS: assertions.
// SIDE_EFFECTS: none external. CHANGE_RISK: LOW.
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
function aiPilotHarness({fail=false,steps=['S1'],failReview=false,blockingSteps=[],protocol='PG11_REVIEW_20261103_3'}={}){
  const listeners=new Map(), nodes=new Map(), requests=[];
  let provider=null,renderCount=0,registrationCount=0,notice=null;
  let shouldFailReview=failReview;
  const snapshot={version:2};
  const diagnostic={input_snapshot_hash:'hash'};
  const tobe={version:1,sourceSnapshotVersion:2,status:'DRAFT',items:steps.map(sourceStepId=>({sourceStepId}))};
  const engagement={id:'SYNTHETIC',confirmedAsIs:true,tobeProposals:[tobe]};
  const proposal={status:'DRAFT',engagement_id:'SYNTHETIC',snapshot_version:2,
    item:{source_step_id:'S1',transformation:'Se modifica',problem_resolved:'Registro disperso',rationale:'Acción propuesta: registrar entradas. Resultado esperado: mayor trazabilidad. Justificación: el paso registra solicitudes',
      source_refs:['S1'],limitations:'Pendiente de revisión'},input_hash:'ENGAGEMENT_HASH_DIFFERENT_FROM_DIAGNOSTIC',model:'aunea-qwen3-4b:latest'};
  const button={disabled:false,textContent:'Preparar propuesta con IA'};
  const disk=new Map();
  const localStorage={getItem:key=>disk.get(key)||null,setItem:(key,value)=>disk.set(key,String(value))};
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
    state:{backendOnline:true,backendUrl:'http://localhost:8010',engagements:[engagement]},
    STORAGE_KEY:'aunea_internal_v1',localStorage,
    markDirty:()=>{},
    saveState:()=>{localStorage.setItem('aunea_internal_v1',JSON.stringify({engagements:[engagement]}));return true},
    confirmedSnapshot:()=>snapshot,currentDiagnosticOutput:()=>diagnostic,
    currentEng:()=>engagement,latestTobe:()=>engagement.tobeProposals.at(-1),
    tobeEditable:p=>p?.status==='DRAFT',AiAgentService:ai,
    buildBackendPayload:()=>({engagement_id:'SYNTHETIC'}),
    saveTobeFromDom:e=>sandbox.persistTobeAiDraft(e),
    checkBackend:async()=>true,render:()=>{renderCount++},toast:()=>{},
    now:()=> '2026-11-03T17:00:00Z',
    esc:x=>String(x),tobePage:()=>'<button class="btn" id="saveTobe">Guardar</button><div class="card card-pad section"></div>',
    registerInternalWorkPages:()=>{registrationCount++},postBind:()=>{},
    fetch:async(url,opts)=>{
      requests.push({url,opts});
      if(url.endsWith('/status'))return {ok:true,json:async()=>({status:'AVAILABLE',provider:'ollama',model:'aunea-qwen3-4b:latest',pg11_review_protocol:protocol})};
      if(url.endsWith('/tobe-review')&&shouldFailReview)return {ok:false,status:503,json:async()=>({detail:'Sin respuesta de Ollama.'})};
      if(url.endsWith('/tobe-review'))return {ok:true,json:async()=>({
        status:blockingSteps.length?'CHECKED_WITH_NOTES':'CHECKED',
        summary:'Coherencia global revisada',issues:[],
        protocol_revision:protocol,
        blocking_step_ids:blockingSteps,requires_human_review:true})};
      if(fail)return {ok:false,status:409,json:async()=>({detail:'El diagnóstico no corresponde al AS-IS vigente.'})};
      return {ok:true,json:async()=>({...proposal,
        item:{...proposal.item,source_step_id:JSON.parse(opts.body).source_step_id,source_refs:[JSON.parse(opts.body).source_step_id]},
        context_trace:{source_step_id:JSON.parse(opts.body).source_step_id,
          friction_ids:['F1'],risk_ids:[],evidence_ids:['EV-F1'],
          explicit_routes:[],unresolved_routes:[],
          diagnostic_mode:'REFERENCIA_HASH_SIN_DIAGNOSTICO_COMPLETO',
          context_scope:'SOLO_ESTUDIO_ACTIVO_CONFIRMADO'}})};
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(src,sandbox);
  vm.runInContext('registerInternalWorkPages();registerInternalWorkPages()',sandbox);
  document.__auneaAiPilotClickHandler=listeners.get('click');
  const click=()=>listeners.get('click')({
    target:{closest:selector=>selector==='#generateTobeAiPilot'?button:null},
    preventDefault:()=>{}
  });
  const clickFresh=()=>listeners.get('click')({
    target:{closest:selector=>selector==='#regenerateTobeAiPilot'?{disabled:false}:null},
    preventDefault:()=>{}
  });
  const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))};
  return {sandbox,click,clickFresh,settle,requests,button,notice,tobe,engagement,snapshot,diagnostic,setReviewFailure:v=>{shouldFailReview=v},
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
  assert.match(app.notice.outerHTML,/Auditoría técnica IA/);
  assert.ok(app.notice.outerHTML.includes('data-ai-audit-step'));
  assert.match(app.notice.outerHTML,/sólo se representa al solicitarlo/);
  assert.match(app.notice.outerHTML,/Estado de las propuestas IA/);
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
  assert.match(app.notice.outerHTML,/Estado de las propuestas IA/);
  assert.equal(app.renderCount,0);
});

test('consolidation retry reuses already generated activities',async()=>{
  const app=aiPilotHarness({steps:['S1','S2'],failReview:true});
  app.click();await app.settle();
  assert.equal(app.requests.length,4); // status, S1, S2, failed review
  assert.match(app.notice.textContent,/2 actividades conservadas/);
  app.setReviewFailure(false);
  app.click();await app.settle();
  assert.equal(app.requests.length,6); // next status + review; no step repeats
  assert.equal(app.requests[5].url,'http://localhost:8010/v1/internal-ai/tobe-review');
  assert.match(app.notice.outerHTML,/Resultado esperado/);
  assert.equal(app.renderCount,0);
});


// [AUNEA-UAT-PG11-REVIEW-ONLY-217] START — retry button must have a real, visible,
// review-only click path with 503 protection and zero repeated step requests.
test('retry-only click reports progress, invokes reviewer only, saves completed draft',async()=>{
  const app=aiPilotHarness({steps:['S1','S2','S3','S4'],failReview:true});
  app.click();await app.settle();
  assert.equal(app.requests.length,6);
  const saved=JSON.parse(app.sandbox.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved.engagements[0].tobeProposals[0].aiDraft.checkpoint.items.length,4);
  const delegate=app.sandbox.document.__auneaAiPilotClickHandler;
  const retry={disabled:false};
  app.setReviewFailure(false);
  const before=app.requests.length;
  delegate({target:{closest:s=>s==='#retryTobeAiReview'?retry:null},preventDefault(){}});
  assert.match(app.notice.textContent,/Comprobando disponibilidad del revisor global/,
    'click must immediately acknowledge work to the consultant');
  await app.settle();
  assert.equal(app.requests.length,before+2,'only status and reviewer are allowed');
  assert.equal(app.requests.at(-1).url,'http://localhost:8010/v1/internal-ai/tobe-review');
  assert.equal(app.requests.filter(x=>x.url.endsWith('/tobe-step')).length,4,
    'review click must not repeat any verified activity');
  assert.match(app.notice.outerHTML,/Propuesta IA guardada en el borrador/);
  const disk=JSON.parse(app.sandbox.localStorage.getItem('aunea_internal_v1'));
  assert.equal(disk.engagements[0].tobeProposals[0].aiDraft.proposal.items.length,4);
  assert.equal(app.tobe.status,'DRAFT','reviewer cannot approve consultant design');
});
test('retry-only click displays reviewer 503 without losing verified steps',async()=>{
  const app=aiPilotHarness({steps:['S1','S2','S3','S4'],failReview:true});
  app.click();await app.settle();
  const before=app.requests.length;
  const delegate=app.sandbox.document.__auneaAiPilotClickHandler;
  delegate({target:{closest:s=>s==='#retryTobeAiReview'?{disabled:false}:null},preventDefault(){}});
  await app.settle();
  assert.equal(app.requests.length,before+2);
  assert.equal(app.requests.at(-1).url,'http://localhost:8010/v1/internal-ai/tobe-review');
  assert.match(app.notice.outerHTML,/revisión global no se completó/i);
  assert.match(app.notice.outerHTML,/4 actividades verificadas permanecen guardadas/i);
  assert.match(app.notice.outerHTML,/Reintentar sólo la revisión global/);
  const disk=JSON.parse(app.sandbox.localStorage.getItem('aunea_internal_v1'));
  assert.equal(disk.engagements[0].tobeProposals[0].aiDraft.checkpoint.items.length,4);
  assert.equal(app.tobe.status,'DRAFT');
});
// [AUNEA-UAT-PG11-REVIEW-ONLY-217] END
test('PG11 review timeout shows four real verified proposals, stores checkpoint and resumes review after reload',async()=>{
  const app=aiPilotHarness({steps:['S1','S2','S3','S4'],failReview:true});
  app.click();await app.settle();
  assert.equal(app.requests.length,6,'status + four individual calls + one failed global review');
  assert.match(app.notice.outerHTML,/Propuestas IA verificadas por actividad/);
  assert.match(app.notice.outerHTML,/Intervención propuesta/);
  assert.match(app.notice.outerHTML,/Resultado esperado/);
  assert.match(app.notice.outerHTML,/4\/4/);
  assert.match(app.notice.outerHTML,/Reintentar sólo la revisión global/);
  assert.doesNotMatch(app.notice.outerHTML,/id="applyTobeAiPilot"/,
    'partial suggestions must never be transferred to an approved TO-BE');
  const saved=JSON.parse(app.sandbox.localStorage.getItem('aunea_internal_v1'));
  const checkpoint=saved.engagements[0].tobeProposals[0].aiDraft.checkpoint;
  assert.equal(checkpoint.items.length,4,'every step saved under the same version');
  assert.equal(checkpoint.stepSignature,'S1|S2|S3|S4');
  assert.doesNotMatch(JSON.stringify(checkpoint),/context_trace|original_response|prompt_eval_count|request/);
  vm.runInContext('__auneaAiCompletedSteps.clear()',app.sandbox);
  assert.equal(vm.runInContext('internalAiPendingSteps(currentEng(),internalAiPilotKey(currentEng())).items.size',
    app.sandbox),4,'recover persisted steps after reloading transient Map');
  app.setReviewFailure(false);
  app.click();await app.settle();
  assert.equal(app.requests.length,8,'retry only status and global review, never four old calls');
  assert.equal(app.requests.at(-1).url,'http://localhost:8010/v1/internal-ai/tobe-review');
  assert.match(app.notice.outerHTML,/Propuesta IA guardada en el borrador/);
});
test('fresh regeneration never reuses prior activities after a review failure',async()=>{
  const app=aiPilotHarness({steps:['S1','S2'],failReview:true});
  app.click();await app.settle();
  assert.equal(app.requests.length,4); // status, S1, S2, failed review
  app.setReviewFailure(false);
  app.clickFresh();await app.settle();
  assert.equal(app.requests.length,8); // status, NEW S1, NEW S2, review
  assert.deepEqual(app.requests.slice(5,7).map(x=>JSON.parse(x.opts.body).source_step_id),['S1','S2']);
  assert.match(app.notice.outerHTML,/Generar propuestas nuevas/);
  assert.equal(app.renderCount,0,'unsaved consultant form edits remain untouched');
});

test('clear keep-versus-change contradictions prevent applying AI suggestions',async()=>{
  const app=aiPilotHarness({blockingSteps:['S1']});
  app.click();await app.settle();
  assert.match(app.notice.outerHTML,/No apta para aplicar/);
  assert.match(app.notice.outerHTML,/S1/);
  assert.doesNotMatch(app.notice.outerHTML,/id="applyTobeAiPilot"/);
  assert.match(app.notice.outerHTML,/id="regenerateTobeAiPilot"/);
});

test('PG11 rejects stale backend before expensive local Ollama calls',async()=>{
  const app=aiPilotHarness({protocol:null,steps:['S1','S2']});
  app.click();await app.settle();
  assert.equal(app.requests.length,1,'Only read-only status; zero inference requests');
  assert.match(app.notice.textContent,/Versiones incompatibles de PG11/);
  assert.match(app.notice.textContent,/reinicia Uvicorn/);
  assert.equal(app.button.disabled,false);
});

test('PG11 shows reviewer protocol revision on new successful draft',async()=>{
  const app=aiPilotHarness();
  app.click();await app.settle();
  assert.equal(vm.runInContext('__auneaAiPreview.values().next().value.review.protocol_revision',app.sandbox),'PG11_REVIEW_20261103_3');
  assert.equal(app.requests.length,3);
});

test('failed activity retains its real audit, continues other steps, retries only failed activity',async()=>{
  const app=aiPilotHarness({steps:['S1','S2']});
  const base=app.sandbox.fetch;let failed=true;
  app.sandbox.fetch=async(url,opts)=>{
    const result=await base(url,opts);
    if(url.endsWith('/tobe-step')&&JSON.parse(opts.body).source_step_id==='S1'&&failed)
      return {ok:false,status:409,json:async()=>({detail:{message:'IA_STEP_REFS',context_trace:{source_step_id:'S1',redacted:true,attempts:[{sent:true,validation_status:'BLOQUEADO',error:'IA_STEP_REFS',original_response:{items:[]}}]}}})};
    return result;
  };
  app.click();await app.settle();
  assert.equal(app.requests.length,3);
  assert.match(app.notice.outerHTML,/Auditoría técnica IA/);
  assert.match(app.notice.textContent,/1 de 2 completadas/);
  failed=false;app.click();await app.settle();
  assert.deepEqual(app.requests.filter(r=>r.url.endsWith('/tobe-step')).map(r=>JSON.parse(r.opts.body).source_step_id),['S1','S2','S1']);
  assert.equal(app.renderCount,0);
});

test('audit displays transmitted values and blocks rendering or generation in client surface',async()=>{
  const app=aiPilotHarness();
  const context={current_activity:{id:'S1',step_name:'Registrar'},explicit_linked_frictions:[{id:'F1',observable_signal:'Entrada duplicada'}],official_diagnostic_findings:{linked_pain_results:[{pain_id:'P1',state:'INDICATED'}]}};
  app.sandbox.trace={S1:{attempts:[{sent:true,request_bytes:1234,budget_bytes:11000,prompt_eval_count:500,
    input_token_limit:4000,request:{messages:[{content:'Instrucciones reales'},{content:'DATOS\n'+JSON.stringify(context)}],options:{num_ctx:8192}},
    original_response:{items:[{source_step_id:'S1'}]},validation_status:'CONTRATO_VALIDO_PENDIENTE_REVISION'}]}};
  const html=vm.runInContext('internalAiPilotTracePanel(trace)',app.sandbox);
  assert.match(html,/Auditoría técnica IA/);
  assert.match(html,/data-ai-audit-step/);
  assert.doesNotMatch(html,/Entrada duplicada|Instrucciones reales/,'raw payload must be rendered on demand');
  const details=vm.runInContext('internalAiAuditContext(trace.S1,0)',app.sandbox);
  assert.match(details,/Entrada duplicada/);assert.match(details,/INDICATED/);assert.match(details,/1234/);
  assert.match(details,/Instrucciones reales/);assert.match(details,/data-ai-copy/);
  app.sandbox.isClientDisplay=()=>true;
  assert.equal(vm.runInContext('internalAiPilotPanel(currentEng())',app.sandbox),'');
  app.click();await app.settle();assert.equal(app.requests.length,0);
});


test('PG11 presents proposals first and review findings by activity without exposing raw audit',async()=>{
  const app=aiPilotHarness({blockingSteps:['S1'],steps:['S1','S2']});
  app.click();await app.settle();
  const html=app.notice.outerHTML;
  assert.ok(html.indexOf('Propuestas por actividad') < html.indexOf('Auditoría técnica IA'));
  assert.match(html,/Intervención propuesta/);
  assert.match(html,/Resultado esperado/);
  assert.match(html,/Observaciones generales/);
  assert.match(html,/No apta para aplicar/);
  assert.doesNotMatch(html,/id="applyTobeAiPilot"/);
  assert.match(html,/data-ai-audit-step/);
  assert.equal(app.renderCount,0,'unsaved consultant fields should not be re-rendered');
});

test('PG11 technical audit remains on-demand even with a large original HTTP request',()=>{
  const app=aiPilotHarness();
  const huge='DATOS_PRIVADOS__'+('X'.repeat(85000));
  app.sandbox.trace={S1:{attempts:[{sent:true,request:{messages:[{content:'Reglas'},{content:'DATOS\n'+JSON.stringify({private_data:huge})}]},
      request_bytes:88500,budget_bytes:90000,prompt_eval_count:3500,validation_status:'REVIEW'}]}};
  const html=vm.runInContext('internalAiPilotTracePanel(trace)',app.sandbox);
  assert.ok(html.length < 1500,'collapsed audit should not stringify or embed HTTP requests');
  assert.doesNotMatch(html,/DATOS_PRIVADOS__/);
  const expanded=vm.runInContext('internalAiAuditContext(trace.S1,0)',app.sandbox);
  assert.match(expanded,/DATOS_PRIVADOS__/);
});


test('PG11 retrieves saved but stale historical AI proposal as read-only instead of hiding it',()=>{
  const app=aiPilotHarness({steps:['S1']});
  app.tobe.aiDraft={
    sourceSnapshotVersion:2,diagnosticInputHash:'previous-diagnostic',savedAt:'2026-11-03T18:00:00Z',
    proposal:{status:'DRAFT',engagement_id:'SYNTHETIC',snapshot_version:2,input_hash:'PREVIOUS_HASH',
      model:'aunea-qwen3-4b:latest',items:[{source_step_id:'S1',
        transformation:'Se modifica',problem_resolved:'Fricción con trazabilidad',
        rationale:'Acción propuesta: validar antes del registro. Resultado esperado: menos errores. Justificación: evidencia previa.',
        source_refs:['S1'],limitations:'Revisión humana'}],
      review:{status:'CHECKED',summary:'Versión anterior',blocking_step_ids:[],issues:[]}}
  };
  assert.equal(vm.runInContext('internalAiSavedDraft(currentEng())',app.sandbox),null,
    'out-of-date snapshot must not be treated as applicable');
  const recovered=vm.runInContext('internalAiHistoricalDraft(currentEng())',app.sandbox);
  assert.equal(recovered.version,1);
  const html=vm.runInContext('internalAiPilotPanel(currentEng())',app.sandbox);
  assert.match(html,/Propuesta IA anterior recuperada/);
  assert.match(html,/validar antes del registro/);
  assert.doesNotMatch(html,/id="applyTobeAiPilot"/);
  assert.doesNotMatch(html,/id="saveTobeAiPilot"/);
});

test('PG11 describes missing local Ollama without wiping an existing saved proposal',async()=>{
  const app=aiPilotHarness();
  const oldDraft={sourceSnapshotVersion:2,diagnosticInputHash:'old',
    proposal:{items:[{source_step_id:'S1',rationale:'Resultado histórico'}]}};
  app.tobe.aiDraft=oldDraft;
  app.sandbox.fetch=async url=>({ok:true,json:async()=>({
    status:'UNAVAILABLE',provider:'ollama',reason:'No se encuentra Ollama activo en este equipo (127.0.0.1:11434).' })});
  app.click();await app.settle();
  assert.match(app.notice.textContent,/ollama list/);
  assert.match(app.notice.textContent,/127.0.0.1:11434/);
  assert.equal(app.tobe.aiDraft,oldDraft,'provider status must never erase archived draft');
});

test('Guardar borrador retains unapproved AI narrative and reviewer findings without HTTP trace',async()=>{
  const app=aiPilotHarness({blockingSteps:['S1'],steps:['S1','S2']});
  app.click();await app.settle();
  assert.equal(vm.runInContext('persistTobeAiDraft(currentEng())',app.sandbox),true);
  assert.equal(app.tobe.status,'DRAFT');
  assert.equal(app.tobe.aiDraft.sourceSnapshotVersion,2);
  assert.equal(app.tobe.aiDraft.diagnosticInputHash,'hash');
  assert.equal(app.tobe.aiDraft.proposal.input_hash,'ENGAGEMENT_HASH_DIFFERENT_FROM_DIAGNOSTIC');
  assert.equal(app.tobe.aiDraft.proposal.items.length,2);
  const beforeSave=vm.runInContext('internalAiPilotPanel(currentEng())',app.sandbox);
  assert.match(beforeSave,/Propuesta IA guardada en el borrador/,
    'a completed AI proposal must be durable even before the redundant manual-save click');
  assert.equal(vm.runInContext("saveState('Guardar borrador TO-BE')",app.sandbox),true);
  const inSession=vm.runInContext('internalAiPilotPanel(currentEng())',app.sandbox);
  assert.match(inSession,/Propuesta IA guardada en el borrador/);
  app.engagement.tobeProposals=JSON.parse(JSON.stringify(app.engagement.tobeProposals));
  assert.match(app.tobe.aiDraft.proposal.items[0].rationale,/Resultado esperado/);
  assert.deepEqual(JSON.parse(JSON.stringify(app.tobe.aiDraft.proposal.review.blocking_step_ids)),['S1']);
  assert.doesNotMatch(JSON.stringify(app.tobe.aiDraft),/context_traces|prompt_eval_count|\"request\"|original_response/);
  vm.runInContext('__auneaAiPreview.clear()',app.sandbox);
  const saved=vm.runInContext('internalAiSavedDraft(currentEng())',app.sandbox);
  assert.equal(saved.items.length,2);
  const html=vm.runInContext('internalAiPilotPanel(currentEng())',app.sandbox);
  assert.match(html,/Propuesta IA recuperada del borrador guardado/);
  assert.match(html,/Resultado esperado/);
  assert.match(html,/No apta para aplicar/);
  assert.doesNotMatch(html,/id="applyTobeAiPilot"/);
});

test('saved AI draft belongs only to its original confirmed snapshot and diagnostic',async()=>{
  const app=aiPilotHarness();
  app.click();await app.settle();
  assert.equal(vm.runInContext('persistTobeAiDraft(currentEng())',app.sandbox),true);
  vm.runInContext('__auneaAiPreview.clear()',app.sandbox);
  assert.ok(vm.runInContext('internalAiSavedDraft(currentEng())',app.sandbox));
  app.diagnostic.input_snapshot_hash='DIFFERENT';
  assert.equal(vm.runInContext('internalAiSavedDraft(currentEng())',app.sandbox),null);
  app.diagnostic.input_snapshot_hash='hash';
  app.snapshot.version=3;
  assert.equal(vm.runInContext('internalAiSavedDraft(currentEng())',app.sandbox),null);
});


test('a new TO-BE version never inherits the previous version AI suggestion',async()=>{
  const app=aiPilotHarness();
  app.click();await app.settle();
  assert.equal(vm.runInContext('persistTobeAiDraft(currentEng())',app.sandbox),true);
  const next={version:2,sourceSnapshotVersion:2,status:'DRAFT',items:[{sourceStepId:'S1'}]};
  app.engagement.tobeProposals.push(next);
  assert.equal(vm.runInContext('internalAiSavedDraft(currentEng())',app.sandbox),null);
  assert.equal(vm.runInContext('persistTobeAiDraft(currentEng())',app.sandbox),true);
  assert.equal(next.aiDraft,undefined,'the cached suggestion belongs to the previous version');
});

test('Guardar borrador invokes local save after collecting current TO-BE fields',()=>{
  const results=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
  assert.match(results,/saveTobeFromDom\(e\).*?persistTobeAiDraft\(e\)/s);
  assert.match(results,/if\(by\('saveTobe'\)\)by\('saveTobe'\)\.onclick=\(\)=>\{if\(saveTobeFromDom\(e\)&&saveState\('Guardar borrador TO-BE'\)\)render\(\)\}/);
});


test('the in-panel save actually saves local state and does not require another Ollama request',async()=>{
  const app=aiPilotHarness({blockingSteps:['S1']});
  app.click();await app.settle();
  const before=app.requests.length;
  const el={};
  app.sandbox.document.__auneaAiSaveTest=true;
  const clickHandler=app.sandbox.document.__auneaAiPilotClickHandler;
  assert.equal(typeof clickHandler,'function');
  clickHandler({target:{closest:selector=>selector==='#saveTobeAiPilot'?el:null},preventDefault(){}});
  assert.equal(app.requests.length,before);
  const saved=JSON.parse(app.sandbox.localStorage.getItem('aunea_internal_v1'));
  assert.equal(saved.engagements[0].tobeProposals[0].aiDraft.proposal.items.length,1);
  assert.match(app.notice.outerHTML,/Propuesta IA guardada en el borrador/);
  assert.doesNotMatch(app.notice.outerHTML,/id="applyTobeAiPilot"/);
});

test('PG11 styles use AUNEA System tokens, explicit spacing, responsive cards and contained audit',()=>{
  const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
  assert.match(css,/AUNEA-FE-PG11-AI-LAYOUT-203/);
  assert.match(css,/\.pg11-ai-panel\.card\{[\s\S]*?padding:clamp\(18px,2vw,28px\)/);
  assert.match(css,/\.pg11-ai-step-list\{display:grid;gap:14px/);
  assert.match(css,/\.pg11-ai-review-area pre\{[\s\S]*?overflow:auto/);
  assert.match(css,/@media\(max-width:520px\)\{/);
});

// [AUNEA-UAT-PG11-AUDIT-200] END
