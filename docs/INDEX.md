# 📚 Índice de documentación — AquaLicita

AquaLicita es una plataforma de inteligencia para contratación pública en
agua y saneamiento (SECOP II). Ver
[ADR-0002](./adr/ADR-0002-deprecacion-dominio-septico.md) sobre la
deprecación del dominio séptico anterior.

> **Nota de marca (2026-08-26).** El producto se llamaba **HydroStack** hasta
> el 2026-08-26. Los documentos con fecha anterior conservan el nombre viejo a
> propósito: son registros históricos (ADRs, auditorías, cierres de fase,
> planes y specs ya ejecutados) y reescribirlos falsearía lo que se decidió en
> su momento. Donde leas "HydroStack" en un documento fechado antes de esa
> fecha, entiende "AquaLicita". Los documentos vivos —README, CLAUDE.md,
> PENDIENTES.md, este índice y `docs/fase-b/`— sí usan el nombre nuevo.

## Top-level

| Documento | Propósito |
|---|---|
| [../README.md](../README.md) | Overview del proyecto, stack, estructura |
| [../CLAUDE.md](../CLAUDE.md) | Reglas de comportamiento del agente |
| [../PENDIENTES.md](../PENDIENTES.md) | Pendientes activos |
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

Mapa de arquitectura generado (JSON/HTML).

- [agenthydro-etapas-gates.md](./architecture/agenthydro-etapas-gates.md) — mapeo del vocabulario de etapas/gates de un prompt de AgentHydro externo a la arquitectura real (qué ya existe, qué no, qué está desactualizado)
