import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { ESTILOS_MAPA } from "@/src/components/mapa/estilos";
import RegistroPreview from "@/src/components/auth/RegistroPreview";
import { destacadosPortada } from "@/src/lib/secop/destacados-portada";
import { procesosDe } from "@/src/lib/landing/destacados-portada";
import styles from "@/src/components/auth/registro.module.css";
import Link from "next/link";
import { AuthCard } from "@/src/components/auth/AuthCard";
import { BotonEnvio } from "@/src/components/auth/BotonEnvio";
import { GoogleButton } from "@/src/components/auth/GoogleButton";
import { signUpAction } from "@/src/lib/supabase/actions";
import { authErrorMessage } from "@/src/lib/supabase/auth-messages";
import { redirect } from "next/navigation";
import { sesionLocalActiva } from "@/src/lib/sesion-local/sesion-local";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  // Entorno local sin Supabase: se entra eligiendo un usuario de prueba.
  if (sesionLocalActiva()) redirect(`/dev/sesion?next=${encodeURIComponent(next)}`);
  const error = authErrorMessage(params.error);

  return (
    <div className={styles.registro}>
      <AuthCard
        variante="registro"
        visual={
          <Suspense
            fallback={
              <RegistroPreview
                cargando
                destacados={null}
                mapa={<ColombiaChoropleth filas={[]} seleccion={[]} />}
              />
            }
          >
            <TerritorioRegistro />
          </Suspense>
        }
        figLabel="Tu cuenta gratuita"
        title="Crear cuenta"
        subtitle="Guarda procesos, consulta pliegos y configura tus alertas en un solo lugar."
      >
        {error && (
          <p role="alert" className="clr-auth-msg clr-auth-msg--error">
            {error}
          </p>
        )}

        <form action={signUpAction}>
          <input type="hidden" name="next" value={next} />
          <div className="clr-auth-field">
            <label className="clr-auth-label" htmlFor="fullName">
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Nombre y apellido"
              className="clr-auth-input"
            />
          </div>
          <div className="clr-auth-field">
            <label className="clr-auth-label" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className="clr-auth-input"
            />
          </div>
          <div className="clr-auth-field">
            <label className="clr-auth-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="registro-password-ayuda"
              placeholder="Crea una contraseña"
              className="clr-auth-input"
            />
          </div>
          <p id="registro-password-ayuda" className={styles.ayuda}>
            Usa al menos 8 caracteres.
          </p>
          <BotonEnvio enviando="Creando cuenta…">Crear cuenta</BotonEnvio>
        </form>

        <div className="clr-auth-divider">o</div>
        <GoogleButton next={next} />

        <p className="clr-auth-foot">
          ¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`}>Ingresar</Link>
        </p>
      </AuthCard>
    </div>
  );
}

// Solo datos públicos. El formulario se entrega mientras Suspense resuelve esto.
const destacadosRegistro = unstable_cache(destacadosPortada, ["registro-destacados-v1"], {
  revalidate: 21600,
});

async function TerritorioRegistro() {
  const destacados = await destacadosRegistro().catch((error) => {
    console.error("[registro] destacados no disponibles:", error);
    return null;
  });
  return (
    <RegistroPreview
      destacados={destacados}
      mapa={
        <>
          <style dangerouslySetInnerHTML={{ __html: ESTILOS_MAPA }} />
          <ColombiaChoropleth filas={[]} seleccion={procesosDe(destacados)} />
        </>
      }
    />
  );
}
