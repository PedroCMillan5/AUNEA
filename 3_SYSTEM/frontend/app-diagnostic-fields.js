// [AUNEA-FE-DIAG-CONTROL-030] START — Stage navigation shell and process/friction capture prompts
// PURPOSE: Stage navigation shell and process/friction capture prompts for the guided diagnostic flow. Option-set lookup helper. (Narrowed from the original "Captura Diagnostic Master v1" scope — question visibility/derivation/rendering now live exclusively in app-no-reask-v1.js / app-renderer-v1.js, which load after this file and always won at runtime; the dead duplicate implementations that used to live here were removed.)
// SOURCE: v1.0.4 aceptada, SHA256 a9fb7400b000d6289224610c88d4b7dc51f75f8ae97e20e4c3873a3a8e01d6e7; Diagnostic Master v1; DEC-034/038/040.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
function fieldOptions(setId){return schema?.option_sets?.[setId]?.options||[]}

function stagePage(){
  const e=currentEng(),stage=schema.flow.find(x=>x.Stage_ID===(e.stageId||'S01'))||schema.flow[0],fields=schema.fields.filter(f=>f.Stage_ID===stage.Stage_ID&&questionVisible(f,e));
  const stageIndex=schema.flow.findIndex(x=>x.Stage_ID===stage.Stage_ID),isLastStage=stageIndex===schema.flow.length-1;
  const completion=engagementCompletion(e);
  const stageStat=completion.stage[stage.Stage_ID]||{applicable:0,answered:0,pct:100};
  const summary=`<div class="completion-summary"><div class="completion-headline">${completion.readyToCalculate?'<span class="status green">Listo para calcular</span>':`<span class="status amber">${completion.missing.length} pendiente${completion.missing.length===1?'':'s'}</span>`}</div><ul class="completion-list"><li><b>${completion.stagesReviewed}/${completion.stagesTotal}</b> etapas revisadas</li><li><b>${completion.requiredComplete}/${completion.requiredApplicable}</b> obligatorios aplicables completos</li><li><b>${completion.evidencePending.length}</b> evidencia(s) pendiente(s)</li></ul></div>`;
  return pageTop('Diagnóstico guiado','Cuestionario canónico en español, generado desde Diagnostic Master v1. Una información se captura una vez y se reutiliza después.',`<button class="btn" data-goto-process="1">Ver mapa AS-IS</button><button class="btn btn-primary" id="runDiag">Recalcular</button>`) +
  `<div class="stage-layout"><aside class="card stage-nav">${summary}${schema.flow.map((s,i)=>`<button class="stage-btn ${s.Stage_ID===stage.Stage_ID?'active':''}" data-stage="${s.Stage_ID}"><span class="stage-num">${i+1}</span><span><b>${esc(s.Stage_ES)}</b><small>${esc(s.Objetivo)}</small></span><span class="stage-time">${s.Minutos_objetivo}m</span></button>`).join('')}</aside><div><div class="card stage-card"><div class="section-title"><div><h2>${stageIndex+1}. ${esc(stage.Stage_ES)}</h2><p>${esc(stage.Objetivo)}</p></div><div class="chip gold">${stage.Minutos_objetivo} min objetivo</div></div><div class="stage-meta"><span class="chip">Salida: ${esc(stage.Salida)}</span><span class="chip">Criterio: ${esc(stage.Criterio_de_salida)}</span></div><div class="notice"><strong>Hilo conductor:</strong> ${esc(stage.Interacción_principal)}. ${esc(stage.Regla_de_tiempo)}</div><div style="margin-top:12px">${fields.map(f=>renderQuestion(f,e)).join('')}</div>${stage.Stage_ID==='S04'?processPrompt(e):''}${stage.Stage_ID==='S05'?frictionPrompt(e):''}${stage.Stage_ID==='S06'?riskBuilder(e):''}${stage.Stage_ID==='S07'?economicBuilder(e):''}${isLastStage?validationSummary(e,completion):''}<div class="stage-footer"><button class="btn" id="prevStage" ${stageIndex===0?'disabled':''}>← Anterior</button><div class="stage-progress-secondary field-help">${stageStat.applicable} campo(s) aplicables en esta etapa · ${stageStat.answered} con dato</div>${isLastStage?'':'<button class="btn btn-primary" id="nextStage">Siguiente →</button>'}</div></div></div></div>`
}
function processPrompt(e){return `<div class="notice info"><strong>Mapa AS-IS:</strong> los campos DF031–DF055 se capturan principalmente en el editor visual. Actualmente hay <b>${e.processSteps.filter(x=>x.status!=='SUPERSEDED').length}</b> pasos. <button class="btn btn-small" data-goto-process="1">Abrir editor</button></div>`}
function frictionPrompt(e){return `<div class="notice info"><strong>Fricciones:</strong> DF056–DF065 se capturan vinculando cada fricción a uno o varios pasos. Actualmente hay <b>${e.frictions.filter(x=>x.status!=='SUPERSEDED').length}</b> fricciones. <button class="btn btn-small" data-goto-process="1">Abrir fricciones</button></div>`}

