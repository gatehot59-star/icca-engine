#!/usr/bin/env bash
# Falsador de la suite: si rompo el codigo a proposito, los tests TIENEN que
# ponerse rojos. Una suite que sobrevive al sabotaje no esta midiendo.
# Se corre desde puerta/. No deja el arbol modificado.
set -u
cd "$(dirname "$0")/.."
BAK=$(mktemp); cp src/index.mjs "$BAK"
BAK2=$(mktemp); cp src/recibo.mjs "$BAK2"
restaurar(){ cp "$BAK" src/index.mjs; cp "$BAK2" src/recibo.mjs; rm -f "$BAK" "$BAK2"; }
trap restaurar EXIT
rojo(){ node --test test/*.test.mjs >/dev/null 2>&1 && echo verde || echo rojo; }
fallas=0

# S1: presupuesto antes de la sala (el bug que rompia la fase molinete)
python3 - <<'PY'
p='src/index.mjs'; s=open(p).read()
a=s.index('    // GUARD 6 - la sala.'); b=s.index('    // GUARD 7 - presupuesto.'); c=s.index('    const r = await ejecutarEnSala')
open(p,'w').write(s[:a]+s[b:c]+s[a:b]+s[c:])
PY
r=$(rojo); echo "S1 reordenar guards -> $r (esperado rojo)"
[ "$r" = rojo ] || fallas=$((fallas+1))
cp "$BAK" src/index.mjs

# S2: estirar la ventana de gracia a dos epocas
sed -i 's/\[epoca, epoca - 1\]/[epoca, epoca - 1, epoca - 2]/' src/index.mjs
r=$(rojo); echo "S2 ventana de gracia -> $r (esperado rojo)"
[ "$r" = rojo ] || fallas=$((fallas+1))
cp "$BAK" src/index.mjs

# S3: comparacion no constante. DECLARADO NO MEDIDO: la suite no mide tiempo,
# asi que este sabotaje da verde y eso NO es una falla del sabotaje, es el
# hueco de la suite, escrito aca para que nadie lo lea como cobertura.
sed -i 's/  let d = 0;/  return a === b;/' src/index.mjs
r=$(rojo); echo "S3 tiempo constante -> $r (NO MEDIDO: la suite no mide tiempo)"
cp "$BAK" src/index.mjs

# S4: volver a devolver un error en la fase molinete. Es el bug de negocio,
# no de codigo: 501 es semantica HTTP correcta y Cloudflare no factura errores,
# asi que la puerta entera cobraria cero. Tiene que dar rojo.
sed -i 's/textoRecibo({ epoca: epocaOk, informe, forwarded }), 200, {/textoRecibo({ epoca: epocaOk, informe, forwarded }), 501, {/' src/index.mjs
if grep -q 'forwarded }), 501,' src/index.mjs; then
  r=$(rojo); echo "S4 volver al 501 en el molinete -> $r (esperado rojo)"
  [ "$r" = rojo ] || fallas=$((fallas+1))
else
  echo "S4 NO MEDIDO: el sabotaje no se aplico, el patron no matcheo"
  fallas=$((fallas+1))
fi
cp "$BAK" src/index.mjs

# S5: sacarle la atribucion al cuerpo entregado. La licencia exige atribucion,
# y una atribucion que no viaja con el contenido no se cumple. Rojo.
BAKR=$(mktemp); cp src/recibo.mjs "$BAKR"
python3 - <<'PYS'
p='src/recibo.mjs'; s=open(p).read()
s=s.replace('AUTOR: ${AUTOR}', 'AUTOR: (omitido)')
open(p,'w').write(s)
PYS
r=$(rojo); echo "S5 quitar la atribucion del cuerpo -> $r (esperado rojo)"
[ "$r" = rojo ] || fallas=$((fallas+1))
cp "$BAKR" src/recibo.mjs; rm -f "$BAKR"

echo "SABOTAJE: $fallas fallas"
exit $fallas
