import { test } from 'node:test';
import assert from 'node:assert/strict';
import { epocaDe, expiraDe, piezasDeEpoca, nombrePieza, DUR_EPOCA_MS,
         PIEZAS_TOTAL, PIEZAS_POR_LLAVE } from '../src/epoca.mjs';

test('E1 epoca es floor(ms/3600000)', () => {
  assert.equal(epocaDe(0), 0);
  assert.equal(epocaDe(DUR_EPOCA_MS - 1), 0);
  assert.equal(epocaDe(DUR_EPOCA_MS), 1);
});
test('E2 epoca rechaza entrada invalida', () => {
  assert.throws(() => epocaDe(NaN), TypeError);
  assert.throws(() => epocaDe(-1), TypeError);
});
test('E3 expira es el fin de la epoca', () => {
  assert.equal(expiraDe(0), DUR_EPOCA_MS);
  assert.equal(expiraDe(10), 11 * DUR_EPOCA_MS);
});
test('E4 expira rechaza epoca no entera', () => {
  assert.throws(() => expiraDe(1.5), TypeError);
});
test('E5 selecciona exactamente 4 piezas', () => {
  assert.equal(piezasDeEpoca(496487).length, PIEZAS_POR_LLAVE);
});
test('E6 las 4 piezas son distintas (nunca se repite un fragmento)', () => {
  for (let e = 0; e < 3000; e++) {
    const p = piezasDeEpoca(e);
    assert.equal(new Set(p).size, PIEZAS_POR_LLAVE, `epoca ${e} repitio pieza`);
  }
});
test('E7 todas las piezas caen en 1..12', () => {
  for (let e = 0; e < 3000; e++)
    for (const n of piezasDeEpoca(e))
      assert.ok(n >= 1 && n <= PIEZAS_TOTAL, `pieza ${n} fuera de rango`);
});
test('E8 es determinista: misma epoca, misma seleccion', () => {
  assert.deepEqual(piezasDeEpoca(496487), piezasDeEpoca(496487));
});
test('E9 epocas contiguas dan selecciones distintas', () => {
  let iguales = 0;
  for (let e = 0; e < 1000; e++)
    if (JSON.stringify(piezasDeEpoca(e)) === JSON.stringify(piezasDeEpoca(e + 1))) iguales++;
  assert.equal(iguales, 0);
});
test('E10 las 12 piezas se usan alguna vez (ninguna es corpus muerto)', () => {
  const vistas = new Set();
  for (let e = 0; e < 5000; e++) piezasDeEpoca(e).forEach(n => vistas.add(n));
  assert.equal(vistas.size, PIEZAS_TOTAL);
});
test('E11 reparto sin pieza dominante (ninguna > 2x la media)', () => {
  const c = new Map();
  const N = 12000;
  for (let e = 0; e < N; e++) piezasDeEpoca(e).forEach(n => c.set(n, (c.get(n) || 0) + 1));
  const media = (N * PIEZAS_POR_LLAVE) / PIEZAS_TOTAL;
  for (const [n, v] of c) assert.ok(v < media * 2 && v > media / 2, `pieza ${n}: ${v} vs media ${media}`);
});
test('E12 nombrePieza rellena con cero', () => {
  assert.equal(nombrePieza(1), 'pieza-01.md');
  assert.equal(nombrePieza(12), 'pieza-12.md');
});
test('E13 nombrePieza rechaza fuera de rango', () => {
  assert.throws(() => nombrePieza(0), RangeError);
  assert.throws(() => nombrePieza(13), RangeError);
});
test('E14 piezasDeEpoca rechaza epoca invalida', () => {
  assert.throws(() => piezasDeEpoca(-1), TypeError);
  assert.throws(() => piezasDeEpoca(1.5), TypeError);
});
