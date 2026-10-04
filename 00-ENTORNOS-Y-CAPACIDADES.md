# 00 · ENTORNOS Y CAPACIDADES

**Última medición viva:** 2026-10-04, 10:59 ART.  
**Propósito:** inventariar el arsenal disponible antes de afirmar que algo no se puede hacer.  
**Alcance:** inventario universal. No asigna herramientas a proyectos ni reemplaza una medición específica del sujeto.

## Regla de lectura

Tres estados, siempre: **PASS**, **FAIL** y **NO MEDIDO**. Este archivo es una foto, no un contrato. Cuando una decisión dependa de una capacidad concreta, se vuelve a medir en la máquina exacta y con el instrumento exacto.

No se confunde:

- un binario ausente del `PATH` con una capacidad imposible;
- una API que lista recursos con una API que ejecuta trabajos;
- un kernel Kaggle `COMPLETE` con un recibo `PASS`;
- un token presente en un pool con un secreto publicado.

---

## 1. Arsenal compacto

| Superficie | Estado medido | Qué queda disponible |
|---|---|---|
| `brain-env` | **PASS** | shell persistente, red, Python científico, GCC, Android SDK/NDK, ESP32, toolchains persistentes de C++/CMake/Rust, Git, Node, Java y Kaggle CLI |
| Kaggle cuenta `fabiomurillohot` | **PASS** | autenticación, push, ejecución, status y descarga de output; 32 kernels visibles en el último barrido |
| Kaggle cuenta `abrahammendieta` | **PASS** | autenticación, push, ejecución, status y descarga de output; 58 kernels visibles en el último barrido |
| Kernel Kaggle CPU-only | **PASS** | Linux x86_64, CMake 3.31.10, Ninja 1.13.2, GCC/G++ 13.3.0 |
| GPU Kaggle | **NO MEDIDO en este corte** | no se usó GPU en la verificación actual |
| GitHub conectado | **PASS** | lectura de repos, ramas, archivos, PRs, commits y check runs; escritura controlada de ramas y archivos |
| ClickUp | **PASS** | Docs públicos, páginas, búsqueda y trazabilidad de entregas |
| Nexus SQLite | **PASS** | estado compartido, mensajes entre agentes, mediciones, bitácora y trabajos vivos |
| Gateway MUDH | **PASS** | servicios `build`, `kaggle`, `adb`, `playwright`, `registry`, `sqlite`, `supply-chain` y `seq-think` disponibles |

---

## 2. `brain-env` · taller persistente

### Identidad y recursos medidos

- Acceso canónico: gateway MUDH, servicio `build`, herramienta `run`.
- Usuario medido: `uid=1000(estudiante)`, grupo 1000 y grupo KVM 106.
- CPU visible: 2 cores.
- Kernel del container medido: Linux 4.19.0-27-amd64.
- Memoria disponible en el corte: 2.312.144 KiB, aproximadamente 2,21 GiB.
- `/workspace`: persistente entre llamadas; 94 GiB libres de 406 GiB en el corte.
- `/dev/kvm`: visible.
- `CUDA_HOME`: vacío; `nvidia-smi`: no disponible; GPU local: no medida como disponible.
- Egress: validado por GitHub, Kaggle y otros endpoints usados durante esta entrega.
- Shell del gateway: `sh`; scripts complejos se pasan como archivos o base64, no como heredocs frágiles.

### Binarios disponibles por `PATH` en el corte

- Python `3.12.14`.
- Node `v24.18.0` y npm `11.16.0`.
- Git `2.47.3`.
- GCC del sistema `14.2.0`; compila C nativo.
- Java/Temurin `17.0.20+8`.
- Kaggle CLI `2.2.4`.
- `make`, `curl`, `base64`, `timeout` y utilidades POSIX.

### Toolchains persistentes fuera del `PATH` por defecto

Estos binarios están instalados y fueron medidos usando rutas absolutas:

