// Lo mas cerca del deploy que se puede llegar SIN red.
// No reemplaza `wrangler deploy`: dice que nada de lo visible desde aca
// va a hacerlo fallar. Tres estados: OK / FALLA / NO MEDIDO.
import { readFileSync, existsSync } from 'node:fs';
import worker, { llaveDeEpoca } from './src/index.mjs';
import { epocaDe } from './src/epoca.mjs';

let fallas = 0, nomedido = 0;
const ok = (id, d = '') => { console.log(`[OK   ] ${id}`); if (d) console.log(`        ${d}`); };
const no = (id, d = '') => { fallas++; console.log(`[FALLA] ${id}`); if (d) console.log(`        ${d}`); };
const nm = (id, d = '') => { nomedido++; console.log(`[NOMED] ${id}`); if (d) console.log(`        ${d}`); };
const di = (id, c, d) => c ? ok(id, d) : no(id, d);

const crudo = readFileSync('wrangler.jsonc', 'utf8');
let cfg = null;
try {
  cfg = JSON.parse(crudo.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  ok('P1 wrangler.jsonc parsea como JSON');
} catch (e) { no('P1 wrangler.jsonc parsea como JSON', e.message); }

if (cfg) {
  di('P2 main apunta a un archivo que existe', existsSync(cfg.main), cfg.main);
  const hoy = new Date().toISOString().slice(0, 10);
  di('P3 compatibility_date presente y no futura',
     Boolean(cfg.compatibility_date) && cfg.compatibility_date <= hoy, cfg.compatibility_date);
  const cd = (cfg.routes || []).find(r => r.custom_domain);
  di('P4 el dominio esta declarado como custom_domain', Boolean(cd), cd && cd.pattern);
  di('P5 NO quedo la sintaxis vieja unsafe.bindings', !(cfg.unsafe && cfg.unsafe.bindings));
  const rl = (cfg.ratelimits || [])[0];
  di('P6 ratelimits con period 10 o 60 y namespace_id string',
     Boolean(rl) && [10, 60].includes(rl.simple.period) && typeof rl.namespace_id === 'string',
     rl && `period=${rl.simple.period} ns=${rl.namespace_id}`);
  const src = readFileSync('src/index.mjs', 'utf8');
  di('P7 el nombre del binding de tasa coincide con el que usa el codigo',
     Boolean(rl) && src.includes(`env.${rl.name}`), rl && `binding=${rl.name}`);
  // Se evalua sobre la config YA SIN COMENTARIOS, no sobre el texto crudo.
  // Sobre el crudo, este guard cazaba el placeholder que vive dentro del
  // comentario de la FASE C y fallaba: medir el comentario no es medir la
  // config. El mismo error, al reves, deja pasar una omision documentada.
  di('P8 ningun id placeholder que rompa el deploy',
     !/"(id|namespace_id|account_id)"\s*:\s*"(<[^"]*>|TODO|xxx+|placeholder)"/i.test(JSON.stringify(cfg)));
  di('P9 vars vacio: cero secretos en el arbol',
     cfg.vars && Object.keys(cfg.vars).length === 0);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const w = (pkg.devDependencies || {}).wrangler || '';
di('P10 wrangler pineado exacto', /^\d+\.\d+\.\d+$/.test(w), w);
const [ma, mi] = w.split('.').map(Number);
di('P11 wrangler >= 4.36.0, que es lo que exige ratelimits',
   ma > 4 || (ma === 4 && mi >= 36), w);
di('P12 type module: los .mjs necesitan ESM', pkg.type === 'module');

for (const f of ['./src/epoca.mjs', './src/index.mjs', './src/sala.mjs', './src/recibo.mjs']) {
  try { await import(f); ok('P13 carga ' + f); } catch (e) { no('P13 carga ' + f, e.message); }
}

const env = { SECRETO: 'preflight'.repeat(8), TASA: { limit: async () => ({ success: true }) } };
const epocaEnv = epocaDe(Date.now());
const m = await worker.fetch(new Request('https://p/puerta/v1/manifiesto'), env);
const mt = await m.text();
di('P14 el manifiesto responde 200 con SOLO el secreto', m.status === 200,
   `status=${m.status} bytes=${mt.length}`);
di('P15 el manifiesto nombra 4 archivos del corpus',
   (mt.match(/corpus\/pieza-\d\d\.md/g) || []).length === 4);
const sin = await worker.fetch(new Request('https://p/puerta/v1/ejecutar'), env);
di('P16 sin llave la ejecucion da 401', sin.status === 401);

// P18, P19 y P20 existen por una medicion externa que invalido el diseno
// anterior: el FAQ de Cloudflare Pay Per Crawl dice que las respuestas de error
// NO se facturan (verificado 2026-08-22). La fase molinete devolvia 501, o sea
// que no cobraba nada por muchos agentes que pasaran. Estos tres chequeos
// impiden que eso vuelva sin que nadie lo note.
const kOk = await llaveDeEpoca(env.SECRETO, epocaEnv);
const entrega = await worker.fetch(new Request(
  `https://p/puerta/v1/ejecutar?k=${kOk}&l=python&s=${Buffer.from('print(1)').toString('base64url')}`), env);
const cuerpo = await entrega.text();
di('P18 una llave valida recibe 200, no un error (los errores no se facturan)',
   entrega.status === 200, `status=${entrega.status} bytes=${cuerpo.length}`);
di('P19 el cuerpo entregado lleva contenido y atribucion, no un cartel',
   cuerpo.length > 1200 && /TRES ESTADOS/.test(cuerpo) && /license\.xml/.test(cuerpo),
   `bytes=${cuerpo.length}`);
di('P20 la entrega declara que no hubo ejecucion',
   /ejecutada: no/.test(cuerpo) && !/ejecutada: si/i.test(cuerpo));

// P17 existe porque es la dependencia que hace que todo lo de arriba
// sea verificable pero inutil: la puerta valida llaves que nadie puede armar
// mientras el corpus no exista con ESOS nombres.
const piezas = (mt.match(/pieza-\d\d\.md/g) || []);
const faltan = piezas.filter(p => !existsSync(`../corpus/${p}`));
if (faltan.length) nm('P17 el corpus referenciado existe', `faltan: ${faltan.join(', ')} -> corre tools/generar-corpus.mjs`);
else ok('P17 el corpus referenciado existe');

console.log('\n' + '='.repeat(70));
console.log(`PREFLIGHT: ${fallas} fallas, ${nomedido} NO MEDIDO`);
console.log('NO reemplaza wrangler deploy: no hay red aca. Dice que nada de lo');
console.log('que se puede ver desde aca va a hacerlo fallar.');
console.log('='.repeat(70));
console.log('EXIT_PREFLIGHT=' + (fallas ? 1 : 0));
process.exit(fallas ? 1 : 0);
