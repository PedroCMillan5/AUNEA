const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','domain','process.js'),'utf8');
test('DF048/052/053/054/055 use one review state and reversible lock',()=>{
  assert.match(source,/const uniformFields=\['DF048','DF052','DF053','DF054','DF055'\]/);
  assert.match(source,/const uniformLocked=uniform&&\(uniformConfirmed\|\|uniformNoReview\)/);
  assert.match(source,/uniformLocked\?'':uniformWarning/);
  assert.match(source,/data-pg05-unlock/);
  assert.match(source,/delete d\[fid\+'__finding_confirmation'\]/);
  assert.match(source,/delete d\[fid\+'__no_review_needed'\]/);
});
test('no-review and explicit confirmation have separate reversible paths',()=>{
  assert.match(source,/Sin información que validar/);
  assert.match(source,/No hay validación que hacer/);
  assert.match(source,/data-pg05-confirm-finding/);
  assert.match(source,/delete details\[fid\+'__no_review_needed'\]/);
});
test('map discrepancies distinguish omitted and additional selections',()=>{
  assert.match(source,/omittedMapValues/);
  assert.match(source,/extraReviewValues/);
  assert.match(source,/Advertencia:/);
  assert.match(source,/Nota:/);
});
