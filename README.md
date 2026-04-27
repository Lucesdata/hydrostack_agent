# HydroStack

Water & Sanitation Engineering calculation tools.

**Live:** https://hydrostack.io

---

## Stack

- **Next.js 14** (App Router)
- **React 18**
- No UI library — pure CSS-in-JS inline styles
- No database — all calculations client-side

---

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
# Follow prompts → deployed in ~60 seconds
```

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Click **Deploy** — zero config needed

### Custom domain (hydrostack.io)

1. In Vercel dashboard → Project → Settings → Domains
2. Add `hydrostack.io` and `www.hydrostack.io`
3. Update your DNS with the records Vercel provides

---

## Project structure

```
app/
├── layout.js                    # Global layout + Navbar
├── globals.css                  # Global styles
├── page.js                      # Landing page
└── calculators/
    ├── page.js                  # Calculators index
    └── fosa-septica/
        └── page.js              # Septic tank calculator

components/
├── Navbar.js
└── SepticTankCalculator.jsx     # Main calculator (v6.0)

lib/
└── i18n.js                      # ES/EN translations + LangProvider
```

---

## Adding a new calculator

1. Create `app/calculators/[slug]/page.js`
2. Create `components/[Name]Calculator.jsx`
3. Add the module to `MODULES` arrays in `app/page.js` and `app/calculators/page.js`
4. Set `ready: true`

---

## Roadmap

- [ ] Tanque Imhoff
- [ ] Lodos Activados
- [ ] Reactor UASB
- [ ] Filtro Percolador
- [ ] Potabilización
