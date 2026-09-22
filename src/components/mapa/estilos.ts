/**
 * Estilos del mapa departamental. Se inyectan una vez por página, con el mismo
 * patrón que `lista/estilos.ts` y el resto del producto.
 *
 * Los cinco tintes del color viven aquí y no en `globals.css` a propósito: son
 * datos, no estado. No llevan texto encima —lo que se lee es la leyenda, sobre
 * `--bg`— así que no entran en el contrato de contraste del semáforo, que es
 * donde el color sí informa de si puedes participar.
 *
 * Salen todos de `--accent`, para que el mapa no introduzca un color nuevo en
 * una paleta que se decidió medir antes de tocar.
 */
export const ESTILOS_MAPA = `
.clr-mapa{
  --mapa-e0: var(--surface-alt);
  --mapa-e1: rgba(3,105,161,.16);
  --mapa-e2: rgba(3,105,161,.36);
  --mapa-e3: rgba(3,105,161,.62);
  --mapa-e4: var(--accent);
  margin: 0; display: flex; flex-direction: column; gap: 14px;
}
.clr-mapa__svg{ width: 100%; height: auto; display: block; overflow: visible; }
.clr-mapa__dpto{
  stroke: var(--bg); stroke-width: .6; stroke-linejoin: round;
  transition: fill .15s, stroke .15s;
}
.clr-mapa__dpto--e0{ fill: var(--mapa-e0); }
.clr-mapa__dpto--e1{ fill: var(--mapa-e1); }
.clr-mapa__dpto--e2{ fill: var(--mapa-e2); }
.clr-mapa__dpto--e3{ fill: var(--mapa-e3); }
.clr-mapa__dpto--e4{ fill: var(--mapa-e4); }
.clr-mapa__link:hover .clr-mapa__dpto{ stroke: var(--accent-deep); stroke-width: 1.4; }
/* El foco se pinta en el path y no con outline: un outline rectangular sobre una
   forma irregular señala el bounding box, no el departamento. */
.clr-mapa__link:focus{ outline: none; }
.clr-mapa__link:focus-visible .clr-mapa__dpto{
  stroke: var(--accent-deep); stroke-width: 2.2;
}
.clr-mapa__recuadro{ fill: none; stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 2; }
.clr-mapa__recuadro-txt{
  font-size: 9px; fill: var(--text-muted); font-family: inherit; letter-spacing: .02em;
}
.clr-mapa__leyenda{
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center;
}
.clr-mapa__leyenda li{ display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.clr-mapa__swatch{
  width: 14px; height: 10px; border-radius: 2px; display: inline-block;
  border: 1px solid var(--border);
}
.clr-mapa__nota{ margin: 0; font-size: 12.5px; color: var(--text-primary); }
.clr-mapa__sin{ margin: 0; font-size: 12px; color: var(--text-muted); }
@media (max-width: 640px){
  .clr-mapa__leyenda{ gap: 4px 10px; }
  .clr-mapa__leyenda li{ font-size: 11.5px; }
}
`;
