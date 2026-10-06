# Plan: reemplazo de la ficha AquaLicita

> Ejecución en esta sesión, tarea por tarea, con pruebas de dominio y revisión final. Spec aprobado por «ok hazlo» del usuario.

**Objetivo:** sustituir la ficha por preguntas por la ficha operativa definida en el HTML y spec del 6 de octubre.
**Arquitectura:** conservar servidor, ISR de 12 h, etapaDeProceso, comoSeContrato, consultas y servicios de cuentas/pliegos. ExploradorFicha pasa a manejar niveles de lectura y anclas, sin personalizar elegibilidad. GuiaTemporal será una isla de cliente que actualiza la misma regla de etapa con reloj actual y datos públicos mínimos.
**Stack:** Next 14, React 18, TypeScript, estilos existentes y Vitest. Sin dependencias nuevas ni migraciones.
**Spec:** ../specs/2026-10-06-ficha-operativa-viva.md.
**Base remota:** main 8b19beed8b69f74028520784d2cef36857e010e6, árbol f2a46091421dc1f844260f555b57d6aceb287c00, verificado idéntico a la instantánea local. Se preserva el checkout original del usuario.

## Restricciones globales

- Ficha, nunca dossier; guía pública de requisitos sin compuertas personalizadas.
- No inventar valores, documentos, participantes, horas ni adendas.
- La fecha de SECOP es DATE: contador en días naturales de Colombia con hora no publicada. No recalcular ingesta ni habilitación global.
- Pliego textual ambiguo: presentar lo extraído y pedir comprobación, sin convertirlo a un instante supuesto.
- No cambiar tokens de :root, auth, permisos, esquema ni estrategia de render. Aplicar tema oscuro en el ámbito de la ficha.
- Contratos conservan la política vigente de personas jurídicas/NIT y supresión de cifras dudosas.
- Entrega en PR; sin merge automático ni push a main.

## Riesgos a verificar

1. Cambio de día Colombia, vencimiento y suspensión: no contador negativo ni invitación a ofertar.
2. Datos incompletos y texto del pliego sin formato normalizado: no falsa precisión.
3. Anclas antiguas y resultados #pliego=…: destino visible, abierto, y contenido sin JS.
4. C4 y personas naturales: cambio visual no expone cantidades dudosas ni nombres omitidos.
5. Imagen, nombres largos y móvil: sin recortes ni dependencia externa.

## Tarea 1: guía temporal comprobable

**Archivos:** src/lib/secop/guia-temporal.ts; src/components/secop/ficha/GuiaTemporal.tsx; src/__tests__/secop/guia-temporal.test.ts.
**Consume:** SenalesProceso y etapaDeProceso de etapa.ts; diaEnColombia.
**Produce:** guiaTemporal(senales, fechaCierrePliego, ahora), con etapa, etapas, cierre, días naturales, avance de ventana y siguiente acción.

- [x] Escribir pruebas con reloj fijo, fechas inválidas, suspensión, adjudicación/contrato, cierre vencido, día Colombia y pliego ambiguo.
- [x] Ejecutar `npm test -- src/__tests__/secop/guia-temporal.test.ts` y confirmar fallo por módulo ausente.
- [x] Implementar el adaptador de vista y la tarjeta temporal con selección exploratoria independiente del estado real.
- [x] Repetir pruebas; comprobar comportamiento y render inicial seguro.

## Tarea 2: estructura y navegación de la ficha

**Archivos:** app/licitaciones/[slug]/page.tsx; ExploradorFicha.tsx; estilos.ts; Navbar.js; public/images/ficha-acueducto.webp; FichaPublica.test.tsx.
**Consume:** datos y contratos actuales; pliego; competidores; GuiaTemporal; BotonGuardar/ProcesosCuenta/RegistroVisita.
**Produce:** nueva ficha completa y lectura rápida, secciones y anclas históricas.

