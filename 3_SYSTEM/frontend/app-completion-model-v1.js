// [AUNEA-FE-DIAG-COMPLETION-070] START — Composed completion model
// PURPOSE: Compose a single branch-aware readiness signal (stages reviewed, required-applicable completion, concrete pending items, engine gates, ready-to-calculate) from the already-canonical gap/gate functions, so no screen computes its own "answered/100"-style denominator again.
// SOURCE: canonicalMissingRequired/questionVisible/effectiveValue (app-no-reask-v1.js); unresolvedEngineGates/ENGINE_GATE_CONTRACT (app-engine-adapter-v1.js); REQ-DIAG-004/006; correction post-revisión #7 (answered/applicable is never the dominant progress metric).
// INPUTS: current engagement (answers, processSteps, frictions, economicInputs, engineGates, confirmedAsIs) and the canonical schema.
// OUTPUTS: engagementCompletion(e) — stagesReviewed/stagesTotal, requiredApplicable/requiredComplete, missing[], evidencePending[], engineGates, readyToCalculate, blockers[], plus stage/overall pct kept as secondary data only.
// SIDE_EFFECTS: none — pure read/derive, no state mutation, no HTTP.
// CHANGE_RISK: HIGH.

const COMPLETION_SKIP_FIELDS=new Set(['DF094','DF095']);

function completionMissingDetail(e){
  return canonicalMissingRequired(e).map(m=>{
    if(m==='Mapa AS-IS')return {type:'ASIS',id:m,label:'Construir el mapa de pasos AS-IS',stage:'S04',navigationTarget:'proceso'};
    if(m==='Confirmación AS-IS')return {type:'ASIS',id:m,label:'Confirmar el flujo AS-IS con el cliente',stage:'S04',navigationTarget:'proceso'};
    const f=(schema?.fields||[]).find(x=>x.Field_ID===m);
    return {type:'FIELD',id:m,label:f?f.Pregunta_o_etiqueta_ES:m,stage:f?f.Stage_ID:null,navigationTarget:'diagnostico'};
  });
}

function completionEvidencePending(e){
  const items=[];
  activeFrictions(e).forEach(f=>{if(!f.evidence_type)items.push({type:'FRICTION',id:f.id,label:f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type)||f.id})});
  (e.economicInputs||[]).forEach(x=>{if(!x.evidence_type)items.push({type:'ECONOMIC',id:x.driver_id||x.pain_id||'input','label':x.driver_id||'Input económico sin driver'})});
  return items;
}

function completionEngineGates(e){
  const unresolved=unresolvedEngineGates(e);
  return {resolvedCount:ENGINE_GATE_CONTRACT.length-unresolved.length,totalCount:ENGINE_GATE_CONTRACT.length,unresolved};
}

function completionBlockers(missing,gateSummary){
  const blockers=missing.map(m=>({type:m.type,id:m.id,label:m.label,stage:m.stage}));
  gateSummary.unresolved.forEach(g=>blockers.push({type:'GATE',id:g.id,label:g.label,stage:null}));
  return blockers;
}

function completionStageReviewed(s,e){
  const fields=(schema?.fields||[]).filter(f=>f.Stage_ID===s.Stage_ID&&questionVisible(f,e));
  if(fields.length)return fields.every(f=>valuePresent(effectiveValue(f,e)));
  return !!e.confirmedAsIs;
}

// Secondary, per-stage/global answered-vs-applicable — never rendered as the dominant metric (correction #7).
function completionStageStats(e){
  const out={};
  (schema?.flow||[]).forEach(s=>{
    const fields=(schema?.fields||[]).filter(f=>f.Stage_ID===s.Stage_ID&&questionVisible(f,e));
    const answered=fields.filter(f=>valuePresent(effectiveValue(f,e))).length;
    out[s.Stage_ID]={applicable:fields.length,answered,pct:fields.length?Math.round(answered/fields.length*100):100};
  });
  return out;
}
function completionOverallStats(e){
  const fields=(schema?.fields||[]).filter(f=>questionVisible(f,e));
  const answered=fields.filter(f=>valuePresent(effectiveValue(f,e))).length;
  return {applicable:fields.length,answered,pct:fields.length?Math.round(answered/fields.length*100):100};
}

function engagementCompletion(e){
  const requiredFields=(schema?.fields||[]).filter(f=>f.Requiredness==='REQUIRED_90M'&&!COMPLETION_SKIP_FIELDS.has(f.Field_ID)&&questionVisible(f,e));
  const requiredComplete=requiredFields.filter(f=>valuePresent(effectiveValue(f,e))).length;
  const missing=completionMissingDetail(e);
  const engineGatesSummary=completionEngineGates(e);
  const stagesTotal=(schema?.flow||[]).length;
  const stagesReviewed=(schema?.flow||[]).filter(s=>completionStageReviewed(s,e)).length;
  return {
    stagesReviewed,
    stagesTotal,
    requiredApplicable:requiredFields.length,
    requiredComplete,
    missing,
    evidencePending:completionEvidencePending(e),
    engineGates:engineGatesSummary,
    readyToCalculate:missing.length===0&&engineGatesSummary.unresolved.length===0,
    blockers:completionBlockers(missing,engineGatesSummary),
    stage:completionStageStats(e),
    overall:completionOverallStats(e)
  };
}
// [AUNEA-FE-DIAG-COMPLETION-070] END
