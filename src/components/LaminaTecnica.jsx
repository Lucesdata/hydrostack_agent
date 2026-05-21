"use client";

const F  = (v, d=2) => Number(v).toFixed(d);
const FI = (v)      => Math.round(v);
const FONT = "'IBM Plex Mono', monospace";
const ORBITRON = "'Orbitron', sans-serif";

// ── Design tokens (matches global design system) ──────────────────────────────
const DS = {
  cyan:   "#00F5FF",
  green:  "#00FF88",
  amber:  "#FFB020",
  muted:  "#4A7A8A",
  deep1:  "#020C10",
  deep2:  "#041820",
  border: "rgba(0,245,255,0.12)",
  text:   "#E8F8FF",
  water:  "rgba(0,140,200,0.14)",
  sludge: "rgba(100,65,30,0.30)",
  scum:   "rgba(180,140,50,0.22)",
  conc:   "#1a3550",
  terrain:"#3a7050",
};

// ── SVG defs ──────────────────────────────────────────────────────────────────
const Defs = () => (
  <defs>
    <marker id="la-ae" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,1 L5,3 L0,5 Z" fill={DS.muted}/>
    </marker>
    <marker id="la-aw" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
      <path d="M5,1 L0,3 L5,5 Z" fill={DS.muted}/>
    </marker>
    <marker id="la-as" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
      <path d="M1,0 L3,5 L5,0 Z" fill={DS.muted}/>
    </marker>
    <marker id="la-an" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
      <path d="M1,6 L3,1 L5,6 Z" fill={DS.muted}/>
    </marker>
    <marker id="la-flow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,1.5 L6,4 L0,6.5 Z" fill={DS.cyan}/>
    </marker>
    <pattern id="la-gnd" patternUnits="userSpaceOnUse" width="12" height="12">
      <line x1="0" y1="12" x2="12" y2="0" stroke="#2a5040" strokeWidth="0.8"/>
    </pattern>
    <pattern id="la-conc" patternUnits="userSpaceOnUse" width="7" height="7">
      <line x1="0" y1="3.5" x2="7" y2="3.5" stroke="#142838" strokeWidth="0.6"/>
      <line x1="3.5" y1="0" x2="3.5" y2="7" stroke="#142838" strokeWidth="0.6"/>
    </pattern>
    <filter id="la-glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
);

// ── Dim helpers ───────────────────────────────────────────────────────────────
const DH = ({ x1, y1, x2, lbl, dy=18 }) => (
  <g>
    <line x1={x1} y1={y1+dy} x2={x2} y2={y1+dy} stroke={DS.muted} strokeWidth="0.9"
      markerStart="url(#la-aw)" markerEnd="url(#la-ae)"/>
    <line x1={x1} y1={y1} x2={x1} y2={y1+dy} stroke={DS.muted} strokeWidth="0.5" strokeDasharray="2,2"/>
    <line x1={x2} y1={y1} x2={x2} y2={y1+dy} stroke={DS.muted} strokeWidth="0.5" strokeDasharray="2,2"/>
    <text x={(x1+x2)/2} y={y1+dy-4} fill={DS.muted} fontSize="8" textAnchor="middle" fontFamily={FONT}>{lbl}</text>
  </g>
);

const DV = ({ x1, y1, y2, lbl, dx=-18 }) => {
  const my = (y1+y2)/2;
  return (
    <g>
      <line x1={x1+dx} y1={y1} x2={x1+dx} y2={y2} stroke={DS.muted} strokeWidth="0.9"
        markerStart="url(#la-an)" markerEnd="url(#la-as)"/>
      <line x1={x1} y1={y1} x2={x1+dx} y2={y1} stroke={DS.muted} strokeWidth="0.5" strokeDasharray="2,2"/>
      <line x1={x1} y1={y2} x2={x1+dx} y2={y2} stroke={DS.muted} strokeWidth="0.5" strokeDasharray="2,2"/>
      <text x={x1+dx-4} y={my+3} fill={DS.muted} fontSize="8" textAnchor="middle" fontFamily={FONT}
        transform={`rotate(-90,${x1+dx-4},${my+3})`}>{lbl}</text>
    </g>
  );
};

// Section header bar
const SecTitle = ({ x, y, w, num, label }) => (
  <g>
    <rect x={x} y={y} width={w} height={17} fill="rgba(0,245,255,0.07)"/>
    <rect x={x} y={y} width={22} height={17} fill="rgba(0,245,255,0.18)"/>
    <line x1={x} y1={y+17} x2={x+w} y2={y+17} stroke="rgba(0,245,255,0.25)" strokeWidth="0.7"/>
    <text x={x+11} y={y+12} fill={DS.cyan} fontSize="9" textAnchor="middle"
      fontFamily={FONT} fontWeight="bold">{num}</text>
    <text x={x+30} y={y+12} fill={DS.muted} fontSize="8" fontFamily={FONT} letterSpacing="1.5">{label}</text>
  </g>
);

