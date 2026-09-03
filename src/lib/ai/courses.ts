/**
 * The DeepLearning.AI course catalogue, and the rule for which of them a
 * particular use case actually warrants.
 *
 * Every course here is free to take, which is checked below and is the only
 * claim the Coach is allowed to make about cost. The catalogue is a curated
 * subset of the ~119 courses on deeplearning.ai, not a mirror of it: most of
 * that catalogue is model-building work — quantization, federated learning,
 * pretraining, GRPO — that no Casespace use case has ever needed. A wider list
 * would not make the Coach more helpful, it would make it wrong more often,
 * and one irrelevant suggestion costs more trust than three good ones earn.
 *
 * Matching is deliberately pure and deterministic. The model does not choose
 * from a list of courses; it hands over what the interview established and
 * gets back the courses that clear a threshold. That is what makes "it
 * recommended a course that does not exist" and "it recommended vLLM to a
 * recruiter" unreachable states rather than unlikely ones.
 *
 * Deliberately absent: duration and level. Both are rendered client-side on
 * deeplearning.ai, neither is in the page's structured data, and both change
 * when a course is revised. A stale "2h, Intermediate" in the Coach's mouth is
 * exactly the small wrongness this feature cannot afford, and the course page
 * one click away states both correctly.
 *
 * Catalogue verified against deeplearning.ai on 2026-09-02.
 */
import type { Approach, Department } from "@/lib/domain";

export const COURSE_BASE_URL = "https://www.deeplearning.ai/courses/";

export function courseUrl(slug: string): string {
  return COURSE_BASE_URL + slug;
}

/**
 * What a course is about, expressed as things a use case can be about. These
 * are not deeplearning.ai's topic tags — those are organised around what a
 * course teaches, and these are organised around what somebody logging a
 * workflow would recognise as their own problem.
 */
export const COURSE_TAGS = [
  "prompting",
  "agents",
  "automation",
  "ai-built",
  "coding-agents",
  "code-review",
  "mcp",
  "rag",
  "documents",
  "structured-output",
  "evaluation",
  "accuracy",
  "safety",
  "data-analysis",
  "nontechnical",
  "python",
  "voice",
  "browser",
  "memory",
  "production",
  "foundations",
] as const;

export type CourseTag = (typeof COURSE_TAGS)[number];

export interface Course {
  slug: string;
  title: string;
  /** deeplearning.ai's own one-line description, taken from the course page. */
  summary: string;
  /** Who teaches it, when that is not DeepLearning.AI alone. */
  provider?: string;
  tags: CourseTag[];
  /**
   * A tag that must carry a signal before this course is eligible at all,
   * whatever else it scores. This is the guard against the plausible-but-wrong
   * suggestion: a Python course is not for somebody who does not write Python,
   * however well its other tags happen to line up.
   */
  requires?: CourseTag;
  /**
   * Courses that answer the same question. At most one per family is ever
   * suggested — two courses on agent memory in the same breath reads as a
   * search result, not a recommendation.
   */
  family?: string;
}

/**
 * The catalogue, ordered roughly by how often a Casespace use case touches it.
 */
