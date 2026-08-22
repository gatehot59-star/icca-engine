import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECURSOS, LARGO_TOKEN, RE_TOKEN, esRecurso, firmar, verificar,
  armarDireccion, vigenciaRestanteS
} from '../src/direccion.mjs';
import { epocaDe, DUR_EPOCA_MS } from '../src/epoca.mjs';

const S = 'secreto'.repeat(10);
const AHORA = 496491 * DUR_EPOCA_MS + 12345;
const E = epocaDe(AHORA);

test('D1 la allowlist de recursos no esta vacia y es cerrada', () => {
  assert.ok(Object.keys(RECURSOS).length >= 3);
  assert.equal(esRecurso('tres-estados'), true);
  assert.equal(esRecurso('no-existe'), false);
});
test('D2 esRecurso rechaza lo que no es string y las trampas de prototipo', () => {
  for (const v of [undefined, null, 1, {}, [], 'toString', 'constructor', '__proto__']) {
    assert.equal(esRecurso(v), false, `acepto ${String(v)}`);
  }
});
test('D3 el token son 32 hex', async () => {
  const t = await firmar(S, 'tres-estados', E);
  assert.match(t, RE_TOKEN);
  assert.equal(t.length, LARGO_TOKEN);
});
test('D4 firmar es determinista', async () => {
  assert.equal(await firmar(S, 'tres-estados', E), await firmar(S, 'tres-estados', E));
});
test('D5 el token cambia por epoca', async () => {
  assert.notEqual(await firmar(S, 'tres-estados', E), await firmar(S, 'tres-estados', E + 1));
});
test('D6 el token cambia por recurso', async () => {
  assert.notEqual(await firmar(S, 'tres-estados', E), await firmar(S, 'sujeto-exacto', E));
});
test('D7 el token cambia por operador', async () => {
  assert.notEqual(await firmar(S, 'tres-estados', E, 'openai'),
                  await firmar(S, 'tres-estados', E, 'otro'));
});
test('D8 el token cambia por secreto', async () => {
  assert.notEqual(await firmar(S, 'tres-estados', E), await firmar('otro'.repeat(16), 'tres-estados', E));
});
test('D9 firmar rechaza recurso desconocido y epoca invalida', async () => {
  await assert.rejects(() => firmar(S, 'nada', E), RangeError);
  await assert.rejects(() => firmar(S, 'tres-estados', -1), TypeError);
  await assert.rejects(() => firmar(S, 'tres-estados', 1.5), TypeError);
});
test('D10 un token de la epoca vigente verifica', async () => {
  const t = await firmar(S, 'tres-estados', E);
  const v = await verificar(S, 'tres-estados', t, AHORA);
  assert.equal(v.ok, true);
  assert.equal(v.epoca, E);
  assert.equal(v.gracia, false);
});
test('D11 la epoca de gracia verifica y se marca como gracia', async () => {
  const t = await firmar(S, 'tres-estados', E - 1);
  const v = await verificar(S, 'tres-estados', t, AHORA);
  assert.equal(v.ok, true);
  assert.equal(v.gracia, true);
});
test('D12 dos epocas atras es VENCIDA, no invalida (los dos estados se distinguen)', async () => {
  const t = await firmar(S, 'tres-estados', E - 2);
  const v = await verificar(S, 'tres-estados', t, AHORA);
  assert.equal(v.ok, false);
  assert.equal(v.motivo, 'vencida');
  assert.equal(v.epoca, E - 2);
});
test('D13 un token inventado es INVALIDA, no vencida', async () => {
  const v = await verificar(S, 'tres-estados', 'a'.repeat(32), AHORA);
  assert.equal(v.motivo, 'invalida');
});
test('D14 un token viejisimo cae en invalida por el limite de busqueda', async () => {
  const t = await firmar(S, 'tres-estados', E - 200);
  const v = await verificar(S, 'tres-estados', t, AHORA);
  assert.equal(v.ok, false);
  assert.equal(v.motivo, 'invalida');
});
test('D15 el token de un recurso NO sirve para otro', async () => {
  const t = await firmar(S, 'tres-estados', E);
  assert.equal((await verificar(S, 'sujeto-exacto', t, AHORA)).motivo, 'invalida');
});
test('D16 el token de un operador NO sirve a otro que se declara distinto', async () => {
  const t = await firmar(S, 'tres-estados', E, 'openai');
  assert.equal((await verificar(S, 'tres-estados', t, AHORA, 'otro')).motivo, 'invalida');
  assert.equal((await verificar(S, 'tres-estados', t, AHORA, 'openai')).ok, true);
});
test('D17 un token sin declarar operador NO sirve si despues se declara uno', async () => {
  const t = await firmar(S, 'tres-estados', E, '');
  assert.equal((await verificar(S, 'tres-estados', t, AHORA, 'openai')).motivo, 'invalida');
});
test('D18 token con formato malo es invalida y no explota', async () => {
  for (const t of [undefined, null, '', 'xyz', 'A'.repeat(32), 'a'.repeat(31), 'a'.repeat(33)]) {
    const v = await verificar(S, 'tres-estados', t, AHORA);
    assert.equal(v.ok, false);
    assert.equal(v.motivo, 'invalida');
  }
});
test('D19 recurso desconocido nunca verifica, ni con token bien formado', async () => {
  assert.equal((await verificar(S, 'nada', 'a'.repeat(32), AHORA)).motivo, 'invalida');
});
test('D20 armarDireccion produce una URL con recurso, epoca y token', () => {
  const u = armarDireccion({ origen: 'https://p.icca-engine.com', recurso: 'tres-estados', token: 'b'.repeat(32), epoca: E });
  assert.equal(u, `https://p.icca-engine.com/metodo/tres-estados?e=${E}&t=${'b'.repeat(32)}`);
  assert.doesNotThrow(() => new URL(u));
});
test('D21 la vigencia restante cae dentro de la epoca y nunca es negativa', () => {
  const v = vigenciaRestanteS(AHORA);
  assert.ok(v > 0 && v <= DUR_EPOCA_MS / 1000, `vigencia fuera de rango: ${v}`);
});
