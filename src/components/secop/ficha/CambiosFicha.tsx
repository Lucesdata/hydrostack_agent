import type { CambioFicha, HistorialFicha } from "@/src/lib/secop/ficha";
import { fechaLegible } from "@/src/lib/secop/etapa";
import { formatCopFull } from "@/src/components/secop/format";
import { montoConDato } from "@/src/lib/secop/monto";
function Cambio({ c }: { c: CambioFicha }) {
  const instante = new Date(c.detectado);
  const fecha = Number.isNaN(instante.getTime())
    ? "Fecha por verificar"
    : instante.toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const anterior = montoConDato(c.valorAnterior),
    nuevo = montoConDato(c.valorNuevo);
  return (
    <li>
      <time dateTime={Number.isNaN(instante.getTime()) ? undefined : instante.toISOString()}>
        {fecha} · COT
      </time>
      <h3>
        {c.tipoEvento === "apertura"
          ? "Publicación detectada"
          : c.tipoEvento === "adjudicacion"
            ? "Cambio de adjudicación detectado"
            : "Actualización detectada en SECOP"}
      </h3>
      {c.fechaCierreNueva !== c.fechaCierreAnterior && (
        <p>
          Cierre de ofertas: {fechaLegible(c.fechaCierreAnterior)} →{" "}
          {fechaLegible(c.fechaCierreNueva)}
        </p>
      )}
      {c.estadoNuevo !== c.estadoAnterior && (
        <p>
          Estado: {c.estadoAnterior ?? "Sin informar"} → {c.estadoNuevo ?? "Sin informar"}
        </p>
      )}
      {nuevo !== anterior && (
        <p>
          Presupuesto: {anterior === null ? "Sin informar" : formatCopFull(anterior)} →{" "}
          {nuevo === null ? "Sin informar" : formatCopFull(nuevo)}
        </p>
      )}
    </li>
  );
}
export default function CambiosFicha({
  resultado,
  urlSecop,
}: {
  resultado: HistorialFicha;
  urlSecop: string | null;
}) {
  return (
    <>
      {resultado.error ? (
        <p className="fi-vacio">
          No pudimos consultar el historial. Consulta el expediente para comprobar cambios
          recientes.
        </p>
      ) : resultado.cambios.length === 0 ? (
        <p className="fi-vacio">
          No hay cambios registrados en el historial disponible. Esto no confirma que el expediente
          no haya tenido cambios.
        </p>
      ) : (
        <>
          <ol className="fi-cambios">
            {resultado.cambios.slice(0, 3).map((c) => (
              <Cambio key={c.id} c={c} />
            ))}
          </ol>
          {resultado.cambios.length > 3 && (
            <details className="fi-desplegable">
              <summary>Ver más cambios ({resultado.cambios.length - 3})</summary>
              <ol className="fi-cambios">
                {resultado.cambios.slice(3).map((c) => (
                  <Cambio key={c.id} c={c} />
                ))}
              </ol>
            </details>
          )}
          <p className="fi-ayuda">
            Hora de detección en Colombia. Una actualización detectada no acredita la publicación de
            una adenda oficial. Se muestran hasta los 20 registros más recientes.
          </p>
        </>
      )}
      {urlSecop && (
        <a className="fi-btn" href={urlSecop} target="_blank" rel="noopener noreferrer">
          Ver cambios en SECOP II ↗
        </a>
      )}
    </>
  );
}