export const COURSES: Course[] = [
  // --- Using AI well, no code required -----------------------------------
  {
    slug: "ai-prompting-for-everyone",
    title: "AI Prompting for Everyone",
    summary:
      "Become an AI power user. From finding information to building apps, develop the prompting skills that get real, useful results from today's most powerful AI models.",
    tags: ["prompting", "nontechnical", "foundations"],
    family: "prompting-intro",
  },
  {
    slug: "generative-ai-for-everyone",
    title: "Generative AI for Everyone",
    summary:
      "Learn generative AI's capabilities and limitations, with real-world examples and its impact on business and society.",
    tags: ["nontechnical", "foundations"],
    family: "genai-intro",
  },
  {
    slug: "chatgpt-prompt-eng",
    title: "ChatGPT Prompt Engineering for Developers",
    summary:
      "Learn the fundamentals of prompt engineering: effective prompting, and using LLMs for summarizing, inferring, transforming, and expanding.",
    tags: ["prompting", "python"],
    requires: "python",
    family: "prompting-intro",
  },
  {
    slug: "how-transformer-llms-work",
    title: "How Transformer LLMs Work",
    summary:
      "Understand the transformer architecture that powers LLMs, so you can use them more effectively.",
    tags: ["foundations"],
    family: "genai-intro",
  },

  // --- Building something without being an engineer -----------------------
  {
    slug: "build-with-andrew",
    title: "Build with Andrew",
    summary:
      "If you've never written code before, this is the one. In under 30 minutes, describe an idea in words and let AI turn it into an app.",
    tags: ["ai-built", "nontechnical"],
    requires: "nontechnical",
    family: "vibe-coding",
  },
  {
    slug: "vibe-coding-101-with-replit",
    title: "Vibe Coding 101 with Replit",
    summary:
      "Design, build, and deploy apps with an AI coding agent in an integrated web development environment.",
    provider: "Replit",
    tags: ["ai-built", "nontechnical"],
    requires: "nontechnical",
    family: "vibe-coding",
  },
  {
    slug: "fast-prototyping-of-genai-apps-with-streamlit",
    title: "Fast Prototyping of GenAI Apps with Streamlit",
    summary:
      "Prototype and deploy GenAI apps using an MVP workflow, prompt engineering, and RAG.",
    provider: "Snowflake",
    tags: ["ai-built", "python"],
    requires: "python",
  },
  {
    slug: "ai-python-for-beginners",
    title: "AI Python for Beginners",
    summary:
      "Learn Python with AI assistance — writing, testing, and debugging code, and building real AI applications.",
    tags: ["python", "nontechnical"],
    requires: "python",
  },

  // --- Coding agents ------------------------------------------------------
  {
    slug: "claude-code-a-highly-agentic-coding-assistant",
    title: "Claude Code: A Highly Agentic Coding Assistant",
    summary: "Explore, build, and refine codebases with Claude Code.",
    provider: "Anthropic",
    tags: ["coding-agents", "ai-built"],
    family: "coding-agents",
  },
  {
    slug: "spec-driven-development-with-coding-agents",
    title: "Spec-Driven Development with Coding Agents",
    summary:
      "Move beyond vibe coding: write clear specs that give your coding agent the context it needs to build intentional, maintainable software.",
    provider: "JetBrains",
    tags: ["coding-agents", "ai-built"],
    family: "coding-practice",
  },
  {
    slug: "agent-skills-with-anthropic",
    title: "Agent Skills with Anthropic",
    summary:
      "Equip agents with expert on-demand knowledge for reliable coding, research, and data analysis workflows.",
    provider: "Anthropic",
    tags: ["coding-agents", "agents"],
  },
  {
    slug: "ai-code-review",
    title: "AI Code Review",
    summary:
      "Make AI code review effective — running reviews early, giving the reviewer the right context, and building your own review agent.",
    provider: "Qodo",
    tags: ["coding-agents", "code-review"],
    requires: "code-review",
    family: "code-review",
  },
  {
    slug: "ai-coding-workflows-from-cloud-to-local",
    title: "AI Coding Workflows: From Cloud to Local",
    summary:
      "Structure work for smaller models, switch coding agents, and move from cloud to hybrid and fully local workflows, weighing cost, speed, and usage.",
    provider: "JetBrains",
    tags: ["coding-agents"],
    family: "coding-practice",
  },

  // --- Agents -------------------------------------------------------------
  {
    slug: "agentic-ai",
    title: "Agentic AI",
    summary:
      "Build agentic AI systems that take action through iterative, multi-step workflows.",
    tags: ["agents"],
    family: "agents-intro",
  },
  {
    slug: "multi-ai-agent-systems-with-crewai",
    title: "Multi AI Agent Systems with crewAI",
    summary:
      "Automate business workflows with multi-agent systems, designing and prompting a team of AI agents in natural language.",
    provider: "crewAI",
    tags: ["agents", "automation"],
    family: "multi-agent",
  },
  {
    slug: "mcp-build-rich-context-ai-apps-with-anthropic",
    title: "MCP: Build Rich-Context AI Apps with Anthropic",
    summary:
      "Build AI apps that reach tools, data, and prompts using the Model Context Protocol.",
    provider: "Anthropic",
    tags: ["mcp", "agents"],
  },
  {
    slug: "agent-memory-building-memory-aware-agents",
    title: "Agent Memory: Building Memory-Aware Agents",
    summary:
      "Build an agent memory system that stores, retrieves, and refines knowledge across sessions, turning a stateless agent into one that learns.",
    tags: ["memory", "agents"],
    requires: "memory",
    family: "agent-memory",
  },
  {
    slug: "building-adaptive-ai-agents",
    title: "Building Adaptive AI Agents",
    summary:
      "Agents repeat mistakes because they carry nothing between sessions. Turn agent traces into reusable, human-approved skills so agents improve with every run.",
    provider: "Oracle",
    tags: ["memory", "agents"],
    requires: "memory",
    family: "agent-memory",
  },
  {
    slug: "building-ai-browser-agents",
    title: "Building AI Browser Agents",
    summary:
      "Build agents that navigate and interact with websites, and learn how to make them more reliable.",
    provider: "AGI Inc",
    tags: ["browser", "agents", "automation"],
    requires: "browser",
    family: "browser",
  },
  {
    slug: "building-toward-computer-use-with-anthropic",
    title: "Building toward Computer Use with Anthropic",
    summary:
      "Learn how an AI assistant is built to use computers and accomplish tasks on them.",
    provider: "Anthropic",
    tags: ["browser", "automation"],
    requires: "browser",
    family: "browser",
  },

  // --- Getting a workflow to run on its own -------------------------------
  {
    slug: "orchestrating-workflows-for-genai-applications",
    title: "Orchestrating Workflows for GenAI Applications",
    summary:
      "Turn a GenAI prototype into an automated pipeline using Apache Airflow.",
    provider: "Astronomer",
    tags: ["automation", "production"],
  },
  {
    slug: "event-driven-agentic-document-workflows",
    title: "Event-Driven Agentic Document Workflows",
    summary:
      "Build an event-driven agentic workflow that processes documents and fills forms, with RAG and human-in-the-loop feedback.",
    provider: "LlamaIndex",
    tags: ["documents", "automation", "agents"],
    requires: "documents",
  },

  // --- Documents and extraction -------------------------------------------
  {
    slug: "document-ai-from-ocr-to-agentic-doc-extraction",
    title: "Document AI: From OCR to Agentic Doc Extraction",
    summary:
      "Build agentic systems that parse documents and extract information grounded in charts, tables, and forms.",
    provider: "LandingAI",
    tags: ["documents", "structured-output"],
    family: "documents",
  },
  {
    slug: "preprocessing-unstructured-data-for-llm-applications",
    title: "Preprocessing Unstructured Data for LLM Applications",
    summary:
      "Extract and normalize content from a wide variety of document types so a retrieval system can actually use it.",
    tags: ["documents", "rag"],
    family: "documents",
  },
  {
    slug: "getting-structured-llm-output",
    title: "Getting Structured LLM Output",
    summary:
      "Generate structured outputs that production software can rely on.",
    tags: ["structured-output"],
    family: "structured",
  },
  {
    slug: "pydantic-for-llm-workflows",
    title: "Pydantic for LLM Workflows",
    summary:
      "Build reliable LLM applications with structured outputs and validated data using Pydantic.",
    tags: ["structured-output", "python"],
    requires: "python",
    family: "structured",
  },
  {
    slug: "function-calling-and-data-extraction-with-llms",
    title: "Function-Calling and Data Extraction with LLMs",
    summary:
      "Apply function-calling to expand what LLM and agent applications can do.",
    tags: ["structured-output", "python"],
    requires: "python",
    family: "structured",
  },

  // --- Answering from your own material -----------------------------------
  {
    slug: "retrieval-augmented-generation",
    title: "Retrieval Augmented Generation (RAG)",
    summary:
      "Develop production-ready RAG applications, from architecture through deployment and evaluation.",
    tags: ["rag"],
    family: "rag-core",
  },
  {
    slug: "advanced-retrieval-for-ai",
    title: "Advanced Retrieval for AI with Chroma",
    summary:
      "Recognise poor query results and use advanced retrieval techniques to improve relevance.",
    provider: "Chroma",
    tags: ["rag", "accuracy"],
    requires: "rag",
    family: "rag-core",
  },

  // --- Data and analysis ---------------------------------------------------
  {
    slug: "building-your-own-database-agent",
    title: "Building Your Own Database Agent",
    summary:
      "Interact with tabular data and SQL databases in natural language for more accessible data analysis.",
    provider: "Microsoft",
    tags: ["data-analysis", "agents"],
    requires: "data-analysis",
    family: "data-agents",
  },
  {
    slug: "building-and-evaluating-data-agents",
    title: "Building and Evaluating Data Agents",
    summary:
      "Build, evaluate, and improve a multi-agent system that plans its steps, connects to data sources, and produces insights.",
    tags: ["data-analysis", "agents", "evaluation"],
    requires: "data-analysis",
    family: "data-agents",
  },
  {
    slug: "jupyter-ai-coding-in-notebooks",
    title: "Jupyter AI: Coding in Notebooks",
    summary:
      "Code with AI in Jupyter notebooks — generate code, get explanations, and analyse data.",
    tags: ["data-analysis", "python"],
    requires: "python",
  },

  // --- Knowing whether it works -------------------------------------------
  {
    slug: "evaluating-ai-agents",
    title: "Evaluating AI Agents",
    summary:
      "Systematically evaluate, improve, and iterate on AI agents using structured assessments.",
    provider: "Arize AI",
    tags: ["evaluation", "agents", "production"],
    requires: "evaluation",
    family: "evals",
  },
  {
    slug: "improving-accuracy-of-llm-applications",
    title: "Improving Accuracy of LLM Applications",
    summary:
      "Systematically improve accuracy with evaluation, prompting, and memory tuning.",
    tags: ["accuracy", "evaluation"],
    family: "evals",
  },
  {
    slug: "automated-testing-llmops",
    title: "Automated Testing for LLMOps",
    summary:
      "Build a CI pipeline that evaluates your LLM application on every change.",
    tags: ["evaluation", "production", "python"],
    requires: "python",
    family: "evals",
  },

  // --- Risk, governance, and going live ------------------------------------
  {
    slug: "governing-ai-agents",
    title: "Governing AI Agents",
    summary:
      "Build data governance into an agent's workflow so it handles data safely, securely, and accurately.",
    tags: ["safety", "agents", "production"],
    requires: "safety",
    family: "governance",
  },
  {
    slug: "safe-and-reliable-ai-via-guardrails",
    title: "Safe and Reliable AI via Guardrails",
    summary:
      "Take an LLM application past proof-of-concept and into production with guardrails.",
    provider: "GuardrailsAI",
    tags: ["safety", "production"],
    requires: "safety",
    family: "governance",
  },
  {
    slug: "red-teaming-llm-applications",
    title: "Red Teaming LLM Applications",
    summary:
      "Identify and evaluate vulnerabilities in LLM applications to make them safer.",
    provider: "Giskard",
    tags: ["safety", "evaluation"],
    requires: "safety",
  },

  // --- Voice ---------------------------------------------------------------
  {
    slug: "voice-for-ai-agents-and-applications",
    title: "Voice for AI Agents and Applications",
    summary:
      "Add voice to agents and applications using three integration patterns: embedded, layered, and voice as a callable tool.",
    provider: "Vocal Bridge",
    tags: ["voice", "agents"],
    requires: "voice",
  },
];

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * What the wizard learned, in the shape the matcher reads it.
 *
 * Every field is optional because the wizard is allowed to end early and a
 * sparse record is a valid one. With nothing but a title and a description,
 * the text signals below still work.
 */
