"use client";
// src/components/landing/PlantaHero.jsx
// Ilustración isométrica de la PTAP con telemetría y micro-animaciones:
//   · flotación de la isla + sombra que respira
//   · puentes barredores de los dos clarificadores girando en perspectiva
//   · nivel de agua del tanque de reserva subiendo y bajando
//   · corrientes y micro-burbujas en los tanques de aireación (recortadas
//     con un clip-path derivado de los píxeles de agua del PNG)
//   · ventanas de los dos edificios prendiéndose y apagándose
//   · cotas de telemetría (Q, DBO, SST, pH) que se dibujan en secuencia
//
// El PNG vive en /public/planta-tratamiento.png (fondo transparente).

import { WATER_CLIP, WINDOWS } from "./plantaPaths";

// Micro-burbujas: puntos (en el espacio de la imagen) donde nacen.
const BUBBLES = [
  [345, 300],
  [366, 316],
  [320, 346],
  [301, 361],
  [341, 376],
  [371, 391],
  [401, 401],
  [431, 386],
  [456, 361],
  [471, 341],
  [481, 316],
  [506, 301],
  [441, 286],
  [411, 271],
  [391, 286],
  [361, 336],
  [416, 346],
  [299, 321],
];

// Corrientes: rejilla que se desplaza (48,24) por ciclo → loop sin salto.
const STREAKS = [];
for (let y = 250; y < 460; y += 24) {
  for (let x = 250; x < 660; x += 48) {
    STREAKS.push([x + (((y - 250) / 24) % 2) * 24, y]);
  }
}

const PLANTA_CSS = `
@keyframes pt-float  { 0%,100% { transform: translateY(-10px); } 50% { transform: translateY(10px); } }
@keyframes pt-shadow { 0%,100% { transform: scaleX(.92); opacity:.16; } 50% { transform: scaleX(1.04); opacity:.28; } }
@keyframes pt-in     { to { opacity:1; transform:none; } }
@keyframes pt-draw   { to { stroke-dashoffset:0; } }
@keyframes pt-ping   { 0%,100% { transform:scale(1); opacity:.9; } 50% { transform:scale(1.9); opacity:0; } }
@keyframes pt-flow   { to { stroke-dashoffset:-320; } }
@keyframes pt-spin   { to { transform: rotate(360deg); } }
@keyframes pt-level  { 0%,100% { transform: translateY(-4px); } 50% { transform: translateY(6px); } }
@keyframes pt-drift  { to { transform: translate(48px,24px); } }
@keyframes pt-bub    { 0% { opacity:0; transform:translateY(3px) scale(.45); } 25% { opacity:.7; } 100% { opacity:0; transform:translateY(-15px) scale(1.15); } }

.pt-wrap  { position: relative; display: flex; align-items: center; justify-content: center; padding: 20px 0 40px; opacity: 0; animation: pt-in .9s cubic-bezier(.16,1,.3,1) .9s forwards; }
.pt-shade { position: absolute; bottom: 30px; left: 21%; width: 58%; height: 26px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(19,77,116,.5), transparent 70%); filter: blur(10px); animation: pt-shadow 7s ease-in-out infinite; pointer-events: none; }
.pt-float { position: relative; width: 100%; max-width: 600px; animation: pt-float 7s ease-in-out infinite; }
.pt-img   { display: block; width: 100%; height: auto; filter: drop-shadow(0 22px 28px rgba(19,77,116,.2)); }
.pt-svg   { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .pt-wrap, .pt-shade, .pt-float, .pt-svg *, .pt-svg { animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important; }
}
`;

