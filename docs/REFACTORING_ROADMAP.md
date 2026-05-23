# 🛣️ HydroStack Refactoring Roadmap

**Status:** Planning  
**Start Date:** TBD  
**Target Completion:** ~4–5 weeks (if 2 engineers full-time)

---

## At a Glance

```
CURRENT STATE (May 2026)
├─ 🔴 3 CRITICAL issues (duplicated logic, fragmented state, monolithic components)
├─ 🟠 6 HIGH priority issues (performance, error handling, maintainability)
├─ 🟡 5 MEDIUM priority issues (typing, documentation, testing)
└─ Technical Debt Score: 7/10 (needs urgent attention)

DESIRED STATE (After refactoring)
├─ ✅ Single source of truth for calculations
├─ ✅ Unified state management
├─ ✅ Modular, tested components
├─ ✅ Type-safe tool orchestration
├─ ✅ Easy to add new norms/features
└─ Technical Debt Score: 2/10 (healthy)
```

---

## Phase 1: Foundation (Week 1) — 🔴 CRITICAL Issues

### Goals
- Eliminate calculation duplication
- Unify state management
- Create normative registry

### Tasks

#### Week 1: Days 1–2 — Calculation Consolidation

**Task 1.1: Expand `septicTank.ts` to support all norms**
- [ ] Add `NORM_DEFAULTS: Record<Norm, NormDefaults>` with CTE, EPA, UK, AU, RAS
- [ ] Add temperature-aware `sludgeRate()` and `timeRetention()` functions
- [ ] Add `norm` parameter to `SepticTankInput`
- [ ] Refactor `calculateSepticTank()` to use norm-specific defaults
- [ ] Run existing tests (should all pass)
- **Owner:** Engineer A  
- **Effort:** 1.5 days  
- **PR:** `refactor/unified-calculation-engine`

**Task 1.2: Update `SepticTankCalculator.jsx` to use unified function**
- [ ] Remove `getParams()` function (~50 lines)
- [ ] Remove embedded calculation logic (~300 lines)
- [ ] Import `calculateSepticTank` from `septicTank.ts`
- [ ] Map UI inputs → `SepticTankInput` object
- [ ] Verify results match calculator expectations
- [ ] Add tests for mapping logic
- **Owner:** Engineer B  
- **Effort:** 1 day  
- **PR:** `refactor/calculator-use-unified-function`

**Task 1.3: Delete redundant calculation code**
- [ ] Clean up commented-out code
- [ ] Remove unused variables in Calculator
- [ ] Verify calculator size reduced by ~350 lines
- **Owner:** Engineer A  
- **Effort:** 0.5 days  
- **PR:** (merge with 1.2)

---

#### Week 1: Days 3–4 — Normative Registry

**Task 1.4: Create `NormativeRegistry.ts`**
- [ ] Create `src/lib/config/NormativeRegistry.ts`
- [ ] Migrate all norm definitions (CTE, EPA, UK, AU, RAS)
- [ ] Implement `detectNormFromText()`, `getNormative()`, `listNorms()`
- [ ] Add unit tests for registry
- **Owner:** Engineer A  
- **Effort:** 1.5 days  
- **PR:** `refactor/normative-registry`

**Task 1.5: Update all imports across codebase**
- [ ] Update `route.ts` — use `detectNormFromText()` instead of `detectLocation()`
- [ ] Update `SepticTankCalculator.jsx` — use `listNorms()` for dropdown
- [ ] Update `septicTank.ts` — use registry for defaults
- [ ] Update `calculateDrainageField.ts` — use registry if needed
- [ ] Verify all functionality intact
- **Owner:** Engineer B  
- **Effort:** 1 day  
- **PR:** `refactor/use-normative-registry`

---

#### Week 1: Days 5 — State Management

**Task 1.6: Create `StateManager.ts`**
- [ ] Implement `HydroStackState` interface
- [ ] Implement `HydroStackStateManager` class
- [ ] Add `hydrate()`, `save()`, `subscribe()` methods
- [ ] Implement type-safe setters (setUserProfile, updateOwnerPhase, etc.)
- [ ] Add tests for state manager
- **Owner:** Engineer A  
- **Effort:** 1.5 days  
- **PR:** `refactor/state-manager`

