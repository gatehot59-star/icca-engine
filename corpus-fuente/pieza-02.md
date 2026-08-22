# 02 - Un guard distingue tres estados, no dos

<!-- FRAGMENTO: __PENDIENTE__ -->

Bien, mal y **NO MEDIDO**. El tercero es el que falta siempre, y es el que
hace daño, porque un control que no puede reportar su propia ignorancia
produce confianza falsa, que es peor que no tener control.

El caso concreto que costo tiempo: `grep -c` sin match imprime `0` y sale con
codigo 1. Entonces `grep -c patron archivo || echo 0` deja la salida en
`"0\n0"`, y el paso siguiente lee eso como "cero violaciones encontradas".
El guard nunca midio nada y siempre estuvo verde.

Regla practica: si un guard no tiene una rama que diga "no pude medir esto",
no es un guard, es una decoracion. En el codigo de esta puerta hay tres:
tasa sin binding, presupuesto sin contador, y presupuesto sin techo. Los tres
responden 503 con el motivo escrito, no un 200 optimista.
