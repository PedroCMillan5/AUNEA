// [AUNEA-UAT-PG02-SCOPE-141] START — PG02 initial capture before map + owner provenance regression
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),page=fs.readFileSync(path.join(root,'pages/diagnostic-stages.js'),'utf8'),noreask=fs.readFileSync(path.join(root,'domain/no-reask.js'),'utf8');
function slice(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'required block exists: '+start);return s.slice(a,b)}
test('PG02 is not subordinated to future AS-IS map comparison, including when the UAT fixture preloads steps',()=>{
 assert.doesNotMatch(page,/function pg02BoundaryReviewHtml\(/,'no obsolete pre-map widget');
 assert.doesNotMatch(page,/pg02BoundaryReviewHtml\(e\)/,'the first four screens must not compare to future map state');
 assert.doesNotMatch(page,/data-pg02-boundary-review/,'no warning or pending-map summary in PG02');
 const stage= slice(page,'function stagePage(){','function processPrompt(e){');
 assert.doesNotMatch(stage,/Pendiente de revisar\/confirmar en el mapa AS-IS/);
 assert.match(stage,/stage\.Stage_ID==='S02'\?engagementBusinessAreaBlock\(e\)/,'the normal scope owner stays intact');
});
test('map-layer confirmation and PG09 retain downstream consistency checks',()=>{
 const life=fs.readFileSync(path.join(root,'domain/process-lifecycle.js'),'utf8');
 assert.match(life,/if\(key==='map'\)\{\s*const signals=processScopeReviewSignals\(e\)/);
 assert.match(life,/function preCloseConsistencyReview\(e,completion\)/);
 assert.match(life,/const scopeSignals=processScopeReviewSignals\(e\)/);
 assert.match(life,/const participantGap=processParticipantsScopeReview\(e\)/);
});
test('PG02 boundaries expose complete read-only preview without storing another answer',()=>{
 assert.match(noreask,/data-boundary-preview/);
 assert.match(noreask,/longBoundary/);
 assert.match(noreask,/String\(val\)/);
 assert.match(noreask,/<details class="boundary-full-preview"/);
 assert.doesNotMatch(slice(noreask,'const longBoundary=',"  const wide="),/setAnswer\(/);
});
test('PG02 business area uses the study owner saved state, not reused CRM provenance',()=>{
 const body=slice(page,'function engagementBusinessAreaBlock(e){','// ['+'AUNEA-FROZEN-STAGE-S02-001'+'] END');
 assert.match(body,/e\.businessAreaId\?fieldStatusIcon\('saved'\)/);
 assert.doesNotMatch(body,/fieldStatusIcon\('reused'/);
});
test('progress badge names requirements met, not stages explicitly reviewed by a person',()=>{
 assert.match(page,/Etapas con requisitos cumplidos/);
 assert.doesNotMatch(slice(page,'function captureProgressHtml(e,stage){','function refreshCaptureProgress(){'),/Etapas revisadas/);
});
// [AUNEA-UAT-PG02-SCOPE-141] END