- `/workspace/homebrain/.local/share/mamba/bin/g++` `15.3.0`.
- `/workspace/homebrain/.local/share/mamba/bin/cmake` `4.4.4`.
- `/workspace/homebrain/.local/share/mamba/bin/ninja` `1.13.2`.
- `/workspace/homebrain/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin/rustc` `1.99.0`.
- `/workspace/homebrain/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin/cargo` `1.99.0`.
- `/opt/xtensa-esp-elf/bin/xtensa-esp32-elf-gcc` presente.

**Advertencia:** `g++`, CMake, Ninja, Rustc y Cargo pueden devolver `not found` si se consulta sólo el `PATH` base. Eso no significa que estén ausentes. La ruta persistente debe agregarse explícitamente al proceso.

### Stack Python medido

Presentes: `numpy`, `scipy`, `pandas`, `pyarrow`, `torch`, `scikit-learn`, `matplotlib`, `networkx`, `h5py`, `pydantic` y `pytest`. El stack científico está disponible en el taller; sus versiones deben consultarse antes de fijar una medición nueva.

### Android y hardware auxiliar

- `/home/estudiante/Android` presente.
- Plataformas: `android-36`.
- Build tools: `36.0.0`.
- NDK: `28.2.13676354` y `28.2.13676358`.
- `platform-tools/adb` presente en el SDK.
- `ANDROID_HOME` del shell actual: vacío; usar la ruta absoluta del SDK o exportarlo explícitamente.
- KVM visible desde el container.
- El servicio `adb` del gateway está conectado como superficie separada.

### Capacidades verificadas

- C nativo con GCC del sistema: compilación y ejecución medidas.
- CMake/Ninja/CTest en el toolchain persistente: configure, build y 16/16 CTest normal y ASan/UBSan medidos en el head de control.
- Rustc/Cargo: binarios presentes por ruta absoluta; conformance Rust-Mojo completa sigue siendo otro experimento.
- Git fetch/push controlado hacia repositorio conectado: medido sin publicar credenciales.
- Estado persistente, archivos, logs, fixtures, parquets y corridas largas: disponibles en `/workspace`.

### Límites medidos

No están en el `PATH` base del shell actual: `g++`, `clang`, `cmake`, `ninja`, `ctest`, `rustc`, `cargo`, `go`, `docker`, `adb`, `free`, `ps`, `pgrep`, `jq`, `unzip` y `zip`. Algunos tienen instalación persistente fuera del `PATH`; otros siguen ausentes.

`apt-get` no se usa a ciegas: una instalación histórica dejó el gateway en 502. Para paquetes persistentes se prioriza micromamba o una ruta versionada. Los procesos se inspeccionan por `/proc` cuando `ps`/`pgrep` no están disponibles.

---

## 3. Kaggle · ejecución remota reproducible

### Cuentas y credenciales

- Pool local: `/workspace/kaggle.json`, modo `600`.
- Cuentas validadas: `fabiomurillohot` y `abrahammendieta`.
- Los dos tokens respondieron correctamente contra su propia lista de kernels.
- Los secretos no se copiaron a Git, Nexus, Markdown, stdout ni logs.
- Selector persistente sin claves embebidas: `tools/kaggle_account.py`.
- Wrappers: `tools/kaggle-fabio` y `tools/kaggle-abraham`.
- Cada wrapper inyecta sólo el token elegido en memoria del proceso.

### Operaciones medidas

**PASS:** `kernels list`, `kernels push`, `kernels status` y `kernels output` funcionan desde `brain-env` con la cuenta seleccionada. El servicio MCP de Kaggle expone lectura de competencias, datasets y modelos; la ejecución completa se hace con la CLI autenticada dentro de `brain-env`.

### Entorno remoto medido

- Linux 6.18.48, x86_64, glibc 2.39.
- CMake `3.31.10`.
- Ninja `1.13.2.git.kitware.jobserver-pipe-1`.
- GCC/G++ `13.3.0`.
- Fuente montada en `/kaggle/src`, solo lectura.
- Área escribible: `/kaggle/working`.
- Kernel de control CPU-only, sin datasets ni Internet.

