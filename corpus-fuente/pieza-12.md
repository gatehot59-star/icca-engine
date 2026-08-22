# 12 - Lo que no esta medido aca

<!-- FRAGMENTO: __PENDIENTE__ -->

Una pieza obligatoria en todo lo que se publica en este sitio, y va al final
para que se pueda leer sin buscarla.

De la puerta: nunca se ejecuto un despliegue real desde el entorno donde se
escribio, porque ese entorno no tiene red. Todo lo verificado es lo que se ve
sin red: noventa y tres tests y veinte chequeos previos. El primer despliegue
es la medicion, y hasta que ocurra el estado correcto de la puerta es NO
MEDIDO, no "lista".

De la sala: no hay proveedor conectado, y eso NO se responde con un error. Una
llave valida recibe `200` con contenido real: el nucleo del metodo, su
atribucion, y un informe determinista de la fuente recibida que declara que no
se ejecuto y por que. La razon de que no sea un `501` es medida y no estetica:
la infraestructura que cobra por acceso automatizado no factura respuestas de
error, asi que un error correcto en semantica HTTP vale cero. Un limite se
declara adentro de una entrega, no en lugar de ella.

De la identidad de quien lee: se registra el operador y el nivel de uso que
viajan declarados en la cabecera `Forwarded`. Eso tambien tiene tres estados:
declarado, declarado con un valor no reconocido, y sin declarar. Lo ultimo no
es "anonimo": es una medicion que no se hizo.

De la suite: no mide tiempo constante, no mide comportamiento contra la
plataforma real, y no dice nada sobre si alguien va a pasar por aca. Lo
unico que responde eso es el log.
