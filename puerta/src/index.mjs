// Puerta de Computo v2 - icca-engine.com
//
// CAMBIO DE DISENO respecto de la v1, y el motivo va primero porque explica
// todo lo que sigue: la v1 exigia armar una llave de 64 hex leyendo cuatro
// documentos y concatenando fragmentos en orden. Eso exige razonar, y un
// crawler comun no razona: hace GET y sigue links. La v1 media al 1% mas
// sofisticado del trafico y era invisible para el 99% real.
//
// La v2 es la web de siempre, en dos GET:
//   GET /puerta/v1/entrada     -> 200 con contenido + direcciones firmadas
//   GET /metodo/<recurso>?e&t  -> 200 con el documento
//
// Ninguna de las dos pide criptografia del lado del cliente. La firma va
// incluida en la direccion que le damos hecha. Lo unico que la firma logra es
// que la direccion VENZA, para que la segunda visita tenga que volver a pasar
// por la entrada y se pueda contar.
//
// Y todo lo que se entrega sale con 200. Medido el 2026-08-22 en el FAQ de
// Cloudflare Pay Per Crawl: las respuestas de error NO se facturan. Un 4xx
// impecable en semantica HTTP vale cero.

import { epocaDe, expiraDe, DUR_EPOCA_MS } from './epoca.mjs';
import { leerForwarded } from './recibo.mjs';
import { ejecutarEnSala, salaConfigurada, LIMITES } from './sala.mjs';
import {
  RECURSOS, RUTA_ENTRADA, RUTA_DOC, esRecurso, firmar, verificar,
  armarDireccion, vigenciaRestanteS
} from './direccion.mjs';
import { documento, textoEntrada, LICENCIA } from './documentos.mjs';

const txt = (s, status, extra = {}) => new Response(s, {
  status,
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    link: `<${LICENCIA}>; rel="license"; type="application/rsl+xml"`,
    ...extra
  }
});

