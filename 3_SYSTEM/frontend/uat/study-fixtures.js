// [AUNEA-UAT-STUDY-PHASE2-090] START — UAT Phase 2 · Studies linked to validated CRM
// PURPOSE: Generate Study UAT records only from the existing Phase 1 Companies, Contacts and Opportunities.
// SOURCE: DEC-042/050/051/060/066/067; user instruction 2026-09-22.
// INPUTS: validated UAT1-CRM-* Companies, Contacts and Opportunities.
// OUTPUTS: 12 UAT2-STUDY-* Engagements; no new CRM masters and no Projects.
// SIDE_EFFECTS: explicit load/clear actions mutate only UAT2 Study records and QA-only state.
// CHANGE_RISK: HIGH.
const PHASE2_STUDY_COUNT=12;
function phase2StudyId(n){return `UAT2-STUDY-ENG-${String(n).padStart(3,'0')}`}
function isPhase2StudyId(v){return String(v||'').startsWith('UAT2-STUDY-')}

function phase2StudySeed(){
  const opportunities=(state.opportunities||[]).filter(o=>String(o.id||'').startsWith('UAT1-CRM-OPP-')).slice(0,PHASE2_STUDY_COUNT);
  const domains=schema?.option_sets?.REF_DOMAIN?.options||[];
  return opportunities.map((o,i)=>{
    const co=companyById(o.companyId);
    const contactIds=(o.contactIds||[]).filter(id=>!!contactById(id));
    const primary=contactIds[0]||co?.primaryContactId||null;
    return {
      id:phase2StudyId(i+1),
      companyId:o.companyId,
      contactIds,
      opportunityId:o.id,
      title:`Diagnóstico · ${o.title}`,
      processName:'',
      businessAreaId:domains.length?(domains[i%domains.length].value||''):'',
      priority:'',
      contextSummary:o.notes||'',
      status:'Preparación',
      lifecycleLog:[],
      stageId:'S01',
      answers:{
        DF001:co?.name||'',
        DF002:co?.sector||'',
        DF006:primary||''
      },
      answerDetails:{},
      processSteps:[],
      frictions:[],
      risks:[],
      economicInputs:[],
      processTab:'',
      layerConfirmations:{map:false,frictions:false,risks:false,impact:false},
      confirmedAsIs:false,
      confirmedSnapshots:[],
      diagnosticOutput:null,
      scenarioResults:[],
      selectedScenario:null,
      selectedScenarioIndex:0,
      engineGates:{},
      createdAt:phase1Iso(i-12,10),
      updatedAt:phase1Iso(i-12,10)
    };
  });
}

