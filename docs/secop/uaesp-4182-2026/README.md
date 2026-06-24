# Fixture: UAESP Cali — Estudios de mitigación PTAPs rurales (4182.010.32.1.305-2026)

Este directorio es el **fixture de evaluación** generado durante la sonda técnica de Fase 0 (2026-06-12). No es producto; es la línea base para reproducir y comparar futuras versiones del agente de extracción de pliegos.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `README.md` | Este archivo. |
| `extraction.json` | Estructura del presupuesto extraída del pliego + plantilla Excel, en formato JSON. Salida del Prompt 0.2 con lagunas reducidas tras lectura completa. |
| `lagunas.md` | Inconsistencias detectadas en el pliego (no en la extracción). Material útil para el validador de coherencia. |
| `sources.md` | Rutas a los archivos originales (pliego PDF + Excel) en el sistema del usuario, qué páginas se leyeron, y caveats. |
| `gate-verdict.md` | Veredicto del gate de Fase 0 (Prompt 0.3): **SALE LIMPIO** con caveat de generalización a obra civil. |

## Cómo usar este fixture

1. **Re-correr la sonda** con una nueva versión del agente: pasarle los mismos dos archivos (ver `sources.md`) y comparar la salida JSON contra `extraction.json`.
2. **Validar regresiones**: si el agente deja de detectar las inconsistencias listadas en `lagunas.md`, hay regresión.
3. **Extender a nuevos pliegos**: replicar este layout en `docs/secop/<entidad>-<numero>-<año>/`.

## Contexto del proceso

- **Entidad**: Unidad Administrativa Especial de Servicios Públicos (UAESP) – Distrito de Santiago de Cali
- **Modalidad**: Concurso de méritos abierto
- **Objeto**: Estudios con alcance de diseño para mitigación del riesgo y estabilidad del terreno en infraestructuras de tratamiento y abastecimiento de agua potable de la zona rural de Cali (8 PTAPs)
- **Presupuesto oficial**: $412.698.192 COP
- **Plazo**: 4 meses
- **Estado al momento de la sonda**: Fase de presentación de ofertas, abierto
- **URL SECOP II**: https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10207817

## Por qué este caso

Se eligió como warm-up de consultoría antes de probar pliegos de obra civil. La pregunta abierta para Fase 1 es si el agente extrae limpio una matriz APU completa de obra, no solo una tabla plana de consultoría. Próximo caso candidato: ACUAVALLE 069-26 ($299M, realce de bocatoma PTAP San Pedro) o el de Palmira PTAR si sigue activo.
