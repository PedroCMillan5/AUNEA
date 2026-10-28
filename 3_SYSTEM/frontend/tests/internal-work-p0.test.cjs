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
  assert.match(workbench,/Los campos condicionales no implican por sí solos una respuesta obligatoria pendiente/);
  assert.match(workbench,/x\.blocking\?' · Bloqueante cuando aplica':' · No bloqueante según el contrato'/);
  assert.match(workbench,/source_fields/);
});
// [AUNEA-UAT-PG10-COVERAGE-OWNER-161] START — Repeatable owners and independent gate messages.
test('PG10 coverage reads actual repeatable owners and identifies partial coverage',()=>{
  const extract=name=>{
    const from=workbench.indexOf('function '+name+'(');
    const to=workbench.indexOf('\nfunction ',from+10);
    assert.ok(from>=0&&to>from,name+' must exist');
    return workbench.slice(from,to);
  };
  const fields=[
    {Field_ID:'DF031',Stage_ID:'S04',Pregunta_o_etiqueta_ES:'Nombre de paso',Ask_Mode:'CAPTURE_IN_PROCESS_STEP'},
    {Field_ID:'DF033',Stage_ID:'S04',Pregunta_o_etiqueta_ES:'Responsable',Ask_Mode:'CAPTURE_IN_PROCESS_STEP'},
    {Field_ID:'DF056',Stage_ID:'S05',Pregunta_o_etiqueta_ES:'Fricción',Ask_Mode:'CAPTURE_IN_FRICTION'},
    {Field_ID:'DF070',Stage_ID:'S06',Pregunta_o_etiqueta_ES:'Probabilidad',Ask_Mode:'CAPTURE_IN_RISK'},
    {Field_ID:'DF076',Stage_ID:'S07',Pregunta_o_etiqueta_ES:'Coste de capacidad',Ask_Mode:'CONDITIONAL_ASK'},
    {Field_ID:'DF085',Stage_ID:'S07',Pregunta_o_etiqueta_ES:'Evidencia',Ask_Mode:'DERIVED'}
  ];
  const inventory=new Function('schema','valuePresent','canonicalFieldRequiredNow','effectiveValue',
    extract('asisOwnerCollectionValue')+'\n'+extract('asisFieldInventory')+'\nreturn asisFieldInventory;')
    ({fields,flow:[{Stage_ID:'S04',Stage_ES:'Pasos'},{Stage_ID:'S05',Stage_ES:'Fricciones'},{Stage_ID:'S06',Stage_ES:'Riesgos'},{Stage_ID:'S07',Stage_ES:'Economía'}]},
     v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0),
     ()=>false,(f,e)=>f.Field_ID==='DF085'?['EV02']:e.answers?.[f.Field_ID]);
  const record={answers:{},
    processSteps:[{step_name:'P1',actor:'Compras'},{step_name:'P2',actor:'Finanzas'},
      {step_name:'P3'},{step_name:'P4',actor:'Administración'}],
    frictions:[{friction_type:'P03',observable_signal:'Reintroducción de datos'},{friction_type:'P09',client_label:'Seguimiento'},{friction_type:'P07',client_label:'Esperas'}],
    risks:[{likelihood_1_5:3},{likelihood_1_5:2}],
    economicInputs:[{driver_id:'ED01',capacity_cost_rate_eur_hour:19},
      {driver_id:'ED14',capacity_cost_rate_eur_hour:23},{driver_id:'ED12',current_tool_cost_eur_annual:0}]};
  const flat=inventory(record).flatMap(g=>g.items),byId=id=>flat.find(x=>x.id===id);
  assert.deepEqual([byId('DF031').source.count,byId('DF031').source.total],[4,4]);
  assert.deepEqual([byId('DF033').source.count,byId('DF033').source.total],[3,4]);
  assert.equal(byId('DF033').status,'AVAILABLE');
  assert.deepEqual([byId('DF056').source.count,byId('DF056').source.total],[3,3]);
  assert.deepEqual([byId('DF070').source.count,byId('DF070').source.total],[2,2]);
  assert.deepEqual([byId('DF076').source.count,byId('DF076').source.total],[2,2]);
  assert.equal(byId('DF085').status,'DERIVED');
  assert.equal(Object.keys(record.answers).length,0,'read-only inventory cannot synthesize answers');
  assert.match(workbench,/cobertura parcial/);
});
test('PG10 preparation distinguishes missing capture data from unresolved consultant gates',()=>{
  assert.match(results,/miss\.length\?'Hay datos obligatorios de captura pendientes/);
  assert.match(results,/Faltan decisiones técnicas del consultor/);
  assert.match(results,/unresolved\.length/);
  assert.doesNotMatch(results,/Hay información obligatoria pendiente:/);
});
// [AUNEA-UAT-PG10-COVERAGE-OWNER-161] END

// [AUNEA-UAT-PG10-COVERAGE-162] START — Real three-level renderer with backend-authoritative status.
test('PG10 coverage shows capture integrity, server sufficiency and consultant gates as separate levels',()=>{
  const extract=name=>{
    const start=workbench.indexOf('function '+name+'(');
    const end=workbench.indexOf('\nfunction ',start+10);
    assert.ok(start>=0&&end>start,'renderer present: '+name);
    return workbench.slice(start,end);
  };
  const fields=Array.from({length:100},(_,i)=>({
    Field_ID:'DF'+String(i+1).padStart(3,'0'),
    Pregunta_o_etiqueta_ES:'Pregunta '+(i+1),Stage_ID:'S01',Ask_Mode:'ASK'
  }));
  const inputSource=[
    {status:'COVERED',source_fields:['DF031'],blocking:true},
    {status:'GAP',source_fields:['DF070'],blocking:true},
    {status:'UNKNOWN_APPLICABILITY',source_fields:['DF084'],blocking:false},
    {status:'NOT_APPLICABLE',source_fields:['DF075'],blocking:false}
  ];
  const fn=new Function('schema','asisAnalysisSource','asisFieldInventory','canonicalMissingRequired',
    'captureIntegrityIssues','asisAnalysisSnapshot','normalizeArray','esc',
    'currentDiagnosticOutput','unresolvedEngineGates','ENGINE_GATE_CONTRACT','ENGINE_GATE_GUIDE','asisConfirmedDataHtml','asisFieldValueDisplay',
    extract('asisCoverageHtml')+'\nreturn asisCoverageHtml;')(
      {fields},
      e=>e,
      ()=>[{stage:'S01',title:'Contexto',filled:2,items:fields.map((f,i)=>({
        id:f.Field_ID,label:f.Pregunta_o_etiqueta_ES,status:i===0?'AVAILABLE':'NOT_CAPTURED_OR_CONDITIONAL',
        filled:i===0,source:i===0?{count:2,total:4}:null,
        consumers:i===0?'Recommendation; Risk':''
      }))}],
      ()=>[],()=>[],
      ()=>({version:3}),
      x=>Array.isArray(x)?x:x?[x]:[],
      x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
      ()=>null,
      ()=>[{key:'existing_tool_can_close',label:'¿Herramientas existentes?'}],
      [{key:'existing_tool_can_close'},{key:'process_design_first'}],
      {existing_tool_can_close:{title:'¿Las herramientas actuales pueden resolver el problema?'}},
      ()=>'<section>Datos del AS-IS confirmado</section>',
      ()=>''
  );
  const e={id:'TEST-ENG',confirmedAsIs:true};
  const empty=fn(e,null);
  assert.match(empty,/1\. Integridad de la captura/);
  assert.match(empty,/2\. Suficiencia para el análisis/);
  assert.match(empty,/3\. Preparación de los motores/);
  assert.match(empty,/No consta una evaluación vigente de las entradas del backend/);
  assert.match(empty,/Quedan 1 de 2 decisiones técnicas pendientes/);
  assert.match(empty,/Detalle de los 100 campos/);
  assert.match(empty,/2 de 4 registros con dato/,'partial coverage must remain visible');
  assert.match(empty,/1 campo parcial/,'group must show partial fields');
  assert.match(empty,/Sin dato; comprobar si aplica/,'non-required absent fields retain a neutral note');
  assert.doesNotMatch(empty,/Consumidores:|Recommendation; Risk/,'engine consumers are internal metadata');
  assert.doesNotMatch(empty,/Dato accesible en su propietario|Derivación disponible/,'present values have no redundant badges');
  assert.doesNotMatch(empty,/InputCoverageEngine/,'backend class name is not a consultant-facing label');
  assert.doesNotMatch(empty,/Todos los datos permiten recomendar una solución/);
  const blocked=fn(e,{input_coverage:{status:'BLOCKED',items:inputSource}});
  assert.match(blocked,/Entradas bloqueantes/);
  assert.match(blocked,/Entradas evaluadas: 4/);
  assert.match(blocked,/Cubiertas: 1/);
  assert.match(blocked,/Bloqueantes: 1/);
  assert.match(blocked,/Probabilidad|Pregunta 70/);
  assert.match(blocked,/No aplicables: 1/);
  assert.match(blocked,/Aplicabilidad incierta: 1/);
  assert.ok(blocked.indexOf('Integridad de la captura')<blocked.indexOf('Suficiencia para el análisis'));
  assert.ok(blocked.indexOf('Suficiencia para el análisis')<blocked.indexOf('Preparación de los motores'));
});
test('PG10 source audit counts only backend-aligned fields, not similar-looking UI aliases',()=>{
  assert.match(workbench,/DF056:'friction_type'/);
  assert.match(workbench,/DF061:'impact'/);
  assert.match(workbench,/DF072:'controls_present'/);
  assert.match(workbench,/fid==='DF061'&&present\(x\.severity\)/);
  assert.doesNotMatch(workbench,/DF084:'direct_loss_eur_annual'/);
  assert.doesNotMatch(workbench,/fid==='DF057'&&present\(x\.friction_type\)/);
});
// [AUNEA-UAT-PG10-COVERAGE-162] END

// [AUNEA-UAT-PG10-SOURCE-DATA-163] START — real values, evidence and snapshot insulation.
test('PG10 renders true registered values from sealed snapshot, not just field-presence markers',()=>{
  const extract=name=>{
    const from=workbench.indexOf('function '+name+'('),to=workbench.indexOf('\nfunction ',from+10);
    assert.ok(from>=0&&to>from,name+' must exist');
    return workbench.slice(from,to);
  };
  const fields=[
    {Field_ID:'DF021',Option_Set_ID:null},{Field_ID:'DF022',Option_Set_ID:'OS_PERIOD'},
    {Field_ID:'DF025',Option_Set_ID:null},{Field_ID:'DF026',Option_Set_ID:null},
    {Field_ID:'DF037',Option_Set_ID:null},{Field_ID:'DF056',Option_Set_ID:'OS_FRICTION_TYPE'},
    {Field_ID:'DF060',Option_Set_ID:null},{Field_ID:'DF070',Option_Set_ID:null},
    {Field_ID:'DF086',Option_Set_ID:'OS_FUTURE_OUTCOME'}
  ];
  const schema={fields};
  const snap={version:4,company:{name:'Empresa sellada'},processName:'Facturas selladas',
    answers:{DF021:120,DF022:'MONTH',DF025:{value:48,unit:'h'},DF026:{value:250,unit:'min'},DF086:['VISIBILITY']},
    processSteps:[{id:'P1',step_name:'Recibir',active_time:3,wait_time:0,rework_time:0},
      {id:'P2',step_name:'Registrar',active_time:10,wait_time:15,rework_time:5}],
    frictions:[{id:'F1',client_label:'Doble entrada',frequency:{mode:'percent',value:25}}],
    risks:[{id:'R1',description:'Error en datos',likelihood_1_5:2,impact_1_5:4}],
    economicInputs:[{driver_id:'ED14',role_or_resource:'ADMIN',value:120,unit:'h',period:'month',
      capacity_cost_rate_eur_hour:32,evidence_type:'EV04'}]
  };
  const source={answers:snap.answers,processSteps:snap.processSteps,frictions:snap.frictions,
    risks:snap.risks,economicInputs:snap.economicInputs};
  const translate=(set,value)=>({OS_PERIOD:{MONTH:'mes'},OS_FUTURE_OUTCOME:{VISIBILITY:'Visibilidad'},
    OS_EVIDENCE_TYPE:{EV04:'Hipótesis'}})[set]?.[value]||value;
  const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fn=new Function('schema','asisAnalysisSnapshot','asisAnalysisSource','esc','labelFrom','econDriverLabel',
    extract('asisReadableValue')+'\n'+extract('asisConfirmedDataHtml')+'\nreturn {asisReadableValue,asisConfirmedDataHtml};')
    (schema,()=>snap,()=>source,esc,translate,id=>id==='ED14'?'Coste de capacidad':id);
  const html=fn.asisConfirmedDataHtml({answers:{DF021:9999},company:{name:'Empresa CRM modificada'}});
  assert.match(html,/Empresa sellada/);
  assert.doesNotMatch(html,/Empresa CRM modificada|9\.999/);
  assert.match(html,/120 \/ mes/);
  assert.match(html,/250 min/);
  assert.match(html,/48 h/);
  assert.match(html,/Recibir/);
  assert.match(html,/trabajo 3 min/);
  assert.match(html,/espera 15 min/);
  assert.match(html,/Doble entrada/);
  assert.match(html,/Error en datos/);
  assert.match(html,/32 €/);
  assert.match(html,/Hipótesis/);
  assert.doesNotMatch(html,/ahorro demostrado 32/);
  const ownerFn=new Function('schema','asisReadableValue','econDriverLabel','effectiveValue',
    extract('asisFieldValueDisplay')+'\nreturn asisFieldValueDisplay;')(
      schema,fn.asisReadableValue,()=>'Coste de capacidad',()=>null);
  assert.equal(ownerFn({id:'DF037',source:{owner:'step',key:'active_time',rows:snap.processSteps}},
    source,snap),'Paso 1: 3 min | Paso 2: 10 min');
  assert.equal(ownerFn({id:'DF070',source:{owner:'risk',key:'likelihood_1_5',rows:snap.risks}},
    source,snap),'Riesgo 1: 2/5');
});
test('PG10 covers real values only through verified fields and escaped text',()=>{
  assert.match(workbench,/asisConfirmedDataHtml\(e\)\+ledger/);
  assert.match(workbench,/f\.filled\?asisFieldValueDisplay\(f,record,snap\)/);
  assert.match(workbench,/esc\(actual\)/);
  assert.match(workbench,/const snap=asisAnalysisSnapshot\(e\)/);
  assert.match(workbench,/No existe un snapshot confirmado/);
});
// [AUNEA-UAT-PG10-SOURCE-DATA-163] END

// [AUNEA-UAT-PG10-LEDGER-UX-164] START — all source data readable without a wall of values.
test('PG10 audit shows short values and hides long/repeated values in expandable row details',()=>{
  const start=workbench.indexOf('function asisCoverageHtml(');
  const end=workbench.indexOf('\nfunction ',start+10);
  assert.ok(start>=0&&end>start);
  const source=workbench.slice(start,end);
  const fields=[{Field_ID:'DF037',Pregunta_o_etiqueta_ES:'Tiempo activo típico'},
    {Field_ID:'DF011',Pregunta_o_etiqueta_ES:'Proceso'}];
  const rows=[{id:'DF037',label:'Tiempo activo típico',status:'AVAILABLE',filled:true,
    source:{count:3,total:3,owner:'step'},consumers:'Economic; Recommendation'},
    {id:'DF011',label:'Proceso',status:'AVAILABLE',filled:true,source:null,consumers:'Recommendation'}];
  const read=id=>id==='DF037'
    ?'Paso 1: 5 min | Paso 2: 18 min | Paso 3: <no fiable>':'Recepción y registro de facturas';
  const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const render=new Function('schema','asisAnalysisSource','asisFieldInventory','canonicalMissingRequired',
    'captureIntegrityIssues','asisAnalysisSnapshot','normalizeArray','esc','currentDiagnosticOutput',
    'unresolvedEngineGates','ENGINE_GATE_CONTRACT','ENGINE_GATE_GUIDE',
    'asisConfirmedDataHtml','asisFieldValueDisplay',
    source+'\nreturn asisCoverageHtml;')(
      {fields},e=>e,()=>[{stage:'S04',title:'Mapa AS-IS',items:rows,filled:2}],
      ()=>[],()=>[],()=>({version:4}),x=>Array.isArray(x)?x:x?[x]:[],esc,()=>null,
      ()=>[],[{key:'test'}],{},()=>'<section>Resumen confirmado</section>',
      f=>read(f.id));
  const html=render({id:'E',confirmedAsIs:true},null);
  assert.match(html,/<details class="asis-field-ledger">/);
  assert.match(html,/<details name="asis-coverage-field-groups">/,'group sections use exclusive accordion');
  assert.match(html,/<details class="asis-ledger-value"><summary>3 registros · Ver valores<\/summary>/);
  assert.match(html,/Paso 1: 5 min \| Paso 2: 18 min/);
  assert.match(html,/&lt;no fiable&gt;/);
  assert.doesNotMatch(html,/<no fiable>|Consumidores:|Economic; Recommendation/);
  assert.match(html,/class="asis-ledger-short-value">Recepción y registro de facturas/);
  assert.match(html,/Resumen confirmado/);
  assert.doesNotMatch(html,/class="asis-ledger-short-value">Paso 1/);
});
// [AUNEA-UAT-PG10-LEDGER-UX-164] END

// [AUNEA-UAT-PG10-ASIS-ECON-165] START — Baseline includes all four server-owned results.
test('PG10 AS-IS backend results present time, pains, economics and risks without solutions',()=>{
  const from=workbench.indexOf('function asisBaselineHtml(');
  const to=workbench.indexOf('\n// [AUNEA-FE-PG10-ASIS-ECON-165] END',from);
  assert.ok(from>=0&&to>from,'baseline body must exist');
  const source=workbench.slice(from,to);
  const output={status:'ANALYZED',process_time_projection:{annual_active_hours:15},
    pain_results:[{pain_id:'P01'}],economic_result:{status:'PARTIAL',current_tool_cost_eur_annual:960},
    risk_result:{status:'PARTIAL'},diagnostic_type:'ASIS_ONLY'};
  let rendered=[];
  const render=new Function('asisAnalysisResult','asisAnalysisSource','esc','asisCoverageHtml',
    'diagnosisProcessBaselineHtml','diagnosisFindingsHtml','diagnosisEconomicsHtml','diagnosisRisksHtml',
    source+'\nreturn asisBaselineHtml;')(
      ()=>output,()=>({processSteps:[]}),x=>String(x),
      ()=>{throw Error('coverage panel should not replace a valid analysis');},
      p=>{rendered.push('time');return 'TEMPORAL-'+p.annual_active_hours;},
      (record,p)=>{rendered.push('pain');return 'PAIN-'+p.length;},
      econ=>{rendered.push('economic');return 'ECON-'+econ.current_tool_cost_eur_annual;},
      risk=>{rendered.push('risk');return 'RISK-'+risk.status;});
  const html=render({id:'E'});
  assert.deepEqual(rendered,['time','pain','economic','risk']);
  for(const expected of ['Línea base temporal','Problemas y evidencias',
    'Impacto económico registrado','Riesgos y controles','TEMPORAL-15','PAIN-1',
    'ECON-960','RISK-PARTIAL','cobertura del análisis económico es parcial']){
    assert.ok(html.includes(expected),expected);
  }
  assert.doesNotMatch(html,/recommendation|optimal_scenario|quote|one_off_eur/);
  output.economic_result=null;
  assert.match(render({id:'E'}),/No se dispone de una cuantificación económica validada/);
  output.status='INPUT_GAPS';
  assert.match(render({id:'E'}),/Análisis parcial/);
});
test('PG10 AS-IS endpoint is solution-independent and exposes economics',()=>{
  assert.match(workbench,/\/v1\/diagnostic\/asis-analysis/);
  assert.match(workbench,/asisAnalysisKey\(e\)!==key/);
  assert.match(workbench,/diagnosisEconomicsHtml\(economic,record\)/);
  assert.doesNotMatch(workbench.slice(workbench.indexOf('function asisBaselineHtml(')),
    /data\.recommendation\./);
});
// [AUNEA-UAT-PG10-ASIS-ECON-165] END






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
