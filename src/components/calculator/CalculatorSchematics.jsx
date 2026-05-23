// Calculator SVG schematics (longitudinal cut + hydraulic profile).
// Extracted verbatim from SepticTankCalculator.jsx during the modular refactor.

import { fmt, fmtI } from "./calculatorData";

const ArrowMarkers = () => (
  <defs>
    <marker id="arrowE" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#2a5070"/>
    </marker>
    <marker id="arrowW" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
      <path d="M6,0 L0,3 L6,6 Z" fill="#2a5070"/>
    </marker>
    <marker id="arrowS" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
      <path d="M0,0 L3,6 L6,0 Z" fill="#2a5070"/>
    </marker>
    <marker id="arrowN" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
      <path d="M0,6 L3,0 L6,6 Z" fill="#2a5070"/>
    </marker>
    <pattern id="crossHatch" patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="0" y1="6" x2="6" y2="0" stroke="#1e3a55" strokeWidth="0.7"/>
    </pattern>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="5" height="5">
      <circle cx="2" cy="2" r="0.7" fill="#2a4a60"/>
    </pattern>
  </defs>
);

// ─── Dimension line helper ────────────────────────────────────────────────────
const DimLine = ({x1,y1,x2,y2,label,offset=0,orient="h",color="#2a5070"}) => {
  const isH = orient==="h";
  const ox = isH ? 0 : offset;
  const oy = isH ? offset : 0;
  const mx = (x1+x2)/2+ox, my = (y1+y2)/2+oy;
  const tick = 5;
  return (
    <g>
      <line x1={x1+ox} y1={y1+oy} x2={x2+ox} y2={y2+oy} stroke={color} strokeWidth="0.8"
        markerStart={isH?"url(#arrowW)":"url(#arrowN)"}
        markerEnd={isH?"url(#arrowE)":"url(#arrowS)"}/>
      {isH ? (
        <>
          <line x1={x1} y1={y1} x2={x1+ox} y2={y1+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <line x1={x2} y1={y2} x2={x2+ox} y2={y2+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <text x={mx} y={my-3} fill={color} fontSize="7" textAnchor="middle" fontFamily="monospace">{label}</text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={x1+ox} y2={y1+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <line x1={x2} y1={y2} x2={x2+ox} y2={y2+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <text x={mx-4} y={my} fill={color} fontSize="7" textAnchor="end" fontFamily="monospace"
            transform={`rotate(-90,${mx-4},${my})`}>{label}</text>
        </>
      )}
    </g>
  );
};

// ─── Corte transversal detallado ──────────────────────────────────────────────
function DetailedSchematic({ r, freeboard }) {
  const W=640, H=340;
  const ML=90, MR=72, MT=52, MB=68;
  const tW=W-ML-MR, tH=H-MT-MB;
  const x0=ML, y0=MT;

  // Zone heights (proportional to actual volumes)
  const Area = r.Vtot / r.depth;
  const hNata  = r.Vn / Area;
  const hLiq   = r.Vl / Area;
  const hSludge= r.Vs / Area;
  const hBuf   = Math.max(r.depth - hNata - hLiq - hSludge, 0);
  const totalD = r.depth + freeboard;

  // SVG y-coordinates (y increases downward)
  const scaleY = tH / totalD;
  const yWater = y0 + freeboard * scaleY;       // water surface
  const yNataB = yWater + hNata * scaleY;       // bottom of scum zone
  const yLiqB  = yNataB + hLiq * scaleY;        // bottom of liquid zone
  const ySludB = yLiqB + hSludge * scaleY;      // bottom of sludge zone
  const yBot   = y0 + tH;                        // tank bottom

  // Chamber dividers
  const div1 = r.chambers>=2 ? x0+tW*(r.chambers===3?0.5:2/3) : null;
  const div2 = r.chambers===3 ? x0+tW*0.75 : null;

  // T-pipes
  const subIn  = Math.min(0.30 * scaleY, (yLiqB-yNataB)*0.7); // 30cm submergence in SVG px
  const subOut = Math.min(0.40 * scaleY, (yLiqB-yNataB)*0.8); // 40cm
  const pipeY_in  = yNataB;
  const pipeY_out = yNataB + 4;
  const pipeD  = fmtI(r.dPipe*1000);
  const ventD  = fmtI(r.dVent*1000);
  const ventXs = [x0+28, ...(div1?[div1+28]:[]), ...(div2?[div2+28]:[])];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{display:"block",margin:"14px 0 0",background:"rgba(0,0,0,0.12)",borderRadius:"6px"}}>
      <ArrowMarkers/>

      {/* Title */}
      <text x={x0+tW/2} y={14} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace" letterSpacing="2">CORTE LONGITUDINAL — FOSA SÉPTICA</text>

      {/* Ground surface */}
      <line x1={x0-30} y1={y0} x2={x0+tW+30} y2={y0} stroke="#3a7050" strokeWidth="1.2" strokeDasharray="8,4"/>
      <text x={x0-32} y={y0+4} fill="#3a7050" fontSize="6" textAnchor="end" fontFamily="monospace">NTT</text>
      {/* Ground hatch below line */}
      {[0,6,12,18,24].map(i=>(
        <line key={i} x1={x0-30+i*14} y1={y0} x2={x0-30+i*14-8} y2={y0+8} stroke="#2a5040" strokeWidth="0.7"/>
      ))}
      {[0,6,12,18].map(i=>(
        <line key={i} x1={x0+tW+i*14} y1={y0} x2={x0+tW+i*14-8} y2={y0+8} stroke="#2a5040" strokeWidth="0.7"/>
      ))}

      {/* Freeboard zone */}
      <rect x={x0} y={y0} width={tW} height={yWater-y0} fill="rgba(20,60,100,0.3)" stroke="none"/>
      <text x={x0+tW-6} y={y0+(yWater-y0)/2+3} fill="#3a5070" fontSize="6" textAnchor="end" fontFamily="monospace">BL = {fmt(freeboard)}m</text>

      {/* Water surface line */}
      <line x1={x0} y1={yWater} x2={x0+tW} y2={yWater} stroke="#00d4ff" strokeWidth="1" strokeDasharray="8,3" opacity="0.6"/>
      <text x={x0-4} y={yWater+4} fill="#00d4ff" fontSize="6" textAnchor="end" fontFamily="monospace">NL</text>

      {/* Natas zone */}
      <rect x={x0+1} y={yWater} width={tW-2} height={yNataB-yWater} fill="rgba(180,140,50,0.20)"/>
      <text x={x0+tW/2} y={(yWater+yNataB)/2+4} fill="#9a8040" fontSize="7" textAnchor="middle" fontFamily="monospace">
        NATAS (Vn) — {fmt(r.Vn)} m³ — h ≈ {fmt(hNata,2)} m
      </text>

      {/* Liquid zone */}
      <rect x={x0+1} y={yNataB} width={tW-2} height={yLiqB-yNataB} fill="rgba(0,140,200,0.09)"/>
      <text x={x0+tW/2} y={(yNataB+yLiqB)/2+4} fill="#3a7fa5" fontSize="7" textAnchor="middle" fontFamily="monospace">
        LIQUID ZONE (Vl) — {fmt(r.Vl)} m³ — HRT = {r.p.trhDays} days — h ≈ {fmt(hLiq,2)} m
      </text>

      {/* Sludge zone */}
      <rect x={x0+1} y={yLiqB} width={tW-2} height={ySludB-yLiqB} fill="rgba(100,65,30,0.25)"/>
      <text x={x0+tW/2} y={(yLiqB+ySludB)/2+4} fill="#7a5030" fontSize="7" textAnchor="middle" fontFamily="monospace">
        SLUDGE (Vs) — {fmt(r.Vs)} m³ — {r.p.sludgeRate} L/person·year — h ≈ {fmt(hSludge,2)} m
      </text>

      {/* Buffer zone (if min volume applied) */}
      {hBuf > 0.01 && (
        <rect x={x0+1} y={ySludB} width={tW-2} height={yBot-ySludB} fill="rgba(30,100,80,0.08)"/>
      )}

      {/* Tank walls */}
      <rect x={x0} y={y0} width={tW} height={tH} fill="none" stroke="#2a6090" strokeWidth="2.5" rx="2"/>

      {/* Chamber dividers */}
      {div1 && (
        <g>
          <rect x={div1-4} y={y0} width={8} height={tH} fill="url(#crossHatch)" stroke="#1e4060" strokeWidth="1"/>
          <text x={(x0+div1)/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">
            CHAMBER 1 — {fmt(r.chambers===3?r.L*0.5:r.L*2/3)}m
          </text>
          <text x={div2?(div1+div2)/2:div1+(x0+tW-div1)/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">
            CHAMBER 2 — {fmt(r.chambers===3?r.L*0.25:r.L*1/3)}m
          </text>
        </g>
      )}
      {div2 && (
        <g>
          <rect x={div2-4} y={y0} width={8} height={tH} fill="url(#crossHatch)" stroke="#1e4060" strokeWidth="1"/>
          <text x={(div2+x0+tW)/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">
            CHAMBER 3 — {fmt(r.L*0.25)}m
          </text>
        </g>
      )}
      {r.chambers===1 && (
        <text x={x0+tW/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">SINGLE CHAMBER</text>
      )}

      {/* ── T-pipe ENTRADA ── */}
      <line x1={x0-36} y1={pipeY_in} x2={x0} y2={pipeY_in} stroke="#00d4ff" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1={x0} y1={pipeY_in} x2={x0} y2={pipeY_in+subIn} stroke="#00d4ff" strokeWidth="3.5" strokeLinecap="round"/>
      {/* arrow */}
      <polygon points={`${x0-36},${pipeY_in-4} ${x0-24},${pipeY_in} ${x0-36},${pipeY_in+4}`} fill="#00d4ff"/>
      <text x={x0-38} y={pipeY_in-6} fill="#00d4ff" fontSize="7" textAnchor="end" fontFamily="monospace">INLET</text>
      <text x={x0-38} y={pipeY_in+6} fill="#4a7fa5" fontSize="6" textAnchor="end" fontFamily="monospace">Ø{pipeD}mm</text>
      {/* submergence annotation */}
      <line x1={x0+6} y1={pipeY_in} x2={x0+6} y2={pipeY_in+subIn} stroke="#00a0c0" strokeWidth="0.8" strokeDasharray="2,2"
        markerStart="url(#arrowN)" markerEnd="url(#arrowS)"/>
      <text x={x0+9} y={pipeY_in+subIn/2+3} fill="#3a8090" fontSize="6" fontFamily="monospace">12" (30cm)</text>

      {/* ── T-pipe OUTLET ── */}
      <line x1={x0+tW} y1={pipeY_out+5} x2={x0+tW+36} y2={pipeY_out+5} stroke="#4ab0c0" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1={x0+tW} y1={pipeY_out+5} x2={x0+tW} y2={pipeY_out+5+subOut} stroke="#4ab0c0" strokeWidth="3.5" strokeLinecap="round"/>
      <polygon points={`${x0+tW+36},${pipeY_out+1} ${x0+tW+24},${pipeY_out+5} ${x0+tW+36},${pipeY_out+9}`} fill="#4ab0c0"/>
      <text x={x0+tW+38} y={pipeY_out-1} fill="#4ab0c0" fontSize="7" fontFamily="monospace">OUTLET</text>
      <text x={x0+tW+38} y={pipeY_out+11} fill="#4a7fa5" fontSize="6" fontFamily="monospace">Ø{pipeD}mm</text>
      <line x1={x0+tW-6} y1={pipeY_out+5} x2={x0+tW-6} y2={pipeY_out+5+subOut} stroke="#2a8090" strokeWidth="0.8" strokeDasharray="2,2"
        markerStart="url(#arrowN)" markerEnd="url(#arrowS)"/>
      <text x={x0+tW-8} y={pipeY_out+5+subOut/2+3} fill="#3a8090" fontSize="6" textAnchor="end" fontFamily="monospace">40 cm</text>

      {/* ── Ventilaciones ── */}
      {ventXs.map((vx,i)=>(
        <g key={i}>
          <rect x={vx-3} y={y0-30} width={6} height={30} fill="rgba(60,100,120,0.3)" stroke="#3a6080" strokeWidth="1" rx="1"/>
          <rect x={vx-5} y={y0-32} width={10} height={4} fill="#3a6080" rx="1"/>
          <text x={vx} y={y0-36} fill="#3a6080" fontSize="6" textAnchor="middle" fontFamily="monospace">Ø{ventD}</text>
          <text x={vx} y={y0-28} fill="#2a5060" fontSize="5" textAnchor="middle" fontFamily="monospace">VENT</text>
        </g>
      ))}

      {/* ── COTAS ── */}
      {/* Total depth (far left) */}
      <DimLine x1={x0} y1={y0} x2={x0} y2={yBot} label={`H=${fmt(r.hT)}m`} offset={-60} orient="v" color="#3a6080"/>
      {/* Useful depth (left) */}
      <DimLine x1={x0} y1={yWater} x2={x0} y2={yBot} label={`h=${fmt(r.depth)}m`} offset={-35} orient="v" color="#2a7090"/>
      {/* Freeboard (left, small) */}
      <DimLine x1={x0} y1={y0} x2={x0} y2={yWater} label={`FB=${fmt(freeboard)}m`} offset={-35} orient="v" color="#2a5060"/>
      {/* Length (bottom) */}
      <DimLine x1={x0} y1={yBot} x2={x0+tW} y2={yBot} label={`L = ${fmt(r.L)} m`} offset={28} orient="h" color="#3a6080"/>
      {/* Width label */}
      <text x={x0+tW/2} y={yBot+50} fill="#2a5070" fontSize="7" textAnchor="middle" fontFamily="monospace">
        W = {fmt(r.W)} m   ·   Area = {fmt(r.Vtot/r.depth,2)} m²
      </text>

      {/* Zone height annotations (right side) */}
      <DimLine x1={x0+tW} y1={yWater} x2={x0+tW} y2={yNataB} label={`${fmt(hNata,2)}m`} offset={48} orient="v" color="#7a6030"/>
      <DimLine x1={x0+tW} y1={yNataB} x2={x0+tW} y2={yLiqB}  label={`${fmt(hLiq,2)}m`}  offset={48} orient="v" color="#2a6080"/>
      <DimLine x1={x0+tW} y1={yLiqB}  x2={x0+tW} y2={ySludB}  label={`${fmt(hSludge,2)}m`} offset={48} orient="v" color="#6a4020"/>

    </svg>
  );
}

// ─── Perfil hidráulico ────────────────────────────────────────────────────────
function HydraulicProfile({ r, freeboard }) {
  const W=640, H=260;
  const ML=70, MR=30, MT=36, MB=52;
  const pW=W-ML-MR, pH=H-MT-MB;
  const x0=ML, y0=MT;

  // Zone heights in meters
  const Area    = r.Vtot / r.depth;
  const hSludge = r.Vs / Area;
  const hLiq    = r.Vl / Area;
  const hNata   = r.Vn / Area;

  // Elevations (reference: bottom of tank = 0.0m)
  const elBot   = 0;
  const elSludS = hSludge;                  // top of sludge
  const elLiqS  = hSludge + hLiq;           // top of liquid zone
  const elWS    = hSludge + hLiq + hNata;   // water surface ≈ r.depth
  const elTop   = r.depth + freeboard;      // top of tank

  // T-pipe inverts
  const elInletInv  = elWS - 0.30;  // 30cm below WS
  const elOutletInv = elWS - 0.40;  // 40cm below WS

  // Inlet pipe upstream elevation (slightly higher, hydraulic gradient)
  const elInletUpstream = elWS + 0.05; // 5cm above WS (headloss)

  // Scale
  const elMax = elTop + 0.3;
  const elMin = elBot - 0.15;
  const elRange = elMax - elMin;
  const toY = (el) => y0 + pH - (el - elMin) / elRange * pH;
  const toX = (f)  => x0 + pW * f;

  // Key horizontal positions
  const xInPipe   = toX(0.04);
  const xInWall   = toX(0.12);
  const xCh1      = r.chambers>=2 ? toX(r.chambers===3?0.48:0.56) : null;
  const xCh2      = r.chambers===3 ? toX(0.74) : null;
  const xOutWall  = toX(0.88);
  const xOutPipe  = toX(0.96);

  // Gradient line points
  const gradPoints = [
    [xInPipe,  toY(elInletUpstream)],
    [xInWall,  toY(elWS)],
    ...(xCh1 ? [[xCh1, toY(elWS-0.02)]] : []),
    ...(xCh2 ? [[xCh2, toY(elWS-0.04)]] : []),
    [xOutWall, toY(elWS-0.05)],
    [xOutPipe, toY(elOutletInv)],
  ];
  const gradPath = gradPoints.map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");

  // Elevation grid lines
  const gridEls = [];
  for (let el=Math.ceil(elMin*4)/4; el<=elMax; el+=0.25) gridEls.push(el);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{display:"block",margin:"14px 0 0",background:"rgba(0,0,0,0.12)",borderRadius:"6px"}}>
      <ArrowMarkers/>

      {/* Title */}
      <text x={x0+pW/2} y={14} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace" letterSpacing="2">PERFIL HIDRÁULICO LONGITUDINAL</text>
      <text x={x0+pW/2} y={24} fill="#2a5070" fontSize="6" textAnchor="middle" fontFamily="monospace">Referencia: fondo de la fosa = 0.00 m</text>

      {/* Grid */}
      {gridEls.map((el,i)=>(
        <g key={i}>
          <line x1={x0} y1={toY(el)} x2={x0+pW} y2={toY(el)} stroke="#0d2035" strokeWidth="0.5"/>
          <text x={x0-4} y={toY(el)+3} fill="#2a4a60" fontSize="6" textAnchor="end" fontFamily="monospace">{fmt(el,2)}</text>
        </g>
      ))}

      {/* Y-axis label */}
      <text x={x0-52} y={y0+pH/2} fill="#3a6080" fontSize="7" textAnchor="middle" fontFamily="monospace"
        transform={`rotate(-90,${x0-52},${y0+pH/2})`}>Cota (m)</text>

      {/* Zones background */}
      {/* Sludge */}
      <rect x={xInWall} y={toY(elSludS)} width={xOutWall-xInWall} height={toY(elBot)-toY(elSludS)}
        fill="rgba(100,65,30,0.25)" stroke="none"/>
      {/* Liquid */}
      <rect x={xInWall} y={toY(elLiqS)} width={xOutWall-xInWall} height={toY(elSludS)-toY(elLiqS)}
        fill="rgba(0,140,200,0.09)" stroke="none"/>
      {/* Natas */}
      <rect x={xInWall} y={toY(elWS)} width={xOutWall-xInWall} height={toY(elLiqS)-toY(elWS)}
        fill="rgba(180,140,50,0.20)" stroke="none"/>
      {/* Freeboard */}
      <rect x={xInWall} y={toY(elTop)} width={xOutWall-xInWall} height={toY(elWS)-toY(elTop)}
        fill="rgba(20,60,100,0.25)" stroke="none"/>

      {/* Tank walls */}
      <rect x={xInWall} y={toY(elTop)} width={xOutWall-xInWall} height={toY(elBot)-toY(elTop)}
        fill="none" stroke="#2a6090" strokeWidth="2.5" rx="1"/>
      {/* Tank floor fill */}
      <rect x={xInWall} y={toY(elBot)} width={xOutWall-xInWall} height={6} fill="#1e4060"/>

      {/* Chamber dividers */}
      {xCh1 && <rect x={xCh1-3} y={toY(elTop)} width={6} height={toY(elBot)-toY(elTop)} fill="rgba(30,64,96,0.6)" stroke="#2a5070" strokeWidth="1"/>}
      {xCh2 && <rect x={xCh2-3} y={toY(elTop)} width={6} height={toY(elBot)-toY(elTop)} fill="rgba(30,64,96,0.6)" stroke="#2a5070" strokeWidth="1"/>}

      {/* Water surface line */}
      <line x1={xInWall} y1={toY(elWS)} x2={xOutWall} y2={toY(elWS)}
        stroke="#00d4ff" strokeWidth="1.2" strokeDasharray="6,3" opacity="0.7"/>

      {/* Hydraulic gradient line */}
      <path d={gradPath} fill="none" stroke="#ff8c00" strokeWidth="1.8" strokeDasharray="5,3" opacity="0.9"/>
      <text x={xInPipe+2} y={toY(elInletUpstream)-5} fill="#ff8c00" fontSize="6" fontFamily="monospace">LGH</text>

      {/* Inlet pipe */}
      <line x1={xInPipe} y1={toY(elInletUpstream)} x2={xInWall} y2={toY(elInletInv)}
        stroke="#00d4ff" strokeWidth="4" strokeLinecap="round"/>
      <polygon points={`${xInPipe-2},${toY(elInletUpstream)-4} ${xInPipe+10},${toY(elInletUpstream)} ${xInPipe-2},${toY(elInletUpstream)+4}`} fill="#00d4ff"/>
      {/* T-pipe vertical inlet */}
      <line x1={xInWall} y1={toY(elInletInv)} x2={xInWall} y2={toY(elInletInv-0.30)}
        stroke="#00d4ff" strokeWidth="4" strokeLinecap="round"/>
      <text x={xInPipe-2} y={toY(elInletUpstream)-8} fill="#00d4ff" fontSize="6" textAnchor="middle" fontFamily="monospace">IN</text>

      {/* Outlet pipe */}
      <line x1={xOutWall} y1={toY(elOutletInv)} x2={xOutPipe} y2={toY(elOutletInv-0.02)}
        stroke="#4ab0c0" strokeWidth="4" strokeLinecap="round"/>
      <polygon points={`${xOutPipe+2},${toY(elOutletInv-0.02)-4} ${xOutPipe-10},${toY(elOutletInv-0.02)} ${xOutPipe+2},${toY(elOutletInv-0.02)+4}`} fill="#4ab0c0"/>
      {/* T-pipe vertical outlet */}
      <line x1={xOutWall} y1={toY(elOutletInv)} x2={xOutWall} y2={toY(elOutletInv-0.40)}
        stroke="#4ab0c0" strokeWidth="4" strokeLinecap="round"/>
      <text x={xOutPipe+2} y={toY(elOutletInv-0.02)-8} fill="#4ab0c0" fontSize="6" fontFamily="monospace">OUT</text>

      {/* Elevation annotations */}
      {[
        {el:elWS,    label:`NL = ${fmt(elWS,2)} m`, color:"#00d4ff"},
        {el:elSludS, label:`Lodos = ${fmt(elSludS,2)} m`, color:"#7a5030"},
        {el:elInletInv, label:`Inv. in = ${fmt(elInletInv,2)} m`, color:"#3a9aaa"},
        {el:elOutletInv,label:`Inv. out = ${fmt(elOutletInv,2)} m`, color:"#2a8090"},
      ].map((a,i)=>(
        <g key={i}>
          <line x1={xOutWall+2} y1={toY(a.el)} x2={x0+pW} y2={toY(a.el)} stroke={a.color} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5"/>
          <text x={x0+pW+2} y={toY(a.el)+3} fill={a.color} fontSize="5.5" fontFamily="monospace">{a.label}</text>
        </g>
      ))}

      {/* Zone labels */}
      <text x={(xInWall+xOutWall)/2} y={toY(elBot)+14} fill="#5a3520" fontSize="6" textAnchor="middle" fontFamily="monospace">SLUDGE ({fmt(hSludge,2)}m)</text>
      <text x={(xInWall+(xCh1||xOutWall))/2} y={toY(elSludS+hLiq/2)+3} fill="#3a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">LIQUID ZONE ({fmt(hLiq,2)}m)</text>
      <text x={(xInWall+xOutWall)/2} y={toY(elLiqS+hNata/2)+3} fill="#9a8040" fontSize="6" textAnchor="middle" fontFamily="monospace">SCUM ({fmt(hNata,2)}m)</text>
      <text x={(xInWall+xOutWall)/2} y={toY(elWS+freeboard/2)+3} fill="#3a5070" fontSize="6" textAnchor="middle" fontFamily="monospace">FREEBOARD ({fmt(freeboard,2)}m)</text>

      {/* Legend */}
      <line x1={x0} y1={y0+pH+38} x2={x0+18} y2={y0+pH+38} stroke="#ff8c00" strokeWidth="1.5" strokeDasharray="4,2"/>
      <text x={x0+20} y={y0+pH+41} fill="#ff8c00" fontSize="6" fontFamily="monospace">Energy Grade Line (EGL)</text>
      <line x1={x0+130} y1={y0+pH+38} x2={x0+148} y2={y0+pH+38} stroke="#00d4ff" strokeWidth="1.2" strokeDasharray="5,2"/>
      <text x={x0+150} y={y0+pH+41} fill="#00d4ff" fontSize="6" fontFamily="monospace">Water Level (WL)</text>
    </svg>
  );
}

export { ArrowMarkers, DimLine, DetailedSchematic, HydraulicProfile };
