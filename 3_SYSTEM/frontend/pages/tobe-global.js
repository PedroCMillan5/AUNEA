// [AUNEA-FE-PG11-GLOBAL-OVERVIEW-284] START — read-only, version-bound global IA.
// SOURCE: Simulator CANONICAL v1.14 PG11; DEC-050/052/055; existing AUNEA System controls.
// The global source and per-step view share ONE version/snapshot/diagnosis gate.
// All links below are derived from the confirmed AS-IS, not from live edits.
function tobeGlobalStored(e,p){
  const entry=p?.aiGlobal,diag=typeof currentDiagnosticOutput==='function'?
    currentDiagnosticOutput(e):null;
  if(!e||!p||!entry||entry.tobeVersion!==p.version||
     entry.sourceSnapshotVersion!==p.sourceSnapshotVersion||
     entry.diagnosticInputHash!==diag?.input_snapshot_hash||
     entry.result?.status!=='DRAFT'||entry.result.engagement_id!==e.id||
     entry.result.snapshot_version!==p.sourceSnapshotVersion)return null;
  const preflight=typeof internalAiGlobalWorking==='function'&&
    internalAiGlobalWorking(e)&&
    typeof internalAiGlobalMessage==='function'&&
    internalAiGlobalMessage(e)?.phase==='PREFLIGHT';
  return preflight?null:entry.result;
}
function tobeGlobalSourceIdsForStep(e,p,sourceId){
  const id=String(sourceId||''),ids=new Set(id?[id]:[]),
    snapshot=typeof tobeProposalSnapshot==='function'?tobeProposalSnapshot(e,p):null;
  // Friction and risk relations come from the confirmed snapshot only.
  for(const friction of snapshot?.frictions||[]){
    if(friction?.status==='SUPERSEDED')continue;
    const affected=friction.affected_steps||friction.step_ids||[];
    if(Array.isArray(affected)&&affected.map(String).includes(id)&&friction.id)
      ids.add(String(friction.id));
  }
  for(const risk of snapshot?.risks||[]){
    if(risk?.status==='SUPERSEDED')continue;
    const affected=risk.step_ids||[];
    if(Array.isArray(affected)&&affected.map(String).includes(id)&&(risk.id||risk.risk_id))
      ids.add(String(risk.id||risk.risk_id));
  }
  return ids;
}
function tobeGlobalLinksForStep(e,p,item){
  if(!item||item.isAddition)return [];
  const result=tobeGlobalStored(e,p),sources=tobeGlobalSourceIdsForStep(e,p,item.sourceStepId);
  return (result?.opportunities||[]).flatMap((recommendation,index)=>{
    const refs=[...(recommendation.source_refs||[]),
      ...(recommendation.related||[]).flatMap(x=>x.source_refs||[])];
    return refs.some(id=>sources.has(String(id)))?[{recommendation,index:index+1}]:[];
  });
}
function tobeGlobalLinkedStepHtml(e,p,item){
  const linked=tobeGlobalLinksForStep(e,p,item),result=tobeGlobalStored(e,p);
  if(!result||!linked.length)return '';
  const complete=result.complete!==false;
  const progress=result.progress||{},
    done=Number.isInteger(progress.completed)?progress.completed:
      Array.isArray(progress.focus_done)?progress.focus_done.length:null,
    total=Number.isInteger(progress.total)?progress.total:null,
    scope=done!==null&&total!==null?' ('+done+' de '+total+' fuentes verificadas)':'';
  return '<details class="tobe-subdetails tobe-global-step-context">'+
    '<summary>Recomendaciones del análisis global vinculadas · '+linked.length+'</summary>'+
    (!complete?'<p class="notice warn">El análisis global por fuentes de la sección 02 está incompleto'+scope+'. La cobertura de actividades analizadas por IA en la sección 03 es independiente.</p>':'')+
    '<ul class="tobe-source-list">'+linked.map(({recommendation:r,index})=>
      '<li><b>'+index+' · '+esc(r.objective)+'</b>'+
      '<p>'+esc(r.how)+'</p>'+
      (r.review?.status==='INCOMPATIBLE'?
        '<p><b>Incompatibilidad detectada:</b> '+esc(r.review.reason||'Pendiente de revisión.')+'</p>':
        '<p><b>Viabilidad pendiente:</b> '+esc(r.review?.reason||'Requiere comprobación.')+'</p>')+
      (r.alternative?'<p><b>Alternativa propuesta:</b> '+esc(r.alternative.how)+'</p>':'')+
      '<p><b>Referencias de origen:</b> '+
        esc((()=>{
          const refs=[...(r.source_refs||[]),...(r.related||[]).flatMap(x=>x.source_refs||[])]
            .filter((x,i,a)=>a.indexOf(x)===i);
          return typeof tobeHumanReadableRefs==='function'?tobeHumanReadableRefs(e,refs):
            (typeof internalAiReadableRefs==='function'?internalAiReadableRefs(e,refs):refs.join(' · '));
        })())+'</p></li>').join('')+
    '</ul><p class="tobe-muted">Contexto de solo lectura. Estas propuestas no sustituyen '+
    'el análisis individual, ni aplican cambios o decisiones al TO-BE.</p></details>';
}
// Read-only PG11 presentation of client conditions: labels come from the
// CANONICAL diagnostic option sets (or from source-backed backend metadata).
// Business codes/DF ids stay in stored evidence, never become screen labels.
function tobeGlobalHumanConditions(snapshot,review){
  const canonical=typeof schema!=='undefined'?schema:null;
  const answers=snapshot?.answers||{};
  const conditions=Array.isArray(review?.declared_conditions)?
    review.declared_conditions:[];
  const ids=['DF010','DF073','DF075','DF087','DF088','DF089','DF090','DF091','DF092'];
  const visible=[];
  for(const id of ids){
    const field=(canonical?.fields||[]).find(x=>x.Field_ID===id);
    const set=canonical?.option_sets?.[field?.Option_Set_ID];
    const allowed=Array.isArray(set?.options)?set.options:[];
    const raw=answers[id];
    const vals=Array.isArray(raw)?raw:
      (raw===undefined||raw===null||raw===''?[]:[raw]);
    const declarations=conditions.filter(x=>x?.source===id);
    const values=vals.length?vals.map(value=>{
      const code=String(value??'').trim();
      if(!code)return '';
      const option=allowed.find(x=>String(x.value)===code);
      const fromBackend=declarations.find(x=>String(x.value)===code)?.meaning;
      const readable={
        COMPLIANCE:'Cumplimiento legal y normativo',
        OWNERSHIP:'Propiedad y responsabilidad de los datos',
        PLATFORM:'Herramientas y plataformas',
        RBAC:'Acceso según permisos de cada usuario',
        AUDIT_LOG:'Registro de auditoría de las acciones',
        CRM_NATIVE:'Funciones existentes del CRM o ERP',
        FINANCIAL:'Información financiera',
        CONFIDENTIAL:'Información comercial confidencial',
        UNKNOWN:'No especificado',
      };
      // Presentation only: canonical values, meanings and provenance remain intact.
      return String(readable[code]||option?.label||fromBackend||
        (/^[A-Z][A-Z0-9_]{2,}$/.test(code)?
          'Condición registrada pendiente de aclaración':code));
    }).filter(Boolean):
      declarations.map(x=>String(x.meaning||'').trim()).filter(Boolean);
    if(!values.length)continue;
    visible.push({label:String(field?.Pregunta_o_etiqueta_ES||'Condición declarada'),
      values:[...new Set(values)]});
  }
  return visible;
}
function tobeGlobalReadableChecks(rows,property){
  return [...new Set((Array.isArray(rows)?rows:[])
    .map(x=>String(x?.[property]||'').trim()).filter(Boolean))];
}
// Section 02 renders implementation questions per recommendation; repeated
// checks are shown only once for the thematic group. All original evidence,
// option codes, rule traces and IA text remain saved on aiGlobal.result.
function tobeGlobalImplementationQuestions(item){
  return [...new Set([
    ...(item?.review?.verifications||[]).map(x=>String(x?.question||'').trim()),
    ...(item?.review?.operational_checks||[]).map(x=>String(x?.question||'').trim())
  ].filter(Boolean))];
}
// Shared read-only intersection: keep the original question order and only
// display a question once when every reviewed opportunity contains it.
function tobeGlobalCommonQuestions(items,omitted=[]){
  const sets=items.map(tobeGlobalImplementationQuestions);
  const skip=new Set(omitted);
  return sets.length>1?sets[0].filter(q=>!skip.has(q)&&sets.slice(1).every(values=>values.includes(q))):[];
}
function tobeGlobalSharedQuestions(group,globallyShared=[]){
  return tobeGlobalCommonQuestions((group?.entries||[]).map(({item})=>item),globallyShared);
}
function tobeGlobalSpecificQuestions(group,item,globallyShared=[]){
  const shared=new Set([...tobeGlobalSharedQuestions(group,globallyShared),...globallyShared]);
  return tobeGlobalImplementationQuestions(item).filter(q=>!shared.has(q));
}
// PG11 section 02: separate business objective, option, evidence and conditions.
// Identical questions/alerts shared by all sources are rendered only once.
// These helpers are projections: they never edit the confirmed snapshot or IA output.
function tobeGlobalUniversalQuestions(opportunities){
  return tobeGlobalCommonQuestions(opportunities||[]);
}
function tobeGlobalGroupWarnings(group){
  return [...new Set((group?.entries||[]).flatMap(entry=>entry.issues||[])
    .map(x=>String(x||'').trim()).filter(Boolean))];
}
function tobeGlobalOptionWarnings(group,entry){
  const repeated=new Set((group?.entries||[]).length>1?
    tobeGlobalGroupWarnings(group).filter(q=>group.entries.every(e=>(e.issues||[]).includes(q))):[]);
  return (entry?.issues||[]).filter(q=>!repeated.has(q));
}
function tobeGlobalReadableProposal(item,steps){
  const original=String(item?.how||'');
  const linked=Array.isArray(steps)?steps:[];
  return original.replace(/\bP\d+\b/g,()=>{
    const name=linked.length===1?String(linked[0]?.sourceStepName||'').trim():'';
    return name?'la actividad «'+name+'»':'una actividad vinculada del proceso';
  });
}
// Mirror the PG11 backend's conservative, punctuation-neutral completeness
// heuristic. A full sentence may legitimately be returned without a full stop.
function tobeGlobalTextIsComplete(value){
  if(typeof value!=='string')return false;
  const text=value.trim();
  if(!text)return false;
  if(/[.!?…]["'”’)\]]*$/.test(text))return true;
  if(text.split(/\s+/).length<4||/[,;:/\\-]$/.test(text))return false;
  for(const [opening,closing] of [['(',')'],['[',']'],['«','»']]){
    if(text.split(opening).length!==text.split(closing).length)return false;
  }
  const words=text.match(/[\p{L}\p{N}]+/gu)||[];
  if(!words.length)return false;
  const last=words[words.length-1];
  const normalized=last.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dangling=new Set(
    ('a al ante bajo con contra de del desde durante en entre hacia hasta '+
     'mediante para por segun sin sobre tras y e o u que quien quienes cuyo '+
     'cuya cuyos cuyas el la los las un una unos unas lo le les se su sus '+
     'mi mis tu tus este esta estos estas ese esa esos esas otro otra otros '+
     'otras cada como cuando donde mientras aunque porque si no').split(' '));
  // Same bounded fragment check as the backend; not semantic certification.
  if(last===last.toLowerCase()&&['term','clie'].includes(normalized))return false;
  if(dangling.has(normalized)||last.length===1)return false;
  if(last.length===2&&last!==last.toUpperCase())return false;
  return true;
}
function tobeGlobalOverviewHtml(e,p){
  const working=typeof internalAiGlobalWorking==='function'&&internalAiGlobalWorking(e),
    feedback=typeof internalAiGlobalMessage==='function'?internalAiGlobalMessage(e):null,
    preflight=working&&feedback?.phase==='PREFLIGHT',
    result=tobeGlobalStored(e,p),
    historical=(Array.isArray(e?.tobeProposals)?[...e.tobeProposals].reverse():[])
      .find(draft=>draft!==p&&draft?.aiGlobal?.result)?.aiGlobal,
    previous=p?.aiGlobal||historical,
    notCurrent=!working&&!result&&!!previous,
    notCurrentReason=previous?.tobeVersion!==p?.version?
      'El análisis corresponde a otra versión del borrador TO-BE.':
      previous?.sourceSnapshotVersion!==p?.sourceSnapshotVersion?
        'El análisis corresponde a otra versión del AS-IS confirmado.':
      previous?.diagnosticInputHash!==(typeof currentDiagnosticOutput==='function'?
        currentDiagnosticOutput(e)?.input_snapshot_hash:undefined)?
        'El diagnóstico vigente no coincide con el utilizado para este análisis.':
        'El resultado guardado no cumple el contrato de vigencia del estudio.',
    complete=!!result&&Array.isArray(result.opportunities)&&
      [result.summary,...result.opportunities.flatMap(item=>[
        item.how,item.why,...(item.related||[]).flatMap(x=>[x.how,x.why]),
        ...(item.alternative?[item.alternative.how,item.alternative.why]:[])])]
        .every(value=>tobeGlobalTextIsComplete(value)),
    legacy=!!result&&!complete,
    opportunities=Array.isArray(result?.opportunities)?result.opportunities:[],
    progress=result?.progress||null,
    analysisFinished=result?.complete!==false,
    successful=progress?.focus_done?.length??progress?.completed??0,
    outstanding=Math.max(0,(progress?.total||0)-successful),
    retryable=!!result&&result.complete===false&&outstanding>0&&Array.isArray(progress?.focus_done),
    incompatible=opportunities.filter(x=>x.review?.status==='INCOMPATIBLE').length,
    alternatives=opportunities.filter(x=>!!x.alternative).length,
    pending=opportunities.filter(x=>x.review?.status!=='INCOMPATIBLE').length,
    variants=opportunities.reduce((n,x)=>n+(x.related||[]).length,0),
    qualityPlan=result&&typeof tobeGlobalQualityGroups==='function'?
      tobeGlobalQualityGroups(opportunities):null,
    thematicGroups=qualityPlan?.groups||
      opportunities.map((item,index)=>({title:item.objective,
        entries:[{item,index,issues:[]}],expectedOutcome:'Por verificar.',
        technicalChecks:[],evidenceRefs:item.source_refs||[]})),
    expandedGlobalGroups=typeof document!=='undefined'?new Set(
      [...document.querySelectorAll('#tobeGlobalAnalysis .tobe-global-opportunity-detail[open]')]
        .map(x=>x.getAttribute('data-global-group-key'))):new Set(),
    monitoringWasOpen=typeof document!=='undefined'?
      !!document.querySelector('#tobeGlobalAnalysis .tobe-global-monitoring')?.open:false;
  const source=tobeProposalSourceSteps(e,p),
    confirmed=typeof tobeProposalSnapshot==='function'?tobeProposalSnapshot(e,p):null,
    record=confirmed||{frictions:[],risks:[]};
  const refs=ids=>(ids||[]).map(id=>{
    const step=source.find(s=>String(s.id)===String(id)),
      friction=(record?.frictions||[]).find(f=>String(f.id)===String(id)&&f.status!=='SUPERSEDED'),
      risk=(record?.risks||[]).find(r=>String(r.id||r.risk_id)===String(id)&&r.status!=='SUPERSEDED');
    if(friction){
      const measures=[],freq=friction.frequency,
        effort=friction.active_time_loss,wait=friction.wait_time_loss,
        attribution=friction.time_attribution?.mode,
        timing=attribution==='INCLUDED'?'ya incluido en el paso':
          attribution==='BREAKDOWN'?'desglose del retrabajo':
          attribution==='ADDITIONAL'?'adicional atribuido':'atribución por comprobar';
      if(freq?.value!==undefined&&freq?.value!==null&&
         String(freq.mode||'').toLowerCase()==='percent')
        measures.push('Frecuencia '+freq.value+' %');
      if(effort?.value!==undefined&&effort?.value!==null&&Number(effort.value)>0)
        measures.push('Trabajo '+effort.value+' '+(effort.unit||'unidad sin especificar')+' ('+timing+')');
      if(wait?.value!==undefined&&wait?.value!==null&&Number(wait.value)>0)
        measures.push('Espera '+wait.value+' '+(wait.unit||'unidad sin especificar'));
      const provenance=typeof evidenceTypeBackend==='function'?
        evidenceTypeBackend(friction.evidence_type):({
          EV01:'MEASURED',EV02:'CLIENT_DECLARED',
          EV03:'AUNEA_ESTIMATE',EV04:'HYPOTHESIS',EV05:'SPECIFIC_BENCHMARK'
        })[friction.evidence_type]||friction.evidence_type;
      const provenanceLabel=({
        MEASURED:'Dato medido',CLIENT_DECLARED:'Declarado por el cliente',
        AUNEA_ESTIMATE:'Estimación de AUNEA',HYPOTHESIS:'Hipótesis',
        SPECIFIC_BENCHMARK:'Referencia comparable'
      })[provenance]||'Procedencia pendiente de confirmar';
      return 'Fricción: '+(friction.client_label||'Fricción confirmada sin descripción')+
        (measures.length?' · '+measures.join(' · '):'')+
        (friction.evidence_type?' · Origen: '+provenanceLabel:' · Origen: no especificado');
    }
    return step?'Paso: '+(step.step_name||step.name||'Actividad confirmada sin nombre'):
      risk?'Riesgo: '+(risk.description||'Riesgo confirmado sin descripción'):
        'Referencia de origen sin descripción disponible en el AS-IS';
  });
  const completeCards=opportunities.filter(item=>
    [item.how,item.why,...(item.related||[]).flatMap(x=>[x.how,x.why]),
      ...(item.alternative?[item.alternative.how,item.alternative.why]:[])]
      .every(value=>tobeGlobalTextIsComplete(value))).length,
    decisions=typeof tobeHumanReviewRecord==='function'?
      Object.values(tobeHumanReviewRecord(e,p)?.decisions||{})
        .filter(x=>['ACCEPT','MODIFY','DISCARD'].includes(x?.status)).length:0;
  const linkedSteps=rec=>{
    const refs=new Set([...(rec.source_refs||[]),
      ...(rec.related||[]).flatMap(x=>x.source_refs||[])].map(String));
    return (p?.items||[]).filter(item=>
      [...tobeGlobalSourceIdsForStep(e,p,item.sourceStepId)].some(id=>refs.has(id)));
  };
  const groupSteps=group=>{
    const targets=group.entries.flatMap(({item})=>linkedSteps(item));
    return [...new Map(targets.map(step=>[String(step.sourceStepId),step])).values()];
  };
  const globallyShared=tobeGlobalUniversalQuestions(opportunities);
  const state=working?'Analizando por fuentes…':result&&!analysisFinished?'Análisis parcial · Revisar':legacy?'Propuesta incompleta · Reanalizar':result?'Propuesta guardada · Sin aprobar':notCurrent?'Análisis anterior no vigente':'Pendiente de análisis';
  return '<section class="tobe-global-analysis aunea-ui-work-surface" id="tobeGlobalAnalysis" aria-label="Análisis global IA del proceso">'+
    '<header class="tobe-global-analysis-head"><div><span class="tobe-eyebrow">02 · ANÁLISIS IA GLOBAL DEL PROCESO</span>'+
      '<h2 class="aunea-ui-section-title">Objetivos y recomendaciones de mejora</h2>'+
      '<p>Primero, qué mejorar en el conjunto del proceso y cómo conseguirlo. Las decisiones sobre cada actividad se realizan después.</p></div>'+
      (tobeEditable(p)?'<div class="tobe-global-head-actions">'+
        (retryable?'<button type="button" class="btn btn-outline" id="retryTobeGlobal"'+
          (working?' disabled aria-busy="true"':'')+'>Reintentar fuentes pendientes</button>':'')+
        '<button type="button" class="btn btn-primary" id="analyzeTobeGlobal"'+
        (working?' disabled aria-busy="true"':'')+'>'+
        (working?'Analizando proceso…':result||legacy?'Volver a analizar':'Analizar proceso con IA')+
        '</button></div>':'')+'</header>'+
    '<div class="tobe-global-summary"><div class="tobe-global-summary-top">'+
      '<strong>'+(working?'Analizando proceso…':legacy?'Análisis anterior incompleto':result?'Síntesis del proceso':notCurrent?'Análisis guardado no vigente':'Análisis pendiente')+'</strong>'+
      '<span class="tobe-global-state" aria-live="polite">'+esc(state)+'</span></div>'+
      '<p>'+esc(preflight?'Comprobando que el backend admite el análisis por bloques. No se ha borrado ninguna propuesta.':working&&!result?'Se ha retirado el análisis anterior. Preparando una propuesta nueva con el AS-IS confirmado…':notCurrent?
        'Existe un análisis anterior guardado, pero no se puede utilizar como propuesta vigente. '+notCurrentReason+
        ' No se ha borrado al consultar esta pantalla; verifica la versión del estudio antes de volver a analizar.':
        result?.summary||'No se ha registrado una propuesta global vigente en este borrador. El análisis no se ha ejecutado o no se ha guardado para esta versión; no se alterarán campos del TO-BE.')+'</p></div>'+
    (typeof internalAiProgressHtml==='function'?internalAiProgressHtml(e,'global'):'')+
    '<details class="tobe-global-monitoring"'+
      ((monitoringWasOpen||feedback?.type==='warn'||!!progress?.failures?.length)?' open':'')+'>'+
      '<summary>Ver seguimiento, fuentes y comprobaciones'+
        (progress?.total?' · '+successful+' de '+progress.total+' fuentes':'')+
        (opportunities.length?' · '+opportunities.length+' propuestas':'')+
        '</summary><div class="tobe-global-monitoring-body">'+
    (opportunities.length?'<p class="tobe-global-feedback">Consolidación de propuestas: '+
      opportunities.length+' intervenciones registradas (candidatas a consolidación) · '+incompatible+
      ' incompatibilidades detectadas · '+alternatives+' alternativas sugeridas · '+
      pending+' intervenciones por verificar'+
      (variants?' · '+variants+' variantes relacionadas conservadas':'')+
      (qualityPlan?' · '+thematicGroups.length+' líneas relacionadas para revisión':'')+
      '. Ninguna equivale a aprobación del consultor.</p>':'')+
    (opportunities.length&&tobeGlobalHumanConditions(record,opportunities[0]?.review).length?
      '<details class="tobe-global-detail tobe-global-client-conditions">'+
        '<summary>Condiciones del cliente confirmadas en el AS-IS ('+
        tobeGlobalHumanConditions(record,opportunities[0]?.review).length+')</summary>'+
        '<ul class="tobe-source-list">'+tobeGlobalHumanConditions(record,opportunities[0]?.review)
          .map(c=>'<li><b>'+esc(c.label)+':</b> '+esc(c.values.join(' · '))+'</li>')
          .join('')+'</ul>'+
        '<p class="tobe-muted">Estas condiciones afectan al conjunto del análisis. '+
        'Las incompatibilidades de cada intervención se muestran en su propia tarjeta.</p>'+
      '</details>':'')+
    (progress?'<div class="tobe-global-progress" role="status" aria-live="polite">'+
      '<p><b>Generación:</b> Fuentes revisadas: '+successful+' de '+progress.total+
        (outstanding?' · Pendientes: '+outstanding:'')+
        (progress.failed?' · Incidencias: '+progress.failed:'')+
        (analysisFinished&&!outstanding?' · Análisis de fuentes completado':
          ' · Resultado parcial; no aprobar todavía')+'</p>'+
      '<p><b>Integridad:</b> '+completeCards+' de '+opportunities.length+
        ' recomendaciones con texto completo'+
        (legacy?' · Existen frases incompletas: conservar y reanalizar.':
          ' · Sin cortes detectados.')+'</p>'+
      '<p><b>Coherencia (revisión pendiente):</b> '+
        (qualityPlan?qualityPlan.reviewCount+' alertas de reglas y '+
          (qualityPlan.operationalReviewCount||0)+' intervenciones con comprobación operativa pendiente'+
          (qualityPlan.operationalNotEvaluated?' · '+qualityPlan.operationalNotEvaluated+
            ' sin evaluación operativa registrada (análisis anterior)':'')+
          ', de '+opportunities.length+' intervenciones.':
          'Sin comprobar.')+'</p>'+
      '<p><b>Revisión humana:</b> '+decisions+
        ' decisiones sobre actividades registradas; propuestas globales sin aprobar.</p>'+
      '</div>':'')+
    (opportunities.length?'<p class="tobe-global-caution">Priorización pendiente: contrastar impacto, evidencias y dependencias con el consultor. El orden visual no es una prioridad aprobada.</p>':'')+
    (!result&&!working?'<p class="tobe-global-feedback"><b>Coherencia sin evaluar:</b> no hay una propuesta global vigente sobre la que comprobar alertas o viabilidad.</p>':'')+
    (!progress&&qualityPlan?'<p class="tobe-global-feedback"><b>Coherencia (revisión pendiente):</b> '+
      qualityPlan.reviewCount+' alertas de reglas y '+
        (qualityPlan.operationalReviewCount||0)+' intervenciones con comprobación operativa pendiente. '+
        (qualityPlan.operationalNotEvaluated?qualityPlan.operationalNotEvaluated+
          ' sin evaluación operativa registrada; vuelve a analizar para obtenerla. ':'')+
        'Ninguna recomendación está aprobada.</p>':'')+
    (progress?.failures?.length?'<details class="tobe-global-detail"><summary>Fuentes pendientes e incidencias</summary>'+
      '<p>'+esc(progress.failures.map(x=>x.source_id+': '+x.reason).join(' · '))+
      '</p></details>':'')+
    (feedback?'<p class="tobe-global-feedback'+(feedback.type==='warn'?' is-warning':'')+
      '" role="status" aria-live="polite">'+esc(feedback.message)+'</p>':'')+
    (opportunities.length&&globallyShared.length?
      '<details class="tobe-global-universal-checks"><summary>Requisitos de implantación compartidos por todas las propuestas ('+
      globallyShared.length+')</summary><ul class="tobe-source-list">'+globallyShared
        .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
    '</div></details>'+
    (opportunities.length?'<div class="tobe-global-opportunities" aria-label="Objetivos y recomendaciones">'+
      thematicGroups.map((group,i)=>
      '<article class="tobe-global-opportunity">'+
      '<details class="tobe-global-opportunity-detail" data-global-group-key="'+encodeURIComponent(String(group.title))+'"'+
        (expandedGlobalGroups.has(encodeURIComponent(String(group.title)))?' open':'')+'>'+
      '<summary class="tobe-global-opportunity-summary">'+
      '<span class="tobe-global-number" aria-hidden="true">'+(i+1)+'</span>'+
      '<div class="tobe-global-goal-block">'+
        '<span class="tobe-global-item-label">'+(group.entries.length>1?'Línea de mejora':'Objetivo de mejora')+'</span>'+
        '<h3 class="tobe-global-goal">'+esc(group.title)+'</h3>'+
        '<p class="tobe-global-goal-meta">'+group.entries.length+
          (group.entries.length===1?' propuesta IA pendiente de revisión':' propuestas IA por comparar, sin seleccionar')+'</p>'+
      '</div>'+
      '<span class="tobe-global-brief-indicator">'+
        esc(group.incompatible?'Incompatibilidad':group.entries.some(x=>x.item?.review?.status==='CONDITIONED')?
          'Viabilidad por comprobar':'Pendiente de revisión')+'</span>'+
      '</summary><div class="tobe-global-opportunity-body">'+
      '<div class="tobe-global-brief-grid">'+
        '<div class="tobe-global-brief-result"><span class="tobe-global-kicker">RESULTADO QUE SE BUSCA</span>'+
          '<p>'+esc(group.expectedOutcome||'Resultado por definir a partir de la evidencia.')+'</p></div>'+
        '<div class="tobe-global-brief-status"><span class="tobe-global-kicker">VIABILIDAD</span>'+
          '<p>'+esc(group.incompatible?
            'Existe una incompatibilidad confirmada: no aplicar la propuesta afectada.':
            group.entries.some(x=>x.item?.review?.status==='CONDITIONED')?
              'Condicionada: hace falta comprobar sus capacidades y restricciones.':
              'Pendiente de evaluación. No aprobada.')+'</p></div>'+
      '</div>'+
      (group.entries.length===1&&group.entries[0]?.item?.how?
        '<div class="tobe-global-single-proposal"><span class="tobe-global-kicker">PROPUESTA DE LA IA</span>'+
        '<p>'+esc(tobeGlobalReadableProposal(group.entries[0].item,groupSteps(group)))+'</p></div>':'')+
      (group.entries.length>1?
        '<p class="tobe-global-variants-lead">Las propuestas persiguen una misma mejora. Abrir la comparación para comprobar si son alternativas o pueden combinarse.</p>':'')+
      (tobeGlobalGroupWarnings(group).length?
        '<details class="tobe-global-group-warnings"><summary>Observaciones de calidad ('+
          tobeGlobalGroupWarnings(group).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalGroupWarnings(group).map(q=>
            '<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
      (groupSteps(group).length?'<div class="tobe-global-review-links">'+
        '<span class="tobe-global-review-label">Revisar en actividades:</span>'+
        '<div class="tobe-global-review-actions">'+groupSteps(group).map(step=>
          '<button type="button" class="btn btn-outline btn-small" '+
          'data-tobe-select="'+attr(String(step.sourceStepId))+'" data-tobe-global-link="1">'+
          esc(step.sourceStepName||step.stepName||String(step.sourceStepId))+
          '</button>').join('')+'</div></div>':'')+
      '<details class="tobe-global-card-details"><summary>Comparar propuestas y consultar evidencias'+
        ' ('+group.entries.length+')</summary><div class="tobe-global-card-detail-body">'+
      group.entries.map(({item,issues},j)=>
      '<section class="tobe-global-intervention">'+
      '<div class="tobe-global-option-head">'+
        '<h4 class="tobe-global-option-title">Propuesta '+(j+1)+' de '+group.entries.length+'</h4>'+
        '<span class="tobe-global-option-state">'+
          esc(item.review?.status==='INCOMPATIBLE'?'Incompatible · revisar alternativa':
            'Pendiente de validar')+'</span>'+
      '</div>'+
      '<p class="tobe-global-option-action">'+
        esc(tobeGlobalReadableProposal(item,linkedSteps(item)))+'</p>'+
      (tobeGlobalOptionWarnings(group,{issues}).length?
        '<div class="tobe-global-option-caveat"><b>Qué hay que cuestionar</b><ul>'+
          tobeGlobalOptionWarnings(group,{issues}).map(q=>'<li>'+esc(q)+'</li>').join('')+
        '</ul></div>':'')+
      (item.alternative?'<p class="tobe-global-action"><b>Alternativa propuesta:</b> '+
        esc(item.alternative.how)+'</p>':
        item.alternative_note?'<p class="tobe-global-assessment">'+
          esc(item.alternative_note)+'</p>':'')+
      '<div class="tobe-global-option-evidence">'+
        '<div><span class="tobe-global-kicker">POR QUÉ SE PROPONE</span>'+
          '<p>'+esc(item.why)+'</p></div>'+
        '<div><span class="tobe-global-kicker">EVIDENCIA DEL AS-IS</span>'+
          '<p>'+esc(refs(item.source_refs).join(' · ')||'No consta una fuente legible')+'</p></div>'+
      '</div>'+
      '<details class="tobe-global-option-more"><summary>Consultar objetivo, incompatibilidades y comprobaciones</summary>'+
        '<div class="tobe-global-detail">'+
      '<p><b>Objetivo original:</b> '+esc(item.objective)+'</p>'+
      (item.review?.status==='INCOMPATIBLE'?
        '<p><b>Evaluación:</b> Incompatibilidad confirmada: no aplicar sin corregir la propuesta.</p>':'')+
      (item.alternative?'<p><b>Alternativa:</b> Mantenerla como posibilidad pendiente de evaluación; no se aplica automáticamente.</p>':'')+
      ((item.related||[]).length?'<p><b>Enfoques relacionados (sin descartar):</b></p>'+
        '<ul class="tobe-source-list">'+item.related.map(other=>
          '<li><b>'+esc(other.objective)+':</b> '+esc(other.how)+
          ' <small>Motivo: '+esc(other.why)+' · Fuentes: '+
          esc(refs(other.source_refs).join(' · '))+'</small></li>').join('')+
        '</ul>':'')+
      (item.review?.conflicts?.length?
        '<p><b>Incompatibilidad detectada:</b> '+
          esc(tobeGlobalReadableChecks(item.review.conflicts,'reason').join(' · '))+'</p>':'')+
      (item.alternative?.source_refs?.length?
        '<p><b>Evidencia de la alternativa:</b> '+
          esc(refs(item.alternative.source_refs).join(' · '))+'</p>':'')+
      (tobeGlobalSpecificQuestions(group,item,globallyShared).length?
        '<details class="tobe-global-evidence-detail">'+
          '<summary>Qué debe comprobarse para esta intervención ('+
            tobeGlobalSpecificQuestions(group,item,globallyShared).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalSpecificQuestions(group,item,globallyShared)
            .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul>'+
        '</details>':'')+
      '</div></details></section>').join('')+
      (tobeGlobalSharedQuestions(group,globallyShared).length?
        '<details class="tobe-global-shared-checks"><summary>Comprobaciones compartidas por estas propuestas ('+
          tobeGlobalSharedQuestions(group,globallyShared).length+')</summary>'+
          '<ul class="tobe-source-list">'+tobeGlobalSharedQuestions(group,globallyShared)
            .map(q=>'<li>'+esc(q)+'</li>').join('')+'</ul></details>':'')+
      '</div></details></div></details></article>').join('')+'</div>':
      result?'<p class="tobe-global-empty">'+
        (analysisFinished&&outstanding===0?
          'No se han identificado mejoras justificadas en las fuentes completadas. Revisa la evidencia antes de cerrar.':
          'Análisis parcial: quedan fuentes por revisar. Aún no se puede concluir que no existan otras mejoras.')+
        '</p>':'')+
    (legacy?'<p class="tobe-global-feedback is-warning" role="status">La salida anterior contiene una frase que puede estar incompleta. Se muestra íntegra tal como la devolvió Ollama. Regenera antes de aprobar.</p>':'')+
    (result?'<p class="tobe-global-caution">Propuesta sin aprobar. Contrasta las cifras con las referencias del AS-IS confirmado; no son promesas de ahorro ni tiempos futuros. La revisión humana sigue siendo obligatoria.</p>':'')+
    '</section>';
}
// [AUNEA-FE-PG11-GLOBAL-OVERVIEW-284] END
