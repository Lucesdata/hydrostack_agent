# Commercial & Supply Intelligence — Auditoría previa (entregables 1 y 20)

Fecha: 2026-11-09 · Estado: **borrador para revisión, sin código productivo** ·
Spec maestra: «AquaLicita — Commercial & Supply Intelligence, Master Spec V3.0».
Documentos hermanos: `…-commercial-intelligence-prd.md`,
`…-commercial-intelligence-datos.md`, plan `…/plans/2026-11-09-commercial-intelligence-epicas-pr.md`.

Método: lectura de `CLAUDE.md`, `README.md`, `docs/CONDUCTA.md`, el esquema Drizzle
(`src/lib/db/schema/*`), `docs/sdd/00-esqueleto.md`, la auditoría del PR #165, el
PR #170 (3 archivos) y consultas **solo de lectura** a la base viva (proyecto
Supabase `hydrostacks`, 2026-11-09). No se ejecutaron `npm test`, `build` ni `lint`
en esta sesión: nada de lo que sigue afirma que el suite pase.

## 1. Hallazgos que cambian el diseño (en orden de impacto)

| # | Hallazgo verificado | Consecuencia |
|---|---|---|
| H1 | **Los documentos de SECOP no son descargables desde el servidor.** `document-access.ts`: la URL pública redirige a un muro ReCaptcha; el sondeo se retiró (2026-10-04). Base viva: `document_access` = 94.724 `UNKNOWN`, 174 `NOT_PUBLISHED`, 28 `RESTRICTED`, **0 `PUBLIC`**. | Los pasos 3–4 del pipeline del brief («consultar documentos», «extraer componentes») **no se pueden automatizar** hoy. La evidencia sale de texto corto de SECOP o de pliegos que el usuario sube. |
| H2 | `pliego_proceso`, `requisitos_proceso` y `documento`: **0 filas**. `raw_record.payload` está vacío en las 135.288 filas (adelgazamiento 2026-09-12). | No hay corpus documental ni payload histórico del que extraer. Todo lo que no esté promovido a columna no existe. |
| H3 | Texto disponible por contrato: `contrato.objeto` mediana 233 caracteres (p90 416); `proceso.descripcion` mediana 212. | Una «necesidad» detectada desde ese texto es **inferida de baja evidencia** casi siempre. La viabilidad del producto B depende de medir esto (spike CI-02). |
| H4 | **No hay integrantes de consorcios.** `proveedor` tiene 970 filas `es_estructura_plural` (887 con «consorcio/unión temporal» en el nombre); su `raw_attrs` solo trae `representante_legal` (dato personal). 1.077 contratos pertenecen a esas estructuras. | «Consultar integrantes cuando exista evidencia oficial» exige una fuente nueva aún no identificada (decisión D3). El representante legal **no** se publica. |
| H5 | `contrato_evento` se eliminó (2026-08-16, `drizzle/0011`) aunque `CLAUDE.md` §2 aún la lista. Hay `al_proceso_evento` (55.508 filas) para **procesos**, no para contratos. `valor_actual`/`fecha_fin_actual` son fotos sin historial. | «Cambios contractuales» (adiciones, prórrogas) no tiene hoy historial. Hay que crear una línea base propia, acotada, como se hizo con `al_proceso_*`. |
| H6 | 16.506 `proveedor`: 8.758 NIT y **7.748 no-NIT** (personas naturales). Política vigente: no se nombran. | El perfil de contratista público se limita a NIT. Regla del brief §10 ya está respaldada por `como-se-contrata`. |
| H7 | Conflicto de vocabulario: en el código `proveedor` = **adjudicatario** de SECOP y `oferente` = empresa colombiana que se presenta (`CONDUCTA` §7). El brief llama «proveedor» a la empresa internacional que vende suministros. | Nombre nuevo obligatorio para no mezclar modelos: `empresa_comercial` (decisión D1). No extender `oferente_perfil` (jsonb de UNSPSC, RUP, DIVIPOLA, SMMLV: dominio de licitar). |
| H8 | Calidad de estado contractual (PR #165): 99 procesos con `adjudicado=true` no están en «Seleccionado» y 15 no tienen adjudicatario; `valor_adjudicacion = valor_estimado` en 5.145 de 13.871. | El producto B no puede confiar en `adjudicado` solo: reutilizar la regla «Seleccionado + adjudicatario» y `etapaDeProceso()`. Medir «errores de estado contractual» en el piloto. |
| H9 | `tipo_proyecto='otros'` = 35.122 de 94.926 procesos (37 %). | La taxonomía tecnológica no puede colgar solo de `tipo_proyecto`; es una segunda clasificación independiente (como pide el brief) con su propia confianza. |
| H10 | Una cuenta = un `usuario`; `oferente_perfil` 1 por usuario (5 usuarios, 1 perfil). `plan` existe pero ningún handler lo lee; ninguna capacidad es `pro`. | Coherente con «una cuenta por usuario en V1». La verificación de representación y la facturación son nuevas. |
| H11 | La app es solo en español (CONDUCTA §8). Los proveedores objetivo son internacionales. | Falta i18n (inglés mínimo para perfil y matching). No existe infraestructura; decisión D13. |
| H12 | Volumen útil para el piloto: 3.093 contratos firmados desde 2026 con contratista NIT a nivel nacional; **217 en Valle del Cauca**. | El piloto del Valle es pequeño pero suficiente para medir precisión; no para estadística de mercado. |

Documentación desactualizada detectada (no corregida aquí, alcance cerrado): `CLAUDE.md`
§2 lista `contrato_evento` como entidad canónica; `CONDUCTA.md` §5 dice «110 archivos
de prueba» y hay 191 `*.test.*`.

## 2. Qué existe y se reutiliza (CONDUCTA §1)

| Necesidad del brief | Ya existe | Acción |
|---|---|---|
| Procesos, contratos, entidades, contratistas | `proceso`, `contrato`, `entidad`, `proveedor`, `geografia` | Reutilizar sin tocar. |
| Etapa y ciclo de vida | `etapaDeProceso()`, `guiaTemporal`, `como-se-contrato.ts` | Base de las 5 etapas comerciales. |
| Clasificación de 5 tipos | `tipo-proyecto.ts` (`TIPOS_PROYECTO`) | Intocable. |
| Histórico y rivales | `al_oferentes_historico` (27.035), `competidor.ts`, `al_sanciones` | Insumo de Market Intelligence y perfil de contratista. |
| Alertas y seguimiento | `alerta_preferencias`, `envio_log`, `coincidencia`, `al_proceso_evento`, guardados (`senal_usuario` prefijos) | Extender; no duplicar. |
| Extractor de pliegos | `extractPliegoHybrid.ts`, cuota 5/24 h | **No** se modifica. Sin campo de suministros. |
| Perfil/matching de oferente | `oferente/`, `matching/`, `al/matching/` | Distinto dominio; se toma solo el patrón (determinista, explicable). |
| Radar institucional | `radar-institucional.ts`, `buscar-entidades.ts` | Se amplía en fase posterior. |
| Acceso por niveles | `acceso/politica.ts` | Capacidades nuevas se declaran ahí. |
| Marketing/correo | Resend, consentimiento en `senal_usuario` | Alertas comerciales exigen consentimiento propio. |

No existe código equivalente a: taxonomía tecnológica, perfil de empresa
comercial, necesidades de suministro, evidencia polimórfica, integrantes de
consorcio, representación de contratista, seguimiento comercial.

## 3. Auditoría del PR #170 (Talent Intelligence V0)

Estado: borrador, abierto, 3 archivos de documentación (+232 líneas), base `main`
actual, sin código ni migraciones. **No toca ningún archivo de este plan**; mis
documentos usan nombres distintos (`commercial-intelligence-*`). Sin conflicto de
merge.

Convergencias:
- Misma doctrina de evidencia: cita verificada, `needs_review`, nunca inventar, ningún LLM valida solo.
- Mismo bloqueo documental (H1) y mismo `grounding` pendiente (PENDIENTES §76 del extractor).
- Misma separación estado contractual ≠ estado de demanda.

Solapes que exigen coordinación (no se resuelven unilateralmente):
1. **Representación de contratista.** TAL-05 diseña «reclamación/verificación de representante»; el brief §10 pide lo mismo. Debe ser **un** mecanismo (`representacion_proveedor`), propiedad compartida, con una sola migración.
2. **Evidencia.** TI define `staff_evidence` con `SourceLocator`; este diseño define `evidencia`. Propuesta: un tipo TS común `EvidenceRef` y **tablas por dominio** (no tabla compartida) hasta revisión arquitectónica.
3. **Taxonomías.** TI define 16 familias profesionales (`ENG_HYD`…). La taxonomía tecnológica es otra (bienes/servicios). Se comparten solo los códigos de disciplina cuando coincidan; sin FK cruzada.
4. **Ficha Viva.** Ambos añaden secciones. Se propone un contrato de «proveedores de sección» (ver datos §8) para que no compitan por `[slug]`.
5. **Supuesto no verificado en #170:** «documento accesible con autorización». Con H1 solo es cierto para pliegos subidos por usuario.

Fuera de límite para este trabajo (según brief §19): extractor de requisitos
profesionales, CV, perfiles personales, candidatos, colocación.

## 4. Decisiones pendientes (bloquean el paso a código)

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Nombre del dominio de empresas internacionales | `empresa_comercial` / `supplier` / reutilizar `proveedor` | `empresa_comercial`; nunca reutilizar `proveedor` |
| D2 | Multi-tenant | V1 una cuenta=una empresa | Mantener; revisitar tras piloto |
| D3 | Fuente de integrantes de consorcio | dataset SECOP aparte / declaración del representante / ninguna | Verificar dataset público (spike); si no, solo declarado y rotulado |
| D4 | Acceso documental | solo pliego subido por usuario / alianza o API oficial / scraping | Solo subida de usuario (scraping contradice H1 y términos) |
| D5 | Go/no-go de Necesidades de suministro | seguir con texto corto / pausar B | Decidir tras spike CI-02 con 217 contratos del Valle |
| D6 | Términos de reutilización de datos SECOP y datos.gov.co | requiere revisión legal | Revisión antes de monetizar |
| D7 | Verificación de proveedores extranjeros y listas restrictivas | manual / proveedor externo | Manual en piloto; no declarar cumplimiento |
| D8 | Precios y planes | ver PRD §10 | Validar con 5 entrevistas antes de cobrar |
| D9 | Revelación de contactos entre partes | ninguna en MVP / solicitud mediada | Ninguna en MVP; solo «Guardar» y «Seguir» |
| D10 | Mecanismo único de representación con TI | compartido / duplicado | Compartido, acordado por ambos PR |
| D11 | Cuota de base de datos y Storage | revisar plan Supabase | Medir antes de nuevas tablas con evidencia |
| D12 | Persona natural como contratista | excluida / opt-in | Excluida (política vigente) |
| D13 | Idioma de la interfaz | solo ES / ES+EN | EN mínimo para perfil y matching; ES para procesos |
| D14 | Uso de Gemini en clasificación de necesidades | reglas primero / LLM | Reglas + taxonomía; LLM solo sugiere y siempre `inferida` |
| D15 | Rama de trabajo | descriptiva propia / rama de sesión | Se usó la rama de sesión `ccr-ea66965f-gl40ez` por mandato del entorno |