function phase2StudyCounts(){
  return {
    engagements:(state.engagements||[]).filter(e=>isPhase2StudyId(e.id)).length,
    projects:(state.projects||[]).filter(p=>isPhase2StudyId(p.engagementId)||isPhase2StudyId(p.id)).length
  };
}
function clearPhase2StudyData({ask=true}={}){
  const ids=new Set((state.engagements||[]).filter(e=>isPhase2StudyId(e.id)).map(e=>e.id));
  if(ask&&!confirm(`¿Eliminar los ${ids.size} Estudios UAT de la Fase 2? El CRM de Fase 1 y los datos reales se conservan.`))return false;
  state.engagements=(state.engagements||[]).filter(e=>!ids.has(e.id));
  state.projects=(state.projects||[]).filter(p=>!ids.has(p.engagementId)&&!isPhase2StudyId(p.id));
  if(ids.has(state.activeEngagementId))state.activeEngagementId=null;
  markDirty(`Fase 2 Estudios UAT limpiada: ${ids.size} estudios eliminados`);
  persistRecoverySnapshot('uat-phase2-study-clear');
  if(ask){render();toast('Estudios UAT de Fase 2 eliminados. CRM conservado.')}
  return true;
}
function loadPhase2StudyData(){
  const crm=phase1CrmCompletenessReport();
  if(!crm.pass)return toast('La Fase 1 CRM debe estar completa antes de generar Estudios.');
  clearPhase2StudyData({ask:false});
  const studies=phase2StudySeed();
  if(studies.length!==PHASE2_STUDY_COUNT)return toast('No hay suficientes oportunidades UAT1-CRM para generar los 12 Estudios.');
  state.engagements.push(...studies);
  state.activeEngagementId=null;state.activePage='estudios';state.studyPage=1;
  markDirty(`UAT Fase 2 cargada: ${studies.length} estudios asociados al CRM validado`);
  persistRecoverySnapshot('uat-phase2-study-load');
  render();toast('Fase 2 Estudios cargada: 12 estudios asociados a empresas, contactos y oportunidades existentes.');
}
function phase2StudyAssociationReport(){
  const studies=(state.engagements||[]).filter(e=>isPhase2StudyId(e.id)),checks=[];
  const add=(label,expected,actual,pass)=>checks.push({label,expected,actual,pass:!!pass});
  const companyIds=new Set(state.companies.filter(c=>String(c.id||'').startsWith('UAT1-CRM-CMP-')).map(c=>c.id));
  const contactMap=new Map(state.contacts.filter(c=>String(c.id||'').startsWith('UAT1-CRM-CON-')).map(c=>[c.id,c]));
  const opportunityMap=new Map((state.opportunities||[]).filter(o=>String(o.id||'').startsWith('UAT1-CRM-OPP-')).map(o=>[o.id,o]));
  const opportunityIds=studies.map(e=>e.opportunityId).filter(Boolean);
  const relationsOk=studies.every(e=>{
    const o=opportunityMap.get(e.opportunityId);
    return companyIds.has(e.companyId)&&!!o&&o.companyId===e.companyId
      &&(e.contactIds||[]).length>0
      &&(e.contactIds||[]).every(id=>contactMap.get(id)?.companyId===e.companyId)
      &&(e.contactIds||[]).every(id=>(o.contactIds||[]).includes(id));
  });
  add('12 Estudios UAT asociados',PHASE2_STUDY_COUNT,studies.length,studies.length===PHASE2_STUDY_COUNT);
  add('Todos reutilizan Company existente UAT1',true,studies.every(e=>companyIds.has(e.companyId)),studies.every(e=>companyIds.has(e.companyId)));
  add('Todos reutilizan Contacts existentes de su Company',true,studies.every(e=>(e.contactIds||[]).length>0&&(e.contactIds||[]).every(id=>contactMap.get(id)?.companyId===e.companyId)),studies.every(e=>(e.contactIds||[]).length>0&&(e.contactIds||[]).every(id=>contactMap.get(id)?.companyId===e.companyId)));
  add('Todos referencian Opportunity existente de la misma Company',true,studies.every(e=>opportunityMap.get(e.opportunityId)?.companyId===e.companyId),studies.every(e=>opportunityMap.get(e.opportunityId)?.companyId===e.companyId));
  add('Contacts del Estudio pertenecen a su Opportunity',true,relationsOk,relationsOk);
  add('Una Opportunity no genera dos Estudios UAT',PHASE2_STUDY_COUNT,new Set(opportunityIds).size,new Set(opportunityIds).size===studies.length);
  add('Todos empiezan en Preparación',true,studies.every(e=>engagementStatus(e)==='Preparación'),studies.every(e=>engagementStatus(e)==='Preparación'));
  add('Todos empiezan en S01',true,studies.every(e=>e.stageId==='S01'),studies.every(e=>e.stageId==='S01'));
  add('Todos reutilizan DF001/DF002/DF006 desde CRM',true,studies.every(e=>{const co=companyById(e.companyId);return e.answers?.DF001===co?.name&&e.answers?.DF002===co?.sector&&(e.contactIds||[]).includes(e.answers?.DF006)}),studies.every(e=>{const co=companyById(e.companyId);return e.answers?.DF001===co?.name&&e.answers?.DF002===co?.sector&&(e.contactIds||[]).includes(e.answers?.DF006)}));
  add('Fase 2 no crea Companies nuevas',12,state.companies.filter(c=>String(c.id||'').startsWith('UAT1-CRM-CMP-')).length,state.companies.filter(c=>String(c.id||'').startsWith('UAT1-CRM-CMP-')).length===12);
  add('Fase 2 no crea Contacts nuevos',24,state.contacts.filter(c=>String(c.id||'').startsWith('UAT1-CRM-CON-')).length,state.contacts.filter(c=>String(c.id||'').startsWith('UAT1-CRM-CON-')).length===24);
  add('Fase 2 no crea Opportunities nuevas',16,state.opportunities.filter(o=>String(o.id||'').startsWith('UAT1-CRM-OPP-')).length,state.opportunities.filter(o=>String(o.id||'').startsWith('UAT1-CRM-OPP-')).length===16);
  const projects=(state.projects||[]).filter(p=>isPhase2StudyId(p.engagementId)||isPhase2StudyId(p.id));
  add('Fase 2 no crea Projects',0,projects.length,projects.length===0);
  add('Volumen activa paginación Estudios',true,studies.length>10,studies.length>10);
  const pass_count=checks.filter(x=>x.pass).length;
  return {suite:'UAT Fase 2 Estudios asociados',checks,check_count:checks.length,pass_count,pass:pass_count===checks.length};
}
const __auneaPostBindPhase2Studies=postBind;
postBind=function(){
  __auneaPostBindPhase2Studies();
  const load=document.getElementById('loadPhase2Studies'),clear=document.getElementById('clearPhase2Studies');
  if(load)load.onclick=loadPhase2StudyData;
  if(clear)clear.onclick=()=>clearPhase2StudyData({ask:true});
};
// [AUNEA-UAT-STUDY-PHASE2-090] END
