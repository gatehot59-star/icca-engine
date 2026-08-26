# 00 · ENTORNOS Y CAPACIDADES · leer esto antes de decir "no puedo"

**Última medición en vivo: 2026-08-26.** Todo lo que sigue está **medido**, no supuesto. La evidencia cruda está commiteada en `gatehot59-star/drosophila-fep-connectome`, rama `titan/twohop-nulls`, en `docs/agents/evidencia/2026-08-26-124-runner-*-medido-en-vivo.md`, **escrita por el propio runner y no por un agente**.

> **Este archivo es idéntico en los cuatro repos del proyecto.** Se actualiza en los cuatro a la vez.
>
> **La bitácora NO está acá.** Vive solo en el repo del proyecto presente: `docs/agents/respuestas/` y `docs/agents/evidencia/` en el conectoma, y `docs/agents/02-BITACORA.md` en `mudh-mobile`. Este archivo es **inventario de capacidades**, no historia.

---

## 0. Por qué existe este archivo

Se midió el daño: cuatro veces en una sola jornada se declaró imposible algo que estaba disponible. El patrón siempre es el mismo, **un mapa incompleto presentado como el mapa**:

- "el entorno no tiene red" → tenía red, faltaba `curl`
- "hay que instalar estos 9 paquetes" → `pip3 install` funcionaba solo
- "no puedo compilar C" → cierto en una máquina, falso en la otra
- "no puedo leer los logs de CI" → los **runs y los steps** sí se leen; el **texto** del log no

**La regla que sale de eso:** hay **tres** máquinas, no una. Antes de decir que algo no se puede, hay que preguntar **en cuál de las tres**.

---

## 1. Las tres máquinas, de un vistazo

| | **`brain-env`** (entorno virtual) | **Actions x64** | **Actions arm64** | **Kaggle** |
|---|---|---|---|---|
| qué es | taller persistente | fábrica efímera | fábrica efímera arm | GPU |
| CPU | **2** (Celeron N4020 @1,1 GHz) | **4** (AMD EPYC 9V74) | **4** (aarch64) | 2-4 |
| RAM | 8 GB (**~1,7 GB disponible**) | **16 GB** (14,9 libres) | **16 GB** (15,2 libres) | 13-16 GB |
| disco | **156 GB libres, PERSISTENTE** | 86 GB libres, se borra | 108 GB libres, se borra | efímero |
| throughput medido | **2,79 M iter/s** | **32,34 M iter/s** | **39,31 M iter/s** | no medido |
| binarios presentes | **9 de 61** | **55 de 61** | **51 de 61** | no medido |
| GPU | **no** (medido) | **no** | **no** | **sí, T4/P100** |
| concurrencia | 1 máquina | **20 jobs** | comparte los 20 | **4 slots** |
| tope por tarea | ~55 s por llamada | **6 horas** | 6 horas | ~9-12 h |
| estado entre usos | **sobrevive** | **se destruye** | se destruye | se destruye |
| costo | 0 | **0 en repo público** | **0 en repo público** | 0 |

### El número que ordena todo

**El runner es 11,6 veces más rápido que `brain-env` en el mismo trabajo, con el mismo script, medido.**

```plain
1 tarea en serie:   brain-env 0,751 s  |  x64 0,145 s  |  arm64 0,192 s
throughput total:   brain-env 2,79     |  x64 32,34    |  arm64 39,31  (M iter/s)
```

Y el **arm64 le gana al x64**: 39,31 contra 32,34, con speedup 3,77× sobre 4 núcleos contra 2,35× del x64.

La causa del hueco no es misteriosa: `brain-env` corre en un **Celeron N4020 de netbook a 1,10 GHz, con la RAM casi llena y `loadavg 2,13` sostenido**; el runner, en un **AMD EPYC 9V74 de 80 núcleos** recién arrancado.

**Consecuencia práctica:** los **390,5 minutos** que tardó la corrida CPU del conectoma en `brain-env` son **~34 minutos en un solo runner**, y minutos si se shardea en la matriz.

---

## 2. `brain-env` · el taller

**Cómo se usa:** servicio `build` del gateway MUDH, herramienta `run`. Es un shell dentro del container aislado. **Soy root** (`uid=0`).

### Lo que tiene, medido

