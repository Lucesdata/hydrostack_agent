# 📚 Índice de documentación — HydroStack

HydroStack es una plataforma de inteligencia para contratación pública en
agua y saneamiento (SECOP II). Ver
[ADR-0002](./adr/ADR-0002-deprecacion-dominio-septico.md) sobre la
deprecación del dominio séptico anterior.

## Top-level

| Documento | Propósito |
|---|---|
| [../README.md](../README.md) | Overview del proyecto, stack, estructura |
| [../CLAUDE.md](../CLAUDE.md) | Reglas de comportamiento del agente |
| [../PENDIENTES.md](../PENDIENTES.md) | Pendientes activos |
| [../AUDITORIA_ARQUITECTONICA_2026-08-08.md](../AUDITORIA_ARQUITECTONICA_2026-08-08.md) | Estado arquitectónico vigente — mapa de sistema, hallazgos, roadmap técnico |
| [../AUDIT_REPORT.md](../AUDIT_REPORT.md) | Auditoría 2026-08-02 (landing, pliego, SECOP) |
| [../AUDITORIA_TECH_DEBT.md](../AUDITORIA_TECH_DEBT.md) | Auditoría 2026-07-18 (lint, deps, duplicación) |

## docs/adr/ — Decisiones arquitectónicas

- [ADR-0001](./adr/ADR-0001-fase-a-filtro-ingesta-vs-clasificacion.md) — filtro de ingesta vs. clasificación
- [ADR-0002](./adr/ADR-0002-deprecacion-dominio-septico.md) — deprecación del dominio séptico

## docs/fase-0/, fase-1/, fase-a/ — Historial de diseño

Specs y decisiones de diseño por fase del producto SECOP: modelo de datos,
ingesta, clasificación sectorial, matching y perfil de oferente.

## docs/secop/ — Casos de referencia

Fixtures y gate de calidad del extractor de pliegos (caso UAESP).

## docs/superpowers/ — Planes y specs de features

Historial de planes (`plans/`) y specs de diseño (`specs/`) de features
ya implementadas.

## docs/architecture/

Mapa de arquitectura generado (JSON/HTML) — complementario a
`AUDITORIA_ARQUITECTONICA_2026-08-08.md`, que es la referencia narrativa
vigente.
