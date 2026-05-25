"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";
import ProfileDetector from "./ProfileDetector";
import { S } from "./styles";
import { EmptyState, Bubble, PhaseResume } from "./HydroAgentParts";

// Chips that bypass LLM and show a scripted response + form
const SCRIPTED_CHIPS = {
  "Necesito construir un sistema séptico para mi casa": "build_system",
  "I need to build a septic system for my house": "build_system",
  // Owner profile option — installation path connects directly to the calculator
  "Voy a instalar un sistema nuevo en terreno sin alcantarillado": "build_system",
  "I'm installing a new system on land without a sewer connection": "build_system",
};

// Scripted welcome message injected immediately when a profile is selected (no API call).
// Sets the advisory tone before the user types their first message.
const PROFILE_WELCOMES = {
  owner: {
    es: "Hola, soy tu asesor de ingeniería sanitaria en HydroStack.\n\n¿Cuál de estas describe mejor tu situación?",
    en: "Hi, I'm your sanitary engineering advisor at HydroStack.\n\nWhich of these best describes your situation?",
  },
  professional: {
    es: "Listo. Dime los datos del proyecto y empezamos el dimensionamiento.\n\n¿Cuántos habitantes equivalentes tiene el sistema, bajo qué norma diseñamos y en qué municipio o región se ubica la obra?",
    en: "Ready. Give me the project data and let's start sizing.\n\nHow many equivalent inhabitants, which design standard, and where is the project located?",
  },
  contractor: {
    es: "Hola. ¿Qué diseño necesitas verificar o qué duda técnica tienes?\n\nDame las dimensiones del tanque, el tipo de campo de infiltración y la norma aplicable.",
    en: "Hi. What design do you need to verify, or what technical question do you have?\n\nGive me the tank dimensions, drainage field type, and applicable standard.",
  },
  exploring: {
    es: "Bienvenido a HydroStack. Te puedo ayudar a entender cómo funcionan los sistemas de tratamiento individual, dimensionar un sistema o explorar alternativas.\n\n¿Qué te trae por aquí?",
    en: "Welcome to HydroStack. I can help you understand how individual treatment systems work, size a system, or explore alternatives.\n\nWhat brings you here?",
  },
};

// Clickable option chips shown with the owner welcome message.
const OWNER_OPTIONS = {
  es: [
    "Voy a instalar un sistema nuevo en terreno sin alcantarillado",
    "Mi sistema actual está fallando (olores, aguas en superficie, atascos)",
    "Quiero hacer mantenimiento preventivo a un sistema existente",
    "Tengo una propiedad que estuvo cerrada o abandonada",
  ],
  en: [
    "I'm installing a new system on land without a sewer connection",
    "My current system is failing (odors, surface water, backups)",
    "I want preventive maintenance on an existing system",
    "I have a property that's been closed or abandoned",
  ],
};

const SCRIPTED_RESPONSES = {
  build_system: {
    es: "Entendido. Para dimensionar tu sistema de tratamiento necesito tres datos: cuántas personas lo van a usar, dónde está ubicado el terreno y qué tipo de suelo tiene. Con eso calculo el volumen del tanque séptico y el campo de infiltración según la norma de tu país.",
    en: "Got it. To size your treatment system I need three things: how many people will use it, where the land is located, and the soil type. With that I'll calculate the septic tank volume and drainage field according to your country's standard.",
  },
};
import {
  getProfile,
  setProfile,
  clearProfile,
  getOwnerState,
  saveOwnerState,
  clearOwnerState,
  updateOwnerStateFromResponse,
  getFormState,
} from "@/src/lib/state/clientStore";
import { calculateSepticSystem } from "@/src/lib/septic/calculator";

/**
 * HydroAgent — centerpiece chat surface.
 *
 * Props:
 *   variant: "landing" | "page"
 *     "landing" — full-viewport hero on the home page, with welcome + chips
 *     "page"    — used inside /chat, no extra outer chrome
 *   showOpenFull?: boolean — show a "Open full chat" link (only useful on landing)
 */