// ── 1. VISTA EN PLANTA ────────────────────────────────────────────────────────
function PlantView({ r, x, y, w, h }) {
  const TH = 17, PAD = 28;
  const aW = w - PAD*2 - 46, aH = h - TH - PAD*2 - 40;
  const scl = Math.min(aW / r.L, aH / r.W, 70);
  const tW = r.L * scl, tH = r.W * scl;
  const ox = x + (w-tW)/2, oy = y + TH + PAD + (aH-tH)/2 + 8;
  const wt = 9;

  const divs = r.chambers===3 ? [ox+tW*0.50,ox+tW*0.75]
             : r.chambers===2 ? [ox+tW*0.667] : [];

  const hatches = r.chambers===1 ? [ox+tW/2]
                : r.chambers===2 ? [ox+tW*0.333,ox+tW*0.833]
                : [ox+tW*0.25,ox+tW*0.625,ox+tW*0.875];

  const chamLbls = r.chambers===1 ? [{cx:ox+tW/2,l:"C-1"}]
    : r.chambers===2 ? [{cx:ox+tW*0.333,l:"C-1"},{cx:ox+tW*0.833,l:"C-2"}]
    : [{cx:ox+tW*0.25,l:"C-1"},{cx:ox+tW*0.625,l:"C-2"},{cx:ox+tW*0.875,l:"C-3"}];

  return (
    <g>
      <SecTitle x={x} y={y} w={w} num="1" label="VISTA EN PLANTA"/>
      {/* Ground */}
      <rect x={ox-22} y={oy-22} width={tW+44} height={tH+44} fill="url(#la-gnd)" opacity="0.3"/>
      {/* Outer shell */}
      <rect x={ox} y={oy} width={tW} height={tH} fill={DS.deep2} stroke={DS.cyan} strokeWidth="1.8" opacity="0.8"/>
      {/* Walls */}
      <rect x={ox}       y={oy} width={wt}       height={tH} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1"/>
      <rect x={ox+tW-wt} y={oy} width={wt}       height={tH} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1"/>
      <rect x={ox}       y={oy} width={tW}        height={wt} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1"/>
      <rect x={ox} y={oy+tH-wt} width={tW}       height={wt} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1"/>
      {/* Interior water */}
      <rect x={ox+wt} y={oy+wt} width={tW-wt*2} height={tH-wt*2} fill={DS.water}/>
      {/* Dividers */}
      {divs.map((dx,i)=>(
        <rect key={i} x={dx-wt/2} y={oy} width={wt} height={tH}
          fill="url(#la-conc)" stroke="rgba(0,245,255,0.2)" strokeWidth="0.8"/>
      ))}
      {/* Inspection covers */}
      {hatches.map((hx,i)=>(
        <g key={i}>
          <rect x={hx-11} y={oy+tH/2-11} width={22} height={22} rx="2"
            fill="rgba(0,245,255,0.04)" stroke="rgba(0,245,255,0.2)" strokeWidth="0.8" strokeDasharray="3,2"/>
          <line x1={hx-11} y1={oy+tH/2} x2={hx+11} y2={oy+tH/2} stroke="rgba(0,245,255,0.2)" strokeWidth="0.5"/>
          <line x1={hx} y1={oy+tH/2-11} x2={hx} y2={oy+tH/2+11} stroke="rgba(0,245,255,0.2)" strokeWidth="0.5"/>
        </g>
      ))}
      {/* Vent pipes (circles) */}
      {hatches.map((hx,i)=>(
        <circle key={i} cx={hx} cy={oy+wt+9} r={6}
          fill="rgba(0,255,136,0.08)" stroke={DS.green} strokeWidth="0.9"/>
      ))}
      <text x={hatches[0]+10} y={oy+wt+13} fill={DS.green} fontSize="7.5" fontFamily={FONT}>⑤</text>
      {/* Inlet */}
      <rect x={ox-16} y={oy+tH/2-4} width={16} height={8}
        fill="rgba(0,245,255,0.15)" stroke={DS.cyan} strokeWidth="1"/>
      <text x={ox-18} y={oy+tH/2-8} fill={DS.cyan} fontSize="9" textAnchor="end"
        fontFamily={FONT} fontWeight="bold">① E</text>
      {/* Outlet */}
      <rect x={ox+tW} y={oy+tH/2-4} width={16} height={8}
        fill="rgba(0,200,180,0.15)" stroke="#4ab0c0" strokeWidth="1"/>
      <text x={ox+tW+18} y={oy+tH/2-8} fill="#4ab0c0" fontSize="9"
        fontFamily={FONT} fontWeight="bold">② S</text>
      {/* Cut A-A */}
      <line x1={ox-20} y1={oy+tH/2} x2={ox+tW+20} y2={oy+tH/2}
        stroke={DS.amber} strokeWidth="1.2" strokeDasharray="6,3" opacity="0.9"/>
      <text x={ox-22} y={oy+tH/2+4} fill={DS.amber} fontSize="10"
        textAnchor="end" fontFamily={FONT} fontWeight="bold">A</text>
      <text x={ox+tW+22} y={oy+tH/2+4} fill={DS.amber} fontSize="10"
        fontFamily={FONT} fontWeight="bold">A</text>
      {/* Chamber labels */}
      {chamLbls.map((c,i)=>(
        <text key={i} x={c.cx} y={oy+tH/2+4} fill="rgba(0,245,255,0.3)" fontSize="9"
          textAnchor="middle" fontFamily={FONT}>{c.l}</text>
      ))}
      {/* North arrow */}
      <g transform={`translate(${ox+tW+32},${oy+18})`}>
        <circle cx={0} cy={0} r={12} fill="none" stroke="rgba(0,245,255,0.15)" strokeWidth="0.8"/>
        <polygon points="0,-11 -4,3 0,0 4,3" fill={DS.cyan} filter="url(#la-glow)"/>
        <polygon points="0,11 -4,-3 0,0 4,-3" fill={DS.conc}/>
        <text x={0} y={22} fill={DS.muted} fontSize="7" textAnchor="middle" fontFamily={FONT}>N</text>
      </g>
      {/* Dims */}
      <DH x1={ox} y1={oy+tH} x2={ox+tW} lbl={`L = ${F(r.L)} m`} dy={22}/>
      <DV x1={ox} y1={oy} y2={oy+tH} lbl={`A = ${F(r.W)} m`} dx={-26}/>
    </g>
  );
}

