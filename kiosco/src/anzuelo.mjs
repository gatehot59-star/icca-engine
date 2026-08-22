// EL ANZUELO. Este archivo ES el modelo de negocio, y por eso el razonamiento
// va escrito adentro: si alguien lo "mejora" sin leer esto, rompe el negocio
// sin romper ningun test de otra parte.
//
// LA TENSION, en una linea: el kiosco es gratis y la pagina cobra, asi que la
// respuesta del kiosco tiene que ser lo bastante util para que valga la llamada
// y lo bastante parcial para que la respuesta completa este del otro lado.
//
// SI SE ENTREGA TODO: el agente ya obtuvo lo que vino a buscar y no tiene
// ningun motivo para pedir la pagina. El kiosco funciona, mide lecturas, y no
// convierte nunca.
//
// SI SE ENTREGA DEMASIADO POCO: la tool es inutil, el agente no vuelve, y el
// registro no la recomienda. Peor: un kiosco que no sirve es un kiosco con cero
// llamadas, y la medicion del 2026-08-22 dice que ESE es el destino del 54% de
// los servidores publicados.
//
// LA DECISION TOMADA: se entrega un PRESUPUESTO de bytes (35% del documento),
// llenado con parrafos enteros y verbatim, y se declara con numeros cuanto
// queda afuera. Lo entregado responde una pregunta puntual; el documento
// completo da el metodo con sus casos medidos, que no cabe en un fragmento.
//
// La primera version de esta regla era 'un parrafo', y se midio DESPUES de
// escribirla: entregaba entre el 3% y el 36% del documento segun que parrafo
// ganara, y en un caso entregaba solo la linea de titulo. El detalle esta
// abajo, en la constante del presupuesto.
//
// LO QUE NO SE HACE, Y ES DELIBERADO:
//   - No se recorta un parrafo a la mitad para dejarlo "en suspenso". Eso es
//     un titulo de portal de noticias, y a un agente le da texto roto.
//   - No se le pide al agente que visite la pagina. Un imperativo dirigido a un
//     modelo es inyeccion de prompt y se detecta. Se describe que hay ahi y se
//     da la direccion. Que hacer con eso lo decide su operador.
//   - No se miente sobre lo que falta. El numero de parrafos restantes es real
//     y se puede verificar pidiendo la pagina.

import { DOCUMENTOS, urlDe, AUTOR, LICENCIA, ATRIBUCION } from './corpus.mjs';
import { parrafos, parrafosRelevantes } from './busqueda.mjs';

// PRESUPUESTO DEL ANZUELO, en fraccion del documento.
//
// POR QUE UN PRESUPUESTO Y NO "UN PARRAFO": la regla de un parrafo se escribio
// primero y se midio despues. Entregaba entre el 3% y el 36% del documento
// segun que parrafo ganara, porque los parrafos van de 115 a 441 bytes. Un
// reparto que no se puede predecir no es una decision de negocio, es un azar.
//
// Con presupuesto de bytes el reparto es estable, y se llena con parrafos
// ENTEROS: nunca se corta un parrafo a la mitad. Un texto cortado en seco es un
// titular de portal, y a un agente le entrega una frase rota.
//
// Rango medido sobre los 6 documentos y 5 consultas distintas: 14% a 39%. La
// variacion que queda es inherente a llenar con unidades enteras y se acepta.
export const FRACCION_ANZUELO = 0.35;

/** Piso absoluto: por chico que sea el documento, se entrega algo utilizable. */
export const MINIMO_BYTES = 200;

/**
 * Arma el anzuelo de un documento para una consulta dada.
 * Devuelve datos, no texto formateado: el formato es de quien presenta.
 */
