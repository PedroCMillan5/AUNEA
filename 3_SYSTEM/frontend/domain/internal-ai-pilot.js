// [AUNEA-FE-INTERNAL-AI-PILOT-193] START — PG11 preview of optional backend AI suggestions
// SOURCE: DEC-034/050/052/055; Simulator CANONICAL PG11; REVIEW contract 2026-10-29.
// INPUTS: current confirmed snapshot and official diagnostic; OUTPUTS: DRAFT suggestions.
// SIDE_EFFECTS: external provider only after click, local DRAFT updates only after acceptance.
// CHANGE_RISK: HIGH. Never auto-approve, invent numerical benefits, or alter engine results.
const __auneaPg11ReviewProtocol='PG11_REVIEW_20261103_3'; // Technical backend/UI compatibility; no business owner.
const __auneaAiPreview=new Map();
const __auneaAiFeedback=new Map();
const __auneaAiCompletedSteps=new Map(); // Transient, keyed by confirmed snapshot; no partial approval.
const __auneaAiWorking=new Set();
// [AUNEA-FE-PG11-AI-CANCEL-287] START — cancellable serial IA tasks.
const __auneaAiRuns=new Map();
// [AUNEA-FE-PG11-REAL-PROGRESS-291] START — coverage, never estimated time left.
function internalAiProgressHtml(e,mode){
  const key=e&&internalAiPilotKey(e),run=__auneaAiRuns.get(key);
  const active=run?.mode===mode;
  const stored=mode==='global'&&typeof tobeGlobalStored==='function'?
    tobeGlobalStored(e,latestTobe(e))?.progress:null;
  const stepIds=mode==='steps'?(latestTobe(e)?.items||[]).map(x=>String(x.sourceStepId)):[];
  const pending=mode==='steps'&&key?internalAiPendingSteps(e,key):null;
  const saved=mode==='steps'?internalAiSavedDraft(e):null;
  const done=mode==='global'?Math.max(0,stored?.focus_done?.length??stored?.completed??0):
    Math.min(stepIds.length,active?(pending?.items?.size||0):
      Math.max(pending?.items?.size||0,saved?.items?.length||0));
  const total=mode==='global'?Math.max(0,stored?.total||run?.total||0):stepIds.length;
  if(!active&&!stored&&mode==='global')return '';
  if(!active&&!done&&mode==='steps')return '';
  const percent=total?Math.min(100,Math.round(done*100/total)):0;
  const detail=active?(run.detail||'Preparando solicitud al proveedor IA…'):
    (mode==='global'&&stored?.failed?'Hay fuentes pendientes de reintento.':
      'Resultados verificados y guardados.');
  return '<div class="pg11-ai-progress" data-pg11-progress="'+mode+'" role="status" aria-live="polite">'+
    '<div class="pg11-ai-progress-top"><strong>'+done+' de '+(total||'—')+
    (mode==='global'?' fuentes':' actividades')+' completadas</strong>'+
    '<span>'+percent+' % de cobertura</span></div>'+
    '<div class="pg11-ai-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+
    '" aria-label="Cobertura de análisis IA"><span style="width:'+percent+'%"></span></div>'+
    '<p>'+(active?'<span class="pg11-ai-working-dot" aria-hidden="true"></span>':'')+
    esc(detail)+'</p>'+
    (active?'<small>Tiempo transcurrido: <span data-pg11-elapsed>'+Math.floor((Date.now()-run.startedAt)/1000)+
       ' s</span> · La barra indica cobertura, no tiempo restante.</small>':
       '<small>La barra indica cobertura, no tiempo restante.</small>')+
    '</div>';
}
function internalAiUpdateProgress(e){
  if(!e||currentEng()?.id!==e.id)return;
  for(const mode of ['global','steps']){
    const node=document.querySelector('[data-pg11-progress="'+mode+'"]');
    const html=internalAiProgressHtml(e,mode);
    if(node){
      if(html){const host=document.createElement('div');host.innerHTML=html;
        if(host.firstElementChild)node.replaceWith(host.firstElementChild);}
      else node.remove();
    }else if(html&&mode==='steps'){
      // Insert without rerendering the editable inspector or losing manual field edits.
      document.getElementById('tobeStepAiProgress')?.insertAdjacentHTML('afterend',html);
    }
  }
}
// [AUNEA-FE-PG11-REAL-PROGRESS-291] END
function internalAiStart(key,mode){
  const run={controller:new AbortController(),mode,cancelled:false,
    startedAt:Date.now(),detail:'Comprobando servicio IA…',total:0};
  run.timer=setInterval(()=>{
    const current=__auneaAiRuns.get(key);
    if(current!==run){clearInterval(run.timer);return;}
    document.querySelectorAll('[data-pg11-progress="'+mode+'"] [data-pg11-elapsed]')
      .forEach(el=>{el.textContent=Math.floor((Date.now()-run.startedAt)/1000)+' s';});
  },1000);
  __auneaAiRuns.set(key,run);
  __auneaAiWorking.add(key);
  internalAiUpdateProgress(currentEng());
  internalAiSyncButtons(currentEng());
}
function internalAiCancelled(key,error){
  return __auneaAiRuns.get(key)?.cancelled||error?.name==='AbortError'||error?.message==='PG11_AI_CANCELLED';
}
function internalAiAssertActive(key){
  if(__auneaAiRuns.get(key)?.cancelled)throw Error('PG11_AI_CANCELLED');
}
function internalAiFetch(key,url,options={}){
  internalAiAssertActive(key);
  const run=__auneaAiRuns.get(key);
  return fetch(url,{...options,...(run?{signal:run.controller.signal}:{})});
}
function internalAiStop(key){
  const run=__auneaAiRuns.get(key);
  if(run?.timer)clearInterval(run.timer);
  __auneaAiRuns.delete(key);
  __auneaAiWorking.delete(key);
  internalAiUpdateProgress(currentEng());
  internalAiSyncButtons(currentEng());
}
function internalAiCancel(e){
  const key=e&&internalAiPilotKey(e),run=__auneaAiRuns.get(key);
  if(!run||run.cancelled)return;
  run.cancelled=true;
  run.controller.abort();
  if(run.mode==='global'){
    __auneaGlobalAiFeedback.set(key,{working:true,type:'info',message:'Cancelando análisis. Los avances guardados se conservan…'});
    internalAiGlobalRefresh(e);
  }else internalAiPilotFeedback(e,'Cancelando análisis. Se conservan las actividades verificadas…');
  internalAiSyncButtons(e);
}
// [AUNEA-FE-PG11-AI-CANCEL-287] END
// [AUNEA-FE-PG11-AI-LOCK-286] START — one active PG11 IA operation per draft.
// PURPOSE: Reflect the existing shared execution guard in every IA trigger;
// keep consultant-owned editors and saved proposals intact during generation.
function internalAiSyncButtons(e){
  if(!e||currentEng()?.id!==e.id)return;
  const busy=__auneaAiWorking.has(internalAiPilotKey(e));
  const run=__auneaAiRuns.get(internalAiPilotKey(e));
  document.querySelectorAll(
    '#analyzeTobeGlobal, #retryTobeGlobal, #generateTobeAiPilot, '+
    '#regenerateTobeAiPilot, #retryTobeAiReview, '+
    '[data-tobe-generate-selected], [data-tobe-generate-all-remaining]'
  ).forEach(button=>{
    if(busy){
      if(button.dataset.auneaAiWasDisabled===undefined)
        button.dataset.auneaAiWasDisabled=(button.disabled&&button.getAttribute('aria-busy')!=='true')?'1':'0';
      button.disabled=true;
      button.title='Hay un análisis en curso. Finaliza antes de iniciar otro.';
    }else if(button.dataset.auneaAiWasDisabled!==undefined){
      button.disabled=button.dataset.auneaAiWasDisabled==='1';
      delete button.dataset.auneaAiWasDisabled;
      button.removeAttribute('title');
    }
  });
  document.querySelectorAll('[data-aunea-cancel-ai]').forEach(el=>el.remove());
  if(busy&&run){
    const anchor=run.mode==='global'?
      document.querySelector('#tobeGlobalAnalysis .tobe-global-head-actions'):
      (document.querySelector('[data-tobe-generate-selected]')||
       document.getElementById('tobeAiPilotStatus'));
    if(anchor){
      const button=document.createElement('button');
      button.type='button';
      button.className='btn btn-outline';
      button.setAttribute('data-aunea-cancel-ai','');
      button.textContent=run.cancelled?'Cancelando…':'Cancelar análisis';
      button.disabled=run.cancelled;
      if(run.mode==='global')anchor.append(button);
      else anchor.insertAdjacentElement('afterend',button);
    }
  }
}
// [AUNEA-FE-PG11-AI-LOCK-286] END
// [AUNEA-FE-PG11-AI-PROGRESS-281] START — Keep per-step Ollama errors/progress visible outside full audit.
function internalAiPilotFeedback(e,message,type='info'){
  const key=internalAiPilotKey(e);
  if(key)__auneaAiFeedback.set(key,{message,type});
  const node=document.getElementById('tobeAiPilotStatus');
  if(currentEng()?.id!==e?.id||internalAiPilotKey(e)!==key)return;
  // Keep real per-step progress/errors visible even when the long IA audit is closed.
  const live=document.querySelector('.tobe-ia-guide-summary p');
  if(live)live.textContent=String(message||'');
  const step=document.getElementById('tobeStepAiProgress');
  if(step)step.textContent=String(message||'');
  if(node){if(!String(node.className||'').includes('pg11-ai-panel'))node.className='notice '+(type==='warn'?'warn':'info');const label=document.getElementById('tobeAiProgress');if(label)label.textContent=message;else node.textContent=message}
  internalAiUpdateProgress(e);
  internalAiSyncButtons(e);
}
// [AUNEA-FE-PG11-AI-PROGRESS-281] END
function internalAiPilotRefreshPanel(e){
  const headline=document.querySelector('.tobe-ia-guide-summary');
  if(headline&&typeof internalAiSavedDraft==='function'){
    const current=internalAiSavedDraft(e),
      partial=!current&&typeof internalAiPendingSteps==='function'?
        internalAiPendingSteps(e,internalAiPilotKey(e)):null,
      total=latestTobe(e)?.items?.length||0,
      existing=partial?.items?.size||0;
    const title=headline.querySelector('strong'),body=headline.querySelector('p');
    if(title)title.textContent=current?'Propuesta IA vigente':
      existing?'Generación IA parcial · '+existing+'/'+total:'Propuesta IA pendiente';
    if(body)body.textContent=current?'Ya puedes revisar y decidir por campo, comprobando bloqueos y condiciones.':
      existing?'Las recomendaciones completadas están guardadas. Continúa con el resto antes de aplicar propuestas.':
      'Genera una propuesta actual para obtener valores IA aplicables.';
  }
  const panel=document.getElementById('tobeAiPilotStatus');
  if(panel)panel.outerHTML=internalAiPilotPanel(e);
  internalAiSyncButtons(e);
  const recommendation=document.getElementById('tobeAiRecommendation');
  if(recommendation&&typeof tobeSelectedItem==='function'&&typeof tobeAiAdviceHtml==='function'){
    const selected=tobeSelectedItem(e,latestTobe(e)),p=latestTobe(e);
    if(selected){
      recommendation.innerHTML=tobeAiAdviceHtml(e,selected,false);
      // A verified checkpoint must be readable immediately, even before global
      // review. Both disclosure layers belong to existing inspector components.
      const sid=String(selected.sourceStepId||''),
        currentForStep=typeof internalAiSavedDraft==='function'&&
          internalAiSavedDraft(e)?.items?.some(x=>String(x.source_step_id)===sid),
        partialForStep=typeof internalAiPendingSteps==='function'&&
          internalAiPendingSteps(e,internalAiPilotKey(e))?.items?.has(sid);
      if((currentForStep||partialForStep)&&
         !(typeof tobeHumanReviewRecord==='function'&&
           tobeHumanReviewRecord(e,p)?.decisions?.[sid]?.status)){
        const detail=document.querySelector('#tobeStepAdvice > details');
        if(detail)detail.open=true;
      }
      // Update only read-only suggestions; never replace consultant controls
      // while Ollama is working and the user may be editing a textarea.
      const inspector=document.getElementById('tobeInspector');
      if(inspector&&!selected.isAddition&&typeof tobeAiInlineHint==='function'){
        inspector.querySelectorAll('[data-tobe-row-key]').forEach(row=>{
          const key=row.getAttribute('data-tobe-row-key'),
            slot=row.querySelector('.tobe-ai-inline'),
            hint=tobeAiInlineHint(e,p,selected,key);
          if(slot&&hint)slot.outerHTML=hint;
          const controls=row.querySelector('.tobe-ai-row-actions');
          if(controls&&typeof tobeAiRowActions==='function')
            controls.outerHTML=tobeAiRowActions(e,p,selected,key);
        });
        const trigger=inspector.querySelector('[data-tobe-generate-selected]');
        if(trigger)trigger.textContent=internalAiSavedDraft(e)?
          'Regenerar IA de esta actividad':'Analizar solo esta actividad con IA';
        const conditions=inspector.querySelector('.tobe-ai-operational-context');
        if(conditions&&typeof tobeAiOperationalContextHtml==='function')
          conditions.outerHTML=tobeAiOperationalContextHtml(e,selected);
        const current=internalAiSavedDraft(e);
        if(current?.items?.some(x=>String(x.source_step_id)===String(selected.sourceStepId))&&
           !inspector.querySelector('.tobe-human-review-shell')&&
           typeof tobeHumanReviewHtml==='function'){
          const advice=inspector.querySelector('#tobeStepAdvice > details');
          if(advice)advice.insertAdjacentHTML('beforeend',
            '<details class="tobe-human-review-shell" open>'+
            '<summary>Decisión sobre la propuesta IA · Pendiente de decisión</summary>'+
            tobeHumanReviewHtml(e,selected,false)+'</details>');
        }
      }
    }
  }
}
// [AUNEA-FE-PG11-GLOBAL-AI-285] START — independent process-wide inference.
// Uses the same verified local provider and versioned TO-BE owner as activity IA;
// Explicit restart clears the current global brief before inference, even if Ollama fails.
// Never runs automatically, edits fields or approves any AI recommendation.
const __auneaGlobalAiFeedback=new Map();
function internalAiGlobalWorking(e){
  const key=internalAiPilotKey(e);return !!key&&__auneaAiWorking.has(key)&&__auneaGlobalAiFeedback.get(key)?.working===true;
}
function internalAiGlobalMessage(e){
  const key=internalAiPilotKey(e);return key?__auneaGlobalAiFeedback.get(key)||null:null;
}
function internalAiGlobalRefresh(e){
  if(!e||currentEng()?.id!==e.id)return;
  const target=document.getElementById('tobeGlobalAnalysis');
  if(target&&typeof tobeGlobalOverviewHtml==='function')
    target.outerHTML=tobeGlobalOverviewHtml(currentEng(),latestTobe(currentEng()));
  // Refresh ONLY the read-only global context for the selected activity.
  // Never replace the inspector or its unsaved consultant-owned form controls.
  const linked=document.getElementById('tobeGlobalLinkedStep');
  if(linked&&typeof tobeGlobalLinkedStepHtml==='function'&&
     typeof tobeSelectedItem==='function'){
    const live=currentEng(),draft=latestTobe(live);
    linked.innerHTML=tobeGlobalLinkedStepHtml(live,draft,tobeSelectedItem(live,draft));
  }
  internalAiUpdateProgress(e);
  internalAiSyncButtons(e);
}
// Source inventory and recommendations belong to one versioned TO-BE DRAFT;
// small Ollama requests are deliberately serial to avoid CPU/RAM saturation.
function tobeGlobalMerge(items,candidate){
  // Only exact normalized actions are duplicates. Semantic overlap can still
  // represent a distinct intervention: retain it for consultant review.
  const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim();
  const at=items.findIndex(x=>norm(x.how)===norm(candidate.how));
  if(at<0){items.push(candidate);return true;}
  const main=items[at];
  main.source_refs=[...new Set([...(main.source_refs||[]),
    ...(candidate.source_refs||[])])];
  // Distinct supporting explanations are preserved without duplicating actions.
  if(norm(main.why)!==norm(candidate.why)||
     norm(main.constraints)!==norm(candidate.constraints)){
    if(!(main.related||[]).some(x=>norm(x.how)===norm(candidate.how)&&
       norm(x.why)===norm(candidate.why)&&
       norm(x.constraints)===norm(candidate.constraints)))
      main.related=[...(main.related||[]),candidate];
  }
  return false;
}
function tobeGlobalSummary(items,completed=0,total=0){
  const count=items.length;
  if(count)return 'El análisis de las fuentes confirmadas identifica '+count+
    (count===1?' intervención para revisión del consultor.':
      ' intervenciones para revisión del consultor.');
  if(total>completed)return 'Análisis parcial: aún no hay intervenciones guardadas. '+
    'Quedan '+(total-completed)+' fuentes por completar.';
  return 'No se han identificado intervenciones justificadas en las fuentes revisadas.';
}
async function generateTobeGlobal(e,options={}){
  const resume=options.resume===true,key=internalAiPilotKey(e),p=latestTobe(e);
  if(!key||!tobeEditable(p)||(typeof isClientDisplay==='function'&&isClientDisplay()))
    return toast('Se necesita un TO-BE en borrador, con AS-IS y diagnóstico vigentes.');
  if(__auneaAiWorking.has(key))
    return toast('Hay otro análisis IA en curso. Termina antes de iniciar el global.');
  if(!saveTobeFromDom(e)||!saveState('Conservar borrador antes de IA global'))
    return toast('No se pudo guardar el trabajo actual. No se inició la IA.');
  const liveBefore=currentEng(),draftBefore=latestTobe(liveBefore);
  if(!liveBefore||liveBefore.id!==e.id||!tobeEditable(draftBefore)||
     draftBefore.version!==p.version||internalAiPilotKey(liveBefore)!==key)
    return toast('El borrador o el diagnóstico cambiaron. Revisa el estudio.');
  // Check the backend strategy BEFORE invalidating any saved global proposal.
  // An out-of-date local Uvicorn process must never erase valid draft content.
  internalAiStart(key,'global');
  __auneaGlobalAiFeedback.set(key,{working:true,type:'info',
    phase:resume?'RESUME_PREFLIGHT':'PREFLIGHT',
    message:resume?'Comprobando el borrador antes de reintentar fuentes pendientes…':
      'Comprobando versión del backend antes de preparar el inventario…'});
  internalAiGlobalRefresh(e);
  let processed=0,total=0,failures=[];
  try{
    if(!state.backendOnline&&!(await checkBackend()))
      throw Error('El backend no está conectado.');
    const statusResponse=await internalAiFetch(key,state.backendUrl+'/v1/internal-ai/status',{cache:'no-store'});
    if(!statusResponse.ok)throw Error('No se pudo consultar la disponibilidad de IA.');
    const status=await statusResponse.json();
    if(status.status!=='AVAILABLE'||status.provider!=='ollama')
      throw Error(String(status.reason||'Ollama local no está disponible o autorizado.'));
    if(status.pg11_review_protocol!==__auneaPg11ReviewProtocol)
      throw Error('El backend de PG11 no coincide. Reinicia el backend y actualiza la página.');
    if(status.pg11_global_strategy!=='SCOPED_V2')
      throw Error('El backend 8010 utiliza una versión anterior de la IA global. '+
        'Reinicia el backend actualizado: falta la estrategia por bloques. '+
        'La propuesta anterior no se ha borrado.');
    if(status.pg11_global_recovery!=='COMPACT_2_ATTEMPTS_20261107')
      throw Error('El backend 8010 sigue ejecutando una versión anterior del motor IA. '+
        'Reinícialo después de actualizar Git para activar la recuperación actual. '+
        'Las fuentes y propuestas guardadas se conservan.');
    const source=currentEng(),snap=confirmedSnapshot(source),diagnostic=currentDiagnosticOutput(source),
      payload={engagement:buildBackendPayload(source),diagnostic,
        confirmed_as_is:source.confirmedAsIs===true,snapshot_version:snap.version};
    const call=async(url,body)=>{
      let response;
      try{
        response=await internalAiFetch(key,state.backendUrl+'/v1/internal-ai/'+url,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }catch(error){
        if(internalAiCancelled(key,error))throw error;
        const failed=Error('Se interrumpió la conexión con el backend 8010. '+
          'Comprueba que siga ejecutándose y revisa sus errores y los de Ollama 11434. '+
          'Las fuentes completadas se mantienen guardadas.');
        failed.status=0;failed.network=true;throw failed;
      }
      if(!response.ok){
        const error=await response.json().catch(()=>null);
        const message=response.status===404?
          'El backend 8010 no tiene la ruta de análisis por bloques. Reinicia el backend '+
          'con el código de la rama actual y recarga la página.':
          typeof error?.detail==='string'?error.detail:
          typeof error?.detail?.message==='string'?error.detail.message:'Respuesta IA no válida.';
        const failure=Error('HTTP '+response.status+': '+message);
        failure.status=response.status;throw failure;
      }
      return response.json();
    };
    const callScoped=async body=>{
      // A valid JSON object can still contain a sentence truncated by Ollama.
      // Retry only that same block, keeping all previously saved results.
      // Exactly one repair request: a smaller JSON payload is less likely
      // to saturate local Ollama while preserving unlimited source batches.
      for(let attempt=0;attempt<2;attempt++){
        internalAiAssertActive(key);
        if(attempt){
          const run=__auneaAiRuns.get(key);
          if(run)run.detail='Reintentando solo este lote con una propuesta breve · intento 2 de 2';
          internalAiGlobalRefresh(currentEng());
        }
        try{return await call('tobe-global',attempt===0?body:
          {...body,retry_incomplete:true,retry_compact:true});}
        catch(error){
          if(attempt===1||error.status!==409||
             !/texto incompleto|objetivo en c[oó]digo/i.test(String(error.message||'')))
            throw error;
        }
      }
    };
    const plan=await call('tobe-global-plan',payload);
    if(plan.engagement_id!==e.id||plan.snapshot_version!==snap.version||
       !plan.input_hash||!Array.isArray(plan.focus)||
       plan.focus.some(x=>!x.source_id||typeof x.source_id!=='string'))
      throw Error('Inventario de oportunidades no corresponde al AS-IS vigente.');
    // Plan exists and is compatible. Only now make the explicit reanalysis
    // durable: all old cards disappear before any call to Ollama.
    const preflightLive=currentEng(),preflightDraft=latestTobe(preflightLive);
    if(!preflightLive||preflightLive.id!==e.id||!tobeEditable(preflightDraft)||
       preflightDraft.version!==p.version||internalAiPilotKey(preflightLive)!==key||
       confirmedSnapshot(preflightLive)?.version!==snap.version||
       currentDiagnosticOutput(preflightLive)?.input_snapshot_hash!==diagnostic.input_snapshot_hash)
      throw Error('El estudio cambió durante la verificación del backend.');
    const previousGlobal=preflightDraft.aiGlobal,previousResult=previousGlobal?.result;
    const canResume=resume&&previousGlobal?.tobeVersion===preflightDraft.version&&
      previousGlobal.sourceSnapshotVersion===snap.version&&
      previousGlobal.diagnosticInputHash===diagnostic.input_snapshot_hash&&
      previousResult?.status==='DRAFT'&&previousResult.engagement_id===e.id&&
      previousResult.snapshot_version===snap.version&&
      previousResult.input_hash===plan.input_hash&&previousResult.complete===false&&
      Array.isArray(previousResult.opportunities)&&
      Array.isArray(previousResult.progress?.focus_done)&&
      plan.focus.some(unit=>!previousResult.progress.focus_done.includes(unit.source_id));
    if(resume&&!canResume)
      throw Error('No hay fuentes pendientes recuperables para este AS-IS y borrador. '+
        'El análisis anterior permanece intacto; revisa su versión o vuelve a analizar.');
    if(!resume){
      delete preflightDraft.aiGlobal;
      markDirty('PG11: iniciar nuevo análisis global por fuentes confirmadas');
      let resetSaved=false;
      try{resetSaved=saveState('Guardar reinicio del análisis global v'+preflightDraft.version);}
      catch(_error){resetSaved=false;}
      if(!resetSaved){
        if(previousGlobal===undefined)delete preflightDraft.aiGlobal;
        else preflightDraft.aiGlobal=previousGlobal;
        throw Error('No se pudo guardar el reinicio del análisis global. Se ha restaurado el borrador previo.');
      }
    }
    total=plan.focus.length;
    if(__auneaAiRuns.get(key))__auneaAiRuns.get(key).total=total;
    const items=resume?JSON.parse(JSON.stringify(previousResult.opportunities)):[],
      validIds=new Set(plan.focus.map(x=>x.source_id)),
      doneSources=resume?[...new Set(previousResult.progress.focus_done)]
        .filter(id=>validIds.has(id)):[],
      sourceBatches=resume?JSON.parse(JSON.stringify(previousResult.progress.source_batches||{})):{};
    processed=resume?doneSources.length:0;
    const verifiedOwner=()=>{
      const live=currentEng(),draft=latestTobe(live),currentSnap=confirmedSnapshot(live);
      if(!live||live.id!==e.id||internalAiPilotKey(live)!==key||
         !tobeEditable(draft)||draft.version!==p.version||
         currentSnap?.version!==snap.version||
         currentDiagnosticOutput(live)?.input_snapshot_hash!==diagnostic.input_snapshot_hash)
        throw Error('El AS-IS, diagnóstico o borrador cambiaron durante el análisis.');
      return draft;
    };
    const persist=(complete)=>{
      const owner=verifiedOwner(),previous=owner.aiGlobal;
      owner.aiGlobal={tobeVersion:owner.version,
        sourceSnapshotVersion:owner.sourceSnapshotVersion,
        diagnosticInputHash:diagnostic.input_snapshot_hash,savedAt:now(),
        result:{status:'DRAFT',engagement_id:e.id,snapshot_version:snap.version,
          input_hash:plan.input_hash,model:status.model||previousResult?.model||'',
          summary:tobeGlobalSummary(items,doneSources.length,total),
          opportunities:items.map(x=>JSON.parse(JSON.stringify(x))),complete,
          progress:{completed:doneSources.length,attempted:processed,total,
            pending:total-doneSources.length,failed:failures.length,
            focus_done:[...doneSources],source_batches:JSON.parse(JSON.stringify(sourceBatches)),
            failures:failures.map(x=>({...x}))}}};
      markDirty('PG11: guardar avance del análisis global por bloques');
      let saved=false;
      try{saved=saveState('Guardar progreso IA global '+doneSources.length+'/'+total);}
      catch(_error){saved=false;}
      if(saved&&typeof localStorage!=='undefined'&&typeof STORAGE_KEY!=='undefined'){
        try{
          const disk=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
          const stored=(disk?.engagements||[]).find(x=>x.id===e.id)
            ?.tobeProposals?.find(x=>x.version===owner.version)?.aiGlobal;
          const expected=owner.aiGlobal;
          saved=!!stored&&stored.tobeVersion===expected.tobeVersion&&
            stored.sourceSnapshotVersion===expected.sourceSnapshotVersion&&
            stored.diagnosticInputHash===expected.diagnosticInputHash&&
            JSON.stringify(stored.result)===JSON.stringify(expected.result);
        }catch(_error){saved=false;}
      }
      if(!saved){
        if(previous===undefined)delete owner.aiGlobal;
        else owner.aiGlobal=previous;
        throw Error('No se pudo verificar el guardado del progreso del análisis IA. '+
          'Conserva esta pestaña y comprueba el almacenamiento antes de continuar.');
      }
    };
    if(!resume)persist(total===0);
    for(const unit of plan.focus){
      internalAiAssertActive(key);
      verifiedOwner();
      if(doneSources.includes(unit.source_id))continue;
      const seenForSource=Array.isArray(sourceBatches[unit.source_id])?
        [...sourceBatches[unit.source_id]]:
        items.flatMap(x=>[x,...(x.related||[])])
          .filter(x=>(x.source_refs||[]).includes(unit.source_id)).map(x=>String(x.how));
      let hasMore=true,batch=0;
      try{
        while(hasMore){
          internalAiAssertActive(key);
          verifiedOwner();
          if(__auneaAiRuns.get(key))__auneaAiRuns.get(key).detail=
            'Fuente '+(processed+1)+' de '+total+' · Lote '+(batch+1)+': '+String(unit.label||unit.source_id).slice(0,80);
          __auneaGlobalAiFeedback.set(key,{working:true,type:'info',
            message:'Analizando fuente '+(processed+1)+' de '+total+
              ' · Lote '+(batch+1)+': '+String(unit.label||unit.source_id).slice(0,80)});
          internalAiGlobalRefresh(currentEng());
          const data=await callScoped({
            ...payload,focus_source_id:unit.source_id,
            seen_interventions:[...seenForSource]});
          internalAiAssertActive(key);
          verifiedOwner();
          if(data?.status!=='DRAFT'||data.engagement_id!==e.id||
             data.snapshot_version!==snap.version||
             data.input_hash!==plan.input_hash||
             data.focus_source_id!==unit.source_id||
             typeof data.has_more!=='boolean'||
             !Array.isArray(data.opportunities)||
             data.opportunities.some(x=>!x.objective||!x.how||!x.why||
               !Array.isArray(x.source_refs)||!x.source_refs.includes(unit.source_id)))
            throw Error('La respuesta del lote no corresponde a la fuente confirmada.');
          let novel=0;
          for(const item of data.opportunities){
            const proposed={objective:String(item.objective),how:String(item.how),
              why:String(item.why),constraints:String(item.constraints||''),
              source_refs:item.source_refs.map(String),
              review:item.review||{status:'CONDITIONED',
                reason:'Requiere revisión de viabilidad.',conflicts:[]},
              quality:item.quality||{status:'REVIEW',basis:'NOT_EVALUATED',
                issues:[{message:'No consta evaluación de coherencia de la intervención.'}]}};
            // Keep the actual action for continuation even when it is grouped
            // with another recommendation in the visible consolidation.
            const duplicate=seenForSource.some(h=>
              h.normalize('NFD').toLocaleLowerCase('es')===
              proposed.how.normalize('NFD').toLocaleLowerCase('es'));
            if(duplicate)continue;
            seenForSource.push(proposed.how);
            if(proposed.review.status==='INCOMPATIBLE'){
              __auneaGlobalAiFeedback.set(key,{working:true,type:'info',
                message:'Buscando alternativa compatible para '+unit.source_id+'…'});
              internalAiGlobalRefresh(currentEng());
              try{
                const alternative=await callScoped({
                  ...payload,focus_source_id:unit.source_id,
                  blocked_action:proposed.how,
                  blocked_constraints:proposed.constraints});
                verifiedOwner();
                if(alternative?.status!=='DRAFT'||alternative.engagement_id!==e.id||
                   alternative.snapshot_version!==snap.version||
                   alternative.input_hash!==plan.input_hash||
                   alternative.focus_source_id!==unit.source_id||
                   !Array.isArray(alternative.opportunities))
                  throw Error('La alternativa no corresponde a la fuente ni al diagnóstico vigentes.');
                const valid=alternative.opportunities.find(x=>
                  x.review?.status==='CONDITIONED'&&
                  Array.isArray(x.review.conflicts)&&x.review.conflicts.length===0&&
                  x.source_refs?.includes(unit.source_id)&&
                  typeof x.how==='string'&&x.how.trim()&&
                  typeof x.why==='string'&&x.why.trim());
                if(valid){
                  proposed.alternative={
                    objective:String(valid.objective||''),
                    how:String(valid.how),why:String(valid.why),
                    constraints:String(valid.constraints||''),
                    source_refs:(valid.source_refs||[]).map(String),
                    review:valid.review};
                }else proposed.alternative_note=
                  'No se identificó una alternativa verificable; requiere revisión.';
              }catch(error){
                if(internalAiCancelled(key,error))throw error;
                proposed.alternative_note='La alternativa no pudo evaluarse: '+
                  String(error.message||error).slice(0,180);
              }
            }
            if(tobeGlobalMerge(items,proposed))novel++;
          }
          batch++;
          hasMore=data.has_more;
          // A model claiming more work without supplying any distinct
          // intervention must not loop indefinitely or mark the source complete.
          if(hasMore&&novel===0)
            throw Error('Ollama repitió intervenciones sin aportar otra mejora distinta. '+
              'Se ha conservado el análisis parcial para revisar la fuente.');
          sourceBatches[unit.source_id]=[...seenForSource];
          persist(false);
        }
        doneSources.push(unit.source_id);
      }catch(error){
        if(internalAiCancelled(key,error))throw error;
        if(/No se pudo (?:guardar|verificar el guardado) del progreso del análisis IA/.test(String(error.message||'')))
          throw error;
        failures.push({source_id:unit.source_id,
          reason:String(error.message||error).slice(0,240)});
        if(error.status===503||/conexi[oó]n|backend|no pudo guardar/i.test(String(error.message||''))){
          processed++;
          persist(false);
          break;
        }
      }
      processed++;
      persist(false);
      internalAiGlobalRefresh(currentEng());
    }
    internalAiAssertActive(key);
    const complete=doneSources.length===total&&failures.length===0;
    persist(complete);
    __auneaGlobalAiFeedback.set(key,{working:false,
      type:complete?'info':'warn',
      message:complete?'Análisis por fuentes completado: '+items.length+
        (items.length===1?' recomendación guardada.':' recomendaciones guardadas.')+
        ' Pendiente de revisión humana.':
        'Análisis parcial: '+doneSources.length+' de '+total+
        ' fuentes procesadas. '+failures.length+
        ' incidencias. '+(failures[0]?.reason||'Consulta el detalle antes de revisar.')});
  }catch(error){
    __auneaGlobalAiFeedback.set(key,{working:false,type:'warn',
      message:internalAiCancelled(key,error)?
        'Análisis cancelado. Los bloques guardados se conservan.':
        'No se completó el análisis global. '+String(error.message||error)});
    console.error('PG11: fallo al analizar proceso por bloques',error);
  }finally{
    internalAiStop(key);
    internalAiGlobalRefresh(currentEng());
  }
}
// [AUNEA-FE-PG11-GLOBAL-AI-285] END

function internalAiPilotKey(e){
  const snap=confirmedSnapshot(e),diagnostic=currentDiagnosticOutput(e),p=latestTobe(e);
  return e?.confirmedAsIs===true&&snap&&diagnostic&&p
    ?String(e.id)+'|'+String(snap.version)+'|'+String(diagnostic.input_snapshot_hash)+
      '|TOBE:'+String(p.version):null;
}
// [AUNEA-FE-PG11-AI-DRAFT-SAVE-202] START — save concise AI suggestion in versioned TO-BE owner.
// SOURCE: Simulator CANONICAL PG11 (versioned TO-BE proposal); DEC-050/052/055.
// This is an internal, unapproved proposal, not the approved TO-BE item or a new business master.
// Only functional suggestions/review are stored. Technical HTTP audits and prompts stay ephemeral.
const __auneaAiDraftItemKeys=Object.freeze([
  'source_step_id','transformation','problem_resolved','rationale',
  'future_actor','tool','inputs','outputs','automation_ai','human_supervision',
  'controls_risk','source_refs','limitations'
]);
function internalAiBoundedDraftItem(item){
  const saved={};
  for(const field of __auneaAiDraftItemKeys){
    const value=item?.[field];
    if(typeof value==='string')saved[field]=value;
    else if(field==='source_refs'&&Array.isArray(value))
      saved[field]=value.filter(v=>typeof v==='string');
  }
  return saved;
}
function internalAiBoundedReview(review){
  return {
    status:String(review?.status||''),
    review_mode:String(review?.review_mode||'OLLAMA'),
    summary:String(review?.summary||''),
    protocol_revision:String(review?.protocol_revision||''),
    requires_human_review:true,
    blocking_step_ids:Array.isArray(review?.blocking_step_ids)?
      review.blocking_step_ids.filter(x=>typeof x==='string'):[],
    issues:Array.isArray(review?.issues)?review.issues.map(issue=>({
      step_id:String(issue?.step_id||''),
      category:String(issue?.category||'WARNING'),
      issue:String(issue?.issue||''),
      evidence:String(issue?.evidence||''),
      action:String(issue?.action||'')
    })):[]
  };
}
function internalAiDraftMatchesTobe(e,data){
  const p=latestTobe(e),snap=confirmedSnapshot(e),diag=currentDiagnosticOutput(e);
  const stepIds=p?.items?.map(x=>String(x.sourceStepId));
  return !!(p?.status==='DRAFT'&&snap&&diag&&Array.isArray(stepIds)&&stepIds.length&&
    p.sourceSnapshotVersion===snap.version&&
    data?.status==='DRAFT'&&data.engagement_id===e.id&&
    data.snapshot_version===snap.version&&
    typeof data.input_hash==='string'&&!!data.input_hash&&
    Array.isArray(data.items)&&data.items.length===stepIds.length&&
    data.items.every(x=>stepIds.includes(String(x.source_step_id)))&&
    new Set(data.items.map(x=>String(x.source_step_id))).size===stepIds.length);
}
function internalAiSavedDraft(e){
  const p=latestTobe(e),entry=p?.aiDraft;
  if(!entry||entry.sourceSnapshotVersion!==p.sourceSnapshotVersion)return null;
  const proposal=entry.proposal;
  return entry.diagnosticInputHash===currentDiagnosticOutput(e)?.input_snapshot_hash&&
    internalAiDraftMatchesTobe(e,proposal)?proposal:null;
}
// [AUNEA-FE-PG11-AI-RECOVERY-208] START — expose saved proposals of previous or stale versions read-only.
// SOURCE: DEC-050/055; only existing Engagement.tobeProposals[n].aiDraft.
// OUTPUT: bounded, read-only recovery; never promotes a proposal to current DRAFT fields.
function internalAiHistoricalDraft(e){
  const versions=Array.isArray(e?.tobeProposals)?e.tobeProposals:[];
  for(let i=versions.length-1;i>=0;i--){
    const owner=versions[i],stored=owner?.aiDraft,proposal=stored?.proposal;
    if(proposal&&Array.isArray(proposal.items)&&proposal.items.length){
      return {proposal,version:owner.version,snapshotVersion:stored.sourceSnapshotVersion,
        savedAt:stored.savedAt||'',currentVersion:owner===latestTobe(e)};
    }
  }
  return null;
}
// [AUNEA-FE-PG11-AI-RECOVERY-208] END

// [AUNEA-FE-PG11-SEGMENT-CHECKPOINT-211] START — bounded recovery for confirmed per-step proposals.
// SOURCE: DEC-050/052/055; PilotAIItem contract; existing versioned TO-BE aiDraft owner.
// CHECKPOINT IS NOT A REVIEWED PROPOSAL. No prompts, HTTP traces or client-facing publication.
const __auneaStepCheckpointFormat='PG11_STEP_CHECKPOINT_1';
function internalAiCheckpointValid(e,entry){
  const p=latestTobe(e),snap=confirmedSnapshot(e),diagnostic=currentDiagnosticOutput(e);
  if(!p||p.status!=='DRAFT'||!snap||!diagnostic||!entry||entry.format!==__auneaStepCheckpointFormat
     ||entry.tobeVersion!==p.version||entry.snapshotVersion!==snap.version
     ||entry.diagnosticInputHash!==diagnostic.input_snapshot_hash
     ||p.sourceSnapshotVersion!==snap.version||!Array.isArray(entry.items)
     ||!entry.items.length||typeof entry.inputHash!=='string'||!entry.inputHash.trim())return false;
  const ids=p.items.map(x=>String(x.sourceStepId));
  const storedIds=entry.items.map(x=>String(x?.source_step_id||''));
  return entry.stepSignature===ids.join('|')&&storedIds.length<=ids.length&&
    new Set(storedIds).size===storedIds.length&&
    storedIds.every(id=>ids.includes(id));
}
function internalAiPendingSteps(e,key){
  if(!key||!e)return null;
  const ids=(latestTobe(e)?.items||[]).map(x=>String(x.sourceStepId));
  const inMemory=__auneaAiCompletedSteps.get(key);
  if(inMemory?.stepSignature===ids.join('|'))return inMemory;
  const entry=latestTobe(e)?.aiDraft?.checkpoint;
  if(!internalAiCheckpointValid(e,entry))return null;
  const restored={stepSignature:entry.stepSignature,
    items:new Map(entry.items.map(item=>[String(item.source_step_id),item])),
    traces:new Map(),inputHash:entry.inputHash,model:entry.model||''};
  __auneaAiCompletedSteps.set(key,restored);
  return restored;
}
function internalAiCheckpointSaved(e,key,pending){
  const entry=latestTobe(e)?.aiDraft?.checkpoint;
  if(!internalAiCheckpointValid(e,entry)||!pending||typeof localStorage==='undefined')return false;
  try{
    const disk=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    const persisted=disk?.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===latestTobe(e)?.version)?.aiDraft?.checkpoint;
    return !!persisted&&persisted.format===entry.format&&
      persisted.inputHash===entry.inputHash&&
      JSON.stringify(persisted.items)===JSON.stringify(entry.items)&&
      persisted.items.length===pending.items.size;
  }catch(_){return false}
}
function internalAiSaveCheckpoint(e,key,pending,model){
  const live=currentEng();
  if(!live||!e||live.id!==e.id||!key||internalAiPilotKey(live)!==key||
     !tobeEditable(latestTobe(live))||!pending?.items?.size||!pending.inputHash)return false;
  const p=latestTobe(live),ids=p.items.map(x=>String(x.sourceStepId));
  if(pending.stepSignature!==ids.join('|')||pending.items.size>ids.length||
      [...pending.items.keys()].some(id=>!ids.includes(id)))return false;
  const proposed=ids.filter(id=>pending.items.has(id))
    .map(id=>internalAiBoundedDraftItem(pending.items.get(id)));
  if(!saveTobeFromDom(live))return false;
  const checkpoint={format:__auneaStepCheckpointFormat,tobeVersion:p.version,
    snapshotVersion:p.sourceSnapshotVersion,
    diagnosticInputHash:currentDiagnosticOutput(live).input_snapshot_hash,
    stepSignature:pending.stepSignature,inputHash:pending.inputHash,
    model:String(model||pending.model||''),items:proposed,savedAt:now()};
  p.aiDraft={...(p.aiDraft||{}),
    sourceSnapshotVersion:p.sourceSnapshotVersion,
    diagnosticInputHash:currentDiagnosticOutput(live).input_snapshot_hash,
    checkpoint};
  markDirty('PG11: '+proposed.length+' actividades IA verificadas, revisión global pendiente');
  if(!saveState('Guardar actividades IA verificadas sin aprobar'))return false;
  return internalAiCheckpointSaved(currentEng(),key,pending);
}
// [AUNEA-FE-PG11-SEGMENT-CHECKPOINT-211] END

