# 📚 HydroStack Documentation Index

**Complete guide to all HydroStack documentation.**

---

## 🚀 Quick Links

| Need | Document |
|------|----------|
| **Getting started in 5 min** | [../GETTING_STARTED.md](../GETTING_STARTED.md) |
| **Project overview** | [../README.md](../README.md) |
| **AI agent behavior** | [../CLAUDE.md](../CLAUDE.md) |
| **Architecture & design** | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **3D diagram usage** | [DIAGRAMS_3D.md](./DIAGRAMS_3D.md) |
| **Developer guide** | [DEVELOPERS.md](./DEVELOPERS.md) |
| **Feature overview** | [FEATURES.md](./FEATURES.md) |
| **API reference** | [api/](./api/) |
| **Agent technical docs** | [agent/](./agent/) |
| **Standards by country** | [normativa/](./normativa/) |

---

## 📖 Documentation by Topic

### 👤 For Users

Start here if you want to **use HydroStack** (calculate septic systems, generate diagrams):

1. **[../GETTING_STARTED.md](../GETTING_STARTED.md)** (5 min read)
   - Install & first run
   - Try the calculator
   - Generate 3D diagrams

2. **[DIAGRAMS_3D.md](./DIAGRAMS_3D.md)** (10 min read)
   - How to use 3D diagrams
   - SVG vs. Image modes
   - Export options
   - Customization

3. **[FEATURES.md](./FEATURES.md)** (15 min read)
   - All features explained
   - Supported standards
   - Calculations included
   - Limitations & tips

---

### 👨‍💻 For Developers

Start here if you want to **extend or modify HydroStack**:

1. **[../README.md](../README.md)** (15 min read)
   - Project structure
   - Technology stack
   - Development setup
   - How to add a new calculator

2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** (20 min read)
   - System design
   - Data flow
   - Component hierarchy
   - Calculation pipeline
   - Performance considerations

3. **[DEVELOPERS.md](./DEVELOPERS.md)** (30 min read)
   - Code organization
   - Component patterns
   - Adding features
   - Testing strategy
   - Common tasks

4. **[api/](./api/)** (20 min read)
   - API endpoints
   - Request/response formats
   - Authentication
   - Rate limiting

---

### 🤖 For AI Agent Development

Understand the **AI agent behavior, auto-detection, and personalization**:

1. **[../CLAUDE.md](../CLAUDE.md)** (Required reading)
   - Agent behavior rules
   - User interaction patterns
   - Language detection
   - Profile detection (owner/professional/contractor)
   - Scenario auto-detection

2. **[agent/](./agent/)** (Technical reference)
   - Auto-detection implementation
   - State persistence
   - Orientation guidance logic
   - Country-specific rules

---

### ⚖️ Standards & Regulations

Learn what **standards are supported and when to use them**:

- **[normativa/](./normativa/)**
  - `cte-hs5.md` — Spain (CTE DB-HS 5)
  - `epa-onsite.md` — USA (EPA Guidelines)
  - `ras-2000.md` — Colombia (RAS 2000)
  - `as-nzs-1547.md` — Australia/NZ
  - `uk-building-regs.md` — UK Building Regulations
  - `en-12566-1.md` — European Standard

---

## 🎯 Learning Paths

### Path 1: User (5-30 minutes)
```
GETTING_STARTED.md
  ↓
DIAGRAMS_3D.md
  ↓
FEATURES.md
  ↓
normativa/ [if needed]
```

### Path 2: Developer (1-2 hours)
```
README.md
  ↓
ARCHITECTURE.md
  ↓
DEVELOPERS.md
  ↓
code exploration [src/lib/calculations/]
```

### Path 3: Agent Development (2-3 hours)
```
CLAUDE.md
  ↓
GETTING_STARTED.md [run locally]
  ↓
agent/ [technical docs]
  ↓
code exploration [src/lib/agent/]
```

### Path 4: Full Stack (3-4 hours)
```
README.md
  ↓
GETTING_STARTED.md
  ↓
ARCHITECTURE.md
  ↓
DEVELOPERS.md
  ↓
FEATURES.md + agent/ [parallel reading]
  ↓
Code exploration in src/
```

---

## 📋 File Descriptions

### Top-Level Documents

| File | Purpose | Audience | Time |
|------|---------|----------|------|
| [README.md](../README.md) | Project overview & structure | Everyone | 15 min |
| [GETTING_STARTED.md](../GETTING_STARTED.md) | Installation & first run | Everyone | 5 min |
| [CLAUDE.md](../CLAUDE.md) | AI agent rules | Agent devs | 10 min |

### docs/ Documents

| File | Purpose | Audience | Time |
|------|---------|----------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design | Developers | 20 min |
| [DEVELOPERS.md](./DEVELOPERS.md) | Developer guide | Developers | 30 min |
| [FEATURES.md](./FEATURES.md) | Feature list | Everyone | 15 min |
| [DIAGRAMS_3D.md](./DIAGRAMS_3D.md) | 3D diagram guide | Users | 10 min |

### docs/agent/ Documents

| File | Purpose | Audience |
|------|---------|----------|
| `subscenario-detection.md` | How auto-detection works | Agent devs |
| `state-persistence.md` | How state is maintained | Agent devs |
| `orientation-logic.md` | Guidance generation | Agent devs |
| `language-detection.md` | Multi-language support | Agent devs |

### docs/api/ Documents

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `POST /api/chat` | Chat with AI agent | User queries |
| `GET /api/agent/suggest` | Get next steps | Agent suggestions |
| `POST /api/generate-isometric` | Generate 3D diagrams | Image generation |

