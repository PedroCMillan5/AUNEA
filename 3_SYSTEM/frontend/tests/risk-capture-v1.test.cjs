// [AUNEA-UAT-RISK-CAPTURE-030] START — Risk capture regression
// Covers AUNEA-FE-RISK-CAPTURE-030 (domain/risk.js). Risk capture UI was deliberately separated from the
// engine adapter; these assertions target the module that owns the responsibility, not its former location.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'domain/risk.js'),'utf8');
const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('risk capture is wired into the runtime',()=>{
  assert.match(indexHtml,/<script src="domain\/risk\.js"/,'domain/risk.js must be loaded by index.html');
});

test('addRisk and riskBuilder are defined in the risk module',()=>{
  assert.match(code,/function addRisk\(/);
  assert.match(code,/function riskBuilder\(/);
});

test('addRisk keeps every saved RiskInput field visibly present; both groups open and the required fields explicit',()=>{
  const groups=[...code.matchAll(/<details class="step-group"( open)?><summary>([^<]+)<\/summary>/g)];
  assert.equal(groups.length,2);
  assert.equal(groups[0][1],' open','layer 1 (Riesgo) must be open by default');
  assert.equal(groups[0][2],'Riesgo');
  assert.equal(groups[1][1],' open','controls and conditions remain visible while completing the popup');
  assert.equal(groups[1][2],'Controles y condiciones');
  ['riskCat','riskLike','riskImpact','riskRev','riskControls','riskSensitive','riskMat','riskCritical'].forEach(fid=>{
    assert.match(code,new RegExp(`riskDropdown\\('${fid}'`),`${fid} must still be rendered through the shared dropdown helper`);
  });
  assert.match(code,/id="riskDesc"/,'riskDesc remains a direct text input');
  assert.match(code,/Categoría \$\{requiredMark\(\)\}/);
  assert.match(code,/Descripción concreta \$\{requiredMark\(\)\}/);
  assert.match(code,/process-modal-form risk-modal-form/);
});

test('the risk level stays backend-owned: the module never derives R0-R3 locally',()=>{
  assert.doesNotMatch(code,/residual_level\s*=/,'residual risk level is decided by RiskEngine, never in the browser');
  assert.match(code,/El nivel R0–R3 lo decide el backend/);
});
// [AUNEA-UAT-RISK-CAPTURE-030] END
