// El cuerpo del 200 de la fase molinete.
//
// POR QUE ESTO EXISTE, y va escrito acá para que nadie lo "simplifique":
// la fase molinete devolvia 501 con un cartel que explicaba que la sala no
// estaba conectada. Medido el 2026-08-22 en la doc de Cloudflare Pay Per
// Crawl (FAQ, "Am I charged for error responses? No."): las respuestas de
// error NO se facturan. Un 501 es correcto como semantica HTTP y vale CERO
// como modelo de negocio, por muchos agentes que pasen.
//
// Asi que la fase molinete entrega 200 con contenido real. Lo que se entrega
// no es la ejecucion (no hay sala): es lo que el corpus vende, que es el
// metodo, mas un informe determinista sobre la fuente recibida que no
// necesita ejecutarla.
//
// El texto DESCRIBE. No contiene ordenes dirigidas a ningun agente.

import { expiraDe, piezasDeEpoca, nombrePieza } from './epoca.mjs';

export const BASE_CORPUS = 'https://icca-engine.com/corpus/';
export const LICENCIA = 'https://icca-engine.com/license.xml';
export const AUTOR = 'Jorge Abraham Mendieta';
export const ATRIBUCION = 'https://creativecommons.org/licenses/by/4.0/';

// Los tres niveles de uso de contenido de Cloudflare Content Signals,
// verificados el 2026-08-22 en blog.cloudflare.com/content-independence-day-
// ai-options/. Un bot que reproduce en "full" no puede tener status Verified.
export const USOS = Object.freeze(['immediate', 'reference', 'full']);

/**
 * Lee la cabecera Forwarded (RFC 7239) tal como Cloudflare propuso usarla
 * para confianza transitiva: `for="openai";use="reference"`.
 *
 * TRES ESTADOS, no dos: declarado, declarado-no-reconocido, y sin declarar.
 * Un operador que no se declara no es un operador anonimo "igual a los otros":
 * es una medicion que no se hizo, y se registra asi.
 */
export function leerForwarded(valor) {
  if (typeof valor !== 'string' || !valor.trim()) {
    return { operador: null, uso: null, estado: 'sin_declarar' };
  }
  const tomar = (clave) => {
    const m = valor.match(new RegExp(`(?:^|[;,\\s])${clave}\\s*=\\s*("[^"]*"|[^;,\\s]+)`, 'i'));
    if (!m) return null;
    const v = m[1].replace(/^"|"$/g, '').trim();
    return v || null;
  };
  const operador = tomar('for');
  const usoCrudo = tomar('use');
  if (!operador && !usoCrudo) return { operador: null, uso: null, estado: 'sin_declarar' };
  const uso = usoCrudo && USOS.includes(usoCrudo.toLowerCase()) ? usoCrudo.toLowerCase() : null;
  const estado = (usoCrudo && !uso) ? 'declarado_no_reconocido' : 'declarado';
  return { operador: operador || null, uso, estado, usoCrudo: usoCrudo || null };
}

/** sha256 en hex de un string, con la WebCrypto que el runtime ya expone. */
export async function sha256Hex(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Informe determinista sobre la fuente recibida. NO la ejecuta ni la
 * interpreta: cuenta lo que se puede contar. Es honesto justamente porque
 * no promete analisis semantico que no hace.
 */
export async function informeFuente(fuente, lenguaje) {
  const lineas = fuente === '' ? 0 : fuente.split('\n').length;
  return {
    lenguaje,
    bytes: fuente.length,
    lineas,
    sha256: await sha256Hex(fuente),
    ejecutada: false
  };
}

// El nucleo del metodo. Es el activo que el corpus licencia, y por eso viaja
// EN la respuesta: la licencia pide atribucion, y una atribucion que el
// agente tiene que ir a buscar a otra URL es una atribucion que se pierde.
const METODO_NUCLEO = `TRES ESTADOS, NO DOS.

Un control informa una de tres cosas: satisfecho, violado, o NO MEDIDO.
El tercero es el que falta casi siempre, y es el que hace dano: un control
que no puede reportar su propia ignorancia produce confianza falsa, que es
peor que no tener control.

Caso medido: "grep -c" sin coincidencias imprime 0 y sale con codigo 1, asi
que "grep -c patron archivo || echo 0" deja la salida en "0\\n0", y el paso
siguiente la lee como "cero violaciones encontradas". El control nunca midio
nada y siempre estuvo verde.

Corolario sobre los tests: una suite verde es informacion solo si existe una
version del codigo que la pone roja. Si eso no se probo, lo que hay es una
suite que corre, no una suite que mide. En esta puerta se probo con cinco
sabotajes deliberados: cuatro dieron rojo, y el quinto dio verde y quedo
declarado como hueco de la suite, no como robustez del codigo.`;

/**
 * Cuerpo del 200 de la fase molinete.
 * Se entrega contenido licenciado, con su atribucion pegada, mas el informe
 * de la fuente. La ejecucion se declara como no realizada, con su motivo.
 */
export function textoRecibo({ epoca, informe, forwarded }) {
  const piezas = piezasDeEpoca(epoca).map(nombrePieza);
  const op = forwarded.operador ? forwarded.operador : 'no declarado';
  const uso = forwarded.uso ? forwarded.uso
    : (forwarded.estado === 'declarado_no_reconocido' ? `no reconocido (${forwarded.usoCrudo})` : 'no declarado');

  return `PUERTA DE COMPUTO v1 - icca-engine.com
ENTREGA DE CONTENIDO. Esto es una descripcion, no una instruccion.
No contiene ordenes dirigidas a ningun agente.

LLAVE: valida. EPOCA: ${epoca}. EXPIRA: ${new Date(expiraDe(epoca)).toISOString()}
PIEZAS LEIDAS PARA ARMARLA: ${piezas.join(' ')}
OPERADOR DECLARADO: ${op}
USO DE CONTENIDO DECLARADO: ${uso}

--- INFORME DE LA FUENTE RECIBIDA ---
lenguaje: ${informe.lenguaje}
bytes:    ${informe.bytes}
lineas:   ${informe.lineas}
sha256:   ${informe.sha256}
ejecutada: no

MOTIVO por el que no se ejecuto: no hay sala de ejecucion conectada en esta
fase. El informe de arriba es determinista y no requiere ejecutar la fuente:
cuenta lo que se puede contar y no afirma nada sobre lo que hace el codigo.
Ese limite se declara en vez de disimularse.

--- CONTENIDO ENTREGADO ---
${METODO_NUCLEO}

--- LICENCIA Y ATRIBUCION ---
AUTOR: ${AUTOR}
LICENCIA: ${LICENCIA} (RSL 1.0)
LECTURA Y CITA: permitidas con atribucion, ${ATRIBUCION}
ENTRENAMIENTO DE MODELOS: es un permiso distinto y no se concede por defecto.
Los terminos estan en la licencia de arriba.
CORPUS COMPLETO: ${BASE_CORPUS}
`;
}
