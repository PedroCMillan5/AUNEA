// [AUNEA-FE-PG11-TRANSACTION-332] START
// PURPOSE: Preview/confirm/undo source-linked alternatives on the existing version owner.
// SOURCE: PG11 instruction 11/11/2026; DEC-050/052/055. INPUTS: transient candidate.
// OUTPUTS: canonical items/flow plus existing applyHistory audit. SIDE_EFFECTS: explicit saveState only.
// CHANGE_RISK: HIGH. No scenario, economic calculation or second graph owner.
let __auneaTobePreview=null;
const __auneaTobeAlternatives=new Map();
const __auneaTobeAlternativeErrors=new Map();
// [AUNEA-FE-PG11-ALTERNATIVES-CONTRACT-360] START
// A stale local backend or a cached prior rules response must never render as
// an up-to-date recommendation. The server owns this contract and the rules.
const TOBE_ALTERNATIVES_CONTRACT='PG11_FINDING_SPECIFIC_V2';
function tobeRulesResultIssue(data){
  if(!data||data.engine_contract!==TOBE_ALTERNATIVES_CONTRACT)
    return 'El backend conectado sigue utilizando un motor de alternativas antiguo o incompatible. '+
      'No se mostrarán recomendaciones obsoletas. Comprueba el motor activo en '+
      'http://127.0.0.1:8010/v1/tobe/alternatives-status, detén el proceso anterior '+
      'y vuelve a iniciar el backend desde esta rama.';
  if(!Array.isArray(data.candidates)||data.candidates.some(candidate=>
    !candidate||!Array.isArray(candidate.sourceRefs)||
    !['targetFinding','changeSummary','expectedOutcome','combination'].every(
      key=>typeof candidate[key]==='string')))
    return 'La respuesta del motor no cumple el contrato de alternativas de PG11. '+
      'No se ha incorporado ni aceptado ningún cambio.';
  return '';
}
// [AUNEA-FE-PG11-ALTERNATIVES-CONTRACT-360] END
const tobeClone=value=>JSON.parse(JSON.stringify(value));
function tobeDesignState(p){return {items:tobeClone(p.items),flow:tobeClone(p.flow||null)};}
function tobeAlternativeKey(e,p,id){return String(e.id)+'|'+p.version+'|'+p.sourceSnapshotVersion+'|'+String(id);}
function tobeProjectAlternative(e,p,candidate){
  const projected=tobeClone(p),id=String(candidate.sourceId),item=tobeFlowItem(e,projected,id);
  if(!tobeEditable(p)||!item)throw Error('La actividad ya no pertenece al borrador editable.');
  // Two placements of one risk control are alternatives, not cumulative nodes.
  // The preview is rejected when the other placement remains applied.
  const group=String(candidate.combination||'');
  if(candidate.provenance==='RULES'&&group.startsWith('ALTERNATIVE_TO_CONTROL-')){
    const riskId=group.slice('ALTERNATIVE_TO_CONTROL-'.length),
      peerIds=new Set(['CONTROL-'+riskId+':'+id,'CONTROL-STEP-'+riskId+':'+id]);
    if((p.aiDraft?.applyHistory||[]).some(x=>x.action==='APPLY'&&!x.undoneAt&&
       peerIds.has(String(x.candidateId))&&String(x.candidateId)!==String(candidate.id)))
      throw Error('Ya existe otra ubicación aplicada para este control. Deshaz esa intervención antes de seleccionar la alternativa excluyente.');
  }
  const allowed=new Set(['transformation','problemResolved','futureActor','tool','inputs','outputs',
    'automationAi','humanSupervision','controlsRisk','futureTime','futureTimeAssumption']);
  for(const [key,value] of Object.entries(candidate.fields||{})){
    if(!allowed.has(key))throw Error('La propuesta contiene un campo fuera del contrato: '+key);
    item[key]=tobeClone(value);
  }
  let flow=null;
  const pending=[];
  for(const operation of candidate.operations||[]){
    if(operation.type!=='insertAfter')throw Error('Operación estructural no soportada: requiere edición explícita del mapa.');
    if(!flow)flow=tobeMutableFlow(e,projected);
    const anchor=tobeFlowItem(e,projected,String(operation.sourceId)),route=flow.routes[String(operation.sourceId)];
    if(!anchor){pending.push('La actividad de origen no existe en el TO-BE.');continue;}
    const routeNormal=route?.normal&&route.normal!=='__PENDING__'?String(route.normal):'',
      selected=String(operation.normalDestination||''),
      destination=routeNormal||selected;
    if(!destination){
      pending.push('Elige el destino de la ruta normal dentro de esta vista previa antes de insertar el control.');continue;
    }
    if(destination===String(operation.sourceId)||
       (destination!=='__END__'&&!tobeFlowItem(e,projected,destination))){
      pending.push('El destino seleccionado no pertenece al flujo vigente. Elige una actividad existente.');continue;
    }
    const source=tobeProposalSourceSteps(e,p).find(s=>String(s.id)===String(anchor.sourceStepId));
    if(!source||processDecisionStep(source)){
      pending.push('Selecciona explícitamente la rama en la que debe insertarse el control.');continue;
    }
    const nodeId='TOBE-ADD-'+p.version+'-'+String(candidate.id).replace(/[^a-zA-Z0-9_-]/g,'_');
    if(tobeFlowItem(e,projected,nodeId))throw Error('Este control ya está incorporado; revisa la actividad existente.');
    const supplied=operation.item||{};
    if(!String(supplied.stepName||'').trim())throw Error('La nueva actividad necesita una función y un nombre explícitos.');
    const added={id:nodeId,isAddition:true,status:'DRAFT',sourceStepId:source.id,
      sourceStepName:source.step_name||source.name,stepName:supplied.stepName,stepType:'ST02',
      transformation:'Se incorpora control',problemResolved:supplied.problemResolved||'',
      futureActor:anchor.futureActor||'',tool:anchor.tool||'',inputs:tobeClone(anchor.outputs||[]),
      outputs:tobeClone(anchor.outputs||[]),automationAi:'',humanSupervision:anchor.futureActor||'',
      controlsRisk:supplied.controlsRisk||'',futureTime:'',futureTimeAssumption:''};
    flow.addedSteps.push(added);flow.routes[nodeId]={normal:destination,exception:''};
    flow.routes[String(operation.sourceId)]={...route,normal:nodeId};
    // New node placement is computed by the existing layout from its explicit routes.
  }
  const structural=tobeFlowIntegrity(e,projected);
  if(structural)pending.push(structural);
  return {projected,pending};
}
function tobeTransactionChanges(before,after,path=[]){
  if(JSON.stringify(before)===JSON.stringify(after))return [];
  if(before&&after&&typeof before==='object'&&typeof after==='object'&&
     !Array.isArray(before)&&!Array.isArray(after))
    return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>
      tobeTransactionChanges(before[key],after[key],[...path,key]));
  if(path.length===1&&path[0]==='items'&&Array.isArray(before)&&Array.isArray(after)&&
     before.length===after.length&&before.every((v,i)=>v.id===after[i].id))
    return before.flatMap((v,i)=>tobeTransactionChanges(v,after[i],[...path,String(i)]));
  return [{path,before:before===undefined?null:tobeClone(before),after:after===undefined?null:tobeClone(after),
    beforeMissing:before===undefined,afterMissing:after===undefined}];
}
function tobeTransactionRead(root,path){return path.reduce((value,key)=>value?.[key],root);}
function tobeTransactionWrite(root,change,reverse=false){
  let owner=root;for(const key of change.path.slice(0,-1)){if(!owner[key])owner[key]={};owner=owner[key];}
  const key=change.path.at(-1),missing=reverse?change.beforeMissing:change.afterMissing;
  if(missing)delete owner[key];else owner[key]=tobeClone(reverse?change.before:change.after);
}
function tobeCommitAlternative(e,preview){
  const p=latestTobe(e);
  if(!preview||preview.engagementId!==e.id||p?.version!==preview.version||!tobeEditable(p)||
    confirmedSnapshot(e)?.version!==p.sourceSnapshotVersion||
    JSON.stringify(tobeDesignState(p))!==JSON.stringify(preview.before))
    throw Error('El borrador o el AS-IS cambió. Genera de nuevo la vista previa.');
  const gate=tobeAlternativeDecisionIssue(preview);
  if(gate)throw Error(gate);
  if(preview.candidate.provenance==='AI'){
    const fresh=tobeAiReviewDiff(e,p,preview.candidate.sourceId);
    if(fresh.issue||(preview.candidate.consultantModified?fresh.decision!=='MODIFY':
      Object.entries(preview.candidate.fields).some(([key,value])=>
      !fresh.allFields.some(x=>x.key===key&&JSON.stringify(x.value)===JSON.stringify(value)))))
      throw Error(fresh.issue||'La recomendación IA cambió; vuelve a revisarla.');
  }
  const prior=tobeClone(p),after=tobeDesignState(preview.projected),changes=tobeTransactionChanges(preview.before,after);
  if(changes.length){p.items=after.items;p.flow=after.flow;}
  if(!p.aiDraft)p.aiDraft={};
  p.aiDraft.applyHistory=[...(p.aiDraft.applyHistory||[]),{
    action:changes.length?'APPLY':'KEEP',decision:'CONSULTANT_CONFIRMED',
    sourceStepId:preview.candidate.sourceId,
    fields:Object.keys(preview.candidate.fields||{}),provenance:preview.candidate.provenance,consultantModified:preview.candidate.consultantModified===true,
    candidateId:preview.candidate.id,sourceRefs:preview.candidate.sourceRefs||[],
    consultantNote:String(preview.consultantNote||'').trim(),
    conditionsAcknowledged:preview.conditionsAcknowledged===true,
    remainingFindingsAcknowledged:preview.keepFindingsAcknowledged===true,
    proposalFingerprint:typeof tobeCandidateFingerprint==='function'?tobeCandidateFingerprint(p):'',
    transaction:{changes,itemIds:p.items.map(x=>x.id)},appliedAt:now()
  }].slice(-100);p.updatedAt=now();
  markDirty(changes.length?'PG11: confirmar intervención previsualizada':
    'PG11: registrar conservación sin cambios materiales');
  if(!saveState('Guardar intervención y grafo TO-BE')){
    Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,prior);
    throw Error('No se guardó la intervención. Se ha restaurado el borrador anterior.');
  }
  return true;
}
function tobeUndoAlternative(e){
  const p=latestTobe(e);if(!tobeEditable(p))throw Error('Sólo puede deshacerse un borrador editable.');
  const entry=(p.aiDraft?.applyHistory||[]).findLast(x=>x.transaction&&!x.undoneAt);
  if(!entry)throw Error('No hay una intervención recuperable.');
  if(JSON.stringify(p.items.map(x=>x.id))!==JSON.stringify(entry.transaction.itemIds))
    throw Error('Cambió la identidad de las actividades; no es seguro restaurar esta intervención.');
  const current=tobeDesignState(p);
  for(const c of entry.transaction.changes){
    const value=tobeTransactionRead(current,c.path);
    if(c.afterMissing?value!==undefined:JSON.stringify(value)!==JSON.stringify(c.after))
      throw Error('Un elemento de esta intervención fue modificado después. No se sobrescriben esas decisiones.');
  }
  for(const c of entry.transaction.changes)tobeTransactionWrite(current,c,true);
  const proposed={...p,...current},issue=tobeFlowIntegrity(e,proposed);
  if(issue)throw Error('Deshacer dejaría una dependencia sin resolver: '+issue);
  const prior=tobeClone(p);p.items=current.items;p.flow=current.flow;entry.undoneAt=now();p.updatedAt=now();
  markDirty('PG11: deshacer exclusivamente la última intervención');
  if(!saveState('Deshacer intervención TO-BE')){
    Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,prior);throw Error('No se guardó la restauración.');
  }
  return true;
}
// [AUNEA-FE-PG11-OPPORTUNITY-WORKBENCH-364] START
// Single read-only presentation of source-linked alternatives in PG11.03.2.
// SOURCE: sealed AS-IS snapshot, server-owned rules, global/individual IA.
// OUTPUT: grouped cards only; all actions still use the existing preview owner.
// NO new persisted fields, invented links, or client confirmations.
function tobeOpportunitySources(e,p,item){
  if(item?.isAddition)return [];
  const id=String(item.sourceStepId),snap=tobeProposalSnapshot(e,p),
    linked=(x,attr)=>Array.isArray(x?.[attr])&&x[attr].map(String).includes(id);
  return [
    ...(snap?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'&&linked(x,'affected_steps')).map(x=>({
      id:String(x.id||''),kind:'Fricción',
      label:String(x.client_label||x.observable_signal||x.id||'Fricción del AS-IS')
    })),
    ...(snap?.risks||[]).filter(x=>x.status!=='SUPERSEDED'&&linked(x,'step_ids')).map(x=>({
      id:String(x.risk_id||x.id||''),kind:'Riesgo',
      label:String(x.description||x.category||x.risk_id||'Riesgo del AS-IS')
    }))
  ].filter(x=>x.id);
}
function tobeAlternativesHtml(e,p,item){
  if(!tobeEditable(p)||item.isAddition)return '';
  const key=tobeAlternativeKey(e,p,item.sourceStepId),
    data=__auneaTobeAlternatives.get(key),
    staleIssue=data?tobeRulesResultIssue(data):'',
    error=staleIssue||__auneaTobeAlternativeErrors.get(key),
    history=p.aiDraft?.applyHistory||[],
    canUndo=history.some(x=>x.transaction&&!x.undoneAt),
    sources=tobeOpportunitySources(e,p,item),
    keepWasExpanded=typeof document!=='undefined'?
      !!document.querySelector('#tobeStepAdvice .tobe-opportunity-keep')?.open:false,
    linked=typeof tobeGlobalLinksForStep==='function'?
      tobeGlobalLinksForStep(e,p,item):[],
    sourceMap=new Map(sources.map(x=>[x.id,x])),
    groups=new Map(sources.map(x=>[x.id,{source:x,items:[],global:[]}])),
    other={source:{kind:'Contexto',label:'Otras intervenciones para esta actividad',id:''},items:[],global:[]},
    cross={source:{kind:'Transversal',label:'Oportunidades relacionadas con varios hallazgos',id:''},items:[],global:[]},
    keep={source:{kind:'Decisión',label:'Conservar el funcionamiento original',id:''},items:[],global:[]};
  (staleIssue?[]:data?.candidates||[]).forEach((candidate,index)=>{
    const refs=(candidate.sourceRefs||[]).map(String).filter(x=>x!==String(item.sourceStepId)),
      group=String(candidate.id||'').startsWith('KEEP:')?keep:
        (groups.get(refs.find(x=>sourceMap.has(x)))||other);
    group.items.push({candidate,index});
  });
  // A global finding is shown once. If it cites several findings, it belongs
  // in a cross-cutting group; step-only advice is not assigned to an invented issue.
  linked.forEach(entry=>{
    const r=entry.recommendation||{},
      refs=[...(r.source_refs||[]),...(r.related||[]).flatMap(x=>x.source_refs||[])].map(String),
      matches=sources.filter(x=>refs.includes(x.id));
    const target=matches.length===1?groups.get(matches[0].id):
      matches.length>1?cross:other;
    target.global.push(entry);
  });
  const card=({candidate,index})=>{
    const decision=history.findLast(x=>x.candidateId===candidate.id&&!x.undoneAt),
      discarded=decision?.action==='DISCARD',
      summary=candidate.changeSummary||candidate.title,
      conditions=(candidate.conditions||[]).filter(Boolean),
      group=candidate.combination==='EXCLUSIVE'?'Conservar el AS-IS es incompatible con transformarlo.':
        String(candidate.combination||'').startsWith('ALTERNATIVE_TO_CONTROL-')?
        'Para el mismo control se debe elegir una ubicación, no ambas.':
        'Combinable únicamente si no se contradicen campos, rutas y controles.';
    return '<article class="tobe-alternative" data-opportunity-index="'+index+'">'+
      '<div class="tobe-opportunity-option-title"><strong>'+esc(candidate.title)+'</strong>'+
        (decision?'<span class="tobe-opportunity-decision">'+
          esc(discarded?'Descartada':decision.action==='APPLY'?'Aplicada':'Conservada')+'</span>':'')+
      '</div>'+
      '<p class="tobe-opportunity-action">'+esc(summary)+'</p>'+
      (candidate.expectedOutcome?'<p class="tobe-opportunity-outcome"><b>Resultado esperado:</b> '+
        esc(candidate.expectedOutcome)+'</p>':'')+
      (decision?'<p class="tobe-alternative-state">Decisión guardada; consulta el historial del diseño futuro.</p>':'')+
      (discarded?'<div class="tobe-alternative-actions">'+
        '<button type="button" class="btn btn-outline btn-small" data-tobe-alternative-restore="'+index+
          '" data-tobe-alternative-source="'+attr(item.sourceStepId)+'">Recuperar alternativa</button>'+
      '</div>':!decision?'<div class="tobe-alternative-actions">'+
        '<button type="button" class="btn btn-outline btn-small" data-tobe-alternative="'+index+
          '" data-tobe-alternative-source="'+attr(item.sourceStepId)+'">Revisar y previsualizar</button>'+
        '<button type="button" class="btn btn-outline btn-small" data-tobe-alternative-discard="'+index+
          '" data-tobe-alternative-source="'+attr(item.sourceStepId)+'">Descartar</button>'+
      '</div>':'')+
      '<details class="tobe-opportunity-evidence"><summary>Condiciones, compatibilidad y fuentes</summary>'+
        '<p><b>Compatibilidad:</b> '+esc(group)+'</p>'+
        (conditions.length?'<ul>'+conditions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':
          '<p>Sin condiciones adicionales de esta alternativa.</p>')+
        '<p><b>Referencias del AS-IS:</b> '+esc(tobeHumanReadableRefs(e,candidate.sourceRefs))+'</p>'+
        (Object.keys(candidate.constraints||{}).length?
          '<details class="tobe-alternative-constraints"><summary>Restricciones aplicables ('+
          Object.keys(candidate.constraints).length+')</summary><ul>'+
          Object.entries(candidate.constraints).map(([code,raw])=>{
            const field=typeof schema!=='undefined'?(schema?.fields||[]).find(f=>String(f.Field_ID)===code):null,
              label=field?.Pregunta_o_etiqueta_ES||'Condición del cuestionario',
              val=field&&typeof formatContextValue==='function'?formatContextValue(field,raw):
                (Array.isArray(raw)?raw.join(', '):String(raw??''));
            return '<li><b>'+esc(label)+' ('+esc(code)+'):</b> '+esc(String(val||'No consta'))+'</li>';
          }).join('')+'</ul></details>':'')+
      '</details></article>';
  };
  const globalCard=({recommendation:r,index})=>{
    const ref=[...(r.source_refs||[]),...(r.related||[]).flatMap(x=>x.source_refs||[])];
    return '<details class="tobe-opportunity-global"><summary>IA global · '+esc(r.objective||'Propuesta relacionada')+'</summary>'+
      '<div class="tobe-opportunity-global-body">'+
        '<p><b>Intervención planteada:</b> '+esc(r.how||'Sin propuesta operativa completa')+'</p>'+
        (r.alternative?.how?'<p><b>Alternativa IA:</b> '+esc(r.alternative.how)+'</p>':'')+
        '<p><b>Viabilidad:</b> '+esc(r.review?.reason||'Pendiente de contraste')+'</p>'+
        '<p><b>Fuentes:</b> '+esc(tobeHumanReadableRefs(e,ref))+'</p>'+
        '<p class="field-help">Análisis global de solo lectura. No aplica campos ni modifica el borrador; '+
        'el diseño se configura en 03.3.</p>'+
      '</div></details>';
  };
  const opportunity=g=>{
    const count=g.items.length,globalCount=g.global.length,
      description=[count?count+' '+(count===1?'alternativa por reglas':'alternativas por reglas'):'',
        globalCount?globalCount+' '+(globalCount===1?'referencia del análisis global':'referencias del análisis global'):''
      ].filter(Boolean).join(' · ');
    return '<section class="tobe-opportunity" data-tobe-opportunity-source="'+attr(g.source.id)+'">'+
      '<div class="tobe-opportunity-heading"><div><span class="tobe-opportunity-kind">'+esc(g.source.kind)+
      (g.source.id?' ('+esc(g.source.id)+')':'')+'</span><h5>'+esc(g.source.label)+'</h5></div>'+
      (description?'<small>'+esc(description)+'</small>':'')+'</div>'+
      (count?'<div class="tobe-opportunity-options">'+g.items.map(card).join('')+'</div>':
        '<p class="tobe-opportunity-empty">No hay alternativa específica calculada por reglas para este hallazgo. '+
        'Puedes configurar el TO-BE manualmente.</p>')+
      (globalCount?'<div class="tobe-opportunity-global-list">'+g.global.map(globalCard).join('')+'</div>':'')+
      '</section>';
  };
  return '<div class="tobe-alternatives" id="tobeOpportunityWorkbench" aria-label="Oportunidades y alternativas de esta actividad">'+
    '<div class="tobe-alternatives-intro"><h4>Oportunidades vinculadas al AS-IS</h4>'+
      '<p>Las alternativas por reglas se agrupan por fricción o riesgo confirmado. '+
      'Las fuentes IA se consultan sin duplicar la decisión del consultor.</p></div>'+
    '<div class="tobe-alternatives-actions">'+
      '<button type="button" class="btn btn-outline" data-tobe-load-alternatives="'+attr(item.sourceStepId)+
      '">'+(data?'Actualizar alternativas por reglas':'Generar alternativas con reglas')+'</button>'+
      (canUndo?'<button type="button" class="btn btn-outline" data-tobe-undo-alternative="1">'+
      'Deshacer última intervención aplicada</button>':'')+'</div>'+
    (error?'<p class="notice warn" role="alert"><b>Análisis no completado:</b> '+esc(error)+
      ' Se conserva el diseño.</p>':'')+
    (!data&&!error?'<p class="field-help">El motor de reglas aún no se ha ejecutado para esta actividad. '+
      'Las fricciones y riesgos confirmados se muestran mientras tanto.</p>':'')+
    (!staleIssue&&data&&!data.candidates?.length?'<p class="field-help">El motor no ha generado '+
      'alternativas aplicables. Puedes configurar el TO-BE manualmente.</p>':'')+
    '<div class="tobe-opportunity-groups">'+[...groups.values()].map(opportunity).join('')+
      (cross.global.length?opportunity(cross):'')+
      (other.items.length||other.global.length?opportunity(other):'')+
      (keep.items.length?'<details class="tobe-opportunity-keep"'+(keepWasExpanded?' open':'')+'><summary>Alternativa de conservación del AS-IS</summary>'+
        opportunity(keep)+'</details>':'')+
      (!sources.length&&!other.items.length&&!other.global.length&&!cross.global.length&&!keep.items.length?
        '<p class="field-help">No constan fricciones o riesgos directamente vinculados a esta actividad.</p>':'')+
    '</div></div>';
}
// [AUNEA-FE-PG11-OPPORTUNITY-WORKBENCH-364] END
// [AUNEA-FE-PG11-PREVIEW-COMPARISON-358] START
// PURPOSE: Read-only comparison from one TO-BE owner and projected state.
// SOURCE: Simulator CANONICAL PG11; DEC-050/055/056.
// INPUTS: transient preview.bef​ore/projected. OUTPUTS: HTML comparison, pending and status.
// SIDE_EFFECTS: none. The preview is recomputed before any confirmation.
// CHANGE_RISK: HIGH. No second map owner, estimated savings or invented fields.
function tobeAlternativeChangesHtml(e,preview){
  const changes=tobeTransactionChanges(preview.before,tobeDesignState(preview.projected));
  const names={
    transformation:'Transformación',problemResolved:'Motivo del diseño futuro',
    futureActor:'Responsable futuro',tool:'Herramienta futura',
    inputs:'Entradas',outputs:'Salidas',automationAi:'Automatización / IA',
    humanSupervision:'Supervisión humana',controlsRisk:'Control / riesgo',
    futureTime:'Tiempo futuro',futureTimeAssumption:'Supuesto del tiempo futuro',
    normal:'Ruta normal',exception:'Ruta de excepción'
  };
  const label=id=>{
    const item=tobeFlowItem(e,preview.projected,String(id))||
      tobeFlowItem(e,{...preview.projected,items:preview.before.items},String(id));
    return item?tobeFlowItemName(item):String(id);
  };
  const print=(value,path)=>{
    if((value===null||value===undefined||value==='')&&path.at(-1)==='automationAi')
      return 'Sin automatización o IA futura propuesta';
    if(value===null||value===undefined||value==='')return 'Sin definir';
    if(Array.isArray(value)){
      if(path[0]==='flow'&&path[1]==='addedSteps'){
        return value.length+' '+(value.length===1?'actividad añadida':'actividades añadidas')+
          (value.length?': '+value.map(x=>x.stepName||x.id).join(' · '):'');
      }
      return value.length?value.map(x=>typeof x==='object'?String(x.stepName||x.id||'Elemento'):String(x)).join(' · '):'Sin elementos';
    }
    if(path[0]==='flow'&&path[1]==='routes'&&typeof value==='string')
      return value==='__END__'?'Fin del proceso':value==='__PENDING__'?'Pendiente de conexión':label(value);
    if(typeof value==='object')return 'Configuración de rutas o estructura (ver mapa)';
    return String(value);
  };
  const title=path=>{
    if(path[0]==='items'){
      const step=preview.before.items[Number(path[1])],
        source=step?.sourceStepName||step?.stepName||step?.sourceStepId||'actividad';
      return (names[path.at(-1)]||'Campo del TO-BE')+' · '+source;
    }
    if(path[0]==='flow'&&path[1]==='addedSteps')return 'Actividad incorporada al mapa';
    if(path[0]==='flow'&&path[1]==='routes'){
      return (names[path[3]]||'Conexión del mapa')+' · '+label(path[2]);
    }
    return 'Estructura del proceso';
  };
  return '<section class="tobe-preview-comparison" aria-label="Comparación antes y después">'+
    '<h3>Qué cambiaría si confirmas esta intervención</h3>'+
    (changes.length?
      '<div class="tobe-preview-table-scroll"><table><thead><tr><th>Elemento</th>'+
        '<th>TO-BE guardado</th><th>TO-BE propuesto</th></tr></thead><tbody>'+
      changes.map(change=>'<tr><th scope="row">'+esc(title(change.path))+'</th>'+
        '<td>'+esc(print(change.before,change.path))+'</td>'+
        '<td>'+esc(print(change.after,change.path))+'</td></tr>').join('')+
      '</tbody></table></div>':
      '<p class="tobe-muted">No hay diferencias materiales con el TO-BE guardado. '+
        'Confirmar únicamente registrará que se conserva esta configuración.</p>')+
    '</section>';
}
function tobeAlternativePendingHtml(preview){
  const issues=(preview.pending||[]);
  return '<section class="tobe-preview-validation" role="status" aria-live="polite">'+
    '<h3>Comprobaciones antes de confirmar</h3>'+
    (issues.length?'<p><b>'+issues.length+' condición'+(issues.length===1?'':'es')+
      ' bloqueante'+(issues.length===1?'':'s')+'</b></p><ul>'+
      issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':
      '<p>Sin bloqueos estructurales detectados. '+
      'La viabilidad operativa, las capacidades técnicas y las evidencias pendientes siguen requiriendo validación.</p>')+
    '</section>';
}
function tobeAlternativeRouteChoicesHtml(e,p,candidate){
  const flow=tobeFlowOwner(e,p),
    options=[...(p.items||[]),...tobeAddedSteps(p)].map(item=>({
      id:String(item.isAddition?item.id:item.sourceStepId),
      label:tobeFlowItemName(item)
    }));
  const controls=(candidate.operations||[]).map((operation,index)=>{
    if(operation.type!=='insertAfter')return '';
    const sourceId=String(operation.sourceId),
      normal=flow?.routes?.[sourceId]?.normal;
    if(normal&&normal!=='__PENDING__')return '';
    const selected=String(operation.normalDestination||'');
    const opts=[...options.filter(x=>x.id!==sourceId).map(x=>({value:x.id,label:x.label})),
      {value:'__END__',label:'Fin del proceso'}];
    return '<div class="tobe-preview-route-choice">'+
      '<label for="tobePreviewRoute'+index+'">Destino de la ruta normal después del control</label>'+
      auneaSelectControl('tobePreviewRoute'+index,opts,selected,{
        extra:'data-tobe-preview-route="'+index+'"',
        placeholder:'Selecciona una actividad de destino'})+
      '<p class="tobe-muted">Sólo se establece una ruta normal explícita que estaba pendiente. '+
        'No se modifica una bifurcación SÍ/NO ni se inventan rutas.</p>'+
      '</div>';
  }).filter(Boolean);
  return controls.length?'<section class="tobe-preview-route-editor" aria-label="Resolver conexiones">'+
    '<h3>Conexión pendiente</h3>'+controls.join('')+'</section>':'';
}
// [AUNEA-FE-PG11-PREVIEW-COMPARISON-358] END
// [AUNEA-FE-PG11-PREVIEW-DECISION-361] START
// Single preview/confirmation gate. User acknowledges pending conditions but
// does not assert they are verified. KEEP of AS-IS requires an explicit
// rationale and recognition of the linked unresolved findings.
function tobeAlternativeIsKeep(candidate){
  return candidate?.provenance==='RULES'&&String(candidate.id||'').startsWith('KEEP:');
}
function tobeAlternativeDecisionIssue(preview){
  if(!preview)return 'No hay vista previa vigente.';
  if(preview.pending?.length)return 'Resuelve los bloqueos estructurales antes de confirmar.';
  if((preview.candidate?.conditions||[]).length&&!preview.conditionsAcknowledged)
    return 'Revisa y reconoce las condiciones pendientes antes de confirmar.';
  if(tobeAlternativeIsKeep(preview.candidate)){
    if(!preview.keepFindingsAcknowledged)
      return 'Confirma que conservar el AS-IS deja pendientes las fricciones y riesgos asociados.';
    if(String(preview.consultantNote||'').trim().length<20)
      return 'Justifica con al menos 20 caracteres por qué mantienes el funcionamiento del AS-IS.';
  }
  return '';
}
function tobeAlternativeScopedFindingsHtml(e,preview){
  const id=String(preview.candidate?.sourceId||''),
    known=new Set([id,...tobeAddedSteps(preview.projected).map(x=>String(x.id))]),
    findings=tobeCoherenceFindings(e,preview.projected)||[],
    scoped=findings.filter(x=>known.has(String(x.stepId||''))),
    other=findings.filter(x=>!known.has(String(x.stepId||'')));
  const line=x=>'<li><b>'+(x.severity==='BLOCKING'?'Bloqueo':'Observación')+':</b> '+
    esc((x.name?x.name+': ':'')+String(x.message||''))+'</li>';
  return '<section class="tobe-preview-scoped-checks" aria-label="Comprobaciones de esta intervención">'+
    '<h3>Comprobaciones de esta intervención</h3>'+
    (scoped.length?'<p>'+scoped.length+' observación'+(scoped.length===1?'':'es')+
      ' vinculada'+(scoped.length===1?'':'s')+' a esta actividad o al control propuesto.</p>'+
      '<ul>'+scoped.map(line).join('')+'</ul>':
      '<p>No hay nuevas observaciones de coherencia vinculadas a la actividad seleccionada.</p>')+
    (other.length?'<details class="tobe-preview-other-checks"><summary>'+
      'Ver observaciones del resto del proceso ('+other.length+')</summary>'+
      '<p>Estas observaciones no constituyen por sí mismas un bloqueo de esta alternativa.</p>'+
      '<ul>'+other.map(line).join('')+'</ul></details>':'')+
  '</section>';
}
function tobeAlternativeDecisionHtml(preview){
  const candidate=preview.candidate||{},keep=tobeAlternativeIsKeep(candidate);
  return '<section class="tobe-preview-consultant" aria-label="Confirmación del consultor">'+
    '<h3>Decisión del consultor sobre esta intervención</h3>'+
    (keep?'<p><b>Conservar el AS-IS no significa conservar el borrador TO-BE.</b> '+
      'Revisa arriba los campos que se sustituirán. Los hallazgos relacionados permanecerán pendientes.</p>':'')+
    ((candidate.conditions||[]).length?
      '<label class="tobe-preview-confirmation"><input type="checkbox" data-tobe-preview-ack="1"'+
      (preview.conditionsAcknowledged?' checked':'')+'>'+
      '<span>He revisado las condiciones de esta propuesta. Comprendo que no quedan verificadas '+
      'automáticamente y deberán validarse antes de aprobar el diseño definitivo.</span></label>':'')+
    (keep?'<label class="tobe-preview-confirmation"><input type="checkbox" data-tobe-preview-keep-ack="1"'+
      (preview.keepFindingsAcknowledged?' checked':'')+'>'+
      '<span>Comprendo que mantener el funcionamiento del AS-IS no resuelve los hallazgos vinculados.</span></label>'+
      '<label for="tobePreviewKeepNote"><b>Justificación de conservación</b></label>'+
      '<textarea id="tobePreviewKeepNote" rows="3" data-tobe-preview-note="1" '+
        'placeholder="Explica por qué se conserva esta actividad y cómo se tratarán los hallazgos pendientes.">'+
        esc(preview.consultantNote||'')+'</textarea>':'')+
    '<p class="tobe-preview-decision-status" role="status" aria-live="polite">'+
      esc(tobeAlternativeDecisionIssue(preview)||'Lista para confirmar esta intervención en el borrador.')+'</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-PREVIEW-DECISION-361] END
function tobeOpenAlternative(e,candidate){
  if(!saveTobeFromDom(e)||!saveState('Conservar edición antes de previsualizar'))throw Error('No se pudo conservar tu edición.');
  const live=currentEng(),p=latestTobe(live),result=tobeProjectAlternative(live,p,candidate);
  __auneaTobePreview={engagementId:live.id,version:p.version,before:tobeDesignState(p),
    candidate:tobeClone(candidate),conditionsAcknowledged:false,keepFindingsAcknowledged:false,
    consultantNote:'',...result};
  document.getElementById('tobeAlternativeDialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='tobeAlternativeDialog';dialog.className='tobe-alternative-dialog';
  const readonly={...result.projected,status:'REVIEWED'};
  dialog.innerHTML='<h2>Vista previa · '+esc(candidate.title)+'</h2>'+
    '<p class="tobe-preview-intro">Estás comparando el TO-BE guardado con una propuesta temporal. '+
      'La intervención no modifica el borrador hasta que confirmes. Las ediciones manuales previas de 03.3 '+
      'se guardaron antes de abrir esta ventana; cerrar sólo descarta esta intervención temporal.</p>'+
    (candidate.targetFinding?'<p><b>Hallazgo relacionado:</b> '+esc(candidate.targetFinding)+'</p>':'')+
    (candidate.changeSummary?'<p><b>Intervención:</b> '+esc(candidate.changeSummary)+'</p>':'')+
    (candidate.expectedOutcome?'<p><b>Resultado operativo esperado:</b> '+esc(candidate.expectedOutcome)+'</p>':'')+
    '<div id="tobeAlternativeChanges">'+tobeAlternativeChangesHtml(live,__auneaTobePreview)+'</div>'+
    '<details class="tobe-preview-conditions"><summary>Condiciones que deben verificarse</summary><ul>'+
      (candidate.conditions||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>'+
    '<details class="tobe-subdetails"><summary>Modificar propuesta antes de confirmar</summary><div class="form-grid">'+
      Object.entries(candidate.fields||{}).filter(([key])=>['problemResolved','automationAi','humanSupervision','controlsRisk'].includes(key)).map(([key,value])=>
        tobeField({id:'PREVIEW',transformation:candidate.fields.transformation},key,
          TOBE_AI_REVIEW_FIELDS.find(x=>x[1]===key)?.[2]||key,value,'textarea')
          .replaceAll('data-tobe-item="PREVIEW"','data-tobe-preview-edit="1"')).join('')+
      (candidate.operations||[]).map((operation,index)=>['stepName','problemResolved','controlsRisk'].filter(key=>operation.item?.[key]).map(key=>
        '<div class="field"><label>'+esc(({stepName:'Nombre de la actividad añadida',problemResolved:'Motivo del control',controlsRisk:'Funcionamiento del control'})[key])+
        '</label><textarea data-tobe-preview-operation="'+index+'" data-tobe-preview-key="'+key+'">'+esc(operation.item[key])+'</textarea></div>').join('')).join('')+
    '</div><p class="field-help">Edita únicamente los valores propuestos: el borrador sigue intacto. '+
      'Al editar, se recalculan diferencias, rutas y comprobaciones. Los catálogos se configuran en 03.3.</p></details>'+
    tobeAlternativeRouteChoicesHtml(live,p,candidate)+
    '<details class="tobe-preview-map"'+((candidate.operations||[]).length?' open':'')+'>'+
      '<summary>Mapa TO-BE proyectado'+((candidate.operations||[]).length?' · cambio estructural':
        ' · no cambia la estructura')+'</summary>'+
      '<p class="tobe-muted">Las actividades afectadas se resaltan. Se conservan las rutas SÍ/NO salvo confirmación expresa de una intervención compatible.</p>'+
      '<div id="tobeAlternativeMap">'+tobeCanvasHtml(live,readonly).replaceAll('data-tobe-select=','data-tobe-preview-node=')+'</div></details>'+
    '<div id="tobeAlternativePending">'+tobeAlternativePendingHtml(__auneaTobePreview)+'</div>'+
    '<div id="tobeAlternativeFindings" class="tobe-preview-findings">'+
      tobeAlternativeScopedFindingsHtml(live,__auneaTobePreview)+'</div>'+
    '<div id="tobeAlternativeDecision">'+tobeAlternativeDecisionHtml(__auneaTobePreview)+'</div>'+
    '<div class="tobe-preview-actions"><button type="button" class="btn btn-primary" data-tobe-confirm-alternative="1"'+
      (tobeAlternativeDecisionIssue(__auneaTobePreview)?' disabled':'')+'>Confirmar intervención</button> '+
    '<button type="button" class="btn btn-outline" data-tobe-cancel-alternative="1">Cerrar vista previa sin aplicar</button></div>';
  document.body.appendChild(dialog);dialog.showModal();
  const syncDecisionState=()=>{
    const issue=tobeAlternativeDecisionIssue(__auneaTobePreview);
    const status=dialog.querySelector('.tobe-preview-decision-status');
    if(status)status.textContent=issue||'Lista para confirmar esta intervención en el borrador.';
    dialog.querySelector('[data-tobe-confirm-alternative]').disabled=!!issue;
  };
  const updateDecision=event=>{
    const input=event.target,preview=__auneaTobePreview;
    if(!preview)return false;
    if(input.hasAttribute('data-tobe-preview-note'))preview.consultantNote=input.value;
    else if(input.hasAttribute('data-tobe-preview-ack'))preview.conditionsAcknowledged=input.checked;
    else if(input.hasAttribute('data-tobe-preview-keep-ack'))preview.keepFindingsAcknowledged=input.checked;
    else return false;
    syncDecisionState();return true;
  };
  const refreshAlternativePreview=event=>{
    const input=event.target,preview=__auneaTobePreview;
    if(!preview)return;
    if(input.hasAttribute('data-tobe-preview-edit'))preview.candidate.fields[input.dataset.tobeField]=input.value;
    else if(input.hasAttribute('data-tobe-preview-operation'))preview.candidate.operations[Number(input.dataset.tobePreviewOperation)].item[input.dataset.tobePreviewKey]=input.value;
    else if(input.hasAttribute('data-tobe-preview-route'))
      preview.candidate.operations[Number(input.dataset.tobePreviewRoute)].normalDestination=input.value;
    else return;
    // Editing a traceable suggestion remains an explicit consultant choice.
    preview.candidate.consultantModified=true;
    try{
      const next=tobeProjectAlternative(currentEng(),latestTobe(currentEng()),preview.candidate);
      preview.projected=next.projected;preview.pending=next.pending;
      dialog.querySelector('#tobeAlternativeChanges').innerHTML=
        tobeAlternativeChangesHtml(currentEng(),preview);
      dialog.querySelector('#tobeAlternativePending').innerHTML=tobeAlternativePendingHtml(preview);
      dialog.querySelector('#tobeAlternativeFindings').innerHTML=
        tobeAlternativeScopedFindingsHtml(currentEng(),preview);
      dialog.querySelector('#tobeAlternativeMap').innerHTML=
        tobeCanvasHtml(currentEng(),{...next.projected,status:'REVIEWED'}).replaceAll('data-tobe-select=','data-tobe-preview-node=');
      const changedNodes=new Set([String(preview.candidate.sourceId),
        ...tobeAddedSteps(next.projected).filter(x=>!tobeAddedSteps(latestTobe(currentEng())).some(y=>y.id===x.id)).map(x=>x.id)]);
      dialog.querySelectorAll('#tobeAlternativeMap [data-graph-node]').forEach(node=>{
        node.classList.toggle('tobe-preview-changed',changedNodes.has(node.dataset.graphNode));
      });
      syncDecisionState();
      if(dialog.querySelector('.tobe-preview-map')?.open)
        requestAnimationFrame(()=>drawProcessGraph(dialog.querySelector('#tobeAlternativeMap .process-graph-board')));
    }catch(error){dialog.querySelector('[data-tobe-confirm-alternative]').disabled=true;toast(error.message);}
  };
  dialog.addEventListener('input',event=>{
    if(updateDecision(event))return;
    if(event.target?.hasAttribute?.('data-tobe-preview-route'))return;
    refreshAlternativePreview(event);
  });
  dialog.addEventListener('change',event=>{
    if(updateDecision(event))return;
    if(event.target?.hasAttribute?.('data-tobe-preview-route'))refreshAlternativePreview(event);
  });
  dialog.querySelector('.tobe-preview-map')?.addEventListener('toggle',event=>{
    if(event.target.open)
      requestAnimationFrame(()=>drawProcessGraph(dialog.querySelector('#tobeAlternativeMap .process-graph-board')));
  });
  const changed=new Set([String(candidate.sourceId),...tobeAddedSteps(result.projected).filter(x=>!tobeAddedSteps(p).some(y=>x.id===y.id)).map(x=>x.id)]);
  dialog.querySelectorAll('[data-graph-node]').forEach(node=>{if(changed.has(node.dataset.graphNode))node.classList.add('tobe-preview-changed');});
  dialog.addEventListener('close',()=>{__auneaTobePreview=null;dialog.remove();},{once:true});
  if(dialog.querySelector('.tobe-preview-map')?.open)
    requestAnimationFrame(()=>drawProcessGraph(dialog.querySelector('#tobeAlternativeMap .process-graph-board')));
}
// [AUNEA-FE-PG11-TRANSACTION-332] END