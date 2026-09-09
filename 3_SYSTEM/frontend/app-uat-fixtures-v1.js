// [AUNEA-UAT-RUNTIME-FIXTURE-020] START — Runtime fixture aislado visible
// PURPOSE: Satisfy REQ-UAT-001 by generating identifiable Company/Contact/Engagement/Step/Friction test records without inserting them into operational collections.
// SOURCE: REQ-UAT-001; UAT-CORE-001; DEC-040/042.
// INPUTS: canonical runtime schema only.
// OUTPUTS: UAT-* record bundle attached to state.uatLastRun.runtime_fixture.
// SIDE_EFFECTS: QA result only; never pushes into state.companies/contacts/engagements/projects.
// CHANGE_RISK: HIGH.
function buildIsolatedRuntimeFixture(){
  const frictionOpt=fieldOptions('OS_FRICTION_TYPE')[0]||{value:'UAT-FRICTION',label:'Fricción UAT'};
  const causeOpt=fieldOptions('OS_FRICTION_CAUSE')[0]||{value:'UAT-CAUSE',label:'Causa UAT'};
  const stepType=fieldOptions('OS_STEP_TYPE')[0]||{value:'ST01',label:'Paso'};
  const channel=fieldOptions('OS_COMM_CHANNEL')[0]||{value:'EMAIL',label:'Email'};
  const pain=typeof painForFriction==='function'?painForFriction(frictionOpt.value):null;
  return {
    isolated:true,prefix:'UAT-',generated_at:now(),
    company:{id:'UAT-CMP-001',name:'Empresa UAT aislada'},
    contact:{id:'UAT-CON-001',company_id:'UAT-CMP-001',name:'Contacto UAT'},
    engagement:{id:'UAT-ENG-001',company_id:'UAT-CMP-001',contact_ids:['UAT-CON-001'],process_name:'Proceso UAT end-to-end'},
    process_steps:[
      {id:'UAT-STEP-001',step_name:'Recibir solicitud UAT',step_type:stepType.value,active_time:5,wait_time:0,rework_time:0,communication_channels:[channel.value],status:'ACTIVE'},
      {id:'UAT-STEP-002',step_name:'Validar solicitud UAT',step_type:stepType.value,active_time:10,wait_time:30,rework_time:2,communication_channels:[channel.value],status:'ACTIVE'}
    ],
    frictions:[{id:'UAT-FRI-001',friction_type:frictionOpt.value,cause:[causeOpt.value],affected_steps:['UAT-STEP-002'],observable_signal:'UAT: solicitud requiere retrabajo antes de continuar',derived_pain_id:pain,status:'ACTIVE'}]
  };
}
function runtimeFixtureHtml(f){if(!f)return'';return section('Fixture runtime aislado','Registros UAT identificables. Existen sólo dentro del resultado QA y no se insertan en Companies/Contacts/Engagements/Projects reales.',`<div class="notice good"><b>${esc(f.company.id)}</b> ${esc(f.company.name)} · <b>${esc(f.contact.id)}</b> ${esc(f.contact.name)} · <b>${esc(f.engagement.id)}</b> ${esc(f.engagement.process_name)}</div><div class="result-list" style="margin-top:12px">${f.process_steps.map(s=>`<div class="result-item"><b>${esc(s.id)} · ${esc(s.step_name)}</b><p>Activo ${esc(s.active_time)} min · Espera ${esc(s.wait_time)} min · Retrabajo ${esc(s.rework_time)} min</p></div>`).join('')}${f.frictions.map(x=>`<div class="result-item"><b>${esc(x.id)} · Fricción UAT</b><p>Paso: ${esc(x.affected_steps.join(', '))} · Pain derivado: ${esc(x.derived_pain_id||'—')}</p></div>`).join('')}</div>`)}
const __auneaUatPageBeforeRuntimeFixture=pages.uat;
pages.uat=function(){const base=__auneaUatPageBeforeRuntimeFixture();return base+runtimeFixtureHtml(state.uatLastRun?.runtime_fixture)};
const __auneaRunVisibleUatBeforeRuntimeFixture=runVisibleUAT;
runVisibleUAT=async function(){const counts={companies:state.companies.length,contacts:state.contacts.length,engagements:state.engagements.length,projects:state.projects.length};await __auneaRunVisibleUatBeforeRuntimeFixture();if(!state.uatLastRun)return;state.uatLastRun.runtime_fixture=buildIsolatedRuntimeFixture();const after={companies:state.companies.length,contacts:state.contacts.length,engagements:state.engagements.length,projects:state.projects.length};state.uatLastRun.operational_collections_unchanged=JSON.stringify(counts)===JSON.stringify(after);if(!state.uatLastRun.operational_collections_unchanged)throw new Error('UAT isolation breach: operational collections changed');persistRecoverySnapshot('uat-runtime-fixture');audit('Fixture runtime UAT aislado generado sin alterar colecciones operativas');render();};
// [AUNEA-UAT-RUNTIME-FIXTURE-020] END
