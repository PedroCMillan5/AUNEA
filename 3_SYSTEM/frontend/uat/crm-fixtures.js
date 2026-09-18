// [AUNEA-UAT-CRM-DUMMY-030] START — CRM-only dummy seed + 15 UAT scenarios
// PURPOSE: Provide explicit, reversible CRM-only test data and a 40-case manual UAT catalogue.
// SOURCE: DEC-050/051/055/058/061; Architecture Contract v1.5 P01–P04; PROJECT_RULES v1.7.
// INPUTS: state.companies/contacts/interactions/opportunities and existing CRM domain contracts.
// OUTPUTS: DUMMY-CRM-* records only; UAT checklist rendered on internal UAT/QA page.
// SIDE_EFFECTS: only when the consultant explicitly loads/clears the CRM dummy seed.
// CHANGE_RISK: MEDIUM.

const CRM_UAT_CATALOG = Object.freeze([
  ['CRM-UAT-01','Empresas · crear','Crear una empresa nueva con nombre comercial, CIF, CNAE, tamaño, tipo, estado, canal y owner.','Se crea una única Company con owner Pedro Carrasco y sin País visible.'],
  ['CRM-UAT-02','Empresas · editar desde tabla','Acciones → Editar sobre una empresa dummy y modificar varios campos.','Se abre el modal correcto, guarda y conserva el mismo Company_ID.'],
  ['CRM-UAT-03','Empresas · filtros combinados','Combinar Sector, Tamaño y Estado.','Solo aparecen empresas que cumplen todos los criterios; no existe filtro País.'],
  ['CRM-UAT-04','Empresas · búsqueda','Buscar por nombre y por sector empresarial.','La búsqueda encuentra coincidencias y no usa País como criterio.'],
  ['CRM-UAT-05','Empresas · rangos de empleados','Editar empresas en varios tramos: 1–10, 11–50, 51–250, 251–500.','El dropdown guarda el valor representativo y la tabla muestra el rango correcto.'],
  ['CRM-UAT-06','Empresas · sector CNAE','Cambiar Sector en una empresa.','Solo aparecen sectores empresariales CNAE-2025, no áreas/departamentos.'],
  ['CRM-UAT-07','Empresas · contacto principal','Cambiar la estrella de contacto principal.','Company.Primary_Contact_ID cambia; Contact no duplica el atributo.'],
  ['CRM-UAT-08','Empresas · sin contactos','Abrir DUMMY-CRM-CMP-006.','La empresa funciona sin contacto principal y las vistas relacionadas muestran empty state correcto.'],
  ['CRM-UAT-09','Empresas · archivar','Archivar una empresa dummy con histórico relacionado.','Company pasa a Archivada sin borrar Contacts, Interactions ni Opportunities.'],
  ['CRM-UAT-10','Empresas · archivadas','Abrir pestaña/filtro Archivadas tras CRM-UAT-09.','La empresa archivada aparece solo donde corresponde y las relaciones siguen accesibles.'],

  ['CRM-UAT-11','Contactos · crear','Crear contacto para una empresa dummy.','Se crea Contact con Company_ID, cargo estructurado, estado y sin País/Idioma.'],
  ['CRM-UAT-12','Contactos · todas las empresas','Entrar en Contactos sin empresa seleccionada.','Se muestran contactos de todas las empresas y la columna Empresa identifica su origen.'],
  ['CRM-UAT-13','Contactos · filtro por empresa','Seleccionar empresa y después Quitar empresa.','Primero limita el listado y después vuelve a todos los contactos.'],
  ['CRM-UAT-14','Contactos · dropdowns AUNEA','Abrir Empresa/Cargo/Estado y después clicar fuera, otro campo u otro selector.','Solo queda abierto el selector activo; click fuera y Escape cierran.'],
  ['CRM-UAT-15','Contactos · cargo estructurado','Editar Cargo/Rol.','Se guarda un cargo genérico y se preserva cualquier valor histórico no catalogado.'],
  ['CRM-UAT-16','Contactos · estado Pendiente','Cambiar un contacto Activo a Pendiente.','El estado se persiste y se refleja en tabla e inspector.'],
  ['CRM-UAT-17','Contactos · inactivar/reactivar','Inactivar un contacto, activar Incluir inactivos y reactivarlo.','No se borra identidad ni histórico y vuelve a Activo.'],
  ['CRM-UAT-18','Contactos · principal al inactivar','Inactivar el contacto principal de una empresa.','Se libera Primary_Contact_ID y se mantienen todas las referencias históricas.'],
  ['CRM-UAT-19','Contactos · sin email/teléfono','Abrir DUMMY-CRM-CON-011.','La ficha y tabla soportan datos opcionales vacíos sin romper layout ni búsqueda.'],
  ['CRM-UAT-20','Contactos · caracteres especiales','Abrir DUMMY-CRM-CON-012 y buscar por su nombre.','Acentos, ñ, apóstrofes y nombre largo se renderizan y buscan correctamente.'],
  ['CRM-UAT-21','Contactos · cambiar de empresa','Editar un contacto y asignarlo a otra Company.','Contact.Company_ID cambia; si era principal de la anterior, esa relación se libera.'],
  ['CRM-UAT-22','Contactos · filtros combinados','Combinar Empresa + Cargo + Estado + Incluir inactivos.','La lista aplica todos los filtros de forma coherente y Limpiar filtros restaura la vista.'],

  ['CRM-UAT-23','Interacciones · alta desde Contacto','Desde un Contact pulsar Registrar interacción.','Empresa y Contact llegan preseleccionados y se guarda un único Interaction.'],
  ['CRM-UAT-24','Interacciones · alta solo Empresa','Crear interacción para DUMMY-CRM-CMP-006 sin seleccionar Contact.','Se guarda el evento con Company_ID y contactIds vacío.'],
  ['CRM-UAT-25','Interacciones · varios contactos','Crear/revisar una interacción con dos contactos de la misma empresa.','Los contactos se referencian sin duplicar datos maestros.'],
  ['CRM-UAT-26','Interacciones · oportunidad opcional','Crear una interacción con Opportunity y otra sin ella.','Opportunity_ID es opcional y la timeline funciona en ambos casos.'],
  ['CRM-UAT-27','Interacciones · última interacción','Crear una interacción más reciente para un Contact.','Última interacción se deriva cronológicamente y no se copia a Contact.'],
  ['CRM-UAT-28','Interacciones · seguimiento futuro','Registrar Próximo seguimiento futuro.','pendingFollowUp proyecta el seguimiento vigente desde Interaction.'],
  ['CRM-UAT-29','Interacciones · seguimiento pasado','Revisar DUMMY-CRM-INT-010 con follow-up ya vencido.','No se presenta como próximo seguimiento vigente.'],
  ['CRM-UAT-30','Interacciones · editar','Editar asunto, resultado, canal y seguimiento de un evento dummy.','Se actualiza el mismo Interaction_ID sin crear duplicado.'],
  ['CRM-UAT-31','Interacciones · eliminar evento','Eliminar una interacción dummy tras confirmar.','Solo desaparece ese evento; Company, Contact y Opportunity permanecen.'],

  ['CRM-UAT-32','Oportunidades · crear','Crear una oportunidad para una empresa dummy.','Se crea Opportunity separada de Contact con stage Nueva por defecto.'],
  ['CRM-UAT-33','Oportunidades · sin contactos','Abrir DUMMY-CRM-OPP-007.','La oportunidad puede existir sin contactos; Crear estudio queda bloqueado hasta asociar al menos uno.'],
  ['CRM-UAT-34','Oportunidades · varios contactos','Abrir DUMMY-CRM-OPP-001 y revisar Contactos implicados.','Una Opportunity referencia varios Contacts sin copiarlos.'],
  ['CRM-UAT-35','Oportunidades · pipeline completo','Mover una oportunidad por Nueva, Contactada, Reunión, Diagnóstico, Propuesta, Ganada, Perdida y En pausa.','Stage vive en Opportunity; los cambios no alteran el estado del Contact.'],
  ['CRM-UAT-36','Oportunidades · cerradas','Revisar Ganada y Perdida.','Se conserva histórico y no aparece Crear estudio en oportunidades cerradas.'],
  ['CRM-UAT-37','Oportunidades · crear estudio','Desde una oportunidad abierta con contacto asociado pulsar Crear estudio.','Se crea Engagement referenciando Opportunity; no se crea Project y no se copian datos maestros.'],

  ['CRM-UAT-38','Relaciones · cadena CRM','Recorrer Company → Contact → Interaction → Opportunity y volver a Company.','Todas las referencias resuelven al registro correcto y ninguna entidad sustituye a otra.'],
  ['CRM-UAT-39','Persistencia · recarga/backup','Con dummy cargado editar varios registros, recargar y probar exportar/restaurar backup.','El CRM se recupera con IDs y relaciones intactas.'],
  ['CRM-UAT-40','Aislamiento y limpieza','Limpiar datos CRM de prueba.','Se eliminan exclusivamente DUMMY-CRM-*; datos reales, Engagements y Projects no se modifican.']
]);

