"use client";

/**
 * Gestión de filtros (SDD §4.2) — cliente sobre `/api/al/filtros`.
 *
 * Es la pantalla que faltaba para poder usar el motor sin `curl`. Client
 * component porque crear, activar y borrar son interacciones; la carga inicial
 * la hace el server component y se pasa por props para que la primera pintura no
 * espere a un fetch.
 *
 * La ayuda de cada campo no es decorativa: **un array vacío significa "sin
 * restricción", no "no coincide con nada"**, y quien no lo sepa creará un filtro
 * vacío que le traiga el sector entero — que es exactamente lo que pasó al
 * probar esto con datos reales (547 coincidencias en un correo).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Filtro {
  id: string;
  nombre: string;
  activo: boolean;
  unspsc: string[];
  palabrasClave: string[];
  palabrasExcluidas: string[];
  entidadesNit: string[];
  divipola: string[];
  modalidades: string[];
  valorMin: string | null;
  valorMax: string | null;
  eventosNotificables: string[];
}

const VACIO = {
  nombre: "",
  palabrasClave: "",
  palabrasExcluidas: "",
  unspsc: "",
  divipola: "",
  entidadesNit: "",
  valorMin: "",
  valorMax: "",
};

function lista(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function resumen(f: Filtro): string {
  const partes: string[] = [];
  if (f.palabrasClave.length) partes.push(f.palabrasClave.join(", "));
  if (f.unspsc.length) partes.push(`UNSPSC ${f.unspsc.join(", ")}`);
  if (f.divipola.length) partes.push(`zona ${f.divipola.join(", ")}`);
  if (f.entidadesNit.length) partes.push(`${f.entidadesNit.length} entidad(es)`);
  if (f.valorMin) partes.push(`desde $${Number(f.valorMin).toLocaleString("es-CO")}`);
  if (f.valorMax) partes.push(`hasta $${Number(f.valorMax).toLocaleString("es-CO")}`);
  if (f.palabrasExcluidas.length) partes.push(`excluye ${f.palabrasExcluidas.join(", ")}`);
  return partes.length ? partes.join(" · ") : "sin criterios — trae el sector entero";
}

export function FiltrosCliente({ inicial }: { inicial: Filtro[] }) {
  const router = useRouter();
  const [filtros, setFiltros] = useState(inicial);
  const [form, setForm] = useState(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function recargar() {
    const r = await fetch("/api/al/filtros");
    if (r.ok) setFiltros((await r.json()).filtros);
    router.refresh();
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      const r = await fetch("/api/al/filtros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          palabrasClave: lista(form.palabrasClave),
          palabrasExcluidas: lista(form.palabrasExcluidas),
          unspsc: lista(form.unspsc),
          divipola: lista(form.divipola),
          entidadesNit: lista(form.entidadesNit),
          valorMin: form.valorMin ? Number(form.valorMin) : null,
          valorMax: form.valorMax ? Number(form.valorMax) : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "No se pudo crear el filtro");
        return;
      }
      setForm(VACIO);
      setAbierto(false);
      await recargar();
    } finally {
      setOcupado(false);
    }
  }

  async function alternar(f: Filtro) {
    setOcupado(true);
    try {
      await fetch(`/api/al/filtros/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: f.nombre,
          activo: !f.activo,
          palabrasClave: f.palabrasClave,
          palabrasExcluidas: f.palabrasExcluidas,
          unspsc: f.unspsc,
          divipola: f.divipola,
          entidadesNit: f.entidadesNit,
          modalidades: f.modalidades,
          valorMin: f.valorMin ? Number(f.valorMin) : null,
          valorMax: f.valorMax ? Number(f.valorMax) : null,
          eventosNotificables: f.eventosNotificables,
        }),
      });
      await recargar();
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(f: Filtro) {
    if (!confirm(`¿Borrar el filtro “${f.nombre}”? No se puede deshacer.`)) return;
    setOcupado(true);
    try {
      await fetch(`/api/al/filtros/${f.id}`, { method: "DELETE" });
      await recargar();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="clr-flt-actions">
        <button className="clr-flt-btn" onClick={() => setAbierto((v) => !v)} disabled={ocupado}>
          {abierto ? "Cancelar" : "Nuevo filtro"}
        </button>
      </div>

      {abierto && (
        <form className="clr-flt-form" onSubmit={crear}>
          <label className="clr-flt-label">
            Nombre
            <input
              className="clr-flt-input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="PTAP en Antioquia"
              required
            />
          </label>

          <label className="clr-flt-label">
            Palabras clave <span className="clr-flt-hint">separadas por coma</span>
            <input
              className="clr-flt-input"
              value={form.palabrasClave}
              onChange={(e) => setForm({ ...form, palabrasClave: e.target.value })}
              placeholder="ptap, acueducto, alcantarillado"
            />
          </label>

          <label className="clr-flt-label">
            Excluir si contiene <span className="clr-flt-hint">opcional</span>
            <input
              className="clr-flt-input"
              value={form.palabrasExcluidas}
              onChange={(e) => setForm({ ...form, palabrasExcluidas: e.target.value })}
              placeholder="interventoria, consultoria"
            />
          </label>

          <div className="clr-flt-row">
            <label className="clr-flt-label">
              Códigos UNSPSC <span className="clr-flt-hint">sin el «V1.»</span>
              <input
                className="clr-flt-input"
                value={form.unspsc}
                onChange={(e) => setForm({ ...form, unspsc: e.target.value })}
                placeholder="83101500"
              />
            </label>
            <label className="clr-flt-label">
              DIVIPOLA <span className="clr-flt-hint">2 díg. depto, 5 municipio</span>
              <input
                className="clr-flt-input"
                value={form.divipola}
                onChange={(e) => setForm({ ...form, divipola: e.target.value })}
                placeholder="05, 05001"
              />
            </label>
          </div>

          <div className="clr-flt-row">
            <label className="clr-flt-label">
              Cuantía mínima (COP)
              <input
                className="clr-flt-input"
                type="number"
                min="0"
                value={form.valorMin}
                onChange={(e) => setForm({ ...form, valorMin: e.target.value })}
                placeholder="500000000"
              />
            </label>
            <label className="clr-flt-label">
              Cuantía máxima (COP)
              <input
                className="clr-flt-input"
                type="number"
                min="0"
                value={form.valorMax}
                onChange={(e) => setForm({ ...form, valorMax: e.target.value })}
              />
            </label>
          </div>

          <p className="clr-flt-aviso">
            Cada campo que dejes vacío <strong>no restringe</strong>. Un filtro sin ningún criterio
            te trae el sector entero — cientos de procesos al día.
          </p>

          {error && <p className="clr-flt-error">{error}</p>}

          <button className="clr-flt-btn" type="submit" disabled={ocupado}>
            {ocupado ? "Guardando…" : "Crear filtro"}
          </button>
        </form>
      )}

      {filtros.length === 0 ? (
        <p className="clr-flt-vacio">
          Todavía no tienes filtros. Crea uno y el correo diario empezará a avisarte de las
          licitaciones que casen, de sus adendas y de sus adjudicaciones.
        </p>
      ) : (
        <ul className="clr-flt-list">
          {filtros.map((f) => (
            <li className={`clr-flt-card${f.activo ? "" : " clr-flt-card--off"}`} key={f.id}>
              <div className="clr-flt-card-top">
                <p className="clr-flt-card-name">
                  {f.nombre}
                  {!f.activo && <span className="clr-flt-badge">pausado</span>}
                </p>
                <div className="clr-flt-card-btns">
                  <button className="clr-flt-mini" onClick={() => alternar(f)} disabled={ocupado}>
                    {f.activo ? "Pausar" : "Activar"}
                  </button>
                  <button
                    className="clr-flt-mini clr-flt-mini--danger"
                    onClick={() => borrar(f)}
                    disabled={ocupado}
                  >
                    Borrar
                  </button>
                </div>
              </div>
              <p className="clr-flt-card-crit">{resumen(f)}</p>
              <p className="clr-flt-card-ev">
                Avisa de: {f.eventosNotificables.length ? f.eventosNotificables.join(", ") : "nada"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
