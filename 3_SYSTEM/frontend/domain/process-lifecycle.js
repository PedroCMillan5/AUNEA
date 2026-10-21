// [AUNEA-FE-PROC-LIFECYCLE-030] START — Trazabilidad y confirmación AS-IS
// PURPOSE: Own lifecycle-only actions for Process Steps/Friction records and AS-IS confirmation, separate from editors and engine adapters.
// SOURCE: Process/Friction Models; DEC-033/040.
// INPUTS: current Engagement, step/friction ids and explicit consultant confirmation.
// OUTPUTS: SUPERSEDED lifecycle state and AS-IS confirmation state.
// SIDE_EFFECTS: engagement state mutation, audit/dirty state and DOM re-render.
// CHANGE_RISK: HIGH.
function supersedeStep(stepId){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),x=e.processSteps.find(s=>s.id===stepId);
  if(!x)return;
  if(!confirm('¿Eliminar este paso del flujo? Se retirará inmediatamente del mapa y se limpiarán sus referencias activas.'))return;
  x.status='SUPERSEDED';
  (e.processSteps||[]).filter(s=>s.status!=='SUPERSEDED').forEach(s=>{
    if(s.normal_next_step===stepId)s.normal_next_step='';
    if(s.exception_path?.destination_step===stepId)s.exception_path={...s.exception_path,destination_step:''};
  });
  (e.frictions||[]).filter(fr=>fr.status!=='SUPERSEDED').forEach(fr=>{
    fr.affected_steps=normalizeArray(fr.affected_steps).filter(id=>id!==stepId);
    if(fr.time_attribution?.step_id===stepId)fr.time_attribution={mode:'',step_id:''};
    if(!fr.affected_steps.length)fr.status='SUPERSEDED';
  });
  (e.risks||[]).forEach(r=>r.step_ids=normalizeArray(r.step_ids).filter(id=>id!==stepId));
  (e.economicInputs||[]).forEach(v=>v.step_ids=normalizeArray(v.step_ids).filter(id=>id!==stepId));
  const details=e.answerDetails||(e.answerDetails={});
  Object.keys(details).forEach(k=>{
    if(/^DF\d{3}__step$/.test(k)&&String(details[k])===String(stepId))details[k]='';
    if(/^DF\d{3}__steps$/.test(k))details[k]=normalizeArray(details[k]).filter(id=>String(id)!==String(stepId));
  });
  Object.keys(e.answers||{}).forEach(fid=>{
    const f=(schema?.fields||[]).find(x=>x.Field_ID===fid),control=String(f?.Control_UI||'').toUpperCase(),value=e.answers[fid];
    if(control==='STEP_PAIR_SELECTOR'&&value&&typeof value==='object'&&(String(value.from||'')===String(stepId)||String(value.to||'')===String(stepId)))e.answers[fid]='';
    if(control==='STEP_SYSTEM_PAIR_SELECTOR')e.answers[fid]=normalizeArray(value).filter(token=>!String(token).split(':').includes(String(stepId)));
  });
  invalidateProcessLayers(e,'map');markDirty(`Paso ${stepId} eliminado del flujo y referencias activas conciliadas`);render();
}

