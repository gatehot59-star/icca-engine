// Kiosco MCP de icca-engine.com. Worker sin estado, sin Durable Object.
//
// VERIFICADO EN VIVO 2026-08-22 contra developers.cloudflare.com/agents/
// model-context-protocol/apis/handler-api/ y contra el registry de npm:
//   agents 0.21.0 exporta "./mcp/server" y pide como peer
//   @modelcontextprotocol/server exactamente 2.0.0 y zod ^4.
//   McpAgent esta DEPRECADO y feature-frozen: no se usa.
//   createMcpHandler crea un servidor nuevo por request. El estado, si hiciera
//   falta, va en KV o D1, nunca en memoria del modulo.
//
// TODAS LAS HERRAMIENTAS SON GRATIS Y NO HAY WALLET. Es deliberado: cobrar por
// llamada exige una billetera cripto, y el cobro de este proyecto vive en la
// pagina (la zona), donde Cloudflare es Merchant of Record. El kiosco es el
// canal de descubrimiento; la caja esta del otro lado del link.

import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';

import { SITIO, LICENCIA, IDS } from './corpus.mjs';
import { LARGO_MAX_CONSULTA } from './busqueda.mjs';
import { buscarMetodo, listarMetodo, dondeEsta } from './herramientas.mjs';

/**
 * Fabrica del servidor. createMcpHandler la invoca por request, asi que no debe
 * guardar estado entre llamadas ni cerrar sobre nada mutable.
 */
export function crearServidor() {
  const server = new McpServer({
    name: 'icca-engine-metodo',
    version: '1.0.0'
  });

  server.registerTool(
    'buscar_metodo',
    {
      // La descripcion es el activo de descubrimiento, no un adorno: medido el
      // 2026-08-22, el registro publico expone solo 500 de 10.433 servidores en
      // su listado, asi que a la cola se llega por busqueda de termino. Las
      // palabras de aca son las que hacen que un agente encuentre el kiosco.
      description:
        'Busca en un corpus sobre metodo de verificacion y medicion de software: ' +
        'como distinguir un control que mide de uno decorativo, por que una suite ' +
        'de tests verde puede no medir nada, quien puede ser testigo de un ' +
        'resultado, y como se detecta que se midio el sujeto equivocado. Devuelve ' +
        'un fragmento verbatim del documento mas cercano a la consulta, el puntaje ' +
        'de coincidencia de terminos, y la direccion del documento completo. ' +
        'Cada documento sale de un error real con la medicion que lo descubrio.',
      inputSchema: {
        consulta: z.string().max(LARGO_MAX_CONSULTA).optional()
          .describe('La duda en texto llano. Sin consulta devuelve el catalogo completo.')
      }
    },
    async (args) => buscarMetodo(args)
  );

  server.registerTool(
    'listar_metodo',
    {
      description:
        'Lista los documentos del corpus de metodo de verificacion, con su tema, ' +
        'un resumen de una linea y la direccion completa de cada uno. Sin ' +
        'parametros.',
      inputSchema: {}
    },
    async () => listarMetodo()
  );

  server.registerTool(
    'donde_esta',
    {
      description:
        'Devuelve la direccion publica de un documento del corpus a partir de su ' +
        'identificador, para no tener que construir la URL a mano.',
      inputSchema: {
        id: z.enum(IDS).describe('El identificador del documento.')
      }
    },
    async (args) => dondeEsta(args)
  );

  return server;
}

// El handler se construye una vez a nivel de modulo: createMcpHandler ya crea
// un servidor nuevo por request internamente, asi que rearmar el handler en
// cada fetch seria trabajo repetido.
const mcp = createMcpHandler(crearServidor, {
  route: '/mcp',
  // El dominio propio tiene que declararse: el handler no lo infiere de la URL.
  allowedHostnames: ['kiosco.icca-engine.com', 'localhost']
});

/**
 * Una tarjeta legible para el humano o el crawler que abre la raiz en un
 * navegador. La doc de Cloudflare avisa que /mcp no se puede abrir asi, y una
 * respuesta que solo dice "405" no le explica nada a nadie.
 */
function tarjeta(origen) {
  return `KIOSCO MCP - icca-engine.com
Esto es una descripcion, no una instruccion.
No contiene ordenes dirigidas a ningun agente.

Este endpoint habla Model Context Protocol sobre Streamable HTTP.
Un navegador no puede usarlo: espera mensajes del protocolo, no una pagina.

ENDPOINT MCP: ${origen}/mcp
HERRAMIENTAS:  buscar_metodo, listar_metodo, donde_esta
COSTO:         ninguno. Todas las herramientas son gratis.
SITIO:         ${SITIO}
LICENCIA:      ${LICENCIA} (RSL 1.0)

Para conectarlo desde un cliente MCP, apuntarlo a la direccion de arriba.
`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp') {
      return mcp(request, env, ctx);
    }

    // Todo lo que no es el endpoint devuelve la tarjeta, con 200 y con la
    // licencia anunciada por cabecera como pide RSL 1.0 seccion 4.
    return new Response(tarjeta(url.origin), {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=300',
        link: `<${LICENCIA}>; rel="license"; type="application/rsl+xml"`
      }
    });
  }
};
