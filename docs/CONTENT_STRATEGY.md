# Vibe Editing: content strategy

**Promise of the page:** watch AI edit everything. Every Reel is made by Claude in code (Remotion)
and posted by the autopilot. The audience is creators and editors who want to learn editing styles
and see what AI can do with them.

## Series (one per day of the week)

| Day | Series | Notion Format | What it is |
|---|---|---|---|
| Mon | **Style Breakdown** | Motion graphics | Demonstrate one editing/motion style *in* that style, naming it on screen ("This is kinetic typography."). |
| Tue | **Edit Tip** | Tutorial | One practical editing rule, shown as a quick wrong → right comparison. |
| Wed | **Prompt → Video** | Motion graphics | Show the prompt typed on screen (2–3s), then the video Claude made from it. |
| Thu | **Explained** | Explainer | One editing concept or term made visual (J-cut, easing, frame rate…). |
| Fri | **Autopilot Log** | Behind the scenes | How this page runs itself: the calendar, the code, the posting, the stats. |
| Sat | **Style Breakdown** | Motion graphics | Same as Monday, different style. |
| Sun | **Prompt → Video** | Motion graphics | Same as Wednesday; lighter or funnier prompts. |

Talking-head content is on hold until there's footage or an avatar tool.

## Voice

- Short, confident, a little playful. Talk to creators ("you"), not about AI in the abstract.
- On-screen text: max ~12 words at a time. Captions do the explaining.
- Never claim things the page can't back up (no fake stats, follower counts or results).

## Visual rules

- Brand palette from `src/video/theme.ts` (dark background, purple/cyan/pink accents) unless the
  style being demonstrated needs its own look (e.g. VHS, Swiss grid). Even then, the last 2s
  return to the brand look with the series name.
- Every video opens with a hook in the first 1.5s: a bold claim, a question, or the end result first.
- Every video ends on the series name plus "Follow @vibeediting.app".
- Vary layout and motion between consecutive posts. Never reuse the previous video's structure.

## Hooks that fit the page

"Nobody edited this." · "This took 0 clicks." · "Your hook has 1.5 seconds." · "I typed one sentence…" ·
"Stop doing this in your edits." · "This is why your text disappears."

## Hashtags

Always `#vibeediting`, plus 3–7 of: `#videoediting #motiongraphics #editingtips #aivideo #remotion
#contentcreator #reels #aiautomation #kinetictypography #aftereffects` (pick the relevant ones).

## Planning rules (used by `/plan`)

- One post per day at 09:00 IST, following the weekday → series table.
- Don't repeat a topic from the last 60 days of the calendar.
- Tie in real dates when they fit (Halloween, New Year…), never forced.
- Once analytics exist, plan more of what got the most saves and shares.
