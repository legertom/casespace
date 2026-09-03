---
title: Changelog
audience: everyone
updated: 2026-09-02
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

## 2026-09-02

### A nudge toward the Coach on every record
Requested by: Tom Leger

"Work this problem with Coach" on a record now carries a hint — *Feeling
stuck? Try this button* — for people who had not noticed it was there. It
goes away for good once you dismiss it or use it.

### Everyone has a profile, and it lists their work
Requested by: David McGeary

Click anyone's name — on the roster, on a record's credit card, on the
dashboard, in an @mention — and you land on their profile: their title, their
team if they lead one, and every use case that credits them, with a count of
how many reach Qualified and Confirmed Positive ROI. Your own is a click on
your own name in the header, or **My profile** in the menu it opens — so your
records are never far. Your page also lists anything you logged for someone
else, which counts toward them but was previously nowhere you could find it.

Names used to jump straight into the casebook's person filter. That filter is
still there — every profile links to it when you want stage tabs and search
over the same set.

### The header menus open on hover and leave when you do
Requested by: David McGeary

They used to sit open over the page until you went back and clicked the same
word again. Now hovering your name opens the menu and moving the mouse away
closes it — the notification bell and the phone menu behave the same. Your
name is also a link: click it and you land on your profile without reading
the menu at all.

On a phone, where there is no hover, the first tap opens the menu — **My
profile** is the first thing in it. Tabbing to a menu opens it too, and
Escape closes it.

### The Coach stops guessing whether you're an AI Lead
Requested by: Marley Koschel

Log a use case and the Coach would sometimes announce that you aren't an AI
Lead, so your record would only count as community work. It was reading your
sign-in's permission level and treating it as your place on the roster —
two different things, and the second one it can simply look up. Told it had
this wrong, it referred people to an admin instead of checking.

It now checks. A record's place in the program is decided by who **owns** it,
not by who typed it in or what the Coach assumed about them, so it no longer
volunteers a verdict it hasn't looked up — and when you tell it that it has
you wrong, looking it up is the first thing it does.

If the Coach told you a record of yours was community work, it was probably
wrong: as long as you were named as its owner, it counted from the moment it
was logged.

### A mistyped person link no longer shows an error page

A `?person=` link with a mangled id used to render "a server error occurred".
Now, like every other bad id in Casespace, it just isn't found — the casebook
drops the filter and a profile URL 404s.

### Profile & API tokens is now MCP & API
Requested by: Tom Leger

The page was named for two things and only ever did one of them: personal
access tokens and the setup for filing from Claude Code, Cursor, or curl. It
now says so, and the identity half of its old name moved to your profile.

## 2026-08-31

### Every stage says what it means, right on its row
Requested by: Evelyn Wong

The pipeline used to assume you already knew what "Approved by Functional
Leader" or "Qualified" stood for. Every stage on the dashboard's funnel now
carries its own one-line description, printed on the row it is already on —
nothing to hover over, nothing to go and look up. Qualified and Confirmed
Positive ROI say plainly that they are Kate's call alone, which is the
question the pipeline raises more than any other. The queues drawing, whose
stations are too narrow to print a sentence under, keeps its key underneath.

### Move any record through the pipeline, not just your own

Knowing that a workflow launched doesn't require owning its record — the AI
Lead who knows is usually not the person the record is filed under, and until
now the status control simply never appeared for them. Admins and AI Leads
can now move any record; employees still move the ones that are theirs;
viewers move none.

Where a record can be moved *to* has not changed. Everyone below admin stops
at Launched: Qualified and Confirmed Positive ROI remain Kate's decisions.
Both pipeline drawings now show that as a dashed line between Launched and
Qualified, so the one rule that stops a record mid-pipeline is drawn rather
than discovered.

## 2026-08-30

### Work an idea out with the Coach before it's a use case
Requested by: Tom Leger

The Coach has a new mode for the conversation that happens before you have a
use case. Bring a problem, a half-formed idea, an attempt that isn't working,
or just the feeling that AI might help here somehow, and it works through it
with you — one question at a time, no form to fill in.

It is not trying to get you to log anything. Its job is to get the problem
clear enough that the next useful step is obvious, and that step is often not
software: write down what the output actually has to answer, go and ask the
person who knows, check whether the data is even reachable, or try a small
thing and see. Sometimes the honest answer is that AI doesn't help here, and it
will say so.

When you've got somewhere it writes up a **Discovery checkpoint** — what you're
really solving, what's in the way, what to do next and what that should teach
you — and you decide whether to keep it. Come back later with what you learned
and it picks up from there rather than starting the interview again; each
checkpoint is kept, so you end up with the story of how the problem got
clearer. If you do want a record out of it, one click turns it into the usual
use-case proposal, which still saves nothing until you accept it.

Start from **Work through an idea** on the Coach page, the same link in the
Coach panel, or **Work this problem with Coach** on any record.

## 2026-08-29

### Tell the Coach when Casespace gets in your way
Requested by: Tom Leger

