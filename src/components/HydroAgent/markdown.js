// Minimal markdown renderer — no external deps.
// Supports: ``` code blocks ```, # / ## / ### headings,
//           - / * unordered lists, 1. ordered lists,
//           **bold**, *italic*, `inline code`, blank-line paragraph breaks.

import React from "react";

const inlineStyles = {
  code: {
    background: "rgba(0,245,255,0.08)",
    border: "1px solid rgba(0,245,255,0.15)",
    borderRadius: "3px",
    padding: "1px 5px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.92em",
    color: "#7ce8f5",
  },
  bold: { color: "#E8F8FF", fontWeight: 700 },
  italic: { color: "#bfe4ec", fontStyle: "italic" },
};

function renderInline(text, baseKey) {
  if (!text) return null;
  const out = [];
  let rest = text;
  let idx = 0;

  const patterns = [
    { re: /`([^`]+)`/,                     type: "code"   },
    { re: /\*\*([^*]+)\*\*/,               type: "bold"   },
    { re: /\*([^*\n]+)\*/,                 type: "italic" },
    { re: /\[([^\]]+)\]\(([^)]+)\)/,       type: "link"   },
  ];

  while (rest.length > 0) {
    let best = null;
    let bestType = null;

    for (const p of patterns) {
      const m = rest.match(p.re);
      if (m && (best === null || m.index < best.index)) {
        best = m;
        bestType = p.type;
      }
    }

    if (!best) {
      out.push(<span key={`${baseKey}-t${idx++}`}>{rest}</span>);
      break;
    }

    if (best.index > 0) {
      out.push(<span key={`${baseKey}-t${idx++}`}>{rest.slice(0, best.index)}</span>);
    }

    const inner = best[1];
    const k = `${baseKey}-x${idx++}`;
    if (bestType === "code") {
      out.push(<code key={k} style={inlineStyles.code}>{inner}</code>);
    } else if (bestType === "bold") {
      out.push(<strong key={k} style={inlineStyles.bold}>{inner}</strong>);
    } else if (bestType === "italic") {
      out.push(<em key={k} style={inlineStyles.italic}>{inner}</em>);
    } else if (bestType === "link") {
      const href = best[2];
      const isCalc = href.startsWith("/calculators");
      out.push(
        <a key={k} href={href} style={isCalc ? {
          display: "inline-flex", alignItems: "center", gap: "5px",
          background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.2)",
          borderRadius: "4px", padding: "3px 10px", margin: "2px 1px",
          color: "#00F5FF", textDecoration: "none",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px",
          fontWeight: "700", letterSpacing: "0.04em",
        } : { color: "#00d4ff", textDecoration: "underline" }}>
          {inner}
        </a>
      );
    }

    rest = rest.slice(best.index + best[0].length);
  }

  return out;
}

export function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      blocks.push(
        <pre key={`k${key++}`} style={{
          background: "rgba(2,12,16,0.85)",
          border: "1px solid rgba(0,245,255,0.18)",
          borderRadius: "4px",
          padding: "10px 14px",
          margin: "8px 0",
          overflowX: "auto",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "12px",
          color: "#7ce8f5",
          lineHeight: "1.6",
        }}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const size = level === 1 ? "16px" : level === 2 ? "14px" : "13px";
      blocks.push(
        <div key={`k${key++}`} style={{
          fontSize: size, fontWeight: 700,
          color: "#00F5FF",
          margin: level === 1 ? "12px 0 8px" : "10px 0 4px",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.04em",
        }}>
          {renderInline(h[2], `h${key}`)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`k${key++}`} style={{
          paddingLeft: "18px", margin: "6px 0",
          listStyleType: "none",
        }}>
          {items.map((it, j) => (
            <li key={j} style={{
              position: "relative", marginBottom: "4px", lineHeight: "1.7",
            }}>
              <span aria-hidden="true" style={{
                position: "absolute", left: "-14px", color: "#00F5FF",
              }}>▸</span>
              {renderInline(it, `u${key}-${j}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`k${key++}`} style={{
          paddingLeft: "22px", margin: "6px 0",
        }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: "4px", lineHeight: "1.7" }}>
              {renderInline(it, `o${key}-${j}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (group consecutive non-special lines)
    const para = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") break;
      if (l.trim().startsWith("```")) break;
      if (/^(#{1,3})\s+/.test(l)) break;
      if (/^\s*[-*]\s+/.test(l)) break;
      if (/^\s*\d+\.\s+/.test(l)) break;
      para.push(l);
      i++;
    }
    blocks.push(
      <p key={`k${key++}`} style={{ margin: "4px 0", lineHeight: "1.75" }}>
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return blocks;
}
