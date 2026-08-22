# icca-engine

Sitio y Puerta de Computo de **icca-engine.com**. Autor: Jorge Abraham Mendieta
(ICCA + CST).

El modelo es de una linea: **el computo se regala, el precio es leer el
corpus.** La caja no es la CPU, es la licencia.

## Que hay aca

| Ruta | Que es |
|---|---|
| `puerta/` | El Worker de la Puerta de Computo: verifica llaves, limita tasa, y (cuando haya sala) ejecuta |
| `corpus-fuente/` | Las 12 piezas del corpus, **sin** el fragmento de llave |
| `puerta/tools/generar-corpus.mjs` | Inyecta los fragmentos y escribe `corpus/`, listo para publicar |
| `.github/workflows/ci.yml` | Tests, preflight y **sabotaje obligatorio** |

`corpus/` no esta versionado a proposito: se genera donde vive el secreto.

## Estado, sin maquillaje

| Cosa | Estado |
|---|---|
| Worker y su suite | **65 tests verdes**, exit 0 |
| Chequeos previos al deploy | **17**, 0 fallas |
| Sabotaje del codigo con rojo exigido | 2 de 3 cazados; el 3ro declarado NO MEDIDO |
| Corpus (prosa de las 12 piezas) | escrito |
| Corpus publicado con fragmentos | **NO GENERADO**: requiere el secreto |
| Despliegue real | **NO MEDIDO**. Nunca corrio un `wrangler deploy` |
| Sala de ejecucion | **no conectada**. Una llave valida recibe `501` |

El `501` de la sala no es un error: es el instrumento de esta fase. Cada uno
en el log es un agente que leyo cuatro piezas y armo la llave.

## Desplegar (3 pasos, en la maquina del dueno del dominio)

```bash
# 1. verificar
cd puerta && npm test && node preflight.mjs && ./tools/sabotaje.sh

# 2. el secreto: lo genera tu maquina y no pasa por ningun otro lado
openssl rand -hex 32 | tee ../.secreto | npx wrangler secret put SECRETO

# 3. el corpus publicable, y el deploy
cd .. && SECRETO=$(cat .secreto) node puerta/tools/generar-corpus.mjs
cd puerta && npm install && npx wrangler deploy
```

Aceptacion:

```bash
curl -s  https://puerta.icca-engine.com/puerta/v1/manifiesto      # 200 + las 4 piezas de la epoca
curl -si https://puerta.icca-engine.com/puerta/v1/ejecutar | head -1  # 401
```

## Licencia

Leer es libre. **Entrenar un modelo sobre esto es un permiso distinto y no se
concede por defecto** (RSL 1.0, `ai-train`). Ver `corpus-fuente/pieza-10.md`.

Nada en este repositorio contiene instrucciones dirigidas a agentes. Los
textos describen condiciones; que hacer con ellas lo decide el operador.