- **Python 3.12.14** y el **stack científico completo**: `numpy 2.5.2`, `scipy 1.18.1`, `pandas 3.0.5`, `pyarrow 25.0.1`, `matplotlib 3.11.1`, `networkx 3.6.1`, `scikit-learn 1.9.0`, `psutil 7.2.2`, `requests 2.34.2`
- **`arcengine 0.1.0`** instalado: el motor de ARC-AGI-3 corre acá
- **`dulwich 1.2.13`**: git en Python puro, clona repos **sin** el binario `git`
- **`xtensa-esp32-elf-gcc`** en `/opt/xtensa-esp-elf/bin`: el compilador cruzado de ESP32
- **Java 17 + `javac`**, **Node v24.18.0 + npm**, `make`, `curl`
- **156 GB libres en `/workspace`, y persisten entre llamadas**
- **Egress abierto:** 33 de 33 destinos alcanzables (PyPI, GitHub, Kaggle, Zenodo, FlyWire, arXiv, Cloudflare, Debian, Espressif)

### Lo que NO tiene, medido

**FALTAN 52 de 61 binarios.** Los que duelen: `gcc`, `cc`, `g++`, `clang`, **`git`**, `ps`, `pgrep`, `top`, `free`, **`docker`**, `podman`, **`gradle`**, `cmake`, `ninja`, `bazel`, `jq`, `yq`, `gh`, `unzip`, `zip`, `wget`, `less`, `sqlite3`, `psql`, `mysql`, navegadores, `aws`/`az`/`gcloud`, `cargo`, `rustc`, `nvidia-smi`.

### Sus tres reglas operativas

1. **`pip3 install` FUNCIONA.** No existe `EXTERNALLY-MANAGED`. Cualquier paquete de Python se instala solo, sin pedir nada a nadie.
2. **`apt-get` existe pero NO se usa a ciegas.** El 2026-08-22 un `apt-get install` desde adentro dejó el gateway en **502 en todos los servicios**, no solo `build`, y volvió solo a los minutos. Con ~1,7 GB de RAM disponible, eso se hace con la máquina tranquila y con Abraham mirando.
3. **El shell del gateway es `sh` y pre-expande `$`.** Los heredocs revientan (`Syntax error: "(" unexpected`) y `$var` dentro de un `for` sale **vacía**: un `for b in ...; do echo $b` imprimió 57 líneas de `OK` sin nombre al lado. **Vía que sí funciona:** generar el script, pasarlo en base64 y decodificarlo adentro. Y **nada de backticks** en texto que pase por ese shell: se ejecutan.

### Para qué es insustituible

- **Estado que sobrevive.** Los 156 GB con logs, parquets y corridas a medio hacer.
- **Trabajos largos al fondo**, poleables entre turnos, sin tope de 6 horas.
- **Iteración interactiva:** abrir un archivo, tocarlo, volver a correrlo.
- **El toolchain de ESP32 ya instalado.**
- **La credencial de Kaggle**, en `/root/.kaggle/kaggle.json`.

---

## 3. Actions · la fábrica

**Cómo se usa:** se escribe un `.yml` en `.github/workflows/` y **el push lo dispara**. No hace falta apretar ningún botón.

### El hecho económico que decide todo

> **Actions con runners estándar es GRATIS e ILIMITADO en repositorios PÚBLICOS.** En privados consume la cuota del plan (2.000 min/mes en Free).
>
> **Y el runner público es MEJOR máquina: 4 vCPU / 16 GB contra 2 vCPU / 8 GB del privado.** El doble, gratis.

**Estado real hoy:** `drosophila-fep-connectome` es público y ya usa Actions. `icca-engine` es público. `mudh-mobile` y `dualbrain` son **privados**, y `mudh-mobile` corre **7 workflows** contra la cuota.

### Lo que tiene, medido ejecutándolo

**55 de 61 binarios en x64, 51 de 61 en arm64.**

```plain
gcc     : gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0
git     : git version 2.55.0
docker  : Docker version 28.0.4, build b8034c0
java    : openjdk version "17.0.20" 2026-07-21
cmake   : cmake version 3.31.6
gh      : gh version 2.97.0 (2026-07-31)
node    : v22.23.2
```

