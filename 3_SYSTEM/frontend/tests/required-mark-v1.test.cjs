// [AUNEA-UAT-REQUIRED-MARK-010] START — Obligatoriedad indicator regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const coreCode=fs.readFileSync(path.join(root,'core/state.js'),'utf8');

function makeCtx(){
  const domFields={};
  const ctx={
    console,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    document:{
      getElementById:(id)=>{if(!domFields[id])domFields[id]={innerHTML:''};return domFields[id]},
      querySelectorAll:()=>[],querySelector:()=>null
    },
    confirm:()=>true
  };
  vm.createContext(ctx);
  vm.runInContext(coreCode,ctx);
  vm.runInContext('globalThis.state=state;globalThis.schema=schema;globalThis.REQUIRED_LEGEND_HTML=REQUIRED_LEGEND_HTML;',ctx);
  ctx.__domFields=domFields;
  return ctx;
}

test('requiredMark() is a shaped, keyboard-focusable mark with a real tooltip — never a bare color-only dot',()=>{
  const ctx=makeCtx();
  const html=ctx.requiredMark();
  assert.match(html,/class="required-mark"/);
  assert.match(html,/title="Campo obligatorio"/,'must carry an explanatory tooltip, not rely on the shape/color alone');
  assert.match(html,/tabindex="0"/,'must be reachable by keyboard, not only by mouse hover');
  assert.match(html,/aria-label="Campo obligatorio"/);
  assert.doesNotMatch(html,/required-dot/,'the old bare color-only dot must be fully retired');
});

test('REQUIRED_LEGEND_HTML spells out what the mark means — the mark is never left unexplained on its own',()=>{
  const ctx=makeCtx();
  assert.match(ctx.REQUIRED_LEGEND_HTML,/son obligatorios/);
  assert.match(ctx.REQUIRED_LEGEND_HTML,/required-mark/);
});

test('openModal() injects the required-field legend once, only when the form body actually contains a required mark',()=>{
  const ctx=makeCtx();
  ctx.openModal('Con obligatorios',`<div class="field full"><label>Nombre ${ctx.requiredMark()}</label><input id="x"></div>`,()=>{});
  const htmlWith=ctx.__domFields.modalRoot.innerHTML;
  assert.match(htmlWith,/required-legend/);
  assert.equal((htmlWith.match(/required-legend/g)||[]).length,1,'the legend must appear exactly once, not once per field');

  ctx.openModal('Sin obligatorios','<div class="field full"><label>Notas</label><textarea id="y"></textarea></div>',()=>{});
  const htmlWithout=ctx.__domFields.modalRoot.innerHTML;
  assert.doesNotMatch(htmlWithout,/required-legend/,'a form with no required fields must not show an irrelevant legend');
});

test('no file in the runtime references the retired .required-dot class',()=>{
  const jsFiles=fs.readdirSync(root).filter(f=>f.endsWith('.js'));
  jsFiles.forEach(f=>{
    const src=fs.readFileSync(path.join(root,f),'utf8');
    assert.doesNotMatch(src,/required-dot/,`${f} still references the retired required-dot class`);
  });
  const cssSrc=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.doesNotMatch(cssSrc,/\.required-dot\{/);
  assert.match(cssSrc,/\.required-mark\{/);
});
// [AUNEA-UAT-REQUIRED-MARK-010] END
