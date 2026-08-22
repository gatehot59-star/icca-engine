import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salaConfigurada, ejecutarEnSala, SALA_NO_CONECTADA, LIMITES } from '../src/sala.mjs';

test('S1 sin env la sala no esta configurada', () => {
  assert.equal(salaConfigurada(undefined), false);
  assert.equal(salaConfigurada({}), false);
});
test('S2 con URL pero sin token, NO configurada (media config no cuenta)', () => {
  assert.equal(salaConfigurada({ SALA_URL: 'https://x' }), false);
});
test('S3 con token pero sin URL, NO configurada', () => {
  assert.equal(salaConfigurada({ SALA_TOKEN: 't' }), false);
});
test('S4 con string vacio NO configurada', () => {
  assert.equal(salaConfigurada({ SALA_URL: '', SALA_TOKEN: 't' }), false);
});
test('S5 con ambos, configurada', () => {
  assert.equal(salaConfigurada({ SALA_URL: 'https://x', SALA_TOKEN: 't' }), true);
});
test('S6 sin proveedor devuelve motivo sala_no_conectada y NO llama a la red', async () => {
  let llamadas = 0;
  const r = await ejecutarEnSala({ __fetch: () => { llamadas++; } }, { lenguaje: 'python', fuente: 'x' });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, SALA_NO_CONECTADA);
  assert.equal(llamadas, 0);
});
test('S7 con proveedor manda limites y authorization', async () => {
  let visto = null;
  const env = { SALA_URL: 'https://sala', SALA_TOKEN: 'tok',
    __fetch: (u, o) => { visto = { u, o }; return { ok: true, text: async () => 'hola' }; } };
  const r = await ejecutarEnSala(env, { lenguaje: 'python', fuente: 'print(1)' });
  assert.equal(r.ok, true);
  assert.equal(r.salida, 'hola');
  assert.equal(visto.o.headers.authorization, 'Bearer tok');
  assert.deepEqual(JSON.parse(visto.o.body).limites, LIMITES);
});
test('S8 fallo del proveedor no se disfraza de exito', async () => {
  const env = { SALA_URL: 'https://sala', SALA_TOKEN: 'tok',
    __fetch: () => ({ ok: false, status: 500 }) };
  const r = await ejecutarEnSala(env, { lenguaje: 'python', fuente: 'x' });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'sala_fallo');
  assert.equal(r.status, 500);
});
test('S9 la salida se recorta al limite', async () => {
  const env = { SALA_URL: 'https://sala', SALA_TOKEN: 'tok',
    __fetch: () => ({ ok: true, text: async () => 'a'.repeat(LIMITES.salidaB + 500) }) };
  const r = await ejecutarEnSala(env, { lenguaje: 'python', fuente: 'x' });
  assert.equal(r.salida.length, LIMITES.salidaB);
});
test('S10 los limites declaran sin red y sin persistencia', () => {
  assert.equal(LIMITES.red, false);
  assert.equal(LIMITES.persistencia, false);
});
test('S11 los limites son inmutables', () => {
  assert.throws(() => { 'use strict'; LIMITES.cpuS = 999; });
});
