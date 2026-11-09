# CI-11 — Pantallas reales (plan por rebanadas)

Fecha: 2026-11-09 · Prototipos aprobados «tal cual» por el usuario el 2026-11-09 (`docs/commercial-intelligence/prototipos/`). Migraciones `0027`/`0028` **no** aplicadas a la base viva (decisión del usuario): lo que depende de tablas `ci_*` espera.

## Reglas de esta fase
- Rutas bajo `/comercial/*`; **la portada, el hero y la navegación pública no se tocan**.
- **Detrás de una bandera:** `CI_COMERCIAL_HABILITADO=1`. Apagada (por defecto) toda ruta responde 404. Así un merge a `main` (que despliega) no publica nada.
- `noindex, nofollow` mientras sea un producto en piloto.
- Mobile-first, el estado nunca solo en color, «sin dato» en vez de inventar, solo contratistas con NIT, sin representantes legales (como los prototipos).
- Los textos de datos vienen de lo ya ingerido (CONDUCTA §1), nunca de SECOP en vivo.

## Rebanadas
| # | Pantalla | Depende de | Estado |
|---|---|---|---|
| 11a | Ficha comercial de contrato (`/comercial/contratos/[id]`) | Nada nuevo: `contrato`, `proveedor`, `entidad`, clasificador puro | **Hecha (esta entrega)** |
| 11b | Perfil de empresa (`/comercial/perfil`) | `0027` aplicada (servicio y acciones ya existen) | **Hecha (2026-11-09)**; `0027` aplicada a la base viva |
| 11c | Explorador de oportunidades (`/comercial/explorar`) | Filtro por tecnología (clasificador sobre `objeto`) | **Hecha (2026-11-09)**, con una advertencia de rendimiento (ver abajo) |
| 11d | Radar de suministros | Migración B (`ci_necesidad`) y D10 | Espera D10 y etiquetado (CI-09) |
| 11e | Perfil de contratista + reclamación | Migración D (`representacion_proveedor`) y D10 | Espera D10 |
| 11f | Seguimiento y alertas | `0027` (`ci_seguimiento`, `ci_consentimiento`) y Resend operativo | Espera migración y correo |
| 11g | Radar institucional ampliado | Cifras por tecnología con muestra suficiente | Espera datos |
| 11h | Panel empresarial | 11b + matching persistido (migración B) | Espera |
| — | Solicitudes de cotización | Solo diseño | No se construye |

## 11a — decisiones
- **Id público:** el id nativo del contrato (`CO1.PCCNTR.n`), validado por forma antes de tocar la base.
- **Necesidades «inferidas» calculadas al vuelo** con `clasificarTecnologia(objeto)`: sin persistir (no hace falta `ci_necesidad`), cada una con su cita literal, estado `inferida` y evidencia C. Es la rebanada más honesta que cabe sin tablas: no promete cantidades ni fechas.
- **No incluye** «Cambios del contrato» (necesita `0028` aplicada y el job corrido) ni «Seguir» (necesita `ci_seguimiento`). La sección de Talent Intelligence queda reservada con el texto fijo acordado.
- **Contratista:** solo si su documento es NIT (`esPersonaJuridica`); si no, se dice que existe un contratista que no se nombra. Integrantes de consorcio: «sin dato oficial».
- **Ubicación:** la de la entidad, rotulada como tal (la fuente no publica el lugar de ejecución).
- **Vigencia:** por `fecha_fin_actual` frente al día de hoy en Colombia; se rotula «según las fechas de SECOP; no indica avance físico».

## 11a — resultado (2026-11-09)
- **Archivos:** `src/lib/comercial/{habilitado,ficha-contrato}.ts`, `src/components/comercial/FichaComercial.tsx` (+ módulo CSS) y `app/comercial/contratos/[id]/page.tsx`.
- **Verificado:** `npm run build` pasa y la ruta compila como dinámica (ƒ); con la bandera apagada y con un id inválido responde **404** (`next start` local). Con la bandera encendida no se probó contra una base real (en esta sesión no hay `DATABASE_URL`): la lectura está probada sobre PGlite.
- **Pruebas (24 nuevas):** armado puro (NIT vs persona natural, cita literal, negaciones, vigencia en hora de Colombia, ids), componente renderizado (aviso de no-avance físico, glifo + nombre, «sin dato», sin representantes legales ni supervisores, reserva de Talent Intelligence) y lectura SQL (joins, soft-delete, `raw_attrs.representante_legal` no se filtra, inyección en el id).
- **Para encenderla:** `CI_COMERCIAL_HABILITADO=1` en el entorno (decisión de despliegue del usuario). No hay enlaces desde ninguna otra página: se llega por URL directa.

