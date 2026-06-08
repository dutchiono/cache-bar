import { linkifyMessage } from "../lib/linkifyMessage";

/** Renders chat text with every URL clickable — Eliza returns plain text, not HTML. */
export function ChatMessageBody({
  content,
  linkClassName,
}: {
  content: string;
  linkClassName?: string;
}) {
  return (
    <span className="whitespace-pre-wrap break-words">
      {linkifyMessage(content, linkClassName)}
    </span>
  );
}
