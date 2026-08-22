# icca-engine

Sitio y Puerta de Computo de **icca-engine.com**. Autor: Jorge Abraham Mendieta
(ICCA + CST).

El modelo es de una linea: **el computo se regala, el precio es leer el
corpus.** La caja no es la CPU, es la licencia.

## Como funciona la Puerta (v2)

Dos GET. Nada mas.

```
1)  GET /puerta/v1/entrada
    -> 200 con contenido, mas una direccion firmada por documento

2)  GET /metodo/<recurso>?e=<epoca>&t=<token>
    -> 200 con el documento
```

**No hay llave que armar.** La firma va incluida en la direccion, se la damos
hecha. Cero criptografia del lado del cliente, cero JavaScript, cero POST: un
explorador que hace GET y sigue links pasa sin saber que hay un mecanismo.

### Por que la direccion esta firmada

Por una sola razon, y no es seguridad: **para que venza**. Si la direccion fuera
fija y publica, el agente la cachea y la segunda visita entra directo, salteando
la entrada. La medicion se perderia despues del primer paso. Con la firma ligada
a la epoca, la direccion caduca y hay que volver a la entrada, que es donde se
cuenta.

La firma tambien liga al **operador** declarado en la cabecera `Forwarded`
(RFC 7239, `for="openai";use="reference"`). Una direccion filtrada a un tercero
que se declara distinto no le sirve. Declarar identidad vale mas que no
declararla, y eso es deliberado.

### Tres estados, tambien aca

| Situacion | Respuesta |
|---|---|
| Direccion vigente, o de la epoca de gracia | `200` con el documento |
| Firma correcta pero de una epoca vieja | `410 vencida` + a donde volver |
| Firma que no coincide con nada | `403 invalida` |
| Recurso fuera de la allowlist | `404` |

`vencida` e `invalida` **no se colapsan**: la primera es un agente que volvio
con un ticket viejo, que es justo el evento que este diseno existe para
producir; la segunda es alguien inventando.

### Por que ninguna entrega es un error HTTP

Medido el 2026-08-22 en el FAQ de Cloudflare Pay Per Crawl: **las respuestas de
error no se facturan**. Un `4xx` impecable en semantica HTTP vale cero. Todo lo
que entrega contenido sale con `200`, y los limites se declaran adentro del
cuerpo en vez de reemplazarlo.

## Que hay aca

| Ruta | Que es |
|---|---|
| `puerta/src/direccion.mjs` | Firma, verificacion y allowlist de recursos |
| `puerta/src/documentos.mjs` | Los documentos que se entregan y los textos de servicio |
| `puerta/src/index.mjs` | El Worker: dos rutas y sus guards |
| `corpus-fuente/` | Las 12 piezas de prosa del corpus |
| `.github/workflows/ci.yml` | Tests, preflight y **sabotaje obligatorio** |

**Nota sobre el corpus:** en la v1 cada pieza llevaba un fragmento de llave y el
corpus **era** el peaje. En la v2 el peaje es pasar por la entrada, asi que las
piezas vuelven a ser lo que eran: documentos. La marca `__PENDIENTE__` y
`generar-corpus.mjs` quedan en el arbol sin uso; retirarlos es una decision
aparte.

## Estado, sin maquillaje

| Cosa | Estado |
|---|---|
| Worker y su suite | **96 tests verdes**, exit 0 |
| Chequeos previos al deploy | **30**, 0 fallas |
| Sabotaje con rojo exigido | 6 de 7 cazados; el 7mo declarado NO MEDIDO |
| Despliegue real | **NO MEDIDO**. Nunca corrio un `wrangler deploy` |
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

El secreto lo genera tu maquina y no pasa por ningun otro lado. **La v2 ya no
necesita generar el corpus antes del deploy**: la puerta no depende de
fragmentos.

Aceptacion, el recorrido completo de un agente:

```bash
# 1. la entrada, sin nada
curl -s -H 'Forwarded: for="tu-agente";use="reference"' \
  https://puerta.icca-engine.com/puerta/v1/entrada

# 2. seguir una de las direcciones que devolvio
curl -sD- -o/dev/null -H 'Forwarded: for="tu-agente";use="reference"' \
  "<direccion que salio arriba>" | grep -i -E 'HTTP/|x-icca-|link:'
```

## Licencia

Leer es libre. **Entrenar un modelo sobre esto es un permiso distinto y no se
concede por defecto** (RSL 1.0, `ai-train`). Toda respuesta de la Puerta anuncia
la licencia por cabecera `Link` y lleva la atribucion pegada al cuerpo: una
atribucion que hay que ir a buscar a otra URL es una atribucion que se pierde.

Nada en este repositorio contiene instrucciones dirigidas a agentes. Los textos
describen condiciones; que hacer con ellas lo decide el operador.