// ── 2. CORTE A-A ──────────────────────────────────────────────────────────────
function CrossSection({ r, freeboard, x, y, w, h }) {
  const TH=17, ML=52, MR=18, MT=38, MB=40;
  const tW=w-ML-MR, tH=h-TH-MT-MB;
  const x0=x+ML, y0=y+TH+MT, wt=9;
  const totalD=r.depth+freeboard, sy=tH/totalD;
  const Area=r.Vtot/r.depth;
  const hNata=r.Vn/Area, hLiq=r.Vl/Area, hSlud=r.Vs/Area;
  const yWtr=y0+freeboard*sy, yNatB=yWtr+hNata*sy;
  const yLiqB=yNatB+hLiq*sy, ySldB=yLiqB+hSlud*sy, yBot=y0+tH;

  const divs=r.chambers===3?[x0+tW*0.50,x0+tW*0.75]
           :r.chambers===2?[x0+tW*0.667]:[];

  return (
    <g>
      <SecTitle x={x} y={y} w={w} num="2" label="CORTE A-A  —  LONGITUDINAL"/>
      {/* Ground */}
      <rect x={x0-28} y={y0-MT} width={tW+56} height={MT} fill="url(#la-gnd)" opacity="0.28"/>
      <line x1={x0-30} y1={y0} x2={x0+tW+30} y2={y0}
        stroke={DS.terrain} strokeWidth="1.2" strokeDasharray="8,4"/>
      <text x={x0-32} y={y0+4} fill={DS.terrain} fontSize="8" textAnchor="end" fontFamily={FONT}>NTT</text>
      {/* Walls */}
      <rect x={x0}       y={y0} width={wt}  height={tH} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1.5"/>
      <rect x={x0+tW-wt} y={y0} width={wt}  height={tH} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1.5"/>
      <rect x={x0}       y={y0} width={tW}  height={wt} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1.5"/>
      <rect x={x0} y={yBot-wt}  width={tW}  height={wt} fill="url(#la-conc)" stroke="rgba(0,245,255,0.3)" strokeWidth="1.5"/>
      {/* Freeboard */}
      <rect x={x0+wt} y={y0+wt} width={tW-wt*2} height={Math.max(yWtr-y0-wt,0)} fill="rgba(2,12,16,0.7)"/>
      <text x={x0+tW-wt-5} y={y0+wt+(yWtr-y0-wt)/2+3} fill="rgba(0,245,255,0.25)"
        fontSize="7.5" textAnchor="end" fontFamily={FONT}>BL = {F(freeboard)} m</text>
      {/* Zones */}
      <rect x={x0+wt} y={yWtr}  width={tW-wt*2} height={yNatB-yWtr}  fill={DS.scum}/>
      <rect x={x0+wt} y={yNatB} width={tW-wt*2} height={yLiqB-yNatB} fill={DS.water}/>
      <rect x={x0+wt} y={yLiqB} width={tW-wt*2} height={ySldB-yLiqB} fill={DS.sludge}/>
      {/* Zone labels */}
      <text x={x0+tW/2} y={(yWtr+yNatB)/2+3} fill="#9a8040" fontSize="8.5"
        textAnchor="middle" fontFamily={FONT}>SCUM — Scum Volume = {F(r.Vn)} m³</text>
      <text x={x0+tW/2} y={(yNatB+yLiqB)/2+3} fill="#3a8090" fontSize="8.5"
        textAnchor="middle" fontFamily={FONT}>LIQUID ZONE — Liquid Volume = {F(r.Vl)} m³</text>
      {ySldB-yLiqB>16&&(
        <text x={x0+tW/2} y={(yLiqB+ySldB)/2+3} fill="#8a5a28" fontSize="8.5"
          textAnchor="middle" fontFamily={FONT}>SLUDGE — Sludge Volume = {F(r.Vs)} m³</text>
      )}
      {/* Dividers */}
      {divs.map((dx,i)=>(
        <rect key={i} x={dx-wt/2} y={y0} width={wt} height={tH}
          fill="url(#la-conc)" stroke="rgba(0,245,255,0.2)" strokeWidth="1"/>
      ))}
      {/* Water level line */}
      <line x1={x0+wt} y1={yWtr} x2={x0+tW-wt} y2={yWtr}
        stroke={DS.cyan} strokeWidth="1.2" strokeDasharray="6,3" opacity="0.8"/>
      <text x={x0-3} y={yWtr+4} fill={DS.cyan} fontSize="9"
        textAnchor="end" fontFamily={FONT} fontWeight="bold">NL</text>
      {/* T-pipe inlet (cyan) */}
      <line x1={x0+wt} y1={yNatB} x2={x0+wt+20} y2={yNatB} stroke={DS.cyan} strokeWidth="2.5"/>
      <line x1={x0+wt+20} y1={yWtr+6} x2={x0+wt+20} y2={yLiqB-6} stroke={DS.cyan} strokeWidth="2.5"/>
      <text x={x0+wt+24} y={yWtr+1} fill={DS.cyan} fontSize="8" fontFamily={FONT}>
        ① T-in Ø{FI(r.dPipe*1000)} mm
      </text>
      {/* T-pipe outlet */}
      {(()=>{
        const ox2=x0+tW-wt-20;
        return <>
          <line x1={ox2} y1={yNatB} x2={x0+tW-wt} y2={yNatB} stroke="#4ab0c0" strokeWidth="2.5"/>
          <line x1={ox2} y1={yWtr+6} x2={ox2} y2={yLiqB-6} stroke="#4ab0c0" strokeWidth="2.5"/>
          <text x={ox2-4} y={yWtr+1} fill="#4ab0c0" fontSize="8" textAnchor="end" fontFamily={FONT}>② T-out</text>
        </>;
      })()}
      {/* Vent pipe */}
      <rect x={x0+tW/2-4} y={y0-16} width={8} height={24} fill="none" stroke={DS.green} strokeWidth="1.5"/>
      <line x1={x0+tW/2-10} y1={y0-16} x2={x0+tW/2+10} y2={y0-16} stroke={DS.green} strokeWidth="1.5"/>
      <text x={x0+tW/2+14} y={y0-6} fill={DS.green} fontSize="8" fontFamily={FONT}>
        ⑤ Ø{FI(r.dVent*1000)} mm
      </text>
      {/* Dims */}
      <DV x1={x0} y1={y0} y2={yBot} lbl={`H = ${F(totalD,2)} m`} dx={-36}/>
      <DV x1={x0} y1={yWtr} y2={yBot} lbl={`Hu = ${F(r.depth)} m`} dx={-20}/>
      <DH x1={x0} y1={yBot} x2={x0+tW} lbl={`L = ${F(r.L)} m`} dy={25}/>
    </g>
  );
}

