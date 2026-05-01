"use client";
import { useState, useRef } from "react";

/**
 * IsometricDiagram Component
 * Generates isometric 3D technical infographics of septic systems
 * with dual modes: SVG (instant, proportional) and image generation (photorealistic)
 */

const DS = {
  // Colors
  cyanBright: "#00F5FF",
  cyanDim: "rgba(0, 245, 255, 0.3)",
  greenBright: "#00FF88",
  greenDim: "rgba(0, 255, 136, 0.2)",
  amberBright: "#FFB020",
  ambierDim: "rgba(255, 176, 32, 0.15)",
  bgDark: "#020C10",
  bgCard: "#041820",
  textMain: "#E8F8FF",
  textMuted: "#4A7A8A",
  border: "rgba(0, 245, 255, 0.12)",
};

// Isometric projection helpers
const iso = {
  // Project 3D (x, y, z) to 2D isometric view
  project: (x, y, z) => {
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    const px = (x - z) * cos30;
    const py = y + (x + z) * sin30;
    return [px, py];
  },

  // Draw an isometric box (rectangular prism)
  box: (x, y, z, w, h, d, fill, stroke = "#00F5FF") => {
    const [x1, y1] = iso.project(x, y, z);
    const [x2, y2] = iso.project(x + w, y, z);
    const [x3, y3] = iso.project(x + w, y, z + d);
    const [x4, y4] = iso.project(x, y, z + d);
    const [x5, y5] = iso.project(x, y + h, z);
    const [x6, y6] = iso.project(x + w, y + h, z);
    const [x7, y7] = iso.project(x + w, y + h, z + d);
    const [x8, y8] = iso.project(x, y + h, z + d);

    return {
      top: `M${x5},${y5} L${x6},${y6} L${x7},${y7} L${x8},${y8} Z`,
      front: `M${x1},${y1} L${x2},${y2} L${x6},${y6} L${x5},${y5} Z`,
      right: `M${x2},${y2} L${x3},${y3} L${x7},${y7} L${x6},${y6} Z`,
      side: `M${x3},${y3} L${x4},${y4} L${x8},${y8} L${x7},${y7} Z`,
    };
  },

  // Draw cylinder (pipes, vents)
  cylinder: (x, y, z, radius, height, segments = 8) => {
    const [cx, cy] = iso.project(x, y, z);
    const [cx2, cy2] = iso.project(x, y + height, z);

    const points = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius;
      const [ix, iy] = iso.project(px, y, pz);
      points.push({ x: ix, y: iy, angle });
    }
    return { center: { x: cx, y: cy }, center2: { x: cx2, y: cy2 }, points };
  },
};

// Utility function for formatting numbers
const fmt = (v, d = 2) => Number(v).toFixed(d);

