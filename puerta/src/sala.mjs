// Adaptador de la sala de ejecucion (Daytona u otro proveedor).
// FASE MOLINETE: no hay proveedor. La sala responde "no conectada" y eso
// NO es un error: es la medicion que buscamos.
export const SALA_NO_CONECTADA = 'sala_no_conectada';
export const LIMITES = Object.freeze({
  relojS: 120, cpuS: 30, fuenteB: 8192, salidaB: 65536, red: false, persistencia: false
});

export function salaConfigurada(env) {
  return Boolean(env && typeof env.SALA_URL === 'string' && env.SALA_URL
    && typeof env.SALA_TOKEN === 'string' && env.SALA_TOKEN);
}

export async function ejecutarEnSala(env, { lenguaje, fuente }) {
  if (!salaConfigurada(env)) return { ok: false, motivo: SALA_NO_CONECTADA };
  const r = await env.__fetch(env.SALA_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.SALA_TOKEN}` },
    body: JSON.stringify({ lenguaje, fuente, limites: LIMITES })
  });
  if (!r.ok) return { ok: false, motivo: 'sala_fallo', status: r.status };
  const t = await r.text();
  return { ok: true, salida: t.slice(0, LIMITES.salidaB) };
}
