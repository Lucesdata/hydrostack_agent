# Lote 1 de datos de la Ficha Viva: duración, recursos, prórroga y liquidación

**Fecha:** 2026-10-24 · **Estado:** spec en borrador, **sin código ni migración**. Esto es el
QUÉ; el CÓMO está en `docs/superpowers/plans/2026-10-24-lote1-datos-columnas.md`.
**Antecede:** `2026-10-06-ficha-viva-datos-nuevos.md` (el QUÉ general) y
`2026-10-24-matriz-datos-ficha-viva.md` (mediciones M11–M13, en el PR #156): de ahí salen
las coberturas y la elección de campos. **Flujo:** `docs/CONDUCTA.md` §4.

## Por qué

La ficha de un proceso contratado cuenta **qué** se contrató y por cuánto, pero calla cosas
que el SECOP sí publica y que una empresa quiere saber antes de leer el pliego: cuánto
dura, de dónde sale el dinero, si el plazo se prorrogó **según el contrato** (hoy solo se
deduce de dos fechas) y si el contrato ya se liquidó. Este lote añade esos datos y nada más.

## Corrección de premisa (importante)

El spec del 2026-10-06 y la propuesta del lote decían que estos campos «ya llegan y el
transform los descarta». **Desde 2026-09-12 ya no llegan:** la ingesta manda `$select`
(`src/lib/ingest/campos.ts`) y pide solo los campos que usa. Para tenerlos hay que **pedirlos**
(añadirlos a `$select`), guardarlos y rellenar el histórico de 2026 volviendo a Socrata.

## Qué entra

Cobertura medida el 2026-10-24 sobre 200 procesos y 118 contratos de agua publicados desde
2026 (margen ±7 puntos; detalle en la matriz).

| # | Dato | Fuente (campo) | Cobertura | Dónde se ve |
|---|---|---|---|---|
| D-1 | Duración prevista (número + unidad) | procesos `duracion`, `unidad_de_duracion` | 89 % | «¿En qué va el proceso?» (plazos) |
| D-2 | Origen de los recursos | contratos `origen_de_los_recursos` | 100 % | «Cómo se contrató» |
| D-3 | Destino del gasto (inversión / funcionamiento) | contratos `destino_gasto` | 96 % | «Cómo se contrató» |
| D-4 | Fuentes de recursos con valor | contratos `sistema_general_de_participaciones`, `recursos_propios`, `presupuesto_general_de_la_nacion_pgn`, `recursos_de_credito`, `sistema_general_de_regal_as` | SGP 27 %, propios 29 %, PGN 6 %, crédito 1 %, regalías 0 % | «Cómo se contrató» |
| D-5 | Días adicionados (prórroga declarada) | contratos `dias_adicionados` | 14 % con prórroga | «Cómo se contrató» |
| D-6 | Liquidado (Sí/No) | contratos `liquidaci_n` | 100 % | «Cómo se contrató» |

**Solo procesos publicados desde el 2026-01-01** (R12 del spec del 2026-10-06 y
`DESDE_CICLO_DE_VIDA`): lo anterior no se rellena ni se muestra.

## Qué queda fuera, y por qué

- `saldo_cdp`, anticipo (`habilita_pago_adelantado`, `valor_de_pago_adelantado`), lotes,
  invitados: cobertura o significado que no aguanta (`saldo_cdp` > 0 solo en el 4 %: **la
  contradicción C10 se descarta**).
- `fecha_de_apertura_efectiva`, `fecha_inicio_liquidacion`: no existen con esos nombres.
- **Ofertas recibidas** (27 %) y `valor_pendiente_de_ejecucion` (92 %): son campos volátiles
  del hash y exigen una decisión previa (D3 y fecha de lectura). Van a un lote aparte.
- `justificaci_n_modalidad_de` y `nombre_de_la_unidad_de`: texto libre de la entidad que
  puede traer nombres; no entran hasta decidirlo (R8).
- Lugar de ejecución, modificaciones, garantías, PAA, documentos: lotes 2 y 3.
- **Cambiar la etapa** (`etapaDeProceso`) con la liquidación: este lote la **muestra** pero no
  toca la regla de precedencia (decisión D6).

## Reglas

- **R1 — Según el SECOP.** Todo dato nuevo se rotula «según el SECOP»; ninguno es una
  verdad propia de AquaLicita ni se convierte en avance de obra (R11).
- **R2 — Dos fuentes, dos cifras (R9).** La prórroga que se deduce de las fechas del contrato
  y los `dias_adicionados` pueden diferir: si difieren se muestran **las dos**, con su
  fuente, y no se elige en silencio ni se habla de contradicción (no está medido).
- **R3 — Sin dato no se pinta.** `0`, vacío o «No definido» en duración, fuentes o días =
  la fila no aparece. Nunca «0 meses» ni «0 días».
- **R4 — Cero es ausencia en fuentes.** Una fuente con valor `0` no se lista; si ninguna
  tiene valor > 0 se omite la fila.
- **R5 — Lenguaje simple (R7 del spec del 2026-10-05).** Toda palabra técnica nueva
  (fuentes de recursos, SGP, destino del gasto, liquidación, prórroga declarada) se define
  en `src/lib/secop/glosario.ts`, no en el componente.
- **R6 — Privacidad.** Ningún campo de este lote es de persona natural. No se ingiere nada
  más de lo listado.
- **R7 — Los valores crudos que no se entienden no se interpretan.** `origen_de_los_recursos`
  trae «Distribuido» y «Recursos Propios» en la muestra; «Distribuido» no tiene definición
  verificada (pregunta Q1). Se muestra literal y rotulado hasta definirlo.

## Criterios de aceptación

1. Columnas nuevas, nulables, en `proceso` (D-1) y `contrato` (D-2…D-6); una migración
   aditiva, sin tabla nueva ni reescritura de tabla.
2. `$select` incluye los campos nuevos y el test de cobertura de `campos.ts` pasa.
3. Una fila nueva o actualizada de 2026 llega con las columnas pobladas; una fila cuyo
   payload no trae el campo **no borra** el valor existente.
4. Tras el relleno, **≥ 95 %** de los procesos y contratos de 2026 que Socrata tiene con el
   campo lo tienen en la base; el resto queda nulo, no inventado.
5. La ficha muestra D-1…D-6 con las reglas R1–R7; sin dato, la ficha **no cambia** (misma
   salida que hoy) y no aparece ningún «0» ni «No definido» pintado como dato.
6. La ficha sigue sin consultas nuevas (las columnas viajan en las lecturas que ya existen) y
   su tiempo de render no empeora.
7. Espacio: el aumento medido tras el relleno es **< 10 MB** (estimado ≈ 3 MB) y la base
   queda < 420 MB.
8. Pruebas: mapeo, escritura, relleno, ficha con y sin dato, y migración sobre PGlite.
   Lo no ejecutable (relleno contra Socrata y la base viva) se lista como pendiente.

## Riesgos conocidos

- **Cobertura baja en prórroga (14 %) y fuentes (1–29 %):** correcto como dato, pero la
  ficha se verá «vacía» en la mayoría. No se rellena con valores por defecto.
- **Datos que cambian:** `dias_adicionados` y `liquidaci_n` los actualiza la entidad. Entran
  en el hash (no son volátiles) y se refrescan con la ingesta incremental por `ultima_actualizacion`.
- **Relleno sobre una base con CPU limitada:** lotes pequeños y fuera de la ventana del `tick`
  (11:00 UTC); ver plan.
- **Dependencia:** la regla «hoy en Colombia» una vez por consulta (PR #155) debería estar
  desplegada antes, para no sumar carga a consultas que ya tardaban segundos.

## Preguntas y decisiones abiertas

- **Q1.** ¿Qué significa «Distribuido» en `origen_de_los_recursos`? Verificarlo en la
  documentación del SECOP antes de mostrarlo sin rótulo.
- **D6.** ¿La liquidación cambia la etapa (p. ej. «Plazo cumplido» → «Liquidado»)? Propuesta:
  no en este lote.
- **D4 (corregida).** El spec del 2026-10-06 dice que el representante legal «hoy no se
  guarda». **Sí se guarda:** `proveedor.raw_attrs.representante_legal` está en **16.150 de
  16.216** proveedores (`mapCanonical.ts`, `EXTRA_CONTRATOS`). No se muestra en ninguna
  pantalla (verificado en el código), pero está en la base y para personas naturales es su
  propio nombre. Propuesta, **fuera de este lote y destructiva si se aprueba**: dejar de
  pedirlo y borrar la clave de `raw_attrs`. Requiere decisión del propietario.
