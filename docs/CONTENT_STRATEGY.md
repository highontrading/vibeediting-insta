# Vibe Editing: content strategy

**What the page is for:** selling **vibeediting**, the editing tool (an MCP) that lets creators edit
their own videos by talking to the AI agent they already use (Claude Code, Codex, Cursor). It sells
at [vibeediting.app](https://vibeediting.app). The page also sells done-for-you studio work to brands.

**Who we want:** serious creators, founders, coaches, personal brands, podcasters, and the editors
and agencies who serve them. They already post talking-head video and are tired of spending hours on
each edit. Premium means the grid has to look like an agency's portfolio: if the free posts look
this good, the tool must be worth it.

**What the page never shows:** how the page itself runs (Notion, scheduling, auto-posting, APIs).
Showing the *product* (an agent editing a video from a sentence) is fine and encouraged.

## Three pillars

| Pillar | Share | What it proves | Made with | CTA |
|---|---|---|---|---|
| **Proof** | 3/week | "You can do this to *your* footage, today." | The vibeediting MCP, for real | Link in bio → vibeediting.app |
| **Studio** | 3/week | The ceiling: we are a world-class motion studio | This repo (Remotion design systems) | DM "VIBE" for brand work |
| **High-end edit** | 1/week | Real footage + studio motion: what premium clients pay agencies for | Cut with the MCP, finished in the studio | DM "VIBE" for brand work |

### Honesty rule (non-negotiable)

What a post says it was made with must be true, because buyers will expect the tool to do exactly what they saw.

- **Proof** posts show only what the vibeediting MCP actually produced. The sentence on screen is the
  exact request the edit was made from. The studio may frame the result (before/after split, prompt
  card, end card), but never retouch the edited part itself.
- **Studio** posts are labelled as studio work, never as something the MCP makes in one sentence.
- **High-end** posts say both: "Cut with vibeediting. Finished by the Vibe Editing studio."

## Weekly rhythm (one Reel a day, 09:00 IST)

| Day | Pillar | Series (Notion) | What it is |
|---|---|---|---|
| Mon | Studio | **Explainer** / **Data Story** (alternate) | A concept or a real dataset explained beautifully. Accurate, sourced. |
| Tue | Proof | **Raw → Reel** | 3s of the messy raw clip (pauses, "umm", retakes), then the finished edit: cuts, word-by-word captions, hook title, punch-in zooms. |
| Wed | Studio | **Brand Film** / **UI Motion** (alternate) | A launch spot or product demo for a fictional brand or app. |
| Thu | Proof | rotate **One Sentence Edit**, **Podcast → Shorts**, **YouTube → Shorts** | The typed sentence, then the result / one long talk becomes 3–5 clips / 16:9 reframed to 9:16 with captions. |
| Fri | High-end | **High-end Edit** | Real speech with studio motion built around it: kinetic type, charts and B-roll reacting to the words, Vox-style. |
| Sat | Studio | rotate **Title Sequence**, **Style Study**, **Kinetic Type** | Cinematic titles, a design movement in motion, or a typographic film. |
| Sun | Proof | rotate **Hinglish Captions**, **Caption Style**, **Edit Review** | Hindi/Hinglish captions (our edge for Indian creators) / one caption style showcased / the MCP critiques an edit (hook, pacing, dead air) and fixes it. |

Every so often (about once a month), swap a Studio slot for a **Showreel**, **Claymation** or
**Stop Motion** piece to keep the grid surprising.

## Proof posts: how they look

A Proof post is a 30–60s Reel with this spine:

1. **Frame 0 (hook):** the result already playing, with the claim in big type, e.g. `RAW → POSTED IN 1 SENTENCE`.
2. **Before (2–4s):** the raw clip, honest and unflattering: a visible pause, a filler word, a retake, horizontal framing.
3. **The ask (1–2s):** the exact sentence typed, on a clean prompt card in the post's design system.
4. **After (15–40s):** the MCP's export, full screen and untouched.
5. **Feature callouts:** small labels naming what happened (`41 pauses cut`, `12 fillers removed`, `captions: Hinglish`),
   using the real numbers from the tool's output.
6. **End card** with `vibeediting.app`.

Footage, in order of preference:

1. **The owner's raw clips.** A link in the row's **Footage** property (Google Drive "anyone with the link",
   Dropbox or any direct URL). These clips build the most trust.
2. **Public-domain or CC footage of people talking:** Prelinger Archives and Internet Archive educational
   films with anonymous presenters ("a 1950s classroom film, edited like a 2026 Reel" is a strong hook),
   and NASA mission footage for B-roll. Never use famous people or anyone in a way that implies they endorse
   the product, and never use footage without a clear licence (`npm run assets`, CRAFT.md → Assets).

## High-end edits: how they look

The premium-client magnet. Real speech (owner footage or public-domain), cut tight with the MCP, then
built up in the studio: kinetic type on key words, charts and diagrams drawn as the speaker explains,
cut-outs, match cuts, sound design. Think Vox, Johnny Harris, Apple keynotes. 40–60s.

## Art direction

- Studio and High-end pieces use one design system from `src/video/design/systems.ts`, rotated so the
  previous 3 posts never share a system. Proof posts frame the MCP's export in a system too.
- The quality bar, process and banned list live in `docs/CRAFT.md`. They are not optional.

## Voice

- Confident, crisp, specific. Says less, shows more.
- On screen: short lines, strong verbs, no buzzwords.
- Proof posts talk creator to creator: concrete numbers and time saved, not hype.

## Captions

**Proof:**

1. Line 1: the transformation as a hook (`3 minutes of rambling → a 38-second Reel. One sentence.`).
2. The exact sentence used, in quotes.
3. 2–3 short lines on what the tool did, with the real numbers.
4. `Edited with vibeediting: it works inside Claude Code, Codex and Cursor, on your own computer.`
5. CTA: `Edit yours the same way → vibeediting.app (link in bio)`.
6. 5–10 hashtags: always `#vibeediting #videoediting`, then relevant ones (`#reels #contentcreator #captions
   #talkinghead #podcastclips #youtubeshorts #claudecode #editingtips #hinglish #creatortools`).
7. Footage credit if it isn't the owner's (`Footage: Prelinger Archives, public domain`).

**Studio:**

1. Line 1: a hook about the piece or its subject (it shows in the feed).
2. 2–4 short lines: what this is and one craft detail (e.g. "Built in a Swiss grid, cut to 120 BPM").
   For explainers and data stories, add `Source: …`.
3. `A Vibe Editing studio piece.`
4. CTA: `Want one for your brand? DM "VIBE".`
5. 5–10 hashtags: always `#vibeediting #motiondesign`, then relevant ones (`#motiongraphics #explainervideo
   #kinetictypography #brandfilm #uidesign #titlesequence #graphicdesign #datavisualization #typography`).

**High-end:** like Studio, but line 3 is `Cut with vibeediting. Finished by the Vibe Editing studio.`
Add the footage credit.

Never mention the page's own automation: Notion, scheduling, auto-posting or APIs.

## Planning rules (used by `/plan`)

- One post per day at 09:00 IST, following the weekday table above.
- Set the row's **Pillar**, **Series** and **Format** (Proof → `Talking head`, Studio → `Motion graphics` or
  `Explainer`, High-end → `Talking head`).
- No topic repeated within 90 days. Studio subjects spread across science, money, tech, culture, design and nature.
- Proof briefs name the edit (the exact sentence to give the agent), the footage plan (owner clip if one is
  in **Footage**, else a specific public-domain source) and the numbers to call out.
- Fictional brands and products get original names that you've checked aren't famous real brands.
- Tie in real dates when they fit naturally (festivals, launches, seasons).
- Once analytics exist, plan more of what gets saves, shares, link clicks and DMs.
