---
title: Changelog
audience: everyone
updated: 2026-08-14
code:
  - src/lib/changelog.ts
  - src/server/changelog.ts
---

# Changelog

What shipped in Casespace, newest first. The [weekly post](features/whats-new.md)
reads this file and writes up the week's entries, so an entry here is how a
change reaches everyone at Clever.

**Adding a feature? Add an entry in the same commit.** Write it for the
person who will read the newsletter, not for the person who wrote the code:
what changed, and what they can now do. Name whoever asked — that is the
whole point of the attribution line, and recognition in this program is names
on work.

## The format

Entries are grouped under an `## YYYY-MM-DD` ship date, newest date first.
Each entry is an `### Title`, an optional `Requested by:` line, and a short
paragraph.

```markdown
## 2026-08-14

### One human, however their name is spelled
Requested by: Kate Schaff

"Mine" and person links now find records credited under either spelling of
someone's name.
```

`Requested by:` takes a person's name as the directory spells it; accents and
case don't matter. Leave the line off when nobody asked — an unattributed
entry is honest, an invented one is not. Add `Feedback: <id>` to point at the
in-app report it came from.

---

## 2026-08-15

### The annual-ROI note stays on the Wins page

The note an admin writes when confirming positive ROI can carry the kind of
figures that stay off open surfaces — the reason Wins is admin-only. That
note now follows the same rule everywhere it could appear: on a record's
History, over the REST API, and in the Coach, admins see it and everyone
else sees the status change without the note. Every other history note —
Qualified-gate rejection reasons included — shows exactly as before.

### Confirmed Positive ROI is set by an admin, and only by an admin

Confirmed Positive ROI and Qualified record Kate's decisions, and now the
only way a record reaches either is that decision. Every door for logging a
use case — the form, the wizard, the notes parser, the REST API, and MCP —
starts records in one of the five working statuses; the two decision stages
are granted afterward, in the app, by an admin. The status dropdown on the
create form matches what the server accepts.

### What's New reads like a blog now
Requested by: Tom Leger

Every weekly post has a permanent address — the Monday of its week, like
`/whats-new/2026-08-10` — so you can link a colleague straight to an
article and the link keeps working forever. The What's New page is now a
proper archive: the latest post in full, earlier weeks beneath it with
excerpts. And nothing is ever silently overwritten anymore: the Monday
draft never touches an existing post, and regenerating or editing one
archives the version it replaces.

### A link to Casespace explains itself
Requested by: Tom Leger

Pasting a Casespace link into Slack used to unfurl as "Sign in · Casespace"
and nothing else. The sign-in page now says what the app actually is, every
page carries a proper social-preview card and description, and structured
data tells search engines and AI tools what they're looking at — so a shared
link makes sense to someone who hasn't opened the app yet.

### A save lands whole, or not at all

Saving a record writes several things at once — the record, its credited
authors, its history. Those now land together or not at all, so a save that
fails partway can no longer strip authors from a record or leave one missing
from the movement log. The same goes for comments and links with the
notifications they raise. And if two people move the same record's status at
the same moment, the second mover now gets a clear "reload and try again"
instead of the history quietly recording a move that never happened.

### The Coach keeps its own report card
Requested by: Tom Leger

When the Coach proposes a use case, what you do next now counts for something.
Save it, fix it first, or dismiss it — and if you dismiss it, there's a line
where you can say what was off. That goes to whoever tunes the Coach, so the
next person gets a better guess instead of the same wrong one.

Admins get a new Learnings page reading the whole picture back: which fields
the Coach gets wrong most often, how far people get through the intake
interview before giving up, and every dismissal in the dismisser's own words.
It reports fields and steps, never conversations — nobody's chat with the
Coach is readable from it.

### See a record from someone else's view

You can now switch perspective and see the casebook or a record as someone
else would see it — useful for understanding what information they have access
to and how the program looks from their role.

## 2026-08-14

### A changelog the weekly letter can read
Requested by: Tom Leger

Casespace now keeps a record of its own improvements, and the Monday post
writes them up alongside the casebook's movement. Previously the tool that
tracks everyone's AI work was the one piece of AI work no post ever covered.

### A fuller guide to the Coach
Requested by: Tom Leger

