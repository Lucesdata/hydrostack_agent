# CI-02b — Guía de etiquetado con dos revisores

Fecha: 2026-11-09 · Objetivo: medir la **precisión del clasificador tecnológico**
(umbral inicial del PRD §14: ≥ 80 % en categoría raíz; es una hipótesis de
trabajo) y el acuerdo entre personas. Sin esto no se puede afirmar ninguna cifra
de precisión (ver `…-ci-02-spike-resultados.md`).

## Qué se necesita
- **Dos revisores independientes** (no pueden consultarse mientras etiquetan). Conviene que al menos uno conozca el sector de agua y saneamiento.
- Un tercer criterio solo para **adjudicar discrepancias** (puede ser alguno de los dos tras discutir).
- Tiempo estimado: 217 contratos × ~1 min ≈ 3–4 h por revisor.

## Preparar la hoja (quien tenga acceso de lectura a la base)
```bash
npx tsx scripts/tecnologia-hoja-etiquetado.ts        # carpeta por defecto: .local/etiquetado/
```
- Hace un solo `SELECT` (contratos del Valle del Cauca firmados desde 2026 con contratista NIT) y no escribe en la base.
- `hoja-revisor.csv`: se copia **idéntica** a cada revisor (renombrar `revisor1.csv` y `revisor2.csv`). **No muestra** lo que dijo el clasificador. No contiene contratistas, NIT ni personas.
- `clave-clasificador.csv`: solo para la evaluación; **no se comparte con los revisores**.
- Ambas quedan en `.local/` (ignorada por git). No subirlas al repositorio.

## Qué etiqueta cada revisor (solo lee el `objeto`)
Columnas a rellenar, una fila por contrato:

| Columna | Valores | Cómo decidir |
|---|---|---|
| `actividad` | `SUBSIDIO_O_AJENO` · `OBRA_REDES` · `OYM` · `ESTUDIO_DISENO_INTERVENTORIA` · `LABORATORIO_ANALISIS` · `SUMINISTRO_BIEN` · `OTRO` | **Lo principal que se contrata.** Subsidios/transferencias y contratos sin relación con agua = `SUBSIDIO_O_AJENO`. Construir o reponer redes/plantas = `OBRA_REDES`. Operar o mantener = `OYM`. Si hay dos actividades, la de mayor peso en el texto. |
| `bien_explicito` | `SI` · `NO` | `SI` solo si el texto **nombra** un bien, equipo o material concreto que alguien tendría que comprar (bombas, medidores, reactivos, tanques…). «Obras de alcantarillado» **no** nombra un bien. No inferir lo que «seguramente» llevará la obra. |
| `categorias` | códigos de la tabla de abajo separados por `;`, o vacío | Solo si `bien_explicito = SI` **o** si hay un servicio especializado claro (diseño, O&M, consultoría…). Usar la categoría raíz; el subcódigo es opcional. |
| `observaciones` | libre | Dudas, términos que faltan en la taxonomía. |

Reglas de decisión comunes:
1. **Una negación anula:** «no incluye suministro de bombas» ⇒ sin bien.
2. **Destino no es objeto:** «suministro de herramientas *para el mantenimiento de la planta*» ⇒ el bien es herramienta (sin categoría); no es `OYM`.
3. **Servicio sobre un equipo** («mantenimiento del sistema de bombeo») ⇒ `actividad = OYM`; marca la categoría del equipo (`BOM`) y escribe en `observaciones` «servicio sobre equipo». Este caso está abierto en CI-01b y interesa medirlo.
4. **Ambigüedad real:** deja `bien_explicito` en `NO` y anota la duda. No adivinar.
5. **No consultar fuentes externas ni el expediente:** se etiqueta solo con el texto de la hoja.

### Categorías (códigos raíz de la taxonomía v1.1)
`BOM` bombeo · `VAL` válvulas/accesorios · `TUB` tuberías/redes · `FIL` filtración · `MEM` membranas · `QUI` tratamiento químico · `BIO` tratamiento biológico · `INS` instrumentación · `AUT` automatización · `SCA` PLC/SCADA · `TEL` telemetría/IoT · `ELM` electromecánicos · `ING` ingeniería y diseño · `CON` construcción y montaje · `OYM` operación y mantenimiento · `CNS` consultoría · `SWI` software/gemelos digitales · `LOG` logística/importación.

## Evaluar
Cuando existan `revisor1.csv`, `revisor2.csv` y la clave:
```bash
npx tsx scripts/tecnologia-evaluar-etiquetas.ts revisor1.csv revisor2.csv clave-clasificador.csv
```
Informa: acuerdo y **kappa de Cohen** (actividad y bien explícito), contratos
**por adjudicar** (donde discrepan), y —solo sobre consenso— **precisión y
recobrado en categoría raíz**, falsos positivos, omitidos y cuántos contratos con
bien explícito el clasificador sí detecta.

Lectura sugerida (orientativa, a validar con el usuario): kappa < 0,6 ⇒ la guía
es ambigua, aclararla y repetir antes de juzgar al clasificador; precisión < 80 %
⇒ revisar los falsos positivos y subir la taxonomía a `1.2`; recobrado bajo ⇒
es el techo del texto (spike CI-02), no necesariamente un defecto del diccionario.

## Después
Con los resultados se decide: congelar la taxonomía como `v1` (CI-01 cerrado),
ajustar términos, o reducir aún más el alcance de las necesidades «inferidas»
(D5). El resultado se anota en la adenda del informe del spike.
