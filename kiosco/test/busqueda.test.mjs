import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizar, tieneControl, plegar, construirIndice, buscar,
  parrafosRelevantes, parrafos, LARGO_MAX_CONSULTA
} from '../src/busqueda.mjs';
import { DOCUMENTOS } from '../src/corpus.mjs';

const IND = construirIndice();

test('B1 sin consulta es un estado propio, no un rechazo', () => {
  for (const v of [null, undefined, '', '   ']) {
    assert.equal(normalizar(v).estado, 'vacia', `fallo con ${JSON.stringify(v)}`);
  }
});
test('B2 una consulta normal se tokeniza', () => {
  const r = normalizar('como se mide un guard sin enganarse');
  assert.equal(r.estado, 'ok');
  assert.ok(r.terminos.includes('mide'));
  assert.ok(r.terminos.includes('guard'));
});
test('B3 las palabras vacias no entran', () => {
  const r = normalizar('que es lo de la medicion');
  assert.ok(!r.terminos.includes('que'));
  assert.ok(r.terminos.includes('medicion'));
});
test('B4 los tildes se pliegan', () => {
  assert.equal(plegar('MEDICION'), 'medicion');
  assert.deepEqual(normalizar('medicion').terminos, ['medicion']);
});
test('B5 EL GUARD QUE FALLO UNA VEZ: los 65 code points de control se rechazan', () => {
  // La primera version era una clase de caracteres en una regex, se corrompio
  // al escribirse, y el salto de linea pasaba limpio.
  for (let c = 0; c < 32; c++) {
    assert.equal(normalizar('hola' + String.fromCharCode(c) + 'medir').estado,
      'rechazada', `paso el code point ${c}`);
  }
  for (let c = 127; c <= 159; c++) {
    assert.equal(normalizar('hola' + String.fromCharCode(c) + 'medir').estado,
      'rechazada', `paso el code point ${c}`);
  }
});
test('B6 tieneControl no da falsos positivos con texto normal', () => {
  assert.equal(tieneControl('como se mide un guard? (con tres estados)'), false);
  assert.equal(tieneControl('medicion, atribucion y licencia'), false);
});
test('B7 el limite exacto pasa y uno mas se rechaza', () => {
  const justo = 'medir'.padEnd(LARGO_MAX_CONSULTA, 'x');
  assert.equal(justo.length, LARGO_MAX_CONSULTA);
  assert.equal(normalizar(justo).estado, 'ok');
  assert.equal(normalizar(justo + 'x').estado, 'rechazada');
});
test('B8 lo que no es string se rechaza sin explotar', () => {
  for (const v of [1, {}, [], true]) assert.equal(normalizar(v).estado, 'rechazada');
});
test('B9 solo palabras vacias se rechaza con su motivo', () => {
  const r = normalizar('el de la y o');
  assert.equal(r.motivo, 'sin_terminos_utiles');
});
test('B10 la busqueda devuelve SIEMPRE el corpus completo, ordenado', () => {
  const r = buscar(['inventado', 'zzz'], IND);
  assert.equal(r.length, IND.length);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].puntaje >= r[i].puntaje);
});
test('B11 cada documento gana con una consulta sobre su tema', () => {
  const casos = {
    'tres-estados': 'un control que no puede reportar su ignorancia',
    'testigo-instrumento': 'el compilador como testigo independiente del autor',
    'sujeto-exacto': 'probe la primitiva aislada y conclui sobre el llamador',
    'guard-decorativo': 'una validacion escrita cuya rama nunca se ejecuta',
    'prioridad-invisible': 'ordenar el trabajo y las prioridades del equipo',
    'no-cerrar-en-el-primer-obstaculo': 'dejar de buscar otra via alternativa'
  };
  for (const [id, consulta] of Object.entries(casos)) {
    const q = normalizar(consulta);
    assert.equal(buscar(q.terminos, IND)[0].id, id, `"${consulta}" no eligio ${id}`);
  }
});
test('B12 el puntaje y los terminos van expuestos para poder discutirlos', () => {
  for (const r of buscar(normalizar('medicion').terminos, IND)) {
    assert.equal(typeof r.puntaje, 'number');
    assert.ok(Array.isArray(r.coinciden));
  }
});
test('B13 los parrafos relevantes son VERBATIM del documento', () => {
  const q = normalizar('grep coincidencias codigo');
  const rs = parrafosRelevantes('tres-estados', q.terminos, IND);
  assert.ok(rs.length >= 1);
  for (const r of rs) {
    assert.ok(DOCUMENTOS['tres-estados'].cuerpo.includes(r.texto), 'no es verbatim');
    assert.equal(typeof r.posicion, 'number');
  }
});
test('B14 sin coincidencias no se inventan parrafos', () => {
  assert.deepEqual(parrafosRelevantes('tres-estados', ['zzzz'], IND), []);
});
test('B15 un documento inexistente devuelve vacio, no explota', () => {
  assert.deepEqual(parrafosRelevantes('no-existe', ['medir'], IND), []);
  assert.deepEqual(parrafos('no-existe'), []);
});
test('B16 el indice cubre todo el corpus con sus parrafos', () => {
  assert.equal(IND.length, Object.keys(DOCUMENTOS).length);
  for (const d of IND) {
    assert.ok(d.parrafos.length >= 4, `${d.id} con pocos parrafos`);
    assert.ok(d.frec.size > 25, `${d.id} con indice flaco: ${d.frec.size}`);
  }
});
