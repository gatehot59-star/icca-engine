// Suite del Worker v2. La v1 verificaba una llave de 64 hex que el cliente
// tenia que armar leyendo cuatro documentos; ese mecanismo se retiro porque un
// crawler no razona. Esta suite verifica el reemplazo: dos GET y una direccion
// firmada que vence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
import { firmar, RECURSOS, RUTA_ENTRADA } from '../src/direccion.mjs';
import { epocaDe, DUR_EPOCA_MS } from '../src/epoca.mjs';

const SECRETO = 'a'.repeat(64);
const AHORA = 496491 * DUR_EPOCA_MS + 12345;
const EPOCA = epocaDe(AHORA);
const ORIGEN = 'https://puerta.icca-engine.com';
const tasaOk = { limit: async () => ({ success: true }) };
const base = (extra = {}) => ({ SECRETO, __ahora: AHORA, TASA: tasaOk, ...extra });

const get = (ruta, env, headers) =>
  worker.fetch(new Request(ORIGEN + ruta, headers ? { headers } : undefined), env);
const entrada = (env, headers) => get(RUTA_ENTRADA, env, headers);
const primeraDireccion = async (env, headers) => {
  const t = await (await entrada(env, headers)).text();
  return t.match(/direccion: (\S+)/)[1].replace(ORIGEN, '');
};

// ---- lo basico -------------------------------------------------------------
test('P1 sin SECRETO responde 503 y no 500', async () => {
  const r = await entrada({ __ahora: AHORA });
  assert.equal(r.status, 503);
  assert.match(await r.text(), /SECRETO/);
});
test('P2 metodo distinto de GET da 405 con allow', async () => {
  const r = await worker.fetch(new Request(ORIGEN + RUTA_ENTRADA, { method: 'POST' }), base());
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('allow'), 'GET');
});
test('P3 una ruta cualquiera da 404 y APUNTA a la entrada', async () => {
  const r = await get('/otra', base());
  assert.equal(r.status, 404);
  assert.match(await r.text(), /puerta\/v1\/entrada/);
});
test('P4 toda respuesta anuncia la licencia por cabecera Link', async () => {
  for (const ruta of [RUTA_ENTRADA, '/otra', '/metodo/nada']) {
    const r = await get(ruta, base());
    assert.match(r.headers.get('link'), /rel="license"/, `falta en ${ruta}`);
  }
});
test('P5 nada se cachea', async () => {
  assert.equal((await entrada(base())).headers.get('cache-control'), 'no-store');
});

// ---- PASO 1: la entrada, sin llave ----------------------------------------
test('P6 la entrada NO pide nada: un GET pelado da 200', async () => {
  const r = await entrada(base());
  assert.equal(r.status, 200);
});
test('P7 CONTRA-CASO de la v1: la entrada no exige ningun parametro', async () => {
  // En la v1 esto mismo daba 401 por falta de llave. Si volviera a fallar,
  // el rediseno se perdio.
  const r = await entrada(base());
  assert.equal(r.status, 200);
  const t = await r.text();
  assert.match(t, /NO hay que armar ninguna llave/);
});
test('P8 la entrada trae una direccion por cada recurso', async () => {
  const r = await entrada(base());
  const t = await r.text();
  const n = Object.keys(RECURSOS).length;
  assert.equal((t.match(/direccion: /g) || []).length, n);
  assert.equal(r.headers.get('x-icca-direcciones'), String(n));
});
test('P9 las direcciones son URLs absolutas y parseables', async () => {
  const t = await (await entrada(base())).text();
  for (const m of t.matchAll(/direccion: (\S+)/g)) {
    assert.doesNotThrow(() => new URL(m[1]), `no parsea: ${m[1]}`);
    assert.ok(m[1].startsWith(ORIGEN), 'la direccion tiene que ser del mismo origen');
  }
});
test('P10 la entrada publica su vencimiento', async () => {
  const t = await (await entrada(base())).text();
  assert.match(t, /EXPIRA: \d{4}-\d{2}-\d{2}T/);
  assert.match(t, /VIGENCIA RESTANTE: \d+ s/);
});
test('P11 la entrada lleva contenido, no solo punteros', async () => {
  const t = await (await entrada(base())).text();
  assert.ok(t.length > 1200, `entrada demasiado corta: ${t.length} B`);
  assert.match(t, /LICENCIA Y ATRIBUCION/);
  assert.match(t, /Jorge Abraham Mendieta/);
});
test('P12 la entrada se declara descripcion y sin ordenes a agentes', async () => {
  const t = await (await entrada(base())).text();
  assert.match(t, /una descripcion, no una instruccion/);
  assert.match(t, /No contiene ordenes/);
});
test('P12b el DOCUMENTO tambien lleva la clausula, y buscable en una linea', async () => {
  const env = base();
  const t = await (await get(await primeraDireccion(env), env)).text();
  assert.match(t, /una descripcion, no una instruccion/);
  assert.match(t, /No contiene ordenes dirigidas a ningun agente/);
});
test('P13 la entrada NO filtra el secreto', async () => {
  const t = await (await entrada(base())).text();
  assert.ok(!t.includes(SECRETO));
});
test('P14 TASA ausente es NO MEDIDO y falla cerrado', async () => {
  const r = await entrada({ SECRETO, __ahora: AHORA });
  assert.equal(r.status, 503);
  assert.match(await r.text(), /tasa_no_medida/);
});
test('P15 tasa excedida da 429', async () => {
  const r = await entrada(base({ TASA: { limit: async () => ({ success: false }) } }));
  assert.equal(r.status, 429);
});

