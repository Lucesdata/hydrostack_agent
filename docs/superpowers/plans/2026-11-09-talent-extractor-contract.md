# TAL-02 — Contrato técnico del extractor de requisitos profesionales
Fecha 2026-11-09 · Estado: diseño técnico, sin implementación
Acompaña el SPEC `2026-11-09-talent-intelligence-v0.md`.

## 1. Observaciones del código existente
- `src/lib/pliego/schema.ts` define `PliegoExtraction` para presupuesto, cronograma y habilitantes; no contiene un campo de roles/personas. Contiene `NO_ENCONTRADO` y verificación de citas para algunos datos.
- `src/lib/pliego/extractPliegoHybrid.ts` ejecuta Gemini para Documento Base y reglas para campos específicos. No reescribir este extractor ni agregarle campos obligatorios hasta aprobar compatibilidad y fixtures.
- `src/lib/secop/etapa.ts` diferencia recibir ofertas, adjudicado y ejecución basada en fechas. No presupone avance físico.
- `docs/CONDUCTA.md`: toda función nueva del dominio nace con tests; extractor y esquema necesitan plan aprobado.

## 2. Contrato de salida propuesto (separado)
```typescript
type SourceLocator = {
  documentId: string;
  documentUrl?: string;
  page?: number; // página física cuando se pueda verificar
  section?: string;
  startOffset?: number;
  endOffset?: number;
};
type StaffRequirementV0 = {
  processId: string;
  contractId?: string | null;
  rawRole: string;
  normalizedFamily: StaffFamily | null;
  quantity: number | null;
  requiredEducation: string | null;
  generalExperience: string | null;
  specificExperience: string | null;
  requiredCredentials: string[]; // solo las expresamente exigidas
  requiredDedication: { amount: number; unit: 'percentage' | 'hours_week' | 'months' | 'unknown' } | null;
  evidence: { quote: string; locator: SourceLocator; verified: boolean }[];
  reviewState: 'documented' | 'needs_review' | 'rejected';
  extractionVersion: string;
};
```
Un campo sin fuente = null o lista vacía, no inventar. El estado `documented` requiere por lo menos una cita verificada.

## 3. Reglas de interpretación y edge cases
| Caso | Comportamiento |
|---|---|
| «Ingeniero civil o sanitario» | Conservar rol original y alternativas; no exigir ambos |
| «Mínimo 5 años, 3 específicos» | Registrar separadamente 5 general y 3 específica con fuente |
| «Dedicación 50%» | `{amount:50,unit:'percentage'}` |
| «Se valorará experiencia» | No confundir criterio puntuable con requisito habilitante |
| «No se exige coordinador» | No producir rol confirmado |
| «Equipo de apoyo opcional» | Marcar opcional, no contar como plantilla mínima |
| Roles repetidos en anexos | Unificar por cargo+condición+alcance, preservar todas las fuentes |
| Tablas escaneadas sin texto confiable | `needs_review`, sin afirmar requisitos |
| Formularios firmados con nombres/CC | No copiar ni publicar información personal |
| Sin documentos | Estado no disponible; no extrapolar del objeto contractual |

**Extensión indispensable antes de código:** añadir a contrato `requirementKind: 'mandatory'|'scored'|'optional'|'unknown'` y `alternatives: string[]` para conservar matices.

## 4. Validación de evidencia
1. Usar solo documentos con derecho de acceso y referencia estable.
2. Extraer texto por documento/versión, registrar hash y localizador.
3. Normalizar espacios para corroborar fragmento; jamás declarar `verified: true` si no se encontró el texto.
4. Rechazar valores numéricos imposibles (por ejemplo dedicación >100% para un único rol sin contexto).
5. Si dos fuentes se contradicen, marcar `needs_review` y mostrar ambas; no decidir automáticamente.
6. Un modelo generativo puede sugerir un rol, pero jamás validarlo sin evidencia.
7. No almacenar CV ni nombres de personas mencionadas en anexos.

## 5. Interfaz de lectura en Ficha Viva
Sección: «Equipo profesional requerido por el proceso».
- Cada rol muestra texto del pliego, familia técnica, formación, experiencia general/específica, dedicación, acreditaciones y botón a fuente.
- Etiqueta independiente: `documentado` o `revisar`.
- Texto fijo: «Los requisitos de personal no equivalen a ofertas de empleo».
- Sin documentos fiables: «No hay información verificable sobre perfiles exigidos».
- Mostrar fecha de fuente y extracción. Si caduca o llega adenda, recalcular; conservar versión previa.

## 6. Diseño de interfaces entre módulos
Input desde `secop`: `processId`, `contractId?`, `documentVersion`, `source`.
Output de `talent-intelligence`: `StaffRequirementV0[]` con fuentes verificables; *no* profesionales.
La Ficha Viva consume solo requisitos documentales y jamás candidatos.
`supplier-intelligence` puede usar taxonomías compartidas de disciplinas, pero no acceder a perfiles individuales.

## 7. Plan de pruebas para PR TAL-02
Fixtures sintéticos anonimizados:
- PTAP: ingeniero sanitario y operador, requisito mínimo con experiencia.
- PTAR: especialista de procesos con dedicación %.
- Redes: residente civil o sanitario, alternativa.
- Consultoría: profesional como factor puntuable, no habilitante.
- Negación: cargo explícitamente no requerido.
- Documento vacío/ilegible.
- Adenda: dos versiones contradictorias.
Tests unitarios para parser, taxonomía, deduplicación y contraste de citas. Test de integración para la Ficha Viva solo en PR posterior.

## 8. Gate de salida
- Auditoría del esquema Drizzle y del acceso a documentos reales.
- Aprobación de cómo almacenar evidencia y documentos, respetando la cuota del extractor existente.
- Plan de migración y RLS aprobado.
- Revisión legal antes de perfiles personales o colocación laboral.
