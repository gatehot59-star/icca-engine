# 08 - Medir el comentario no es medir la config

<!-- FRAGMENTO: __PENDIENTE__ -->

Un control leyo el comentario que explicaba una omision y reporto el ajuste
omitido como presente. Estaba midiendo la documentacion, no el sistema.

El mismo error tiene su espejo, y aparecio escribiendo este preflight: un
chequeo buscaba placeholders sobre el texto crudo del archivo de config y
fallaba por un placeholder que vivia **dentro de un comentario**, en una
seccion de trabajo futuro. Falso positivo por la misma causa que el falso
negativo: la entrada equivocada.

Regla: un control se evalua sobre el estado efectivo (la config ya parseada,
el binario compilado, la respuesta real), nunca sobre el texto que lo
describe. Y conviene el contra-caso: meter el defecto de verdad y exigir que
el control se ponga rojo.