// Real closing screen for the last stage (UAT-VIS-063/064/066/067): factual summary, never a proxy
// state ("revisada"/"confirmado") that the data model does not actually have (correction #3) — only
// e.confirmedAsIs is a real confirmed state; frictions/risks only ever report "con evidencia/controles
// registrados". CTA mirrors runDiagnosis()'s own gate exactly via completion.readyToCalculate.
function validationSummary(e,completion){
  const steps=activeSteps(e),fr=activeFrictions(e),risks=e.risks||[],econ=e.economicInputs||[];
  const frWithEvidence=fr.filter(x=>!!x.evidence_type).length;
  const risksWithControls=risks.filter(x=>x.controls_present===true).length;
  const econByType={};
  econ.forEach(x=>{const t=evidenceTypeBackend(x.evidence_type);econByType[t]=(econByType[t]||0)+1});
  const econLine=Object.keys(econByType).length?Object.entries(econByType).map(([k,v])=>`${v} ${engineLabel('evidence_quality',k)}`).join(', '):'Sin inputs económicos registrados';
  const nextStep=e.answers?.DF098||'',notes=e.answers?.DF100||'';
  const cta=completion.readyToCalculate
    ?'<button class="btn btn-primary" id="runDiag">CALCULAR DIAGNÓSTICO Y RECOMENDACIÓN</button>'
    :`<div class="blocker-list">${completion.blockers.map(b=>{
        const action=b.type==='GATE'?'<button type="button" class="btn btn-small" data-open-gate-review="1">Validar</button>'
          :(b.navigationTarget==='proceso'?'<button type="button" class="btn btn-small" data-goto-process="1">Ir a completar</button>'
          :`<button type="button" class="btn btn-small" data-goto-stage="${attr(b.stage||'')}">Ir a completar</button>`);
        return `<div class="notice warn"><span>${esc(b.label)}</span>${action}</div>`;
      }).join('')}</div>`;
  return section('Resumen antes de calcular','Revisión factual del estudio; ningún estado se afirma más allá de lo realmente capturado.',
    `<div class="grid g3">
      <div class="notice"><b>Proceso</b><br>${steps.length} paso(s) activo(s) · ${e.confirmedAsIs?'AS-IS confirmado':'AS-IS pendiente de confirmar'}</div>
      <div class="notice"><b>Fricciones</b><br>${fr.length} detectada(s), ${frWithEvidence} con evidencia registrada</div>
      <div class="notice"><b>Riesgos</b><br>${risks.length} registrado(s), ${risksWithControls} con controles registrados</div>
      <div class="notice"><b>Economics</b><br>${econ.length} input(s) — ${esc(econLine)}</div>
      <div class="notice"><b>Obligatorios</b><br>${completion.missing.length===0?'✓ completos':`${completion.missing.length} pendiente(s)`}</div>
      <div class="notice"><b>Siguiente paso</b><br>${nextStep?esc(nextStep):'Pendiente de acordar (DF098)'}</div>
    </div>
    <div class="field-help internal-only" style="margin-top:10px"><b>Notas internas del consultor:</b> ${notes?esc(notes):'—'}</div>
    <div style="margin-top:16px">${cta}</div>`
  );
}
const __auneaDiagFieldsBindForms=bindForms;
bindForms=function(){__auneaDiagFieldsBindForms();document.querySelectorAll('[data-goto-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();if(e)e.stageId=b.dataset.gotoStage;render()});document.querySelectorAll('[data-open-gate-review]').forEach(b=>b.onclick=()=>openEngineGateReview());};
// [AUNEA-FE-DIAG-CONTROL-030] END