The Coach's documentation now covers all four things it does — answering
questions about the program, the wizard interview, ROI review packets, and
asking about text you highlight — and explains why it structurally cannot
save a record on its own.

### Documentation, in the repo and in the app
Requested by: Tom Leger

Thirty-three pages covering every feature, concept, integration and runbook,
readable at Docs in the top nav. A test fails when a page of the app has no
documentation, so the two cannot drift apart quietly.

### One human, however their name is spelled

A login name and a directory name are often spelled differently — "Tom Leger"
signing in, "Tom Léger" on the org chart — and credit typed by hand uses
whichever one the writer reached for. "Mine" and person links now find records
credited under either.

### Mentions that look like mentions

Typing `@` in a comment opens a picker, and the person you choose renders as a
chip linking to their records. Editing a comment can name someone who wasn't
named when it was posted, and they hear about it; removing a name notifies
nobody.

### One workflow can point at another
Requested by: Tom Leger

Records can now be linked as *builds on*, *duplicates*, or *relates to*. Any
AI Lead can link any two records — spotting that two workflows are the same
thing is program knowledge, and the lead who spots it usually owns neither.
Everyone credited on either record is told.

### The field is the control

Editing controls on a record used to appear only on hover, which kept them a
secret and made them unreachable on a touch screen. They are visible all the
time now, drawn quietly, with the field reserving their width so text wraps
instead of running underneath.

### Errors that say what happened, and a way to report them

When something breaks, the message now says what broke and offers to file it
as feedback with the context attached, instead of asking you to describe an
error you never saw.

### Records are editable where you read them

Fields on a record can be changed in place, without a round trip through a
separate form. The AI approach is a set rather than a single choice, so a
workflow can be both AI-built and agentic — as Casespace itself is.

### Collect feedback on records

Every record now has a feedback section where anyone can share input — a
simpler alternative to comments when the conversation is optional. Feedback is
visible to admins and the record's owners, helping close the loop on what's
working and what isn't.

### Wins, the admin view of program success

Admins have a dedicated Wins page showing all records at Confirmed Positive ROI,
with the notes explaining the annual impact for each. Use it to build the
end-of-year impact report and surface the work that moved the needle.

## 2026-08-13

### Confirmed Positive ROI: the stage Kate sets
Requested by: Kate Schaff

An explicit stage after Qualified, set only by an admin and only with a note
articulating the annual ROI. The 15 counts records at this stage — never
derived from the ROI fields, always a subset of the 45. The notes roll up on
the admin-only Wins page for the end-of-year report.

### Comments on records, and a bell that tells you about them
Requested by: Tom Leger

Every record carries a threaded conversation, and everyone can join it —
viewers included, the one place a read-only account can write. Everyone on the
record and everyone already talking on it hears about a new comment, once,
carrying the most specific reason they have.

### The top nav collapses on a small screen

Below a certain width the navigation folds into a menu instead of wrapping.

## 2026-08-12

### Three clear doors instead of a form with subtext
Requested by: Tom Leger

Logging a use case starts with a choice: walk me through it, start from
notes, or just the form. All three converge on the same review screen, and
nothing is written until a person confirms it.

### Plain language on every unclear field

Gate explanations, ELT spelled out, and the worksheet, baseline and
functional-leader jargon defined — as hints on the form and tooltips on the
record page. Prompted by "what does a named workflow mean?" arriving from
more than one person.

### What's New is open to everyone

Reading the weekly post is no longer admin-only. Writing and editing it still
is.

### The adoption pulse charts are admin-only

Survey readings about people sit behind an admin check. The casebook, every
record, and every record's status stay open to all.

## 2026-08-05

### Casespace opens

The casebook and the program scoreboard: use-case records with a seven-stage
pipeline, a logged history behind every status change, the dashboard's
pipeline and coverage views, goals and the AI Leads roster, and Google
sign-in for anyone with a Clever address.

### The Coach, and two doors that aren't forms

A conversation that helps scope a workflow and file it, a wizard that walks
through logging one, and a notes door that turns a pasted dump into a draft
record. The AI proposes; a person confirms. It has never had a path to write
a record on its own.

### File from anywhere

Personal access tokens on your profile, a REST API under `/api/v1`, and an
MCP server so a use case can be logged from Claude Code without leaving the
editor. Title and description are enough.
