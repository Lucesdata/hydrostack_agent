"use client";
import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/i18n";

const WELCOME = {
  es: "Hola. Soy HydroStack Assistant, tu ingeniero hidráulico virtual especializado en sistemas SITARD. Puedo ayudarte a dimensionar fosas sépticas, zanjas filtrantes y pozos de absorción, o explicarte la normativa aplicable (CTE DB-HS 5, EN 12566, RAS Colombia). ¿En qué trabajamos hoy?",
  en: "Hello. I'm HydroStack Assistant, your virtual hydraulic engineer specialized in SITARD systems. I can help you size septic tanks, soakaway trenches, and absorption wells, or explain the applicable standards (CTE DB-HS 5, EN 12566, RAS Colombia). What are we working on today?",
};

export default function ChatPage() {
  const { lang } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    // Placeholder for the assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    abortRef.current = new AbortController();

    try {
      // Load FormState from localStorage if available
      let formState = undefined;
      try {
        const stored = localStorage.getItem("hydrostack_formstate");
        if (stored) formState = JSON.parse(stored);
      } catch {
        // ignore localStorage errors
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, formState }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // keep incomplete chunk

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const raw = part.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const evt = JSON.parse(raw);
            if (evt.type === "error") {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: `Error: ${evt.error}`,
                };
                return copy;
              });
            } else if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    content: last.content + evt.delta.text,
                  };
                }
                return copy;
              });
            }
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Error al conectar con el asistente. Inténtalo de nuevo.",
          };
          return copy;
        });
      }
    } finally {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false };
        return copy;
      });
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  const welcome = WELCOME[lang] ?? WELCOME.es;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <span style={S.headerDot} className="blink" />
          <span style={S.headerTitle}>HydroStack Assistant</span>
          <span style={S.headerSub}>SITARD · CTE · EN 12566 · RAS</span>
        </div>
      </div>

      {/* Messages */}
      <div style={S.msgArea}>
        {/* Welcome bubble */}
        <div style={S.bubble("assistant")}>
          <div style={S.bubbleLabel}>assistant</div>
          <div style={S.bubbleText}>{welcome}</div>
        </div>

        {messages.map((m, i) => (
          <div key={i} style={S.bubble(m.role)}>
            <div style={S.bubbleLabel}>{m.role}</div>
            <div style={S.bubbleText}>
              {m.content ||
                (m.streaming ? (
                  <span style={S.cursor} className="blink">
                    ▋
                  </span>
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        <div style={S.inputInner}>
          <span style={S.prompt}>{">"}</span>
          <textarea
            ref={inputRef}
            style={S.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === "en" ? "Ask a SITARD question…" : "Escribe tu consulta SITARD…"}
            rows={1}
            disabled={loading}
          />
          {loading ? (
            <button style={{ ...S.btn, ...S.btnStop }} onClick={stop}>
              ■ stop
            </button>
          ) : (
            <button
              style={{ ...S.btn, ...(input.trim() ? S.btnActive : S.btnDisabled) }}
              onClick={send}
              disabled={!input.trim()}
            >
              send →
            </button>
          )}
        </div>
        <div style={S.hint}>Enter para enviar · Shift+Enter para nueva línea</div>
      </div>
    </div>
  );
}

const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 52px)",
    fontFamily: "'IBM Plex Mono', monospace",
    position: "relative",
    zIndex: 1,
  },

  /* Header */
  header: {
    borderBottom: "1px solid rgba(0,245,255,0.10)",
    background: "rgba(2,12,16,0.7)",
    padding: "10px 28px",
    flexShrink: 0,
  },
  headerInner: {
    maxWidth: "760px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  headerDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#00FF88",
    boxShadow: "0 0 6px #00FF88",
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "11px",
    fontWeight: "700",
    color: "#00F5FF",
    letterSpacing: "0.1em",
  },
  headerSub: {
    fontSize: "9px",
    color: "#2a5070",
    letterSpacing: "0.12em",
    marginLeft: "auto",
  },

  /* Messages */
  msgArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px clamp(12px, 4vw, 28px)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  bubble: (role) => ({
    maxWidth: "720px",
    width: "100%",
    margin: role === "user" ? "0 0 0 auto" : "0",
    background: role === "user" ? "rgba(0,245,255,0.06)" : "rgba(4,24,32,0.8)",
    border: role === "user" ? "1px solid rgba(0,245,255,0.20)" : "1px solid rgba(0,245,255,0.08)",
    borderRadius: "6px",
    padding: "14px 18px",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
  }),

  bubbleLabel: {
    fontSize: "8px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#2a5070",
    marginBottom: "6px",
  },

  bubbleText: {
    fontSize: "13px",
    color: "#c8e8f0",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  cursor: {
    color: "#00F5FF",
  },

  /* Input bar */
  inputArea: {
    borderTop: "1px solid rgba(0,245,255,0.10)",
    background: "rgba(2,12,16,0.85)",
    padding: "12px clamp(12px, 4vw, 28px) 10px",
    flexShrink: 0,
  },
  inputInner: {
    maxWidth: "760px",
    margin: "0 auto",
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    background: "rgba(4,24,32,0.9)",
    border: "1px solid rgba(0,245,255,0.14)",
    borderRadius: "6px",
    padding: "10px 14px",
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
    fontSize: "13px",
    lineHeight: "1.6",
    resize: "none",
    maxHeight: "120px",
    overflowY: "auto",
  },
  btn: {
    flexShrink: 0,
    padding: "5px 14px",
    borderRadius: "3px",
    fontSize: "9px",
    letterSpacing: "0.10em",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: "600",
    cursor: "pointer",
    border: "none",
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
    cursor: "pointer",
  },
  hint: {
    maxWidth: "760px",
    margin: "6px auto 0",
    fontSize: "8px",
    color: "#1e3050",
    letterSpacing: "0.06em",
    textAlign: "right",
  },
};
