import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anzuelo, textoRespuesta, textoCatalogo, FRACCION_ANZUELO, MINIMO_BYTES } from '../src/anzuelo.mjs';
import { construirIndice, normalizar, buscar, parrafos } from '../src/busqueda.mjs';
import { DOCUMENTOS, IDS, urlDe } from '../src/corpus.mjs';

const IND = construirIndice();
const q = (s) => normalizar(s).terminos;

test('A1 el anzuelo entrega fragmentos VERBATIM del documento', () => {
  for (const id of IDS) {
    const a = anzuelo(id, q('medicion control error'), IND);
    for (const f of a.fragmentos) {
      assert.ok(DOCUMENTOS[id].cuerpo.includes(f), `${id}: fragmento no verbatim`);
    }
  }
});
test('A2 NUNCA entrega el documento completo: el negocio depende de eso', () => {
  for (const id of IDS) {
    const a = anzuelo(id, q('medicion control error codigo caso regla'), IND);
    assert.ok(a.parrafosRestantes >= 1, `${id}: no dejo nada afuera`);
    assert.ok(a.bytesEntregados < a.bytesTotales, `${id}: entrego todo`);
  }
});
test('A3 NUNCA entrega vacio: una llamada desperdiciada no vuelve', () => {
  for (const id of IDS) {
    const a = anzuelo(id, ['zzzzz'], IND);
    assert.ok(a.fragmentos.length >= 1, `${id}: entrego vacio`);
    assert.ok(a.bytesEntregados >= 100, `${id}: entrego ${a.bytesEntregados} bytes`);
  }
});
test('A4 el reparto queda en una banda razonable en TODO el corpus', () => {
  // La regla anterior era "un parrafo" y medida daba entre 3% y 36%: un reparto
  // que no se puede predecir no es una decision de negocio.
  const consultas = ['medicion', 'control error', 'codigo caso', 'regla metodo', 'zzzz'];
  let min = 1, max = 0;
  for (const id of IDS) {
    for (const c of consultas) {
      const t = q(c);
      const a = anzuelo(id, t.length ? t : ['zzzz'], IND);
      const r = a.bytesEntregados / a.bytesTotales;
      min = Math.min(min, r); max = Math.max(max, r);
    }
  }
  assert.ok(min >= 0.10, `piso demasiado bajo: ${(min * 100).toFixed(0)}%`);
  assert.ok(max <= 0.55, `techo demasiado alto: ${(max * 100).toFixed(0)}%`);
});
test('A5 los fragmentos NUNCA se cortan a la mitad', () => {
  // Un texto cortado en seco es un titular de portal y a un agente le da una
  // frase rota. Se llena con parrafos enteros o no se llena.
  for (const id of IDS) {
    const ps = parrafos(id);
    const a = anzuelo(id, q('medicion control'), IND);
    for (const f of a.fragmentos) {
      assert.ok(ps.includes(f), `${id}: fragmento cortado`);
    }
  }
});
test('A6 los fragmentos van en el orden del documento, no por puntaje', () => {
  // Leer parrafos desordenados de un texto argumentativo rompe el argumento.
  const a = anzuelo('no-cerrar-en-el-primer-obstaculo', q('via alternativa registro compilador'), IND);
  if (a.fragmentos.length > 1) {
    const ps = parrafos('no-cerrar-en-el-primer-obstaculo');
    const pos = a.fragmentos.map(f => ps.indexOf(f));
    for (let i = 1; i < pos.length; i++) assert.ok(pos[i] > pos[i - 1], 'desordenados');
  }
});
test('A7 los numeros que se publican son REALES y verificables', () => {
  for (const id of IDS) {
    const a = anzuelo(id, q('control medicion'), IND);
    const ps = parrafos(id);
    assert.equal(a.parrafosTotales, ps.length);
    assert.equal(a.parrafosEntregados, a.fragmentos.length);
    assert.equal(a.parrafosRestantes, ps.length - a.fragmentos.length);
    assert.equal(a.bytesEntregados, a.fragmentos.join('').length);
    assert.equal(a.bytesTotales, ps.reduce((n, p) => n + p.length, 0));
  }
});
test('A8 declara si el fragmento salio de la consulta o es la apertura', () => {
  assert.equal(anzuelo('tres-estados', q('grep coincidencias'), IND).porConsulta, true);
  assert.equal(anzuelo('tres-estados', ['zzzzz'], IND).porConsulta, false);
});
test('A9 el anzuelo incluye la direccion correcta del documento', () => {
  for (const id of IDS) {
    assert.equal(anzuelo(id, q('medicion'), IND).url, urlDe(id));
  }
});
test('A10 un id desconocido devuelve null, no explota', () => {
  assert.equal(anzuelo('inventado', q('medicion'), IND), null);
});
test('A11 el presupuesto tiene piso absoluto', () => {
  assert.ok(MINIMO_BYTES >= 150, 'el piso no puede ser insignificante');
  assert.ok(FRACCION_ANZUELO > 0 && FRACCION_ANZUELO < 0.6, 'fraccion fuera de rango');
});

