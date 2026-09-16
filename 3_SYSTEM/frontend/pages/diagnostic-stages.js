// [AUNEA-FE-DIAG-CONTROL-030] START — Stage navigation shell and process/friction capture prompts
// PURPOSE: Stage navigation shell and process/friction capture prompts for the guided diagnostic flow. Option-set lookup helper.
// SOURCE: v1.0.4 aceptada, SHA256 a9fb7400b000d6289224610c88d4b7dc51f75f8ae97e20e4c3873a3a8e01d6e7; Diagnostic Master v1; DEC-034/038/040.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
function fieldOptions(setId){return schema?.option_sets?.[setId]?.options||[]}

function diagnosticFieldMeta(f){return f.Requiredness==='REQUIRED_90M'?requiredMark():''}
function habitualVolumeBlock(f21,f22,e){
  const value=numberParts(effectiveValue(f21,e)),period=effectiveValue(f22,e),periods=fieldOptions(f22.Option_Set_ID||'OS_PERIOD');
  return `<div class="field full volume-pair" data-uat="UAT-VIS-023"><label>Volumen habitual${diagnosticFieldMeta(f21)}</label><div><div class="compound-control volume-sentence"><input type="number" min="0" step="any" data-number-value="${f21.Field_ID}" value="${attr(value.value??'')}" placeholder="120"><input type="hidden" data-number-unit="${f21.Field_ID}" value="case"><span class="unit-label">casos por</span><select data-answer="${f22.Field_ID}"><option value="">periodo…</option>${periods.map(o=>`<option value="${attr(o.value)}" ${String(period)===String(o.value)?'selected':''}>${esc(String(o.label).toLowerCase())}</option>`).join('')}</select></div></div><div class="field-help">${esc(f21.Objetivo_concreto||'')} ${esc(f22.Objetivo_concreto||'')}</div></div>`;
}
function peakVolumeBlock(f,e){
  const value=numberParts(effectiveValue(f,e)),periods=fieldOptions('OS_PERIOD');
  return `<div class="field full volume-pair" data-uat="UAT-VIS-024"><label>${esc(f.Pregunta_o_etiqueta_ES)}${diagnosticFieldMeta(f)}</label><div><div class="compound-control volume-sentence"><input type="number" min="0" step="any" data-number-value="${f.Field_ID}" value="${attr(value.value??'')}" placeholder="200"><input type="hidden" data-number-unit="${f.Field_ID}" value="case"><span class="unit-label">casos por</span><select data-number-period="${f.Field_ID}"><option value="">periodo…</option>${periods.map(o=>`<option value="${attr(o.value)}" ${String(value.period)===String(o.value)?'selected':''}>${esc(String(o.label).toLowerCase())}</option>`).join('')}</select></div></div><div class="field-help">${esc(f.Objetivo_concreto||'')}</div></div>`;
}
function renderStageFields(fields,e){
  const out=[];
  for(let i=0;i<fields.length;i++){
    const f=fields[i];
    if(f.Field_ID==='DF021'){
      const f22=fields.find(x=>x.Field_ID==='DF022');
      if(f22){out.push(habitualVolumeBlock(f,f22,e));continue}
    }
    if(f.Field_ID==='DF022'&&fields.some(x=>x.Field_ID==='DF021'))continue;
    if(f.Field_ID==='DF023'){out.push(peakVolumeBlock(f,e));continue}
    out.push(renderQuestion(f,e));
  }
  return out.join('');
}

// Which approved reference each stage reproduces, and what the client is looking at while it is
// being captured. Both come from the 90-min UI Spec (§5 client states, §17 inventory), not from here.
const STAGE_REFERENCE = {S01:'I90-01',S02:'I90-02',S03:'I90-03',S04:'I90-04',S05:'I90-05',S06:'I90-06',S07:'I90-07',S08:'I90-08',S09:'I90-09'};
const STAGE_CLIENT_STATE = {
  S01:{id:'C90-00',shared:false,text:'Esta información es sólo para tu preparación interna. Aún no se muestra al cliente.'},
  S02:{id:'C90-00',shared:false,text:'Esta información es sólo para tu preparación interna. Aún no se muestra al cliente.'},
  S03:{id:'C90-00',shared:false,text:'Esta información es sólo para tu preparación interna. Aún no se muestra al cliente.'},
  S04:{id:'C90-01 / C90-02',shared:true,text:'El cliente ve el mapa AS-IS construyéndose. Seleccionar un paso abre su detalle sin salir del mismo canvas.'},
  S05:{id:'C90-03',shared:true,text:'El mismo AS-IS, ahora con las fricciones confirmadas superpuestas sobre los pasos afectados.'},
  S06:{id:'C90-03',shared:true,text:'El mismo AS-IS con los riesgos confirmados en lenguaje de negocio. El scoring y la categoría interna no salen de esta consola.'},
  S07:{id:'C90-03',shared:true,text:'El mismo AS-IS con los impactos confirmados. No se muestra business case, ROI ni ahorro final durante la sesión.'},
  S08:{id:'C90-03',shared:true,text:'El cliente mantiene el AS-IS enriquecido. El estado objetivo y las restricciones se capturan aquí, en privado.'},
  S09:{id:'C90-04',shared:true,text:'Validación final del AS-IS enriquecido más un cierre compacto junto al flujo.'}
};