function persistTobeAiDraft(e){
  const key=internalAiPilotKey(e),p=latestTobe(e);
  if(!tobeEditable(p))return false;
  // Manual consultant fields remain saveable if the IA provider or official diagnostic is
  // temporarily unavailable. Never attach a suggestion from a different snapshot/version.
  if(!key)return true;
  const proposal=__auneaAiPreview.get(key);
  if(!proposal)return true; // Re-save existing version without clearing the stored AI draft.
  if(!internalAiDraftMatchesTobe(e,proposal)){
    toast('La propuesta IA no coincide con el estudio confirmado; no se ha guardado.');
    return false;
  }
  // Attach a single read-only AI suggestion to the canonical TO-BE DRAFT owner/version.
  // Blocked suggestions are saved as proposals, never copied to approved business fields.
  const bounded={
    status:'DRAFT',engagement_id:e.id,snapshot_version:proposal.snapshot_version,
    input_hash:proposal.input_hash,model:String(proposal.model||''),
    items:proposal.items.map(internalAiBoundedDraftItem),
    review:internalAiBoundedReview(proposal.review),
    applied:proposal.applied===true
  };
  // Keep consultant decisions and verified step checkpoint when saving the
  // read-only AI proposal. Never replace another field owned by this TO-BE version.
  p.aiDraft={...(p.aiDraft||{}),
    sourceSnapshotVersion:p.sourceSnapshotVersion,
    diagnosticInputHash:currentDiagnosticOutput(e).input_snapshot_hash,
    savedAt:now(),
    proposal:bounded
  };
  return true;
}
// [AUNEA-FE-PG11-AI-DRAFT-SAVE-202] END
// A saved marker is shown only after localStorage confirms this exact proposal.
function internalAiSavedInBrowser(e,draft){
  if(!draft||typeof localStorage==='undefined'||typeof STORAGE_KEY==='undefined')return false;
  try{
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    const p=latestTobe(e);
    const copy=stored?.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===p?.version)?.aiDraft;
    if(!copy||copy.sourceSnapshotVersion!==p.sourceSnapshotVersion||
       copy.diagnosticInputHash!==currentDiagnosticOutput(e)?.input_snapshot_hash||
       !internalAiDraftMatchesTobe(e,copy.proposal))return false;
    const normalized={
      items:draft.items.map(internalAiBoundedDraftItem),
      review:internalAiBoundedReview(draft.review),
      applied:draft.applied===true
    };
    const onDisk={
      items:copy.proposal.items,review:copy.proposal.review,
      applied:copy.proposal.applied===true
    };
    return copy.proposal.input_hash===draft.input_hash&&
      JSON.stringify(normalized)===JSON.stringify(onDisk);
  }catch(_){return false}
}
function internalAiPilotNarrative(value){
  const text=String(value||'');
  const match=text.match(/Acci[oó]n propuesta:\s*([\s\S]*?)\s*Resultado esperado:\s*([\s\S]*?)\s*Justificaci[oó]n:\s*([\s\S]*)/i);
  return match?{action:match[1].trim(),expected:match[2].trim(),reason:match[3].trim()}
    :{action:'',expected:'',reason:text};
}
// [AUNEA-FE-PG11-AI-UX-201] START — summary-first consultant UI; audit rendered on demand.
// SOURCE: PG11 Simulator CANONICAL; DEC-050/052/055. No new capture or persistence.
function internalAiAuditJson(value,label='JSON técnico'){
  if(value==null)return '<p class="field-help">No disponible en esta ejecución.</p>';
  return '<details><summary>'+esc(label)+'</summary><button type="button" class="btn btn-outline" data-ai-copy>Copiar JSON</button>'+
    '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:30rem;overflow:auto">'+esc(JSON.stringify(value,null,2))+'</pre></details>';
}
function internalAiAuditValues(value){
  if(value==null)return 'No transmitido';
  if(Array.isArray(value))return value.length?'<ul>'+value.map(v=>'<li>'+internalAiAuditValues(v)+'</li>').join('')+'</ul>':'Ninguno';
  if(typeof value==='object')return '<dl>'+Object.entries(value).map(([k,v])=>'<dt><b>'+esc(k)+'</b></dt><dd>'+internalAiAuditValues(v)+'</dd>').join('')+'</dl>';
  return esc(String(value));
}
function internalAiAuditContext(trace,index){
  if(!trace?.attempts)return internalAiAuditJson(trace,'Inventario anterior: sólo IDs');
  const attempt=trace.attempts[index];
  if(!attempt)return '<p>Intento no disponible.</p>';
  let context=null;
  try{context=JSON.parse(attempt.request?.messages?.[1]?.content?.split('\n').slice(1).join('\n'))}catch(_){}
  return '<div class="card card-pad">'+
    '<p><b>Intento '+(index+1)+'</b> · '+esc(attempt.validation_status||'Validación pendiente')+'</p>'+
    (attempt.error?'<p class="notice warn">'+esc(attempt.error)+'</p>':'')+
    '<p class="field-help">Auditoría de la ejecución actual: datos redactados cuando corresponde; bytes medidos antes de la redacción. No contiene razonamiento interno.</p>'+
    '<details><summary>Entrada y fuentes enviadas</summary>'+
    [['Actividad',context?.current_activity],['Fricciones',context?.explicit_linked_frictions],
     ['Riesgos',context?.explicit_linked_risks],['Evidencias',context?.linked_evidence],
     ['Hallazgos diagnósticos',context?.official_diagnostic_findings],
     ['Decisiones y rutas',context?.process_flow],
     ['Restricciones',context?.analysis_constraints],
     ['Corrección solicitada',context?.targeted_correction]].map(([label,value])=>
       '<details><summary>'+label+'</summary>'+internalAiAuditValues(value)+'</details>').join('')+
    '<p class="field-help">Se envió la proyección indicada, no el diagnóstico oficial completo.</p>'+
    '</details>'+
    '<details><summary>Salida y validación</summary>'+
    (attempt.response_note?'<p>'+esc(attempt.response_note)+'</p>':'')+
    internalAiAuditJson(attempt.original_response,'Respuesta original (redactada)')+
    internalAiAuditJson(attempt.validated_proposal,'Propuesta validada estructuralmente')+
    '</details>'+
    '<details><summary>Medición, instrucciones y solicitud HTTP</summary>'+
    '<p><b>Tamaño:</b> '+esc(attempt.request_bytes??'No disponible')+' / '+esc(attempt.budget_bytes??'No disponible')+' bytes. '+
    '<b>Tokens de entrada:</b> '+esc(attempt.prompt_eval_count??'No disponibles')+' / '+esc(attempt.input_token_limit??'No disponible')+'</p>'+
    internalAiAuditJson({components:attempt.component_bytes,instructions_bytes:attempt.instructions_bytes,
      schema_bytes:attempt.schema_bytes,model:attempt.request?.model,options:attempt.request?.options},'Desglose técnico')+
    internalAiAuditJson({instructions:attempt.request?.messages?.[0]?.content},'Instrucciones recibidas')+
    internalAiAuditJson(attempt.request,'Solicitud y esquema enviados (redactados)')+
    '</details></div>';
}
function internalAiPilotTracePanel(traces){
  const values=Object.entries(traces||{});
  if(!values.length)return '';
  return '<details class="step-group internal-only"><summary>Auditoría técnica IA · '+values.length+
    ' actividades (ver entradas, respuestas y JSON)</summary>'+
    '<p class="field-help">Detalle para diagnóstico interno. Cerrado por defecto; sólo se representa al solicitarlo. '+
    'Los datos sensibles pueden aparecer redactados. La validación del contrato no equivale a aprobación humana.</p>'+
    values.map(([sid,trace])=>{
      const attempts=trace?.attempts||[];
      const count=attempts.length||1;
      return '<details><summary>'+esc(internalAiActivityLabel(currentEng(),sid))+
        ' · '+count+' intento'+(count===1?'':'s')+'</summary>'+
        (attempts.length?attempts.map((attempt,index)=>
          '<div class="card card-pad"><p><b>Intento '+(index+1)+'</b> · '+
          esc(attempt.validation_status||(attempt.error?'Error':'Pendiente'))+
          (attempt.prompt_eval_count==null?'':' · '+esc(attempt.prompt_eval_count)+' tokens')+'</p>'+
          '<button type="button" class="btn btn-outline" data-ai-audit-step="'+esc(sid)+
          '" data-ai-audit-attempt="'+index+'">Examinar entrada y salida</button>'+
          '<div data-ai-audit-slot></div></div>').join(''):
          '<button type="button" class="btn btn-outline" data-ai-audit-step="'+esc(sid)+
          '" data-ai-audit-attempt="legacy">Ver inventario anterior</button><div data-ai-audit-slot></div>')+
      '</details>';
    }).join('')+'</details>';
}
// [AUNEA-FE-PG11-AI-LABELS-255] START
function internalAiActivityLabel(e,sourceId){
  const id=String(sourceId||'');
  if(!e)return 'Actividad de origen sin nombre ('+id+')';
  const item=(latestTobe(e)?.items||[]).find(x=>String(x.sourceStepId)===id);
  const source=typeof confirmedSnapshot==='function'?
    (confirmedSnapshot(e)?.processSteps||[]).find(x=>String(x.id)===id):null;
  const name=String(item?.sourceStepName||source?.step_name||'Actividad de origen sin nombre');
  return name+' ('+id+')';
}
function internalAiReadableRefs(e,refs){
  return (Array.isArray(refs)?refs:[]).map(ref=>{
    const id=String(ref);
    return (latestTobe(e)?.items||[]).some(item=>String(item.sourceStepId)===id)?
      internalAiActivityLabel(e,id):id;
  }).join(', ');
}
// [AUNEA-FE-PG11-AI-LABELS-255] END
function internalAiReviewIssue(issue){
  return '<li><b>'+esc(issue.category==='BLOCKING'?'Bloqueo':issue.category==='PENDING'?'Pendiente':'Observación')+
    ':</b> '+esc(issue.issue||'Sin descripción')+
    (issue.evidence?'<p><b>Motivo:</b> '+esc(issue.evidence)+'</p>':'')+
    (issue.action?'<p><b>Para resolverlo:</b> '+esc(issue.action)+'</p>':'')+'</li>';
}
function internalAiReviewPanel(review){
  if(!review)return '<p class="field-help">La revisión global aún no ha concluido.</p>';
  const global=(review.issues||[]).filter(i=>i.step_id==='GLOBAL'||!i.step_id);
  return '<details><summary>Observaciones generales · '+global.length+'</summary>'+
    (global.length?'<ul>'+global.map(internalAiReviewIssue).join('')+'</ul>':
      '<p class="field-help">No se han comunicado observaciones globales.</p>')+
    ((Array.isArray(review.audit)&&review.audit.length)||review.initial_review?
      '<button type="button" class="btn btn-outline" data-ai-review-audit>Examinar auditoría del revisor</button>'+
      '<div data-ai-review-slot></div>':
      '<p class="field-help">El registro técnico detallado de la revisión no se conserva tras recargar.</p>')+
    '</details>';
}
// [AUNEA-FE-PG11-PENDING-UI-212] START — consultant-facing verified steps before global review.
function internalAiPendingPanel(e,key,pending,feedback){
  const source=latestTobe(e),ids=source.items.map(x=>String(x.sourceStepId));
  const saved=internalAiCheckpointSaved(e,key,pending);
  const cards=ids.filter(id=>pending.items.has(id)).map((id,index)=>{
    const item=pending.items.get(id),sourceItem=source.items.find(x=>String(x.sourceStepId)===id);
    const narrative=internalAiPilotNarrative(item.rationale);
    return '<article class="pg11-ai-step" aria-label="Actividad IA verificada '+esc(id)+'">'+
      '<header class="pg11-ai-step-head"><div class="pg11-ai-step-identity">'+
        '<span class="pg11-ai-step-number">'+(index+1)+'</span>'+
        '<div class="pg11-ai-step-heading"><h4>'+esc(sourceItem?.sourceStepName||'Actividad de origen sin nombre')+'</h4>'+
        '<span class="pg11-ai-step-code">Referencia AS-IS ('+esc(id)+')</span></div></div>'+
        '<span class="pg11-ai-transformation">'+esc(item.transformation||'Pendiente')+'</span></header>'+
      '<div class="pg11-ai-step-main"><div class="pg11-ai-problem"><span>Problema identificado</span>'+
        '<p>'+esc(item.problem_resolved||'Sin concretar')+'</p></div>'+
        '<div class="pg11-ai-proposal-grid">'+
          '<div><span>Intervención propuesta</span><p>'+esc(narrative.action||'Por revisar')+'</p></div>'+
          '<div><span>Resultado esperado</span><p>'+esc(narrative.expected||'Por revisar')+'</p></div>'+
        '</div><details class="pg11-ai-details"><summary>Justificación, fuentes y límites</summary>'+
          '<div class="pg11-ai-detail-content">'+
            '<p><b>Justificación:</b> '+esc(narrative.reason||'Sin declarar')+'</p>'+
            '<p><b>Fuentes:</b> '+esc(internalAiReadableRefs(e,item.source_refs)||'Sin declarar')+'</p>'+
            '<p><b>Condiciones por validar:</b> '+esc(item.limitations||'Sin declarar')+'</p>'+
          '</div></details></div></article>';
  }).join('');
  const complete=pending.items.size===ids.length;
  return '<section id="tobeAiPilotStatus" class="pg11-ai-panel pg11-ai-pending card card-pad section">'+
    '<header class="pg11-ai-header"><div><p class="pg11-ai-eyebrow">TRABAJO INTERNO · PG11</p>'+
      '<h2>Propuestas IA verificadas por actividad</h2>'+
      '<p class="pg11-ai-subtitle">Generación individual completada o parcialmente completada; la revisión global todavía NO ha finalizado.</p></div>'+
      '<span class="pg11-ai-top-status">Pendiente de consolidación</span></header>'+
    '<div class="pg11-ai-save-state'+(saved?' pg11-ai-save-state-saved':' pg11-ai-save-state-pending')+'">'+
      '<span class="pg11-ai-save-indicator" aria-hidden="true"></span><div><b>'+
        (saved?'Actividades verificadas y guardadas en el estudio.':'Actividades verificadas, pendientes de guardado confirmado.')+
      '</b><p>Estas sugerencias no pueden aplicarse ni aprobarse hasta completar la revisión de coherencia.</p></div></div>'+
    '<div class="pg11-ai-metrics" aria-label="Estado real de la generación">'+
      '<div><strong>'+pending.items.size+'/'+ids.length+'</strong><span>Actividades verificadas</span></div>'+
      '<div><strong>'+Math.max(0,ids.length-pending.items.size)+'</strong><span>Actividades por generar</span></div>'+
      '<div><strong>Pendiente</strong><span>Revisión global</span></div></div>'+
    '<p id="tobeAiProgress" role="status" aria-live="polite" class="pg11-ai-message'+
      (feedback?.type==='warn'?' pg11-ai-message-warn':'')+'">'+
      esc(feedback?.message||'Las propuestas verificadas siguen disponibles. Falta completar la revisión global.')+'</p>'+
    '<div class="pg11-ai-section-title"><div><p class="pg11-ai-eyebrow">PROPUESTAS NO APROBADAS</p>'+
      '<h3>Intervenciones y resultados esperados</h3></div><span>'+pending.items.size+' actividades</span></div>'+
    '<div class="pg11-ai-step-list">'+cards+'</div>'+
    '<div class="pg11-ai-actions">'+
      (complete?'<button type="button" class="btn btn-primary" id="retryTobeAiReview">Comprobar coherencia básica (sin Ollama)</button>':
        '<button type="button" class="btn btn-primary" data-tobe-generate-all-remaining>Analizar pasos pendientes</button>')+
      '<button type="button" class="btn btn-outline" id="saveTobeAiPending">'+
        'Guardar actividades verificadas</button></div>'+
    (feedback?.type==='warn'?'<p class="notice warn" role="alert"><b>Comprobación no completada.</b> '+esc(feedback.message)+'</p>':'')+
    internalAiPilotTracePanel(Object.fromEntries(pending.traces||new Map()))+
    '<p class="pg11-ai-muted">No es un TO-BE aprobado. Las fuentes originales y las decisiones humanas no se modifican.</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-PENDING-UI-212] END
function internalAiPilotPanel(e){
  if(typeof isClientDisplay==='function'&&isClientDisplay())return '';
  const key=internalAiPilotKey(e),cached=key?__auneaAiPreview.get(key):null;
  const persisted=key?internalAiSavedDraft(e):null;
  const partial=key?internalAiPendingSteps(e,key):null;
  const historical=!cached&&!persisted&&!partial?.items?.size?internalAiHistoricalDraft(e):null;
  const draft=cached||persisted||historical?.proposal;
  const feedback=key?__auneaAiFeedback.get(key):null;
  if(!draft&&partial?.items?.size)return internalAiPendingPanel(e,key,partial,feedback);
  if(!draft)return '<section id="tobeAiPilotStatus" class="pg11-ai-panel pg11-ai-empty card card-pad section">'+
    '<header class="pg11-ai-header"><div><p class="pg11-ai-eyebrow">TRABAJO INTERNO · PG11</p>'+
    '<h2>Estado de las propuestas IA</h2>'+
    '<p class="pg11-ai-subtitle">La IA prepara sugerencias, pero el consultor revisa y decide.</p></div></header>'+
    '<p class="pg11-ai-message">No se ha localizado una propuesta IA guardada para este estudio en su historial de versiones. Los datos generados en una sesión anterior sin guardar no pueden recuperarse automáticamente.</p>'+
    '<p id="tobeAiProgress" role="status" aria-live="polite" class="pg11-ai-message'+(feedback?.type==='warn'?' pg11-ai-message-warn':'')+'">'+
    esc(feedback?.message||'Puedes analizar las actividades pendientes con IA desde aquí o una actividad concreta desde su inspector. La IA nunca aplica cambios automáticamente.')+'</p>'+ 
    '<button type="button" class="btn btn-outline" data-tobe-generate-all-remaining>Analizar pasos pendientes con IA</button>'+
    internalAiPilotTracePanel(Object.fromEntries(partial?.traces||new Map()))+'</section>';
  const review=draft.review||null;
  const items=Array.isArray(draft.items)?draft.items:[];
  const issues=Array.isArray(review?.issues)?review.issues:[];
  const blockedIds=new Set(Array.isArray(review?.blocking_step_ids)?review.blocking_step_ids:[]);
  for(const issue of issues)if(issue.category==='BLOCKING'&&issue.step_id!=='GLOBAL')blockedIds.add(issue.step_id);
  const blocked=blockedIds.size>0||issues.some(i=>i.category==='BLOCKING'&&(!i.step_id||i.step_id==='GLOBAL'));
  const saved=!!historical||internalAiSavedInBrowser(e,draft);
  const traces=partial?Object.fromEntries(partial.traces||new Map()):draft.context_traces;
  const sourceNames=new Map((latestTobe(e)?.items||[]).map(it=>[String(it.sourceStepId),String(it.sourceStepName||'')]));
  const cards=items.map((item,index)=>{
    const sid=String(item.source_step_id||'');
    const related=issues.filter(i=>i.step_id===sid);
    const hasBlock=blockedIds.has(sid);
    const narrative=internalAiPilotNarrative(item.rationale);
    return '<article class="pg11-ai-step" aria-label="Propuesta '+esc(sid)+'">'+
      '<header class="pg11-ai-step-head">'+
        '<div class="pg11-ai-step-identity"><span class="pg11-ai-step-number">'+(index+1)+'</span>'+
        '<div class="pg11-ai-step-heading"><h4>'+esc(sourceNames.get(sid)||'Actividad de origen sin nombre')+'</h4>'+
        '<span class="pg11-ai-step-code">Referencia AS-IS ('+esc(sid)+')</span></div></div>'+
        '<span class="pg11-ai-transformation">'+esc(item.transformation||'Sin clasificar')+'</span>'+
      '</header>'+
      '<div class="pg11-ai-step-main">'+
        '<div class="pg11-ai-problem"><span>Problema identificado</span><p>'+esc(item.problem_resolved||'No concretado')+'</p></div>'+
        '<div class="pg11-ai-proposal-grid">'+
          '<div><span>Intervención propuesta</span><p>'+esc(narrative.action||'No concretada')+'</p></div>'+
          '<div><span>Resultado esperado</span><p>'+esc(narrative.expected||'No declarado')+'</p></div>'+
        '</div>'+
        (hasBlock?'<p class="pg11-ai-issue-flag">Requiere corrección antes de aplicar.</p>':'')+
        (related.length?'<details class="pg11-ai-details pg11-ai-review-details"><summary>Aspectos por revisar · '+
          related.length+' ('+related.filter(x=>x.category==='BLOCKING').length+' bloqueos, '+
          related.filter(x=>x.category!=='BLOCKING').length+' pendientes/observaciones)'+
          '</summary><ul class="pg11-ai-review-list">'+related.map(internalAiReviewIssue).join('')+'</ul></details>':
          '<p class="pg11-ai-muted">Sin observaciones individuales; pendiente de revisión humana.</p>')+
        '<details class="pg11-ai-details"><summary>Justificación, fuentes y condiciones</summary>'+
          '<div class="pg11-ai-detail-content">'+
          '<p><b>Justificación:</b> '+esc(narrative.reason||'No declarada')+'</p>'+
          '<p><b>Fuentes:</b> '+esc(internalAiReadableRefs(e,item.source_refs)||'Ninguna')+'</p>'+
          '<p><b>Condiciones por validar:</b> '+esc(item.limitations||'No declaradas')+'</p>'+
          '<p><b>Responsable futuro:</b> '+esc(item.future_actor||'No definido')+'</p>'+
          '<p><b>Supervisión humana:</b> '+esc(item.human_supervision||'No definida')+'</p>'+
          '<p><b>Controles y riesgos:</b> '+esc(item.controls_risk||'No definidos')+'</p>'+
          '</div></details>'+
      '</div></article>';
  }).join('');
  return '<section id="tobeAiPilotStatus" class="pg11-ai-panel card card-pad section">'+
    (historical?'<div class="notice warn pg11-ai-historical-notice"><b>Propuesta IA anterior recuperada — sólo consulta.</b>'+
      '<p>Se encuentra guardada en TO-BE v'+esc(historical.version)+
      ' (origen AS-IS v'+esc(historical.snapshotVersion)+
      '). No es una propuesta vigente y no se puede aplicar automáticamente. El modelo local no es necesario para consultar este archivo.</p></div>':'')+
    '<header class="pg11-ai-header">'+
      '<div><p class="pg11-ai-eyebrow">TRABAJO INTERNO · PG11</p>'+
      '<h2>Estado de las propuestas IA</h2>'+
      '<p class="pg11-ai-subtitle">Borrador de propuestas para revisión del consultor · '+esc(draft.model||'Modelo no indicado')+'</p></div>'+
      '<span class="pg11-ai-top-status">'+(review?.review_mode==='RULES_ONLY'?
        (blocked?'Comprobación con bloqueos':'Comprobación finalizada'):
        (blocked?'Revisión con bloqueos':'Revisión pendiente'))+'</span>'+
    '</header>'+
    '<div class="pg11-ai-save-state'+(saved?' pg11-ai-save-state-saved':' pg11-ai-save-state-pending')+'">'+
      '<span class="pg11-ai-save-indicator" aria-hidden="true"></span>'+
      '<div><b>'+(historical?'Propuesta histórica recuperada sin modificar el estudio.':saved?(cached?'Propuesta IA guardada en el borrador.':
          'Propuesta IA recuperada del borrador guardado.'):'Propuesta IA pendiente de guardar.')+'</b>'+
        '<p>'+(historical?'No corresponde a una sugerencia aplicable al borrador actual; conserva la versión original.':
          saved?'Recuperable al volver a abrir este estudio en el mismo navegador.':
          'Pulsa «Guardar propuesta y borrador» para conservar la generación y la revisión.')+'</p></div>'+
    '</div>'+
    '<p id="tobeAiProgress" role="status" aria-live="polite" class="pg11-ai-message">'+
      esc(historical?'Propuesta anterior disponible para consulta. No se ha generado ni aprobado una nueva propuesta.':
        __auneaAiWorking.has(key)?feedback?.message||'Generación en curso…':
        (review?.review_mode==='RULES_ONLY'?
          'Comprobación por reglas completada · Revisión humana pendiente.':
          'Generación completada · Revisión automática '+(review?'recibida':'pendiente')+'.'))+'</p>'+
    (feedback?.type==='warn'?'<p class="pg11-ai-message pg11-ai-message-warn">'+esc(feedback.message)+'</p>':'')+
    '<div class="pg11-ai-metrics" aria-label="Resumen de revisión">'+
      '<div><strong>'+items.length+'</strong><span>Actividades generadas</span></div>'+
      '<div><strong>'+blockedIds.size+'</strong><span>Actividades bloqueadas</span></div>'+
      '<div><strong>'+issues.length+'</strong><span>Aspectos por revisar</span></div>'+
    '</div>'+
    (review?.review_mode==='RULES_ONLY'?'<p class="notice info"><b>Comprobación básica por reglas completada.</b> No se utilizó Ollama. Estos controles detectan inconsistencias explícitas, pero no certifican la viabilidad ni sustituyen la revisión humana.</p>':'')+
    (blocked?'<div class="pg11-ai-blocked"><b>No apta para aplicar.</b><p>La revisión encontró incoherencias. Puedes guardar y consultar la propuesta sin aprobarla.</p></div>':'')+
    (review?.summary?'<div class="pg11-ai-summary"><b>'+
      (review?.review_mode==='RULES_ONLY'?'Resultado de la comprobación':'Resultado de la revisión')+
      '</b><p>'+esc(review.summary)+'</p></div>':'')+
    '<div class="pg11-ai-section-title"><div><p class="pg11-ai-eyebrow">PROPUESTA DE DISEÑO</p>'+
      '<h3>Propuestas por actividad</h3></div><span>'+items.length+' actividades</span></div>'+
    '<div class="pg11-ai-step-list">'+cards+'</div>'+
    '<section class="pg11-ai-review-area"><h3>Revisión y trazabilidad</h3>'+
      internalAiReviewPanel(review)+internalAiPilotTracePanel(traces)+'</section>'+
    '<footer class="pg11-ai-footer">'+
      '<p>La IA no aprueba ni publica resultados. Los registros HTTP y prompts técnicos son temporales.</p>'+
      '<div class="pg11-ai-actions">'+
        (historical?'':'<button type="button" class="btn btn-primary" id="saveTobeAiPilot">Guardar propuesta y borrador</button>')+
        // No global application: each step requires an explicit consultant decision in its inspector.
        ''+
        '<button type="button" class="btn btn-outline" id="regenerateTobeAiPilot">'+
          (historical?'Generar para el borrador actual':'Generar propuestas nuevas')+'</button>'+
      '</div>'+
      (draft.applied?'<p class="pg11-ai-muted">Se aplicó a campos vacíos del TO-BE; revisa y guarda los cambios.</p>':'')+
    '</footer></section>';
}
// [AUNEA-FE-PG11-AI-UX-201] END
const __originalTobePagePilot=tobePage;
tobePage=function(){
  const html=__originalTobePagePilot(),e=currentEng();
  if((typeof isClientDisplay==='function'&&isClientDisplay())||!e||!tobeEditable(latestTobe(e)))return html;
  // Bulk activity analysis remains available in the contextual step-review section.
  const withAction=html;
  return withAction.includes('<div id="tobeAiMount"></div>')
    ?withAction.replace('<div id="tobeAiMount"></div>',internalAiPilotPanel(e))
    :withAction.replace('<div class="card card-pad section">',internalAiPilotPanel(e)+'<div class="card card-pad section">');
};
// [AUNEA-FE-TOBE-SEGMENTED-197] START — true progress by confirmed activity.
async function generateTobeBySteps(e,key,snap,availability,fresh=false,selectedStepId=null){
  const draft=latestTobe(e);
  const stepIds=draft.items.map(x=>String(x.sourceStepId));
  if(!stepIds.length||stepIds.some(x=>!x)||new Set(stepIds).size!==stepIds.length)
    throw Error('El borrador no tiene actividades de origen únicas y válidas.');
  const selected=selectedStepId===null?null:String(selectedStepId);
  if(selected&&!stepIds.includes(selected))
    throw Error('La actividad seleccionada no pertenece al AS-IS confirmado vigente.');
  const previous=fresh?null:(__auneaAiCompletedSteps.get(key)||internalAiPendingSteps(currentEng(),key));
  const completed=previous?.stepSignature===stepIds.join('|')?previous:
    {stepSignature:stepIds.join('|'),items:new Map(),traces:new Map(),inputHash:null};
  // Reuse verified current-version suggestions for all unrelated steps.
  // A selected regeneration never silently changes another activity.
  if(selected){
    const existing=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null;
    if(existing?.items?.length===stepIds.length&&
       (!completed.inputHash||completed.inputHash===existing.input_hash)){
      completed.inputHash=existing.input_hash;
      for(const it of existing.items){
        const sid=String(it.source_step_id);
        if(sid!==selected&&!completed.items.has(sid))completed.items.set(sid,it);
      }
    }
    completed.items.delete(selected);
  }
  __auneaAiCompletedSteps.set(key,completed);
  if(completed.items.size){
    internalAiPilotFeedback(e,'Reutilizando '+completed.items.size+' actividades verificadas de esta sesión. '+
      'Para volver a generar todo, usa «Generar propuestas nuevas».');
  }
  const request={
    engagement:buildBackendPayload(e),
    diagnostic:currentDiagnosticOutput(e),
    confirmed_as_is:e.confirmedAsIs===true,
    snapshot_version:snap.version
  };
  const failures=[];
  for(const stepId of (selected?[selected]:stepIds)){
    internalAiAssertActive(key);
    if(completed.items.has(stepId))continue;
    if(internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||
       !tobeEditable(latestTobe(e)))throw Error('El estudio cambió; no se continuará esta ejecución.');
    const done=completed.items.size;
    if(__auneaAiRuns.get(key))__auneaAiRuns.get(key).detail=
      'Actividad '+(done+1)+' de '+stepIds.length+' · '+internalAiActivityLabel(e,stepId);
    internalAiUpdateProgress(e);
    internalAiPilotFeedback(e,'Actividad '+(done+1)+' de '+stepIds.length+
      ' · '+done+' completadas y verificadas. Analizando '+
      internalAiActivityLabel(e,stepId)+' con Ollama local…');
    const response=await internalAiFetch(key,state.backendUrl+'/v1/internal-ai/tobe-step',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({request,source_step_id:stepId})
    });
    if(!response.ok){
      const error=await response.json().catch(()=>null);
      const detail=typeof error?.detail==='string'?error.detail:(error?.detail?.message||'Comprueba el registro del backend.');
      if(error?.detail?.context_trace?.source_step_id===stepId)completed.traces.set(stepId,error.detail.context_trace);
      failures.push('Actividad '+internalAiActivityLabel(e,stepId)+
        ' (HTTP '+response.status+'): '+detail);
      internalAiPilotRefreshPanel(e);
      continue;
    }
    const result=await response.json();
    internalAiAssertActive(key);
    if(internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||
       !tobeEditable(latestTobe(e)))throw Error('El estudio cambió durante la generación.');
    if(result?.status!=='DRAFT'||result.engagement_id!==e.id||
       result.snapshot_version!==snap.version||
       result.item?.source_step_id!==stepId||
       !Array.isArray(result.item?.source_refs)||!result.item.source_refs.includes(stepId)||
       (completed.inputHash&&completed.inputHash!==result.input_hash))
       throw Error('El backend devolvió una actividad o versión incoherente: '+stepId);
    if(result.context_trace){
      if(result.context_trace.source_step_id!==stepId)
        throw Error('La trazabilidad de la IA no corresponde a la actividad '+stepId);
      if(!completed.traces)completed.traces=new Map();
      completed.traces.set(stepId,result.context_trace);
    }
    completed.inputHash=result.input_hash;
    completed.items.set(stepId,result.item);
    // Checkpoint every validated activity before attempting the next costly request.
    // A failed save is a hard stop: never tell the consultant data was preserved.
    if(!internalAiSaveCheckpoint(e,key,completed,availability.model))
      throw Error('La actividad '+stepId+' se verificó, pero su guardado local falló. No se continuará hasta conservarla.');
    internalAiPilotRefreshPanel(currentEng());
    internalAiUpdateProgress(currentEng());
    internalAiPilotFeedback(e,'Actividad '+completed.items.size+' de '+stepIds.length+
      ' completadas y verificadas. Preparando siguiente actividad…');
  }
  internalAiAssertActive(key);
  if(failures.length)throw Error(failures.join(' · ')+' · '+completed.items.size+' de '+stepIds.length+' completadas. Puedes reintentar.');
  if(selected&&completed.items.size<stepIds.length){
    internalAiPilotFeedback(e,'Propuesta de '+internalAiActivityLabel(e,selected)+
      ' verificada y guardada como checkpoint. Hay '+completed.items.size+' de '+stepIds.length+
      ' actividades; se necesita la revisión global antes de ofrecer aplicaciones.','info');
    internalAiPilotRefreshPanel(currentEng());
    toast('Propuesta IA de esta actividad guardada. Queda pendiente la coherencia global.');
    return {status:'PARTIAL',completed:completed.items.size,total:stepIds.length};
  }
  if(completed.items.size!==stepIds.length)throw Error('Faltan actividades; propuesta incompleta.');
  // The first global check is deterministic too: never trigger a long Ollama
  // consolidation after generating otherwise valid individual proposals.
  return internalAiConsolidateVerified(e,key,snap,{model:'AUNEA — comprobación por reglas'},completed,request,'basic');
}
// [AUNEA-FE-TOBE-SEGMENTED-197] END
// [AUNEA-FE-PG11-REVIEW-ONLY-216] START — dedicated review handler and shared consolidation.
async function internalAiConsolidateVerified(e,key,snap,availability,completed,request,mode='ollama'){
  const stepIds=(latestTobe(e)?.items||[]).map(it=>String(it.sourceStepId));
  if(!stepIds.length||completed?.stepSignature!==stepIds.join('|')||
     completed.items.size!==stepIds.length||stepIds.some(id=>!completed.items.has(id)))
    throw Error('No están completas las actividades verificadas del borrador vigente. No se ha lanzado una revisión.');
  // Review cross-step coherence only after every source step is validated.
  // If review fails, retain every completed step; retry only the review call.
  let items=stepIds.map(id=>completed.items.get(id));
  internalAiPilotFeedback(e,mode==='basic'?
    'Comprobando por reglas las '+stepIds.length+' propuestas guardadas, sin usar Ollama…':
    'Generación individual completada: '+stepIds.length+
    ' de '+stepIds.length+' actividades verificadas. Consolidando coherencia global…');
  const reviewed=await internalAiFetch(key,state.backendUrl+(mode==='basic'?'/v1/internal-ai/tobe-review-basic':'/v1/internal-ai/tobe-review'),{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({request,items,correction_attempted_ids:[...completed.traces].filter(([,t])=>t.correction_attempted).map(([id])=>id)})
  });
  if(!reviewed.ok){
    const err=await reviewed.json().catch(()=>null);
    throw Error('La revisión global no se completó (HTTP '+reviewed.status+'): '+
      (typeof err?.detail==='string'?err.detail:'Revisa el backend.')+
      ' · '+completed.items.size+' actividades conservadas.');
  }
  const review=await reviewed.json();
  internalAiAssertActive(key);
  if(!review||review.protocol_revision!==__auneaPg11ReviewProtocol||
     !['CHECKED','CHECKED_WITH_NOTES'].includes(review.status)||
     review.requires_human_review!==true||!Array.isArray(review.issues)||
     internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||
     !tobeEditable(latestTobe(e)))
    throw Error('La consolidación no corresponde al estudio vigente.');
  if(review.corrected_items){
    if(review.corrected_items.length!==items.length||review.corrected_items.some((it,i)=>it.source_step_id!==items[i].source_step_id))throw Error('Corrección fuera del conjunto de actividades.');
    items=review.corrected_items;
    for(const [sid,trace] of Object.entries(review.correction_traces||{})){
      const initial=completed.traces.get(sid);
      completed.traces.set(sid,{...trace,attempts:[...(initial?.attempts||[]),...(trace.attempts||[])]});
    }
  }
  const data={status:'DRAFT',engagement_id:e.id,snapshot_version:snap.version,
    input_hash:completed.inputHash,model:availability.model,review,items,
    context_traces:Object.fromEntries(completed.traces||new Map())};
  delete review.corrected_items;delete review.correction_traces;
  __auneaAiPreview.set(key,data);
  // The full proposal remains a DRAFT; persist it without applying a single
  // recommendation. Its verified checkpoint stays on disk if this save fails.
  const live=currentEng();
  const saved=!!live&&saveTobeFromDom(live)&&saveState('Guardar propuesta IA revisada sin aprobar');
  if(saved&&internalAiSavedInBrowser(currentEng(),data)){
    __auneaAiCompletedSteps.delete(key);
    __auneaAiFeedback.delete(key);
    internalAiPilotRefreshPanel(currentEng());
    toast('Propuesta IA revisada y guardada como borrador. Requiere decisión humana.');
  }else{
    internalAiPilotFeedback(live||e,'La revisión finalizó pero la propuesta no se pudo guardar. Conserva esta pestaña y pulsa Guardar propuesta y borrador.','warn');
    internalAiPilotRefreshPanel(live||e);
  }
}
// The explicit retry invokes this shared reviewer without ever touching /tobe-step.
// SOURCE: PG11 CANONICAL; DEC-050/052/055; PG11 REVIEW plan point B.
// INPUT: versioned checkpoint, confirmed snapshot, official diagnostic.
// SIDE EFFECTS: one provider status GET and one global reviewer POST; DRAFT-only save.
async function retryTobeAiReviewOnly(){
  const e=currentEng(),key=e?internalAiPilotKey(e):null,p=e?latestTobe(e):null;
  if(!e||!key||!tobeEditable(p)){
    toast('No hay un borrador TO-BE vigente para revisar.');
    return;
  }
  const completed=internalAiPendingSteps(e,key);
  const ids=p.items.map(it=>String(it.sourceStepId));
  if(!completed||completed.stepSignature!==ids.join('|')||
     completed.items.size!==ids.length||!ids.every(id=>completed.items.has(id))){
    internalAiPilotFeedback(e,'No están verificadas todas las actividades. No se ha iniciado la revisión global.','warn');
    return;
  }
  if(!internalAiCheckpointSaved(e,key,completed)){
    internalAiPilotFeedback(e,'Las actividades no tienen un guardado confirmado en este estudio. Guarda las actividades verificadas antes de reintentar.','warn');
    return;
  }
  if(__auneaAiWorking.has(key)){
    internalAiPilotFeedback(e,'Ya hay una operación de IA en curso. No se ha iniciado otra revisión; las actividades siguen guardadas.','info');
    return;
  }
  internalAiStart(key,'steps');
  const button=document.getElementById('retryTobeAiReview');
  if(button){button.disabled=true;button.textContent='Comprobando coherencia básica…'}
  internalAiPilotFeedback(e,'Comprobando '+ids.length+' propuestas con reglas de AUNEA. No se utiliza Ollama ni se modifican los borradores.');
  try{
    if(!state.backendOnline&&!(await checkBackend()))throw Error('Backend no conectado; las propuestas siguen guardadas.');
    // This is deterministic: it does not need an Ollama health probe or inference.
    const availability={model:'AUNEA — comprobación por reglas'};
    const live=currentEng();
    if(!live||internalAiPilotKey(live)!==key||!tobeEditable(latestTobe(live)))
      throw Error('El estudio o su versión cambiaron antes de la revisión.');
    const request={
      engagement:buildBackendPayload(live),diagnostic:currentDiagnosticOutput(live),
      confirmed_as_is:live.confirmedAsIs===true,
      snapshot_version:confirmedSnapshot(live).version
    };
    // Strictly call the global reviewer. The per-activity /tobe-step endpoint
    // is intentionally absent from this function.
    await internalAiConsolidateVerified(live,key,confirmedSnapshot(live),
      availability,completed,request,'basic');
  }catch(error){
    const message=String(error?.message||error||'Fallo desconocido de la comprobación básica.');
    internalAiPilotFeedback(currentEng()||e,internalAiCancelled(key,error)?
      'Comprobación cancelada. Se conservan los resultados guardados.':
      'La comprobación básica no se completó: '+message+
      ' Las '+ids.length+' actividades verificadas permanecen guardadas.','warn');
    if(currentEng()?.id===e.id)internalAiPilotRefreshPanel(currentEng());
    console.error('PG11: reintento de revisión global no completado',error);
  }finally{
    internalAiStop(key);
    const currentButton=document.getElementById('retryTobeAiReview');
    if(currentButton){currentButton.disabled=false;currentButton.textContent='Comprobar coherencia básica (sin Ollama)'}
    // The result panel was rendered before removing the working flag; redraw
    // only this read-only panel, otherwise it falsely says "Generación en curso".
    if(currentEng()?.id===e.id&&internalAiPilotKey(currentEng())===key)
      internalAiPilotRefreshPanel(currentEng());
  }
}
// [AUNEA-FE-PG11-REVIEW-ONLY-216] END


