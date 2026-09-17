const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const page=fs.readFileSync(path.join(root,'pages/crm-companies.js'),'utf8');
const domain=fs.readFileSync(path.join(root,'domain/company.js'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');

test('Empresas projects sector labels to Spanish without rewriting canonical values',()=>{
  assert.match(domain,/COMPANY_SECTOR_LABEL_ES/);
  assert.match(domain,/professional services':'Servicios profesionales/);
  assert.match(domain,/function companySectorLabel/);
  assert.match(page,/companySectorLabel\(c\.sector\)/);
});

test('Empresas filter options are deduplicated by visible labels',()=>{
  assert.match(page,/function uniqueVisibleOptions/);
  assert.match(page,/uniqueVisibleOptions\(present\(c=>c\.country\),countryLabel\)/);
  assert.match(page,/visibleKey\(countryLabel\(c\.country\)\)/);
});

test('Empresas exposes governed actions and relationship inspector tabs',()=>{
  assert.match(page,/data-archive-company/);
  assert.match(page,/data-company-notes-popup/);
  assert.match(page,/data-company-history-popup/);
  assert.match(page,/Editar/);
  assert.match(page,/Notas/);
  assert.match(page,/Historial/);
  assert.match(page,/Oportunidades \(\$\{n\.opportunities\}\)/);
  assert.match(page,/Estudios \(\$\{n\.engagements\}\)/);
  assert.doesNotMatch(page,/`Notas`,\s*'Historial'/);
});

test('company table rows communicate clickability and use a three-dot action menu',()=>{
  assert.match(page,/class=\\"company-row/);
  assert.match(page,/class=\\"kebab-btn/);
  assert.match(css,/\.company-table \.company-row\{cursor:pointer\}/);
  assert.match(css,/\.row-menu-popover/);
});