// ── 3. PERFIL HIDRÁULICO ──────────────────────────────────────────────────────
function HydraulicProfile({ r, x, y, w, h }) {
  const TH=17, ML=20, MR=10, MT=22, MB=52;
  const cW=w-ML-MR, cH=h-TH-MT-MB;
  const x0=x+ML, y0=y+TH+MT;

  const bars=[
    {lbl:"Inlet",  sub:"Ks=0.5", v:r.hf_entrada},
    {lbl:"Contrac.", sub:"Kc=0.5", v:r.hf_contraccion},
    {lbl:"Tank",     sub:"H-W",    v:r.hf_fosa},
    {lbl:"Tabiques", sub:"Kt=0.3", v:r.hf_tabiques},
    {lbl:"Outlet",   sub:"Ks=1.0", v:r.hf_salida},
  ];
  const maxV=Math.max(...bars.map(b=>b.v),0.0001);
  const bW=(cW/bars.length)*0.55, bGap=cW/bars.length;

  return (
    <g>
      <SecTitle x={x} y={y} w={w} num="3" label="PERFIL HIDRÁULICO"/>
      {/* Grid */}
      {[0,0.25,0.5,0.75,1].map(f=>(
        <g key={f}>
          <line x1={x0} y1={y0+cH*(1-f)} x2={x0+cW} y2={y0+cH*(1-f)}
            stroke="rgba(0,245,255,0.08)" strokeWidth="0.6" strokeDasharray="4,3"/>
          {f>0&&<text x={x0-3} y={y0+cH*(1-f)+3} fill={DS.muted} fontSize="7"
            textAnchor="end" fontFamily={FONT}>{(maxV*f*100).toFixed(2)}</text>}
        </g>
      ))}
      <text x={x0-13} y={y0+cH/2} fill={DS.muted} fontSize="7" textAnchor="middle"
        fontFamily={FONT} transform={`rotate(-90,${x0-13},${y0+cH/2})`}>cm</text>
      {/* Bars */}
      {bars.map((b,i)=>{
        const bh=(b.v/maxV)*cH*0.9;
        const bx=x0+i*bGap+bGap/2-bW/2, by=y0+cH-bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bW} height={bh}
              fill="rgba(0,245,255,0.12)" stroke="rgba(0,245,255,0.3)" strokeWidth="0.8" rx="2"/>
            <rect x={bx} y={by} width={bW} height={Math.min(bh,8)}
              fill="rgba(0,245,255,0.35)" rx="2"/>
            <text x={bx+bW/2} y={by-4} fill={DS.cyan} fontSize="9"
              textAnchor="middle" fontFamily={FONT}>{(b.v*100).toFixed(2)}</text>
            <text x={bx+bW/2} y={y0+cH+13} fill={DS.muted} fontSize="7.5"
              textAnchor="middle" fontFamily={FONT}>{b.lbl}</text>
            <text x={bx+bW/2} y={y0+cH+24} fill="rgba(74,122,138,0.7)" fontSize="7"
              textAnchor="middle" fontFamily={FONT}>{b.sub}</text>
          </g>
        );
      })}
      {/* Axes */}
      <line x1={x0} y1={y0} x2={x0} y2={y0+cH} stroke="rgba(0,245,255,0.2)" strokeWidth="1"/>
      <line x1={x0} y1={y0+cH} x2={x0+cW} y2={y0+cH} stroke="rgba(0,245,255,0.2)" strokeWidth="1"/>
      {/* Summary row */}
      <rect x={x0} y={y0+cH+34} width={cW} height={16} fill="rgba(0,245,255,0.05)" rx="2"/>
      <text x={x0+cW/2} y={y0+cH+45} fill={DS.cyan} fontSize="8.5"
        textAnchor="middle" fontFamily={FONT} fontWeight="bold">
        Hf = {(r.hf_total*100).toFixed(2)} cm  |  Re = {FI(r.Re)}  |  v = {F(r.Vflow,4)} m/s
      </text>
    </g>
  );
}

