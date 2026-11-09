# TAL-03 — Piloto documental de diez expedientes de agua y saneamiento
Fecha: 2026-11-09  
Estado: **CATALOGADO; VALIDACIÓN DIRECTA DEL PDF PENDIENTE**  
Dependencia de código: PR #171, rama `feat/talent-requirements-parser-v0`  
Rama del piloto: `test/talent-validation-corpus-v0`

## Propósito
Comprobar con documentos públicos de contratación de proyectos de agua y saneamiento si el extractor de Talent Intelligence reconoce correctamente los requisitos de personal profesional y técnico, incluyendo tablas y fases contractuales. El piloto no crea ofertas de trabajo, candidatos ni perfiles de personas naturales.

## Evidencia y límites
- Se identificaron diez documentos oficiales publicados en el dominio de FINDETER, con extractos disponibles en resultados de búsqueda. Se incorporaron a `validation-corpus.ts`.
- En la exploración de los archivos PDF desde las herramientas de revisión visual se obtuvieron errores HTTP 403 en determinados documentos. **No se ha ejecutado todavía la extracción local `pdftotext` sobre los diez originales.**
- Por tanto no existen métricas reales de precisión, sensibilidad, recobrado, localización de páginas ni validación de tablas. Los tests sintéticos solo prueban cobertura de categorías, no calidad sobre documentos originales.
- La fecha de publicación histórica y el personal mínimo documentado **no demuestran que existan vacantes vigentes**.
- Algunos expedientes de FINDETER se refieren a patrimonios autónomos/contratación particular; no deben etiquetarse automáticamente como procesos SECOP II sin reconciliar identificadores.

## Diez fuentes para evaluación

| Caso | Documento | Categoría de evaluación | Ejemplo de dificultad | Estado |
| --- | --- | --- | --- | --- |
| 01 | PAF-ATF-O-004-2019, Zipaquirá | Acueducto y PTAP | Director/residente; 10/6 años; 50/100% en tabla | Solo catalogado |
| 02 | PAF-AASB-I-121-2022, Pamplona | Acueducto/interventoría | Interventor, residente, trabajo social; porcentajes distintos | Solo catalogado |
| 03 | PAF-ATICBF-O-086-2022, ICBF grupo 5 | PTAR / diseño multipropósito | Texto de tablas muy fragmentado; acotar componente PTAR | Solo catalogado |
| 04 | PAF-AASB-O-012-2021 | Redes de alcantarillado | Director de proyectos; condición de experiencia específica | Solo catalogado |
| 05 | PAF-ATF-C-039-2015, Tumaco | Consultoría alcantarillado | Fases, director y coordinador, experiencia y dedicación | Solo catalogado |
| 06 | PAF-ATF-O-138-2015, Guachené | Alcantarillado | Hidráulica, ambiente, geotecnia; valores por fase | Solo catalogado |
| 07 | PAF-DNP-C-004-2021, Coveñas | Alcantarillado y PTAR | Requisito antes de acta de inicio; fases de prefactibilidad | Solo catalogado |
| 08 | PAF-ATF-I-154-2022 | Redes/interventoría | Hidrología, topografía, cadenero; N/A y primeros empleos | Solo catalogado |
| 09 | PAF-ATF-O-042-2016 | PTAP y redes | Hidráulica/geotecnia; dedicación «la requerida», no porcentaje | Solo catalogado |
| 10 | PAF-ATF-130-2015, Popayán | Alcantarillado y PTAR | Electromecánica, maestro de obra y personal obligatorio | Solo catalogado |

URLs exactas y pistas de localización en `src/lib/talent-intelligence/validation-corpus.ts`.

## Procedimiento reproducible

1. Obtener los PDF directamente de fuentes públicas legítimas o documentación aportada legalmente, conservando URL, fecha de acceso y hash SHA-256. No sortear restricciones de acceso.
2. Revisar **visualmente** la(s) página(s) de personal mínimo, anexos y adendas; registrar la página del PDF y la página impresa, que pueden diferir.
3. Anotar manualmente para cada requisito: cargo textual, profesión alternativa, formación, cantidad, experiencia general y específica, número de contratos/proyectos, dedicación, fase y fuente.
4. Construir un JSON local (sin subir documentos privados a GitHub) que relacione los IDs del corpus con las rutas locales a PDF.
5. Ejecutar `npx tsx scripts/talent/validar-corpus.ts rutas-locales.json` en un entorno que tenga Poppler `pdftotext`. El reporte solo muestra conteos y alertas de ambigüedad; no da por válida ninguna cita.
6. Contrastar la salida con la anotación humana y cuantificar falsos positivos, omisiones y atribuciones incorrectas.
7. Conservar en el informe los fallos, no ocultarlos. Si hay error de acceso o PDF escaneado, registrar «no evaluable» y no atribuir contenido.
8. No habilitar publicación en Ficha Viva hasta cerrar la revisión documental y aprobar un contrato seguro de procedencia/versionado.

## Criterios de aceptación para aprobar TAL-03

- **10/10** PDFs originales correctamente identificados y accesibles, o lista explícita de casos no evaluables con sustitución justificada por otros expedientes.
- **10/10** páginas/tablas de personal revisadas visualmente y con versión de documento registrada.
- Todas las afirmaciones numéricas mostradas deben estar vinculadas a una fila, cargo, documento y página revisados; si hay ambigüedad → `null` + revisión humana.
- Separar cargos habilitantes, puntuables, opcionales y personal del adjudicatario durante ejecución.
- Revisar manualmente formación, alternativas de título, dedicación por fase, número de contratos y experiencia.
- Calcular precisión y cobertura observadas; hasta entonces no reportar porcentajes de exactitud.
- Ningún resultado implica vacantes, postulaciones o fichas personales.
- Antes de una página pública, aprobar ruta de lectura verificada, política de enlaces fuente y revisión jurídica.

## Próximo gate
Validación directa de PDFs y especificación del componente **«Equipo profesional requerido»** de Ficha Viva. Sin mezclar módulos de suministros ni tocar `main`.
