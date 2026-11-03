# Tarjetas del observatorio — referencia corregida

## Alcance
El usuario aportó «Herramientas inteligentes para el sector hídrico.png» y
aclaró que esa es la referencia aprobada. Sustituye la primera aproximación.

## Implementación
- Encabezado «Herramientas de inteligencia» y titular con énfasis cian.
- Dos tarjetas con bordes cian luminosos, iconos, botones redondeados y
  escenas industriales, sobre paisaje oscuro ambiental.
- Rutas originales y lógica SECOP II intactas. Textos ajustados al alcance
  real: mayores adjudicaciones del último mes y actividad institucional.
- Una columna bajo 760 px; escenas debajo del texto en móviles estrechos;
  foco visible y respeto de movimiento reducido.

## Ilustraciones
Generadas con la herramienta integrada image_gen usando la imagen del usuario
como referencia visual. Se inspeccionaron y se comprimieron en WebP a 1100 px
con cwebp (calidad 83), sin dependencias nuevas. Son decorativas, no fotografías
de obras ni datos institucionales reales. El mapa y el gráfico del radar son
parte de la ilustración conceptual y se ocultan a tecnologías de asistencia.

Archivos finales:
- public/portada/observatorio/planta-adjudicados.webp
- public/portada/observatorio/radar-institucional.webp

Prompts usados (resumen fiel):
1. Recrear la planta de la tarjeta inferior izquierda: clarificador circular
   fotorrealista, agua azul, barandillas amarillas, puente central, tuberías
   azules, edificio de servicio y vegetación. Vista isométrica nocturna,
   iluminación cian, fondo azul petróleo, sujeto a la derecha, sin texto ni UI.
2. Recrear la escena inferior derecha: edificio institucional holográfico cian,
   anillos concéntricos de radar, silueta de Colombia con pines y gráfico de
   barras flotante. Render 3D sobre azul petróleo, sujeto a la derecha, sin
   cifras, texto, botones ni marcos.

## Verificación
Build, suite de pruebas, lint y formato de archivos modificados. Revisión
visual de escritorio y móvil. No se cambian consultas, auth ni datos y no se
despliega a producción. El entorno local no tiene base de datos configurada.