**Task 1.7: Create `useHydroStackState()` hook**
- [ ] Implement React hook for state management
- [ ] Add singleton instance handling
- [ ] Add subscription logic
- [ ] Test hook in isolation
- **Owner:** Engineer B  
- **Effort:** 0.5 days  
- **PR:** (merge with 1.6)

---

**Week 1 Summary:**
- ✅ All 🔴 CRITICAL issues addressed
- ✅ Foundation solid for Phase 2
- **Risk:** None (changes are additive, can run in parallel with old code)

---

## Phase 2: Component Refactoring (Week 2–3) — 🟠 HIGH Issues

### Goals
- Break monolithic components into smaller pieces
- Add component tests
- Improve performance (lazy load 3D, memoization)
- Fix error handling

### Tasks

#### Week 2: Days 1–3 — Split `SepticTankCalculator.jsx`

**Task 2.1: Extract `TankInputForm` component**
- [ ] Create `src/components/SepticTankCalculator/TankInputForm.jsx`
- [ ] Move input fields + validation to new component
- [ ] Memoize with `React.memo()` to prevent re-renders on output change
- [ ] Add PropTypes validation
- [ ] Add tests (input validation, onChange handlers)
- **Owner:** Engineer B  
- **Effort:** 1.5 days  
- **PR:** `refactor/extract-tank-input-form`

**Task 2.2: Extract `TankResultsDisplay` component**
- [ ] Create `src/components/SepticTankCalculator/TankResultsDisplay.jsx`
- [ ] Move results table + summary text to new component
- [ ] Memoize (only re-render if results change)
- [ ] Add tests (data formatting, edge cases)
- **Owner:** Engineer B  
- **Effort:** 1 day  
- **PR:** `refactor/extract-tank-results`

**Task 2.3: Lazy-load `IsometricDiagram3D`**
- [ ] Wrap 3D viewer in `Suspense` boundary
- [ ] Add tab selector (2D / 3D)
- [ ] Load Babylon.js only when tab selected
- [ ] Add loading indicator
- [ ] Measure performance improvement
- **Owner:** Engineer A  
- **Effort:** 1 day  
- **PR:** `perf/lazy-load-3d-diagram`

**Task 2.4: Add `useMemo` for expensive calculations**
- [ ] Identify all calculation paths in `SepticTankCalculator.jsx`
- [ ] Wrap with `useMemo()`
- [ ] Profile before/after to measure improvement
- **Owner:** Engineer A  
- **Effort:** 0.5 days  
- **PR:** `perf/memoize-calculations`

---

#### Week 2: Days 4–5 — Split `HydroAgent.jsx`

**Task 2.5: Extract `ChatMessagesContainer` component**
- [ ] Create `src/components/HydroAgent/ChatMessagesContainer.jsx`
- [ ] Move message rendering to new component
- [ ] Memoize (only re-render on new messages)
- [ ] Add tests
- **Owner:** Engineer A  
- **Effort:** 1 day  
- **PR:** `refactor/extract-chat-container`

**Task 2.6: Extract `ChatInputBar` component**
- [ ] Create `src/components/HydroAgent/ChatInputBar.jsx`
- [ ] Move input field + send button to new component
- [ ] Memoize (independent of message history)
- [ ] Add tests
- **Owner:** Engineer B  
- **Effort:** 0.5 days  
- **PR:** `refactor/extract-chat-input`

**Task 2.7: Extract `ChatStreamListener` hook**
- [ ] Create `src/components/HydroAgent/useChatStream.ts`
- [ ] Move SSE parsing + message buffering to hook
- [ ] Abstract streaming logic from UI
- [ ] Add tests for streaming logic
- **Owner:** Engineer A  
- **Effort:** 1 day  
- **PR:** `refactor/extract-stream-listener`

---

#### Week 3: Days 1–2 — Component Tests

**Task 2.8: Add tests for `TankInputForm`**
- [ ] Test input validation (min/max ranges)
- [ ] Test onChange handlers
- [ ] Test disabled states
- [ ] Coverage: >80%
- **Owner:** Engineer B  
- **Effort:** 1 day  
- **PR:** (with Task 2.1)

