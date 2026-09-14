const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app-backend-discovery-v1.js'), 'utf8');

function makeContext(fetchImpl, initialUrl='http://localhost:8000') {
  const writes = [];
  const context = {
    state: {backendUrl: initialUrl, backendOnline: false, backendVersion: null},
    STORAGE_KEY: 'aunea_internal_v1',
    localStorage: {setItem:(k,v)=>writes.push([k,v])},
    fetch: fetchImpl,
    AbortController,
    setTimeout,
    clearTimeout,
    updateHeader(){},
    audit(){},
    checkBackend: async()=>false,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {context, writes};
}

test('descubre AUNEA en 8010 cuando 8000 pertenece a otro servicio', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === 'http://127.0.0.1:8010/health') {
      return {ok:true, json:async()=>({status:'ok', backend_version:'1.1.1'})};
    }
    if (url.includes(':8000/health')) return {ok:false, json:async()=>({})};
    throw new Error('offline');
  };
  const {context, writes} = makeContext(fetchImpl);
  const ok = await context.checkBackend();
  assert.equal(ok, true);
  assert.equal(context.state.backendOnline, true);
  assert.equal(context.state.backendVersion, '1.1.1');
  assert.equal(context.state.backendUrl, 'http://127.0.0.1:8010');
  assert.ok(requested.includes('http://localhost:8000/health'));
  assert.ok(requested.includes('http://127.0.0.1:8010/health'));
  assert.ok(writes.length > 0);
});

test('no acepta un /health que no sea AUNEA Backend', async () => {
  const fetchImpl = async () => ({ok:true, json:async()=>({status:'ok'})});
  const {context} = makeContext(fetchImpl);
  const ok = await context.checkBackend();
  assert.equal(ok, false);
  assert.equal(context.state.backendOnline, false);
});
