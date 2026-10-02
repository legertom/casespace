import { convertToModelMessages, type UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { LEFT_UNDECIDED, UPDATED } from "./decision";
import {
  settleUndecidedCards,
  withoutEmptyAssistantTurns,
} from "./transcript-repair";

const CARDS = new Set(["propose_update", "propose_use_case"]);
const isCard = (name: string) => CARDS.has(name);

function user(id: string, text: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function toolPart(
  name: string,
  state: string,
  extra: Record<string, unknown> = {},
) {
  return {
    type: `tool-${name}`,
    toolCallId: `call_${name}`,
    state,
    input: { id: "uc-1" },
    ...extra,
  } as unknown as UIMessage["parts"][number];
}

function assistant(id: string, ...parts: UIMessage["parts"]): UIMessage {
  return { id, role: "assistant", parts };
}

function stateOf(message: UIMessage, at: number) {
  return message.parts[at] as unknown as { state: string; output?: unknown };
}

describe("an undecided card somebody replied past", () => {
  // The conversation that locked a person out: the Coach proposed an ROI
  // edit, and the reply was typed into the composer instead of clicked.
  const stuck = [
    user("u1", "help me finish the ROI on this"),
    assistant(
      "a1",
      { type: "text", text: "Here's the edit." },
      toolPart("propose_update", "input-available"),
    ),
    user("u2", "net impact statement: she has that hour back each quarter"),
  ];

  it("reads to the model as undecided, not as a call with no answer", () => {
    const [, proposed] = settleUndecidedCards(stuck, isCard);
    expect(stateOf(proposed, 1)).toMatchObject({
      state: "output-available",
      output: LEFT_UNDECIDED,
    });
  });

  it("produces a transcript the SDK will actually send", async () => {
    const model = await convertToModelMessages(
      settleUndecidedCards(stuck, isCard),
    );
    expect(model.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "user",
    ]);
  });

  it("leaves the transcript it was given alone", () => {
    settleUndecidedCards(stuck, isCard);
    expect(stateOf(stuck[1], 1).state).toBe("input-available");
  });

  it("never claims the proposal was accepted or the record changed", () => {
    expect(LEFT_UNDECIDED).not.toBe(UPDATED);
    expect(LEFT_UNDECIDED).toMatch(/neither accepted nor dismissed/);
  });
});

describe("what settling leaves alone", () => {
  it("keeps a card nobody has replied past waiting on its click", () => {
    const waiting = [
      user("u1", "log this"),
      assistant("a1", toolPart("propose_use_case", "input-available")),
    ];
    expect(settleUndecidedCards(waiting, isCard)).toEqual(waiting);
  });

  it("keeps a decision that was actually made", () => {
    const decided = [
      user("u1", "fix the baseline"),
      assistant(
        "a1",
        toolPart("propose_update", "output-available", { output: UPDATED }),
      ),
      user("u2", "thanks"),
    ];
    const [, kept] = settleUndecidedCards(decided, isCard);
    expect(stateOf(kept, 0).output).toBe(UPDATED);
  });

  // A read tool cut off mid-flight is not a choice a human declined to make.
  it("puts no words in the human's mouth for a tool that isn't a card", () => {
    const cutOff = [
      user("u1", "review uc-1"),
      assistant("a1", toolPart("get_use_case", "input-available")),
      user("u2", "hello?"),
    ];
    const [, kept] = settleUndecidedCards(cutOff, isCard);
    expect(stateOf(kept, 0).state).toBe("input-available");
  });

  it("returns the same message objects when nothing needed settling", () => {
    const fine = [user("u1", "hi"), assistant("a1", { type: "text", text: "Hello." })];
    const out = settleUndecidedCards(fine, isCard);
    expect(out[0]).toBe(fine[0]);
    expect(out[1]).toBe(fine[1]);
  });
});

describe("empty assistant turns", () => {
  it("drops what a failed turn leaves behind and nothing else", () => {
    const stored = [
      user("u1", "hi"),
      assistant("a1"),
      user("u2", "hi"),
      assistant("a2", { type: "text", text: "Hello." }),
    ];
    expect(withoutEmptyAssistantTurns(stored).map((m) => m.id)).toEqual([
      "u1",
      "u2",
      "a2",
    ]);
  });
});