export default function HydroAgent({ variant = "page", showOpenFull = false }) {
  const { t, lang } = useLang();
  const a = t.agent;

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [errored, setErrored]     = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [ownerState, setOwnerState] = useState(null);
  const [showPhaseResume, setShowPhaseResume] = useState(false);

  const scrollRef = useRef(null);
  const inputRef  = useRef(null);
  const abortRef  = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Load profile and ownerstate from localStorage on mount
  useEffect(() => {
    const storedProfile = getProfile();
    if (storedProfile) setUserProfile(storedProfile);

    if (storedProfile === "owner") {
      const state = getOwnerState();
      if (state) {
        setOwnerState(state);
        // Show resume of previous phase on first render
        setShowPhaseResume(true);
      }
    }
  }, []);

  // Focus the input on mount (desktop). Avoids opening mobile keyboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userProfile) return; // Only focus after profile is selected
    if (window.matchMedia && window.matchMedia("(min-width: 1024px)").matches) {
      inputRef.current?.focus();
    }
  }, [userProfile]);

  function handleProfileSelect(profileId) {
    setUserProfile(profileId);
    setProfile(profileId);

    // Inject a scripted opening message from the "engineer" immediately,
    // so the user enters a live consultation rather than a blank chat.
    const welcome = PROFILE_WELCOMES[profileId];
    if (welcome) {
      const text = welcome[lang] ?? welcome.es;
      const initialMsg = { role: "assistant", content: text };

      // Owner profile: attach clickable options so the user never has to type
      // their situation — one click advances the consultation.
      if (profileId === "owner") {
        const opts = OWNER_OPTIONS[lang] ?? OWNER_OPTIONS.es;
        initialMsg.suggestions = opts.map((opt) => ({ text: opt }));
      }

      setMessages([initialMsg]);
    }

    inputRef.current?.focus();
  }

  const send = useCallback(async (textOverride, apiOptions = {}) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    // Scripted chip — respond immediately without calling the LLM
    if (SCRIPTED_CHIPS[text] && !apiOptions.flowMode) {
      const flowType = SCRIPTED_CHIPS[text];
      const scriptedText = SCRIPTED_RESPONSES[flowType][lang] ?? SCRIPTED_RESPONSES[flowType].en;
      setMessages(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: scriptedText, flow: flowType },
      ]);
      setInput("");
      return;
    }

    const userMsg = { role: "user", content: text };
    // If coming from a flow, clear flow cards before appending the new message
    const base = apiOptions.flowMode
      ? messages.map(m => m.flow ? { ...m, flow: null } : m)
      : messages;
    const next = [...base, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setErrored(false);

    // Placeholder assistant bubble
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const formState = getFormState() ?? undefined;
      const currentOwnerState = ownerState;
      let geoData = null;
      try { const raw = localStorage.getItem("hs_geo_data"); if (raw) geoData = JSON.parse(raw); } catch {}

      const res = await fetch("/api/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: next, formState, geoData, userProfile, ownerState: currentOwnerState, ...apiOptions }),
        signal:  abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const raw = part.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const evt = JSON.parse(raw);
            if (evt.type === "error") {
              setErrored(true);
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: evt.error || a.error,
                };
                return copy;
              });
            } else if (
              evt.type === "content_block_delta" &&
              evt.delta?.type === "text_delta"
            ) {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + evt.delta.text };
                }
                return copy;
              });
            } else if (evt.type === "catalog_suggestions") {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, suggestions: evt.suggestions };
                }
                return copy;
              });
            } else if (evt.type === "tool_result") {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  const tools = [...(last.tools || []), {
                    tool:   evt.tool,
                    args:   evt.args,
                    result: evt.result,
                  }];
                  copy[copy.length - 1] = { ...last, tools };
                }
                return copy;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setErrored(true);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: a.error };
          return copy;
        });
      }
    } finally {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.streaming) {
          copy[copy.length - 1] = { ...last, streaming: false };
          // Update ownerState based on agent response (for owner profile)
          if (userProfile === "owner" && last?.content) {
            const updated = updateOwnerStateFromResponse(ownerState || {}, last.content);
            setOwnerState(updated);
            saveOwnerState(updated);
          }
        }
        return copy;
      });
      setLoading(false);
    }
  }, [input, loading, messages, a.error]);

  const handleFlowSubmit = useCallback((flowType, data) => {
    if (flowType === "build_system") {
      const { personas, personasLabel, tipoUso, ubicacion, suelo, norm } = data;

      const soilLabel = {
        es: { high: "arena", medium: "franco", low: "arcilla", unknown: "desconocido" },
        en: { high: "sand",  medium: "loam",   low: "clay",    unknown: "unknown" },
      }[lang]?.[suelo] ?? suelo;

      const useTypeLabel = {
        es: { vivienda: "vivienda familiar", hospedaje: "alquiler de habitaciones", hotel: "hotel o pensión", vacacional: "centro vacacional", restaurante: "restaurante", oficinas: "oficinas/comercial", institucional: "colegio/institución", otro: "otro uso" },
        en: { vivienda: "family home", hospedaje: "room rental / lodging", hotel: "hotel or guesthouse", vacacional: "vacation resort", restaurante: "restaurant", oficinas: "office / commercial", institucional: "school / institution", otro: "other use" },
      }[lang]?.[tipoUso] ?? tipoUso;

      const displayPersonas = personasLabel ?? personas;
      const userMsg = lang === "es"
        ? `${displayPersonas} personas, uso: ${useTypeLabel}, ubicación: ${ubicacion}, suelo: ${soilLabel}`
        : `${displayPersonas} people, use: ${useTypeLabel}, location: ${ubicacion}, soil: ${soilLabel}`;

      // ── Deterministic calculation — 0 LLM tokens ──────────────────────────
      const results = calculateSepticSystem({ personas, tipoUso, norm, suelo });
      results.ubicacion = ubicacion; // attach for display

      const base = messages.map(m => m.flow ? { ...m, flow: null } : m);
      setMessages([
        ...base,
        { role: "user",      content: userMsg },
        { role: "assistant", content: "", results },
      ]);
      setInput("");
    }
  }, [lang, messages]);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    if (loading) abortRef.current?.abort();
    setMessages([]);
    setErrored(false);
    setShowPhaseResume(false);
    // Reset profile so the user goes through profile selection again
    // and gets the proper engineering welcome for their role.
    setUserProfile(null);
    clearProfile();
    clearOwnerState();
    setOwnerState(null);
    inputRef.current?.focus();
  }

  const hasMessages = messages.length > 0;
  const isLanding   = variant === "landing";
  const profileOpts = a.profileOptions || [];

  return (
    <section
      style={isLanding ? S.surfaceLanding : S.surfacePage}
      aria-label={a.ariaChat}
    >
      {/* Header bar */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <span style={S.headerDot} className="blink" aria-hidden="true" />
          <span style={S.headerTitle}>{a.title}</span>
          <span style={S.headerSub} className="hide-mobile">{a.subtitle}</span>
          <div style={S.headerActions}>
            {hasMessages && (
              <button
                type="button"
                onClick={clearChat}
                style={S.smallBtn}
                className="btn-ghost"
                aria-label={a.newChat}
              >
                ⟲ {a.newChat}
              </button>
            )}
            {showOpenFull && !hasMessages && (
              <Link
                href="/chat"
                style={S.smallBtn}
                className="btn-ghost hide-mobile"
              >
                {a.openFull} →
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={S.msgArea}
        role="log"
        aria-live="polite"
        aria-label={a.ariaMessages}
      >
        <div style={S.msgInner}>
          {!hasMessages && !userProfile && (
            <ProfileDetector
              profileOptions={profileOpts}
              onSelect={handleProfileSelect}
              isLanding={isLanding}
            />
          )}

          {!hasMessages && userProfile && ownerState && showPhaseResume && (
            <PhaseResume
              ownerState={ownerState}
              onContinue={() => setShowPhaseResume(false)}
              onReset={() => {
                clearOwnerState();
                setOwnerState(null);
                setShowPhaseResume(false);
              }}
            />
          )}

          {!hasMessages && userProfile && (!ownerState || !showPhaseResume) && (
            <EmptyState
              welcome={a.welcome}
              suggestionsLabel={a.suggestionsLabel}
              suggestions={a.suggestions}
              onPick={(p) => send(p)}
              isLanding={isLanding}
            />
          )}

          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              labelUser={a.labelUser}
              labelAssistant={a.labelAssistant}
              streaming={m.streaming}
              content={m.content}
              tools={m.tools}
              suggestions={m.suggestions}
              onSuggestionPick={send}
              flow={m.flow}
              onFlowSubmit={handleFlowSubmit}
              results={m.results}
              lang={lang}
              errored={errored && i === messages.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form
        style={S.inputArea}
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <div style={S.inputInner}>
          <span style={S.prompt} aria-hidden="true">{">"}</span>
          <textarea
            ref={inputRef}
            style={S.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={a.placeholder}
            rows={1}
            disabled={loading}
            aria-label={a.ariaInput}
          />
          {loading ? (
            <button
              type="button"
              style={{ ...S.btn, ...S.btnStop }}
              onClick={stop}
            >
              ■ {a.stop}
            </button>
          ) : (
            <button
              type="submit"
              style={{ ...S.btn, ...(input.trim() ? S.btnActive : S.btnDisabled) }}
              disabled={!input.trim()}
            >
              {a.send} →
            </button>
          )}
        </div>
        <div style={S.hint}>{a.hint}</div>
      </form>
    </section>
  );
}
