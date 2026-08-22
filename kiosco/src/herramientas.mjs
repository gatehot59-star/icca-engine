// Las herramientas del kiosco, como funciones PURAS.
//
// POR QUE SEPARADAS DEL CABLEADO MCP: el sandbox donde se escribe esto no tiene
// npm ni red, asi que no puede instalar el SDK de MCP. Si la logica viviera
// dentro del handler, no se podria correr ni un test propio y todo quedaria
// NO MEDIDO hasta el CI.
//
// Con la logica afuera: los tests locales prueban el comportamiento, y el CI
// (que si tiene red) prueba el protocolo. Cada instrumento mide lo que puede.

import { IDS, esDocumento, urlDe, DOCUMENTOS } from './corpus.mjs';
import { normalizar, construirIndice, buscar } from './busqueda.mjs';
import { anzuelo, textoRespuesta, textoCatalogo } from './anzuelo.mjs';

// El indice se arma UNA VEZ por instancia. Es determinista y no depende de la
// entrada, asi que rearmarlo por request seria trabajo repetido sin motivo.
const INDICE = construirIndice();

/** Envuelve texto en la forma que espera MCP. */
const texto = (t) => ({ content: [{ type: 'text', text: t }] });

/**
 * buscar_metodo(consulta) -> fragmento verbatim + direccion del documento.
 * TRES ESTADOS de la consulta, y los tres devuelven algo util:
 *   vacia     -> el catalogo completo
 *   ok        -> el anzuelo del documento mas cercano
 *   rechazada -> el catalogo, y el motivo del rechazo dicho en el cuerpo
 *
 * La consulta rechazada NO se refleja cruda en la salida. Si se reflejara, un
 * tercero podria hacer que el kiosco escriba lo que el quiera, y ese texto
 * viajaria con la atribucion del autor.
 */
export function buscarMetodo({ consulta } = {}) {
  const q = normalizar(consulta);

  if (q.estado === 'vacia') {
    return texto(`No vino ninguna consulta, asi que va el catalogo completo.

${textoCatalogo(INDICE)}`);
  }

  if (q.estado === 'rechazada') {
    return texto(`La consulta no se pudo procesar. Motivo: ${q.motivo}

Los motivos posibles son tres: mas de 256 caracteres, caracteres de control
(un salto de linea, por ejemplo), o ningun termino con al menos tres letras
fuera de las palabras vacias. Va el catalogo completo en su lugar.

${textoCatalogo(INDICE)}`);
  }

  const ranking = buscar(q.terminos, INDICE);
  const elegido = ranking[0];
  const a = anzuelo(elegido.id, q.terminos, INDICE);

  return texto(textoRespuesta({ consulta: q.texto, elegido, ranking, anzuelo: a }));
}

/** listar_metodo() -> el catalogo, sin consulta. */
export function listarMetodo() {
  return texto(textoCatalogo(INDICE));
}

/**
 * donde_esta(id) -> la direccion publica de un documento.
 *
 * Existe porque un agente que ya sabe que documento quiere no deberia tener que
 * inventar la URL ni adivinar el formato. Es un PUNTERO, no una entrega: nunca
 * devuelve el cuerpo, porque seria la via para saltearse el anzuelo.
 *
 * La allowlist es explicita: un id que no esta en el corpus devuelve la lista de
 * ids validos, no un error seco. Un error seco obliga al agente a adivinar.
 */
export function dondeEsta({ id } = {}) {
  if (!esDocumento(id)) {
    return texto(`No hay ningun documento con ese id.
Ids validos: ${IDS.join(', ')}`);
  }
  const d = DOCUMENTOS[id];
  return texto(`${d.titulo}
TEMA: ${d.tema}
SOBRE: ${d.resumen}
DIRECCION: ${urlDe(id)}`);
}

export const INDICE_PARA_TESTS = INDICE;
