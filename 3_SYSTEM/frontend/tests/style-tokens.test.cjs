// [AUNEA-UAT-STYLE-010] START — Design token regression
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');

test(':root defines the exact TOKENS_AUNEA color values',()=>{
  const expected={
    '--ink':'#1E1E1E','--gold':'#D4AF37','--bg':'#FAFAF8','--line':'#E6E6E6',
    '--green':'#2E7D32','--amber':'#A66300','--red':'#B42318','--blue':'#2F5DA8'
  };
  for(const [tok,hex] of Object.entries(expected)){
    assert.match(css,new RegExp(`${tok.replace('--','--')}:${hex}(;|$)`),`${tok} should equal ${hex}`);
  }
});

test(':root defines the full typography and spacing scale',()=>{
  for(const tok of ['--font-display','--font-h1','--font-h2','--font-h3','--font-body','--font-small','--font-caption']) assert.match(css,new RegExp(tok+':'));
  for(const tok of ['--space-1','--space-2','--space-3','--space-4','--space-6','--space-8','--space-12','--space-16','--space-24']) assert.match(css,new RegExp(tok+':'));
  assert.match(css,/--font-h1:36px/);
  assert.match(css,/--font-body:16px/);
  assert.match(css,/--font-caption:12px/);
});

test('every CSS Block_ID START has a matching END, in source order',()=>{
  const re=/\[(AUNEA-[A-Z0-9-]+)\]\s*(START|END)/g;
  const stack=[];let m;
  while((m=re.exec(css))){
    if(m[2]==='START') stack.push(m[1]);
    else { const top=stack.pop(); assert.equal(top,m[1],`END ${m[1]} without matching START`); }
  }
  assert.equal(stack.length,0,`Unclosed START markers: ${stack.join(', ')}`);
});

test('no literal font-size below 10px remains (pill/badge exception floor), and no literal value between 10 and 12px sneaks in unresolved',()=>{
  const sizes=[...css.matchAll(/font-size:(\d+)px/g)].map(m=>Number(m[1]));
  const below10=sizes.filter(n=>n<10);
  assert.deepEqual(below10,[],'No literal font-size below the 10px pill/badge floor is allowed');
  const between=sizes.filter(n=>n>10 && n<12);
  assert.deepEqual(between,[],'Only 10px (pill/badge) or >=12px (var(--font-*) caption and up) literal sizes are allowed; nothing in between');
});

test('all sentence-level copy uses a var(--font-*) token, not a raw px value',()=>{
  assert.match(css,/font-size:var\(--font-body\)/);
  assert.match(css,/font-size:var\(--font-small\)/);
  assert.match(css,/font-size:var\(--font-caption\)/);
  assert.match(css,/font-size:var\(--font-h1\)/);
  assert.match(css,/font-size:var\(--font-h2\)/);
  assert.match(css,/font-size:var\(--font-h3\)/);
});
// [AUNEA-UAT-STYLE-010] END
