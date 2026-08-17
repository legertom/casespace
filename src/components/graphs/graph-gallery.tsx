"use client";

import { useState } from "react";
import { TARGET_DOCUMENTED } from "@/lib/domain";
import { distinctSplit } from "@/lib/pipeline-shapes";
import {
  AttritionRibbon,
  BeckDiagram,
  CoreSample,
  CrowdingMap,
  JourneyBeeswarm,
  LockStaircase,
  OriginalBars,
  PlatformQueues,
  RibbonWithPlatforms,
  RuledTable,
  StageStrip,
  SubwayLine,
  TaperedRoute,
  UniformRoute,
  UnitMarks,
  ZonedMap,
  type SpecimenProps,
} from "./specimens";
import {
  ArrivalsDepartures,
  DwellPlatform,
  JourneyTracks,
  PipelineOverTime,
  StageByTeam,
} from "./proposals";

/** A plausible shape for the pipeline at the 45-record target. */
const AT_TARGET = [12, 9, 6, 7, 4, 4, 3];

type Draw = (p: SpecimenProps) => React.ReactNode;

interface Entry {
  no: string;
  name: string;
  verdict: string;
  draw: Draw;
  badge?: "shipped" | "replaced" | "needs-data";
}

const REPLACED: Entry = {
  no: "00",
  name: "The original bars",
  badge: "replaced",
  verdict:
    "Bar length is share of the busiest stage, so the busiest stage is always full width no matter what it holds.",
  draw: OriginalBars,
};

const SHIPPED: Entry = {
  no: "12",
  name: "Platform queues",
  badge: "shipped",
  verdict:
    "Holds its reading at one record and at forty-five. Past about sixteen at one station the crowd starts to read as an area rather than a queue, which is why the count sits under every platform in numerals.",
  draw: PlatformQueues,
};

const FAMILIES: { title: string; note: string; entries: Entry[] }[] = [
  {
    title: "Read the counts directly",
    note: "These show only what is at each stage right now. They react honestly to strange data — if the numbers look wrong, the chart looks wrong.",
    entries: [
      {
        no: "02",
        name: "Unit marks",
        verdict:
          "One square per record. Honest at small counts, where a bar chart has nothing to show. Gets busy past about sixty.",
        draw: UnitMarks,
      },
      {
        no: "03",
        name: "Stage strip",
        verdict:
          "Seven tiles, one row, almost no vertical cost. Loses magnitude comparison — the numerals do the work.",
        draw: StageStrip,
      },
      {
        no: "04",
        name: "Ruled table",
        verdict:
          "No chart at all. The most stable of the set: identical layout at every dataset, readable at twenty rows, and it carries a second column for free.",
        draw: RuledTable,
      },
      {
        no: "05",
        name: "Journey beeswarm",
        verdict:
          "Every record as a dot on one axis. Shows clumping the bars hide, but its height is hostage to the single biggest stage.",
        draw: JourneyBeeswarm,
      },
    ],
  },
  {
    title: "Read how far work got",
    note: "These encode how many records reached each stage or beyond. Because that total can only fall as you move along the pipeline, they always look plausible — shuffle the data and they never look surprised. A chart that cannot look wrong cannot warn you.",
    entries: [
      {
        no: "01",
        name: "Attrition ribbon",
        verdict:
          "A band that narrows each time work is left behind. The clearest picture of where the program stalls.",
        draw: AttritionRibbon,
      },
      {
        no: "06",
        name: "Subway line",
        verdict:
          "Track thickness is how many got this far; dots are who is waiting. Both quantities in one picture, and they account for each other exactly.",
        draw: SubwayLine,
      },
      {
        no: "07",
        name: "Route diagram, tapered",
        verdict:
          "The same idea turned vertical. The only layout that fits Approved by Functional Leader on one line without abbreviating.",
        draw: TaperedRoute,
      },
      {
        no: "08",
        name: "Ribbon with platforms",
        verdict:
          "The ribbon, with a pool under each stop for the records parked there. The band narrows by exactly the height of the pool below it.",
        draw: RibbonWithPlatforms,
      },
      {
        no: "09",
        name: "Lock staircase",
        verdict:
          "Canal locks: water level is what the chamber holds, the figure over each gate is what passed through. The metaphor is not decorative — the program already calls these gates.",
        draw: LockStaircase,
      },
      {
        no: "10",
        name: "Core sample",
        verdict:
          "One column, one cell per record, earliest at the bottom. Column height above any boundary is the number that got that far. Narrowest footprint of the set.",
        draw: CoreSample,
      },
    ],
  },
  {
    title: "Read it as a transit map",
    note: "Uniform line, stations, and a count of who is waiting at each one. The family the shipped design came from.",
    entries: [
      {
        no: "11",
        name: "Beck diagram",
        verdict:
          "The Underground treatment, dog-leg and all. Disc area is the crowd — too soft an encoding to read precisely, so the numeral carries it.",
        draw: BeckDiagram,
      },
      {
        no: "13",
        name: "Crowding map",
        verdict:
          "Every disc the same size, shaded by congestion. Answers where is work piling up better than anything else here — a different question, and one worth its own view.",
        draw: CrowdingMap,
      },
      {
        no: "14",
        name: "Route diagram, uniform",
        verdict:
          "The in-car service strip. Full station names, one dot per record, count flush right. Least map-like, most practical.",
        draw: UniformRoute,
      },
      {
        no: "15",
        name: "Zoned map",
        verdict:
          "The map plus fare zones, where the zones are the two counting rules. Zone edges land on Qualified and Confirmed Positive ROI, so the 45 and the 15 become regions of one picture.",
        draw: ZonedMap,
      },
    ],
  },
];

