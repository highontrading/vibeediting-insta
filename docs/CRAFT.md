# Craft standards: the bar every video must clear

Vibe Editing is a studio portfolio. Every post is a sales piece: it has to look like a world-class
motion designer, editor and creative director made it. Work like that team, not like a template.

## The process (no shortcuts)

1. **Treatment.** Write it into the Notion row's page body before touching code:
   - Concept in one sentence, plus the single feeling the viewer should leave with.
   - Beat sheet with timings: hook (0–2s), setup, 3–5 development beats, payoff, end card (2s).
     Total 40–60s.
   - Design system (from `src/video/design/systems.ts`) and *why* it fits. It must differ from the
     systems used in the previous 3 posts.
   - Music bed (`public/music/README.md`) and its BPM, plus an SFX plan (which moments get which sound).
2. **Styleframes.** Build the key frames first: hook, one frame per beat, and the payoff. Render them with
   `npm run review -- <Id> --frames a,b,c --scale 0.5` and look at every one. Fix layout,
   type and colour while the frames are still static. This is where quality is decided.
3. **Animate.** Use the system's easing and motion signature. Lay cuts on the beat grid of the music.
4. **Full render and review.** Run `npm run render`, then `npm run review -- <Id> --count 16`. Also check motion
   by extracting a 6fps strip of the busiest 3 seconds with ffmpeg.
5. **Critic pass.** Spawn a separate reviewer agent. Give it the contact sheets and this file, and
   have it score the rubric below *harshly*. Ship only when every axis is ≥ 8 and the average is ≥ 8.5.
   Otherwise fix its findings and re-review (up to 3 rounds). If it still fails, mark the row Failed with the
   scores rather than shipping something mediocre.

## Rubric (score 1–10 each)

| Axis | 10 looks like |
|---|---|
| Concept & story | One clear idea, an arc with a payoff, the viewer learns or feels something specific |
| Typography | Strong hierarchy (display ≥ 3× body), tight display tracking, good rag, no widows or orphans, aligned to a grid |
| Composition | Clear focal point every frame, intentional negative space, grid-aligned, inside the safe zone |
| Colour | Strictly the system palette, accent used sparingly, text contrast ≥ 4.5:1 |
| Motion | Every move eased, overlap and stagger, anticipation and follow-through, one consistent motion language, motivated transitions |
| Rhythm & sound | Cuts and hits land on beats, SFX on key moments, music sits under, never fights |
| Polish | No jank, popping, clipped text, empty frames or accidental overlaps; consistent spacing |
| Originality | Nothing template-like; would not be mistaken for AI slop |

## Banned: the "AI slop" tells

- Purple→blue/cyan gradients, neon glow or bloom on everything, rainbow gradients, lens flares.
- Generic "tech" particles, floating orbs or blobs, HUD/hologram clichés, random 3D spheres.
- Glassmorphism cards with glow; drop-shadow glows on text.
- Everything centred, everything the same size, everything fading and scaling up the same way.
- Emoji used as graphics. Stock-icon soup.
- Copy like "Unleash", "Revolutionize", "Elevate", "Game-changer", "In today's fast-paced world".
- More accent colours on screen than the system defines.
- Linear (un-eased) movement, or generic cross-dissolves (unless the system is Luxe Mono).

## Typography rules

- Use the system's fonts only: max two families plus its mono.
- Display type: line-height 0.88–1.0, tracking per system, max ~16 characters per line at 120px+.
- Body ≥ 40px. Never below 34px for anything that must be read.
- Readable text stays on screen at least `words / 3` seconds + 0.5s.
- Align to a 12-column grid with 80px outer margins. Keep text inside x 80–1000, y 220–1500.

## Motion rules

- House easing comes from the system (`ease.of(system)`). Stagger related elements by 2–4 frames.
- Each scene lasts 1.5–4s, with something meaningful changing at least every 2s.
- Keep frames alive: a slow continuous drift (scale 1.00→1.04 or a 20–40px pan) under static moments.
- Transitions are match cuts, mask wipes, morphs, push-throughs on the beat. Choose them, don't default.
- Frame 0 must already be striking: it's the thumbnail and the hook.

## Sound rules

- Music bed volume 0.35–0.55, faded in over 0.5s and out over the end card.
- SFX on each major transition or reveal (whoosh, impact, click, pop, riser into the payoff,
  shimmer on the end card). Roughly one per second at most, never stacked into mush.
- Cut points sit on beats: beat n = frame `round(n * 60 / BPM * 30)`.

## Copy and claims

- Facts must be true. For explainers and data stories, only use well-established facts, and put the
  source in the caption. Anything illustrative is labelled "illustrative" on screen.
- Fictional brands and products only. Never use real logos or trademarks.
- Never mention automation, APIs, scheduling, Notion, Claude or "AI-generated" on screen or in
  captions. The work is "made with the Vibe Editing system".
- Every video ends with the studio end card (`src/video/kit/EndCard.tsx`), dressed in its design system.
