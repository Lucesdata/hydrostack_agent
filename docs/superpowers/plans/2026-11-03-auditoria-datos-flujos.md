# Auditoría de datos y flujos — plan de corrección

**Objetivo:** ejecutar la auditoría solicitada el 3 de noviembre de 2026 en una rama y PR, sin merge ni despliegue.
**Arquitectura:** conservar las tablas, la separación de sesiones y la definición DATE de recepción. Corregir resolución y consumo de datos existentes; no inferir sede desde el objeto ni ejecutar reparaciones en producción.
**Tecnología:** Next.js 14, Drizzle, PostgreSQL/PGlite, Vitest.
**Autorización:** petición expresa de ejecutar correcciones, pruebas y PR. Ejecución en esta sesión.

1. Geografía (`transform/writers.ts`, `mapCanonical.ts`, `orchestrator.ts`): prueba roja de homónimos y sede distinta de ejecución; resolver por departamento y municipio, impedir que un contrato cambie la sede sin datos de entidad. Preservar sede conocida cuando falte evidencia. Documentar reparación histórica pendiente.
2. Guardados (`mis-procesos/validacion.ts`): reproducir rechazo NTC en API/almacén real; aceptar REQ y NTC, mantener identidad de sesión y aislamiento. Probar RLS con rol sin privilegios; no abrir políticas públicas para ocultar fallos.
3. SECOP (`datos-decision.ts`, consumidores): probar rechazo de dominios falsos, credenciales y protocolos; permitir dominio oficial HTTPS. Búsqueda NTC por URL oficial almacenada, sin convertirlo numéricamente a REQ; prueba SQL real con IDs distintos.
4. Fechas/estados: pruebas con reloj fijo de vencimiento y actualización de cierre, y contradicciones oficiales; no inventar hora ni adenda. Solo corregir fallos reproducidos.
5. Ejecutar suite completa, lint, tipos, build y formato. Documentar fallos y límites sin credenciales. Revisar diff, commit, publicar rama y PR para revisión.

Revisión: homónimos con departamento desconocido; NTC sin URL oficial; páginas anónimas; roles RLS sin bypass; datos históricos sin payload (no se reparan con un transform vacío).