// ── 4. SYSTEM SCHEME ─────────────────────────────────────────────────────────
function SitardScheme({ r, x, y, w, h }) {
  const TH=17, padX=22, padY=28;
  const x0=x+padX, y0=y+TH+padY;
  const cW=w-padX*2, cH=h-TH-padY*2;
  const mid=y0+cH*0.40;

  const items=[
    {lbl:"DWELLING",     sub:`${r.users||"—"} hab`,       det:`Q=${F(r.Qd||0)} m³/d`, col:DS.green, bg:"rgba(0,255,136,0.07)", icon:"🏠"},
    {lbl:"GREASE TRAP",sub:"③ L+G",                    det:"retention",             col:"#8ab020", bg:"rgba(130,180,20,0.07)",icon:"🧱"},
    {lbl:"SEPTIC TANK", sub:`Vtot=${F(r.Vtot)} m³`,     det:`${r.chambers} chamber(s)`,col:DS.cyan,  bg:"rgba(0,245,255,0.07)",icon:"⬛"},
    {lbl:"ANAEROBIC FILTER",  sub:"⑥ anaerobic",             det:"biofilm media",      col:"#A78BFA", bg:"rgba(167,139,250,0.07)",icon:"🔲"},
    {lbl:"INSPECTION BOX",   sub:"⑦ cleanout",              det:"periodic inspection",        col:DS.amber,  bg:"rgba(255,176,32,0.07)", icon:"⬜"},
    {lbl:"LEACH FIELD", sub:r.A_inf?`A≈${F(r.A_inf)}m²`:"see soil study",det:"field ⑧",col:DS.green, bg:"rgba(0,255,136,0.07)", icon:"🌱"},
  ];
  const segW=cW/items.length, boxW=Math.min(segW*0.72,118), boxH=66;

  return (
    <g>
      <SecTitle x={x} y={y} w={w} num="4" label="SYSTEM SCHEME — ONSITE WASTEWATER TREATMENT"/>
      {/* Ground */}
      <rect x={x0} y={mid-boxH*0.4-10} width={cW} height={10} fill="url(#la-gnd)" opacity="0.3"/>
      <line x1={x0} y1={mid-boxH*0.4} x2={x0+cW} y2={mid-boxH*0.4}
        stroke={DS.terrain} strokeWidth="1" strokeDasharray="8,4"/>
      <text x={x0+cW+5} y={mid-boxH*0.4+4} fill={DS.terrain} fontSize="8" fontFamily={FONT}>NTT</text>
      {/* Pipe backbone */}
      <line x1={x0+segW*0.5} y1={mid+boxH*0.52} x2={x0+cW-segW*0.5} y2={mid+boxH*0.52}
        stroke={DS.cyan} strokeWidth="2.5" strokeDasharray="7,4" opacity="0.2"/>
      {items.map((item,i)=>{
        const cx=x0+segW*i+segW/2, bx=cx-boxW/2, by=mid-boxH/2;
        return (
          <g key={i}>
            {/* Flow arrow */}
            {i>0&&(
              <line x1={bx-(segW-boxW)/2+3} y1={mid+boxH*0.52}
                    x2={bx-5}               y2={mid+boxH*0.52}
                stroke={DS.cyan} strokeWidth="1.5" markerEnd="url(#la-flow)"/>
            )}
            {/* Pipe stub */}
            <line x1={cx} y1={by+boxH} x2={cx} y2={mid+boxH*0.52}
              stroke={item.col} strokeWidth="1" strokeDasharray="3,2" opacity="0.4"/>
            {/* Box */}
            <rect x={bx} y={by} width={boxW} height={boxH} rx="5"
              fill={item.bg} stroke={item.col} strokeWidth="1.3"/>
            {/* Top accent */}
            <rect x={bx} y={by} width={boxW} height={5} rx="5"
              fill={item.col} opacity="0.4"/>
            {/* Icon */}
            <text x={cx} y={by+24} textAnchor="middle" fontSize="16" fontFamily="sans-serif">{item.icon}</text>
            {/* Label */}
            <text x={cx} y={by+40} fill={item.col} fontSize="7.5" textAnchor="middle"
              fontFamily={FONT} fontWeight="bold">{item.lbl}</text>
            {/* Sub */}
            <text x={cx} y={by+51} fill={DS.muted} fontSize="7" textAnchor="middle" fontFamily={FONT}>{item.sub}</text>
            {/* Detail */}
            <text x={cx} y={by+61} fill="rgba(74,122,138,0.7)" fontSize="6.5" textAnchor="middle" fontFamily={FONT}>{item.det}</text>
          </g>
        );
      })}
      {/* Effluent quality strip */}
      <rect x={x0} y={y0+cH-20} width={cW} height={18} fill="rgba(0,245,255,0.04)" rx="3"/>
      <line x1={x0} y1={y0+cH-20} x2={x0+cW} y2={y0+cH-20}
        stroke="rgba(0,245,255,0.15)" strokeWidth="0.5"/>
      <text x={x0+cW/2} y={y0+cH-7} fill={DS.muted} fontSize="8.5"
        textAnchor="middle" fontFamily={FONT}>
        DBO₅: {r.dboIn||250} mg/L  →  ≈{F(r.dboOut||0)} mg/L outlet |  SS: {r.ssIn||280} mg/L  →  ≈{F(r.ssOut||0)} mg/L  |  Remoción ≈{r.chambers===1?"60":"68"}%
      </text>
    </g>
  );
}