// The inspector explains the stage from its own canonical attributes — objective, input, main
// interaction, output and exit criterion — instead of restating them as invented copy.
function stagePurposeCard(stage){
  const rows=[['Objetivo',stage.Objetivo],['Entrada',stage.Entrada],['Interacción principal',stage['Interacción_principal']],
              ['Salida',stage.Salida],['Criterio de salida',stage.Criterio_de_salida]].filter(([,v])=>v);
  return insCard('Qué prepara este paso',`<ul class="numbered-list">${rows.map(([k,v],i)=>
    `<li><span class="n">${i+1}</span><div><b>${esc(k)}</b><p>${esc(v)}</p></div></li>`).join('')}</ul>`,{icon:'▤'});
}
function stageCoverageCard(stage,fields){
  const ids=fields.map(f=>f.Field_ID).filter(Boolean).sort();
  const range=ids.length?(ids.length===1?ids[0]:`${ids[0]} – ${ids[ids.length-1]}`):'—';
  return insCard('Cobertura',
    `<div class="coverage-chips"><span class="chip">${esc(range)}</span><span class="chip">${esc(stage.Stage_ID)}</span><span class="chip gold">${esc(String(stage.Minutos_objetivo))} min</span></div>`
    +`<p class="ins-note">${esc(stage.Regla_de_tiempo||'')}</p>`,{icon:'◎'});
}
function stageClientCard(stage){
  const c=STAGE_CLIENT_STATE[stage.Stage_ID]||{id:'—',shared:false,text:''};
  return insCard('Vista de la sesión',`<p>${esc(c.text)}</p><div class="coverage-chips" style="margin-top:10px"><span class="chip">${esc(c.id)}</span><span class="chip ${c.shared?'gold':''}">${c.shared?'Compartida con el cliente':'No se comparte'}</span></div>`,
    {accent:true,icon:c.shared?'◉':'◌'});
}

function stagePage(){
  const e=currentEng(),stage=schema.flow.find(x=>x.Stage_ID===(e.stageId||'S01'))||schema.flow[0];
  const fields=schema.fields.filter(f=>f.Stage_ID===stage.Stage_ID&&questionVisible(f,e));
  const stageIndex=schema.flow.findIndex(x=>x.Stage_ID===stage.Stage_ID),isLastStage=stageIndex===schema.flow.length-1;
  const completion=engagementCompletion(e);
  const stageStat=completion.stage[stage.Stage_ID]||{applicable:0,answered:0,pct:100};
  const next=schema.flow[stageIndex+1];

  // The nine steps live in the rail now, exactly as the references show. A second stage list inside the
  // page would be the same navigation twice.
  const main=`<div class="card stage-card">
      ${fields.some(f=>f.Requiredness==='REQUIRED_90M')?REQUIRED_LEGEND_HTML:''}
      <div class="form-grid">${renderStageFields(fields,e)}</div>
      ${stage.Stage_ID==='S04'?processPrompt(e):''}${stage.Stage_ID==='S05'?frictionPrompt(e):''}
      ${stage.Stage_ID==='S06'?riskBuilder(e):''}${stage.Stage_ID==='S07'?economicBuilder(e):''}
      ${isLastStage?validationSummary(e,completion):''}
    </div>`;

  const inspector=stageClientCard(stage)+stagePurposeCard(stage)+stageCoverageCard(stage,fields)
    +insCard('Progreso de la captura',
      `<div class="completion-headline" style="margin-bottom:8px">${completion.readyToCalculate?'<span class="status green">Listo para calcular</span>':`<span class="status amber">${completion.missing.length} pendiente${completion.missing.length===1?'':'s'}</span>`}</div>`
      +kvRows([['En esta etapa',`${stageStat.answered} de ${stageStat.applicable} campo(s) con dato`],
               ['Etapas revisadas',`${completion.stagesReviewed} de ${completion.stagesTotal}`],
               ['Obligatorios',`${completion.requiredComplete} de ${completion.requiredApplicable}`],
               ['Evidencia pendiente',String(completion.evidencePending.length)]]),{icon:'▥'});

  // The last stage carries no second calculate button: validationSummary owns that CTA, together with
  // the blockers that explain why it is or is not available. Two of them was one too many.
  const bar=actionBar(
    `<button class="btn" id="saveDraft">Guardar borrador</button>`,
    `<button class="btn" id="prevStage" ${stageIndex===0?'disabled':''}>Volver</button>`
    +(isLastStage?'':`<button class="btn btn-primary" id="nextStage">Continuar a ${esc(String(next.Stage_ES).toLowerCase())} →</button>`));

  return pageTop(stage.Stage_ES,stage.Objetivo,'',STAGE_REFERENCE[stage.Stage_ID]||'')
    + workspace(main,inspector) + bar;
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
    ?`<button class="btn btn-primary" id="runDiag">${e.diagnosticOutput?'RECALCULAR DIAGNÓSTICO Y RECOMENDACIÓN':'CALCULAR DIAGNÓSTICO Y RECOMENDACIÓN'}</button>`
    :`<div class="blocker-list">${completion.blockers.map(b=>{
        const action=b.type==='GATE'?'<button type="button" class="btn btn-small" data-open-gate-review="1">Confirmar</button>'
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
bindForms=function(){
  __auneaDiagFieldsBindForms();
  document.querySelectorAll('[data-goto-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();if(e)e.stageId=b.dataset.gotoStage;render()});
  document.querySelectorAll('[data-open-gate-review]').forEach(b=>b.onclick=()=>openEngineGateReview());
  const sd=document.getElementById('saveDraft');if(sd)sd.onclick=()=>saveState('Borrador guardado');
};
// [AUNEA-FE-DIAG-CONTROL-030] END
