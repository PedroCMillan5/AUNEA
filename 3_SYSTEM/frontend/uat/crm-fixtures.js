// [AUNEA-UAT-CRM-PHASE1-070] START — UAT reset · Phase 1 complete CRM dataset
// PURPOSE: Start UAT from zero with one deterministic, complete CRM-only dataset for every frozen CRM screen.
// SOURCE: User instruction 2026-09-22; DEC-050/051/058/061/066; PROJECT_RULES v1.7.
// INPUTS: current Company/Contact/Interaction/Opportunity contracts.
// OUTPUTS: UAT1-CRM-* records only; 12 Companies, 24 Contacts, 24 Interactions, 16 Opportunities.
// SIDE_EFFECTS: explicit load/reset actions mutate only UAT/dummy records and QA-only state; real records are preserved.
// CHANGE_RISK: HIGH.
const PHASE1_COMPANY_COUNT=12,PHASE1_CONTACT_COUNT=24,PHASE1_INTERACTION_COUNT=24,PHASE1_OPPORTUNITY_COUNT=16;
function phase1Iso(offsetDays=0,hour=10){
  const d=new Date('2026-09-22T10:00:00+02:00');d.setDate(d.getDate()+offsetDays);d.setHours(hour,0,0,0);return d.toISOString();
}
function phase1CompanyId(n){return `UAT1-CRM-CMP-${String(n).padStart(3,'0')}`}
function phase1ContactId(n){return `UAT1-CRM-CON-${String(n).padStart(3,'0')}`}
function phase1OpportunityId(n){return `UAT1-CRM-OPP-${String(n).padStart(3,'0')}`}
function phase1InteractionId(n){return `UAT1-CRM-INT-${String(n).padStart(3,'0')}`}
function isPhase1CrmId(v){return String(v||'').startsWith('UAT1-CRM-')}
function isAnyUatRecordId(v){const s=String(v||'');return /^UAT(?:1)?-/.test(s)||s.startsWith('DUMMY-CRM-')}
function isAnyUatProject(p){return isAnyUatRecordId(p?.id)||isAnyUatRecordId(p?.engagementId)}

