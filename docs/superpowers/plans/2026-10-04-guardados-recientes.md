# AquaLicita — plan de Guardados y Recientes

> Para quien ejecute: usar `superpowers:executing-plans`, implementando las tareas en esta conversación; una revisión independiente al cierre. Pasos con casillas para registrar evidencia y commits.

**Objetivo:** conservar procesos elegidos explícitamente y las últimas diez fichas visitadas con cuenta gratuita, sin confundir guardar con recibir alertas.

**Arquitectura:** dos grupos de registros privados en la tabla existente `senal_usuario`, separados por prefijos versionados para guardados y visitas. No se crean tablas, columnas, índices ni migraciones. Servicio transaccional, rutas privadas con sesión y una interfaz compartida entre resultados, ficha y Mis procesos. El contenido de la ficha permanece estático; la personalización se solicita desde cliente.

**Tecnologías:** Next.js 14.2.3, React 18, Drizzle, PostgreSQL/Supabase y Vitest/PGlite; sin dependencias nuevas.

**Diseño aprobado:** `docs/superpowers/specs/2026-10-04-buscador-guiado-design.md`, apartado Mis procesos. Antecedente de implementación: `2026-10-04-buscador-guiado-seccion-2-traspaso.md`.

**Estado:** plan revisado tras la instrucción explícita del usuario «no quiero migraciones». Sin cambios de producto ni de base. Se elimina por completo la propuesta anterior de tablas nuevas; queda para revisión el uso de datos de cuenta existente, conforme a `docs/CONDUCTA.md` §4.

## Reconocimiento del repositorio

- No hay tabla de favoritos, guardados o historial de fichas del usuario. `coincidencia` registra matching; `senal_usuario` registra señales y cuota del extractor. Los registros personales se añadirán con prefijos nuevos, sin reinterpretar sus señales actuales.
- `al_filtros_usuario` guarda criterios de alerta; se conserva intacta.
- `usuario.id` refleja Supabase Auth. `getSessionUser()` verifica la sesión; `nivelDe()` y `puede()` son la política central.
- Login, registro, Google y verificación por correo ya transportan `next`. Se reutiliza ese retorno sin guardar desde el callback de autenticación.
- La ficha en `app/licitaciones/[slug]/page.tsx` tiene ISR de 43.200 segundos. No consultar cookies ni datos privados durante su render.
- `FormCerrarSesion` y `/logout` borran almacenamiento del navegador y vuelven a `/`. Esta función no crea nuevas copias persistentes allí.
- Drizzle y sus migraciones se conservan exactamente como están. No ejecutar generación, push ni aplicación de migraciones.
- `senal_usuario` ya tiene RLS, FK de borrado en cascada e índice por `usuario_id`. No tiene `account_id`: para respetar la instrucción del usuario, este módulo personal filtra por el `usuario_id` existente derivado de sesión. Es una excepción documentada a R8 del SDD para esta reutilización, sin equipos ni cambio de esquema.

## Restricciones globales

- Guardar exige cuenta gratuita y confirmación del servidor; abrir una ficha no la guarda.
- Recientes son diez fichas distintas, ordenadas por última visita; borrar recientes no borra guardados.
- Guardados conserva procesos cerrados, y procesos no disponibles que se pueden quitar.
- No crear suscripciones ni prometer correos o seguimiento de cambios.
- No crear tablas, columnas, índices, restricciones ni políticas. Reutilizar la RLS existente de `senal_usuario`.
- Ninguna petición acepta un usuario o cuenta elegido por el cliente.
- Respuestas personales: `Cache-Control: private, no-store`; sin caché pública de cuenta.
- No usar localStorage, sessionStorage, cookies nuevas de negocio ni APIs de SECOP en vivo.
- Mantener paleta, Inter, mapa, cinco tipos de proyecto y búsqueda pública.
- La ejecución termina con código comprobado localmente, sin DDL. Desplegar sigue siendo un paso posterior; no requiere una migración para esta función.

## Cinco focos de revisión

1. Cambio de cuenta, salida o respuesta tardía: nunca presentar listas ni confirmaciones de otra sesión; tareas 2 y 4.
2. Dos visitas simultáneas al llegar a diez: conservar exactamente diez fichas y la última visita; tarea 1.
3. Doble clic o respuesta perdida al guardar/quitar: operaciones idempotentes, sin duplicar ni fingir éxito; tareas 1, 2 y 3.
4. Confirmación de correo o Google tras Guardar anónimo: conservar una intención, pedir confirmación al volver y no guardar automáticamente; tarea 3.
5. Proceso cerrado, eliminado o retirado entre lectura y clic: estado actual visible, retirada distinguida de fallo de servicio, y quitar siempre permitido; tareas 1 y 4.

