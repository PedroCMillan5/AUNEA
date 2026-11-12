const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=require('./pg11-source.cjs')();
const comparison=fs.readFileSync(path.join(root,'pages/comparison.js'),'utf8');

test('C04 PG11 TO-BE is a versioned DRAFT based on the confirmed snapshot',()=>{
  assert.match(src,/tobeProposals/);
  assert.match(src,/sourceSnapshotVersion:snap\.version/);
  assert.match(src,/status:'DRAFT'/);
  assert.match(src,/confirmedSnapshot\(e\)/);
  assert.match(src,/TOBE_TRANSFORMATIONS/);
  assert.doesNotMatch(src,/transformation:'Se (mantiene|modifica|automatiza)'/,'instantiation must not auto-confirm a transformation');
});

test('C04 PG11 requires human review before client approval',()=>{
  assert.match(src,/\['DRAFT','REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'\]/);
  assert.match(src,/function tobeReviewReadiness/);
  assert.match(src,/Selecciona una transformación válida/);
  assert.match(src,/El TO-BE no corresponde al AS-IS confirmado vigente/);
  assert.match(fs.readFileSync(path.join(root,'domain/output-review.js'),'utf8'),/Listo para resultados/);
});

test('C04 PG12 is derived and refuses unsupported future metrics',()=>{
  assert.match(comparison,/function tobeComparisonPage/);
  assert.match(comparison,/\['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'\]/);
  assert.match(comparison,/No disponible con evidencia suficiente/);
  assert.match(comparison,/Capacidad liberada/);
  assert.match(comparison,/Ahorro de caja/);
});

test('PG11 common implementation questions reuse one pure projection',()=>{
  const vm=require('node:vm');
  const from=src.indexOf('function tobeGlobalImplementationQuestions(');
  const to=src.indexOf('function tobeGlobalGroupWarnings(',from);
  assert.ok(from>=0&&to>from,'PG11 question helpers must be present');
  const functions=vm.runInNewContext(
    src.slice(from,to)+';({group:tobeGlobalSharedQuestions,all:tobeGlobalUniversalQuestions,specific:tobeGlobalSpecificQuestions})'
  );
  const itemA={review:{verifications:[{question:'¿Responsable?'},{question:'¿Plazo?'}]}};
  const itemB={review:{operational_checks:[{question:'¿Plazo?'},{question:'¿Evidencia?'}]}};
  const entries=[{item:itemA},{item:itemB}],group={entries};
  const asArray=value=>Array.from(value);
  assert.deepEqual(asArray(functions.all([itemA,itemB])),['¿Plazo?']);
  assert.deepEqual(asArray(functions.group(group)),['¿Plazo?']);
  assert.deepEqual(asArray(functions.group(group,['¿Plazo?'])),[]);
  assert.deepEqual(asArray(functions.specific(group,itemA)),['¿Responsable?']);
  assert.deepEqual(asArray(functions.specific(group,itemB)),['¿Evidencia?']);
  assert.deepEqual(asArray(functions.all([itemA])),[],
    'A single proposal cannot contain a repeated question across opportunities');
});
