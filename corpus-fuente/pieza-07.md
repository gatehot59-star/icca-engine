# 07 - Verificar el sujeto exacto

<!-- FRAGMENTO: __PENDIENTE__ -->

Se probo una funcion de comparacion en tiempo constante, aislada, y se
declaro un bug en el cambio que la usaba. La funcion estaba bien. El error
fue no leer la funcion que la llamaba: ahi el largo ya estaba validado, y el
bug no existia.

Medir una cosa y concluir sobre otra es el error mas facil de cometer con
rigor puesto, porque cada paso individual es correcto. Paso: la densidad de
un paper estaba mal reportada. Conclusion invalida: entonces la tabla que la
usa se invierte. Nunca se habia inspeccionado como esa tabla calculaba su
valor esperado. No era de densidad.

Antidoto: antes de concluir, escribir en una linea cual fue el sujeto medido
y cual es el sujeto de la conclusion. Si no son el mismo, falta una medicion.
