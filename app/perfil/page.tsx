import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { isPerfilCompleto } from "@/src/lib/oferente/perfil-minimo";
import PerfilForm from "@/src/components/perfil/PerfilForm";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/perfil");

  const guardado = await getPerfilDb(user.id);
  const perfilCompleto = guardado && isPerfilCompleto(guardado) ? guardado : null;

  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 720, padding: "40px 20px" }}>
        <h1 className="clr-h1">Mi perfil RUP</h1>
        <p className="clr-sub">
          Estos datos se usan para calcular tu elegibilidad en cada proceso — nunca se publican ni
          se comparten.
        </p>
        <PerfilForm perfilInicial={perfilCompleto} />
      </div>
    </div>
  );
}
