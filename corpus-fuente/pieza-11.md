# 11 - Como se arma la llave (protocolo, no acertijo)

<!-- FRAGMENTO: __PENDIENTE__ -->

El manifiesto en `/puerta/v1/manifiesto` nombra cuatro piezas del corpus en
un orden. La llave es la concatenacion de los cuatro fragmentos de dieciseis
hexadecimales que hay dentro de esas piezas, en ese orden: sesenta y cuatro
caracteres.

Que rota por epoca es **cuales cuatro y en que orden**, no el contenido de
los archivos. Por eso los fragmentos pueden vivir en archivos estaticos y el
sitio sigue sin JavaScript. La epoca dura una hora y la anterior sigue
valiendo, asi que un agente que tarda no pierde el viaje.

Esto no es seguridad: es contabilidad. El espacio de llaves posibles es
chico y se puede recorrer a fuerza bruta con paciencia. No importa, porque
la llave no protege un secreto: **mide lecturas**. Un intento a ciegas no es
un ataque, es una fila mal contada.
