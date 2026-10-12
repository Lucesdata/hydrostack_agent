# SDD — Registro territorial de AquaLicita

## Propósito y autorización
Convertir /registro en una entrada coherente con la portada: mostrar el producto
antes del alta y facilitar la creación de cuenta. El usuario autorizó escribir
este spec y ejecutar directamente el cambio en una rama; no requiere una nueva
ronda de aprobación del concepto. Alcance acotado al registro existente.

## Referencia y reconocimiento
Captura original del 12 de octubre: navegación clara; panel azul con cuatro
beneficios; formulario blanco con nombre, correo, contraseña y Google.
Base revisada: main 4035127, incluye botón de envío pendiente y recuperación.
AuthCard es compartido por login, registro y recuperación. GoogleButton y
BotonEnvio ya existen. signUpAction valida contraseña, sincroniza usuario,
reclama diagnóstico solo con sesión y deriva a verificación cuando corresponde.
OAuth usa signInWithGoogleAction y /auth/callback. No se modifica ese contrato.
ColombiaChoropleth dibuja geometría local desde servidor. destacadosPortada
consulta exclusivamente procesos públicos ingeridos, con recepción vigente,
identidad resoluble, presupuesto y departamento. Minifichas y sincronia ya
conectan fichas y mapa. Se reutilizan estos elementos.

## Experiencia y criterios de aceptación
- Escritorio: composición nocturna de dos zonas, territorio a la izquierda y
  alta a la derecha. Azul agua, bordes discretos, tipografía local existente.
- Mostrar procesos reales de las tres familias existentes; botones con estado
  pulsado cambian la ficha y su marca en el SVG. Enlaces abren la ficha real.
  Sin rotación automática ni ilustraciones que simulen controles.
- No inventar cifras nacionales, usuarios, tendencias ni procesos. La selección
  no representa todos los procesos. Ubicación = sede de entidad, no obra.
- Explicar brevemente guardar, consultar pliegos y alertas de nuevos procesos
  según perfil; no prometer detección de adendas ni adjudicación garantizada.
- Móvil: formulario primero; vista previa después. Sin desplazamiento horizontal
  a 320 px; campos de al menos 16 px y controles táctiles de al menos 44 px.
- Teclado: labels, autocompletado, foco visible, selección con botones nativos,
  texto alternativo completo a mapa; errores anunciados; un solo main global
  en el nuevo registro. Contraste AA y respeto a movimiento reducido.
- Si falla o está vacía la consulta, mensaje explícito y mapa base sin procesos
  falsos. La consulta no bloquea el formulario (streaming con Suspense).
- Mantener nombres de campos, actions, next, Google, validaciones, enlace login,
  estados de envío y sesiones. Sin cambios en auth, middleware, RLS, esquema,
  consultas de cuentas ni rutas públicas. Login conserva su presentación.

## Contrato técnico
AuthCard recibe un slot opcional `visual` y una variante `registro`; los valores
por defecto conservan el resto de pantallas. CSS Module acotado a esa variante.
/registro suministra su vista asíncrona dentro de Suspense. La consulta pública
existente se cachea 6 h (cadencia de portada), nunca datos de sesión ni errores.
La vista cliente recibe DestacadoPortada[] | null y un slot mapa de servidor.
La geometría no entra en el bundle cliente. Selección local efímera, sin storage,
sin peticiones al cambiar selección. Reutiliza Minifichas, familias y helpers.
Navbar activa su tema oscuro existente también en /registro, sin cambiar login.
Sin dependencias nuevas, imágenes remotas ni fuentes externas.

## Verificación y límites
Suite completa de regresión (incluye actions/callback/recuperación), lint, tipos,
build detenido el servidor, formato y revisión del diff. Recorrido de escritorio
y móvil con captura, teclado, errores, selección y degradación de datos.
No crear cuentas reales para probar ni modificar configuración de OAuth.
Entrega mediante PR contra main y preview Vercel si la integración lo permite;
no hacer push a main ni merge automático. Validar el alta real con cuenta de
prueba y Google requiere una sesión interactiva del propietario.
