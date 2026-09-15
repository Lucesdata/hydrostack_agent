"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Semaforo from "../semaforo/Semaforo";
import { compuertasDesdeVeredicto, type CompuertaVista } from "@/src/lib/secop/semaforo";
import { getOferentePerfil } from "@/src/lib/state/clientStore";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { SecopProceso } from "@/src/lib/secop/types";
import type { VerdictRespuesta } from "@/src/lib/secop/verdict-publico";

/**
 * El semáforo de la ficha, que se actualiza a la lectura RELATIVA si hay perfil.
 *
 * ── Por qué es una isla de cliente y no se calcula en el servidor ───────────
 * La ficha es estática con ISR: se genera una vez por ventana y se sirve de
 * caché a todo el mundo. Eso es lo que la hace barata e indexable, y es lo que
 * la convierte en la única puerta de entrada orgánica del producto.
 *
 * Calcular el veredicto en el servidor la volvería dinámica —una invocación por
 * visita— y el HTML dejaría de ser cacheable, porque sería distinto para cada
 * usuario. Se perdería el SEO para ganar una personalización que solo ve quien
 * ya tiene perfil.
 *
 * Así que el servidor sirve SIEMPRE la lectura absoluta (lo que el proceso
 * exige, que es lo que un buscador debe indexar y lo que ve quien llega sin
 * nada) y esta isla la sustituye por la relativa cuando encuentra un perfil.
 * Mejora progresiva: sin JavaScript o sin perfil, la página sigue diciendo algo
 * cierto y completo.
 *
 * El perfil vive en dos sitios según haya cuenta o no —localStorage para
 * anónimos, oferente_perfil para sesiones— y se prueba el remoto primero, que
 * es la fuente de verdad cuando existe. Mismo orden que usa SecopExplorer.
 */
export default function SemaforoConPerfil({
  proceso,
  absolutas,
  nota,
}: {
  proceso: SecopProceso;
  /** Lo que el servidor ya pintó. Es el estado inicial, no un cargando. */
  absolutas: CompuertaVista[];
  nota: string;
}) {
  const [compuertas, setCompuertas] = useState<CompuertaVista[]>(absolutas);
  const [relativo, setRelativo] = useState(false);
  const [redactado, setRedactado] = useState(false);

  useEffect(() => {
    let vivo = true;

    (async () => {
      let perfil: OferenteProfile | null = null;

      // La cuenta manda sobre el caché local cuando hay sesión.
      try {
        const res = await fetch("/api/perfil");
        if (res.ok) {
          const { perfil: remoto } = (await res.json()) as { perfil: OferenteProfile | null };
          perfil = remoto;
        }
      } catch {
        /* sin red o sin sesión: se prueba el local */
      }
      if (!perfil) perfil = getOferentePerfil();
      if (!perfil || !vivo) return;

      try {
        const res = await fetch("/api/secop/verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proceso, perfil }),
        });
        if (!res.ok || !vivo) return;
        const { verdict } = (await res.json()) as { verdict: VerdictRespuesta };
        const vistas = compuertasDesdeVeredicto(verdict);
        setCompuertas(vistas);
        setRelativo(true);
        setRedactado(vistas.some((c) => c.redactada));
      } catch {
        // Se queda con la lectura absoluta, que ya está en pantalla y es cierta.
      }
    })();

    return () => {
      vivo = false;
    };
  }, [proceso]);

  return (
    <>
      <Semaforo
        compuertas={compuertas}
        disposicion="bloque"
        nota={
          relativo
            ? "Esto es tu lectura: cada compuerta compara el proceso con el perfil que definiste. Sigue sin ser un dictamen de elegibilidad — quien decide es el pliego."
            : nota
        }
      />
      <p style={{ marginTop: 14 }}>
        {relativo ? (
          <Link className="fi-btn" href="/perfil">
            {redactado
              ? "Crea tu cuenta para ver el porqué de cada compuerta"
              : "Ajustar mi perfil"}
          </Link>
        ) : (
          <Link className="fi-btn" href="/perfil">
            Define tu perfil y compara
          </Link>
        )}
      </p>
    </>
  );
}
