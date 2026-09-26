# AquaLicita — inspección y primera etapa

Fecha: 2026-09-24. Alcance autorizado: presentación de la landing; primera etapa Hero/KPIs.

## Base y aislamiento

- Repositorio: https://github.com/Lucesdata/hydrostack_agent
- Clon local aislado: `work/hydrostack_agent`; checkout inicial limpio en `main`, siguiendo `origin/main`.
- Base: `216c97cadb5797dc9f9c314980724a7f837b9b4f`, merge del PR #50 del mapa coroplético.
- GitHub confirma `lint`, `test (20.x)`, `test (22.x)` y estado Vercel satisfactorios para esa base. El job llamado `lint` ejecuta Prettier y build, no `npm run lint`.
- Rama local: `codex/landing-hero-kpis`.
- No se modifica la rama principal, no se despliega ni se ejecutan migraciones, ingesta o envíos.

## Inventario previo a la edición

Inspección de la estructura completa y lectura dirigida de la landing, instrucciones, datos, tests y despliegue. No es una auditoría línea por línea del backend.

| Área | Archivos / directorios | Hallazgo |
| --- | --- | --- |
| Framework | `package.json`, `package-lock.json`, `next.config.js`, `tsconfig.json` | Next.js 14.2.3, React 18, App Router, JS/JSX y TypeScript. npm con lockfile. |
| Estructura | `app/`, `src/`, `data/`, `drizzle/`, `scripts/`, `docs/`, `public/`, `samples/`, `loops/` | 73 archivos de app, 329 de src, 94 de docs, 51 de drizzle y 41 scripts registrados en Git. |
| Entrada | `app/page.js` | Página de servidor; ISR de seis horas; consulta agregados existentes y entrega el mapa como prop. Degrada si no hay base. |
| Hero | `src/components/landing/PortadaCliente.jsx` | Componente cliente con CSS local, titular, CTA, dos grupos de cifras y mapa recibido del servidor. Único archivo de producción a modificar. |
| Otras secciones | `ProcesosTicker.jsx`, `S3Motor.jsx`, `S2Diagnostico.jsx`, `S7Acceso.jsx`, `S5DarkClosing.jsx`, `S6Footer.jsx` | Ticker, cómo funciona, diagnóstico, acceso, cierre y pie existentes. Permanecen intactos. |
| Navegación | `src/components/landing/seccionesHome.js`, `src/components/Navbar*` | Rutas y etiquetas de acceso centralizadas; conservar destinos. |
| Estilos | `app/globals.css`, CSS de `PortadaCliente.jsx` | Paleta y alias existentes; conservar `--bg`, `--accent`, tokens semánticos y reducción de movimiento. |
| Fuentes | `app/layout.js` | Cinco familias mediante `next/font/google`; dependencia de red durante build. No añadir fuentes. |
| Mapa | `src/components/mapa/`, `data/geo/`, `src/lib/secop/agregados.ts` | SVG generado en servidor, facetas departamentales existentes. Conservar posición e implementación en etapa 1. |
| KPIs | `app/api/landing-stats/route.ts` | Fetch ya existente, resultados parciales con null y caché de 30 minutos. No modificar API. |
| Conteo vigilado | `src/lib/landing/cifras.ts` | Conteo de procesos ingeridos desde Postgres; no equivale a abiertos/activos. |
| Nuevos y valor | `src/lib/secop/landingStats.ts` | Consultas históricamente conectadas a Socrata: nuevos abiertos en presentación de oferta en 7 días; suma de precio base de abiertos publicados este mes. Reutilizar sin cambiar lógica. |
| Formatos | `src/components/secop/format.ts` | `formatConteo`, `formatCopCompact`; null → raya. No cambiar formatos globales. |
| Tests | `src/__tests__/`, `vitest.config.ts` | Vitest, entorno Node; pruebas de render de portada, cifras, API, mapa, enlaces, contraste y lógica del producto. |
| CI | `.github/workflows/test.yml`, `.github/workflows/lint.yml` | Tests con cobertura en Node 20/22; formato y build en Node 20. Push directo a `codex/**` no dispara estos workflows; un PR contra main sí. |
| Despliegue | `vercel.json`, `.vercelignore`, `next.config.js` | Vercel y cron `/api/cron/tick`; main despliega según reglas del repo. Build omite el gate de ESLint: hay que ejecutar lint por separado. |
| Zonas excluidas | `src/lib/`, `app/api/`, `middleware.ts`, `drizzle/`, rutas internas | Sin cambios de backend, auth, datos, SECOP, dashboard o negocio. |

## Riesgos y decisiones

1. No mostrar cifras, porcentajes o series del mockup como datos reales. No existe serie histórica para dibujar tendencias.
2. Conservar las definiciones distintas de los tres KPIs. Aclarar que el importe es COP y corresponde a publicados este mes; no llamarlo valor contratado.
3. Mantener la degradación a «—» ante carga o falta de datos. El cero debe seguir siendo cero.
4. Acotar CSS al Hero. No modificar tokens globales ni tipografías.
5. Mantener mapa, rutas, ISR y límite servidor/cliente. Mover el mapa sería etapa 2.
6. Documentación antigua de traspaso contiene estado desactualizado: el mapa y cron ya existen. La inspección del código prevalece.
7. Probar sin credenciales de producción. Errores de datos no disponibles se registran como limitación, no se arreglan fuera de alcance.
8. El entorno local tiene Node 24.19.0; CI valida Node 20/22. Registrar diferencias si aparecen.
9. El mockup recuperado inspira la jerarquía del bloque de mercado; las imágenes disponibles no representan una especificación exacta de toda la portada.

