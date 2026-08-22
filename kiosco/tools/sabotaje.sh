#!/usr/bin/env bash
# Falsador de la suite: si rompo el codigo a proposito, los tests TIENEN que
# ponerse rojos. Una suite que sobrevive al sabotaje no esta midiendo.
#
# Los sabotajes de este kiosco no son de correccion, son DE NEGOCIO. El codigo
# puede estar impecable y el modelo roto: si el anzuelo entrega el documento
# completo, todo funciona, todos los tests de formato pasan, y no se cobra nunca.
# Eso es lo que S1 mide.
set -u
cd "$(dirname "$0")/.."

BAKA=$(mktemp); cp src/anzuelo.mjs "$BAKA"
BAKB=$(mktemp); cp src/busqueda.mjs "$BAKB"
BAKH=$(mktemp); cp src/herramientas.mjs "$BAKH"
BAKI=$(mktemp); cp src/index.mjs "$BAKI"
restaurar(){
  cp "$BAKA" src/anzuelo.mjs; cp "$BAKB" src/busqueda.mjs
  cp "$BAKH" src/herramientas.mjs; cp "$BAKI" src/index.mjs
  rm -f "$BAKA" "$BAKB" "$BAKH" "$BAKI"
}
trap restaurar EXIT

rojo(){ node --test test/*.test.mjs >/dev/null 2>&1 && echo verde || echo rojo; }
fallas=0
exigir_rojo(){ local r; r=$(rojo); echo "$1 -> $r (esperado rojo)"; [ "$r" = rojo ] || fallas=$((fallas+1)); }

# S1: el anzuelo entrega el documento COMPLETO.
# ES EL SABOTAJE MAS IMPORTANTE. El codigo sigue andando, las respuestas siguen
# bien formadas, y el agente ya no tiene ningun motivo para pedir la pagina.
# El negocio muere y ningun test de formato lo notaria.
python3 - <<'PY'
p='src/anzuelo.mjs'; s=open(p).read()
s=s.replace('export const FRACCION_ANZUELO = 0.35;','export const FRACCION_ANZUELO = 1.0;')
open(p,'w').write(s)
PY
exigir_rojo "S1 el anzuelo entrega el documento completo"
cp "$BAKA" src/anzuelo.mjs

# S2: el anzuelo entrega vacio cuando la consulta no matchea. Una llamada
# desperdiciada no vuelve, y un kiosco al que no vuelven es un kiosco con cero.
python3 - <<'PY'
p='src/anzuelo.mjs'; s=open(p).read()
viejo='''  const candidatos = relevantes.length
    ? relevantes
    : todos.map((texto, posicion) => ({ texto, posicion, coincidencias: 0 }));'''
assert viejo in s
s=s.replace(viejo,'  const candidatos = relevantes;')
open(p,'w').write(s)
PY
exigir_rojo "S2 el anzuelo entrega vacio sin coincidencias"
cp "$BAKA" src/anzuelo.mjs

# S3: los fragmentos se cortan a la mitad para "dejar en suspenso". Es un
# titular de portal, y a un agente le entrega una frase rota.
python3 - <<'PY'
p='src/anzuelo.mjs'; s=open(p).read()
s=s.replace('    fragmentos: elegidos.map(x => x.texto),',
            '    fragmentos: elegidos.map(x => x.texto.slice(0, Math.floor(x.texto.length / 2))),')
open(p,'w').write(s)
PY
exigir_rojo "S3 cortar los fragmentos a la mitad"
cp "$BAKA" src/anzuelo.mjs

# S4: la linea de titulo vuelve a ser un parrafo candidato. ES UN BUG REAL que
# ya ocurrio: esa linea ganaba la seleccion en un documento y le entregaba al
# agente 43 bytes en mayusculas.
python3 - <<'PY'
p='src/busqueda.mjs'; s=open(p).read()
s=s.replace('  return esTitulo ? todos.slice(1) : todos;','  return todos;')
open(p,'w').write(s)
PY
exigir_rojo "S4 la linea de titulo vuelve a ser un fragmento"
cp "$BAKB" src/busqueda.mjs

# S5: el guard de caracteres de control se desactiva. Este guard YA ESTUVO ROTO
# una vez, escrito como clase de caracteres en una regex: se leia bien y el
# salto de linea pasaba limpio.
python3 - <<'PY'
p='src/busqueda.mjs'; s=open(p).read()
s=s.replace('    if (c < 32 || (c >= 127 && c <= 159)) return true;','    if (false) return true;')
open(p,'w').write(s)
PY
exigir_rojo "S5 desactivar el guard de caracteres de control"
cp "$BAKB" src/busqueda.mjs

# S6: el catalogo pasa a incluir los cuerpos completos. Seria el corpus entero
# gratis por una via lateral, con el anzuelo intacto y sin servir para nada.
python3 - <<'PY'
p='src/anzuelo.mjs'; s=open(p).read()
viejo="    `  ${d.id}\\n    titulo: ${d.titulo}\\n    tema:   ${d.tema}\\n    sobre:  ${d.resumen}\\n    completo en: ${urlDe(d.id)}`);"
assert viejo in s, 'no matcheo la fila del catalogo'
s=s.replace(viejo, "    `  ${d.id}\\n    titulo: ${d.titulo}\\n    cuerpo: ${d.parrafos.join('\\n\\n')}\\n    completo en: ${urlDe(d.id)}`);")
open(p,'w').write(s)
PY
exigir_rojo "S6 el catalogo filtra los cuerpos completos"
cp "$BAKA" src/anzuelo.mjs

# S7: se quita la atribucion del cuerpo entregado. La licencia la exige, y una
# atribucion que no viaja con el texto no se cumple.
python3 - <<'PY'
p='src/anzuelo.mjs'; s=open(p).read()
s=s.replace('AUTOR: ${AUTOR}','AUTOR: (omitido)')
open(p,'w').write(s)
PY
exigir_rojo "S7 quitar la atribucion del cuerpo"
cp "$BAKA" src/anzuelo.mjs

# S8: donde_esta pasa a devolver el cuerpo. Es la via mas facil de saltear el
# anzuelo, y la que alguien agregaria "para que sea mas util".
python3 - <<'PY'
p='src/herramientas.mjs'; s=open(p).read()
viejo='SOBRE: ${d.resumen}'
assert viejo in s
s=s.replace(viejo, 'SOBRE: ${d.resumen}\\nCUERPO: ${d.cuerpo}')
open(p,'w').write(s)
PY
exigir_rojo "S8 donde_esta devuelve el cuerpo completo"
cp "$BAKH" src/herramientas.mjs

# S9: la consulta rechazada se refleja cruda en la salida. Es el vector por el
# que un tercero pone su texto bajo este dominio con la atribucion del autor.
python3 - <<'PY'
p='src/herramientas.mjs'; s=open(p).read()
viejo='    return texto(`La consulta no se pudo procesar. Motivo: ${q.motivo}'
assert viejo in s
s=s.replace(viejo,'    return texto(`La consulta no se pudo procesar: ${consulta}\\nMotivo: ${q.motivo}')
open(p,'w').write(s)
PY
exigir_rojo "S9 reflejar la consulta rechazada cruda"
cp "$BAKH" src/herramientas.mjs

# S10: se vacia la descripcion de la herramienta. Medido el 2026-08-22: el
# registro publico expone 500 de 10.433 servidores en su listado, asi que a la
# cola se llega por busqueda de termino. Sin descripcion, nadie encuentra nada.
python3 - <<'PY'
import re
p='src/index.mjs'; s=open(p).read()
i=s.index("'buscar_metodo',")
j=s.index('inputSchema', i)
bloque=s[i:j]
nuevo=re.sub(r"description:[\s\S]*?,\n", "description: 'Busca.',\n", bloque, count=1)
assert nuevo != bloque
open(p,'w').write(s[:i]+nuevo+s[j:])
PY
exigir_rojo "S10 vaciar la descripcion de descubrimiento"
cp "$BAKI" src/index.mjs

# S11: se mete cobro en el kiosco. El kiosco es gratis A PROPOSITO: cobrar aca
# exigiria una wallet, y el cobro de este proyecto vive en la pagina.
python3 - <<'PY'
p='src/index.mjs'; s=open(p).read()
s=s.replace("import { z } from 'zod';",
            "import { z } from 'zod';\nconst recipient = '0x0000000000000000000000000000000000000001';")
open(p,'w').write(s)
PY
exigir_rojo "S11 meter una wallet en el kiosco gratis"
cp "$BAKI" src/index.mjs

# S12: DECLARADO NO MEDIDO. Se cambia el orden de los fragmentos a orden de
# puntaje en vez de orden del documento. La suite tiene un test para esto (A6)
# pero solo se activa cuando hay mas de un fragmento, asi que el resultado
# depende del corpus y no del codigo. Se declara para que nadie lea el verde
# como cobertura.
python3 - <<'PY'
p='src/anzuelo.mjs'; s=open(p).read()
s=s.replace('  elegidos.sort((a, b) => a.posicion - b.posicion);','')
open(p,'w').write(s)
PY
r=$(rojo); echo "S12 desordenar los fragmentos -> $r (parcial: A6 solo mide con 2+ fragmentos)"
cp "$BAKA" src/anzuelo.mjs

echo "SABOTAJE: $fallas fallas"
exit $fallas
