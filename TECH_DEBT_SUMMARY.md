# HydroStack 2 — Resumen Ejecutivo (1 pág)

## 🎯 Estado Actual

| Métrica | Valor |
|---------|-------|
| **LOC Total** | 4,694 |
| **Components** | 5 (SepticTankCalculator = 1,102 LOC) |
| **APIs** | 3 endpoints |
| **Tests** | ❌ 0 |
| **TypeScript Coverage** | 50% (APIs ✓, Components ❌) |
| **Deuda Técnica** | 182 puntos |

---

## 🔴 CRÍTICOS (Fix ASAP)

### 1. SepticTankCalculator Monolito
- **Impacto:** Insostenible agregar nuevas calculadoras (Imhoff, UASB)
- **Causa:** 1,102 LOC = form + state + calc + diagrams + export
- **Fix:** Refactorizar en 4 componentes + 2 hooks (Semana 2)
- **Estimado:** 16h

### 2. Sin Tests
- **Impacto:** Refactoring = broken calculations sin saberlo
- **Causa:** Proyecto sin test suite
- **Fix:** Jest setup + 10 tests críticos (Semana 3)
- **Estimado:** 12h

### 3. Validación Débil en APIs
- **Impacto:** Valores inválidos → cálculos incorrectos
- **Causa:** No hay schema validation (Zod/Yup)
- **Fix:** Zod schema + API validation (Semana 1)
- **Estimado:** 6h

---

## 🟠 ALTOS (Próximas 4 semanas)

| Problema | Solución | Hrs |
|----------|----------|-----|
| **NORMS duplicados** (3 archivos) | Crear `norms.ts` centralizado | 4 |
| **API /chat sobrecargada** | Extraer `location.ts`, `normativa.ts`, `groq-client.ts` | 8 |
| **Catálogo hardcodeado** (323 LOC) | Modularizar por ruta (5 archivos) | 4 |
| **Babylon.js bundle** (8 MB) | Dynamic import + code splitting | 3 |

**Subtotal Semanas 1-4:** ~50h

---

## 🟡 MEDIOS (Backlog)

| Problema | Impacto | Costo |
|----------|---------|-------|
| Re-renders innecesarios | Mobile laggy | 6h |
| FormState desincronización | Estado inconsistente | 4h |
| Sin documentación API | Onboarding lento | 3h |
| TypeScript parcial | Type safety débil | 8h |

---

## 📊 Matriz de Decisiones

### "Debería refactorizar ahora?"
```
SI SI agregar nuevas calculadoras (Imhoff, UASB) este quarter
SI SI tienes 1-2 eng disponibles
SI SI presupuesto para 4 semanas
NO SI es "quick fix" solo esta calculadora
NO SI equipo < 2 personas
```

### "Por dónde empiezo?"
1. **Semana 1:** `norms.ts` + validación Zod
2. **Semana 2:** Extraer SepticForm + SepticResults
3. **Semana 3:** Tests mínimos
4. **Semana 4:** Optimización (memo, dynamic import)

---

## 📈 Timeline Estimado

| Fase | Duración | Deliverable |
|------|----------|-------------|
| **Stabilization** | Sem 1 | ✅ Validated APIs, norms.ts |
| **Refactoring** | Sem 2-3 | ✅ 4 componentes + tests |
| **Optimization** | Sem 4 | ✅ <1s TTI, memo'd components |
| **Launch** | Sem 5 | ✅ Ready for new calculators |

---

## 💡 Rápidas Ganancias (Hoy)

```bash
# 1. Crear norms.ts (copy-paste from SepticTankCalculator)
# → 30 min → reduce duplication

# 2. Add .env.example
# → 10 min → document env vars

# 3. Install Zod
npm install zod
# → 5 min → prepare for validation

# 4. Add jest.config.js
# → 15 min → test infrastructure

# Total: ~60 min setup, unblocks refactoring
```

---

## 🚀 Post-Refactoring Benefits

✅ **Agregar nueva calculadora** (Imhoff, UASB, etc.):
- Antes: ~80h (copy-paste SepticTankCalculator + debug)
- Después: ~20h (reutilizar hooks + norms + validación)

✅ **Cambiar parámetro normativo**:
- Antes: 3 archivos a actualizar
- Después: 1 lugar (norms.ts)

✅ **Refactoring sin romper**:
- Antes: ❌ No hay tests
- Después: ✅ 10+ test checks

---

## 📋 Decisión Final

**Recomendación:** ✅ **Hacer el refactoring ahora**

**Razones:**
1. Proyecto es escalable (roadmap: 5 calculadoras más)
2. Costo es amortizable (beneficio en próximas 2-3 calculadoras)
3. Deuda acumula rápido sin intervención
4. Timeline realista (4 semanas, 1-2 eng)

**Si NO refactorizas ahora:**
- Próxima calculadora será 2x más lenta de escribir
- Bugs en parámetros harán más daño
- Technical debt interest = más caro después

---

## 👤 Responsabilidades

| Rol | Tareas | Hrs |
|-----|--------|-----|
| **Eng 1** | norms.ts, hooks, tests | 25 |
| **Eng 2** | API refactoring, optimization | 25 |
| **QA** | Test suite review | 5 |

**Total:** 55h / 1.4 sprints (con pair programming)

---

**Próximo paso:** Revisar DIAGNOSTICO_ARQUITECTURA.md + REFACTORING_PLAN.md