## Etapas

1. **Hero/KPIs, esta entrega:** titular de exploración, descripción breve, CTA existente antes de métricas y banda de tres cifras reales; reutilizar estilos, fuentes y fetch. Mantener mapa y demás secciones. Verificar antes/después y revisar escritorio/móvil.
2. **Territorial:** separar la sección del mapa, preservando SVG, agregados y facetas. Definir interacción solo con datos existentes.
3. **Cómo funciona:** adaptar el componente actual al recorrido Explora → Encuentra → Entiende → Sigue.
4. **Ficha Viva:** presentación de la ficha y evolución; comprobar campos disponibles antes de prometer contenido.
5. **Cambios:** mostrar únicamente eventos disponibles; una demostración, si fuese necesaria, debe identificarse como tal.
6. **CTA final:** ajustar el cierre existente y sus rutas.

Cada etapa se revisa por separado y se puede revertir independientemente.

## Verificación prevista

- `npm run lint`.
- `npx --no-install tsc --noEmit` (no hay script typecheck).
- `npm test`.
- `npm run build`, con preview detenido.
- Prettier disponible: comprobar formato de src/app y archivos modificados, sin reformatear archivos ajenos.
- Revisión visual de tamaños de pantalla, CTA y datos ausentes; comparación de JS de primera carga si build está disponible.

## Reversión

- Antes de integrar: cerrar el PR o seguir usando main; producción permanece igual.
- Después de integrar: crear rama de reversión desde main y ejecutar `git revert <commit-del-hero>`, pasar verificaciones y abrir PR. No usar reset ni force push.
- Para reproducir la base en otra copia: `git worktree add --detach ../aqualicita-base 216c97cadb5797dc9f9c314980724a7f837b9b4f`.
- Los commits de documentación y presentación se separarán. El hash final de implementación y los resultados se anotarán al terminar.


## Resultado de la etapa 1

Implementación: `ae5e20cb62777db3b32d8be874a2de7a18b3e744`.

Solo cambia `src/components/landing/PortadaCliente.jsx` en producción:
- Titular «Explora el mercado de agua. Entiende cada proceso.» y descripción breve.
- CTA y enlaces existentes, ahora antes de las cifras.
- Tres KPIs en una banda semántica (`dl/dt/dd`), en columnas en escritorio y filas en móvil.
- Se retiran del Hero las cifras de oferentes y sanciones, las credenciales «11 años»/«Diaria» y la línea decorativa. No se retiran datos del backend ni se modifican otras secciones.
- Definiciones visibles de cada métrica, COP explícito y raya para datos no disponibles.
- CSS local con tokens existentes; mismos fetch, estados, formatos, animaciones y soporte de movimiento reducido.
- Sin dependencias nuevas ni modificaciones de lockfile.

| Verificación | Antes | Después |
| --- | --- | --- |
| Tests | 120 archivos / 1.031 tests pasan | 120 archivos / 1.031 tests pasan |
| Typecheck (`tsc --noEmit`) | Pasa | Pasa |
| Lint | Pasa con 5 advertencias | Pasa con las mismas 5 advertencias |
| Build | Pasa con acceso a fuentes | Pasa con acceso a fuentes |
| First Load JS `/` | 107 kB | 107 kB |
| JS propio de `/` | 13 kB | 12,9 kB |
| Prettier 3.8.1 src/app | 5 archivos preexistentes fallan | Los mismos 5 archivos fallan |
| Archivo modificado | — | Formato correcto; diff sin errores |

Advertencias de lint: Navbar (img), DiagnosticoApp (dos dependencias de hooks), PlantaHero (img), SmartCollections (aria-pressed). Sin diferencias antes/después.

Archivos con formato previo incompatible con Prettier 3.8.1: `src/lib/pliego/rules/parseFormulario1.ts`, `src/lib/secop/ficha-card.ts`, `src/lib/secop/pliego-upload.ts`, `src/lib/secop/verdict-publico.ts`, `src/lib/signals/record-signal.ts`. No se reformatean por estar fuera de alcance. La CI no fija versión de Prettier.

Verificación visual: 320, 375, 768, 1024 y 1366 px, sin desbordamiento de página ni de las tarjetas. CTA visible en el primer viewport móvil (375×812, termina aproximadamente en y=497). Destinos conservados `/licitaciones` y `/diagnostico`, recorrido por teclado comprobado entre ambos. Capturas antes/después en outputs.

Limitaciones: no hay credenciales de Postgres en el clon. El build registra fallos esperados de consultas y sirve el fallback; mapa gris y conteo vigilado «—». En navegador, las dos métricas de Socrata cargaron datos. No se ha validado visualmente un mapa poblado ni el conteo de Postgres en un entorno con credenciales. Tampoco se ha realizado auditoría Lighthouse. No se ejecutan ingestas, migraciones o escrituras de negocio.

`graphify update .` completado; archivos generados ignorados por Git. No se agregan tests de copy/CSS; se ejecutó la suite existente y se revisó en navegador el cambio puramente visual.

Reversión exacta de presentación: `git revert ae5e20cb62777db3b32d8be874a2de7a18b3e744` en una rama y PR. La documentación tiene commit separado.

Pendiente antes de etapa 2: revisar esta propuesta visual, validar en preview con configuración real y resolver cualquier check de CI que bloquee la integración. El mapa permanece en el Hero hasta una modificación independiente. No hacer merge automáticamente.