- [x] Actualizar prueba de presentación antigua para exigir secciones nuevas, ausencia de perfil, contenido completo, fuentes y formularios. Ejecutar antes del reemplazo.
- [x] Construir hero y KPIs sin truncar objeto; bloques persistentes y desplegables; ayuda educativa; documentos con inventario honesto y buscador; preservar cómo se contrató, glosario y procesamiento.
- [x] Explorador mantiene historial/anclas, impresión con restauración, copia y ampliación accesible; sin estado de negocio en localStorage.
- [x] Consolidar estilos oscuros de ficha y ampliar Navbar oscuro solo a rutas de detalle, manteniendo el resto del sitio.
- [x] Convertir imagen del prototipo a recurso WebP optimizado y etiquetarla como ilustrativa, sin imagen específica falsa.
- [x] Ejecutar pruebas de ficha y comprobar antiguos fragmentos, errores de fuente y texto externo escapado.

## Tarea 3: cambios reales y trazabilidad

**Archivos:** ficha.ts; FichaPublica.test.tsx; prueba PGlite del contrato de consulta de novedades.
**Consume:** al_proceso_evento y updatedAt existentes.
**Produce:** lectura indexada de eventos públicos recientes y fecha de actualización de la ficha, sin migraciones.

- [x] Probar consulta por proceso, orden descendente, límite y representación de fechas/cifras anteriores y nuevas.
- [x] Conectar eventos reales: detector registra cambios en la fuente; no afirmar que todo delta es una adenda oficial.
- [x] Si fallan novedades, conservar secciones disponibles y mostrar fallo explícito de historial.
- [x] Repetir pruebas de consulta/render y no ejecutar detectores ni ingesta.

## Tarea 4: validación y entrega

- [x] Ejecutar `npm test`, `npm run lint`, `npm run build` sin preview concurrente y `npx prettier --check "src/**/*" "app/**/*"`; verificar tsc y diff.
- [ ] Probar visualmente sobre datos locales sintéticos aislados. Bloqueado: initdb no puede crear memoria compartida (Operation not permitted). No se usaron credenciales de producción.
- [ ] Completar recorrido visual en 320/390/768/1440 px, teclado, diálogos e impresión. Hay revisión estática, SSR y pruebas de dominio; falta validación en navegador.
- [x] Documentar sustitución en CLAUDE.md y resultados verificables; revisión final independiente.
- [x] Crear PR contra main preservando cambios upstream. No hacer merge ni publicar sin instrucción específica.

## Decisiones durante ejecución

- La copia de septiembre era antigua. Se recuperó main mediante el conector GitHub y se comprobó el SHA del árbol completo antes de implementar.
- No se copia .env.local ni se accede a servicios privados; las pruebas usan fixtures/PGlite existentes.


## Registro de entrega

- Main se actualizó a `466e8492521eff68559b56e9b05b72fa25411e43` (hero central #126). Se preservaron sus 16 archivos antes de cerrar la implementación.
- La revisión independiente detectó anclas repetidas, relojes divergentes y texto de perfil obsoleto; los tres se corrigieron. Ajuste menor: instantes de procesamiento en America/Bogota, con prueba de regresión.
- No hay inventario público de archivos asociado a proceso. El buscador trabaja sobre referencias conocidas del pliego y comunica su alcance. No accede a la tabla privada `documento`.
- El build se ejecuta sin conexión de producción: compila y comprueba tipos del producto, pero las páginas de datos muestran sus fallbacks durante prerender. No acredita consultas reales ni recorrido visual.
- `tsc --noEmit` aislado detecta el error preexistente `Promise<unknown>` en `src/__tests__/mis-procesos/estado-cliente.test.ts:31`.
- El glob Prettier de src/app intenta analizar fuentes WOFF y licencias TXT sin parser. El comando de CI `prettier --check .` pasa.
- PR borrador: pendiente de revisión visual y pruebas con datos representativos antes de merge.