// ── 5. CUADRO DE COTAS ────────────────────────────────────────────────────────
function DataTable({ r, x, y, w, h }) {
  const TH=17, px=x+12, py=y+TH+10;
  const aW=w-24, rH=13.5;

  const rows=[
    {lbl:"L — Longitud total",      val:`${F(r.L)} m`,                 hi:true },
    {lbl:"A — Ancho interior",       val:`${F(r.W)} m`,                 hi:true },
    {lbl:"Hu — Useful Depth",          val:`${F(r.depth)} m`,             hi:true },
    {lbl:"BL — Borde libre",         val:`${F(r.hT-r.depth,2)} m`,     hi:false},
    {lbl:"H — Prof. total",          val:`${F(r.hT)} m`,               hi:false},
    {lbl:"Vtot — Design Volume",       val:`${F(r.Vtot)} m³`,             hi:true },
    {lbl:"Vl — Liquid Volume",        val:`${F(r.Vl)} m³`,              hi:false},
    {lbl:"Vs — Vol. lodos",          val:`${F(r.Vs)} m³`,              hi:false},
    {lbl:"Vn — Vol. natas",          val:`${F(r.Vn)} m³`,              hi:false},
    {lbl:"Ø Tub. E/S",               val:`${FI(r.dPipe*1000)} mm`,     hi:false},
    {lbl:"Ø Ventilation Pipe",       val:`${FI(r.dVent*1000)} mm`,     hi:false},
    {lbl:"Number of Chambers",               val:`${r.chambers}`,               hi:false},
    {lbl:"Hydraulic Head Loss",            val:`${(r.hf_total*100).toFixed(1)} cm`, hi:false},
  ];

  const legend=[
    ["①","Inlet pipe (T-pipe)"],["②","Outlet pipe (T-pipe)"],
    ["③","Grease trap"],        ["④","Septic tank"],
    ["⑤","Tubería ventilación"],     ["⑥","Filtro / FAFA"],
    ["⑦","Caja de inspección"],      ["⑧","Campo infiltración"],
  ];
  const tableH=rows.length*rH+18;

  return (
    <g>
      <SecTitle x={x} y={y} w={w} num="5" label="CUADRO DE COTAS"/>
      {/* Table bg */}
      <rect x={px-4} y={py} width={aW} height={tableH} fill="rgba(4,24,32,0.6)" rx="2"/>
      {/* Header */}
      <rect x={px-4} y={py} width={aW} height={14} fill="rgba(0,245,255,0.10)" rx="2"/>
      <text x={px+2} y={py+10} fill={DS.muted} fontSize="8" fontFamily={FONT}>PARAMETER</text>
      <text x={px+aW-6} y={py+10} fill={DS.muted} fontSize="8"
        textAnchor="end" fontFamily={FONT}>VALOR</text>
      {rows.map((row,i)=>(
        <g key={i}>
          <rect x={px-4} y={py+14+i*rH} width={aW} height={rH}
            fill={i%2===0?"rgba(0,245,255,0.03)":"transparent"}/>
          <text x={px+2} y={py+14+i*rH+9.5} fill={DS.muted} fontSize="8" fontFamily={FONT}>{row.lbl}</text>
          <text x={px+aW-6} y={py+14+i*rH+9.5}
            fill={row.hi?DS.cyan:"#7ab8c8"}
            fontSize="8" fontWeight={row.hi?"bold":"normal"}
            textAnchor="end" fontFamily={row.hi?ORBITRON:FONT}>{row.val}</text>
        </g>
      ))}
      {/* Legend */}
      <line x1={px-4} y1={py+tableH+8} x2={px+aW} y2={py+tableH+8}
        stroke="rgba(0,245,255,0.1)" strokeWidth="0.5"/>
      <text x={px+2} y={py+tableH+20} fill={DS.muted} fontSize="8"
        fontFamily={FONT} letterSpacing="1">LEYENDA</text>
      {legend.map(([id,txt],i)=>(
        <text key={i}
          x={px+(i%2)*(aW/2)}
          y={py+tableH+32+Math.floor(i/2)*13}
          fill="rgba(74,122,138,0.8)" fontSize="7.5" fontFamily={FONT}>
          <tspan fill={DS.cyan} fontWeight="bold">{id}</tspan>{"  "}{txt}
        </text>
      ))}
    </g>
  );
}

