#!/usr/bin/env bash
# Falsador de la suite: si rompo el codigo a proposito, los tests TIENEN que
# ponerse rojos. Una suite que sobrevive al sabotaje no esta midiendo.
# Se corre desde puerta/. No deja el arbol modificado.
set -u
cd "$(dirname "$0")/.."
BAKD=$(mktemp); cp src/direccion.mjs "$BAKD"
BAKI=$(mktemp); cp src/index.mjs "$BAKI"
BAKM=$(mktemp); cp src/documentos.mjs "$BAKM"
restaurar(){
  cp "$BAKD" src/direccion.mjs; cp "$BAKI" src/index.mjs; cp "$BAKM" src/documentos.mjs
  rm -f "$BAKD" "$BAKI" "$BAKM"
}
trap restaurar EXIT
rojo(){ node --test test/*.test.mjs >/dev/null 2>&1 && echo verde || echo rojo; }
fallas=0
exigir_rojo(){ # $1 etiqueta
  local r; r=$(rojo); echo "$1 -> $r (esperado rojo)"
  [ "$r" = rojo ] || fallas=$((fallas+1))
}

# S1: la direccion deja de vencer. ES EL SABOTAJE MAS IMPORTANTE: sin
# vencimiento el agente cachea la URL y entra directo para siempre, y la
# medicion se pierde despues de la primera visita. Toda la puerta v2 existe
# para que esto no pase.
sed -i 's/for (const cand of \[e, e - 1\])/for (const cand of [e, e-1, e-2, e-3, e-4, e-5])/' src/direccion.mjs
exigir_rojo "S1 la direccion deja de vencer"
cp "$BAKD" src/direccion.mjs

# S2: colapsar vencida e invalida en un solo estado. Perder esa distincion es
# perder justo el evento que hay que contar: el agente que vuelve con un
# ticket viejo.
python3 - <<'PY'
p='src/direccion.mjs'; s=open(p).read()
s=s.replace("return { ok: false, motivo: 'vencida', epoca: cand };",
            "return { ok: false, motivo: 'invalida' };")
open(p,'w').write(s)
PY
exigir_rojo "S2 colapsar vencida con invalida"
cp "$BAKD" src/direccion.mjs

# S3: la firma deja de ligar al operador. Una direccion filtrada le serviria a
# cualquiera, y la identidad declarada dejaria de valer mas que el anonimato.
python3 - <<'PY'
p='src/direccion.mjs'; s=open(p).read()
s=s.replace("`v1|${recurso}|${epoca}|${operador || ''}`", "`v1|${recurso}|${epoca}|`")
open(p,'w').write(s)
PY
exigir_rojo "S3 la firma ignora al operador"
cp "$BAKD" src/direccion.mjs

# S4: la allowlist se abre. Cualquier ruta se podria firmar y servir.
python3 - <<'PY'
p='src/direccion.mjs'; s=open(p).read()
s=s.replace("return typeof id === 'string' && Object.prototype.hasOwnProperty.call(RECURSOS, id);",
            "return typeof id === 'string';")
open(p,'w').write(s)
PY
exigir_rojo "S4 abrir la allowlist de recursos"
cp "$BAKD" src/direccion.mjs

# S5: la entrada vuelve a exigir algo. Es el bug de la v1: un crawler que hace
# GET y sigue links queda afuera.
python3 - <<'PY'
p='src/index.mjs'; s=open(p).read()
old="    if (url.pathname === RUTA_ENTRADA) {"
new=("    if (url.pathname === RUTA_ENTRADA) {\n"
     "      if (!url.searchParams.get('k')) return txt('401 falta la llave\\n', 401);")
assert old in s
open(p,'w').write(s.replace(old,new,1))
PY
exigir_rojo "S5 la entrada vuelve a pedir llave"
cp "$BAKI" src/index.mjs

# S6: quitar la atribucion del contenido entregado. La licencia la exige, y una
# atribucion que no viaja con el texto no se cumple.
python3 - <<'PY'
p='src/documentos.mjs'; s=open(p).read()
s=s.replace('AUTOR: ${AUTOR}', 'AUTOR: (omitido)')
open(p,'w').write(s)
PY
exigir_rojo "S6 quitar la atribucion del cuerpo"
cp "$BAKM" src/documentos.mjs

# S7: DECLARADO NO MEDIDO. La comparacion en tiempo constante se cambia por
# una comun y la suite NO puede verlo: no mide tiempo. Da verde, y ese verde no
# es robustez del codigo, es el hueco de la suite, escrito aca para que nadie
# lo lea como cobertura.
python3 - <<'PY'
p='src/direccion.mjs'; s=open(p).read()
s=s.replace("  let d = 0;", "  return a === b;")
open(p,'w').write(s)
PY
r=$(rojo); echo "S7 tiempo constante -> $r (NO MEDIDO: la suite no mide tiempo)"
cp "$BAKD" src/direccion.mjs

echo "SABOTAJE: $fallas fallas"
exit $fallas
