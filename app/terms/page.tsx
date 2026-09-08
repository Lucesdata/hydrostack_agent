// app/terms/page.tsx

/**
 * Términos de servicio. Como /privacy, existía el enlace en el pie pero no la
 * ruta: 404.
 *
 * La sección 2 ("qué no es") es la que importa y la que hay que mantener
 * honesta. AquaLicita emite veredictos de elegibilidad y extrae requisitos de
 * pliegos con un modelo de lenguaje; las dos cosas pueden equivocarse y el
 * usuario toma decisiones de dinero con ellas. Prometer certeza aquí sería
 * insostenible y contradiría lo que el propio producto declara en pantalla
 * cuando una compuerta queda en estado UNKNOWN.
 */

import DocumentoLegal from "@/src/components/legal/DocumentoLegal";
import { RESPONSABLE, VIGENCIA } from "@/src/lib/legal/responsable";

export const metadata = {
  title: "Términos de servicio · AquaLicita",
  description:
    "Condiciones de uso de AquaLicita: qué hace el servicio, qué no garantiza, y las reglas de la cuenta.",
};

export default function TermsPage() {
  return (
    <DocumentoLegal
      etiqueta="Condiciones de uso"
      titulo="Términos de servicio"
      resumen="Las reglas de uso de AquaLicita, y sobre todo los límites de lo que el producto puede afirmar."
      vigencia={VIGENCIA}
    >
      <h2 id="quien">1. Quién presta el servicio</h2>
      <p>
        AquaLicita la opera <strong>{RESPONSABLE.nombre}</strong>, {RESPONSABLE.calidad} domiciliada
        en {RESPONSABLE.pais}. Para cualquier asunto relacionado con estos términos, escribe a{" "}
        <a href={`mailto:${RESPONSABLE.correo}`}>{RESPONSABLE.correo}</a>.
      </p>
      <p>
        Al crear una cuenta o usar el sitio aceptas estos términos. Si no estás de acuerdo con
        alguno, no uses el servicio.
      </p>

      <h2 id="que-es">2. Qué es AquaLicita y qué no es</h2>
      <p>
        AquaLicita es una herramienta de <strong>inteligencia sobre contratación pública</strong> en
        agua y saneamiento. Recoge información de SECOP II, la organiza, la cruza con el perfil que
        registras y extrae requisitos de los pliegos que subes.
      </p>
      <div className="clr-legal-nota">
        <p>
          <strong>No es asesoría legal, financiera ni técnica</strong>, y no sustituye la lectura
          del pliego oficial ni el criterio de tus asesores.
        </p>
      </div>
      <p>Tres límites concretos que conviene tener presentes:</p>
      <ul>
        <li>
          <strong>Los datos son un reflejo de la fuente.</strong> Provienen de SECOP II y de otros
          registros públicos. Si la fuente publica un dato incompleto, tarde o equivocado, nosotros
          mostramos ese dato. No verificamos la exactitud de lo que publican las entidades.
        </li>
        <li>
          <strong>El veredicto de elegibilidad es orientativo.</strong> Indica si tu perfil parece
          cumplir los requisitos habilitantes según la información disponible. Cuando no hay datos
          suficientes lo decimos en pantalla en vez de suponer. La decisión sobre si presentarte es
          tuya.
        </li>
        <li>
          <strong>La extracción de pliegos usa un modelo de lenguaje y puede equivocarse.</strong>{" "}
          Puede omitir un requisito, leer mal una cifra o citar un fragmento de forma imprecisa.
          Trátala como un borrador que acelera la lectura, nunca como la versión autorizada. La que
          rige es siempre la del documento oficial.
        </li>
      </ul>
      <p>
        El producto está en desarrollo activo: las funciones pueden cambiar, aparecer o retirarse.
      </p>

      <h2 id="cuenta">3. Tu cuenta</h2>
      <ul>
        <li>Debes ser mayor de edad y dar información veraz al registrarte.</li>
        <li>
          Eres responsable de la actividad que ocurra bajo tu cuenta y de mantener segura tu clave.
        </li>
        <li>
          Hay funciones abiertas sin cuenta, funciones que exigen una cuenta gratuita y funciones
          que podrán requerir un plan de pago. Qué queda en cada nivel puede cambiar; te avisaremos
          antes de mover una función que ya estés usando a un nivel superior.
        </li>
        <li>Puedes cerrar tu cuenta cuando quieras escribiendo al correo de contacto.</li>
      </ul>

      <h2 id="uso">4. Uso aceptable</h2>
      <p>No puedes:</p>
      <ul>
        <li>
          Extraer masivamente el contenido del sitio de forma automatizada, ni revender los datos
          como si fueran un producto propio.
        </li>
        <li>Intentar vulnerar la seguridad del servicio o acceder a datos de otros usuarios.</li>
        <li>Subir documentos sobre los que no tengas derecho, o que contengan malware.</li>
        <li>Usar el servicio para actividades ilícitas o para inducir a error a una entidad.</li>
      </ul>
      <p>
        La información pública de contratación que mostramos proviene de fuentes abiertas y puedes
        consultarla directamente en ellas.
      </p>

      <h2 id="contenido">5. Los documentos que subes</h2>
      <p>
        Los pliegos y anexos que cargas <strong>siguen siendo tuyos</strong>. Nos autorizas
        únicamente a procesarlos para prestarte el servicio: extraer requisitos y mostrarte el
        resultado. No los publicamos, no los compartimos con otros usuarios y no los usamos para
        entrenar modelos.
      </p>

      <h2 id="propiedad">6. Propiedad intelectual</h2>
      <p>
        El software, el diseño, la marca AquaLicita y el análisis derivado que produce el sistema
        son del operador. Los datos públicos de contratación no son de nadie en particular:
        conservan la naturaleza que les da la fuente oficial.
      </p>

      <h2 id="disponibilidad">7. Disponibilidad</h2>
      <p>
        Procuramos que el servicio esté disponible y actualizado a diario, pero se presta{" "}
        <strong>«tal cual»</strong>, sin garantía de disponibilidad ininterrumpida, de ausencia de
        errores ni de que la información esté completa en todo momento. Puede haber mantenimientos,
        fallos de proveedores o interrupciones de la fuente de datos.
      </p>

      <h2 id="responsabilidad">8. Límite de responsabilidad</h2>
      <p>
        En la medida en que lo permita la ley colombiana, no respondemos por decisiones de negocio
        tomadas con base en la información del servicio, ni por lucro cesante, pérdida de
        oportunidad de contratación o daños indirectos. Nada de esto limita la responsabilidad por
        dolo o culpa grave, que la ley no permite excluir.
      </p>

      <h2 id="terminacion">9. Terminación</h2>
      <p>
        Podemos suspender o cerrar una cuenta que incumpla estos términos, avisando por correo salvo
        que la gravedad del incumplimiento exija actuar de inmediato. Tú puedes irte cuando quieras.
      </p>

      <h2 id="ley">10. Ley aplicable</h2>
      <p>
        Estos términos se rigen por la ley colombiana, y las controversias se someten a los jueces
        de Colombia.
      </p>

      <h2 id="cambios">11. Cambios</h2>
      <p>
        Si cambiamos estos términos de forma sustancial, actualizaremos la fecha de vigencia y
        avisaremos por correo a los usuarios con cuenta antes de que el cambio entre a regir. Seguir
        usando el servicio después de esa fecha implica aceptar la nueva versión.
      </p>
      <p>
        El tratamiento de datos personales se rige por la{" "}
        <a href="/privacy">política de tratamiento de datos</a>, que forma parte de estos términos.
      </p>
    </DocumentoLegal>
  );
}
