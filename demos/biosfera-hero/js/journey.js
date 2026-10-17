// Estado del recorrido del lote: una línea de tiempo T (segundos) y sus derivados. Sin DOM ni Three.js.
import { TIEMPOS, ETAPAS } from "./data.js";

const FIN = TIEMPOS.fin;

export function etapaEn(T) {
  if (T < TIEMPOS.tratamiento[0]) return 0;
  if (T < TIEMPOS.documentacion[0]) return 1;
  if (T < TIEMPOS.certificado[0]) return 2;
  return 3;
}

// Zona activa de la planta según el instante (la banda, el tromel y las salidas se turnan).
export function zonaEn(T) {
  const e = etapaEn(T);
  if (e === 0) return "tolva";
  if (e >= 2) return "admin";
  if (T < 13) return "cinta";
  if (T < 18.5) return "tromel";
  return "salidas";
}

// Tiempo con el que se mueven los mecanismos reales (banda y tromel): solo mientras hay material en ellos.
export function tiempoMecanismos(T) {
  return Math.min(Math.max(T, TIEMPOS.tratamiento[0] - 0.4), TIEMPOS.tratamiento[1]);
}

export function crearRecorrido(onChange) {
  const s = { T: 0, iniciado: false, pausado: false };
  const emitir = () => onChange && onChange(estado());
  const estado = () => ({
    T: s.T,
    iniciado: s.iniciado,
    pausado: s.pausado,
    terminado: s.T >= FIN,
    etapa: s.iniciado ? etapaEn(s.T) : -1,
    zona: s.iniciado ? zonaEn(s.T) : null,
    progreso: Math.min(1, s.T / FIN),
  });
  return {
    estado,
    // true si el tiempo avanza solo
    avanzando: () => s.iniciado && !s.pausado && s.T < FIN,
    iniciar() {
      s.T = 0;
      s.iniciado = true;
      s.pausado = false;
      emitir();
    },
    alternarPausa() {
      s.pausado = !s.pausado;
      emitir();
    },
    fijarPausa(v) {
      s.pausado = v;
      emitir();
    },
    reiniciar() {
      s.T = 0;
      s.iniciado = false;
      s.pausado = false;
      emitir();
    },
    // revisar un momento: salta a ese paso y se queda en pausa
    irAEtapa(i) {
      s.T = ETAPAS[i].revisar;
      s.iniciado = true;
      s.pausado = true;
      emitir();
    },
    avanzar(dt) {
      if (!(s.iniciado && !s.pausado && s.T < FIN)) return;
      s.T = Math.min(FIN, s.T + dt);
      emitir();
    },
  };
}
