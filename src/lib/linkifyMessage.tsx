import type { ReactNode } from "react";

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const URL_RE = /https?:\/\/[^\s<>"']+/g;

function trimTrailingPunctuation(url: string) {
  const match = url.match(/[.,;:)·]+$/);
  if (!match) return { href: url, suffix: "" };
  return { href: url.slice(0, -match[0].length), suffix: match[0] };
}

function linkNode(href: string, label: string, linkClassName: string | undefined, key: number) {
  return (
    <a
      key={`link-${key}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      {label}
    </a>
  );
}

/** Turn plain-text (and markdown) URLs in chat text into clickable links. */
export function linkifyMessage(text: string, linkClassName?: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const part of splitMarkdownLinks(text)) {
    if (part.kind === "md") {
      if (part.start > cursor) nodes.push(text.slice(cursor, part.start));
      nodes.push(linkNode(part.href, part.label, linkClassName, key++));
      cursor = part.end;
      continue;
    }

    let last = part.start;
    URL_RE.lastIndex = part.start;
    let match: RegExpExecArray | null;
    while ((match = URL_RE.exec(text)) !== null && match.index < part.end) {
      if (match.index > last) nodes.push(text.slice(last, match.index));
      const { href, suffix } = trimTrailingPunctuation(match[0]);
      nodes.push(linkNode(href, href, linkClassName, key++));
      if (suffix) nodes.push(suffix);
      last = match.index + match[0].length;
      if (last >= part.end) break;
    }
    if (last < part.end) nodes.push(text.slice(last, part.end));
    cursor = part.end;
  }

  return nodes.length > 0 ? nodes : [text];
}

function splitMarkdownLinks(text: string) {
  const spans: Array<
    | { kind: "text"; start: number; end: number }
    | { kind: "md"; start: number; end: number; label: string; href: string }
  > = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((match = MARKDOWN_LINK_RE.exec(text)) !== null) {
    if (match.index > cursor) {
      spans.push({ kind: "text", start: cursor, end: match.index });
    }
    spans.push({
      kind: "md",
      start: match.index,
      end: match.index + match[0].length,
      label: match[1],
      href: match[2],
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) spans.push({ kind: "text", start: cursor, end: text.length });
  if (spans.length === 0) spans.push({ kind: "text", start: 0, end: text.length });
  return spans;
}
