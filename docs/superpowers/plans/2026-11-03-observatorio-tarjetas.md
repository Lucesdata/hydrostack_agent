# Tarjetas del observatorio — AquaLicita

## Alcance aprobado
Rediseñar los dos accesos actuales según la descripción aprobada en la
conversación «Mejorar diseño de sección»: estética industrial oscura,
jerarquía clara, ilustraciones y CTA visibles, adaptación móvil. La captura
original se recuperó; la imagen del boceto generado no estaba adjunta.

## Implementación
1. Conservar los enlaces y el marcado en PortadaCliente.jsx.
2. Sustituir estilos en línea por CSS de módulo limitado a las tarjetas.
3. Reutilizar SVG y fondo de montañas existentes, sin dependencias nuevas.
4. Verificar build, pruebas, lint, formato y navegador de escritorio/móvil.

## Criterios
Ambos accesos conservan su destino; no se modifica lógica SECOP II, render
de la página ni fuentes de datos. Sin métricas simuladas. Tarjetas sin
desbordamiento en móvil, teclado con foco visible, transiciones solo al
interactuar y desactivadas con movimiento reducido.