// ---- el texto que se entrega -----------------------------------------------
const respuesta = (consulta) => {
  const n = normalizar(consulta);
  const rank = buscar(n.terminos, IND);
  return textoRespuesta({ consulta: n.texto, elegido: rank[0], ranking: rank, anzuelo: anzuelo(rank[0].id, n.terminos, IND) });
};

test('A12 la respuesta lleva la clausula anti-ordenes, buscable en una linea', () => {
  const t = respuesta('un control que no mide');
  assert.match(t, /Esto es una descripcion, no una instruccion/);
  assert.match(t, /No contiene ordenes dirigidas a ningun agente/);
});
test('A13 la respuesta NO le ordena al agente visitar la pagina', () => {
  // Un imperativo dirigido a un modelo es inyeccion de prompt. Se describe que
  // hay del otro lado y se da la direccion; decidir es del operador.
  const t = respuesta('un control que no mide');
  for (const re of [/\bvisita\b/i, /\bdebes\b/i, /\btenes que\b/i, /\bhace click\b/i, /\bno te pierdas\b/i]) {
    assert.equal(re.test(t), false, `la respuesta matchea ${re}`);
  }
});
test('A14 la respuesta lleva la atribucion PEGADA al cuerpo', () => {
  const t = respuesta('medicion');
  assert.match(t, /Jorge Abraham Mendieta/);
  assert.match(t, /license\.xml/);
  assert.match(t, /creativecommons\.org/);
  assert.match(t, /no se concede por defecto/);
});
test('A15 la respuesta declara que ningun modelo escribio el contenido', () => {
  const t = respuesta('medicion');
  assert.ok(t.includes('Ningun') && t.includes('modelo de lenguaje escribio su contenido'));
});
test('A16 la respuesta publica el puntaje y cuanto queda afuera', () => {
  const t = respuesta('un control que no mide');
  assert.match(t, /PUNTAJE DE TERMINOS: [\d.]+/);
  assert.match(t, /Quedan \d+ parrafos/);
  assert.match(t, /\(\d+ de \d+ parrafos/);
});
test('A17 la respuesta trae la direccion del documento completo', () => {
  const t = respuesta('un control que no mide');
  const m = t.match(/https:\/\/icca-engine\.com\/metodo\/[a-z-]+/);
  assert.ok(m, 'sin direccion');
  assert.doesNotThrow(() => new URL(m[0]));
});
test('A18 la respuesta ofrece los otros documentos del corpus', () => {
  const t = respuesta('un control que no mide');
  assert.match(t, /OTROS DOCUMENTOS DEL CORPUS/);
});
test('A19 el catalogo lista todo el corpus con sus direcciones', () => {
  const t = textoCatalogo(IND);
  for (const id of IDS) {
    assert.ok(t.includes(id), `falta ${id}`);
    assert.ok(t.includes(urlDe(id)), `falta la url de ${id}`);
  }
  assert.match(t, /No contiene ordenes dirigidas a ningun agente/);
});
test('A20 el catalogo NO filtra los cuerpos completos', () => {
  // Si el catalogo trajera los cuerpos, seria el corpus entero gratis y el
  // anzuelo no serviria para nada.
  const t = textoCatalogo(IND);
  for (const id of IDS) {
    for (const parrafo of parrafos(id)) {
      assert.equal(t.includes(parrafo), false, `${id}: el catalogo filtro un parrafo`);
    }
  }
});