Y presentes: `g++`, `gfortran`, `clang`, `kotlinc`, **`gradle`**, `ninja`, `bazel`, `podman`, `buildah`, `skopeo`, `helm`, `kubectl`, `minikube`, `pulumi`, `packer`, `ansible`, `aws`, `az`, `gcloud`, `cargo`, `rustc`, `jq`, `yq`, `sqlite3`, `mysql`, `psql` (solo x64), Chrome + Chromium + Firefox + sus drivers (x64), Firefox + geckodriver (arm64), `ps`, `top`, `free`, `lsof`, `unzip`, `zip`, `wget`, `less`, `rsync`.

**Imagen exacta:** `ubuntu24`, `ImageVersion 20260816.277.1`, kernel `6.17.0-1022-azure`. La arm64: `ubuntu24-arm64`, `20260817.96.1`.

### Lo que NO tiene, y es el hallazgo que da vuelta la intuición

```plain
FALTA numpy      FALTA scipy      FALTA pandas     FALTA pyarrow
FALTA matplotlib FALTA networkx   FALTA psutil     FALTA sklearn
FALTA cupy       FALTA arcengine  FALTA dulwich
OK    requests 2.31.0
```

> **El runner NO trae el stack científico de Python, y `brain-env` sí.** Es exactamente al revés de lo que uno supondría. Cualquier workflow que toque el conectoma **tiene que instalar sus dependencias**, y ahí conviene `actions/setup-python` con cache de pip, o `actions/cache` sobre `~/.cache/pip`.

También faltan: `terraform`, `uv`, **`nvidia-smi`** (no hay GPU) y **`xtensa-esp32-elf-gcc`** (el cross de ESP32 se instala con la action `espressif/esp-idf-ci-action`).

**Y el detalle que decide dónde va MUDH-Mobile:** `ANDROID_HOME=/usr/local/lib/android/sdk` **en x64**, y **VACÍO en arm64**. **Android va en x64, no en arm.**

### Pruebas reales que corrieron, no dichos

**Compilación C99 nativa con `-Wall -Wextra -Werror`:**

```plain
exit_compilacion=0
gate_acc=2007
INT32_MAX=2147483647  INT32_MAX+1_en_int64=2147483648
pares_ordenados=19220633682  aristas_aprox=14918743
probe_c99 OK
exit_ejecucion=0
   text    data    bss    dec    hex   filename
   1748     600      8   2356    934   probe_c99      <- x64
   2003     640      8   2651    a5b   probe_c99      <- arm64
```

Tres cosas de esos números:

1. **`gate_acc=2007` idéntico en x64 y arm64.** Cross-check de portabilidad gratis, con el mismo instrumento.
2. **El `.text` cambia con la arquitectura (1748 vs 2003 bytes).** Directamente relevante para DualBrain, cuyo número de producto **es** un tamaño de `.text`.
3. **`pares_ordenados` no desbordó.** El overflow int32 del paper 1 queda con un test que puede dar rojo.

**Docker de verdad:**

```plain
28.0.4 linux/x86_64     |     28.0.4 linux/aarch64
docker run --rm alpine:3.21  ->  dentro-del-container / x86_64 y aarch64
exit=0
```

**Costo en tiempo de todo eso junto** (checkout + medir 61 binarios + compilar C + bajar y correr Alpine + commitear la evidencia): **16 segundos en x64, 13 en arm64.**

### Sus límites duros, oficiales

**6 horas por job** · 35 días por workflow run · **256 jobs por matriz** · **20 jobs concurrentes** en plan Free (40 Pro, 60 Team) · 5 macOS concurrentes · workflow máximo 500 KB · cache: 200 subidas / 1500 bajadas / 400 borrados por minuto.

**GPU: `Not applicable` en Free.** Existe una `Tesla T4` de 16 GB en *larger runners*, pero cuesta **0,052 USD/min = 3,12 USD/hora**, exige **plan Team (4 USD/usuario/mes) Y ser organización** (los repos hoy cuelgan de una cuenta `User`), y la letra chica dice **"the hosted runners are not free for public repositories"**. O sea: pagar **destruye** la gratuidad. Una RTX 4090 en Vast.ai sale **0,336 USD/hora** con 24 GB. **La GPU de Actions sale 9,3× más. No se paga.**

### La regla no negociable de Actions

**Ningún agente puede leer el TEXTO de un log.** Medido: `GET /actions/runs/<id>/logs` devuelve **403** incluso en repo público y sin token.

