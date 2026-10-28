---
name: edit
description: Edit raw talking-head clips (e.g. presenter shots generated in Google Flow) into a studio-quality Vibe Editing reel, plus an optional Raw vs Edit comparison reel. Transcribes the clips, cuts pauses and fillers, reframes with punch-ins, adds word-by-word captions, a hook title, music and SFX in a design system, passes the critic, then hosts the MP4s and adds them to the Notion calendar. Use when the owner attaches or points to raw video and asks for an edit, a talking-head reel, or a before/after or comparison reel.
---

# Edit talking-head footage

Read first: `CLAUDE.md`, `docs/CRAFT.md`, `docs/GOOGLE_FLOW.md`, `src/video/kit/TalkingHead.tsx`, and the template
`src/video/compositions/_TalkingHeadDemo.tsx` (both compositions, the edit and the comparison, are built there).

## 1. Get the footage

1. Choose an ID in PascalCase from the topic (e.g. `StopPostingRaw`) that is unique in `src/video/compositions/`.
2. Put the clips in `public/raw/<Id>/`, named in speaking order (`01.mp4`, `02.mp4`, …).
   - Attached in the chat: copy them from where the upload landed.
   - Google Drive link: download them with the Google Drive connector.
   - Already committed: use them as they are.
3. Check them: `ffprobe` every clip. Portrait (9:16) is expected. A landscape clip still works (it's cropped to the
   `focus` point), but tell the owner it loses most of the frame. Watch a contact sheet of each clip
   (`ffmpeg -i <clip> -vf "fps=2,scale=180:-1,tile=8x2" -frames:v 1 out/review/<Id>-<n>.png`) and flag broken
   takes (mouth drift, hands, eye-line jumps) to the owner instead of editing around them silently.

## 2. Transcribe

```bash
npm run transcribe -- public/raw/<Id>
```

Read `public/raw/<Id>/transcript.json`: the words, suggested `in`/`out` trims, pauses and fillers per clip. Compare the
words against the script, if the owner gave one. A misheard word gets fixed in the JSON (the captions read from it).

## 3. Plan the edit (write it down before coding)

- **Hook (frame 0):** a 2–5 word title over the first shot. It's the thumbnail. Use the owner's hook if given.
- **Cut:** `buildEdit()` removes pauses over 0.45s and the fillers, and alternates framing 1.0 / 1.16 on each cut.
  Override per clip with `trims` when a take starts late or ends on a bad frame.
- **Captions:** 1–3 words per line, with the spoken word boxed in the accent. Pick 3–6 `emphasis` words, the ones the
  point of the line rests on.
- **Design system:** one from `src/video/design/systems.ts` that isn't one of the last 3 posts. It dresses the
  captions, hook, chips and end card.
- **Sound:** a music bed at 0.12–0.18 under speech (it's a dialogue piece, so keep it low), a soft SFX on most cuts
  (`whoosh-short`, `tick`), and a `pop` or `impact` on emphasis moments, never more than one per second.
- **Extras (optional, where they help):** a B-roll or graphic insert from the kit for a key line, a lower-third with
  the presenter's role, a progress bar. Keep every element inside x 80–1000 and y 220–1500.
- **Length:** the edit plus the 2s end card should come to 40–60s. If the footage is shorter, say so; don't pad
  with dead air.

## 4. Build

1. Copy `_TalkingHeadDemo.tsx` to `src/video/compositions/<Id>.tsx`. Rename the exports (`<Id>`, `<Id>Compare`, and their
   `_DURATION` constants), import `public/raw/<Id>/transcript.json`, and apply the plan. Set `focus` to where the
   eyes sit (`{x: 0.5, y: 0.3}` is typical for the Flow framing in GOOGLE_FLOW.md).
2. Register `<Id>` (and `<Id>Compare` if the owner wants a comparison) in `src/video/Root.tsx` with `{...REEL}`.
3. `npm run typecheck`, then styleframes: `npm run review -- <Id> --frames 0,<cuts…>,<last> --scale 0.5`. Check that
   captions never cover the mouth or chin, that the punch-ins keep the full head in frame, and that the hook reads at
   phone size.

## 5. Comparison reel (Raw vs Edit)

The template's `<Id>Compare` plays the untouched first clip with its dead air and a running timecode ("Before."),
whooshes into the edit, and swings the divider back to 50% once mid-way so the viewer sees raw and edit side by side.
Adjust it:

- Choose the raw clip that shows the most dead air or the weakest framing. The contrast is the point.
- Keep the raw part at 7s or less. Viewers get it fast.
- Put the divider swing on the best edit moment (a punch-in plus an emphasis word), not just the midpoint.

## 6. Render, review, critic

Follow `/produce` steps 6–8 for each composition: render, `npm run master`, the contact sheet, the 6fps motion strip
and the independent critic (every axis ≥ 8, average ≥ 8.5). For talking heads the critic also checks: cuts land
between words (no clipped syllables, listen at each cut), captions match the speech exactly, and there are no
audio pops at the cuts.

## 7. Deliver

1. Host each MP4: `npm run ig:post -- --video out/<Id>.mp4 --host-only` (and the same for `<Id>Compare`).
2. Ask the owner which dates to post them on, unless they already said. Otherwise use the next free days in the
   calendar. Add one Notion row per video with Status `Review`, Format `Talking head`, the Composition, Video URL,
   Video hash and caption. The normal `/publish` run posts them. If the Format option doesn't exist, use `Motion graphics`
   and mention it in the row's comment.
3. **Caption** (CONTENT_STRATEGY.md rules): for the comparison, lead with the before/after (e.g. "Same clip. One edit.")
   and name 2 craft details (cut 9 pauses, captions in Swiss Signal). Never mention AI or how the presenter was made.
4. Commit the composition, `Root.tsx` and `public/raw/<Id>/` (clips and transcript) and push. Raw clips over 50 MB:
   compress them first (`ffmpeg -crf 23`) or keep them out of git and say where they are.
5. Report: the video URLs, the lengths, the critic score, and any takes the owner should regenerate.
