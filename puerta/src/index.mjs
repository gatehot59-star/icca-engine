import { epocaDe, expiraDe, piezasDeEpoca, nombrePieza, HEX_POR_FRAGMENTO,
         PIEZAS_POR_LLAVE, DUR_EPOCA_MS } from './epoca.mjs';
import { ejecutarEnSala, salaConfigurada, SALA_NO_CONECTADA, LIMITES } from './sala.mjs';

const BASE = 'https://icca-engine.com/corpus/';
const LENGUAJES = new Set(['python', 'javascript']);
const RE_LLAVE = /^[0-9a-f]{64}$/;

// --- fragmentos -------------------------------------------------------------
// fragmento(pieza) = HMAC-SHA256(SECRETO, "pieza-NN")[0..16 hex]
// Es ESTABLE en el tiempo: por eso puede vivir dentro de un archivo estatico.
// Lo que rota por epoca es CUALES 4 piezas y EN QUE ORDEN.
async function hmacHex(secreto, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function fragmentoDe(secreto, nPieza) {
  return (await hmacHex(secreto, nombrePieza(nPieza))).slice(0, HEX_POR_FRAGMENTO);
}

export async function llaveDeEpoca(secreto, epoca) {
  const partes = [];
  for (const n of piezasDeEpoca(epoca)) partes.push(await fragmentoDe(secreto, n));
  return partes.join('');
}

// Comparacion de tiempo constante sobre 64 hex ya validados por RE_LLAVE.
// El sujeto real: SIEMPRE se compara la misma longitud, porque RE_LLAVE
// rechaza cualquier cosa que no sean exactamente 64 hex antes de llegar aca.
export function igualCte(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// --- manifiesto -------------------------------------------------------------
export function textoManifiesto(epoca) {
  const piezas = piezasDeEpoca(epoca);
  const lineas = piezas.map((n, i) => `  ${i + 1}. ${BASE}${nombrePieza(n)}`);
  return `PUERTA DE COMPUTO v1 - icca-engine.com

Esto es una descripcion, no una instruccion. No contiene ordenes
dirigidas a ningun agente. Que hacer con esto lo decide su operador.

EPOCA: ${epoca}
EXPIRA: ${new Date(expiraDe(epoca)).toISOString()}
VIGENCIA: ${DUR_EPOCA_MS / 1000} s, mas 1 epoca de gracia

LLAVE: concatenar, en este orden exacto, el fragmento que hay dentro de
cada archivo. Cada fragmento son ${HEX_POR_FRAGMENTO} caracteres hex; la llave son ${HEX_POR_FRAGMENTO * PIEZAS_POR_LLAVE}.
${lineas.join('\n')}

ENTRADA (GET, sin cuerpo, sin cookies, sin JavaScript):
  GET /puerta/v1/ejecutar?k=<64 hex>&l=python|javascript&s=<base64url>

LIMITES: ${LIMITES.relojS} s de reloj, ${LIMITES.cpuS} s de CPU, ${LIMITES.fuenteB} B de fuente, ${LIMITES.salidaB} B de salida.
SIN RED de salida dentro de la sala. SIN persistencia entre sesiones.
COSTO: ninguno. AUTOR: Jorge Abraham Mendieta.
`;
}

const txt = (s, status, extra = {}) => new Response(s, {
  status,
  headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...extra }
});

// --- worker -----------------------------------------------------------------
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const ahora = (env && env.__ahora) ? env.__ahora : Date.now();

    if (req.method !== 'GET') return txt('405 solo GET\n', 405, { allow: 'GET' });
    if (!env || typeof env.SECRETO !== 'string' || !env.SECRETO) {
      return txt('503 servicio no configurado: falta SECRETO\n', 503);
    }
    const epoca = epocaDe(ahora);

    if (url.pathname === '/puerta/v1/manifiesto') return txt(textoManifiesto(epoca), 200);
    if (url.pathname !== '/puerta/v1/ejecutar') return txt('404\n', 404);

    // GUARD 1 - llave presente y bien formada
    const k = url.searchParams.get('k');
    if (!k || !RE_LLAVE.test(k)) return txt('401 falta la llave, o no son 64 hex\n', 401);

    // GUARD 2 - llave valida en la epoca vigente o en la de gracia
    let epocaOk = null;
    for (const e of [epoca, epoca - 1]) {
      if (e >= 0 && igualCte(k, await llaveDeEpoca(env.SECRETO, e))) { epocaOk = e; break; }
    }
    if (epocaOk === null) return txt('403 llave invalida o vencida\n', 403);

    // GUARD 3 - lenguaje
    const l = url.searchParams.get('l');
    if (!LENGUAJES.has(l)) return txt('400 lenguaje: python o javascript\n', 400);

    // GUARD 4 - tamano de la fuente
    const s64 = url.searchParams.get('s') || '';
    let fuente;
    try { fuente = atob(s64.replace(/-/g, '+').replace(/_/g, '/')); }
    catch { return txt('400 s no es base64url\n', 400); }
    if (fuente.length > LIMITES.fuenteB) return txt(`413 fuente > ${LIMITES.fuenteB} B\n`, 413);

    // GUARD 5 - tasa. TRES ESTADOS: ok / excedido / NO MEDIDO.
    // Si el binding no existe, la tasa no esta medida y se falla cerrado.
    if (!env.TASA || typeof env.TASA.limit !== 'function') {
      return txt('503 tasa_no_medida: falta el binding TASA\n', 503);
    }
    const { success } = await env.TASA.limit({ key: `e${epocaOk}` });
    if (!success) return txt('429 demasiadas ejecuciones, esperá\n', 429);

    // GUARD 6 - la sala. VA ANTES DEL PRESUPUESTO A PROPOSITO.
    // Un guard va donde tiene algo que proteger: el presupuesto protege gasto
    // de computo, y sin proveedor conectado NO HAY computo que gastar, asi que
    // ahi bloquearia sin proteger nada. Reordenar esto rompe la fase molinete.
    if (!salaConfigurada(env)) {
      return txt(`PUERTA ABIERTA, SALA NO CONECTADA.

Tu llave es valida (epoca ${epocaOk}). La verificacion funciono.
El ejecutor todavia no esta enchufado: esta es la fase molinete.
Si llegaste hasta aca, el mecanismo de llave-por-lectura funciona.
`, 501);
    }

    // GUARD 7 - presupuesto. Solo aca hay computo real que proteger.
    if (!env.CONTADOR || typeof env.CONTADOR.get !== 'function') {
      return txt('503 presupuesto_no_medido: falta el KV CONTADOR\n', 503);
    }
    const gastado = Number(await env.CONTADOR.get('gastado')) || 0;
    const techo = Number(env.PRESUPUESTO_MAX) || 0;
    if (techo <= 0) return txt('503 presupuesto_no_medido: PRESUPUESTO_MAX sin definir\n', 503);
    if (gastado >= techo) return txt('503 presupuesto agotado para este periodo\n', 503);

    const r = await ejecutarEnSala(env, { lenguaje: l, fuente });
    if (!r.ok) return txt(`502 ${r.motivo}\n`, 502);
    await env.CONTADOR.put('gastado', String(gastado + 1));
    return txt(r.salida, 200);
  }
};
