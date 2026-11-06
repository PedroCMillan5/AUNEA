// [AUNEA-FE-PG11-GLOBAL-QUALITY-300] START — read-only semantic quality projection.
// SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
// A thematic group is a REVIEW CANDIDATE, never a merge or client decision.
function tobeGlobalQualityGroups(opportunities){
  const list=Array.isArray(opportunities)?opportunities:[];
  const clean=value=>String(value||'').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es')
    .replace(/\s+/g,' ').trim();
  const words=value=>clean(value).replace(/[^a-z0-9]+/g,' ').trim();
  const kindOf=how=>{
    const t=clean(how);
    const actionApproval=/(?:recordatori|avis|notific|alert|seguimiento).{0,90}(?:aprobaci|aprobador|autorizar|autorice|aprobar|apruebe|manager realice la accion|responsable decida)|(?:aprobaci|aprobador).{0,90}(?:recordatori|avis|notific|alert|seguimiento)|pendient.{0,35}(?:aproba|autoriza)/.test(t);
    if(actionApproval)return 'APPROVAL_FOLLOWUP';
    const receiptTrace=/(?:confirm|acuse).{0,65}(?:recepci|entrada|numero de factura)|(?:correo|recepcion).{0,95}(?:relacion|vincul|correspond).{0,40}(?:registro|erp)|(?:trazabil|auditori|historico de acciones|registro de eventos)/.test(t);
    if(receiptTrace)return 'TRACEABILITY';
    const dataReuse=/reutiliz|reintroduc|tecle|captur|carga de datos|campo.{0,25}validac|validar (?:los |las )?(?:datos|campos)|datos ya (?:cargados|registrados)/.test(t);
    if(dataReuse)return 'DATA_REUSE';
    const visibility=/(?:recordatori|avis|notific|alert|seguimiento|consulta|estado actual|historial|visibilid)/.test(t);
    if(visibility)return 'VISIBILITY';
    if(/checklist|tareas repetid|plantilla de tareas|lista de tareas/.test(t))
      return 'TASK_SETUP';
    return null;
  };
  const domainOf=item=>{
    const t=clean([item?.how,item?.objective].join(' '));
    if(/factura|erp|contabilidad/.test(t))return 'FACTURA';
    if(/solicitud|intake|formulario/.test(t))return 'SOLICITUD';
    if(/proyecto|expediente/.test(t))return 'PROYECTO';
    if(/cliente|crm/.test(t))return 'CLIENTE';
    if(/documento|archivo/.test(t))return 'DOCUMENTO';
    return null;
  };
  const titles={
    DATA_REUSE:'Reducir la doble captura y validar datos',
    VISIBILITY:'Mejorar la visibilidad del estado',
    APPROVAL_FOLLOWUP:'Reducir esperas de aprobación manteniendo la decisión humana',
    TRACEABILITY:'Reforzar la trazabilidad de las actuaciones',
    TASK_SETUP:'Reutilizar tareas de preparación'
  };
  const outcomes={
    DATA_REUSE:'Reducir la reintroducción manual, sujeto a validar los campos disponibles.',
    VISIBILITY:'Facilitar el seguimiento del estado sin consultas manuales repetidas.',
    APPROVAL_FOLLOWUP:'Dar seguimiento a pendientes sin sustituir a quien aprueba.',
    TRACEABILITY:'Mantener una referencia comprobable entre actuaciones.',
    TASK_SETUP:'Evitar preparar de nuevo tareas ya definidas.'
  };
  const dataGoal=t=>/reintroduc|volver a teclear|doble captur|duplicad[oa]s? datos|repetir (?:la )?captur|datos de factura en el erp/.test(t);
  const followKind=k=>k==='VISIBILITY'||k==='APPROVAL_FOLLOWUP'||k==='TRACEABILITY';
  const indexed=list.map((item,index)=>{
    const kind=kindOf(item?.how),domain=domainOf(item),target=clean(item?.objective);
    const issues=(item?.quality?.issues||[]).map(x=>String(x?.message||x||'')).filter(Boolean);
    if(dataGoal(target)&&followKind(kind))
      issues.push('El objetivo original habla de doble captura, pero la acción es de seguimiento o trazabilidad.');
    if(/aprobaci|autorizaci/.test(target)&&kind==='DATA_REUSE'&&!/aproba|autoriza/.test(clean(item?.how)))
      issues.push('El objetivo trata aprobaciones y la acción se refiere a datos.');
    if(!kind||!domain)
      issues.push('No hay criterios suficientes para clasificar automáticamente esta intervención.');
    return {item,index,kind,domain,issues:[...new Set(issues)]};
  });
  for(const entry of indexed){
    if(!entry.kind)continue;
    const original=clean(entry.item?.objective);
    if(original&&indexed.some(other=>other!==entry&&original===clean(other.item?.objective)&&
       other.kind&&other.kind!==entry.kind))
      entry.issues=[...new Set([...entry.issues,'El mismo objetivo original se ha utilizado para acciones diferentes.'])];
  }
  const groups=new Map();
  for(const entry of indexed){
    // Never combine confirmed incompatibilities with conditional interventions.
    const status=entry.item?.review?.status||'UNASSESSED';
    const key=entry.kind&&entry.domain?
      entry.kind+':'+entry.domain+':'+status:'INDEPENDENT:'+entry.index;
    if(!groups.has(key))groups.set(key,{
      key,kind:entry.kind,domain:entry.domain,entries:[],
      title:titles[entry.kind]||String(entry.item?.objective||'Objetivo por revisar'),
      expectedOutcome:outcomes[entry.kind]||'Resultado por definir y comprobar.',
      relationship:'INDEPENDENT',priority:'SIN_PRIORIZAR'
    });
    groups.get(key).entries.push(entry);
  }
  for(const group of groups.values()){
    if(group.entries.length>1){
      group.relationship='RELATED_TO_REVIEW';
      const seen=new Set();
      for(const entry of group.entries){
        const action=words(entry.item?.how);
        if(seen.has(action))entry.issues.push('La acción coincide literalmente con otra: comprobar duplicidad.');
        seen.add(action);
      }
    }else if(group.entries.length===1&&!group.entries[0].issues.length){
      group.title=String(group.entries[0].item?.objective||group.title);
    }
    group.evidenceRefs=[...new Set(group.entries.flatMap(entry=>
      [ ...(entry.item?.source_refs||[]),
        ...(entry.item?.related||[]).flatMap(x=>x.source_refs||[])
      ].map(String)))];
    group.technicalChecks=[...new Set(group.entries.flatMap(entry=>
      (entry.item?.review?.verifications||[])
        .map(x=>String(x.question||'')).filter(Boolean)))];
    group.incompatible=group.entries.some(x=>x.item?.review?.status==='INCOMPATIBLE');
    group.qualityFlagged=group.entries.some(x=>x.issues.length>0);
  }
  const result=[...groups.values()];
  return {
    groups:result,recommendations:list.length,
    reviewCount:indexed.filter(x=>x.issues.length>0).length,
    relatedGroups:result.filter(x=>x.entries.length>1).length,
    unclassified:indexed.filter(x=>!x.kind||!x.domain).length,
    status:'DRAFT_UNAPPROVED',priority:'NOT_ESTABLISHED_WITHOUT_EVIDENCE'
  };
}
// [AUNEA-FE-PG11-GLOBAL-QUALITY-300] END