export interface CourseSignals {
  /** Title, description, and current steps, run together. */
  text?: string;
  /** Tool names as the person gave them — "Claude Code", "Zapier". */
  aiTools?: string[];
  approaches?: Approach[];
  department?: Department | null;
  ratings?: {
    dataAvailability?: number | null;
    risk?: number | null;
    evaluationClarity?: number | null;
    maintenanceBurden?: number | null;
  } | null;
}

export interface CourseSuggestion {
  slug: string;
  title: string;
  url: string;
  summary: string;
  provider?: string;
  /** The signals this course was matched on, so the Coach's "why" is grounded. */
  matchedOn: CourseTag[];
}

/**
 * Text patterns, kept narrow on purpose.
 *
 * The temptation with each of these is to widen it and catch more. Widening
 * costs precision, and precision is the whole product here — `documents` does
 * not match the bare word "document" because half of Casespace is about
 * documenting things, and `voice` matches voice *interfaces* rather than call
 * transcripts, which are a reading problem and not a speech one.
 */
const TAG_PATTERNS: Partial<Record<CourseTag, RegExp>> = {
  prompting:
    /\b(prompt(s|ing|ed)?|chatgpt|claude\.ai|draft(s|ing|ed)?|rewrit(e|es|ing)|summari[sz](e|es|ing|ation)|tone of voice)\b/i,
  agents: /\b(agent|agents|agentic|multi[- ]?step|autonomous|orchestrat(e|es|ing|ion))\b/i,
  automation:
    /\b(automat(e|es|ed|ing|ion)|zapier|n8n|workato|make\.com|pipeline|scheduled|nightly|trigger(s|ed)?|cron|runs? (?:itself|automatically))\b/i,
  "ai-built":
    /\b(claude code|cursor|copilot|windsurf|replit|lovable|bolt|vibe[- ]?cod(e|ed|ing)|built (?:it|this|the tool) with|internal tool)\b/i,
  "coding-agents":
    /\b(claude code|cursor|copilot|windsurf|codex|coding agent|codebase|pull requests?|code review|refactor)\b/i,
  "code-review": /\b(code review|reviews? (?:the )?pull requests?|reviewing (?:our )?code|pr review)\b/i,
  mcp: /\b(mcp|model context protocol)\b/i,
  rag: /\b(rag|retrieval|knowledge base|semantic search|vector (?:db|database|store|search)|embeddings?|answers? questions? (?:from|about|over))\b/i,
  documents:
    /\b(pdfs?|ocr|invoices?|contracts?|receipts?|r[eé]sum[eé]s?|scanned|paperwork|attachments?|purchase orders?|filled? (?:in )?forms?)\b/i,
  "structured-output":
    /\b(structured|extract(s|ed|ing|ion)?|json|schema|parse(s|d|r)?|populate(s|d)?|categoris|categoriz|classif(y|ies|ication)|tagging|csv|into (?:a )?spreadsheet)\b/i,
  evaluation:
    /\b(eval|evals|evaluat(e|es|ed|ing|ion)|benchmark|golden set|rubric|regression|spot[- ]?check|how (?:we|do we|to) know it'?s? (?:right|correct|working))\b/i,
  accuracy:
    /\b(accura(te|cy)|hallucinat(e|es|ed|ing|ion|ions)|wrong answers?|error rate|gets? it wrong|precision|false positives?)\b/i,
  safety:
    /\b(pii|personally identifiable|confidential|sensitive data|complian(t|ce)|governance|privacy|guardrails?|security review|ferpa|hipaa|soc ?2|student data)\b/i,
  "data-analysis":
    /\b(sql|queries|database|data ?warehouse|dashboards?|looker|tableau|snowflake|bigquery|redshift|spreadsheets?|excel|google sheets?|analytics|metrics|reporting)\b/i,
  python: /\b(python|jupyter|notebooks?|pandas|numpy|script(s|ed|ing)?|api endpoint|sdk)\b/i,
  voice:
    /\b(voice (?:agent|bot|assistant|interface)|speech|text[- ]to[- ]speech|ivr|phone (?:call|line|tree)|call cent(?:er|re))\b/i,
  browser:
    /\b(browser|scrap(e|es|ed|ing)|crawl(s|ed|ing)?|web(?: |-)?portal|logs? into (?:the )?(?:site|portal)|fills? (?:out|in) (?:a|the) (?:web )?form)\b/i,
  memory:
    /\b(remembers?|memory|across sessions|between sessions|forgets?|prior conversations?|conversation history)\b/i,
  production:
    /\b(production|at scale|reliabilit|uptime|monitor(s|ed|ing)?|rollout|roll it out|deploy(s|ed|ment)?|flaky|breaks? (?:a lot|often))\b/i,
};

/** Tool names the wizard collects, and what they say about what would help. */
const TOOL_SIGNALS: { pattern: RegExp; tags: Partial<Record<CourseTag, number>> }[] = [
  {
    pattern: /\b(claude code|cursor|copilot|windsurf|codex|replit|lovable|bolt)\b/i,
    tags: { "coding-agents": 3, "ai-built": 3 },
  },
  {
    pattern: /\b(claude|chatgpt|gpt|gemini|perplexity|copilot chat)\b/i,
    tags: { prompting: 2 },
  },
  {
    pattern: /\b(zapier|n8n|make|workato|power automate|tray)\b/i,
    tags: { automation: 3 },
  },
  {
    pattern: /\b(langchain|langgraph|crewai|autogen|llamaindex|dspy)\b/i,
    tags: { agents: 3, python: 2 },
  },
  {
    pattern: /\b(snowflake|looker|tableau|bigquery|dbt|metabase|hex)\b/i,
    tags: { "data-analysis": 3 },
  },
  { pattern: /\bmcp\b/i, tags: { mcp: 3 } },
];

/**
 * How the approaches are described to the model when it fills in the tool's
 * arguments. Here rather than in the route so the wording sits beside the
 * weights it drives.
 */
export const APPROACH_TAGS_NOTE =
  "Which of these the workflow uses: prompt (a person prompts a model), automation (it runs on a trigger or schedule), agentic (multi-step, it decides what to do next), built (the tool itself was built with AI, e.g. Claude Code). More than one can apply.";

const APPROACH_SIGNALS: Record<Approach, Partial<Record<CourseTag, number>>> = {
  prompt: { prompting: 3 },
  automation: { automation: 3 },
  agentic: { agents: 3 },
  built: { "ai-built": 3, "coding-agents": 2.5 },
};

/**
 * What a phrase in the person's own description is worth. Above the weight of
 * anything inferred about them, so a workflow that says "scanned invoices"
 * outranks the intro course we would otherwise offer everyone.
 */
const TEXT_MATCH_WEIGHT = 2.5;

/** A course needs this much before it is worth anyone's evening. */
export const MIN_SCORE = 2;

/** Never more than this, whatever the caller asks for. */
export const MAX_SUGGESTIONS = 3;

function bump(
  weights: Map<CourseTag, number>,
  tag: CourseTag,
  by: number,
): void {
  weights.set(tag, (weights.get(tag) ?? 0) + by);
}

/**
 * Turn what the wizard learned into weighted tags.
 *
 * Exported for the tests, which is the only way to assert that a particular
 * workflow description produces the signals it ought to.
 */
export function courseSignalWeights(
  signals: CourseSignals,
): Map<CourseTag, number> {
  const weights = new Map<CourseTag, number>();
  const text = (signals.text ?? "").slice(0, 4000);

  if (text) {
    for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
      if (pattern.test(text)) bump(weights, tag as CourseTag, TEXT_MATCH_WEIGHT);
    }
  }

  for (const toolName of signals.aiTools ?? []) {
    for (const { pattern, tags } of TOOL_SIGNALS) {
      if (!pattern.test(toolName)) continue;
      for (const [tag, by] of Object.entries(tags)) {
        bump(weights, tag as CourseTag, by);
      }
    }
  }

  for (const approach of signals.approaches ?? []) {
    for (const [tag, by] of Object.entries(APPROACH_SIGNALS[approach] ?? {})) {
      bump(weights, tag as CourseTag, by);
    }
  }

  if (signals.department === "engineering") {
    bump(weights, "python", 2);
    bump(weights, "coding-agents", 1);
  }

  // The worksheet ratings are the honest part of the interview: somebody who
  // rated their own evaluation clarity a 2 has told us more about what they
  // need than any keyword will.
  const r = signals.ratings;
  if (r) {
    if (typeof r.evaluationClarity === "number" && r.evaluationClarity <= 2) {
      bump(weights, "evaluation", 2.5);
    }
    if (typeof r.dataAvailability === "number" && r.dataAvailability <= 2) {
      bump(weights, "rag", 1.5);
    }
    if (typeof r.risk === "number" && r.risk >= 4) {
      bump(weights, "safety", 2.5);
    }
    if (typeof r.maintenanceBurden === "number" && r.maintenanceBurden >= 4) {
      bump(weights, "production", 2);
    }
  }

  // "Not an engineer" is a claim about this person, so it is only made when
  // nothing in front of us contradicts it. A weak signal by design: it can
  // lift an intro course that something else already matched, and it cannot
  // carry one on its own.
  const technical =
    (weights.get("python") ?? 0) +
    (weights.get("coding-agents") ?? 0) +
    (weights.get("ai-built") ?? 0);
  if (technical === 0) {
    bump(weights, "nontechnical", 1.5);
    bump(weights, "foundations", 1);
  }

  return weights;
}

