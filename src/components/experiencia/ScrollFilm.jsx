"use client";
/**
 * ScrollFilm — motor de scroll-scrub multi-clip (técnica "scroll-world").
 * El scroll de la página controla el tiempo de una cadena de videos pre-renderizados;
 * cada clip ocupa una banda [start, end] del recorrido y se funde sobre el anterior.
 * Los clips se cargan como Blob → objectURL para garantizar seekability en cualquier host.
 */
import { useEffect, useRef } from "react";
import Link from "next/link";

const FADE = 0.028; // semiancho del crossfade en cada costura (fracción del scroll)

export default function ScrollFilm({ clips, sections, heightVh = 1350, ctaHref = "/" }) {
  const filmRefs = useRef([]);
  const copyRefs = useRef([]);
  const dotRefs = useRef([]);
  const hintRef = useRef(null);
  const barRef = useRef(null);
  const spacerRef = useRef(null);

  useEffect(() => {
    const films = filmRefs.current.filter(Boolean);
    const durs = new Array(films.length).fill(0);
    const urls = [];
    let raf = 0;
    let goal = 0;
    let cur = 0;
    let primed = false;

    films.forEach((f, i) => {
      const onMeta = () => { durs[i] = f.duration; };
      f.addEventListener("loadedmetadata", onMeta);
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

    // iOS: un video muted que nunca reprodujo no pinta frames al hacer seek
    const prime = () => {
      if (primed) return;
      primed = true;
      Promise.all(films.map((f) => f.play()))
        .then(() => films.forEach((f) => f.pause()))
        .catch(() => { primed = false; });
    };

    const onScroll = () => {
      prime();
      goal = Math.min(1, Math.max(0, window.scrollY / maxScroll()));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", prime, { passive: true });

    const smooth = (x) => {
      x = Math.min(1, Math.max(0, x));
      return x * x * (3 - 2 * x);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      cur += (goal - cur) * 0.09;
      const t = cur;

      clips.forEach((c, i) => {
        const f = films[i];
        if (!f) return;
        if (i > 0) f.style.opacity = smooth((t - (c.start - FADE)) / (2 * FADE));
        // solo mover clips cerca de su banda (funciona en ambas direcciones)
        if (durs[i] && !f.seeking && t > c.start - 3 * FADE && t < c.end + 3 * FADE) {
          const l = Math.min(1, Math.max(0, (t - c.start) / (c.end - c.start)));
          const tt = Math.min(durs[i] - 0.033, l * durs[i]);
          if (Math.abs(f.currentTime - tt) > 0.02) f.currentTime = tt;
        }
      });

      const W = 0.042;
      sections.forEach((s, i) => {
        const el = copyRefs.current[i];
        if (!el) return;
        const o = Math.max(0, 1 - Math.abs(t - s.t) / W);
        el.style.opacity = o;
        el.style.transform = `translateY(${(1 - o) * 18}px)`;
      });
      let near = 0;
      sections.forEach((s, i) => {
        if (Math.abs(t - s.t) < Math.abs(t - sections[near].t)) near = i;
      });
      dotRefs.current.forEach((b, i) => {
        if (b) b.classList.toggle("sf-on", i === near);
      });
      if (hintRef.current) hintRef.current.style.opacity = t < 0.01 ? 1 : 0;
      if (barRef.current) barRef.current.style.width = `${t * 100}%`;
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", prime);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (frac) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: frac * max, behavior: "smooth" });
  };

  return (
    <div className="sf-root">
      <style>{`
        .sf-root .sf-spacer{height:${heightVh}vh}
        .sf-root .sf-film{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
        .sf-root .sf-scrim{position:fixed;inset:0;z-index:5;pointer-events:none;
          background:linear-gradient(75deg,rgba(4,24,32,.45) 0%,rgba(4,24,32,.1) 42%,transparent 60%)}
        .sf-root .sf-copy{position:fixed;left:34px;bottom:64px;z-index:10;max-width:440px;
          opacity:0;transform:translateY(18px);pointer-events:none;color:#fff}
        .sf-root .sf-eyebrow{font-family:var(--mono,'IBM Plex Mono',monospace);font-size:11px;
          letter-spacing:.28em;font-weight:500;color:var(--accent-river,#7DD3FC);margin-bottom:10px}
        .sf-root h2{font-family:var(--sans,'Inter',sans-serif);font-size:clamp(28px,4.4vw,46px);
          line-height:1.05;font-weight:700;margin-bottom:12px;text-shadow:0 2px 18px rgba(4,24,32,.5)}
        .sf-root .sf-body{font-family:var(--sans,'Inter',sans-serif);font-size:15px;line-height:1.55;
          color:rgba(255,255,255,.86);margin-bottom:14px}
        .sf-root .sf-tags{display:flex;gap:8px;flex-wrap:wrap}
        .sf-root .sf-tag{font-family:var(--mono,'IBM Plex Mono',monospace);font-size:10.5px;
          letter-spacing:.06em;padding:5px 11px;border-radius:999px;
          background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(4px)}
        .sf-root .sf-cta{display:inline-block;margin-top:8px;padding:12px 26px;border-radius:999px;
          background:var(--accent,#0369A1);color:#fff;font-weight:600;font-size:14px;
          font-family:var(--sans,'Inter',sans-serif);letter-spacing:.03em;text-decoration:none;
          box-shadow:0 8px 22px rgba(3,105,161,.45);pointer-events:auto}
        .sf-root .sf-rail{position:fixed;right:26px;top:50%;transform:translateY(-50%);z-index:10;
          display:flex;flex-direction:column;gap:12px}
        .sf-root .sf-rail button{width:9px;height:9px;border-radius:50%;border:none;cursor:pointer;
          background:rgba(255,255,255,.4);transition:transform .25s,background .25s;padding:0}
        .sf-root .sf-rail button.sf-on{background:#fff;transform:scale(1.5)}
        .sf-root .sf-hint{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:10;
          font-family:var(--mono,'IBM Plex Mono',monospace);font-size:11px;letter-spacing:.3em;
          color:rgba(255,255,255,.85);text-align:center;transition:opacity .5s}
        .sf-root .sf-arrow{display:block;margin:8px auto 0;width:1px;height:26px;background:rgba(255,255,255,.85);
          animation:sf-drop 1.6s ease-in-out infinite}
        @keyframes sf-drop{0%{transform:scaleY(.2);transform-origin:top}55%{transform:scaleY(1)}
          100%{opacity:0;transform:scaleY(1)}}
        .sf-root .sf-progress{position:fixed;left:0;top:0;height:3px;background:var(--accent-river,#7DD3FC);
          z-index:11;width:0%}
        @media (max-width:640px){
          .sf-root .sf-copy{left:20px;right:20px;bottom:48px;max-width:none}
          .sf-root .sf-rail{right:12px}
        }
      `}</style>

      <div className="sf-spacer" ref={spacerRef} />
      {clips.map((c, i) => (
        <video
          key={i}
          ref={(el) => { filmRefs.current[i] = el; }}
          className="sf-film"
          style={{ zIndex: i + 1, opacity: i === 0 ? 1 : 0 }}
          muted
          playsInline
          preload="auto"
        />
      ))}
      <div className="sf-scrim" />
      <div className="sf-progress" ref={barRef} />

      {sections.map((s, i) => (
        <div key={i} className="sf-copy" ref={(el) => { copyRefs.current[i] = el; }}>
          <div className="sf-eyebrow">{s.eyebrow}</div>
          <h2>{s.title}</h2>
          <p className="sf-body">{s.body}</p>
          <div className="sf-tags">
            {s.tags.map((tag) => (
              <span key={tag} className="sf-tag">{tag}</span>
            ))}
          </div>
          {s.cta ? (
            <Link href={ctaHref} className="sf-cta">{s.cta} →</Link>
          ) : null}
        </div>
      ))}

      <div className="sf-rail">
        {sections.map((s, i) => (
          <button
            key={i}
            aria-label={s.eyebrow}
            ref={(el) => { dotRefs.current[i] = el; }}
            onClick={() => goTo(s.t)}
          />
        ))}
      </div>

      <div className="sf-hint" ref={hintRef}>
        DESPLÁZATE<span className="sf-arrow" />
      </div>
    </div>
  );
}
