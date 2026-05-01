import { renderHook, act } from "@testing-library/react";
import { useCalcNorm } from "@/hooks/useCalcNorm";

describe("useCalcNorm hook", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useCalcNorm());

    expect(result.current.formState).toEqual({});
    expect(result.current.result).toBeNull();
  });

  it("should calculate when all required fields are present", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.Vtot).toBeGreaterThan(0);
    expect(result.current.result?.chkSRT).toBeDefined();
    expect(result.current.result?.chkCVO).toBeDefined();
  });

  it("should clear result when required field is missing", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.updateField("users", undefined as any);
    });

    expect(result.current.result).toBeNull();
  });

  it("should allow updating individual fields", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    const resultBefore = result.current.result?.Vtot;

    act(() => {
      result.current.updateField("users", 10);
    });

    const resultAfter = result.current.result?.Vtot;

    expect(resultAfter).toBeGreaterThan(resultBefore!);
  });

  it("should apply default optional values", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    expect(result.current.result?.Qd).toBeDefined();
    expect(result.current.result?.Qd).toBeCloseTo((5 * 120 * 0.75) / 1000, 2);
  });

  it("should work with custom optional parameters", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("retCoef", 0.5);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    expect(result.current.result?.Qd).toBeCloseTo((5 * 120 * 0.5) / 1000, 2);
  });

  it("should calculate CVO validation", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    const cvo = result.current.result?.CVO;
    const chkCVO = result.current.result?.chkCVO;

    expect(cvo).toBeDefined();
    expect(chkCVO).toBe(cvo! <= 0.3);
  });

  it("should calculate SRT validation", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    const srt = result.current.result?.SRT;
    const chkSRT = result.current.result?.chkSRT;

    expect(srt).toBeDefined();
    expect(chkSRT).toBe(srt! >= 20);
  });

  it("should handle different normatives", () => {
    const { result } = renderHook(() => useCalcNorm());

    const norms = ["ras", "esp", "eu", "epa"] as const;

    norms.forEach((norm) => {
      act(() => {
        result.current.updateField("normKey", norm);
        result.current.updateField("users", 5);
        result.current.updateField("dotacion", 120);
        result.current.updateField("temp", 20);
        result.current.updateField("depth", 1.5);
        result.current.updateField("cleanYears", 3);
      });

      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.chambers).toBeGreaterThan(0);
    });
  });

  it("should handle changes to normatives and recalculate", () => {
    const { result } = renderHook(() => useCalcNorm());

    act(() => {
      result.current.updateField("normKey", "ras");
      result.current.updateField("users", 5);
      result.current.updateField("dotacion", 120);
      result.current.updateField("temp", 20);
      result.current.updateField("depth", 1.5);
      result.current.updateField("cleanYears", 3);
    });

    const rasResult = result.current.result?.Vtot;

    act(() => {
      result.current.updateField("normKey", "epa");
    });

    const epaResult = result.current.result?.Vtot;
    expect(epaResult).not.toBe(rasResult);
  });
});
