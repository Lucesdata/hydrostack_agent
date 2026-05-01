# Estado del Proyecto HydroStack 2 — Resumen Ejecutivo

**Fecha:** 2026-05-01 | **Status:** 🟠 Fragmentado, necesita unificación

---

## 🎯 Situación Actual

### Estructura

```
❌ FRAGMENTADA EN 4 CARPETAS RAÍZ

hydrostack-2/
├── app/             ← Next.js App Router (correcto uso)
│   ├── api/         ← APIs (✅ TypeScript)
│   ├── calculators/ ← Pages
│   └── chat/        ← Pages
│
├── components/      ← React components (❌ monolito SepticTankCalculator)
│   └── SepticTankCalculator.jsx (1,102 LOC)
│
├── lib/             ← 🔴 CONFLICTO: Solo i18n.js
│   └── i18n.js
│
├── src/             ← 🔴 CONFLICTO: Lógica de agent
│   └── lib/
│       └── agent/
│           ├── filter.ts
│           └── catalog.ts
│
└── docs/            ← Normativa (correcto)
```

**Problema clave:** Dos carpetas `lib/` y `src/lib/` en conflicto

---

## 📊 Métricas Actuales

| Métrica | Valor | Estado |
|---------|-------|--------|
| **LOC Total** | 4,694 | ⚠️ Bajo |
| **Componentes** | 5 | ⚠️ Muy pocos |
| **SepticTankCalculator** | 1,102 LOC | 🔴 MONOLITO |
| **TypeScript Coverage** | 50% | 🟡 Parcial |
| **Tests** | 0 | 🔴 Ninguno |
| **Carpetas raíz** | 4 (app, components, lib, src) | 🔴 Fragmentado |

---

## 🔴 Problemas Críticos

### 1. Proyecto Fragmentado

```
Debería ser:  src/lib/  src/hooks/  src/components/
Es ahora:     lib/      MISSING     components/
              src/lib/                SepticTankCalculator.jsx (1,102 LOC)
```

**Impacto:** Confusión de dónde agregar código nuevo

### 2. Monolito SepticTankCalculator

```
1,102 líneas en UN archivo que contiene:
- Form inputs (200 LOC)
- Validation logic (80 LOC)
- Calculation logic (150 LOC)
- SVG diagram (400 LOC)
- PDF export (70 LOC)
- State management (100 LOC)

❌ Imposible refactorizar
❌ Imposible testear
❌ Imposible reutilizar
```

### 3. Sin Tests

```
0 test files encontrados
= Sin red de seguridad para refactoring
= Bugs no detectados
= Cambios = riesgo alto
```

---

## 📈 Impacto en Desarrollo

### Agregar Nueva Calculadora (Imhoff Tank)

**Hoy (Fragmentado):**
```
1. Copy SepticTankCalculator.jsx
2. Search-replace NORMS → IMHOFF_NORMS
3. Debug cálculos (¿dónde está el error?)
4. Duplicar parámetros en 3 lugares
5. Monolito se vuelve 2,200 LOC
⏱️ 80–100 horas
❌ Propenso a errores
```

**Después (Unificado):**
```
1. Crear src/lib/norms.ts con Imhoff params
2. Crear hooks/useCalcImhoff.ts (reutiliza patrón)
3. Crear components/ImhoffTank/ImhoffForm.tsx
4. Todo testeable y reutilizable
⏱️ 20–25 horas
✅ Consistente, sin duplicación
```

---

## 🛠️ Qué Hay que Hacer

### INMEDIATO (Esta Semana)

```
1️⃣ Crear estructura src/
   mkdir -p src/{lib,hooks,components,types,utils,__tests__}
   
2️⃣ Crear src/lib/norms.ts
   Centralizar parámetros normativos
   
3️⃣ Crear src/hooks/useCalcNorm.ts
   Lógica de cálculo + state management
   
4️⃣ Convertir app/*.js → app/*.tsx
   app/page.tsx, app/layout.tsx, etc.
   
⏱️ ~13 horas (2 días intensivos)
```

### DESPUÉS (Semana 2-3)

```
5️⃣ Refactorizar SepticTankCalculator
   De 1,102 → 200 LOC (orchestrator)
   
6️⃣ Extraer SepticForm, SepticResults, SepticDiagrams
   Componentes especializados
   
7️⃣ Setup Testing (Jest + tests básicos)
   10+ test cases para norms
   
8️⃣ Documentar API y arquitectura
```

---

## 📋 Roadmap Unificación

```
SEMANA 1: ESTRUCTURA UNIFICADA
┌─ Día 1 ─────────────────────────┐
│ □ Crear src/ con subdirectorios │
│ □ Crear src/lib/norms.ts        │
│ □ Crear src/hooks/useCalcNorm   │
│ □ Convertir app/*.js → .tsx     │
│ Estimado: 13h                   │
└─────────────────────────────────┘
           ↓ Tests pass
           
SEMANA 2: COMPONENTES REFACTORIZADOS
┌─ Días 2-3 ──────────────────────┐
│ □ Extraer SepticForm.tsx        │
│ □ Extraer SepticResults.tsx     │
│ □ Simplificar SepticTankCalc    │
│ Estimado: 16h                   │
└─────────────────────────────────┘
           ↓ npm run dev works
           
SEMANA 3: TESTING + DOCS
┌─ Día 4 ──────────────────────────┐
│ □ Setup Jest                     │
│ □ norms.test.ts                  │
│ □ useCalcNorm.test.ts            │
│ □ API.md, ARCHITECTURE.md        │
│ Estimado: 12h                    │
└─────────────────────────────────┘
           ↓ npm test passes
```