## Contratos compartidos

Crear `src/lib/mis-procesos/types.ts`:

```ts
export interface CuentaProcesos { usuarioId: string }
export interface ProcesoPersonal {
  procesoId: string; // identificador nativo, no UUID interno
  objeto: string | null;
  entidad: string | null;
  referencia: string | null;
  estadoApertura: string | null;
  valorEstimado: string | null;
  disponible: boolean;
  guardado: boolean;
  fecha: string; // ISO: guardado o última visita según lista
}
export interface ListasProcesos {
  guardados: ProcesoPersonal[];
  recientes: ProcesoPersonal[];
  pagina: number;
  totalGuardados: number;
}
```

`CuentaProcesos` se construye únicamente después de verificar sesión: `usuarioId = user.id`. No introducir equipos, identificadores de cuenta del cliente ni resolución de planes pro.

Servicio en `src/lib/mis-procesos/store.ts`:

```ts
guardarProceso(cuenta: CuentaProcesos, procesoId: string): Promise<void>
quitarProceso(usuarioId: string, procesoId: string): Promise<void>
registrarVisita(cuenta: CuentaProcesos, procesoId: string): Promise<void>
borrarRecientes(usuarioId: string): Promise<void>
listarMisProcesos(usuarioId: string, pagina: number): Promise<ListasProcesos>
estadoGuardados(usuarioId: string, ids: string[]): Promise<string[]>
```

Validar identificadores completos como `CO1.REQ.<dígitos>`; normalizar mayúsculas y limitar a 32 caracteres. No aceptar slugs, referencias o entradas parciales como clave. Página positiva, máximo 1.000.000; 25 guardados por página, recientes siempre máximo diez. La consulta de estado admite hasta 25 identificadores distintos; resultados del explorador con más filas dividen en lotes.

Helper de tarea 3: `retornoDeGuardado(procesoId: string, volver: string): string` devuelve `/mis-procesos?guardar=ID&volver=RUTA` con codificación segura. El servicio usa errores tipados `ProcesoNoDisponibleError` y `ConsultaPersonalInvalidaError`; tarea 2 los convierte en 404 y 400. Cualquier otro error produce 503 y registro de servidor sin exponer detalles.

## Tarea 1 — Persistencia de listas personales

**Crear:** `src/lib/mis-procesos/types.ts`, `src/lib/mis-procesos/store.ts`, `src/__tests__/mis-procesos/store.db.test.ts`.
**Documentar:** contrato de reutilización en `CLAUDE.md`; no modificar archivos del esquema, el esqueleto ni `drizzle/`.

**Consume:** tablas reales `usuario`, `proceso`, `entidad`; patrón PGlite de `src/__tests__/pliego/cuota.db.test.ts`.
**Produce:** los seis métodos y contratos anteriores.

- [ ] Escribir pruebas antes de implementar: guardar dos veces deja una fila; quitar dos veces es correcto; A no puede listar/quitar datos de B; visita repetida reordena sin duplicar; once visitas conservan diez; borrar visitas conserva guardados; borrar usuario elimina ambas relaciones; proceso retirado aparece no disponible y se puede quitar.

```ts
await guardarProceso(A, "CO1.REQ.1");
await guardarProceso(A, "CO1.REQ.1");
expect((await listarMisProcesos(A.usuarioId, 1)).totalGuardados).toBe(1);
await quitarProceso(B.usuarioId, "CO1.REQ.1");
expect((await listarMisProcesos(A.usuarioId, 1)).guardados).toHaveLength(1);
```

- [ ] Ejecutar `npx vitest run src/__tests__/mis-procesos/store.db.test.ts` y registrar RED.
- [ ] Declarar constantes versionadas: `personal:guardado:v1:` y `personal:visita:v1:`. La señal es el prefijo seguido del id SECOP validado; `creado_en` representa fecha de guardado o última visita según prefijo. La cuota usa igualdad exacta con `uso:extractor_pliego`, por lo que estas filas no consumen cuota. No llamar `recordUserSignal` para estado personal: ese helper oculta errores y no permite garantizar guardado confirmado.
- [ ] Usar las migraciones **existentes** para inicializar PGlite de pruebas, sin generarlas ni aplicarlas a Supabase viva. Probar RLS existente, cascada y que no aparecen nuevas tablas.
- [ ] Toda mutación personal bloquea la fila del usuario en una transacción. Sin UNIQUE nuevo, el bloqueo por usuario serializa comprobar/inserir y garantiza una fila por prefijo/id para todos los escritores de este módulo. Si falta la fila del usuario, fallar sin escribir; el login existente es responsable de sincronizarla.
- [ ] Guardar valida proceso activo, busca señal exacta y solo inserta si falta; guardar repetido conserva fecha. Quitar elimina todas las filas del prefijo/id de ese usuario y acepta ausencia, incluso si se retiró el proceso. Lecturas se agrupan por id para tolerar duplicados externos y usan LEFT JOIN con el proceso actual: ausencia o `deleted_at` implica `disponible=false`.
- [ ] Visitar elimina la señal exacta anterior e inserta una nueva con hora de base tras obtener el bloqueo. Poda solo señales de visitas de ese usuario, ordenadas por fecha e id, hasta diez. No usar timestamps del navegador ni borrar registros de guardados/cuota/intención.

