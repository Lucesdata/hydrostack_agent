# Biosfera · Hero interactivo con Three.js

Demostración del hero de Biosfera: texto comercial a la izquierda y una planta de tromel en 3D (Three.js real) a la derecha, con un **recorrido ilustrativo de un lote** sincronizado con los cuatro pasos (Recepción, Tratamiento, Documentación, Certificado).

Es un módulo **autónomo**: HTML + CSS + JavaScript modular, sin build ni framework. No forma parte de la app Next.js de AquaLicita ni se despliega con ella.

## Ejecutar en local

Los módulos ES y el `importmap` exigen un servidor (no funciona abriendo el archivo con `file://`):

```bash
cd demos/biosfera-hero
python3 -m http.server 8765      # o: npx http-server -p 8765
# abrir http://localhost:8765/
```

`?debug` en la URL expone `window.__biosfera` (recorrido, escena) para pruebas automáticas.

## Despliegue

Es un sitio estático: sube la carpeta tal cual a cualquier hosting estático (Vercel, Netlify, S3, GitHub Pages). Todas las rutas son relativas; no hay servicios externos ni CDN. Para servirlo dentro de otro sitio, copia la carpeta a su directorio público (p. ej. `public/biosfera/`).

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura y contenido de la página |
| `css/styles.css` | Estilos neobrutalistas y adaptación responsive |
| `js/data.js` | Datos: equipos, etapas, zonas, textos de documentos y modales |
| `js/machinery.js` | Construcción de la planta (geometría simplificada) |
| `js/lote.js` | Partículas del lote: tierra y fragmentos metálicos, trayectorias |
| `js/journey.js` | Estado y línea de tiempo del recorrido (sin DOM ni Three) |
| `js/scene.js` | Renderer, cámara, controles, resaltado, marcadores proyectados |
| `js/ui.js` | Pasos, panel de equipo/zona, tarjeta del lote, documentos, modal |
| `js/main.js` | Orquestación y bucle de animación |
| `vendor/three/` | three **0.160.1** (+ `OrbitControls`, `RoomEnvironment`), con su licencia MIT |
| `fonts/` | Barlow Condensed y Inter (`@fontsource`, licencia OFL) |

## Cómo funciona el recorrido

- Una sola línea de tiempo `T` (0–33 s). La posición de cada pieza, el giro del tromel y el avance de la banda son **funciones puras de `T`**: pausar, revisar un paso o reiniciar no dejan estado oculto, y la velocidad no depende de los fotogramas por segundo.
- Pasos: Recepción 0–6 s, Tratamiento 6–24 s, Documentación 24–29 s, Certificado 29–33 s. Pulsar un paso salta a ese momento y deja el recorrido en pausa; «Reanudar» continúa desde ahí.
- La planta está fija y la cámara no se mueve sola. Solo se animan los mecanismos que giran o avanzan (tromel, banda) y el material, y solo mientras hay material en ellos.
- Documentación y Certificado son etapas administrativas: la escena se atenúa y se muestran un registro y un certificado **ilustrativos** (sin mediciones; «—» = dato por registrar).
- Un cuadro superior muestra el equipo seleccionado o, si no hay selección, la **zona activa** de la planta y lo que ocurre allí.

## Fidelidad del proceso (pendiente de confirmar)

La separación se presenta como **«Visualización conceptual de separación»**: dos corrientes de salida (tierra y metal recuperado) sin afirmar un mecanismo técnico. No se atribuye separación magnética al tromel ni se inventa un separador. Qué corriente sale por «material cribado» y cuál por «rechazo» es una asignación visual provisional.

**Falta confirmar con Biosfera** cómo separa la instalación real el metal de la tierra antes de representar el mecanismo definitivo.

## Controles

Arrastrar para orbitar · rueda / pellizco para zoom · botones +, −, vista inicial y autorrotación (opcional, apagada) · Vista 3D / Vista planta · Iniciar recorrido, Pausar/Reanudar, Reiniciar lote. **Pausar detiene todo lo automático**, incluida la autorrotación. Seis marcadores accesibles por teclado (Tab, Enter; Escape deselecciona).

## Accesibilidad y robustez

Botones con nombre accesible y foco visible; pausa con `aria-pressed`; selección con `aria-pressed` y región `aria-live`; modal con `<dialog>` nativo (foco gestionado, Escape); `prefers-reduced-motion` (sin animación de cámara, autorrotación inactiva, el recorrido solo avanza si lo inicias); render solo cuando algo cambia y se detiene con la pestaña oculta o la escena fuera de pantalla; sin WebGL aparece un mensaje y una lista de equipos, y los CTA y pasos siguen funcionando.

## Límites conocidos

- Geometría simplificada, **no es una réplica técnica exacta** (la interfaz lo indica).
- Los CTA y las secciones de la navegación abren un **modal de demostración**: no hay integración comercial, no se envía ni guarda nada.
- No se muestran listados de residuos, licencias, capacidades ni cifras: no hay información verificada.
- El texto «Yumbo, Valle del Cauca» viene del boceto proporcionado.
- La verificación automática se hizo con Chromium y render por software (SwiftShader); el rendimiento en GPU real no se midió.
