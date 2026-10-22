---
name: produce
description: Make the videos for upcoming Vibe Editing posts. Finds Notion calendar rows due in the next 3 days that have no video yet, writes a Remotion composition for each, renders and checks it, hosts the MP4, writes the caption, and moves the row to Review. Use when asked to produce, make or render upcoming posts, or when a scheduled autopilot run says /produce.
---

# Produce upcoming posts

Read `CLAUDE.md` (Notion IDs, status meanings, video and caption rules) and `docs/CONTENT_STRATEGY.md` (series, voice, hooks, visual rules) first.

## 1. Prepare

```bash
[ -d node_modules ] || npm ci
npm run ig:check
```

If `ig:check` fails with code 190, stop and report that the token expired. Producing is pointless if posting can't happen.

## 2. Pick the work

Query the data source `collection://08cdc86b-d366-4e63-b6f8-5f7d102fb484` for rows where:

- **Post date** is before *now + 3 days* (overdue rows included), and
- **Status** is `Idea`, or `Failed` with an empty **Video URL**, or `Producing` with an empty **Video URL**
  (a previous run died mid-way), and
- **Attempts** is empty or less than 3.

Never touch `Hold`, `Review` or `Posted` rows. Sort by Post date ascending and take at most **3** rows per run.
If nothing matches, say "Nothing to produce" and stop.

## 3. For each row

1. Set **Status** = `Producing`.
2. Read the whole row: Topic, Series, Brief, Format, **Notes for Claude**, and the page's comments. The owner's notes override everything else; the Series decides the structure (see CONTENT_STRATEGY.md).
3. Choose a composition ID: PascalCase from the topic, unique in `src/video/compositions/`.
4. Write `src/video/compositions/<Id>.tsx`, export a duration constant, and register it in `src/video/Root.tsx`. Follow the video rules in CLAUDE.md. Make each video visually distinct: vary layouts, motion and pacing. Don't clone the previous composition.
5. `npm run typecheck`, then `npm run render -- <Id> out/<Id>.mp4`.
6. Extract the preview frames (command in CLAUDE.md) and **look at them**. Fix and re-render if text is clipped, overlapping, unreadable, outside the safe area, or a frame is empty.
7. Host it: `npm run ig:post -- --video out/<Id>.mp4 --host-only`, then take `videoUrl` from the `RESULT` line.
8. Write the caption using the caption rules in CLAUDE.md. If the row already has a non-empty **Caption**, keep the owner's caption.
9. Update the row: **Composition** = `<Id>`, **Video URL**, **Caption** (if it was empty), **Error** = empty, **Status** = `Review`.
10. Add a one-line comment on the row: what the video shows and its length.

If any step fails: set **Status** = `Failed`, **Error** = the short error message, **Attempts** = Attempts + 1. Then continue with the next row.

## 4. Save the source

Commit the new compositions and `Root.tsx` (one commit per run, e.g. `Add compositions for 2026-11-03..05`) and push the current branch. Never commit `out/` or secrets.

## 5. Keep the calendar topped up

Count rows with a **Post date** after now that are not `Posted`. If fewer than **7** future days have a
row, follow the `/plan` skill to fill the next 30 days. That way the calendar never runs dry.

## 6. Report

End with a short list: each row → `Review` (with Video URL) or `Failed` (with Error), plus how many rows `/plan` added, if any.
