const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const stages=read('pages/diagnostic-stages.js');
const lifecycle=read('domain/process-lifecycle.js');
const process=read('domain/process.js');
const risk=read('domain/risk.js');
const economics=read('domain/economics.js');
const noReask=read('domain/no-reask.js');
const renderer=read('ui/renderer.js');
const completion=read('domain/completion.js');
const engine=read('services/engine-adapter.js');

test('every session stage uses canonical required-field validation before advancing',()=>{
  const start=stages.indexOf('function blockStageAdvance');
  const end=stages.indexOf('\nfunction bindPg01Context',start);
  const body=stages.slice(start,end);
  assert.match(body,/stagePendingRequired\(e,sid\)/);
  assert.doesNotMatch(body,/!==\s*['"]S01['"]/);
  assert.match(body,/canonicalFieldValidationIssue/);
});

test('canonical compound validation rejects malformed numeric facts',()=>{
  assert.match(noReask,/function canonicalFieldValidationIssue/);
  assert.match(noReask,/porcentaje debe estar entre 0 y 100/i);
  assert.match(noReask,/número de casos debe indicarse el periodo/i);
  assert.match(noReask,/volumen máximo no puede ser inferior/i);
  assert.match(noReask,/canonicalFieldValuePresent/);
});

test('generic semantic numeric modes cannot retain hidden stale values',()=>{
  assert.match(renderer,/semanticEmpty=mode==='UNKNOWN'\|\|mode==='NONE'/);
  assert.match(renderer,/normalizedValue=mode==='ZERO'\?0:semanticEmpty\?'':value/);
});

test('AS-IS layer confirmation is blocked by derived integrity issues',()=>{
  assert.match(lifecycle,/function processLayerIntegrityIssues/);
  assert.match(lifecycle,/const integrity=processLayerIntegrityIssues\(e,key\)/);
  assert.match(lifecycle,/No se puede confirmar:/);
});

test('PG09 never fabricates confirmation of the four AS-IS layers',()=>{
  const start=lifecycle.indexOf('function confirmClosingAsIs');
  const end=lifecycle.indexOf('// [AUNEA-FE-ASIS-CLIENT-EDITOR',start);
  const body=lifecycle.slice(start,end);
  assert.match(body,/pending=\['map','frictions','risks','impact'\]\.filter/);
  assert.doesNotMatch(body,/forEach\(k=>\{x\[k\]=true/);
  assert.match(body,/captureIntegrityIssues/);
});

test('risk scoring is explicit instead of silently defaulting likelihood and impact to 1',()=>{
  assert.match(risk,/num=v=>v===undefined\|\|v===null\?'':String\(v\)/);
  assert.match(risk,/Selecciona probabilidad e impacto entre 1 y 5/);
  assert.doesNotMatch(risk,/num=v=>String\(v\?\?'1'\)/);
});

test('economic records are normalized to the selected canonical driver',()=>{
  assert.match(economics,/function normalizedEconomicDriverRecord/);
  assert.match(economics,/if\(!activeDrivers\.has\(x\.driver_id\)\)x\.annual_active_hours=0/);
  assert.match(economics,/if\(x\.driver_id!=='ED13'\)x\.annual_wait_hours=0/);
  assert.match(economics,/if\(!draft\.driver_id\)return toast\('Selecciona el tipo de impacto/);
});

test('legacy cross-metric economics are normalized on load without auto-fixing ambiguous scope',()=>{
  assert.match(economics,/function migrateEconomicInputsToDriverShape/);
  assert.match(economics,/invalidateProcessLayers\(e,'impact'\)/);
  assert.match(economics,/kind:'SCOPE_MISMATCH'/);
  const start=economics.indexOf('function migrateEconomicInputsToDriverShape'),end=economics.indexOf('\nfunction economicInputIntegrityIssues',start);
  const migration=economics.slice(start,end);
  assert.doesNotMatch(migration,/suggestedStepId|Object\.assign/);
});

test('step and friction capture reject invalid percentage and missing Other detail',()=>{
  assert.match(process,/porcentaje de error o repetición debe estar entre 0 y 100/i);
  assert.match(process,/frecuencia porcentual debe estar entre 0 y 100/i);
  assert.match(process,/selectedOtherMissingDetail/);
});

test('removing a step reconciles all active technical references',()=>{
  const start=lifecycle.indexOf('function supersedeStep');
  const end=lifecycle.indexOf('\nfunction supersedeFriction',start);
  const body=lifecycle.slice(start,end);
  assert.match(body,/fr\.affected_steps=.*filter/);
  assert.match(body,/r\.step_ids=.*filter/);
  assert.match(body,/v\.step_ids=.*filter/);
  assert.match(body,/normal_next_step===stepId/);
});

test('completion readiness includes capture-integrity blockers',()=>{
  assert.match(completion,/captureIntegrityIssues/);
  assert.match(completion,/integrity\.length===0/);
  assert.match(completion,/type:'INTEGRITY'/);
});

test('risk payload no longer fabricates score 1 for missing likelihood or impact',()=>{
  const start=engine.indexOf('function normalizeRiskInputs');
  const end=engine.indexOf('\nfunction buildBackendPayload',start);
  const body=engine.slice(start,end);
  assert.doesNotMatch(body,/likelihood_1_5:Math\.max\(1/);
  assert.doesNotMatch(body,/impact_1_5:Math\.max\(1/);
});


test('conditional questions stay non-blocking while required questions keep the completion gate',()=>{
  assert.match(noReask,/function canonicalFieldRequiredNow/);
  assert.match(noReask,/Requiredness==='REQUIRED_90M'/);
  const requiredNow=noReask.slice(noReask.indexOf('function canonicalFieldRequiredNow'),noReask.indexOf('\nfunction',noReask.indexOf('function canonicalFieldRequiredNow')+10));
  assert.doesNotMatch(requiredNow,/CONDITIONAL_90M/);
  assert.match(stages,/Requiredness==='REQUIRED_90M'/);
  assert.match(completion,/canonicalFieldRequiredNow/);
});

test('structured AS-IS pages expose their remaining canonical stage questions',()=>{
  assert.match(process,/function layerCanonicalQuestions/);
  assert.match(process,/layerCanonicalQuestions\(e,'S04'\)/);
  assert.match(process,/consultantLayerPage\('Riesgos'[\s\S]*'S06'\)/);
  assert.match(process,/consultantLayerPage\('Impacto'[\s\S]*'S07'\)/);
});

test('boundary-only AS-IS and zero-friction cases remain valid when their canonical branches permit it',()=>{
  assert.doesNotMatch(lifecycle,/Añade al menos un paso real al mapa AS-IS/);
  assert.doesNotMatch(lifecycle,/Registra al menos una fricción observable/);
  assert.match(noReask,/if\(!hasBoundaries&&!activeSteps\(e\)\.length\)misses\.push\('Mapa AS-IS'\)/);
});

test('risk controls capture the canonical control list and no material condition defaults silently',()=>{
  assert.match(risk,/current_control/);
  assert.match(risk,/OS_CONTROL_TYPE/);
  assert.match(risk,/no se aplican valores por defecto/);
  assert.match(lifecycle,/controls_present===true&&!normalizeArray\(r\.current_control\)\.length/);
});

test('consultant layer status cannot say confirmed while integrity issues exist',()=>{
  const start=process.indexOf('function consultantLayerPage');
  const end=process.indexOf('\nfunction consultantStepsPage',start);
  const body=process.slice(start,end);
  assert.match(body,/processLayerIntegrityIssues/);
  assert.match(body,/done=!!processLayerState\(e\)\[layer\]&&!integrity\.length/);
  assert.match(body,/Revisión necesaria/);
});


test('derived-and-confirm fields are not complete until the current derivation is confirmed',()=>{
  assert.match(noReask,/mode==='DERIVE_AND_CONFIRM'/);
  assert.match(noReask,/isDerivedConfirmed\(f,e,reuse\)/);
  assert.match(noReask,/DERIVE_AND_CONFIRM/);
  assert.match(noReask,/data-confirm-derived/);
});

test('linked canonical step references use answerDetails rather than synthetic top-level answers',()=>{
  const state=read('core/state.js');
  assert.match(state,/match\(\/\^\(DF\\d\{3\}\)__\(step\|steps\)\$\//);
  assert.match(state,/details\[fid\]=value/);
  assert.match(noReask,/El paso vinculado ya no está activo/);
  assert.match(lifecycle,/DF\\d\{3\}__step/);
});

test('friction capture never invents evidence type or count period',()=>{
  assert.doesNotMatch(process,/evidence_type:'EV02'/);
  assert.doesNotMatch(process,/f\.evidence_type=.*\|\|'EV02'/);
  assert.doesNotMatch(process,/period\.value='month'/);
  assert.match(process,/Si registras una pérdida monetaria directa, indica también el periodo/);
});

test('legacy risks are invalidated instead of trusting old implicit booleans',()=>{
  assert.match(risk,/function migrateRiskCaptureIntegrity/);
  assert.match(risk,/r\.controls_present=null/);
  assert.match(risk,/r\.reversibility=''/);
  assert.match(risk,/r\.current_control=\[\]/);
});

test('risk adapter fails closed instead of applying frontend fallback semantics',()=>{
  const start=engine.indexOf('function normalizeRiskInputs');
  const end=engine.indexOf('\nfunction buildBackendPayload',start);
  const body=engine.slice(start,end);
  assert.match(body,/requireBool/);
  assert.doesNotMatch(body,/category:r\.category\|\|'RC01'/);
  assert.doesNotMatch(body,/reversible:r\.reversible!==false/);
});
