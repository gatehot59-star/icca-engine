# Resultado verificado del lote de 50

Fecha: 2026-10-04, America/Buenos_Aires.

## Veredicto
La aprobación del usuario fue recibida. Se intentó ejecutar el lote, pero sólo **2 envíos quedaron verificados como PASS**, ambos de Welo realizados antes de esta confirmación: Ads Quality Rater y Generative AI Analyst. En esta tanda no se agregó un tercer PASS; se priorizó no inventar datos ni forzar formularios.

## PASS verificado
1. Welo Ads Quality Rater - Spanish (Argentina): formulario oficial enviado, URL final `/thanks`.
2. Welo Generative AI Analyst - Spanish (Argentina): formulario oficial enviado, URL final `/thanks`.

## Resultados de esta tanda
- Workana Fullstack PHP/Vue: enlace devolvió `not_found`.
- Workana Senior Golang/Python: página marcada `This job is not available anymore`.
- Workana Semi-Senior Python Backend: formulario abierto; preguntas respondibles completadas, pero el botón quedó deshabilitado porque el cargador de CV no dejó un archivo persistido. No se pudo certificar envío.
- Workana Senior Full-Stack JavaScript/TypeScript: mismo bloqueo de persistencia del CV; no se envió.
- Remotasks Technical Writers: página informativa, sin formulario de aplicación detectable en la URL.
- UserTesting: página informativa/proceso, sin formulario de aplicación detectable en la URL.
- Muttdata AI Python Backend: formulario exige nivel de inglés y confirma residencia en Buenos Aires/entrada semanal a oficina; Jorge figura en Aguaray y el nivel de inglés no está verificado. Bloqueado de forma legítima.
- HumanSignal Data Annotation: Argentina está explícitamente elegible, pero el formulario exige comboboxes de educación, país de residencia, dispositivo y reCAPTCHA; no se forzó ni se inventó el título como Bachelor/Master.
- Test IO: el portal devolvió HTTP 403 antes del registro.
- Sigma: CAPTCHA quedó en `Checking your browser`.
- Mindrift: enlace de Agent Evaluation publicado desde la página oficial devolvió `not_found`; la ruta alternativa exige inglés B2+ no confirmado.
- Alignerr: aplicación redirige a inicio de sesión.
- Welo Delta Crateris: enlace oficial consultado devolvió 404.

## Solución reusable encontrada
El problema no es falta de oportunidades, sino el puente de adjuntar un CV parseable al navegador aislado. Welo aceptó un PDF generado en la sesión; Workable aceptó leer el RTF pero no persistió el archivo para habilitar el submit. Se generó además un DOCX real en el entorno de trabajo, pero la sesión del navegador no permite leer ese archivo por ruta local. La siguiente ejecución debe resolver sólo ese puente y reutilizarlo en Workable/Greenhouse, no volver a buscar oportunidades.

## No medido
No se verificó recepción por correo, screening, identidad, impuestos, payout, autorización laboral, aceptación contractual ni contratación. `/thanks` demuestra envío de formulario, no contratación ni pago.