async function generateTobeAiPilot(e,fresh=false,selectedStepId=null){
  const key=internalAiPilotKey(e);
  if((typeof isClientDisplay==='function'&&isClientDisplay())||!key||!tobeEditable(latestTobe(e)))return toast('El estudio no tiene un borrador vigente.');
  if(__auneaAiWorking.has(key)){
    internalAiPilotFeedback(e,'Ya hay una operación de IA en curso. No se iniciará una segunda hasta que termine.','info');
    return;
  }
  if(selectedStepId){
    const current=latestTobe(e);
    if(!current?.items?.some(it=>String(it.sourceStepId)===String(selectedStepId)))
      return toast('La actividad no pertenece al borrador TO-BE vigente.');
    if(!saveTobeFromDom(e)||!saveState('Guardar actividad antes de regenerar IA'))
      return toast('No se han guardado las ediciones; no se inició la generación.');
  }
  for(const cache of [__auneaAiPreview,__auneaAiFeedback,__auneaAiCompletedSteps])
    for(const oldKey of cache.keys())if(oldKey!==key)cache.delete(oldKey);
  internalAiStart(key,'steps');
  const button=document.getElementById('generateTobeAiPilot');
  if(button){button.disabled=true;button.textContent='Comprobando IA…'}
  // Keep the global audit closed by default; progress is reported above
  // the editor and no consultant edits are lost by expanding it.
  const workspace=document.getElementById('tobeAiWorkspace');
  internalAiPilotFeedback(e,'Comprobando disponibilidad del proveedor IA…');
  try{
    if(!state.backendOnline&&!(await checkBackend()))throw Error('Backend no conectado.');
    const check=await internalAiFetch(key,state.backendUrl+'/v1/internal-ai/status',{cache:'no-store'});
    if(!check.ok)throw Error('No se pudo consultar el proveedor IA.');
    const availability=await check.json();
    if(availability.status!=='AVAILABLE'){
      const reason=String(availability.reason||'Servicio IA no configurado o sin autorización para tratar datos.');
      const hint=/Ollama|127\.0\.0\.1:11434/i.test(reason)
        ?' En Windows comprueba que Ollama esté abierto y ejecuta: ollama list; después comprueba http://127.0.0.1:11434/api/tags. AUNEA Backend (8010) y Ollama (11434) deben ejecutarse en el mismo equipo. No es necesario volver a generar ni borrar lo ya guardado.'
        :' No se han cambiado las propuestas anteriores.';
      throw Error(reason+hint);
    }
    if(availability.provider==='ollama'&&
       availability.pg11_review_protocol!==__auneaPg11ReviewProtocol)
      throw Error('Versiones incompatibles de PG11: el backend no tiene el revisor actualizado ('+
        __auneaPg11ReviewProtocol+'). Actualiza la rama y reinicia Uvicorn; después recarga el navegador.');
    if(button)button.textContent=availability.provider==='ollama'?'Analizando con IA local…':'Analizando con IA…';
    internalAiPilotFeedback(e,'Generando propuesta con '+(availability.provider==='ollama'?'Ollama local':'el proveedor autorizado')+'… No cierres el estudio durante el análisis.');
    const snap=confirmedSnapshot(e);
    if(availability.provider==='ollama'){
      if(fresh){
        // Protect the previous versioned suggestion and manual edits before a new expensive run.
        if(!saveTobeFromDom(e)||!saveState('Conservar propuesta antes de regenerar'))
          throw Error('No se pudo conservar el borrador anterior; no se inició otra generación.');
        // Explicit user action; only transient cached steps are cleared.
        // Keep the last successful preview until a replacement completes.
        __auneaAiCompletedSteps.delete(key);
      }
      await generateTobeBySteps(currentEng(),key,confirmedSnapshot(currentEng()),availability,fresh,selectedStepId);
      return;
    }
    if(selectedStepId)throw Error('La generación individual requiere el proveedor local Ollama habilitado. No se han modificado las propuestas guardadas.');
    if(!AiAgentService.available()){
      AiAgentService.register({name:'AUNEA Backend — proveedor gobernado',
        async propose({kind,engagement}){
          if(kind!=='TOBE_DRAFT')throw Error('Capacidad IA no habilitada.');
          const response=await internalAiFetch(key,state.backendUrl+'/v1/internal-ai/tobe-draft',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({engagement:buildBackendPayload(engagement),
              diagnostic:currentDiagnosticOutput(engagement),
              confirmed_as_is:engagement.confirmedAsIs===true,
              snapshot_version:confirmedSnapshot(engagement).version})});
          if(!response.ok){
            const errorPayload=await response.json().catch(()=>null);
            const detail=typeof errorPayload?.detail==='string'?errorPayload.detail:'Comprueba el registro del backend.';
            throw Error('La propuesta IA no se generó (HTTP '+response.status+'): '+detail);
          }
          return response.json();
        }});
    }
    const result=await AiAgentService.propose('TOBE_DRAFT',e);
    internalAiAssertActive(key);
    const data=result.proposal;
    if(internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||!tobeEditable(latestTobe(e)))
      throw Error('El estudio cambió durante la generación: propuesta descartada.');
    const p=latestTobe(e),stepIds=new Set(p.items.map(it=>String(it.sourceStepId)));
    if(!data||data.status!=='DRAFT'||data.engagement_id!==e.id||data.snapshot_version!==snap.version
      ||!Array.isArray(data.items)||data.items.length!==p.items.length
      ||data.items.some(it=>!stepIds.has(String(it.source_step_id))))
      throw Error('La respuesta no es coherente con el TO-BE vigente.');
    __auneaAiPreview.set(key,data);
    __auneaAiFeedback.delete(key);
    // Replace only the feedback panel: never discard unsaved consultant edits in TO-BE cards.
    internalAiPilotRefreshPanel(e);
    toast('Propuesta recibida como borrador pendiente de revisión.');
  }catch(error){
    if(AiAgentService.available())AiAgentService.clear();
    const message=String(error?.message||error||'Error desconocido al generar la propuesta.');
    internalAiPilotFeedback(currentEng()||e,internalAiCancelled(key,error)?
      'Análisis cancelado. Se conservan las actividades verificadas.':
      'La propuesta no está completa: '+message,'warn');
    // Refresh the actual consultant-visible cards as well as the technical audit.
    if(currentEng()?.id===e.id)internalAiPilotRefreshPanel(currentEng());
    console.error('PG11: solicitud IA no completada',error);
  }finally{
    internalAiStop(key);
    const currentButton=document.getElementById('generateTobeAiPilot');
    if(currentButton){currentButton.disabled=false;currentButton.textContent='Analizar actividades con IA'}
    if(currentEng()?.id===e.id&&internalAiPilotKey(currentEng())===key)
      internalAiPilotRefreshPanel(currentEng());
    internalAiSyncButtons(currentEng());
  }
}
function applyTobeAiPilot(e){
  // Backward-compatible entrypoint; it can never apply all steps in bulk.
  const item=typeof tobeSelectedItem==='function'?tobeSelectedItem(e,latestTobe(e)):null;
  if(!item||item.isAddition)
    return toast('Selecciona una actividad del AS-IS para revisar su recomendación.');
  return tobeApplyAiOnlyStep(e,String(item.sourceStepId));
}
// Bind once through event delegation, as in PG11 draft creation. A postBind wrapper
// can be replaced by other modules and must not be the only way the button works.
const __originalRegisterInternalAi=registerInternalWorkPages;
registerInternalWorkPages=function(){
  __originalRegisterInternalAi();
  if(document.__auneaAiPilotDelegatedBound)return;
  document.__auneaAiPilotDelegatedBound=true;
  document.addEventListener('click',event=>{
    const cancel=event.target?.closest?.('[data-aunea-cancel-ai]');
    if(cancel){event.preventDefault();internalAiCancel(currentEng());return;}
    const global=event.target?.closest?.('#analyzeTobeGlobal');
    const retryGlobal=event.target?.closest?.('#retryTobeGlobal');
    if(global||retryGlobal){
      event.preventDefault();
      if(!(global||retryGlobal).disabled){
        const draft=latestTobe(currentEng());
        const saved=draft?.aiGlobal?.result;
        if(global&&saved&&typeof window!=='undefined'&&
           typeof window.confirm==='function'&&
           !window.confirm('Se sustituirá el análisis global guardado por uno nuevo. '+
             'Las decisiones humanas y los campos TO-BE no se modificarán. ¿Continuar?'))return;
        void generateTobeGlobal(currentEng(),{resume:!!retryGlobal});
      }
      return;
    }
    const audit=event.target?.closest?.('[data-ai-audit-step]');
    if(audit){
      event.preventDefault();
      const host=audit.parentElement?.querySelector('[data-ai-audit-slot]');
      if(!host)return;
      if(host.innerHTML){host.innerHTML='';audit.textContent='Examinar entrada y salida';return}
      const e=currentEng(),key=internalAiPilotKey(e);
      const partial=__auneaAiCompletedSteps.get(key);
      const stored=partial?.traces?.get(audit.getAttribute('data-ai-audit-step'))||
        __auneaAiPreview.get(key)?.context_traces?.[audit.getAttribute('data-ai-audit-step')];
      if(!stored)return toast('Auditoría no disponible para esta ejecución.');
      const index=Number(audit.getAttribute('data-ai-audit-attempt'));
      host.innerHTML=internalAiAuditContext(stored,Number.isInteger(index)?index:0);
      audit.textContent='Ocultar detalle técnico';
      return;
    }
    const reviewAudit=event.target?.closest?.('[data-ai-review-audit]');
    if(reviewAudit){
      event.preventDefault();
      const host=reviewAudit.parentElement?.querySelector('[data-ai-review-slot]');
      if(!host)return;
      if(host.innerHTML){host.innerHTML='';reviewAudit.textContent='Examinar auditoría del revisor';return}
      const e=currentEng(),key=internalAiPilotKey(e);
      const review=__auneaAiPreview.get(key)?.review;
      if(!review)return toast('Revisión no disponible.');
      host.innerHTML=internalAiAuditJson(review.audit||[],'Solicitudes y respuestas del revisor (redactadas)')+
        (review.initial_review?internalAiAuditJson(review.initial_review,'Revisión previa a corrección'):'');
      reviewAudit.textContent='Ocultar auditoría del revisor';
      return;
    }
    const copy=event.target?.closest?.('[data-ai-copy]');
    if(copy){event.preventDefault();const text=copy.parentElement?.querySelector('pre')?.textContent;
      if(text&&typeof navigator!=='undefined')void navigator.clipboard.writeText(text).then(()=>toast('JSON copiado.')).catch(()=>toast('No se pudo copiar; selecciona el JSON.'));return;}

    const saveAi=event.target?.closest?.('#saveTobeAiPilot');
    if(saveAi){
      event.preventDefault();
      const e=currentEng();
      if(e&&saveTobeFromDom(e)&&saveState('Guardar borrador TO-BE')){
        internalAiPilotRefreshPanel(currentEng());
      }else toast('No se pudo guardar el borrador. Conserva esta pestaña abierta.');
      return;
    }

    const savePending=event.target?.closest?.('#saveTobeAiPending');
    if(savePending){
      event.preventDefault();
      const e=currentEng(),key=internalAiPilotKey(e),partial=internalAiPendingSteps(e,key);
      if(e&&partial&&internalAiSaveCheckpoint(e,key,partial,partial.model)){
        internalAiPilotRefreshPanel(currentEng());
        toast('Actividades IA verificadas guardadas; revisión global pendiente.');
      }else toast('No se ha podido verificar el guardado del progreso IA. Conserva esta pestaña.');
      return;
    }
    const retryReview=event.target?.closest?.('#retryTobeAiReview');
    if(retryReview){
      event.preventDefault();
      if(!retryReview.disabled)void retryTobeAiReviewOnly();
      return;
    }
    const complete=event.target?.closest?.('[data-tobe-generate-all-remaining]');
    if(complete){
      event.preventDefault();
      if(!complete.disabled)void generateTobeAiPilot(currentEng());
      return;
    }
    const selected=event.target?.closest?.('[data-tobe-generate-selected]');
    if(selected){
      event.preventDefault();
      if(!selected.disabled)void generateTobeAiPilot(currentEng(),false,
        selected.getAttribute('data-tobe-generate-selected'));
      return;
    }
    const generate=event.target?.closest?.('#generateTobeAiPilot');
    if(generate){
      event.preventDefault();
      if(!generate.disabled)void generateTobeAiPilot(currentEng());
      return;
    }
    const fresh=event.target?.closest?.('#regenerateTobeAiPilot');
    if(fresh){
      event.preventDefault();
      if(!fresh.disabled)void generateTobeAiPilot(currentEng(),true);
      return;
    }
    const apply=event.target?.closest?.('#applyTobeAiPilot');
    if(apply){event.preventDefault();applyTobeAiPilot(currentEng())}
  },true);
};
// [AUNEA-FE-INTERNAL-AI-PILOT-193] END