const cabecerasMedicion = (f, extra = {}) => ({
  'x-icca-operador': f.operador || 'sin_declarar',
  'x-icca-uso': f.uso || f.estado,
  ...extra
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const ahora = (env && env.__ahora) ? env.__ahora : Date.now();

    if (req.method !== 'GET') return txt('405 solo GET\n', 405, { allow: 'GET' });
    if (!env || typeof env.SECRETO !== 'string' || !env.SECRETO) {
      return txt('503 servicio no configurado: falta SECRETO\n', 503);
    }

    const epoca = epocaDe(ahora);
    const f = leerForwarded(req.headers.get('forwarded'));
    const operador = f.operador || '';

    // ---- PASO 1: la entrada -------------------------------------------------
    // Sin llave, sin parametros obligatorios, sin cabeceras obligatorias.
    // Cualquier explorador que haga un GET pasa. Eso es el punto del rediseno.
    if (url.pathname === RUTA_ENTRADA) {
      // GUARD - tasa. TRES ESTADOS: ok / excedido / NO MEDIDO.
      // Sin binding, la tasa no esta medida y se falla cerrado.
      if (!env.TASA || typeof env.TASA.limit !== 'function') {
        return txt('503 tasa_no_medida: falta el binding TASA\n', 503);
      }
      const { success } = await env.TASA.limit({ key: `entrada:${operador || 'anon'}` });
      if (!success) return txt('429 demasiados pedidos de entrada\n', 429);

      const origen = url.origin;
      const direcciones = [];
      for (const recurso of Object.keys(RECURSOS)) {
        const token = await firmar(env.SECRETO, recurso, epoca, operador);
        direcciones.push({ recurso, url: armarDireccion({ origen, recurso, token, epoca }) });
      }

      return txt(textoEntrada({
        epoca,
        expira: new Date(expiraDe(epoca)).toISOString(),
        vigenciaS: vigenciaRestanteS(ahora),
        direcciones,
        operador: f.operador || 'no declarado',
        uso: f.uso || (f.estado === 'declarado_no_reconocido' ? `no reconocido (${f.usoCrudo})` : 'no declarado')
      }), 200, cabecerasMedicion(f, {
        'x-icca-epoca': String(epoca),
        'x-icca-direcciones': String(direcciones.length)
      }));
    }

    // ---- PASO 2: el documento ----------------------------------------------
    if (url.pathname.startsWith(RUTA_DOC)) {
      const recurso = url.pathname.slice(RUTA_DOC.length);

      // Un recurso que no esta en la allowlist no existe. Se responde antes de
      // tocar el secreto: no hay forma de hacer que el Worker firme una ruta
      // arbitraria.
      if (!esRecurso(recurso)) {
        return txt(`404 documento desconocido. La entrada esta en ${RUTA_ENTRADA}\n`, 404);
      }

      const t = url.searchParams.get('t');
      const v = await verificar(env.SECRETO, recurso, t, ahora, operador);

      // "Vencida" e "invalida" NO se colapsan. La primera es un agente que
      // volvio con un ticket viejo, y es exactamente el evento que este diseno
      // existe para producir: hay que mandarlo de nuevo a la entrada.
      if (!v.ok) {
        if (v.motivo === 'vencida') {
          return txt(`410 direccion vencida (era de la epoca ${v.epoca}, ahora es ${epoca}).
Las direcciones duran una epoca mas una de gracia. Pedi nuevas en ${RUTA_ENTRADA}
`, 410, cabecerasMedicion(f, { 'x-icca-motivo': 'vencida' }));
        }
        return txt(`403 direccion invalida. La entrada esta en ${RUTA_ENTRADA}\n`, 403,
          cabecerasMedicion(f, { 'x-icca-motivo': 'invalida' }));
      }

      return txt(documento(recurso), 200, cabecerasMedicion(f, {
        'x-icca-epoca': String(v.epoca),
        'x-icca-recurso': recurso,
        'x-icca-gracia': v.gracia ? 'si' : 'no'
      }));
    }

    // ---- La sala, cuando exista --------------------------------------------
    // Se conserva la ruta y su guard de presupuesto. Hoy no hay proveedor, asi
    // que este camino esta muerto y se declara asi en vez de borrarse: el
    // adaptador de sala.mjs ademas esta escrito contra una API que no existe, y
    // eso es deuda ya declarada en el PR anterior.
    if (url.pathname === '/puerta/v1/ejecutar') {
      if (!salaConfigurada(env)) {
        return txt(`200 la sala de ejecucion no esta conectada en esta fase.
Lo que esta puerta entrega hoy son documentos. La entrada esta en ${RUTA_ENTRADA}
`, 200, cabecerasMedicion(f, { 'x-icca-ejecutada': 'no' }));
      }
      if (!env.CONTADOR || typeof env.CONTADOR.get !== 'function') {
        return txt('503 presupuesto_no_medido: falta el KV CONTADOR\n', 503);
      }
      const gastado = Number(await env.CONTADOR.get('gastado')) || 0;
      const techo = Number(env.PRESUPUESTO_MAX) || 0;
      if (techo <= 0) return txt('503 presupuesto_no_medido: PRESUPUESTO_MAX sin definir\n', 503);
      if (gastado >= techo) return txt('503 presupuesto agotado para este periodo\n', 503);

      const l = url.searchParams.get('l');
      const s64 = url.searchParams.get('s') || '';
      let fuente;
      try { fuente = atob(s64.replace(/-/g, '+').replace(/_/g, '/')); }
      catch { return txt('400 s no es base64url\n', 400); }
      if (fuente.length > LIMITES.fuenteB) return txt(`413 fuente > ${LIMITES.fuenteB} B\n`, 413);

      const r = await ejecutarEnSala(env, { lenguaje: l, fuente });
      if (!r.ok) return txt(`502 ${r.motivo}\n`, 502);
      await env.CONTADOR.put('gastado', String(gastado + 1));
      return txt(r.salida, 200);
    }

    return txt(`404. La entrada esta en ${RUTA_ENTRADA}\n`, 404);
  }
};

export { DUR_EPOCA_MS };
