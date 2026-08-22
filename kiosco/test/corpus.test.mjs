import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENTOS, IDS, esDocumento, urlDe, SITIO, LICENCIA } from '../src/corpus.mjs';
import { parrafos } from '../src/busqueda.mjs';

test('K1 el corpus tiene al menos 6 documentos', () => {
  assert.ok(IDS.length >= 6, `solo ${IDS.length}`);
});
test('K2 cada documento tiene titulo, tema, resumen y cuerpo', () => {
  for (const id of IDS) {
    const d = DOCUMENTOS[id];
    for (const campo of ['titulo', 'tema', 'resumen', 'cuerpo']) {
      assert.ok(d[campo] && d[campo].length > 0, `${id} sin ${campo}`);
    }
  }
});
test('K3 el resumen es una linea, no un parrafo', () => {
  for (const id of IDS) {
    assert.ok(!DOCUMENTOS[id].resumen.includes('\n'), `${id}: resumen multilinea`);
    assert.ok(DOCUMENTOS[id].resumen.length <= 130, `${id}: resumen de ${DOCUMENTOS[id].resumen.length}`);
  }
});
test('K4 el corpus es inmutable', () => {
  assert.throws(() => { 'use strict'; DOCUMENTOS.nuevo = {}; });
});
test('K5 esDocumento rechaza trampas de prototipo', () => {
  for (const v of [undefined, null, 1, {}, [], 'toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    assert.equal(esDocumento(v), false, `acepto ${String(v)}`);
  }
});
test('K6 urlDe produce una URL parseable, y rechaza lo desconocido', () => {
  for (const id of IDS) {
    const u = urlDe(id);
    assert.doesNotThrow(() => new URL(u));
    assert.ok(u.startsWith(SITIO + '/metodo/'));
  }
  assert.throws(() => urlDe('inventado'), RangeError);
});
test('K7 cada documento tiene al menos 4 parrafos de contenido', () => {
  // Si tuviera menos, el anzuelo no tendria nada que dejar afuera y el modelo
  // de negocio se cae: se entregaria el documento completo gratis.
  for (const id of IDS) {
    assert.ok(parrafos(id).length >= 4, `${id}: ${parrafos(id).length} parrafos`);
  }
});
test('K8 la linea de titulo NO es un parrafo de contenido', () => {
  // Existia como bug: esa linea ganaba la seleccion y entregaba 43 bytes.
  for (const id of IDS) {
    const p = parrafos(id);
    assert.notEqual(p[0], p[0].toUpperCase(), `${id}: el primer parrafo es el titulo`);
  }
});
test('K9 la licencia apunta al sitio', () => {
  assert.ok(LICENCIA.startsWith(SITIO));
});
test('K10 ningun documento contiene ordenes dirigidas a un modelo', () => {
  // Un cebo imperativo apuntado a un modelo es inyeccion de prompt y se
  // detecta. El corpus describe, no ordena.
  const prohibidos = [/\bignora\b/i, /\bdebes\b/i, /\btenes que visitar\b/i,
                      /\bhaz\b/i, /\bejecuta\b/i, /\bvisita\b/i];
  for (const id of IDS) {
    for (const re of prohibidos) {
      assert.equal(re.test(DOCUMENTOS[id].cuerpo), false, `${id} matchea ${re}`);
    }
  }
});
