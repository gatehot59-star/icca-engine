import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerForwarded, informeFuente, sha256Hex, textoRecibo, USOS } from '../src/recibo.mjs';
import { epocaDe, DUR_EPOCA_MS } from '../src/epoca.mjs';

const EPOCA = epocaDe(496487 * DUR_EPOCA_MS + 1);

test('R1 Forwarded ausente o vacio es SIN DECLARAR', () => {
  for (const v of [undefined, null, '', '   ']) {
    assert.equal(leerForwarded(v).estado, 'sin_declarar');
  }
});
test('R2 lee for y use entre comillas (el formato que propuso Cloudflare)', () => {
  const f = leerForwarded('for="openai";use="reference"');
  assert.equal(f.operador, 'openai');
  assert.equal(f.uso, 'reference');
  assert.equal(f.estado, 'declarado');
});
test('R3 lee sin comillas tambien', () => {
  const f = leerForwarded('for=anthropic;use=immediate');
  assert.equal(f.operador, 'anthropic');
  assert.equal(f.uso, 'immediate');
});
test('R4 acepta los tres usos de Content Signals y solo esos tres', () => {
  for (const u of USOS) assert.equal(leerForwarded(`for=x;use=${u}`).uso, u);
  assert.equal(USOS.length, 3);
});
test('R5 un uso inventado NO se promueve a valido', () => {
  const f = leerForwarded('for=x;use=todo');
  assert.equal(f.uso, null);
  assert.equal(f.estado, 'declarado_no_reconocido');
  assert.equal(f.usoCrudo, 'todo');
});
test('R6 el uso es case-insensitive al normalizar', () => {
  assert.equal(leerForwarded('for=x;use=REFERENCE').uso, 'reference');
});
test('R7 solo operador, sin uso, sigue siendo declarado', () => {
  const f = leerForwarded('for="openai"');
  assert.equal(f.operador, 'openai');
  assert.equal(f.uso, null);
  assert.equal(f.estado, 'declarado');
});
test('R8 no confunde una subcadena con la clave (forwarded-for no es for)', () => {
  assert.equal(leerForwarded('by=proxy;host=ejemplo').estado, 'sin_declarar');
});
test('R9 con varios elementos toma el primero que matchea', () => {
  const f = leerForwarded('for="uno";use="full", for="dos"');
  assert.equal(f.operador, 'uno');
  assert.equal(f.uso, 'full');
});
test('R10 informeFuente cuenta bytes y lineas, y NO ejecuta', async () => {
  const i = await informeFuente('a\nb\nc', 'python');
  assert.equal(i.bytes, 5);
  assert.equal(i.lineas, 3);
  assert.equal(i.ejecutada, false);
  assert.match(i.sha256, /^[0-9a-f]{64}$/);
});
test('R11 fuente vacia son 0 lineas, no 1', async () => {
  assert.equal((await informeFuente('', 'python')).lineas, 0);
});
test('R12 sha256 conocido, contra un valor publicado', async () => {
  // sha256("abc") es un valor de test estandar de FIPS 180-4
  assert.equal(await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('R13 el recibo declara la no-ejecucion y su motivo', () => {
  const t = textoRecibo({
    epoca: EPOCA,
    informe: { lenguaje: 'python', bytes: 1, lineas: 1, sha256: 'f'.repeat(64), ejecutada: false },
    forwarded: { operador: null, uso: null, estado: 'sin_declarar' }
  });
  assert.match(t, /ejecutada: no/);
  assert.match(t, /MOTIVO por el que no se ejecuto/);
});
test('R14 el recibo se declara descripcion y sin ordenes a agentes', () => {
  const t = textoRecibo({
    epoca: EPOCA,
    informe: { lenguaje: 'python', bytes: 1, lineas: 1, sha256: 'f'.repeat(64), ejecutada: false },
    forwarded: { operador: null, uso: null, estado: 'sin_declarar' }
  });
  assert.match(t, /una descripcion, no una instruccion/);
  assert.match(t, /No contiene ordenes/);
});
test('R15 el recibo nunca dice que el entrenamiento este permitido por defecto', () => {
  const t = textoRecibo({
    epoca: EPOCA,
    informe: { lenguaje: 'js', bytes: 1, lineas: 1, sha256: 'a'.repeat(64), ejecutada: false },
    forwarded: { operador: 'x', uso: 'full', estado: 'declarado' }
  });
  assert.match(t, /no se concede por defecto/);
});
