// [AUNEA-UAT-CRM-DUMMY-030] START — CRM-only dummy seed + 15 UAT scenarios
// PURPOSE: Provide explicit, reversible CRM-only test data and a 15-case manual UAT catalogue.
// SOURCE: DEC-050/051/055/058/061; Architecture Contract v1.5 P01–P04; PROJECT_RULES v1.7.
// INPUTS: state.companies/contacts/interactions/opportunities and existing CRM domain contracts.
// OUTPUTS: DUMMY-CRM-* records only; UAT checklist rendered on internal UAT/QA page.
// SIDE_EFFECTS: only when the consultant explicitly loads/clears the CRM dummy seed.
// CHANGE_RISK: MEDIUM.

const CRM_UAT_CATALOG = Object.freeze([
  ['CRM-UAT-01','Empresas · edición desde tabla','Abrir Empresas → Acciones → Editar sobre una empresa dummy.','Se abre el modal correcto y guarda sin cambiar el ID.'],
  ['CRM-UAT-02','Empresas · filtros','Probar Sector, Tamaño y Estado sobre los datos dummy.','La tabla filtra sin duplicados ni País.'],
  ['CRM-UAT-03','Empresas · contacto principal','Cambiar la estrella de contacto principal de una empresa.','Company.Primary_Contact_ID cambia; Contact no duplica el atributo.'],
  ['CRM-UAT-04','Contactos · todas las empresas','Entrar en Contactos sin empresa seleccionada.','Se muestran contactos de todas las empresas y la columna Empresa identifica el origen.'],
  ['CRM-UAT-05','Contactos · filtro por empresa','Seleccionar una empresa y después pulsar Quitar empresa.','Primero limita el listado y después vuelve a mostrar todos.'],
  ['CRM-UAT-06','Contactos · dropdowns AUNEA','Abrir Empresa/Cargo/Estado y después clicar fuera u otro selector.','Solo permanece abierto el selector activo; click fuera y Escape cierran.'],
  ['CRM-UAT-07','Contactos · cargo estructurado','Editar un contacto y cambiar Cargo/Rol.','Se guarda uno de los cargos genéricos sin País ni Idioma.'],
  ['CRM-UAT-08','Contactos · estado','Editar un contacto Activo y pasarlo a Pendiente/Inactivo.','El estado se persiste y es visible en tabla/inspector.'],
  ['CRM-UAT-09','Contactos · inactivar/reactivar','Inactivar un contacto dummy y activar Incluir inactivos; después reactivarlo.','No se borra el registro ni su histórico; reaparece al incluir inactivos.'],
  ['CRM-UAT-10','Contactos · principal al inactivar','Inactivar el contacto principal de una empresa dummy.','Se libera Primary_Contact_ID sin borrar ninguna relación histórica.'],
  ['CRM-UAT-11','Interacciones · alta desde Contacto','Desde un contacto pulsar Registrar interacción.','Empresa y contacto llegan preseleccionados; se guarda un único Interaction.'],
  ['CRM-UAT-12','Interacciones · última interacción','Crear una interacción más reciente para un contacto.','Última interacción se deriva del log y cambia sin copiar datos al Contact.'],
  ['CRM-UAT-13','Interacciones · próximo seguimiento','Registrar una interacción con Próximo seguimiento futuro.','El seguimiento queda en Interaction y se proyecta como vigente.'],
  ['CRM-UAT-14','Oportunidades · pipeline y relaciones','Editar una oportunidad dummy y moverla por Nueva/Reunión/Propuesta/Ganada/Perdida.','El pipeline vive en Opportunity; Company/Contacts solo se referencian.'],
  ['CRM-UAT-15','CRM-only · aislamiento','Revisar Estudios y Proyectos después de cargar el seed CRM.','El seed no crea Engagements ni Projects; solo Company/Contact/Interaction/Opportunity.']
]);

