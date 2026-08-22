#!/usr/bin/env bash
# CONTRA-CASO DEL GUARD DE WORKFLOWS, y no es ceremonia.
#
# Un guard que no puede dar rojo no mide nada: mide su propia existencia. Este
# script escribe dos workflows deliberadamente rotos, con los DOS defectos que
# el guard dice detectar, y EXIGE que el guard salga distinto de cero y que
# encuentre los dos. Si algun dia el guard queda siempre en verde, este paso se
# pone rojo.
#
# Los archivos van a un temporal fuera del arbol de trabajo, asi que ningun
# chequeo de arbol limpio los ve.
set -u

GUARD="${GUARD:-.github/scripts/validar-workflows.py}"
DIR="${RUNNER_TEMP:-/tmp}/contracaso-guard"
rm -rf "$DIR"
mkdir -p "$DIR"

# Defecto 1: el contexto runner en el env de un job. Es el error que hizo que el
# run 33 fallara al arrancar, con cero jobs y sin un solo check run.
# Defecto 2: dos jobs con el mismo nombre visible en workflows distintos, que es
# lo que dejo cuatro check runs llamados "verificar".
{
  echo 'name: contra-caso-a'
  echo 'on:'
  echo '  pull_request:'
  echo 'jobs:'
  echo '  uno:'
  echo '    name: repetido'
  echo '    runs-on: ubuntu-latest'
  echo '    env:'
  echo '      X: ${{ runner.temp }}/x'
  echo '    steps:'
  echo '      - run: echo hola'
} > "$DIR/a.yml"

{
  echo 'name: contra-caso-b'
  echo 'on:'
  echo '  pull_request:'
  echo 'jobs:'
  echo '  dos:'
  echo '    name: repetido'
  echo '    runs-on: ubuntu-latest'
  echo '    steps:'
  echo '      - run: echo hola'
} > "$DIR/b.yml"

echo '--- salida del guard sobre el contra-caso ---'
if python3 "$GUARD" "$DIR/a.yml" "$DIR/b.yml"; then
  echo 'FALLA: el guard NO detecto el contra-caso, asi que su verde no significa nada'
  rm -rf "$DIR"
  exit 1
fi

# El guard tiene que encontrar los DOS defectos, no uno. Si encontrara solo uno,
# saldria rojo igual y la otra mitad quedaria sin medir: rojo por el motivo
# equivocado se lee igual que rojo por el motivo correcto.
salida=$(python3 "$GUARD" "$DIR/a.yml" "$DIR/b.yml" || true)
hallazgos=$(printf '%s\n' "$salida" | grep -c '^FALLA:' || true)
rm -rf "$DIR"
if [ "$hallazgos" -lt 2 ]; then
  echo "FALLA: el guard encontro $hallazgos de los 2 defectos plantados"
  exit 1
fi

echo "OK: el guard se pone rojo y encontro los $hallazgos defectos plantados"
