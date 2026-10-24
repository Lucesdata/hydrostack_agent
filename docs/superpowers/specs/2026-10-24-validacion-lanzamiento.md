# Validación de lanzamiento: qué consta y qué falta

**Fecha:** 2026-10-24. Contrasta el checklist de #149 (verificado 2026-10-19 por el
dueño con CLI/MCP de solo lectura; el archivo `docs/lanzamiento-checklist.md` entra con
ese PR) con la evidencia disponible en esta sesión: código en `origin/main` y
`vercel.json`. **No se accedió a Resend, Supabase ni Vercel; no se crearon cuentas, no
se enviaron correos, no se cambió ninguna variable.**

| Punto | Estado | Evidencia que consta | Evidencia que lo cerraría |
|---|---|---|---|
| Crons `tick` 11:00 y `alertas` 12:00 | Código y programación **comprobados** | `vercel.json` | Ejecución observada en logs de Vercel |
| Alertas: entrega | **Pendiente de prueba real** | `alertas/route.ts` responde 200 con `disabled:true` si `ALERT_EMAILS_ENABLED≠true`; #149: un solo envío en `envio_log` (2026-10-08) | Un envío a una cuenta de prueba, con `envio_log` y el evento del webhook de Resend correlacionados |
| Baja de alertas y webhook | **Pendiente de prueba real** | Cabeceras `List-Unsubscribe` en el código (runbook) | Pulsar la baja en un correo real y ver el evento en `/api/webhooks/resend` |
| Registro con correo y confirmación | **Pendiente de prueba real** | #149 lo lista sin marcar | Alta con correo ajeno al equipo: llega el correo, el enlace confirma, entra |
| Google OAuth | **Pendiente de prueba real** | — | Inicio de sesión con Google en aqualicita.com |
| Recuperación de contraseña (#142) | **Pendiente de prueba real** | `/recuperar` responde 200 (#149) | Flujo completo con un correo real, en el mismo navegador (PKCE) |
| Reclamo del diagnóstico anónimo | **Pendiente de prueba real** | Lógica en `src/lib/diagnostico/*` | Responder sin sesión y registrarse por cada camino (Google, correo verificado, contraseña) |
| Aislamiento de guardados entre cuentas | **Pendiente de prueba real** | Consultas filtradas por `usuario_id` (CLAUDE.md); prueba pendiente en #110 | Dos cuentas: guardar en una y comprobar que la otra no lo ve |
| Textos legales | Decisión del dueño | #149 | Criterio jurídico sobre `/terms` y `/privacy` |
| Consumo de Vercel y timeouts de la ficha | **No evaluado aquí** | Análisis 2026-10-10 + índices #136 | Revisión de `get_runtime_errors`/uso en el PR B; no se da por resuelto solo porque el despliegue terminó |
| Verificación visual de la portada | **Pendiente** | Pruebas de render; sin capturas en este PR | Capturas a 320, 390 y 1440 px con datos vivos |

Reproducible para el dueño: ejecutar cada fila de «Evidencia que lo cerraría» y pegar el
resultado (captura o fila de `envio_log`) en el PR de lanzamiento.
