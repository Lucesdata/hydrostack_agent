# 🌊 HydroStack — Water & Sanitation Engineering Tools

**Professional calculation and design tools for wastewater treatment systems. Now with AI-powered guidance and 3D visualization.**

**Live:** https://hydrostack.io  
**Status:** ✅ Production Ready  
**Last Updated:** May 2026

---

## 📖 Quick Navigation

- **[Getting Started](#getting-started)** — Installation & first run
- **[Features](#-features)** — What HydroStack can do
- **[Project Structure](#-project-structure)** — How the codebase is organized
- **[Documentation](#-documentation)** — Full guides by topic
- **[Development](#-development)** — For developers extending the project
- **[Deployment](#-deployment)** — How to deploy to production

---

## ✨ Features

### 🧮 **Septic Tank Calculator**
- Hydraulic design per international standards
- Automatic tank sizing based on users and regulations
- Infiltration field dimensioning
- Real-time parameter validation
- Support for multiple design norms (EPA, RAS, CTE HS-5, AS/NZS)

### 🤖 **AI-Powered Guidance (Agent)**
- Context-aware explanations of septic systems
- Scenario detection (new installation, active failure, aging system, abandoned house)
- Country-specific guidance (procedures, regulations, professionals)
- Bilingual support (Spanish/English)
- Auto-detection of user expertise level

### 🎨 **3D Isometric Diagrams**
- Professional technical drawings of complete systems
- Dual rendering modes:
  - **SVG Vector** — Instant, clean, professional
  - **Photorealistic** — Detailed, presentation-ready (via Claude API)
- One-click PNG export
- Real-time updates with parameter changes

### 📊 **Technical Data Panels**
- All design calculations displayed alongside visualizations
- Professional formatting for reports
- Normalized values per standard

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd hydrostack-2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# (Optional) For image generation:
# Add ANTHROPIC_API_KEY to .env.local
```

### Development Server

```bash
npm run dev
# → Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
hydrostack-2/
│
├── 📄 README.md                        # This file
├── 📄 CLAUDE.md                        # AI Agent behavior rules
├── 📄 GETTING_STARTED.md               # Quick start guide
│
├── docs/                               # Documentation by topic
│   ├── index.md                        # Documentation index
│   ├── ARCHITECTURE.md                 # System architecture
│   ├── AGENT.md                        # AI agent guide
│   ├── DIAGRAMS_3D.md                  # 3D diagram usage
│   ├── DEVELOPERS.md                   # Developer reference
│   ├── FEATURES.md                     # Feature overview
│   ├── agent/                          # Technical agent docs
│   ├── normativa/                      # Standards by country
│   └── api/                            # API documentation
│
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Global layout
│   ├── page.tsx                        # Home page
│   ├── chat/                           # Chat interface
│   ├── calculators/                    # Calculator pages
│   │   └── fosa-septica/              # Septic tank calculator
│   └── api/                            # API routes
│       ├── chat/                       # Agent chat endpoint
│       ├── agent/                      # Agent utility endpoints
│       └── generate-isometric/         # 3D diagram generation
│
├── src/                                # Source code
│   ├── components/                     # React components
│   │   ├── HydroAgent/                # AI agent UI
│   │   ├── Calculators/               # Calculator components
│   │   └── Common/                    # Shared components
│   ├── lib/                           # Utilities & logic
│   │   ├── agent/                     # Agent logic
│   │   ├── calculations/              # Engineering calculations
│   │   ├── validation/                # Input validation
│   │   └── i18n.tsx                   # Translations (ES/EN)
│   └── __tests__/                     # Test files
│
├── public/                             # Static assets
│   └── reports/                        # Report templates
│
├── .env.example                        # Environment template
├── tsconfig.json                       # TypeScript config
├── next.config.js                      # Next.js config
├── package.json                        # Dependencies
└── vitest.config.ts                    # Test configuration
```

---

## 📚 Documentation

### Getting Started
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** — First 5 minutes guide
- **[docs/index.md](./docs/index.md)** — Full documentation index

### For Users
- **[docs/DIAGRAMS_3D.md](./docs/DIAGRAMS_3D.md)** — How to use 3D diagrams
- **[docs/FEATURES.md](./docs/FEATURES.md)** — Feature overview

### For Developers
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — System design
- **[docs/DEVELOPERS.md](./docs/DEVELOPERS.md)** — Developer guide
- **[docs/AGENT.md](./docs/AGENT.md)** — AI agent technical guide
- **[docs/api/](./docs/api/)** — API endpoints reference

### Standards & Regulations
- **[docs/normativa/](./docs/normativa/)** — Standards by country

---

## 💻 Development

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **UI** | React 18, CSS-in-JS |
| **Language** | TypeScript |
| **Testing** | Vitest + manual coverage |
| **Deployment** | Vercel, GitHub |
| **AI Integration** | Anthropic Claude API (optional) |

### Code Organization

- **Components**: React functional components with TypeScript
- **Lib**: Pure functions for calculations and utilities
- **Tests**: Unit tests in `__tests__/` parallel structure
- **Types**: TypeScript interfaces in `src/types/`
- **i18n**: Translation strings in `src/lib/i18n.tsx`

### Running Tests

```bash
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # Interactive UI
```

### Code Standards

- **No external UI libraries** — Pure CSS/React styling
- **TypeScript everywhere** — Type-safe development
- **Client-side calculations** — Zero database dependency
- **Bilingual support** — Spanish/English via i18n
- **Responsive design** — Mobile-first approach

### Adding a New Calculator

1. Create calculator page: `app/calculators/[slug]/page.tsx`
2. Create calculator component: `src/components/Calculators/[Name].tsx`
3. Add calculation logic to `src/lib/calculations/`
4. Register in module list (see `app/page.tsx`)
5. Add documentation to `docs/`

---

## 🚀 Deployment

### Option 1: Vercel (Recommended)

```bash
npm install -g vercel
vercel
# Follow prompts → deployed in ~60 seconds
```

### Option 2: GitHub + Vercel Dashboard

1. Push repo to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Click Deploy (no config needed)

### Option 3: Docker / Custom Server

```bash
npm run build
npm run start
# Server runs on http://localhost:3000
```

### Environment Variables

**Required for image generation:**
```
ANTHROPIC_API_KEY=sk-your-anthropic-key
```

**Optional:**
- `GROQ_API_KEY` — For faster agent responses (fallback if using Groq)

---

## 🔧 Configuration

### Project Settings
- **`.claude/settings.local.json`** — Claude Code IDE settings
- **`.env.local`** — Environment variables (git-ignored)
- **`tsconfig.json`** — TypeScript compilation options
- **`next.config.js`** — Next.js build settings

### Customization

**3D Diagram Colors & Scale:**
Edit `src/components/IsometricDiagram.tsx` (lines 10–30)

**Calculations Precision:**
Edit `src/lib/calculations/*.ts`

**UI Styling:**
Edit component inline styles (no CSS files)

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| **SVG Render Time** | <50ms |
| **PNG Export** | 1–2s |
| **AI Response** | 2–5s |
| **Image Generation** | 30–60s |
| **Bundle Size** | ~120 KB (minified) |
| **Build Time** | <30s |

---

## 🌍 Supported Standards

- **USA** — EPA On-Site Wastewater Guidelines
- **Colombia** — RAS 2000 (Reglamento Técnico del Sector)
- **Spain** — CTE DB-HS 5 (Código Técnico de Edificación)
- **Australia/NZ** — AS/NZS 1547 On-site Sewerage
- **UK** — Building Regulations Approved Document H
- **International** — EN 12566-1 (European Standard)

---

## 🤝 Contributing

### How to Report Issues
1. Check if issue already exists
2. Create detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment info (browser, OS, Node version)

### How to Contribute Code
1. Fork repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Write tests for new code
4. Update documentation
5. Submit pull request with clear description

---

## 📞 Support

### Documentation
- **Quick help:** Check [docs/](./docs/)
- **Common issues:** See [FAQ](#faq) below
- **Code examples:** Browse `__tests__/` for usage patterns

### FAQ

**Q: Is HydroStack free?**  
A: Yes, fully open source.

**Q: Can I use it for commercial projects?**  
A: Yes, with attribution.

**Q: Do I need an Anthropic API key?**  
A: No. 3D diagrams work free. AI guidance requires API key for images.

**Q: Does it work offline?**  
A: Yes! Calculations are client-side. No API calls required except for image generation.

**Q: What browsers are supported?**  
A: Modern browsers (Chrome, Firefox, Safari, Edge). Mobile responsive.

---

## 🗺️ Roadmap

### ✅ Complete (v1.0)
- Septic tank calculator
- 3D isometric diagrams (SVG + image)
- AI agent with scenario detection
- Multi-language support
- Multiple standards support

### 🔄 Planned (v1.1)
- PDF export for diagrams
- Flow animation
- Direct DALL-E integration
- More detailed reporting

### 📅 Future (v2.0)
- Imhoff tanks
- UASB reactors
- Constructed wetlands
- 3D model export (STL/OBJ)
- Advanced cost analysis

---

## 📄 License

Open Source — See LICENSE file for details

---

## 👥 Credits

**HydroStack Team**  
**Version**: 1.0.0  
**Last Updated**: May 2026

**Built on:**
- EN 12566-1 (European septic tank standard)
- EPA On-Site Wastewater Guidelines
- RAS 2000 (Colombian regulations)
- CTE DB-HS 5 (Spanish building code)
- Open-source community standards

---

## 📋 Changelog

### v1.0.0 (May 2026)
- ✨ Full septic tank calculator
- 🎨 3D isometric diagrams
- 🤖 AI agent with auto-detection
- 🌍 Multi-language support
- 📊 Professional diagrams export

---

**Ready to get started?** → [GETTING_STARTED.md](./GETTING_STARTED.md)

**Need developer docs?** → [docs/DEVELOPERS.md](./docs/DEVELOPERS.md)

**Looking for architecture?** → [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

**Happy engineering! 🌊**