## 11b — resultado (2026-11-09)
Prototipo `02-perfil.html` aprobado; `0027` ya está en la base viva.
- **Ruta:** `/comercial/perfil` (privada, dinámica, `noindex`), detrás de `CI_COMERCIAL_HABILITADO=1`. Se añadió `/comercial/perfil` a `PROTECTED_PREFIXES` del middleware (sin sesión redirige al login; con sesión y bandera apagada, 404).
- **Formulario HTML puro con acción de servidor** (sin JavaScript de cliente): `PerfilEmpresaForm.tsx` + `guardarEmpresaFormAction` → redirige a `?ok=1` o `?error=campos` (solo campos conocidos; lo que viene de la URL se filtra contra una lista).
- **`entradaDesdeFormData` (puro):** solo lee los campos que el formulario ofrece; estados, verificación e ids no existen en él. **Conserva** las especificaciones técnicas y la cobertura municipal ya guardadas, que el formulario no edita (el servicio reemplaza los hijos).
- **Muestra** el estado de cada dato (glifo + nombre), la verificación, la completitud y el aviso «no subas listas de precios»; bilingüe ES/EN en las etiquetas; cada control con su etiqueta.
- **Verificado:** `npm run build` pasa (ruta dinámica); `next start` local: sin sesión → 307 al login con `?next=/comercial/perfil`. **No** se probó el guardado de punta a punta con una sesión real (sin `DATABASE_URL` ni Supabase Auth en la sesión): lo cubren 26 pruebas nuevas (parser, componente, acción del formulario con sesión simulada) y las 14 del servicio sobre PGlite.
- **Pendiente de esta pantalla:** mensajes de error por campo junto al control (hoy es un resumen arriba), carga de documentos que eleve un dato a «documentado», flujo de verificación y límite de tasa; selector de idioma (D13 acordó inglés mínimo solo en etiquetas).

## 11c — resultado (2026-11-09)
Prototipo `03-explorador.html` aprobado. **No toca `/licitaciones`**: página nueva, detrás de `CI_COMERCIAL_HABILITADO=1`, `noindex`, dinámica (lee `searchParams`).
- **Dos etapas:** convocatorias abiertas (`condicionAbierto()` reutilizada) y contratos en ejecución (regla de la vitrina: firmado desde 2026, sin cancelar, contratista **NIT**, por fechas). Filtros: tecnología, tipo (incluye familias), departamento (sede de la entidad) y paginación de 20. Parámetros validados contra listas cerradas; lo inválido se descarta.
- **Filtro de tecnología en dos pasos:** prefiltro SQL por los términos de la categoría (sin tildes, límite de palabra; una categoría raíz incluye a sus hijas) y después el **clasificador puro de CI-01** decide fila a fila (negaciones y contexto). Lo descartado no se muestra y **se cuenta** («N de esta página se ocultaron…»); por eso `total` es de coincidencias de texto. La tecnología se rotula «(AquaLicita)», con la cita en el `title`, y la página avisa que no es un dato oficial.
- **Pruebas (31 nuevas):** parámetros y patrón (puros), SQL sobre PGlite (universo de cada etapa, soft-delete, persona natural excluida, filtros, prefiltro con mayúsculas y sin tildes, negación, categoría raíz, paginación, página fuera de rango) y componente renderizado (etapa con glifo y nombre, avisos, formulario GET con etiquetas, paginación que conserva filtros, estado de error sin cifras simuladas). `npm run build` pasa; con la bandera apagada responde 404 y con parámetros maliciosos no falla.

### ⚠ Advertencia de rendimiento (medida en la base viva, solo lectura, 2026-11-09)
| Consulta | Tiempo | Plan |
|---|---|---|
| Abiertos (`condicionAbierto()`), sin filtro de texto | **3,35 s** | `Seq Scan` de `proceso` (94.940 filas) para devolver 137 |
| Abiertos + prefiltro de tecnología | 3,3–4,8 s | igual: la regex añade ≈1,5 s |
| Contratos en ejecución con NIT | **6,1 s** | bucle anidado sobre 8.758 proveedores NIT |

La base es lenta en cualquier recorrido de tabla y **no hay índice** para esas condiciones; no es un defecto del filtro de tecnología. El resto del sitio lo disimula con ISR (6 h). Mitigaciones **en el código**: una sola pasada por consulta (`count(*) over()` en vez de contar aparte), tope de 8 s por consulta (`statement_timeout`, el pool es de 3 conexiones) y caché de 10 minutos por combinación de filtros (`unstable_cache`; los errores no se guardan). Aun así **la primera visita a cada combinación tarda 3–6 s**, y si la base está cargada puede topar a los 8 s y mostrar «No pudimos consultar los registros».

**Solución real (requiere migración sobre la base viva, NO aplicada; pide autorización):**
```sql
CREATE INDEX CONCURRENTLY proceso_abiertos_idx ON proceso (fecha_recepcion)
  WHERE deleted_at IS NULL AND estado_apertura = 'Abierto';
CREATE INDEX CONCURRENTLY contrato_firma_idx ON contrato (fecha_firma)
  WHERE deleted_at IS NULL;
```
Ambos son parciales y pequeños (137 filas el primero). Beneficiarían también a la vitrina, al hero y a los agregados que hoy recorren `proceso` entero.
