import Link from "next/link";

/**
 * El cierre de la ficha: el siguiente paso.
 *
 * El botón principal era "Activar alerta para procesos como este", y la alerta
 * **no se entrega en producción** (PENDIENTES §0 y §21): quien lo pulsaba creía
 * que iba a enterarse de algo y no se enteraba de nada. Mientras eso siga así,
 * el paso principal es dar los datos del ingeniero con el diagnóstico, que
 * funciona sin cuenta y convierte el semáforo en "cómo te queda a ti".
 *
 * Al resolver el §0, la alerta puede volver aquí (PENDIENTES §44).
 */
export default function CierreFicha({ urlSecop }: { urlSecop: string | null }) {
  return (
    <div className="fi-cierre">
      <Link className="fi-btn fi-btn--primario" href="/diagnostico">
        Completar mis datos: diagnóstico sin cuenta
      </Link>
      {urlSecop && (
        <a className="fi-btn" href={urlSecop} target="_blank" rel="noopener noreferrer">
          Ver en el SECOP II
        </a>
      )}
    </div>
  );
}
