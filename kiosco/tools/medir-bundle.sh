#!/usr/bin/env bash
# Mide el bundle que dejo el dry-run de wrangler, con TRES estados y no dos.
#
# La version anterior de esta medicion vivia embebida en el workflow y hacia:
#
#   bytes=$(find /tmp/kiosco-build -name '*.js' -exec cat {} + | wc -c)
#
# Si el dry-run no dejaba un solo .js, find no falla, wc -c imprime 0, y el paso
# reportaba "OK: por debajo del limite" sobre un bundle que no existia. Es el
# guard decorativo que describe el corpus de este mismo repo: se leia bien y no
# medía nada.
#
# Ahora distingue: no existe el directorio, no hay ningun .js, o hay bundle y
# mide N bytes. Los dos primeros son NO MEDIDO y salen con codigo distinto de
# cero, porque un no-medido no puede pasar por aprobado.
set -u

DIR="${DIR_BUNDLE:-${RUNNER_TEMP:-/tmp}/build-kiosco}"
LIMITE="${LIMITE_BYTES:-2500000}"

if [ ! -d "$DIR" ]; then
  echo "NO MEDIDO: no existe $DIR, el dry-run no dejo bundle"
  exit 1
fi

n=$(find "$DIR" -name '*.js' | wc -l)
if [ "$n" -eq 0 ]; then
  echo "NO MEDIDO: no hay ningun .js en $DIR"
  exit 1
fi

bytes=$(find "$DIR" -name '*.js' -exec cat {} + | wc -c)
echo "archivos .js: $n"
echo "bundle en bytes: $bytes"
echo "limite: $LIMITE"

if [ "$bytes" -gt "$LIMITE" ]; then
  echo "FALLA: el bundle supera el limite. El techo del plan gratis es 3 MB."
  exit 1
fi

echo 'OK: por debajo del limite'
