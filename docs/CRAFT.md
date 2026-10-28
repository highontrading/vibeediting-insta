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
   Otherwise fix its findings and re-review with a fresh critic (up to 5 rounds). If it still fails, mark the row Failed with the
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
- The loudness arc serves the story (a "loud" hook must measure loud). Always run `npm run master` after rendering.

## Copy and claims

- Facts must be true. For explainers and data stories, only use well-established facts, and put the
  source in the caption. Anything illustrative is labelled "illustrative" on screen.
- Fictional brands and products only. Never use real logos or trademarks.
- Never mention automation, APIs, scheduling, Notion, Claude or "AI-generated" on screen or in
  captions. The work is "made with the Vibe Editing system".
- Every video ends with the studio end card (`src/video/kit/EndCard.tsx`), dressed in its design system.

## Lessons from past critic reviews (check these before the first render)

These all came up while shipping *Stillwater*, which took 5 rounds to go from 6.4 to 8.56. Check them up front.

- **Use the system's signature moves, not just its colours.** Night Transit means split-flaps and signage on
  rails. A palette with generic fades scores about 6 on Motion.
- **Make the sound tell the story.** If the hook is "loud", it must *measure* loud (about −10 LUFS momentary) and the
  calm parts quieter (about −18 to −19). Silence has to last at least 1s to be heard. Measure with `ebur128`.
- **Bring the motif back.** If the opening sets up a motif (the waterline), the ending should return to it.
- **Avoid long same-framing stretches.** No layout should stay the same for more than about 3s. Cut to a close-up on
  beat 4 of each section, and time the key animation *after* the cut, not before.
- **Close-ups crop.** Keep the close-up's important text inside y 220–1500 for the *whole* push, and fade the layer
  softly at the top and bottom edges rather than slicing text.
- **Captions and devices collide.** Leave at least 40px between a caption's baseline and anything under it. A slow
  push must pivot so it doesn't move content into the caption.
- **Keep the data consistent.** Numbers on different screens must agree (today's bar = today's summary).
- **Don't end on dead air.** The final hold needs movement (drift, a returning motif, a last ripple) and must stay
  under about 3s.
- **Use real grids.** Split-flap rows share one tile grid (pad with blank tiles), and lines that should join use the same colour.
- **Frame 0 is the thumbnail.** It must be a full, striking composition, and nothing should start at opacity 0.

These came up on *Curiosity, not information* (6 rounds, best 8.25; not shipped):

- **No empty cut frames.** A mask-rise that starts on the cut frame leaves that frame blank. Start a scene's first type
  hit about 3 frames before the cut so it's already rising, and scan the render for blank frames
  (`signalstats` YMIN over the safe zone).
- **Watch for real-brand lookalikes.** Concentric red and white rings read as the Target logo. Check motifs and marks
  against famous logos, especially when they sit next to a wordmark.
- **Use the system's transitions, mixed.** Eleven identical smash-zooms read as a preset, and eleven identical
  pushes read as a default. Use the system's signature transition for most cuts and 2–3 match cuts where shapes line up.
- **Don't let the hero shrink.** After a reveal, the next shot should hold or grow the hero word's scale.
- **Use the whole frame.** Alternate top-hung, centred and bottom-anchored layouts, and don't leave half the safe zone empty for more than about 2s.
- **Black scenes need an untransformed background.** A zoom or push on a scene layer exposes the page colour at the
  edges unless the background sits on a layer outside the transform.
- **Small accent text must pass contrast.** Red mono labels under about 60px usually fail 4.5:1, so use ink or muted for them.
- **Payoffs must be big and on the beat.** A motif callback (closing a loop, a returning object) needs real scale, a
  hold and an SFX hit. A 14% stroke completion goes unnoticed.

## Fast-paced edits (the default pace for the page)

- Cut every 0.5–1.5s and land each cut on a beat (120 BPM: a beat is 15 frames). Something must change on
  every beat: a cut, a type hit, a camera move or a colour flip.
- Short punches (1–3 words) can hold for just 0.5s, but anything over 3 words needs `words/3 + 0.3`s.
- Speed comes from editing, not from chaos. Keep one focal point per shot and one motion language.
- Speed ramps, whip-pans, smash zooms, match cuts and frame-accurate type hits are the toolkit. Pair every hit with an SFX.

## Narration

- Generate it with `npm run tts -- <spec.json>`. Use **ElevenLabs** (`"engine": "elevenlabs"`) for anything that
  ships: its voices sound like a studio read and its word timings are real. List the account's voices with
  `npm run tts -- --voices`. Good defaults: `George` (warm British storyteller) for dramatic or cinematic pieces,
  `Alice` or `Matilda` for explainers, `Chris` or `Liam` for punchy social reads. Use one voice per piece.
- Credits are limited (Starter plan: 40k characters a month). Lock the script before generating; re-runs skip
  unchanged lines. If credits run out, fall back to Kokoro (`"engine": "kokoro"`, `bm_george` / `af_heart`) and
  say so in the row's comment.
- Write it for the ear: short sentences, 2.6–3 words per second, and no line longer than about 12 words.
  Each line is a separate clip. Place lines with `<Sequence>` and lock cuts to the line starts in `timings.json`.
- Duck the music to about 0.2 under narration and bring it back up in the gaps.
- On-screen text supports the narration and doesn't duplicate it word for word, except for deliberate type hits.
  Word-by-word captions can use the word times in `timings.json`.

## Talking heads

- Raw presenter clips (from Google Flow, see `docs/GOOGLE_FLOW.md`) are edited with the `/edit` skill and
  `src/video/kit/TalkingHead.tsx`: cut pauses and fillers, alternate framings on the jump cuts, word-by-word captions.
- Never cut inside a word. Listen at every cut and nudge `breath` or `trims` if a syllable clips.
- Captions sit below the chin (around y 1150) and never cover the mouth. They must match the speech word for word.
- The comparison reel shows the raw honestly. Don't degrade it to make the edit look better.

## Assets and licensing

- Get real images and footage from `npm run assets -- get <nasa|met|loc|archive|openverse> "<query>" --comp <Id>`.
  It downloads only commercial-safe files and logs each one in `public/assets/<Id>/credits.json`.
- **Never** use Google Images, Pinterest, Instagram, YouTube or any file without a clear commercial license.
- Credit CC BY creators in the caption (`Images: <creator> via Openverse/Flickr, CC BY`).
- Cut-outs: `npm run assets -- cutout <file>` makes a transparent PNG. Then treat it: duotone, halftone,
  posterise, paper edge or drop shadow, so stock never looks like stock.
- Avoid recognisable real people (likeness rights) and real brands. Generated presenters must be invented people.

## 3D

- `@remotion/three` (three.js) renders through ANGLE in headless Chromium. It's good for clay
  (`meshStandardMaterial`, roughness about 0.9, warm key light, noise-displaced geometry), product turntables,
  3D type and camera moves.
- Stop-motion feel: step the frame (`Math.floor(frame / 2) * 2`) and add a 1–2px per-step jitter.