const PROPOSALS: Entry[] = [
  {
    no: "16",
    name: "Dwell platform",
    badge: "needs-data",
    verdict:
      "The shipped chart, with every figure shaded by how long that record has stood there. Turns how many into how many, and how stuck. Needs days-in-status, which status_changes already records.",
    draw: DwellPlatform,
  },
  {
    no: "17",
    name: "Pipeline over time",
    badge: "needs-data",
    verdict:
      "Status down one axis, the last eight weeks down the other. The one drawing here that shows a stage filling up rather than merely being full. Needs a weekly snapshot query.",
    draw: PipelineOverTime,
  },
  {
    no: "18",
    name: "Journey tracks",
    badge: "needs-data",
    verdict:
      "One track per record, marked at the station it is sitting at, sorted so the longest waits sink to the bottom of each stage. A departures board for the whole casebook.",
    draw: JourneyTracks,
  },
  {
    no: "19",
    name: "Stage by team",
    badge: "needs-data",
    verdict:
      "Where work is stuck, and whose it is. Coverage by team and the pipeline are separate sections today, so nobody can see that one team owns most of a jam. Needs a status-by-team roll-up.",
    draw: StageByTeam,
  },
  {
    no: "20",
    name: "Arrivals and departures",
    badge: "needs-data",
    verdict:
      "Per stage, how many arrived and how many moved on over four weeks. A big crowd with healthy throughput is fine; a big crowd nothing leaves is the actual problem, and no snapshot can tell them apart.",
    draw: ArrivalsDepartures,
  },
];

const BADGES = {
  shipped: { text: "On the dashboard", cls: "bg-st-confirmed/12 text-st-confirmed" },
  replaced: { text: "Replaced", cls: "bg-accent-wash text-accent" },
  "needs-data": { text: "Needs new data", cls: "bg-flag-wash text-flag" },
} as const;

