// [AUNEA-UAT-F4-CANDIDATE-EVIDENCE-115] START — shared evidence aggregation regression.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../domain/risk.js'),'utf8');
const start=source.indexOf('function mergeReviewCandidateEvidence(');
const end=source.indexOf('\n}\n',start);
if(start<0||end<start)throw Error('Missing shared candidate evidence owner');
const context={normalizeArray:v=>Array.isArray(v)?v:[]};
vm.createContext(context);
vm.runInContext(source.slice(start,end+2),context);

test('F4: friction and risk candidate evidence is deduplicated without losing provenance',()=>{
  const target={step_ids:[],review_questions:[],source_signals:[],_candidate_ids:[],rationale:'Original'};
  context.mergeReviewCandidateEvidence(target,{
    step_ids:['S1','S2'],review_questions:['¿Por qué?'],source_signals:['DF1'],candidate_id:'C1'
  });
  context.mergeReviewCandidateEvidence(target,{
    step_ids:['S2','S3'],review_questions:['¿Por qué?','¿Cuándo?'],source_signals:['DF1','DF2'],candidate_id:'C2'
  });
  assert.deepEqual(Array.from(target.step_ids),['S1','S2','S3']);
  assert.deepEqual(Array.from(target.review_questions),['¿Por qué?','¿Cuándo?']);
  assert.deepEqual(Array.from(target.source_signals),['DF1','DF2']);
  assert.deepEqual(Array.from(target._candidate_ids),['C1','C2']);
  assert.equal(target.rationale,'Original');
});

test('F4: candidate evidence merger does not determine review status or persist data',()=>{
  const target={step_ids:['S1'],review_questions:[],source_signals:[],_candidate_ids:[]};
  assert.equal(context.mergeReviewCandidateEvidence(target,{step_ids:['S1'],candidate_id:''}),target);
  assert.equal(Object.hasOwn(target,'_review_status'),false);
  assert.equal(target._candidate_ids.length,0);
});
// [AUNEA-UAT-F4-CANDIDATE-EVIDENCE-115] END