// ── Cajetín ───────────────────────────────────────────────────────────────────
function Cajétin({ meta, W, H, cajeH }) {
  const y0=H-cajeH;
  const today=new Date().toLocaleDateString("en",
    {day:"2-digit",month:"2-digit",year:"numeric"});

  const row1=[
    {lbl:"PROJECT",  val:meta.projectName||"—",              x:W*0.28+10, y:y0+16},
    {lbl:"PREPARED BY",   val:meta.designer||"—",                 x:W*0.56+10, y:y0+16},
    {lbl:"STANDARD",     val:meta.normRef||"EPA / UK / AU",   x:W*0.73+10, y:y0+16},
    {lbl:"DRAWING NO.",  val:"HID-01",                            x:W*0.87+10, y:y0+16},
  ];
  const row2=[
    {lbl:"LOCATION", val:meta.location||"—",  x:W*0.28+10, y:y0+cajeH/2+16},
    {lbl:"DATE",     val:today,                x:W*0.56+10, y:y0+cajeH/2+16},
    {lbl:"SCALE",    val:"S / E",              x:W*0.73+10, y:y0+cajeH/2+16},
    {lbl:"REV",       val:"A",                  x:W*0.87+10, y:y0+cajeH/2+16},
  ];

  return (
    <g>
      <rect x={2} y={y0} width={W-4} height={cajeH-2}
        fill="rgba(2,12,16,0.85)" stroke="rgba(0,245,255,0.2)" strokeWidth="1"/>
      {/* Top accent */}
      <line x1={2} y1={y0+1} x2={W-2} y2={y0+1}
        stroke={DS.cyan} strokeWidth="1" opacity="0.5"/>
      {/* Dividers */}
      {[W*0.28,W*0.56,W*0.73,W*0.87].map((dx,i)=>(
        <line key={i} x1={dx} y1={y0} x2={dx} y2={H-2}
          stroke="rgba(0,245,255,0.12)" strokeWidth="0.8"/>
      ))}
      <line x1={W*0.28} y1={y0+cajeH/2} x2={W-2} y2={y0+cajeH/2}
        stroke="rgba(0,245,255,0.08)" strokeWidth="0.6"/>
      {/* Logo block */}
      <rect x={2} y={y0} width={W*0.28-2} height={cajeH-2}
        fill="rgba(0,245,255,0.04)"/>
      <text x={W*0.14} y={y0+20} fill={DS.cyan} fontSize="14" fontWeight="bold"
        textAnchor="middle" fontFamily={ORBITRON}
        style={{filter:"drop-shadow(0 0 6px rgba(0,245,255,0.4))"}}>HydroStack</text>
      <text x={W*0.14} y={y0+32} fill={DS.muted} fontSize="8.5"
        textAnchor="middle" fontFamily={FONT}>Ingeniería Sanitaria</text>
      <text x={W*0.14} y={y0+44} fill="rgba(74,122,138,0.6)" fontSize="8"
        textAnchor="middle" fontFamily={FONT}>SEPTIC TANK — Drawing HID-01</text>
      {/* Fields */}
      {[...row1,...row2].map((f,i)=>(
        <g key={i}>
          <text x={f.x} y={f.y-2} fill="rgba(74,122,138,0.5)" fontSize="6.5"
            fontFamily={FONT} letterSpacing="0.5">{f.lbl}</text>
          <text x={f.x} y={f.y+10} fill={DS.text} fontSize="9" fontFamily={FONT}>{f.val}</text>
        </g>
      ))}
    </g>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LaminaTecnica({ r, freeboard, meta }) {
  const W=1587, H=1122, cajeH=52;
  const drawH=H-cajeH;
  const topH=Math.round(drawH*0.52), botH=drawH-topH;

  const z={
    planta:    {x:0,                   y:0,    w:Math.round(W*0.34), h:topH},
    corte:     {x:Math.round(W*0.34),  y:0,    w:Math.round(W*0.38), h:topH},
    hidraulica:{x:Math.round(W*0.72),  y:0,    w:W-Math.round(W*0.72), h:topH},
    sitard:    {x:0,                   y:topH, w:Math.round(W*0.60), h:botH},
    tabla:     {x:Math.round(W*0.60),  y:topH, w:W-Math.round(W*0.60), h:botH},
  };

  const exportSVG=()=>{
    const svg=document.getElementById("hs-lamina");
    if(!svg) return;
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],
      {type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement("a"),{
      href:url,
      download:`HID-01_FosaSeptica_${(meta.projectName||"Project").replace(/\s+/g,"_")}.svg`
    });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
        <button onClick={exportSVG} style={{
          padding:"7px 18px",
          background:"transparent",
          border:"1px solid rgba(0,245,255,0.35)",
          borderRadius:"3px",
          color:"#00F5FF",
          fontSize:"10px",fontFamily:"'Orbitron',sans-serif",
          cursor:"pointer",letterSpacing:"0.1em",fontWeight:"700",
          transition:"all 0.2s",
        }} className="btn-cta">
          ↓ DESCARGAR SVG
        </button>
        <span style={{fontSize:"9px",color:"#4A7A8A",fontFamily:"'IBM Plex Mono',monospace"}}>
          Plano HID-01 · A3 apaisado · 1587 × 1122 px
        </span>
      </div>
      {/* Drawing */}
      <div style={{overflowX:"auto",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"4px"}}>
        <svg id="hs-lamina" width={W} height={H} viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{display:"block",background:DS.deep1}}>
          <Defs/>
          {/* Outer border */}
          <rect x={1} y={1} width={W-2} height={H-2}
            fill="none" stroke="rgba(0,245,255,0.2)" strokeWidth="2"/>
          <rect x={6} y={6} width={W-12} height={H-12}
            fill="none" stroke="rgba(0,245,255,0.06)" strokeWidth="0.7"/>
          {/* Zone separators */}
          <line x1={z.corte.x}      y1={0}    x2={z.corte.x}      y2={drawH} stroke="rgba(0,245,255,0.12)" strokeWidth="1"/>
          <line x1={z.hidraulica.x} y1={0}    x2={z.hidraulica.x} y2={drawH} stroke="rgba(0,245,255,0.12)" strokeWidth="1"/>
          <line x1={0}              y1={topH} x2={W}               y2={topH}  stroke="rgba(0,245,255,0.12)" strokeWidth="1"/>
          <line x1={z.tabla.x}      y1={topH} x2={z.tabla.x}       y2={drawH} stroke="rgba(0,245,255,0.12)" strokeWidth="1"/>
          {/* Views */}
          <PlantView        r={r} {...z.planta}/>
          <CrossSection     r={r} freeboard={freeboard} {...z.corte}/>
          <HydraulicProfile r={r} {...z.hidraulica}/>
          <SitardScheme     r={r} {...z.sitard}/>
          <DataTable        r={r} {...z.tabla}/>
          <Cajétin meta={meta} W={W} H={H} cajeH={cajeH}/>
        </svg>
      </div>
    </div>
  );
}