function phase1CrmSeed(){
  const names=['Albor Consultores','Brisa Retail','Cartago Logística','Delta Salud','Epsilon Ingeniería','Faro Formación','Génesis Legal','Horizonte Hospitality','Ícaro Tecnología','Jara Industrial','Kairós Servicios','Litoral Alimentación'];
  const legal=['Albor Consultores SL','Brisa Retail SL','Cartago Logística SA','Delta Salud SL','Epsilon Ingeniería SL','Faro Formación SL','Génesis Legal SLP','Horizonte Hospitality SL','Ícaro Tecnología SL','Jara Industrial SA','Kairós Servicios SL','Litoral Alimentación SL'];
  const sectors=['CNAE25-N','CNAE25-G','CNAE25-H','CNAE25-Q','CNAE25-M','CNAE25-P','CNAE25-M','CNAE25-I','CNAE25-J','CNAE25-C','CNAE25-N','CNAE25-C'];
  const sizes=[8,22,65,130,245,18,42,95,310,480,55,175];
  const orgs=['Empresa privada','Empresa privada','Empresa privada','Empresa privada','Empresa privada','Empresa privada','Empresa privada','Empresa privada','Empresa privada','Empresa privada','Asociación','Empresa privada'];
  const statuses=['Prospecto','Cliente','Prospecto','Cliente','Prospecto','Colaborador','Cliente','Prospecto','En pausa','Cliente','Prospecto','Archivada'];
  const channels=['Recomendación','Red personal','Inbound','Cliente existente','Contacto directo','Recomendación','Cliente existente','Inbound','Red personal','Cliente existente','Contacto directo','Recomendación'];
  const companies=names.map((name,i)=>({
    id:phase1CompanyId(i+1),name,tradeName:legal[i],taxId:`B${String(71000000+i+1)}`,sector:sectors[i],employeeCount:sizes[i],country:'ES',
    orgType:orgs[i],website:`https://uat-${String(i+1).padStart(2,'0')}.example.invalid`,status:statuses[i],entryChannel:channels[i],
    owner:'Pedro Carrasco',notes:`UAT Fase 1 CRM · ficha completa de ${name}. Dataset sintético no comercial.`,
    primaryContactId:phase1ContactId(i*2+1),createdAt:phase1Iso(-120+i*6,9)
  }));

  const firstNames=['Lucía','Álvaro','Marta','Daniel','Ana','Sergio','Clara','Pablo','Elena','Javier','Nuria','Miguel','Sara','David','Irene','Carlos','Paula','Raúl','Marina','Hugo','Laura','Óscar','Carmen','Adrián'];
  const lastNames=['Martínez','Ruiz','Soler','Ortega','Navarro','López','Molina','Vera','Cano','Gil','Campos','Peña','Ramos','Santos','Pérez','Torres','Romero','Muñoz','García','Moreno','Sánchez','Iglesias','Vidal','Ferrando'];
  const roles=['Dirección general','Operaciones','Comercial / Ventas','Tecnología / IT','Administración / Finanzas','Project Management / PMO','Responsable de área','Marketing','Personas / RR. HH.','Producto','Compras','Legal / Compliance'];
  const contacts=Array.from({length:PHASE1_CONTACT_COUNT},(_,i)=>{
    const companyIndex=Math.floor(i/2),isPrimary=i%2===0,status=i%9===7?'Inactivo':i%7===5?'Pendiente':'Activo';
    return {
      id:phase1ContactId(i+1),companyId:phase1CompanyId(companyIndex+1),firstName:firstNames[i],lastName:lastNames[i],
      role:roles[i%roles.length],email:`uat.crm.${String(i+1).padStart(2,'0')}@example.invalid`,phone:`+34 620 ${String(100000+i+1).slice(0,3)} ${String(100000+i+1).slice(3)}`,
      status:isPrimary?'Activo':status,notes:`UAT Fase 1 · contacto ${isPrimary?'principal':'secundario'} completo de ${names[companyIndex]}.`,createdAt:phase1Iso(-115+i*3,10)
    };
  });

  const oppTitles=['Optimización de intake comercial','Automatización de seguimiento','Trazabilidad de incidencias','Flujo documental de altas','Control operativo de proyectos','Gestión de solicitudes internas','Pipeline de propuestas','Coordinación de onboarding','Seguimiento de entregables','Control de aprobaciones','Automatización de reporting','Gestión de documentación','Planificación de capacidad','Mejora del cierre comercial','Control de cambios','Estandarización de operaciones'];
  const stages=['Nueva','Contactada','Reunión','Diagnóstico','Propuesta','Ganada','Perdida','En pausa','Nueva','Contactada','Reunión','Diagnóstico','Propuesta','Ganada','Perdida','En pausa'];
  const sources=['Red personal','Referido','Inbound','Cliente existente','Otro'];
  const opportunities=Array.from({length:PHASE1_OPPORTUNITY_COUNT},(_,i)=>{
    const ci=i%PHASE1_COMPANY_COUNT,c1=ci*2+1,c2=ci*2+2;
    return {
      id:phase1OpportunityId(i+1),companyId:phase1CompanyId(ci+1),title:oppTitles[i],stage:stages[i],source:sources[i%sources.length],
      owner:'Pedro Carrasco',notes:`UAT Fase 1 · oportunidad completa para ${names[ci]}; caso ${i+1} de ${PHASE1_OPPORTUNITY_COUNT}.`,
      contactIds:[phase1ContactId(c1),phase1ContactId(c2)],createdAt:phase1Iso(-48+i*2,9),updatedAt:phase1Iso(-16+i,16)
    };
  });

  const types=['Reunión','Llamada','Email','Mensaje','Evento','Nota interna'];
  const channelsI=['Videollamada','Teléfono','Email','LinkedIn','Presencial','Otro'];
  const directions=['Saliente','Entrante','Interna'];
  const outcomes=['Avanza','Requiere seguimiento','Sin resultado aún','Bloqueado','Cerrado'];
  const interactions=Array.from({length:PHASE1_INTERACTION_COUNT},(_,i)=>{
    const ci=i%PHASE1_COMPANY_COUNT,c1=ci*2+1,c2=ci*2+2,opp=(i%PHASE1_OPPORTUNITY_COUNT)+1;
    return {
      id:phase1InteractionId(i+1),companyId:phase1CompanyId(ci+1),contactIds:[phase1ContactId(c1),phase1ContactId(c2)],
      occurredAt:phase1Iso(-30+i,9+(i%8)),type:types[i%types.length],channel:channelsI[i%channelsI.length],direction:directions[i%directions.length],
      subject:`Seguimiento UAT CRM ${String(i+1).padStart(2,'0')} · ${names[ci]}`,
      summary:`Interacción completa de la Fase 1 para validar timeline, filtros, relaciones, resultado, seguimiento y evidencia en ${names[ci]}.`,
      outcome:outcomes[i%outcomes.length],opportunityId:phase1OpportunityId(opp),engagementId:null,
      nextFollowUpAt:phase1Iso(2+(i%14),10+(i%6)),evidenceRef:`DRIVE://UAT1-CRM/EVIDENCE-${String(i+1).padStart(3,'0')}`,
      createdAt:phase1Iso(-30+i,9+(i%8))
    };
  });
  return {companies,contacts,interactions,opportunities};
}

