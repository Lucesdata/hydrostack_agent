# Calidad: clasificación sectorial y extractor de pliegos

**Fecha:** 2026-10-24 · **Estado:** medición y diseño. **No cambia reglas, ni código, ni
datos.** Medido en solo lectura sobre la base viva.

Lo que falta en ambos casos es **etiquetado humano**: lo medido aquí son indicios
(proxies), no precisión. Está dicho en cada cifra.

## 1. Clasificación sectorial

Dos preguntas distintas (`CLAUDE.md` §2), que no se mezclan:

1. **¿Pertenece al sector agua?** La responde el filtro de aterrizaje de la ingesta
   (`src/lib/secop/ingest-net.ts`): palabras clave ∪ UNSPSC exclusivos de agua, menos el
   segmento 80. Su recall se midió en una muestra de 50 (`docs/fase-0/0.2.1-validacion-pr.md`).
2. **¿De qué subsistema?** La responde `clasificarTipoProyecto` y se guarda en
   `proceso.tipo_proyecto` (`acueducto | alcantarillado | ptap | ptar | otros`).

### Cobertura medida (93.717 procesos; desde 2026: 15.320)

| `tipo_proyecto` | Total | Desde 2026 | Confianza |
|---|---|---|---|
| acueducto | 32.662 | 5.893 | alta 25.285 · media 7.377 |
| alcantarillado | 12.628 | 2.172 | alta 12.628 |
| ptap | 5.733 | 1.019 | alta 4.850 · media 883 |
| ptar | 7.943 | 1.226 | alta 5.552 · media 2.391 |
| **otros** | **34.751 (37,1 %)** | **5.010 (32,7 %)** | media 34.751 |

Un tercio de lo que entra al sector queda sin subsistema (`otros`). Eso no es en sí un
error: `otros` mezcla cosas que no son agua con cosas de agua que no son un subsistema
(calidad de agua, vertimientos, bombas).

### Indicios de errores (desde 2026, proxy por palabras de agua en objeto o descripción)

El proxy es una expresión regular amplia (acueducto, alcantarill-, agua, potable, residual,
saneamiento, PTAP, PTAR, vertimiento, hidráulic-, tubería, bombeo, pozo, séptic-, planta de
tratamiento). Es **ruidosa en los dos sentidos**: ver la nota.

| Grupo | n | Palabra en el objeto | Solo en la descripción | En ninguno | Objeto < 30 caracteres |
|---|---|---|---|---|---|
| Con subsistema | 10.310 | 6.098 (59 %) | 3.968 (39 %) | **244 (2,4 %)** | **2.389 (23 %)** |
| `otros` | 5.010 | 1.626 (32 %) | 2.205 (44 %) | 1.179 (24 %) | 1.505 (30 %) |

- **Posibles falsos positivos de sector**: como mínimo, los 244 con subsistema y sin
  ninguna palabra de agua (2,4 %). Es una cota inferior: una palabra presente no prueba
  que el proceso sea de agua.
- **Fragilidad:** el **23 %** de los procesos con subsistema tiene un objeto de menos de
  30 caracteres («CONTRATO 048 DE 2026», un nombre propio): su tipo descansa solo en la
  descripción, y la ficha pinta ese tipo con confianza «alta» (la mayoría).
- **Posibles pérdidas de subsistema:** hasta 3.831 de los 5.010 `otros` (76 %) mencionan
  una palabra de agua; no se sabe cuántos son de agua de verdad.

**Lectura preliminar mía (no es etiquetado validado):** en 30 `otros` al azar, unos 20 no
son agua (servicios profesionales, médicos, nombres propios) y unos 7 son vecinos del
sector (análisis de potabilidad, caracterización de vertimientos, sistema hidrosanitario,
bombas, tanques de un hospital) cuya pertenencia es una **decisión de producto**, no un
error del clasificador. En 25 con subsistema, 5 tenían un objeto opaco. La muestra
completa de la lectura incluye nombres de personas naturales, por lo que **no se
guarda en el repo** (R8).

### Protocolo para medir (sin cambiar reglas todavía)

1. Ejecutar `scripts/sql/muestra-clasificacion.sql` (solo lectura, muestra fija de 200:
   50 por estrato `tipado_alta`, `tipado_media`, `otros_con_palabra_de_agua`,
   `otros_sin_palabra`).
2. Etiquetar a mano, con objeto y descripción: `pertenece` (agua / no_agua / dudoso) y
   `subsistema`. Dos personas sobre las mismas filas para medir el acuerdo en los
   `dudoso`. La hoja con texto **no se sube al repo**; se guardan `secop_proceso_id` y
   etiquetas.
