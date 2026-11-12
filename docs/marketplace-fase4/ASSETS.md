# Inventario visual

Los recursos proceden del chat «Diseño marketplace interactivo». Se recuperaron las fotos individuales PTAP, PTAR y redes, los dos fondos originales, el material territorial y el boceto oscuro posterior a la indicación de integrar el mapa sin recuadro. También se recuperó el tríptico inicial. [Conversación de origen](https://chatgpt.com/c/6af55b81-7ab0-83ed-8f65-35354fd9443d)

| Ruta dentro de `public/assets/marketplace/` | Dimensiones | Uso |
| --- | --- | --- |
| `oportunidades/oportunidad-ptap.webp` y `oportunidad-ptap-640.webp` | 1280 × 800 y 640 × 400 | Agua potable y PTAP |
| `oportunidades/oportunidad-ptar.webp` y `oportunidad-ptar-640.webp` | 1280 × 800 y 640 × 400 | Agua residual y PTAR |
| `oportunidades/oportunidad-redes.webp` y `oportunidad-redes-640.webp` | 1280 × 800 y 640 × 400 | Redes de acueducto y alcantarillado |
| `hero/hero-atmosphere.webp` | 1600 × 900 | Fondo principal. Degradado oscuro adicional en CSS bajo el texto |
| `hero/hero-atmosphere-mobile.webp` | 768 × 600 | Recorte móvil |
| `hero/section-transition.webp` | 1600 × 510 | Franja de unión. Recorte inferior del original de fase 2 |
| `territorio/colombia-terrain.webp` | 128 × 128 | Muestra de superficie genérica recortada de la lámina. Usar como detalle opcional con baja intensidad y sin asumir repetición perfecta |

Los WebP se exportaron en sRGB con tamaños adaptados al uso y sin reescalado por encima del original. El manifiesto registra resolución y huella del original, dimensiones, peso y SHA-256 del WebP. Para tarjetas, usar un `srcset` de 640w y 1280w con `sizes` coherente con la columna. Aplicar «Imagen ilustrativa» de forma visible. Si el tipo no está confirmado, usar el fondo neutro del componente.

`referencias/boceto-aprobado.webp` es una imagen para comparar la interfaz. Contiene texto, procesos, importes y cifras de ejemplo. `referencias/materiales-territoriales.webp` muestra la dirección artística de relieve, agua y bordes. Sus rótulos «4K», «heightmap» o «límites» describen propuestas de la lámina. La entrega contiene la lámina de 1536 × 1024 y una muestra de color, sin capas georreferenciadas independientes. `referencias/fase-1-triptico.webp` documenta la primera serie fotográfica.

Para límites y códigos, reutilizar el MGN 2025 de `data/geo/` del repositorio. Los marcadores derivan de las consultas AquaLicita. Para la marca, reutilizar el encabezado o identificador vigente en el producto. No se identificó un SVG original independiente en la copia consultada.
