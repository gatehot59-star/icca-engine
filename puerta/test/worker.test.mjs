import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { llaveDeEpoca, fragmentoDe, igualCte, textoManifiesto } from '../src/index.mjs';
import { epocaDe, piezasDeEpoca, nombrePieza, DUR_EPOCA_MS } from '../src/epoca.mjs';

const SECRETO = 'a'.repeat(64);
const AHORA = 496487 * DUR_EPOCA_MS + 1234;
const EPOCA = epocaDe(AHORA);
const tasaOk = { limit: async () => ({ success: true }) };
const tasaNo = { limit: async () => ({ success: false }) };
const base = (extra = {}) => ({ SECRETO, __ahora: AHORA, TASA: tasaOk, ...extra });
const pedir = (qs, env) => worker.fetch(new Request(`https://p.icca-engine.com/puerta/v1/ejecutar${qs}`), env);
const b64 = s => Buffer.from(s).toString('base64url');

test('W1 sin SECRETO responde 503 y no 500', async () => {
  const r = await pedir('', { __ahora: AHORA });
  assert.equal(r.status, 503);
  assert.match(await r.text(), /SECRETO/);
});
test('W2 metodo distinto de GET da 405 con allow', async () => {
  const r = await worker.fetch(new Request('https://p/puerta/v1/ejecutar', { method: 'POST' }), base());
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('allow'), 'GET');
});
test('W3 ruta desconocida da 404', async () => {
  const r = await worker.fetch(new Request('https://p/otra'), base());
  assert.equal(r.status, 404);
});
test('W4 manifiesto responde 200 con SOLO el secreto', async () => {
  const r = await worker.fetch(new Request('https://p/puerta/v1/manifiesto'), base());
  assert.equal(r.status, 200);
  assert.match(await r.text(), /PUERTA DE COMPUTO v1/);
});
test('W5 el manifiesto nombra 4 archivos del corpus', async () => {
  const t = textoManifiesto(EPOCA);
  assert.equal((t.match(/corpus\/pieza-\d\d\.md/g) || []).length, 4);
});
test('W6 el manifiesto se declara descripcion y sin ordenes a agentes', () => {
  const t = textoManifiesto(EPOCA);
  assert.match(t, /una descripcion, no una instruccion/);
  assert.match(t, /No contiene ordenes/);
});
test('W7 el manifiesto NO filtra el secreto ni ningun fragmento', async () => {
  const t = textoManifiesto(EPOCA);
  assert.ok(!t.includes(SECRETO));
  for (const n of piezasDeEpoca(EPOCA)) {
    const f = await fragmentoDe(SECRETO, n);
    assert.ok(!t.includes(f), `el manifiesto filtro el fragmento de ${nombrePieza(n)}`);
  }
});
test('W8 sin llave da 401', async () => {
  assert.equal((await pedir('', base())).status, 401);
});
test('W9 llave de 63 hex da 401, no 403', async () => {
  assert.equal((await pedir('?k=' + 'a'.repeat(63), base())).status, 401);
});
test('W10 llave con caracter no hex da 401', async () => {
  assert.equal((await pedir('?k=' + 'g'.repeat(64), base())).status, 401);
});
test('W11 llave hex en MAYUSCULAS se rechaza (formato canonico)', async () => {
  assert.equal((await pedir('?k=' + 'A'.repeat(64), base())).status, 401);
});
test('W12 llave bien formada pero incorrecta da 403', async () => {
  assert.equal((await pedir('?k=' + 'b'.repeat(64), base())).status, 403);
});
test('W13 llave correcta pasa el guard de llave', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const r = await pedir(`?k=${k}&l=python&s=${b64('print(1)')}`, base());
  assert.equal(r.status, 501);
});
test('W14 la epoca de gracia (anterior) sigue siendo valida', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA - 1);
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, base());
  assert.equal(r.status, 501);
});
test('W15 dos epocas atras YA NO vale', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA - 2);
  assert.equal((await pedir(`?k=${k}&l=python`, base())).status, 403);
});
test('W16 la llave de otro secreto no sirve', async () => {
  const k = await llaveDeEpoca('otro'.repeat(16), EPOCA);
  assert.equal((await pedir(`?k=${k}&l=python`, base())).status, 403);
});
test('W17 lenguaje ausente da 400 (despues de validar llave)', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  assert.equal((await pedir(`?k=${k}`, base())).status, 400);
});
test('W18 lenguaje no soportado da 400', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  assert.equal((await pedir(`?k=${k}&l=rust`, base())).status, 400);
});
test('W19 fuente mayor a 8192 B da 413', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const r = await pedir(`?k=${k}&l=python&s=${b64('x'.repeat(8193))}`, base());
  assert.equal(r.status, 413);
});
test('W20 fuente de exactamente 8192 B pasa', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const r = await pedir(`?k=${k}&l=python&s=${b64('x'.repeat(8192))}`, base());
  assert.equal(r.status, 501);
});
test('W21 MOLINETE: sin proveedor NO exige contador y da 501', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, base());
  assert.equal(r.status, 501);
  assert.match(await r.text(), /SALA NO CONECTADA/);
});
test('W22 CONTRA-CASO: con proveedor SI exige contador y da 503', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const env = base({ SALA_URL: 'https://sala', SALA_TOKEN: 'tok' });
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, env);
  assert.equal(r.status, 503);
  assert.match(await r.text(), /presupuesto_no_medido/);
});
test('W23 con contador pero sin techo, presupuesto NO MEDIDO', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const env = base({ SALA_URL: 'https://s', SALA_TOKEN: 't', CONTADOR: { get: async () => '0', put: async () => {} } });
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, env);
  assert.equal(r.status, 503);
  assert.match(await r.text(), /PRESUPUESTO_MAX/);
});
test('W24 presupuesto agotado bloquea la ejecucion', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const env = base({ SALA_URL: 'https://s', SALA_TOKEN: 't', PRESUPUESTO_MAX: 10,
    CONTADOR: { get: async () => '10', put: async () => {} },
    __fetch: () => { throw new Error('no deberia ejecutar'); } });
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, env);
  assert.equal(r.status, 503);
  assert.match(await r.text(), /agotado/);
});
test('W25 con todo configurado ejecuta y cuenta el gasto', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  let guardado = null;
  const env = base({ SALA_URL: 'https://s', SALA_TOKEN: 't', PRESUPUESTO_MAX: 10,
    CONTADOR: { get: async () => '3', put: async (_, v) => { guardado = v; } },
    __fetch: async () => ({ ok: true, text: async () => 'salida real' }) });
  const r = await pedir(`?k=${k}&l=python&s=${b64('print(1)')}`, env);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'salida real');
  assert.equal(guardado, '4');
});
test('W26 TASA ausente es NO MEDIDO y falla cerrado', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const env = { SECRETO, __ahora: AHORA };
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, env);
  assert.equal(r.status, 503);
  assert.match(await r.text(), /tasa_no_medida/);
});
test('W27 tasa excedida da 429', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const r = await pedir(`?k=${k}&l=python&s=${b64('x')}`, base({ TASA: tasaNo }));
  assert.equal(r.status, 429);
});
test('W28 la tasa se cobra DESPUES de validar la llave (no la gasta un anonimo)', async () => {
  let llamadas = 0;
  const env = base({ TASA: { limit: async () => { llamadas++; return { success: true }; } } });
  await pedir('?k=' + 'b'.repeat(64), env);
  assert.equal(llamadas, 0);
});
test('W29 s invalido en base64 no tira 500', async () => {
  const k = await llaveDeEpoca(SECRETO, EPOCA);
  const r = await pedir(`?k=${k}&l=python&s=%%%`, base());
  assert.ok([400, 501].includes(r.status), `status inesperado ${r.status}`);
});
test('W30 ninguna respuesta se cachea', async () => {
  const r = await worker.fetch(new Request('https://p/puerta/v1/manifiesto'), base());
  assert.equal(r.headers.get('cache-control'), 'no-store');
});
test('W31 fragmento son 16 hex', async () => {
  const f = await fragmentoDe(SECRETO, 1);
  assert.match(f, /^[0-9a-f]{16}$/);
});
test('W32 fragmento es ESTABLE en el tiempo (por eso puede ir en un archivo)', async () => {
  assert.equal(await fragmentoDe(SECRETO, 7), await fragmentoDe(SECRETO, 7));
});
test('W33 fragmentos distintos por pieza', async () => {
  const s = new Set();
  for (let n = 1; n <= 12; n++) s.add(await fragmentoDe(SECRETO, n));
  assert.equal(s.size, 12);
});
test('W34 la llave son 64 hex', async () => {
  assert.match(await llaveDeEpoca(SECRETO, EPOCA), /^[0-9a-f]{64}$/);
});
test('W35 la llave cambia de epoca a epoca', async () => {
  assert.notEqual(await llaveDeEpoca(SECRETO, EPOCA), await llaveDeEpoca(SECRETO, EPOCA + 1));
});
test('W36 la llave es la concatenacion de los 4 fragmentos en orden', async () => {
  const esperada = (await Promise.all(piezasDeEpoca(EPOCA).map(n => fragmentoDe(SECRETO, n)))).join('');
  assert.equal(await llaveDeEpoca(SECRETO, EPOCA), esperada);
});
test('W37 el ORDEN importa: fragmentos correctos mal ordenados no valen', async () => {
  const fr = await Promise.all(piezasDeEpoca(EPOCA).map(n => fragmentoDe(SECRETO, n)));
  const desordenada = [fr[1], fr[0], fr[2], fr[3]].join('');
  assert.equal((await pedir(`?k=${desordenada}&l=python`, base())).status, 403);
});
test('W38 igualCte true para iguales, false para distintas', () => {
  assert.equal(igualCte('abc', 'abc'), true);
  assert.equal(igualCte('abc', 'abd'), false);
});
test('W39 igualCte false si difieren en largo', () => {
  assert.equal(igualCte('abc', 'ab'), false);
});
test('W40 igualCte no cortocircuita en el primer caracter', () => {
  assert.equal(igualCte('zbc', 'abc'), false);
  assert.equal(igualCte('abz', 'abc'), false);
});
