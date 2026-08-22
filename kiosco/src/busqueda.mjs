// Busqueda determinista sobre el corpus. Cero dependencias, cero red, cero IA.
//
// POR QUE NO HAY MODELO ACA: si la unica via de responder fuera un modelo,
// entonces sin cuota o con el modelo caido el kiosco no responde nada. Esto es
// el piso: siempre corre, no cuesta, y da un resultado usable. Un modelo puede
// mejorar el orden mas adelante, nunca ser la condicion para que exista uno.

import { DOCUMENTOS, esDocumento } from './corpus.mjs';

export const LARGO_MAX_CONSULTA = 256;

// Comparacion por code point, NO por clase de caracteres en una regex.
// La version con regex se escribio una vez, se leia bien, y no protegia nada:
// los escapes unicode se corrompieron al escribir el archivo y el salto de
// linea pasaba limpio.
export function tieneControl(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || (c >= 127 && c <= 159)) return true;
  }
  return false;
}

const VACIAS = new Set([
  'a','al','ante','como','con','cual','cuales','cuando','de','del','desde','donde',
  'el','ella','ellas','ellos','en','entre','era','es','esa','ese','eso','esta',
  'estan','este','esto','hay','la','las','le','les','lo','los','mas','me','mi',
  'muy','no','o','para','por','porque','que','se','si','sin','sobre','su','sus',
  'te','tiene','un','una','uno','y','ya','the','of','to','and','is','in','for',
  'on','it','how','what','why','does','do','can','my'
]);

/** Quita tildes y baja a minusculas: "medicion" matchea "medicion". */
export function plegar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Normaliza la consulta. TRES ESTADOS, no dos:
 *   { estado: 'vacia' }                  no pregunto: es valido, se da el catalogo
 *   { estado: 'ok', texto, terminos }    pregunto algo usable
 *   { estado: 'rechazada', motivo }      no se puede procesar, y se dice por que
 *
 * "Vacia" y "rechazada" no se colapsan: la primera es un explorador mirando, la
 * segunda es una entrada rara. Juntarlas esconderia justo lo que hay que ver.
 */
export function normalizar(q) {
  if (q === null || q === undefined) return { estado: 'vacia' };
  if (typeof q !== 'string') return { estado: 'rechazada', motivo: 'tipo_invalido' };
  if (q.trim() === '') return { estado: 'vacia' };
  if (q.length > LARGO_MAX_CONSULTA) {
    return { estado: 'rechazada', motivo: `larga_${q.length}_max_${LARGO_MAX_CONSULTA}` };
  }
  if (tieneControl(q)) return { estado: 'rechazada', motivo: 'caracteres_de_control' };

  const texto = q.trim().replace(/\s+/g, ' ');
  const terminos = [...new Set(
    plegar(texto).split(/[^a-z0-9n]+/).filter(t => t.length >= 3 && !VACIAS.has(t))
  )];
  if (terminos.length === 0) return { estado: 'rechazada', motivo: 'sin_terminos_utiles' };
  return { estado: 'ok', texto, terminos };
}

/**
 * Parrafos de contenido de un documento, en orden.
 *
 * SE EXCLUYE LA LINEA DE TITULO, y no es cosmetica: medido el 2026-08-22, esa
 * linea (43 a 53 bytes, en mayusculas) ganaba la seleccion del anzuelo en un
 * documento y le entregaba al agente un titular y nada mas. Ademas el titulo ya
 * viaja en su propio campo, asi que como fragmento es una repeticion.
 */
export function parrafos(id) {
  if (!esDocumento(id)) return [];
  const todos = DOCUMENTOS[id].cuerpo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const primero = todos[0] || '';
  const esTitulo = primero.length <= 80 && primero === primero.toUpperCase();
  return esTitulo ? todos.slice(1) : todos;
}

/** Indice en memoria. Se arma una vez por instancia: es determinista. */
export function construirIndice() {
  return Object.entries(DOCUMENTOS).map(([id, d]) => {
    const frec = new Map();
    const texto = plegar(`${d.titulo} ${d.tema} ${d.resumen} ${d.cuerpo}`);
    for (const t of texto.split(/[^a-z0-9n]+/)) {
      if (t.length >= 3 && !VACIAS.has(t)) frec.set(t, (frec.get(t) || 0) + 1);
    }
    return { id, titulo: d.titulo, tema: d.tema, resumen: d.resumen, frec, parrafos: parrafos(id) };
  });
}

/**
 * Ordena el corpus por solapamiento con los terminos.
 * El puntaje va EXPUESTO: un ranking sin puntaje no se puede discutir, y quien
 * recibe la respuesta tiene que poder auditarla sin creernos.
 */
export function buscar(terminos, indice) {
  const res = indice.map(doc => {
    let puntaje = 0;
    const coinciden = [];
    for (const t of terminos) {
      const f = doc.frec.get(t) || 0;
      if (f > 0) { puntaje += 1 + Math.log(f); coinciden.push(t); }
      else {
        for (const [k] of doc.frec) {
          if (k.startsWith(t) || t.startsWith(k)) { puntaje += 0.4; coinciden.push(k); break; }
        }
      }
    }
    return {
      id: doc.id, titulo: doc.titulo, tema: doc.tema, resumen: doc.resumen,
      puntaje: Number(puntaje.toFixed(3)), coinciden
    };
  });
  res.sort((a, b) => b.puntaje - a.puntaje || a.id.localeCompare(b.id));
  return res;
}

/** Los parrafos que mas terminos contienen, con su posicion en el documento. */
export function parrafosRelevantes(id, terminos, indice) {
  const doc = indice.find(d => d.id === id);
  if (!doc) return [];
  return doc.parrafos
    .map((p, i) => {
      const pp = plegar(p);
      let n = 0;
      for (const t of terminos) if (pp.includes(t)) n++;
      return { texto: p, posicion: i, coincidencias: n };
    })
    .filter(x => x.coincidencias > 0)
    .sort((a, b) => b.coincidencias - a.coincidencias || a.posicion - b.posicion);
}
