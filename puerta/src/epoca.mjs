// Epoca y seleccion de piezas. NADA de esto es secreto:
// la seleccion se publica en el manifiesto. Lo secreto es SOLO el fragmento
// que vive dentro de cada pieza del corpus.
export const DUR_EPOCA_MS = 3600000;      // 3600 s, mas 1 epoca de gracia
export const PIEZAS_TOTAL = 12;
export const PIEZAS_POR_LLAVE = 4;
export const HEX_POR_FRAGMENTO = 16;      // 4 x 16 = 64 hex de llave

export function epocaDe(msAhora) {
  if (!Number.isFinite(msAhora) || msAhora < 0) throw new TypeError('msAhora invalido');
  return Math.floor(msAhora / DUR_EPOCA_MS);
}

export function expiraDe(epoca) {
  if (!Number.isInteger(epoca) || epoca < 0) throw new TypeError('epoca invalida');
  return (epoca + 1) * DUR_EPOCA_MS;
}

// splitmix32. Deliberadamente NO criptografico: si fuera secreto que piezas
// toca leer, el corpus no seria un peaje de lectura sino un acertijo.
function mezcla(x) {
  let z = (x + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

export function piezasDeEpoca(epoca) {
  if (!Number.isInteger(epoca) || epoca < 0) throw new TypeError('epoca invalida');
  const pool = Array.from({ length: PIEZAS_TOTAL }, (_, i) => i + 1);
  const elegidas = [];
  let s = epoca >>> 0;
  for (let i = 0; i < PIEZAS_POR_LLAVE; i++) {
    s = mezcla(s);
    elegidas.push(pool.splice(s % pool.length, 1)[0]);
  }
  return elegidas;
}

export function nombrePieza(n) {
  if (!Number.isInteger(n) || n < 1 || n > PIEZAS_TOTAL) throw new RangeError('pieza fuera de rango');
  return `pieza-${String(n).padStart(2, '0')}.md`;
}
