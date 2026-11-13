// C04 · PG11/PG12 — TO-BE is a versioned AUNEA proposal, never a second discovery flow.
const TOBE_TRANSFORMATIONS=Object.freeze(['Se mantiene','Se modifica','Se elimina','Se automatiza','Se asiste con IA','Requiere decisión humana','Se incorpora control']);
const TOBE_PUBLICATION_STATES=Object.freeze(['DRAFT','REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED']);
function tobeHistory(e){return e.tobeProposals||(e.tobeProposals=[])}
function latestTobe(e){const h=e?.tobeProposals||[];return h[h.length-1]||null}
function tobeEditable(p){return !!p&&p.status==='DRAFT'}
function tobeSourceSteps(e){const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;return (snap?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED')}
function createTobeDraft(e){const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;if(!e||!snap)return null;const h=tobeHistory(e),p={version:h.length+1,status:'DRAFT',sourceSnapshotVersion:snap.version,createdAt:now(),updatedAt:now(),items:tobeSourceSteps(e).map((s,i)=>({id:`TOBE-${h.length+1}-${i+1}`,sourceStepId:s.id||'',sourceStepName:s.name||s.step_name||`Paso ${i+1}`,transformation:'',problemResolved:'',futureActor:labelFrom('OS_ACTOR_ROLE',s.actor)||'',tool:labelFrom('OS_TOOL_CATEGORY',s.tool)||'',inputs:Array.isArray(s.inputs)?[...s.inputs]:(s.inputs||[]),outputs:Array.isArray(s.outputs)?[...s.outputs]:(s.outputs||[]),
  _details:{inputs:String(s._details?.inputs||''),outputs:String(s._details?.outputs||'')},automationAi:'',humanSupervision:'',controlsRisk:'',futureTime:'',futureTimeAssumption:''}))};p.flow=tobeFlowOwner(e,p);h.push(p);markDirty(`TO-BE v${p.version} creado como DRAFT desde snapshot confirmado v${snap.version}`);return p}
function nextTobeStatus(p){const i=TOBE_PUBLICATION_STATES.indexOf(p?.status);return i>=0&&i<TOBE_PUBLICATION_STATES.length-1?TOBE_PUBLICATION_STATES[i+1]:null}
// [AUNEA-FE-PG11-REVIEW-GATE-199] START — only canonical source/field readiness, not engine approval.
// SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
// INPUTS: versioned TO-BE DRAFT and confirmed AS-IS; OUTPUT: missing-field reason.
// SIDE_EFFECTS: none. Does not score AI quality or approve for client.
// [AUNEA-FE-PG11-SINGLE-DECISION-356] START
// The sole final decision is TO-BE DRAFT → REVIEWED. Before that,
// a change is authorized only by the existing preview-and-confirm transaction
// or by consultant editing the single owned form. Never copy IA automatically.
// No new questionnaire field, parallel write owner, or changed AS-IS.
// [AUNEA-FE-PG11-REVIEW-GATE-199] Shared semantic presence check for both
// activity preview and publication readiness. No change to accepted values.
function tobeMeaningfulDesignValue(v){
  return !!String(v||'').trim()&&
    !/^(?:no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(String(v).trim());
}
function tobeActivityDesignIssue(item){
  const name=String(item?.sourceStepName||item?.stepName||item?.sourceStepId||'actividad');
  if(!TOBE_TRANSFORMATIONS.includes(item?.transformation))
    return 'Selecciona la transformación futura de '+name+'.';
  if(item.transformation!=='Se elimina'&&!String(item.futureActor||'').trim())
    return 'Indica el responsable futuro de '+name+'.';
  if(!tobeMeaningfulRationale(item.problemResolved))
    return 'Explica el motivo del diseño futuro de '+name+'.';
  if(!['Se mantiene','Se elimina'].includes(item.transformation)){
    if(!tobeMeaningfulDesignValue(item.tool)||!tobeMeaningfulDesignValue(item.controlsRisk)||
       ['inputs','outputs'].some(k=>!tobeArtifactValues(item[k]).resolved.length))
      return 'Completa herramienta, entradas, salidas y controles de '+name+'.';
  }
  if(['Se automatiza','Se asiste con IA'].includes(item.transformation)&&
     (!tobeMeaningfulDesignValue(item.automationAi)||!tobeMeaningfulDesignValue(item.humanSupervision)))
    return 'Describe la automatización y la supervisión humana de '+name+'.';
  if(item.transformation==='Se incorpora control'&&!tobeMeaningfulDesignValue(item.controlsRisk))
    return 'Describe el control y el riesgo que atiende en '+name+'.';
  if(item.transformation==='Requiere decisión humana'&&!tobeMeaningfulDesignValue(item.humanSupervision))
    return 'Define qué debe decidir la persona responsable en '+name+'.';
  return null;
}
// [AUNEA-FE-PG11-SINGLE-DECISION-356] END
function tobeReviewReadiness(e,p){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap||p?.sourceSnapshotVersion!==snap.version)
    return 'El TO-BE no corresponde al AS-IS confirmado vigente. Revisa el origen antes de continuar.';
  const originals=tobeSourceSteps(e);
  if(!Array.isArray(p?.items)||p.items.length!==originals.length||
      new Set(p.items.map(x=>String(x.sourceStepId))).size!==p.items.length||
      p.items.some(x=>!originals.some(y=>String(y.id)===String(x.sourceStepId))))
    return 'Los pasos del TO-BE no coinciden con el AS-IS confirmado; no se puede enviar a revisión.';
  for(const item of p.items){
    const name=item.sourceStepName||item.sourceStepId||'actividad sin identificar';
    if(!TOBE_TRANSFORMATIONS.includes(item.transformation))
      return 'Selecciona una transformación válida para '+name+'.';
    if(item.transformation!=='Se elimina'&&!String(item.futureActor||'').trim())
      return 'Indica el responsable futuro de '+name+' antes de enviar a revisión.';
    if(!tobeMeaningfulRationale(item.problemResolved))
      return 'Completa «'+tobeTransformationRationaleLabel(item.transformation)+
        '» en '+name+' con una justificación concreta; «NO» no es suficiente.';
    if(String(item.futureTime||'').trim()&&!String(item.futureTimeAssumption||'').trim())
      return 'El tiempo futuro de '+name+' requiere un supuesto trazable.';
    if(item.transformation!=='Se elimina'&&['inputs','outputs'].some(k=>
      selectedOtherMissingDetail(fieldOptions('OS_ARTIFACT_TYPE'),
        tobeArtifactValues(item[k]).resolved,item._details?.[k])))
      return 'Completa la descripción de «Otro» en las entradas o salidas de '+name+'.';
  }
  // [AUNEA-FE-PG11-HUMAN-GATE-225] START — SINGLE DECISION OWNER.
  // No mandatory vote on IA proposals: design is decided only through
  // versioned TO-BE fields, preview/confirm operations and final REVIEWED gate.
  // Historical aiDraft.humanReview is retained as evidence, never used as a
  // prerequisite or as an override of current consultant-owned values.
  for(const item of p.items){
    const name=item.sourceStepName||item.sourceStepId||'actividad';
    if(!['Se mantiene','Se elimina'].includes(item.transformation)&&
       (['tool','controlsRisk'].some(k=>!tobeMeaningfulDesignValue(item[k]))||
        ['inputs','outputs'].some(k=>!tobeArtifactValues(item[k]).resolved.length)))
      return 'Completa herramienta, entradas, salidas y controles de '+name+'.';
    if(['Se automatiza','Se asiste con IA'].includes(item.transformation)&&
       (!tobeMeaningfulDesignValue(item.automationAi)||!tobeMeaningfulDesignValue(item.humanSupervision)))
      return 'Describe automatización y supervisión humana de '+name+'.';
    if(item.transformation==='Requiere decisión humana'&&!tobeMeaningfulDesignValue(item.humanSupervision))
      return 'Define qué debe decidir la persona responsable en '+name+'.';
  }
  // [AUNEA-FE-PG11-HUMAN-GATE-225] END
  for(const added of tobeAddedSteps(p)){
    if(!TOBE_TRANSFORMATIONS.includes(added.transformation)||
       ['Se mantiene','Se elimina'].includes(added.transformation))
      return 'Selecciona una transformación aplicable a la actividad nueva '+tobeFlowItemName(added)+'.';
    if(!String(added.stepName||'').trim()||
       !String(added.futureActor||'').trim()||
       !tobeMeaningfulRationale(added.problemResolved))
      return 'Completa nombre, responsable y motivo de la actividad nueva '+tobeFlowItemName(added)+'.';
  }
  const flowIssue=tobeFlowIntegrity(e,p);
  if(flowIssue)return flowIssue;
  // Semantic design constraints complement source and route readiness.
  const blocking=typeof tobeCoherenceFindings==='function'?
    tobeCoherenceFindings(e,p).find(x=>x.severity==='BLOCKING'):null;
  if(blocking)return 'Coherencia de '+blocking.name+': '+blocking.message;
  return null;
}
function advanceTobeStatus(e){
  const p=latestTobe(e),next=nextTobeStatus(p);
  if(!p||!next||next==='PUBLISHED')return false;
  if(p.sourceSnapshotVersion!==confirmedSnapshot(e)?.version){
    toast('El origen AS-IS cambió; no se puede aprobar esta versión TO-BE.');
    return false;
  }
  if(typeof currentDiagnosticOutput==='function'&&!currentDiagnosticOutput(e)){
    toast('El diagnóstico ya no está vigente. Revisa PG10 antes de aprobar TO-BE.');
    return false;
  }
  if(p.status==='DRAFT'){
    const issue=tobeReviewReadiness(e,p);
    if(issue){toast(issue);return false}
  }
  p.status=next;
  p.updatedAt=now();
  markDirty(`TO-BE v${p.version}: ${next}`);
  return true;
}
// [AUNEA-FE-PG11-REVIEW-GATE-199] END
