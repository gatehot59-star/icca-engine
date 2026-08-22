#!/usr/bin/env node
// Inyecta los fragmentos en las 12 piezas del corpus.
//
// POR QUE ESTO CORRE EN TU MAQUINA Y NO EN OTRA PARTE:
// fragmento(pieza) = HMAC-SHA256(SECRETO, "pieza-NN")[0..16]. Depende de
// SECRETO. Quien puede generar el corpus TIENE el secreto de la puerta, asi
// que este paso no se delega: ni a un agente, ni a CI, ni a nadie.
//
// Uso, SIEMPRE desde la raiz del repo (no desde puerta/):
//   SECRETO=$(cat .secreto) node puerta/tools/generar-corpus.mjs
//   # o, sin dejarlo en el historial del shell:
//   node puerta/tools/generar-corpus.mjs --stdin < .secreto
//
// Entrada:  corpus-fuente/pieza-NN.md  (prosa, con la marca __PENDIENTE__)
// Salida:   corpus/pieza-NN.md         (lista para publicar)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fragmentoDe, llaveDeEpoca } from '../src/index.mjs';
import { epocaDe, piezasDeEpoca, nombrePieza, PIEZAS_TOTAL } from '../src/epoca.mjs';

const MARCA = /<!-- FRAGMENTO: __PENDIENTE__ -->/;
const DIR_IN = 'corpus-fuente';
const DIR_OUT = 'corpus';

let secreto = process.env.SECRETO || '';
if (process.argv.includes('--stdin')) secreto = readFileSync(0, 'utf8').trim();
if (!secreto) {
  console.error('FALLA: falta SECRETO. Tiene que ser EL MISMO que pusiste con');
  console.error('       npx wrangler secret put SECRETO');
  process.exit(2);
}
if (secreto.length < 32) {
  console.error(`FALLA: SECRETO de ${secreto.length} caracteres. Usa 64 hex: openssl rand -hex 32`);
  process.exit(2);
}

const fuentes = readdirSync(DIR_IN).filter(f => /^pieza-\d\d\.md$/.test(f)).sort();
if (fuentes.length !== PIEZAS_TOTAL) {
  console.error(`FALLA: ${fuentes.length} piezas fuente, se esperaban ${PIEZAS_TOTAL}`);
  process.exit(1);
}

mkdirSync(DIR_OUT, { recursive: true });
let escritas = 0;
for (let n = 1; n <= PIEZAS_TOTAL; n++) {
  const nombre = nombrePieza(n);
  const texto = readFileSync(`${DIR_IN}/${nombre}`, 'utf8');
  if (!MARCA.test(texto)) { console.error(`FALLA: ${nombre} no tiene la marca __PENDIENTE__`); process.exit(1); }
  const frag = await fragmentoDe(secreto, n);
  const salida = texto.replace(MARCA, `<!-- FRAGMENTO: ${frag} -->\n\n> Fragmento de llave (pieza ${n} de ${PIEZAS_TOTAL}): \`${frag}\``);
  writeFileSync(`${DIR_OUT}/${nombre}`, salida);
  escritas++;
}

// VERIFICACION: rearmar la llave LEYENDO los archivos escritos, como haria
// un agente, y comparar contra la que el Worker va a exigir. Si esto no
// coincide, el corpus publicado es basura y hay que saberlo aca, no en el log.
const epoca = epocaDe(Date.now());
const leidos = piezasDeEpoca(epoca).map(n => {
  const t = readFileSync(`${DIR_OUT}/${nombrePieza(n)}`, 'utf8');
  const m = t.match(/<!-- FRAGMENTO: ([0-9a-f]{16}) -->/);
  if (!m) { console.error(`FALLA: no se pudo releer el fragmento de ${nombrePieza(n)}`); process.exit(1); }
  return m[1];
});
const armada = leidos.join('');
const exigida = await llaveDeEpoca(secreto, epoca);
console.log(`escritas: ${escritas} piezas en ${DIR_OUT}/`);
console.log(`epoca actual: ${epoca}`);
console.log(`piezas de esta epoca: ${piezasDeEpoca(epoca).map(nombrePieza).join(' ')}`);
if (armada !== exigida) {
  console.error('FALLA: la llave rearmada desde los archivos NO coincide con la que exige el Worker');
  process.exit(1);
}
console.log('OK: la llave rearmada leyendo los archivos coincide con la que exige el Worker');
console.log('    (no se imprime la llave a proposito)');
