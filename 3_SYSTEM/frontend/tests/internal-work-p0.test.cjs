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
