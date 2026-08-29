/**
 * CSS del módulo de diagnóstico.
 *
 * Convención del repo: el CSS de un componente vive en una constante que se
 * inyecta con `<style dangerouslySetInnerHTML>` (ver SectorZonaSetup, AuthCard,
 * /mis-coincidencias). Aquí está en un módulo aparte y se inyecta UNA vez desde
 * DiagnosticoApp porque las cuatro piezas comparten lenguaje visual y duplicar
 * el bloque en cada una metería cuatro <style> iguales en la misma página.
 *
 * Todo sale de los tokens de app/globals.css: ni un color, ni una fuente, ni un
 * radio hardcodeado. El lenguaje es el de AuthCard —"plano de ingeniería":
 * etiqueta Fig. NN en mono, tarjeta opaca con esquinas de bracket— no el del
 * prototipo de referencia, que traía paleta propia. Sin glassmorphism: no
 * existe en el tema claro de la plataforma.
 */

export const DIAGNOSTICO_CSS = `
.clr-diag{
  min-height: 100vh; background: var(--bg); color: var(--ink-900);
  font-family: var(--font-sans); cursor: auto; padding: 40px 0 0;
}
.clr-diag-inner{ max-width: 980px; margin: 0 auto; padding: 0 20px 80px; }
.clr-diag-inner--angosto{ max-width: 860px; }

/* ── Etiqueta Fig. NN — mismo patrón que AuthCard ─────────────────────────── */
.clr-diag-fig{ display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.clr-diag-fig-dot{ width: 8px; height: 8px; background: var(--accent); flex-shrink: 0; }
.clr-diag-fig-label{
  font: 11px var(--font-mono); color: var(--accent);
  letter-spacing: .12em; text-transform: uppercase;
}

/* ── Tipografía ───────────────────────────────────────────────────────────── */
.clr-diag-h1{
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-weight: 700; font-size: clamp(32px, 5.2vw, 52px); line-height: var(--lh-tight);
  letter-spacing: -.02em; margin: 0 0 18px; max-width: 16ch;
}
.clr-diag-h1 em{ font-style: normal; color: var(--accent); }
.clr-diag-h2{
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-weight: 700; font-size: clamp(26px, 4vw, 40px); line-height: 1.1;
  letter-spacing: -.02em; margin: 10px 0 12px; max-width: 22ch;
}
.clr-diag-lede{
  font-size: var(--fs-md); color: var(--ink-600); line-height: var(--lh-base);
  max-width: 46ch; margin: 0 0 var(--space-8);
}

/* ── Botones ──────────────────────────────────────────────────────────────── */
.clr-diag-btn{
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--accent); color: #fff; border: 1px solid var(--accent);
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 12px 22px; border-radius: var(--radius-md); cursor: pointer;
  transition: opacity .15s ease;
}
.clr-diag-btn:hover{ opacity: .9; }
.clr-diag-btn[disabled]{ opacity: .5; cursor: default; }
.clr-diag-btn--ghost{
  background: transparent; color: var(--ink-900); border-color: var(--line);
}
.clr-diag-btn--ghost:hover{ border-color: var(--accent); color: var(--accent); opacity: 1; }
.clr-diag-btn--sm{ font-size: 12.5px; padding: 8px 14px; }

/* ── Portada ──────────────────────────────────────────────────────────────── */
.clr-diag-hero{
  display: grid; grid-template-columns: 1fr 220px; gap: 56px; align-items: center;
  padding-bottom: var(--space-10);
}
.clr-diag-facts{
  display: flex; flex-wrap: wrap; border-top: 1px solid var(--line);
  margin-top: var(--space-8);
}
.clr-diag-fact{
  flex: 1 1 180px; padding: 18px 20px 16px; border-right: 1px solid var(--line);
}
.clr-diag-fact:last-child{ border-right: none; }
.clr-diag-fact b{
  display: block; font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-size: 22px; font-weight: 700; letter-spacing: -.01em; color: var(--ink-900);
}
.clr-diag-fact span{ display: block; font-size: var(--fs-sm); color: var(--ink-600); margin-top: 4px; }

/* ── Cuestionario ─────────────────────────────────────────────────────────── */
.clr-diag-quiz{ display: grid; grid-template-columns: 1fr 220px; gap: 56px; align-items: start; }
.clr-diag-q-head{ display: flex; align-items: baseline; gap: 14px; margin-bottom: 6px; }
.clr-diag-q-num{ font: 600 12px var(--font-mono); color: var(--accent); }
.clr-diag-q-cat{
  font: 10px var(--font-mono); letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink-300);
}
.clr-diag-q-text{
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-weight: 700; font-size: clamp(22px, 3.2vw, 32px); line-height: 1.1;
  letter-spacing: -.02em; margin: 4px 0 12px; max-width: 22ch;
}
.clr-diag-q-help{
  font-size: var(--fs-sm); color: var(--ink-600); line-height: var(--lh-base);
  max-width: 52ch; margin: 0 0 var(--space-6);
  border-left: 2px solid var(--accent-soft); padding-left: 14px;
}
.clr-diag-opts{ display: flex; flex-direction: column; gap: 8px; max-width: 560px; }
.clr-diag-opt{
  display: flex; align-items: center; gap: 14px; text-align: left;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius-md); padding: 15px 18px;
  font: inherit; color: inherit; cursor: pointer;
  transition: border-color .12s ease, transform .12s ease;
}
.clr-diag-opt:hover{ border-color: var(--accent); transform: translateX(3px); }
.clr-diag-opt.is-elegida{ border-color: var(--accent); background: var(--accent-faint); }
.clr-diag-opt-key{
  flex: none; display: grid; place-items: center; width: 22px; height: 22px;
  border: 1px solid var(--line); border-radius: var(--radius-sm);
  font: 11px var(--font-mono); color: var(--ink-300);
}
.clr-diag-opt:hover .clr-diag-opt-key,
.clr-diag-opt.is-elegida .clr-diag-opt-key{ border-color: var(--accent); color: var(--accent); }
.clr-diag-nav{ margin-top: var(--space-6); display: flex; gap: 12px; align-items: center; }
.clr-diag-step{ font: 12px var(--font-mono); color: var(--ink-300); }

/* ── Medidor ──────────────────────────────────────────────────────────────── */
.clr-diag-medidor{ width: 100%; max-width: 200px; margin: 0 auto; }
.clr-diag-vaso-wrap{ position: relative; }
.clr-diag-vaso{
  position: relative; width: 100%; aspect-ratio: .62;
  background: var(--surface); border: 1px solid var(--line); overflow: hidden;
}
.clr-diag-relleno{
  position: absolute; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, var(--accent-river) 0%, var(--accent) 100%);
  transition: height .6s cubic-bezier(.22,1,.36,1);
}
.clr-diag-umbral{
  position: absolute; left: 0; right: 0; border-top: 1px dashed var(--ink-300);
  opacity: .6; pointer-events: none;
}
.clr-diag-umbral span{
  position: absolute; right: 4px; top: -15px;
  font: 9px var(--font-mono); letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink-300);
}
.clr-diag-esq{ position: absolute; width: 10px; height: 10px; z-index: 2; }
.clr-diag-esq--tl{ top: -1px; left: -1px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.clr-diag-esq--tr{ top: -1px; right: -1px; border-top: 2px solid var(--accent); border-right: 2px solid var(--accent); }
.clr-diag-esq--bl{ bottom: -1px; left: -1px; border-bottom: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.clr-diag-esq--br{ bottom: -1px; right: -1px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }
.clr-diag-ticks{
  position: absolute; top: 0; bottom: 0; left: calc(100% + 10px); width: 34px;
  display: flex; flex-direction: column; justify-content: space-between;
  font: 10px var(--font-mono); color: var(--ink-300);
}
.clr-diag-lectura{ text-align: center; margin-top: 12px; }
.clr-diag-lectura b{
  display: block;
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-size: 30px; font-weight: 700; letter-spacing: -.02em; color: var(--ink-900);
}
.clr-diag-lectura span{
  font: 10px var(--font-mono); letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink-300);
}

/* ── Resultado ────────────────────────────────────────────────────────────── */
.clr-diag-veredicto{ border-top: 2px solid var(--ink-900); padding-top: var(--space-6); margin-bottom: var(--space-10); }
.clr-diag-veredicto p{ font-size: 16px; color: var(--ink-600); line-height: var(--lh-base); max-width: 58ch; }
.clr-diag-veredicto--bloqueado{ border-top-color: var(--danger); }
.clr-diag-veredicto--bloqueado .clr-diag-fig-dot{ background: var(--danger); }
.clr-diag-veredicto--bloqueado .clr-diag-fig-label{ color: var(--danger); }
.clr-diag-otra{
    margin-top: 18px; font-size: 12.5px; line-height: 1.55; color: var(--ink-600);
    max-width: 46ch;
  }
  .clr-diag-otra a{ color: var(--accent); border-bottom: 1px solid rgba(3,105,161,.35); }
  .clr-diag-advertencia{
    margin-top: 14px; padding: 11px 13px;
    border: 1px solid rgba(217,119,6,.3); border-left: 2px solid var(--warning);
    background: rgba(217,119,6,.05); border-radius: var(--radius-md);
    font-size: 12.5px; line-height: 1.55; color: var(--ink-900);
  }
  .clr-diag-puntaje{ font: 12px var(--font-mono); color: var(--ink-300); margin-top: 14px; }

.clr-diag-sec{
  display: flex; align-items: baseline; gap: 14px;
  border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: var(--space-6);
}
.clr-diag-sec h3{
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-size: 20px; font-weight: 700; letter-spacing: -.01em; margin: 0;
}

.clr-diag-areas{
  display: grid; gap: 1px; background: var(--line);
  border: 1px solid var(--line); margin-bottom: var(--space-10);
}
.clr-diag-area{
  background: var(--surface); padding: 14px 18px;
  display: grid; grid-template-columns: 1fr 92px 84px; gap: 14px; align-items: center;
}
.clr-diag-area-nombre{ font-size: var(--fs-sm); font-weight: 600; }
.clr-diag-track{ height: 6px; background: var(--surface-alt); border-radius: var(--radius-pill); overflow: hidden; }
.clr-diag-val{ display: block; height: 100%; background: var(--accent); border-radius: var(--radius-pill); }
.clr-diag-val--parcial{ background: var(--warning); }
.clr-diag-val--pendiente{ background: var(--danger); }
.clr-diag-area-tag{
  font: 10px var(--font-mono); letter-spacing: .1em; text-transform: uppercase;
  text-align: right; color: var(--ink-600);
}

.clr-diag-ruta{
  background: var(--accent-ocean); color: #fff; padding: 32px;
  margin-bottom: var(--space-10);
}
.clr-diag-ruta .clr-diag-fig-dot{ background: var(--accent-river); }
.clr-diag-ruta .clr-diag-fig-label{ color: var(--accent-river); }
.clr-diag-ruta h3{
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-size: 26px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 12px; color: #fff;
}
.clr-diag-ruta > p{ color: #cfe6f2; max-width: 58ch; font-size: var(--fs-sm); line-height: var(--lh-base); margin: 0; }
.clr-diag-escalera{
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
  background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.18); margin-top: var(--space-6);
}
.clr-diag-peldano{ background: var(--accent-ocean); padding: 16px; }
.clr-diag-peldano.is-actual{ background: var(--accent); }
.clr-diag-peldano b{
  display: block;
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-size: 14px; margin-bottom: 5px; color: #fff;
}
.clr-diag-peldano span{ display: block; font-size: 12.5px; color: #cfe6f2; line-height: 1.45; }
.clr-diag-peldano.is-actual span{ color: #eaf6fb; }

.clr-diag-plan{
  list-style: none; display: grid; gap: 1px; background: var(--line);
  border: 1px solid var(--line); margin: 0 0 var(--space-10); padding: 0;
}
.clr-diag-paso{
  background: var(--surface); padding: 20px 22px;
  display: grid; grid-template-columns: 32px 1fr; gap: 16px;
}
.clr-diag-paso-idx{ font: 600 12px var(--font-mono); color: var(--accent); padding-top: 3px; }
.clr-diag-paso h4{ font-size: 15px; font-weight: 600; margin: 0 0 5px; }
.clr-diag-paso p{ font-size: var(--fs-sm); color: var(--ink-600); line-height: var(--lh-base); margin: 0 0 9px; }
.clr-diag-chips{ display: flex; flex-wrap: wrap; gap: 6px; }
.clr-diag-chip{
  font: 10px var(--font-mono); letter-spacing: .08em; text-transform: uppercase;
  border: 1px solid var(--line); border-radius: var(--radius-sm);
  padding: 3px 8px; color: var(--ink-600);
}
.clr-diag-chip--hard{ border-color: var(--danger); color: var(--danger); }
.clr-diag-chip--soft{ border-color: var(--warning); color: var(--warning); }

.clr-diag-mitos{
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px;
  background: var(--line); border: 1px solid var(--line); margin-bottom: var(--space-10);
}
.clr-diag-mito{ background: var(--surface); padding: 20px; }
.clr-diag-mito-m{ font-size: 14px; font-weight: 600; margin: 0 0 8px; }
.clr-diag-mito-m::before{ content: "✕ "; color: var(--danger); font-family: var(--font-mono); }
.clr-diag-mito-r{ font-size: var(--fs-sm); color: var(--ink-600); line-height: var(--lh-base); margin: 0; }
.clr-diag-mito-r::before{ content: "→ "; color: var(--accent); font-family: var(--font-mono); }

/* Conversión: el valor ya se entregó, la cuenta es para conservarlo. */
.clr-diag-guardar{
  position: relative; background: var(--surface); border: 1px solid var(--line);
  padding: 26px 24px; margin-bottom: var(--space-10);
}
.clr-diag-guardar h3{
  font-family: var(--font-ibm-plex-sans-condensed), var(--font-sans), sans-serif;
  font-size: 22px; font-weight: 700; letter-spacing: -.01em; margin: 0 0 8px;
}
.clr-diag-guardar p{ font-size: var(--fs-sm); color: var(--ink-600); line-height: var(--lh-base); margin: 0 0 18px; max-width: 52ch; }
.clr-diag-guardar-acciones{ display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.clr-diag-guardado{
  font: 11px var(--font-mono); color: var(--accent); letter-spacing: .08em;
  text-transform: uppercase; margin-bottom: var(--space-6);
}
.clr-diag-aviso{
  font-size: 12.5px; color: var(--ink-900); background: var(--accent-faint);
  border: 1px solid var(--accent-soft); border-radius: var(--radius-md);
  padding: 10px 14px; margin-bottom: var(--space-6);
}

.clr-diag-acciones{ display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: var(--space-8); }
.clr-diag-disclaimer{
  font-size: 12px; color: var(--ink-300); line-height: var(--lh-base);
  border-top: 1px solid var(--line); padding-top: 20px; max-width: 70ch;
}

/* ── Responsive: hasta 360px ──────────────────────────────────────────────── */
@media (max-width: 820px){
  .clr-diag{ padding-top: 24px; }
  .clr-diag-hero, .clr-diag-quiz{ grid-template-columns: 1fr; gap: 28px; }
  .clr-diag-hero .clr-diag-medidor{ max-width: 130px; margin: 0; }
  .clr-diag-ticks{ display: none; }
  /* En móvil el medidor pasa a ser una barra horizontal sobre la pregunta: el
     vaso a la izquierda y la lectura a su lado, no debajo. */
  .clr-diag-lado{
    order: -1; background: var(--surface); border: 1px solid var(--line);
    padding: 12px 16px;
  }
  .clr-diag-lado .clr-diag-medidor{
    display: flex; align-items: center; gap: 16px; max-width: none; margin: 0;
  }
  .clr-diag-lado .clr-diag-vaso-wrap{ width: 72px; flex: none; }
  .clr-diag-lado .clr-diag-vaso{ aspect-ratio: .95; }
  .clr-diag-lado .clr-diag-umbral span{ display: none; }
  .clr-diag-lado .clr-diag-lectura{ text-align: left; margin-top: 0; }
  .clr-diag-lado .clr-diag-lectura b{ font-size: 26px; line-height: 1; }
  .clr-diag-mitos{ grid-template-columns: 1fr; }
  .clr-diag-escalera{ grid-template-columns: 1fr; }
  .clr-diag-ruta{ padding: 22px; }
  .clr-diag-fact{ flex: 1 1 100%; border-right: none; border-bottom: 1px solid var(--line); }
}
@media (max-width: 420px){
  .clr-diag-inner{ padding: 0 16px 64px; }
  .clr-diag-area{ grid-template-columns: 1fr 60px 64px; gap: 10px; }
  .clr-diag-paso{ grid-template-columns: 24px 1fr; gap: 12px; padding: 18px 16px; }
  .clr-diag-opt{ padding: 13px 14px; gap: 10px; }
}

/* ── Impresión: el plan se lleva al contador ──────────────────────────────── */
@media print{
  .clr-diag-acciones, .clr-diag-guardar, .clr-diag-nav{ display: none !important; }
  .clr-diag{ background: #fff; padding: 0; }
  .clr-diag-ruta{ background: #fff; color: var(--ink-900); border: 1px solid var(--line); }
  .clr-diag-ruta h3, .clr-diag-peldano b{ color: var(--ink-900); }
  .clr-diag-ruta > p, .clr-diag-peldano span{ color: var(--ink-600); }
  .clr-diag-peldano{ background: #fff; }
  .clr-diag-peldano.is-actual{ background: var(--surface-alt); }
  .clr-diag-plan, .clr-diag-areas, .clr-diag-mitos{ break-inside: avoid; }
}
`;
