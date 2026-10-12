# Plan — Registro territorial

Objetivo: implementar el SDD ../specs/2026-10-12-registro-territorial.md.
Ejecución directa autorizada por el usuario, en codex/registro-territorial.

1. [x] Añadir pruebas de variante aislada, ficha con datos reales del contrato,
   familia vacía/error y preservación del formulario. Ejecutarlas antes del cambio.
2. [x] Extender AuthCard con slot visual opcional y variante; mantener defaults.
   Añadir RegistroPreview.tsx con selección nativa y helpers existentes, y
   registro.module.css acotado. Consumir destacadosPortada con cache 6 h en un
   componente asíncrono de page.tsx bajo Suspense, conservando formulario/actions.
   Activar tema existente de Navbar solo para /registro. Documentar en CLAUDE.md.
3. [x] Ejecutar pruebas, lint, tipos, formato y build. Revisar escritorio/móvil,
   error y vacío, selección por teclado, mapa y enlaces; guardar capturas.
4. [x] Revisar diff, commit, push de rama y PR borrador. Inspeccionar CI/preview;
   reportar verificaciones pendientes sin afirmar despliegue de producción.

Interfaces: slot visual ReactNode, variante opcional; DestacadoPortada[] | null
al cliente; ProcesoPortada[] compartido entre SVG y fichas. Sin cambios de schema.

Foco de revisión: consulta lenta no bloquea alta; error y vacío distinguibles;
familia sin proceso no toma uno ajeno; next/actions/OAuth intactos; CSS no escapa
a login/recuperación ni mueve el foco al cambiar una ficha; overflow a 320 px.

## Evidencia

- Suite final: 184 archivos y 1.575 pruebas verdes, incluidas las dos pruebas
  del contrato de formulario.
- Build de producción completo, /registro 99,4 kB First Load JS. Sin env de
  base durante build: rutas públicas registraron su degradación prevista.
- Lint sin errores, advertencias previas en Navbar y DiagnosticoApp.
- tsc --noEmit verde. Corrección incidental: Promise<Response> explícita en
  estado-cliente.test.ts; el error TS2322 ya estaba en la base.
- Formato de código src/app verde. El glob literal de CONDUCTA también intenta
  procesar fuentes binarias; se acotó a ts/tsx/js/jsx/css/json, sin cambiar fuentes.
- Chrome contra build de producción y base configurada: procesos reales, cambio
  de familia, next compartido por ambos formularios, error de contraseña, un
  main, Tab de nombre a correo, login intacto; cero errores de navegador.
- 390 y 320 px: sin overflow, formulario primero, campos de 16 px. Capturas
  guardadas en outputs de la conversación.
- Revisión independiente estática: sin hallazgos.
- Alta, correo de confirmación y consentimiento Google reales pendientes de
  recorrido con cuenta de prueba del propietario; no se crearon usuarios.