Say something in Casespace is broken, confusing, or missing and the Coach now
writes it up for the admins. It asks what you were doing and what you expected
first, then shows you the report before anything is filed — nothing goes in
without your click. Reports arrive with the page, the steps, and the Coach's
own read of whether it looks like a bug or a request, so the people fixing it
can start from something more than one line.

## 2026-08-26

### Everyone at Clever gets the Log a use case button back
Requested by: Tom Leger

The app opened to everyone on August 25, but your role was worked out the
last time you signed in — so anyone still using a session from before that
day was treated as a guest: no *Log a use case* button, and no way to write.
Casespace now checks whether you work at Clever on every request instead of
remembering an answer from weeks ago, and the button is there for every
employee, no signing out and back in required.

### The casebook filters as fast as you can think
Requested by: Tom Leger

No more Filter button. Program scope is now the casebook's tabs, the seven
statuses sit in pipeline order as a clickable rail with live counts (plus
"The 45" for qualified-or-better), and every control applies the moment you
touch it — the URL still carries every filter, so any view is a link you can
share. Active filters read back as chips you can remove one at a time.

### The search box understands what you meant
Requested by: Tom Leger

Searching now suggests use cases, people, departments, and statuses as you
type — and "pati" finds Patricia, accents and abbreviations included. Type a
phrase like `launched in css by lotte` and it offers to become those exact
filters in one click. When the built-in rules can't read a query, an Ask AI
row can turn it into filters instead — it runs only when you click it, and
what it applies is always visible chips you can correct. Searches (never
keystrokes) are logged so the vocabulary can grow around what people actually
ask for.

## 2026-08-25

### The record remembers who moved the things that count
Requested by: Tom Leger

A record's Activity stream now shows changes to the fields that move the
program's numbers or its credit: added to or removed from the program (including
the quiet admission that comes with passing the Qualified gate), owner changes,
credit changes, ELT allocation, and the four documented gates — each with who
and when, right beside the status history. Ordinary text edits stay unlogged
on purpose.

### Counting follows the owner, not the typist
Requested by: Tom Leger

Whether a new record counts toward the program now follows its **owner**: a
record owned by someone on the AI Leads roster counts, whoever enters it. So
a record logged on a lead's behalf lands in the program straight away, and
naming the owner is how you say whose work it is. A record with no owner
follows whoever logged it, as before.

### Casespace is open to everyone at Clever
Requested by: Tom Leger

Anyone with a clever.com address can now log a use case. You no longer need
to be an AI Lead: sign in, click **Log a use case**, and use whichever of the
three doors you like. What you log is yours — you can edit it, add links and
authors, and move it through the first five statuses, exactly as an AI Lead
does with theirs.

If you'd like your record to count toward the program's 45, ask your team's
AI Lead or an admin. Don't log it a second time; a duplicate doesn't help.

### Program and community records

Records now say which of the two they are. Anything logged by an AI Lead
counts toward the 45 and the 15 as before. Anything logged by anyone else —
including Tom and Kate, deliberately — is a **community** record — a full record in the casebook,
searchable and linkable and every bit as real, just not part of the H2
program's count. Community records carry a small "Community" badge so you
never have to guess which you're looking at.

The casebook opens on program records, with a filter for community
submissions or both. Your own records on the home page always show, whichever
kind they are. The dashboard, Goals, and Graphs count program records only,
and admins get a Community submissions list showing what's come in.

Two things worth flagging for anyone who watches the numbers. **Coverage by
team got stricter**: a team's dots only fill from its AI Leads' records, so a
team whose colleagues logged three things but whose lead logged none now
reads as zero — which is the question that table was always asking. And the
weekly post now has a short **From the community** section naming the people
who logged something outside the program, kept separate from every count.

## 2026-08-22

### Monthly AI Lead check-ins, at a glance

Admins can now privately track each AI Lead's August-through-December monthly
1:1s from the roster. Email addresses no longer sit permanently inside input
boxes, either: click an address when it needs editing, then save it in place.

### The H2 goals, in every weekly note

What's New now states the program's current H2 standing in every opening:
documented use cases out of 45 and confirmed positive-ROI use cases out of
15, with the in-flight work behind those numbers. It gives everyone the same
clear context for the week without pretending there is a schedule to be ahead
of or behind.

## 2026-08-20

### Point a record at the thing itself
Requested by: Tom Leger

A use case can now carry links — the live tool, the GitHub repo, a Claude
artifact, project, or skill, or anything else with a label you write. Add as
many as the workflow has; they show near the top of the record, under **Where
to find it**, and anyone can click straight through. The form asks for them
when you log a use case, and you can add or change them on the record page any
time afterwards. These are links out of Casespace at the workflow itself,
which is a different thing from **Related workflows** — that still connects
one record to another.

### The wizard asks what the form asks
Requested by: Tom Leger

Use cases logged through the Coach's wizard were arriving without build time,
because the wizard never asked. It does now — along with which AI tool the
workflow uses, where to find it, whether the success criterion has been met,
the net impact in a sentence, and where the record stands today. The proposal
card also shows what the wizard captured before you click Log it, so anything
it got wrong is something you can correct on the spot rather than find later.

