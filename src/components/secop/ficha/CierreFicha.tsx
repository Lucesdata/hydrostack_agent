import Link from "next/link";

/**
 * El cierre de la ficha: el siguiente paso.
 *
 * El botón principal era "Activar alerta para procesos como este", y la alerta
 * **no se entrega en producción** (PENDIENTES §0 y §21): quien lo pulsaba creía
 * que iba a enterarse de algo y no se enteraba de nada. Mientras eso siga así,
 * el paso principal es abrir el expediente para comprobar el pliego. El
 * diagnóstico funciona sin cuenta, pero evalúa preparación general: no compara
 * al oferente con las condiciones particulares de este proceso.
 *
 * Al resolver el §0, la alerta puede volver aquí (PENDIENTES §44).
 */
export default function CierreFicha({
  urlSecop,
  estadoApertura,
}: {
  urlSecop: string | null;
  estadoApertura: string | null;
}) {
  const cerrado = estadoApertura === "Cerrado";
  const abierto = estadoApertura === "Abierto";

  return (
    <div>
      <h2 className="fi-h2">Qué puedes hacer ahora</h2>
      <p className="fi-vacio">
        {cerrado
          ? "Esta ficha registra el proceso como cerrado. Confirma el estado actual en el expediente y explora otros procesos abiertos."
          : abierto
            ? "Para saber si puedes participar, comprueba primero los requisitos en el pliego. Esta ficha aún no los tiene extraídos y no puede emitir un veredicto individual."
            : "No consta aquí si el proceso recibe ofertas. Comprueba el estado y los requisitos en el expediente antes de decidir si puedes participar."}{" "}
        El diagnóstico orienta sobre tu preparación general; no verifica este pliego.
      </p>
      <div className="fi-cierre">
        {urlSecop && (
          <a
            className="fi-btn fi-btn--primario"
            href={urlSecop}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir expediente en SECOP II
          </a>
        )}
        {cerrado ? (
          <Link className="fi-btn" href="/licitaciones">
            Explorar procesos abiertos
          </Link>
        ) : (
          <Link className="fi-btn" href="/diagnostico">
            Evaluar mi preparación general sin cuenta
          </Link>
        )}
      </div>
    </div>
  );
}