---

## 💰 ROI (Return on Investment)

### Costo de Unificación

```
13 horas (Semana 1) = Estructura
16 horas (Semana 2) = Refactoring
12 horas (Semana 3) = Testing

TOTAL: ~40 horas (1 sprint)
```

### Beneficio

```
Cada nueva calculadora (Imhoff, UASB, etc.):
- Sin unificación: 80 horas × 5 calc = 400 horas
- Con unificación: 20 horas × 5 calc = 100 horas

AHORRO: 300 horas (7.5 semanas)
PAYOFF: Después de 2 nuevas calculadoras
```

---

## ✅ Objetivo Final

```
ANTES (Fragmentado):
hydrostack-2/
├── app/          ← Pages + API
├── components/   ← Monolito (1,102 LOC)
├── lib/          ← i18n.js solo
├── src/lib/      ← agent/ lógica
└── docs/

DESPUÉS (Unificado):
hydrostack-2/
├── src/
│  ├── lib/       ← Toda la lógica (norms, agent, utils)
│  ├── hooks/     ← Hooks reutilizables
│  ├── components/← UI organizado por feature
│  ├── types/     ← TypeScript types
│  ├── utils/     ← Helpers puros
│  └── __tests__/ ← Tests
│
├── app/          ← Pages + API (Next.js)
├── docs/
└── [config files]

RESULTADO:
✅ Estructura única y clara
✅ 100% TypeScript
✅ Escalable a 5+ calculadoras
✅ Testeable y mantenible
```

---

## 🎯 Decisión Recomendada

### Opción A: ✅ HACER LA UNIFICACIÓN AHORA

**Pros:**
- Costo bajo (40h)
- Beneficio alto (300h ahorrados)
- Escalabilidad para 5+ calculadoras
- ROI positivo después de 2 calculadoras

**Cons:**
- 1 sprint sin nuevas features
- Refactoring requiere cuidado (pero bajo riesgo)

### Opción B: ❌ NO HACER (Mantener fragmentado)

**Pros:**
- Nada cambio esta semana

**Cons:**
- Deuda técnica acumula
- Próxima calculadora = 80-100h
- Bugs en parámetros (2 lugares para actualizar)
- Insostenible después de 2-3 calculadoras

---

## 📄 Documentación Entregada

Creé 7 documentos detallados en la raíz del proyecto:

```
📋 DIAGNOSTICO_ARQUITECTURA.md
   ↳ Análisis profundo, 6 problemas identificados, scoring deuda técnica

📋 REFACTORING_PLAN.md
   ↳ Código listo para copiar-pegar, ejemplos concretos

📋 TECH_DEBT_SUMMARY.md
   ↳ 1 pág ejecutiva, 3 problemas críticos, matriz decisión

📋 ARCHITECTURE_BEFORE_AFTER.md
   ↳ Visual: arquitectura actual vs propuesta

📋 ESTRUCTURA_PROYECTO_UNIFICADA.md
   ↳ Estructura detallada del proyecto unificado

📋 UNIFICACION_PASO_A_PASO.md
   ↳ GUÍA EJECUTABLE: paso a paso para unificar (13h)

📋 ESTADO_DEL_PROYECTO.md
   ↳ Este documento (resumen ejecutivo)
```

---

## 🚀 Próximos Pasos

### Si decides hacer la unificación:

1. **Lee:** `UNIFICACION_PASO_A_PASO.md`
2. **Ejecuta:** Los pasos (Paso 1 → Paso 10)
3. **Verifica:** Checklist al final
4. **Resultado:** Proyecto unificado, listo para escalar

### Si prefieres solo el diagnóstico:

- `DIAGNOSTICO_ARQUITECTURA.md` → Análisis completo
- `TECH_DEBT_SUMMARY.md` → Decisión rápida

---

## 📞 Contacto / Preguntas

```
Q: ¿Rompería las pages existentes?
A: No. Cambios son en estructura. Funcionalidad = igual.

Q: ¿Cuánto tiempo sin poder hacer deploy?
A: 13 horas de desarrollo. Deploable en cualquier momento 
   durante refactoring (cambios son gradualess).

Q: ¿Puedo parar a mitad del proceso?
A: Sí. Cada paso es independiente. Pero para máximo valor,
   completa hasta Paso 5 (estructura + hooks).

Q: ¿Necesito TypeScript para esto?
A: No, pero lo recomendamos. Archivos pueden ser .jsx
   (JavaScript) si prefieres. Pero tipo safety es mejor.
```

---

**Status:** 🟠 Fragmentado, pero **recuperable en 1 sprint**

**Recomendación:** ✅ Hacer la unificación ahora

**Duración:** ~40 horas (1-2 semanas)

**Impacto:** 10x más fácil agregar nuevas calculadoras