### The wizard can tick the four gates, once you say so
Requested by: Tom Leger

Wizard-logged records used to arrive with all four documented gates
unticked, even when the conversation had clearly established every one of
them — so a record that was genuinely documented still counted as zero of
four until someone went and ticked them by hand. The wizard now reads the
four gates back at the end of the interview, says what each one is based on,
and asks you to confirm before it ticks anything. It sets only what you
confirm, and the proposal card lists all four, ticked and unticked, so the
Log it click is the moment a person takes responsibility for them. Nothing
is ever ticked on the Coach's own judgement — an admin reading the record
later can't tell a confirmed tick from a guessed one, so a missing tick is
much cheaper than a wrong one.

### Editing a record no longer loses your build time
Requested by: Tom Leger

Opening a record in **Edit everything** and saving used to quietly erase the
build effort, even if you never touched that field. It doesn't any more, and
the form now takes its starting values from the record itself, so no future
field can go missing the same way. If a record of yours lost its build hours
before today, it needs typing back in once.

### Admins hear when a use case is logged
Requested by: Tom Leger

Every admin now gets a notification the moment anyone logs a use case, from
any door — the form, the wizard, notes, the API, or MCP. It lands in the same
header bell as comments and links and takes you straight to the new record.
Logging your own record doesn't notify you about it.

---

## 2026-08-17

### Pick the pipeline chart you prefer
Requested by: Kate Schaff

The dashboard now offers two drawings of the pipeline and remembers which one
you chose, so it looks the way you left it next time you sign in. **Funnel**
shows how many records reached each stage or beyond, with the conversion
between stages and weak steps flagged. **Platforms** is the transit line with
a standing figure for every record waiting. Everyone starts on Funnel; switch
whenever you like, including viewers. Either way, clicking a stage still takes
you to that stage's own records.

### The pipeline, five ways, as a sales funnel
Requested by: Kate Schaff

**/graphs** now carries five ways to restructure the pipeline chart as a
sales funnel, for review. Two of them keep the standing figures from the
chart on the dashboard and simply taper it; three are funnels proper, with
conversion between stages and — in one — the widths needed to hit 45
documented and 15 confirmed. Nothing on the dashboard has changed yet.

### The pipeline chart shows its working
Requested by: Tom Leger

A new page at **/graphs** lays out twenty-one drawings of the same seven
counts: the bar chart the pipeline replaced, the fifteen designs the current
one was chosen from, and five proposals we have not built yet. Switch the
data at the top — live casebook, the 45-record target, or a random shuffle —
and every drawing redraws together, which is how they were compared. Reached
from the pipeline section of the dashboard.

## 2026-08-16

### Nothing blocks Kate
Requested by: Kate Schaff

Admins can now move a record from any status to any other — including
straight to Confirmed Positive ROI, without passing through Qualified
first. The annual-ROI note is still required to confirm, Qualified and
Confirmed Positive ROI are still admin-only in both directions, and the 15
still counts as a subset of the 45. What changed is that the pipeline's
order never stands between Kate and a decision she has already made.

### Records now ask what the workflow cost to build
Requested by: Kate Schaff

Every use case can now carry a rough estimate of the hours that went into
building it — asked when you log a workflow, editable inline in the ROI
panel, and shown next to the measurements as **Build effort**. That lets the
program weigh time spent building against time saved. A rough number is
fine, it's optional, and it never blocks a status change.

### A record's history and comments now read as one story
Requested by: Kate Schaff

The History and Comments sections on a record have merged into a single
**Activity** stream: status changes and comments, interleaved in the order
they happened, oldest first. The comment box now sits at the bottom of the
stream — where you land after reading — instead of floating between the
heading and the comments, where it was easy to lose. Threads still nest
exactly as before.

### Sign-in opens on the program
Requested by: Tom Leger

Everyone now lands on the full program dashboard, not just admins. AI Leads
still get their own use cases and the **Log a use case** button — they sit
under the dashboard rather than in front of it. Viewers get the most
recently updated records in the same spot.

### Victoria Crow Dog comes off the AI Leads roster
Requested by: Tom Leger

She is no longer an AI lead, so a fresh environment no longer seeds her onto
the roster. She stays in the directory and stays credited on the records she
authored — coming off the roster is not coming off the team.

### The pipeline is a subway map now
Requested by: Tom Leger

The pipeline on the dashboard is drawn as a transit line: one station per
status, and one standing figure for every record waiting there. A busy stage
is a crowded platform, so you can see at a glance where work is queuing up
instead of comparing seven bars that all looked the same length. Every
station still clicks through to its records.

## 2026-08-15

### History notes read in the app, not over the API
Requested by: Tom Leger

Status-change notes — rejection reasons, confirmation notes — are context
for people reading a record, so that's where they live. Over the REST API,
notes now come back only to admin tokens; every other token sees the
history's steps, dates, and names, and reads the notes in the app.

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