**Lo que SÍ se lee sin credencial, en repo público:** `GET /actions/runs` y `GET /actions/runs/<id>/jobs` devuelven **200**, con status, conclusion y **el estado de cada step**. Eso alcanza para saber **dónde** murió, no **por qué**.

> **Por lo tanto: todo workflow commitea su propio resultado al repo.** Un artifact expira y es invisible; un archivo commiteado lo lee cualquiera. Si un workflow no escribe su resultado, nadie va a saber qué pasó.

Y el diagnóstico que hay que saber leer: **un run que falla con CERO jobs creados no es un job que falló, es YAML que no parseó.** Pasó hoy: un `EOF` de heredoc sin indentar dentro de un bloque escalar. La solución no fue pelear con la indentación, fue **mover el código a archivos versionados** (`tools/probe_c99.c`, `tools/probe_maquina.py`) y dejar que el workflow solo los invoque.

---

## 4. Kaggle · la GPU

**Cómo se usa:** API v1 con **Bearer token**; la credencial vive en `brain-env`, en `/root/.kaggle/kaggle.json`. Se empuja un kernel, se poléa el status, se baja el output.

**Medido hoy:** usuario `abrahammendieta` autenticado (`/hello` → 200), **26 kernels propios**, el último `complete`.

**Lo que da:** GPU T4/P100 gratis, **2 sesiones GPU simultáneas por cuenta** (con dos cuentas, **4 slots**), ~27,9 h + 29,3 h de cuota libre medidas.

**La trampa que ya costó un diagnóstico entero:** el 403 no era permiso, **era el slug**. Kaggle *title-slugifica* los refs, así que hay que usar el ref real y no el que uno supuso.

**Estado de ARC Prize 2026, medido hoy:**

```plain
arc-prize-2026-arc-agi-3     entered=False  deadline=2026-11-02  reward=850.000 USD
arc-prize-2026-arc-agi-2     entered=False  deadline=2026-11-02  reward=700.000 USD
arc-prize-2026-paper-track   entered=False  deadline=2026-11-09  reward=450.000 USD
```

**Aceptar las reglas es acción humana.** No hay endpoint de API y el navegador no tiene sesión: son tres clicks de Abraham.

---

## 5. Qué máquina para qué proyecto

### `drosophila-fep-connectome` · Python, **PÚBLICO** · ciencia + ARC

| tarea | dónde | por qué |
|---|---|---|
| nulls, barridos, matrices de permutación | **Actions x64, matriz de hasta 20** | 11,6× por máquina y gratis ilimitado. Instalar deps con `setup-python` + cache |
| GPU (cupy, corridas grandes) | **Kaggle** | es la única GPU gratis |
| iterar el agente ARC contra entornos reales | **`brain-env`** | `arcengine` ya está instalado y el estado persiste. Falta solo la API key de `three.arcprize.org/platform` |
| exploración interactiva, parquets grandes | **`brain-env`** | numpy/scipy/pyarrow ya están y los 156 GB persisten |
| `guards.yml` con mutation testing | **Actions** | ya corre y **prueba que puede dar rojo**; hoy vive solo en la rama de trabajo, **no en `main`** |

**Deuda medida:** `main` **no tiene** `.github/workflows/`. El repo con cómputo gratis ilimitado tiene su CI solo en una rama.

### `mudh-mobile` · Kotlin/Android + TypeScript + C nativo · **privado**

| tarea | dónde | por qué |
|---|---|---|
| `./gradlew :app:testDebugUnitTest`, lint, typecheck | **Actions x64** | `gradle 9.7`, `kotlinc`, `javac` y **`ANDROID_HOME` poblado**. Nada de eso está en `brain-env` (`FALTA:gradle`) |
| emulador y tests instrumentados | **Actions x64** | los runners Linux tienen **aceleración de hardware** para el emulador. **Nunca arm64: `ANDROID_HOME` está vacío ahí** |
| compilar los probes de C (`wrap.c`, `scripts/container/`) | **Actions** | `gcc 13.3.0`. En `brain-env` es imposible |
| clean-room INC-002: build reproducible desde fuente | **Actions** | Docker y Podman de verdad. Los binarios **no se commitean** |
| ediciones de TypeScript, análisis, lectura | **`brain-env`** | Node 24 y npm están |