function crmDummyNow(offsetDays=0,hour=10){
  const d=new Date('2026-09-18T10:00:00+02:00');
  d.setDate(d.getDate()+offsetDays);d.setHours(hour,0,0,0);
  return d.toISOString();
}
function crmDummySeed(){
  const companies=[
    {id:'DUMMY-CRM-CMP-001',name:'Nexo Consultoría',tradeName:'',taxId:'B10000001',sector:'CNAE25-N',employeeCount:32,country:'ES',orgType:'Empresa privada',website:'https://nexo.example',status:'Cliente',entryChannel:'Referido',owner:'Pedro Carrasco',notes:'DUMMY CRM · servicios profesionales',primaryContactId:'DUMMY-CRM-CON-001',createdAt:crmDummyNow(-120)},
    {id:'DUMMY-CRM-CMP-002',name:'Levante Retail',tradeName:'',taxId:'B10000002',sector:'CNAE25-G',employeeCount:180,country:'ES',orgType:'Empresa privada',website:'https://levante.example',status:'Prospecto',entryChannel:'Red personal',owner:'Pedro Carrasco',notes:'DUMMY CRM · comercio',primaryContactId:'DUMMY-CRM-CON-003',createdAt:crmDummyNow(-80)},
    {id:'DUMMY-CRM-CMP-003',name:'Murcia Logística',tradeName:'',taxId:'B10000003',sector:'CNAE25-H',employeeCount:420,country:'ES',orgType:'Empresa privada',website:'https://logistica.example',status:'Prospecto',entryChannel:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM · transporte',primaryContactId:'DUMMY-CRM-CON-005',createdAt:crmDummyNow(-45)},
    {id:'DUMMY-CRM-CMP-004',name:'Costa Salud',tradeName:'',taxId:'B10000004',sector:'CNAE25-R',employeeCount:75,country:'ES',orgType:'Empresa privada',website:'https://salud.example',status:'Cliente',entryChannel:'Cliente existente',owner:'Pedro Carrasco',notes:'DUMMY CRM · salud',primaryContactId:'DUMMY-CRM-CON-007',createdAt:crmDummyNow(-200)},
    {id:'DUMMY-CRM-CMP-005',name:'Estudio Sur Creativo',tradeName:'',taxId:'B10000005',sector:'CNAE25-N',employeeCount:9,country:'ES',orgType:'Empresa privada',website:'https://surcreativo.example',status:'Colaborador',entryChannel:'Otro',owner:'Pedro Carrasco',notes:'DUMMY CRM · colaboración',primaryContactId:null,createdAt:crmDummyNow(-30)}
  ];
  const contacts=[
    {id:'DUMMY-CRM-CON-001',companyId:'DUMMY-CRM-CMP-001',firstName:'Laura',lastName:'Martínez',role:'Dirección general',email:'laura.martinez@example.invalid',phone:'+34 600 100 001',status:'Activo',notes:'Contacto principal dummy.',createdAt:crmDummyNow(-120)},
    {id:'DUMMY-CRM-CON-002',companyId:'DUMMY-CRM-CMP-001',firstName:'Diego',lastName:'Ruiz',role:'Operaciones',email:'diego.ruiz@example.invalid',phone:'+34 600 100 002',status:'Activo',notes:'Responsable operativo dummy.',createdAt:crmDummyNow(-110)},
    {id:'DUMMY-CRM-CON-003',companyId:'DUMMY-CRM-CMP-002',firstName:'Marta',lastName:'Soler',role:'Comercial / Ventas',email:'marta.soler@example.invalid',phone:'+34 600 200 001',status:'Activo',notes:'Contacto principal dummy.',createdAt:crmDummyNow(-80)},
    {id:'DUMMY-CRM-CON-004',companyId:'DUMMY-CRM-CMP-002',firstName:'Javier',lastName:'Ortega',role:'Tecnología / IT',email:'javier.ortega@example.invalid',phone:'+34 600 200 002',status:'Pendiente',notes:'Pendiente de validación interna.',createdAt:crmDummyNow(-70)},
    {id:'DUMMY-CRM-CON-005',companyId:'DUMMY-CRM-CMP-003',firstName:'Ana',lastName:'Navarro',role:'Operaciones',email:'ana.navarro@example.invalid',phone:'+34 600 300 001',status:'Activo',notes:'Contacto principal dummy.',createdAt:crmDummyNow(-45)},
    {id:'DUMMY-CRM-CON-006',companyId:'DUMMY-CRM-CMP-003',firstName:'Sergio',lastName:'López',role:'Administración / Finanzas',email:'sergio.lopez@example.invalid',phone:'+34 600 300 002',status:'Inactivo',notes:'Inactivo para probar filtros y reactivación.',createdAt:crmDummyNow(-40)},
    {id:'DUMMY-CRM-CON-007',companyId:'DUMMY-CRM-CMP-004',firstName:'Clara',lastName:'Molina',role:'Dirección general',email:'clara.molina@example.invalid',phone:'+34 600 400 001',status:'Activo',notes:'Contacto principal dummy.',createdAt:crmDummyNow(-200)},
    {id:'DUMMY-CRM-CON-008',companyId:'DUMMY-CRM-CMP-004',firstName:'Pablo',lastName:'Vera',role:'Responsable de área',email:'pablo.vera@example.invalid',phone:'+34 600 400 002',status:'Activo',notes:'Responsable de área dummy.',createdAt:crmDummyNow(-160)},
    {id:'DUMMY-CRM-CON-009',companyId:'DUMMY-CRM-CMP-005',firstName:'Lucía',lastName:'Cano',role:'Marketing',email:'lucia.cano@example.invalid',phone:'+34 600 500 001',status:'Activo',notes:'Colaboradora dummy.',createdAt:crmDummyNow(-30)},
    {id:'DUMMY-CRM-CON-010',companyId:'DUMMY-CRM-CMP-005',firstName:'Álvaro',lastName:'Gil',role:'Técnico / Especialista',email:'alvaro.gil@example.invalid',phone:'+34 600 500 002',status:'Pendiente',notes:'Segundo contacto dummy.',createdAt:crmDummyNow(-25)}
  ];
  const opportunities=[
    {id:'DUMMY-CRM-OPP-001',companyId:'DUMMY-CRM-CMP-001',title:'Automatización del intake de clientes',stage:'Propuesta',source:'Referido',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-001','DUMMY-CRM-CON-002'],createdAt:crmDummyNow(-25),updatedAt:crmDummyNow(-2)},
    {id:'DUMMY-CRM-OPP-002',companyId:'DUMMY-CRM-CMP-002',title:'Mejora del seguimiento comercial',stage:'Reunión',source:'Red personal',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-003'],createdAt:crmDummyNow(-20),updatedAt:crmDummyNow(-3)},
    {id:'DUMMY-CRM-OPP-003',companyId:'DUMMY-CRM-CMP-003',title:'Trazabilidad de incidencias operativas',stage:'Diagnóstico',source:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-005'],createdAt:crmDummyNow(-15),updatedAt:crmDummyNow(-1)},
    {id:'DUMMY-CRM-OPP-004',companyId:'DUMMY-CRM-CMP-004',title:'Automatización documental',stage:'Ganada',source:'Cliente existente',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-007','DUMMY-CRM-CON-008'],createdAt:crmDummyNow(-60),updatedAt:crmDummyNow(-10)},
    {id:'DUMMY-CRM-OPP-005',companyId:'DUMMY-CRM-CMP-005',title:'Colaboración de diseño operativo',stage:'En pausa',source:'Otro',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-009'],createdAt:crmDummyNow(-12),updatedAt:crmDummyNow(-4)},
    {id:'DUMMY-CRM-OPP-006',companyId:'DUMMY-CRM-CMP-002',title:'Dashboard de operaciones',stage:'Perdida',source:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-003','DUMMY-CRM-CON-004'],createdAt:crmDummyNow(-50),updatedAt:crmDummyNow(-18)}
  ];
  const interactions=[
    {id:'DUMMY-CRM-INT-001',companyId:'DUMMY-CRM-CMP-001',contactIds:['DUMMY-CRM-CON-001'],occurredAt:crmDummyNow(-12,9),type:'Email',channel:'Email',direction:'Saliente',subject:'Primer contacto sobre intake',summary:'Presentación inicial.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-001',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-12,9)},
    {id:'DUMMY-CRM-INT-002',companyId:'DUMMY-CRM-CMP-001',contactIds:['DUMMY-CRM-CON-001','DUMMY-CRM-CON-002'],occurredAt:crmDummyNow(-7,12),type:'Reunión',channel:'Videollamada',direction:'Saliente',subject:'Reunión de alcance',summary:'Se valida interés y alcance inicial.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-001',engagementId:null,nextFollowUpAt:crmDummyNow(3,10),evidenceRef:'',createdAt:crmDummyNow(-7,12)},
    {id:'DUMMY-CRM-INT-003',companyId:'DUMMY-CRM-CMP-002',contactIds:['DUMMY-CRM-CON-003'],occurredAt:crmDummyNow(-8,11),type:'Llamada',channel:'Teléfono',direction:'Entrante',subject:'Consulta sobre CRM',summary:'Necesidad de mejorar seguimiento.',outcome:'Requiere seguimiento',opportunityId:'DUMMY-CRM-OPP-002',engagementId:null,nextFollowUpAt:crmDummyNow(2,16),evidenceRef:'',createdAt:crmDummyNow(-8,11)},
    {id:'DUMMY-CRM-INT-004',companyId:'DUMMY-CRM-CMP-003',contactIds:['DUMMY-CRM-CON-005'],occurredAt:crmDummyNow(-4,10),type:'Reunión',channel:'Videollamada',direction:'Saliente',subject:'Mapa de incidencias',summary:'Se revisan puntos de fricción.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-003',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-4,10)},
    {id:'DUMMY-CRM-INT-005',companyId:'DUMMY-CRM-CMP-004',contactIds:['DUMMY-CRM-CON-007'],occurredAt:crmDummyNow(-20,13),type:'Email',channel:'Email',direction:'Saliente',subject:'Propuesta automatización documental',summary:'Envío de propuesta.',outcome:'Cerrado',opportunityId:'DUMMY-CRM-OPP-004',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-20,13)},
    {id:'DUMMY-CRM-INT-006',companyId:'DUMMY-CRM-CMP-005',contactIds:['DUMMY-CRM-CON-009'],occurredAt:crmDummyNow(-5,17),type:'Mensaje',channel:'LinkedIn',direction:'Saliente',subject:'Seguimiento colaboración',summary:'Seguimiento sin urgencia.',outcome:'Bloqueado',opportunityId:'DUMMY-CRM-OPP-005',engagementId:null,nextFollowUpAt:crmDummyNow(7,9),evidenceRef:'',createdAt:crmDummyNow(-5,17)},
    {id:'DUMMY-CRM-INT-007',companyId:'DUMMY-CRM-CMP-002',contactIds:['DUMMY-CRM-CON-004'],occurredAt:crmDummyNow(-30,15),type:'Nota interna',channel:'Otro',direction:'Interna',subject:'Validación técnica pendiente',summary:'Esperando disponibilidad del equipo IT.',outcome:'Sin resultado aún',opportunityId:'DUMMY-CRM-OPP-006',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-30,15)},
    {id:'DUMMY-CRM-INT-008',companyId:'DUMMY-CRM-CMP-003',contactIds:['DUMMY-CRM-CON-006'],occurredAt:crmDummyNow(-25,10),type:'Email',channel:'Email',direction:'Entrante',subject:'Contacto histórico de finanzas',summary:'Interacción vinculada a contacto actualmente inactivo.',outcome:'Cerrado',opportunityId:null,engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-25,10)}
  ];
  return {companies,contacts,interactions,opportunities};
}
function isCrmDummyId(v){return String(v||'').startsWith('DUMMY-CRM-')}
function crmDummyCounts(){
  return {
    companies:state.companies.filter(x=>isCrmDummyId(x.id)).length,
    contacts:state.contacts.filter(x=>isCrmDummyId(x.id)).length,
    interactions:(state.interactions||[]).filter(x=>isCrmDummyId(x.id)).length,
    opportunities:(state.opportunities||[]).filter(x=>isCrmDummyId(x.id)).length
  };
}
function clearCrmDummyData({ask=true}={}){
  const n=crmDummyCounts();
  if(ask&&!confirm(`¿Limpiar los datos CRM dummy? Se eliminarán sólo registros DUMMY-CRM-* (${n.companies} empresas, ${n.contacts} contactos, ${n.interactions} interacciones y ${n.opportunities} oportunidades).`))return false;
  state.companies=state.companies.filter(x=>!isCrmDummyId(x.id));
  state.contacts=state.contacts.filter(x=>!isCrmDummyId(x.id));
  state.interactions=(state.interactions||[]).filter(x=>!isCrmDummyId(x.id));
  state.opportunities=(state.opportunities||[]).filter(x=>!isCrmDummyId(x.id));
  if(isCrmDummyId(state.selectedCompanyId))state.selectedCompanyId=null;
  if(isCrmDummyId(state.selectedContactId))state.selectedContactId=null;
  markDirty('Datos CRM dummy eliminados');
  persistRecoverySnapshot('crm-dummy-clear');
  render();
  if(ask)toast('Datos CRM dummy eliminados. Los datos reales no se han tocado.');
  return true;
}
function loadCrmDummyData(){
  const existing=crmDummyCounts();
  if(Object.values(existing).some(Boolean))clearCrmDummyData({ask:false});
  const d=crmDummySeed();
  state.companies.push(...d.companies);
  state.contacts.push(...d.contacts);
  state.interactions.push(...d.interactions);
  state.opportunities.push(...d.opportunities);
  state.selectedCompanyId=null;state.selectedContactId=null;state.activePage='empresas';
  markDirty('Dataset CRM dummy cargado');
  persistRecoverySnapshot('crm-dummy-load');
  render();
  toast(`CRM dummy cargado: ${d.companies.length} empresas · ${d.contacts.length} contactos · ${d.interactions.length} interacciones · ${d.opportunities.length} oportunidades.`);
}
function crmUatHtml(){
  const n=crmDummyCounts();
  return section('CRM · 15 UATs + datos dummy','Suite manual enfocada exclusivamente en P01–P04. El seed nunca crea estudios ni proyectos y todos sus IDs empiezan por DUMMY-CRM-.',
    `<div class="notice good"><b>Dataset actual:</b> ${n.companies} empresas · ${n.contacts} contactos · ${n.interactions} interacciones · ${n.opportunities} oportunidades.</div>
    <div class="result-list" style="margin-top:12px">${CRM_UAT_CATALOG.map(([id,title,steps,expected])=>`<div class="result-item"><b>${esc(id)} · ${esc(title)}</b><p><strong>Prueba:</strong> ${esc(steps)}</p><p><strong>Esperado:</strong> ${esc(expected)}</p></div>`).join('')}</div>`,
    '<button class="btn btn-primary" id="loadCrmDummy">Cargar datos CRM de prueba</button><button class="btn btn-outline" id="clearCrmDummy">Limpiar datos CRM de prueba</button>');
}
const __auneaUatPageBeforeCrmDummy=pages.uat;
pages.uat=function(){return __auneaUatPageBeforeCrmDummy()+crmUatHtml()};
const __auneaPostBindBeforeCrmDummy=postBind;
postBind=function(){
  __auneaPostBindBeforeCrmDummy();
  const load=document.getElementById('loadCrmDummy'),clear=document.getElementById('clearCrmDummy');
  if(load)load.onclick=loadCrmDummyData;
  if(clear)clear.onclick=()=>clearCrmDummyData({ask:true});
};
// [AUNEA-UAT-CRM-DUMMY-030] END
