# Commercial & Supply Intelligence — PRD (entregables 2, 11, 12, 13, 14, 15, 18)

Fecha: 2026-11-09 · Estado: borrador, sin aprobación de implementación.
Hallazgos y decisiones: `…-commercial-intelligence-auditoria.md`.
Datos y algoritmos: `…-commercial-intelligence-datos.md`.

Principios heredados (no se relajan): no inventar campos ni cifras
(`NO_ENCONTRADO`); «contratado» no es «obra avanzada»; una adjudicación no es una
licitación abierta; el color nunca va sin su nombre; toda tabla nueva con RLS;
estado nuevo de negocio al backend; la portada y el hero no se tocan.

## 1. Problema y propuesta

Hoy AquaLicita ayuda a una empresa colombiana a decidir si **licita**. Un
fabricante, distribuidor o ingeniería —en cualquier país— no tiene dónde ver, con
evidencia, **qué compran y ejecutan** los proyectos públicos de agua en Colombia.
Propuesta: una capa comercial sobre el mismo núcleo de datos, con tres productos
(A oportunidades, B suministro post-adjudicación, C inteligencia de mercado) y una
regla de honestidad: toda afirmación comercial lleva procedencia, vigencia e
incertidumbre visibles.

## 2. Usuarios

| Persona | Quiere | No puede hacer en V1 |
|---|---|---|
| Fabricante/distribuidor internacional | Saber qué contratos en ejecución pueden necesitar sus equipos | Contactar al contratista desde la plataforma |
| Firma de ingeniería / integrador | Procesos y adjudicaciones afines a sus capacidades | Recibir cotizaciones |
| Contratista ejecutor | Reclamar su perfil y confirmar necesidades | Publicar solicitudes de cotización (futuro) |
| Analista de mercado | Inversión, contratistas y tecnologías por territorio | Exportar masivo sin plan premium |
| Administrador AquaLicita | Revisar verificaciones y calidad | Ver datos privados sin auditoría |

## 3. Ciclo de vida comercial (5 etapas)

Se **proyecta** sobre `etapaDeProceso()`; no es un estado nuevo en la base.

| Etapa comercial | Fuente hoy | Estado de la fuente |
|---|---|---|
| 1 Planificación | PAA (verificado como dataset en SDD V-F-3) | **No ingerido**. Fuera de MVP. |
| 2 Convocatoria | `proceso` con recepción vigente (`condicionAbierto()`) | Disponible |
| 3 Adjudicación | «Seleccionado» + adjudicatario | Disponible con errores conocidos (H8) |
| 4 Ejecución | `contrato` firmado + fechas | Disponible; **sin historial de cambios** (H5) |
| 5 Cierre/histórico | `al_oferentes_historico`, contratos | Disponible |

Texto obligatorio: «Estado administrativo según SECOP; no indica avance físico».

## 4. Producto A — Public Opportunity Intelligence

Reutiliza vitrina, ficha, Radar, alertas y guardados. Novedad: filtro por
**capacidad técnica de la empresa** (taxonomía tecnológica) además de tipo de
proyecto, y «Seguir» con aviso de cambios (`al_proceso_evento`). Sin
requisitos de personal (dominio TI).

## 5. Producto B — Post-Award Supply Intelligence

Flujo realista dado H1–H3:

1. Contrato firmado con contratista NIT (3.093 desde 2026; 217 en Valle).
2. Ficha comercial de contrato: contratista, entidad, valor, fechas, objeto, etapa.
3. Clasificador por **reglas + taxonomía** sobre `objeto`/`descripcion` produce
   candidatos de necesidad con fragmento citado → estado **Inferida**.
4. Si alguien sube el pliego (flujo existente), sus ítems de presupuesto
   elevan el candidato a **Documentada** (cita verificada contra texto).
5. Solo un **representante verificado del contratista** puede marcarla
   **Confirmada por contratista** o **Abierta a recibir propuestas**.
6. Un modelo de IA nunca cambia un estado a Confirmada/Abierta.