```sql
SELECT id FROM usuario WHERE id = $usuarioId FOR UPDATE;
-- Parámetros construidos en servidor, usando siempre la misma transacción.
DELETE FROM senal_usuario
WHERE usuario_id = $usuarioId AND senal = $senalVisita;
INSERT INTO senal_usuario (usuario_id, senal, creado_en)
VALUES ($usuarioId, $senalVisita, clock_timestamp());
DELETE FROM senal_usuario
WHERE usuario_id = $usuarioId AND senal LIKE 'personal:visita:v1:%'
AND id NOT IN (
  SELECT id FROM senal_usuario
  WHERE usuario_id = $usuarioId AND senal LIKE 'personal:visita:v1:%'
  ORDER BY creado_en DESC, senal ASC, id ASC LIMIT 10
);
```

- [ ] Borrar recientes toma el mismo bloqueo y elimina exclusivamente `personal:visita:v1:%` de ese usuario. Una visita completada después puede crear un nuevo reciente. Quitar guardado utiliza igualdad exacta, no un prefijo suministrado por el cliente.
- [ ] Sembrar señales de intención y `uso:extractor_pliego` junto a once visitas y dos guardados; demostrar que ambas permanecen sin cambios y que el extractor conserva su cuota de cinco. Añadir visitas simultáneas y guardado duplicado; documentar que PGlite serializa conexiones y no sustituye prueba multi-conexión de PostgreSQL en staging.
- [ ] Documentar que los prefijos `personal:*` no son señales analíticas y deben excluirse de cualquier análisis futuro de intención. Guardados permanece entre dispositivos con cuenta; no introducir persistencia en el navegador como reemplazo.
- [ ] Verificar GREEN y suite completa. Commit: `feat: persistir procesos guardados y visitas por cuenta`.

## Tarea 2 — Acceso privado y operaciones idempotentes

**Crear:** `src/lib/mis-procesos/validacion.ts`, `src/lib/mis-procesos/acceso.ts`, `app/api/mis-procesos/route.ts`, `app/api/mis-procesos/guardados/[id]/route.ts`, `app/api/mis-procesos/visitas/[id]/route.ts`, `app/api/mis-procesos/recientes/route.ts`, `src/__tests__/mis-procesos/api.test.ts`.
**Modificar:** `src/lib/acceso/politica.ts`, `src/__tests__/acceso/politica.test.ts`.

**Consume:** servicio de tarea 1, `getSessionUser`, `nivelDe`, `puede`.
**Produce:** respuestas privadas con cuenta siempre derivada de sesión.

- [ ] Pruebas RED: anónimo 401 sin consultar base; cuenta gratis permitida; usuario/cuenta de body o query ignorados como autorización; origen externo de mutación 403; id inválido 400; no disponible 404 para nuevo guardado/visita; quitar ausente 200; fallo de base 503 sin datos parciales ni detalle interno.
- [ ] Declarar `procesos_guardar` y `procesos_recientes` como gratis y agregarlos al grupo de cuenta en el test exhaustivo de política.
- [ ] Implementar contrato HTTP:

```text
GET    /api/mis-procesos?page=1           -> 200 ListasProcesos
GET    /api/mis-procesos?ids=ID1,ID2      -> 200 { guardados: string[] }
PUT    /api/mis-procesos/guardados/ID     -> 200 { guardado: true }
DELETE /api/mis-procesos/guardados/ID     -> 200 { guardado: false }
POST   /api/mis-procesos/visitas/ID       -> 200 { registrado: true }
DELETE /api/mis-procesos/recientes        -> 200 { borrados: true }
```

