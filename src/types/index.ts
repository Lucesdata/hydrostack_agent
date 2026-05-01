export type { NormParams, NormMetadata, ComputeResult } from "@/lib/norms";

export interface FormState {
  users?: number;
  dotacion?: number;
  retCoef?: number;
  temp?: number;
  depth?: number;
  freeboard?: number;
  cleanYears?: number;
  dboIn?: number;
  ssIn?: number;
  soilType?: string;
  soilPermeability?: "high" | "medium" | "low" | "none" | "unknown";
  normKey?: "ras" | "esp" | "eu" | "epa";
  calculated?: boolean;
}
