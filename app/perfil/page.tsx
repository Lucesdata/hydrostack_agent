import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import PerfilForm from "@/src/components/perfil/PerfilForm";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/perfil");

  const perfil = await getPerfilDb(user.id);
  return (
    <div className="clr-page">
      <div className="clr-container" style={{ maxWidth: 720, padding: "40px 20px" }}>
        <h1 className="clr-h1">Mi perfil RUP</h1>
        <p className="clr-sub">
          Estos datos se usan para calcular tu elegibilidad en cada proceso — nunca se
          publican ni se comparten.
        </p>
        <PerfilForm perfilInicial={perfil} />
      </div>
    </div>
  );
}
