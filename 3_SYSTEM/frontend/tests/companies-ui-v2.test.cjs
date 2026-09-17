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

test('Empresas filter options are deduplicated by visible labels and archived is not duplicated in status filter',()=>{
  assert.match(page,/function uniqueVisibleOptions/);
  assert.match(page,/uniqueVisibleOptions\(present\(c=>c\.country\),countryLabel\)/);
  assert.match(page,/visibleKey\(countryLabel\(c\.country\)\)/);
  assert.match(page,/COMPANY_STATUS\.filter\(v=>v!=='Archivada'\)/);
});

test('Empresas uses product-owned rounded dropdowns for its filters',()=>{
  assert.match(page,/function companyFilterControl/);
  assert.match(page,/class=\\"aunea-select\\"/);
  assert.match(page,/data-company-filter-option/);
  assert.match(css,/\.aunea-select-menu\{/);
  assert.match(css,/border-radius:var\(--radius-md\)/);
});

test('Empresas exposes governed actions and relationship inspector tabs',()=>{
  assert.match(page,/data-archive-company/);
  assert.match(page,/data-company-notes-popup/);
  assert.match(page,/data-company-history-popup/);
  assert.match(page,/Oportunidades \(\$\{n\.opportunities\}\)/);
  assert.match(page,/Estudios \(\$\{n\.engagements\}\)/);
  assert.doesNotMatch(page,/`Notas`,\s*'Historial'/);
});

test('company table menu no longer loses its click to row selection',()=>{
  assert.match(page,/class=\\"company-row/);
  assert.match(page,/class=\\"kebab-btn/);
  assert.match(page,/if\(e\.target\.closest\('\.row-menu'\)\)e\.stopPropagation\(\)/);
  assert.match(css,/\.company-table \.company-row\{cursor:pointer\}/);
});

test('company inspector related records provide direct governed navigation',()=>{
  assert.match(page,/data-company-open-contact/);
  assert.match(page,/data-company-edit-opportunity/);
  assert.match(page,/data-company-study-opportunity/);
  assert.match(page,/data-company-open-study/);
  assert.match(page,/setPage\('contactos'\)/);
  assert.match(page,/editOpportunity\(action\.dataset\.companyEditOpportunity\)/);
  assert.match(page,/createStudyFromOpportunity\(action\.dataset\.companyStudyOpportunity\)/);
  assert.match(page,/state\.activePage='diagnostico'/);
});

test('company inspector header keeps actions inline while company name may wrap',()=>{
  assert.match(page,/company-ins-head/);
  assert.match(css,/\.company-ins-head h3\{[^}]*overflow-wrap:anywhere/);
  assert.match(css,/\.ins-head-actions\{[^}]*flex-wrap:nowrap/);
});
