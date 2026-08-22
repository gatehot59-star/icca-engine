#!/usr/bin/env bash
# Corre un paso del CI y publica su resultado donde se pueda leer SIN LOGIN.
#
# POR QUE EXISTE ESTE ARCHIVO. El run del 2026-08-22 fallo y lo unico visible
# sin autenticarse fue "Process completed with exit code 1": se sabia que habia
# fallado y no en que paso. La correccion anterior volcaba el detalle al
# GITHUB_STEP_SUMMARY, y eso NO alcanzo, porque el Summary tambien pide sesion.
# Medido: pidiendo la pagina del job sin sesion, lo unico legible es
# "Annotations: 1 error and 1 warning". Las Annotations si son publicas.
#
# Distingue TRES estados, no dos: paso, fallo, y NO CORRIO. El tercero se emite
# en el cierre, porque un paso que el job nunca alcanzo se lee igual que uno que
# paso si nadie lo declara.
#
# Uso:
#   paso.sh correr <nombre> <comando en una linea>
#   paso.sh cierre <nombre> [<nombre> ...]
#
# Variables:
#   DIR_PASOS        donde se guardan los .log y los .exit
#   NOMBRE_SUITE     separa los logs de una suite de los de otra
#   LINEAS_ANOTADAS  cuantas lineas finales del log van en la anotacion (30)
#
# El default de DIR_PASOS sale de $RUNNER_TEMP, que es una VARIABLE DE ENTORNO
# del runner y esta siempre seteada. No se usa el contexto runner en el env de
# un job: ahi no se resuelve, y usarlo hizo que el run 33 fallara al arrancar,
# con cero jobs y sin un solo check run. El guard validar-workflows.py existe
# por ese error.
set -u

DIR="${DIR_PASOS:-${RUNNER_TEMP:-/tmp}/pasos-${NOMBRE_SUITE:-general}}"
LINEAS="${LINEAS_ANOTADAS:-30}"
mkdir -p "$DIR"

# Escapa para una workflow command de GitHub. El orden importa: el porcentaje
# va primero, o se re-escapan los escapes recien puestos.
escapar() {
  local s
  s=$(cat)
  s=${s//'%'/'%25'}
  s=${s//$'\r'/'%0D'}
  s=${s//$'\n'/'%0A'}
  printf '%s' "$s"
}

# Corre el comando, guarda su salida y su exit code, y anota el resultado.
# set +e y PIPESTATUS no son decorativos: con el -e por defecto de GitHub el
# script aborta antes de escribir el .exit, y el registro se pierde justo
# cuando importa.
correr() {
  local nombre="$1"; shift
  local cmd="$*"
  local log="$DIR/$nombre.log"
  local codigo

  echo "--- paso $nombre: $cmd"
  set +e
  bash -c "$cmd" 2>&1 | tee "$log"
  codigo=${PIPESTATUS[0]}
  set -e
  printf '%s' "$codigo" > "$DIR/$nombre.exit"

  if [ "$codigo" -ne 0 ]; then
    local cuerpo
    cuerpo=$(printf 'comando: %s\nexit: %s\n\n%s' "$cmd" "$codigo" "$(tail -n "$LINEAS" "$log")" | escapar)
    echo "::error title=FALLO $nombre (exit $codigo)::$cuerpo"
  else
    echo "::notice title=OK $nombre::exit 0"
  fi
  return "$codigo"
}

# Repite los fallos y, sobre todo, declara los pasos que NUNCA corrieron.
cierre() {
  local faltan=0
  for nombre in "$@"; do
    if [ -f "$DIR/$nombre.exit" ]; then
      local c
      c=$(cat "$DIR/$nombre.exit")
      [ "$c" = 0 ] || echo "::error title=RESUMEN $nombre::fallo con exit $c"
    else
      echo "::warning title=NO CORRIO $nombre::el job aborto antes de llegar a este paso, asi que su estado es NO MEDIDO, no aprobado"
      faltan=$((faltan + 1))
    fi
  done
  echo "pasos sin correr: $faltan"
}

case "${1:-}" in
  correr) shift; correr "$@" ;;
  cierre) shift; cierre "$@" ;;
  *) echo "uso: paso.sh correr <nombre> <comando> | paso.sh cierre <nombres...>" >&2; exit 2 ;;
esac