**Task 2.9: Add tests for `ChatMessagesContainer`**
- [ ] Test message rendering (text, markdown, tool results)
- [ ] Test auto-scroll behavior
- [ ] Test error state rendering
- [ ] Coverage: >80%
- **Owner:** Engineer A  
- **Effort:** 1 day  
- **PR:** (with Task 2.5)

**Task 2.10: Add integration tests for calculator**
- [ ] Test full calculation flow (input → compute → display)
- [ ] Test multiple norms produce consistent results
- [ ] Test error cases (invalid input)
- [ ] Coverage: >70%
- **Owner:** Engineer B  
- **Effort:** 1.5 days  
- **PR:** `test/calculator-integration`

---

#### Week 3: Days 3–5 — Error Handling & Polish

**Task 2.11: Improve tool error messages**
- [ ] Add `ToolResult` union type (success | error)
- [ ] Surface tool errors to chat UI
- [ ] Add retry button for failed tools
- [ ] Test error paths
- **Owner:** Engineer A  
- **Effort:** 1 day  
- **PR:** `fix/tool-error-handling`

**Task 2.12: Add rate-limit progress feedback**
- [ ] Send status messages during retries
- [ ] Display countdown timer
- [ ] Allow user to cancel
- **Owner:** Engineer B  
- **Effort:** 0.5 days  
- **PR:** `ux/rate-limit-feedback`

**Task 2.13: Consolidate i18n strings**
- [ ] Ensure all error messages are translated
- [ ] Review i18n coverage
- [ ] Add missing translations
- **Owner:** Engineer B  
- **Effort:** 0.5 days  
- **PR:** `i18n/consolidate-strings`

---

**Phase 2 Summary:**
- ✅ Monolithic components split into smaller pieces
- ✅ Performance improved (lazy-loading, memoization)
- ✅ Error handling improved
- ✅ Component test coverage >70%

---

## Phase 3: Polish & Documentation (Week 4)

### Goals
- Complete architecture documentation
- Add tool typing
- Add observability/logging
- Create debugging guide

### Tasks

#### Week 4: Days 1–2 — Tool Typing

**Task 3.1: Create typed tool registry**
- [ ] Create `src/lib/agent/tools/toolRegistry.ts`
- [ ] Migrate all tool definitions to registry
- [ ] Add Zod schemas for input validation
- [ ] Update `route.ts` to use typed registry
- [ ] Add tests for tool registry
- **Owner:** Engineer A  
- **Effort:** 1.5 days  
- **PR:** `refactor/typed-tool-registry`

---

#### Week 4: Days 3–4 — Documentation

**Task 3.2: Complete ARCHITECTURE.md**
- [ ] Complete Section 3 (Data Flow)
- [ ] Add state machine diagram (Mermaid)
- [ ] Add tool chaining diagram
- [ ] Add error recovery paths
- **Owner:** Engineer B  
- **Effort:** 1 day  
- **PR:** `docs/complete-architecture`

**Task 3.3: Create DEBUGGING.md**
- [ ] Add tool failure troubleshooting
- [ ] Add state inspection guide
- [ ] Add common error patterns + solutions
- [ ] Add performance profiling tips
- **Owner:** Engineer A  
- **Effort:** 0.5 days  
- **PR:** `docs/debugging-guide`

**Task 3.4: Add JSDoc to critical functions**
- [ ] Document all pure calculation functions
- [ ] Document tool execution pipeline
- [ ] Document state manager API
- **Owner:** Engineer B  
- **Effort:** 0.5 days  
- **PR:** `docs/add-jsdoc`

---

#### Week 4: Day 5 — Polish

**Task 3.5: Performance audit**
- [ ] Profile app with Chrome DevTools
- [ ] Check bundle size (target: <500KB)
- [ ] Check LCP (target: <2s)
- [ ] Check Groq API latency
- [ ] Document findings
- **Owner:** Engineer A  
- **Effort:** 0.5 days  
- **PR:** `perf/audit-results`

**Task 3.6: Code quality checks**
- [ ] Run linter on all files
- [ ] Run type checker (`tsc`)
- [ ] Run tests (target: >80% coverage)
- [ ] Code review checklist
- **Owner:** Engineer B  
- **Effort:** 0.5 days  
- **PR:** (no PR, just checks)

