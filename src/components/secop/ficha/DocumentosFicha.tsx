"use client";
import { useState } from "react";
import { filtrarDocumentos, type DocumentoFicha } from "@/src/lib/secop/documentos-ficha";
export default function DocumentosFicha({
  documentos,
  urlSecop,
}: {
  documentos: DocumentoFicha[];
  urlSecop: string | null;
}) {
  const [busqueda, setBusqueda] = useState(""),
    [pagina, setPagina] = useState(1);
  const r = filtrarDocumentos(documentos, busqueda, pagina);
  return (
    <div className="fi-documentos">
      <p className="fi-ayuda">
        Referencias disponibles en esta ficha. El expediente oficial contiene el inventario
        completo.
      </p>
      <label htmlFor="fi-buscar-documentos">Buscar por nombre, tipo o fecha</label>
      <div className="fi-documentos-buscar">
        <input
          id="fi-buscar-documentos"
          type="search"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          placeholder="Nombre del documento…"
        />
        <button
          className="fi-btn"
          type="button"
          onClick={() => {
            setBusqueda("");
            setPagina(1);
          }}
        >
          Limpiar
        </button>
      </div>
      <p role="status" className="fi-ayuda">
        {documentos.length === 0
          ? "Todavía no hay referencias documentales disponibles aquí."
          : r.total === 0
            ? "No hay coincidencias con esta búsqueda."
            : `${r.total} referencia${r.total === 1 ? "" : "s"} disponible${r.total === 1 ? "" : "s"}`}
      </p>
      <ul className="fi-documentos-lista">
        {r.documentos.map((d) => (
          <li key={d.id}>
            <div>
              <strong>{d.nombre}</strong>
              <p>
                {d.tipo} · {d.fecha ?? "Fecha sin informar"}
              </p>
              <small>
                Versión y tamaño no disponibles · archivo original no disponible en la ficha
              </small>
            </div>
            {d.url ? (
              <a className="fi-btn" href={d.url} target="_blank" rel="noopener noreferrer">
                Abrir documento ↗
              </a>
            ) : urlSecop ? (
              <a className="fi-btn" href={urlSecop} target="_blank" rel="noopener noreferrer">
                Consultar expediente ↗
              </a>
            ) : (
              <span>Enlace no disponible</span>
            )}
          </li>
        ))}
      </ul>
      {r.paginas > 1 && (
        <nav aria-label="Páginas de documentos">
          <button
            type="button"
            className="fi-btn"
            disabled={r.pagina === 1}
            onClick={() => setPagina(r.pagina - 1)}
          >
            Anterior
          </button>
          <span>
            {r.pagina} de {r.paginas}
          </span>
          <button
            type="button"
            className="fi-btn"
            disabled={r.pagina === r.paginas}
            onClick={() => setPagina(r.pagina + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