3. Calcular, con intervalo de Wilson al 95 %: precisión de sector en los estratos tipados,
   porcentaje de agua en los estratos `otros_*` (la pérdida) y exactitud del subsistema.
4. **Umbrales para tocar reglas** (a confirmar por el propietario antes de medir):
   precisión de sector en `tipado_alta` < 90 %, o más del 20 % de agua en
   `otros_con_palabra_de_agua`.
5. Si se cambia una regla: subir `CLASIFICADOR_TIPO_VERSION`, **ensayo en seco** que
   cuente cuántos procesos cambian de tipo y de qué a qué, comparar sobre la misma muestra
   y recomputar con `npm run db:tipo-proyecto --todas`. Mantener la distinción entre las
   dos preguntas: arreglar `otros` no es ampliar el filtro de la ingesta.

## 2. Extractor de pliegos

### Inventario de fixtures reales (2026-10-24)

| Fuente | Estado |
|---|---|
| `pliego_proceso` y `requisitos_proceso` en la base viva | **0 filas** (hay 5 cuentas): el extractor **nunca ha procesado un pliego real en producción** |
| `src/__tests__/pliego/*` (`parseDocumentoBase`, `parseFormulario1`, `validate`) | Texto **sintético** armado con la estructura del documento base de Colombia Compra (`CCE-EICP-GI-09`); sin PDF real |
| Fixture UAESP citado en `PENDIENTES.md` §2 | **No está en el repo** ni en un almacenamiento accesible a la integración continua |
| `public/reports/*.pdf` | No se abrieron; por su nombre (UUID) y la historia del repo son salidas del producto de reportes retirado, **no pliegos** |

**Consecuencia:** no se puede afirmar que el *grounding* esté verificado. Lo que existe es
(a) un validador aritmético y de «cita presente» (`validate.ts`) y (b) citas que
**autorreporta el modelo** (`cita_textual`). Una cita inventada pasa el validador siempre
que no esté vacía.

**Qué hace falta (acción del propietario, no automatizable aquí):** descargar de SECOP II
3 a 5 pliegos públicos y dejarlos en un lugar versionable (en el repo si pesan poco y su
licencia lo permite; si no, en Storage o como artefacto de la integración continua),
cubriendo: obra de agua potable por licitación pública con pliego tipo de la CCE,
consultoría, mínima cuantía, régimen especial y **un PDF escaneado sin capa de texto**
(el caso en que `pdfToText` ya lanza error). Los pliegos son públicos; aun así, revisar
que ninguno traiga datos personales antes de versionarlo.

### Diseño de la verificación literal de citas (no implementado)

Objetivo: que «cita comprobada» signifique que el texto citado **existe en el documento**.

1. **Texto de referencia.** El de `pdfToText` (`pdftotext -layout`), que el camino de
   reglas ya produce. La ruta de Gemini lee el PDF directamente: habría que extraer también
   el texto para verificar, con una llamada local a `pdftotext` (sin coste de modelo).
2. **Normalización** (a ambos lados): NFKC, minúsculas, sin tildes, espacios y saltos
   colapsados, guiones de fin de línea unidos, comillas tipográficas igualadas. Los
   **números se comparan exactos** (`4.250.000.000` ≠ `4.520.000.000`): una cita con una
   cifra distinta no puede pasar por «parecida».
3. **Estados por cita:** `verificada` (la cita normalizada es subcadena), `parcial`
   (ventana contigua del texto con ≥ 90 % de las palabras en el mismo orden y todas las
   cifras idénticas), `no_encontrada`, `sin_texto` (no hubo capa de texto).
4. **Dónde se guarda:** dentro de `validation` (jsonb) y `origen`, **sin migración**:
   conteos por estado y, por ítem, `cita_estado`. Nueva inconsistencia `cita_no_encontrada`,
   primero como **nota** (no vuelve `ok=false`) hasta medir la tasa de falsos negativos
   sobre los fixtures; después, dura.
5. **Qué ve el usuario:** «Cita comprobada en el texto del pliego» **solo** con
   `verificada`; `parcial` se dice «parecida»; `no_encontrada` y `sin_texto` marcan el
   dato «por verificar en el pliego». Nunca se usa el modelo para verificarse a sí mismo.
6. **Pruebas:** con los fixtures reales (tasas medidas, no supuestas) y adversariales
   sintéticas: cita fabricada, cita con una cifra cambiada, cita partida entre páginas,
   texto con guiones de fin de línea, PDF escaneado.
7. **Criterio para decir «grounding verificado»:** todos los fixtures pasados, las tasas
   publicadas en la spec y al menos un pliego escaneado devolviendo `sin_texto` sin romper
   la extracción.

Esto toca el extractor, así que necesita plan aprobado (`docs/CONDUCTA.md` §4) y
es trabajo posterior a este PR.
