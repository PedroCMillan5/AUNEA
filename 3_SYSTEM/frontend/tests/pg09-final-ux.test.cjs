// [AUNEA-UAT-PG09-FINAL-UX-140] START — Final closure surface regression.
// SOURCE: PG09 DF093–DF100 and existing AS-IS closure contracts.
// No browser/session side effects; synthetic Levante-shaped inputs only.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const stages=fs.readFileSync(path.join(root,'pages/diagnostic-stages.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'ui/renderer.js'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');

function excerpt(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Missing governed code boundary: '+start);
  return src.slice(a,b);
}

test('PG09 source compiles and uses the full-width final layout',()=>{
  assert.doesNotThrow(()=>new vm.Script(stages));
  assert.doesNotThrow(()=>new vm.Script(renderer));
  assert.match(stages,/stage\.Stage_ID==='S09'\?pg09CaptureContent/);
  assert.match(stages,/pg09-final-page/);
  assert.match(css,/pg09-pending-grid/);
  assert.match(css,/pg09-review-row/);
});

test('Dates display in Spanish and save as ISO, rejecting impossible dates',()=>{
  const src=excerpt(renderer,'function parseSpanishDate(', '// [AUNEA-FE-PG09-SPANISH-DATE-139] END');
  const parse=vm.runInNewContext(src+'\nparseSpanishDate',{Date});
  assert.equal(parse('11/06/2026'),'2026-06-11');
  assert.equal(parse('29/02/2028'),'2028-02-29');
  assert.equal(parse('31/02/2026'),null);
  assert.equal(parse('06/11/26'),null);
  assert.equal(parse(''),'');
  assert.match(renderer,/data-date-es-target/);
  assert.match(renderer,/data-nextstep-date/); // Historical binder remains backward compatible.
});

function demo(){
  const schema={fields:['DF093','DF094','DF095','DF096','DF097','DF098','DF099','DF100'].map(Field_ID=>({Field_ID}))};
  const ctx={
    activeSteps:e=>e.processSteps||[],
    activeFrictions:e=>e.frictions||[],
    evidenceTypeBackend:v=>v||'HYPOTHESIS',engineLabel:(_k,v)=>v,
    confirmedSnapshot:e=>e.confirmedSnapshot||null,
    processLayerConfirmations:e=>e.layerConfirmations||{},
    preCloseConsistencyReview:e=>e.consistency,
    schema,effectiveValue:(f,e)=>e.answers?.[f.Field_ID],
    normalizeArray:x=>Array.isArray(x)?x:x==null?[]:[x],
    esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
    attr:x=>String(x??'').replaceAll('"','&quot;'),
    formatDateEs:x=>String(x).slice(0,10).split('-').reverse().join('/'),
    df017FinalReviewPanel:()=>'<div>Validación de participantes</div>',
    section:(title,summary,body)=>'<section><h2>'+title+'</h2><p>'+summary+'</p>'+body+'</section>',
    renderStageFields:fields=>fields.map(f=>'<div data-field="'+f.Field_ID+'"></div>').join('')
  };
  const src=excerpt(stages,'function pg09EvidenceItems(', '\nconst __auneaDiagFieldsBindForms');
  const fns=vm.runInNewContext(src+'\n({pg09CaptureContent,validationSummary})',ctx);
  const e={
    processSteps:[{},{},{},{}],
    frictions:[{evidence_type:'HYPOTHESIS'},{evidence_type:'HYPOTHESIS'},{evidence_type:'HYPOTHESIS'}],
    risks:[{},{}],economicInputs:[{evidence_type:'HYPOTHESIS'},{evidence_type:'HYPOTHESIS'},{evidence_type:'HYPOTHESIS'}],
    layerConfirmations:{map:true,frictions:true,risks:true,impact:true},
    answers:{DF094:['No hay información crítica pendiente'],DF095:['Evidencia de reintroducción manual de datos','Evidencia de falta de visibilidad','Evidencia de cuello de botella']},
    consistency:{items:['reintroducción manual de datos','falta de visibilidad','cuello de botella'].map((label,i)=>({code:'EVIDENCE_'+i,severity:'REVIEW',message:'Evidencia pendiente: Evidencia de '+label+'. Solicita el soporte y vincúlalo al registro correspondiente.',stage:'S09'})),blockers:[],reviews:[{},{},{}]}
  };
  return {fns,e,schema};
}

test('Complete UAT renders each evidence only once, without bullets or revalidation',()=>{
  const {fns,e,schema}=demo();
  const html=fns.pg09CaptureContent(e,schema.fields,{missing:[]});
  assert.match(html,/id="confirmClosingAsIs"/);
  assert.match(html,/Las cuatro capas están confirmadas/);
  assert.match(html,/dd\/mm\/aaaa|data-field="DF097"/);
  assert.match(html,/Evidencia de reintroducción manual de datos/);
  assert.equal((html.match(/Evidencia de reintroducción manual de datos/g)||[]).length,1);
  assert.doesNotMatch(html,/<ul|<li|REQUEST_EVIDENCE/);
});

test('Incomplete layer or required data blocks closure action',()=>{
  const {fns,e,schema}=demo();
  e.layerConfirmations.impact=false;
  e.consistency={items:[{severity:'BLOCKER',code:'LAYER_IMPACT',stage:'S07',message:'Falta confirmar Impacto'}],blockers:[{}],reviews:[]};
  let html=fns.pg09CaptureContent(e,schema.fields,{missing:[]});
  assert.doesNotMatch(html,/id="confirmClosingAsIs"/);
  assert.match(html,/Falta confirmar Impacto/);
  e.layerConfirmations.impact=true;
  e.consistency={items:[],blockers:[],reviews:[]};
  html=fns.pg09CaptureContent(e,schema.fields,{missing:[{id:'DF098',label:'Siguiente paso acordado'}]});
  assert.doesNotMatch(html,/id="confirmClosingAsIs"/);
});
// [AUNEA-UAT-PG09-FINAL-UX-140] END
