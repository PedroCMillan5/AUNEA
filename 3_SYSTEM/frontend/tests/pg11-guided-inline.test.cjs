// [AUNEA-UAT-PG11-GUIDED-267] START — guided inspector and IA inline suggestions.
// SOURCE: AUNEA System Simulator CANONICAL PG11; DEC-050/055/056.
// Synthetic fixtures only. No Ollama, network, real Engagement or AS-IS mutations.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
const slice=(a,b)=>{
 const i=src.indexOf(a),j=src.indexOf(b,i);
 if(i<0||j<i)throw Error('Required PG11 block missing: '+a);
 return src.slice(i,j+b.length);
};
const diffBlock=slice('// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] START',
 '// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] END');
const inlineBlock=slice('// [AUNEA-FE-PG11-FIELD-INLINE-263] START',
 '// [AUNEA-FE-PG11-FIELD-INLINE-263] END');
const navBlock=slice('// [AUNEA-FE-PG11-GUIDED-NAV-266] START',
 '// [AUNEA-FE-PG11-GUIDED-NAV-266] END');
function fixture(){
 let decision=null;
 const e={id:'CASE',tobeProposals:[]};
 const p={status:'DRAFT',items:[{id:'TOBE-P1',sourceStepId:'P1',
   transformation:'Se modifica',problemResolved:'Motivo manual',
   futureActor:'ADMIN',tool:'ERP',inputs:['PDF'],outputs:['PDF'],
   automationAi:'Trabajo manual',humanSupervision:'Revisión administrativa',
   controlsRisk:'Comprobación manual'}]};
 e.tobeProposals=[p];
 const proposal={items:[{source_step_id:'P1',source_refs:['P1','EV-F1'],
  transformation:'Se mantiene',problem_resolved:'Mejorar el registro',
  rationale:'Acción propuesta: implementar registro automático. Resultado esperado: trazabilidad. Justificación: fricción identificada.',
  future_actor:'Administración',tool:'ERP',inputs:'PDF',
  outputs:'Registro estructurado',automation_ai:'Generar registro automáticamente',
  human_supervision:'Revisar excepciones',controls_risk:'Control de duplicados',
  limitations:'Validar viabilidad técnica antes de ejecutar.'}],
  review:{review_mode:'RULES_ONLY',blocking_step_ids:['P1'],issues:[]}};
 const catalog={OS_ACTOR_ROLE:[{value:'ADMIN',label:'Administración'}],
  OS_TOOL_CATEGORY:[{value:'ERP',label:'ERP'}],
  OS_ARTIFACT_TYPE:[{value:'PDF',label:'PDF'},
   {value:'RECORD',label:'Registro estructurado'}]};
 const context={String,Array,Object,JSON,Set,Map,
  TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se elimina','Se automatiza',
   'Se asiste con IA','Requiere decisión humana','Se incorpora control'],
  tobeEditable:x=>x.status==='DRAFT',
  tobeHumanReviewRecord:()=>({decisions:decision?{P1:{status:decision,note:'Justificación de evaluación humana.'}}:{}}),
  internalAiSavedDraft:()=>proposal,
  internalAiPilotNarrative:value=>({reason:'Fricción identificada',action:'Implementar registro automático'}),
  fieldOptions:key=>catalog[key]||[],
  tobeArtifactValues:x=>({resolved:x,unknown:[]}),
  tobeArtifactDisplay:x=>Array.isArray(x)?x.join(' · '):String(x||''),
  labelFrom:(key,v)=>catalog[key]?.find(x=>x.value===v)?.label||'',
  internalAiReadableRefs:()=> 'Recepción de factura · Fricción identificada',
  latestTobe:()=>p,esc:x=>String(x),attr:x=>String(x)};
 vm.createContext(context);
 vm.runInContext(diffBlock+'\n'+inlineBlock,context);
 return {e,p,proposal,context,setDecision:v=>{decision=v}};
}
test('IA suggestions are visible before decision but cannot be applied',()=>{
 const f=fixture(),draft=f.context.tobeAiReviewDiff(f.e,f.p,'P1'),
  html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(draft.issue,/decisión/);
 assert.ok(draft.allFields.some(x=>x.key==='outputs'));
 assert.match(html,/IA propone:/);
 assert.match(html,/Registro estructurado/);
 assert.match(html,/Fuentes y condiciones del campo/);
 assert.match(html,/Fricción identificada/);
 assert.doesNotMatch(html,/data-tobe-ai-use-field/);
});
test('PG11 fields without an IA candidate never repeat a full evidence card',()=>{
 const f=fixture();f.proposal.items[0].controls_risk='';
 const empty=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'controlsRisk');
 assert.match(empty,/sin propuesta específica para este campo/);
 assert.doesNotMatch(empty,/<details/);
 const proposed=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(proposed,/Fuentes y condiciones del campo/);
 assert.match(proposed,/Referencias:/);
 assert.doesNotMatch(proposed,/Justificación global de la actividad|Intervención propuesta:/);
});
test('MODIFY authorizes only safe options, never contradictory transformation',()=>{
 const f=fixture();f.setDecision('MODIFY');
 const diff=f.context.tobeAiReviewDiff(f.e,f.p,'P1');
 assert.equal(diff.issue,'');
 assert.ok(!diff.fields.some(x=>x.key==='transformation'));
 assert.ok(diff.skipped.some(x=>x.key==='transformation'));
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.doesNotMatch(html,/data-tobe-ai-use-field="outputs"/);
 assert.match(src,/function tobeAiRowActions/);
 assert.match(src,/data-tobe-ai-use-field/);
 assert.match(src,/data-tobe-ai-action-source/);
 assert.doesNotMatch(html,/Condición de revisión:/);
 assert.match(src,/data-tobe-ai-edit-field/);
 const bad=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'transformation');
 assert.match(bad,/Revisión manual necesaria/);
 assert.match(bad,/La transformación IA contiene una contradicción/);
 assert.doesNotMatch(bad,/data-tobe-ai-use-field/);
});
test('discard keeps native field controls and never offers application',()=>{
 const f=fixture();f.setDecision('DISCARD');
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(html,/Recomendación descartada/);
 assert.doesNotMatch(html,/data-tobe-ai-use-field/);
 const existing='<div class="field"><label>Datos de salida</label><div id="original"></div></div>';
 const merged=f.context.tobeWithAiHint(f.e,f.p,f.p.items[0],'outputs',existing);
 assert.match(merged,/id="original"/);
 assert.equal((merged.match(/class="field"/g)||[]).length,1);
});
test('review navigation derives active step, neighbors and current UI-only mode',()=>{
 const steps=['P1','P2','P3','P4'].map(id=>({sourceStepId:id,sourceStepName:'Actividad '+id}));
 let index=0;
 const context={String,__auneaTobeMode:'guided',
  tobeAddedSteps:()=>[],tobeSelectedItem:()=>steps[index],
  tobeFlowItemId:x=>x.sourceStepId,tobeFlowItemName:x=>x.sourceStepName,
  esc:x=>String(x),attr:x=>String(x)};
 vm.createContext(context);vm.runInContext(navBlock,context);
 let html=context.tobeGuidedNavHtml({}, {items:steps});
 assert.match(html,/Actividad 1 de 4/);
 assert.match(html,/P2/);
 assert.doesNotMatch(html,/Actividad anterior/);
 index=2;context.__auneaTobeMode='map';
 vm.runInContext(navBlock,context);
 html=context.tobeGuidedNavHtml({}, {items:steps});
 assert.match(html,/Actividad 3 de 4/);
 assert.match(html,/P3/);
 assert.match(html,/aria-pressed="true">Mapa TO-BE/);
 assert.match(html,/data-tobe-select="P4"/);
});
test('PG11 uses one canonical form and two views on one versioned TO-BE',()=>{
 assert.match(src,/withAi\('outputs',tobeArtifactField/);
 assert.match(src,/withAi\('tool',tobeCatalogField/);
 assert.match(src,/withAi\('futureActor',tobeCatalogField/);
 assert.match(src,/withAi\('transformation',statusField\)/);
 assert.match(src,/function tobeGuidedNavHtml/);
 assert.match(src,/data-tobe-mode=".*__auneaTobeMode/);
 assert.match(src,/navigation.outerHTML=tobeGuidedNavHtml/);
 assert.match(src,/tobeApplyAiReviewedFields\(currentEng\(\),apply.dataset.tobeAiActionSource/);
 assert.doesNotMatch(src,/function tobeAiStepApplicability/);
});
test('guided footer delegates to original Save and Check rather than duplicating business handlers',()=>{
 assert.match(src,/data-tobe-guided-save="1"/);
 assert.match(src,/data-tobe-guided-check="1"/);
 assert.match(src,/document\.getElementById\(save\?'saveTobe':'checkTobeReadiness'\)/);
 const code=slice('// [AUNEA-FE-PG11-GUIDED-ACTIONS-264] START',
  '// [AUNEA-FE-PG11-GUIDED-ACTIONS-264] END');
 const listeners=[],called=[];
 const actions={saveTobe:{click:()=>called.push('save')},
  checkTobeReadiness:{click:()=>called.push('check')}};
 const sandbox={state:{activePage:'tobe'},
  document:{addEventListener:(name,fn)=>listeners.push({name,fn}),
   getElementById:id=>actions[id],querySelector:()=>null,querySelectorAll:()=>[]},
  toast:()=>{},__auneaTobeMode:'guided',drawProcessGraph:()=>{},
  requestAnimationFrame:()=>{}};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);
 const handler=listeners.find(x=>x.name==='click'&&
  x.fn.toString().includes('data-tobe-guided-save'))?.fn;
 assert.ok(handler,'Guided footer delegate not registered');
 const trigger=kind=>handler({target:{closest:selector=>
  selector==='[data-tobe-guided-'+kind+']'?{}:null},preventDefault:()=>{}});
 trigger('save');trigger('check');
 assert.deepEqual(called,['save','check']);
});

test('PG11 exposes source and individual IA before configuring the future step',()=>{
 const start=src.indexOf('function tobeInspectorHtml(e,p){');
 const end=src.indexOf('function createNextTobeVersion',start);
 assert.ok(start>=0&&end>start);
 const page=src.slice(start,end);
 assert.match(page,/03\.1 · Datos y hallazgos del AS-IS confirmado/);
 assert.match(page,/03\.2 · Analizar este paso y revisar la propuesta IA/);
 assert.match(page,/data-tobe-generate-selected/);
 assert.match(page,/tobeAiAdviceHtml\(e,item,false\)/);
 assert.match(page,/tobeHumanReviewHtml\(e,item,false\)/);
 assert.ok(page.indexOf("'</nav>'+supportingInformation+")<
   page.indexOf("'<section class=\"tobe-edit\" id=\"tobeStepDesign\""));
 assert.equal((page.match(/data-tobe-generate-selected/g)||[]).length,1);
 assert.doesNotMatch(page,/tobe-review-support/);
});
test('PG11 displays confirmed AS-IS values beside the sole editable TO-BE field',()=>{
 const f=fixture();
 f.context.tobeProposalSourceSteps=()=>[{id:'P1',actor:'ADMIN',tool:'ERP',inputs:['PDF'],outputs:['PDF']}];
 const html=f.context.tobeWithAiHint(f.e,f.p,f.p.items[0],'outputs',
   '<div class="field"><input data-tobe-field="outputs"></div>');
 assert.match(html,/Valor AS-IS confirmado:/);
 assert.match(html,/PDF/);
 assert.equal((html.match(/data-tobe-field="outputs"/g)||[]).length,1);
});
test('PG11 step evidence never presents superseded risks as current',()=>{
 const fn=src.match(/function tobeSnapshotIssueCards\(e,item\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(fn,'The current step evidence projection must exist');
 const snapshot={frictions:[
   {status:'SUPERSEDED',affected_steps:['P1'],client_label:'Fricción archivada'},
   {status:'ACTIVE',affected_steps:['P1'],client_label:'Fricción vigente'}],
   risks:[
     {status:'SUPERSEDED',step_ids:['P1'],description:'Riesgo descartado'},
     {status:'ACTIVE',step_ids:['P1'],description:'Riesgo vigente'}]};
 const sandbox={
   tobeProposalSnapshot:()=>snapshot,latestTobe:()=>({}),
   esc:String,labelFrom:()=>''};
 vm.createContext(sandbox);vm.runInContext(fn,sandbox);
 const html=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(html,/Fricción vigente/);
 assert.match(html,/Riesgo vigente/);
 assert.doesNotMatch(html,/Fricción archivada|Riesgo descartado/);
});
test('PG11 identifies individual coherence separately from section 02 global analysis',()=>{
 const pilot=fs.readFileSync(path.resolve(__dirname,'../domain/internal-ai-pilot.js'),'utf8');
 assert.match(pilot,/actividades analizadas por IA/);
 assert.match(pilot,/Propuestas IA verificadas y guardadas; no son decisiones del consultor/);
 assert.match(src,/Sólo consulta hasta completar las actividades y comprobar coherencia/);
 assert.match(src,/El análisis global de la sección 02 no sustituye esta comprobación/);
 assert.match(src,/data-tobe-ai-apply-unavailable/);
 assert.match(src,/data-tobe-ai-keep-field/);
 assert.match(src,/data-tobe-ai-edit-field/);
});
test('PG11 section 03 uses the shared semantic title hierarchy rather than an eyebrow as title',()=>{
 assert.ok(src.includes('<header class="tobe-review-section-head"><span class="tobe-eyebrow">03 · DISEÑO TO-BE</span>'));
 assert.ok(src.includes('<h2 class="aunea-ui-section-title">Revisión por actividad</h2>'));
 assert.match(src,/<p class="aunea-ui-section-caption">Revisa el origen/);
 assert.doesNotMatch(src,/tobe-eyebrow">03 · REVISIÓN POR ACTIVIDAD Y DISEÑO TO-BE/);
});
test('PG11 checkpoint points to missing activity without discarding validated source results',()=>{
 assert.match(src,/remainingStepIds=fromCheckpoint/);
 assert.match(src,/!pending\.items\.has\(String\(x\.sourceStepId\)\)/);
 assert.match(src,/data-tobe-generate-all-remaining>Analizar actividades pendientes/);
 assert.match(src,/Consolidación entre actividades pendiente/);
 assert.match(src,/\(canApply\?\s*action\('Aplicar IA'/);
 assert.match(src,/data-tobe-ai-keep-field/);
 assert.match(src,/data-tobe-ai-edit-field/);
});
test('PG11 pending-step button launches generation and reports progress immediately',async()=>{
 const block=slice('// [AUNEA-FE-PG11-REMAINING-CTA-295] START',
   '// [AUNEA-FE-PG11-REMAINING-CTA-295] END');
 let listener,launches=0,prevented=false,stopped=false;
 const progress={textContent:''};
 const button={disabled:false,textContent:'Analizar actividades pendientes',isConnected:true};
 const sandbox={
   document:{addEventListener:(name,fn,capture)=>{assert.equal(name,'click');assert.equal(capture,true);listener=fn;},
     getElementById:id=>id==='tobeStepAiProgress'?progress:null},
   state:{activePage:'tobe'},currentEng:()=>({id:'case'}),latestTobe:()=>({status:'DRAFT'}),
   tobeEditable:()=>true,toast:()=>{throw Error('Unexpected toast');},
   generateTobeAiPilot:async()=>{launches++;},console
 };
 vm.createContext(sandbox);vm.runInContext(block,sandbox);
 listener({target:{closest:selector=>selector==='[data-tobe-generate-all-remaining]'?button:null},
   preventDefault:()=>{prevented=true;},stopImmediatePropagation:()=>{stopped=true;}});
 assert.equal(launches,1);assert.equal(prevented,true);assert.equal(stopped,true);
 assert.match(progress.textContent,/Iniciando análisis de las actividades pendientes/);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(button.disabled,false);
 assert.equal(button.textContent,'Analizar actividades pendientes');
});
test('PG11 distinguishes completed step coverage from incomplete global source review',()=>{
 const fn=src.match(/function tobeGlobalLinkedStepHtml\\(e,p,item\\)\\{[\\s\\S]*?\\n\\}/)?.[0];
 assert.ok(fn,'global linked step function must exist');
 const result={complete:false,progress:{completed:2,total:5}};
 const context={tobeGlobalStored:()=>result,
   tobeGlobalLinksForStep:()=>[{index:1,recommendation:{
     objective:'Objetivo verificado',how:'Recomendación sin aplicar',
     source_refs:['F1'],review:{status:'CONDITIONED',reason:'Capacidad por verificar'}}}],
   esc:value=>String(value)};
 vm.createContext(context);vm.runInContext(fn,context);
 const partial=context.tobeGlobalLinkedStepHtml({}, {}, {sourceStepId:'P1'});
 assert.match(partial,/2 de 5 fuentes verificadas/);
 assert.match(partial,/cobertura de actividades analizadas por IA en la sección 03 es independiente/);
 assert.match(partial,/Recomendación sin aplicar/);
 result.complete=true;
 assert.doesNotMatch(context.tobeGlobalLinkedStepHtml({}, {}, {}),/está incompleto/);
});
// [AUNEA-UAT-PG11-GUIDED-267] END
