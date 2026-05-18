"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { renderMarkdown } from "./markdown";
import ToolResultCard from "./ToolResultCard";
import ProfileDetector from "./ProfileDetector";
import { getOwnerState, saveOwnerState, updateOwnerStateFromResponse } from "@/lib/owner-state";

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
    if (typeof window === "undefined") return;
    const storedProfile = localStorage.getItem("hydrostack_profile");
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
    if (typeof window !== "undefined") {
      localStorage.setItem("hydrostack_profile", profileId);
    }
    inputRef.current?.focus();
  }

  const send = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setErrored(false);

    // Placeholder assistant bubble
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    abortRef.current = new AbortController();

    try {
      let formState = undefined;
      let currentOwnerState = ownerState;
      try {
        const stored = typeof localStorage !== "undefined"
          ? localStorage.getItem("hydrostack_formstate")
          : null;
        if (stored) formState = JSON.parse(stored);
      } catch { /* ignore */ }

      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: next, formState, userProfile, ownerState: currentOwnerState }),
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
                  content: `${a.error}\n\n\`${evt.error}\``,
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
    // Keep ownerstate but reset phase resume
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
                if (typeof window !== "undefined") {
                  localStorage.removeItem("hydrostack_ownerstate");
                }
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

/* ───────────────────────────── Subcomponents ───────────────────────────── */

function EmptyState({ welcome, suggestionsLabel, suggestions, onPick, isLanding }) {
  return (
    <div style={S.empty}>
      <div style={S.emptyBadge} className="fade-up">
        <span style={S.emptyDot} className="blink" aria-hidden="true" />
        <span style={S.emptyBadgeText}>online · llama-3.1-8b</span>
      </div>
      <div style={isLanding ? S.welcomeLanding : S.welcomePage} className="fade-up-1">
        {welcome}
      </div>
      <div style={S.suggestLabel} className="fade-up-2">
        {suggestionsLabel}
      </div>
      <div style={S.chipsWrap} className="fade-up-3">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            style={S.chip}
            className="chip-prompt"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ role, content, tools, streaming, errored, labelUser, labelAssistant }) {
  const isUser = role === "user";
  const hasTools = !isUser && tools && tools.length > 0;
  const showEmptyCursor = streaming && !content && !hasTools;

  return (
    <article
      style={S.bubble(isUser)}
      aria-label={isUser ? labelUser : labelAssistant}
    >
      <div style={{ ...S.bubbleLabel, color: errored ? "#ff6060" : "#2a5070" }}>
        {isUser ? labelUser : labelAssistant}
      </div>

      {hasTools && (
        <div style={{ marginBottom: content ? "10px" : "0" }}>
          {tools.map((tc, idx) => (
            <ToolResultCard key={idx} tool={tc.tool} args={tc.args} result={tc.result} />
          ))}
        </div>
      )}

      <div style={S.bubbleText}>
        {showEmptyCursor
          ? <span style={S.cursor} className="blink">▋</span>
          : isUser
            ? <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
            : (
              <>
                {renderMarkdown(content)}
                {streaming && <span style={S.cursor} className="blink">▋</span>}
              </>
            )
        }
      </div>
    </article>
  );
}

