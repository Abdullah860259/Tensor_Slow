import React from "react";
import Link from "next/link";

const CITATION_REGEX = /\[\[item:([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * Parses inline formatted spans: citations [[item:id|title]], bold **bold text**, and inline `code`.
 */
function renderInlineSpans(rawText: string, keyPrefix: string): React.ReactNode[] {
  // Normalize awkward trailing whitespace before punctuation (e.g. " ] ." -> " ].")
  const sanitized = rawText.replace(/\s+([.,;:!?])/g, "$1");
  const nodes: React.ReactNode[] = [];

  // Match either citation [[item:...|...]] or bold **...** or code `...`
  const tokenRegex = /(\[\[item:[^|\]]+\|[^\]]+\]\]|\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(sanitized)) !== null) {
    const matchIndex = match.index;
    const matchStr = match[0];

    // Push leading plain text
    if (matchIndex > lastIndex) {
      nodes.push(sanitized.slice(lastIndex, matchIndex));
    }

    if (matchStr.startsWith("[[item:")) {
      const citeMatch = /\[\[item:([^|\]]+)\|([^\]]+)\]\]/.exec(matchStr);
      if (citeMatch) {
        const id = citeMatch[1];
        const title = citeMatch[2];
        nodes.push(
          <Link
            key={`${keyPrefix}-cite-${id}-${matchIndex}`}
            href={`/items/${id}`}
            className="mx-1 inline-flex max-w-[16rem] items-center truncate rounded-none border border-primary/30 bg-primary/10 px-1.5 py-0.5 align-baseline font-mono text-[12px] font-medium text-primary hover:bg-primary/20 transition-colors"
            title={`Inspect provenance: ${title}`}
          >
            {title}
          </Link>
        );
      }
    } else if (matchStr.startsWith("**") && matchStr.endsWith("**")) {
      const boldText = matchStr.slice(2, -2);
      nodes.push(
        <strong key={`${keyPrefix}-bold-${matchIndex}`} className="font-semibold text-foreground">
          {boldText}
        </strong>
      );
    } else if (matchStr.startsWith("`") && matchStr.endsWith("`")) {
      const codeText = matchStr.slice(1, -1);
      nodes.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="rounded-none border border-border bg-secondary/50 px-1 py-0.5 font-mono text-[13px] text-foreground"
        >
          {codeText}
        </code>
      );
    }

    lastIndex = matchIndex + matchStr.length;
  }

  if (lastIndex < sanitized.length) {
    nodes.push(sanitized.slice(lastIndex));
  }

  return nodes;
}

/**
 * Rich markdown and citation renderer for Dossier Copilot messages.
 * Formats bullet points, numbered lists, section headers, and inline citations seamlessly.
 */
export function CitedText({ text }: { text: string }): React.JSX.Element {
  // Strip trailing partial citation tag during streaming
  const visible = text.replace(/\[\[[^\]]*$/, "");
  const lines = visible.split(/\r?\n/);

  const elements: React.JSX.Element[] = [];
  let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      elements.push(
        <ul key={key} className="my-2 space-y-1.5 pl-0.5">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-base leading-relaxed text-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <div className="flex-1">{item}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="my-2 space-y-1.5 pl-0.5">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-base leading-relaxed text-foreground">
              <span className="mt-0.5 font-mono text-sm font-semibold text-primary tabular-nums">
                {idx + 1}.
              </span>
              <div className="flex-1">{item}</div>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList(`flush-${i}`);
      continue;
    }

    // Header 3 or 2 (### or ##)
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch && headerMatch[2]) {
      flushList(`flush-${i}`);
      elements.push(
        <h4 key={`h-${i}`} className="mt-3.5 mb-1.5 font-sans text-base font-semibold tracking-tight text-foreground">
          {renderInlineSpans(headerMatch[2], `h-${i}`)}
        </h4>
      );
      continue;
    }

    // Bullet list (* or - or •)
    const bulletMatch = trimmed.match(/^[*•\-]\s+(.+)$/);
    if (bulletMatch && bulletMatch[1]) {
      if (currentList && currentList.type !== "ul") {
        flushList(`flush-${i}`);
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(renderInlineSpans(bulletMatch[1], `li-${i}`));
      continue;
    }

    // Numbered list (1. ...)
    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numMatch && numMatch[1]) {
      if (currentList && currentList.type !== "ol") {
        flushList(`flush-${i}`);
      }
      if (!currentList) {
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(renderInlineSpans(numMatch[1], `oli-${i}`));
      continue;
    }

    // Standard paragraph line
    flushList(`flush-${i}`);
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-base leading-relaxed text-foreground">
        {renderInlineSpans(trimmed, `p-${i}`)}
      </p>
    );
  }

  flushList("final-flush");

  return <div className="space-y-1">{elements}</div>;
}
