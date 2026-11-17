// [AUNEA-UAT-COLOR-CONTRAST-473] START — WCAG role-pair guard for official AUNEA tokens.
// PURPOSE: Detect silent token/contrast regressions; report restricted pairings without
//          modifying styles, visual references, business rules or FROZEN pages.
// SOURCE: TOKENS_AUNEA v1.0; DESIGN_SYSTEM_AUNEA v1.0; WCAG 2.2 SC 1.4.3/1.4.11;
//         AUNEA Internal color audit REVIEW dated 2026-11-17.
// INPUTS: Current styles.css :root color tokens and official brand values.
// OUTPUTS: node:test PASS/FAIL with measured contrast ratios.
// SIDE_EFFECTS: none. CHANGE_RISK: LOW.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const root=css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
assert.ok(root,'Missing shared :root tokens in styles.css');
const tokens=new Map([...root.matchAll(/--([a-z][a-z0-9-]*)\s*:\s*(#[0-9A-Fa-f]{6})(?:\s*[;,])/g)]
  .map(([,name,hex])=>[name,hex.toUpperCase()]));
const value=ref=>{
  if(ref.startsWith('#'))return ref.toUpperCase();
  assert.ok(tokens.has(ref),'Missing official token --'+ref);
  return tokens.get(ref);
};
const luminance=hex=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const c=rgb.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
};
const contrast=(fg,bg)=>{
  const hi=Math.max(luminance(value(fg)),luminance(value(bg)));
  const lo=Math.min(luminance(value(fg)),luminance(value(bg)));
  return (hi+0.05)/(lo+0.05);
};
const ratio=n=>n.toFixed(2)+':1';

test('relative-luminance implementation matches standard reference ratios',()=>{
  assert.ok(Math.abs(contrast('#000000','#FFFFFF')-21)<1e-8);
  assert.ok(Math.abs(contrast('#0F3B2E','#FFFFFF')-12.46)<0.02);
  assert.ok(Math.abs(contrast('#D4AF37','#FAFAF8')-2.01)<0.02);
});

test('official System and core design token values are not silently replaced',()=>{
  const official={
    ink:'#1E1E1E',bg:'#FAFAF8',line:'#E6E6E6',gold:'#D4AF37',
    system:'#0F3B2E',sage:'#6FA885','system-soft':'#EAF2ED',
    green:'#2E7D32',amber:'#A66300',blue:'#2F5DA8',red:'#B42318'
  };
  for(const [name,expected] of Object.entries(official))
    assert.equal(value(name),expected,'Unexpected color token --'+name);
});

const safeRolePairs=[
  ['Texto principal sobre blanco','ink','#FFFFFF',4.5],
  ['Texto principal sobre cálido','ink','bg',4.5],
  ['Texto secundario sobre cálido','muted','bg',4.5],
  ['Texto en acción System','#FFFFFF','system',4.5],
  ['Texto System sobre superficie contextual','system','system-soft',4.5],
  ['Texto principal en superficie contextual','ink','system-soft',4.5],
  ['Éxito sobre blanco','green','#FFFFFF',4.5],
  ['Aviso sobre cálido','amber','bg',4.5],
  ['Información sobre blanco','blue','#FFFFFF',4.5],
  ['Error sobre blanco','red','#FFFFFF',4.5],
  ['Dorado sobre verde System: legibilidad técnica','gold','system',4.5]
];
for(const [label,fg,bg,min] of safeRolePairs){
  test('WCAG role contrast: '+label,()=>{
    const actual=contrast(fg,bg);
    assert.ok(actual>=min,label+' = '+ratio(actual)+'; minimum '+min+':1');
  });
}

const restrictedExamples=[
  ['Dorado sobre blanco cálido','gold','bg',4.5],
  ['Blanco sobre dorado','#FFFFFF','gold',4.5],
  ['Salvia sobre blanco','sage','#FFFFFF',4.5],
  ['Perla como único límite funcional sobre blanco','line','#FFFFFF',3]
];
test('known nonconforming pairings stay explicitly documented (not used as allowed roles)',()=>{
  for(const [label,fg,bg,min] of restrictedExamples){
    const actual=contrast(fg,bg);
    assert.ok(actual<min,label+' currently '+ratio(actual)+'; review the restricted use');
  }
});

test('official brand primaries have their documented white-text contrast',()=>{
  const brand=[
    ['Solutions','#1E1E1E',4.5,true],
    ['System','#0F3B2E',4.5,true],
    ['Studio','#381C6F',4.5,true],
    ['Slides','#1D3B70',4.5,true],
    ['Advisory main','#B87333',4.5,false],
    ['Advisory deep','#8C5322',4.5,true]
  ];
  for(const [name,bg,min,shouldPass] of brand){
    assert.equal(contrast('#FFFFFF',bg)>=min,shouldPass,name);
  }
});
// This is a token-pair QA gate, NOT a claim of browser-computed-style,
 // color-blindness or actual user acceptance testing.
// [AUNEA-UAT-COLOR-CONTRAST-473] END