function score(course: Course, weights: Map<CourseTag, number>): number {
  const total = course.tags.reduce(
    (sum, tag) => sum + (weights.get(tag) ?? 0),
    0,
  );
  // Divided by the spread of the course's own tags, so a broadly-tagged course
  // cannot win on breadth alone. Without this, anything tagged five ways beats
  // the one course that is actually about the person's problem.
  return total / Math.sqrt(course.tags.length);
}

/**
 * The courses this use case actually warrants, best first — and an empty list
 * when none of them do.
 *
 * Empty is a real and common answer. Most workflows people log are somebody
 * pasting a good prompt into Claude twice a week, and there is nothing on
 * deeplearning.ai they need for that.
 */
export function suggestCourses(
  signals: CourseSignals,
  limit: number = MAX_SUGGESTIONS,
): CourseSuggestion[] {
  const weights = courseSignalWeights(signals);

  const ranked = COURSES.map((course, order) => ({ course, order }))
    .filter(({ course }) =>
      course.requires ? (weights.get(course.requires) ?? 0) > 0 : true,
    )
    .map((entry) => ({ ...entry, value: score(entry.course, weights) }))
    .filter(({ value }) => value >= MIN_SCORE)
    .sort((a, b) => b.value - a.value || a.order - b.order);

  const chosen: CourseSuggestion[] = [];
  const families = new Set<string>();
  for (const { course } of ranked) {
    if (chosen.length >= Math.min(limit, MAX_SUGGESTIONS)) break;
    if (course.family) {
      if (families.has(course.family)) continue;
      families.add(course.family);
    }
    chosen.push({
      slug: course.slug,
      title: course.title,
      url: courseUrl(course.slug),
      summary: course.summary,
      ...(course.provider ? { provider: course.provider } : {}),
      matchedOn: course.tags.filter((tag) => (weights.get(tag) ?? 0) > 0),
    });
  }
  return chosen;
}
