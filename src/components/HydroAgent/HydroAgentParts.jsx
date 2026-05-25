// HydroAgent presentational subcomponents (empty state, message bubble, phase resume).
// Extracted verbatim from HydroAgent.jsx during the modular refactor.

import { renderMarkdown } from "./markdown";
import ToolResultCard from "./ToolResultCard";
import BuildSystemFlow from "./BuildSystemFlow";
import SepticResults from "./SepticResults";
import { S } from "./styles";

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

function Bubble({ role, content, tools, suggestions, onSuggestionPick, flow, onFlowSubmit, results, lang, streaming, errored, labelUser, labelAssistant }) {
  const isUser = role === "user";
  const hasTools = !isUser && tools && tools.length > 0;
  const hasSuggestions = !isUser && suggestions && suggestions.length > 0;
  const hasFlow = !isUser && !!flow;
  const hasResults = !isUser && !!results;
  const showEmptyCursor = streaming && !content && !hasTools && !hasResults;

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

      {hasFlow && (
        <BuildSystemFlow
          lang={lang}
          onSubmit={(data) => onFlowSubmit(flow, data)}
        />
      )}

      {hasResults && (
        <SepticResults
          results={results}
          lang={lang}
          ubicacion={results.ubicacion}
        />
      )}

      {hasSuggestions && (
        <div style={{
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0,245,255,0.1)",
          background: "rgba(0,10,14,0.4)",
          borderRadius: "0 0 6px 6px",
          marginLeft: "-18px",
          marginRight: "-18px",
          marginBottom: "-14px",
          paddingLeft: "18px",
          paddingRight: "18px",
          paddingBottom: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "7px",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggestionPick(s.text)}
              style={{
                background: "rgba(0,245,255,0.05)",
                border: "1px solid rgba(0,245,255,0.18)",
                borderRadius: "5px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#c8e8f0",
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                textAlign: "left",
                lineHeight: "1.45",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <span style={{
                fontSize: "9px",
                fontFamily: "'IBM Plex Mono', monospace",
                color: "#00F5FF",
                fontWeight: 700,
                flexShrink: 0,
                minWidth: "16px",
              }}>{i + 1}.</span>
              {s.text}
            </button>
          ))}
        </div>
      )}
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

export { EmptyState, Bubble, PhaseResume };