**Advertencia de costo:** es **privado**, así que cada minuto sale de los 2.000 del plan y el runner es **la mitad de máquina** (2 vCPU / 8 GB). Si su CI se vuelve intensivo, la decisión real es **público vs cuota**, no "más minutos".

### `dualbrain` · C99 · **privado**

| tarea | dónde | por qué |
|---|---|---|
| **tests nativos del C99** | **Actions** | `gcc 13.3` + `-Werror` + `size`. **Hoy no se pueden correr en ningún otro lado**: es lo único del expediente en cero absoluto |
| medir `.text` en x64 **y** arm64 | **Actions, matriz** | ya medido: el mismo `.c` da 1748 y 2003 bytes. Comparable con los **1.336 B** del target |
| cross-compilar a ESP32 | **`brain-env`** (ya tiene el toolchain) o **Actions** con `espressif/esp-idf-ci-action` | en el runner el cross **FALTA** y hay que instalarlo |
| benchmarks DBC3, gráficos | **`brain-env`** | matplotlib y numpy ya están |

### `icca-engine` · sitio de dos caras + Puerta de Cómputo · **PÚBLICO**

| tarea | dónde | por qué |
|---|---|---|
| build y test de la Puerta (`wrangler`, Workers) | **Actions** | Node 22 + npm; `wrangler` se instala por npm en el job |
| deploy del sitio estático | **GitHub Pages** | el repo es público y **`has_pages: false`**: hosting gratis **sin activar**. El sitio es cero JS, el caso ideal |
| **la Puerta de Cómputo** (proceso 24/7) | **NO en Actions** (corta a las 6 h) → **Oracle ARM o Daytona** | y **nunca** en la cuenta Cloudflare del dominio: suspensión cruzada |
| verificar el corpus, licencia RSL | **`brain-env`** | lectura y scripts |

---

## 6. Lo que cada máquina hace y la otra NO

### Solo Actions (imposible en `brain-env`)

1. **Compilar C/C++ nativo** — `FALTA:gcc` medido. Bloquea los tests de DualBrain
2. **`git` binario** 2.55 + LFS — `dulwich` clona, pero no es git
3. **`ps`, `top`, `free`** — lo que falló dos veces al reportar procesos
4. **Docker y Podman** — clean-room reproducible
5. **20 jobs en paralelo** — contra una sola máquina
6. **4 vCPU / 16 GB, y 11,6× más rápido**
7. **arm64 NATIVO** — el puente ESP32 → Raspberry sin emular
8. **macOS con Xcode** y **Windows** — gratis en repo público
9. **Gradle 9.7 + kotlinc + Android SDK** — `FALTA:gradle` acá
10. **Navegadores con Selenium** — leer páginas JS sin depender de otro servicio
11. **PostgreSQL y MySQL levantados**
12. **`gh`, `aws`, `az`, `gcloud`**
13. **Cron** — trabajo periódico sin dejar nada prendido
14. **VM limpia, con imagen inmutable y log público** — esto es **W-01 resuelto por construcción**: un resultado de `brain-env` carga sospecha de contaminación (57 procesos residuales de 71 h, paquetes instalados a mano); un job arranca de `20260816.277.1`, idéntica para cualquiera, **y su evidencia queda commiteada**. Cualquiera puede recomputar el veredicto y contradecirlo sin pedirle permiso a nadie

### Solo `brain-env` (imposible en Actions)

1. **Estado persistente** — 156 GB que sobreviven; Actions borra todo
2. **Procesos largos** — sin tope de 6 h, poleables entre turnos
3. **Iteración interactiva** — abrir, tocar, correr
4. **Stack científico ya instalado** — numpy/scipy/pandas/pyarrow/sklearn, que el runner **NO trae**
5. **`arcengine`** ya instalado y funcionando
6. **Toolchain de ESP32** ya instalado
7. **La credencial de Kaggle**

### Solo Kaggle

**GPU gratis.** No hay otra en el stack: ni `brain-env` ni Actions en Free la tienen, y comprarla en Actions sale 9,3× lo que sale afuera.

---

## 7. El orden de trabajo, con la dependencia verificada

**Criterio declarado:** qué está hoy en **cero absoluto** y pasa a posible, y qué cuesta más no hacer.

