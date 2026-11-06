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
  assert.match(ai,/\/v1\/internal-ai\/tobe-global/);
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
  assert.match(output,/Cómo conseguirlo:/);
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
        status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3'})};
      if(url.endsWith('/tobe-global'))return {ok:true,json:async()=>({
        status:'DRAFT',engagement_id:'E1',snapshot_version:3,input_hash:'HASH_BACKEND',
        model:'local-pilot',summary:'Reducir duplicidades manteniendo los controles.',
        opportunities:[{objective:'Evitar dobles entradas',how:'Reusar datos confirmados.',
          why:'Existe una duplicidad documentada.',constraints:'Mantener aprobación humana.',
          source_refs:['S1']}],
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
  assert.equal(p.items[0].futureActor,'Consultor');
  assert.equal(JSON.parse(persisted).engagements[0].tobeProposals[0].aiGlobal.result.summary,
    'Reducir duplicidades manteniendo los controles.');
  assert.equal(saved.length,3,'edits, cleared analysis and new result are each saved');
  assert.equal(sandbox.internalAiGlobalMessage(e).working,false);
  assert.match(sandbox.internalAiGlobalMessage(e).message,/guardado/);
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
    toast:()=>{},document:{getElementById:()=>null},
    state:{backendOnline:true,backendUrl:'http://127.0.0.1:8010'},
    checkBackend:async()=>true,buildBackendPayload:()=>({engagement_id:'E1'}),
    console:{error:()=>{}},
    fetch:async(url)=>url.endsWith('/status')?{ok:true,json:async()=>({
      status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3'})}:
      {ok:false,status:409,json:async()=>({detail:'El contexto supera el presupuesto IA'})},
  };
  vm.createContext(sandbox);vm.runInContext(aiBlock,sandbox);
  await sandbox.generateTobeGlobal(e);
  assert.equal(p.aiGlobal,undefined,'an unsuccessful reanalysis must not revive an obsolete proposal');
  assert.equal(JSON.parse(persisted).engagements[0].tobeProposals[0].aiGlobal,undefined,
    'the old proposal must also be absent after a browser reload');
  assert.equal(sandbox.internalAiGlobalWorking(e),false);
  assert.match(sandbox.internalAiGlobalMessage(e).message,/contexto supera el presupuesto IA/);
});


test('clicking reanalyse clears displayed cards before Ollama returns, including after reload',async()=>{
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
 assert.equal(p.aiGlobal,undefined,'the old result must disappear synchronously on click');
 assert.equal(JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal,undefined,
   'the empty state must be durable before the external request');
 assert.equal(ctx.internalAiGlobalWorking(e),true);
 // Render with the normal page component while Ollama is unresolved.
 const view={currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeProposalSourceSteps:()=>[],tobeProposalSnapshot:()=>({frictions:[],risks:[]}),
   tobeEditable:()=>true,internalAiGlobalWorking:()=>ctx.internalAiGlobalWorking(e),
   internalAiGlobalMessage:()=>ctx.internalAiGlobalMessage(e),esc:String};
 vm.createContext(view);vm.runInContext(block,view);
 const during=view.tobeGlobalOverviewHtml(e,p);
 assert.match(during,/Se ha retirado el análisis anterior/);
 assert.doesNotMatch(during,/TEXTO ANTIGUO|Antigua recomendación|Antigua acción/);
 finishStatus({ok:true,json:async()=>({
   status:'AVAILABLE',provider:'ollama',pg11_review_protocol:'PG11_REVIEW_20261103_3'})});
 await pending;
 const after=view.tobeGlobalOverviewHtml(e,p);
 assert.doesNotMatch(after,/TEXTO ANTIGUO|Antigua recomendación|Antigua acción/);
 assert.match(after,/No se generó una propuesta global nueva/);
 assert.equal(JSON.parse(disk).engagements[0].tobeProposals[0].aiGlobal,undefined);
});

// [AUNEA-UAT-PG11-GLOBAL-OVERVIEW-288] END
