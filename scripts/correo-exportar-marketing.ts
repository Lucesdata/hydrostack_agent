/**
 * Exporta a CSV los contactos que aceptaron correo de marketing, para importarlos
 * en la lista de Brevo (spec 2026-10-12-correo-marketing-resend-brevo.md, Fase 2).
 *
 *   npm run correo:exportar-marketing > contactos.csv
 *
 * Antes de importar, revisa en Brevo la lista de bajas y desmarca en /cuenta (o
 * pídelo por correo) a quien se haya dado de baja allí.
 */
import "./_env";
import { contactosConsentidos, contactosACsv } from "@/src/lib/marketing/consentimiento";

contactosConsentidos()
  .then((c) => {
    process.stdout.write(contactosACsv(c));
    console.error(`${c.length} contactos con consentimiento vigente y correo verificado.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
