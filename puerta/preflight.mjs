// Lo mas cerca del deploy que se puede llegar SIN red.
// No reemplaza `wrangler deploy`: dice que nada de lo visible desde aca
// va a hacerlo fallar. Tres estados: OK / FALLA / NO MEDIDO.
import { readFileSync, existsSync } from 'node:fs';
import worker from './src/index.mjs';
import { epocaDe } from './src/epoca.mjs';
import { firmar, RECURSOS, RUTA_ENTRADA } from './src/direccion.mjs';

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

for (const f of ['./src/epoca.mjs', './src/index.mjs', './src/sala.mjs',
                 './src/recibo.mjs', './src/direccion.mjs', './src/documentos.mjs']) {
  try { await import(f); ok('P13 carga ' + f); } catch (e) { no('P13 carga ' + f, e.message); }
}

const env = { SECRETO: 'preflight'.repeat(8), TASA: { limit: async () => ({ success: true }) } };
const epocaEnv = epocaDe(Date.now());
const ORIGEN = 'https://puerta.icca-engine.com';

// P14-P16: la entrada. Un GET pelado, sin llave, sin cabeceras: si esto no da
// 200, el rediseno de la v2 se perdio y volvimos a exigir que el cliente
// razone.
const ent = await worker.fetch(new Request(ORIGEN + RUTA_ENTRADA), env);
const et = await ent.text();
di('P14 la entrada da 200 a un GET pelado, sin llave',
   ent.status === 200, `status=${ent.status} bytes=${et.length}`);
di('P15 la entrada trae una direccion por recurso',
   (et.match(/direccion: /g) || []).length === Object.keys(RECURSOS).length,
   `recursos=${Object.keys(RECURSOS).length}`);
di('P16 la entrada lleva contenido y atribucion, no solo punteros',
   et.length > 1200 && /LICENCIA Y ATRIBUCION/.test(et), `bytes=${et.length}`);
di('P17 la entrada no filtra el secreto', !et.includes(env.SECRETO));

// P18-P19: el documento, siguiendo la direccion que dio la entrada. Es el
// recorrido completo del agente, hecho por el codigo que se despliega.
const dirCruda = (et.match(/direccion: (\S+)/) || [])[1];
let dt = '';
if (!dirCruda) { no('P18 la entrada publico una direccion usable'); }
else {
  const doc = await worker.fetch(new Request(dirCruda), env);
  dt = await doc.text();
  di('P18 la direccion de la entrada entrega 200 con el documento',
     doc.status === 200, `status=${doc.status} bytes=${dt.length}`);
  di('P19 el documento lleva su atribucion pegada',
     /Jorge Abraham Mendieta/.test(dt) && /license\.xml/.test(dt), `bytes=${dt.length}`);
}

// P21 y P22 son el corazon del diseno: una direccion tiene que VENCER, y
// vencida no puede confundirse con invalida. Si la primera fallara, el agente
// entraria directo para siempre y la medicion se perderia en la segunda visita.
const recurso0 = Object.keys(RECURSOS)[0];
const tokVencido = await firmar(env.SECRETO, recurso0, epocaEnv - 2);
const rv = await worker.fetch(new Request(`${ORIGEN}/metodo/${recurso0}?t=${tokVencido}`), env);
const rvt = await rv.text();
di('P21 una direccion de dos epocas atras da 410 vencida, no 200',
   rv.status === 410 && rv.headers.get('x-icca-motivo') === 'vencida',
   `status=${rv.status} motivo=${rv.headers.get('x-icca-motivo')}`);
di('P22 el 410 no filtra el documento', !/grep -c/.test(rvt));

const ri = await worker.fetch(new Request(`${ORIGEN}/metodo/${recurso0}?t=${'a'.repeat(32)}`), env);
di('P23 un token inventado da 403 invalida, distinto de vencida',
   ri.status === 403 && ri.headers.get('x-icca-motivo') === 'invalida',
   `status=${ri.status} motivo=${ri.headers.get('x-icca-motivo')}`);

// P24: la allowlist. Un recurso fuera de ella no se firma ni se sirve.
const rx = await worker.fetch(new Request(`${ORIGEN}/metodo/inventado?t=${'a'.repeat(32)}`), env);
di('P24 un recurso fuera de la allowlist da 404', rx.status === 404, `status=${rx.status}`);

// P25: la licencia se anuncia por cabecera en toda respuesta (RSL 1.0 sec 4).
di('P25 toda respuesta anuncia la licencia por cabecera Link',
   /rel="license"/.test(ent.headers.get('link') || '') &&
   /rel="license"/.test(rv.headers.get('link') || ''));

// P26: NO MEDIDO explicito. La v2 ya no usa fragmentos en el corpus, asi que
// el corpus publicado dejo de ser una dependencia del funcionamiento de la
// puerta. Se deja el chequeo declarado para no perder de vista que el sitio
// todavia tiene que publicarse.
nm('P26 el corpus publicado en el sitio',
   'la v2 no depende de fragmentos, pero el sitio sigue sin desplegarse');

console.log('\n' + '='.repeat(70));
console.log(`PREFLIGHT: ${fallas} fallas, ${nomedido} NO MEDIDO`);
console.log('NO reemplaza wrangler deploy: no hay red aca. Dice que nada de lo');
console.log('que se puede ver desde aca va a hacerlo fallar.');
console.log('='.repeat(70));
console.log('EXIT_PREFLIGHT=' + (fallas ? 1 : 0));
process.exit(fallas ? 1 : 0);
