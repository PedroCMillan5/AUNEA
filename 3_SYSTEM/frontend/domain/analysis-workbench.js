// [AUNEA-FE-ASIS-WORKBENCH-152] START — Read-only source coverage and conditional alternatives
// PURPOSE: Show what captured AS-IS data supports, what remains unknown, and where options differ.
// SOURCE: Diagnostic Master v1.2 (all DF001–DF100); DEC-034/052/053; Simulator CANONICAL PG10–PG15.
// INPUTS: sealed Engagement snapshot, canonical schema and optional server-owned AS-IS analysis.
// OUTPUTS: source audit, traceable point cards and conditional exploration; no official prices/savings.
// SIDE_EFFECTS: none on Engagement or AS-IS; server call results live in memory, bound to snapshot.
const __asisAnalysisCache=new Map();
const ASIS_CONDITIONAL_DIRECTIONS=Object.freeze([
  {name:'Optimización sin IA',actionId:'ACT03',aiId:'I0',condition:'Si las actividades se resuelven con reglas y entradas suficientemente estructuradas',
   approach:'Rediseño puntual, reglas, integraciones y avisos que se puedan verificar.',
   advantage:'Menor variabilidad de comportamiento y controles deterministas.',
   drawback:'Necesita comprobar calidad de datos, integraciones y excepciones; no interpreta libremente documentos variables.',
   dependencies:['Capacidad real de conexión o configuración de las herramientas','Reglas y excepciones documentadas','Responsable de las aprobaciones']},
  {name:'Optimización asistida por IA',actionId:'ACT04',aiId:'I1',condition:'Si existe interpretación material de contenido variable que no sea razonable resolver con reglas',
   approach:'Las mismas reglas gobernadas, con interpretación o redacción asistida y revisión humana donde proceda.',
   advantage:'Puede abordar documentos y mensajes heterogéneos cuando una prueba de calidad lo confirme.',
   drawback:'Mayor coste operativo, errores posibles y necesidad de supervisión y prueba de calidad.',
   dependencies:['Muestras de documentos y validación de extracción','Permisos y datos tratados','Costes de operación y aceptación de calidad']},
  {name:'Rediseño y tecnología existente',actionId:'ACT02',aiId:'I0',condition:'Si simplificar pasos o configurar capacidades disponibles resuelve las fricciones materiales',
   approach:'Revisar secuencia, responsables, criterios y funcionalidades nativas antes de añadir software.',
   advantage:'Puede reducir integraciones nuevas y costes de mantenimiento.',
   drawback:'Depende de capacidades, licencias, restricciones y aceptación del cambio que aún deben verificarse.',
   dependencies:['Capacidades y licencias de herramientas existentes','Políticas reales y cambios organizativos','Evidencia de tiempos tras el rediseño']}
]);
function asisAnalysisSnapshot(e){
  return typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
}
function asisAnalysisSource(e){
  return typeof engagementOfRecord==='function'?engagementOfRecord(e):e;
}
function asisAnalysisKey(e){
  const snap=asisAnalysisSnapshot(e);
  if(!snap||!e?.confirmedAsIs)return null;
  // Current sealed record is the only authority; unrelated gates cannot change this key.
  return String(e.id)+'|'+String(snap.version)+'|'+JSON.stringify({
    answers:snap.answers,processSteps:snap.processSteps,frictions:snap.frictions,
    risks:snap.risks,economicInputs:snap.economicInputs,answerDetails:snap.answerDetails
  });
}
function asisAnalysisResult(e){
  const key=asisAnalysisKey(e);
  return key?__asisAnalysisCache.get(key)||null:null;
}
async function runAsisAnalysis(e){
  const key=asisAnalysisKey(e);
  if(!key)return toast('Confirma el AS-IS antes de analizarlo.');
  if(typeof checkBackend==='function'&&!state.backendOnline&&!(await checkBackend()))
    return toast('El análisis necesita el backend para calcular Pain, economía, riesgo y tiempos.');
  const payload=buildBackendPayload(e);
  const button=document.getElementById('analyzeAsisOnly');
  if(button){button.disabled=true;button.textContent='Analizando datos confirmados…'}
  try{
    const response=await fetch(state.backendUrl+'/v1/diagnostic/asis-analysis',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error(await response.text());
    const data=await response.json();
    if(data.diagnostic_type!=='ASIS_ONLY'||data.engagement_id!==e.id||data.recommendation||data.quote||data.optimal_scenario)
      throw new Error('El endpoint no cumple el contrato de análisis sin recomendación.');
    if(asisAnalysisKey(e)!==key||currentEng()?.id!==e.id)
      throw new Error('El AS-IS cambió durante el análisis. No se utilizan resultados antiguos.');
    __asisAnalysisCache.set(key,data);
    render();
  }catch(err){toast('No se pudo analizar el AS-IS: '+String(err.message||err));render()}
}
// [AUNEA-FE-ASIS-COVERAGE-OWNER-161] START — DF001–DF100 owner-aware read-only inventory
// Canonical sources: Diagnostic Master v1.2, DEC-050/052 and sealed Engagement snapshot.
// Repeatable DF data belong to ProcessStep/Friction/Risk/EconomicInput; answers are not a second owner.
// Never write through this projection, silently infer applicability, or treat a partial count as complete.
// Align field presence with backend input_coverage.py. A saved default 0 proves storage, not measurement.
function asisOwnerCollectionValue(field,record){
  const fid=String(field.Field_ID||'');
  const owner={
    step:{DF031:'step_name',DF032:'step_type',DF033:'actor',DF034:'tool',DF035:'inputs',
      DF036:'outputs',DF037:'active_time',DF038:'wait_time',DF039:'rework_time',
      DF040:'error_rate',DF041:'decision_criteria',DF042:'normal_next_step',
      DF043:'exception_path',DF044:'manual_actions',DF045:'automation_state'},
    friction:{DF056:'friction_type',DF057:'derived_pain_id',DF058:'cause',DF059:'affected_steps',
      DF060:'frequency',DF061:'impact',DF062:'active_time_loss',DF063:'direct_loss',
      DF064:'non_time_impact',DF065:'workaround'},
    risk:{DF068:'description',DF069:'category',DF070:'likelihood_1_5',
      DF071:'impact_1_5',DF072:'controls_present'},
    economic:{DF076:'capacity_cost_rate_eur_hour',DF077:'value',
      DF080:'annual_active_hours',DF081:'annual_active_hours',
      DF082:'direct_loss_eur_annual',DF083:'current_tool_cost_eur_annual'}
  };
  const groups=[
    {key:'step',records:record?.processSteps||[]},
    {key:'friction',records:record?.frictions||[]},
    {key:'risk',records:record?.risks||[]},
    {key:'economic',records:record?.economicInputs||[]}
  ];
  const group=groups.find(g=>Object.prototype.hasOwnProperty.call(owner[g.key],fid));
  if(!group)return null;
  // EconomicInputs are driver-scoped; unrelated drivers cannot supply a value.
  const driverFilter={
    DF076:['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08','ED14'],
    DF077:['ED14'],DF080:['ED04'],DF081:['ED06'],
    DF082:['ED09','ED11'],DF083:['ED12']
  };
  const rows=group.records.filter(x=>x&&x.status!=='SUPERSEDED')
    .filter(x=>group.key!=='economic'||!driverFilter[fid]||
      driverFilter[fid].includes(String(x.driver_id||'')));
  const key=owner[group.key][fid];
  const present=v=>{
    if(v===undefined||v===null||v==='')return false;
    if(typeof v==='object'&&!Array.isArray(v)){
      if(['UNKNOWN','NOT_APPLICABLE'].includes(String(v.mode||'').toUpperCase()))return false;
      if(Object.prototype.hasOwnProperty.call(v,'value'))return v.value!==null&&v.value!==undefined&&v.value!=='';
    }
    return typeof valuePresent==='function'?valuePresent(v):
      !(Array.isArray(v)&&!v.length);
  };
  const found=rows.filter(x=>present(x[key])||(fid==='DF061'&&present(x.severity))).length;
  // Keep source rows for read-only display. They are references, never new answers or persisted copies.
  return {count:found,total:rows.length,owner:group.key,key,rows};
}
function asisFieldInventory(record){
  const fields=Array.isArray(schema?.fields)?schema.fields:[];
  const sealed=typeof asisAnalysisSnapshot==='function'?asisAnalysisSnapshot(record):null;
  const order=(schema?.flow||[]).map(x=>x.Stage_ID);
  const stages=new Map(order.map(id=>[id,[]]));
  for(const f of fields){
    const stage=f.Stage_ID||'OTROS',fid=f.Field_ID,mode=String(f.Ask_Mode||'');
    const source=asisOwnerCollectionValue(f,record);
    let value=record?.answers?.[fid];
    const companySource={DF001:sealed?.company?.name,DF002:sealed?.company?.sector,
      DF003:sealed?.company?.employeeCount,DF005:sealed?.company?.country};
    if(sealed&&Object.prototype.hasOwnProperty.call(companySource,fid))
      value=companySource[fid]??record?.answers?.[fid];
    else if(sealed&&fid==='DF006')
      value=(sealed.contacts||[]).some(x=>String(x.id)===String(value))
        ?value:(sealed.contacts||[])[0]?.name||value;
    else if(!source&&typeof effectiveValue==='function'){
      try{const effective=effectiveValue(f,record);
        if(effective!==undefined&&effective!==null&&effective!=='')value=effective;
      }catch(_){}
    }
    const singlePresent=typeof valuePresent==='function'?valuePresent(value):
      !(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length));
    const present=source?source.count>0:singlePresent;
    let requiredNow=false;
    if(typeof canonicalFieldRequiredNow==='function'){
      try{requiredNow=!!canonicalFieldRequiredNow(f,record)}catch(_){}
    }
    const derivedMode=['DERIVED','SYSTEM_GENERATED'].includes(mode);
    const status=present?(derivedMode?'DERIVED':'AVAILABLE')
      :requiredNow?'MISSING_REQUIRED'
      :derivedMode?'DERIVATION_NOT_AVAILABLE':'NOT_CAPTURED_OR_CONDITIONAL';
    const item={id:fid,label:f.Pregunta_o_etiqueta_ES||f.Field_Name||'Dato del estudio',
      stage,mode,required:f.Requiredness||'',consumers:String(f.Engine_Consumers||''),
      status,filled:present,source};
    if(!stages.has(stage))stages.set(stage,[]);
    stages.get(stage).push(item);
  }
  return [...stages.entries()].map(([stage,items])=>({
    stage,title:(schema?.flow||[]).find(x=>x.Stage_ID===stage)?.Stage_ES||'Datos vinculados',
    items,filled:items.filter(x=>x.filled).length
  }));
}
// [AUNEA-FE-ASIS-COVERAGE-OWNER-161] END

