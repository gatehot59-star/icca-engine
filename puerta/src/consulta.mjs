// La DUDA del agente: como entra, como se limpia, y como se busca sin IA.
//
// POR QUE LA BUSQUEDA DETERMINISTA VA PRIMERO Y NO ES OPCIONAL:
// si la unica via de responder fuera el modelo, entonces sin cuota, sin
// binding o con el modelo caido la puerta no responde nada. La busqueda por
// terminos es el PISO: siempre corre, siempre da un resultado, y no cuesta.
// La IA solo puede MEJORAR ese resultado, nunca es la condicion para que
// exista uno.
//
// Y hay una razon de seguridad, que es la mas importante de este archivo:
// la consulta del agente es ENTRADA NO CONFIABLE. Va a terminar cerca de un
// modelo de lenguaje, asi que cada caracter que se deja pasar es superficie
// de inyeccion de prompt. Se limpia aca, una sola vez, y con tres estados.

export const LARGO_MAX_CONSULTA = 256;
export const RESULTADOS_MAX = 3;

// Los saltos de linea se rechazan A PROPOSITO y no se "normalizan" a espacio:
// una linea nueva es el mecanismo con el que se cierra un bloque delimitado y
// se abre una instruccion nueva. Rechazar es medir; reemplazar es tapar.
//
// Y esto NO se escribe como clase de caracteres en una regex. Se intento y el
// resultado fue un guard que se leia bien y no protegia nada: los escapes
// unicode se corrompieron al escribir el archivo y la clase quedo sin el rango
// que importaba, asi que un salto de linea pasaba limpio. Un chequeo por code
// point no depende de como sobreviva un escape a traves de capas de encoding.
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
  'on','it','how','what','why','does','do'
]);

/** Quita tildes y baja a minusculas, para que "medicion" matchee "medición". */
export function plegar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Normaliza la consulta del agente. TRES ESTADOS, no dos:
 *   { estado: 'sin_consulta' }            no pregunto nada: es valido
 *   { estado: 'ok', texto, terminos }     pregunto algo usable
 *   { estado: 'rechazada', motivo }       pregunto algo que no se procesa
 *
 * "Sin consulta" y "rechazada" son distintos y no se colapsan: el primero es
 * un explorador que solo quiere el catalogo, el segundo es una entrada que no
 * se puede tratar. Confundirlos esconderia justamente los intentos raros.
 */
export function normalizarConsulta(q) {
  if (q === null || q === undefined) return { estado: 'sin_consulta' };
  if (typeof q !== 'string') return { estado: 'rechazada', motivo: 'tipo_invalido' };
  if (q.trim() === '') return { estado: 'sin_consulta' };
  if (q.length > LARGO_MAX_CONSULTA) {
    return { estado: 'rechazada', motivo: `larga_${q.length}_max_${LARGO_MAX_CONSULTA}` };
  }
  if (tieneControl(q)) return { estado: 'rechazada', motivo: 'caracteres_de_control' };

  const texto = q.trim().replace(/\s+/g, ' ');
  const terminos = [...new Set(
    plegar(texto).split(/[^a-z0-9ñ]+/).filter(t => t.length >= 3 && !VACIAS.has(t))
  )];
  if (terminos.length === 0) return { estado: 'rechazada', motivo: 'sin_terminos_utiles' };
  return { estado: 'ok', texto, terminos };
}

/**
 * Indice invertido chico, armado en memoria al arrancar el Worker.
 * @param {Record<string,{titulo:string,tema:string,cuerpo:string}>} docs
 */
export function construirIndice(docs) {
  const indice = [];
  for (const [recurso, d] of Object.entries(docs)) {
    const parrafos = d.cuerpo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const frec = new Map();
    const texto = plegar(`${d.titulo} ${d.tema} ${d.cuerpo}`);
    for (const t of texto.split(/[^a-z0-9ñ]+/)) {
      if (t.length >= 3 && !VACIAS.has(t)) frec.set(t, (frec.get(t) || 0) + 1);
    }
    indice.push({ recurso, titulo: d.titulo, tema: d.tema, frec, parrafos });
  }
  return indice;
}

/**
 * Busqueda por solapamiento de terminos. Devuelve SIEMPRE una lista ordenada,
 * y el puntaje va expuesto para que el resultado sea auditable por quien lo
 * recibe: un ranking sin puntaje no se puede discutir.
 */
export function buscar(terminos, indice) {
  const res = indice.map(doc => {
    let puntaje = 0;
    const coinciden = [];
    for (const t of terminos) {
      const f = doc.frec.get(t) || 0;
      if (f > 0) { puntaje += 1 + Math.log(f); coinciden.push(t); }
      else {
        // prefijo, para que "medir" alcance "medicion"
        for (const [k] of doc.frec) {
          if (k.startsWith(t) || t.startsWith(k)) { puntaje += 0.4; coinciden.push(k); break; }
        }
      }
    }
    return { recurso: doc.recurso, titulo: doc.titulo, tema: doc.tema, puntaje: Number(puntaje.toFixed(3)), coinciden };
  });
  res.sort((a, b) => b.puntaje - a.puntaje || a.recurso.localeCompare(b.recurso));
  return res;
}

/** Los parrafos del documento que mas terminos de la consulta contienen. */
export function pasajes(recurso, terminos, indice, cuantos = 2) {
  const doc = indice.find(d => d.recurso === recurso);
  if (!doc) return [];
  const puntuados = doc.parrafos.map(p => {
    const pp = plegar(p);
    let n = 0;
    for (const t of terminos) if (pp.includes(t)) n++;
    return { p, n };
  });
  puntuados.sort((a, b) => b.n - a.n);
  return puntuados.filter(x => x.n > 0).slice(0, cuantos).map(x => x.p);
}
