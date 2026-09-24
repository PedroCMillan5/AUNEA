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
    +section('Validación automática · Fase 2',studyReport?`${uatPhaseBadge(studyReport.pass)} <span class="field-help">${studyReport.pass_count}/${studyReport.check_count} controles</span><div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Control</th><th>Esperado</th><th>Actual</th><th>Estado</th></tr></thead><tbody>${studyChecks.map(c=>`<tr><td><b>${esc(c.label)}</b></td><td>${esc(String(c.expected))}</td><td>${esc(String(c.actual))}</td><td>${uatPhaseBadge(c.pass)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Genera los Estudios de la Fase 2 cuando la Fase 1 esté en PASS.</p></div>');
}
pages.uat=uatPhasePage;
// [AUNEA-FE-UAT-VISIBLE-055] END