function phase1CrmCounts(){
  return {
    companies:state.companies.filter(x=>isPhase1CrmId(x.id)).length,
    contacts:state.contacts.filter(x=>isPhase1CrmId(x.id)).length,
    interactions:(state.interactions||[]).filter(x=>isPhase1CrmId(x.id)).length,
    opportunities:(state.opportunities||[]).filter(x=>isPhase1CrmId(x.id)).length
  };
}
function resetAllUatData({ask=true}={}){
  const uatEngagementIds=new Set((state.engagements||[]).filter(e=>isAnyUatRecordId(e.id)).map(e=>e.id));
  const before={
    companies:state.companies.length,contacts:state.contacts.length,interactions:(state.interactions||[]).length,
    opportunities:(state.opportunities||[]).length,engagements:(state.engagements||[]).length,projects:(state.projects||[]).length
  };
  if(ask&&!confirm('¿Reiniciar las UAT desde cero? Se eliminarán exclusivamente datos UAT/dummy anteriores. Los datos reales no se tocarán.'))return false;
  state.companies=state.companies.filter(x=>!isAnyUatRecordId(x.id));
  state.contacts=state.contacts.filter(x=>!isAnyUatRecordId(x.id));
  state.interactions=(state.interactions||[]).filter(x=>!isAnyUatRecordId(x.id));
  state.opportunities=(state.opportunities||[]).filter(x=>!isAnyUatRecordId(x.id));
  state.engagements=(state.engagements||[]).filter(x=>!isAnyUatRecordId(x.id));
  state.projects=(state.projects||[]).filter(p=>!isAnyUatRecordId(p.id)&&!uatEngagementIds.has(p.engagementId));
  if(isAnyUatRecordId(state.selectedCompanyId))state.selectedCompanyId=null;
  if(isAnyUatRecordId(state.selectedContactId))state.selectedContactId=null;
  if(isAnyUatRecordId(state.activeEngagementId))state.activeEngagementId=null;
  state.uatLastRun=null;delete state.studyUatResults;delete state.crmUatResults;
  const removed={
    companies:before.companies-state.companies.length,contacts:before.contacts-state.contacts.length,
    interactions:before.interactions-state.interactions.length,opportunities:before.opportunities-state.opportunities.length,
    engagements:before.engagements-state.engagements.length,projects:before.projects-state.projects.length
  };
  markDirty(`Reinicio UAT: eliminados ${removed.companies} empresas, ${removed.contacts} contactos, ${removed.interactions} interacciones, ${removed.opportunities} oportunidades, ${removed.engagements} estudios y ${removed.projects} proyectos UAT`);
  persistRecoverySnapshot('uat-reset-clean');
  if(ask){render();toast('UAT reiniciada. Datos UAT anteriores eliminados; datos reales conservados.')}
  return true;
}
function loadPhase1CrmData(){
  resetAllUatData({ask:false});
  const d=phase1CrmSeed();
  state.companies.push(...d.companies);state.contacts.push(...d.contacts);state.interactions.push(...d.interactions);state.opportunities.push(...d.opportunities);
  state.selectedCompanyId=null;state.selectedContactId=null;state.activeEngagementId=null;state.activePage='inicio';
  markDirty(`UAT Fase 1 CRM cargada: ${d.companies.length} empresas, ${d.contacts.length} contactos, ${d.interactions.length} interacciones, ${d.opportunities.length} oportunidades; 0 estudios`);
  persistRecoverySnapshot('uat-phase1-crm-load');render();
  toast('Fase 1 CRM cargada. Estudios y proyectos UAT permanecen a cero.');
}
function phase1CrmCompletenessReport(){
  const d={
    companies:state.companies.filter(x=>isPhase1CrmId(x.id)),
    contacts:state.contacts.filter(x=>isPhase1CrmId(x.id)),
    interactions:(state.interactions||[]).filter(x=>isPhase1CrmId(x.id)),
    opportunities:(state.opportunities||[]).filter(x=>isPhase1CrmId(x.id))
  },checks=[];
  const add=(label,expected,actual,pass)=>checks.push({label,expected,actual,pass:!!pass});
  const companyIds=new Set(d.companies.map(x=>x.id)),contactIds=new Set(d.contacts.map(x=>x.id)),oppIds=new Set(d.opportunities.map(x=>x.id));
  const allFilled=(rows,fields)=>rows.every(r=>fields.every(f=>r[f]!==undefined&&r[f]!==null&&String(r[f]).trim()!==''));
  add('12 empresas UAT',PHASE1_COMPANY_COUNT,d.companies.length,d.companies.length===PHASE1_COMPANY_COUNT);
  add('24 contactos UAT',PHASE1_CONTACT_COUNT,d.contacts.length,d.contacts.length===PHASE1_CONTACT_COUNT);
  add('24 interacciones UAT',PHASE1_INTERACTION_COUNT,d.interactions.length,d.interactions.length===PHASE1_INTERACTION_COUNT);
  add('16 oportunidades UAT',PHASE1_OPPORTUNITY_COUNT,d.opportunities.length,d.opportunities.length===PHASE1_OPPORTUNITY_COUNT);
  add('Company: todos los campos aplicables completos',true,allFilled(d.companies,['name','tradeName','taxId','sector','employeeCount','country','orgType','website','status','entryChannel','owner','notes','primaryContactId','createdAt']),allFilled(d.companies,['name','tradeName','taxId','sector','employeeCount','country','orgType','website','status','entryChannel','owner','notes','primaryContactId','createdAt']));
  add('Contact: todos los campos completos',true,allFilled(d.contacts,['companyId','firstName','lastName','role','email','phone','status','notes','createdAt']),allFilled(d.contacts,['companyId','firstName','lastName','role','email','phone','status','notes','createdAt']));
  add('Opportunity: todos los campos completos',true,d.opportunities.every(o=>allFilled([o],['companyId','title','stage','source','owner','notes','createdAt','updatedAt'])&&o.contactIds.length>=1),d.opportunities.every(o=>allFilled([o],['companyId','title','stage','source','owner','notes','createdAt','updatedAt'])&&o.contactIds.length>=1));
  add('Interaction: campos CRM aplicables completos',true,d.interactions.every(i=>allFilled([i],['companyId','occurredAt','type','channel','direction','subject','summary','outcome','opportunityId','nextFollowUpAt','evidenceRef','createdAt'])&&i.contactIds.length>=1&&i.engagementId===null),d.interactions.every(i=>allFilled([i],['companyId','occurredAt','type','channel','direction','subject','summary','outcome','opportunityId','nextFollowUpAt','evidenceRef','createdAt'])&&i.contactIds.length>=1&&i.engagementId===null));
  add('Contact.Company_ID válido',true,d.contacts.every(c=>companyIds.has(c.companyId)),d.contacts.every(c=>companyIds.has(c.companyId)));
  add('Primary Contact pertenece a su Company',true,d.companies.every(co=>d.contacts.some(c=>c.id===co.primaryContactId&&c.companyId===co.id)),d.companies.every(co=>d.contacts.some(c=>c.id===co.primaryContactId&&c.companyId===co.id)));
  add('Opportunity refs válidas',true,d.opportunities.every(o=>companyIds.has(o.companyId)&&o.contactIds.every(id=>contactIds.has(id))),d.opportunities.every(o=>companyIds.has(o.companyId)&&o.contactIds.every(id=>contactIds.has(id))));
  add('Interaction refs válidas',true,d.interactions.every(i=>companyIds.has(i.companyId)&&i.contactIds.every(id=>contactIds.has(id))&&oppIds.has(i.opportunityId)),d.interactions.every(i=>companyIds.has(i.companyId)&&i.contactIds.every(id=>contactIds.has(id))&&oppIds.has(i.opportunityId)));
  add('Estados Company válidos',true,d.companies.every(c=>COMPANY_STATUS.includes(c.status)),d.companies.every(c=>COMPANY_STATUS.includes(c.status)));
  add('Estados/Cargos Contact válidos',true,d.contacts.every(c=>CONTACT_STATUS.includes(c.status)&&CONTACT_ROLE_OPTIONS.includes(c.role)),d.contacts.every(c=>CONTACT_STATUS.includes(c.status)&&CONTACT_ROLE_OPTIONS.includes(c.role)));
  add('Stages/Origen Opportunity válidos',true,d.opportunities.every(o=>OPPORTUNITY_STAGE.includes(o.stage)&&OPPORTUNITY_SOURCE.includes(o.source)),d.opportunities.every(o=>OPPORTUNITY_STAGE.includes(o.stage)&&OPPORTUNITY_SOURCE.includes(o.source)));
  add('Interaction enums válidos',true,d.interactions.every(i=>INTERACTION_TYPE.includes(i.type)&&INTERACTION_CHANNEL.includes(i.channel)&&INTERACTION_DIRECTION.includes(i.direction)&&INTERACTION_OUTCOME.includes(i.outcome)),d.interactions.every(i=>INTERACTION_TYPE.includes(i.type)&&INTERACTION_CHANNEL.includes(i.channel)&&INTERACTION_DIRECTION.includes(i.direction)&&INTERACTION_OUTCOME.includes(i.outcome)));
  const uatEngagements=(state.engagements||[]).filter(e=>isAnyUatRecordId(e.id)),uatProjects=(state.projects||[]).filter(p=>isAnyUatProject(p));
  add('Fase 1 no crea estudios UAT',0,uatEngagements.length,uatEngagements.length===0);
  add('Fase 1 no crea proyectos UAT',0,uatProjects.length,uatProjects.length===0);
  add('Volumen activa paginación Empresas',true,d.companies.filter(c=>c.status!=='Archivada').length>5,d.companies.filter(c=>c.status!=='Archivada').length>5);
  add('Volumen activa paginación Contactos',true,d.contacts.filter(c=>c.status!=='Inactivo').length>10,d.contacts.filter(c=>c.status!=='Inactivo').length>10);
  add('Volumen activa paginación Interacciones',true,d.interactions.length>10,d.interactions.length>10);
  add('Volumen activa paginación Oportunidades',true,d.opportunities.length>10,d.opportunities.length>10);
  const pass_count=checks.filter(x=>x.pass).length;
  return {suite:'UAT Fase 1 CRM',checks,check_count:checks.length,pass_count,pass:pass_count===checks.length};
}
const __auneaPostBindPhase1Crm=postBind;
postBind=function(){
  __auneaPostBindPhase1Crm();
  const load=document.getElementById('loadPhase1Crm'),reset=document.getElementById('resetAllUat');
  if(load)load.onclick=loadPhase1CrmData;
  if(reset)reset.onclick=()=>resetAllUatData({ask:true});
};
// [AUNEA-UAT-CRM-PHASE1-070] END
