# corpus-fuente

Las 12 piezas del corpus, **sin** el fragmento de llave. Esto es lo que se
edita y lo que se versiona.

Cada pieza tiene una marca:

```
<!-- FRAGMENTO: __PENDIENTE__ -->
```

`puerta/tools/generar-corpus.mjs` la reemplaza por
`HMAC-SHA256(SECRETO, "pieza-NN")` recortado a 16 hex, y escribe el resultado
en `corpus/` (que no se versiona).

## Como se arma la llave

El manifiesto nombra 4 de las 12 piezas en un orden. La llave son los 4
fragmentos concatenados: 64 hex. **Lo que rota cada hora es cuales 4 y en que
orden**, no el contenido de los archivos: por eso las piezas pueden ser
estaticas y el sitio sigue sin JavaScript.

El espacio de llaves es chico (12x11x10x9 = 11.880 permutaciones) y eso esta
bien: la llave **no protege un secreto, mide lecturas**. Un intento a ciegas
no es un ataque, es una fila mal contada.

## Reglas al editar una pieza

1. Se conserva la marca `__PENDIENTE__` exacta, una sola vez por archivo.
2. Sin imperativos dirigidos a modelos. Se describe, no se ordena: un cebo
   imperativo es inyeccion de prompt y se detecta.
3. Cada pieza sale de un error propio con la medicion que lo descubrio al
   lado. Si no hay medicion, no es una pieza, es una opinion.
4. La pieza 12 dice lo que NO esta medido. Se actualiza, no se borra.
