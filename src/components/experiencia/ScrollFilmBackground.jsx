"use client";
/**
 * ScrollFilmBackground — fondo cinemático sutil para la landing.
 * La cadena de videos (planos → planta → interior) avanza con el scroll de la
 * página, pero vive DETRÁS del contenido (z-index negativo), desaturada y
 * cubierta por un velo claro para que la información siga mandando.
 * No captura eventos ni añade altura: usa el scroll natural de la landing.
 */
import { useEffect, useRef } from "react";

const FADE = 0.03; // crossfade en cada costura (fracción del scroll)

export default function ScrollFilmBackground({
  clips,
  /* opacidad máxima del video bajo el velo (0–1) */
  strength = 0.5,
}) {
  const rootRef = useRef(null);
  const filmRefs = useRef([]);

  useEffect(() => {
    const films = filmRefs.current.filter(Boolean);
    const durs = new Array(films.length).fill(0);
    const urls = [];
    let raf = 0;
    let goal = 0;
    let cur = 0;
    let primed = false;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    films.forEach((f, i) => {
      f.addEventListener("loadedmetadata", () => { durs[i] = f.duration; });
      fetch(clips[i].src)
        .then((r) => r.blob())
        .then((b) => {
          const u = URL.createObjectURL(b);
          urls.push(u);
          f.src = u;
        })
        .catch(() => {});
    });

    const maxScroll = () =>
      document.documentElement.scrollHeight - window.innerHeight;

    const prime = () => {
      if (primed) return;
      primed = true;
      Promise.all(films.map((f) => f.play()))
        .then(() => films.forEach((f) => f.pause()))
        .catch(() => { primed = false; });
    };

    const onScroll = () => {
      prime();
      goal = Math.min(1, Math.max(0, window.scrollY / Math.max(1, maxScroll())));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", prime, { passive: true });

    const smooth = (x) => {
      x = Math.min(1, Math.max(0, x));
      return x * x * (3 - 2 * x);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      cur += (goal - cur) * 0.08;
      const t = cur;

      clips.forEach((c, i) => {
        const f = films[i];
        if (!f) return;
        if (i > 0) f.style.opacity = smooth((t - (c.start - FADE)) / (2 * FADE));
        if (durs[i] && !f.seeking && t > c.start - 3 * FADE && t < c.end + 3 * FADE) {
          const l = Math.min(1, Math.max(0, (t - c.start) / (c.end - c.start)));
          const tt = Math.min(durs[i] - 0.033, l * durs[i]);
          if (Math.abs(f.currentTime - tt) > 0.02) f.currentTime = tt;
        }
      });
    };

    if (!reduced) {
      onScroll();
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", prime);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {clips.map((c, i) => (
        <video
          key={i}
          ref={(el) => { filmRefs.current[i] = el; }}
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: i === 0 ? 1 : 0,
            filter: "saturate(0.85)",
          }}
        />
      ))}
      {/* Velo claro: fuerte donde vive el texto (izquierda/arriba), más leve a la derecha */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg,
            rgba(250,250,247,${0.97 - strength * 0.14}) 0%,
            rgba(250,250,247,${0.93 - strength * 0.18}) 45%,
            rgba(250,250,247,${0.86 - strength * 0.22}) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(250,250,247,.92) 0%, rgba(250,250,247,0) 18%, rgba(250,250,247,0) 82%, rgba(250,250,247,.9) 100%)",
        }}
      />
    </div>
  );
}
