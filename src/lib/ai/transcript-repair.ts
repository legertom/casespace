/**
 * What the route does to a transcript before the model reads it, and before it
 * is stored. Both repairs exist because a conversation that has gone wrong
 * once must not stay wrong forever: the browser sends the whole history on
 * every turn, so a bad part in it fails every turn after it — "hi" included.
 */
import { getStaticToolName, isStaticToolUIPart, type UIMessage } from "ai";
import { LEFT_UNDECIDED } from "./decision";

/**
 * A proposal card is a tool call waiting on a click, and nothing stops a
 * person answering it in the composer instead — "change the net impact
 * statement to…" is the natural reply to a card that is nearly right. That
 * leaves a call with no result in the middle of the transcript, which the AI
 * SDK refuses to send to a model at all.
 *
 * So an undecided card that somebody has since replied past reads, to the
 * model, as exactly that: undecided. Only the model's view changes. The stored
 * transcript and the browser keep the card as it is, still clickable, and a
 * later click replaces this stand-in with the real decision.
 *
 * `isCard` names the tools that wait on a human. A read tool left hanging by a
 * cut-off stream is not a decision anyone failed to make; the route drops
 * those rather than putting words in the human's mouth.
 */
export function settleUndecidedCards<M extends UIMessage>(
  messages: M[],
  isCard: (toolName: string) => boolean,
): M[] {
  const lastUserAt = messages.findLastIndex((m) => m.role === "user");
  return messages.map((message, at) => {
    // A card in the newest assistant turn is still in front of the person —
    // nobody has replied past it, so there is nothing to settle.
    if (message.role !== "assistant" || at > lastUserAt) return message;
    let changed = false;
    const parts = message.parts.map((part) => {
      if (
        !isStaticToolUIPart(part) ||
        part.state !== "input-available" ||
        !isCard(String(getStaticToolName(part)))
      ) {
        return part;
      }
      changed = true;
      return { ...part, state: "output-available", output: LEFT_UNDECIDED };
    });
    return changed ? ({ ...message, parts } as M) : message;
  });
}

/**
 * A turn that fails before the model says anything still closes with an
 * assistant message — an empty one. Stored, it renders as a blank gap on every
 * reopen and travels back to the model on every later turn.
 */
export function withoutEmptyAssistantTurns<M extends UIMessage>(
  messages: M[],
): M[] {
  return messages.filter(
    (m) => m.role !== "assistant" || m.parts.length > 0,
  );
}
