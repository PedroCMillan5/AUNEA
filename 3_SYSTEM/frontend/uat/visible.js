// [AUNEA-FE-UAT-VISIBLE-055] START — UAT visible · CRM + Estudios por fases
// PURPOSE: Expose the clean UAT restart as two sequential phases: validated CRM first, linked Studies second.
// SOURCE: User instruction 2026-09-22; DEC-050/051/058/061/066/067.
// INPUTS: Phase 1 CRM helpers and Phase 2 Study helpers.
// OUTPUTS: internal-only UAT control page.
// SIDE_EFFECTS: none here; dataset load/reset lives in the dedicated UAT fixture modules.
// CHANGE_RISK: HIGH.
if(!SYSTEM_NAV.some(x=>x.length>1&&x[0]==='uat')){
  const i=SYSTEM_NAV.findIndex(x=>x.length>1&&x[0]==='admin');
  SYSTEM_NAV.splice(i<0?SYSTEM_NAV.length:i,0,['uat','✓','UAT / QA']);
}
function uatPhaseBadge(ok){return `<span class="status ${ok?'green':'red'}">${ok?'PASS':'PENDIENTE'}</span>`}

function uat3PhaseSection(){
  const rows=typeof uat3Cases==='function'?uat3Cases():[];
  // UAT3 has its own Company/Contact/Opportunity owners; it must not depend on UAT1/UAT2.
  const labels=['Facturas recibidas, documentación y aprobación condicional','Creación de peticiones unificadas','Tickets de pedido desde emails'];
  const intro='<div class="notice info"><b>Expedientes sintéticos, no clientes reales.</b> Se registran todos los datos capturables aplicables en sus entidades propietarias. Los DF derivados no se rellenan manualmente y las cuatro capas AS-IS se dejan sin confirmar para probarlas realmente. Cada expediente se puede abrir en sus páginas y mapa, guardar y recargar. Los hallazgos son incidencias a revisar, no correcciones inventadas.</div>';
  const cards=rows.map((e,i)=>{
    const audit=typeof uat3Audit==='function'?uat3Audit(e):{checks:[],findings:[],passed:0,total:0};
    const company=typeof companyById==='function'?companyById(e.companyId):null;
    const checks='<div class="table-wrap"><table class="data-table"><thead><tr><th>Control de continuidad</th><th>Resultado</th><th>Interpretación</th></tr></thead><tbody>'+audit.checks.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+uatPhaseBadge(x.pass)+'</td><td>'+esc(x.detail)+'</td></tr>').join('')+'</tbody></table></div>';
    const findings='<div class="notice warn"><b>Duplicidades y cuestiones concretas detectadas en el contrato actual</b><ol>'+audit.findings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>';
    return section('Caso '+(i+1)+' · '+esc(e.processName),'Empresa: '+esc(company?.name||e.companyId)+' · '+e.processSteps.length+' pasos · '+e.frictions.length+' fricciones · '+e.risks.length+' riesgos · '+e.economicInputs.length+' entradas económicas con evidencia declarada.',
      '<div class="notice '+(audit.passed===audit.total?'good':'warn')+'"><b>Integridad de datos en la carga:</b> '+audit.passed+'/'+audit.total+' controles. Las confirmaciones de la sesión siguen pendientes de validación humana.</div>'+
      '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">'+
      '<button class="btn btn-primary" data-uat3-open="'+attr(e.id)+'" data-uat3-page="diagnostico" data-uat3-stage="S01">Abrir diagnóstico completo</button>'+
      '<button class="btn btn-outline" data-uat3-open="'+attr(e.id)+'" data-uat3-page="diagnostico" data-uat3-stage="S03">Ver demanda</button>'+
      '<button class="btn btn-outline" data-uat3-open="'+attr(e.id)+'" data-uat3-page="proceso" data-uat3-stage="S04">Abrir mapa AS-IS</button></div>'+checks+findings);
  }).join('');
  return section('Fase 3 · Tres estudios integrales y auditoría de coherencia','Extiende, sin sustituir, las actuales UAT de CRM y Estudios. Los tres procesos se almacenan como Engagements visibles y sus respuestas se pueden recorrer y editar en el software.',
    intro+'<div class="grid g4"><div class="card metric"><small>Expedientes</small><strong>'+rows.length+'</strong><span>objetivo 3</span></div><div class="card metric"><small>Pasos</small><strong>'+rows.reduce((n,e)=>n+e.processSteps.length,0)+'</strong></div><div class="card metric"><small>Fricciones</small><strong>'+rows.reduce((n,e)=>n+e.frictions.length,0)+'</strong></div><div class="card metric"><small>Riesgos</small><strong>'+rows.reduce((n,e)=>n+e.risks.length,0)+'</strong></div></div>',
    '<button class="btn btn-primary" id="loadUat3">Generar los tres casos completos</button> '+
    '<button class="btn btn-outline" id="clearUat3" '+(rows.length?'':'disabled')+'>Eliminar sólo estos tres casos</button>'+
    '<div class="field-help">Estos tres casos tienen CRM y diagnóstico propios; puedes generarlos sin reiniciar ni cargar las Fases 1 y 2.</div>'+ '<div id="uat3LoadStatus" class="notice info" role="status" aria-live="polite">'+esc(typeof uat3LoadStatus==='string'?uat3LoadStatus:'Pulsa Generar para cargar los tres casos independientes.')+'</div>')+
    (rows.length?cards:'<div class="empty"><p>Los tres procesos todavía no están cargados en este navegador. Genera la Fase 3 para abrirlos y comprobar la coherencia de principio a fin.</p></div>');
}

