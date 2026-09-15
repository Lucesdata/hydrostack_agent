import Link from "next/link";
import { PALABRA_ESTADO, type CompuertaVista } from "@/src/lib/secop/semaforo";

/**
 * El semáforo de cinco compuertas.
 *
 * Es presentacional puro: recibe las compuertas ya resueltas y no sabe de dónde
 * salen. Por eso sirve igual para el veredicto con perfil (relativo) que para la
 * lectura absoluta de quien llega sin cuenta, y por eso la fila de la vitrina lo
 * recibe como `ReactNode` en vez de calcularlo dentro.
 *
 * `disposicion` es lo único que cambia entre la vitrina y la ficha: en línea
 * para escanear, en bloque para leer. Ninguna de las dos cambia qué se muestra.
 */

const CLASE_PUNTO = {
  PASS: "pass",
  WARN: "warn",
  FAIL: "fail",
  UNKNOWN: "unknown",
  DATO: "dato",
} as const;

export default function Semaforo({
  compuertas,
  disposicion = "linea",
  nota,
}: {
  compuertas: CompuertaVista[];
  disposicion?: "linea" | "bloque";
  /** La coletilla de la ficha: cinco lecturas del pliego, no un dictamen. */
  nota?: string;
}) {
  const bloque = disposicion === "bloque";

  return (
    <div>
      <ul className={`sf sf--${disposicion}`} style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {compuertas.map((c) => (
          <li
            key={c.clave}
            className="sf-item"
            /* En línea no cabe la explicación, así que viaja en el title. No
               sustituye al texto: la etiqueta y la palabra del estado siguen
               visibles, que es lo que exige no dejar el color solo. */
            title={!bloque && c.explicacion ? c.explicacion : undefined}
          >
            <span className={`sf-punto sf-punto--${CLASE_PUNTO[c.estado]}`} aria-hidden="true" />
            <span className="sf-etiqueta">{c.etiqueta}</span>
            {/* En línea manda el valor —"PTAR", "$49 M", "Cundinamarca"—, que
                distingue un proceso de otro.
                En bloque manda la palabra del estado... salvo en `DATO`, donde
                se omite: la explicación va justo al lado y "Sector EXIGE
                Proyecto de PTAR" no añade nada sobre "Sector · Proyecto de
                PTAR". El color no queda solo — lo explica la frase. */}
            {(!bloque || c.estado !== "DATO") && (
              <span className="sf-palabra">{bloque ? PALABRA_ESTADO[c.estado] : c.valorCorto}</span>
            )}
            {bloque &&
              (c.redactada ? (
                <Link className="sf-pide-cuenta" href="/registro">
                  Ver por qué — pide cuenta
                </Link>
              ) : c.explicacion ? (
                <span className="sf-explicacion">{c.explicacion}</span>
              ) : (
                <span className="sf-explicacion">
                  Este dato no está publicado en el SECOP para este proceso.
                </span>
              ))}
          </li>
        ))}
      </ul>
      {nota && <p className="sf-nota">{nota}</p>}
    </div>
  );
}
