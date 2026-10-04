# Reintento de 10 rutas Argentina-ready

Fecha: 2026-10-04, America/Buenos_Aires.

## Resultado
- **PASS: Futureproofing Fullstack AI Software Engineer - LATAM.** Formulario Ashby enviado. La respuesta de servidor fue `FormSubmitSuccess` en `ApiSubmitSingleApplicationFormAction`.
- **BLOCKED: Outlier Coding Expert LATAM.** Se solicitó el enlace de acceso a `luzdelmistarraga@gmail.com`; el acceso queda pendiente de abrir el magic link.
- **STALE: Workana Front-end React/Next.js Buenos Aires.** La URL del lote devolvió HTTP 404 / `This job can't be found` durante este reintento.
- **BLOCKED: Workana Senior Full-Stack JavaScript/TypeScript.** La vacante publicada permaneció abierta, pero el cargador de CV de Workable no dejó el archivo persistido y no generó POST de aplicación verificable.
- **BLOCKED: Workana Senior Python Backend.** La ruta oficial actual `setDxEQ...` abrió formulario; el CV fue cargado y parseado, pero no apareció POST de envío verificable. El formulario quedó bloqueado por la capa de validación/captcha de Workable.
- **BLOCKED: Workana Semi-Senior Python Backend.** El formulario de la ruta anterior abrió, pero el cargador de CV/validación no habilitó un envío verificable.
- **STALE: Workana Backend Engineer Argentina.** La URL devolvió `This job is not available anymore`.
- **BLOCKED: Workana AI Application Engineer Part-Time Argentina.** Formulario activo, pero exige expectativa horaria numérica en USD. No se inventó una cifra; el CV, portfolio y demás datos no se enviaron sin ese parámetro.
- **BLOCKED: HumanSignal Data Annotation Contributor.** Argentina sí figura entre los países elegibles, pero el formulario exige educación, residencia, dispositivo y reCAPTCHA; no se forzó CAPTCHA ni se transformaron las credenciales reales en un Bachelor/Master.
- **NOT MEASURED/BLOCKED: Remotasks Coding Experts T3.** La página confirma Argentina y hasta USD 45/h, pero es informativa y redirige al registro/login de Remotasks; no hubo formulario de aplicación directa ni se creó cuenta nueva.

## Evidencia fuerte
Futureproofing: respuesta del servidor `FormSubmitSuccess`. Outlier: pantalla `To continue, click the link sent to luzdelmistarraga@gmail.com`. Workana Front-end y Backend: 404/no disponible. Workable Python: upload a S3/autofill 200, pero sin POST de aplicación.

## No medido
No se verificó email de aceptación, screening, identidad, impuestos, payout, autorización laboral, contrato ni fecha de cobro. Un `FormSubmitSuccess` sólo prueba recepción del formulario.