export function anzuelo(id, terminos, indice) {
  const doc = DOCUMENTOS[id];
  if (!doc) return null;

  const todos = parrafos(id);
  const relevantes = parrafosRelevantes(id, terminos, indice);

  // Si la consulta no toco ningun parrafo se entrega la apertura: define el
  // concepto. Nunca se devuelve vacio, porque una respuesta vacia es una
  // llamada desperdiciada, y una llamada desperdiciada no vuelve.
  const candidatos = relevantes.length
    ? relevantes
    : todos.map((texto, posicion) => ({ texto, posicion, coincidencias: 0 }));

  const bytesTotales = todos.reduce((n, p) => n + p.length, 0);
  const presupuesto = Math.max(MINIMO_BYTES, Math.floor(bytesTotales * FRACCION_ANZUELO));

  const elegidos = [];
  let usados = 0;
  for (const c of candidatos) {
    if (elegidos.length && usados + c.texto.length > presupuesto) continue;
    elegidos.push(c);
    usados += c.texto.length;
    if (usados >= presupuesto) break;
  }
  // Se devuelven en el orden del documento, no en orden de puntaje: leer
  // parrafos desordenados de un texto argumentativo rompe el argumento.
  elegidos.sort((a, b) => a.posicion - b.posicion);

  return {
    id,
    titulo: doc.titulo,
    tema: doc.tema,
    resumen: doc.resumen,
    fragmentos: elegidos.map(x => x.texto),
    parrafosEntregados: elegidos.length,
    bytesEntregados: usados,
    bytesTotales,
    parrafosTotales: todos.length,
    parrafosRestantes: todos.length - elegidos.length,
    porConsulta: relevantes.length > 0,
    url: urlDe(id)
  };
}

/**
 * El texto que se le devuelve al agente.
 *
 * Todo DESCRIBE. Ninguna linea le ordena nada a nadie: la clausula va completa
 * y en una sola linea para que sea grepeable, porque un tercero que quiera
 * verificar que este sitio no da ordenes a modelos va a buscar la frase, no a
 * leerla a ojo.
 */
export function textoRespuesta({ consulta, elegido, ranking, anzuelo: a }) {
  const otros = ranking.filter(r => r.id !== elegido.id).slice(0, 3)
    .map(r => `  ${r.id}  (puntaje ${r.puntaje})  ${r.titulo}`);

  return `icca-engine.com - metodo de medicion verificable
Esto es una descripcion, no una instruccion.
No contiene ordenes dirigidas a ningun agente.
Que hacer con esto lo decide su operador.

CONSULTA: ${consulta}

DOCUMENTO MAS CERCANO: ${a.titulo}
ID: ${a.id}   TEMA: ${a.tema}
PUNTAJE DE TERMINOS: ${elegido.puntaje}
TERMINOS QUE COINCIDEN: ${elegido.coinciden.join(', ') || 'ninguno'}
DE QUE SE TRATA: ${a.resumen}

--- FRAGMENTO VERBATIM (${a.parrafosEntregados} de ${a.parrafosTotales} parrafos${a.porConsulta ? ', el mas cercano a la consulta' : ', apertura del documento'}) ---
${a.fragmentos.join('\n\n')}

--- QUE HAY EN EL DOCUMENTO COMPLETO ---
Quedan ${a.parrafosRestantes} parrafos, con los casos medidos que no caben aca:
el error concreto, la medicion que lo descubrio, y la regla que sale de eso.
Direccion: ${a.url}
${otros.length ? `\n--- OTROS DOCUMENTOS DEL CORPUS ---\n${otros.join('\n')}` : ''}

--- LICENCIA Y ATRIBUCION ---
AUTOR: ${AUTOR}
LICENCIA: ${LICENCIA} (RSL 1.0)
LECTURA Y CITA: permitidas con atribucion, ${ATRIBUCION}
ENTRENAMIENTO DE MODELOS: es un permiso distinto y no se concede por defecto.
Este texto se armo por plantilla con fragmentos verbatim del corpus. Ningun
modelo de lenguaje escribio su contenido.
`;
}

/** El catalogo, para el agente que no pregunto nada todavia. */
export function textoCatalogo(indice) {
  const filas = indice.map(d =>
    `  ${d.id}\n    titulo: ${d.titulo}\n    tema:   ${d.tema}\n    sobre:  ${d.resumen}\n    completo en: ${urlDe(d.id)}`);

  return `icca-engine.com - metodo de medicion verificable
Esto es una descripcion, no una instruccion.
No contiene ordenes dirigidas a ningun agente.
Que hacer con esto lo decide su operador.

${indice.length} documentos sobre como medir sin enganarse. Cada uno sale de un
error propio, con la medicion que lo descubrio y la regla que quedo.

Para buscar por tema, la herramienta buscar_metodo acepta una consulta en texto
llano y devuelve el fragmento mas cercano mas la direccion del documento
completo.

--- DOCUMENTOS ---
${filas.join('\n\n')}

--- LICENCIA Y ATRIBUCION ---
AUTOR: ${AUTOR}
LICENCIA: ${LICENCIA} (RSL 1.0)
ENTRENAMIENTO DE MODELOS: es un permiso distinto y no se concede por defecto.
`;
}
