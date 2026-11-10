// [AUNEA-FE-PG11-GLOBAL-QUALITY-300] START — domain-independent read-only review.
// SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
// INPUT: version-bound IA opportunities with source_refs and server review.
// OUTPUT: non-destructive candidate groups and caution signals.
// SIDE EFFECTS: none. No business field, owner, approval or workflow decision.
// CHANGE RISK: HIGH — keep individual interventions and original evidence intact.
function tobeGlobalQualityGroups(opportunities){
  const list=Array.isArray(opportunities)?opportunities:[];
  const clean=value=>String(value||'').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
  const significant=new Set(('de del la las el los un una unos unas y o en con por para al a '+
    'se su sus que esta este eso sobre mediante mediante dentro fuera como mas menos '+
    'hacer aplicar utilizar proceso procesos mejora mejoras actividad actividades '+
    'propuesta proponer datos informacion nuevo nueva nuevo nuevos').split(' '));
  const tokens=value=>[...new Set(clean(value).replace(/[^a-z0-9]+/g,' ')
    .split(' ').filter(w=>w.length>=3&&!significant.has(w)))];
  const overlap=(a,b)=>{
    const left=new Set(tokens(a)),right=new Set(tokens(b));
    return [...left].filter(w=>right.has(w)).length;
  };
  // Common mechanism words alone are not evidence of a shared operational need.
  const mechanismWords=new Set(('reutilizar validar verificacion verificar campos sistema '+
    'herramienta registro gestionar implementar establecer datos informacion '+
    'captura capturar seguimiento notificar notificacion controlar actividades').split(' '));
  const topicalOverlap=(a,b)=>{
    const left=new Set(tokens(a).filter(w=>!mechanismWords.has(w)));
    return tokens(b).filter(w=>left.has(w)).length;
  };
  const kindOf=how=>{
    const t=clean(how);
    const actionApproval=/(?:recordatori|avis|notific|alert|seguimiento).{0,90}(?:aprobaci|aprobador|autorizar|autorice|aprobar|apruebe|responsable decida)|(?:aprobaci|aprobador).{0,90}(?:recordatori|avis|notific|alert|seguimiento)/.test(t);
    if(actionApproval)return 'APPROVAL_FOLLOWUP';
    if(/(?:confirm|acuse).{0,65}(?:recepci|entrada|identificador)|(?:recepci|entrada|correo).{0,80}(?:confirmaci|referencia de registro)|(?:trazabil|auditori|historico de acciones|registro de eventos|vincul.{0,40}registro)/.test(t))return 'TRACEABILITY';
    if(/reutiliz|reintroduc|tecle|captur|carga de datos|campo.{0,25}validac|validar (?:los |las )?(?:datos|campos)|datos ya (?:cargados|registrados)/.test(t))return 'DATA_REUSE';
    if(/recordatori|avis|notific|alert|seguimiento|consulta|estado actual|historial|visibilid/.test(t))return 'VISIBILITY';
    if(/checklist|tareas repetid|plantilla de tareas|lista de tareas/.test(t))return 'TASK_SETUP';
    return null;
  };
  // These are generic *purposes*, not industry labels or a fixed catalogue of products.
  const titles={
    DATA_REUSE:'Reutilizar y validar información',
    VISIBILITY:'Mejorar el seguimiento y la visibilidad del estado',
    APPROVAL_FOLLOWUP:'Gestionar pendientes de aprobación sin sustituir a las personas',
    TRACEABILITY:'Conservar trazabilidad entre actuaciones',
    TASK_SETUP:'Estandarizar la preparación y las tareas repetidas'
  };
  const outcomes={
    DATA_REUSE:'Reducir capturas repetidas, condicionado a comprobar las fuentes y sistemas.',
    VISIBILITY:'Disponer de información de estado útil sin consultas innecesarias.',
    APPROVAL_FOLLOWUP:'Dar seguimiento a pendientes preservando las decisiones humanas.',
    TRACEABILITY:'Mantener referencias verificables entre actuaciones.',
    TASK_SETUP:'Reducir tareas de preparación repetidas, sujeto a validación.'
  };
  const indexed=list.map((item,index)=>{
    const kind=kindOf(item?.how),goal=clean(item?.objective);
    const issues=(item?.quality?.issues||[])
      .map(x=>String(x?.message||x||'')).filter(Boolean);
    const act=clean(item?.how);
    if((/reintroduc|volver a teclear|doble captur|datos duplicad/.test(goal))&&
       /(recordatori|avis|alert|notific|seguimiento)/.test(act)&&
       !/(reutiliz|captur|valid|tecle|reintroduc)/.test(act))
      issues.push('El objetivo es evitar una captura repetida, pero la acción sólo ofrece seguimiento.');
    // Warnings are domain-neutral hypotheses, not automatic rejection rules.
    if(/\bformularios?\b/.test(act)&&
      /(reutiliz|captur|valid|reintroduc|duplicad|teclear)/.test(goal+' '+act))
      issues.push('Comprobar que este formulario sustituye una captura existente y no obliga a introducir los mismos datos dos veces.');
    if(/(?:recordatori|avis|notific|alert)/.test(act)&&
       /(?:estado|situacion|pendiente)/.test(act))
      issues.push('Comprobar de dónde procede el estado comunicado y quién mantiene esa información actualizada.');
    if(/(?:registro|base de datos|hoja de calculo).{0,28}(?:intermedio|adicional|nuevo)|(?:intermedio|adicional).{0,28}registro/.test(act))
      issues.push('Comprobar si el registro adicional duplica el sistema de origen o exige mantenimiento manual.');
    if(!kind)issues.push('No hay criterios suficientes para clasificar automáticamente esta intervención.');
    return {item,index,kind,domain:kind?'PROCESS':null,
      issues:[...new Set(issues)],operationalChecks:(item?.review?.operational_checks||[])
        .map(x=>String(x?.question||'')).filter(Boolean)};
  });
  // Explicit cross-proposal warnings are advisory and leave all source records untouched.
  for(const entry of indexed){
    for(const other of indexed){
      if(other.index>=entry.index)continue;
      const sameGoal=clean(entry.item?.objective)&&
        clean(entry.item?.objective)===clean(other.item?.objective);
      if(sameGoal&&entry.kind&&other.kind&&entry.kind!==other.kind)
        entry.issues.push('El mismo objetivo se vincula a mecanismos diferentes: comprobar alcance y complementariedad.');
      const refs=new Set((entry.item?.source_refs||[]).map(String));
      const sameSource=(other.item?.source_refs||[]).some(id=>refs.has(String(id)));
      const actionOverlap=overlap(entry.item?.how,other.item?.how);
      const size=Math.min(tokens(entry.item?.how).length,tokens(other.item?.how).length);
      if(entry.kind===other.kind&&sameSource&&size>=3&&
         actionOverlap/size>=.7)
        entry.issues.push('Posible redundancia semántica con otra intervención de la misma fuente.');
      const actions=[clean(entry.item?.how),clean(other.item?.how)];
      const contradictory=actions.some(x=>/\b(eliminar|suprimir|retirar)\b/.test(x))&&
        actions.some(x=>/\b(mantener|conservar|preservar)\b/.test(x));
      if(sameSource&&contradictory&&actionOverlap>=2)
        entry.issues.push('Posibles instrucciones opuestas sobre una misma fuente; revisar antes de aplicar.');
    }
    entry.issues=[...new Set(entry.issues)];
  }
  const related=(entry,other)=>{
    if(entry.kind!==other.kind||!entry.kind)return false;
    if((entry.item?.review?.status||'UNASSESSED')!==
       (other.item?.review?.status||'UNASSESSED'))return false;
    const a=entry.item?.how,b=other.item?.how;
    const shared=overlap(a,b);
    const sources=new Set((entry.item?.source_refs||[]).map(String));
    const sameSource=(other.item?.source_refs||[]).some(id=>sources.has(String(id)));
    return (sameSource&&shared>=2)||
      (shared>=3&&topicalOverlap(a,b)>=1);
  };
  const groups=[];
  for(const entry of indexed){
    let group=groups.find(g=>g.entries.some(existing=>related(entry,existing)));
    if(!group){
      group={key:'GROUP:'+entry.index,kind:entry.kind,domain:entry.domain,
        entries:[],title:String(entry.item?.objective||titles[entry.kind]||'Objetivo por revisar'),
        expectedOutcome:outcomes[entry.kind]||'Resultado por definir y comprobar.',
        relationship:'INDEPENDENT',priority:'SIN_PRIORIZAR'};
      groups.push(group);
    }
    group.entries.push(entry);
  }
  for(const group of groups){
    if(group.entries.length>1){
      group.relationship='RELATED_TO_REVIEW';
      group.title=titles[group.kind]||group.title;
      group.reviewHint='Estas intervenciones persiguen un objetivo relacionado. Antes de implantarlas, comprobar si son alternativas o actuaciones complementarias, evitando duplicar tareas.';
      // A grouping is for reading only: it does not merge two interventions.
    }
    group.evidenceRefs=[...new Set(group.entries.flatMap(entry=>
      [...(entry.item?.source_refs||[]),
       ...(entry.item?.related||[]).flatMap(x=>x.source_refs||[])].map(String)))];
    group.technicalChecks=[...new Set(group.entries.flatMap(entry=>
      (entry.item?.review?.verifications||[])
        .map(x=>String(x.question||'')).filter(Boolean)))];
    group.operationalChecks=[...new Set(group.entries.flatMap(entry=>entry.operationalChecks))];
    group.incompatible=group.entries.some(x=>x.item?.review?.status==='INCOMPATIBLE');
    group.qualityFlagged=group.entries.some(x=>x.issues.length>0||x.operationalChecks.length>0);
  }
  return {
    groups,recommendations:list.length,
    reviewCount:indexed.filter(x=>x.issues.length>0).length,
    operationalReviewCount:indexed.filter(x=>x.operationalChecks.length>0).length,
    operationalNotEvaluated:indexed.filter(x=>
      !Array.isArray(x.item?.review?.operational_checks)).length,
    relatedGroups:groups.filter(x=>x.entries.length>1).length,
    unclassified:indexed.filter(x=>!x.kind).length,
    status:'DRAFT_UNAPPROVED',priority:'NOT_ESTABLISHED_WITHOUT_EVIDENCE'
  };
}
// [AUNEA-FE-PG11-GLOBAL-QUALITY-300] END
