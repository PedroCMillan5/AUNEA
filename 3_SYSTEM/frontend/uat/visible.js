// [AUNEA-FE-UAT-VISIBLE-055] START — UAT visible · Fase 1 CRM
// PURPOSE: Expose the clean UAT restart as a CRM-only first phase. Study UATs are intentionally absent.
// SOURCE: User instruction 2026-09-22; DEC-050/051/058/061/066; frozen CRM baselines.
// INPUTS: phase-1 CRM fixture helpers from uat/crm-fixtures.js and shared application state.
// OUTPUTS: internal-only UAT control page.
// SIDE_EFFECTS: none here; dataset load/reset is owned by AUNEA-UAT-CRM-PHASE1-070.
// CHANGE_RISK: HIGH.
if(!SYSTEM_NAV.some(x=>x.length>1&&x[0]==='uat')){
  const i=SYSTEM_NAV.findIndex(x=>x.length>1&&x[0]==='admin');
  SYSTEM_NAV.splice(i<0?SYSTEM_NAV.length:i,0,['uat','✓','UAT / QA']);
}
function uatPhaseBadge(ok){return `<span class="status ${ok?'green':'red'}">${ok?'PASS':'PENDIENTE'}</span>`}
function uatPhase1Page(){
  const counts=typeof phase1CrmCounts==='function'?phase1CrmCounts():{companies:0,contacts:0,interactions:0,opportunities:0};
  const report=typeof phase1CrmCompletenessReport==='function'?phase1CrmCompletenessReport():null;
  const loaded=counts.companies+counts.contacts+counts.interactions+counts.opportunities>0;
  const checks=report?.checks||[];
  return pageTop('UAT / QA','Reinicio limpio de UAT. Fase 1 prueba exclusivamente el CRM congelado; los estudios se generarán en la Fase 2.',
    `<button class="btn btn-outline" id="resetAllUat">Limpiar UAT</button><button class="btn btn-primary" id="loadPhase1Crm">Reiniciar y cargar Fase 1 CRM</button>`)
    +section('Fase 1 · Dataset CRM completo','No crea Engagements ni Projects. Todos los campos aplicables de Company, Contact, Interaction y Opportunity llegan informados.',
      `<div class="grid g4"><div class="card metric"><small>Empresas</small><strong>${counts.companies}</strong><span>objetivo 12</span></div><div class="card metric"><small>Contactos</small><strong>${counts.contacts}</strong><span>objetivo 24</span></div><div class="card metric"><small>Interacciones</small><strong>${counts.interactions}</strong><span>objetivo 24</span></div><div class="card metric"><small>Oportunidades</small><strong>${counts.opportunities}</strong><span>objetivo 16</span></div></div>
      <div class="notice ${loaded&&report?.pass?'good':''}" style="margin-top:12px"><b>Estado:</b> ${loaded?(report?.pass?'dataset completo y coherente':'dataset cargado con incidencias'):'sin datos UAT cargados'} · Estudios: ${state.engagements.filter(e=>typeof isAnyUatRecordId==='function'&&isAnyUatRecordId(e.id)).length} · Proyectos UAT: ${state.projects.filter(p=>typeof isAnyUatProject==='function'&&isAnyUatProject(p)).length}</div>`)
    +section('Cobertura de pantallas CRM','El volumen fuerza paginación y relaciones reales entre las entidades sin introducir todavía Estudios.',
      `<div class="result-list">
        <div class="result-item"><b>Inicio</b><p>Métricas con Companies/Contacts cargados y Estudios/Proyectos UAT = 0.</p></div>
        <div class="result-item"><b>Empresas</b><p>12 empresas completas; al menos una archivada para validar “Incluir archivadas”; más de 5 registros para paginación.</p></div>
        <div class="result-item"><b>Contactos</b><p>24 contactos completos, dos por empresa, principal relacional y estados Activo/Pendiente/Inactivo; más de 10 registros.</p></div>
        <div class="result-item"><b>Interacciones</b><p>24 eventos completos con Company, Contact, Opportunity, seguimiento y evidencia; más de 10 registros.</p></div>
        <div class="result-item"><b>Oportunidades</b><p>16 casos completos con Company, Contacts, pipeline, origen, owner y notas; más de 10 registros; sin estudios asociados en Fase 1.</p></div>
      </div>`)
    +section('Validación automática del dataset',report?`${uatPhaseBadge(report.pass)} <span class="field-help">${report.pass_count}/${report.check_count} controles</span><div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>Control</th><th>Esperado</th><th>Actual</th><th>Estado</th></tr></thead><tbody>${checks.map(c=>`<tr><td><b>${esc(c.label)}</b></td><td>${esc(String(c.expected))}</td><td>${esc(String(c.actual))}</td><td>${uatPhaseBadge(c.pass)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Carga primero la Fase 1 CRM.</p></div>');
}
pages.uat=uatPhase1Page;
// [AUNEA-FE-UAT-VISIBLE-055] END
