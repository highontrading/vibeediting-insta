# Vibe Editing: Instagram autopilot

Claude makes short motion-graphics videos with Remotion and posts them to the Instagram account
**@vibeediting.app**. The page's theme is the process itself: AI editing and auto-posting videos.
It runs on autopilot from Claude scheduled tasks, with Notion as the content calendar.

## Notion content calendar

- Hub page: https://app.notion.com/p/401f79f64cde81cb880dcce21ad58fb6
- Database: `74740bc271ca42ab9a87296c42db017a`
- Data source (use this for queries and new rows): `collection://08cdc86b-d366-4e63-b6f8-5f7d102fb484`

**Schedule:** 1 Reel per day at **09:00 IST** (Asia/Kolkata). Store every **Post date** as a datetime
with the IST offset, e.g. `2026-11-01T09:00:00+05:30`.

| Scheduled task | When (IST) | Runs |
|---|---|---|
| Publish | daily 09:01 | `/publish` |
| Publish (backup) | daily 10:13 | `/publish` (no-op if the first run worked) |
| Produce | daily 13:47 | `/produce` (makes videos 1–3 days ahead) |

One row = one post. Status flow:

| Status | Meaning | Who sets it |
|---|---|---|
| Idea | Topic and date planned; no video yet | Owner or Claude (planning) |
| Hold | Do not produce or post | Owner only. Never change a Hold row. |
| Producing | Claude is making the video | `produce` skill |
| Review | Video hosted and caption written; posts automatically at Post date unless the owner sets Hold | `produce` skill |
| Posted | Live on Instagram | `publish` skill |
| Failed | Something broke; `Error` says why, `Attempts` counts tries | either skill |

Respect the owner's edits: never overwrite a non-empty **Caption** the owner wrote, and always read
**Notes for Claude** and the row's comments before producing.

## Skills (the autopilot runs these)

- `/plan`: fill empty calendar days with Idea rows (default the next 30 days).
- `/produce`: make videos for upcoming rows (Idea → Review).
- `/publish`: post rows that are due (Review → Posted).

## Commands

```bash
npm ci                                             # first thing in a fresh session if node_modules is missing
npm run ig:check                                   # token + account + quota
npm run ig:recent -- --json                        # latest posts (double-post guard)
npx remotion compositions src/video/index.ts       # list compositions
npm run render -- <CompositionId> out/<id>.mp4     # render (cloud Chromium is auto-detected)
npm run ig:post -- --video out/<id>.mp4 --host-only               # host only → prints RESULT {"videoUrl":…}
npm run ig:post -- --video <https url> --caption-file <file>      # publish → prints RESULT {"mediaId":…,"permalink":…}
npm run typecheck
```

`ig:post` and `ig:post --host-only` print one machine-readable line starting with `RESULT `. Parse that line.

What to post (series per weekday, voice, hooks, hashtags) lives in `docs/CONTENT_STRATEGY.md`.

## Video rules

- Every composition is a file in `src/video/compositions/<PascalCaseId>.tsx`, registered in
  `src/video/Root.tsx` with `{...REEL}` (1080×1920, 30fps). Use colors and fonts from `src/video/theme.ts`.
- Imports inside `src/video/` are **extensionless** (webpack bundles them). Imports in `src/cli`,
  `src/instagram` and `src/hosting` use `.js` (tsx/Node ESM).
- Length 8–30s unless the brief says otherwise. Hook in the first 1.5s.
- Instagram UI covers parts of the frame. Keep text inside x 80–1000 and y 220–1500: avoid the
  bottom ~420px (caption/username), the top ~220px, and the right edge (like/comment buttons).
- Minimum text size 44px; headline 120px+. Never more than ~12 words on screen at once.
- After rendering, extract frames (`ffmpeg -i out/x.mp4 -vf "select='eq(n\,30)+eq(n\,150)+eq(n\,270)',scale=360:-1,tile=3x1" -frames:v 1 out/x-preview.png`)
  and **look at them** (Read the PNG). Fix overlaps, clipped text or empty frames before hosting.
- No copyrighted music, logos or footage. Remotion renders with a silent AAC track by default.

## Captions

- Line 1 is a hook (shows in the feed). Then 1–3 short lines of value, then a CTA ("Follow for daily AI edits").
- 3–8 relevant hashtags at the end, always including `#vibeediting`. Max 2200 chars and 30 hashtags.

## Hosting and secrets

- Instagram fetches videos by URL. `--host-only` commits the MP4 to the `media` branch and returns a
  `raw.githubusercontent.com/...` URL pinned to that commit.
- Secrets live in the environment (`IG_ACCESS_TOKEN`, `IG_USER_ID`, `IG_LOGIN_TYPE`). Never print,
  commit or write them to Notion.
- The token was generated 2026-10-22 and expires around **2026-12-21**. If any call fails with code
  190 (invalid/expired token), mark the row Failed with `Error: Instagram token expired — owner must
  generate a new one` and say so in the final message.
