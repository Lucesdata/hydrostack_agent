# CI-02 — Spike de viabilidad: ¿alcanza el texto de SECOP para inferir necesidades de suministro?

Fecha: 2026-11-09 · Estado: resultados para la decisión **D5** (go/no-go del producto B).
Insumos: clasificador `src/lib/tecnologia/` (CI-01, v1 borrador) y `scripts/tecnologia-spike.ts`.

## Qué se midió y con qué límites

| Medición | Datos | Método | Qué NO es |
|---|---|---|---|
| M1 — cobertura automática | `samples/contratos.json`, 500 contratos nacionales (muestra de junio 2026, reproducible: `npx tsx scripts/tecnologia-spike.ts samples/contratos.json objeto_del_contrato id_contrato`) | Clasificador sobre `objeto_del_contrato` | Una muestra del Valle ni una estimación sobre toda la base |
| M2 — lectura manual | 100 contratos del Valle del Cauca, firmados desde 2026, contratista NIT, elegidos al azar determinista (`md5(id)`) de los 217 existentes, `objeto` truncado a 320 caracteres | Lectura de una sola persona (el agente), sin segundo revisor | **No** es una medición de precisión: el brief pide dos revisores independientes. No se ejecutó el clasificador sobre estos 100 (los datos vivos no se guardaron en el repo) |

## Resultados

**M1 (automática, n = 500).** 15,2 % de los contratos tienen algún candidato (76);
solo **2,2 % (11)** tienen un candidato de *bien* o *mixto*; el resto son servicios
(O&M 33, ingeniería 22, consultoría 15, construcción 6). Cero negaciones
encontradas en el corpus. Candidatos de bien: bombeo 5, electromecánicos 2,
instrumentación 2, filtración 1, tuberías 1.

**M2 (lectura manual, n = 100, Valle).** Clasificación aproximada por lo que dice el objeto:
- ~35: transferencias de subsidios (FSRI), convenios y asuntos sin agua: **ninguna necesidad de suministro**.
- ~30: obra civil de redes (reposición/optimización de alcantarillado o acueducto): el suministro (tubería, accesorios) es **implícito**, no nombrado.
- ~15: operación y mantenimiento de PTAP/PTAR/tanques en sedes institucionales (policía, SENA, ICBF, hospitales).
- ~10: análisis de laboratorio, estudios, diseños e interventoría.
- ~10: mencionan algún bien o material concreto («motobombas», «equipos de medición» ×3, «reactivos y químicos» para PTAP/PTAR, «biodigestores», «tanques sépticos prefabricados», «medición de caudales»). **El v1 solo reconocería 1 o 2** (p. ej. «biodigestores»): faltan términos.
- Además, un caso de ruido de sector: contratos de la «Unidad Ejecutora de Saneamiento» (papelería, vigilancia) entraron por la red de ingesta.

## Hallazgos

1. **El `objeto` casi nunca nombra equipos.** Entre ~2 % (M1) y ~10 % (M2, lectura generosa) de los contratos mencionan un bien o material. Las necesidades «grandes» (tubería de una reposición de redes, bombas de una estación) están implícitas.
2. **La señal fiable es el *tipo de actividad contratada*** (obra de redes, O&M, diseño, interventoría), no el suministro. Eso sirve a firmas de ingeniería, a O&M y a contratistas; para fabricantes e instrumentación es débil.
3. **Falsos positivos observados (M1):** «sistema de filtración de aire» (laboratorio) activa Filtración de agua; «suministro de herramientas manuales para el mantenimiento de la planta» activa O&M cuando lo contratado es herramienta. Ambos son de contexto, no de ortografía.
4. **Lagunas del v1:** «equipos de medición», «motobomba(s)», «tanque séptico», «reactivos / químicos», «medición de caudal(es)». Corrección = `v1.1` del borrador (aún no congelado), no un cambio de `v2`.
5. **No se puede afirmar una precisión.** M2 es lectura de un solo revisor; el umbral del PRD (≥ 80 %) sigue sin medirse. Hacen falta 100 contratos etiquetados por dos personas.

## Recomendación para D5 (la decisión es del usuario)

**Go reducido, no completo.**
- **Sí:** contratos en ejecución con contratista NIT, ficha comercial, y *actividad contratada* clasificada (con cita), más necesidades «inferidas» **solo** cuando el texto nombra un bien/equipo/material explícito (calidad C).
- **No (por ahora):** prometer «qué van a comprar» a partir del objeto. Las necesidades implícitas por tipo de obra, si se muestran, van rotuladas «probable por tipo de obra», calidad D y sin cantidades.
- La **calidad A/B** (necesidad documentada, especificaciones) depende de pliegos que el usuario o el contratista suban (flujo existente, 0 filas hoy). Sin acceso documental oficial (H1) el producto B no escala solo con SECOP: depende de la participación del contratista (representante verificado).
- **Condición de seguimiento:** repetir M2 con dos revisores sobre los 217 del Valle antes de CI-09.

Consecuencia para el MVP (PRD §13): A y C siguen íntegros; B arranca como «Descubrimiento de contratos y contratistas + actividad contratada», con necesidades de suministro explícitas como extra, no como promesa.

## Siguiente paso propuesto
CI-01b: ampliar el borrador del v1 con las lagunas del hallazgo 4 y los dos casos de contexto del hallazgo 3, con tests; luego el etiquetado con dos revisores.
