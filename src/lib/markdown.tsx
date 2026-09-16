"use client";

import React from "react";

/* ------------------------------------------------------------------ */
/*  Safe href handling                                                 */
/* ------------------------------------------------------------------ */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`;
  return null; // blocks javascript:, data:, etc.
}

/* ------------------------------------------------------------------ */
/*  Inline parsing: bold, italic, underline, strike, code, link, mark  */
/* ------------------------------------------------------------------ */
const INLINE_RULES: { type: string; re: RegExp }[] = [
  { type: "code", re: /`([^`\n]+)`/ },
  { type: "link", re: /\[([^\]]*)\]\(([^)\s]+)\)/ },
  { type: "bold", re: /\*\*([^*]+)\*\*/ },
  { type: "bold", re: /__([^_]+)__/ },
  { type: "strike", re: /~~([^~]+)~~/ },
  { type: "highlight", re: /==([^=]+)==/ },
  { type: "underline", re: /\+\+([^+]+)\+\+/ },
  { type: "italic", re: /\*([^*\n]+)\*/ },
  { type: "italic", re: /_([^_\n]+)_/ },
];

export function parseInline(text: string, keyPrefix = "i"): React.ReactNode[] {
  if (!text) return [];

  let best: { idx: number; len: number; type: string; m: RegExpMatchArray } | null = null;
  for (const rule of INLINE_RULES) {
    const m = text.match(rule.re);
    if (m && m.index !== undefined && (!best || m.index < best.idx)) {
      best = { idx: m.index, len: m[0].length, type: rule.type, m };
    }
  }

  if (!best) return [text];

  const before = text.slice(0, best.idx);
  const after = text.slice(best.idx + best.len);
  const inner = best.m[1] ?? "";
  const key = `${keyPrefix}-${best.idx}-${best.type}`;
  const out: React.ReactNode[] = [];

  if (before) out.push(before);

  switch (best.type) {
    case "code":
      out.push(
        <code key={key} className="px-1.5 py-0.5 rounded-md bg-[rgb(var(--border))]/40 font-mono text-[0.9em]">
          {inner}
        </code>
      );
      break;
    case "link": {
      const href = safeHref(best.m[2] ?? "");
      out.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="text-[rgb(var(--accent))] underline underline-offset-2 hover:opacity-80">
            {parseInline(inner, key)}
          </a>
        ) : (
          <span key={key}>{inner}</span>
        )
      );
      break;
    }
    case "bold":
      out.push(<strong key={key} className="font-bold">{parseInline(inner, key)}</strong>);
      break;
    case "italic":
      out.push(<em key={key} className="italic">{parseInline(inner, key)}</em>);
      break;
    case "strike":
      out.push(<del key={key} className="line-through opacity-70">{parseInline(inner, key)}</del>);
      break;
    case "underline":
      out.push(<u key={key} className="underline underline-offset-2">{parseInline(inner, key)}</u>);
      break;
    case "highlight":
      out.push(
        <mark key={key} className="px-1 rounded bg-[rgb(var(--accent))]/25 text-[rgb(var(--text))]">
          {parseInline(inner, key)}
        </mark>
      );
      break;
  }

  out.push(...parseInline(after, `${key}x`));
  return out;
}

/* ------------------------------------------------------------------ */
/*  Block parsing                                                      */
/* ------------------------------------------------------------------ */
interface MarkdownViewProps {
  content: string;
  /** Called with the source line index when a checklist box is clicked. */
  onToggleTask?: (lineIndex: number) => void;
}

const HEADING_SIZES: Record<number, string> = {
  1: "text-3xl font-bold mt-6 mb-3",
  2: "text-2xl font-bold mt-5 mb-2.5",
  3: "text-xl font-semibold mt-4 mb-2",
  4: "text-lg font-semibold mt-3 mb-1.5",
  5: "text-base font-semibold mt-3 mb-1.5",
  6: "text-sm font-semibold uppercase tracking-wide mt-3 mb-1.5 text-[rgb(var(--text-secondary))]",
};

