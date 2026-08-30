"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiscoveryCheckpoint } from "@/lib/ai/discovery";
import type { Proposal } from "@/lib/ai/proposal";
import type { FeedbackProposal } from "@/lib/ai/feedback-proposal";
import type { CoachIntent } from "@/lib/domain";
import { ProposalCard, UpdateProposalCard } from "./proposal-card";
import { DiscoveryCheckpointCard } from "./discovery-checkpoint-card";
import { FeedbackProposalCard } from "./feedback-proposal-card";

interface Props {
  chatId: string;
  initialMessages?: UIMessage[];
  /** Auto-sent as the first user message when the conversation is empty. */
  kickoff?: string;
  /**
   * Text dropped into the composer from elsewhere in the app (a field's Coach
   * button, the selection tooltip). `nonce` changes per ask so the same text
   * twice still lands.
   */
  seed?: { text: string; nonce: number };
  /** Where accepted create-proposals report their source. */
  source?: "wizard" | "notes";
  /** What this conversation was opened to do — stored on the chat, once. */
  intent?: CoachIntent;
  /**
   * The record this conversation was opened from. Sent only so a brand-new
   * chat can record it; the server ignores it for a chat that already exists
   * and re-reads its own stored context. See lib/ai/coach-intent.
   */
  useCaseId?: string;
  compact?: boolean;
}

function ReadToolChip({ label }: { label: string }) {
  return (
    <p className="my-1 text-xs text-ink-faint">
      <span aria-hidden>◦ </span>
      {label}
    </p>
  );
}

