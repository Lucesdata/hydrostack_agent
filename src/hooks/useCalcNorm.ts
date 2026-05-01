import { useState, useCallback, useEffect } from "react";
import { computeNorm, type ComputeResult } from "@/lib/norms";
import { validateFormState, type FormState } from "@/lib/validation";

export function useCalcNorm(initialState?: FormState) {
  const [formState, setFormState] = useState<FormState>(initialState ?? {});
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
    setFormState((prev) => {
      const updated = { ...prev, [field]: value };

      // Validar el estado completo
      const validation = validateFormState(updated);
      if (validation.success) {
        setValidationErrors({});
        return updated;
      } else {
        // Si hay error en validación, aún permitir el cambio pero mostrar el error
        if (validation.errors) {
          const errorMap: Record<string, string> = {};
          validation.errors.forEach((err) => {
            const fieldName = err.split(":")[0];
            errorMap[fieldName] = err;
          });
          setValidationErrors(errorMap);
        }
        return updated;
      }
    });
  }, []);

  return {
    formState,
    result,
    updateField,
    validationErrors,
    setFormState,
  };
}
