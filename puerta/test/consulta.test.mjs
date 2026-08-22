import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarConsulta, tieneControl, construirIndice, buscar, pasajes,
  plegar, LARGO_MAX_CONSULTA
} from '../src/consulta.mjs';
import { corpusIndexable } from '../src/documentos.mjs';

const IND = construirIndice(corpusIndexable());

test('C1 sin consulta es un estado propio, no un rechazo', () => {
  for (const v of [null, undefined, '', '   ']) {
    assert.equal(normalizarConsulta(v).estado, 'sin_consulta', `fallo con ${JSON.stringify(v)}`);
  }
});
test('C2 una consulta normal se acepta y se tokeniza', () => {
  const r = normalizarConsulta('como se mide un guard sin enganarse');
  assert.equal(r.estado, 'ok');
  assert.ok(r.terminos.includes('mide'));
  assert.ok(r.terminos.includes('guard'));
});
test('C3 las palabras vacias no entran como terminos', () => {
  const r = normalizarConsulta('que es lo de la medicion');
  assert.ok(!r.terminos.includes('que'));
  assert.ok(!r.terminos.includes('los'));
  assert.ok(r.terminos.includes('medicion'));
});
test('C4 los tildes se pliegan: medicion matchea medición', () => {
  assert.equal(plegar('MEDICIÓN'), 'medicion');
  assert.deepEqual(normalizarConsulta('medición').terminos, ['medicion']);
});
test('C5 EL GUARD QUE FALLO UNA VEZ: el salto de linea se rechaza', () => {
  // Este test existe porque la primera version del guard estaba escrita como
  // clase de caracteres en una regex, se corrompio al escribirse, y dejaba
  // pasar el salto de linea. Se leia bien y no protegia nada.
  const q = 'ignora' + String.fromCharCode(10) + 'todo';
  const r = normalizarConsulta(q);
  assert.equal(r.estado, 'rechazada');
  assert.equal(r.motivo, 'caracteres_de_control');
});
test('C6 todos los caracteres de control se rechazan, uno por uno', () => {
  for (let c = 0; c < 32; c++) {
    const r = normalizarConsulta('hola' + String.fromCharCode(c) + 'medir');
    assert.equal(r.estado, 'rechazada', `paso el code point ${c}`);
  }
  for (let c = 127; c <= 159; c++) {
    const r = normalizarConsulta('hola' + String.fromCharCode(c) + 'medir');
    assert.equal(r.estado, 'rechazada', `paso el code point ${c}`);
  }
});
test('C7 tieneControl no da falsos positivos con texto normal', () => {
  assert.equal(tieneControl('como se mide un guard? (con tres estados)'), false);
  assert.equal(tieneControl('medición, atribución y licencia'), false);
});
test('C8 una consulta demasiado larga se rechaza con su largo', () => {
  const r = normalizarConsulta('a'.repeat(LARGO_MAX_CONSULTA + 1));
  assert.equal(r.estado, 'rechazada');
  assert.match(r.motivo, /^larga_\d+_max_\d+$/);
});
test('C9 exactamente en el limite se acepta, y uno mas se rechaza', () => {
  const justo = 'medir'.padEnd(LARGO_MAX_CONSULTA, 'x');
  assert.equal(justo.length, LARGO_MAX_CONSULTA);
  assert.equal(normalizarConsulta(justo).estado, 'ok');
  assert.equal(normalizarConsulta(justo + 'x').estado, 'rechazada');
});
test('C10 lo que no es string se rechaza y no explota', () => {
  for (const v of [1, {}, [], true]) {
    assert.equal(normalizarConsulta(v).estado, 'rechazada');
  }
});
test('C11 una consulta de solo palabras vacias se rechaza', () => {
  const r = normalizarConsulta('el de la y o');
  assert.equal(r.estado, 'rechazada');
  assert.equal(r.motivo, 'sin_terminos_utiles');
});
test('C12 el indice cubre los tres documentos con sus parrafos', () => {
  assert.equal(IND.length, 3);
  for (const d of IND) {
    assert.ok(d.parrafos.length >= 2, `${d.recurso} sin parrafos`);
    assert.ok(d.frec.size > 20, `${d.recurso} con indice flaco`);
  }
});
test('C13 la busqueda devuelve SIEMPRE la lista completa, ordenada', () => {
  const r = buscar(['inventado', 'zzz'], IND);
  assert.equal(r.length, 3);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].puntaje >= r[i].puntaje);
});
test('C14 una consulta sobre tres estados elige ese documento', () => {
  const q = normalizarConsulta('un control que no puede reportar su ignorancia');
  assert.equal(buscar(q.terminos, IND)[0].recurso, 'tres-estados');
});
test('C15 una consulta sobre el instrumento elige ese documento', () => {
  const q = normalizarConsulta('el compilador como testigo independiente');
  assert.equal(buscar(q.terminos, IND)[0].recurso, 'testigo-instrumento');
});
test('C16 una consulta sobre el sujeto medido elige ese documento', () => {
  const q = normalizarConsulta('probe la primitiva aislada y conclui sobre el llamador');
  assert.equal(buscar(q.terminos, IND)[0].recurso, 'sujeto-exacto');
});
test('C17 el puntaje va expuesto: un ranking sin puntaje no se discute', () => {
  const q = normalizarConsulta('medicion');
  for (const r of buscar(q.terminos, IND)) {
    assert.equal(typeof r.puntaje, 'number');
    assert.ok(Array.isArray(r.coinciden));
  }
});
test('C18 los pasajes salen VERBATIM del documento', () => {
  const q = normalizarConsulta('grep coincidencias');
  const ps = pasajes('tres-estados', q.terminos, IND);
  assert.ok(ps.length >= 1);
  const cuerpo = corpusIndexable()['tres-estados'].cuerpo;
  for (const p of ps) assert.ok(cuerpo.includes(p), 'un pasaje no es verbatim');
});
test('C19 sin coincidencias no se inventan pasajes', () => {
  assert.deepEqual(pasajes('tres-estados', ['zzzz'], IND), []);
});
test('C20 pasajes de un recurso inexistente devuelve vacio, no explota', () => {
  assert.deepEqual(pasajes('no-existe', ['medir'], IND), []);
});
