const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const page=fs.readFileSync(path.join(root,'pages/crm-companies.js'),'utf8');
const domain=fs.readFileSync(path.join(root,'domain/company.js'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');

test('Empresas uses the CNAE-2025 business-sector catalogue and never treats REF_DOMAIN as sector',()=>{
  assert.match(domain,/labelFrom\('REF_INDUSTRY_CNAE25',value\)/);
  assert.match(domain,/fieldOptions\('REF_INDUSTRY_CNAE25'\)/);
  assert.doesNotMatch(domain,/COMPANY_SECTOR_LABEL_ES/);
  assert.match(domain,/legacyBusinessDomainId/);
  assert.match(page,/companySectorLabel\(c\.sector\)/);
});

test('Empresas omits country and keeps Archivada outside the status dropdown behind an explicit checkbox',()=>{
  assert.match(page,/COMPANY_STATUS\.filter\(v=>v!=='Archivada'\)/);
  assert.match(page,/id="includeArchivedCompanies"/);
  assert.match(page,/Incluir archivadas/);
  assert.match(page,/c\.status==='Archivada'&&!f\.includeArchived/);
  assert.doesNotMatch(page,/companyFilterControl\('country'/);
  assert.doesNotMatch(page,/<th>País<\/th>/);
  assert.doesNotMatch(page,/countryLabel\(c\.country\)/);
  assert.match(page,/placeholder="Buscar empresa o sector\.\.\."/);
});

test('Empresas uses product-owned rounded dropdowns for its filters',()=>{
  assert.match(page,/function companyFilterControl/);
  assert.match(page,/class="aunea-select"/);
  assert.match(page,/data-company-filter-option/);
  assert.match(css,/\.aunea-select-menu\{/);
  assert.match(css,/border-radius:var\(--radius-md\)/);
});

test('Empresas paginates the filtered company list at 10 rows and exposes numbered navigation',()=>{
  assert.match(page,/const COMPANY_PAGE_SIZE=5/);
  assert.match(page,/Math\.ceil\(rows\.length\/COMPANY_PAGE_SIZE\)/);
  assert.match(page,/data-company-page/);
  assert.match(page,/company-pagination/);
});

test('Empresas prevents status badges from wrapping and gives the right inspector tabs breathing room',()=>{
  assert.match(css,/\.company-table td:nth-child\(4\) \.badge\{[^}]*white-space:nowrap/);
  assert.match(css,/\.company-ins-tabs\{[^}]*padding-right:14px/);
});

test('Empresas sector filter stays compact and truncates long open options with ellipsis',()=>{
  assert.match(css,/\.company-filter-row \.filter-group:first-child\{[^}]*min-width:190px[^}]*max-width:220px/);
  assert.match(css,/\.company-filter-row \.filter-group:first-child \.aunea-select-menu button\{[^}]*white-space:nowrap[^}]*overflow:hidden[^}]*text-overflow:ellipsis/);
});

test('project-linked opportunities are represented through their linked study and show project state',()=>{
  assert.match(page,/hasProject=linkedStudies\.some\(e=>state\.projects\.some\(p=>p\.engagementId===e\.id\)\)/);
  assert.match(page,/hasProject\?' · Proyecto creado':hasStudy\?' · Estudio creado'/);
});

test('Empresas table never creates horizontal scroll',()=>{
  assert.match(css,/\.content:has\(\.companies-screen-marker\) \.table-wrap\{overflow:hidden\}/);
  assert.match(css,/\.content:has\(\.companies-screen-marker\) \.company-table\{[^}]*min-width:0[^}]*table-layout:fixed/);
  assert.match(css,/\.company-table th:nth-child\(7\)\{width:8%\}/);
});

test('Empresas page is viewport-locked with no vertical document scroll',()=>{
  assert.match(page,/companies-screen-marker/);
  assert.match(css,/\.content:has\(\.companies-screen-marker\)\{[^}]*height:calc\(100vh - 70px\)[^}]*overflow:hidden/);
  assert.match(css,/\.content:has\(\.companies-screen-marker\) \.table-wrap\{overflow:hidden\}/);
});

test('Sector keeps ellipsis but exposes the full label on hover',()=>{
  assert.match(page,/data-full-label/);
  assert.match(css,/button\[data-full-label\]:hover::before/);
  assert.match(css,/content:attr\(data-full-label\)/);
});

test('an opportunity with an existing linked study never offers Crear estudio again',()=>{
  assert.match(page,/const linkedStudies=state\.engagements\.filter\(e=>e\.opportunityId===o\.id\)/);
  assert.match(page,/hasStudy=linkedStudies\.length>0/);
  assert.match(page,/\$\{hasStudy\?'':inspectorAction\('Crear estudio'/);
  assert.match(page,/Proyecto creado/);
  assert.match(page,/Estudio creado/);
});

test('Empresas exposes governed actions and relationship inspector tabs',()=>{
  assert.match(page,/data-archive-company/);
  assert.match(page,/data-company-notes-popup/);
  assert.match(page,/data-company-history-popup/);
  assert.match(page,/Oportunidades \(\$\{n\.opportunities\}\)/);
  assert.match(page,/Estudios \(\$\{n\.engagements\}\)/);
  assert.doesNotMatch(page,/`Notas`,\s*'Historial'/);
});

test('company table actions open in a floating layer above the table',()=>{
  assert.match(page,/class="company-row/);
  assert.match(page,/data-company-actions/);
  assert.match(page,/function openCompanyActionMenu/);
  assert.match(page,/document\.body\.appendChild\(menu\)/);
  assert.match(css,/\.company-floating-menu\{position:fixed;z-index:5000/);
  assert.match(css,/\.company-table \.company-row\{cursor:pointer\}/);
});

test('company floating-menu Edit is handled by the delegated listener created after render',()=>{
  assert.match(page,/closest\('\[data-edit-company\],\[data-archive-company\]/);
  assert.match(page,/action\.dataset\.editCompany!==undefined/);
  assert.match(page,/editCompany\(action\.dataset\.editCompany\)/);
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


test('company modal uses one commercial name, Spanish sectors, range dropdowns and current AUNEA owner',()=>{
  assert.match(domain,/<label>Nombre comercial<\/label><input id="cCoName"/);
  assert.doesNotMatch(domain,/<label>Nombre legal<\/label>/);
  assert.match(domain,/companySectorOptions\(\)/);
  assert.match(domain,/fieldOptions\('REF_INDUSTRY_CNAE25'\)/);
  assert.match(domain,/COMPANY_EMPLOYEE_RANGE_OPTIONS/);
  assert.match(domain,/label:'1–10'/);
  assert.match(domain,/label:'Más de 1\.000'/);
  assert.match(domain,/companySelectControl\('cCoEmployees'/);
  assert.match(domain,/currentAuneaOwnerName\(\)/);
  assert.match(domain,/document\.querySelector\('\.user-chip b'\)/);
  assert.match(domain,/id="cCoOwner"[^>]*readonly/);
  assert.doesNotMatch(domain,/<label>País<\/label>/);
  assert.match(domain,/id="cCoCountry" value="\$\{attr\(co\.country \|\| 'ES'\)\}"/);
  assert.match(css,/\.company-form-select,\.contact-form-select\{position:relative;width:100%\}/);
});

test('Prospecto remains the internal status but is explained as Potencial cliente in the UI',()=>{
  assert.match(domain,/status === 'Prospecto' \? 'Potencial cliente'/);
  assert.doesNotMatch(page,/COMPANY_TABS|data-company-tab/);
  assert.match(page,/label:companyStatusLabel\(v\)/);
});
