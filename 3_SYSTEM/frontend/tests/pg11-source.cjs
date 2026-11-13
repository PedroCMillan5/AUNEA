// Test-only compatibility reader: legacy source-oracles retain pre-extraction ordering.
// Not loaded in the application. A future test migration may remove this shim.
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const read=pathName=>fs.readFileSync(path.join(root,pathName),'utf8');
module.exports=function pg11LegacySourceOracle(){
  let workspace=read('pages/tobe.js');
  const transaction='// __AUNEA_PG11_TRANSACTIONS_MODULE__';
  if(workspace.split(transaction).length!==2)throw Error('PG11 transaction boundary is missing or duplicated');
  workspace=workspace.replace(transaction,read('domain/tobe-transactions.js'));
  const futureFlow='// __AUNEA_PG11_FUTURE_FLOW_MODULE__';
  if(workspace.split(futureFlow).length!==2)throw Error('PG11 future flow boundary is missing or duplicated');
  workspace=workspace.replace(futureFlow,read('pages/tobe-flow.js').trimEnd());
  const globalView='// __AUNEA_PG11_GLOBAL_VIEW_MODULE__';
  if(workspace.split(globalView).length!==2)throw Error('PG11 global view boundary is missing or duplicated');
  workspace=workspace.replace(globalView,read('pages/tobe-global.js').trimEnd());
  let source=read('pages/results.js');
  for(const [token,body] of [
    ['// __AUNEA_PG11_MODEL_MODULE__\n',read('domain/tobe-model.js')],
    ['// __AUNEA_PG11_WORKSPACE_MODULE__',workspace],
    ['// __AUNEA_INTERNAL_WORK_EVENTS_MODULE__',read('pages/internal-work-events.js')]
  ]){
    if(source.split(token).length!==2)throw Error('PG11 source boundary is missing or duplicated: '+token);
    source=source.replace(token,body);
  }
  // Legacy VM tests load the assembled PG11 source without loading the full UI
  // renderer. Include the production shared disclosure helper, not a test stub.
  const renderer=read('ui/renderer.js');
  for(const [name,pattern] of [
    ['auneaWorkDisclosure',/function auneaWorkDisclosure\(kind,title,body\)\{[\s\S]*?\n\}/],
    ['auneaEmptyMessage',/function auneaEmptyMessage\(message\)\{[\s\S]*?\n\}/],
    ['auneaNoticeMessage',/function auneaNoticeMessage\(tone,message\)\{[\s\S]*?\n\}/]
  ]){
    const helper=renderer.match(pattern)?.[0];
    if(!helper)throw Error('Shared renderer helper missing: '+name);
    source+='\n'+helper+'\n';
  }
  return source;
};
