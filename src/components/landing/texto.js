/**
 * Formato de textos del SECOP para leerlos: objetos en frase, nombres en título.
 *
 * Puro y sin "use client": lo usan el ticker y el buscador en el navegador y
 * las páginas de servidor (/licitaciones/entidades). Vivía dentro de
 * ProcesosTicker.jsx, que es un módulo de cliente, y desde el servidor no se
 * puede llamar a una función de un módulo de cliente.
 */

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "en", "el"]);

/** "CONSTRUCCIÓN DE LA PTAP" → "Construcción de la ptap": el objeto es una frase. */
export function frase(s) {
  if (!s) return s;
  const limpio = s.trim().replace(/\s+/g, " ");
  if (limpio !== limpio.toUpperCase()) return limpio;
  const lower = limpio.toLowerCase();
  // Las siglas del sector vuelven a mayúsculas: "ptar" no se lee como PTAR.
  const conSiglas = lower.replace(/\b(ptap|ptar|ptard|pdas?|pmaa|e\.s\.p\.?|esp|aaa|ips)\b/g, (m) =>
    m.toUpperCase()
  );
  return conSiglas.charAt(0).toUpperCase() + conSiglas.slice(1);
}

/**
 * "EMPRESA DE ACUEDUCTO DE BOGOTÁ E.S.P." → "Empresa de Acueducto de Bogotá E.S.P."
 * Con `siglas = false` (nombres de lugar) no conserva ninguna: "META" y "CALI"
 * no son siglas aunque quepan en cuatro letras.
 */
export function titulo(s, siglas = true) {
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      // Primero los conectores: "DE" también cabe en la regla de las siglas, y
      // "EMPRESA DE ACUEDUCTO" salía "Empresa DE Acueducto".
      if (i > 0 && MINUSCULAS.has(lower)) return lower;
      const core = w.replace(/[^\p{L}]/gu, "");
      if (siglas && core.length <= 4 && core === core.toUpperCase() && core.length > 1) return w; // EAAB, E.S.P.
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
