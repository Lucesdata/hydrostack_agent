/**
 * Host sobre el que se construyen todos los enlaces que salen de la app: el
 * `redirectTo` de OAuth, el `emailRedirectTo` del alta y los enlaces de los
 * correos y reportes.
 *
 * Vivía duplicada literalmente en cuatro módulos, y ninguna de las cuatro
 * copias contemplaba los despliegues de preview: al no existir ahí
 * `NEXT_PUBLIC_APP_URL`, caían a `localhost:3000` y el login de un preview
 * mandaba al usuario a su propia máquina.
 *
 * Se usa `VERCEL_BRANCH_URL` y no `VERCEL_URL` porque la primera es estable
 * por rama (`aqualicita-git-<rama>-…`) mientras la segunda cambia en cada
 * despliegue: con la estable basta un patrón en la allow list de Supabase y
 * la URL no caduca entre redeploys.
 *
 * Ojo: `VERCEL_BRANCH_URL` es una variable de sistema, así que el proyecto
 * necesita activo *Automatically expose System Environment Variables*.
 */
export function appUrl(): string {
  const explicita = process.env.NEXT_PUBLIC_APP_URL;
  if (explicita) return explicita;

  const rama = process.env.VERCEL_BRANCH_URL;
  if (rama) return `https://${rama}`;

  return "http://localhost:3000";
}
