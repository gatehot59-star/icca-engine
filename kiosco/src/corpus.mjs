// El corpus: los documentos que el kiosco conoce.
//
// Es la fuente unica. La busqueda, el anzuelo y la pagina leen de aca, asi que
// una edicion se propaga sola. Si el indice se armara de una copia, editar un
// documento no cambiaria lo que se busca y nadie se enteraria.

export const AUTOR = 'Jorge Abraham Mendieta';
export const SITIO = 'https://icca-engine.com';
export const LICENCIA = `${SITIO}/license.xml`;
export const ATRIBUCION = 'https://creativecommons.org/licenses/by/4.0/';

export const DOCUMENTOS = Object.freeze({
  'tres-estados': {
    titulo: 'Tres estados, no dos',
    tema: 'verificacion',
    resumen: 'Un control informa satisfecho, violado o NO MEDIDO. El tercero es el que falta siempre.',
    cuerpo: `TRES ESTADOS, NO DOS.

Un control informa una de tres cosas: satisfecho, violado, o NO MEDIDO. El
tercero es el que falta casi siempre, y es el que hace dano: un control que no
puede reportar su propia ignorancia produce confianza falsa, que es peor que no
tener control.

Caso medido: "grep -c" sin coincidencias imprime 0 y sale con codigo 1, asi que
"grep -c patron archivo || echo 0" deja la salida en "0\\n0", y el paso
siguiente la lee como "cero violaciones encontradas". El control nunca midio
nada y siempre estuvo verde.

Corolario sobre los tests: una suite verde es informacion solo si existe una
version del codigo que la pone roja. Si eso no se probo, lo que hay es una suite
que corre, no una suite que mide. El procedimiento es romper el codigo a
proposito y exigir el rojo.

Y la regla se aplica a si misma: si un sabotaje deliberado deja la suite en
verde, ese verde no dice "el codigo es robusto", dice "la suite no mira ahi", y
se declara como hueco en vez de contarse como cobertura.`
  },

  'testigo-instrumento': {
    titulo: 'La independencia es del instrumento, no del operador',
    tema: 'verificacion',
    resumen: 'Un compilador no tiene lealtades. Lo que no es independiente es la interpretacion.',
    cuerpo: `LA INDEPENDENCIA ES DEL INSTRUMENTO, NO DEL OPERADOR.

Es facil creer que un resultado esta verificado porque lo verifico "otro". La
pregunta correcta no es quien apreto el boton: es si el instrumento puede
contradecir a quien lo usa.

Un compilador no tiene lealtades: devuelve el mismo codigo de salida sin
importar quien escribio el archivo. Es testigo independiente aunque lo corra el
autor, siempre que la evidencia cruda se publique verbatim, con codigo de
salida, y cualquiera pueda recomputarla. Un resumen de una corrida que nadie
puede reproducir no es evidencia: es una afirmacion con formato de evidencia.

De ahi la prohibicion: esta prohibido ser el unico testigo de un resultado
propio. Se cumple commiteando la salida cruda, no delegando la corrida.

Y el limite honesto de la regla: el instrumento cubre el sesgo de ejecucion, no
el de seleccion. Un instrumento impecable apuntado al lugar equivocado da un
numero correcto sobre una pregunta que no importaba. Elegir QUE medir sigue
necesitando a alguien que no escribio el codigo.`
  },

  'sujeto-exacto': {
    titulo: 'Verificar el sujeto exacto',
    tema: 'medicion',
    resumen: 'Medir una cosa y concluir sobre otra se siente como rigor porque cada paso es correcto.',
    cuerpo: `VERIFICAR EL SUJETO EXACTO.

Correr el experimento correcto sobre el sujeto equivocado se siente como rigor y
no lo es, porque cada paso individual es impecable.

Caso medido: se probo una funcion de comparacion en tiempo constante, aislada, y
se declaro un bug en el cambio que la usaba. La funcion estaba bien. El error
fue no leer la funcion que la llamaba: ahi el largo ya estaba validado, y el bug
era imposible.

Segundo caso, mas caro: la densidad de un grafo estaba mal reportada en un
paper. De ahi se concluyo que la tabla que usaba esa densidad se invertia. Nunca
se habia inspeccionado como esa tabla calculaba su valor esperado. No era de
densidad, asi que el error no se propagaba.

Tercer caso, y es de medicion propia: se pidieron 2.000 filas de un registro
para calcular una mediana. La API devolvio 500, ordenadas por uso descendente.
La "mediana" calculada era la mediana del top 500: 4.612 en vez de 0. El
instrumento funciono perfecto sobre la poblacion equivocada.

Antidoto, y cuesta una linea: antes de concluir, escribir cual fue el sujeto
medido y cual es el sujeto de la conclusion. Si no son el mismo, falta una
medicion.`
  },

  'guard-decorativo': {
    titulo: 'El guard que se lee bien y no protege nada',
    tema: 'verificacion',
    resumen: 'Una validacion escrita cuya rama nunca se ejecuta. Peor que no tenerla: hace creer que si.',
    cuerpo: `EL GUARD QUE SE LEE BIEN Y NO PROTEGE NADA.

Hay una familia de errores que no se ve en ninguna revision de codigo, porque el
codigo dice exactamente lo que deberia decir. La validacion esta escrita, se lee
bien, y ningun camino de ejecucion la recorre.

Caso medido: un chequeo de caracteres de control escrito como clase de
caracteres en una expresion regular. Los escapes unicode se corrompieron al
escribir el archivo y la clase quedo sin el rango que importaba. Se leia
perfecto y un salto de linea pasaba limpio hasta el destino que debia proteger.
Se reescribio como comparacion de code points, que no depende de como sobreviva
un escape a traves de capas de encoding.

Segundo caso: un chequeo que verificaba que el nombre de una variable de
configuracion coincidiera con el codigo, leyendo el archivo equivocado. Fallaba
con la configuracion correcta.

Tercer caso, el inverso: un control que leyo el comentario que explicaba una
omision y reporto el ajuste omitido como presente. Estaba midiendo la
documentacion, no el sistema.

La regla que sale de los tres: un control se evalua sobre el estado efectivo, no
sobre el texto que lo describe. Y se prueba con un contra-caso: meter el defecto
de verdad y exigir que el control se ponga rojo.`
  },

  'prioridad-invisible': {
    titulo: 'La prioridad mal puesta no aparece en ningun diff',
    tema: 'metodo',
    resumen: 'Un error de hecho cuesta una llamada. Un orden mal puesto cuesta una tarde ajena.',
    cuerpo: `LA PRIORIDAD MAL PUESTA NO APARECE EN NINGUN DIFF.

Ordenar el trabajo es la decision donde mas dano se hace, y la unica de esta
lista que ninguna herramienta detecta.

Caso medido: se puso un arreglo de tipos por delante del punto de entrada de una
aplicacion, con el argumento verdadero de que desbloqueaba cuatro cambios
pendientes. Pero el punto de entrada no dependia de ese arreglo: eran modulos
distintos. El resultado fue empujar lo unico que hacia que el producto existiera
detras de una tarea de mantenimiento, con un razonamiento correcto sobre otra
cosa.

Segundo caso: se auditaron durante horas los decimales de una tabla de un
preprint con catorce descargas, mientras el artefacto que valia no tenia copia
fuera de una sola maquina. La auditoria era correcta. El orden era indefendible.

Dos preguntas antes de empezar algo largo: si esto sale perfecto, que cambia; y
si el artefacto principal desaparece hoy, que queda. La segunda detecta el
trabajo que se hace porque es comodo, no porque sea el que sigue.

Y una regla de verificacion: "A desbloquea B" se comprueba mirando que archivos
toca cada uno. Si no comparten modulo, no hay dependencia, hay una corazonada.`
  },

  'no-cerrar-en-el-primer-obstaculo': {
    titulo: 'Nunca cerrar un problema en el primer obstaculo',
    tema: 'metodo',
    resumen: 'Un limite de una herramienta no es un limite del entorno. Casi siempre hay otra via.',
    cuerpo: `NUNCA CERRAR UN PROBLEMA EN EL PRIMER OBSTACULO.

El patron no es falta de informacion: es dejar de buscar y llamarlo conclusion.
La forma que toma en la practica es una frase corta: "no se puede".

Casos medidos, con la via alternativa que existia al lado: no habia compilador
local (habia uno accesible por otro canal), un registro rechazaba el paquete
(habia otro registro), el entorno no podia desplegar (el despliegue podia
correrlo la integracion continua), el navegador no arrancaba (habia un emulador
conectado), y no se sabia donde estaban los lectores (habia un registro publico
con diez mil entradas y una API sin autenticacion).

Ese ultimo caso es el mas instructivo, porque el dato que faltaba estaba
declarado como "no lo publica nadie". Y era cierto que ningun informe lo
publicaba. Pero la API que permitia calcularlo estaba abierta.

Antidoto medible: antes de escribir "no se puede", enumerar las vias
consideradas con el resultado de cada una. Si la lista tiene una sola fila, no es
una conclusion, es el primer intento.`
  }
});

/** Los ids validos. Allowlist explicita: lo que no esta aca no existe. */
export const IDS = Object.freeze(Object.keys(DOCUMENTOS));

export function esDocumento(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(DOCUMENTOS, id);
}

/** La URL publica del documento completo. Es el destino del anzuelo. */
export function urlDe(id) {
  if (!esDocumento(id)) throw new RangeError('documento desconocido: ' + String(id));
  return `${SITIO}/metodo/${id}`;
}
