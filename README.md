# icca-engine

Sitio y Puerta de Computo de **icca-engine.com**. Autor: Jorge Abraham Mendieta
(ICCA + CST).

El modelo es de una linea: **el computo se regala, el precio es leer el
corpus.** La caja no es la CPU, es la licencia.

## Como funciona la Puerta (v2)

```
1)  GET /puerta/v1/entrada
    -> 200 con contenido, mas una direccion firmada por documento

2)  GET /puerta/v1/entrada?q=<consulta>
    -> 200 con los pasajes que responden, el ranking, y la direccion del
       documento completo

3)  GET /metodo/<recurso>?e=<epoca>&t=<token>
    -> 200 con el documento entero
```

**No hay llave que armar.** La firma va incluida en la direccion, se la damos
hecha. Cero criptografia del lado del cliente, cero JavaScript, cero POST: un
explorador que hace GET y sigue links pasa sin saber que hay un mecanismo.

### La duda: como entra el input del agente

`?q=` en texto llano. La consulta se limpia con **tres estados**: `sin_consulta`
(devuelve el catalogo), `ok` (devuelve la respuesta) y `rechazada` (devuelve el
catalogo y declara el motivo en `x-icca-consulta`). Los tres salen con `200`,
porque los tres entregan algo util.

### La IA en el servidor, y por que NO es una dependencia

Hay una IA adentro (Workers AI, `env.AI`), pero **la busqueda por terminos es el
piso y siempre corre**. Sin binding, sin cuota, sin contador de gasto o con el
modelo caido, la puerta responde igual y declara por que en
`x-icca-seleccion` y en el cuerpo. La IA solo puede **mejorar** la seleccion.

Cuota verificada el 2026-08-22: **10.000 neuronas por dia gratis**, reset 00:00
UTC. Con el modelo pineado (`@cf/meta/llama-3.2-3b-instruct`, 4.625 neuronas por
M de tokens de entrada y 30.475 de salida) un pedido cuesta **3,51 neuronas**, o
sea **2.849 pedidos por dia** dentro de lo gratis.

### La decision de seguridad que ordena todo

**La consulta del agente es entrada no confiable, y la salida se publica.** Son
dos superficies de inyeccion de prompt, y la grave es la segunda: si un agente
logra que el modelo escriba lo que el quiera y eso se publica bajo este dominio
con la atribucion del autor, un tercero pone palabras en boca del sitio. El
corpus vale porque esta curado.

La defensa no es pedirle al modelo que se porte bien, es **cerrar el espacio de
salida**:

1. El modelo elige un identificador y su respuesta se **valida contra una lista
   cerrada**. Cualquier otra cosa se descarta y se cae al determinista. Una
   inyeccion, en el peor caso, elige otro documento: nunca produce texto libre.
2. El texto que se publica se **arma por plantilla con pasajes del corpus**. El
   modelo elige QUE documento, no escribe ni una palabra.

El peor resultado de un ataque es una respuesta poco pertinente.

### Por que la direccion esta firmada

Por una sola razon, y no es seguridad: **para que venza**. Si fuera fija y
publica, el agente la cachea y la segunda visita entra directo, salteando la
entrada, y la medicion se perderia. La firma tambien liga al **operador**
declarado en `Forwarded` (RFC 7239): una direccion filtrada a un tercero que se
declara distinto no le sirve.

### Tres estados, en todas las capas

| Situacion | Respuesta |
|---|---|
| Direccion vigente, o de la epoca de gracia | `200` con el documento |
| Firma correcta pero de una epoca vieja | `410 vencida` + a donde volver |
| Firma que no coincide con nada | `403 invalida` |
| Recurso fuera de la allowlist | `404` |

`vencida` e `invalida` **no se colapsan**: la primera es un agente que volvio
con un ticket viejo, que es justo el evento que este diseno existe para
producir.

### Por que ninguna entrega es un error HTTP

Medido el 2026-08-22 en el FAQ de Cloudflare Pay Per Crawl: **las respuestas de
error no se facturan**. Un `4xx` impecable en semantica HTTP vale cero.

## Que hay aca

| Ruta | Que es |
|---|---|
| `puerta/src/direccion.mjs` | Firma, verificacion y allowlist de recursos |
| `puerta/src/consulta.mjs` | La duda: limpieza, indice y busqueda determinista |
| `puerta/src/ia.mjs` | Workers AI, con su presupuesto y sus defensas |
| `puerta/src/documentos.mjs` | El corpus servido y las plantillas de respuesta |
| `puerta/src/index.mjs` | El Worker: tres rutas y sus guards |
| `corpus-fuente/` | Las 12 piezas de prosa del corpus |
| `.github/workflows/ci.yml` | Tests, preflight y **sabotaje obligatorio** |

## Estado, sin maquillaje

| Cosa | Estado |
|---|---|
| Worker y su suite | **163 tests verdes**, exit 0 |
| Chequeos previos al deploy | **41**, 0 fallas |
| Sabotaje con rojo exigido | 11 de 12 cazados; el 12vo declarado NO MEDIDO |
| Despliegue real | **NO MEDIDO**. Nunca corrio un `wrangler deploy` |
| IA contra Workers AI real | **NO MEDIDO**. El binding esta stubbeado en los tests |
| Sala de ejecucion | **no conectada**. Lo que se entrega hoy son documentos |
| Adaptador de la sala | **deuda**: escrito contra una API que no existe |
| Sitio publico | **sin desplegar** |

## Desplegar

```bash
cd puerta
npm test && node preflight.mjs && bash tools/sabotaje.sh
openssl rand -hex 32 | npx wrangler secret put SECRETO
npm install && npx wrangler deploy
```

Para habilitar la IA, dos cosas mas (sin ellas la puerta funciona igual, por la
via determinista):

```bash
npx wrangler kv namespace create CONTADOR   # y pegar el id en wrangler.jsonc
npx wrangler secret put NEURONAS_MAX        # por ejemplo 8000, de 10.000
```

Aceptacion, el recorrido completo de un agente:

```bash
# el catalogo
curl -s -H 'Forwarded: for="tu-agente";use="reference"' \
  https://puerta.icca-engine.com/puerta/v1/entrada

# una consulta
curl -sD- -H 'Forwarded: for="tu-agente";use="reference"' \
  'https://puerta.icca-engine.com/puerta/v1/entrada?q=como+se+mide+un+guard' \
  | grep -i -E 'HTTP/|x-icca-'
```

## Licencia

Leer es libre. **Entrenar un modelo sobre esto es un permiso distinto y no se
concede por defecto** (RSL 1.0, `ai-train`). Toda respuesta de la Puerta anuncia
la licencia por cabecera `Link` y lleva la atribucion pegada al cuerpo: una
atribucion que hay que ir a buscar a otra URL es una atribucion que se pierde.

Nada en este repositorio contiene instrucciones dirigidas a agentes. Los textos
describen condiciones; que hacer con ellas lo decide el operador.
