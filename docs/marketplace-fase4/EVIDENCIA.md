# Marketplace híbrido · Fase 4 — evidencia de implementación

Rama `claude/marketplace-fase4`, desde `origin/main` (`2e1413d`). Ruta de revisión
**`/marketplace`** con `noindex`; no sustituye la portada ni la vitrina. Paquete de
traspaso (SPEC, inventario, licencias, manifiesto, boceto) en esta carpeta.

## Qué se construyó

| Pieza | Dónde |
|---|---|
| Ruta (Server Component, `force-dynamic`, canoniza la URL) | `app/marketplace/page.tsx` |
| Consulta única por petición, mismo predicado que la vitrina | `src/lib/marketplace/consulta.ts` |
| DTO y adaptador (cuantía decimal en texto, el 0 es hueco, enlace SECOP validado) | `tipos.ts`, `adaptador.ts` |
| Familias, ilustraciones, URL y territorios | `familias.ts`, `url.ts`, `territorios.ts` |
| Geometría 3D pura (misma proyección que el 2D, DIVIPOLA como cadena) | `geometria3d.ts` |
| Hero, buscador GET, familias, indicadores, territorio, tarjetas, carrusel manual | `src/components/marketplace/` |
| Escena Three.js directa, diferida y sin SSR | `Escena3D.tsx`, `EscenaTerritorial.tsx` |
| Alternativa 2D de servidor (mismo modelo `construirModeloMapa`) | `Mapa2D.tsx` |

Cambios fuera de la carpeta nueva: `condicionesDeFiltros` pasa a exportarse en
`vitrina.ts` (para que lista, mapa e indicadores usen **el mismo** predicado);
`Navbar.js` pone la barra oscura también en `/marketplace`; `three@0.187.0` y
`@types/three@0.187.0` (versiones exactas). Sin migraciones ni cambios de esquema.

## Decisiones donde el SPEC dejaba margen

- **Un solo buscador, el de la vitrina.** El formulario envía `q`, `numero`, `tipo`,
  `departamento`, `presupuesto` y `orden`; la URL es el estado. Un id de SECOP
  pegado en el campo principal (`CO1.REQ.…`) se busca como número, que además
  alcanza a los cerrados. «Redes y alcantarillado» ya era `tipo=redes` (2026-10-07):
  no se introdujo ninguna agrupación nueva.
- **Mapa y lista cuadran por construcción.** El mapa agrega con todos los filtros
  salvo el territorial; indicadores y lista aplican el departamento. Lo que no
  tiene ubicación se cuenta aparte y se dice (`sinUbicacion`).
- **Búsqueda por número ⇒ sin indicadores** (es otro universo: incluye cerrados) y
  se dice en pantalla, en vez de mezclar alcances.
- **Cerrados rotulados** con la etapa calculada de la ficha («Plazo cumplido»…).
- **Islas.** A escala del país serían dos manchas de 2 unidades; van ampliadas en
  un recuadro arriba a la izquierda, como en el 2D (`recuadro-islas.ts`).
- **3D solo cuando conviene:** ≥ 1024 px, sin `prefers-reduced-motion` y con WebGL.
  En cualquier otro caso —o si el contexto se pierde— queda el 2D que ya viene en
  el HTML. El canvas es `aria-hidden`; el `<select>` del buscador y la lista
  «Ver por departamento» hacen lo mismo con teclado y lector de pantalla.
- **No hay snapshot de respaldo.** El estado `desactualizado` existe en el
  contrato pero esta consulta no lo produce; una falla de la base devuelve
  `no-disponible` (sin KPIs ni marcadores, con «Reintentar» y la navegación).
- Ningún punto del mapa representa una obra: son marcadores **agregados por
  departamento**, y todo texto dice «sede de la entidad».

## Criterios de aceptación

Verificado = ejecutado en esta rama, con la salida que se cita. **No verificado**
= no se pudo o no se debe afirmar desde aquí; queda para quien revise.

