// [AUNEA-UAT-PG11-GLOBAL-OVERVIEW-288] START — global IA is not a TO-BE field writer.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../pages/results.js'),'utf8');
const ai=fs.readFileSync(path.join(__dirname,'../domain/internal-ai-pilot.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../ui-system.css'),'utf8');
const block=src.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-OVERVIEW-284\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-OVERVIEW-284\] END/)?.[0];
const contextBlock=src.match(/\/\/ \[AUNEA-FE-PG11-CONTEXT-289\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-CONTEXT-289\] END/)?.[0];

function harness(result){
  if(!block)throw Error('Falta sección global IA en PG11');
  const model={
    status:'DRAFT',version:2,sourceSnapshotVersion:3,
    aiGlobal:result?{tobeVersion:2,sourceSnapshotVersion:3,diagnosticInputHash:'HASH',
      result:{status:'DRAFT',engagement_id:'E1',snapshot_version:3,summary:'Mejorar la captura sin aumentar carga.',
      opportunities:result}}:undefined,
  };
  const env={e:{id:'E1',frictions:[{id:'F1',client_label:'Datos vivos no confirmados'}],
    confirmedSnapshots:[{version:3,frictions:[{id:'F1',status:'ACTIVE',
      client_label:'Captura duplicada',frequency:{value:100,mode:'percent',period:'case'},
      active_time_loss:{value:5,unit:'min'},time_attribution:{mode:'INCLUDED',step_id:'S1'},
      evidence_type:'EV02'}],risks:[]}]},p:model};
  const sandbox={
    currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
    tobeEditable:p=>p.status==='DRAFT',
    tobeProposalSourceSteps:()=>[{id:'S1',step_name:'Recepción'}],
    tobeProposalSnapshot:e=>e.confirmedSnapshots[0],
    engagementOfRecord:e=>e,esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
    attr:x=>String(x??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),
    tobeHumanReviewRecord:(_,p)=>p.aiDraft?.humanReview||null,
    internalAiGlobalWorking:()=>false,internalAiGlobalMessage:()=>null,
  };
  vm.createContext(sandbox);vm.runInContext(block,sandbox);
  return {html:()=>sandbox.tobeGlobalOverviewHtml(env.e,env.p),env};
}

test('PG11 shows current context before global analysis, then the activity review',()=>{
  assert.ok(src.indexOf('<section class="tobe-context"')<src.indexOf('tobeGlobalOverviewHtml(e,p)+'));
  assert.ok(src.indexOf('tobeGlobalOverviewHtml(e,p)+')<src.indexOf('tobeGuidedNavHtml(e,p)+'));
  assert.match(src,/01 · INFORMACIÓN GENERAL/);
});

test('section 01 shows only confirmed source facts and not later live edits',()=>{
  assert.ok(contextBlock,'Missing source-only PG11 context block');
  const snapshot={
    version:3,processName:'Registro de facturas',
    company:{name:'Empresa confirmada'},
    processSteps:[{id:'S1'},{id:'S2'}],
    answers:{DF011:'Registro de facturas',DF012:'Recibir PDF',DF013:'Registrar en ERP',
      DF008:'Reducir trabajo manual',DF086:['Trazabilidad'],
      DF087:['Conservar autorización'],DF088:['No delegar aprobaciones'],
      DF090:['Sin acceso externo']},
  };
  const sandbox={
    schema:{fields:[]},
    tobeProposalSnapshot:()=>snapshot,
    diagnosticOutputFreshness:()=>({label:'Resultado vigente'}),
    formatContextValue:(_,v)=>Array.isArray(v)?v.join(' · '):String(v),
    esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
  };
  vm.createContext(sandbox);vm.runInContext(contextBlock,sandbox);
  const html=sandbox.tobeContextOverviewHtml({answers:{DF008:'Dato vivo modificado'},id:'E1'},
    {status:'DRAFT',sourceSnapshotVersion:3});
  assert.match(html,/Registro de facturas/);
  assert.match(html,/Empresa confirmada/);
  assert.match(html,/Recibir PDF/);
  assert.match(html,/Registrar en ERP/);
  assert.match(html,/Reducir trabajo manual/);
  assert.match(html,/Conservar autorización/);
  assert.match(html,/No delegar aprobaciones/);
  assert.match(html,/Resultado vigente/);
  assert.match(html,/2 actividades/);
  assert.doesNotMatch(html,/Dato vivo modificado/);
  assert.match(html,/<details class="tobe-context-details">/);
  assert.doesNotMatch(html,/<input|<textarea|<select/i);
});

test('section 01 renders missing client constraints as missing, never as fabricated declarations',()=>{
  const sandbox={schema:{fields:[]},
    tobeProposalSnapshot:()=>({version:2,processName:'Proceso',
      processSteps:[],answers:{DF012:'Inicio',DF013:'Fin'}}),
    diagnosticOutputFreshness:()=>({label:'Diagnóstico vigente'}),
    formatContextValue:(_,v)=>String(v),
    esc:x=>String(x??''),
  };
  vm.createContext(sandbox);vm.runInContext(contextBlock,sandbox);
  const html=sandbox.tobeContextOverviewHtml({id:'E1'}, {status:'DRAFT',sourceSnapshotVersion:2});
  assert.match(html,/No consta/);
  assert.doesNotMatch(html,/Cliente autorizó|Sin restricciones declaradas/);
});

