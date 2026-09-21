/**
 * CSS de la tarjeta, como string exportado e inyectado por quien la monta.
 * Es el patrón del repo (ver `lista/estilos.ts` y `semaforo/estilos.ts`).
 *
 * Los colores salen de los tokens de `globals.css` por convención — aquí no
 * hay literal hexadecimal ninguno, todo es `var(--token)` a secas, sin
 * fallback. Ojo: `contraste.test.ts` NO lee este archivo, así que no hay
 * guardián automático contra que alguien cuele un literal aquí; sí mide el
 * contraste real de las pastillas de etapa (`.fc-etapa--*`) reconstruyendo su
 * tinte a partir de los tokens de `globals.css`, así que un token que cambie
 * de valor y baje de AA sí hace fallar el test.
 */
export const ESTILOS_FICHA_CARD = `
.fc {
  position: relative;
  display: block;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 18px 20px;
  color: inherit;
  transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease;
}
.fc:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  transform: translateY(-4px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--text-primary) 8%, transparent);
}
.fc:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.fc-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.fc-id { font: 11px var(--mono); color: var(--text-muted); letter-spacing: .02em; }
.fc-etapa {
  /* Estilo neutro, base de las 7 claves de ClaveEtapa. «borrador» y
     «desconocido» no tienen modificador propio y se quedan aquí a propósito:
     no son un estado que valga la pena destacar con color. */
  font: 600 10px var(--mono);
  letter-spacing: .08em;
  padding: 3px 8px;
  border-radius: 3px;
  white-space: nowrap;
  background: var(--surface-alt);
  color: var(--text-muted);
}
/* Tinte al 7%, no al 12% original: a 10px (texto normal, exige 4,5:1) --success
   y --warning medían 4,27:1 y 4,25:1 sobre --card al 12% — fallaban AA. Los
   cuatro casos están medidos en src/__tests__/design/contraste.test.ts. */
.fc-etapa--abierto { background: color-mix(in srgb, var(--success) 7%, transparent); color: var(--success); }
.fc-etapa--adjudicado { background: color-mix(in srgb, var(--accent) 7%, transparent); color: var(--accent-deep, var(--accent)); }
.fc-etapa--cancelado { background: color-mix(in srgb, var(--danger) 7%, transparent); color: var(--danger); }
.fc-etapa--evaluacion, .fc-etapa--suspendido { background: color-mix(in srgb, var(--warning) 7%, transparent); color: var(--warning); }

.fc-entidad { font: 12px var(--sans); color: var(--text-muted); margin: 0 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-objeto {
  font: 600 15px/1.35 var(--sans);
  color: var(--text-primary);
  margin: 0 0 14px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.fc-plazo { font: 12px var(--mono); color: var(--text-muted); margin: 0 0 14px; }
.fc-sep { height: 1px; background: var(--border); margin: 0 0 12px; }
.fc-pie { display: flex; align-items: center; justify-content: flex-end; margin-top: 12px; }
.fc-ver { font: 600 12px var(--mono); color: var(--accent); }

/* destacada: sobre el mapa del hero, más aire y sombra propia */
.fc--destacada { padding: 24px 26px; box-shadow: 0 16px 40px color-mix(in srgb, var(--text-primary) 12%, transparent); }
.fc--destacada .fc-objeto { font-size: 17px; -webkit-line-clamp: 3; }

/* compacta: listas y correo. Sin semáforo, así que aquí SÍ va la cuantía. */
.fc--compacta { padding: 12px 14px; }
.fc--compacta .fc-objeto { font-size: 13px; margin-bottom: 8px; }
.fc-cuantia { font: 600 13px var(--mono); color: var(--text-primary); }

@media (max-width: 640px) {
  .fc { padding: 14px 16px; }
  .fc-cab { flex-wrap: wrap; }
}
`;