function supersedeFriction(frId){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),x=e.frictions.find(s=>s.id===frId);
  if(!x)return;
  if(!confirm('La fricción quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;
  x.status='SUPERSEDED';if(Array.isArray(e.answers?.DF096))e.answers.DF096=e.answers.DF096.filter(id=>id!==frId);invalidateProcessLayers(e,'frictions');markDirty(`Fricción ${frId} superseded`);render();
}

function processLayerConfirmations(e){
  if(!e.layerConfirmations)e.layerConfirmations={map:false,frictions:false,risks:false,impact:false};
  return e.layerConfirmations;
}
function processLayerKey(tab){return tab==='fricciones'?'frictions':tab==='riesgos'?'risks':tab==='impacto'?'impact':'map'}
function allProcessLayersConfirmed(e){const x=processLayerConfirmations(e);return !!(x.map&&x.frictions&&x.risks&&x.impact)}

function processLayerIntegrityIssues(e,key){
  if(!e)return [{layer:key||'map',message:'No hay un estudio activo.'}];
  const steps=typeof activeSteps==='function'?activeSteps(e):(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const stepIds=new Set(steps.map(x=>x.id)),issues=[];
  const push=message=>issues.push({layer:key,message});
  if(key==='map'){
    steps.forEach((s,i)=>{
      if(!s.step_name||String(s.step_name).trim().length<3||!s.step_type||!s.actor)push(`Completa nombre, tipo y responsable del paso ${i+1}.`);
      const checkDest=(dest,label)=>{
        if(dest&&dest!=='__END__'&&!stepIds.has(dest))push(`${label} de "${s.step_name||'Paso '+(i+1)}" apunta a un paso que ya no está activo.`);
      };
      checkDest(s.normal_next_step,'El destino principal');
      if(s.exception_path)checkDest(s.exception_path.destination_step,'El destino alternativo');
      if(typeof processDecisionStep==='function'&&processDecisionStep(s)&&(!s.normal_next_step||!s.exception_path?.destination_step))
        push(`La decisión "${s.step_name||'Paso '+(i+1)}" necesita destino en ambas rutas.`);
      const er=s.error_rate&&typeof s.error_rate==='object'?s.error_rate:null;
      if(er?.mode==='percent'&&Number(er.value)>100)push(`El porcentaje de error de "${s.step_name||'Paso '+(i+1)}" debe estar entre 0 y 100.`);
      if(er?.mode==='count'&&Number(er.value)>0&&!er.period)push(`La frecuencia en casos de "${s.step_name||'Paso '+(i+1)}" necesita periodo.`);
    });
  }
  // [AUNEA-FE-ASIS-GRAPH-INTEGRITY-077] START — Persisted routing validation
  // SOURCE: Diagnostic Master DF042/043; DEC-050/065. Only branched maps require
  // explicit links for each step; purely linear maps retain ordered-step semantics.
  // No UI projection or guessed successor is used to validate the stored graph.
  if(key==='map'&&steps.length&&typeof processDecisionStep==='function'&&steps.some(processDecisionStep)){
    const byId=new Map(steps.map(s=>[s.id,s]));
    const destinations=s=>processDecisionStep(s)?[s.normal_next_step,s.exception_path?.destination_step]:[s.normal_next_step];
    const nextOf=s=>destinations(s).filter(x=>byId.has(x));
    steps.forEach((s,i)=>{
      if(!s.normal_next_step)push(`El paso ${i+1} («${s.step_name||s.id}») necesita un destino principal persistido o Fin del proceso.`);
    });
    const reachable=new Set(),toVisit=[steps[0].id];
    while(toVisit.length){
      const id=toVisit.pop();if(reachable.has(id))continue;
      reachable.add(id);const s=byId.get(id);
      if(s)toVisit.push(...nextOf(s).filter(x=>!reachable.has(x)));
    }
    steps.filter(s=>!reachable.has(s.id)).forEach(s=>push(`El paso «${s.step_name||s.id}» es inalcanzable desde el inicio del proceso.`));
    const reachesEnd=new Set(steps.filter(s=>destinations(s).includes('__END__')).map(s=>s.id));
    let changed=true;
    while(changed){
      changed=false;
      steps.forEach(s=>{
        if(reachesEnd.has(s.id))return;
        if(nextOf(s).some(id=>reachesEnd.has(id))){reachesEnd.add(s.id);changed=true}
      });
    }
    if(!reachesEnd.has(steps[0].id))push('El proceso no tiene una ruta persistida desde el inicio hasta Fin.');
    steps.filter(s=>reachable.has(s.id)&&!reachesEnd.has(s.id)).forEach(s=>push(`El paso «${s.step_name||s.id}» no dispone de una ruta de salida que alcance Fin.`));
  }
  // [AUNEA-FE-ASIS-GRAPH-INTEGRITY-077] END
  if(key==='frictions'){
    const frictions=typeof activeFrictions==='function'?activeFrictions(e):(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED');
    frictions.forEach((fr,i)=>{
      const ids=normalizeArray(fr.affected_steps).filter(Boolean);
      if(!fr.friction_type||!ids.length||!normalizeArray(fr.cause).length&&!fr?._details?.cause||!String(fr.observable_signal||'').trim())
        push(`Completa tipo, pasos, causa y señal observable de la fricción ${i+1}.`);
      if(ids.some(id=>!stepIds.has(id)))push(`La fricción "${fr.client_label||fr.friction_type||i+1}" referencia un paso que ya no está activo.`);
      if(Number(fr.active_time_loss?.value||0)>0&&(!['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(fr.time_attribution?.mode)||!ids.includes(fr.time_attribution?.step_id)))
        push(`El tiempo de la fricción "${fr.client_label||fr.friction_type||i+1}" necesita relación y paso responsable válidos.`);
      if(fr.frequency?.mode==='percent'&&(Number(fr.frequency?.value)<0||Number(fr.frequency?.value)>100))push(`La frecuencia porcentual de la fricción "${fr.client_label||fr.friction_type||i+1}" debe estar entre 0 y 100.`);
      if(fr.frequency?.mode==='count'&&Number(fr.frequency?.value)>0&&!fr.frequency?.period)push(`La frecuencia en casos de la fricción "${fr.client_label||fr.friction_type||i+1}" necesita periodo.`);
    });
  }
  if(key==='risks'){
    const risks=e.risks||[],riskBranch=typeof branchActive==='function'?branchActive('BR-RISK',e):risks.length>0;
    if(riskBranch&&!risks.length)push('El contexto activa la revisión de riesgo: registra el riesgo concreto antes de confirmar esta capa.');
    risks.forEach((r,i)=>{
      const like=Number(r.likelihood_1_5),impact=Number(r.impact_1_5);
      if(!r.category||!String(r.description||'').trim()||!Number.isInteger(like)||like<1||like>5||!Number.isInteger(impact)||impact<1||impact>5)
        push(`Completa categoría, descripción, probabilidad e impacto del riesgo ${i+1}.`);
      if(!String(r.reversibility||'').trim())push(`Indica la reversibilidad del riesgo "${r.description||i+1}".`);
      if(typeof r.controls_present!=='boolean')push(`Indica si existen controles actuales para el riesgo "${r.description||i+1}".`);
      if(r.controls_present===true&&!normalizeArray(r.current_control).length)push(`Selecciona los controles actuales del riesgo "${r.description||i+1}".`);
      if(typeof r.sensitive_or_high_impact!=='boolean'||typeof r.material_financial_or_compliance!=='boolean'||typeof r.critical_trigger!=='boolean')
        push(`Completa las condiciones de sensibilidad, materialidad y criticidad del riesgo "${r.description||i+1}".`);
      const riskSteps=normalizeArray(r.step_ids).filter(Boolean);
      if(stepIds.size&&!riskSteps.length)push(`El riesgo "${r.description||i+1}" debe estar vinculado al menos a un paso activo.`);
      if(riskSteps.some(id=>!stepIds.has(id)))push(`El riesgo "${r.description||i+1}" referencia un paso que ya no está activo.`);
    });
  }
  if(key==='impact'){
    (e.economicInputs||[]).forEach((x,i)=>{
      if(typeof economicRecordCompletenessIssues==='function')economicRecordCompletenessIssues(x,i).forEach(push);
      else{
        if(!x.driver_id)push(`Selecciona el tipo de impacto del registro ${i+1}.`);
        if(!x.evidence_type)push(`Selecciona la evidencia del impacto ${i+1}.`);
      }
      const impactSteps=normalizeArray(x.step_ids).filter(Boolean);
      if(stepIds.size&&!impactSteps.length)push(`El impacto ${i+1} debe estar vinculado al menos a un paso activo.`);
      if(impactSteps.some(id=>!stepIds.has(id)))push(`El impacto ${i+1} referencia un paso que ya no está activo.`);
      if(x.pain_id){
        const linkedPains=new Set((typeof activeFrictions==='function'?activeFrictions(e):(e.frictions||[]).filter(f=>f.status!=='SUPERSEDED'))
          .filter(fr=>normalizeArray(fr.affected_steps).some(id=>impactSteps.includes(id)))
          .map(fr=>String(fr.derived_pain_id||fr.friction_type||'')));
        if(!linkedPains.has(String(x.pain_id)))push(`El impacto ${i+1} está asociado a un problema que no existe en los pasos seleccionados.`);
      }
    });
    if(typeof economicInputIntegrityIssues==='function')economicInputIntegrityIssues(e).forEach(x=>push(x.message));
  }
  const stageByLayer={map:'S04',frictions:'S05',risks:'S06',impact:'S07'},stageId=stageByLayer[key];
  if(stageId&&typeof canonicalFieldRequiredNow==='function'){
    (schema?.fields||[]).filter(f=>f.Stage_ID===stageId&&canonicalFieldRequiredNow(f,e)).forEach(f=>{
      if(!(typeof canonicalFieldValuePresent==='function'?canonicalFieldValuePresent(f,effectiveValue(f,e),e):valuePresent(effectiveValue(f,e))))
        push(`Completa "${f.Pregunta_o_etiqueta_ES||f.Field_ID}" antes de confirmar esta capa.`);
    });
  }
  if(stageId&&typeof canonicalFieldIntegrityIssues==='function'){
    canonicalFieldIntegrityIssues(e).filter(x=>x.stage===stageId).forEach(x=>push(x.label));
  }
  return issues;
}
function captureIntegrityIssues(e){
  const out=[];
  ['map','frictions','risks','impact'].forEach(k=>out.push(...processLayerIntegrityIssues(e,k)));
  if(typeof canonicalFieldIntegrityIssues==='function')out.push(...canonicalFieldIntegrityIssues(e).map(x=>({...x,layer:'fields',message:x.label})));
  return out;
}

// [AUNEA-FE-ASIS-CONSISTENCY-076] START — Validación de coherencia previa al cierre de PG09
// PURPOSE: Surface already-governed capture/integrity contradictions before sealing DF093, grouped as
//          blockers, review items and information, without creating a second owner or a new diagnostic question.
// SOURCE: Diagnostic Master v1.2; DEC-049/050/052/065/068; PROJECT_RULES single-owner/no-reask.
// INPUTS: current Engagement, existing layer integrity, canonical requiredness/completion and reused values.
// OUTPUTS: ephemeral review items with severity + navigation target; blockers prevent PG09 closure.
// SIDE_EFFECTS: none. No persistence, no engine calculation and no new business field.
// CHANGE_RISK: HIGH.
const CONSISTENCY_LAYER_STAGE=Object.freeze({map:'S04',frictions:'S05',risks:'S06',impact:'S07'});
function consistencyValueSignature(v){
  if(Array.isArray(v))return JSON.stringify(v.map(consistencyValueSignature).sort());
  if(v&&typeof v==='object')return JSON.stringify(Object.keys(v).sort().reduce((o,k)=>(o[k]=consistencyValueSignature(v[k]),o),{}));
  return JSON.stringify(v);
}
// [AUNEA-FE-ASIS-PARTICIPANTS-078] START — S02 participants versus actual ProcessStep actors
// SOURCE: Diagnostic Master DF017; DEC-050; ProcessStep.Actor; no automated scope inference.
// An old manual DF017 selection may include contextual stakeholders, so differences require human review.
function processParticipantsScopeReview(e){
  const steps=(e?.processSteps||[]).filter(s=>s&&s.status!=='SUPERSEDED');
  const declared=normalizeArray(e?.answers?.DF017).map(v=>String(v??'').trim()).filter(Boolean);
  const mapped=steps.map(s=>String(s.actor??'').trim()).filter(Boolean);
  if(!declared.length||!mapped.length)return null;
  const a=[...new Set(declared)],b=[...new Set(mapped)];
  const onlyDeclared=a.filter(v=>!b.includes(v)),onlyMapped=b.filter(v=>!a.includes(v));
  const review=e?.answerDetails?.DF017__final_scope_confirmation;
  const fingerprint=JSON.stringify({declared:[...a].sort(),mapped:[...b].sort()});
  if(review?.fingerprint===fingerprint)return null;
  return onlyDeclared.length||onlyMapped.length?{onlyDeclared,onlyMapped}:null;
}
// [AUNEA-FE-ASIS-PARTICIPANTS-078] END
// [AUNEA-FE-ASIS-SCOPE-079] START — Evidence-backed scope ↔ map review
// PURPOSE: flag traceable inconsistencies before AS-IS signoff without pretending that
// lexical similarity proves a business process is (in)correct.
// SOURCE: Diagnostic Master DF011/014/015/031; DEC-050/065/073; PROJECT_RULES.
// INPUTS: confirmed scope text, legacy process label, active step labels and routing.
// OUTPUTS: review signals + a version-bound explicit review marker, never new facts.
// SIDE_EFFECTS: none in review function; marker written only after user confirmation.
// CHANGE_RISK: HIGH. THIS IS REVIEW GRADE ONLY, NOT A DIAGNOSTIC ACCURACY CLAIM.
const AUNEA_SCOPE_REVIEW_STOPWORDS=new Set([
  'gestion','proceso','procesos','servicio','servicios','soporte','operacion','operaciones',
  'recepcion','registro','registrar','aprobacion','aprobar','validacion','validar',
  'tramitacion','seguimiento','clasificacion','control','revision','cierre',
  'inicio','final','alta','datos','tareas','responsable','responsables','empresa','empresas',
  'cliente','clientes','usuario','usuarios','realizar','completar','mediante',
  'documento','documentos','fase','desde','hasta','tras','para','con','del','las','los',
  'email','correo','recibido','recibida','recibir','enviado','enviada'
]);
function scopeReviewTokens(value){
  const txt=String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return [...new Set((txt.match(/[a-z]{4,}/g)||[]).map(word=>{
    if(word.endsWith('es')&&word.length>=8)return word.slice(0,-2);
    if(word.endsWith('s')&&word.length>=6)return word.slice(0,-1);
    return word;
  }).filter(word=>word.length>=4&&!AUNEA_SCOPE_REVIEW_STOPWORDS.has(word)))];
}
function processScopeReviewFingerprint(e){
  const active=(e?.processSteps||[]).filter(s=>s&&s.status!=='SUPERSEDED');
  return JSON.stringify({declared:e?.answers?.DF011||'',legacy:e?.processName||'',
    start:e?.answers?.DF014||'',end:e?.answers?.DF015||'',
    steps:active.map(s=>[s.id,s.step_name,s.step_type,s.normal_next_step,s.exception_path?.destination_step||''])});
}
function processScopeReviewSignals(e){
  if(!e)return [];
  const declared=String(e.answers?.DF011||'').trim(),legacy=String(e.processName||'').trim();
  const scope=[declared,String(e.answers?.DF014||''),String(e.answers?.DF015||'')];
  const steps=(e.processSteps||[]).filter(s=>s&&s.status!=='SUPERSEDED');
  const signals=[];
  if(declared&&legacy&&declared.toLocaleLowerCase('es')!==legacy.toLocaleLowerCase('es')){
    signals.push({code:'SCOPE_NAME_SOURCE_DISAGREEMENT',stage:'S02',
      message:'El nombre del proceso definido en Alcance difiere del nombre histórico del estudio. Comprueba qué denominación corresponde a los pasos reales; ninguna se sobrescribirá automáticamente.',
      evidence:{DF011:declared,legacy_processName:legacy}});
  }
  // Only signal missing continuity when a non-generic term independently appears
  // in at least TWO scope fields but nowhere in the named process steps.
  // This is a prompt for human review: synonyms and cross-domain workflows exist.
  if(steps.length>=2){
    const occurrences=new Map();
    scope.forEach((text,i)=>scopeReviewTokens(text).forEach(word=>{
      const at=occurrences.get(word)||new Set();at.add(i);occurrences.set(word,at);
    }));
    const mapped=new Set(steps.flatMap(s=>scopeReviewTokens(s.step_name)));
    const absent=[...occurrences].filter(([w,locations])=>locations.size>=2&&!mapped.has(w)).map(([w])=>w);
    if(absent.length)signals.push({code:'SCOPE_MAP_TOPIC_NOT_VISIBLE',stage:'S04',
      message:'El alcance repite '+absent.map(x=>'«'+x+'»').join(', ')+' pero esos términos no aparecen en los nombres de los pasos. Comprueba si el mapa corresponde al mismo proceso. Puede tratarse de sinónimos; no se ha inferido ningún hecho.',
      evidence:{repeated_scope_terms:absent,DF011:declared,DF014:e.answers?.DF014||'',DF015:e.answers?.DF015||'',step_names:steps.map(s=>s.step_name)}});
  }
  return signals;
}
function scopeReviewAcknowledged(e){
  return e?.answerDetails?.DF011__scope_map_review?.fingerprint===processScopeReviewFingerprint(e);
}
// [AUNEA-FE-ASIS-SCOPE-079] END
function preCloseConsistencyReview(e,completion){
  const items=[],seen=new Set();
  const add=(severity,code,message,stage='',navigationTarget='')=>{
    const text=String(message||'').trim();if(!text)return;
    const key=severity+'|'+text.toLowerCase();if(seen.has(key))return;
    seen.add(key);items.push({severity,code,message:text,stage,navigationTarget:navigationTarget||(stage?'stage':'')});
  };
  if(!e){
    add('BLOCKER','NO_ENGAGEMENT','No hay un estudio activo para validar.');
    return {items,blockers:items,reviews:[],information:[],clear:false};
  }
  const layers=typeof processLayerConfirmations==='function'?processLayerConfirmations(e):(e.layerConfirmations||{});
  Object.entries(CONSISTENCY_LAYER_STAGE).forEach(([layer,stage])=>{
    if(!layers[layer])add('BLOCKER','LAYER_'+layer.toUpperCase(),'Falta confirmar la capa '+({map:'Mapa AS-IS',frictions:'Fricciones',risks:'Riesgos',impact:'Impacto'}[layer]||layer)+'. Revisa los registros y pulsa Confirmar en esta página. La confirmación valida la capa; el snapshot se genera al confirmar el cierre final.',stage);
  });
  (typeof captureIntegrityIssues==='function'?captureIntegrityIssues(e):[]).forEach((x,i)=>{
    const stage=x.stage||CONSISTENCY_LAYER_STAGE[x.layer]||'';
    add('BLOCKER','INTEGRITY_'+i,x.message||x.label,stage);
  });

  const comp=completion||(typeof engagementCompletion==='function'?engagementCompletion(e):null);
  (comp?.blockers||[]).filter(b=>b.type!=='GATE'&&b.id!=='Confirmación AS-IS'&&b.id!=='DF093').forEach((b,i)=>{
    add('BLOCKER','COMPLETION_'+i,b.label||'Queda un dato obligatorio pendiente.',b.stage||'',b.navigationTarget||'');
  });
  if(!comp&&typeof canonicalMissingRequired==='function'){
    canonicalMissingRequired(e).filter(id=>id!=='DF093'&&id!=='Confirmación AS-IS').forEach((id,i)=>{
      const field=(schema?.fields||[]).find(f=>f.Field_ID===id);
      add('BLOCKER','REQUIRED_'+i,'Falta completar "'+(field?.Pregunta_o_etiqueta_ES||'el dato pendiente')+'".',field?.Stage_ID||'');
    });
  }

  // Detect stale duplicate answers only where the runtime already owns a reusable/derived source.
  // It is a review item, not an automatic overwrite: the consultant corrects the canonical owner.
  if(typeof reusedValue==='function'&&typeof valuePresent==='function'){
    ['DF046','DF047','DF049','DF050','DF066','DF067','DF078','DF079'].forEach(fid=>{
      const explicit=e.answers?.[fid],reuse=reusedValue(fid,e);
      if(valuePresent(explicit)&&valuePresent(reuse)&&consistencyValueSignature(explicit)!==consistencyValueSignature(reuse)){
        const field=(schema?.fields||[]).find(f=>f.Field_ID===fid);
        const describe=v=>typeof formatContextValue==='function'&&field?formatContextValue(field,v):normalizeArray(v).map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(', ');
        add('BLOCKER','SOURCE_CONFLICT_'+fid,'"'+(field?.Pregunta_o_etiqueta_ES||'el dato revisado')+'": la respuesta guardada indica «'+describe(explicit)+'»; la fuente reutilizada indica «'+describe(reuse)+'». Revisa esa sección y corrige el dato de origen para que ambas representen el mismo proceso.',field?.Stage_ID||'');
      }
    });
  }

  // DF017 can be a previous manual scope list. Do not silently replace it with step actors.
  // Contextual participants may legitimately differ from actual owners; surface both for review.
  const participantGap=processParticipantsScopeReview(e);
  if(participantGap){
    const roleNames=values=>values.map(value=>labelFrom('OS_ACTOR_ROLE',value)||value).join(', ');
    const sides=[
      participantGap.onlyDeclared.length?'Declarados en alcance sin paso asignado: '+roleNames(participantGap.onlyDeclared)+'.':'',
      participantGap.onlyMapped.length?'Responsables del mapa ausentes del alcance inicial: '+roleNames(participantGap.onlyMapped)+'.':''
    ].filter(Boolean).join(' ');
    add('BLOCKER','DF017_PARTICIPANT_SCOPE','Los equipos declarados en Alcance y los responsables del mapa difieren. '+sides+' Selecciona y confirma el listado final en Validación y cierre. No se modifica ningún valor automáticamente.','S09');
  }

  // [AUNEA-FE-ASIS-SCOPE-079] Mandatory explicit review of scope-map warning.
  const scopeSignals=processScopeReviewSignals(e);
  if(scopeSignals.length){
    const ack=scopeReviewAcknowledged(e);
    scopeSignals.forEach(signal=>add(ack?'REVIEW':'BLOCKER',signal.code,
      (ack?'Revisión de alcance confirmada, permanece trazada: ':'Pendiente de revisión explícita de alcance: ')+signal.message,
      signal.stage||'S04'));
  }

  if(e._sessionTimeProjection&&typeof economicTimeRequest==='function'){
    const currentKey=JSON.stringify(economicTimeRequest(e));
    if(e._sessionTimeProjection.requestKey&&e._sessionTimeProjection.requestKey!==currentKey)
      add('BLOCKER','STALE_TIME_PROJECTION','La proyección temporal corresponde a una versión anterior del AS-IS. Recalcula el impacto antes de cerrar el AS-IS.','S07');
  }

  if(typeof effectiveValue==='function'){
    const evidenceField=(schema?.fields||[]).find(f=>f.Field_ID==='DF095');
    const pending=evidenceField?effectiveValue(evidenceField,e):[];
    normalizeArray(pending).filter(label=>label&&label!=='No hay evidencias pendientes').forEach((label,i)=>
      add('REVIEW','EVIDENCE_'+i,'Evidencia pendiente: '+String(label)+'. Solicita el soporte y vincúlalo al registro correspondiente. Se puede cerrar la sesión, pero el análisis conserva la incertidumbre hasta recibirlo.','S09'));
  }

  if(!items.length)add('INFO','CONSISTENT','No se detectan incoherencias estructurales ni datos obligatorios pendientes.');
  return {
    items,
    blockers:items.filter(x=>x.severity==='BLOCKER'),
    reviews:items.filter(x=>x.severity==='REVIEW'),
    information:items.filter(x=>x.severity==='INFO'),
    clear:!items.some(x=>x.severity==='BLOCKER')
  };
}
// [AUNEA-FE-ASIS-CONSISTENCY-076] END
function invalidateProcessLayers(e,from='map'){
  const x=processLayerConfirmations(e),order=['map','frictions','risks','impact'],i=Math.max(0,order.indexOf(from));
  order.slice(i).forEach(k=>x[k]=false);
  e.confirmedAsIs=false;e.answers.DF093='';e.asIsConfirmedAt=null;e.confirmedSnapshot=null;
  // Keep immutable snapshot history, but invalidate all outputs derived from the superseded confirmation.
  if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'cambio en capa AS-IS: '+from);
}
function confirmProcessLayer(tab){
  // La ventana compartida nunca firma las capas: sólo captura y navega.
  if(typeof isProcessEditorWindow==='function'&&isProcessEditorWindow())return false;
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng();if(!e)return;
  const key=processLayerKey(tab);
  if(key==='map'){
    const start=e.answers?.DF014,finish=e.answers?.DF015,hasActive=(e.processSteps||[]).some(x=>x.status!=='SUPERSEDED');
    if((!start||!finish)&&!hasActive)return toast('Define los límites inicial y final o añade al menos un paso antes de confirmar el mapa.');
  }
  const integrity=processLayerIntegrityIssues(e,key);if(integrity.length)return toast('No se puede confirmar: '+integrity[0].message),false;
  // [AUNEA-FE-ASIS-SCOPE-079] Review before map sign-off, version-bound and auditable.
  const oldScopeReview=e.answerDetails?.DF011__scope_map_review;
  const oldScopeAudit=typeof state!=='undefined'&&Array.isArray(state.audit)?[...state.audit]:null;
  let scopeReviewWasChanged=false;
  if(key==='map'){
    const signals=processScopeReviewSignals(e);
    if(signals.length){
      const steps=activeSteps(e);
      const message=[
        'REVISIÓN DEL ALCANCE ANTES DE CONFIRMAR EL MAPA',
        'Proceso declarado: '+String(e.answers?.DF011||'—'),
        'Comienza: '+String(e.answers?.DF014||'—'),
        'Termina: '+String(e.answers?.DF015||'—'),
        'Primer paso: '+String(steps[0]?.step_name||'—'),
        'Último paso: '+String(steps[steps.length-1]?.step_name||'—'),
        '',...signals.map(x=>'ALERTA: '+x.message),
        '', '¿Has comprobado expresamente que el alcance y TODOS los pasos describen el mismo proceso?',
        'Cancelar: vuelve a Alcance o al Mapa y corrige la información.',
        'Aceptar: confirma la revisión humana y registra la versión exacta revisada.'
      ].join('\n');
      if(typeof confirm!=='function'||!confirm(message))return false;
      const details=e.answerDetails||(e.answerDetails={});
      details.DF011__scope_map_review={fingerprint:processScopeReviewFingerprint(e),
        at:typeof now==='function'?now():null,signals:signals.map(x=>x.code)};
      scopeReviewWasChanged=true;
      if(typeof audit==='function')audit('Revisión explícita de coherencia Alcance/Mapa: '+signals.map(x=>x.code).join(', '));
    }
  }
  const x=processLayerConfirmations(e);
  const before={
    layers:{...x},confirmedAsIs:e.confirmedAsIs,df093:e.answers?.DF093,
    asIsConfirmedAt:e.asIsConfirmedAt,confirmedSnapshot:e.confirmedSnapshot,dirty:state.dirty
  };
  x[key]=true;x[key+'_at']=now();
  const all=allProcessLayersConfirmed(e);
  if(all){
    // Layer validation only unlocks PG09; its final snapshot requires a separate action.
    e.confirmedAsIs=false;e.answers.DF093='';e.asIsConfirmedAt=null;e.confirmedSnapshot=null;
  }
  markDirty(all?'Capas AS-IS confirmadas · cierre final pendiente en PG09':`Capa ${key} confirmada`);
  // A client acknowledgement is a durable event. Never display success if this tab
  // could not persist the shared Engagement due to a second-editor conflict.
  if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('confirmación capa '+key)){
    Object.keys(x).forEach(k=>delete x[k]);Object.assign(x,before.layers);
    e.confirmedAsIs=before.confirmedAsIs;
    if(before.df093===undefined)delete e.answers.DF093;else e.answers.DF093=before.df093;
    e.asIsConfirmedAt=before.asIsConfirmedAt;e.confirmedSnapshot=before.confirmedSnapshot;
    if(scopeReviewWasChanged){
      if(oldScopeReview===undefined)delete e.answerDetails.DF011__scope_map_review;
      else e.answerDetails.DF011__scope_map_review=oldScopeReview;
      if(oldScopeAudit)state.audit=oldScopeAudit;
    }
    state.dirty=before.dirty;
    toast('La confirmación no se ha guardado. Revisa la sincronización de la otra pestaña antes de continuar.');
    render();return false;
  }
  toast(all
    ?'Mapa, fricciones, riesgos e impacto confirmados. Continúa a Validación y cierre para generar el snapshot.'
    :'Capa confirmada y guardada. Puedes continuar con la siguiente.');
  render();
  return true;
}
function confirmAsIs(){confirmProcessLayer(currentEng()?.processTab||'cliente')}
function invalidateAsIsClosure(e,reason='cambio en cierre de sesión'){
  if(!e||!e.confirmedAsIs)return false;
  e.confirmedAsIs=false;e.answers.DF093='';e.asIsConfirmedAt=null;e.confirmedSnapshot=null;
  if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,reason);
  return true;
}
function confirmClosingAsIs(){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng();if(!e)return;
  if(e.confirmedAsIs&&typeof confirmedSnapshot==='function'&&confirmedSnapshot(e))return true;
  const pending=['map','frictions','risks','impact'].filter(k=>!processLayerConfirmations(e)[k]);
  if(pending.length)return toast('Completa la confirmación de las cuatro capas AS-IS antes del cierre.'),false;
  const integrity=captureIntegrityIssues(e);
  if(integrity.length)return toast('No se puede cerrar el AS-IS: '+integrity[0].message),false;
  const review=preCloseConsistencyReview(e);
  if(review.blockers.length)return toast('No se puede cerrar el AS-IS: '+review.blockers[0].message),false;
  // PG09 is a transactional boundary: if durable persistence fails, neither the final confirmation,
  // the sealed handoff snapshot nor the lifecycle transition may remain active only in memory.
  const before={
    confirmedAsIs:e.confirmedAsIs,
    df093:e.answers?.DF093,
    asIsConfirmedAt:e.asIsConfirmedAt??null,
    confirmedSnapshot:e.confirmedSnapshot??null,
    status:e.status,
    lifecycleLog:[...(e.lifecycleLog||[])],
    confirmedSnapshots:[...(e.confirmedSnapshots||[])],
    dirty:state.dirty,
    audit:[...(state.audit||[])]
  };
  const ts=now();e.confirmedAsIs=true;e.answers.DF093='YES';e.asIsConfirmedAt=ts;
  const sealed=typeof sealConfirmedSnapshot==='function'?sealConfirmedSnapshot(e,'confirmación final S09 del AS-IS enriquecido'):null;
  markDirty(sealed?`AS-IS confirmado en cierre · snapshot v${sealed.version}`:'AS-IS confirmado en cierre');
  // Do not rely only on the delayed autosave installed by persistence.js.
  if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('cierre S09 confirmado')){
    e.confirmedAsIs=before.confirmedAsIs;
    if(before.df093===undefined)delete e.answers.DF093;else e.answers.DF093=before.df093;
    e.asIsConfirmedAt=before.asIsConfirmedAt;
    e.confirmedSnapshot=before.confirmedSnapshot;
    e.status=before.status;
    e.lifecycleLog=before.lifecycleLog;
    e.confirmedSnapshots=before.confirmedSnapshots;
    state.dirty=before.dirty;
    state.audit=before.audit;
    toast('No se ha cerrado el AS-IS: el snapshot no ha podido persistirse por un conflicto de edición. Revisa la otra ventana antes de continuar.');
    render();
    return false;
  }
  toast(review.reviews.length?'AS-IS confirmado. Quedan observaciones no bloqueantes registradas para Trabajo interno.':'AS-IS completo confirmado y snapshot sellado.');
  render();
  return true;
}

// [AUNEA-FE-ASIS-CLIENT-EDITOR-074] START — Independent synchronized client-first editor + single-writer lease.
// PURPOSE: Open the consultant-owned client-first editor in a separate tab over the same Engagement, keep
//          Console and editor synchronized through the existing persistence layer, and prevent simultaneous
//          AS-IS edits from Console while that editor is alive.
// SOURCE: DEC-050/063; Master Index frontend contract; explicit UAT feedback 2026-10-01.
// INPUTS: current Engagement, localStorage lease, #process-editor window.
// OUTPUTS: one editable AS-IS surface at a time; Console remains readable but locked for AS-IS mutation.
// SIDE_EFFECTS: localStorage ephemeral lease, popup/tab lifecycle, DOM lock state.
// CHANGE_RISK: HIGH.
const PROCESS_EDITOR_LEASE_KEY='aunea_process_editor_lease_v1';
const PROCESS_EDITOR_LEASE_MS=6500;
let __auneaProcessEditorWindow=null,__auneaProcessEditorHeartbeat=null,__auneaProcessEditorMonitor=null;

function readProcessEditorLease(){
  try{
    const raw=localStorage.getItem(PROCESS_EDITOR_LEASE_KEY);if(!raw)return null;
    const lease=JSON.parse(raw);
    if(!lease?.engagementId||!lease?.token||Number(lease.expiresAt)<=Date.now())return null;
    return lease;
  }catch(_err){return null}
}
function writeProcessEditorLease(engagementId,token){
  const lease={engagementId,token,expiresAt:Date.now()+PROCESS_EDITOR_LEASE_MS};
  try{localStorage.setItem(PROCESS_EDITOR_LEASE_KEY,JSON.stringify(lease))}catch(_err){}
  return lease;
}
function processEditorToken(){
  const q=new URLSearchParams(location.search);
  return q.get('editorToken')||'';
}
function isAsisConsoleLocked(e=currentEng()){
  if(!e||(typeof isProcessEditorWindow==='function'&&isProcessEditorWindow()))return false;
  return readProcessEditorLease()?.engagementId===e.id;
}
function guardAsisMutation(){
  if(!isAsisConsoleLocked())return false;
  toast('La Vista con cliente está abierta. Edita el AS-IS desde esa pestaña.');
  return true;
}
function asisConsoleLockNotice(){
  return isAsisConsoleLocked()?'<div class="notice info asis-editor-lock-notice"><b>Vista con cliente abierta</b><p>La edición del mapa, fricciones, riesgos e impacto está bloqueada en esta consola. Realiza los cambios en la pestaña del cliente; aquí se sincronizarán automáticamente.</p></div>':'';
}
function applyAsisConsoleEditLock(){
  if(typeof document==='undefined')return;
  const locked=isAsisConsoleLocked();
  document.body.classList.toggle('asis-console-locked',locked);
  const selectors=['#addStep','#addMultipleSteps','#addStepTemplate','#useProcessTemplate','#addFriction','#addRisk','#addEconomic','#confirmAsIs','[data-confirm-process-layer]','[data-edit-step]','[data-delete-step]','[data-move-step-up]','[data-move-step-down]','[data-add-friction-step]','[data-add-risk-step]','[data-add-economic-step]','[data-edit-friction]','[data-delete-friction]','[data-edit-risk-index]','[data-delete-risk-index]','[data-edit-economic-index]','[data-delete-economic-index]','[data-graph-edit-route]','[data-add-after]'];
  document.querySelectorAll(selectors.join(',')).forEach(el=>{
    if(locked){
      if(el.dataset.asisPreviousDisabled===undefined)el.dataset.asisPreviousDisabled=el.disabled?'1':'0';
      el.disabled=true;el.setAttribute('aria-disabled','true');el.title='Edita desde la Vista con cliente abierta';
    }else if(el.dataset.asisPreviousDisabled!==undefined){
      el.disabled=el.dataset.asisPreviousDisabled==='1';delete el.dataset.asisPreviousDisabled;el.removeAttribute('aria-disabled');el.removeAttribute('title');
    }
  });
}
function releaseProcessEditorLease(token=processEditorToken()){
  const lease=readProcessEditorLease();
  if(!lease||!token||lease.token!==token)return;
  try{localStorage.removeItem(PROCESS_EDITOR_LEASE_KEY)}catch(_err){}
}
function startProcessEditorLease(){
  if(!isProcessEditorWindow())return;
  const e=currentEng(),token=processEditorToken();if(!e||!token)return;
  writeProcessEditorLease(e.id,token);
  clearInterval(__auneaProcessEditorHeartbeat);
  __auneaProcessEditorHeartbeat=setInterval(()=>writeProcessEditorLease(e.id,token),2000);
  const release=()=>releaseProcessEditorLease(token);
  window.addEventListener('beforeunload',release,{once:true});
  window.addEventListener('pagehide',release,{once:true});
}
function startProcessEditorLeaseMonitor(){
  if(typeof window==='undefined'||__auneaProcessEditorMonitor)return;
  let lastLocked=isAsisConsoleLocked();
  const refresh=()=>{
    const locked=isAsisConsoleLocked(),asisPage=['proceso','pasos','fricciones','riesgos','impacto'].includes(state.activePage);
    if(locked!==lastLocked&&asisPage){lastLocked=locked;render();return}
    lastLocked=locked;
    if(typeof applyAsisConsoleEditLock==='function')applyAsisConsoleEditLock();
  };
  __auneaProcessEditorMonitor=setInterval(refresh,1800);
  window.addEventListener('storage',ev=>{if(ev.key===PROCESS_EDITOR_LEASE_KEY)refresh()});
}
function openProcessEditorWindow(){
  const e=currentEng();if(!e)return;
  if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('abrir vista con cliente'))return toast('Guarda o resuelve el cambio pendiente antes de abrir la Vista con cliente.');
  const current=readProcessEditorLease(),token=current?.engagementId===e.id?current.token:id('EDITOR');
  const url=new URL(location.href);url.hash='process-editor';url.searchParams.set('engagement',e.id);url.searchParams.set('editorToken',token);
  const name='aunea_process_editor_'+String(e.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const w=__auneaProcessEditorWindow&&!__auneaProcessEditorWindow.closed?__auneaProcessEditorWindow:window.open('',name);
  if(!w)return toast('El navegador ha bloqueado la pestaña. Permite ventanas emergentes para abrir la Vista con cliente.');
  __auneaProcessEditorWindow=w;
  writeProcessEditorLease(e.id,token);
  try{
    const same=w.location.hash==='#process-editor'&&new URLSearchParams(w.location.search).get('engagement')===e.id;
    if(!same)w.location.replace(url.toString());
  }catch(_err){w.location.replace(url.toString())}
  w.focus();
  render();
}
function closeProcessEditorWindow(){
  if(!isProcessEditorWindow())return;
  releaseProcessEditorLease();
  window.close();
}
// [AUNEA-FE-ASIS-CLIENT-EDITOR-074] END

// [AUNEA-FE-PROC-LIFECYCLE-030] END
