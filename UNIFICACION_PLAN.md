# Plan de Unificación — Hydrostack 2

**Objetivo:** Consolidar estructura, documentación, código y configuración en un proyecto coherente y mantenible.

**Fecha:** 2026-05-20  
**Estado:** EN EJECUCIÓN

---

## 📊 Estado Actual

### Documentación Fragmentada (Raíz)
- `README.md` — Genérico, desactualizado
- `CLAUDE.md` — Instrucciones del agente ✅
- `DEVELOPERS_ISOMETRIC.md` — Guía de integración
- `DIAGRAMA_3D_GUIDE.md` — Guía de usuario
- `IMPLEMENTATION_CHECKLIST.md` — Checklist completado
- `ISOMETRIC_IMPLEMENTATION_SUMMARY.md` — Resumen técnico
- `QUICK_REFERENCE.md` — Referencia rápida

### Documentación en `docs/`
- `AUTO_DETECTION_IMPLEMENTATION.md` — Implementación técnica
- `OWNER_STATE_PERSISTENCE.md` — Persistencia de estado
- `orientation-guidance.md` — Guía de orientación
- `orientation-guidance-compact.md` — Versión compacta
- `agent/` — Documentación del agente
- `normativa/` — Normativas por país

### Código
- `src/lib/agent/` — Lógica del agente
- `app/api/` — Rutas API
- `components/` — Componentes React
- `lib/` — Utilidades generales

### Configuración
- `.env.local` — Variables de entorno
- `tsconfig.json`, `jsconfig.json` — Config TypeScript
- `.claude/settings.local.json` — Configuración local

### Memoria del Proyecto
- `.claude/projects/.../memory/MEMORY.md` — Memory indexado

---

## 🎯 Estructura Objetivo

```
hydrostack-2/
├── README.md                           # ← NUEVO: Punto de entrada único
├── CLAUDE.md                           # Instrucciones del agente (MANTENER)
├── GETTING_STARTED.md                  # ← NUEVO: Guía de inicio rápido
│
├── docs/
│   ├── index.md                        # ← NUEVO: Índice de documentación
│   ├── ARCHITECTURE.md                 # ← NUEVO: Arquitectura del proyecto
│   ├── AGENT.md                        # Consolidado: comportamiento del agente
│   ├── DIAGRAMS_3D.md                  # Consolidado: guía de diagramas
│   ├── DEVELOPERS.md                   # Consolidado: guía para desarrolladores
│   ├── FEATURES.md                     # ← NUEVO: Características implementadas
│   ├── agent/                          # Docs técnicas del agente
│   ├── normativa/                      # Normativas por país (MANTENER)
│   └── api/                            # ← NUEVO: Documentación de API
│
├── src/
│   ├── lib/
│   │   ├── agent/
│   │   ├── calculations/
│   │   └── validation/
│   ├── components/
│   │   ├── HydroAgent/
│   │   └── Calculators/
│   └── __tests__/
│
├── .claude/
│   ├── memory/                         # Memory actualizada y consolidada
│   └── settings.local.json
│
└── [config files]
```

---

## 📋 Tareas de Ejecución

### FASE 1: Consolidación de Documentación (Raíz)
- [ ] 1.1 Leer y analizar cada `.md` de raíz
- [ ] 1.2 Identificar contenido redundante
- [ ] 1.3 Crear nuevo `README.md` unificado
- [ ] 1.4 Crear `GETTING_STARTED.md`

### FASE 2: Reorganización de Documentación (docs/)
- [ ] 2.1 Crear `docs/index.md`
- [ ] 2.2 Consolidar guías isométricas → `docs/DIAGRAMS_3D.md`
- [ ] 2.3 Consolidar guías de desarrollo → `docs/DEVELOPERS.md`
- [ ] 2.4 Consolidar guías del agente → `docs/AGENT.md`
- [ ] 2.5 Crear `docs/ARCHITECTURE.md`
- [ ] 2.6 Crear `docs/FEATURES.md`
- [ ] 2.7 Crear `docs/api/` con documentación de endpoints

### FASE 3: Revisión de Código
- [ ] 3.1 Auditar `src/lib/agent/`
- [ ] 3.2 Auditar `app/api/`
- [ ] 3.3 Auditar `components/`
- [ ] 3.4 Verificar consistencia de estilos y patrones

### FASE 4: Unificación de Configuración
- [ ] 4.1 Revisar `.env.local` y `.env.example`
- [ ] 4.2 Revisar `tsconfig.json` / `jsconfig.json`
- [ ] 4.3 Revisar `.claude/settings.local.json`
- [ ] 4.4 Actualizar `.claude/launch.json` si es necesario

### FASE 5: Actualización de Memoria
- [ ] 5.1 Consolidar `MEMORY.md`
- [ ] 5.2 Limpiar entradas obsoletas
- [ ] 5.3 Agregar referencias a nueva documentación

### FASE 6: Limpieza Final
- [ ] 6.1 Eliminar archivos duplicados de raíz
- [ ] 6.2 Ejecutar tests si existen
- [ ] 6.3 Verificar que el proyecto compila
- [ ] 6.4 Crear commit unificación

---

## 🔄 Progreso

**Iniciado:** 2026-05-20  
**Completado:** [Pendiente]

Tareas completadas: 0 / 25