### docs/normativa/ Documents

| Document | Country | Standard |
|----------|---------|----------|
| `cte-hs5.md` | Spain | Building Code HS-5 |
| `epa-onsite.md` | USA | EPA On-Site Guidelines |
| `ras-2000.md` | Colombia | Reglamento Técnico |
| `as-nzs-1547.md` | Australia/NZ | Design Standard |
| `uk-building-regs.md` | UK | Building Regulations |
| `en-12566-1.md` | Europe | European Standard |

---

## 🔍 Find Documentation By Topic

### Calculations & Engineering
- [FEATURES.md](./FEATURES.md) — What calculations are included
- [ARCHITECTURE.md](./ARCHITECTURE.md) → "Calculation Pipeline" section
- [normativa/](./normativa/) — Standards details
- `src/lib/calculations/` — Code (see [DEVELOPERS.md](./DEVELOPERS.md))

### 3D Diagrams & Visualization
- [DIAGRAMS_3D.md](./DIAGRAMS_3D.md) — How to use
- [DEVELOPERS.md](./DEVELOPERS.md) → "3D Isometric Diagrams" section
- `src/components/IsometricDiagram.tsx` — Component code

### AI Agent & Chatbot
- [../CLAUDE.md](../CLAUDE.md) — Agent behavior
- [agent/](./agent/) — Technical implementation
- [DEVELOPERS.md](./DEVELOPERS.md) → "Agent Integration" section
- `src/lib/agent/` — Agent code

### Multi-Language Support
- [../CLAUDE.md](../CLAUDE.md) → "Language Detection" section
- [agent/](./agent/) → "language-detection.md"
- `src/lib/i18n.tsx` — Translations

### Deployment & Infrastructure
- [../README.md](../README.md) → "Deployment" section
- [DEVELOPERS.md](./DEVELOPERS.md) → "Build & Deploy" section
- Vercel configuration (automatic)

### Testing & Quality
- [DEVELOPERS.md](./DEVELOPERS.md) → "Testing" section
- `__tests__/` — Test files
- `vitest.config.ts` — Test config

---

## 📞 Getting Help

### "I want to..."

| Goal | Start With |
|------|-----------|
| Use the calculator | [GETTING_STARTED.md](../GETTING_STARTED.md) |
| Customize the UI | [DEVELOPERS.md](./DEVELOPERS.md) |
| Change a formula | [FEATURES.md](./FEATURES.md) + [DEVELOPERS.md](./DEVELOPERS.md) |
| Add a new calculator | [README.md](../README.md) → "Adding a New Calculator" |
| Modify agent behavior | [../CLAUDE.md](../CLAUDE.md) + [agent/](./agent/) |
| Deploy to production | [../README.md](../README.md) → "Deployment" |
| Understand architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Find an API endpoint | [api/](./api/) |
| Check a calculation | [FEATURES.md](./FEATURES.md) + [normativa/](./normativa/) |

---

## 🗂️ Documentation Structure

```
├── README.md                      # Project overview
├── GETTING_STARTED.md             # Quick start
├── CLAUDE.md                      # Agent rules
│
├── docs/
│   ├── INDEX.md                   # This file
│   ├── ARCHITECTURE.md            # System design
│   ├── DEVELOPERS.md              # Developer guide
│   ├── FEATURES.md                # Feature list
│   ├── DIAGRAMS_3D.md             # Diagram usage
│   ├── agent/                     # Agent technical docs
│   │   ├── subscenario-detection.md
│   │   ├── state-persistence.md
│   │   ├── orientation-logic.md
│   │   └── language-detection.md
│   ├── api/                       # API docs
│   │   ├── chat.md
│   │   ├── agent.md
│   │   └── generate-isometric.md
│   └── normativa/                 # Standards
│       ├── cte-hs5.md
│       ├── epa-onsite.md
│       ├── ras-2000.md
│       ├── as-nzs-1547.md
│       ├── uk-building-regs.md
│       └── en-12566-1.md
```

---

## 📝 How to Use This Index

1. **New to HydroStack?** Start with [GETTING_STARTED.md](../GETTING_STARTED.md)
2. **Want to use it?** Read [DIAGRAMS_3D.md](./DIAGRAMS_3D.md) + [FEATURES.md](./FEATURES.md)
3. **Want to develop it?** Read [ARCHITECTURE.md](./ARCHITECTURE.md) + [DEVELOPERS.md](./DEVELOPERS.md)
4. **Want to modify agent?** Read [../CLAUDE.md](../CLAUDE.md) + [agent/](./agent/)
5. **Need specific standard?** Check [normativa/](./normativa/)
6. **Need API docs?** Check [api/](./api/)

---

## 🎯 Quick Reference

| Question | Answer |
|----------|--------|
| Where do I start? | [GETTING_STARTED.md](../GETTING_STARTED.md) |
| How does the app work? | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| How do I code something? | [DEVELOPERS.md](./DEVELOPERS.md) |
| What features exist? | [FEATURES.md](./FEATURES.md) |
| How do 3D diagrams work? | [DIAGRAMS_3D.md](./DIAGRAMS_3D.md) |
| Where's the API? | [api/](./api/) |
| What standards? | [normativa/](./normativa/) |
| Where's the code? | `src/` (see [DEVELOPERS.md](./DEVELOPERS.md)) |

---

**Last Updated:** May 2026  
**Maintained by:** HydroStack Team
