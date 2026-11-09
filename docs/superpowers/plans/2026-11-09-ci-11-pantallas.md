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
| 11b | Perfil de empresa (`/comercial/perfil`) | `0027` aplicada (servicio y acciones ya existen) | Espera autorización de migración |
| 11c | Explorador de oportunidades | Filtro por tecnología (clasificador sobre `objeto`) y perfil | Espera 11b |
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
