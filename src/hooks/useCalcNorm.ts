import { useState, useCallback, useEffect } from "react";
import { computeNorm, type ComputeResult } from "@/lib/norms";
import type { FormState } from "@/types";

export function useCalcNorm(initialState?: FormState) {
  const [formState, setFormState] = useState<FormState>(initialState ?? {});
  const [result, setResult] = useState<ComputeResult | null>(null);

  // Cargar desde localStorage en mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hydrostack_formstate");
      if (stored) {
        const parsed = JSON.parse(stored);
        setFormState(parsed);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("hydrostack_formstate", JSON.stringify(formState));
  }, [formState]);

  // Recalcular cuando cambien inputs críticos
  useEffect(() => {
    if (
      !formState.users ||
      !formState.dotacion ||
      !formState.temp ||
      !formState.depth ||
      !formState.cleanYears ||
      !formState.normKey
    ) {
      setResult(null);
      return;
    }

    const computed = computeNorm(
      formState.normKey,
      formState.users,
      formState.dotacion,
      formState.retCoef ?? 0.75,
      formState.temp,
      formState.cleanYears,
      formState.depth
    );

    // Add validations
    const CVO =
      computed.Qd && computed.Vtot
        ? (computed.Qd * 1000 * (formState.dboIn ?? 250)) / computed.Vtot
        : 0;
    const chkCVO = CVO <= 0.3;
    const chkSRT = computed.SRT >= 20;

    setResult({
      ...computed,
      chkCVO,
      chkSRT,
      CVO,
    });

    setFormState((prev) => ({ ...prev, calculated: true }));
  }, [
    formState.users,
    formState.dotacion,
    formState.temp,
    formState.depth,
    formState.cleanYears,
    formState.normKey,
    formState.retCoef,
    formState.dboIn,
  ]);

  const updateField = useCallback((field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    formState,
    result,
    updateField,
    setFormState,
  };
}
