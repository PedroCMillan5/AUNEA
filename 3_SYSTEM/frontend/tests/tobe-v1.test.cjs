const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');

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
  assert.match(src,/Define el estado de transformación de todos los pasos antes de enviar a revisión/);
  assert.match(fs.readFileSync(path.join(root,'domain/output-review.js'),'utf8'),/Listo para resultados/);
});

test('C04 PG12 is derived and refuses unsupported future metrics',()=>{
  assert.match(src,/function tobeComparisonPage/);
  assert.match(src,/\['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'\]/);
  assert.match(src,/No disponible con evidencia suficiente/);
  assert.match(src,/Capacidad liberada/);
  assert.match(src,/Ahorro de caja/);
});