Estados: Inferida, Documentada, Confirmada por contratista, Abierta a recibir
propuestas, Cubierta, Descartada, Suspendida, Cerrada. Transiciones y
reglas en datos §5. Suspensión automática si el contrato cambia de estado, se
liquida o su fecha fin pasa (regla determinista).

Prohibido: inventar cantidades, especificaciones, precios, presupuesto o fechas
de entrega. Un campo sin fuente es `null` y se muestra «sin dato».

## 6. Producto C — Market Intelligence

Paneles sobre datos ya ingeridos: inversión por departamento/municipio, actividad
por entidad, adjudicaciones, historial de contratistas, categorías tecnológicas
(clasificación AquaLicita), evolución temporal. Cada cifra rotulada
**Oficial SECOP** o **Clasificación AquaLicita**. Sin relaciones comerciales
inferidas. MVP: reutilizar `informe.ts`, `agregados.ts`, `compradores.ts`;
paneles nuevos en fase 3.

## 7. Perfiles

**Empresa comercial** (internacional): campos del brief §6, cada uno con estado
`declarado | documentado | verificado`. Sin listas de precios. Cobertura
territorial en DIVIPOLA. Idiomas y monedas como listas. Una cuenta = una empresa.
**Contratista** (colombiano): proyección de `proveedor` NIT + contratos; nunca
persona natural; el `representante_legal` no se muestra. Reclamo con verificación
(NIT + correo corporativo + documento + revisión manual) y **revocación** por la
cuenta, el administrador o evidencia contraria; toda acción auditada.

## 8. Matching comercial (resumen)

Tres salidas separadas, nunca un score único: **Afinidad técnica**, **Calidad de
evidencia** (A–D), **Demanda** (estado de la necesidad). El score no es
probabilidad de venta. Cada resultado muestra qué coincide, por qué, qué
documentos lo respaldan, qué falta, restricciones y pasos disponibles.
Algoritmo en datos §6.

## 9. Interfaz (entregable 12) — wireframes

Prototipos HTML en una PR aparte **antes** de pantallas reales. Rutas
propuestas bajo `/comercial/*` (la landing no se toca; entrada solo desde el
menú de cuenta y la ficha).

```
Panel empresarial /comercial
┌ Tu empresa · estado de perfil 62 % · [Completar] ─────────────┐
│ Coincidencias nuevas (7)   Oportunidades guardadas (12)        │
│ ┌ Necesidad inferida · Bombeo ──┐ ┌ Convocatoria · PTAR ─────┐ │
│ │ Afinidad: alta  Evidencia: C  │ │ Afinidad: media Evid.: A │ │
│ │ Estado: Inferida              │ │ Cierra en 12 días        │ │
│ └ [Ver por qué] [Guardar] ──────┘ └ [Ver ficha] ─────────────┘ │
└────────────────────────────────────────────────────────────────┘
Ficha comercial de contrato /comercial/contratos/[slug]
 Cabecera: contrato · estado SECOP · «no indica avance físico»
 ├ Contratista (NIT) · integrantes: sin dato / declarado / oficial
 ├ Necesidades potenciales: [Estado][Evidencia][fragmento citado][fecha]
 ├ Requisitos profesionales  ← sección de Talent Intelligence (si existe)
 └ Restricciones · Qué falta confirmar · [Seguir]
Perfil internacional /comercial/perfil  (secciones plegables, cada dato con
 etiqueta declarado/documentado/verificado)
Explorador, Radar de suministros, Perfil de contratista, Seguimiento y
Solicitudes privadas (futuro, deshabilitada): una columna en móvil, filtros en
hoja inferior, tarjetas iguales a la vitrina.
```

## 10. Modelo comercial (entregable 15) — **hipótesis sin validar**