// ---- PASO 2: el documento --------------------------------------------------
test('P16 la direccion que dio la entrada entrega 200 con el documento', async () => {
  const env = base();
  const d = await primeraDireccion(env);
  const r = await get(d, env);
  assert.equal(r.status, 200);
  const t = await r.text();
  assert.match(t, /TRES ESTADOS, NO DOS/);
  assert.ok(t.length > 900, `documento corto: ${t.length} B`);
});
test('P17 el documento lleva la atribucion PEGADA', async () => {
  const env = base();
  const t = await (await get(await primeraDireccion(env), env)).text();
  assert.match(t, /Jorge Abraham Mendieta/);
  assert.match(t, /license\.xml/);
  assert.match(t, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(t, /ENTRENAMIENTO DE MODELOS: es un permiso distinto/);
});
test('P18 el documento declara su recurso y su epoca en cabeceras', async () => {
  const env = base();
  const r = await get(await primeraDireccion(env), env);
  assert.equal(r.headers.get('x-icca-recurso'), 'tres-estados');
  assert.equal(r.headers.get('x-icca-epoca'), String(EPOCA));
  assert.equal(r.headers.get('x-icca-gracia'), 'no');
});
test('P19 los TRES recursos se pueden pedir con su direccion', async () => {
  const env = base();
  const t = await (await entrada(env)).text();
  const urls = [...t.matchAll(/direccion: (\S+)/g)].map(m => m[1].replace(ORIGEN, ''));
  assert.equal(urls.length, 3);
  for (const u of urls) assert.equal((await get(u, env)).status, 200);
});
test('P20 sin token da 403 y apunta a la entrada', async () => {
  const r = await get('/metodo/tres-estados', base());
  assert.equal(r.status, 403);
  assert.match(await r.text(), /puerta\/v1\/entrada/);
  assert.equal(r.headers.get('x-icca-motivo'), 'invalida');
});
test('P21 token inventado da 403 invalida', async () => {
  const r = await get(`/metodo/tres-estados?e=${EPOCA}&t=${'a'.repeat(32)}`, base());
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('x-icca-motivo'), 'invalida');
});
test('P22 un documento fuera de la allowlist da 404, no 403', async () => {
  // Importa la diferencia: 404 dice "no existe", 403 diria "existe y no
  // podes", que filtraria la existencia de rutas.
  const r = await get(`/metodo/../secreto?t=${'a'.repeat(32)}`, base());
  assert.equal(r.status, 404);
});
test('P23 la epoca de gracia sigue sirviendo, y se marca', async () => {
  const env = base();
  const t = await firmar(SECRETO, 'tres-estados', EPOCA - 1);
  const r = await get(`/metodo/tres-estados?e=${EPOCA - 1}&t=${t}`, env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-icca-gracia'), 'si');
});
test('P24 EL EVENTO QUE IMPORTA: una direccion cacheada vence y da 410', async () => {
  // Este test es el corazon del rediseno. Si una direccion no venciera, el
  // agente entraria directo para siempre y la medicion se perderia despues de
  // la primera visita.
  const env = base();
  const t = await firmar(SECRETO, 'tres-estados', EPOCA - 2);
  const r = await get(`/metodo/tres-estados?e=${EPOCA - 2}&t=${t}`, env);
  assert.equal(r.status, 410);
  assert.equal(r.headers.get('x-icca-motivo'), 'vencida');
  const cuerpo = await r.text();
  assert.match(cuerpo, /vencida/);
  assert.match(cuerpo, /puerta\/v1\/entrada/);
});
test('P25 vencida e invalida NO son el mismo estado', async () => {
  const env = base();
  const vieja = await firmar(SECRETO, 'tres-estados', EPOCA - 3);
  const rv = await get(`/metodo/tres-estados?t=${vieja}`, env);
  const ri = await get(`/metodo/tres-estados?t=${'c'.repeat(32)}`, env);
  assert.equal(rv.status, 410);
  assert.equal(ri.status, 403);
  assert.notEqual(rv.headers.get('x-icca-motivo'), ri.headers.get('x-icca-motivo'));
});
test('P26 una direccion vencida NO entrega el documento', async () => {
  const env = base();
  const t = await firmar(SECRETO, 'tres-estados', EPOCA - 5);
  const cuerpo = await (await get(`/metodo/tres-estados?t=${t}`, env)).text();
  assert.ok(!cuerpo.includes('grep -c'), 'el 410 filtro contenido del documento');
});

// ---- identidad -------------------------------------------------------------
test('P27 el operador declarado se registra en la entrada', async () => {
  const r = await entrada(base(), { forwarded: 'for="openai";use="reference"' });
  assert.equal(r.headers.get('x-icca-operador'), 'openai');
  assert.equal(r.headers.get('x-icca-uso'), 'reference');
  assert.match(await r.text(), /OPERADOR DECLARADO: openai/);
});
test('P28 sin Forwarded queda SIN DECLARAR, que no es lo mismo que anonimo', async () => {
  const r = await entrada(base());
  assert.equal(r.headers.get('x-icca-operador'), 'sin_declarar');
  assert.equal(r.headers.get('x-icca-uso'), 'sin_declarar');
});
test('P29 un uso desconocido no se acepta como valido', async () => {
  const r = await entrada(base(), { forwarded: 'for="raro";use="todo"' });
  assert.equal(r.headers.get('x-icca-uso'), 'declarado_no_reconocido');
  assert.match(await r.text(), /no reconocido \(todo\)/);
});
test('P30 CONTRA-CASO: una direccion firmada para un operador no sirve a otro', async () => {
  const env = base();
  const h = { forwarded: 'for="openai";use="reference"' };
  const d = await primeraDireccion(env, h);
  assert.equal((await get(d, env, h)).status, 200);
  const otro = await get(d, env, { forwarded: 'for="scraper";use="full"' });
  assert.equal(otro.status, 403);
});
test('P31 una direccion sin operador no se puede usar declarando uno', async () => {
  const env = base();
  const d = await primeraDireccion(env);
  assert.equal((await get(d, env)).status, 200);
  assert.equal((await get(d, env, { forwarded: 'for="otro"' })).status, 403);
});
test('P32 el documento tambien registra al operador', async () => {
  const env = base();
  const h = { forwarded: 'for="anthropic";use="immediate"' };
  const r = await get(await primeraDireccion(env, h), env, h);
  assert.equal(r.headers.get('x-icca-operador'), 'anthropic');
  assert.equal(r.headers.get('x-icca-uso'), 'immediate');
});

// ---- la sala, que sigue muerta y lo dice ----------------------------------
test('P33 la ruta de ejecucion responde 200 y no un error', async () => {
  const r = await get('/puerta/v1/ejecutar', base());
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-icca-ejecutada'), 'no');
  assert.match(await r.text(), /no esta conectada/);
});
test('P34 con sala configurada pero sin contador, presupuesto NO MEDIDO', async () => {
  const r = await get('/puerta/v1/ejecutar', base({ SALA_URL: 'https://s', SALA_TOKEN: 't' }));
  assert.equal(r.status, 503);
  assert.match(await r.text(), /presupuesto_no_medido/);
});