- [ ] Todas las respuestas, incluidos errores, llevan `private, no-store`. Las mutaciones comprueban Origin contra el origen de la petición y el origen canónico de la aplicación; no admitir un origen externo ni Origin ausente para estas llamadas de navegador. No añadir CORS permisivo.
- [ ] Ejecutar pruebas focalizadas y suite completa; commit `feat: exponer listas personales con acceso privado`.

## Tarea 3 — Guardar en resultados y ficha, con retorno de cuenta

**Crear:** `src/components/mis-procesos/BotonGuardar.tsx`, `src/components/mis-procesos/ProcesosCuenta.tsx`, `src/components/mis-procesos/RegistroVisita.tsx`, `src/components/mis-procesos/mis-procesos.module.css`, `src/lib/mis-procesos/retorno.ts`, `src/__tests__/mis-procesos/retorno.test.ts`, `src/__tests__/mis-procesos/estado-cliente.test.ts`.
**Modificar:** `ResultadosBusquedaServidor.tsx`, `BuscadorGuiado.tsx`, `app/licitaciones/[slug]/page.tsx`.

**Consume:** API de tarea 2; ids nativos de resultados/ficha; `slugDeProceso` existente.
**Produce:** botón reutilizable y registro efectivo de visita, sin transformar la ficha en ruta dinámica.

- [ ] Tests RED para generación de retorno interno, confirmación obligatoria, fallo de guardado sin éxito visual y respuesta obsoleta tras invalidar sesión.

```ts
const retorno = retornoDeGuardado("CO1.REQ.42", "/licitaciones/explorar?modo=tema&sistema=ptar");
expect(retorno.startsWith("/mis-procesos?")).toBe(true);
expect(retorno).toContain("guardar=CO1.REQ.42");
// El retorno transporta intención; nunca llama guardarProceso por montar.
```

- [ ] Agrupar lectura privada de estado por los ids visibles, en vez de una consulta por botón. No incrustar `guardado` en `/api/secop` ni en ISR. Botón desactivado durante mutación; actualizar estado solo tras 200 confirmado; fallo conserva estado anterior y muestra Reintentar.
- [ ] Anónimo: ofrecer Entrar/Crear cuenta con `next=/mis-procesos?guardar=ID&volver=RUTA_INTERNA`. Construir URL con URLSearchParams; validar retorno con origen interno y fallback `/mis-procesos`. No aceptar `//`, barras invertidas, protocolos ni caracteres de control. Preservar criterios de búsqueda válidos como ruta de regreso.
- [ ] Cuenta autenticada que llega con intención: mostrar objeto/id y botón «Confirmar guardado», junto a Cancelar y Volver. Solo el clic confirma; recargar, precargar o abrir un enlace no guarda. Login, registro y callback existentes conservan `next` sin cambios en su protocolo.
- [ ] Al montar la ficha visible en cliente, registrar visita con POST. No hacerlo desde servidor ni por precarga. Si `document.visibilityState` no es visible, esperar `visibilitychange`; una única visita por montaje. Fallo se registra y no bloquea ficha; 401 se trata como visitante.
- [ ] Preservar formularios GET de búsqueda, HTML público y enlaces a fichas. Guardar y Recientes necesitan JS en la ficha/hero; ofrecer enlace `/mis-procesos` con formulario de acción en servidor allí como alternativa funcional sin JS. La confirmación de intención no depende de JS.
- [ ] Medir colores reales claro/oscuro, teclado y avisos `aria-live`; pruebas GREEN y suite completa. Commit `feat: guardar desde resultados y registrar visitas de ficha`.

## Tarea 4 — Mis procesos completo

**Crear:** `app/mis-procesos/page.tsx`, `src/components/mis-procesos/ListasMisProcesos.tsx`, `src/lib/mis-procesos/actions.ts`, `src/__tests__/mis-procesos/listas.test.tsx`, `src/__tests__/mis-procesos/actions.test.ts`.
**Modificar:** `middleware.ts`, `src/components/landing/seccionesHome.js`, `BuscadorGuiado.tsx`, su CSS y `FormCerrarSesion.tsx` si se necesita emitir invalidación antes del envío.

**Consume:** listas, capacidades, operaciones, botón e intención de tareas 1–3.
**Produce:** tercera entrada Mis procesos, página privada con listas separadas y acciones también sin JS.

