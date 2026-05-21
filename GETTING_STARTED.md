# 🚀 Getting Started — HydroStack

**Get HydroStack running in 5 minutes.**

---

## 1️⃣ Prerequisites

```bash
node --version          # Must be 18+
npm --version           # Any recent version
```

No other dependencies required!

---

## 2️⃣ Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd hydrostack-2

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. (Optional) Add API key for image generation
# Edit .env.local and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-your-key-here
```

---

## 3️⃣ Run Locally

```bash
npm run dev
```

Open browser: **http://localhost:3000**

---

## 4️⃣ First Steps

### 🧮 Try the Calculator
1. Go to **Calculators** in the navbar
2. Click **"Fosa Séptica"** (Septic Tank)
3. Fill in parameters:
   - **Usuarios** (Users): 4
   - **Dotación** (L/person/day): 150
   - **Temperatura** (°C): 20
   - **Profundidad** (m): 1.2
4. Click **"Calcular Diseño"** (Calculate Design)
5. See results appear instantly

### 🎨 Generate 3D Diagram
1. After calculating, click **"Diagrama 3D"** tab
2. See isometric diagram rendered (SVG)
3. Click **"⬇️ Descargar PNG"** to download

### 🤖 Chat with AI Agent
1. Click **"Chat"** in navbar
2. Ask about septic systems in Spanish or English
3. Agent auto-detects:
   - Your situation (new install, repair, maintenance)
   - Your country (and gives country-specific guidance)
   - Your expertise level

---

## 5️⃣ Build & Deploy

### Build for Production
```bash
npm run build
```

### Test the Production Build Locally
```bash
npm run start
```

### Deploy to Vercel (Recommended)

**Option A: Using Vercel CLI**
```bash
npm install -g vercel
vercel
# Follow prompts → deployed in ~60 seconds
```

**Option B: GitHub + Vercel Dashboard**
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Click Deploy

---

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home page & module list |
| `app/calculators/fosa-septica/page.tsx` | Calculator page |
| `src/components/Calculators/SepticTankCalculator.tsx` | Calculator UI |
| `src/lib/calculations/` | Engineering formulas |
| `src/lib/i18n.tsx` | Spanish/English translations |
| `src/components/IsometricDiagram.tsx` | 3D diagram generator |
| `app/api/agent/route.ts` | AI agent endpoint |
| `CLAUDE.md` | Agent behavior rules |

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` with:

```bash
# Optional: For AI image generation
ANTHROPIC_API_KEY=sk-your-anthropic-key

# Optional: For faster agent responses (fallback)
GROQ_API_KEY=sk-your-groq-key
```

### Customize Appearance

Edit component files directly (no CSS files):
- Colors: Search for `color:` in components
- Sizes: Search for `width:`, `height:`, `fontSize:`
- Fonts: Check `src/components/Common/`

---

## 🧪 Testing

### Run Tests
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:ui          # Visual test UI
```

### Manual Testing Checklist
- [ ] Calculator loads and calculations work
- [ ] 3D diagram renders instantly
- [ ] PNG export works
- [ ] Chat responds to questions
- [ ] Spanish/English switching works
- [ ] Mobile layout is responsive

---

## 🐛 Troubleshooting

### "npm install" fails
```bash
# Try clearing cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "dev server won't start"
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill process if needed:
kill -9 <PID>
# Try again:
npm run dev
```

### "Module not found" errors
```bash
# Make sure you're in the correct directory
pwd  # Should end with /hydrostack-2
# Reinstall node_modules
npm install
```

### "3D diagram won't show"
1. Make sure you clicked "Calcular diseño" first
2. Check browser console (F12) for errors
3. Try a different browser

### "Image generation fails"
- Check `ANTHROPIC_API_KEY` is set in `.env.local`
- Verify API key is valid (login to console.anthropic.com)
- Check account has available credits

---

## 📚 Next Steps

1. **Read documentation** → [docs/](./docs/)
2. **Explore code** → Start with `app/page.tsx`
3. **Customize calculator** → Edit `src/lib/calculations/`
4. **Add new calculator** → Create new page in `app/calculators/`
5. **Deploy** → Use Vercel (easiest option)

---

## 🎓 Learning Path

### Day 1: Understand the Project
- [ ] Read this guide
- [ ] Read [README.md](./README.md)
- [ ] Run locally and try calculator

### Day 2: Explore Code
- [ ] Open `app/page.tsx` and follow imports
- [ ] Check `src/components/` structure
- [ ] Look at calculation logic in `src/lib/calculations/`

### Day 3: Customize
- [ ] Change calculator colors
- [ ] Add a new input field
- [ ] Modify calculation logic
- [ ] Deploy to Vercel

### Day 4+: Extend
- [ ] Add new calculator type (Imhoff tank, UASB, etc.)
- [ ] Customize AI agent behavior
- [ ] Add new standards/regulations
- [ ] Contribute improvements

---

## 🆘 Getting Help

### Documentation
- **Full docs** → [docs/](./docs/)
- **Architecture** → [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Developer guide** → [docs/DEVELOPERS.md](./docs/DEVELOPERS.md)
- **API docs** → [docs/api/](./docs/api/)

### Common Issues
See [README.md#faq](./README.md#faq)

### Code Examples
- Browse `__tests__/` for usage patterns
- Check components for React/TypeScript examples
- Look at `src/lib/` for utility functions

---

## ✅ Success Checklist

Once you complete these, you're ready to develop:

- [ ] `npm install` succeeded
- [ ] `npm run dev` starts server
- [ ] Browser opens to http://localhost:3000
- [ ] Calculator page works
- [ ] 3D diagram renders
- [ ] Chat responds
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)

---

## 📞 Support

**Can't get it running?**
1. Check this guide again
2. Read [README.md](./README.md)
3. Check browser console (F12) for errors
4. Review `.env.local` settings

**Want to contribute?**
1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

**Ready?** Run `npm run dev` and start building! 🚀

For detailed docs, see [README.md](./README.md) or [docs/](./docs/)