function crmDummyNow(offsetDays=0,hour=10){
  const d=new Date('2026-09-18T10:00:00+02:00');
  d.setDate(d.getDate()+offsetDays);d.setHours(hour,0,0,0);
  return d.toISOString();
}
function crmDummySeed(){
  const companies=[
    {id:'DUMMY-CRM-CMP-001',name:'Nexo Consultoría',tradeName:'',taxId:'B10000001',sector:'CNAE25-N',employeeCount:32,country:'ES',orgType:'Empresa privada',website:'https://nexo.example',status:'Cliente',entryChannel:'Recomendación',owner:'Pedro Carrasco',notes:'DUMMY CRM · servicios profesionales',primaryContactId:'DUMMY-CRM-CON-001',createdAt:crmDummyNow(-120)},
    {id:'DUMMY-CRM-CMP-002',name:'Levante Retail',tradeName:'',taxId:'B10000002',sector:'CNAE25-G',employeeCount:180,country:'ES',orgType:'Empresa privada',website:'https://levante.example',status:'Prospecto',entryChannel:'Red personal',owner:'Pedro Carrasco',notes:'DUMMY CRM · comercio',primaryContactId:'DUMMY-CRM-CON-003',createdAt:crmDummyNow(-80)},
    {id:'DUMMY-CRM-CMP-003',name:'Murcia Logística',tradeName:'',taxId:'B10000003',sector:'CNAE25-H',employeeCount:420,country:'ES',orgType:'Empresa privada',website:'https://logistica.example',status:'Prospecto',entryChannel:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM · transporte',primaryContactId:'DUMMY-CRM-CON-005',createdAt:crmDummyNow(-45)},
    {id:'DUMMY-CRM-CMP-004',name:'Costa Salud',tradeName:'',taxId:'B10000004',sector:'CNAE25-R',employeeCount:75,country:'ES',orgType:'Empresa privada',website:'https://salud.example',status:'Cliente',entryChannel:'Cliente existente',owner:'Pedro Carrasco',notes:'DUMMY CRM · salud',primaryContactId:'DUMMY-CRM-CON-007',createdAt:crmDummyNow(-200)},
    {id:'DUMMY-CRM-CMP-005',name:'Estudio Sur Creativo',tradeName:'',taxId:'B10000005',sector:'CNAE25-N',employeeCount:9,country:'ES',orgType:'Empresa privada',website:'https://surcreativo.example',status:'Colaborador',entryChannel:'Contacto directo',owner:'Pedro Carrasco',notes:'DUMMY CRM · colaboración',primaryContactId:null,createdAt:crmDummyNow(-30)},
    {id:'DUMMY-CRM-CMP-006',name:'Empresa Vacía QA',tradeName:'',taxId:'B10000006',sector:'CNAE25-O',employeeCount:14,country:'ES',orgType:'Empresa privada',website:'',status:'Prospecto',entryChannel:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM · empresa sin contactos para empty states',primaryContactId:null,createdAt:crmDummyNow(-14)},
    {id:'DUMMY-CRM-CMP-007',name:'Peña & Hijos — Innovación Ñ',tradeName:'',taxId:'B10000007',sector:'CNAE25-K',employeeCount:55,country:'ES',orgType:'Autónomo',website:'',status:'En pausa',entryChannel:'Recomendación',owner:'Pedro Carrasco',notes:'DUMMY CRM · caracteres especiales y textos largos',primaryContactId:'DUMMY-CRM-CON-012',createdAt:crmDummyNow(-22)},
    {id:'DUMMY-CRM-CMP-008',name:'Archivo Histórico QA',tradeName:'',taxId:'B10000008',sector:'CNAE25-F',employeeCount:260,country:'ES',orgType:'Empresa privada',website:'',status:'Archivada',entryChannel:'Contacto directo',owner:'Pedro Carrasco',notes:'DUMMY CRM · empresa archivada para UAT independiente',primaryContactId:null,createdAt:crmDummyNow(-300)}
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
    {id:'DUMMY-CRM-CON-010',companyId:'DUMMY-CRM-CMP-005',firstName:'Álvaro',lastName:'Gil',role:'Técnico / Especialista',email:'alvaro.gil@example.invalid',phone:'+34 600 500 002',status:'Pendiente',notes:'Segundo contacto dummy.',createdAt:crmDummyNow(-25)},
    {id:'DUMMY-CRM-CON-011',companyId:'DUMMY-CRM-CMP-005',firstName:'Noelia',lastName:'Campos',role:'Otro',email:'',phone:'',status:'Activo',notes:'DUMMY CRM · contacto sin email ni teléfono.',createdAt:crmDummyNow(-9)},
    {id:'DUMMY-CRM-CON-012',companyId:'DUMMY-CRM-CMP-007',firstName:'María-José',lastName:"O'Ñate de la Vega y Fernández",role:'Dirección general',email:'mariajose.onate@example.invalid',phone:'+34 600 700 001',status:'Activo',notes:'DUMMY CRM · caracteres especiales y nombre largo.',createdAt:crmDummyNow(-22)}
  ];
  const opportunities=[
    {id:'DUMMY-CRM-OPP-001',companyId:'DUMMY-CRM-CMP-001',title:'Automatización del intake de clientes',stage:'Propuesta',source:'Referido',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-001','DUMMY-CRM-CON-002'],createdAt:crmDummyNow(-25),updatedAt:crmDummyNow(-2)},
    {id:'DUMMY-CRM-OPP-002',companyId:'DUMMY-CRM-CMP-002',title:'Mejora del seguimiento comercial',stage:'Reunión',source:'Red personal',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-003'],createdAt:crmDummyNow(-20),updatedAt:crmDummyNow(-3)},
    {id:'DUMMY-CRM-OPP-003',companyId:'DUMMY-CRM-CMP-003',title:'Trazabilidad de incidencias operativas',stage:'Diagnóstico',source:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-005'],createdAt:crmDummyNow(-15),updatedAt:crmDummyNow(-1)},
    {id:'DUMMY-CRM-OPP-004',companyId:'DUMMY-CRM-CMP-004',title:'Automatización documental',stage:'Ganada',source:'Cliente existente',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-007','DUMMY-CRM-CON-008'],createdAt:crmDummyNow(-60),updatedAt:crmDummyNow(-10)},
    {id:'DUMMY-CRM-OPP-005',companyId:'DUMMY-CRM-CMP-005',title:'Colaboración de diseño operativo',stage:'En pausa',source:'Otro',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-009'],createdAt:crmDummyNow(-12),updatedAt:crmDummyNow(-4)},
    {id:'DUMMY-CRM-OPP-006',companyId:'DUMMY-CRM-CMP-002',title:'Dashboard de operaciones',stage:'Perdida',source:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM',contactIds:['DUMMY-CRM-CON-003','DUMMY-CRM-CON-004'],createdAt:crmDummyNow(-50),updatedAt:crmDummyNow(-18)},
    {id:'DUMMY-CRM-OPP-007',companyId:'DUMMY-CRM-CMP-006',title:'Caso sin contacto asociado',stage:'Nueva',source:'Inbound',owner:'Pedro Carrasco',notes:'DUMMY CRM · opportunity sin contacts',contactIds:[],createdAt:crmDummyNow(-6),updatedAt:crmDummyNow(-6)},
    {id:'DUMMY-CRM-OPP-008',companyId:'DUMMY-CRM-CMP-007',title:'Caso en contacto inicial',stage:'Contactada',source:'Referido',owner:'Pedro Carrasco',notes:'DUMMY CRM · caracteres especiales',contactIds:['DUMMY-CRM-CON-012'],createdAt:crmDummyNow(-10),updatedAt:crmDummyNow(-2)}
  ];
  const interactions=[
    {id:'DUMMY-CRM-INT-001',companyId:'DUMMY-CRM-CMP-001',contactIds:['DUMMY-CRM-CON-001'],occurredAt:crmDummyNow(-12,9),type:'Email',channel:'Email',direction:'Saliente',subject:'Primer contacto sobre intake',summary:'Presentación inicial.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-001',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-12,9)},
    {id:'DUMMY-CRM-INT-002',companyId:'DUMMY-CRM-CMP-001',contactIds:['DUMMY-CRM-CON-001','DUMMY-CRM-CON-002'],occurredAt:crmDummyNow(-7,12),type:'Reunión',channel:'Videollamada',direction:'Saliente',subject:'Reunión de alcance',summary:'Se valida interés y alcance inicial.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-001',engagementId:null,nextFollowUpAt:crmDummyNow(3,10),evidenceRef:'',createdAt:crmDummyNow(-7,12)},
    {id:'DUMMY-CRM-INT-003',companyId:'DUMMY-CRM-CMP-002',contactIds:['DUMMY-CRM-CON-003'],occurredAt:crmDummyNow(-8,11),type:'Llamada',channel:'Teléfono',direction:'Entrante',subject:'Consulta sobre CRM',summary:'Necesidad de mejorar seguimiento.',outcome:'Requiere seguimiento',opportunityId:'DUMMY-CRM-OPP-002',engagementId:null,nextFollowUpAt:crmDummyNow(2,16),evidenceRef:'',createdAt:crmDummyNow(-8,11)},
    {id:'DUMMY-CRM-INT-004',companyId:'DUMMY-CRM-CMP-003',contactIds:['DUMMY-CRM-CON-005'],occurredAt:crmDummyNow(-4,10),type:'Reunión',channel:'Videollamada',direction:'Saliente',subject:'Mapa de incidencias',summary:'Se revisan puntos de fricción.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-003',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-4,10)},
    {id:'DUMMY-CRM-INT-005',companyId:'DUMMY-CRM-CMP-004',contactIds:['DUMMY-CRM-CON-007'],occurredAt:crmDummyNow(-20,13),type:'Email',channel:'Email',direction:'Saliente',subject:'Propuesta automatización documental',summary:'Envío de propuesta.',outcome:'Cerrado',opportunityId:'DUMMY-CRM-OPP-004',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-20,13)},
    {id:'DUMMY-CRM-INT-006',companyId:'DUMMY-CRM-CMP-005',contactIds:['DUMMY-CRM-CON-009'],occurredAt:crmDummyNow(-5,17),type:'Mensaje',channel:'LinkedIn',direction:'Saliente',subject:'Seguimiento colaboración',summary:'Seguimiento sin urgencia.',outcome:'Bloqueado',opportunityId:'DUMMY-CRM-OPP-005',engagementId:null,nextFollowUpAt:crmDummyNow(7,9),evidenceRef:'',createdAt:crmDummyNow(-5,17)},
    {id:'DUMMY-CRM-INT-007',companyId:'DUMMY-CRM-CMP-002',contactIds:['DUMMY-CRM-CON-004'],occurredAt:crmDummyNow(-30,15),type:'Nota interna',channel:'Otro',direction:'Interna',subject:'Validación técnica pendiente',summary:'Esperando disponibilidad del equipo IT.',outcome:'Sin resultado aún',opportunityId:'DUMMY-CRM-OPP-006',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-30,15)},
    {id:'DUMMY-CRM-INT-008',companyId:'DUMMY-CRM-CMP-003',contactIds:['DUMMY-CRM-CON-006'],occurredAt:crmDummyNow(-25,10),type:'Email',channel:'Email',direction:'Entrante',subject:'Contacto histórico de finanzas',summary:'Interacción vinculada a contacto actualmente inactivo.',outcome:'Cerrado',opportunityId:null,engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-25,10)},
    {id:'DUMMY-CRM-INT-009',companyId:'DUMMY-CRM-CMP-006',contactIds:[],occurredAt:crmDummyNow(-3,9),type:'Nota interna',channel:'Otro',direction:'Interna',subject:'Interacción solo empresa',summary:'DUMMY CRM · sin contacto asociado.',outcome:'Sin resultado aún',opportunityId:'DUMMY-CRM-OPP-007',engagementId:null,nextFollowUpAt:null,evidenceRef:'',createdAt:crmDummyNow(-3,9)},
    {id:'DUMMY-CRM-INT-010',companyId:'DUMMY-CRM-CMP-007',contactIds:['DUMMY-CRM-CON-012'],occurredAt:crmDummyNow(-14,11),type:'Llamada',channel:'Teléfono',direction:'Saliente',subject:'Seguimiento ya vencido',summary:'DUMMY CRM · seguimiento histórico vencido.',outcome:'Requiere seguimiento',opportunityId:'DUMMY-CRM-OPP-008',engagementId:null,nextFollowUpAt:crmDummyNow(-2,10),evidenceRef:'',createdAt:crmDummyNow(-14,11)},
    {id:'DUMMY-CRM-INT-011',companyId:'DUMMY-CRM-CMP-007',contactIds:['DUMMY-CRM-CON-012'],occurredAt:crmDummyNow(-1,16),type:'Email',channel:'Email',direction:'Saliente',subject:'Evidencia comercial',summary:'DUMMY CRM · referencia externa.',outcome:'Avanza',opportunityId:'DUMMY-CRM-OPP-008',engagementId:null,nextFollowUpAt:crmDummyNow(5,11),evidenceRef:'DRIVE://DUMMY-EVIDENCE',createdAt:crmDummyNow(-1,16)}
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
  toast(`CRM dummy cargado: ${d.companies.length} empresas · ${d.contacts.length} contactos · ${d.interactions.length} interacciones · ${d.opportunities.length} oportunidades · 40 UATs disponibles.`);
}
function runCrmAutomaticUat(){
  const d=crmDummySeed(),assertions=[];
  const add=(id,label,expected,actual,pass)=>assertions.push({assertion_id:id,label,expected,actual,pass:!!pass});
  const companyIds=new Set(d.companies.map(x=>x.id)),contactIds=new Set(d.contacts.map(x=>x.id)),oppIds=new Set(d.opportunities.map(x=>x.id));
  const all=[...d.companies,...d.contacts,...d.interactions,...d.opportunities];
  add('CRM-AUTO-01','40 UATs manuales registrados',40,CRM_UAT_CATALOG.length,CRM_UAT_CATALOG.length===40);
  add('CRM-AUTO-02','8 empresas dummy',8,d.companies.length,d.companies.length===8);
  add('CRM-AUTO-03','12 contactos dummy',12,d.contacts.length,d.contacts.length===12);
  add('CRM-AUTO-04','11 interacciones dummy',11,d.interactions.length,d.interactions.length===11);
  add('CRM-AUTO-05','8 oportunidades dummy',8,d.opportunities.length,d.opportunities.length===8);
  add('CRM-AUTO-06','Todos los IDs están aislados','DUMMY-CRM-*',all.every(x=>isCrmDummyId(x.id))?'todos':'hay IDs fuera del prefijo',all.every(x=>isCrmDummyId(x.id)));
  add('CRM-AUTO-07','Seed CRM no contiene Engagements/Projects','solo 4 colecciones',Object.keys(d).sort().join(','),Object.keys(d).sort().join(',')==='companies,contacts,interactions,opportunities');
  add('CRM-AUTO-08','Contact.Company_ID válido',true,d.contacts.every(x=>companyIds.has(x.companyId)),d.contacts.every(x=>companyIds.has(x.companyId)));
  add('CRM-AUTO-09','Primary Contact pertenece a su Company',true,d.companies.filter(x=>x.primaryContactId).every(co=>d.contacts.some(ct=>ct.id===co.primaryContactId&&ct.companyId===co.id)),d.companies.filter(x=>x.primaryContactId).every(co=>d.contacts.some(ct=>ct.id===co.primaryContactId&&ct.companyId===co.id)));
  add('CRM-AUTO-10','Opportunity.Company_ID válido',true,d.opportunities.every(x=>companyIds.has(x.companyId)),d.opportunities.every(x=>companyIds.has(x.companyId)));
  add('CRM-AUTO-11','Opportunity Contact refs válidas',true,d.opportunities.every(x=>(x.contactIds||[]).every(id=>contactIds.has(id))),d.opportunities.every(x=>(x.contactIds||[]).every(id=>contactIds.has(id))));
  add('CRM-AUTO-12','Interaction.Company_ID válido',true,d.interactions.every(x=>companyIds.has(x.companyId)),d.interactions.every(x=>companyIds.has(x.companyId)));
  add('CRM-AUTO-13','Interaction Contact refs válidas',true,d.interactions.every(x=>(x.contactIds||[]).every(id=>contactIds.has(id))),d.interactions.every(x=>(x.contactIds||[]).every(id=>contactIds.has(id))));
  add('CRM-AUTO-14','Interaction Opportunity refs válidas',true,d.interactions.every(x=>!x.opportunityId||oppIds.has(x.opportunityId)),d.interactions.every(x=>!x.opportunityId||oppIds.has(x.opportunityId)));
  add('CRM-AUTO-15','Existe empresa sin contactos',true,d.companies.some(co=>!d.contacts.some(ct=>ct.companyId===co.id)),d.companies.some(co=>!d.contacts.some(ct=>ct.companyId===co.id)));
  add('CRM-AUTO-16','Existe empresa archivada',true,d.companies.some(x=>x.status==='Archivada'),d.companies.some(x=>x.status==='Archivada'));
  add('CRM-AUTO-17','Existe contacto inactivo',true,d.contacts.some(x=>x.status==='Inactivo'),d.contacts.some(x=>x.status==='Inactivo'));
  add('CRM-AUTO-18','Existe contacto sin email/teléfono',true,d.contacts.some(x=>!x.email&&!x.phone),d.contacts.some(x=>!x.email&&!x.phone));
  add('CRM-AUTO-19','Existe caso con caracteres especiales',true,d.contacts.some(x=>/Ñ|ñ|ó|é|á|í|ú|'/u.test((x.firstName||'')+' '+(x.lastName||''))),d.contacts.some(x=>/Ñ|ñ|ó|é|á|í|ú|'/u.test((x.firstName||'')+' '+(x.lastName||''))));
  add('CRM-AUTO-20','Existe Interaction solo Company',true,d.interactions.some(x=>(x.contactIds||[]).length===0),d.interactions.some(x=>(x.contactIds||[]).length===0));
  add('CRM-AUTO-21','Existe follow-up futuro',true,d.interactions.some(x=>x.nextFollowUpAt&&x.nextFollowUpAt>crmDummyNow(0)),d.interactions.some(x=>x.nextFollowUpAt&&x.nextFollowUpAt>crmDummyNow(0)));
  add('CRM-AUTO-22','Existe follow-up vencido',true,d.interactions.some(x=>x.nextFollowUpAt&&x.nextFollowUpAt<crmDummyNow(0)),d.interactions.some(x=>x.nextFollowUpAt&&x.nextFollowUpAt<crmDummyNow(0)));
  add('CRM-AUTO-23','Existe Opportunity sin Contacts',true,d.opportunities.some(x=>(x.contactIds||[]).length===0),d.opportunities.some(x=>(x.contactIds||[]).length===0));
  add('CRM-AUTO-24','Sectores dummy usan CNAE-2025',true,d.companies.every(x=>/^CNAE25-[A-V]$/.test(x.sector)),d.companies.every(x=>/^CNAE25-[A-V]$/.test(x.sector)));
  add('CRM-AUTO-25','Estados Contact válidos',true,d.contacts.every(x=>CONTACT_STATUS.includes(x.status)),d.contacts.every(x=>CONTACT_STATUS.includes(x.status)));
  add('CRM-AUTO-26','Cargos Contact gobernados',true,d.contacts.every(x=>CONTACT_ROLE_OPTIONS.includes(x.role)),d.contacts.every(x=>CONTACT_ROLE_OPTIONS.includes(x.role)));
  add('CRM-AUTO-27','Stages Opportunity válidos',true,d.opportunities.every(x=>OPPORTUNITY_STAGE.includes(x.stage)),d.opportunities.every(x=>OPPORTUNITY_STAGE.includes(x.stage)));
  add('CRM-AUTO-28','Tipos Interaction válidos',true,d.interactions.every(x=>INTERACTION_TYPE.includes(x.type)),d.interactions.every(x=>INTERACTION_TYPE.includes(x.type)));
  add('CRM-AUTO-29','Canales Interaction válidos',true,d.interactions.every(x=>INTERACTION_CHANNEL.includes(x.channel)),d.interactions.every(x=>INTERACTION_CHANNEL.includes(x.channel)));
  add('CRM-AUTO-30','Resultados Interaction válidos',true,d.interactions.every(x=>INTERACTION_OUTCOME.includes(x.outcome)),d.interactions.every(x=>INTERACTION_OUTCOME.includes(x.outcome)));
  add('CRM-AUTO-31','Inactivación reversible implementada',true,typeof inactivateContact==='function'&&typeof reactivateContact==='function',typeof inactivateContact==='function'&&typeof reactivateContact==='function');
  add('CRM-AUTO-32','Crear estudio desde Opportunity exige función gobernada',true,typeof createStudyFromOpportunity==='function',typeof createStudyFromOpportunity==='function');
  const passCount=assertions.filter(x=>x.pass).length;
  return {suite:'CRM_AUTOMATIC_V1',assertion_count:assertions.length,pass_count:passCount,fail_count:assertions.length-passCount,pass:passCount===assertions.length,assertions};
}
function crmAutomaticHtml(r){
  if(!r)return '<div class="empty"><p>Aún no ejecutado. El botón superior “Ejecutar UATs automáticos” ejecuta backend + CRM.</p></div>';
  return `${uatStatusBadge(r.pass)} <span class="field-help">${esc(r.suite)} · ${r.pass_count}/${r.assertion_count}</span><div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Assertion</th><th>Control</th><th>Expected</th><th>Actual</th><th>Estado</th></tr></thead><tbody>${r.assertions.map(a=>`<tr><td><b>${esc(a.assertion_id)}</b></td><td>${esc(a.label)}</td><td>${esc(JSON.stringify(a.expected))}</td><td>${esc(JSON.stringify(a.actual))}</td><td>${uatStatusBadge(a.pass)}</td></tr>`).join('')}</tbody></table></div>`;
}

function crmUatHtml(){
  const n=crmDummyCounts();
  const groups=[
    ['Empresas','CRM-UAT-01','CRM-UAT-10'],
    ['Contactos','CRM-UAT-11','CRM-UAT-22'],
    ['Interacciones','CRM-UAT-23','CRM-UAT-31'],
    ['Oportunidades','CRM-UAT-32','CRM-UAT-37'],
    ['Relaciones, persistencia y aislamiento','CRM-UAT-38','CRM-UAT-40']
  ];
  const num=id=>Number(String(id).slice(-2));
  const groupHtml=groups.map(([title,from,to])=>{
    const rows=CRM_UAT_CATALOG.filter(([id])=>num(id)>=num(from)&&num(id)<=num(to));
    return `<div class="result-item"><h3>${esc(title)} · ${rows.length} UATs</h3><div class="result-list">${rows.map(([id,t,steps,expected])=>`<div class="result-item"><b>${esc(id)} · ${esc(t)}</b><p><strong>Prueba:</strong> ${esc(steps)}</p><p><strong>Esperado:</strong> ${esc(expected)}</p></div>`).join('')}</div></div>`;
  }).join('');
  return section('CRM automático','32 assertions automáticas CRM ejecutadas junto al backend desde el botón superior.',crmAutomaticHtml(state.uatLastRun?.crm_automatic)) + section('CRM · 40 UATs manuales + datos dummy','Suite completa de 40 casos enfocada en P01–P04, relaciones, persistencia y edge cases. El seed nunca crea estudios ni proyectos y todos sus IDs empiezan por DUMMY-CRM-.',
    `<div class="notice good"><b>Dataset actual:</b> ${n.companies} empresas · ${n.contacts} contactos · ${n.interactions} interacciones · ${n.opportunities} oportunidades.</div>
    <div class="coverage-chips" style="margin-top:12px"><span class="chip">10 Empresas</span><span class="chip">12 Contactos</span><span class="chip">9 Interacciones</span><span class="chip">6 Oportunidades</span><span class="chip">3 Integración/robustez</span></div>
    <div class="result-list" style="margin-top:12px">${groupHtml}</div>`,
    '<button class="btn btn-primary" id="loadCrmDummy">Cargar datos CRM de prueba</button><button class="btn btn-outline" id="clearCrmDummy">Limpiar datos CRM de prueba</button>');
}
const __auneaUatPageBeforeCrmDummy=pages.uat;
pages.uat=function(){return __auneaUatPageBeforeCrmDummy()+crmUatHtml()};
const __auneaRunVisibleUatBeforeCrmAutomatic=runVisibleUAT;
runVisibleUAT=async function(){
  await __auneaRunVisibleUatBeforeCrmAutomatic();
  if(!state.uatLastRun)return;
  const before={companies:state.companies.length,contacts:state.contacts.length,interactions:(state.interactions||[]).length,opportunities:(state.opportunities||[]).length,engagements:state.engagements.length,projects:state.projects.length};
  state.uatLastRun.crm_automatic=runCrmAutomaticUat();
  const after={companies:state.companies.length,contacts:state.contacts.length,interactions:(state.interactions||[]).length,opportunities:(state.opportunities||[]).length,engagements:state.engagements.length,projects:state.projects.length};
  state.uatLastRun.crm_operational_collections_unchanged=JSON.stringify(before)===JSON.stringify(after);
  state.uatLastRun.combined_pass=!!state.uatLastRun.pass&&!!state.uatLastRun.crm_automatic.pass&&state.uatLastRun.crm_operational_collections_unchanged;
  persistRecoverySnapshot('uat-backend-plus-crm');
  audit(`UAT combinada ${state.uatLastRun.combined_pass?'PASS':'FAIL'} · backend ${state.uatLastRun.pass_count}/${state.uatLastRun.assertion_count} · CRM ${state.uatLastRun.crm_automatic.pass_count}/${state.uatLastRun.crm_automatic.assertion_count}`);
  render();
  toast(state.uatLastRun.combined_pass?`UAT automática PASS: backend ${state.uatLastRun.pass_count}/${state.uatLastRun.assertion_count} + CRM ${state.uatLastRun.crm_automatic.pass_count}/${state.uatLastRun.crm_automatic.assertion_count}.`:'UAT automática con fallos: revisa Backend y CRM.');
};
const __auneaPostBindBeforeCrmDummy=postBind;
postBind=function(){
  __auneaPostBindBeforeCrmDummy();
  const load=document.getElementById('loadCrmDummy'),clear=document.getElementById('clearCrmDummy');
  if(load)load.onclick=loadCrmDummyData;
  if(clear)clear.onclick=()=>clearCrmDummyData({ask:true});
};
// [AUNEA-UAT-CRM-DUMMY-030] END