export default function PlantaHero() {
  return (
    <div className="pt-wrap">
      <style dangerouslySetInnerHTML={{ __html: PLANTA_CSS }} />
      <div className="pt-shade" />
      <div className="pt-float">
        <img
          className="pt-img"
          src="/planta-tratamiento.png"
          alt="Planta de tratamiento de aguas residuales, vista isométrica"
        />
        <svg className="pt-svg" viewBox="0 0 1021 759" fill="none">
          <g>
            <g transform="translate(463,131) scale(1,0.465)">
              <ellipse rx="78" ry="78" fill="#4C74A0"></ellipse>
              <ellipse
                rx="78"
                ry="78"
                fill="none"
                stroke="#000"
                strokeOpacity=".1"
                strokeWidth="9"
              ></ellipse>
              <g style={{ transformOrigin: "0 0", animation: "pt-spin 24s linear infinite" }}>
                <rect x="-78" y="4" width="156" height="15" rx="3" fill="#000" opacity=".13"></rect>
                <rect x="-78" y="-8" width="156" height="15" rx="3" fill="#E9E9E1"></rect>
                <rect x="-78" y="4" width="156" height="3" fill="#B9B9AF"></rect>
                <circle r="13" fill="#F2F2EA"></circle>
                <circle r="13" fill="none" stroke="#B9B9AF" strokeWidth="2"></circle>
              </g>
            </g>
            <g transform="translate(625,230) scale(1,0.475)">
              <ellipse rx="79" ry="79" fill="#4C77A3"></ellipse>
              <ellipse
                rx="79"
                ry="79"
                fill="none"
                stroke="#000"
                strokeOpacity=".1"
                strokeWidth="9"
              ></ellipse>
              <g
                style={{
                  transformOrigin: "0 0",
                  animation: "pt-spin 24s linear infinite",
                  animationDelay: "-9s",
                }}
              >
                <rect x="-79" y="4" width="158" height="15" rx="3" fill="#000" opacity=".13"></rect>
                <rect x="-79" y="-8" width="158" height="15" rx="3" fill="#E9E9E1"></rect>
                <rect x="-79" y="4" width="158" height="3" fill="#B9B9AF"></rect>
                <circle r="13" fill="#F2F2EA"></circle>
                <circle r="13" fill="none" stroke="#B9B9AF" strokeWidth="2"></circle>
              </g>
            </g>
          </g>
          <g>
            {WINDOWS.map((d, i) => (
              <path key={"on" + i} d={d} fill="#F2C24A"></path>
            ))}
          </g>
          <defs>
            <clipPath id="pt-water">
              <path d={WATER_CLIP}></path>
            </clipPath>
          </defs>
          <g clipPath="url(#pt-water)">
            <g style={{ animation: "pt-drift 7s linear infinite" }}>
              <g transform="translate(-48,-24)">
                {STREAKS.map(([x, y], i) => (
                  <path
                    key={i}
                    d={`M${x} ${y}l26 13`}
                    stroke="#EAF7FF"
                    strokeOpacity=".22"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  ></path>
                ))}
              </g>
            </g>
            <g>
              {BUBBLES.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3.4 + (i % 3) * 0.9}
                  fill="#EAF7FF"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: `pt-bub ${4.2 + (i % 5) * 0.7}s ease-out ${(i * 0.42).toFixed(2)}s infinite`,
                  }}
                ></circle>
              ))}
            </g>
          </g>
          <g>
            <ellipse cx="811" cy="246" rx="68.5" ry="33" fill="#4A6A6D"></ellipse>
            <ellipse
              cx="811"
              cy="246"
              rx="68.5"
              ry="33"
              fill="none"
              stroke="#000"
              strokeOpacity=".18"
              strokeWidth="6"
            ></ellipse>
            <g style={{ animation: "pt-level 11s ease-in-out infinite" }}>
              <ellipse cx="811" cy="247" rx="64" ry="26.5" fill="#6ECDDB"></ellipse>
              <ellipse
                cx="811"
                cy="247"
                rx="64"
                ry="26.5"
                fill="none"
                stroke="#8FDCE7"
                strokeWidth="2.5"
              ></ellipse>
              <ellipse cx="793" cy="240" rx="22" ry="6" fill="#8FDCE7" opacity=".3"></ellipse>
            </g>
          </g>
          <g stroke="#0369A1" strokeWidth="2.4" strokeLinecap="round" opacity=".9">
            <path
              d="M238 470 C 300 424, 345 388, 400 344"
              strokeDasharray="9 11"
              style={{ animation: "pt-flow 9s linear infinite" }}
            ></path>
            <path
              d="M425 322 C 490 285, 540 250, 590 228"
              strokeDasharray="9 11"
              style={{ animation: "pt-flow 9s linear infinite", animationDelay: "-1.2s" }}
            ></path>
            <path
              d="M622 230 C 690 240, 745 250, 795 260"
              strokeDasharray="9 11"
              style={{ animation: "pt-flow 9s linear infinite", animationDelay: "-2.4s" }}
            ></path>
          </g>

          <g fontFamily="'JetBrains Mono',monospace" fontWeight="600">
            <g style={{ opacity: "0", animation: "pt-in .6s ease 1.4s forwards" }}>
              <path
                d="M225 470 L225 120 L152 74"
                stroke="#0369A1"
                strokeWidth="1.6"
                strokeDasharray="420"
                strokeDashoffset="420"
                style={{ animation: "pt-draw .9s ease 1.5s forwards" }}
              ></path>
              <rect x="20" y="24" width="130" height="48" fill="#FCFCF9" opacity=".93"></rect>
              <text
                x="142"
                y="44"
                textAnchor="end"
                fill="#6B746F"
                fontSize="13"
                fontWeight="400"
                letterSpacing="1.4"
              >
                01 · ENTRADA
              </text>
              <text x="142" y="66" textAnchor="end" fill="#0369A1" fontSize="18">
                Q = 48 L/s
              </text>
              <circle
                cx="225"
                cy="470"
                r="10"
                fill="#0369A1"
                opacity=".3"
                style={{ animation: "pt-ping 3s ease-out infinite" }}
              ></circle>
              <circle cx="225" cy="470" r="5.5" fill="#0369A1"></circle>
            </g>

            <g style={{ opacity: "0", animation: "pt-in .6s ease 1.85s forwards" }}>
              <path
                d="M412 332 L330 590 L196 716"
                stroke="#0369A1"
                strokeWidth="1.6"
                strokeDasharray="470"
                strokeDashoffset="470"
                style={{ animation: "pt-draw 1s ease 1.95s forwards" }}
              ></path>
              <rect x="188" y="696" width="226" height="48" fill="#FCFCF9" opacity=".93"></rect>
              <text
                x="200"
                y="716"
                fill="#6B746F"
                fontSize="13"
                fontWeight="400"
                letterSpacing="1.4"
              >
                02 · REACTOR BIOLÓGICO
              </text>
              <text x="200" y="738" fill="#0369A1" fontSize="18">
                DBO 18 mg/L
              </text>
              <circle
                cx="412"
                cy="332"
                r="10"
                fill="#0369A1"
                opacity=".3"
                style={{ animation: "pt-ping 3s ease-out .7s infinite" }}
              ></circle>
              <circle cx="412" cy="332" r="5.5" fill="#0369A1"></circle>
            </g>

            <g style={{ opacity: "0", animation: "pt-in .6s ease 2.3s forwards" }}>
              <path
                d="M604 228 L676 116 L744 116"
                stroke="#0369A1"
                strokeWidth="1.6"
                strokeDasharray="220"
                strokeDashoffset="220"
                style={{ animation: "pt-draw .9s ease 2.4s forwards" }}
              ></path>
              <rect x="750" y="68" width="176" height="48" fill="#FCFCF9" opacity=".93"></rect>
              <text
                x="758"
                y="88"
                fill="#6B746F"
                fontSize="13"
                fontWeight="400"
                letterSpacing="1.4"
              >
                03 · CLARIFICADOR
              </text>
              <text x="758" y="110" fill="#0369A1" fontSize="18">
                SST 12 mg/L
              </text>
              <circle
                cx="604"
                cy="228"
                r="10"
                fill="#0369A1"
                opacity=".3"
                style={{ animation: "pt-ping 3s ease-out 1.4s infinite" }}
              ></circle>
              <circle cx="604" cy="228" r="5.5" fill="#0369A1"></circle>
            </g>

            <g style={{ opacity: "0", animation: "pt-in .6s ease 2.75s forwards" }}>
              <path
                d="M812 268 L964 470 L964 674"
                stroke="#16A34A"
                strokeWidth="1.6"
                strokeDasharray="470"
                strokeDashoffset="470"
                style={{ animation: "pt-draw 1s ease 2.85s forwards" }}
              ></path>
              <rect x="688" y="676" width="278" height="48" fill="#FCFCF9" opacity=".93"></rect>
              <text
                x="956"
                y="696"
                textAnchor="end"
                fill="#6B746F"
                fontSize="13"
                fontWeight="400"
                letterSpacing="1.4"
              >
                04 · VERTIMIENTO · RES. 0631
              </text>
              <text x="956" y="718" textAnchor="end" fill="#16A34A" fontSize="18">
                pH 7.2 · CUMPLE
              </text>
              <circle
                cx="812"
                cy="268"
                r="10"
                fill="#16A34A"
                opacity=".3"
                style={{ animation: "pt-ping 3s ease-out 2.1s infinite" }}
              ></circle>
              <circle cx="812" cy="268" r="5.5" fill="#16A34A"></circle>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