---

**Phase 3 Summary:**
- ✅ All critical documentation complete
- ✅ Tool typing secure and validated
- ✅ Code quality baseline established

---

## Timeline & Allocation

### Full-Time Refactoring (2 Engineers)

```
Week 1 (May 27 – Jun 2)
├─ Mon-Tue: Task 1.1 + 1.2 (Calculation consolidation)
├─ Wed: Task 1.3 (Cleanup)
├─ Wed-Thu: Task 1.4 + 1.5 (Normative registry)
└─ Fri: Task 1.6 + 1.7 (State manager)

Week 2 (Jun 3 – Jun 9)
├─ Mon-Wed: Task 2.1 + 2.2 + 2.3 + 2.4 (Calculator split + perf)
├─ Thu-Fri: Task 2.5 + 2.6 + 2.7 (Agent split)

Week 3 (Jun 10 – Jun 16)
├─ Mon-Tue: Task 2.8 + 2.9 + 2.10 (Component tests)
├─ Wed-Fri: Task 2.11 + 2.12 + 2.13 (Error handling + i18n)

Week 4 (Jun 17 – Jun 20, 4 days)
├─ Mon-Tue: Task 3.1 (Tool typing)
├─ Wed-Thu: Task 3.2 + 3.3 + 3.4 (Documentation)
└─ Fri: Task 3.5 + 3.6 (Polish + QA)
```

### Part-Time Refactoring (1 Engineer, 20h/week)

**Timeline:** 8–10 weeks (same tasks, staggered)

---

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Breaking changes** | High | Use feature branches; test thoroughly before merge |
| **Performance regression** | Medium | Profile before/after; run load tests |
| **Merge conflicts** | Medium | Split work across files; merge frequently (daily) |
| **Scope creep** | Medium | Strict task boundaries; defer nice-to-haves to Phase 4 |
| **Knowledge gap** | Low | Code review each PR; pair programming for complex tasks |

---

## Success Criteria

After refactoring:

- [ ] **Code Quality**
  - [ ] Calculation logic: 1 source (not 3)
  - [ ] State management: 1 system (not 4)
  - [ ] Component sizes: <500 lines each
  - [ ] Test coverage: >80% on core modules

- [ ] **Performance**
  - [ ] Initial load: <3 seconds
  - [ ] Calculator render: <500ms on input change
  - [ ] 3D diagram: Lazy-loaded (optional)

- [ ] **Maintainability**
  - [ ] Adding new norm: 1 file change (registry entry)
  - [ ] Adding new tool: Clear pattern to follow
  - [ ] Debugging tool failures: Clear error messages

- [ ] **Documentation**
  - [ ] ARCHITECTURE.md: Complete + diagrams
  - [ ] DEBUGGING.md: Created + comprehensive
  - [ ] JSDoc: All public functions documented

---

## Parallel Work

While Phase 1–4 run, consider:

1. **User Research** — Collect feedback on UX/features
2. **Spike on Mobile Support** — Test calculator on iOS/Android
3. **Database Integration** — Plan for session persistence (Phase 5?)
4. **i18n Expansion** — Add more languages (PT, FR, IT)?

---

## Post-Refactoring: Backlog for Phase 5+

Once technical debt cleared, prioritize:

- [ ] Session/report persistence (database)
- [ ] User accounts + saved calculations
- [ ] Mobile app (React Native?)
- [ ] Advanced features (multi-system designs, cost estimates)
- [ ] Integration with real soil testing services
- [ ] Export to CAD formats

---

## Measuring Success

**Before Refactoring:**
```
Lines of Code (LoC): 6500
Monolithic Components: 2 (>800 LoC each)
Calculation Sources: 3
Test Coverage: 45%
Type Safety: 60% (any types)
```

**After Refactoring (Target):**
```
Lines of Code: 6200 (removed duplication)
Monolithic Components: 0 (all <500 LoC)
Calculation Sources: 1
Test Coverage: 82%
Type Safety: 95% (strict mode)
```

---

## Approval & Signoff

- [ ] Reviewed by: ________________
- [ ] Approved by: ________________
- [ ] Date: ________________

