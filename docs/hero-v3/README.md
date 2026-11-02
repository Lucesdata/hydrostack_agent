# Hero Territorial V3.1 (2026-11-01, rama `claude/hero-territorial-v3`)

Implementación del boceto aprobado sobre el hero existente. Sin despliegue ni PR.

## Qué cambió
- `HeroTerritorial.jsx` → `HeroTerritorialV3.jsx` (misma lógica: pestañas, capa del mapa, panel de región, recorrido).
- Nuevos: `HeroBackground`, `HeroMessage`, `HeroWorkflow`, `FamiliaCards` (las tres familias son las pestañas ARIA, con la cifra real sumada de `conteosPorFamilia()`), `FeaturedLiveProcess` (Ficha Viva de la franja), `DigitalTwinsPreview`, y `hero-v3.module.css`.
- El «ColombiaMapWrapper» del spec es el hueco `mapa` ya existente (SVG de servidor): no se reconstruyó ni se transformó; solo halo CSS y `drop-shadow`.
- La sección `FichaViva` de la portada se retiró: su contenido (los cuatro accesos) vive en la franja. La portada queda en dos secciones: hero + «¿Puedes participar?».
- Nueva ruta informativa `/gemelos-digitales` (destino del CTA); no promete producto.
- Paleta del spec en los `--aq-*` del hero (`#031625`, `#0a2236`, `#00d9f4`, `#f4f8fc`, `#aec2d2`).

## Inventario de assets
| Archivo | Origen | Uso |
|---|---|---|
| `public/portada/hero/fondo-montanas.webp` (28 KB) | boceto, imagen de fondo | `HeroBackground`, `next/image fill`, `priority`, decorativa |
| `public/portada/hero/planta-3d.webp` (225 KB, 1200×675, RGBA) | boceto, planta 3D | `DigitalTwinsPreview`, `object-fit: contain`, decorativa |
| mapa 3D con nubes (adjunto) | boceto | **No usado**: se conserva el SVG interactivo |

## Verificación
- `vitest run`: 185 archivos, 1583 pruebas, todas pasan (se adaptaron las de hero, portada, panel de región y conteos; se eliminó `FichaViva.test.tsx`).
- Medido en Chromium (dev): 1440×900 y 1024×768 sin scroll horizontal; 390×844 sin desborde. CLS = 0. Teclado: flechas entre pestañas cambian capa y ficha.
- **No medido**: LCP (el panel no lo reporta; hay que medirlo con build de producción) ni contraste automático de los colores nuevos de `hero-v3.module.css`.
- `tsc` solo falla en `src/__tests__/mis-procesos/estado-cliente.test.ts`, anterior a este cambio.

## Segunda pasada (mismo día): acercamiento al boceto
- Barra de la portada: plana, con «INTELIGENCIA SECOP II», enlaces extra «Gemelos digitales» y «Cómo funciona» (solo en `/`) y «Crear cuenta» en cian.
- Fondo: la imagen casi sin velo, con la onda luminosa entre hero y franja.
- Mapa: relieve (sombras apiladas), brillo, dos anillos y tarjeta flotante HTML «Valle del Cauca · N procesos» colocada con un porcentaje del viewBox (el SVG no se transforma).
- Titular a escala del boceto con trazo curvo; botón principal = búsqueda guiada («Explorar oportunidades»); «Ver cómo funciona» con icono de play; pasos con flechas.
- Franja: Ficha Viva con tarjeta de icono, estado/presupuesto/cierre y flecha; gemelos con planta grande, caudal con sparkline y eficiencia con anillo (demostrativos).
- A 1440×900 todo el hero cabe en el primer pantallazo (borde inferior en 900 px).

## Diferencias pendientes frente al boceto
1. El mapa sigue siendo el SVG plano (relieve simulado con sombras); no tiene la textura topográfica ni las nubes del 3D.
2. La tarjeta flotante dice «N procesos» de la familia en 2026 y «$ X · destacado» (presupuesto del proceso); el boceto muestra el valor total del departamento, que hoy no se calcula.
3. Las cifras de las tarjetas de familia cuentan procesos publicados en 2026 en todas las etapas, no solo abiertos (el `title` da el desglose).
4. Falta «Inicio» en la barra y «Beneficios» (no hay destino) ; la barra pierde la píldora solo en `/`.
5. El boceto trae tres lecturas en la planta (con DBO₅); el spec pedía máximo dos.
6. En el celular la tarjeta flotante se oculta (la línea `.previa` dice el proceso activo).
7. Código sin uso: `Minificha` y sus reglas `.aqMini*`, y reglas `.panel/.accesos` de `ficha-viva.module.css`.
8. LCP sin medir (necesita build de producción).

## Limpieza posterior (2026-11-01, pedido del usuario)
Se quitaron del hero: la tarjeta flotante del mapa («Valle del Cauca · N procesos»), la escala de colores con su título, la lista «Ver por departamento» y las lecturas de telemetría de la planta (Caudal y Eficiencia). El pie de la planta dice ahora «Ilustración demostrativa». Con conteos el mapa queda sin leyenda; sin ellos se conserva la leyenda de las tres familias. La región sigue abriéndose pulsando el mapa. Se pierde la alternativa textual por departamento (lista) que ofrecía el hero.

## Limpieza 2 (2026-11-02, pedido del usuario)
Se quitaron los tres pasos «Descubre → Evalúa → Sigue» del mensaje y los cuatro accesos a secciones de la ficha (Qué se contrata, Presupuesto, Plazos, Qué falta verificar). La tarjeta de la Ficha Viva sigue enlazando a la ficha por su título. Se borró `HeroWorkflow.jsx`.
