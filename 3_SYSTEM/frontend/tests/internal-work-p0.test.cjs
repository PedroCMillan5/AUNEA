const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const results=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
const workbench=fs.readFileSync(path.join(root,'domain/analysis-workbench.js'),'utf8');
const state=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
const boot=fs.readFileSync(path.join(root,'boot.js'),'utf8');
const display=fs.readFileSync(path.join(root,'pages/session-display.js'),'utf8');

test('Trabajo interno rail follows the governed lifecycle using only existing pages',()=>{
  const block=state.slice(state.indexOf('const INTERNAL_WORK_NAV'),state.indexOf('const SYSTEM_NAV'));
  const expected=['resultados','tobe','comparacion','escenarios','recomendacion','revision','quote','modoresultados','implementacion'];
  let last=-1;
  for(const page of expected){
    const i=block.indexOf("'"+page+"'");
    assert.ok(i>last,page+' must follow the previous internal-work page');
    last=i;
  }
  assert.doesNotMatch(boot,/INTERNAL_WORK_NAV\.push/);
  assert.doesNotMatch(display,/INTERNAL_WORK_NAV\.(?:push|splice)/);
});

test('Diagnóstico exposes current/obsolete state without persisting a STALE enum',()=>{
  assert.match(results,/function diagnosticOutputFreshness\(e\)/);
  assert.match(results,/status:'OBSOLETE'/);
  assert.match(results,/e\.lastEngineSnapshotVersion!==snap\.version/);
  assert.doesNotMatch(results,/\.status\s*=\s*['"]STALE['"]/);
});

test('all downstream diagnostic consumers use the current snapshot output',()=>{
  for(const fn of ['recommendationPage','scenariosPage','createScenario','downloadQuotePdf','quotePage']){
    const start=results.indexOf('function '+fn);
    const end=results.indexOf('\nfunction ',start+10);
    const body=results.slice(start,end<0?results.length:end);
    assert.match(body,/currentDiagnosticOutput\(e\)/,fn);
    assert.doesNotMatch(body,/const o=e\.diagnosticOutput/,fn);
  }
});

test('Diagnóstico copy is conservative and keeps waiting separate',()=>{
  assert.match(results,/Trabajo activo del proceso/);
  assert.match(results,/EconomicInput/);
  assert.match(results,/Exposición a espera/);
  assert.match(results,/no son horas laborales/);
  assert.match(results,/no horas laborales ni ahorro|no se monetiza como trabajo/);
  assert.doesNotMatch(results,/Revisado: continuar a TO-BE/);
  assert.match(results,/Continuar al diseño TO-BE/);
});

test('preliminary diagnosis recommendation does not expose price',()=>{
  const start=results.indexOf('function diagnosisRecommendationHtml');
  const end=results.indexOf('\nfunction resultsPage',start);
  const body=results.slice(start,end);
  assert.doesNotMatch(body,/one_off_eur|Precio base|TCO|recurring_monthly_eur/);
  assert.match(results,/function codedField[\s\S]*internal-tag/,'technical ids remain secondary metadata, not the business label');
});

test('AS-IS/TO-BE comparison does not calculate economics from ProcessStep in frontend',()=>{
  const start=results.indexOf('function tobeComparisonPage');
  const end=results.indexOf('\nfunction scenariosPage',start);
  const body=results.slice(start,end);
  assert.match(body,/currentDiagnosticOutput\(e\)/);
  assert.doesNotMatch(body,/asis\.reduce|annual_active_hours\s*=|annual_wait_hours\s*=/);
  assert.match(body,/ninguna métrica económica se calcula en el navegador/);
});

test('Diagnóstico keeps the existing AS-IS renderer as its single map reference',()=>{
  const start=results.indexOf('function diagnosisReadonlyMap');
  const end=results.indexOf('\nfunction diagnosisFindingsHtml',start);
  const body=results.slice(start,end);
  assert.match(body,/processGraphHtml\(/);
  assert.doesNotMatch(body,/new .*Graph|clone|copy/i);
});


test('client-ready PDF remains behind the existing OutputReview approval gate',()=>{
  const start=results.indexOf('async function downloadQuotePdf');
  const end=results.indexOf('\nfunction quotePage',start);
  const body=results.slice(start,end);
  assert.match(body,/approvedOutputReview\(e\)/);
  assert.match(body,/Revisión humana antes de generar un entregable para cliente/);
});

test('recalculation integrity gate stays on Diagnóstico instead of forcing Impacto',()=>{
  const engine=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');
  const start=engine.indexOf('async function runDiagnosis');
  const end=engine.indexOf('// C05 · Optional internal AI orchestration',start);
  const body=engine.slice(start,end);
  assert.match(body,/captureIntegrityIssues/);
  assert.match(body,/state\.activePage='resultados'/);
  assert.doesNotMatch(body,/state\.activePage='impacto'/);
  assert.match(body,/No se ha recalculado:/);
});


test('PG10 provides an inspectable trace for each engine finding',()=>{
  const start=results.indexOf('function diagnosisFindingsHtml(');
  const end=results.indexOf('\nfunction ',start+10);
  const source=results.slice(start,end);
  assert.match(source,/<details class="diagnosis-source-review">/);
  assert.match(source,/Ver trazabilidad del hallazgo/);
  assert.match(source,/data-page="proceso"/);
  assert.match(source,/deduplication_key/);
  assert.match(source,/p\.confidence/);
});


test('client presentation helper note starts on its own line',()=>{
  assert.match(results,/class="client-presentation-note" style="display:block;margin-top:8px"/);
});

test('PG10 coverage separates accessible, derived and nonrequired absent data',()=>{
  assert.match(workbench,/function asisFieldInventory\(record\)/);
  assert.match(workbench,/status=present\?/);
  assert.match(workbench,/DERIVATION_NOT_AVAILABLE/);
  assert.match(workbench,/NOT_CAPTURED_OR_CONDITIONAL/);
  assert.match(workbench,/canonicalMissingRequired\(e\)/);
  assert.match(workbench,/no equivalen a preguntas obligatorias pendientes/);
  assert.match(workbench,/x\.blocking\?' · Bloqueante':' · No bloqueante'/);
  assert.match(workbench,/x\.source_fields/);
});
test('PG10 findings use canonical Spanish friction labels and show grounded trace',()=>{
  const start=results.indexOf('function diagnosisPainLabel(');
  const end=results.indexOf('\nfunction ',start+10);
  const fn=results.slice(start,end);
  assert.match(fn,/schema\.friction_pain_map/);
  assert.match(fn,/mapped\?\.Label_ES/);
  assert.doesNotMatch(fn,/ref\?\.Pain_Pattern/);
  assert.match(results,/Causa declarada/);
  assert.match(results,/Prioridad indicada por el cliente/);
  assert.match(results,/No consta una prioridad confirmada \(DF096\)/);
  assert.match(results,/relación contextual, no causal/);
  assert.match(results,/Ver punto de análisis en esta página/);
  assert.match(workbench,/asis-source-step-/);
});
test('PG10 temporal cards keep additional friction labour and declared E2E separate',()=>{
  const start=results.indexOf('function diagnosisProcessBaselineHtml(');
  const end=results.indexOf('\nfunction ',start+10);
  const fn=results.slice(start,end);
  assert.match(fn,/annual_active_hours/);
  assert.match(fn,/annual_friction_additional_hours/);
  assert.match(fn,/annual_total_active_hours/);
  assert.match(fn,/annual_wait_exposure_hours/);
  assert.match(fn,/annual_rework_hours/);
  assert.match(fn,/asisSourceBoundary\(record,'DF026'\)/);
  assert.match(fn,/Conciliación end-to-end pendiente de acreditar/);
  assert.match(fn,/no horas laborales ni ahorro/);
  assert.match(workbench,/diagnosisProcessBaselineHtml\(data.process_time_projection,record\)/);
  assert.match(results,/diagnosisProcessBaselineHtml\(processTime,record\)/);
});

test('PG10 EconomicInput cards distinguish zero, missing and unearned savings',()=>{
  const start=results.indexOf('function diagnosisEconomicsHtml(');
  const end=results.indexOf('\nfunction ',start+10);
  const fn=results.slice(start,end);
  assert.match(fn,/econ\.annual_active_hours==null/);
  assert.match(fn,/econ\.annual_wait_hours==null/);
  assert.match(fn,/econ\.direct_loss_eur_annual==null/);
  assert.match(fn,/econ\.realized_cash_saving_eur_annual==null/);
  assert.match(fn,/No es una previsión de ahorro futuro/);
  assert.match(fn,/no equivale a un coste eliminable/);
});


// [AUNEA-UAT-PG10-COMPACT-158] START — Source-grounded UAT for one comparator and progressive drilldown.
// Tests the HTML returned by the real PG10 functions, without any backend or persisted mutations.
function pg10CompactRenderers(){
  const begin=workbench.indexOf('const ASIS_CONDITIONAL_DIRECTIONS=');
  const stop=workbench.indexOf('function asisAnalysisSnapshot(',begin);
  assert.ok(begin>=0&&stop>begin);
  const extract=name=>{
    const from=workbench.indexOf('function '+name+'('),to=workbench.indexOf('\nfunction ',from+10);
    assert.ok(from>=0&&to>from,'Function '+name+' is present');
    return workbench.slice(from,to);
  };
  const source=workbench.slice(begin,stop)
    +['asisPointRecords','asisPointReviewHtml','asisPointCardsHtml','asisDirectionCardsHtml'].map(extract).join('\n')
    +'\nreturn {asisPointCardsHtml,asisDirectionCardsHtml};';
  let official=false;
  const renderers=new Function(
    'normalizeArray','labelFrom','esc','attr','asisSourceTime','econDriverLabel','asisAnalysisSource','currentDiagnosticOutput',source
  )(
    v=>Array.isArray(v)?v:v==null?[]:[v],
    (_,v)=>v,
    v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    v=>String(v??'').replaceAll('"','&quot;'),
    v=>v==null?'No consta':v+' min',
    x=>x||'Evento',
    e=>e,
    ()=>official?{input_snapshot_hash:'official'}:null
  );
  return {...renderers,enableOfficial:()=>{official=true}};
}
function levantePg10Fixture(){
  return {
    processSteps:[
      {id:'P1',step_name:'Recibir factura del proveedor',active_time:3,wait_time:0,rework_time:0,inputs:['PDF'],manual_actions:['CHECK']},
      {id:'P2',step_name:'Determinar si procede aprobación',step_type:'ST04',decision_criteria:['THRESHOLD'],exception_path:{destination_step:'P4'},active_time:2,wait_time:0,rework_time:0,manual_actions:['COMPARE']},
      {id:'P3',step_name:'Aprobar factura',step_type:'ST05',active_time:6,wait_time:768,rework_time:0,inputs:['PDF'],manual_actions:['CHECK']},
      {id:'P4',step_name:'Registrar en ERP y archivar expediente',active_time:10,wait_time:0,rework_time:5,inputs:['PDF'],manual_actions:['REKEY']}
    ],
    frictions:[
      {id:'F1',affected_steps:['P4'],client_label:'Reintroducción manual',observable_signal:'5 min ya incluidos',time_attribution:{mode:'INCLUDED'}},
      {id:'F2',affected_steps:['P1','P2'],client_label:'Falta de visibilidad',observable_signal:'10 min adicionales',time_attribution:{mode:'ADDITIONAL'}},
      {id:'F3',affected_steps:['P2','P3'],client_label:'Esperas de aprobación',observable_signal:'2 días ponderados',time_attribution:{mode:'INCLUDED'}}
    ],
    risks:[{step_ids:['P1','P4'],description:'Pérdida de trazabilidad'},{step_ids:['P4'],description:'Errores ERP'}],
    economicInputs:[{step_ids:['P1','P2','P4'],driver_id:'ED14'},{step_ids:['P3'],driver_id:'ED14'},{step_ids:['P4'],driver_id:'ED12'}]
  };
}
test('PG10 renders one compact step card per active source step without repeating three alternatives inside each',()=>{
  const render=pg10CompactRenderers(),html=render.asisPointCardsHtml(levantePg10Fixture());
  assert.equal(html.split('class="asis-opportunity-point"').length-1,4);
  assert.equal(html.split('class="asis-point-review"').length-1,4);
  assert.doesNotMatch(html,/asis-point-alternatives-grid|asis-point-alternative"/);
  assert.match(html,/Reintroducción manual/);
  assert.match(html,/Falta de visibilidad/);
  assert.match(html,/Incluido en el paso/);
  assert.match(html,/Adicional al paso/);
  assert.match(html,/no implica causa, importe recuperable ni ahorro/);
  assert.match(html,/id="asis-source-step-P4"/);
});
test('PG10 has exactly three global paths grounded in AS-IS and preserves governed scenario actions',()=>{
  const render=pg10CompactRenderers(),record=levantePg10Fixture();
  const pending=render.asisDirectionCardsHtml(record);
  assert.equal(pending.split('class="asis-direction-card"').length-1,3);
  assert.match(pending,/Acciones manuales registradas en:/);
  assert.match(pending,/Documentos o mensajes registrados como entrada en:/);
  assert.match(pending,/Decisiones, excepciones o aprobaciones registradas en:/);
  assert.match(pending,/Disponible tras calcular el diagnóstico oficial/);
  assert.equal(pending.split('disabled title="Primero calcula el diagnóstico oficial"').length-1,3);
  render.enableOfficial();
  const official=render.asisDirectionCardsHtml(record);
  assert.equal(official.split('data-draft-conditional-scenario=').length-1,3);
  assert.doesNotMatch(official,/disabled title="Primero calcula el diagnóstico oficial"/);
  assert.match(official,/Tiempo futuro, ahorro y precio pendientes/);
});
test('PG10 compact hierarchy stays Spanish, responsive and does not duplicate the diagram or stages',()=>{
  const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
  assert.match(css,/\.asis-opportunity-point:target/);
  assert.match(css,/\.asis-point-review-grid/);
  assert.match(css,/\.asis-direction-source/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(results,/<span>Problemas<\/span>/);
  assert.match(results,/<span>Impacto económico<\/span>/);
  assert.doesNotMatch(results,/<span>Recommendation<\/span>/);
  const start=results.indexOf('function resultsPage(');
  const end=results.indexOf('\nfunction ',start+10);
  const page=results.slice(start,end);
  assert.equal(page.split("section('Mapa y puntos críticos del AS-IS'").length-1,1);
  assert.equal(page.split("section('Alternativas de intervención a contrastar'").length-1,1);
  assert.equal(page.split("section('Qué ocurrirá al calcular la recomendación'").length-1,1);
});
// [AUNEA-UAT-PG10-COMPACT-158] END


// [AUNEA-UAT-PG10-REFERENCE-159] START — Reference-card typography regression.
test('PG10 reference cards always separate the value and its supporting explanation',()=>{
  const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
  const pageStart=results.indexOf("section('Estado actual y tiempo de referencia'");
  const pageEnd=results.indexOf("section('Mapa y puntos críticos del AS-IS'",pageStart);
  const section=results.slice(pageStart,pageEnd);
  assert.ok(pageStart>=0&&pageEnd>pageStart);
  assert.equal(section.split('class="notice diagnosis-reference-card"').length-1,3);
  assert.equal(section.split('class="diagnosis-reference-value"').length-1,3);
  assert.equal(section.split('class="diagnosis-reference-note"').length-1,3);
  assert.match(section,/asisSourceBoundary\(record,'DF026'\)/);
  assert.match(section,/asisSourceBoundary\(record,'DF025'\)/);
  assert.match(section,/record\.answers\?\.DF086/);
  assert.match(css,/\.diagnosis-reference-card \.diagnosis-reference-note\{/);
  assert.match(css,/display:block;margin:auto 0 0;padding-top:11px/);
  assert.match(css,/\.diagnosis-reference-grid \.diagnosis-reference-card\{/);
  assert.doesNotMatch(section,/<small>No equivale|<small>Sin tiempo futuro/);
});
// [AUNEA-UAT-PG10-REFERENCE-159] END


// [AUNEA-UAT-PG10-MAP-NAV-160] START — Clicking a graph node reveals its owned PG10 analysis.
test('PG10 map nodes open their matching read-only analysis cards and are keyboard accessible',()=>{
  const start=results.indexOf('function bindDiagnosticMapPointNavigation(');
  const end=results.indexOf('\nfunction ',start+10);
  assert.ok(start>=0&&end>start);
  const fn=results.slice(start,end);
  const classes=()=>{
    const set=new Set();
    return {add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x)};
  };
  const targetIds=['P1','P2','P3','P4'];
  const targets=Object.fromEntries(targetIds.map(id=>{
    const details={open:false};
    return ['asis-source-step-'+id,{classList:classes(),details,scrolls:0,
      querySelector:q=>q==='.asis-point-review'?details:{textContent:'Paso '+id},
      scrollIntoView(){this.scrolls++;}
    }];
  }));
  const nodes=[...targetIds.map(id=>({dataset:{graphNode:id},classList:classes(),events:{},attrs:{},
    addEventListener(event,fn){this.events[event]=fn},
    setAttribute(k,v){this.attrs[k]=v}
  })),{dataset:{graphNode:'__START__'},classList:classes(),events:{},
    addEventListener(event,fn){this.events[event]=fn},
    setAttribute(k,v){this.attrs[k]=v}
  }];
  const doc={
    getElementById:id=>targets[id]||null,
    querySelectorAll:q=>q==='.process-graph-readonly [data-graph-node]'?nodes:
      q==='.asis-opportunity-point.is-selected'?Object.values(targets).filter(x=>x.classList.contains('is-selected')):[]
  };
  const bind=new Function('state','document',fn+'\nreturn bindDiagnosticMapPointNavigation;')({activePage:'resultados'},doc);
  bind();
  assert.equal(nodes.slice(0,4).filter(n=>n.attrs.role==='button'&&n.attrs.tabindex==='0').length,4);
  assert.equal(Object.keys(nodes[4].events).length,0,'start boundary is not actionable');
  nodes[0].events.click();
  assert.equal(targets['asis-source-step-P1'].details.open,true);
  assert.equal(targets['asis-source-step-P1'].scrolls,1);
  let prevented=false;
  nodes[3].events.keydown({key:'Enter',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(targets['asis-source-step-P4'].details.open,true);
  assert.equal(targets['asis-source-step-P4'].classList.contains('is-selected'),true);
  assert.equal(targets['asis-source-step-P1'].classList.contains('is-selected'),false);
  assert.match(results,/bindDiagnosticMapPointNavigation\(\);/);
  const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
  assert.match(css,/\.diagnosis-map-selectable:focus-visible/);
});
test('PG10 map click handler does not alter confirmed process records or call an editor',()=>{
  const start=results.indexOf('function bindDiagnosticMapPointNavigation(');
  const end=results.indexOf('\nfunction ',start+10);
  const fn=results.slice(start,end);
  assert.doesNotMatch(fn,/markDirty|save|mutation|data-edit-step|render\(/);
  assert.match(fn,/\.asis-point-review/);
  assert.match(fn,/scrollIntoView/);
});
// [AUNEA-UAT-PG10-MAP-NAV-160] END
