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
  let source=read('pages/results.js');
  for(const [token,body] of [
    ['// __AUNEA_PG11_MODEL_MODULE__\n',read('domain/tobe-model.js')],
    ['// __AUNEA_PG11_WORKSPACE_MODULE__',workspace]
  ]){
    if(source.split(token).length!==2)throw Error('PG11 source boundary is missing or duplicated: '+token);
    source=source.replace(token,body);
  }
  return source;
};
