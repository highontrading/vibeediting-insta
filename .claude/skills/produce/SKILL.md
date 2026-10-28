---
name: produce
description: Make the videos for upcoming Vibe Editing posts at studio quality. Finds Notion calendar rows due in the next 3 days that have no video yet, writes a treatment, builds styleframes, animates a 40–60s Remotion piece in a rotating design system with music and sound design, passes an independent critic review, hosts the MP4, writes the caption, and moves the row to Review. Use when asked to produce, make or render upcoming posts, or when a scheduled run says /produce.
---

# Produce upcoming posts

Read first, every time: `CLAUDE.md`, `docs/CONTENT_STRATEGY.md`, `docs/CRAFT.md`,
`src/video/design/systems.ts`, `public/music/README.md`, and the kit in `src/video/kit/`.

## 1. Prepare

```bash
[ -d node_modules ] || npm ci
[ -x .venv/bin/python ] && [ -s models/kokoro/kokoro-v1.0.onnx ] || npm run setup:python   # narration + cutouts
npm run ig:check
```

If `ig:check` fails with code 190, stop and report that the token expired.

## 2. Pick the work

Query `collection://08cdc86b-d366-4e63-b6f8-5f7d102fb484` for rows where:

- **Post date** is before *now + 3 days* (overdue rows included), and
- **Status** is `Idea`, or `Failed` with an empty **Video URL**, or `Producing` with an empty **Video URL**
  whose **Started at** is more than 4 hours ago (otherwise another session is still working on it), and
- **Attempts** is empty or less than 3.

Never touch `Hold`, `Review` or `Posted` rows. Sort by Post date ascending and take at most **2** rows
per run, because quality takes time. If nothing matches, go to step 5.

Also read the **Design system** of the 3 most recent rows that have one, so you can rotate away from them.

## 3. For each row: work like a studio

1. Set **Status** = `Producing` and **Started at** = now.
2. Read the whole row: Topic, Series, Brief, **Notes for Claude**, the page body and its comments.
   The owner's notes override everything else.
3. **Treatment.** Follow docs/CRAFT.md step 1 and write the treatment into the row's page body (replace
   any older treatment). Pick a design system not used in the last 3 posts, then set the row's
   **Design system** property to it.
4. **Composition.** Choose an ID in PascalCase from the topic, unique in `src/video/compositions/`.
   Write `src/video/compositions/<Id>.tsx`, export a `<ID>_DURATION` constant (40–60s = 1200–1800
   frames, including the 60-frame `EndCard`), and register it in `src/video/Root.tsx` with `{...REEL}`.
   - Get colours, type and motion only from the chosen system object. Never use `theme.ts`, which is legacy.
   - Use the kit where it helps (`MaskReveal`, `Stagger`, `Typewriter`, `SystemTexture`, `Sfx`, `Music`,
     `EndCard`, `ease.of(system)`), but build the visuals bespoke for this piece.
   - Add a music bed with `<Music>` and an SFX layer with `<Sfx>` per the treatment.
   - **Narration** (if the brief asks for it): write the script for the ear, generate it with `npm run tts`
     (ElevenLabs engine, spec in `scripts/tts.py`), and build the edit around `public/voice/<Id>/timings.json`
     (CRAFT.md → Narration).
   - **Real images or footage** (if the piece needs them): `npm run assets -- get …` and `cutout` (CRAFT.md →
     Assets). Commit `public/assets/<Id>/` and `public/voice/<Id>/` with the composition.
   - **Pace:** fast by default (CRAFT.md → Fast-paced edits).
5. **Styleframes first.** `npm run typecheck`, then `npm run review -- <Id> --frames <hook>,<beat1>,…,<payoff> --scale 0.5`.
   Read every PNG. Fix composition, type and colour until the stills could be posters. Repeat as needed.
6. **Render.** `npm run render -- <Id> out/<Id>.mp4` (run it in the background; it takes minutes).
   Then master the audio: `npm run master -- out/<Id>.mp4` (limiter; the peak must end up below -1 dBFS).
   Check: the duration is 40–60s, the audio track exists, and the file is under 300 MB. Check the loudness arc with
   `ffmpeg -i out/<Id>.mp4 -af ebur128 -f null -` (the hook should not be quieter than the bed unless that's intended).
7. **Review.** `npm run review -- <Id> --count 16`, and look at the contact sheet. For motion, extract a
   6fps strip of the busiest 3 seconds:
   `ffmpeg -v error -ss <t> -t 3 -i out/<Id>.mp4 -vf "fps=6,scale=216:-1,tile=6x3" -frames:v 1 out/review/<Id>-motion.png`.
8. **Critic pass (mandatory).** Spawn a separate agent (Agent tool) as an independent creative director.
   Give it the contact sheet paths, the motion strip, the treatment and `docs/CRAFT.md`, and ask it to score
   every rubric axis 1–10 harshly, listing concrete fixes. Ship only if every axis is ≥ 8 and the
   average is ≥ 8.5. Otherwise apply the fixes, re-render and re-review with a fresh critic, up to 5 rounds.
   **A self-review never counts as the critic pass.** If you can't spawn an agent (for example, you are yourself a
   subagent), ask your parent session to run the critic (SendMessage) and wait for its report. If no critic can run,
   leave the row `Producing` with **Error** = `Awaiting independent critic` and don't host it. If it still fails,
   set **Status** = `Failed` with **Error** = `Below quality bar: <scores>` and move on. Never ship mediocre work.
9. **Duplicate check.** Host it with `npm run ig:post -- --video out/<Id>.mp4 --host-only`, then take `videoUrl`
   and `sha256` from the `RESULT` line. If any other row already has the same **Video hash**,
   something went wrong: mark this row Failed (`Error: duplicate video file`) and stop.
10. **Caption.** Write it per the caption rules in CONTENT_STRATEGY.md. Keep an existing non-empty
    owner caption. Never mention automation, APIs, Notion, Claude or AI.
11. **Update the row:** **Composition** = `<Id>`, **Video URL**, **Video hash** = sha256, **Caption**
    (if it was empty), **Error** = empty, **Status** = `Review`. Then add a one-line comment: what it is,
    the length, the design system and the critic's average score.

If any step fails: set **Status** = `Failed`, **Error** = the short message, **Attempts** = Attempts + 1,
then continue with the next row.

## 4. Save the source

Commit the new compositions and `Root.tsx` in one commit (e.g. `Add compositions for 2026-11-03..04`) and
push the current branch. Never commit `out/` or secrets.

## 5. Keep the calendar topped up

If fewer than **7** future days have a row that isn't `Posted`, follow the `/plan` skill to fill the
next 30 days.

## 6. Report

End with a short list: each row → `Review` (with Video URL and critic score) or `Failed` (with
Error), plus how many rows `/plan` added, if any.