function uatPhasePage(){
  const crmCounts=typeof phase1CrmCounts==='function'?phase1CrmCounts():{companies:0,contacts:0,interactions:0,opportunities:0};
  const crmReport=typeof phase1CrmCompletenessReport==='function'?phase1CrmCompletenessReport():null;
  const crmLoaded=crmCounts.companies+crmCounts.contacts+crmCounts.interactions+crmCounts.opportunities>0;
  const studyCounts=typeof phase2StudyCounts==='function'?phase2StudyCounts():{engagements:0,projects:0};
  const studyReport=typeof phase2StudyAssociationReport==='function'?phase2StudyAssociationReport():null;
  const studiesLoaded=studyCounts.engagements>0;
  const crmChecks=crmReport?.checks||[],studyChecks=studyReport?.checks||[];
  return pageTop('UAT / QA','UAT reiniciada por fases: primero CRM completo; después Estudios construidos sobre ese CRM ya validado.',
    `<button class="btn btn-outline" id="resetAllUat">Limpiar UAT</button><button class="btn btn-primary" id="loadPhase1Crm">Reiniciar y cargar Fase 1 CRM</button>`)
    +section('Fase 1 · Dataset CRM completo','No crea Engagements ni Projects. Todos los campos aplicables de Company, Contact, Interaction y Opportunity llegan informados.',
      `<div class="grid g4"><div class="card metric"><small>Empresas</small><strong>${crmCounts.companies}</strong><span>objetivo 12</span></div><div class="card metric"><small>Contactos</small><strong>${crmCounts.contacts}</strong><span>objetivo 24</span></div><div class="card metric"><small>Interacciones</small><strong>${crmCounts.interactions}</strong><span>objetivo 24</span></div><div class="card metric"><small>Oportunidades</small><strong>${crmCounts.opportunities}</strong><span>objetivo 16</span></div></div>
      <div class="notice ${crmLoaded&&crmReport?.pass?'good':''}" style="margin-top:12px"><b>Estado CRM:</b> ${crmLoaded?(crmReport?.pass?'dataset completo y coherente':'dataset cargado con incidencias'):'sin datos UAT cargados'}.</div>`)
    +section('Validación automática · Fase 1',crmReport?`${uatPhaseBadge(crmReport.pass)} <span class="field-help">${crmReport.pass_count}/${crmReport.check_count} controles</span><div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Control</th><th>Esperado</th><th>Actual</th><th>Estado</th></tr></thead><tbody>${crmChecks.map(c=>`<tr><td><b>${esc(c.label)}</b></td><td>${esc(String(c.expected))}</td><td>${esc(String(c.actual))}</td><td>${uatPhaseBadge(c.pass)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Carga primero la Fase 1 CRM.</p></div>')
    +section('Fase 2 · Estudios asociados al CRM validado','Genera 12 Engagements de prueba sobre Companies, Contacts y Opportunities ya existentes de UAT1-CRM. No crea nuevas empresas, contactos, oportunidades ni proyectos.',
      `<div class="grid g4"><div class="card metric"><small>Estudios</small><strong>${studyCounts.engagements}</strong><span>objetivo 12</span></div><div class="card metric"><small>Empresas nuevas</small><strong>0</strong><span>reutiliza Fase 1</span></div><div class="card metric"><small>Contactos nuevos</small><strong>0</strong><span>reutiliza Fase 1</span></div><div class="card metric"><small>Proyectos</small><strong>${studyCounts.projects}</strong><span>objetivo 0</span></div></div>
      <div class="notice ${studiesLoaded&&studyReport?.pass?'good':''}" style="margin-top:12px"><b>Estado Estudios:</b> ${!crmReport?.pass?'Fase 1 CRM debe estar en PASS antes de generar Estudios.':studiesLoaded?(studyReport?.pass?'asociaciones completas y coherentes':'estudios cargados con incidencias'):'listo para generar desde el CRM validado'}.</div>`,
      `<button class="btn btn-primary" id="loadPhase2Studies" ${crmReport?.pass?'':'disabled'}>Generar Fase 2 Estudios</button><button class="btn btn-outline" id="clearPhase2Studies" ${studiesLoaded?'':'disabled'}>Limpiar Estudios UAT</button>`)
    +section('Validación automática · Fase 2',studyReport?`${uatPhaseBadge(studyReport.pass)} <span class="field-help">${studyReport.pass_count}/${studyReport.check_count} controles</span><div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Control</th><th>Esperado</th><th>Actual</th><th>Estado</th></tr></thead><tbody>${studyChecks.map(c=>`<tr><td><b>${esc(c.label)}</b></td><td>${esc(String(c.expected))}</td><td>${esc(String(c.actual))}</td><td>${uatPhaseBadge(c.pass)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Genera los Estudios de la Fase 2 cuando la Fase 1 esté en PASS.</p></div>')
    +uat3PhaseSection();
}
pages.uat=uatPhasePage;
// [AUNEA-FE-UAT-VISIBLE-055] END
