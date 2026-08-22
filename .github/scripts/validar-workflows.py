#!/usr/bin/env python3
"""Guard de los workflows. Atrapa dos defectos que ya costaron un run cada uno.

DEFECTO 1 - un contexto que no existe donde se lo usa.
El run 33 de este repo fallo al ARRANCAR, con cero jobs y sin un solo check run,
porque un job declaraba `env: DIR_PASOS: ${{ runner.temp }}/...`. El contexto
`runner` no se resuelve en `jobs.<id>.env`: solo existe dentro de los steps. El
sintoma es el peor posible, porque no se parece a un error: el estado del commit
queda VACIO, y un estado vacio se lee como "todavia no corrio".

DEFECTO 2 - dos jobs con el mismo nombre visible en workflows distintos.
El commit 1b34913 quedo con cuatro check runs llamados los cuatro "verificar".
El nombre del job ES el nombre del check run, asi que el estado del commit era
ilegible: no habia forma de saber cual de los dos trabajos habia fallado.

POR QUE NO USA UN PARSER DE YAML: el sandbox donde se escribe esto no tiene
PyYAML, y un guard que solo corre en el CI no puede probarse antes de
commitearlo. Verificado, no supuesto: `import yaml` levanta
ModuleNotFoundError aca. Asi que el analisis es por lineas e indentacion, y el
alcance queda declarado abajo en LIMITES.

LIMITES de este guard, dichos para que nadie lea su verde como mas de lo que es:
  - Asume la indentacion convencional de dos espacios y no valida el YAML.
  - Solo mira los bloques `env:` de nivel workflow (columna 0) y de nivel job
    (columna 4). No mira los `env:` de un step, y esta bien: ahi `runner` SI
    es valido.
  - No comprueba que las acciones existan ni que los comandos corran.

Uso: python3 validar-workflows.py <archivo.yml> [...]
"""
import re
import sys

# Contextos que el evaluador de GitHub resuelve dentro de un env de workflow o
# de job. La lista es cerrada a proposito: lo que no esta aca se rechaza y se
# revisa a mano, que sale mas barato que un run que no arranca.
CONTEXTOS_EN_ENV = {"github", "vars", "secrets", "inputs"}

EXPRESION = re.compile(r"\$\{\{(.*?)\}\}")
NOMBRE_CONTEXTO = re.compile(r"\b([a-z_][a-z0-9_]*)\s*\.")
CLAVE = re.compile(r"^(\s*)([A-Za-z_][A-Za-z0-9_.-]*):(.*)$")


def sangria(linea):
    return len(linea) - len(linea.lstrip(" "))


def contextos(texto):
    hallados = []
    for cuerpo in EXPRESION.findall(texto):
        hallados.extend(NOMBRE_CONTEXTO.findall(cuerpo))
    return hallados


def revisar(ruta, fallas, nombres):
    with open(ruta, encoding="utf-8") as fh:
        lineas = fh.read().split("\n")

    # Estado del recorrido: en que bloque env estamos y a que sangria empezo.
    env_desde = None
    job_actual = None
    en_jobs = False

    for numero, linea in enumerate(lineas, start=1):
        if not linea.strip() or linea.lstrip().startswith("#"):
            continue
        col = sangria(linea)
        m = CLAVE.match(linea)

        # Salimos del bloque env cuando la sangria vuelve a su nivel o menos.
        if env_desde is not None and col <= env_desde:
            env_desde = None

        if m:
            clave, resto = m.group(2), m.group(3)

            # Hay que saber si estamos dentro de jobs:. Sin este flag, las
            # claves de on: (pull_request, push) tambien estan a columna 2 y se
            # contaban como jobs. Medido: el guard reportaba un job repetido
            # llamado 'pull_request'. Un guard con falsos positivos se apaga, y
            # un guard apagado no protege nada.
            if col == 0:
                en_jobs = clave == "jobs"
                job_actual = None

            # Un job es una clave a columna 2 dentro de jobs:. Su 'name' esta a
            # columna 4. Se registra el id y, si aparece un name, lo reemplaza.
            if en_jobs and col == 2 and resto.strip() == "":
                job_actual = clave
                nombres.setdefault(clave, []).append(f"{ruta}:{clave}")
            elif en_jobs and col == 4 and clave == "name" and job_actual:
                visible = resto.strip().strip("'\"")
                # El id ya se registro: se lo saca y se registra el name real.
                clave_id = f"{ruta}:{job_actual}"
                for k, v in list(nombres.items()):
                    if clave_id in v:
                        v.remove(clave_id)
                        if not v:
                            del nombres[k]
                nombres.setdefault(visible, []).append(clave_id)

            # env: a nivel workflow (columna 0) o a nivel job (columna 4).
            if clave == "env" and resto.strip() == "" and col in (0, 4):
                env_desde = col
                continue

        if env_desde is not None:
            for ctx in contextos(linea):
                if ctx not in CONTEXTOS_EN_ENV:
                    nivel = "workflow" if env_desde == 0 else "job"
                    fallas.append(
                        f"{ruta}:{numero}: env de nivel {nivel} usa el contexto "
                        f"'{ctx}', que no se resuelve ahi. Permitidos: "
                        f"{sorted(CONTEXTOS_EN_ENV)}. El run no arranca y no "
                        f"deja ningun check run."
                    )


def main(rutas):
    fallas = []
    nombres = {}
    for ruta in rutas:
        revisar(ruta, fallas, nombres)

    for visible, duenos in sorted(nombres.items()):
        if len(duenos) > 1:
            fallas.append(
                f"nombre de job repetido '{visible}' en {', '.join(duenos)}. El "
                f"nombre del job es el nombre del check run: repetido, el "
                f"estado del commit no dice cual trabajo fallo."
            )

    for f in fallas:
        print("FALLA: " + f)
    print(f"workflows revisados: {len(rutas)}  hallazgos: {len(fallas)}")
    return 1 if fallas else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("uso: validar-workflows.py <archivo.yml> [...]", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
