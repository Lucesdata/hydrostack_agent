"use client";

import { useEffect, useState } from "react";
import Stepper from "./Stepper";
import ReportStep from "./ReportStep";
import GeoPanel from "@/src/components/geo/GeoPanel";
import SepticTankCalculator from "@/src/components/SepticTankCalculator";
import MaintenanceCalculator from "@/src/components/MaintenanceCalculator";
import {
  getBuildProgress,
  getLastReport,
} from "@/src/lib/state/clientStore";
import { useLang } from "@/src/lib/i18n";

const STEP_KEYS = ["geo", "septic", "maintenance", "report"];

function firstIncompleteStep(progress) {
  if (!progress.geo) return 1;
  if (!progress.septic) return 2;
  if (!progress.maintenance) return 3;
  return 4;
}

export default function BuildFlow() {
  const { lang } = useLang();
  const isEs = lang === "es";

  const [progress, setProgress] = useState({
    geo: false,
    septic: false,
    maintenance: false,
    allReady: false,
  });
  const [lastReport, setLastReport] = useState(null);
  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount + listen to storage events from the
  // embedded calculators so progress updates without manual refresh.
  useEffect(() => {
    const refresh = () => {
      setProgress(getBuildProgress());
      setLastReport(getLastReport());
    };
    refresh();
    setStep(firstIncompleteStep(getBuildProgress()));
    setHydrated(true);

    window.addEventListener("storage", refresh);
    // Poll lightly: the embedded calculators write to localStorage from the
    // same tab, which doesn't fire `storage` events. 1s is unobtrusive.
    const id = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  const canGoNext = (() => {
    if (step === 1) return progress.geo;
    if (step === 2) return progress.septic;
    if (step === 3) return true; // maintenance is optional
    return false; // step 4 is terminal
  })();

  const handlePrev = () => setStep((s) => Math.max(1, s - 1));
  const handleNext = () => setStep((s) => Math.min(4, s + 1));

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <header style={S.header}>
          <div style={S.tag}>{isEs ? "flujo guiado" : "guided flow"}</div>
          <h1 style={S.h1}>
            {isEs ? "Construye tu sistema séptico" : "Build your septic system"}
          </h1>
          <p style={S.sub}>
            {isEs
              ? "Cuatro pasos: ubicación, fosa séptica, mantenimiento e informe técnico."
              : "Four steps: location, septic tank, maintenance, and the technical report."}
          </p>
        </header>

        <div style={S.layout}>
          <Stepper
            current={step}
            progress={progress}
            lastReport={lastReport}
            onJump={(n) => setStep(n)}
            lang={lang}
          />

          <main style={S.main}>
            {hydrated && (
              <div style={S.stepHost}>
                {step === 1 && <GeoPanel />}
                {step === 2 && <SepticTankCalculator />}
                {step === 3 && <MaintenanceCalculator />}
                {step === 4 && (
                  <ReportStep
                    progress={progress}
                    lang={lang}
                    onReportGenerated={(data) =>
                      setLastReport({
                        url: data.download_url,
                        reportId: data.report_id,
                        generatedAt: new Date().toISOString(),
                      })
                    }
                  />
                )}
              </div>
            )}

            <div style={S.navBar}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={step === 1}
                style={S.navBtn(step !== 1)}
              >
                ← {isEs ? "Anterior" : "Previous"}
              </button>

              <div style={S.navHint}>
                {isEs ? "Paso" : "Step"} {step} / 4
              </div>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  style={S.navBtnPrimary(canGoNext)}
                  title={
                    !canGoNext && step === 1
                      ? isEs
                        ? "Guarda los datos de ubicación primero"
                        : "Save location data first"
                      : !canGoNext && step === 2
                      ? isEs
                        ? "Pulsa Calcular en la fosa séptica para guardar"
                        : "Click Calculate on the septic tank to save"
                      : undefined
                  }
                >
                  {isEs ? "Siguiente" : "Next"} →
                </button>
              ) : (
                <div style={{ width: "100px" }} />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "calc(100vh - 52px)",
    background: "linear-gradient(135deg,#0a1628 0%,#0d2137 60%,#0a1f35 100%)",
    padding: "28px clamp(16px, 4vw, 32px) 80px",
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "28px",
  },
  tag: {
    fontSize: "9px",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#4a7fa5",
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "8px",
  },
  h1: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "clamp(24px, 3vw, 30px)",
    fontWeight: 700,
    color: "#e2f0f7",
    margin: "0 0 8px 0",
  },
  sub: {
    fontSize: "13px",
    color: "#7ab8c8",
    margin: 0,
  },
  layout: {
    display: "flex",
    gap: "28px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  main: {
    flex: "1 1 600px",
    minWidth: 0,
  },
  stepHost: {
    background: "rgba(4,24,32,0.35)",
    border: "1px solid rgba(0,245,255,0.08)",
    borderRadius: "10px",
    padding: "8px",
    marginBottom: "20px",
    overflow: "hidden",
  },
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
  },
  navBtn: (enabled) => ({
    background: "transparent",
    border: `1px solid ${enabled ? "rgba(0,245,255,0.25)" : "rgba(0,245,255,0.08)"}`,
    color: enabled ? "#7ab8c8" : "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "9px 16px",
    borderRadius: "5px",
    cursor: enabled ? "pointer" : "not-allowed",
  }),
  navBtnPrimary: (enabled) => ({
    background: enabled ? "rgba(0,245,255,0.14)" : "rgba(0,245,255,0.04)",
    border: `1px solid ${enabled ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.08)"}`,
    color: enabled ? "#00F5FF" : "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "9px 18px",
    borderRadius: "5px",
    cursor: enabled ? "pointer" : "not-allowed",
  }),
  navHint: {
    fontSize: "10px",
    color: "#4a7a8a",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
};