function PhaseResume({ ownerState, onContinue, onReset }) {
  const phaseLabels = {
    initial: "Initial diagnosis",
    explanation: "Explaining how systems work",
    orientation: "Providing next steps",
    detail: "Deep dive details",
  };

  const subscenarioLabels = {
    installation: "Planning a new installation",
    active_failure: "Experiencing an active failure",
    preventive: "Preventive maintenance",
    abandoned: "Reopening an abandoned property",
  };

  const phaseText = ownerState.phase ? phaseLabels[ownerState.phase] : "Starting fresh";
  const subscenarioText = ownerState.subscenario ? subscenarioLabels[ownerState.subscenario] : null;

  return (
    <div style={S.phaseResume}>
      <div style={S.phaseResumeBadge} className="fade-up">
        <span style={S.phaseResumeDot} className="blink" aria-hidden="true" />
        <span style={S.phaseResumeBadgeText}>continuing session</span>
      </div>
      <div style={S.phaseResumeTitle} className="fade-up-1">
        Welcome back
      </div>
      <div style={S.phaseResumeText} className="fade-up-2">
        {subscenarioText && (
          <>
            I see you were working on <strong>{subscenarioText}</strong>.
            <br />
            {ownerState.country && <span>Location: {ownerState.country}</span>}
          </>
        )}
        {!subscenarioText && <span>Ready to continue where we left off.</span>}
      </div>
      <div style={S.phaseResumeActions} className="fade-up-3">
        <button
          type="button"
          onClick={onContinue}
          style={{ ...S.phaseResumeBtn, ...S.phaseResumeBtnContinue }}
        >
          Continue ✓
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{ ...S.phaseResumeBtn, ...S.phaseResumeBtnReset }}
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Styles ─────────────────────────────── */

const S = {
  surfaceLanding: {
    display:       "flex",
    flexDirection: "column",
    height:        "calc(100vh - 52px)",
    minHeight:     "560px",
    background:    "linear-gradient(135deg, #020C10 0%, #041820 55%, #020C10 100%)",
    position:      "relative",
    overflow:      "hidden",
    fontFamily:    "'IBM Plex Mono', monospace",
  },
  surfacePage: {
    display:       "flex",
    flexDirection: "column",
    height:        "calc(100vh - 52px)",
    fontFamily:    "'IBM Plex Mono', monospace",
    position:      "relative",
    zIndex:        1,
  },

  /* Header */
  header: {
    borderBottom: "1px solid rgba(0,245,255,0.10)",
    background:   "rgba(2,12,16,0.7)",
    padding:      "10px clamp(12px, 4vw, 28px)",
    flexShrink:   0,
  },
  headerInner: {
    maxWidth: "880px", margin: "0 auto",
    display: "flex", alignItems: "center", gap: "10px",
  },
  headerDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#00FF88", boxShadow: "0 0 6px #00FF88",
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily:    "'Orbitron', sans-serif",
    fontSize:      "12px",
    fontWeight:    700,
    color:         "#00F5FF",
    letterSpacing: "0.1em",
  },
  headerSub: {
    fontSize:      "9px",
    color:         "#2a5070",
    letterSpacing: "0.12em",
    marginLeft:    "8px",
  },
  headerActions: {
    marginLeft: "auto",
    display: "flex", gap: "8px", alignItems: "center",
  },
  smallBtn: {
    background: "transparent",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "3px",
    padding: "4px 10px",
    color: "#4A7A8A",
    fontSize: "9px",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.2s",
  },

  /* Messages */
  msgArea: {
    flex:      1,
    overflowY: "auto",
    padding:   "20px clamp(12px, 4vw, 28px)",
  },
  msgInner: {
    maxWidth: "880px", margin: "0 auto",
    display: "flex", flexDirection: "column", gap: "16px",
  },

  bubble: (isUser) => ({
    maxWidth:     "760px",
    width:        "100%",
    margin:       isUser ? "0 0 0 auto" : "0",
    background:   isUser ? "rgba(0,245,255,0.06)" : "rgba(4,24,32,0.8)",
    border:       isUser ? "1px solid rgba(0,245,255,0.20)"
                         : "1px solid rgba(0,245,255,0.08)",
    borderRadius: "6px",
    padding:      "14px 18px",
    alignSelf:    isUser ? "flex-end" : "flex-start",
  }),
  bubbleLabel: {
    fontSize: "8px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#2a5070",
    marginBottom: "6px",
  },
  bubbleText: {
    fontSize:   "13px",
    color:      "#c8e8f0",
    lineHeight: "1.75",
    wordBreak:  "break-word",
    fontFamily: "'Inter', sans-serif",
  },
  cursor: {
    color: "#00F5FF",
    display: "inline-block",
    verticalAlign: "baseline",
  },

  /* Empty state */
  empty: {
    maxWidth: "640px",
    margin:   "min(10vh, 80px) auto 24px",
    textAlign: "center",
    padding:   "0 12px",
  },
  emptyBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "1px solid rgba(0,255,136,0.25)",
    borderRadius: "3px",
    padding: "4px 10px",
    marginBottom: "18px",
  },
  emptyDot: {
    width: "5px", height: "5px", borderRadius: "50%",
    background: "#00FF88", boxShadow: "0 0 6px #00FF88",
  },
  emptyBadgeText: {
    fontSize: "9px",
    color: "#00FF88",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  welcomeLanding: {
    fontSize:   "clamp(20px, 3.4vw, 30px)",
    fontWeight: 600,
    color:      "#E8F8FF",
    lineHeight: 1.35,
    marginBottom: "26px",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "-0.01em",
  },
  welcomePage: {
    fontSize:   "clamp(16px, 2vw, 20px)",
    fontWeight: 500,
    color:      "#E8F8FF",
    lineHeight: 1.5,
    marginBottom: "20px",
    fontFamily: "'Inter', sans-serif",
  },
  suggestLabel: {
    fontSize: "9px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#2a5070",
    marginBottom: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  chipsWrap: {
    display: "flex", flexWrap: "wrap", gap: "8px",
    justifyContent: "center",
  },
  chip: {
    background: "rgba(4,24,32,0.7)",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "999px",
    padding: "8px 14px",
    color: "#7ab8c8",
    fontSize: "12px",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.01em",
    cursor: "pointer",
    transition: "all 0.18s",
    textAlign: "left",
    lineHeight: 1.3,
    maxWidth: "320px",
  },

  /* Input */
  inputArea: {
    borderTop:  "1px solid rgba(0,245,255,0.10)",
    background: "rgba(2,12,16,0.85)",
    padding:    "12px clamp(12px, 4vw, 28px) 10px",
    flexShrink: 0,
  },
  inputInner: {
    maxWidth:     "880px",
    margin:       "0 auto",
    display:      "flex",
    alignItems:   "flex-end",
    gap:          "10px",
    background:   "rgba(4,24,32,0.9)",
    border:       "1px solid rgba(0,245,255,0.14)",
    borderRadius: "6px",
    padding:      "10px 14px",
  },
  prompt: {
    fontSize: "14px",
    color: "#00F5FF",
    flexShrink: 0,
    paddingBottom: "2px",
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#E8F8FF",
    fontSize: "14px",
    lineHeight: "1.6",
    resize: "none",
    maxHeight: "140px",
    overflowY: "auto",
    fontFamily: "'Inter', sans-serif",
  },
  btn: {
    flexShrink: 0,
    padding: "5px 14px",
    borderRadius: "3px",
    fontSize: "9px",
    letterSpacing: "0.10em",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    textTransform: "uppercase",
    transition: "all 0.15s",
  },
  btnActive: {
    background: "#00F5FF",
    color: "#020C10",
  },
  btnDisabled: {
    background: "rgba(0,245,255,0.06)",
    color: "#2a5070",
    cursor: "not-allowed",
  },
  btnStop: {
    background: "rgba(255,80,80,0.15)",
    color: "#ff6060",
    border: "1px solid rgba(255,80,80,0.25)",
  },
  hint: {
    maxWidth: "880px",
    margin: "6px auto 0",
    fontSize: "8px",
    color: "#1e3050",
    letterSpacing: "0.06em",
    textAlign: "right",
    fontFamily: "'IBM Plex Mono', monospace",
  },

  /* Phase Resume */
  phaseResume: {
    maxWidth: "640px",
    margin: "min(10vh, 80px) auto 24px",
    textAlign: "center",
    padding: "0 12px",
  },
  phaseResumeBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "1px solid rgba(255,180,0,0.35)",
    borderRadius: "3px",
    padding: "4px 10px",
    marginBottom: "18px",
  },
  phaseResumeDot: {
    width: "5px", height: "5px", borderRadius: "50%",
    background: "#FFB400", boxShadow: "0 0 6px #FFB400",
  },
  phaseResumeBadgeText: {
    fontSize: "9px",
    color: "#FFB400",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  phaseResumeTitle: {
    fontSize: "clamp(18px, 2.5vw, 24px)",
    fontWeight: 600,
    color: "#E8F8FF",
    marginBottom: "12px",
    fontFamily: "'Inter', sans-serif",
  },
  phaseResumeText: {
    fontSize: "13px",
    color: "#8ab8c8",
    lineHeight: 1.6,
    marginBottom: "20px",
    fontFamily: "'Inter', sans-serif",
  },
  phaseResumeActions: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  phaseResumeBtn: {
    padding: "8px 16px",
    borderRadius: "3px",
    fontSize: "12px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    transition: "all 0.15s",
  },
  phaseResumeBtnContinue: {
    background: "rgba(0,245,255,0.12)",
    color: "#00F5FF",
    borderColor: "rgba(0,245,255,0.25)",
  },
  phaseResumeBtnReset: {
    background: "transparent",
    color: "#2a5070",
    borderColor: "rgba(0,245,255,0.12)",
  },
};
