# SPEC — AquaLicita Talent Intelligence V0 (fase informativa)
Fecha: 2026-11-09
Estado: propuesta para revisión, sin aprobación de implementación
Repo: Lucesdata/hydrostack_agent
Vertical: contratación de agua potable, saneamiento e infraestructura hidráulica en Colombia

## 1. Problema
Los pliegos y contratos exigen equipos técnicos diversos, pero las empresas tienen dificultad para identificar con rapidez profesiones, experiencia, dedicaciones y acreditaciones, en distintas etapas: preparación de oferta, adjudicación y ejecución. AquaLicita debe exponer **requisitos contractuales**, no inventar vacantes ni captar CV sin marco jurídico.

## 2. Alcance de producto
- V0: lectura estructurada y verificable de perfiles requeridos por un proceso o contrato; panel informativo en Ficha Viva; listado privado de necesidades internas registradas por contratista autenticado y autorizado (sin difusión pública de vacantes).
- Fuera de V0: registro de demandantes de empleo, perfiles personales públicos, CV, ranking de personas, preselección, remisión, postulaciones, recomendación de candidatos, mensajes de reclutamiento y colocación.
- Fase futura TAL-Network bloqueada por evaluación de encuadre regulatorio y decisión entre autorización del Servicio Público de Empleo o integración con prestador autorizado.

## 3. Distinciones obligatorias
- `requisito_documental`: cargo/perfil contenido en un documento con procedencia.
- `necesidad_interna`: necesidad creada o confirmada por representante autorizado de un contratista; no es vacante publicada.
- `vacante_confirmada`: nunca generada automáticamente; no habilitada en V0.
- `personal_comprometido`: puede estar ligado a oferta/contrato y sujeto a condiciones de sustitución.
- `sin_evidencia`: no se infieren títulos, años, dedicaciones ni certificados.
El estado contractual SECOP y el estado de demanda de personal son independientes.

## 4. Personas usuarias
1. Analista/proponente: ve requisitos públicos de personal para preparar una oferta, sujetos a fuentes oficiales.
2. Contratista verificado: organiza internamente un inventario de necesidades sin publicar vacantes.
3. Profesional individual: no tiene perfil ni servicio de colocación en V0.
4. Administrador: observa calidad de extracciones y reclamaciones, con acceso mínimo necesario.

## 5. Flujo informativo
SECOP ingerido -> proceso/contrato canónico -> documento accesible con autorización -> extracción de requisitos de personal -> normalización taxonómica -> comprobación de fragmentos/páginas -> estado de evidencia -> tarjeta en Ficha Viva -> panel privado opcional de contratista.

Si no hay documento o acceso: mostrar `No hay requisitos de personal verificables disponibles`. Un objeto genérico de contrato no genera automáticamente una plantilla de empleados.

## 6. Taxonomía V0
Familias:
- `ENG_HYD` ingeniería hidráulica y redes
- `ENG_SAN` ingeniería sanitaria y tratamiento
- `ENG_ENV` ingeniería ambiental
- `ENG_CIV` ingeniería civil y estructuras
- `ENG_ELEC` ingeniería eléctrica
- `ENG_MECH` ingeniería mecánica
- `DES_CAD` delineación AutoCAD/Civil 3D
- `DES_BIM` modelación BIM/Revit
- `GIS` geoinformación
- `OPS_PLANT` operación PTAP/PTAR
- `TECH_INST` instrumentación, automatización y SCADA
- `TECH_EM` mantenimiento electromecánico
- `CONS_SUP` supervisión/interventoría
- `MGMT_PROJECT` dirección y programación de proyectos
- `ADMIN_PROC` contratación, compras, presupuesto y gestión documental
- `SST` seguridad y salud en el trabajo.
La familia no implica título legal. Mantener sinónimos y descripción versionados; preservar texto original.

## 7. Contrato lógico del requisito
```ts
type StaffRequirement = {
  id: string; processId: string; contractId?: string | null;
  sourceDocumentId: string; sourceLocator?: { page?: number; section?: string; offset?: number };
  sourceQuote: string; sourceVerified: boolean;
  rawRole: string; familyCode: string | null;
  educationText: string | null; generalExperienceText: string | null;
  specificExperienceText: string | null; dedicationText: string | null;
  credentialsText: string | null; quantity: number | null;
  status: 'documented' | 'needs_review' | 'rejected';
  extractionVersion: string; reviewedAt?: string | null;
};
```
Campos ausentes se representan como null/NO_ENCONTRADO según contrato existente, sin rellenar supuestos. El extractor actual `src/lib/pliego/schema.ts` no cubre este contrato y no se debe alterar sin plan aprobado.

## 8. Interfaz
- Ficha Viva: sección «Equipo profesional exigido» SOLO si hay requisitos documentados; tabla: cargo textual, formación, experiencia general/específica, dedicación, documentos, fuente, estado de evidencia. Mensaje explícito: «Un requisito del pliego no es una vacante».
- Panel privado «Mi equipo contractual» (posterior a verificación): requisitos públicos + marcadores internos «pendiente de revisión/cubierto/por definir», sin nombres de candidatos ni CV.
- En las tarjetas, distinguir documentos oficiales, inferencias y anotaciones privadas. Accesibilidad móvil y enlaces al expediente.

## 9. Seguridad y regulación
- Datos personales y CV quedan fuera de V0.
- Prohibido extraer nombres/teléfonos/correos de personas desde SECOP para reclutamiento.
- No usar reconocimiento facial ni rasgos protegidos como factores de valoración.
- Acceso privado del contratista por usuario autenticado, claim verificado y comprobación en servidor; RLS para nuevas tablas y filtros Drizzle. Auditoría de acceso y modificaciones.
- La gestión/colocación y actividades de registro, preselección y remisión están reguladas; consultar Ley 1636 de 2013, Decreto 1072 de 2015 y Servicio Público de Empleo, revisar vigencia con asesoría legal antes de activar TAL-Network.
- Retención, exactitud y derecho de corrección para anotaciones; términos de uso claros.
- No afirmar que se puede sustituir personal de oferta sin examinar el contrato.

## 10. Calidad y criterios de aceptación
- 0 requisitos sin fuente enlazable etiquetados como «documentados».
- 0 vacantes creadas por extracción.
- 0 CV o datos personales de candidatos recogidos en V0.
- 100% de campos detectados con procedencia; las citas del LLM deben contrastarse contra texto del documento (el pendiente actual de grounding no está resuelto).
- Doble revisión de casos ambiguos; fixtures de PTAP, PTAR, redes, consultoría y documento sin personal.
- Si no hay acceso al documento, no extrapolar desde nombre del contrato.
- Tests: negaciones, experiencia general/específica, unidades de dedicación, roles repetidos, equipo mínimo vs adicional, documento escaneado no legible, aislamiento de datos.

## 11. Métricas piloto
Precisión/recobrado sobre dataset de requisitos anotados por humanos; ratio con citas verificadas; tiempo de revisión por expediente; utilidad percibida por ingenieros/contratistas. No usar tasa de colocación en V0.

## 12. Dependencias y restricciones
Leer primero `CLAUDE.md`, `docs/CONDUCTA.md`, `docs/sdd/00-esqueleto.md`, esquema Drizzle, extractor híbrido, tests y Ficha Viva. La base viva no fue inspeccionada en esta fase: no asumir que existen filas de pliegos o CV.
Toda ampliación de extractor, esquema, auth o ruta pública exige plan aprobado, PR, CI y migraciones exclusivamente locales en primera instancia.
