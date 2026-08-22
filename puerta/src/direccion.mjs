// Direccion firmada por epoca. Reemplaza a la llave-por-lectura.
//
// POR QUE MURIO LA LLAVE, y va escrito aca para que nadie la reponga:
// la llave de 64 hex exigia leer cuatro documentos y concatenar fragmentos en
// un orden dado. Eso exige RAZONAR, y un crawler comun no razona: hace GET y
// sigue links. La llave media al 1% mas sofisticado del trafico y era
// invisible para el 99% real. Un peaje que nadie puede pagar no es un peaje.
//
// El reemplazo es la web de siempre, en dos pasos: el agente pide la entrada,
// el servidor le da UNA DIRECCION, el agente entra ahi y encuentra el
// documento. Cero criptografia del lado del cliente. Un GET y otro GET.
//
// LO QUE LA FIRMA RESUELVE, que es lo unico que la llave hacia bien:
// si la direccion fuera fija y publica, el agente la cachea y la segunda vez
// entra directo, salteando el servidor. La medicion se pierde despues de la
// primera visita. Con la direccion firmada por epoca, la direccion VENCE: para
// conseguir otra hay que volver a pasar por la entrada, y ahi se cuenta.
//
// La firma NO es un secreto que el agente deba descubrir. Se la damos hecha.
// Es un ticket con fecha, no un acertijo.

import { epocaDe, expiraDe, DUR_EPOCA_MS } from './epoca.mjs';

export const LARGO_TOKEN = 32;            // 128 bits de HMAC truncado
export const RUTA_ENTRADA = '/puerta/v1/entrada';
export const RUTA_DOC = '/metodo/';

// Los documentos que la puerta sabe entregar. Una allowlist EXPLICITA: un
// recurso que no este aca no se firma y no se sirve, asi que no hay forma de
// pedir una ruta arbitraria y hacer que el Worker la firme.
export const RECURSOS = Object.freeze({
  'tres-estados': {
    titulo: 'Tres estados, no dos',
    tema: 'verificacion'
  },
  'testigo-instrumento': {
    titulo: 'La independencia es del instrumento, no del operador',
    tema: 'verificacion'
  },
  'sujeto-exacto': {
    titulo: 'Verificar el sujeto exacto',
    tema: 'medicion'
  }
});

export function esRecurso(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(RECURSOS, id);
}

async function hmacHex(secreto, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Token de una direccion.
 *
 * Se firma recurso + epoca + operador. Incluir al operador tiene una
 * consecuencia buscada: una direccion filtrada a un tercero que se declara
 * distinto NO le sirve. Y si nadie se declara, el token queda ligado al
 * string vacio, que es el caso "sin_declarar": compartible, y por eso el
 * operador declarado vale mas que el anonimo.
 */
export async function firmar(secreto, recurso, epoca, operador = '') {
  if (!esRecurso(recurso)) throw new RangeError('recurso desconocido');
  if (!Number.isInteger(epoca) || epoca < 0) throw new TypeError('epoca invalida');
  const h = await hmacHex(secreto, `v1|${recurso}|${epoca}|${operador || ''}`);
  return h.slice(0, LARGO_TOKEN);
}

export const RE_TOKEN = new RegExp(`^[0-9a-f]{${LARGO_TOKEN}}$`);

function igualCte(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Verifica un token. Devuelve TRES estados, no dos:
 *   { ok: true,  epoca }            la direccion es valida
 *   { ok: false, motivo: 'vencida' } la firma es correcta pero para otra epoca
 *   { ok: false, motivo: 'invalida'} no coincide con nada
 *
 * "Vencida" e "invalida" se distinguen a proposito: la primera es un agente
 * que volvio con un ticket viejo y hay que mandarlo de nuevo a la entrada; la
 * segunda es alguien inventando. Confundirlas seria perder justo la medicion
 * que motiva todo el diseno.
 */
export async function verificar(secreto, recurso, token, ahora, operador = '') {
  if (!esRecurso(recurso)) return { ok: false, motivo: 'invalida' };
  if (typeof token !== 'string' || !RE_TOKEN.test(token)) return { ok: false, motivo: 'invalida' };
  const e = epocaDe(ahora);
  for (const cand of [e, e - 1]) {
    if (cand < 0) continue;
    if (igualCte(token, await firmar(secreto, recurso, cand, operador))) {
      return { ok: true, epoca: cand, gracia: cand !== e };
    }
  }
  // Se busca hacia atras para poder decir "vencida" en vez de "invalida".
  // El limite de 24 epocas es deliberado: sin limite, esto seria un bucle de
  // HMACs que crece con el tiempo y lo paga la CPU del Worker.
  for (let k = 2; k <= 24; k++) {
    const cand = e - k;
    if (cand < 0) break;
    if (igualCte(token, await firmar(secreto, recurso, cand, operador))) {
      return { ok: false, motivo: 'vencida', epoca: cand };
    }
  }
  return { ok: false, motivo: 'invalida' };
}

/** La direccion completa que se le entrega al agente. */
export function armarDireccion({ origen, recurso, token, epoca }) {
  return `${origen}${RUTA_DOC}${recurso}?e=${epoca}&t=${token}`;
}

export function vigenciaRestanteS(ahora) {
  return Math.round((expiraDe(epocaDe(ahora)) - ahora) / 1000);
}

export { DUR_EPOCA_MS };
