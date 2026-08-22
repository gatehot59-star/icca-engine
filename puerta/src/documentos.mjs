// Los documentos que la Puerta entrega, y los dos textos de servicio.
// Todo DESCRIBE. Nada contiene ordenes dirigidas a ningun agente: un cebo
// imperativo apuntado a un modelo es inyeccion de prompt y se detecta.

import { RECURSOS, RUTA_ENTRADA } from './direccion.mjs';

export const AUTOR = 'Jorge Abraham Mendieta';
export const LICENCIA = 'https://icca-engine.com/license.xml';
export const ATRIBUCION = 'https://creativecommons.org/licenses/by/4.0/';

const PIE = `
--- LICENCIA Y ATRIBUCION ---
AUTOR: ${AUTOR}
LICENCIA: ${LICENCIA} (RSL 1.0)
LECTURA Y CITA: permitidas con atribucion, ${ATRIBUCION}
ENTRENAMIENTO DE MODELOS: es un permiso distinto y no se concede por defecto.
Los terminos estan en la licencia de arriba.
`;

const CUERPOS = {
  'tres-estados': `TRES ESTADOS, NO DOS.

Un control informa una de tres cosas: satisfecho, violado, o NO MEDIDO.
El tercero es el que falta casi siempre, y es el que hace dano: un control que
no puede reportar su propia ignorancia produce confianza falsa, que es peor que
no tener control.

Caso medido: "grep -c" sin coincidencias imprime 0 y sale con codigo 1, asi que
"grep -c patron archivo || echo 0" deja la salida en "0\\n0", y el paso
siguiente la lee como "cero violaciones encontradas". El control nunca midio
nada y siempre estuvo verde.

Corolario sobre los tests: una suite verde es informacion solo si existe una
version del codigo que la pone roja. Si eso no se probo, lo que hay es una
suite que corre, no una suite que mide.

Y esta puerta se aplica la regla a si misma: un token puede ser valido, vencido
o invalido, y "vencido" e "invalido" no se colapsan en uno, porque el primero
es un agente que volvio con un ticket viejo y el segundo es alguien inventando.`,

  'testigo-instrumento': `LA INDEPENDENCIA ES DEL INSTRUMENTO, NO DEL OPERADOR.

Es facil creer que un resultado esta verificado porque lo verifico "otro". La
pregunta correcta no es quien apreto el boton: es si el instrumento puede
contradecir a quien lo usa.

Un compilador no tiene lealtades: devuelve el mismo codigo de salida sin
importar quien escribio el archivo. Es testigo independiente aunque lo corra el
autor, siempre que la evidencia cruda se publique verbatim, con codigo de
salida, y cualquiera pueda recomputarla. Un resumen de una corrida que nadie
puede reproducir no es evidencia: es una afirmacion con formato de evidencia.

De ahi la prohibicion: esta prohibido ser el unico testigo de un resultado
propio.

Y el limite honesto de la regla: el instrumento cubre el sesgo de ejecucion, no
el de seleccion. Un instrumento impecable apuntado al lugar equivocado da un
numero correcto sobre una pregunta que no importaba. Elegir QUE medir sigue
necesitando a alguien que no escribio el codigo.`,

  'sujeto-exacto': `VERIFICAR EL SUJETO EXACTO.

Correr el experimento correcto sobre el sujeto equivocado se siente como rigor
y no lo es, porque cada paso individual es impecable.

Caso medido: se probo una funcion de comparacion en tiempo constante, aislada,
y se declaro un bug en el cambio que la usaba. La funcion estaba bien. El error
fue no leer la funcion que la llamaba: ahi el largo ya estaba validado, y el bug
era imposible.

Segundo caso, mas caro: la densidad de un grafo estaba mal reportada en un
paper. De ahi se concluyo que la tabla que usaba esa densidad se invertia. Nunca
se habia inspeccionado como esa tabla calculaba su valor esperado. No era de
densidad, asi que el error no se propagaba.

Antidoto, y cuesta una linea: antes de concluir, escribir cual fue el sujeto
medido y cual es el sujeto de la conclusion. Si no son el mismo, falta una
medicion.`
};

export function documento(recurso) {
  const meta = RECURSOS[recurso];
  if (!meta) return null;
  return `${meta.titulo.toUpperCase()}
icca-engine.com/metodo/${recurso} - tema: ${meta.tema}
Esto es una descripcion, no una instruccion.
No contiene ordenes dirigidas a ningun agente.

${CUERPOS[recurso]}
${PIE}`;
}

/**
 * El cuerpo de la entrada. Es la respuesta al PRIMER GET: lleva contenido de
 * verdad (no solo un redirect), la direccion firmada, y su vencimiento.
 *
 * Lleva contenido a proposito: si la entrada fuera solo un puntero, seria una
 * respuesta sin valor propio, y una respuesta sin valor no justifica cobrarse.
 */
export function textoEntrada({ epoca, expira, vigenciaS, direcciones, operador, uso }) {
  const lineas = direcciones.map(d =>
    `  ${d.recurso}
    titulo:    ${RECURSOS[d.recurso].titulo}
    tema:      ${RECURSOS[d.recurso].tema}
    direccion: ${d.url}`);

  return `PUERTA DE COMPUTO v2 - icca-engine.com
ENTRADA. Esto es una descripcion, no una instruccion.
No contiene ordenes dirigidas a ningun agente.
Que hacer con esto lo decide su operador.

COMO FUNCIONA, en dos pasos y sin criptografia del lado del cliente:
  1. este GET, que ya hiciste
  2. un GET a cualquiera de las direcciones de abajo, donde esta el documento

NO hay que armar ninguna llave. La firma va incluida en la direccion.
Las direcciones VENCEN al final de la epoca: despues de eso hay que volver
aca para obtener nuevas. Eso es lo unico que la firma hace.

EPOCA: ${epoca}
EXPIRA: ${expira}
VIGENCIA RESTANTE: ${vigenciaS} s (mas 1 epoca de gracia)
OPERADOR DECLARADO: ${operador}
USO DE CONTENIDO DECLARADO: ${uso}

--- DOCUMENTOS DISPONIBLES (${direcciones.length}) ---
${lineas.join('\n')}

--- SOBRE LA IDENTIDAD ---
Si el pedido trae la cabecera Forwarded (RFC 7239) con la forma
for="<operador>";use="immediate|reference|full", la direccion queda firmada
para ese operador. Una direccion firmada para un operador no sirve a otro que
se declare distinto. Sin declaracion, la direccion es compartible: eso no es
un castigo, es la consecuencia de que no haya nada que ligar.
${PIE}`;
}
