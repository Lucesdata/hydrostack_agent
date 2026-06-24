# Fuentes originales

## Archivos del proceso (ubicación en el sistema del usuario al momento de la sonda)

| Archivo | Ruta | Tamaño | Notas |
|---|---|---|---|
| Pliego (Complemento al Pliego de Condiciones Definitivo) | `~/Downloads/9. PLIEGO DE CONDICIONES DEFINITIVO ESTUDIOS DE MITIGACION.docx (3).pdf` | 2 MB, 90 páginas | PDF nativo (no escaneado). Texto seleccionable. Tablas extraíbles con buena calidad. |
| Formato de oferta económica | `~/Downloads/FORMATO OFERTA ECONOMICA EST MITIGACION DE RIESGOS PTAPS.xlsx` | una hoja, 64 filas × 12 cols | Excel abierto con `openpyxl`. Merges declarados, encabezados claros. Sin macros. Sin protecciones. |

**Importante**: las rutas anteriores son específicas del usuario y del momento. Si se mueven los archivos, actualizar esta tabla.

## Archivos referidos en el pliego pero NO incluidos en el paquete analizado

- **Anexo 3 – Minuta del Contrato** (Cap. IX, p.89). Contiene forma de pago, anticipo, obligaciones, multas. Requerido para análisis completo de viabilidad financiera del contrato.
- **Matriz de Riesgos** (Cap. VI, p.82). Referida como anexo separado.
- Estudios previos y estudio de sector (Cap. I, p.1). Mencionados pero no incluidos.

Estos faltantes están registrados en `lagunas.md` (lagunas #5 y #6) y `extraction.json` (`lagunas_pendientes`).

## Cobertura de lectura del pliego

| Rango de páginas | Estado |
|---|---|
| 1–28 | Leído |
| 29–48 | Leído |
| 49 | Leído (continuación de experiencia, sin contenido nuevo de presupuesto) |
| 50–69 | Leído |
| 70–89 | Leído |
| 90 | Leído (solo firma del Director Técnico) |

**Total: 90/90 páginas leídas (100%)**.

## URL del proceso en SECOP II

https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10207817

Nota técnica: el detalle del proceso en SECOP II es un SPA (jQuery + motor propio). Los anexos solo se cargan tras ejecución de JavaScript autenticado. **No se pueden descargar por `curl`**; el flujo natural es que el usuario los baje manualmente.

## Dataset Socrata usado para descubrir el proceso (Prompt 0.1)

- Dataset: `p6dx-8zbt` (SECOP II – Procesos de Contratación)
- URL: https://www.datos.gov.co/resource/p6dx-8zbt.json
- Filtros aplicados: `departamento_entidad='Valle del Cauca'` + `fase='Presentación de oferta'` + `estado_de_apertura_del_proceso='Abierto'` + objeto contiene términos de agua/saneamiento
- Caveat conocido: el campo `fase` no siempre se refresca cuando un proceso cambia de estado. Procesos publicados en 2022/2023 con `fase='Presentación de oferta'` y `estado='Abierto'` probablemente están desactualizados. Filtrar por año de publicación 2026 para obtener candidatos realmente activos.

## Firma del pliego

- **Diego Fernando Hau Caicedo**, Director Técnico – Unidad Administrativa Especial de Servicios Públicos
- Proyectó: Leidy Mauricia Murillo (Contratista)
- Revisó: Laura Natalia Gil Niño (Contratista), Lorena Gaviria (Contratista)