| ID | Estado | Evidencia / qué falta |
|---|---|---|
| A01 | Parcial | Capturas a 1440 y 390 px en el navegador del app sobre la base local: jerarquía del boceto, mapa 3D integrado al fondo sin recuadro (un solo fondo continuo, canvas transparente). Falta la **comparación contra el boceto por una persona** y capturas guardadas. |
| A02 | **No verificado** | Exige cotejar dos procesos de agua contra SECOP II con datos vivos. Aquí solo hay la muestra local. Hacerlo con la base viva y registrar fecha. |
| A03 | Verificado | `consulta.db.test.ts` (PGlite con las migraciones reales): total, lista y KPIs cuadran, entidades y valores sin duplicar, 0 y NULL no son precio, cobertura de la suma. |
| A04 | Verificado en parte | Pruebas de ida y vuelta de la URL (`url.test.ts`) y paridad con la vitrina (`consulta.db.test.ts`); en el navegador, un clic en el 3D cambió la URL a `?departamento=valle-del-cauca` y los campos la reflejan. **Atrás/Adelante y recarga** no se probaron a mano. |
| A05 | Parcial | Valle del Cauca seleccionable en 3D (clic) y en 2D (enlaces); mismas URL y mismas tarjetas. Falta probar «otra región» y la **ida y vuelta 3D↔2D** de forma sistemática, y ver las islas con selección. |
| A06 | Verificado | `geometria3d.test.ts`: 33 unidades, códigos de dos dígitos con cero, anclas dentro del lienzo, islas aparte, anillos interiores conservados. Atribución (DANE, SECOP II, licencia) en el pie de resultados; foto rotulada «Imagen ilustrativa» en cada tarjeta. |
| A07 | **No verificado** | El enlace a `/licitaciones/[slug]` es un `<Link>` real y la ficha canónica no se tocó. Falta el **E2E con un proceso real** y comprobar el regreso con el estado previo. |
| A08 | Parcial | 2D de servidor probado en HTML (`Marketplace.test.tsx`) y en vivo a 390 px (sin canvas). **No se probó** forzar pérdida de contexto ni `prefers-reduced-motion` en el navegador. |
| A09 | Parcial | Sin desbordamiento horizontal a 390 y 320 px (medido: `scrollWidth == clientWidth`, ningún elemento fuera). **Falta** el zoom al 200 %, el orden de foco, el contraste con herramienta y la revisión con lector de pantalla. |
| A10 | Parcial | Medido en el build: la ruta pesa 3,41 kB y 97,5 kB de primera carga (la vitrina, 107 kB); el JS de Three vive en chunks aparte pedidos tras hidratar: ≈ 64 + 84 kB **comprimidos** (≤ 300 KiB). Geometría ≈ 9,6 kB comprimidos (≤ 100 KiB). **No se corrieron** Lighthouse (tres corridas, mediana) ni LCP/CLS/INP con tráfico frío. |
| A11 | Parcial | `npm ls`: next 14.2.3, react/react-dom 18.3.1, three 0.187.0. `npm audit --omit=dev`: **7 vulnerabilidades (1 crítica en `next`, 4 altas, 2 moderadas), las mismas que `LICENCIAS.md` documentó antes de empezar; `three` no añade ninguna.** No se corrigieron aquí: subir Next es un cambio con riesgo propio y va en su propio PR. Excepción de alcance pendiente de un responsable. |
| A12 | Verificado | `npx tsc --noEmit` sin errores; `npm test` final: **230 archivos y 1.961 pruebas verdes** (60 son del marketplace); `npm run build` correcto (`/marketplace` aparece como ƒ dinámica); `next lint` sin avisos en lo nuevo. |

## Cómo reproducir

```bash
export PG_BIN=/opt/homebrew/opt/postgresql@17/bin LC_ALL=en_US.UTF-8   # Mac con brew
npm run local:preparar && npm run local:dev      # http://localhost:3000/marketplace
```

Sin `LC_ALL` válido, Postgres 17 en macOS no arranca («postmaster became
multithreaded»): no es un fallo del repo.

## Pendiente conocido

- Cotejo A02 y E2E A07 con la base viva.
- Lighthouse y Core Web Vitals en una previsualización con datos reales.
- Revisión con lector de pantalla y zoom al 200 %.
- Decidir si «Mapa», «Empresas» y «Talento» del boceto entran en la cabecera: hoy
  se conserva la navegación vigente del producto (el SPEC pide solo las entradas
  con ruta funcional).
- El boceto muestra «278 oportunidades» y «$1,8 billones» como ejemplo: **no son
  cifras del producto**; las de la página salen de la consulta.
- Las imágenes son ilustraciones generadas (ver `LICENCIAS.md`): revisar sus
  términos antes de publicar fuera de la ruta de revisión.
