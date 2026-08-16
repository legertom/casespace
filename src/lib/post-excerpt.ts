/**
 * A generous plain-text excerpt of a markdown post body, for the archive
 * cards on /whats-new. Whole paragraphs, never a mid-sentence cut: take
 * prose paragraphs until the budget is spent, and only truncate inside a
 * paragraph when the very first one is longer than the whole budget.
 */

const DEFAULT_BUDGET = 600;

/** One markdown block as card-ready plain text. */
function stripMarkdown(block: string): string {
  return block
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "") // images vanish
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function postExcerpt(
  markdown: string,
  budget: number = DEFAULT_BUDGET,
): string {
  const blocks = markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    // Headings label sections; an excerpt wants the prose under them.
    .filter((b) => !/^#{1,6}\s/.test(b))
    // Tables, fences, and lists read as noise out of context — prose only.
    .filter((b) => !/^(\||```|\s*(?:[-*+]|\d+\.)\s)/.test(b));

  const paragraphs: string[] = [];
  let used = 0;
  for (const block of blocks) {
    const text = stripMarkdown(block);
    if (!text) continue;
    if (paragraphs.length > 0 && used + text.length > budget) {
      return paragraphs.join("\n\n") + " …";
    }
    if (paragraphs.length === 0 && text.length > budget) {
      const cut = text.slice(0, budget);
      // Break at the last word boundary rather than mid-word.
      return cut.slice(0, cut.lastIndexOf(" ")).trimEnd() + " …";
    }
    paragraphs.push(text);
    used += text.length;
  }
  return paragraphs.join("\n\n");
}