test('section 01 remains visible in guided mode with System-native styling',()=>{
  assert.match(css,/\.tobe-workspace\[data-tobe-mode="guided"\] \.tobe-context\{display:flex\}/);
  assert.match(css,/\.tobe-global-analysis\{/);
  assert.match(css,/var\(--system-line\)/);
});

test('global button is separate from per-step generation and displays no fabricated KPIs',()=>{
  const output=harness(null).html();
  assert.match(output,/id="analyzeTobeGlobal"/);
  assert.match(output,/Analizar proceso con IA/);
  assert.doesNotMatch(output,/\-\d+%|\+\d+%/);
  assert.match(ai,/tobe-global-plan/);
  assert.match(ai,/call\('tobe-global'/);
  assert.match(ai,/\/v1\/internal-ai\/tobe-step/);
  assert.match(ai,/__auneaAiWorking\.has\(key\)/);
});

test('global objectives reveal a grounded explanation and restrictions on demand',()=>{
  const output=harness([{objective:'Evitar duplicar la recepción de información',
    how:'Reutilizar la captura existente y aclarar el traspaso.',
    why:'Existe una fricción F1 relacionada con entrada repetida.',
    constraints:'No modificar el sistema principal sin autorización.',
    source_refs:['S1','F1']}]).html();
  assert.match(output,/Evitar duplicar/);
  assert.match(output,/Intervención IA inicial:/);
  assert.match(output,/<details><summary>Ver justificación y restricciones/);
  assert.match(output,/No modificar el sistema principal/);
  assert.match(output,/Paso: Recepción/);
  assert.match(output,/Fricción: Captura duplicada/);
  assert.match(output,/Sin aprobar/);
});

test('global explanation uses confirmed friction metrics and does not read later live changes',()=>{
 const output=harness([{objective:'Reducir trabajo repetido de captura',
   how:'Reutilizar la información sin duplicar registros.',
   why:'El 100 % de los casos registra 5 minutos de captura repetida.',
   constraints:'Mantener controles y autorizaciones.',
   source_refs:['F1']}]).html();
 assert.match(output,/Fricción: Captura duplicada/);
 assert.match(output,/Frecuencia 100 %/);
 assert.match(output,/Trabajo 5 min \(ya incluido en el paso\)/);
 assert.match(output,/Origen: Declarado por el cliente/);
 assert.doesNotMatch(output,/Datos vivos no confirmados/);
 assert.match(output,/Contrasta las cifras con las referencias del AS-IS confirmado/);
});

test('saved text is shown verbatim even when Ollama ended a sentence abruptly',()=>{
 const h=harness([{objective:'Reducir tiempos de reintroducción manual',
   how:'Implementar una mejora directa en el ERP, este paso debe a',
   why:'El 100 % de los casos presenta reintroducción documentada.',
   constraints:'Mantener las autorizaciones.',source_refs:['S1','F1']}]);
 h.env.p.aiGlobal.result.summary=
   'Se identifican tres oportunidades operativas. Las intervenciones prop';
 const html=h.html();
 assert.match(html,/Propuesta incompleta · Reanalizar/);
 assert.match(html,/Análisis anterior incompleto/);
 assert.match(html,/Se muestra íntegra tal como la devolvió Ollama/);
 assert.match(html,/Volver a analizar/);
 assert.match(html,/Las intervenciones prop/);
 assert.match(html,/este paso debe a/);
 assert.match(html,/tobe-global-opportunity-body/);
 assert.ok(h.env.p.aiGlobal.result.summary.includes('intervenciones prop'),
   'the historical record remains intact until an explicit new generation');
});

test('complete global summaries and recommendations are shown in full beyond 240 characters',()=>{
 const longSummary=('Se identifican mejoras en la coordinación del proceso. ').repeat(7).trim();
 const how=('Reutilizar registros existentes con validación del responsable, '+
   'sin interrumpir los trabajos ni suprimir la aprobación humana. ').repeat(5).trim();
 const h=harness([{objective:'Mejorar visibilidad y trazabilidad',
   how,why:'El proceso presenta reintroducción de datos documentada.',
   constraints:'Mantener autorización humana.',source_refs:['S1']}]);
 h.env.p.aiGlobal.result.summary=longSummary;
 assert.ok(how.length>240&&longSummary.length>240);
 const html=h.html();
 assert.ok(html.includes(longSummary));
 assert.ok(html.includes(how));
 assert.doesNotMatch(html,/Análisis anterior incompleto/);
});

test('PG11 can display five independent recommendations and an incompatible alternative',()=>{
 const recs=Array.from({length:5},(_,i)=>({
   objective:'Intervención '+(i+1)+' sobre fricción independiente',
   how:'Mejorar el registro y control del problema '+(i+1)+'.',
   why:'Existe una fricción diferente confirmada por el estudio.',
   constraints:'Conservar permisos existentes.',source_refs:['F1'],
   review:{status:'CONDITIONED',reason:'Revisar compatibilidad técnica.',conflicts:[]}
 }));
 recs[0].review={status:'INCOMPATIBLE',
   reason:'Sustituye una decisión humana obligatoria.',
   conflicts:[{source:'DF087',reason:'Conservar aprobación humana.'}]};
 recs[0].alternative={how:'Emitir avisos sin sustituir la aprobación humana.',
   why:'Seguimiento de pendientes.',review:{
     status:'CONDITIONED',reason:'Comprobar herramientas existentes.',conflicts:[]}};
 const h=harness(recs);
 h.env.p.aiGlobal.result.complete=true;
 h.env.p.aiGlobal.result.progress={completed:5,total:5,failed:0};
 const html=h.html();
 assert.equal((html.match(/class="tobe-global-opportunity"/g)||[]).length,5);
 assert.match(html,/Fuentes revisadas: 5 de 5/);
 assert.match(html,/Descartada por incompatibilidad explícita/);
 assert.match(html,/Alternativa propuesta/);
 assert.match(html,/Emitir avisos sin sustituir la aprobación humana/);
 assert.match(html,/DF087: Conservar aprobación humana/);
});

test('stale global response cannot appear as current after AS-IS change',()=>{
  const h=harness([{objective:'Oportunidad antigua',how:'Intervención antigua',why:'Referencia anterior',
    constraints:'',source_refs:['S1']}]);
  h.env.p.aiGlobal.sourceSnapshotVersion=1;
  assert.doesNotMatch(h.html(),/Oportunidad antigua/);
  assert.match(h.html(),/Análisis pendiente/);
});

test('global IA uses the existing local endpoint and durably saves only DRAFT suggestions',async()=>{
  const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
  assert.ok(aiBlock,'Missing existing global IA engine');
  const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[{sourceStepId:'S1',futureActor:'Consultor'}]};
  const e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
  const calls=[],saved=[],messages=[];
  let persisted='';
  const sandbox={
    __auneaAiWorking:new Set(),
    __auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
    internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',
    currentEng:()=>e,
    latestTobe:()=>p,
    confirmedSnapshot:()=>({version:3}),
    currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
    tobeEditable:owner=>owner.status==='DRAFT',
    isClientDisplay:()=>false,
    saveTobeFromDom:()=>true,
    saveState:label=>{saved.push(label);persisted=JSON.stringify({engagements:[e]});return true;},
    markDirty:label=>messages.push(label),
    toast:label=>messages.push(label),
    now:()=> '2026-11-05T18:00:00Z',
    STORAGE_KEY:'UAT_STORE',
    localStorage:{getItem:key=>key==='UAT_STORE'?persisted:null},
    document:{getElementById:()=>null},
    state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
    checkBackend:async()=>true,
    buildBackendPayload:()=>({engagement_id:'E1'}),
    console:{error:()=>{}},
    fetch:async(url,options={})=>{
      calls.push({url,options});
      if(url.endsWith('/status'))return {ok:true,json:async()=>({
        status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3',pg11_global_strategy:'SCOPED_V2'})};
      if(url.endsWith('/tobe-global-plan'))return {ok:true,json:async()=>({
        engagement_id:'E1',snapshot_version:3,input_hash:'HASH_BACKEND',
        focus:[{source_id:'S1',label:'Recepción',type:'STEP'}]})};
      if(url.endsWith('/tobe-global'))return {ok:true,json:async()=>({
        status:'DRAFT',engagement_id:'E1',snapshot_version:3,input_hash:'HASH_BACKEND',
        model:'local-pilot',summary:'Reducir duplicidades manteniendo los controles.',
        focus_source_id:'S1',has_more:false,
        opportunities:[{objective:'Evitar dobles entradas',how:'Reusar datos confirmados.',
          why:'Existe una duplicidad documentada.',constraints:'Mantener aprobación humana.',
          source_refs:['S1'],review:{status:'CONDITIONED',reason:'Comprobar viabilidad.',conflicts:[]}}],
      })};
      throw Error('Unexpected endpoint: '+url);
    },
  };
  vm.createContext(sandbox);vm.runInContext(aiBlock,sandbox);
  await sandbox.generateTobeGlobal(e);
  assert.equal(calls.filter(x=>x.url.endsWith('/tobe-global')).length,1);
  const request=JSON.parse(calls.find(x=>x.url.endsWith('/tobe-global')).options.body);
  assert.equal(request.snapshot_version,3);
  assert.equal(request.confirmed_as_is,true);
  assert.equal(request.diagnostic.input_snapshot_hash,'HASH');
  assert.equal(p.aiGlobal.result.status,'DRAFT');
  assert.equal(p.aiGlobal.result.opportunities[0].source_refs[0],'S1');
  assert.equal(p.aiGlobal.result.complete,true);
  assert.equal(p.aiGlobal.result.progress.total,1);
  assert.equal(p.items[0].futureActor,'Consultor');
  assert.equal(JSON.parse(persisted).engagements[0].tobeProposals[0].aiGlobal.result.summary,
    'El análisis de las fuentes confirmadas identifica 1 intervención para revisión del consultor.');
  assert.ok(saved.length>=5,'the reset, initial progress, each unit and consolidated result must be saved');
  assert.equal(sandbox.internalAiGlobalMessage(e).working,false);
  assert.match(sandbox.internalAiGlobalMessage(e).message,/guardada/);
});

test('global orchestration persists five sources, reasons for discard and a validated alternative',async()=>{
 const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
 assert.ok(aiBlock);
 const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[]},
   e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
 const ids=['F1','F2','F3','F4','F5'];
 let persisted='',count=0,alternatives=0,blockedConstraints=[];
 const env={
   __auneaAiWorking:new Set(),__auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
   internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',currentEng:()=>e,latestTobe:()=>p,
   confirmedSnapshot:()=>({version:3}),
   currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
   saveState:()=>{persisted=JSON.stringify({engagements:[e]});return true},
   markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06T12:00:00Z',
   STORAGE_KEY:'STORE',localStorage:{getItem:()=>persisted},
   document:{getElementById:()=>null},
   state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
   checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
   console:{error:()=>{}},
   fetch:async(url,opts={})=>{
     if(url.endsWith('/status'))return {ok:true,json:async()=>({
       status:'AVAILABLE',provider:'ollama',model:'aunea-qwen3-4b:latest',
       pg11_review_protocol:'PG11_REVIEW_20261103_3',pg11_global_strategy:'SCOPED_V2'})};
     if(url.endsWith('/tobe-global-plan'))return {ok:true,json:async()=>({
       engagement_id:'E1',snapshot_version:3,input_hash:'BACKEND_HASH',
       focus:ids.map(id=>({source_id:id,type:'FRICTION',label:'Problema '+id}))})};
     if(url.endsWith('/tobe-global')){
       const body=JSON.parse(opts.body);
       assert.ok(ids.includes(body.focus_source_id));
       if(body.blocked_action){alternatives++;blockedConstraints.push(body.blocked_constraints);}
       else count++;
       const alt=!!body.blocked_action,id=body.focus_source_id;
       return {ok:true,json:async()=>({
         status:'DRAFT',engagement_id:'E1',snapshot_version:3,
         input_hash:'BACKEND_HASH',focus_source_id:id,has_more:false,
         opportunities:[{objective:'Reducir problema '+id,
           how:alt?'Mantener aprobación humana y usar avisos de seguimiento.':
              id==='F1'?'Aprobar automáticamente sin intervención humana.':
              'Controlar incidencia '+id+' mediante reglas verificadas.',
           why:'La fricción '+id+' está confirmada en el estudio.',
           constraints:'Conservar políticas actuales.',source_refs:[id],
           review:alt||id!=='F1'?
             {status:'CONDITIONED',reason:'Requiere comprobación de herramientas.',conflicts:[]}:
             {status:'INCOMPATIBLE',reason:'Prohíbe retirar aprobación humana.',
              conflicts:[{source:'DF087',reason:'Decisión humana obligatoria.'}]}
         }]
       })};
     }
     throw Error('Unexpected URL '+url);
   }
 };
 vm.createContext(env);vm.runInContext(aiBlock,env);
 await env.generateTobeGlobal(e);
 assert.equal(count,5);
 assert.equal(alternatives,1);
 assert.equal(blockedConstraints[0],'Conservar políticas actuales.');
 assert.equal(p.aiGlobal.result.opportunities.length,5);
 assert.equal(p.aiGlobal.result.complete,true);
 assert.equal(p.aiGlobal.result.progress.completed,5);
 assert.equal(p.aiGlobal.result.progress.failed,0);
 assert.equal(p.aiGlobal.result.opportunities[0].review.status,'INCOMPATIBLE');
 assert.match(p.aiGlobal.result.opportunities[0].alternative.how,/aprobación humana/);
 assert.equal(JSON.parse(persisted).engagements[0].tobeProposals[0].aiGlobal.result.opportunities.length,5);
 assert.equal(env.internalAiGlobalWorking(e),false);
});

test('a second source failure preserves the first new recommendation as an explicitly partial draft',async()=>{
 const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
 const previous={result:{summary:'TEXTO ANTIGUO NO VIGENTE'}};
 const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[],aiGlobal:previous},
   e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
 let persisted='';
 const env={
   __auneaAiWorking:new Set(),__auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
   internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',
   currentEng:()=>e,latestTobe:()=>p,confirmedSnapshot:()=>({version:3}),
   currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
   saveState:()=>{persisted=JSON.stringify({engagements:[e]});return true},
   markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06T12:15:00Z',
   STORAGE_KEY:'STORE',localStorage:{getItem:()=>persisted},
   document:{getElementById:()=>null},state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
   checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
   console:{error:()=>{}},
   fetch:async(url,options={})=>{
     if(url.endsWith('/status'))return {ok:true,json:async()=>({
       status:'AVAILABLE',provider:'ollama',
       pg11_review_protocol:'PG11_REVIEW_20261103_3',pg11_global_strategy:'SCOPED_V2'})};
     if(url.endsWith('/tobe-global-plan'))return {ok:true,json:async()=>({
       engagement_id:'E1',snapshot_version:3,input_hash:'HASH-NEW',
       focus:[{source_id:'F1',label:'Duplicidad'},{source_id:'F2',label:'Esperas'}]})};
     if(url.endsWith('/tobe-global')){
       const request=JSON.parse(options.body);
       if(request.focus_source_id==='F2')return {ok:false,status:503,
         json:async()=>({detail:'Ollama local no responde para F2'})};
       return {ok:true,json:async()=>({
         status:'DRAFT',engagement_id:'E1',snapshot_version:3,
         input_hash:'HASH-NEW',focus_source_id:'F1',has_more:false,
         opportunities:[{objective:'Reducir duplicidad de captura',
           how:'Reutilizar los datos de la fuente confirmada.',
           why:'F1 declara un problema de captura duplicada.',
           source_refs:['F1'],review:{status:'CONDITIONED',
             reason:'Revisar herramientas.',conflicts:[]}}]})};
     }
     throw Error('Unexpected endpoint '+url);
   }
 };
 vm.createContext(env);vm.runInContext(aiBlock,env);
 await env.generateTobeGlobal(e);
 assert.equal(p.aiGlobal.result.complete,false);
 assert.equal(p.aiGlobal.result.progress.failed,1);
 assert.equal(p.aiGlobal.result.opportunities.length,1);
 assert.equal(p.aiGlobal.result.progress.completed,1);
 assert.equal(p.aiGlobal.result.progress.attempted,2);
 assert.ok(!JSON.stringify(p.aiGlobal).includes('TEXTO ANTIGUO'));
 assert.equal(JSON.parse(persisted).engagements[0].tobeProposals[0].aiGlobal.result.opportunities.length,1);
 assert.match(env.internalAiGlobalMessage(e).message,/Ollama local no responde para F2/);
 const view={currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,tobeProposalSourceSteps:()=>[],
   tobeProposalSnapshot:()=>({frictions:[],risks:[]}),
   internalAiGlobalWorking:()=>false,
   internalAiGlobalMessage:()=>env.internalAiGlobalMessage(e),
   esc:String};
 vm.createContext(view);vm.runInContext(block,view);
 const html=view.tobeGlobalOverviewHtml(e,p);
 assert.match(html,/Reducir duplicidad de captura/);
 assert.match(html,/Análisis parcial/);
 assert.match(html,/F2: HTTP 503/);
 assert.doesNotMatch(html,/TEXTO ANTIGUO/);
});

test('global reanalysis clears and persists the previous brief even if the new request fails',async()=>{
  const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
  const previous={result:{summary:'Análisis anterior validado como borrador'}};
  const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[],aiGlobal:previous};
  const e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
  let persisted='';
  const sandbox={
    __auneaAiWorking:new Set(),
    __auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
    internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',
    currentEng:()=>e,latestTobe:()=>p,confirmedSnapshot:()=>({version:3}),
    currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
    tobeEditable:()=>true,isClientDisplay:()=>false,
    saveTobeFromDom:()=>true,saveState:()=>{persisted=JSON.stringify({engagements:[e]});return true;},markDirty:()=>{},
    toast:()=>{},now:()=> '2026-11-06T12:00:00Z',
    document:{getElementById:()=>null},
    state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
    checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
    console:{error:()=>{}},
    fetch:async(url)=>url.endsWith('/status')?{ok:true,json:async()=>({
      status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3',pg11_global_strategy:'SCOPED_V2'})}:
      url.endsWith('/tobe-global-plan')?{ok:true,json:async()=>({
        engagement_id:'E1',snapshot_version:3,input_hash:'BACKEND_HASH',
        focus:[{source_id:'S1',label:'Recepción'}]})}:
      {ok:false,status:409,json:async()=>({detail:'El contexto supera el presupuesto IA'})},
  };
  vm.createContext(sandbox);vm.runInContext(aiBlock,sandbox);
  await sandbox.generateTobeGlobal(e);
  assert.equal(p.aiGlobal.result.complete,false,'an unsuccessful analysis remains a partial draft');
  assert.equal(p.aiGlobal.result.progress.failed,1);
  assert.equal(p.aiGlobal.result.opportunities.length,0);
  assert.ok(!JSON.stringify(p.aiGlobal).includes('Análisis anterior validado'),
    'a started new analysis cannot revive the old recommendations');
  assert.equal(JSON.parse(persisted).engagements[0].tobeProposals[0].aiGlobal.result.complete,false,
    'the partial failure record remains persisted on reload');
  assert.equal(sandbox.internalAiGlobalWorking(e),false);
  assert.match(sandbox.internalAiGlobalMessage(e).message,/contexto supera el presupuesto IA/);
});


test('API preflight hides old cards without deleting saved work when the backend rejects the plan',async()=>{
 const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
 assert.ok(aiBlock);
 const oldBrief={tobeVersion:2,sourceSnapshotVersion:3,diagnosticInputHash:'HASH',
   result:{status:'DRAFT',engagement_id:'E1',snapshot_version:3,
     summary:'TEXTO ANTIGUO QUE NO DEBE MOSTRARSE',
     opportunities:[{objective:'Antigua recomendación',how:'Antigua acción.',
       why:'Antigua justificación.',constraints:'',source_refs:['S1']}]}};
 const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[],aiGlobal:oldBrief},
   e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
 let disk='',finishStatus;
 const statusPending=new Promise(resolve=>{finishStatus=resolve});
 const ctx={
   __auneaAiWorking:new Set(),
   __auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
   internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',
   currentEng:()=>e,latestTobe:()=>p,confirmedSnapshot:()=>({version:3}),
   currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
   saveState:()=>{disk=JSON.stringify({engagements:[e]});return true},
   markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06T09:00:00Z',
   STORAGE_KEY:'STORE',localStorage:{getItem:()=>disk},
   document:{getElementById:()=>null},state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
   checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
   console:{error:()=>{}},
   fetch:async(url)=>url.endsWith('/status')?statusPending:
     {ok:false,status:409,json:async()=>({detail:'El motor local no terminó'})}
 };
 vm.createContext(ctx);vm.runInContext(aiBlock,ctx);
 const pending=ctx.generateTobeGlobal(e);
 assert.equal(p.aiGlobal,oldBrief,
   'preflight has not changed or discarded the saved result yet');
 assert.match(JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal.result.summary,
   /TEXTO ANTIGUO/,'backend compatibility check cannot destroy saved work');
 assert.equal(ctx.internalAiGlobalWorking(e),true);
 // Render with the normal page component while Ollama is unresolved.
 const view={currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeProposalSourceSteps:()=>[],tobeProposalSnapshot:()=>({frictions:[],risks:[]}),
   tobeEditable:()=>true,internalAiGlobalWorking:()=>ctx.internalAiGlobalWorking(e),
   internalAiGlobalMessage:()=>ctx.internalAiGlobalMessage(e),esc:String};
 vm.createContext(view);vm.runInContext(block,view);
 const during=view.tobeGlobalOverviewHtml(e,p);
 assert.match(during,/Comprobando que el backend admite el análisis por bloques/);
 assert.doesNotMatch(during,/TEXTO ANTIGUO|Antigua recomendación|Antigua acción/);
 finishStatus({ok:true,json:async()=>({
   status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3',pg11_global_strategy:'SCOPED_V2'})});
 await pending;
 const after=view.tobeGlobalOverviewHtml(e,p);
 assert.match(after,/TEXTO ANTIGUO/);
 assert.match(after,/No se completó el análisis global/);
 assert.match(JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal.result.summary,
   /TEXTO ANTIGUO/,'no destructive reset occurs on preflight HTTP 409');
});

test('outdated backend without scoped-global capability explains HTTP 404 before any reset',async()=>{
 const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
 const previous={result:{summary:'Propuesta válida guardada del análisis anterior.'}},
   p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[],aiGlobal:previous},
   e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
 let disk='',calls=0;
 const ctx={
   __auneaAiWorking:new Set(),__auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
   internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',
   currentEng:()=>e,latestTobe:()=>p,confirmedSnapshot:()=>({version:3}),
   currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
   saveState:()=>{disk=JSON.stringify({engagements:[e]});return true},
   markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06',
   document:{getElementById:()=>null},
   state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
   checkBackend:async()=>true,console:{error:()=>{}},
   fetch:async(url)=>{
     if(!url.endsWith('/status')){calls++;throw Error('The request must never start.')}
     return {ok:true,json:async()=>({
       status:'AVAILABLE',provider:'ollama',
       pg11_review_protocol:'PG11_REVIEW_20261103_3'})}
   }
 };
 vm.createContext(ctx);vm.runInContext(aiBlock,ctx);
 await ctx.generateTobeGlobal(e);
 assert.equal(calls,0);
 assert.equal(p.aiGlobal,previous);
 assert.match(JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal.result.summary,
   /Propuesta válida/);
 assert.match(ctx.internalAiGlobalMessage(e).message,/Reinicia el backend actualizado/);
 assert.equal(ctx.internalAiGlobalWorking(e),false);
});


test('one source yields more than two outcomes over consecutive small batches',async()=>{
  const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
  const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[]},
    e={id:'E1',confirmedAsIs:true,tobeProposals:[p]},bodies=[];
  const actions=[
    'Validar documentos adjuntos en recepción.',
    'Registrar las autorizaciones de cada responsable.',
    'Centralizar el calendario de incidencias.',
    'Comprobar el estado de tareas pendientes.',
    'Enviar avisos sobre bloqueos al coordinador.'
  ];
  const env={
    __auneaAiWorking:new Set(),__auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
    internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',currentEng:()=>e,latestTobe:()=>p,
    confirmedSnapshot:()=>({version:3}),
    currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
    tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
    saveState:()=>true,markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06T13:00:00Z',
    document:{getElementById:()=>null},state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
    checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
    console:{error:()=>{}},
    fetch:async(url,opts={})=>{
      if(url.endsWith('/status'))return {ok:true,json:async()=>({
        status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3',
        pg11_global_strategy:'SCOPED_V2'})};
      if(url.endsWith('/tobe-global-plan'))return {ok:true,json:async()=>({
        engagement_id:'E1',snapshot_version:3,input_hash:'HASH_BACKEND',
        focus:[{source_id:'F1',label:'Duplicidades'}]})};
      if(url.endsWith('/tobe-global')){
        const body=JSON.parse(opts.body),index=bodies.length,start=index*2,end=Math.min(start+2,5);
        bodies.push(body);
        return {ok:true,json:async()=>({
          status:'DRAFT',engagement_id:'E1',snapshot_version:3,input_hash:'HASH_BACKEND',
          focus_source_id:'F1',has_more:end<5,
          opportunities:actions.slice(start,end).map((how,i)=>({
            objective:'Resolver necesidad de proceso '+(start+i+1),how,
            why:'Existe una fricción confirmada que requiere control.',
            constraints:'Mantener la supervisión humana.',source_refs:['F1'],
            review:{status:'CONDITIONED',reason:'Validar viabilidad.',conflicts:[]}
          }))
        })};
      }
      throw Error('Unexpected endpoint');
    }
  };
  vm.createContext(env);vm.runInContext(aiBlock,env);
  await env.generateTobeGlobal(e);
  assert.equal(bodies.length,3);
  assert.deepEqual(bodies.map(x=>x.seen_interventions.length),[0,2,4]);
  assert.equal(p.aiGlobal.result.opportunities.length,5);
  assert.equal(p.aiGlobal.result.progress.completed,1);
  assert.equal(p.aiGlobal.result.complete,true);
});

test('semantic repetition retains traceability and related alternatives',()=>{
  const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
  const env={__auneaAiWorking:new Set()};vm.createContext(env);vm.runInContext(aiBlock,env);
  const actions=[],one={objective:'Evitar capturas duplicadas',
    how:'Reutilizar automáticamente los datos validados de recepción en el registro ERP.',
    why:'Hay doble entrada de datos.',constraints:'',source_refs:['F1']};
  assert.equal(env.tobeGlobalMerge(actions,one),true);
  assert.equal(env.tobeGlobalMerge(actions,{...one,source_refs:['F2']}),false);
  assert.equal(actions.length,1);
  assert.ok(actions[0].source_refs.includes('F2'));
  const other={...one,source_refs:['F1','S2'],
    how:'Reutilizar los datos validados de recepción automáticamente en el registro ERP.'};
  assert.equal(env.tobeGlobalMerge(actions,other),true);
  assert.equal(actions.length,1);
  assert.equal(actions[0].related.length,1);
  assert.equal(actions[0].related[0].how,other.how);
  assert.ok(actions[0].source_refs.includes('S2'));
});

test('PG11 consolidates unique recommendations, incompatibilities and alternatives without approving them',()=>{
  const proposed=[
    {objective:'Evitar que se duplique la recepción',how:'Reusar datos validados.',
     why:'F1 confirma captura duplicada.',constraints:'',source_refs:['F1','S1'],
     related:[{objective:'Conservar seguimiento',how:'Reutilizar la recepción validada.',
       why:'La fricción es transversal.',source_refs:['F1']}],
     review:{status:'INCOMPATIBLE',reason:'Propuesta incompatible.',conflicts:[{source:'DF087',reason:'Decisión humana obligatoria.'}]},
     alternative:{how:'Enviar avisos para revisión humana.',why:'Mantener control.',source_refs:['F1','S1'],
       review:{status:'CONDITIONED',reason:'Requiere verificación.',conflicts:[]}}},
    {objective:'Visibilidad del proceso',how:'Registrar estados pendientes.',
     why:'La evidencia indica falta de visibilidad.',constraints:'',source_refs:['S1'],
     review:{status:'CONDITIONED',reason:'Comprobar permisos.',conflicts:[]}}
  ];
  const h=harness(proposed);
  h.env.p.items=[{sourceStepId:'S1',sourceStepName:'Recepción'}];
  const html=h.html();
  assert.match(html,/Consolidación de propuestas: 2 intervenciones distintas/);
  assert.match(html,/1 incompatibilidades detectadas/);
  assert.match(html,/1 alternativas sugeridas/);
  assert.match(html,/1 variantes relacionadas conservadas/);
  assert.match(html,/data-tobe-select="S1"/);
  assert.match(html,/Fuentes de la alternativa/);
  assert.match(html,/Fricción: Captura duplicada/);
  assert.doesNotMatch(html,/data-tobe-ai-use-field|data-tobe-human-decision/);
});

test('confirmed AS-IS friction and risk links become read-only context only in their affected activity',()=>{
  const h=harness([
    {objective:'Reducir doble captura',how:'Reutilizar información confirmada.',
     why:'Duplicidad trazada.',constraints:'',source_refs:['F1'],
     review:{status:'CONDITIONED',reason:'Validar factibilidad.',conflicts:[]}},
    {objective:'Reforzar control de riesgo',how:'Conservar registro auditable.',
     why:'Riesgo registrado.',constraints:'',source_refs:['R1'],
     review:{status:'INCOMPATIBLE',reason:'No debe sustituir decisión humana.',conflicts:[]}}
  ]);
  h.env.p.items=[{sourceStepId:'S1',sourceStepName:'Recepción'},
    {sourceStepId:'S2',sourceStepName:'Validación'}];
  const snapshot=h.env.e.confirmedSnapshots[0];
  snapshot.frictions[0].affected_steps=['S1'];
  snapshot.risks=[{id:'R1',step_ids:['S2'],description:'Riesgo de aprobación'}];
  const block1=h.env.p.items[0],block2=h.env.p.items[1];
  const global1=block&&h.env;
  const sandbox={
    currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
    internalAiGlobalWorking:()=>false,
    internalAiGlobalMessage:()=>null,
    tobeProposalSnapshot:()=>snapshot,
    tobeProposalSourceSteps:()=>snapshot.processSteps||[],
    esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
  };
  vm.createContext(sandbox);vm.runInContext(block,sandbox);
  const one=sandbox.tobeGlobalLinkedStepHtml(h.env.e,h.env.p,block1);
  const two=sandbox.tobeGlobalLinkedStepHtml(h.env.e,h.env.p,block2);
  assert.match(one,/Reducir doble captura/);
  assert.doesNotMatch(one,/Reforzar control de riesgo/);
  assert.match(two,/Reforzar control de riesgo/);
  assert.doesNotMatch(two,/Reducir doble captura/);
  assert.match(one,/Contexto de solo lectura/);
  assert.doesNotMatch(one,/data-tobe-ai-use-field|data-tobe-human-decision/);
  h.env.p.aiGlobal.diagnosticInputHash='OLD';
  assert.equal(sandbox.tobeGlobalLinkedStepHtml(h.env.e,h.env.p,block1),'');
});

test('linking global analysis never changes source activities or TO-BE fields',()=>{
  assert.match(src,/id="tobeGlobalLinkedStep"/);
  assert.match(src,/tobeGlobalLinkedStepHtml\(e,p,item\)/);
  assert.match(ai,/linked.innerHTML=tobeGlobalLinkedStepHtml/);
  assert.doesNotMatch(block,/saveState\(|markDirty\(|data-tobe-ai-use-field/);
});


test('PG11 resumes only the missing part of one source after an Ollama 503, preserving all prior batches',async()=>{
  const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
  const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[]},
    e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
  const actions=['Registrar los datos recibidos con validación humana.',
    'Avisar a responsables de documentos pendientes.'];
  let failSecond=true,disk='',calls=[];
  const env={
    __auneaAiWorking:new Set(),__auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
    internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',currentEng:()=>e,latestTobe:()=>p,
    confirmedSnapshot:()=>({version:3}),
    currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
    tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
    saveState:()=>{disk=JSON.stringify({engagements:[e]});return true},
    markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06T14:00:00Z',
    document:{getElementById:()=>null},
    state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
    checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
    console:{error:()=>{}},
    fetch:async(url,opts={})=>{
      if(url.endsWith('/status'))return {ok:true,json:async()=>({
        status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3',
        pg11_global_strategy:'SCOPED_V2'})};
      if(url.endsWith('/tobe-global-plan'))return {ok:true,json:async()=>({
        engagement_id:'E1',snapshot_version:3,input_hash:'BACKEND_HASH',
        focus:[{source_id:'F1',label:'Recepción'}]})};
      if(url.endsWith('/tobe-global')){
        const body=JSON.parse(opts.body);
        calls.push(body);
        const count=body.seen_interventions.length;
        if(count===1&&failSecond)return {ok:false,status:503,
          json:async()=>({detail:'Ollama agotó memoria durante el segundo lote'})};
        return {ok:true,json:async()=>({
          status:'DRAFT',engagement_id:'E1',snapshot_version:3,input_hash:'BACKEND_HASH',
          focus_source_id:'F1',has_more:count===0,
          opportunities:[{objective:'Reducir tareas manuales '+count,
            how:actions[count],why:'Fricción confirmada de entrada manual.',
            constraints:'Mantener aprobaciones humanas.',source_refs:['F1'],
            review:{status:'CONDITIONED',reason:'Comprobar viabilidad.',conflicts:[]}}]
        })};
      }
      throw Error('Unexpected endpoint');
    }
  };
  vm.createContext(env);vm.runInContext(aiBlock,env);
  await env.generateTobeGlobal(e);
  assert.equal(p.aiGlobal.result.complete,false);
  assert.equal(p.aiGlobal.result.opportunities.length,1);
  assert.equal(p.aiGlobal.result.progress.completed,0);
  assert.equal(p.aiGlobal.result.progress.failed,1);
  assert.equal(p.aiGlobal.result.progress.source_batches.F1.length,1);
  const saved=JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal;
  assert.equal(saved.result.opportunities.length,1);
  failSecond=false;
  await env.generateTobeGlobal(e,{resume:true});
  assert.equal(calls.length,3,'only one additional batch must run after resume');
  assert.deepEqual(calls.map(x=>x.seen_interventions.length),[0,1,1]);
  assert.equal(p.aiGlobal.result.complete,true);
  assert.equal(p.aiGlobal.result.progress.completed,1);
  assert.equal(p.aiGlobal.result.progress.failed,0);
  assert.equal(p.aiGlobal.result.opportunities.length,2);
  assert.equal(p.aiGlobal.result.progress.focus_done.join(','),'F1');
  assert.equal(JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal.result.opportunities.length,2);
});

test('PG11 failed full reset restores the prior saved global brief before calling Ollama',async()=>{
 const aiBlock=ai.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-AI-285\] END/)?.[0];
 const old={tobeVersion:2,sourceSnapshotVersion:3,diagnosticInputHash:'HASH',
   result:{status:'DRAFT',engagement_id:'E1',snapshot_version:3,
     summary:'Síntesis anterior guardada.',opportunities:[]}};
 const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[],aiGlobal:old},
   e={id:'E1',confirmedAsIs:true,tobeProposals:[p]};
 let calls=0;
 const env={
   __auneaAiWorking:new Set(),__auneaPg11ReviewProtocol:'PG11_REVIEW_20261103_3',
   internalAiPilotKey:()=> 'E1|3|HASH|TOBE:2',
   currentEng:()=>e,latestTobe:()=>p,confirmedSnapshot:()=>({version:3}),
   currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,isClientDisplay:()=>false,saveTobeFromDom:()=>true,
   saveState:label=>!label.includes('Guardar reinicio'),
   markDirty:()=>{},toast:()=>{},now:()=> '2026-11-06',
   document:{getElementById:()=>null},
   state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
   checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
   console:{error:()=>{}},
   fetch:async(url)=>{
     if(url.endsWith('/status'))return {ok:true,json:async()=>({
       status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3',
       pg11_global_strategy:'SCOPED_V2'})};
     if(url.endsWith('/tobe-global-plan'))return {ok:true,json:async()=>({
       engagement_id:'E1',snapshot_version:3,input_hash:'BACKEND_HASH',
       focus:[{source_id:'S1',label:'Recepción'}]})};
     calls++;throw Error('Ollama should not run when saving the reset fails');
   }
 };
 vm.createContext(env);vm.runInContext(aiBlock,env);
 await env.generateTobeGlobal(e);
 assert.equal(calls,0);
 assert.equal(p.aiGlobal,old);
 assert.match(env.internalAiGlobalMessage(e).message,/restaurado el borrador previo/);
});
test('block 4 status separates completed sources, full texts and human decisions',()=>{
  const h=harness([
    {objective:'Reducir reentrada de datos',how:'Reutilizar datos confirmados.',
      why:'La fricción está documentada.',source_refs:['F1']},
    {objective:'Conservar aprobación',how:'Registrar datos con aprobación',
      why:'Debe conservar la revisión humana.',source_refs:['S1']}
  ]);
  h.env.p.items=[{sourceStepId:'S1',sourceStepName:'Recepción'}];
  h.env.p.aiDraft={humanReview:{decisions:{S1:{status:'ACCEPT'}}}};
  h.env.p.aiGlobal.result.complete=false;
  h.env.p.aiGlobal.result.progress={total:3,completed:1,focus_done:['F1'],failed:1};
  let markup=h.html();
  assert.match(markup,/Generación:<\/b> Fuentes revisadas: 1 de 3/);
  assert.match(markup,/Integridad:<\/b> 1 de 2/);
  assert.match(markup,/Revisión humana:<\/b> 1 decisiones/);
  assert.match(markup,/id="retryTobeGlobal"/);
  assert.match(markup,/Propuesta incompleta|Análisis parcial/);
  h.env.p.status='REVIEWED';
  markup=h.html();
  assert.doesNotMatch(markup,/id="retryTobeGlobal"/);
  h.env.p.status='DRAFT';
  h.env.p.aiGlobal.result.complete=true;
  markup=h.html();
  assert.doesNotMatch(markup,/id="retryTobeGlobal"/);
  h.env.p.aiGlobal.result.complete=false;
  h.env.p.aiGlobal.result.progress.focus_done=['F1','F2','F3'];
  markup=h.html();
  assert.doesNotMatch(markup,/id="retryTobeGlobal"/);
  h.env.p.aiGlobal.result.progress.focus_done=undefined;
  markup=h.html();
  assert.doesNotMatch(markup,/id="retryTobeGlobal"/);
});

test('PG11 retains the entire reason and technical validation in the existing card disclosure',()=>{
  const h=harness([{objective:'Comprobar alternativa',
    how:'Revisar el posible registro del ERP.',
    why:'Existe un problema confirmado de duplicidad.',
    source_refs:['F1'],constraints:'Mantener el control humano.',
    review:{status:'CONDITIONED',reason:'Verificar capacidad y licencias del ERP.',
      conflicts:[],verifications:[{source:'CAPACIDAD_TECNICA',
      question:'No suponer integraciones automáticas.'}]}}]);
  const markup=h.html();
  assert.match(markup,/Condicionada a validar la viabilidad/);
  assert.match(markup,/Motivo de la evaluación:<\/b> Verificar capacidad y licencias/);
  assert.match(markup,/Validaciones pendientes:<\/b> CAPACIDAD_TECNICA/);
  assert.match(markup,/No suponer integraciones automáticas/);
  assert.doesNotMatch(markup,/id="retryTobeGlobal"/);
});

test('PG11 exposes cancellation and aborts AI calls without clearing checkpoints',()=>{
  assert.match(ai,/function internalAiCancel\(e\)/);
  assert.match(ai,/run\.controller\.abort\(\)/);
  assert.match(ai,/data-aunea-cancel-ai/);
  assert.match(ai,/function internalAiFetch\(key,url,options=/);
  assert.match(ai,/internalAiAssertActive\(key\)/);
  assert.match(ai,/internalAiStop\(key\)/);
  assert.match(ai,/internalAiSaveCheckpoint\(e,key,completed,availability\.model\)/);
  assert.match(ai,/function internalAiSyncButtons\(e\)/);
  assert.doesNotMatch(ai,/id="generateTobeAiPilot">Analizar actividades con IA/);
});

test('PG11 continues missing steps rather than launching a coherence review',()=>{
  assert.match(ai,/data-tobe-generate-all-remaining>Analizar pasos pendientes/);
  assert.match(ai,/complete\?'<button type="button" class="btn btn-primary" id="retryTobeAiReview"/);
  assert.match(ai,/const complete=event\.target\?\.closest\?\.\('\[data-tobe-generate-all-remaining\]'\)/);
  assert.match(ai,/void generateTobeAiPilot\(currentEng\(\)\)/);
});

// [AUNEA-UAT-PG11-GLOBAL-OVERVIEW-288] END