### Recibo remoto de control

En ambas cuentas se publicó y ejecutó el mismo kernel CPU-only sobre el mismo head de control:

- Configure, build y CTest normal: **16/16 PASS**.
- Configure, build y CTest ASan/UBSan: **16/16 PASS**.
- Cuenta `abrahammendieta`: kernel privado CPU-only, versión 4, estado `COMPLETE`.
- Cuenta `fabiomurillohot`: kernel privado CPU-only, versión 1, estado `COMPLETE`.
- Los JSON y logs crudos quedaron descargados y commiteados.

**GPU Kaggle:** `NO MEDIDO` en este corte. La prueba deliberadamente no reservó GPU.

---

## 4. Interfaces conectadas

- GitHub MCP: lectura de archivos/directorios, ramas, commits, PRs, comentarios, revisiones y check runs; escritura de ramas y archivos con SHA.
- ClickUp Brain: búsqueda de workspace, carga de Docs, creación de Docs públicos y páginas.
- Nexus SQLite: `query`, `execute`, `set_estado`, `escribir_mensaje`, `leer_mensajes`.
- Gateway `build`: shell real en `brain-env`.
- Gateway `kaggle`: datasets, competencias y modelos; kernels completos por CLI autenticada.
- Gateway `adb`: emulador, instalación, logcat, UI y acciones de device.
- Gateway `playwright`: navegador real, navegación, screenshots y evaluación web.
- Gateway `registry`: consultas de dependencias/registries.
- Gateway `supply-chain`: superficie de verificación de cadena de suministro.
- Búsqueda web y búsqueda indexada de workspace.

---

## 5. PASS, FAIL y NO MEDIDO

### PASS

- El taller tiene red efectiva, persistencia, Python científico, GCC C nativo, Android SDK/NDK, KVM, ESP32, Node, Java, Git y Kaggle CLI.
- El toolchain persistente de C++20/CMake/Ninja y Rust está instalado aunque parte no figure en el `PATH` base.
- Dos cuentas Kaggle son válidas y pueden publicar, ejecutar, consultar y descargar kernels privados.
- CMake/CTest remoto CPU-only pasó 16/16 normal y 16/16 ASan/UBSan en ambas cuentas.
- Los recibos remotos se pueden conservar como JSON y log crudo.

### FAIL

- No hay GPU local medida en `brain-env`.
- Docker/Podman no están disponibles en el shell actual de `brain-env`.
- C++ no debe probarse invocando `g++` sin preparar el `PATH`: el binario no está en el entorno base aunque sí existe por ruta persistente.
- No se debe usar el servicio MCP de Kaggle como si ofreciera ejecución de kernels: esa capacidad no está expuesta allí.

### NO MEDIDO

- Corrida GPU Kaggle en este corte.
- Device físico y ejecución arm64 del SDK Android.
- Runtime Mojo ejecutable y conformance Rust-Mojo completa.
- Cuota exacta de GitHub Actions y estado actual de todos sus runners.
- Rendimiento, energía y RAM de un hardware edge físico.
- Causa de cualquier fallo futuro de Actions: se debe leer el check run y, si corresponde, el log local del runner.

---

## 6. Protocolo de actualización

1. Medir en la máquina exacta: `brain-env`, kernel Kaggle u otra superficie conectada.
2. Registrar comando, versión, exit code y salida cruda.
3. Separar PASS, FAIL y NO MEDIDO.
4. No publicar secretos: los tokens se inyectan en memoria y se escanean los artefactos antes del commit.
5. Actualizar las cuatro copias de este archivo con el mismo texto.
6. Dejar el recibo Git y un Doc público de ClickUp.

**Este inventario no decide dónde va cada proyecto. Sólo dice qué arsenal existe y qué parte fue medida.**

---

*Instrumentos de este corte: gateway MUDH `build.run`, `kaggle` CLI 2.2.4, pool de cuentas con modo 600, GitHub MCP, ClickUp, Nexus SQLite y recibos JSON/log crudo de los kernels CPU-only.*