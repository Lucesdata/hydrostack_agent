"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./observatorio.module.css";

/** El modelo del usuario se descarga al acercarse a la tarjeta, fuera del bundle de la portada. */
export default function AguaViva() {
  const host = useRef(null);
  const frame = useRef(null);
  const playback = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = visible && !paused && !reduced && !hidden;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(motion.matches);
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion();
    syncVisibility();
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          preload.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    preload.observe(host.current);
    visibility.observe(host.current);
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow)
        return;
      if (event.data?.type === "agua-viva:error") setFailed(true);
      if (event.data?.type === "agua-viva:ready") {
        frame.current.contentWindow.postMessage(
          { type: "agua-viva:playback", running: playback.current },
          window.location.origin
        );
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      preload.disconnect();
      visibility.disconnect();
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    playback.current = running;
    frame.current?.contentWindow?.postMessage(
      { type: "agua-viva:playback", running },
      window.location.origin
    );
  }, [running, loaded]);

  return (
    <>
      <div ref={host} className={`${styles.scene} ${styles.animatedScene}`} aria-hidden="true">
        {loaded && !failed && (
          <iframe
            ref={frame}
            src="/portada/observatorio/agua-viva/index.html"
            title="Ilustración animada de una planta de tratamiento"
            tabIndex={-1}
            onError={() => setFailed(true)}
            onLoad={() =>
              frame.current?.contentWindow?.postMessage(
                { type: "agua-viva:playback", running },
                window.location.origin
              )
            }
          />
        )}
        {failed && (
          <img
            src="/portada/observatorio/planta-adjudicados.webp"
            alt=""
            width="1100"
            height="733"
          />
        )}
      </div>
      {loaded && !failed && !reduced && (
        <button
          className={styles.pauseScene}
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? "Reanudar animación" : "Pausar animación"}
        </button>
      )}
    </>
  );
}
