# Estado de postulaciones direct10

Fecha: 2026-10-04 (America/Buenos_Aires)

## Pedido
Ejecutar el lote aprobado de diez postulaciones directas, usando datos verdaderos y CV técnico.

## Herramientas y máquina
Se usó el navegador Playwright conectado al servicio de navegación de brain-env para formularios públicos. Se verificaron vacantes oficiales con búsqueda web. No se crearon cuentas nuevas ni se aceptaron declaraciones fiscales, KYC, identidad, NDA/SLA, autorización laboral o nivel de inglés no confirmado.

## Qué se midió
PASS: Welo Global Ads Quality Rater - Spanish (Argentina): formulario oficial completado y redirigió a `/thanks`.
PASS: Welo Global Generative AI Analyst - Spanish (Argentina): formulario oficial completado y redirigió a `/thanks`.
BLOCKED: Mindrift Agent Evaluation Engineer: enlace publicado desde `mindrift.ai/project/agent` devolvió `not_found`; se encontró un enlace Workable alternativo, pero el formulario exige indicar nivel de inglés y el nivel del candidato no está confirmado.
BLOCKED: Alignerr Software Engineer AI Code Ranking: el botón oficial redirige a `app.alignerr.com/signin`; requiere cuenta autenticada.
BLOCKED: Sigma AI Argentinian Spanish: el formulario oficial quedó en `Checking your browser` y exige confirmar dominio nativo de español e inglés; no se forzó el CAPTCHA ni se afirmó inglés no verificado.
BLOCKED: Welo Delta Crateris: el enlace oficial consultado devolvió 404; no se aplicó mediante agregadores.
NOT MEDIDO: Outlier, Anyone AI y las variantes restantes del lote: requieren sesión/cuenta o pasos adicionales no ejecutados en esta tanda.

## Datos usados
Nombre: Jorge Abraham Mendieta. Ubicación: Aguaray, Salta, Argentina. Formación declarada: Systems Analyst, Technical Education Teacher, Electronics Technician. Investigador independiente desde 2020. Evidencia: GitHub `https://github.com/gatehot59-star`, LinkedIn `https://ar.linkedin.com/in/jorge-abraham-mendieta-6468b71b5`. Correo usado: `luzdelmistarraga@gmail.com`.

## Evidencia cruda
- Welo Ads Quality Rater: URL final `https://jobs.lever.co/weloglobal/d9a91e49-8052-4ce6-836d-9ee264214b7d/thanks`
- Welo Generative AI Analyst: URL final `https://jobs.lever.co/weloglobal/5f67accd-d679-4b05-ab75-ed2366c0f10a/thanks`
- Mindrift publicado: `https://apply.workable.com/toloka-ai/j/07A6121198/` -> `https://apply.workable.com/toloka-ai/?not_found=true`
- Alignerr oficial: `https://www.alignerr.com/jobs/0af700c4-6319-43f0-8bba-08d28f336f48` -> `https://app.alignerr.com/signin?job=0af700c4-6319-43f0-8bba-08d28f336f48`
- Sigma oficial: `https://careers.sigma.ai/jobs/8451018-argentinian-spanish-linguistic-projects-remote-sigma-ai`, modal persistió en `Checking your browser`.
- Delta Crateris oficial: `https://jobs.lever.co/welocalize/6479d654-5e84-4cf4-a17c-81b80020aa24/apply` -> HTTP 404.

## Archivos generados
Este archivo, commit en rama `brain/applications-2026-10-04`.

## NO MEDIDO
No se verificó recepción por correo, aceptación, screening, tests, onboarding, identidad, impuestos, payout ni fecha de cobro. Dos redirecciones a `/thanks` prueban envío del formulario, no contratación ni pago.
