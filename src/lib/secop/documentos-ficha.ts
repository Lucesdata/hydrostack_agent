export interface DocumentoFicha {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string | null;
  url: string | null;
}
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
/** Busca en todo el inventario recibido antes de paginar, sin fabricar documentos. */
export function filtrarDocumentos(documentos: DocumentoFicha[], busqueda: string, pagina = 1) {
  const terminos = normalizar(busqueda).trim().split(/\s+/).filter(Boolean);
  const resultados = documentos.filter((d) =>
    terminos.every((t) => normalizar(`${d.nombre} ${d.tipo} ${d.fecha ?? ""}`).includes(t))
  );
  const paginas = Math.max(1, Math.ceil(resultados.length / 20));
  const actual = Math.max(1, Math.min(paginas, Math.floor(pagina) || 1));
  return {
    total: resultados.length,
    paginas,
    pagina: actual,
    documentos: resultados.slice((actual - 1) * 20, actual * 20),
  };
}
