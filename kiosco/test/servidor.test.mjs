// Tests de la SUPERFICIE declarada del servidor, sin instalar el SDK de MCP.
//
// El sandbox donde se escribe esto no tiene npm ni red, asi que no puede
// importar src/index.mjs (depende de "agents" y "@modelcontextprotocol/server").
// Eso queda NO MEDIDO localmente y lo cubre el CI, que si tiene red.
//
// Lo que SI se puede medir sin instalar nada: que el archivo declare lo que
// tiene que declarar. Es un chequeo de texto sobre el fuente, y se dice que es
// eso: NO prueba que el servidor arranque. Un chequeo que se presenta como mas
// de lo que mide es el guard decorativo que este mismo corpus describe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IDS } from '../src/corpus.mjs';

const SRC = readFileSync(new URL('../src/index.mjs', import.meta.url), 'utf8');
const SIN_COMENTARIOS = SRC.replace(/\/\/.*$/gm, '');
const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('S1 usa createMcpHandler y NO la clase deprecada McpAgent', () => {
  assert.match(SRC, /createMcpHandler/);
  assert.equal(/\bMcpAgent\b/.test(SIN_COMENTARIOS), false,
    'McpAgent esta deprecado y feature-frozen');
});
test('S2 importa del paquete v2, que es el que exige el handler stateless', () => {
  assert.match(SRC, /from '@modelcontextprotocol\/server'/);
  assert.equal(SIN_COMENTARIOS.includes('@modelcontextprotocol/sdk'), false,
    'el SDK v1 no va con el handler stateless');
});
test('S3 las tres herramientas estan registradas', () => {
  for (const t of ['buscar_metodo', 'listar_metodo', 'donde_esta']) {
    assert.ok(SRC.includes(`'${t}'`), `falta ${t}`);
  }
});
test('S4 NO hay cobro ni wallet en ningun lado: el kiosco es gratis', () => {
  for (const re of [/paidTool/, /withX402/, /recipient/, /0x[0-9a-fA-F]{40}/, /facilitator/]) {
    assert.equal(re.test(SIN_COMENTARIOS), false, `el kiosco menciona ${re}`);
  }
  const dep = { ...PKG.dependencies, ...PKG.devDependencies };
  for (const d of Object.keys(dep)) {
    assert.equal(/x402|viem|wallet|ethers/.test(d), false, `dependencia de pago: ${d}`);
  }
});
test('S5 declara allowedHostnames: el handler no lo infiere del request', () => {
  assert.match(SRC, /allowedHostnames/);
});
test('S6 la ruta del protocolo es /mcp', () => {
  assert.match(SRC, /route: '\/mcp'/);
});
test('S7 la descripcion de buscar_metodo es larga y con terminos buscables', () => {
  // Medido el 2026-08-22: el registro publico expone 500 de 10.433 servidores
  // en su listado, asi que a la cola se llega por busqueda de termino. La
  // descripcion ES el activo de descubrimiento, no un adorno.
  const m = SRC.match(/'buscar_metodo',[\s\S]*?description:([\s\S]*?)inputSchema/);
  assert.ok(m, 'no se encontro la descripcion');
  assert.ok(m[1].length > 300, `descripcion de ${m[1].length} caracteres, muy corta`);
  for (const term of ['verificacion', 'medicion', 'tests', 'testigo']) {
    assert.ok(m[1].includes(term), `la descripcion no menciona "${term}"`);
  }
});
test('S8 el schema limita el largo de la consulta en el borde', () => {
  assert.match(SRC, /max\(LARGO_MAX_CONSULTA\)/);
});
test('S9 donde_esta usa un enum cerrado, no un string libre', () => {
  assert.match(SRC, /z\.enum\(IDS\)/);
});
test('S10 la raiz devuelve 200 con la licencia por cabecera', () => {
  assert.match(SRC, /status: 200/);
  assert.match(SRC, /rel="license"/);
});
test('S11 la tarjeta declara que todo es gratis y lleva la clausula', () => {
  assert.match(SRC, /COSTO:\s+ninguno/);
  assert.match(SRC, /No contiene ordenes dirigidas a ningun agente/);
});
test('S12 los pins son exactos, sin rangos', () => {
  const dep = { ...PKG.dependencies, ...PKG.devDependencies };
  for (const [k, v] of Object.entries(dep)) {
    assert.match(v, /^\d+\.\d+\.\d+$/, `${k} no esta pineado exacto: ${v}`);
  }
});
test('S13 el enum del schema sale del corpus, no de una lista a mano', () => {
  assert.ok(IDS.length >= 6);
  assert.match(SRC, /IDS/);
  assert.match(SRC, /from '\.\/corpus\.mjs'/);
});
