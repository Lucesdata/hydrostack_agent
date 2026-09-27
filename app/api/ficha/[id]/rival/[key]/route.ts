/**
 * GET /api/ficha/[id]/rival/[key] — el historial de un rival en procesos
 * comparables al de la ficha (`historialComparable`, §7 de la ficha).
 *
 * `id` es el id de SECOP del proceso de la ficha (`CO1.REQ.…`); de él salen el
 * tipo y el departamento que definen "comparable". `key` es la `proveedor_key`
 * del rival (`nit:<nit>` o `nom:<nombre>`).
 *
 * Exige la capacidad `competidores` (cuenta gratuita), la misma frontera que
 * tenía /competidores/[key]: la ficha enseña a cualquiera quién suele competir
 * y cuánto gana, el historial detallado pide cuenta. Por eso la respuesta es
 * `private`: la caché del CDN la serviría a quien no tiene sesión.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { procesoPorSlug } from "@/src/lib/secop/ficha";
import { idDesdeSlug } from "@/src/lib/secop/slug";
import { historialComparable } from "@/src/lib/al/consulta/competidor";

export const runtime = "nodejs";

const SIN_CACHE = { "Cache-Control": "no-store" };

/** `nit:<dígitos>` o `nom:<texto>`, como las escribe el histórico. */
const esProveedorKey = (k: string) => /^nit:\d{3,15}$/.test(k) || /^nom:.{1,200}$/.test(k);

export async function GET(_req: Request, { params }: { params: { id: string; key: string } }) {
  const id = idDesdeSlug(params.id);
  const key = decodeURIComponent(params.key);
  if (!id || !esProveedorKey(key)) {
    return NextResponse.json(
      { error: "Parámetros no válidos" },
      { status: 400, headers: SIN_CACHE }
    );
  }

  const user = await getSessionUser();
  if (!puede(nivelDe(user, null), "competidores")) {
    return NextResponse.json({ error: "Requiere cuenta" }, { status: 401, headers: SIN_CACHE });
  }

  try {
    const p = await procesoPorSlug(id);
    if (!p || !p.tipoProyecto || !p.departamentoCodigo) {
      return NextResponse.json({ error: "Sin comparables" }, { status: 404, headers: SIN_CACHE });
    }
    const historial = await historialComparable(key, {
      id: p.id,
      tipoProyecto: p.tipoProyecto,
      departamentoCodigo: p.departamentoCodigo,
    });
    if (!historial) {
      return NextResponse.json({ error: "Sin historial" }, { status: 404, headers: SIN_CACHE });
    }
    return NextResponse.json(historial, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (error) {
    console.error("[api/ficha/rival]", error);
    return NextResponse.json(
      { error: "Historial no disponible" },
      { status: 503, headers: SIN_CACHE }
    );
  }
}