- [ ] Pruebas RED de dos listas distintas, presupuesto ausente sin $0, cerrado visible, retirado sin enlace activo y con Quitar, vacío distinto de servicio caído, paginación de guardados y diez recientes máximo. Acción Quitar de A no borra B; Borrar recientes no llama al servicio de guardados.
- [ ] Añadir `/mis-procesos` a prefijos protegidos; las APIs se quedan fuera del redirect de middleware y responden 401. Página dinámica con sesión/capacidad propia, no solo middleware.
- [ ] Añadir Mis procesos al menú de cuenta y como tercera entrada del buscador: enlace a la página privada, conservando borradores de tema/número hasta navegar. Sin nuevas secciones de portada.
- [ ] Página muestra Guardados y Recientes por separado; cada fila lleva referencia e identificador, entidad, apertura y presupuesto real. Enlace a ficha solo si disponible. Guardados ordenado por fecha de guardado, 25 por página; Recientes por última visita, diez. Borrar recientes requiere confirmación breve junto al botón y no promete borrar datos del proceso.
- [ ] Acciones de servidor para Guardar/Quitar/Borrar reciben FormData, verifican sesión y política, validan id/retorno, ejecutan servicio y revalidan únicamente `/mis-procesos`. Nunca retornar datos personales en redirecciones ni interpretar un GET como mutación.
- [ ] Efectos cliente usan contador y AbortController. Invalidar estado al logout, 401, cambio de identidad y `pageshow` con página restaurada. Al `pagehide` ocultar sincrónicamente el contenedor personal para que una restauración de caché no muestre su imagen anterior; al regresar, mantenerlo oculto hasta revalidar sesión. No reutilizar una lista de la cuenta anterior ni crear caché persistente. Comprobar también el recorrido sin JavaScript usando respuestas privadas del servidor, sin afirmar que sus controles dependen del cliente.
- [ ] Verificación de dos cuentas con dobles de sesión en pruebas y UI: salir limpia listas y botones, entrar como B muestra solo B. Revalidación antes de confirmar intención impide guardar en una sesión que ya expiró.
- [ ] Ejecutar GREEN y suite; commit `feat: añadir mis procesos con guardados y recientes separados`.

## Tarea 5 — Cierre completo, sin migraciones ni despliegue

**Modificar:** `CLAUDE.md`/`AGENTS.md` enlazado, plan y traspaso de esta sección; graphify. Registrar hallazgos menores en `PENDIENTES.md`.

- [ ] Pruebas completas con las migraciones existentes en PGlite; revisión manual de cada WHERE de cuenta y de la seguridad de retorno. No crear cuentas reales ni usar credenciales del usuario para la QA sin su autorización.
- [ ] Navegador local con datos de prueba: Guardar, Quitar, Guardar doble, anónimo → login/registro → Confirmar, proceso cerrado/retirado, once visitas, Borrar recientes, expiración, error de red, dos cuentas, Atrás tras logout y móvil. Documentar claramente qué se verificó con dobles y qué requiere entorno de prueba con Auth real.
- [ ] Preview parado: `npm test`, `npm run build`, `npm run lint`, Prettier sobre código compatible y `npm run presupuesto`. JS de portada ≤125 KiB gzip; fuentes ≤100 KiB. Si el nuevo módulo supera presupuesto, cargar personalización bajo demanda, sin retirar funcionalidad.
- [ ] `graphify update .`; revisión independiente única del conjunto por el skill de ejecución. Corregir hallazgos importantes con RED→GREEN y suite posterior.
- [ ] Guardar commits y traspaso con prefijos personales, transacciones, comandos de verificación, alcance y limitaciones. Verificar diff: cero cambios en esquema y en `drizzle/`. Preparar integración por PR a main cuando se autorice publicar; no duplicar PR106, ya fusionado por squash.
- [ ] Detenerse al final de esta sección, antes de desplegar. La tabla necesaria ya existe en Supabase; no aplicar migraciones ni afirmar que la función está publicada hasta el despliegue autorizado.

## Revisión del plan

Cobertura: guardado explícito y retorno (tarea 3); listas persistentes, cerrados/retirados e idempotencia (1/2/4); recientes y borrado independiente (1/3/4); aislamiento y logout (2/4); errores y accesibilidad (3/4/5); conservación del buscador/mapa/ISR (3/5). Todos los focos anteriores tienen pruebas asignadas. Se reutilizan login, callback, política, slug, la tabla `senal_usuario` y los patrones de base existentes. Revisión adicional: ningún DELETE personal puede borrar intención o uso del extractor; todos incluyen usuario autenticado y prefijo/clave exacta definidos por servidor. No hay cambios de esquema.

Este plan no incluye corregir los dos menores diferidos de sección 2: referencia/id en la búsqueda y mensaje de página fuera de rango. Las filas nuevas de Mis procesos sí incluyen ambos identificadores, como exige su contrato.
