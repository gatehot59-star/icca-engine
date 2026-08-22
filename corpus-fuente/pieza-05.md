# 05 - Un test que no puede fallar no mide nada

<!-- FRAGMENTO: __PENDIENTE__ -->

Una suite verde es informacion solo si existe una version del codigo que la
pone roja. Si no se probo eso, lo que hay es una suite que corre, no una
suite que mide.

Procedimiento: romper el codigo a proposito y exigir el rojo. En esta puerta
se hizo con cinco sabotajes. Cuatro dieron rojo: reordenar los guards, estirar
la ventana de gracia, devolver un error en vez de la entrega, y quitarle la
atribucion al contenido entregado. El quinto, cambiar la comparacion de tiempo
constante por un `===` comun, **dio verde**: la suite no puede medir tiempo.

Ese verde es el resultado mas util de los cinco, porque nombra el hueco. Un
sabotaje que no rompe nada no dice "el codigo es robusto": dice "la suite no
mira ahi".