function Specimen({ entry, n }: { entry: Entry; n: number[] }) {
  const Draw = entry.draw;
  const badge = entry.badge ? BADGES[entry.badge] : null;
  return (
    <article
      className={`overflow-hidden rounded-lg border bg-surface ${
        entry.badge === "shipped" ? "border-st-confirmed/40" : "border-hairline"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-b border-hairline px-5 py-3.5">
        <span className="font-mono text-xs tabular-nums text-ink-faint">{entry.no}</span>
        <h3 className="font-serif text-lg">{entry.name}</h3>
        {badge && (
          <span className={`rounded px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${badge.cls}`}>
            {badge.text}
          </span>
        )}
        <p className="basis-full max-w-prose text-sm text-ink-muted">{entry.verdict}</p>
      </div>
      <div className="overflow-x-auto px-5 py-5">
        <div className="min-w-[520px]">
          <Draw n={n} />
        </div>
      </div>
    </article>
  );
}

export function GraphGallery({ live }: { live: number[] }) {
  const [n, setN] = useState<number[]>(live);
  const [mode, setMode] = useState<"live" | "target" | "shuffle">("live");
  const total = n.reduce((a, b) => a + b, 0);

  function choose(next: "live" | "target" | "shuffle") {
    setMode(next);
    if (next === "live") setN(live);
    else if (next === "target") setN(AT_TARGET);
    else setN(distinctSplit(TARGET_DOCUMENTED, 7));
  }

  const controls = [
    ["live", `Live · ${live.reduce((a, b) => a + b, 0)} records`],
    ["target", `At target · ${TARGET_DOCUMENTED}`],
    ["shuffle", `Shuffle ${TARGET_DOCUMENTED}`],
  ] as const;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-10 border-y border-hairline bg-paper/95 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs uppercase tracking-wider text-ink-faint">Data</span>
          {controls.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => choose(key)}
              className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                mode === key
                  ? "border-accent bg-accent-wash font-medium text-accent"
                  : "border-hairline-strong text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
          <p className="basis-full text-xs tabular-nums text-ink-faint">
            {n.map((v, i) => `${["Discovery", "FL Approved", "Building", "Testing", "Launched", "Qualified", "ROI"][i]} ${v}`).join("   ")}
            {mode !== "live" && " · illustrative, not the casebook"}
          </p>
        </div>
      </div>

      <div className="space-y-16">
        <section className="space-y-5">
          <div className="max-w-prose space-y-3">
            <h2 className="font-serif text-2xl">What was wrong with the old one</h2>
            <p className="text-ink-muted">
              Seven bars, each scaled against the busiest stage. That works when
              the numbers are large and spread out; ours are neither. The busiest
              stage is always a full-width bar, so a stage holding 3 and a stage
              holding 40 look identical — and an empty stage got a stub of colour
              that read as a small non-zero value.
            </p>
          </div>
          <Specimen entry={REPLACED} n={n} />
        </section>

        <section className="space-y-5">
          <div className="max-w-prose space-y-3">
            <h2 className="font-serif text-2xl">What shipped</h2>
            <p className="text-ink-muted">
              A transit line. One station per status, one standing figure for
              every record waiting there, so a busy stage is a crowded platform.
              A figure is always the same size — a busier station stands deeper,
              never denser — and crowds wrap into ranks of eight, spread evenly,
              so no rank is ever left holding a single figure.
            </p>
          </div>
          <Specimen entry={SHIPPED} n={n} />
        </section>

        <section className="space-y-12">
          <div className="max-w-prose space-y-3">
            <h2 className="font-serif text-2xl">The alternatives</h2>
            <p className="text-ink-muted">
              Fifteen designs were drawn against the same data; the one above
              is the fifteenth. Here are the fourteen that were not chosen,
              grouped into three families by what they encode — the family
              matters more than the styling, because it decides which question
              a chart can answer at all.
            </p>
          </div>
          {FAMILIES.map((family) => (
            <div key={family.title} className="space-y-5">
              <div className="max-w-prose space-y-2 border-t border-hairline pt-5">
                <h3 className="font-serif text-xl">{family.title}</h3>
                <p className="text-sm text-ink-muted">{family.note}</p>
              </div>
              <div className="space-y-5">
                {family.entries.map((entry) => (
                  <Specimen key={entry.no} entry={entry} n={n} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <div className="max-w-prose space-y-3 border-t border-hairline pt-5">
            <h2 className="font-serif text-2xl">Five worth considering next</h2>
            <p className="text-ink-muted">
              Every drawing above answers the same question: how many records are
              at each status right now. These five ask something the dashboard
              cannot currently answer, because each needs a dimension we record
              but never query — how long a record has stood where it is, how the
              crowd moved week to week, whose team it belongs to.
            </p>
            <p className="text-sm text-flag">
              The shapes are real. The numbers in them are derived from the
              counts above, not measured, so read the form and ignore the
              figures.
            </p>
          </div>
          <div className="space-y-5">
            {PROPOSALS.map((entry) => (
              <Specimen key={entry.no} entry={entry} n={n} />
            ))}
          </div>
        </section>

        <section className="max-w-prose space-y-4 border-t border-hairline pt-5">
          <h2 className="font-serif text-2xl">How it was decided</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Honest at 1", "Most stages hold a handful of records. Anything needing large numbers to say something was out."],
              ["Honest at 45", `Every design was drawn against the live casebook, the ${TARGET_DOCUMENTED}-record target, and randomly shuffled counts.`],
              ["Able to look wrong", "The cumulative family always looks reasonable whatever the data does. That ruled out six otherwise strong options."],
              ["The number you click matches the number you land on", "Each station links to its own filtered list. A chart of running totals would show one number and deliver another."],
              ["Legible without instruction", "No legend, no scale to consult. A crowded platform explains itself to someone opening the dashboard for the first time."],
            ].map(([term, detail]) => (
              <div key={term}>
                <dt className="font-medium">{term}</dt>
                <dd className="text-ink-muted">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
