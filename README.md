# AquaLicita

Inteligencia de contratación pública de agua y saneamiento en Colombia, basada en SECOP II. El recorrido principal va de la búsqueda territorial a la ficha de un proceso y su veredicto de elegibilidad. El análisis del pliego y las alertas dependen de los datos y servicios disponibles.

## Desarrollo local

Requisitos: Node.js 20 o 22, npm y acceso a las variables necesarias para la funcionalidad que se vaya a probar.

```bash
npm install
cp .env.example .env.local
npm run dev
```

La aplicación se abre en http://localhost:3000. Configura `DATABASE_URL` para las consultas a Postgres y `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Supabase Auth. `GEMINI_API_KEY` es necesaria para el extractor de pliegos. El correo requiere además las variables de Resend descritas en `.env.example`. Nunca copies claves reales al repositorio.

## Arquitectura actual

| Capa | Implementación |
| --- | --- |
| Aplicación | Next.js 14, React 18, TypeScript |
| Datos | PostgreSQL en Supabase, Drizzle ORM; el cliente usa `@neondatabase/serverless` como driver sobre `DATABASE_URL`, o `pg` con `DB_DRIVER=node` |
| Autenticación | Supabase Auth (`@supabase/ssr`) |
| Extracción de pliegos | Reglas y Gemini |
| Correo | Resend; puesta en marcha documentada en `docs/runbook-correo-y-alertas.md` |
| Pruebas y despliegue | Vitest, Vercel |

El pipeline de SECOP alimenta la clasificación, la ficha, las compuertas de elegibilidad y las vistas territoriales. El mapa de la portada se renderiza en el servidor. Para las decisiones de producto y seguridad vigentes consulta `CLAUDE.md`; `docs/CONDUCTA.md` establece el flujo de cambios.

## Comandos

```bash
npm test
npm run lint
npm run build
npm run db:ingest
npm run db:transform
npm run db:seed-geografia
npm run analyze-pliego-hybrid
```

`npm run db:migrate` modifica el esquema de la base indicada en `DATABASE_URL`: verifica el destino antes de ejecutarlo.

## Seguridad y operación

Las tablas públicas de la aplicación tienen RLS activado. Las consultas de datos de la aplicación usan Drizzle y conexión directa a Postgres; el aislamiento entre cuentas en esas consultas exige filtrar por usuario. Las rutas cron requieren `CRON_SECRET` y fallan con 401 si no está configurado. La programación actual y las tareas pendientes de correo están en `vercel.json`, `PENDIENTES.md` y `docs/runbook-correo-y-alertas.md`.

## Documentación

- `CLAUDE.md`: decisiones vigentes del dominio, arquitectura y seguridad.
- `PENDIENTES.md`: problemas abiertos y referencias históricas.
- `docs/CONDUCTA.md`: reglas de contribución y revisión.
- `docs/adr/` y `docs/superpowers/`: decisiones y especificaciones; comprueba fecha y estado antes de implementarlas.
