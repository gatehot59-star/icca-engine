// Test del PROTOCOLO MCP real. Solo corre donde hay red para instalar el SDK.
//
// POR QUE ESTA SEPARADO DE test/: el entorno donde se escribio este codigo no
// tiene npm ni red, asi que no puede instalar "agents" ni
// "@modelcontextprotocol/server". Todo lo que dependa de esos paquetes es NO
// MEDIDO ahi, y decirlo es la mitad del trabajo. Verificado, no supuesto: el
// import falla con ERR_MODULE_NOT_FOUND.
//
// El CI si tiene red. Este archivo es el instrumento que convierte el
// "deberia funcionar" en un dato, y es INDEPENDIENTE de quien escribio el
// codigo: un handshake que falla falla igual sin importar quien lo invoco.
//
// La pregunta concreta que responde, y que ninguna lectura de documentacion
// podia cerrar: si createMcpHandler (que exige @modelcontextprotocol/server
// 2.0.0) funciona con el servidor que arma crearServidor().
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../src/index.mjs');
const worker = mod.default;

const ORIGEN = 'https://kiosco.icca-engine.com';
const ctx = { waitUntil() {}, passThroughOnException() {} };

/** Un POST JSON-RPC al endpoint MCP, como lo haria un cliente real. */
async function rpc(metodo, params, id = 1) {
  const req = new Request(`${ORIGEN}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: metodo, params })
  });
  const res = await worker.fetch(req, {}, ctx);
  const cuerpo = await res.text();
  return { status: res.status, tipo: res.headers.get('content-type') || '', cuerpo };
}

/** Extrae el objeto JSON-RPC, venga como JSON puro o dentro de un SSE. */
function leerRpc({ cuerpo }) {
  const t = cuerpo.trim();
  if (t.startsWith('{')) return JSON.parse(t);
  for (const linea of t.split('\n')) {
    const l = linea.trim();
    if (l.startsWith('data:')) {
      const d = l.slice(5).trim();
      if (d.startsWith('{')) return JSON.parse(d);
    }
  }
  throw new Error('no se encontro un objeto JSON-RPC en la respuesta: ' + t.slice(0, 300));
}

test('M1 el modulo carga con los paquetes reales instalados', () => {
  // Si esto falla, el conflicto de versiones entre el SDK v1 y el v2 es real.
  assert.equal(typeof worker.fetch, 'function');
  assert.equal(typeof mod.crearServidor, 'function');
});

test('M2 la fabrica construye un servidor nuevo en cada llamada', () => {
  // createMcpHandler crea uno por request: si la fabrica devolviera siempre el
  // mismo objeto, habria estado compartido entre pedidos.
  const a = mod.crearServidor();
  const b = mod.crearServidor();
  assert.ok(a && b);
  assert.notEqual(a, b, 'la fabrica devolvio la misma instancia');
});

test('M3 initialize responde y declara capacidad de herramientas', async () => {
  const r = await rpc('initialize', {
    protocolVersion: '2026-07-28',
    capabilities: {},
    clientInfo: { name: 'test-integracion', version: '1.0.0' }
  });
  assert.equal(r.status, 200, `status ${r.status}: ${r.cuerpo.slice(0, 300)}`);
  const j = leerRpc(r);
  assert.equal(j.error, undefined, `error del protocolo: ${JSON.stringify(j.error)}`);
  assert.ok(j.result, 'sin result');
  assert.ok(j.result.capabilities, 'sin capabilities');
  assert.ok(j.result.capabilities.tools, 'el servidor no declara tools');
  assert.equal(j.result.serverInfo.name, 'icca-engine-metodo');
});

test('M4 tools/list expone las TRES herramientas con su schema', async () => {
  const j = leerRpc(await rpc('tools/list', {}, 2));
  assert.equal(j.error, undefined, JSON.stringify(j.error));
  const nombres = j.result.tools.map(t => t.name).sort();
  assert.deepEqual(nombres, ['buscar_metodo', 'donde_esta', 'listar_metodo']);
  for (const t of j.result.tools) {
    assert.ok(t.description && t.description.length > 40, `${t.name}: descripcion corta`);
    assert.ok(t.inputSchema, `${t.name}: sin inputSchema`);
  }
});

test('M5 la descripcion publicada es la que hace descubrible al kiosco', async () => {
  const j = leerRpc(await rpc('tools/list', {}, 3));
  const buscar = j.result.tools.find(t => t.name === 'buscar_metodo');
  assert.ok(buscar.description.length > 300, `${buscar.description.length} caracteres`);
  for (const term of ['verificacion', 'medicion', 'tests']) {
    assert.ok(buscar.description.includes(term), `no menciona ${term}`);
  }
});

test('M6 tools/call de buscar_metodo devuelve el anzuelo por el protocolo', async () => {
  const j = leerRpc(await rpc('tools/call', {
    name: 'buscar_metodo',
    arguments: { consulta: 'un control que no reporta su ignorancia' }
  }, 4));
  assert.equal(j.error, undefined, JSON.stringify(j.error));
  assert.equal(j.result.isError, undefined);
  const texto = j.result.content[0].text;
  assert.match(texto, /FRAGMENTO VERBATIM/);
  assert.match(texto, /tres-estados/);
  assert.match(texto, /Quedan \d+ parrafos/);
  assert.match(texto, /https:\/\/icca-engine\.com\/metodo\//);
});

test('M7 tools/call sin argumentos devuelve el catalogo, no un error', async () => {
  const j = leerRpc(await rpc('tools/call', { name: 'listar_metodo', arguments: {} }, 5));
  assert.equal(j.error, undefined, JSON.stringify(j.error));
  assert.match(j.result.content[0].text, /DOCUMENTOS/);
});

test('M8 el schema RECHAZA una consulta mas larga que el limite', async () => {
  // El limite esta declarado en el schema con zod, asi que lo tiene que aplicar
  // el protocolo antes de llegar al handler.
  const j = leerRpc(await rpc('tools/call', {
    name: 'buscar_metodo',
    arguments: { consulta: 'a'.repeat(5000) }
  }, 6));
  const rechazado = Boolean(j.error) || Boolean(j.result && j.result.isError);
  assert.ok(rechazado, 'una consulta de 5000 caracteres paso el schema');
});

test('M9 el enum RECHAZA un id que no esta en el corpus', async () => {
  const j = leerRpc(await rpc('tools/call', {
    name: 'donde_esta',
    arguments: { id: '../../etc/passwd' }
  }, 7));
  const rechazado = Boolean(j.error) || Boolean(j.result && j.result.isError);
  assert.ok(rechazado, 'el enum acepto un id arbitrario');
});

test('M10 una herramienta inexistente da error, no 500', async () => {
  const r = await rpc('tools/call', { name: 'no_existe', arguments: {} }, 8);
  assert.ok(r.status < 500, `status ${r.status}`);
  const j = leerRpc(r);
  assert.ok(j.error || (j.result && j.result.isError), 'acepto una tool inexistente');
});

test('M11 la raiz devuelve la tarjeta legible con 200', async () => {
  const res = await worker.fetch(new Request(ORIGEN + '/'), {}, ctx);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('link') || '', /rel="license"/);
  const t = await res.text();
  assert.match(t, /ENDPOINT MCP/);
  assert.match(t, /COSTO:\s+ninguno/);
  assert.match(t, /No contiene ordenes dirigidas a ningun agente/);
});

test('M12 ninguna respuesta del protocolo filtra el corpus completo', async () => {
  const { IDS } = await import('../src/corpus.mjs');
  const { parrafos } = await import('../src/busqueda.mjs');
  const j = leerRpc(await rpc('tools/call', {
    name: 'buscar_metodo',
    arguments: { consulta: 'medicion control error codigo caso regla metodo' }
  }, 9));
  const texto = j.result.content[0].text;
  for (const id of IDS) {
    const ps = parrafos(id);
    const dados = ps.filter(p => texto.includes(p)).length;
    assert.ok(dados < ps.length, `${id}: se entrego completo por el protocolo`);
  }
});
