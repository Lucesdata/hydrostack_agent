"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";
import ProfileDetector from "./ProfileDetector";
import { S } from "./styles";
import { EmptyState, Bubble, PhaseResume } from "./HydroAgentParts";
import {
  getProfile,
  setProfile,
  getOwnerState,
  saveOwnerState,
  clearOwnerState,
  updateOwnerStateFromResponse,
  getFormState,
} from "@/src/lib/state/clientStore";

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
      const formState = getFormState() ?? undefined;
      const currentOwnerState = ownerState;

      const res = await fetch("/api/agent", {
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
