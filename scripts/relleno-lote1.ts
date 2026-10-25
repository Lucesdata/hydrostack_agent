/**
 * Relleno del Lote 1 por identificador (spec 2026-10-24-lote1-datos-columnas, D-T3).
 *
 *   npx tsx scripts/relleno-lote1.ts                          # SECO: cuenta y muestra, no escribe
 *   npx tsx scripts/relleno-lote1.ts --max-ids 400            # prueba pequeña
 *   npx tsx scripts/relleno-lote1.ts --aplicar                # escribe (procesos y contratos)
 *   npx tsx scripts/relleno-lote1.ts --fuente contratos --aplicar
 *
 * Opciones: --fuente procesos|contratos|ambas · --aplicar · --max-ids N ·
 *           --limite-mb N (420) · --pausa-ms N (1000) · --ignorar-ventana · --json
 *
 * Seguridad (nada de esto se salta sin pedirlo):
 *   · Seco por defecto. Escribir exige `--aplicar`.
 *   · Antes de escribir comprueba que la migración 0026 esté aplicada (si no, se detiene).
 *   · No escribe entre las 11:00 y las 12:30 UTC (ventana del `tick`, que comparte CPU
 *     con la base); `--ignorar-ventana` lo permite.
 *   · Aborta si la base pasa de `--limite-mb`.
 *   · Idempotente: repetirlo no cambia el resultado; solo rellena, nunca borra.
 *
 * Orden sugerido para el propietario: seco → `--max-ids 400 --aplicar` → comprobar con
 * `scripts/sql/medir-espacio-ingesta.sql` y la consulta de cobertura → completo.
 */
import "./_env";
import { sql } from "drizzle-orm";
import { db, pool } from "@/src/lib/db/client";
import { sodaFetchPage } from "@/src/lib/ingest/sodaFetch";
import { resolveDatasetId } from "@/src/lib/secop/datasetResolver";
import {
  aplicarContratos,
  aplicarProcesos,
  crearFetchFilas,
  enVentanaDelTick,
  idsDelUniverso,
  rellenarLote1,
  tamanoBaseMb,
  type FuenteRelleno,
  type InformeRelleno,
} from "@/src/lib/ingest/relleno-lote1";

interface Opciones {
  fuentes: FuenteRelleno[];
  aplicar: boolean;
  maxIds?: number;
  limiteMb?: number;
  pausaMs?: number;
  ignorarVentana: boolean;
  json: boolean;
}

function leerArgs(argv: string[]): Opciones {
  const o: Opciones = {
    fuentes: ["procesos", "contratos"],
    aplicar: false,
    ignorarVentana: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const siguiente = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Falta valor para ${a}`);
      return v;
    };
    const entero = () => {
      const n = Number(siguiente());
      if (!Number.isInteger(n) || n < 0) throw new Error(`${a} debe ser un entero ≥ 0`);
      return n;
    };
    switch (a) {
      case "--fuente": {
        const v = siguiente();
        if (v === "ambas") o.fuentes = ["procesos", "contratos"];
        else if (v === "procesos" || v === "contratos") o.fuentes = [v];
        else throw new Error(`--fuente debe ser procesos|contratos|ambas, recibió ${v}`);
        break;
      }
      case "--aplicar":
        o.aplicar = true;
        break;
      case "--max-ids":
        o.maxIds = entero();
        break;
      case "--limite-mb":
        o.limiteMb = entero();
        break;
      case "--pausa-ms":
        o.pausaMs = entero();
        break;
      case "--ignorar-ventana":
        o.ignorarVentana = true;
        break;
      case "--json":
        o.json = true;
        break;
      default:
        throw new Error(`Opción desconocida: ${a}`);
    }
  }
  return o;
}

const COLUMNAS = [
  ["proceso", ["duracion_valor", "duracion_unidad"]],
  [
    "contrato",
    ["origen_recursos", "destino_gasto", "fuentes_recursos", "dias_adicionados", "liquidado"],
  ],
] as const;

/** La migración 0026 tiene que estar aplicada antes de escribir. */
async function faltanColumnas(): Promise<string[]> {
  const res = await db.execute(sql`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and table_name in ('proceso', 'contrato')`);
  const hay = new Set(
    (res.rows as { table_name: string; column_name: string }[]).map(
      (r) => `${r.table_name}.${r.column_name}`
    )
  );
  return COLUMNAS.flatMap(([t, cols]) =>
    cols.filter((c) => !hay.has(`${t}.${c}`)).map((c) => `${t}.${c}`)
  );
}

function hostDeLaBase(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    return "(DATABASE_URL no definido o inválido)";
  }
}

function imprimir(i: InformeRelleno): void {
  const poblados = Object.entries(i.poblados)
    .map(([k, n]) => `${k}=${n}`)
    .join(" ");
  console.log(
    `${i.fuente}: pedidos ${i.pedidos} · encontrados ${i.encontrados} · sin fila en la fuente ${i.sinFila} · ` +
      `con dato [${poblados || "ninguno"}] · ${i.aplicar ? `filas actualizadas ${i.aplicados}` : "SECO (nada escrito)"}` +
      (i.abortado ? " · ABORTADO por tamaño de la base" : "")
  );
}

async function main() {
  const o = leerArgs(process.argv.slice(2));

  if (o.aplicar && enVentanaDelTick(new Date()) && !o.ignorarVentana) {
    throw new Error(
      "Dentro de la ventana del tick (11:00–12:30 UTC): no se escribe ahora. Vuelve a intentarlo " +
        "fuera de ella o usa --ignorar-ventana."
    );
  }
  if (o.aplicar) {
    const faltan = await faltanColumnas();
    if (faltan.length > 0) {
      throw new Error(
        `Falta aplicar la migración del Lote 1 (0026). Columnas ausentes: ${faltan.join(", ")}`
      );
    }
  }

  console.log(
    `Base: ${hostDeLaBase()} · modo: ${o.aplicar ? "ESCRIBE" : "seco"} · fuentes: ${o.fuentes.join(", ")}`
  );
  const dataset = (f: FuenteRelleno) =>
    resolveDatasetId(f === "procesos" ? "procesos" : "contratos");
  const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const deps = {
    ids: (f: FuenteRelleno) => idsDelUniverso(db, f),
    fetchFilas: crearFetchFilas({ dataset, soda: sodaFetchPage, esperar: espera }),
    aplicarProcesos: (filas: Parameters<typeof aplicarProcesos>[1]) => aplicarProcesos(db, filas),
    aplicarContratos: (filas: Parameters<typeof aplicarContratos>[1]) =>
      aplicarContratos(db, filas),
    tamanoMb: () => tamanoBaseMb(db),
    vacuum: async (tabla: "proceso" | "contrato") => {
      await db.execute(sql.raw(`vacuum ${tabla}`));
    },
    pausa: espera,
  };

  const informes: InformeRelleno[] = [];
  for (const fuente of o.fuentes) {
    const informe = await rellenarLote1(fuente, deps, {
      aplicar: o.aplicar,
      maxIds: o.maxIds,
      limiteMb: o.limiteMb,
      pausaMs: o.pausaMs,
    });
    informes.push(informe);
    if (!o.json) imprimir(informe);
    if (informe.abortado) {
      process.exitCode = 1;
      break;
    }
  }
  if (o.json) console.log(JSON.stringify(informes, null, 2));
  if (!o.aplicar) console.log("Seco: no se escribió nada. Para escribir, repite con --aplicar.");
}

main()
  .catch((err) => {
    process.stderr.write(
      `\nrelleno fallido: ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
