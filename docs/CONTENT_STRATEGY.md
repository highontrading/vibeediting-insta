# Vibe Editing: content strategy

**What the page is:** the portfolio of the Vibe Editing system, a studio that makes motion
graphics, explainers and brand films. Every post is a finished piece of work at world-class
quality, 40–60 seconds long, showing *what you can get made with Vibe Editing*. The page sells the work.

**What the page is not:** a page about automation, APIs, AI tools or how posting works. Never
show or mention that side.

## Series (one per weekday)

| Day | Series | Notion Format | What it is |
|---|---|---|---|
| Mon | **Explainer** | Explainer | A concept explained beautifully in 45–60s (science, money, tech, design, everyday "how does X work"). Accurate, sourced. |
| Tue | **Kinetic Type** | Motion graphics | Typography-led film: a manifesto, a famous public-domain quote, a short story told in type. |
| Wed | **Brand Film** | Motion graphics | A launch spot for a fictional brand or product: identity, product beats, tagline. |
| Thu | **Data Story** | Explainer | A real, sourced dataset or fact turned into a narrative with charts and maps. |
| Fri | **UI Motion** | Motion graphics | A product demo for a fictional app: animated interface, features, flows. |
| Sat | **Title Sequence** | Motion graphics | Cinematic opening titles for a fictional film, series, festival or conference. |
| Sun | **Style Study** | Motion graphics | One design or editing movement executed at a pro level (Swiss, Bauhaus, risograph, VHS, editorial…). |

### Owner-started formats

These come from raw presenter clips the owner makes in Google Flow (`docs/GOOGLE_FLOW.md`) and are built
with `/edit`. They can take any weekday's slot, and the series that was planned for that day moves to the next free day.

| Format | Notion Format | What it is |
|---|---|---|
| **Talking Head** | Talking head | A presenter piece edited to studio level: tight cuts, punch-ins, word-by-word captions, sound design. |
| **Raw vs Edit** | Talking head | The untouched clip, then a divider wipe into the finished edit. The clearest proof of what the studio does. |

## Art direction

- Every video uses one design system from `src/video/design/systems.ts`, rotated so the previous 3
  posts never share a system. The grid on the profile should look like a varied agency portfolio.
- The quality bar, process and banned list live in `docs/CRAFT.md`. They are not optional.

## Voice

- Confident, crisp, specific. Says less, shows more.
- On screen: short lines, strong verbs, no buzzwords.

## Captions

1. Line 1: a hook about the piece or its subject (it shows in the feed).
2. 2–4 short lines: what this is and one craft detail (e.g. "Built in a Swiss grid, cut to 120 BPM").
   For explainers and data stories, add `Source: …`.
3. `Made with the Vibe Editing system.`
4. CTA: `Want one for your brand? DM "VIBE".`
5. 5–10 hashtags: always `#vibeediting #motiondesign`, then relevant ones (`#motiongraphics #explainervideo
   #kinetictypography #brandfilm #uidesign #titlesequence #graphicdesign #datavisualization #typography`).

Never mention automation, APIs, scheduling, Notion, Claude or AI generation.

## Planning rules (used by `/plan`)

- One post per day at 09:00 IST, following the weekday → series table.
- No topic repeated within 90 days. Spread subjects (science, money, tech, culture, design, nature).
- Fictional brands and products get original names that you've checked aren't famous real brands.
- Tie in real dates when they fit naturally (festivals, launches, seasons).
- Once analytics exist, plan more of what gets saves, shares and DMs.
