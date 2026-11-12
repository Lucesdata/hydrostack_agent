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
| `public/portada/hero/fondo-montanas.webp` (28 KB) | boceto, imagen de fondo | **Retirada el 2026-11-12**: ya no la usan ni el hero ni el observatorio |
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

## Limpieza 3 (2026-11-02, pedido del usuario)
Se oculta el rótulo flotante del mapa («Valle $500 M»): las etiquetas siguen en el SVG de servidor pero no se pintan.

## Rediseño «carta hidrográfica» (2026-11-11, rama `ccr-4e3c012c-il7hwe`, pedido del usuario)
Mismo contrato de datos, mismas pestañas, mismo SVG de servidor; cambia cómo se ve y cómo se mueve.

- **Fondo original y animado** (`HeroBackground.jsx`): sin fotografía. Luz que deriva, curvas de nivel de un relieve inventado (`public/portada/hero/curvas-nivel.svg`, 9,5 kB, generado por `scripts/portada/curvas-nivel.mjs`: determinístico, no representa ningún territorio), retícula de puntos y cuatro «cauces» con un pulso de luz. `fondo-montanas.webp` se borró el 2026-11-12, cuando el observatorio pasó a las mismas curvas. El hero ya no carga una imagen con `priority`.
- **Mapa despiezado, flotando y armado**: cada departamento lleva `--ex`/`--ey`/`--i` (`src/lib/mapa/explosion.ts`, solo en el modo `seleccion`). Al cargar, el país llega desarmado y se arma del centro hacia fuera; en reposo queda con rendijas (`--aq-despiece: 0.04`), flota sobre una plataforma, se inclina hacia el puntero (`escena.js`) y se abre un poco más al pasar por encima. El relieve sigue siendo `drop-shadow` (cada pieza tiene su canto). Una baliza HTML late sobre el anclaje del proceso activo. El SVG **no se reordena ni se transforma entero**.
- **Texto**: el titular entra por renglones tras una máscara, «saneamiento.» lleva un brillo y su trazo se dibuja; el `h1` es el mismo marcado. Las cifras de las tarjetas cuentan al aparecer (el HTML ya trae el número final).
- **Tarjetas**: las de familia muestran cifra, medidor de «reciben ofertas hoy» (dato de `conteosPorFamilia()`) y la barra del turno del recorrido; la Ficha Viva es un expediente con cinta (tipo y número publicado) y tres casillas rotuladas; franja en dos paneles.
- **Recorrido**: «Pausar recorrido» pasó del pie de la ficha a la esquina del mapa, junto al rótulo de la capa y la pista «Pulsa un departamento para ver sus procesos».
- **Barra oscura** (`Navbar.js`): marca con lema, enlaces en una cápsula (ninguno parte en dos líneas; los dos extra de la portada solo ≥ 1340 px), y vidrio al desplazar (`data-scrolled`). Vale también para la ficha.
- **Movimiento**: lo continuo usa `transform`/`opacity` en capas propias; con «reducir movimiento» todo queda quieto y completo. Bajo 900 px no hay cauces.
- De paso: `PanelRegion` usaba `styles.criterio` y `styles.enlaceFamilia`, que no existían; ahora sí.

### Verificación
- `vitest run`: 223 archivos, 1.891 pruebas, todas pasan (nueva: `mapa/explosion.test.ts`).
- Chromium contra el entorno local (muestra de SECOP): sin scroll horizontal a 1440, 1280, 1024, 820 y 390; sin errores de consola; armado, puntero, región, cambio de pestaña y barra desplazada revisados en captura.
- Alto del hero a 1440×900: 833 px (antes 940); acaba 5 px bajo el pliegue. Captura: `carta-hidrografica-1440x900.jpg`. A 1920×1080 cabe exacto.
- **Build de producción** (`next build` + `next start`, base local): LCP 836 ms en escritorio y 692 ms en móvil con la CPU 4× más lenta; CLS 0 y 0,0006. Primera carga de `/`: 131 kB. El elemento del LCP es un contenedor (el fondo), ya no una imagen.
- **Movimiento reducido** (emulado): 0 animaciones activas, todo visible y sin botón de pausa (el recorrido se desactiva).
- **Contraste**: `contraste-hero-v3.test.ts` mide tarjetas de familia, Ficha Viva, texto sobre la luz del fondo y la barra. Encontró un fallo real (texto secundario de la tarjeta de agua potable elegida, 4,37:1) y se corrigió subiéndolo a `#c3d3e0`.
- **No medido**: rendimiento en un teléfono real y datos vivos (las cifras de la captura son de la muestra local).

## Seguimiento (2026-11-12)
- **Objetos que son solo un código.** En producción apareció «Ahcmain08-026» como título de la Ficha Viva: la fuente publica una referencia suelta como objeto. `esCodigo()` / `rotuloDeObjeto()` (`src/components/landing/texto.js`) lo rotulan «Proceso AHCMAIN08-026» en la Ficha Viva, el panel de región y el nombre accesible del mapa; una descripción real sigue saliendo como frase. No cambia la selección del destacado (la regla sigue siendo presupuesto y plazo) ni toca los datos.
- **Observatorio.** La sección bajo el hero usa las mismas curvas de nivel (estáticas) en lugar de la fotografía, y sus tarjetas se levantan 3 px al pasar el puntero (se anula con «reducir movimiento»). Las tarjetas siguen el mockup aprobado del 2026-11-03: no se rediseñaron.
- Sin tocar: `TuPerfil` (mockup aprobado del 2026-10-22).