// SVG-based isometric diagram
function SepticSystemIsometric({
  r,
  projectName = "Proyecto",
  location = "Sitio",
  designer = "Diseño",
}) {
  const SVG_W = 960;
  const SVG_H = 720;
  const scale = 25; // pixels per meter

  // Dimensions in model coordinates
  const tankLength = r.L || 3;
  const tankWidth = r.W || 1.5;
  const tankDepth = r.depth || 1.4;
  const freeboard = 0.3;
  const houseSize = 4;
  const houseHeight = 3;
  const distanceToTank = 8;
  const fieldWidth = 6;
  const fieldDepth = 5;
  const trenchSpacing = 1;

  // Viewport center
  const cx = SVG_W / 2;
  const cy = SVG_H / 2.5;

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: DS.bgDark, border: `1px solid ${DS.border}`, borderRadius: "4px" }}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,245,255,0.4)" />
          <stop offset="100%" stopColor="rgba(0,200,255,0.2)" />
        </linearGradient>
        <linearGradient id="earthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(139,90,43,0.6)" />
          <stop offset="100%" stopColor="rgba(101,67,33,0.8)" />
        </linearGradient>
        <pattern id="soilDots" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="0.8" fill="rgba(139,90,43,0.4)" />
        </pattern>

        {/* Arrow markers */}
        <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <polygon points="0,0 8,4 0,8" fill={DS.greenBright} />
        </marker>
      </defs>

      {/* Ground/earth background */}
      <rect x="0" y={cy + 150} width={SVG_W} height={SVG_H} fill="url(#soilDots)" opacity="0.7" />
      <text x="10" y={SVG_H - 10} fontSize="10" fill={DS.textMuted} fontFamily="monospace">
        VISTA ISOMÉTRICA • ESCALA 1:{Math.round((1 / scale) * 100)}m
      </text>

      {/* HOUSE */}
      <g>
        {/* House body (simple isometric box) */}
        <g transform={`translate(${cx - 300},${cy - 150})`}>
          {/* Foundation */}
          <path
            d={iso.box(-houseSize / 2, 0, -houseSize / 2, houseSize, 0.5, houseSize).front}
            fill="rgba(180,140,100,0.8)"
            stroke={DS.textMuted}
            strokeWidth="1.5"
          />

          {/* Walls */}
          <path
            d={
              iso.box(-houseSize / 2, 0.5, -houseSize / 2, houseSize, houseHeight, houseSize).front
            }
            fill="rgba(210,180,140,0.9)"
            stroke={DS.cyanDim}
            strokeWidth="1.5"
            opacity="0.8"
          />
          <path
            d={
              iso.box(-houseSize / 2, 0.5, -houseSize / 2, houseSize, houseHeight, houseSize).right
            }
            fill="rgba(180,150,110,0.8)"
            stroke={DS.cyanDim}
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Roof */}
          <path
            d={
              iso.box(-houseSize / 2, houseHeight + 0.5, -houseSize / 2, houseSize, 1.2, houseSize)
                .top
            }
            fill="rgba(200,100,50,0.9)"
            stroke={DS.amberBright}
            strokeWidth="1.5"
            opacity="0.7"
          />

          {/* Door */}
          <rect
            x="20"
            y="120"
            width="30"
            height="50"
            fill="rgba(100,60,30,0.9)"
            stroke={DS.textMuted}
            strokeWidth="0.8"
          />

          {/* Windows */}
          <rect
            x="-50"
            y="100"
            width="20"
            height="20"
            fill="rgba(100,200,255,0.6)"
            stroke={DS.cyanBright}
            strokeWidth="0.8"
          />
          <rect
            x="40"
            y="100"
            width="20"
            height="20"
            fill="rgba(100,200,255,0.6)"
            stroke={DS.cyanBright}
            strokeWidth="0.8"
          />

          {/* Label */}
          <text
            x="0"
            y="-15"
            fontSize="11"
            fontWeight="bold"
            fill={DS.cyanBright}
            textAnchor="middle"
            fontFamily="'Orbitron',sans-serif"
          >
            VIVIENDA
          </text>
        </g>
      </g>

      {/* DRAINAGE PIPES from house to tank */}
      <g>
        {/* Main pipe line (orange PVC-style) */}
        <path
          d={`M${cx - 200},${cy - 80} Q${cx - 100},${cy + 40} ${cx + 100},${cy + 120}`}
          stroke="#FF8C00"
          strokeWidth="6"
          fill="none"
          opacity="0.8"
          strokeLinecap="round"
        />
        <path
          d={`M${cx - 200},${cy - 80} Q${cx - 100},${cy + 40} ${cx + 100},${cy + 120}`}
          stroke="#FFB020"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          strokeDasharray="4,2"
        />

        {/* Pipe label */}
        <text
          x={cx - 80}
          y={cy - 20}
          fontSize="9"
          fill={DS.amberBright}
          fontFamily="monospace"
          fontWeight="bold"
        >
          TUBERÍA PVC Ø 4"
        </text>
      </g>

      {/* SEPTIC TANK (main component) */}
      <g>
        {/* Tank main body */}
        <g transform={`translate(${cx + 150},${cy + 80})`}>
          {/* Earth around tank (background) */}
          <path
            d={
              iso.box(-tankWidth / 2, -1.5, -tankLength / 2, tankWidth, tankDepth + 2, tankLength)
                .front
            }
            fill="url(#earthGrad)"
            stroke={DS.textMuted}
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Tank body */}
          <path
            d={
              iso.box(
                -tankWidth / 2,
                -freeboard,
                -tankLength / 2,
                tankWidth,
                tankDepth + freeboard,
                tankLength
              ).front
            }
            fill="rgba(120,140,160,0.9)"
            stroke={DS.cyanBright}
            strokeWidth="2"
          />
          <path
            d={
              iso.box(
                -tankWidth / 2,
                -freeboard,
                -tankLength / 2,
                tankWidth,
                tankDepth + freeboard,
                tankLength
              ).right
            }
            fill="rgba(100,120,140,0.8)"
            stroke={DS.cyanBright}
            strokeWidth="1.5"
          />
          <path
            d={
              iso.box(
                -tankWidth / 2,
                -freeboard,
                -tankLength / 2,
                tankWidth,
                tankDepth + freeboard,
                tankLength
              ).top
            }
            fill="rgba(140,160,180,0.7)"
            stroke={DS.cyanDim}
            strokeWidth="1.5"
          />

          {/* Water level inside tank */}
          <ellipse
            cx="0"
            cy={(-freeboard + tankDepth * 0.65) * scale}
            rx={(tankWidth / 2) * scale * 0.85}
            ry={(tankWidth / 4) * scale}
            fill="url(#waterGrad)"
            stroke={DS.cyanBright}
            strokeWidth="1"
            opacity="0.7"
          />

          {/* Internal zones (schematic) */}
          <text
            x="0"
            y="-30"
            fontSize="10"
            fontWeight="bold"
            fill={DS.greenBright}
            textAnchor="middle"
            fontFamily="monospace"
          >
            FOSA SÉPTICA
          </text>

          {/* Scum layer indicator */}
          <path
            d={`M${(-tankWidth / 2) * scale * 0.8},${-5} L${(tankWidth / 2) * scale * 0.8},${-5}`}
            stroke={DS.amberBright}
            strokeWidth="2"
            opacity="0.6"
          />
          <text
            x="0"
            y="-12"
            fontSize="8"
            fill={DS.amberBright}
            textAnchor="middle"
            fontFamily="monospace"
          >
            NATA
          </text>

          {/* Liquid zone */}
          <text
            x="0"
            y="25"
            fontSize="8"
            fill={DS.cyanBright}
            textAnchor="middle"
            fontFamily="monospace"
          >
            LÍQUIDO
          </text>

          {/* Sludge zone */}
          <text
            x="0"
            y="55"
            fontSize="8"
            fill={DS.textMuted}
            textAnchor="middle"
            fontFamily="monospace"
          >
            LODOS
          </text>

          {/* Inlet */}
          <circle
            cx={(-tankWidth / 2) * scale * 0.6}
            cy="-8"
            r="4"
            fill={DS.greenBright}
            stroke={DS.greenBright}
            strokeWidth="1"
          />
          <text
            x={(-tankWidth / 2) * scale * 0.6}
            y="8"
            fontSize="7"
            fill={DS.greenBright}
            textAnchor="middle"
            fontFamily="monospace"
          >
            ENT
          </text>

          {/* Outlet */}
          <circle
            cx={(tankWidth / 2) * scale * 0.6}
            cy="15"
            r="4"
            fill={DS.amberBright}
            stroke={DS.amberBright}
            strokeWidth="1"
          />
          <text
            x={(tankWidth / 2) * scale * 0.6}
            y="28"
            fontSize="7"
            fill={DS.amberBright}
            textAnchor="middle"
            fontFamily="monospace"
          >
            SAL
          </text>

          {/* Vent */}
          <rect
            x="-6"
            y={-30}
            width="12"
            height="8"
            fill={DS.cyanDim}
            stroke={DS.cyanBright}
            strokeWidth="1"
          />
          <text
            x="0"
            y="-18"
            fontSize="6"
            fill={DS.cyanBright}
            textAnchor="middle"
            fontFamily="monospace"
          >
            VENT
          </text>

          {/* Dimensions */}
          <text
            x={(-tankWidth * scale) / 2 - 40}
            y="45"
            fontSize="8"
            fill={DS.textMuted}
            fontFamily="monospace"
          >
            {fmt(tankWidth)}m
          </text>
          <text
            x="50"
            y={(tankDepth * scale) / 2}
            fontSize="8"
            fill={DS.textMuted}
            fontFamily="monospace"
          >
            {fmt(tankDepth)}m
          </text>
          <text x={10} y={-40} fontSize="8" fill={DS.textMuted} fontFamily="monospace">
            {fmt(tankLength)}m
          </text>
        </g>
      </g>

      {/* INFILTRATION FIELD */}
      <g>
        <g transform={`translate(${cx + 350},${cy + 200})`}>
          {/* Field boundary */}
          <rect
            x={(-fieldWidth * scale) / 2}
            y="0"
            width={fieldWidth * scale}
            height={fieldDepth * scale}
            fill="rgba(139,90,43,0.4)"
            stroke={DS.cyanDim}
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          {/* Trenches */}
          {Array.from({ length: Math.floor(fieldDepth / trenchSpacing) }).map((_, i) => (
            <g key={i}>
              <line
                x1={(-fieldWidth * scale) / 2 + 20}
                y1={i * trenchSpacing * scale}
                x2={(fieldWidth * scale) / 2 - 20}
                y2={i * trenchSpacing * scale}
                stroke="#FF8C00"
                strokeWidth="3"
                opacity="0.7"
              />
              <circle
                cx={(-fieldWidth * scale) / 2 + 15}
                cy={i * trenchSpacing * scale}
                r="2.5"
                fill="#FFB020"
                opacity="0.6"
              />
            </g>
          ))}

          {/* Label */}
          <text
            x={(fieldWidth * scale) / 2 - 10}
            y={fieldDepth * scale + 20}
            fontSize="10"
            fontWeight="bold"
            fill={DS.greenBright}
            fontFamily="monospace"
          >
            CAMPO DE INFILTRACIÓN
          </text>

          {/* Dimensions */}
          <text
            x="0"
            y={fieldDepth * scale + 35}
            fontSize="8"
            fill={DS.textMuted}
            textAnchor="middle"
            fontFamily="monospace"
          >
            {fmt(fieldWidth)}m × {fmt(fieldDepth)}m
          </text>
        </g>
      </g>

      {/* CONNECTION ARROW from tank to field */}
      <path
        d={`M${cx + 280},${cy + 220} L${cx + 340},${cy + 240}`}
        stroke={DS.greenBright}
        strokeWidth="2"
        markerEnd="url(#arrowGreen)"
        opacity="0.7"
      />
      <text x={cx + 310} y={cy + 215} fontSize="8" fill={DS.greenBright} fontFamily="monospace">
        EFLUENTE
      </text>

      {/* DATA PANEL (right side) */}
      <g>
        <rect
          x={SVG_W - 260}
          y="20"
          width="240"
          height="280"
          fill={DS.bgCard}
          stroke={DS.border}
          strokeWidth="1"
          rx="3"
        />

        {/* Panel title */}
        <text
          x={SVG_W - 130}
          y="45"
          fontSize="12"
          fontWeight="bold"
          fill={DS.cyanBright}
          textAnchor="middle"
          fontFamily="'Orbitron',sans-serif"
        >
          PARÁMETROS TÉCNICOS
        </text>

        {/* Data rows */}
        <text x={SVG_W - 250} y="70" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          Usuarios:
        </text>
        <text
          x={SVG_W - 30}
          y="70"
          fontSize="9"
          fill={DS.cyanBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {r.users || 5}
        </text>

        <text x={SVG_W - 250} y="90" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          Vol. Fosa:
        </text>
        <text
          x={SVG_W - 30}
          y="90"
          fontSize="9"
          fill={DS.greenBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {fmt(r.Vtot)} m³
        </text>

        <text x={SVG_W - 250} y="110" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          Profundidad:
        </text>
        <text
          x={SVG_W - 30}
          y="110"
          fontSize="9"
          fill={DS.cyanBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {fmt(r.depth)} m
        </text>

        <text x={SVG_W - 250} y="130" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          Largo × Ancho:
        </text>
        <text
          x={SVG_W - 30}
          y="130"
          fontSize="9"
          fill={DS.cyanBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {fmt(r.L)} × {fmt(r.W)} m
        </text>

        <text x={SVG_W - 250} y="150" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          TRH:
        </text>
        <text
          x={SVG_W - 30}
          y="150"
          fontSize="9"
          fill={DS.amberBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {fmt(r.trhDays, 1)} días
        </text>

        <text x={SVG_W - 250} y="170" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          SRT:
        </text>
        <text
          x={SVG_W - 30}
          y="170"
          fontSize="9"
          fill={DS.greenBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {fmt(r.SRT)} días
        </text>

        <text x={SVG_W - 250} y="190" fontSize="9" fill={DS.textMuted} fontFamily="monospace">
          Caudal:
        </text>
        <text
          x={SVG_W - 30}
          y="190"
          fontSize="9"
          fill={DS.cyanBright}
          fontFamily="monospace"
          textAnchor="end"
        >
          {fmt(r.Qd * 1000)} L/día
        </text>

        {/* Project info */}
        <line
          x1={SVG_W - 250}
          y1="210"
          x2={SVG_W - 30}
          y2="210"
          stroke={DS.border}
          strokeWidth="0.5"
        />

        <text x={SVG_W - 250} y="230" fontSize="8" fill={DS.textMuted} fontFamily="monospace">
          Proyecto:
        </text>
        <text
          x={SVG_W - 30}
          y="230"
          fontSize="8"
          fill={DS.textMain}
          fontFamily="monospace"
          textAnchor="end"
        >
          {projectName.substring(0, 20)}
        </text>

        <text x={SVG_W - 250} y="250" fontSize="8" fill={DS.textMuted} fontFamily="monospace">
          Sitio:
        </text>
        <text
          x={SVG_W - 30}
          y="250"
          fontSize="8"
          fill={DS.textMain}
          fontFamily="monospace"
          textAnchor="end"
        >
          {location.substring(0, 20)}
        </text>

        <text x={SVG_W - 250} y="270" fontSize="8" fill={DS.textMuted} fontFamily="monospace">
          Diseño:
        </text>
        <text
          x={SVG_W - 30}
          y="270"
          fontSize="8"
          fill={DS.cyanDim}
          fontFamily="monospace"
          textAnchor="end"
        >
          {designer.substring(0, 20)}
        </text>

        {/* Certification */}
        <text
          x={SVG_W - 130}
          y="290"
          fontSize="6"
          fill={DS.textMuted}
          textAnchor="middle"
          fontFamily="monospace"
        >
          EN 12566-1 • RAS 2017
        </text>
      </g>

      {/* Bottom status bar */}
      <rect
        x="0"
        y={SVG_H - 30}
        width={SVG_W}
        height="30"
        fill={DS.bgCard}
        stroke={DS.border}
        strokeWidth="1"
      />
      <text x="20" y={SVG_H - 8} fontSize="9" fill={DS.textMuted} fontFamily="monospace">
        Isometric View • Sistema de Tratamiento de Aguas Residuales
      </text>
    </svg>
  );
}

// Image generation mode via Claude API
function ImageGenerationMode({ r, projectName, location, designer, onLoading }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    onLoading?.(true);

    try {
      // Create detailed prompt for Claude to generate the image
      const prompt = `Create a professional, photorealistic isometric 3D technical infographic of a complete septic system installation.

System Parameters:
- Number of users: ${r.users || 5}
- Total tank volume: ${fmt(r.Vtot)} m³
- Tank dimensions: ${fmt(r.L)}m (length) × ${fmt(r.W)}m (width) × ${fmt(r.depth)}m (depth)
- Hydraulic retention time: ${fmt(r.trhDays, 1)} days
- Daily flow: ${fmt(r.Qd * 1000)} L/day
- Project: ${projectName}
- Location: ${location}

Show:
1. A residential house (2-story, terracotta roof) on elevated ground in the upper left
2. Orange PVC drainage pipes (4" Ø) running from the house foundation down to the buried tank, with visible slope
3. A reinforced concrete septic tank buried underground in the middle-right, showing:
   - The lid partially open/visible
   - Internal chambers with water level visible through cross-section cutaway
   - Scum layer (nata) in brown at top
   - Liquid zone in blue-green in middle
   - Sludge (lodos) in dark gray at bottom
   - Inlet and outlet pipes labeled
   - Vent pipe extending above ground
4. An infiltration field in the lower right with:
   - Trenches (parallel lines) with spacing
   - Gravel/sand infiltration area
   - Dimension indicators
5. Green arrow showing effluent flow from tank to infiltration field
6. Ground cross-section showing soil layers, grass, and earth
7. Engineering-style dimension annotations with values
8. A data panel showing all technical parameters
9. Professional title block with project metadata
10. Light cyan and amber accents on key elements
11. Isometric perspective from upper-left viewpoint
12. Professional engineering drawing style, clean and detailed
13. Color scheme: dark background with cyan/green/amber technical accents
14. Metric scale indicator: 1:50

Style: Professional CAD-style technical illustration, detailed, clear labeling, professional engineering drawing conventions. High quality, detailed shading, realistic materials (concrete, earth, water, PVC), isometric perspective.`;

      // Call Claude API to generate the image
      const response = await fetch("/api/generate-isometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemParams: { ...r, projectName, location, designer },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
      console.error("Image generation error:", err);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <button
        onClick={generateImage}
        disabled={loading}
        style={{
          background: loading ? "#2a5070" : DS.greenBright,
          color: loading ? DS.textMuted : "#020C10",
          border: `1px solid ${DS.greenBright}`,
          padding: "12px 24px",
          fontSize: "14px",
          fontWeight: "bold",
          fontFamily: "'Orbitron', sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
          borderRadius: "4px",
          transition: "all 0.2s",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {loading ? "⏳ Generando imagen..." : "🎨 Generar Imagen Fotorrealista"}
      </button>

      {error && (
        <div
          style={{
            background: "rgba(255, 50, 50, 0.1)",
            border: `1px solid rgba(255, 50, 50, 0.3)`,
            color: "#FF6B6B",
            padding: "12px",
            borderRadius: "4px",
            fontSize: "13px",
            fontFamily: "monospace",
          }}
        >
          ❌ Error: {error}
        </div>
      )}

      {imageUrl && (
        <div
          style={{
            background: DS.bgCard,
            border: `1px solid ${DS.border}`,
            padding: "12px",
            borderRadius: "4px",
            overflow: "auto",
            maxHeight: "600px",
          }}
        >
          <img
            src={imageUrl}
            alt="Isometric Diagram"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "3px",
              display: "block",
            }}
          />
          <a
            href={imageUrl}
            download
            style={{
              display: "block",
              marginTop: "12px",
              color: DS.cyanBright,
              textDecoration: "none",
              fontSize: "12px",
              fontFamily: "monospace",
              textAlign: "center",
            }}
          >
            ⬇️ Descargar imagen
          </a>
        </div>
      )}

      {!imageUrl && !loading && (
        <div
          style={{
            background: DS.bgCard,
            border: `1px solid ${DS.border}`,
            padding: "24px",
            borderRadius: "4px",
            textAlign: "center",
            color: DS.textMuted,
            fontSize: "13px",
            fontFamily: "monospace",
          }}
        >
          Haz clic en "Generar Imagen Fotorrealista" para crear una visualización detallada en alta
          calidad
        </div>
      )}
    </div>
  );
}

// Main IsometricDiagram component
export default function IsometricDiagram({
  r,
  projectName = "Proyecto",
  location = "Sitio",
  designer = "Diseño",
}) {
  const [mode, setMode] = useState("svg"); // "svg" or "image"
  const [isGenerating, setIsGenerating] = useState(false);
  const svgRef = useRef(null);

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${projectName}_isometrico.png`;
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const fmt = (v, d = 2) => Number(v).toFixed(d);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "0",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Mode toggle */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "0 20px 12px 20px",
          borderBottom: `1px solid ${DS.border}`,
        }}
      >
        <button
          onClick={() => setMode("svg")}
          style={{
            background: mode === "svg" ? DS.cyanBright : "transparent",
            color: mode === "svg" ? "#020C10" : DS.textMuted,
            border: `1px solid ${mode === "svg" ? DS.cyanBright : DS.border}`,
            padding: "8px 16px",
            fontSize: "12px",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: "3px",
            transition: "all 0.2s",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          ⚙️ SVG Vectorial
        </button>
        <button
          onClick={() => setMode("image")}
          style={{
            background: mode === "image" ? DS.amberBright : "transparent",
            color: mode === "image" ? "#020C10" : DS.textMuted,
            border: `1px solid ${mode === "image" ? DS.amberBright : DS.border}`,
            padding: "8px 16px",
            fontSize: "12px",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: "3px",
            transition: "all 0.2s",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          🎨 Fotorrealista
        </button>

        {mode === "svg" && (
          <button
            onClick={downloadSVG}
            style={{
              background: "transparent",
              color: DS.greenBright,
              border: `1px solid ${DS.greenBright}`,
              padding: "8px 16px",
              fontSize: "12px",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: "bold",
              cursor: "pointer",
              borderRadius: "3px",
              transition: "all 0.2s",
              marginLeft: "auto",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            ⬇️ Descargar PNG
          </button>
        )}
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {mode === "svg" ? (
          <div ref={svgRef} style={{ width: "100%", maxWidth: "1000px" }}>
            <SepticSystemIsometric
              r={r}
              projectName={projectName}
              location={location}
              designer={designer}
            />
          </div>
        ) : (
          <ImageGenerationMode
            r={r}
            projectName={projectName}
            location={location}
            designer={designer}
            onLoading={setIsGenerating}
          />
        )}
      </div>
    </div>
  );
}
