// [AUNEA-FE-PG11-GLOBAL-QUALITY-300] START — read-only semantic screening & grouping.
// SOURCE: PG11 CANONICAL + DEC-034/050/052/055. Never writes business values.
// All groups are presentation candidates; the unmodified aiGlobal opportunities
// remain the versioned source, including original wording and every source ref.
function tobeGlobalQualityGroups(opportunities){
  const list=Array.isArray(opportunities)?opportunities:[];
  const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
  const source=s=>clean(s).replace(/[^a-z0-9]+/g,' ').trim();
  const actionKind=how=>{
    const text=clean(how);
    const follow=/\b(aviso|avisos|alerta|alertas|recordatorio|recordatorios|notificaci|seguimiento|estado|confirmaci)/.test(text);
    const approval=/aproba|autoriza|decision humana|firmante/.test(text);
    if(follow&&approval)return 'APPROVAL_FOLLOWUP';
    if(follow)return 'FOLLOWUP';
    if(/reutiliz|reintroduc|tecle|captur|carga de datos|campos? de validaci|validaci[oó]n de datos|validar (?:los |las )?(?:datos|campos)|datos ya/.test(text))
      return 'DATA_REUSE';
    if(/trazabil|auditori|registro de eventos|historico de acciones/.test(text))
      return 'TRACEABILITY';
    if(/checklist|tareas repetid|plantilla de tareas|lista de tareas/.test(text))
      return 'TASK_SETUP';
    return null;
  };
  const domain=how=>{
    const text=clean(how);
    if(/factura|erp|contabilidad/.test(text))return 'FACTURA';
    if(/solicitud|intake|formulario/.test(text))return 'SOLICITUD';
    if(/proyecto|expediente/.test(text))return 'PROYECTO';
    if(/cliente|crm/.test(text))return 'CLIENTE';
    if(/documento|archivo/.test(text))return 'DOCUMENTO';
    return null;
  };
  const titles={
    DATA_REUSE:'Reutilización y validación de datos',
    FOLLOWUP:'Seguimiento y visibilidad del proceso',
    APPROVAL_FOLLOWUP:'Seguimiento de aprobaciones humanas',
    TRACEABILITY:'Trazabilidad de las actuaciones',
    TASK_SETUP:'Preparación y reutilización de tareas'
  };
  const buckets=new Map(),indexed=list.map((item,index)=>({
    item,index,kind:actionKind(item?.how),domain:domain(item?.how),
    issues:[...(item?.quality?.issues||[]).map(x=>String(x?.message||x||''))]
      .filter(Boolean)
  }));
  for(const entry of indexed){
    const title=clean(entry.item?.objective),
      hasCaptureObjective=/reintroduc|volver a teclear|doble captur|duplicad[oa]s? datos|repetir (?:la )?captur/.test(title),
      follow=entry.kind==='FOLLOWUP'||entry.kind==='APPROVAL_FOLLOWUP';
    if(hasCaptureObjective&&follow&&
       !/reutiliz|reintroduc|tecle|captur|validar datos/.test(clean(entry.item.how)))
      entry.issues.push('El objetivo habla de captura duplicada, pero la acción trata de seguimiento o avisos.');
    if(/aproba|autoriza/.test(title)&&entry.kind==='DATA_REUSE'&&
       !/aproba|autoriza/.test(clean(entry.item.how)))
      entry.issues.push('El objetivo trata aprobaciones y la acción propone reutilización de datos.');
    for(const other of indexed){
      if(other.index===entry.index)continue;
      if(title&&title===clean(other.item?.objective)&&entry.kind&&other.kind&&
         entry.kind!==other.kind){
        entry.issues.push('El mismo objetivo se utiliza para intervenciones de naturaleza diferente.');
        break;
      }
    }
    entry.issues=[...new Set(entry.issues)];
    const key=entry.kind&&entry.domain?
      entry.kind+':'+entry.domain+':'+String(entry.item?.review?.status||'UNASSESSED'):
      'INDEPENDENT:'+entry.index;
    if(!buckets.has(key))buckets.set(key,{
      key,title:titles[entry.kind]||String(entry.item?.objective||'Objetivo pendiente de revisión'),
      entries:[],kind:entry.kind,domain:entry.domain});
    buckets.get(key).entries.push(entry);
  }
  const groups=[...buckets.values()].map(group=>{
    if(group.entries.length===1&&!group.entries[0].issues.length)
      group.title=String(group.entries[0].item?.objective||group.title);
    if(group.entries.length>1){
      // Similar mechanisms can hide distinct controls. Label as related,
      // never automatically mark one proposal as redundant or delete it.
      group.relationship='RELATED_TO_REVIEW';
      const seen=new Map();
      for(const entry of group.entries){
        const key=source(entry.item.how);
        if(seen.has(key))entry.issues.push('La intervención repite literalmente una acción del grupo.');
        else seen.set(key,entry.index);
      }
    }else group.relationship='INDEPENDENT';
    return group;
  });
  return {
    groups,
    recommendations:list.length,
    reviewCount:indexed.filter(x=>x.issues.length>0).length,
    relatedGroups:groups.filter(x=>x.entries.length>1).length,
    status:'DRAFT_UNAPPROVED',
  };
}
// [AUNEA-FE-PG11-GLOBAL-QUALITY-300] END