| Plan | Contenido | Hipótesis de precio (a validar) |
|---|---|---|
| Exploratorio | Procesos, ficha, perfil, 3 guardados, sin alertas comerciales | Gratis |
| Profesional | Matching, necesidades, alertas, guardados ilimitados | USD 49–149/mes |
| Empresarial | Varios usuarios (requiere decisión D2), API, exportación | USD 299–899/mes |
| Mercado premium | Paneles y descargas | USD 500–2.500/informe |
| Servicios de análisis | Estudios a medida | Por proyecto |
| Abastecimiento (futuro) | Solicitudes de cotización | Comisión o suscripción: no definir |

Costos a medir: Gemini por pliego, base/almacenamiento, correo, revisión manual
de verificaciones. Disposición a pagar: entrevistas del piloto. **No se implementan
cobros** hasta aprobar el modelo y validar clientes.

## 11. Cumplimiento (entregable 14) — requiere revisión jurídica

No emite declaraciones definitivas de cumplimiento. Matriz de riesgos:
- Datos personales (Ley 1581/2012): sin persona natural, sin representante legal; contactos comerciales solo de empresas, con consentimiento.
- Reutilización de datos SECOP / datos.gov.co: verificar licencia y atribución (D6).
- Libre competencia (Ley 155/1959, Decreto 2153/1992): la plataforma no coordina precios ni muestra ofertas privadas a competidores.
- Anticorrupción (Ley 1474/2011, Ley 2195/2022): sin intermediación de pagos ni «gestión» ante entidades; aviso en los términos.
- Restricciones internacionales (sanciones/listas): chequeo manual en piloto, sin certificación.
- Spam y suplantación: límites por cuenta, verificación de dominio, registro de contactos.
- Subcontratación: aviso de que una necesidad no autoriza vender; el contratista decide.

## 12. Flujos de usuario (entregable 11)

1. **Alta:** registro → perfil internacional → cada dato con estado → matching inicial.
2. **Descubrir:** coincidencia → «Ver por qué» (qué, por qué, documentos, faltantes) → Guardar/Seguir.
3. **Contratista:** reclamar perfil → verificación → ver necesidades inferidas → confirmar/descartar con motivo.
4. **Cambio:** contrato cambia → necesidad pasa a Suspendida → alerta autorizada a quien la siguió.
5. **Futuro RFQ:** solo diseño (datos §9).

## 13. Alcance del MVP (brief §17) y fuera de alcance

Dentro: perfil de capacidades, procesos relevantes, contratos adjudicados,
contratista con NIT, necesidades inferidas/documentadas con evidencia, matching
explicable, guardar, alertas con consentimiento. Fuera: cotizaciones,
negociación, cobros, contacto entre partes, PAA, integrantes de consorcio sin
fuente (D3), multi-tenant, cualquier función de Talent Intelligence.

**Condición:** si el spike CI-02 (valor medido de `objeto` como fuente) falla, el
MVP se reduce a A + C + perfil y B queda en «descubrimiento de contratos y
contratista» sin necesidades.

## 14. Piloto (entregable 18)

Valle del Cauca: 217 contratos firmados 2026 con NIT + procesos abiertos del
departamento. Participantes: fabricante de bombas, proveedor de instrumentación,
firma de ingeniería, distribuidor, contratista ejecutor.

| Métrica | Cómo | Umbral inicial (a ajustar) |
|---|---|---|
| Precisión de clasificación | 100 contratos etiquetados por 2 revisores | ≥ 80 % en categoría raíz |
| Calidad de evidencia | % necesidades con cita verificable | 100 % de «Documentada» |
| Relevancia | «útil/no útil» por coincidencia | ≥ 50 % útil |
| Errores de estado contractual | Auditoría vs. SECOP | < 3 % |
| Vigencia | % necesidades con contrato aún activo | informar |
| Utilidad de la ficha | Entrevista | cualitativa |
| Interés y disposición a pagar | 5 entrevistas | ≥ 3 con intención de pago |

Los umbrales son hipótesis de trabajo, no resultados.

## 15. Riesgos principales

Evidencia insuficiente (H1–H3), falsos positivos de necesidad, suplantación de
representantes, exposición de datos personales, presión de base de datos,
solape con TI, ausencia de i18n, errores de estado SECOP. Mitigaciones y dueños
en el plan de PR.
