export interface NormParams {
  trhDays: number;
  sludgeRate: number;
  scumFactor: number;
  minVolume: number;
  minDepth: number;
  minWidth: number;
  minLength: number;
  tempLabel: string;
}

export interface NormMetadata {
  key: "ras" | "esp" | "eu" | "epa";
  name: string;
  flag: string;
  ref: string;
  defaultDotacion: number;
}

export const NORMS_METADATA: Record<string, NormMetadata> = {
  ras: {
    key: "ras",
    name: "RAS Colombia",
    flag: "🇨🇴",
    ref: "Título J — RAS 2017",
    defaultDotacion: 120,
  },
  esp: {
    key: "esp",
    name: "España",
    flag: "🇪🇸",
    ref: "NTE-ISD / CTE DB-HS5",
    defaultDotacion: 160,
  },
  eu: {
    key: "eu",
    name: "Europa",
    flag: "🇪🇺",
    ref: "EN 12566-1",
    defaultDotacion: 150,
  },
  epa: {
    key: "epa",
    name: "EE.UU.",
    flag: "🇺🇸",
    ref: "EPA Onsite Wastewater",
    defaultDotacion: 190,
  },
};

export function getParams(normKey: "ras" | "esp" | "eu" | "epa", temp: number): NormParams {
  if (normKey === "ras") {
    if (temp >= 20)
      return {
        trhDays: 1.5,
        sludgeRate: 40,
        scumFactor: 0.3,
        minVolume: 1.0,
        minDepth: 1.2,
        minWidth: 0.6,
        minLength: 1.5,
        tempLabel: "T ≥ 20°C",
      };
    if (temp >= 10)
      return {
        trhDays: 2.0,
        sludgeRate: 50,
        scumFactor: 0.3,
        minVolume: 1.0,
        minDepth: 1.2,
        minWidth: 0.6,
        minLength: 1.5,
        tempLabel: "T 10–19°C",
      };
    return {
      trhDays: 2.5,
      sludgeRate: 60,
      scumFactor: 0.3,
      minVolume: 1.0,
      minDepth: 1.2,
      minWidth: 0.6,
      minLength: 1.5,
      tempLabel: "T < 10°C",
    };
  }

  if (normKey === "esp") {
    if (temp >= 15)
      return {
        trhDays: 1.0,
        sludgeRate: 50,
        scumFactor: 0.25,
        minVolume: 1.5,
        minDepth: 1.0,
        minWidth: 0.75,
        minLength: 1.5,
        tempLabel: "T ≥ 15°C",
      };
    return {
      trhDays: 1.5,
      sludgeRate: 60,
      scumFactor: 0.25,
      minVolume: 1.5,
      minDepth: 1.0,
      minWidth: 0.75,
      minLength: 1.5,
      tempLabel: "T < 15°C",
    };
  }

  if (normKey === "eu") {
    if (temp >= 15)
      return {
        trhDays: 2.0,
        sludgeRate: 55,
        scumFactor: 0.3,
        minVolume: 2.0,
        minDepth: 1.2,
        minWidth: 0.75,
        minLength: 1.5,
        tempLabel: "T ≥ 15°C",
      };
    if (temp >= 5)
      return {
        trhDays: 3.0,
        sludgeRate: 70,
        scumFactor: 0.3,
        minVolume: 2.0,
        minDepth: 1.2,
        minWidth: 0.75,
        minLength: 1.5,
        tempLabel: "T 5–14°C",
      };
    return {
      trhDays: 4.0,
      sludgeRate: 85,
      scumFactor: 0.3,
      minVolume: 2.0,
      minDepth: 1.2,
      minWidth: 0.75,
      minLength: 1.5,
      tempLabel: "T < 5°C",
    };
  }

  // EPA (default)
  if (temp >= 15)
    return {
      trhDays: 1.5,
      sludgeRate: 65,
      scumFactor: 0.25,
      minVolume: 3.785,
      minDepth: 1.0,
      minWidth: 0.9,
      minLength: 1.8,
      tempLabel: "T ≥ 15°C",
    };
  return {
    trhDays: 2.0,
    sludgeRate: 80,
    scumFactor: 0.25,
    minVolume: 3.785,
    minDepth: 1.0,
    minWidth: 0.9,
    minLength: 1.8,
    tempLabel: "T < 15°C",
  };
}

export interface ComputeResult {
  Vl: number;
  Vs: number;
  Vn: number;
  Vtot: number;
  L: number;
  W: number;
  SRT: number;
  minA: boolean;
  trhDays: number;
  chambers: number;
  tempLabel: string;
  Qd?: number;
  Gs?: number;
  Area?: number;
  chkCVO?: boolean;
  chkSRT?: boolean;
  [key: string]: any;
}

export function computeNorm(
  normKey: "ras" | "esp" | "eu" | "epa",
  users: number,
  dotacion: number,
  retCoef: number,
  temp: number,
  cleanYears: number,
  depth: number
): ComputeResult {
  const p = getParams(normKey, temp);
  const Qd = (users * dotacion * retCoef) / 1000;
  const Vl = Qd * p.trhDays;
  const Vs = (users * p.sludgeRate * cleanYears) / 1000;
  const Vn = p.scumFactor * Vl;

  let Vtot = Vl + Vs + Vn;
  const minA = Vtot < p.minVolume;
  if (minA) Vtot = p.minVolume;

  const Area = Vtot / depth;
  const W = Math.sqrt(Area / 2);
  const L = 2 * W;

  const Gs = (users * p.sludgeRate) / 365 / 1000;
  const SRT = Gs > 0 ? Vs / Gs : 0;

  const chambers = users > 50 || Vtot > 10 ? 3 : users > 5 || Vtot > 2 ? 2 : 1;

  return {
    Vl,
    Vs,
    Vn,
    Vtot,
    L,
    W,
    SRT,
    minA,
    trhDays: p.trhDays,
    chambers,
    tempLabel: p.tempLabel,
    Qd,
    Gs,
    Area,
  };
}