// [AUNEA-FE-PG10-SNAPSHOT-VALUES-163] START — Show real sealed source values, never just presence.
// SOURCE: Engagement PG09 confirmed snapshot, Diagnostic Master v1.2, DEC-050/068/074.
// Inputs are read-only: no model, calculation, re-ask, client publication or new source of truth.
// Generic field formatting is intentionally conservative for unsupported structured formats.
function asisReadableValue(field,raw,record){
  const id=String(field?.Field_ID||''),set=field?.Option_Set_ID;
  const num=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:2});
  const tokens={YES:'Sí',NO:'No',UNKNOWN:'No se sabe',NONE:'Ninguno',NOT_APPLICABLE:'No aplica',__END__:'Fin del proceso'};
  const unit={min:'min',minute:'min',minutes:'min',h:'h',hour:'h',hours:'h',day:'días',days:'días',week:'semanas',month:'meses',year:'años'};
  const period={case:'caso',day:'día',week:'semana',month:'mes',year:'año'};
  const idsToNames=new Map((record?.processSteps||[]).map(s=>[String(s.id),s.step_name||'Paso sin nombre']));
  const scalar=x=>{
    if(x===null||x===undefined||x==='')return '';
    if(typeof x==='boolean')return x?'Sí':'No';
    if(typeof x==='number'){
      if(['DF037','DF038','DF039'].includes(id))return num(x)+' min';
      if(['DF061','DF070','DF071'].includes(id))return num(x)+'/5';
      if(id==='DF076')return num(x)+' €/h';
      if(id==='DF083')return num(x)+' €/año';
      return num(x);
    }
    const t=String(x);
    if(idsToNames.has(t))return idsToNames.get(t);
    if(tokens[t])return tokens[t];
    if(set&&typeof labelFrom==='function'){
      const translated=labelFrom(set,t);
      if(translated&&translated!==t)return translated;
    }
    return t;
  };
  const format=x=>{
    if(x===null||x===undefined||x==='')return '';
    if(Array.isArray(x))return x.map(format).filter(Boolean).join(' · ');
    if(typeof x==='object'){
      if(x.mode==='UNKNOWN')return 'Sin determinar';
      if(x.mode==='NOT_APPLICABLE')return 'No aplica';
      if(x.mode==='NONE')return 'Ninguno';
      if(x.value!==undefined){
        if(x.value===null||x.value==='')return '';
        const v=scalar(x.value);
        if(String(x.mode).toLowerCase()==='percent')return v+' %'+(x.period?' de los casos':'');
        const u=unit[String(x.unit||'').toLowerCase()]||x.unit||'';
        const p=period[String(x.period||'').toLowerCase()]||x.period||'';
        return v+(u?' '+u:'')+(p?' / '+p:'');
      }
      if(x.destination_step)return scalar(x.destination_step);
      if(x.destination)return scalar(x.destination);
      return 'Dato estructurado: consultar origen';
    }
    return scalar(x);
  };
  return format(raw);
}
function asisFieldValueDisplay(field,record,snap){
  const id=field.id,meta=(schema?.fields||[]).find(f=>f.Field_ID===id)||{Field_ID:id};
  const source=field.source;
  if(source){
    const valid=x=>x!==null&&x!==undefined&&x!==''&&!(Array.isArray(x)&&!x.length);
    const texts=(source.rows||[]).map((row,i)=>{
      const raw=id==='DF056'?(row.client_label||row.observable_signal||row.friction_type)
        :id==='DF061'?(row.impact??row.severity):row[source.key];
      if(!valid(raw))return null;
      const v=asisReadableValue(meta,raw,record);
      if(!v)return null;
      const prefix=source.owner==='step'?'Paso '+(i+1)
        :source.owner==='friction'?'Fricción '+(i+1)
        :source.owner==='risk'?'Riesgo '+(i+1)
        :row.role_or_resource||((typeof econDriverLabel==='function'&&econDriverLabel(row.driver_id))||'Registro económico '+(i+1));
      return String(prefix)+': '+v;
    }).filter(Boolean);
    return texts.join(' | ');
  }
  // Do not load mutable CRM values when reading a confirmed PG09 snapshot.
  const company={DF001:snap?.company?.name,DF002:snap?.company?.sector,
    DF003:snap?.company?.employeeCount,DF005:snap?.company?.country};
  let raw=Object.prototype.hasOwnProperty.call(company,id)?company[id]:record?.answers?.[id];
  if(id==='DF006'&&snap?.contacts?.length){
    const matches=snap.contacts.filter(x=>String(x.id)===String(raw));
    raw=(matches.length?matches:snap.contacts.slice(0,1)).map(x=>x.name).filter(Boolean).join(' · ');
  }
  if((raw===null||raw===undefined||raw===''||(Array.isArray(raw)&&!raw.length))
    &&!['DF001','DF002','DF003','DF004','DF005','DF006'].includes(id)
    &&typeof effectiveValue==='function'){
    try{raw=effectiveValue(meta,record)}catch(_){}
  }
  return asisReadableValue(meta,raw,record);
}
function asisConfirmedDataHtml(e){
  const snap=asisAnalysisSnapshot(e);
  if(!snap)return '<p class="field-help">No existe un snapshot confirmado del que mostrar datos.</p>';
  const rec=asisAnalysisSource(e),steps=(rec.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    frictions=(rec.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
    risks=(rec.risks||[]).filter(x=>x.status!=='SUPERSEDED'),
    economics=(rec.economicInputs||[]).filter(x=>x.status!=='SUPERSEDED');
  const fmt=(id,raw)=>asisReadableValue((schema.fields||[]).find(f=>f.Field_ID===id),raw,rec);
  const value=(label,v)=>v!==null&&v!==undefined&&v!==''?'<div><b>'+esc(label)+'</b><span>'+esc(String(v))+'</span></div>':'';
  const duration=x=>x===null||x===undefined?'No informado':Number(x).toLocaleString('es-ES',{maximumFractionDigits:2})+' min';
  const list=(items,fn)=>items.length?'<ul>'+items.map(x=>'<li>'+fn(x)+'</li>').join('')+'</ul>':'<p class="field-help">No hay registros asociados.</p>';
  const n=x=>Number(x).toLocaleString('es-ES',{maximumFractionDigits:2});
  const timeParts=s=>['trabajo '+duration(s.active_time),'espera '+duration(s.wait_time),'retrabajo '+duration(s.rework_time)];
  const economyInfo=x=>{
    const parts=[];
    if(x.capacity_cost_rate_eur_hour!=null&&['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08','ED14'].includes(x.driver_id))
      parts.push(n(x.capacity_cost_rate_eur_hour)+' €/h');
    if(x.driver_id==='ED14'&&x.value!=null)parts.push(n(x.value)+' '+(x.unit||'')+' / '+({month:'mes',year:'año',week:'semana',day:'día'}[x.period]||'periodo declarado'));
    if(x.driver_id==='ED12'&&x.current_tool_cost_eur_annual!=null)parts.push(n(x.current_tool_cost_eur_annual)+' €/año de herramientas');
    if(x.driver_id==='ED05'&&x.annual_active_hours!=null&&x.annual_active_hours!==0)parts.push(n(x.annual_active_hours)+' h/año de retrabajo');
    if(x.driver_id==='ED13'&&x.annual_wait_hours!=null&&x.annual_wait_hours!==0)parts.push(n(x.annual_wait_hours)+' h/año de espera');
    if(x.direct_loss_eur_annual!=null&&Number(x.direct_loss_eur_annual)>0)parts.push(n(x.direct_loss_eur_annual)+' €/año de pérdida registrada');
    const evidence=typeof labelFrom==='function'?labelFrom('OS_EVIDENCE_TYPE',x.evidence_type):'';
    return esc((typeof econDriverLabel==='function'&&econDriverLabel(x.driver_id))||'Registro económico')+
      (x.role_or_resource?' · '+esc((typeof labelFrom==='function'&&labelFrom('OS_ACTOR_ROLE',x.role_or_resource))||String(x.role_or_resource)):'')+
      (parts.length?' — '+esc(parts.join(' · ')):' — Sin importe cuantificado')+
      (evidence?' <small>('+esc(evidence)+')</small>':'');
  };
  const box=(heading,body)=>'<section class="asis-data-group"><h4>'+esc(heading)+'</h4>'+body+'</section>';
  const company=box('Empresa y proceso',
    '<div class="asis-data-pairs">'+
      value('Empresa',snap.company?.name||rec.answers?.DF001)+
      value('Proceso',snap.processName||rec.answers?.DF011)+
      value('Responsable',rec.answers?.DF016)+
      value('Objetivo',fmt('DF008',rec.answers?.DF008))+
    '</div>');
  const demand=box('Demanda y servicio',
    '<div class="asis-data-pairs">'+
      value('Volumen',rec.answers?.DF021!=null?fmt('DF021',rec.answers.DF021)+(rec.answers?.DF022?' / '+fmt('DF022',rec.answers.DF022):''):'')+
      value('Tiempo actual (end-to-end)',fmt('DF026',rec.answers?.DF026))+
      value('SLA declarado',fmt('DF025',rec.answers?.DF025))+
      value('Backlog',fmt('DF027',rec.answers?.DF027))+
    '</div>');
  const proc=box('Pasos del AS-IS ('+steps.length+')',list(steps,(s,i)=>
    '<b>'+esc((i+1)+'. '+(s.step_name||'Paso sin nombre'))+'</b><small>'+esc(timeParts(s).join(' · '))+'</small>'));
  const fr=box('Fricciones registradas ('+frictions.length+')',list(frictions,f=>
    '<b>'+esc(f.client_label||f.observable_signal||((typeof labelFrom==='function'&&labelFrom('OS_FRICTION_TYPE',f.friction_type))||'Fricción sin descripción'))+'</b>'+
    (f.frequency?.value!=null?'<small>Frecuencia registrada: '+esc(fmt('DF060',f.frequency))+'</small>':'')));
  const risk=box('Riesgos registrados ('+risks.length+')',list(risks,x=>
    '<b>'+esc(x.description||'Riesgo sin descripción')+'</b><small>Probabilidad: '+
      esc(x.likelihood_1_5==null?'No declarada':n(x.likelihood_1_5)+'/5')+
      ' · Impacto: '+esc(x.impact_1_5==null?'No declarado':n(x.impact_1_5)+'/5')+'</small>'));
  const econ=box('Información económica ('+economics.length+' registros)',list(economics,economyInfo)+
    '<p class="field-help">Son datos e hipótesis registrados; no equivalen a ahorro demostrado, retorno ni reducción de costes.</p>');
  const future=box('Estado objetivo',
    '<div class="asis-data-pairs">'+
    value('Resultados deseados',fmt('DF086',rec.answers?.DF086))+
    value('Elementos que deben mantenerse',fmt('DF087',rec.answers?.DF087))+
    value('Restricciones de plataforma',fmt('DF089',rec.answers?.DF089))+
    '</div>');
  return '<section class="asis-confirmed-data"><div class="asis-confirmed-data-heading"><b>Resumen de los datos del proceso</b>'+
    '<small>Fuente: AS-IS confirmado · versión '+esc(String(snap.version))+'</small></div>'+
    '<p class="field-help">Valores registrados, no conclusiones del motor. Trabajo, espera y retrabajo no se suman sin conciliación.</p>'+
    '<div class="asis-data-grid">'+company+demand+proc+fr+risk+econ+future+'</div></section>';
}
// [AUNEA-FE-PG10-SNAPSHOT-VALUES-163] END

function asisSourceTime(v){
  if(v===null||v===undefined||v==='')return 'Sin cuantificar';
  const n=Number(v);return Number.isFinite(n)?n.toLocaleString('es-ES',{maximumFractionDigits:2})+' min':'Sin cuantificar';
}
function asisSourceBoundary(record,fid){
  const v=record?.answers?.[fid];
  if(!v||typeof v!=='object')return v==null||v===''?'No consta':String(v);
  const n=Number(v.value);if(!Number.isFinite(n))return 'No consta';
  const unit=({min:'min',h:'horas',hour:'horas',day:'días'})[String(v.unit||'').toLowerCase()]||v.unit||'';
  return n.toLocaleString('es-ES')+' '+unit;
}
function asisPointRecords(record){
  const steps=(record?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    fr=(record?.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
    risks=(record?.risks||[]).filter(x=>x.status!=='SUPERSEDED'),
    impacts=(record?.economicInputs||[]).filter(x=>x.status!=='SUPERSEDED');
  const ids=x=>Array.isArray(x)?x.map(String):x==null?[]:[String(x)];
  const points=steps.map((step,index)=>{
    const match=(rows,key)=>rows.filter(x=>ids(x[key]).includes(String(step.id)));
    const frictions=match(fr,'affected_steps'),linkedRisks=match(risks,'step_ids'),economics=match(impacts,'step_ids');
    const gaps=[];
    if(step.active_time==null)gaps.push('Tiempo de trabajo del paso sin cuantificar');
    frictions.forEach((f,i)=>{
      if(!String(f.observable_signal||'').trim())gaps.push('Fricción '+(i+1)+': señal observable sin describir');
      if(!f.evidence_type)gaps.push('Fricción '+(i+1)+': tipo de evidencia pendiente');
    });
    linkedRisks.forEach((r,i)=>{if(r.controls_present===null||r.controls_present===undefined)
      gaps.push('Riesgo '+(i+1)+': controles no declarados')});
    economics.forEach((x,i)=>{if(!x.evidence_type)gaps.push('Impacto '+(i+1)+': evidencia no declarada')});
    return {step,index,frictions,risks:linkedRisks,impacts:economics,gaps,
      critical:frictions.length>0||linkedRisks.length>0||economics.length>0};
  });
  return {points,orphanFrictions:fr.filter(x=>!ids(x.affected_steps).some(id=>steps.some(s=>String(s.id)===id))),
    orphanRisks:risks.filter(x=>!ids(x.step_ids).some(id=>steps.some(s=>String(s.id)===id))),
    orphanImpacts:impacts.filter(x=>!ids(x.step_ids).some(id=>steps.some(s=>String(s.id)===id)))};
}
// Three contextual options per critical ProcessStep, all sourced from the same confirmed AS-IS.
// Applicability is deliberately undecided: no Pain→step economics or future-time rule is assumed.
function asisPointReviewHtml(p){
  const safe=x=>esc(String(x??''));
  const list=(items,fn,source)=>items.length?'<ul>'+items.map(x=>'<li'+(source?' '+source(x):'')+'>'+fn(x)+'</li>').join('')+'</ul>'
    :'<p class="field-help">No hay registros relacionados con este paso.</p>';
  const stepName=id=>p.allSteps.find(s=>String(s.id)===String(id))?.step_name||'Paso no localizado';
  const sourceEvidence=x=>x?labelFrom('OS_EVIDENCE_TYPE',x)||'Tipo de evidencia no identificado':'Evidencia sin clasificar';
  const periodUnit=period=>({case:'caso',month:'mes',year:'año',week:'semana',day:'día'})[String(period||'').toLowerCase()]||'periodo no especificado';
  const value=x=>x==null||x===''?'No informado':Number.isFinite(Number(x))
    ?Number(x).toLocaleString('es-ES',{maximumFractionDigits:2}):String(x);
  const rate=x=>{
    if(!x||x.value==null||x.value==='')return 'Frecuencia sin cuantificar';
    const token=String(x.mode||'').toLowerCase();
    if(token==='percent')return value(x.value)+' % de casos';
    return value(x.value)+' por '+periodUnit(x.period);
  };
  const minutes=x=>x?.value==null?'Sin tiempo informado':value(x.value)+' '+(x.unit||'min')+' por ocurrencia';
  const scope=x=>Array.isArray(x)&&x.length>1?'Relacionado con '+x.length+' pasos; es un único registro.':'Relacionado con este paso.';
  const affected=f=>Array.isArray(f.affected_steps)?f.affected_steps:[];
  const owner=f=>f.time_attribution?.step_id;
  const modeLabels={INCLUDED:'Incluido: no sumar otra vez',BREAKDOWN:'Desglose de retrabajo: no sumar otra vez',ADDITIONAL:'Adicional: sumar solo una vez al conciliar'};
  const frictions=list(p.frictions,f=>{
    const ownerId=owner(f),currentId=String(p.step.id),ownerHere=ownerId!=null&&String(ownerId)===currentId;
    const attribution=modeLabels[f.time_attribution?.mode]||'Atribución temporal pendiente de verificar';
    const ownerName=ownerId!=null?stepName(ownerId):'Sin paso propietario confirmado';
    const sourceSteps=affected(f);
    const relatedNames=sourceSteps.map(id=>stepName(id)).join(' · ');
    const causalNotes=f.notes||'';
    return '<b>'+safe(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type)||'Fricción registrada')+'</b>'
      +'<small><strong>Origen y frecuencia:</strong> '+safe(rate(f.frequency))+' · Evidencia: '+safe(sourceEvidence(f.evidence_type))+'</small>'
      +'<small><strong>Causa registrada:</strong> '+safe(normalizeArray(f.cause).map(x=>labelFrom('OS_FRICTION_CAUSE',x)||x).join(' · ')||'No informada')+'</small>'
      +'<small><strong>Trabajo relacionado:</strong> '+safe(minutes(f.active_time_loss))
      +(Number(f.wait_time_loss?.value)>0?' · Espera indicada: '+safe(minutes(f.wait_time_loss)):'')+'</small>'
      +'<small><strong>Atribución:</strong> '+safe(attribution)+'. Propietario: '
      +(ownerHere?'<strong>este paso</strong>':ownerId!=null?'<a href="#asis-source-step-'+attr(String(ownerId))+'">'+safe(ownerName)+'</a>':'<strong>pendiente</strong>')
      +'.</small>'
      +(sourceSteps.length>1?'<small><strong>Ámbito compartido:</strong> '+safe(relatedNames)+'. No se contabiliza una vez por cada paso afectado.</small>':'')
      +(f.observable_signal?'<small><strong>Señal:</strong> '+safe(f.observable_signal)+'</small>':'')
      +(causalNotes?'<details class="asis-origin-note"><summary>Nota de origen</summary><p>'+safe(causalNotes)+'</p></details>':'');
  },f=>'data-source-friction-id="'+attr(String(f.id||''))+'"');
  const risks=list(p.risks,r=>{
    const controls=r.controls_present===true?(normalizeArray(r.current_control).map(x=>x).join(' · ')||'Controles presentes, sin detalle')
      :r.controls_present===false?'No se declararon controles':'Controles sin verificar';
    const meta=[
      'Categoría: '+(labelFrom('OS_RISK_CATEGORY',r.category)||'Sin clasificar'),
      'Probabilidad: '+(r.likelihood_1_5==null?'Pendiente':value(r.likelihood_1_5)+'/5'),
      'Impacto: '+(r.impact_1_5==null?'Pendiente':value(r.impact_1_5)+'/5')
    ];
    const linked=Array.isArray(r.step_ids)?r.step_ids:[];
    return '<b>'+safe(r.description||'Riesgo registrado')+'</b>'
      +'<small>'+safe(meta.join(' · '))+'</small><small><strong>Controles:</strong> '+safe(controls)+'</small>'
      +(linked.length>1?'<small>'+safe(scope(linked))+'</small>':'')
      +(r.notes?'<details class="asis-origin-note"><summary>Nota y procedencia del riesgo</summary><p>'+safe(r.notes)+'</p></details>':'');
  },r=>'data-source-risk-id="'+attr(String(r.id||''))+'"');
  const economics=list(p.impacts,x=>{
    const linked=Array.isArray(x.step_ids)?x.step_ids:[];
    const rate=x.capacity_cost_rate_eur_hour;
    const tool=x.current_tool_cost_eur_annual;
    const capacity=x.value==null?'':value(x.value)+' '+(x.unit||'')+'/'+periodUnit(x.period);
    const entries=[];
    if(rate!=null)entries.push('Tarifa de capacidad: '+value(rate)+' €/hora');
    if(capacity)entries.push('Capacidad declarada: '+capacity);
    if(tool!=null)entries.push('Coste actual de herramienta: '+value(tool)+' €/año');
    if(x.annual_active_hours!=null&&Number(x.annual_active_hours)!==0)entries.push('Horas activas registradas: '+value(x.annual_active_hours)+' h/año');
    if(x.annual_wait_hours!=null&&Number(x.annual_wait_hours)!==0)entries.push('Horas de espera registradas: '+value(x.annual_wait_hours)+' h/año');
    if(x.direct_loss_eur_annual!=null&&Number(x.direct_loss_eur_annual)!==0)entries.push('Pérdida directa registrada: '+value(x.direct_loss_eur_annual)+' €/año');
    if(x.realized_cash_saving_eur_annual!=null&&Number(x.realized_cash_saving_eur_annual)!==0)entries.push('Ahorro de caja registrado: '+value(x.realized_cash_saving_eur_annual)+' €/año');
    return '<b>'+safe(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id||'Entrada económica')+'</b>'
      +'<small><strong>Rol o recurso:</strong> '+safe(labelFrom('OS_ACTOR_ROLE',x.role_or_resource)||x.role_or_resource||'No declarado')+'</small>'
      +(entries.length?'<small>'+safe(entries.join(' · '))+'</small>':'<small>Sin importes materiales cuantificados en este registro.</small>')
      +'<small><strong>Fuente:</strong> '+safe(sourceEvidence(x.evidence_type))+' · '+safe(scope(linked))+'</small>'
      +'<small>Evento vinculado por paso; no implica causa, importe recuperable ni ahorro.</small>'
      +'<small>El coste de capacidad no demuestra ahorro de caja; el coste actual de herramientas no se presupone eliminable.</small>'
      +(x.notes?'<details class="asis-origin-note"><summary>Nota económica de origen</summary><p>'+safe(x.notes)+'</p></details>':'');
  },x=>'data-source-economic-index="'+attr(String(p.allEconomics.indexOf(x)))+'"');
  return '<details class="asis-point-review"><summary>Consultar evidencias y relaciones del paso</summary>'
    +'<div class="asis-point-review-grid">'
    +'<div><b>Fricciones</b>'+frictions+'</div>'
    +'<div><b>Riesgos</b>'+risks+'</div>'
    +'<div><b>Registros económicos relacionados</b>'+economics+'</div></div>'
    +(p.gaps.length?'<details class="asis-opportunity-gaps"><summary>Información pendiente de comprobar ('+p.gaps.length+')</summary><ul>'
      +p.gaps.map(g=>'<li>'+safe(g)+'</li>').join('')+'</ul></details>':'')
    +'</details>';
}
function asisPointCardsHtml(record){
  const source=asisPointRecords(record),rows=source.points.filter(p=>p.critical);
  const singular=(n,one,many)=>n+' '+(n===1?one:many);
  const card=p=>{
    const step=p.step,related={...p,allSteps:source.points.map(x=>x.step),allEconomics:record.economicInputs||[]};
    const observed=p.frictions.map(f=>f.client_label||f.observable_signal||labelFrom('OS_FRICTION_TYPE',f.friction_type)||'Fricción registrada');
    const headline=observed.length?observed.join(' · '):p.risks.length?'Paso con riesgo registrado':'Paso relacionado con entradas económicas';
    const applicability=step.applies_to?.mode==='PERCENT'&&step.applies_to.value!=null
      ?' · Se ejecuta en '+esc(String(step.applies_to.value))+' % de los casos':'';
    const rate=step.error_rate?.mode==='percent'&&step.error_rate.value!=null
      ?String(step.error_rate.value)+' % de casos':'Frecuencia sin cuantificar';
    const hasRework=Number(step.rework_time)>0;
    return '<article class="asis-opportunity-point" id="asis-source-step-'+attr(String(step.id))+'" data-source-step-id="'+attr(String(step.id))+'">'
      +'<div class="asis-opportunity-head"><b>Paso '+(p.index+1)+' · '+esc(step.step_name||'Sin título')+'</b>'
      +'<span>'+singular(p.frictions.length,'fricción','fricciones')+' · '+singular(p.risks.length,'riesgo','riesgos')+' · '+singular(p.impacts.length,'registro económico','registros económicos')+'</span></div>'
      +'<p class="asis-point-headline">'+esc(headline)+'</p>'
      +'<div class="asis-opportunity-times">'
      +'<span>Trabajo: '+esc(asisSourceTime(step.active_time))+'</span>'
      +'<span>Espera registrada: '+esc(asisSourceTime(step.wait_time))+'</span>'
      +'<span>Retrabajo cuando falla: '+esc(asisSourceTime(step.rework_time))+(hasRework?' · '+esc(rate):'')+'</span></div>'
      +(applicability?'<p class="asis-point-conditional">Alcance de este paso'+applicability+'. No corresponde necesariamente a todos los casos.</p>':'')
      +(Number(step.wait_time)>0&&step.notes?'<details class="asis-origin-note asis-step-time-note"><summary>Consultar contexto del tiempo y las condiciones del paso</summary><p>'+esc(step.notes)+'</p></details>':'')
      +asisPointReviewHtml(related)+'</article>';
  };
  const orphan=source.orphanFrictions.length+source.orphanRisks.length+source.orphanImpacts.length;
  return '<div class="asis-opportunity-summary"><b>'+rows.length+' pasos con relaciones registradas</b> de '+source.points.length+' pasos activos. Los vínculos no son nuevas fricciones ni implican causa, beneficios o soluciones.</div>'
    +(rows.length?'<div class="asis-opportunity-list">'+rows.map(card).join('')+'</div>':'<p>No hay pasos con fricciones, riesgos o registros económicos enlazados.</p>')
    +(orphan?'<div class="notice warn">'+orphan+' registro(s) sin vínculo directo al paso activo. Revisar su alcance antes de atribuir efectos.</div>':'');
}
// [AUNEA-FE-PG10-COVERAGE-READINESS-162] START — Evidence-bound three-level coverage, no invented readiness
// SOURCE: Diagnostic Master v1.2; DEC-034/050/052; backend InputCoverageEngine (55 inputs).
// INPUT: confirmed AS-IS, existing capture validators and backend coverage result.
// OUTPUT: inspectable capture integrity, backend analysis sufficiency and consultant decisions.
// This is a read-only report. It does not replace official preflight or authorize publication.
function asisCoverageHtml(e,baseline){
  const record=asisAnalysisSource(e),groups=asisFieldInventory(record);
  const all=groups.flatMap(g=>g.items),total=all.length;
  const available=all.filter(x=>x.status==='AVAILABLE').length;
  const derived=all.filter(x=>x.status==='DERIVED').length;
  const absent=total-available-derived;
  const partial=all.filter(x=>x.source&&x.source.total>0&&x.source.count>0&&x.source.count<x.source.total);
  const required=typeof canonicalMissingRequired==='function'?canonicalMissingRequired(e):null;
  const integrity=typeof captureIntegrityIssues==='function'?captureIntegrityIssues(record):null;
  const pending=Array.isArray(required)?required:null;
  const invalid=Array.isArray(integrity)?integrity:null;
  const snap=asisAnalysisSnapshot(e);
  const inputCoverage=baseline?.input_coverage||null;
  const inputs=Array.isArray(inputCoverage?.items)?inputCoverage.items:null;
  const sourceName=x=>{
    const ids=normalizeArray(x?.source_fields).filter(fid=>String(fid).startsWith('DF'));
    return ids.map(fid=>(schema.fields||[]).find(f=>f.Field_ID===fid)?.Pregunta_o_etiqueta_ES||fid).join(' · ')
      ||'Dependencia técnica sin pregunta directa';
  };
  const inputIssues=inputs?inputs.filter(x=>x.status==='GAP'||x.status==='UNKNOWN_APPLICABILITY'):[];
  const blocked=inputIssues.filter(x=>x.status==='GAP'&&x.blocking);
  const uncertain=inputIssues.filter(x=>x.status==='UNKNOWN_APPLICABILITY');
  const covered=inputs?inputs.filter(x=>x.status==='COVERED').length:0;
  const notApplicable=inputs?inputs.filter(x=>x.status==='NOT_APPLICABLE').length:0;
  const official=typeof currentDiagnosticOutput==='function'?currentDiagnosticOutput(e):null;
  const decisions=typeof unresolvedEngineGates==='function'?unresolvedEngineGates(e):null;
  const decisionTotal=typeof ENGINE_GATE_CONTRACT!=='undefined'?ENGINE_GATE_CONTRACT.length:null;
  const decisionNames=(decisions||[]).map(d=>(typeof ENGINE_GATE_GUIDE!=='undefined'&&ENGINE_GATE_GUIDE[d.key]?.title)||d.label).filter(Boolean);
  // The canonical engine consumer stays in schema/inventory for traceability, not as a user-facing label.
  // Only surface a note when it changes what the consultant needs to review.
  const fieldNote=x=>{
    if(x.status==='MISSING_REQUIRED')return 'Dato obligatorio pendiente';
    if(x.source?.total>0&&x.source.count<x.source.total)
      return x.source.count+' de '+x.source.total+' registros con dato';
    if(x.status==='DERIVATION_NOT_AVAILABLE')return 'Sin resultado derivado';
    if(x.status==='NOT_CAPTURED_OR_CONDITIONAL')
      return x.source?.total===0?'Sin registros asociados':'Sin dato; comprobar si aplica';
    return '';
  };
  const fieldLabel=id=>{
    const f=(schema.fields||[]).find(x=>x.Field_ID===id);
    return f?.Pregunta_o_etiqueta_ES||id;
  };
  const safeMessages=(rows,max)=>rows.slice(0,max).map(x=>'<li>'+esc(typeof x==='string'?fieldLabel(x):x.message||x.label||'Incidencia de integridad')+'</li>').join('');
  const segment=(number,title,status,message,detail)=>
    '<article class="asis-coverage-check"><div class="asis-coverage-check-head"><b>'+number+'. '+esc(title)+'</b><span>'+esc(status)+'</span></div>'
    +'<p>'+message+'</p>'+detail+'</article>';
  const captureState=!snap?'Snapshot no disponible':
    !pending||!invalid?'Verificación incompleta':
    pending.length||invalid.length?'Revisión necesaria':'Sin incidencias detectadas';
  const captureDetail=
    '<div class="asis-coverage-facts">'+
      '<span>Snapshot: '+esc(snap?'v'+snap.version:'No disponible')+'</span>'+
      '<span>Obligatorios pendientes: '+(pending?pending.length:'No comprobados')+'</span>'+
      '<span>Incidencias de integridad: '+(invalid?invalid.length:'No comprobadas')+'</span>'+
    '</div>'+
    ((pending&&pending.length)?'<details><summary>Ver datos exigibles pendientes</summary><ul>'+safeMessages(pending,30)+'</ul></details>':'')+
    ((invalid&&invalid.length)?'<details><summary>Ver incidencias de estructura y coherencia</summary><ul>'+safeMessages(invalid,30)+'</ul></details>':'');
  const captureMessage=!snap?'No se ha localizado un AS-IS confirmado: no puede certificarse la integridad.':
    !pending||!invalid?'No se han ejecutado todas las comprobaciones locales de captura.':
    pending.length||invalid.length?'Hay datos o relaciones que requieren revisión desde su fuente, sin crear una segunda captura.':
    'El snapshot está confirmado y los validadores actuales no identifican datos obligatorios pendientes ni incoherencias estructurales. Esto no certifica la veracidad externa de lo declarado.';
  const coverageState=!inputs?'Sin evaluar':
    inputCoverage.status==='BLOCKED'?'Entradas bloqueantes':
    inputCoverage.status==='PARTIAL'?'Cobertura parcial':
    inputCoverage.status==='COMPLETE'?'Cobertura técnica completa':'No evaluada';
  const coverageMessage=!inputs
    ?'No consta una evaluación vigente de las entradas del backend. Ejecuta el análisis AS-IS para comprobar la suficiencia técnica; no se presupone a partir del número de campos rellenados.'
    :inputCoverage.status==='BLOCKED'
      ?'El backend identifica dependencias bloqueantes. La presencia de datos en el inventario no permite ignorarlas.'
    :inputCoverage.status==='PARTIAL'
      ?'El backend identifica entradas no cubiertas o de aplicabilidad incierta. Los resultados que dependan de ellas necesitan revisión.'
    :inputCoverage.status==='COMPLETE'
      ?'El backend no marca gaps críticos en este contrato de entradas. Esto no acredita por sí solo causalidad, conciliación temporal, ahorro ni viabilidad de implementación.'
      :'El backend aún no ha evaluado suficientemente el contrato de entradas para esta versión.';
  const coverageDetail=!inputs?'':
    '<div class="asis-coverage-facts"><span>Entradas evaluadas: '+inputs.length+'</span>'+
      '<span>Cubiertas: '+covered+'</span><span>No aplicables: '+notApplicable+'</span>'+
      '<span>Gaps: '+inputIssues.filter(x=>x.status==='GAP').length+'</span>'+
      '<span>Aplicabilidad incierta: '+uncertain.length+'</span>'+
      '<span>Bloqueantes: '+blocked.length+'</span></div>'+
    (inputIssues.length?'<details><summary>Ver fuentes no cubiertas y condiciones ('+inputIssues.length+')</summary><ul>'+
      inputIssues.map(x=>'<li><b>'+esc(sourceName(x))+'</b> — '+
        esc(x.status==='GAP'?'Fuente pendiente':'Aplicabilidad sin determinar')+
        (x.blocking?' · Bloqueante cuando aplica':' · No bloqueante según el contrato')+'</li>').join('')+
      '</ul></details>':'<p class="field-help">El contrato no registra gaps en esta evaluación; la validación de hipótesis económicas sigue siendo independiente.</p>');
  const decisionState=decisionTotal===null||!decisions?'No evaluado':
    decisions.length?'Decisiones pendientes':'Decisiones confirmadas';
  const decisionMessage=!decisions?'No se ha podido verificar el estado de las decisiones del consultor.':
    decisions.length
      ?'Quedan '+decisions.length+' de '+decisionTotal+' decisiones técnicas pendientes de confirmar sobre el snapshot vigente. No son respuestas faltantes del cliente.'
      :'Las '+decisionTotal+' decisiones técnicas constan confirmadas para el snapshot actual. El cálculo oficial exige además su preflight backend.';
  const decisionDetail='<div class="asis-coverage-facts"><span>Decisiones confirmadas: '+
    (decisions&&decisionTotal!==null?decisionTotal-decisions.length:'No comprobadas')+
    (decisionTotal!==null?' de '+decisionTotal:'')+'</span>'+
    '<span>Diagnóstico oficial vigente: '+(official?'Disponible':'No disponible')+'</span></div>'+
    (decisionNames.length?'<details><summary>Ver decisiones pendientes ('+decisionNames.length+')</summary><ul>'+
      decisionNames.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul></details>':'');
  const ledger='<details class="asis-field-ledger"><summary>Detalle de los '+total+' campos</summary>'+
    '<p class="field-help">Solo se muestran avisos cuando hay un dato sin registrar, una derivación no disponible o cobertura parcial. Los campos condicionales no implican por sí solos una respuesta obligatoria pendiente.</p>'+
    groups.map(g=>{
      const partialInGroup=g.items.filter(f=>f.source&&f.source.total>0&&f.source.count>0&&f.source.count<f.source.total).length;
      const missingRequired=g.items.filter(f=>f.status==='MISSING_REQUIRED').length;
      const context=(partialInGroup?' · '+partialInGroup+(partialInGroup===1?' campo parcial':' campos parciales'):'')+
        (missingRequired?' · '+missingRequired+' obligatorios pendientes':'');
      return '<details name="asis-coverage-field-groups"><summary>'+esc(g.title)+' · '+g.filled+' de '+g.items.length+' con algún dato'+context+'</summary><ul>'+
        g.items.map(f=>{
          const note=fieldNote(f),actual=f.filled?asisFieldValueDisplay(f,record,snap):'';
          // The full verified string is retained behind one intentional click for complex/repeatable values.
          // This avoids turning a 100-field audit into a second, uncontrolled copy of the diagnosis.
          const sourceCount=f.source?.count||0;
          const expand=!!actual&&(sourceCount>1||actual.length>120||actual.includes(' | '));
          const label='<span class="asis-ledger-label">'+esc(f.label)+'</span>';
          const display=expand
            ?'<details class="asis-ledger-value"><summary>'+
              esc(sourceCount>1?sourceCount+' registros · Ver valores':'Ver respuesta completa')+
              '</summary><div>'+esc(actual)+'</div></details>'
            :actual?'<span class="asis-ledger-short-value">'+esc(actual)+'</span>':'';
          return '<li class="asis-ledger-entry">'+label+
            '<div class="asis-ledger-result">'+display+
            (note?'<small class="asis-ledger-note">'+esc(note)+'</small>':'')+'</div></li>';
        }).join('')+'</ul></details>';
    }).join('')+'</details>';
  return '<div class="asis-coverage-overview"><b>'+total+' campos canónicos examinados</b>'+
    ' · '+available+' con algún dato · '+derived+' derivados accesibles · '+absent+
    ' sin dato accesible o condicionales. El inventario no mide por sí mismo si el diagnóstico es suficiente.</div>'+
    '<div class="asis-coverage-checks">'+
      segment('1','Integridad de la captura',captureState,captureMessage,captureDetail)+
      segment('2','Suficiencia para el análisis',coverageState,coverageMessage,coverageDetail)+
      segment('3','Preparación de los motores',decisionState,decisionMessage,decisionDetail)+
    '</div>'+asisConfirmedDataHtml(e)+ledger;
}
// [AUNEA-FE-PG10-COVERAGE-READINESS-162] END
function asisDirectionCardsHtml(e){
  const record=asisAnalysisSource(e),steps=(record?.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const officialReady=typeof currentDiagnosticOutput==='function'&&!!currentDiagnosticOutput(e);
  const gateEvidence=typeof engineGateReviewEvidence==='function'&&typeof ENGINE_GATE_CONTRACT!=='undefined'
    ?ENGINE_GATE_CONTRACT.map(g=>({name:ENGINE_GATE_GUIDE[g.key]?.title||g.label,...engineGateReviewEvidence(g,e)})):[];
  const names=items=>items.length?items.map(x=>x.step_name||'Paso sin título').join(' · '):'No consta un paso específico que permita adelantar una conclusión.';
  const manual=steps.filter(s=>normalizeArray(s.manual_actions).length>0);
  const documents=steps.filter(s=>normalizeArray(s.inputs).some(x=>['PDF','DOC','EMAIL','TEXT','DOCUMENT'].includes(String(x).toUpperCase())));
  const decisions=steps.filter(s=>['ST04','ST05'].includes(String(s.step_type))||
    normalizeArray(s.decision_criteria).length>0||!!s.exception_path?.destination_step);
  const contexts=[
    'Acciones manuales registradas en: '+names(manual)+'. La posibilidad de automatizarlas sigue sin comprobarse.',
    'Documentos o mensajes registrados como entrada en: '+names(documents)+'. Su variabilidad y necesidad real de IA deben contrastarse.',
    'Decisiones, excepciones o aprobaciones registradas en: '+names(decisions)+'. Su simplificación y las capacidades actuales deben verificarse.'
  ];
  return '<p class="field-help">Las tres vías se presentan una sola vez para todo el AS-IS; cada ficha muestra datos del proceso relevantes para evaluar su viabilidad. No son soluciones aprobadas ni escenarios cuantificados.</p>'
    +'<div class="asis-direction-grid">'+ASIS_CONDITIONAL_DIRECTIONS.map((d,i)=>
      '<article class="asis-direction-card"><h3>'+(i+1)+'. '+esc(d.name)+'</h3>'
      +'<p class="asis-direction-source"><b>Qué muestra este AS-IS</b><span>'+esc(contexts[i])+'</span></p>'
      +'<p><b>Se consideraría si:</b> '+esc(d.condition)+'</p>'
      +'<p><b>Intervención a contrastar:</b> '+esc(d.approach)+'</p>'
      +'<details class="asis-direction-detail"><summary>Ver ventajas, límites y comprobaciones</summary>'
      +'<p><b>Ventaja posible:</b> '+esc(d.advantage)+'</p>'
      +'<p><b>Limitación:</b> '+esc(d.drawback)+'</p>'
      +'<b>Comprobaciones necesarias</b><ul>'+d.dependencies.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>'
      +'<p class="asis-direction-pending">Tiempo futuro, ahorro y precio pendientes de hipótesis verificadas y simulación canónica.</p>'
      +'<button type="button" class="btn btn-outline" data-draft-conditional-scenario="'+i+'"'+(officialReady?'':' disabled title="Primero calcula el diagnóstico oficial"')+'>'+(officialReady?'Explorar esta alternativa con el motor':'Disponible tras calcular el diagnóstico oficial')+'</button></article>'
    ).join('')+'</div>'
    +(gateEvidence.length?'<details class="asis-conditional-gates"><summary>Condiciones técnicas evaluadas con los datos disponibles</summary>'+gateEvidence.map(g=>
      '<div class="asis-conditional-gate"><b>'+esc(g.name)+'</b><p>'+esc(g.reason||'Sin conclusión demostrada')+'</p><small>Evaluación: '+esc(g.status==='PROPOSAL'?'Propuesta para contrastar':g.status==='REVIEW'?'Pendiente de comprobar':'Información insuficiente')+'</small></div>').join('')+'</details>':'');
}
function asisBaselineHtml(e){
  const data=asisAnalysisResult(e);
  if(!data)return '<div class="notice info">Puedes examinar ya el mapa, los puntos críticos y los gaps. El análisis adicional del backend no necesita contestar las cinco decisiones de solución.</div><button class="btn btn-primary" id="analyzeAsisOnly">Analizar AS-IS y cuantificar línea base</button>';
  if(data.status!=='ANALYZED')return '<div class="notice warn"><b>Análisis parcial: entradas o relaciones pendientes.</b> No se calculan resultados derivados con fuentes incoherentes.</div>'
    +asisCoverageHtml(e,data)+'<button class="btn btn-outline" id="analyzeAsisOnly">Volver a comprobar fuentes</button>';
  const record=asisAnalysisSource(e);
  return '<div class="notice good"><b>Análisis AS-IS calculado por backend.</b> Sin seleccionar tecnología, sin precios y sin nuevas respuestas al cliente. No constituye aún una recomendación de solución.</div>'
    +(typeof diagnosisProcessBaselineHtml==='function'?diagnosisProcessBaselineHtml(data.process_time_projection,record):'')
    +(typeof diagnosisFindingsHtml==='function'?diagnosisFindingsHtml(record,data.pain_results||[]):'')
    +(typeof diagnosisRisksHtml==='function'&&data.risk_result?diagnosisRisksHtml(data.risk_result,record):'')
    +'<button class="btn btn-outline" id="analyzeAsisOnly">Actualizar análisis con el AS-IS vigente</button>';
}
// [AUNEA-FE-ASIS-WORKBENCH-152] END
