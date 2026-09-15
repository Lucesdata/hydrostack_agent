/**
 * Contraste WCAG 2.1 — cálculo puro sobre colores sRGB.
 *
 * Existe porque el producto no tenía ninguna forma de detectar que un color
 * había dejado de ser legible. El CSS vive repartido en `app/globals.css` y 26
 * bloques `<style>` inyectados dentro de componentes, y ningún test miraba
 * color: una regresión de contraste solo se notaba si alguien la veía.
 *
 * Se mide contraste y no "se ve bien": el semáforo de elegibilidad decide si un
 * oferente puede participar, y si su verde no se lee, la información no llega
 * aunque el píxel esté pintado.
 *
 * Referencia: WCAG 2.1, 1.4.3 (Contrast Minimum) y 1.4.11 (Non-text Contrast).
 */

/** Umbrales de WCAG 2.1 nivel AA. */
export const AA = {
  /** Texto normal: menos de 18,66px en negrita o menos de 24px normal. */
  texto: 4.5,
  /** Texto grande, y sin más matices. */
  textoGrande: 3,
  /** Elementos no textuales: barras, puntos, bordes que transportan estado. */
  noTextual: 3,
} as const;

/** `#abc`, `#aabbcc` o `#aabbccdd` → [r, g, b] 0–255. El alfa se ignora. */
export function parseHex(hex: string): [number, number, number] {
  const limpio = hex.trim().replace(/^#/, "");
  const full = limpio.length === 3 ? [...limpio].map((c) => c + c).join("") : limpio;
  if (!/^[0-9a-fA-F]{6,8}$/.test(full)) {
    throw new Error(`parseHex(): "${hex}" no es un color hexadecimal de 3, 6 u 8 dígitos`);
  }
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Canal sRGB 0–255 → lineal, según la fórmula de WCAG. */
function linealizar(canal: number): number {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminancia relativa 0–1 (WCAG 2.1 §relative luminance). */
export function luminancia(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linealizar(r) + 0.7152 * linealizar(g) + 0.0722 * linealizar(b);
}

/** Razón de contraste entre dos colores opacos. Va de 1:1 a 21:1, simétrica. */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

/**
 * Compone un color semitransparente sobre un fondo opaco y devuelve el hex
 * resultante. Necesario porque los tintes del producto se escriben como
 * `rgba(r,g,b,.1)` sobre blanco, y WCAG solo se define entre colores opacos.
 */
export function componer(frente: [number, number, number], alfa: number, fondo: string): string {
  const base = parseHex(fondo);
  const mezcla = frente.map((c, i) => Math.round(c * alfa + base[i] * (1 - alfa)));
  return "#" + mezcla.map((c) => c.toString(16).padStart(2, "0")).join("");
}

/** Lee los tokens de color de un bloque `:root` de CSS. Solo valores hex. */
export function leerTokensHex(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, nombre, valor] of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    // El primero gana: `:root` está al principio y nada lo redefine después.
    if (!(nombre in tokens)) tokens[nombre] = valor;
  }
  return tokens;
}
