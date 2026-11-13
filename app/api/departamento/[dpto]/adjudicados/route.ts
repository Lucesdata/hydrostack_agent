import { NextResponse } from "next/server";
import { porcentajePagado } from "@/src/lib/secop/avance-adjudicado";
import { etapaDeProceso } from "@/src/lib/secop/etapa";
import { contratosDeProcesos } from "@/src/lib/secop/ficha";
import { montoConDato } from "@/src/lib/secop/monto";
import { principalesAdjudicaciones } from "@/src/lib/secop/radar-institucional";
import { esCodigoDepartamento } from "@/src/lib/secop/resumen-departamento";
import { slugDeProceso } from "@/src/lib/secop/slug";

export interface ProyectoAdjudicado {
  id: string;
  referencia: string | null;
  objeto: string | null;
  entidad: string | null;
  valor: number;
  ficha: string;
  secop: string | null;
  fechaAdjudicacion: string | null;
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  valorContrato: number | null;
  valorPagado: number | null;
  etapa: string;
  estadoContrato: string | null;
  porcentajePagado: number | null;
}

export async function GET(_req: Request, { params }: { params: { dpto: string } }) {
  if (!esCodigoDepartamento(params.dpto)) {
    return NextResponse.json({ error: "Código de departamento no válido" }, { status: 400 });
  }
  try {
    const filas = await principalesAdjudicaciones(10, params.dpto);
    const porProceso = await contratosDeProcesos(filas.map((p) => p.id));
    const proyectos: ProyectoAdjudicado[] = filas.map((p) => {
      const contratos = porProceso.get(p.id) ?? [];
      const etapa = etapaDeProceso({
        estadoActual: "Seleccionado",
        estadoApertura: null,
        fechaPublicacion: p.fechaPublicacion,
        fechaRecepcion: null,
        valorEstimado: p.presupuesto,
        adjudicado: p.adjudicado,
        adjudicatario: p.adjudicatario,
        fechaAdjudicacion: p.fecha,
        contratos,
      });
      const principal = contratos.find((contrato) => contrato === etapa.contrato);
      const cifrasComparables =
        principal && !etapa.contradicciones.some(({ codigo }) => codigo === "C4");
      const valorContrato = cifrasComparables
        ? (montoConDato(principal.valorActual) ?? montoConDato(principal.valorInicial))
        : null;
      const valorPagado = cifrasComparables ? montoConDato(principal.valorPagado) : null;
      return {
        id: p.secopId,
        referencia: p.referencia,
        objeto: p.objeto,
        entidad: p.entidadNombre,
        valor: p.valor,
        ficha: `/licitaciones/${slugDeProceso(p.objeto, p.secopId)}`,
        etapa: etapa.nombre,
        estadoContrato: principal?.estado ?? null,
        secop: p.url,
        fechaAdjudicacion: p.fecha,
        fechaFirma: principal?.fechaFirma ?? null,
        fechaInicio: principal?.fechaInicio ?? null,
        fechaFin: principal?.fechaFinActual ?? principal?.fechaFinInicial ?? null,
        valorContrato,
        valorPagado,
        porcentajePagado: porcentajePagado(valorPagado, valorContrato),
      };
    });
    return NextResponse.json(
      { proyectos },
      { headers: { "Cache-Control": "public, s-maxage=900" } }
    );
  } catch (error) {
    console.error("[api/departamento/adjudicados]", error);
    return NextResponse.json(
      { error: "Proyectos adjudicados no disponibles" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
