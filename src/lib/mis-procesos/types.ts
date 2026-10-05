export interface CuentaProcesos {
  usuarioId: string;
}
export interface ProcesoPersonal {
  procesoId: string;
  objeto: string | null;
  entidad: string | null;
  referencia: string | null;
  estadoApertura: string | null;
  valorEstimado: string | null;
  disponible: boolean;
  guardado: boolean;
  fecha: string;
}
export interface ListasProcesos {
  guardados: ProcesoPersonal[];
  recientes: ProcesoPersonal[];
  pagina: number;
  totalGuardados: number;
}
