"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import OferenteWizard from "../OferenteWizard";
import {
  getOferentePerfil,
  saveOferentePerfil,
  sincronizarPerfilConCuenta,
} from "@/src/lib/state/clientStore";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { EncajeTarjeta as Encaje } from "@/src/lib/secop/encaje-vitrina";

/**
 * «Cumples 4 de 5» en cada tarjeta de la vitrina (fase 1b).
 *
 * Isla de cliente por la misma razón que el bloque de decisión de la ficha: el
 * HTML de la vitrina es igual para todos (y las páginas sin filtros son ISR),
 * y el encaje depende del perfil de quien mira. Sin JavaScript o sin perfil, la
 * tarjeta sigue completa: solo le falta esta línea.
 *
 * Un proveedor pide el encaje de todas las tarjetas a la vez
 * (`POST /api/vitrina/encaje`) y cada tarjeta lee el suyo. Sin perfil, encima
 * de la rejilla se ofrece definirlo ahí mismo, sin cuenta, con el mismo
 * asistente de la ficha (D1 de `2026-09-28-ficha-bloque-decision.md`).
 */

type Estado =
  | { fase: "inicial" }
  | { fase: "sin-perfil" }
  | { fase: "cargando" }
  | { fase: "listo"; encaje: Record<string, Encaje> }
  | { fase: "error" };

const Contexto = createContext<Estado>({ fase: "inicial" });

export function ProveedorEncaje({ ids, children }: { ids: string[]; children: ReactNode }) {
  // `undefined`: aún no se ha leído el navegador; `null`: no hay perfil.
  const [perfil, setPerfil] = useState<OferenteProfile | null | undefined>(undefined);
  const [estado, setEstado] = useState<Estado>({ fase: "inicial" });
  const [asistente, setAsistente] = useState(false);
  const clave = ids.join(",");

  useEffect(() => {
    const local = getOferentePerfil();
    setPerfil(local);
    // La cuenta manda si tiene perfil; sin cuenta se queda el local.
    sincronizarPerfilConCuenta()
      .then(({ perfil: vigente }) => {
        if (JSON.stringify(vigente) !== JSON.stringify(local)) setPerfil(vigente);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (perfil === undefined) return;
    if (perfil === null) {
      setEstado({ fase: "sin-perfil" });
      return;
    }
    if (!clave) return;
    const control = new AbortController();
    setEstado({ fase: "cargando" });
    fetch("/api/vitrina/encaje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: clave.split(","), perfil }),
      signal: control.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(({ encaje }: { encaje: Record<string, Encaje> }) =>
        setEstado({ fase: "listo", encaje })
      )
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setEstado({ fase: "error" });
      });
    return () => control.abort();
  }, [perfil, clave]);

  function alCompletar(nuevo: OferenteProfile) {
    saveOferentePerfil(nuevo);
    setAsistente(false);
    setPerfil(nuevo);
    // Si hay cuenta sin perfil, lo sube; si no, no hace nada.
    sincronizarPerfilConCuenta().catch(() => {});
  }

  return (
    <Contexto.Provider value={estado}>
      {estado.fase === "sin-perfil" && (
        <div className="ve-aviso">
          {asistente ? (
            <OferenteWizard onComplete={alCompletar} onCancel={() => setAsistente(false)} />
          ) : (
            <>
              <p className="ve-aviso-texto">
                <strong>¿Puedes participar?</strong> Define tu perfil de oferente y cada ficha te
                dirá cuántos requisitos cumples. No necesitas cuenta.
              </p>
              <button type="button" className="ve-aviso-boton" onClick={() => setAsistente(true)}>
                Definir mi perfil
              </button>
            </>
          )}
        </div>
      )}
      {children}
    </Contexto.Provider>
  );
}

/** La frase sale del conteo y del veredicto agregado, nunca de un juicio aparte. */
export function fraseEncaje(e: Encaje): string {
  if (e.overall === "PASS") return `Cumples los ${e.total} requisitos`;
  if (e.overall === "FAIL")
    return `Cumples ${e.cumple} de ${e.total} · ${e.noCumple === 1 ? "uno no se cumple" : `${e.noCumple} no se cumplen`}`;
  return `Cumples ${e.cumple} de ${e.total} · revisa el resto`;
}

const TONO: Record<Encaje["overall"], string> = {
  PASS: "si",
  WARN: "revisar",
  UNKNOWN: "revisar",
  FAIL: "no",
};

export function EncajeTarjeta({ id }: { id: string }) {
  const estado = useContext(Contexto);
  if (estado.fase === "cargando")
    return <div className="ve-linea ve-linea--cargando" aria-hidden="true" />;
  if (estado.fase !== "listo") return null;
  const e = estado.encaje[id];
  if (!e) return null;
  return (
    <div className={`ve-linea ve-linea--${TONO[e.overall]}`}>
      <span>{fraseEncaje(e)}</span>
      <span className="ve-barras" aria-hidden="true">
        {Array.from({ length: e.total }, (_, i) => (
          <i key={i} className={i < e.cumple ? "ve-on" : undefined} />
        ))}
      </span>
    </div>
  );
}
