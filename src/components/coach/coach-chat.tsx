"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Proposal } from "@/lib/ai/proposal";
import { ProposalCard, UpdateProposalCard } from "./proposal-card";

interface Props {
  chatId: string;
  initialMessages?: UIMessage[];
  /** Auto-sent as the first user message when the conversation is empty. */
  kickoff?: string;
  /** Where accepted create-proposals report their source. */
  source?: "wizard" | "notes";
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
  source = "wizard",
  compact = false,
}: Props) {
  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/coach",
      body: { chatId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const [input, setInput] = useState("");
  const kickoffSent = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kickoff && !kickoffSent.current && messages.length === 0) {
      kickoffSent.current = true;
      sendMessage({ text: kickoff });
    }
  }, [kickoff, messages.length, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

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
              &ldquo;documented&rdquo; and &ldquo;Qualified+&rdquo; take.
              I never save anything without your say-so.
            </p>
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
                            source={source}
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
        className={`flex shrink-0 gap-2 border-t border-hairline pt-3 ${compact ? "px-4 pb-4" : "pb-2"}`}
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          sendMessage({ text });
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Coach…"
          aria-label="Message the Coach"
          className="min-w-0 flex-1 rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
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