1. **Tests nativos del C99 de DualBrain en Actions.** Único ítem que hoy **no se puede correr en ninguna máquina**. No depende de nada ni de nadie.
2. **`guards.yml` a `main`** en el conectoma. Hoy el único CI del repo científico no protege la rama de la que otros clonan.
3. **Los nulls del conectoma en matriz de 20 jobs.** Libera los 4 slots de GPU de Kaggle para lo que sí necesita GPU.
4. **Activar GitHub Pages en `icca-engine`.** Hosting gratis, sitio estático, un toggle.
5. **Depositar el erratum en Zenodo.** `POST /api/deposit/depositions` responde 403 sin token: es **una llamada de API**, no una tarde. Falta solo un token con `deposit:write`.

**Verificado, no supuesto:** los cinco tocan módulos distintos y **ninguno depende de otro**. Pueden ir en paralelo.

**Lo que NO hay que hacer:** pagar GPU en Actions, ni montar un VPS antes de que exista un proceso que de verdad deba estar 24/7. Armar infraestructura antes del producto es el error caro.

---

## 8. Credenciales · qué falta y qué desbloquea

| falta | quién lo hace | qué desbloquea |
|---|---|---|
| **token de Zenodo** (`deposit:write`) | Abraham | el erratum, por API |
| **API key de `three.arcprize.org/platform`** (gratis) | Abraham | iterar el agente ARC contra entornos reales, sin gastar submissions |
| **3 clicks en los tracks de Kaggle** | Abraham (es declaración legal) | existir oficialmente en ARC Prize |
| token de neuPrint (gratis, Janelia) | Abraham | datos del conectoma por API |
| cuenta Oracle Cloud ARM | Abraham | el único VPS gratis que queda (2 OCPU / 12 GB), para procesos 24/7 |
| token de Cloudflare | Abraham | Workers y Tunnel para la Puerta |

**Medido:** `brain-env` **no tiene** credencial de GitHub (`env vars candidatas: []`). Las escrituras al repo salen por la integración de ClickUp, que es otro canal.

---

## 9. NO MEDIDO · lo que este archivo no sabe

- **No corrí un job en macOS ni en Windows.** Sus especificaciones son de la doc oficial.
- **No probé `ubuntu-slim`** (1 CPU, container sin privilegios, timeout 15 min).
- **No verifiqué el plan real de la cuenta de GitHub.** Los 20 jobs concurrentes asumen **Free**; con Pro serían 40.
- **No medí la cuota de minutos consumida** por `mudh-mobile`: el endpoint de billing pide un scope que la integración no expone. Que "se coma la cuota" es **inferencia** de tener 7 workflows en privado.
- **No probé el emulador de Android en el runner**, solo confirmé que `ANDROID_HOME` está poblado en x64.
- **No medí `psql` en arm64**: figura `FALTA` ahí y `OK` en x64.
- **No probé Oracle Cloud, Modal, Lightning ni RunPod con cuenta.** Solo que sus APIs son alcanzables.
- **No medí la causa del `loadavg 2,13`** sostenido en `brain-env` con cero procesos pesados. Queda abierto.
- **No corrí un job de 6 horas**: el tope es oficial, no medido.

---

## 10. Cómo se actualiza este archivo

**No se edita a mano con lo que uno recuerda.** Se vuelve a medir:

```bash
# la misma medicion en las dos maquinas, con el MISMO instrumento
python3 tools/probe_maquina.py salida.txt
```

Ese archivo vive en el repo del conectoma, en `tools/probe_maquina.py`, y es el mismo que corre el workflow `probe-entorno.yml`. **Usar el mismo instrumento en las dos máquinas no es prolijidad: si cada una se mide con un script distinto, la diferencia observada puede ser del script.**

El workflow se re-dispara solo cuando cambia él mismo o `tools/`, y **commitea su propia evidencia**. Después se actualizan las cuatro copias de este archivo.

---

*Instrumentos de esta versión: gateway MUDH servicio `build` (18 corridas, exit=0), runner de GitHub Actions (run `33009493423`, 2 jobs, ambos `success`, 16 s y 13 s), API v1 de Kaggle, API pública de GitHub, API pública de Vast.ai, y los archivos reales de `actions/runner-images` y `github/docs`.*