export function MarkdownView({ content, onToggleTask }: MarkdownViewProps) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let key = 0;
  const nextKey = () => `b${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    /* ---- fenced code block ---- */
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={nextKey()} className="my-3 p-4 rounded-xl bg-[rgb(var(--border))]/30 overflow-x-auto">
          {lang && <div className="text-[10px] uppercase tracking-wider text-[rgb(var(--text-secondary))] mb-2">{lang}</div>}
          <code className="font-mono text-sm whitespace-pre">{body.join("\n")}</code>
        </pre>
      );
      continue;
    }

    /* ---- horizontal rule ---- */
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push(<hr key={nextKey()} className="my-5 border-0 border-t border-[rgb(var(--border))]" />);
      i++;
      continue;
    }

    /* ---- heading ---- */
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${level}`) as keyof React.JSX.IntrinsicElements;
      blocks.push(
        <Tag key={nextKey()} className={HEADING_SIZES[level]}>
          {parseInline(heading[2], nextKey())}
        </Tag>
      );
      i++;
      continue;
    }

    /* ---- blockquote (consecutive) ---- */
    if (/^\s*>\s?/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={nextKey()} className="my-3 pl-4 border-l-4 border-[rgb(var(--accent))] italic text-[rgb(var(--text-secondary))]">
          {quoted.map((q, qi) => (
            <p key={qi} className="my-1">{parseInline(q, `q${qi}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    /* ---- checklist (consecutive) ---- */
    if (/^\s*[-*]\s+\[[ xX]\]\s*/.test(line)) {
      const items: { text: string; checked: boolean; srcLine: number }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
        if (!m) break;
        items.push({ checked: m[1].toLowerCase() === "x", text: m[2], srcLine: i });
        i++;
      }
      blocks.push(
        <ul key={nextKey()} className="my-3 space-y-1.5">
          {items.map((it) => (
            <li key={it.srcLine} className="flex items-start gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={it.checked}
                onClick={() => onToggleTask?.(it.srcLine)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                  it.checked
                    ? "bg-[rgb(var(--accent))] border-[rgb(var(--accent))] text-white"
                    : "border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]"
                }`}
              >
                {it.checked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
              <span className={it.checked ? "line-through text-[rgb(var(--text-secondary))]" : ""}>
                {parseInline(it.text, `t${it.srcLine}`)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    /* ---- ordered list (consecutive) ---- */
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={nextKey()} className="my-3 list-decimal pl-6 space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1">{parseInline(it, `o${idx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    /* ---- bullet list (consecutive) ---- */
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]) && !/^\s*[-*]\s+\[[ xX]\]/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={nextKey()} className="my-3 list-disc pl-6 space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1">{parseInline(it, `u${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    /* ---- blank line ---- */
    if (!line.trim()) {
      i++;
      continue;
    }

    /* ---- paragraph (consecutive plain lines) ---- */
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(#{1,6}\s|>|```|\d+\.\s|[-*+]\s|---+\s*$|\*\*\*+\s*$|___+\s*$)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) {
      blocks.push(
        <p key={nextKey()} className="my-2 leading-[1.8]">
          {para.map((p, pi) => (
            <React.Fragment key={pi}>
              {pi > 0 && <br />}
              {parseInline(p, `p${pi}`)}
            </React.Fragment>
          ))}
        </p>
      );
    } else {
      i++; // safety: never stall
    }
  }

  if (!blocks.length) {
    return <p className="text-[rgb(var(--text-secondary))]/50 italic">Nothing to preview yet — switch to Write and start typing.</p>;
  }

  return <div className="markdown-body">{blocks}</div>;
}

/** Flip `- [ ]` <-> `- [x]` on a given source line. */
export function toggleTaskLine(content: string, lineIndex: number): string {
  const lines = content.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return content;
  const m = line.match(/^(\s*[-*]\s+\[)([ xX])(\]\s*.*)$/);
  if (!m) return content;
  lines[lineIndex] = `${m[1]}${m[2].toLowerCase() === "x" ? " " : "x"}${m[3]}`;
  return lines.join("\n");
}
