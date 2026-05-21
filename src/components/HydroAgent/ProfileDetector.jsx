"use client";

export default function ProfileDetector({ profileOptions, onSelect, isLanding }) {
  return (
    <div style={S.container}>
      <div style={S.badge} className="fade-up">
        <span style={S.dot} className="blink" />
        <span style={S.badgeText}>online · llama-3.3-70b</span>
      </div>

      <div style={isLanding ? S.titleLanding : S.titlePage} className="fade-up-1">
        ¿Cuál es tu perfil? / What's your profile?
      </div>

      <div style={S.optionsWrap} className="fade-up-2">
        {profileOptions.map((opt, i) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            style={S.option}
            className="profile-option"
          >
            <div style={S.optionTitle}>{opt.title}</div>
            <div style={S.optionSubtitle}>{opt.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const S = {
  container: {
    maxWidth: "640px",
    margin: "min(10vh, 80px) auto 24px",
    textAlign: "center",
    padding: "0 12px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid rgba(0,255,136,0.25)",
    borderRadius: "3px",
    padding: "4px 10px",
    marginBottom: "18px",
  },
  dot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "#00FF88",
    boxShadow: "0 0 6px #00FF88",
  },
  badgeText: {
    fontSize: "9px",
    color: "#00FF88",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  titleLanding: {
    fontSize: "clamp(20px, 3.4vw, 30px)",
    fontWeight: 600,
    color: "#E8F8FF",
    lineHeight: 1.35,
    marginBottom: "26px",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "-0.01em",
  },
  titlePage: {
    fontSize: "clamp(16px, 2vw, 20px)",
    fontWeight: 500,
    color: "#E8F8FF",
    lineHeight: 1.5,
    marginBottom: "20px",
    fontFamily: "'Inter', sans-serif",
  },
  optionsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  option: {
    background: "rgba(4,24,32,0.7)",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "6px",
    padding: "14px 16px",
    color: "#7ab8c8",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    transition: "all 0.18s",
    textAlign: "left",
    lineHeight: 1.4,
  },
  optionTitle: {
    fontWeight: 600,
    color: "#E8F8FF",
    marginBottom: "4px",
    fontSize: "14px",
  },
  optionSubtitle: {
    fontSize: "12px",
    color: "#7ab8c8",
    lineHeight: 1.3,
  },
};
