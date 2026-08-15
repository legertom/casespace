import { Children, type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MentionableUser } from "@/server/comment-queries";

interface Props {
  /** Raw markdown. */
  body: string;
  /** The people this comment actually recorded as mentioned. */
  mentions: MentionableUser[];
}

/**
 * One comment's markdown, with `@Name` drawn as a mention rather than left as
 * plain text. Who was mentioned still comes from the stored ids — names are
 * matched only to find where in the body to draw the chip, never to decide
 * who gets notified.
 */
export function CommentBody({ body, mentions }: Props) {
  return (
    <div className="post-md mt-1.5 text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={mentionComponents(mentions)}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

/**
 * A mention links to that person's records, like every other name in the app.
 * People whose login isn't linked to a directory row render as a plain chip —
 * there's nothing honest to filter by.
 */
function Mention({ person }: { person: MentionableUser }) {
  const label = `@${person.name}`;
  if (!person.personId) return <span className="mention">{label}</span>;
  return (
    <Link href={`/use-cases?person=${person.personId}`} className="mention">
      {label}
    </Link>
  );
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Overrides for the elements that hold text directly. Anything not listed here
 * — `code` above all — renders untouched, so a mention inside a code span stays
 * literal.
 */
function mentionComponents(mentions: MentionableUser[]): Components {
  if (mentions.length === 0) return {};

  const byName = new Map(mentions.map((p) => [p.name, p]));
  // Longest first, so "Kate Schaffer" isn't cut short by "Kate Schaff".
  const alternatives = [...byName.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
  const pattern = new RegExp(`@(${alternatives})`, "g");

  const decorate = (children: ReactNode): ReactNode =>
    Children.map(children, (child) => {
      if (typeof child !== "string") return child;
      const parts: ReactNode[] = [];
      let last = 0;
      pattern.lastIndex = 0;
      for (let m = pattern.exec(child); m; m = pattern.exec(child)) {
        const person = byName.get(m[1]);
        if (!person) continue;
        if (m.index > last) parts.push(child.slice(last, m.index));
        parts.push(<Mention key={m.index} person={person} />);
        last = m.index + m[0].length;
      }
      if (parts.length === 0) return child;
      if (last < child.length) parts.push(child.slice(last));
      return parts;
    });

  return {
    p: ({ node, children, ...props }) => <p {...props}>{decorate(children)}</p>,
    li: ({ node, children, ...props }) => (
      <li {...props}>{decorate(children)}</li>
    ),
    strong: ({ node, children, ...props }) => (
      <strong {...props}>{decorate(children)}</strong>
    ),
    em: ({ node, children, ...props }) => (
      <em {...props}>{decorate(children)}</em>
    ),
    td: ({ node, children, ...props }) => (
      <td {...props}>{decorate(children)}</td>
    ),
    th: ({ node, children, ...props }) => (
      <th {...props}>{decorate(children)}</th>
    ),
  };
}
