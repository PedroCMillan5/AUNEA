// Temporary source-compatibility oracle for source-based PG11 tests.
// Reassembles the pre-extraction order; runtime is never loaded through this helper.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const entries=[
  ['// __AUNEA_PG11_MODEL_MODULE__\n','domain/tobe-model.js'],
  ['// __AUNEA_PG11_TRANSACTIONS_MODULE__','domain/tobe-transactions.js'],
  ['// __AUNEA_PG11_PAGE_MODULE__\n','pages/tobe.js']
];
module.exports=function pg11LegacySourceOracle(){
  let text=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
  for(const [placeholder,file] of entries){
    if(text.split(placeholder).length!==2)throw Error('PG11 module boundary missing or duplicated: '+file);
    text=text.replace(placeholder,fs.readFileSync(path.join(root,file),'utf8'));
  }
  return text;
};
