// app/privacy/page.tsx

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012, Decreto 1377
 * de 2013). El pie de la landing la enlazaba desde antes de que existiera: la
 * ruta devolvía 404.
 *
 * El inventario de datos de más abajo NO es genérico: cada viñeta corresponde a
 * una tabla real del esquema Drizzle o a un tercero realmente cableado. Si se
 * añade una tabla que guarde datos de personas, o un servicio nuevo que los
 * reciba, este archivo se actualiza en el mismo PR. Una política que enumera
 * menos de lo que el sistema guarda es peor que no tenerla, porque afirma algo
 * falso sobre el tratamiento.
 */

import DocumentoLegal from "@/src/components/legal/DocumentoLegal";
import { RESPONSABLE, VIGENCIA } from "@/src/lib/legal/responsable";

export const metadata = {
  title: "Política de tratamiento de datos · AquaLicita",
  description:
    "Qué datos personales trata AquaLicita, con qué finalidad, quién los recibe y cómo ejercer los derechos de habeas data.",
};

export default function PrivacyPage() {
  return (
    <DocumentoLegal
      etiqueta="Datos personales"
      titulo="Política de tratamiento de datos"
      resumen="Qué datos guardamos, por qué, quién más los ve y cómo pedir que los corrijamos o los borremos."
      vigencia={VIGENCIA}
    >
      <h2 id="responsable">1. Quién responde por tus datos</h2>
      <p>
        El responsable del tratamiento es <strong>{RESPONSABLE.nombre}</strong>,{" "}
        {RESPONSABLE.calidad}, domiciliado en {RESPONSABLE.pais}, que opera AquaLicita.
      </p>
      <div className="clr-legal-nota">
        <p>
          Canal de contacto para todo lo relacionado con datos personales:{" "}
          <a href={`mailto:${RESPONSABLE.correo}`}>{RESPONSABLE.correo}</a>.
        </p>
        {!RESPONSABLE.direccion && (
          <p>
            AquaLicita opera hoy sin oficina de atención presencial ni línea telefónica, así que el
            correo es el único canal para ejercer tus derechos. Lo decimos explícitamente en vez de
            publicar una dirección que no atendería nadie.
          </p>
        )}
      </div>

      <h2 id="datos">2. Qué datos tratamos</h2>
      <p>
        Esta es la lista completa. Cada punto corresponde a algo que el sistema efectivamente
        guarda, no a una plantilla.
      </p>

      <h3>Datos de tu cuenta</h3>
      <ul>
        <li>
          Nombre, correo electrónico y, si entras con Google, la foto de perfil que Google expone.
        </li>
        <li>La fecha en que verificaste tu correo y la fecha de creación de la cuenta.</li>
        <li>
          Las contraseñas las gestiona nuestro proveedor de autenticación (Supabase) y{" "}
          <strong>no las almacenamos ni podemos verlas</strong>.
        </li>
      </ul>

      <h3>Datos que aportas para usar el producto</h3>
      <ul>
        <li>
          <strong>Perfil de oferente:</strong> la información de tu RUP que registras para que
          calculemos elegibilidad — experiencia acreditada, indicadores financieros, clasificación
          UNSPSC, cupos y demás campos del formulario.
        </li>
        <li>
          <strong>Respuestas del diagnóstico:</strong> las 10 preguntas de <code>/diagnostico</code>{" "}
          y el resultado calculado. Se pueden responder <strong>sin cuenta</strong>: en ese caso la
          fila queda asociada a un identificador aleatorio guardado en una cookie, no a una persona.
          Si luego te registras, esa fila se vincula a tu cuenta.
        </li>
        <li>
          <strong>Filtros y preferencias de alerta:</strong> los criterios de búsqueda que defines,
          la franja horaria de envío y qué eventos quieres que te notifiquemos.
        </li>
        <li>
          <strong>Documentos que subes al analizador de pliegos:</strong> el documento base y, si lo
          adjuntas, el formulario de presupuesto.
        </li>
        <li>
          <strong>Conversaciones con los asistentes de proyecto:</strong> los mensajes que escribes
          y las respuestas que recibes.
        </li>
      </ul>

      <h3>Datos que genera el uso</h3>
      <ul>
        <li>
          <strong>Coincidencias:</strong> qué procesos te cruzamos, con qué veredicto y si ya los
          viste.
        </li>
        <li>
          <strong>Señales de intención:</strong> un registro de qué parte del producto usaste —
          buscar procesos, analizar un pliego, consultar soluciones— para entender qué construir
          después. No es un perfil publicitario y no se cruza con terceros.
        </li>
        <li>
          <strong>Registro de correos enviados:</strong> qué alerta te mandamos, cuándo y si el
          proveedor la reportó como entregada, rebotada o marcada como spam.
        </li>
        <li>
          <strong>Métricas de navegación agregadas</strong> a través de Vercel Analytics y Speed
          Insights: páginas vistas y tiempos de carga, sin cookies de seguimiento ni perfilado
          individual.
        </li>
      </ul>

      <h2 id="finalidad">3. Para qué los usamos</h2>
      <ul>
        <li>Crear y sostener tu cuenta, y autenticarte.</li>
        <li>
          Cruzar tu perfil contra los procesos de SECOP II y decirte si cumples los requisitos
          habilitantes.
        </li>
        <li>Enviarte las alertas que configuraste, y solo esas.</li>
        <li>Extraer los requisitos de los pliegos que subes.</li>
        <li>Operar, depurar y mejorar el producto, y medir qué funciones se usan.</li>
        <li>Cumplir obligaciones legales y atender requerimientos de autoridad competente.</li>
      </ul>
      <p>
        No vendemos datos personales, no los cedemos con fines comerciales y no hacemos publicidad
        dirigida.
      </p>

      <h2 id="autorizacion">4. Con qué autorización</h2>
      <p>
        Al crear una cuenta, responder el diagnóstico o configurar alertas nos autorizas a tratar
        esos datos para las finalidades de arriba. Puedes revocar esa autorización en cualquier
        momento escribiendo al correo de contacto; revocarla implica cerrar la cuenta, porque sin
        esos datos el producto no puede prestar el servicio.
      </p>

      <h2 id="terceros">5. Quién más los ve</h2>
      <p>
        Trabajamos con proveedores que actúan como encargados del tratamiento. Acceden a lo mínimo
        para prestar su servicio y no pueden usarlos para lo suyo.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — base de datos y autenticación. Los datos residen en la región{" "}
          <code>eu-west-1</code> (Irlanda, Unión Europea).
        </li>
        <li>
          <strong>Vercel</strong> — alojamiento de la aplicación y métricas de navegación.
        </li>
        <li>
          <strong>Resend</strong> — envío de los correos de alerta y de verificación de cuenta.
        </li>
        <li>
          <strong>Google</strong> — inicio de sesión con Google (si eliges esa vía) y el modelo
          Gemini, que procesa el texto de los pliegos que subes al analizador.
        </li>
      </ul>
      <h3>Transferencia internacional</h3>
      <p>
        Como esos proveedores operan fuera de Colombia, tus datos se transfieren al exterior. La
        base de datos está en la Unión Europea, cuyo nivel de protección la Superintendencia de
        Industria y Comercio reconoce como adecuado. Al aceptar esta política autorizas expresamente
        esa transferencia.
      </p>

      <h2 id="cookies">6. Cookies</h2>
      <p>Usamos dos, ambas necesarias para que el sitio funcione:</p>
      <ul>
        <li>
          La <strong>cookie de sesión</strong> que te mantiene autenticado.
        </li>
        <li>
          Un <strong>identificador aleatorio del diagnóstico</strong>, que permite recuperar tus
          respuestas si lo contestas sin cuenta. Es <code>httpOnly</code> y se borra al reclamar el
          diagnóstico o al cerrar sesión.
        </li>
      </ul>
      <p>No usamos cookies publicitarias ni de seguimiento entre sitios.</p>

      <h2 id="derechos">7. Tus derechos</h2>
      <p>Como titular de los datos puedes:</p>
      <ul>
        <li>Conocer qué datos tuyos tratamos y obtener copia de ellos.</li>
        <li>Actualizarlos y rectificarlos cuando sean inexactos o estén incompletos.</li>
        <li>
          Solicitar su supresión, salvo cuando exista un deber legal o contractual de conservarlos.
        </li>
        <li>Revocar la autorización.</li>
        <li>
          Presentar quejas ante la Superintendencia de Industria y Comercio, una vez agotado el
          trámite de consulta o reclamo ante nosotros.
        </li>
      </ul>
      <p>
        Escribe a <a href={`mailto:${RESPONSABLE.correo}`}>{RESPONSABLE.correo}</a> desde el correo
        de tu cuenta. Las consultas se atienden en un plazo máximo de{" "}
        <strong>diez días hábiles</strong> y los reclamos en <strong>quince días hábiles</strong>,
        prorrogables en los términos que fija la ley, avisándote antes del vencimiento.
      </p>

      <h2 id="conservacion">8. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tu cuenta esté activa. Si la cierras, borramos los datos asociados salvo los que
        debamos conservar por obligación legal o para acreditar el cumplimiento de esta política.
        Los registros de envío de correo se conservan mientras sean útiles para diagnosticar
        problemas de entrega.
      </p>

      <h2 id="menores">9. Menores de edad</h2>
      <p>
        AquaLicita es una herramienta profesional dirigida a mayores de edad. No recogemos datos de
        menores a sabiendas; si detectamos una cuenta de un menor, la eliminamos.
      </p>

      <h2 id="seguridad">10. Seguridad</h2>
      <p>
        El tráfico va cifrado, el acceso a la base está restringido y las tablas tienen activado el
        control de acceso a nivel de fila. Ningún sistema es infalible: si ocurre un incidente que
        afecte tus datos, te avisaremos y lo reportaremos a la autoridad conforme a la ley.
      </p>

      <h2 id="datos-publicos">11. Datos públicos de terceros</h2>
      <p>
        Además de tus datos, AquaLicita procesa información pública de contratación: procesos,
        entidades, proveedores adjudicatarios y sanciones, tomada de SECOP II y otras fuentes
        oficiales abiertas. Esa información no proviene de ti ni la generamos nosotros; la
        reproducimos como la publica la fuente.
      </p>
      <p>
        Si apareces en esos registros y consideras que un dato es inexacto, el origen es la entidad
        que lo publicó y la corrección debe hacerse allí, porque volveríamos a ingerir el valor
        corregido. Aun así, escríbenos y te indicamos ante quién reclamar.
      </p>

      <h2 id="cambios">12. Cambios</h2>
      <p>
        Si esta política cambia de forma sustancial, actualizaremos la fecha de vigencia y
        avisaremos a los usuarios con cuenta por correo antes de que el cambio entre a regir.
      </p>
    </DocumentoLegal>
  );
}
