# Agua Viva en Proyectos adjudicados

El usuario pide reemplazar la imagen por la escena del ZIP agua-viva-simulacion.
Se integra únicamente en la tarjeta Proyectos adjudicados. Radar institucional
conserva su ilustración.

1. Reutilizar dist del ZIP como recursos locales con licencia Three.js MIT.
2. Cargar un iframe decorativo transparente al acercarse a la tarjeta; Three.js
   no entra en el bundle principal. No recibe puntero, rueda ni foco.
3. Separar el enlace extendido de la tarjeta y el botón de pausa para no anidar
   controles interactivos. Conservar el destino /proyectos-adjudicados.
4. Pausar fuera de pantalla, con pestaña oculta y movimiento reducido. Un único
   frame estático en pausa; máximo 24 fps, DPR 1,5, sombra 1024 y reflejo 512.
5. Mantener la imagen previa como respaldo solo si falla WebGL o la carga.
6. Verificar pruebas del ZIP, pruebas del proyecto, build, lint y vista móvil.

La escena es ilustrativa, sin nuevos datos SECOP II ni cálculo hidráulico real.
Las dimensiones de la tarjeta se conservan al cargar. La comunicación entre
ventana y escena valida origen, ventana emisora y tipo. Sin dependencias npm
nuevas, migraciones ni cambios de rutas.