export function CoachChat({
  chatId,
  initialMessages,
  kickoff,
  seed,
  source = "wizard",
  intent = "qa",
  useCaseId,
  compact = false,
}: Props) {
  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/coach",
      body: { chatId, intent, useCaseId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  // A record that came out of a Discovery conversation says so, rather than
  // borrowing the wizard's label — the two doors are only distinguishable in
  // coach_events if they report themselves differently.
  const proposalSource = intent === "discovery" ? "discovery" : source;
  const [input, setInput] = useState("");
  const kickoffSent = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seededNonce = useRef<number | null>(null);

  useEffect(() => {
    if (kickoff && !kickoffSent.current && messages.length === 0) {
      kickoffSent.current = true;
      sendMessage({ text: kickoff });
    }
  }, [kickoff, messages.length, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  // A seeded ask lands in the composer with the caret after it, so the user
  // types their question onto the end and sends when they're ready. Applied
  // once per nonce — asking twice appends, a re-run of this effect doesn't.
  useEffect(() => {
    if (!seed || seededNonce.current === seed.nonce) return;
    seededNonce.current = seed.nonce;
    setInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${seed.text}` : seed.text));
    const el = inputRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = el.value.length;
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [seed]);

  const busy = status === "submitted" || status === "streaming";

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`min-h-0 flex-1 overflow-y-auto ${compact ? "px-4 py-3" : "py-2"}`}
        aria-live="polite"
      >
        {messages.length === 0 && !busy && (
          <div className="py-8 text-sm text-ink-muted">
            <p className="font-serif text-lg text-ink">
              What are you working on?
            </p>
            <p className="mt-2 max-w-md leading-relaxed">
              I can walk you through logging a use case, check the scoreboard,
              review a record&rsquo;s ROI evidence, or explain what
              &ldquo;documented&rdquo; and &ldquo;Confirmed Positive ROI&rdquo;
              take. If something in Casespace is broken or awkward, tell me and
              I&rsquo;ll write it up for the admins. I never save anything
              without your say-so.
            </p>
            {/* Quick starts, not a landing page. Discovery is first because
                it is the capability nobody would guess is here; the two
                below it are the ones people already know to ask for. Only on
                the full page — the panel points at it from its header, since
                a Discovery conversation wants the room. */}
            {!compact && (
              <ul className="mt-6 max-w-md space-y-2">
                <li>
                  <Link
                    href="/coach?intent=discovery"
                    className="block rounded-md border border-hairline-strong px-3.5 py-2.5 hover:bg-surface"
                  >
                    <span className="text-ink">Work through an idea</span>
                    <span className="mt-0.5 block text-ink-faint">
                      Untangle a problem and figure out the next useful step.
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/coach?intent=wizard"
                    className="block rounded-md border border-hairline-strong px-3.5 py-2.5 hover:bg-surface"
                  >
                    <span className="text-ink">Log a use case</span>
                    <span className="mt-0.5 block text-ink-faint">
                      Walk through the structured intake.
                    </span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="block w-full rounded-md border border-hairline-strong px-3.5 py-2.5 text-left hover:bg-surface"
                  >
                    <span className="text-ink">Ask the Coach</span>
                    <span className="mt-0.5 block text-ink-faint">
                      Ask about Casespace or the program.
                    </span>
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className="py-2">
            {message.role === "user" ? (
              <div className="ml-8 rounded-md bg-accent-wash px-3.5 py-2.5 text-sm leading-relaxed">
                {message.parts.map((part, i) =>
                  part.type === "text" ? <span key={i}>{part.text}</span> : null,
                )}
              </div>
            ) : (
              <div className="text-sm leading-relaxed">
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div key={i} className="coach-md">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      );
                    case "tool-search_use_cases":
                      return <ReadToolChip key={i} label="Searched the casebook" />;
                    case "tool-get_use_case":
                      return <ReadToolChip key={i} label="Read the record" />;
                    case "tool-get_progress":
                      return <ReadToolChip key={i} label="Checked the scoreboard" />;
                    case "tool-get_discovery_history":
                      return (
                        <ReadToolChip key={i} label="Read your earlier checkpoints" />
                      );
                    case "tool-propose_discovery_checkpoint": {
                      if (part.state === "input-streaming")
                        return (
                          <ReadToolChip key={i} label="Writing up a checkpoint…" />
                        );
                      if (
                        part.state === "input-available" ||
                        part.state === "output-available"
                      ) {
                        return (
                          <DiscoveryCheckpointCard
                            key={part.toolCallId}
                            checkpoint={part.input as DiscoveryCheckpoint}
                            chatId={chatId}
                            settled={
                              part.state === "output-available"
                                ? String(part.output)
                                : undefined
                            }
                            onDecision={(outcome) =>
                              addToolOutput({
                                tool: "propose_discovery_checkpoint",
                                toolCallId: part.toolCallId,
                                output: outcome,
                              })
                            }
                          />
                        );
                      }
                      return null;
                    }
                    case "tool-propose_use_case": {
                      if (part.state === "input-streaming")
                        return <ReadToolChip key={i} label="Drafting a proposal…" />;
                      if (
                        part.state === "input-available" ||
                        part.state === "output-available"
                      ) {
                        return (
                          <ProposalCard
                            key={part.toolCallId}
                            proposal={part.input as Proposal}
                            source={proposalSource}
                            proposalRef={part.toolCallId}
                            chatId={chatId}
                            settled={
                              part.state === "output-available"
                                ? String(part.output)
                                : undefined
                            }
                            onDecision={(outcome) =>
                              addToolOutput({
                                tool: "propose_use_case",
                                toolCallId: part.toolCallId,
                                output: outcome,
                              })
                            }
                          />
                        );
                      }
                      return null;
                    }
                    case "tool-propose_update": {
                      if (part.state === "input-streaming")
                        return <ReadToolChip key={i} label="Drafting an edit…" />;
                      if (
                        part.state === "input-available" ||
                        part.state === "output-available"
                      ) {
                        const input = part.input as {
                          id: string;
                          reason: string;
                          changes: Partial<Proposal>;
                        };
                        return (
                          <UpdateProposalCard
                            key={part.toolCallId}
                            id={input.id}
                            reason={input.reason}
                            changes={input.changes}
                            settled={
                              part.state === "output-available"
                                ? String(part.output)
                                : undefined
                            }
                            onDecision={(outcome) =>
                              addToolOutput({
                                tool: "propose_update",
                                toolCallId: part.toolCallId,
                                output: outcome,
                              })
                            }
                          />
                        );
                      }
                      return null;
                    }
                    case "tool-propose_feedback": {
                      if (part.state === "input-streaming")
                        return (
                          <ReadToolChip key={i} label="Writing up the feedback…" />
                        );
                      if (
                        part.state === "input-available" ||
                        part.state === "output-available"
                      ) {
                        return (
                          <FeedbackProposalCard
                            key={part.toolCallId}
                            proposal={part.input as FeedbackProposal}
                            settled={
                              part.state === "output-available"
                                ? String(part.output)
                                : undefined
                            }
                            onDecision={(outcome) =>
                              addToolOutput({
                                tool: "propose_feedback",
                                toolCallId: part.toolCallId,
                                output: outcome,
                              })
                            }
                          />
                        );
                      }
                      return null;
                    }
                    default:
                      return null;
                  }
                })}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <p className="py-2 text-xs text-ink-faint" role="status">
            Thinking…
          </p>
        )}
        {error && (
          <p role="alert" className="my-2 border-l-2 border-accent bg-accent-wash px-3 py-2 text-sm">
            {error.message.includes("AI features")
              ? error.message
              : "The Coach hit a snag. Try sending that again."}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className={`flex shrink-0 items-end gap-2 border-t border-hairline pt-3 ${compact ? "px-4 pb-4" : "pb-2"}`}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={inputRef}
          rows={input.includes("\n") ? 4 : 1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter is a newline, which quoted asks need.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask the Coach…"
          aria-label="Message the Coach"
          className="min-w-0 flex-1 resize-y rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-ink px-3.5 py-2 text-sm text-paper hover:bg-ink/85 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
