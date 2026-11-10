import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import PerfilEmpresaForm, { MENSAJE_ERROR } from "@/src/components/comercial/PerfilEmpresaForm";
import { comercialHabilitado } from "@/src/lib/comercial/habilitado";
import { guardarEmpresaFormAction, leerMiEmpresaAction } from "@/src/lib/empresa/actions";

/**
 * Perfil de empresa comercial (CI-11b). Privada y dinámica; detrás de
 * `CI_COMERCIAL_HABILITADO=1` (apagada responde 404) y `noindex`. Exige cuenta:
 * el middleware la protege y aquí se vuelve a comprobar.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Perfil de empresa",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!comercialHabilitado()) notFound();
  const r = await leerMiEmpresaAction();
  if (r.ok === false) {
    if (r.error === "SIN_SESION") redirect("/login?next=/comercial/perfil");
    notFound();
  }
  const err = typeof searchParams.error === "string" ? searchParams.error : "";
  // Solo campos conocidos: el valor viene de la URL.
  const errores = err
    .split(",")
    .filter((c) => Object.prototype.hasOwnProperty.call(MENSAJE_ERROR, c));
  return (
    <PerfilEmpresaForm
      empresa={r.empresa}
      action={guardarEmpresaFormAction}
      guardado={searchParams.ok === "1"}
      errores={[...new Set(errores)]}
    />
  );
}
