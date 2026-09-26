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
export default function CierreFicha({ urlSecop }: { urlSecop: string | null }) {
  return (
    <div>
      <h2 className="fi-h2">Qué puedes hacer ahora</h2>
      <p className="fi-vacio">
        Para saber si puedes participar en este proceso, comprueba primero los requisitos en el
        pliego. Esta ficha aún no tiene requisitos extraídos y no puede emitir un veredicto
        individual. El diagnóstico orienta sobre tu preparación general, sin verificar este pliego
        ni sustituirlo.
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
        <Link className="fi-btn" href="/diagnostico">
          Evaluar mi preparación general sin cuenta
        </Link>
      </div>
    </div>
  );
}
