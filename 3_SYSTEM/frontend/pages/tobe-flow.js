// [AUNEA-FE-PG11-FUTURE-FLOW-228] START — version-owned future routing overlay.
// SOURCE: Simulator CANONICAL PG11/PG12; DEC-050/052/055.
// The AS-IS snapshot remains immutable. Added steps are linked to an existing AS-IS
// step, stored only within this TO-BE version, and cannot be auto-approved.
// No new DF question, pricing assumption, or deterministic engine calculation.
// [AUNEA-FE-PG11-ASIS-VERSION-465] START
// SOURCE: DEC-041/050/075, Simulator CANONICAL PG11.
// PURPOSE: Resolve an immutable version-pinned source and distinguish an
// equivalent PG09 re-seal from a genuinely changed confirmed AS-IS.
// INPUT: Engagement snapshot history, TO-BE version. OUTPUT: compatibility.
// SIDE EFFECTS: none. CHANGE RISK: HIGH; no automatic source reassignment.
function tobeSnapshotVersionSame(a,b){
  return a!=null&&b!=null&&String(a).trim()!==''&&
    String(a).trim()===String(b).trim();
}
function tobeProposalSnapshot(e,p){
  if(p?.sourceSnapshotVersion==null)return null;
  const pinned=(e?.confirmedSnapshots||[]).find(s=>
    tobeSnapshotVersionSame(s?.version,p.sourceSnapshotVersion));
  if(pinned)return pinned;
  // Legacy/test engagements without an array may expose the exact same
  // sealed version through the authoritative closure accessor. Never
  // substitute a newer snapshot for a pinned historical source.
  const current=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  return current&&tobeSnapshotVersionSame(current.version,p.sourceSnapshotVersion)?
    current:null;
}
function tobeSnapshotContentSignature(snapshot){
  const stable=value=>{
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==='object')return Object.fromEntries(
      Object.keys(value).sort().map(k=>[k,stable(value[k])]));
    return value;
  };
  const content=Object.fromEntries(Object.keys(snapshot||{}).filter(k=>
    !['version','sealedAt','asIsConfirmedAt'].includes(k)).map(k=>[k,snapshot[k]]));
  return JSON.stringify(stable(content));
}
function tobeAsisCompatibility(e,p){
  if(!e||!p)return {compatible:false,message:'No existe un borrador TO-BE vigente.'};
  const source=tobeProposalSnapshot(e,p);
  if(!source)return {compatible:false,message:'No se encuentra el AS-IS v'+
    String(p.sourceSnapshotVersion??'?')+' que originó este borrador. No se modifica el TO-BE.'};
  const current=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!current)return {compatible:false,message:'El AS-IS ya no está confirmado en PG09. '+
    'No se puede aplicar una intervención hasta recuperar una confirmación válida.'};
  if(tobeSnapshotVersionSame(source.version,current.version))
    return {compatible:true,source,current,equivalent:false};
  if(tobeSnapshotContentSignature(source)===tobeSnapshotContentSignature(current))
    return {compatible:true,source,current,equivalent:true};
  return {compatible:false,source,current,message:'El borrador TO-BE utiliza el AS-IS v'+
    String(source.version)+', pero la última confirmación es v'+String(current.version)+
    ' y contiene cambios reales. No se ha aplicado nada. Revisa la nueva versión del AS-IS '+
    'antes de crear un nuevo borrador TO-BE.'};
}
// [AUNEA-FE-PG11-ASIS-VERSION-465] END
function tobeProposalSourceSteps(e,p){
  return (tobeProposalSnapshot(e,p)?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
}
function tobeFlowOwner(e,p){
  const original=tobeProposalSourceSteps(e,p),branching=original.some(s=>processDecisionStep(s));
  const routes={};
  original.forEach((s,i)=>{
    const id=String(s.id);
    routes[id]={
      normal:String(s.normal_next_step||(!branching?(original[i+1]?.id||'__END__'):'__PENDING__')),
      exception:processDecisionStep(s)?String(s.exception_path?.destination_step||'__PENDING__'):''
    };
  });
  const stored=p?.flow;
  return {
    startStepId:String(stored?.startStepId||original[0]?.id||''),
    routes:{...routes,...(stored?.routes||{})},
    addedSteps:Array.isArray(stored?.addedSteps)?stored.addedSteps:[],
    decisionCriteria:stored?.decisionCriteria&&typeof stored.decisionCriteria==='object'?
      {...stored.decisionCriteria}:{},
    positions:stored?.positions&&typeof stored.positions==='object'?{...stored.positions}:{}
  };
}
function tobeMutableFlow(e,p){
  if(!p.flow)p.flow=tobeFlowOwner(e,p);
  if(!p.flow.positions)p.flow.positions={};
  if(!p.flow.decisionCriteria)p.flow.decisionCriteria={};
  return p.flow;
}
function tobeAddedSteps(p,includeSuperseded=false){
  return Array.isArray(p?.flow?.addedSteps)?
    p.flow.addedSteps.filter(x=>includeSuperseded||x.status!=='SUPERSEDED'):[];
}
function tobeFlowItemId(item){return String(item?.isAddition?item.id:item?.sourceStepId||'')}
function tobeFlowItem(e,p,stepId){
  return [...(p?.items||[]),...tobeAddedSteps(p)].find(x=>tobeFlowItemId(x)===String(stepId))||null;
}
function tobeFlowItemName(item){
  return String((item?.isAddition?item.stepName:item?.sourceStepName)||'Actividad sin nombre');
}
// [AUNEA-FE-PG11-FUTURE-PROJECTION-314] START
// Source: confirmed ProcessStep and TO-BE DRAFT (DEC-050/055).
// No second owner: derives the graph's operative attributes from p.items.
function tobeFutureCatalogValue(setId,raw){
  const value=String(raw||''),opts=typeof fieldOptions==='function'?fieldOptions(setId):[];
  const found=opts.find(x=>String(x.value)===value||
    String(x.label||'').trim().toLowerCase()===value.trim().toLowerCase());
  return String(found?.value??value);
}
function tobeFutureArtifacts(raw){
  if(typeof tobeArtifactValues==='function'){
    const v=tobeArtifactValues(raw);
    return [...v.resolved,...v.unknown];
  }
  return Array.isArray(raw)?[...raw]:String(raw||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function tobeFutureStepDetails(source,item){
  return {...(source?._details||{}),inputs:String(item._details?.inputs||''),
    outputs:String(item._details?.outputs||'')};
}
// [AUNEA-FE-PG11-FUTURE-PROJECTION-314] END
function tobeFutureSteps(e,p){
  const original=tobeProposalSourceSteps(e,p),byId=new Map(original.map(x=>[String(x.id),x]));
  const f=tobeFlowOwner(e,p);
  const existing=(p?.items||[]).filter(x=>x.transformation!=='Se elimina').map(item=>{
    const source=byId.get(String(item.sourceStepId));
    if(!source)return null;
    const route=f.routes[String(source.id)]||{};
    const decision=processDecisionStep(source);
    return {...source,id:String(source.id),step_name:tobeFlowItemName(item),
      actor:tobeFutureCatalogValue('OS_ACTOR_ROLE',item.futureActor),
      tool:tobeFutureCatalogValue('OS_TOOL_CATEGORY',item.tool),
      inputs:tobeFutureArtifacts(item.inputs),outputs:tobeFutureArtifacts(item.outputs),
      _details:tobeFutureStepDetails(source,item),
      tobe_transformation:item.transformation,
      tobe_automation_ai:item.automationAi||'',
      tobe_human_supervision:item.humanSupervision||'',
      tobe_controls_risk:item.controlsRisk||'',
      tobe_decision_criterion:String(f.decisionCriteria?.[String(source.id)]||''),
      normal_next_step:String(route.normal??'__PENDING__'),
      exception_path:decision?{...(source.exception_path||{}),
        destination_step:String(route.exception??'__PENDING__')}:undefined};
  }).filter(Boolean);
  const additions=tobeAddedSteps(p).map(item=>{
    const route=f.routes[String(item.id)]||{},
      isDecision=String(item.stepType||'ST02')==='ST04';
    return {id:String(item.id),step_name:tobeFlowItemName(item),
      step_type:isDecision?'ST04':'ST02',
      actor:tobeFutureCatalogValue('OS_ACTOR_ROLE',item.futureActor),
      tool:tobeFutureCatalogValue('OS_TOOL_CATEGORY',item.tool),
      inputs:tobeFutureArtifacts(item.inputs),outputs:tobeFutureArtifacts(item.outputs),
      _details:tobeFutureStepDetails(null,item),
      tobe_transformation:item.transformation,
      tobe_automation_ai:item.automationAi||'',
      tobe_human_supervision:item.humanSupervision||'',
      tobe_controls_risk:item.controlsRisk||'',
      tobe_decision_criterion:String(f.decisionCriteria?.[String(item.id)]||''),
      normal_next_step:String(route.normal??'__PENDING__'),
      exception_path:isDecision?{destination_step:String(route.exception||'__PENDING__')}:undefined};
  });
  const steps=[...existing,...additions];
  const first=steps.findIndex(x=>String(x.id)===f.startStepId);
  if(first>0)steps.unshift(steps.splice(first,1)[0]);
  return steps;
}
function tobeFlowIntegrity(e,p){
  const f=tobeFlowOwner(e,p),steps=tobeFutureSteps(e,p),ids=new Set(steps.map(x=>String(x.id))),
    originals=new Map(tobeProposalSourceSteps(e,p).map(x=>[String(x.id),x]));
  if(!ids.size)return 'El TO-BE debe tener al menos una actividad futura.';
  if(!ids.has(String(f.startStepId)))return 'El inicio del TO-BE apunta a una actividad eliminada o inexistente. Selecciona un inicio válido.';
  for(const added of tobeAddedSteps(p)){
    if(String(added.stepType||'ST02')==='ST04'&&
       !String(f.decisionCriteria?.[String(added.id)]||'').trim())
      return 'La nueva decisión '+tobeFlowItemName(added)+
        ' necesita una condición futura explícita antes de conectar las rutas SÍ/NO.';
    if(!originals.has(String(added.sourceStepId)))
      return 'La actividad añadida '+tobeFlowItemName(added)+' no tiene origen AS-IS confirmado.';
    if(!['ST02','ST04'].includes(String(added.stepType||'ST02')))
      return 'El tipo de la nueva actividad '+tobeFlowItemName(added)+' no está permitido.';
    if(!String(added.stepName||'').trim())
      return 'Asigna un nombre a la actividad añadida vinculada a '+added.sourceStepName+'.';
    if(!TOBE_TRANSFORMATIONS.includes(added.transformation))
      return 'Selecciona una transformación válida para '+tobeFlowItemName(added)+'.';
    if(!String(added.problemResolved||'').trim())
      return 'Describe el problema u oportunidad diagnosticada que justifica la actividad '+tobeFlowItemName(added)+'.';
    if(!String(added.futureActor||'').trim())
      return 'Indica responsable futuro de '+tobeFlowItemName(added)+'.';
    if(String(added.futureTime||'').trim()&&!String(added.futureTimeAssumption||'').trim())
      return 'El tiempo futuro de '+tobeFlowItemName(added)+' requiere un supuesto explícito.';
  }
  const outgoing=new Map();
  for(const s of steps){
    const route=f.routes[String(s.id)]||{},original=originals.get(String(s.id));
    const next=String(route.normal??s.normal_next_step??'__PENDING__');
    const exception=processDecisionStep(s)?
      String(route.exception??s.exception_path?.destination_step??'__PENDING__'):'';
    const targets=[next,...(exception?[exception]:[])];
    for(const dest of targets)if(dest!=='__END__'&&!ids.has(dest))
      return 'La ruta de '+s.step_name+' apunta a una actividad eliminada o pendiente de conectar. Revisa sus destinos.';
    outgoing.set(String(s.id),targets);
  }
  const reachable=new Set(),queue=[String(f.startStepId)];
  while(queue.length){
    const id=queue.shift();if(reachable.has(id))continue;reachable.add(id);
    for(const next of outgoing.get(id)||[])if(next!=='__END__'&&!reachable.has(next))queue.push(next);
  }
  if(steps.some(s=>!reachable.has(String(s.id))))
    return 'Hay actividades futuras desconectadas del inicio. Revisa las rutas y los pasos añadidos.';
  const canEnd=new Set(['__END__']);let changed=true;
  while(changed){changed=false;
    for(const [id,links] of outgoing)if(!canEnd.has(id)&&links.some(dest=>canEnd.has(dest))){
      canEnd.add(id);changed=true;
    }
  }
  if(steps.some(s=>!canEnd.has(String(s.id))))
    return 'Existe una ruta futura sin camino hasta el final del proceso.';
  return null;
}
function tobeFlowOptions(e,p,item){
  return [{value:'__PENDING__',label:'Pendiente de conectar'},
    ...tobeFutureSteps(e,p).filter(s=>String(s.id)!==tobeFlowItemId(item))
      .map(s=>({value:String(s.id),label:s.step_name})),
    {value:'__END__',label:'Fin del proceso'}];
}
// [AUNEA-FE-PG11-DECISION-READOUT-297] START — source-backed decision logic.
// AS-IS criteria remain immutable. TO-BE destinations are edited only in Map.
function tobeDecisionReadoutHtml(e,p,item){
  const original=tobeProposalSourceSteps(e,p),
    source=original.find(x=>String(x.id)===String(item.sourceStepId));
  const decision=item.isAddition?String(item.stepType)==='ST04':
    !!source&&processDecisionStep(source);
  if(!decision||item.transformation==='Se elimina')return '';
  const future=tobeFutureSteps(e,p),
    routes=tobeFlowOwner(e,p).routes[tobeFlowItemId(item)]||{},
    name=(id,steps)=>{
      const key=String(id||'__PENDING__');
      if(key==='__END__')return 'Fin del proceso';
      if(key==='__PENDING__')return 'Pendiente de conectar';
      return steps.find(x=>String(x.id)===key)?.step_name||'Destino no disponible';
    },
    raw=item.isAddition?'':source?._details?.decision_criteria||source?.decision_criteria||'',
    values=Array.isArray(raw)?raw:raw?[raw]:[],
    setId=typeof schema!=='undefined'?
      schema.fields?.find(x=>x.Field_ID==='DF041')?.Option_Set_ID:'',
    readable=v=>String((typeof labelFrom==='function'&&setId?
      labelFrom(setId,v):'')||v),
    criteria=values.map(readable).filter(Boolean).join(' · '),
    draftCriterion=String(tobeFlowOwner(e,p).decisionCriteria?.[tobeFlowItemId(item)]||'').trim(),
    asYes=!item.isAddition&&source?name(source.normal_next_step,original):'No existía en el AS-IS',
    asNo=!item.isAddition&&source?name(source.exception_path?.destination_step,original):'No existía en el AS-IS';
  return '<section class="tobe-decision-readout" aria-label="Lógica de decisión y rutas">'+
    '<h4>Decisión y rutas de la actividad</h4>'+
    '<p class="field-help"><b>Criterio AS-IS confirmado:</b> '+
      esc(criteria||'No consta un criterio detallado en el snapshot.')+'</p>'+
    '<p class="field-help"><b>Criterio TO-BE:</b> '+
      esc(draftCriterion||(!item.isAddition&&criteria?
        'Se conserva el criterio del AS-IS; sin cambio registrado.':
        'Pendiente de definir en Mapa TO-BE.'))+'</p>'+
    '<dl><div><dt>Si se cumple · SÍ</dt><dd>AS-IS: '+esc(asYes)+
      ' · TO-BE: '+esc(name(routes.normal,future))+'</dd></div>'+
      '<div><dt>Si no se cumple · NO</dt><dd>AS-IS: '+esc(asNo)+
      ' · TO-BE: '+esc(name(routes.exception,future))+'</dd></div></dl>'+
    '<p class="field-help">Modifica las rutas en «Mapa TO-BE». Esta vista no altera el AS-IS ni confirma nuevas condiciones.</p>'+
  '</section>';
}
// [AUNEA-FE-PG11-DECISION-READOUT-297] END
function tobeFlowInspector(e,p,item){
  if(item.transformation==='Se elimina'){
    return '<section class="tobe-route-editor" id="tobeStepRoutes">'+
      '<h3>03.4 · Conectar el proceso futuro</h3>'+
      '<p class="notice warn">Esta actividad se retira únicamente del TO-BE. Reconecta las rutas entrantes y, si corresponde, selecciona un inicio válido. El AS-IS se conserva intacto.</p></section>';
  }
  const flow=tobeFlowOwner(e,p),stepId=tobeFlowItemId(item),routes=flow.routes[stepId]||{},
    origin=tobeProposalSourceSteps(e,p).find(x=>String(x.id)===String(item.sourceStepId)),
    decision=item.isAddition?String(item.stepType||'ST02')==='ST04':
      !!origin&&processDecisionStep(origin),editable=tobeEditable(p);
  const opts=tobeFlowOptions(e,p,item);
  const field=(kind,label,value)=>
    '<div class="field"><label>'+label+'</label>'+
    (editable?auneaUiNamedSelect(label,'tobeRoute_'+kind+'_'+stepId,opts,String(value||'__PENDING__'),{
      extra:'data-tobe-route="'+kind+'" data-tobe-route-step="'+attr(stepId)+'"',
      placeholder:'Selecciona destino'}):'<input disabled value="'+attr(opts.find(x=>x.value===value)?.label||value||'Pendiente')+'">')+
    '<p class="field-help">Selecciona el destino de esta ruta en el proceso futuro. Una ruta pendiente bloquea la revisión.</p></div>';
  return '<section class="tobe-route-editor" id="tobeStepRoutes"><h3>03.4 · Conectar el proceso futuro</h3>'+
    '<p class="tobe-muted">Edita aquí las rutas del TO-BE. No se modificarán las conexiones del AS-IS confirmado.</p>'+
    (decision?tobeDecisionReadoutHtml(e,p,item):'')+
    (decision?'<div class="field tobe-decision-criterion-edit">'+
      '<label for="tobeDecisionCriterion_'+attr(stepId)+'">Condición futura que determina SÍ y NO</label>'+
      (editable?'<textarea id="tobeDecisionCriterion_'+attr(stepId)+
        '" data-tobe-decision-criterion="'+attr(stepId)+
        '" rows="3" maxlength="1200" placeholder="'+
        attr(item.isAddition?'Describe la condición de esta nueva decisión':
          'Dejar vacío conserva el criterio original; escribe aquí solo si debe cambiar')+'">'+
        esc(String(flow.decisionCriteria?.[stepId]||''))+'</textarea>':
        '<p>'+esc(String(flow.decisionCriteria?.[stepId]||'Se conserva el criterio AS-IS'))+'</p>')+
      '<p class="field-help">Define la condición para cada resultado. Los destinos se editan debajo; ningún cambio modifica el AS-IS confirmado ni autoriza una aprobación automática.</p>'+
      '</div>':'')+
    '<div class="form-grid">'+field('normal','Siguiente actividad'+(decision?' · ruta SÍ':''),routes.normal)+
    (decision?field('exception','Ruta NO / excepción',routes.exception):'')+
    '</div></section>';
}
// [AUNEA-FE-PG11-OPTIMIZATION-CHECK-313] START
// SOURCE: CANONICAL PG11, ProcessStep DF035/036/041–043, friction and
// restriction snapshot; DEC-050/052/055. INPUTS: immutable AS-IS and
// consultant-owned TO-BE DRAFT. OUTPUTS: deterministic, source-linked checks.
// SIDE EFFECTS: none. Never alters routes, approves IA, or invents savings.
// CHANGE RISK: MEDIUM. Works on any service process, without sector heuristics.
// [AUNEA-FE-PG11-CONSTRAINT-ASSESSMENT-382] START
// PURPOSE: Assess client-confirmed restrictions once for 03.3 and 04.
// SOURCE: DF075/DF087/DF088/DF089/DF090; DEC-050/075; simulator canonical.
// INPUTS: pinned AS-IS snapshot and consultant-owned activity; OUTPUT: findings.
// SIDE_EFFECTS: none. Compatibility of text is not certification of an integration.
// CHANGE_RISK: HIGH — shared check and global review gate.
function tobeConstraintAssessments(e,p,item,sourceStep){
  if(!e||!p||!item)return [];
  const answers=tobeProposalSnapshot(e,p)?.answers||{},
    selected=(field,code)=>Array.isArray(answers[field])&&answers[field].some(x=>x===code),
    original=sourceStep||tobeProposalSourceSteps(e,p).find(x=>
      String(x.id)===String(item.sourceStepId)),
    transformation=String(item.transformation||''),
    automation=String(item.automationAi||'').trim(),
    supervision=String(item.humanSupervision||'').trim(),
    hasAutomation=!!automation&&!/^(no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(automation),
    results=[],
    add=(severity,code,message)=>results.push({severity,code,message,related:[]});
  const humanRequired=['FINAL_DECISION','FINANCIAL_ACTION'].some(code=>
    selected('DF075',code)||selected('DF088',code))||
    ['HUMAN_DECISION','APPROVAL'].some(code=>selected('DF087',code));
  if(humanRequired&&['ST04','ST05'].includes(String(original?.step_type||original?.stepType||''))){
    const automatic=/(?:aprob\w*|autoriz\w*|decisi[oó]n financiera).{0,40}autom[aá]tic\w*/i.test(automation),
      negated=/(?:\bno\b|\bnunca\b).{0,40}(?:aprob\w*|autoriz\w*|decisi[oó]n financiera).{0,40}autom[aá]tic\w*/i.test(automation),
      bypass=/\bsin (?:supervisi[oó]n|intervenci[oó]n|aprobaci[oó]n) humana\b/i.test(automation),
      humanDecision=/(?:aprob\w*|rechaz\w*|autoriz\w*|decid\w*|decisi[oó]n)/i.test(supervision)&&
        /(?:human\w*|person\w*|responsable|direcci[oó]n|manager|finanzas|administraci[oó]n)/i.test(supervision);
    if((automatic&&!negated)||bypass)
      add('BLOCK','HUMAN_APPROVAL','Incompatible · DF075/DF087/DF088: la propuesta sustituye una decisión o autorización humana obligatoria.');
    else if(transformation==='Se elimina'&&String(original?.step_type||original?.stepType)==='ST05')
      add('BLOCK','HUMAN_APPROVAL','Incompatible · DF075/DF087/DF088: se elimina la actividad de aprobación humana sin acreditar una sustitución autorizada.');
    else if(humanDecision&&String(item.futureActor||'').trim())
      add('COMPATIBLE','HUMAN_APPROVAL','Compatible con el diseño declarado · DF075/DF087/DF088: la decisión se mantiene bajo responsabilidad humana. La ejecución no está certificada.');
    else
      add('REVIEW','HUMAN_APPROVAL','Pendiente · DF075/DF087/DF088: documenta quién autoriza y cómo se gestionan las decisiones y excepciones.');
  }
  if((selected('DF089','KEEP_EXISTING')||selected('DF089','CRM_NATIVE'))&&transformation!=='Se elimina'){
    const normalize=v=>typeof tobeFutureCatalogValue==='function'?
        String(tobeFutureCatalogValue('OS_TOOL_CATEGORY',v)||v||'').trim():String(v||'').trim(),
      oldTool=normalize(original?.tool),newTool=normalize(item.tool);
    if(oldTool&&newTool&&oldTool!==newTool)
      add('REVIEW','PLATFORM_COMPATIBILITY','Pendiente · DF089: la herramienta futura cambia pese a la preferencia del cliente por conservar sistemas o utilizar funciones nativas. Justifica y valida el cambio.');
    else if(hasAutomation)
      add('REVIEW','PLATFORM_COMPATIBILITY','Pendiente · DF089: mantener la herramienta actual no demuestra que soporte el registro, los avisos o la integración propuestos.');
    else if(oldTool&&newTool)
      add('COMPATIBLE','PLATFORM_COMPATIBILITY','Compatible con el diseño declarado · DF089: se mantiene la herramienta existente sin automatización adicional.');
    else
      add('REVIEW','PLATFORM_COMPATIBILITY','Pendiente · DF089: no se ha identificado una herramienta futura verificable.');
  }
  const security=['RBAC','AUDIT_LOG','MFA'].filter(code=>selected('DF090',code));
  if(security.length&&!['Se mantiene','Se elimina'].includes(transformation))
    add('REVIEW','SECURITY_EVIDENCE','Pendiente · DF090: acreditar '+
      security.map(code=>({RBAC:'roles y permisos',AUDIT_LOG:'auditoría',MFA:'autenticación multifactor'}[code])).join(', ')+
      '. El texto del TO-BE no demuestra que la plataforma implemente esos controles.');
  return results;
}
// [AUNEA-FE-PG11-CONSTRAINT-ASSESSMENT-382] END

function tobeOptimizationFindings(e,p,item){
  if(!e||!p||!item)return [];
  const future=tobeFutureSteps(e,p),flow=tobeFlowOwner(e,p),
    source=tobeProposalSourceSteps(e,p),
    sourceStep=source.find(x=>String(x.id)===String(item.sourceStepId)),
    id=tobeFlowItemId(item),
    owner=future.find(x=>String(x.id)===id),
    futureMap=new Map(future.map(x=>[String(x.id),x])),
    predecessors=future.filter(step=>String(step.normal_next_step)===id||
      String(step.exception_path?.destination_step)===id),
    successors=owner?[owner.normal_next_step,owner.exception_path?.destination_step]
      .map(x=>futureMap.get(String(x||''))).filter(Boolean):[],
    set=value=>new Set(tobeFutureArtifacts(value).map(x=>String(x).trim().toUpperCase())),
    diff=(a,b)=>[...a].filter(x=>!b.has(x)),
    beforeInput=set(sourceStep?.inputs||[]),afterInput=set(item.inputs||[]),
    beforeOutput=set(sourceStep?.outputs||[]),afterOutput=set(item.outputs||[]),
    newInputs=diff(afterInput,beforeInput),
    newOutputs=diff(afterOutput,beforeOutput),
    droppedOutputs=diff(beforeOutput,afterOutput),
    results=[],
    add=(severity,code,message,related=[])=>results.push({
      severity,code,message,related:related.map(x=>String(x.step_name||x.stepName||x.id||x))
    }),
    names=steps=>steps.map(x=>x.step_name||x.stepName||String(x.id)).join(', ');
  if(item.transformation==='Se elimina'){
    add('REVIEW','REMOVED_ACTIVITY','La actividad se propone eliminar. Revisa quién asume su trabajo, entradas y salidas y redirige las conexiones en Mapa TO-BE.',successors);
    results.push(...tobeConstraintAssessments(e,p,item,sourceStep));
    return results;
  }
  if(!owner){
    add('REVIEW','MISSING_NODE','La actividad no está conectada en el grafo futuro. Comprueba su inclusión y rutas en Mapa TO-BE.');
    results.push(...tobeConstraintAssessments(e,p,item,sourceStep));
    return results;
  }
  if(newInputs.length){
    const supplied=new Set(predecessors.flatMap(s=>[...set(s.outputs)]));
    const notLinked=newInputs.filter(x=>!supplied.has(x));
    if(notLinked.length)add('REVIEW','INPUT_SOURCE',
      'Entradas incorporadas ('+notLinked.join(', ')+
      '): confirma el paso proveedor o la fuente externa. No consta su suministro en las salidas de los pasos anteriores conectados.',
      predecessors);
  }
  if(droppedOutputs.length){
    const consumers=successors.filter(x=>droppedOutputs.some(code=>set(x.inputs).has(code)));
    if(consumers.length)add('REVIEW','OUTPUT_CONSUMER',
      'Una categoría de salida retirada coincide con una categoría de entrada posterior. Comprueba si es el mismo documento o dato antes de concluir que falta suministro; documenta su fuente.',
      consumers);
  }
  if(newOutputs.length&&!successors.some(x=>newOutputs.some(code=>set(x.inputs).has(code)))){
    add('CHECK','OUTPUT_DESTINATION',
      'Salidas nuevas ('+newOutputs.join(', ')+
      '): confirma si alimentan otra actividad, se entregan fuera del proceso o constituyen el resultado final.',
      successors);
  }
  const automation=String(item.automationAi||'').trim(),
    hasAutomation=!!automation&&!/^(no|n\/a|ninguno|sin definir|pendiente|—)$/i.test(automation);
  if(hasAutomation&&['Se mantiene','Se elimina'].includes(item.transformation)){
    add('REVIEW','INACTIVE_AUTOMATION_DETAIL',
      'La actividad figura como «'+item.transformation+'» pero conserva texto en Automatización/IA. '+
      'Aclara si es información histórica o una intervención futura antes de validar el TO-BE.');
  }
  if(hasAutomation&&!['Se mantiene','Se elimina'].includes(item.transformation)&&
     !String(item.humanSupervision||'').trim())
    add('REVIEW','HUMAN_SUPERVISION',
      'La intervención incorpora automatización, pero falta registrar quién revisa las excepciones.');
  if(sourceStep&&processDecisionStep(sourceStep)){
    const route=flow.routes[id]||{},
      changed=String(route.normal||'')!==String(sourceStep.normal_next_step||'')||
        String(route.exception||'')!==String(sourceStep.exception_path?.destination_step||'')||
        !!String(flow.decisionCriteria?.[id]||'').trim();
    if(changed)add('REVIEW','DECISION_BRANCH',
      'Se ha cambiado la condición o alguna ruta de esta decisión. Comprueba ambos destinos, el responsable de autorizar y las condiciones obligatorias.',
      successors);
  }
  const originalFrictions=(tobeProposalSnapshot(e,p)?.frictions||[]).filter(f=>
    f.status!=='SUPERSEDED'&&
    (f.affected_steps||f.step_ids||[]).map(String).includes(String(item.sourceStepId)));
  const relatedRisks=(tobeProposalSnapshot(e,p)?.risks||[]).filter(f=>
    f.status!=='SUPERSEDED'&&(f.step_ids||[]).map(String).includes(String(item.sourceStepId)));
  if((originalFrictions.length||relatedRisks.length)&&!String(item.problemResolved||'').trim())
    add('REVIEW','UNJUSTIFIED_CHANGE',
      'Hay hallazgos vinculados al paso, pero falta justificar qué problema resuelve el diseño futuro.');
  results.push(...tobeConstraintAssessments(e,p,item,sourceStep));
  return results;
}
function tobeOptimizationPanelHtml(e,p,item){
  const results=tobeOptimizationFindings(e,p,item),
    id=tobeFlowItemId(item),future=tobeFutureSteps(e,p),
    owner=future.find(s=>String(s.id)===id),
    predecessors=future.filter(s=>String(s.normal_next_step)===id||
      String(s.exception_path?.destination_step)===id),
    successorIds=owner?[owner.normal_next_step,owner.exception_path?.destination_step]:[],
    successors=successorIds.map(id=>future.find(s=>String(s.id)===String(id))).filter(Boolean),
    names=steps=>steps.map(x=>x.step_name).join(' · ')||'Sin actividad conectada en esta dirección',
    pending=results.filter(x=>x.severity==='REVIEW').length,
    incompatible=results.filter(x=>x.severity==='BLOCK').length,
    compatible=results.filter(x=>x.severity==='COMPATIBLE').length,
    issues=pending+incompatible,
    block=tobeFlowIntegrity(e,p),
    prior=typeof document!=='undefined'?document.querySelector('#tobeStepOptimization .tobe-optimization-details'):null,
    open=!!block||!!prior?.open,
    rows=results.map(x=>'<li class="tobe-optimization-finding" data-optimization-code="'+attr(x.code)+'">'+
      '<span class="tobe-optimization-severity">'+
        (x.severity==='BLOCK'?'Incompatible':x.severity==='COMPATIBLE'?'Compatible':x.severity==='REVIEW'?'Pendiente':'Comprobar')+'</span>'+
      '<p>'+esc(x.message)+'</p>'+
      (x.related.length?'<small>Actividades relacionadas: '+esc(x.related.join(' · '))+'</small>':'')+
    '</li>').join('');
  return auneaUiDisclosureStart({id:'tobeStepOptimization',sourceId:item.sourceStepId,
    variant:'group',className:'tobe-design-group tobe-optimization-panel',
    number:'04',title:'Impacto del cambio sobre el flujo',
    description:'Revisión de rutas y dependencias; no modifica conexiones ni acepta propuestas.',
    open:auneaUiDisclosureOpen('tobeStepOptimization',item.sourceStepId,true),
    ariaLabel:'Comprobación de dependencias del flujo'})+
    '<div class="tobe-optimization-body">'+
      '<div class="tobe-optimization-connections">'+
        '<div><b>Pasos anteriores</b><span>'+esc(names(predecessors))+'</span></div>'+
        '<div><b>Actividad revisada</b><span>'+esc(tobeFlowItemName(item))+'</span></div>'+
        '<div><b>Pasos siguientes</b><span>'+esc(names(successors))+'</span></div>'+
      '</div>'+
      '<details class="tobe-optimization-details"'+(open?' open':'')+'>'+
        '<summary>'+(block?'Bloqueo de integridad detectado':
          issues?issues+' '+(issues===1?'observación pendiente':'observaciones pendientes')+
            (compatible?' · '+compatible+' compatible'+(compatible===1?'':'s'):''):
          compatible?compatible+' comprobación'+(compatible===1?'':'es')+' compatible'+(compatible===1?'':'s'):
          'Sin incompatibilidades evidentes · Ver comprobaciones')+'</summary>'+
        (block?'<p class="notice warn"><b>Integridad del flujo:</b> '+esc(block)+'</p>':'')+
        (results.length?'<p class="tobe-optimization-summary">'+
          (incompatible?incompatible+' incompatibilidades; ':'')+
          pending+' comprobaciones pendientes de acreditar'+
          (compatible?'; '+compatible+' compatibles con el diseño declarado':'')+'.</p>'+
          '<ul class="tobe-optimization-findings">'+rows+'</ul>':
          '<p class="tobe-optimization-empty">No se han identificado incompatibilidades evidentes entre los datos declarados de este paso y sus conexiones.</p>')+
        '<p class="field-help">Las comprobaciones no acreditan por sí solas viabilidad ni ahorro. '+
          'Dos actividades con una categoría documental común no necesariamente comparten el mismo archivo.</p>'+
      '</details>'+
      (tobeEditable(p)?'<button type="button" class="btn btn-outline" data-tobe-recheck-optimization="1">'+
        'Guardar y actualizar comprobaciones</button>':'')+
    '</div>'+auneaUiDisclosureEnd();
}
// [AUNEA-FE-PG11-OPTIMIZATION-CHECK-313] END
// [AUNEA-FE-PG11-FUTURE-FLOW-228] END
