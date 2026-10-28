# Vibe Editing

Studio-quality motion graphics, explainers and brand films for the **Vibe Editing** Instagram portfolio, built in code with Remotion.
Quality bar: `docs/CRAFT.md`. What to post: `docs/CONTENT_STRATEGY.md`.

## How it works

```
prompt ──► Claude writes a Remotion composition (React)
       ──► npm run render   → 1080×1920 MP4 (H.264/AAC)
       ──► npm run ig:post  → MP4 hosted on the `media` branch → Meta Graph API → Instagram Reel
```

## Autopilot

- **Calendar:** Notion "Vibe Editing — Autopilot" → *Content Calendar* (one row per post).
- **Scheduled Claude tasks** run the repo skills:
  - `/produce` makes videos for posts due in the next 3 days (Idea → Review).
  - `/publish` posts what's due (Review → Posted), with a backup run in case one fails.
- To stop a post, set its Status to **Hold** in Notion.

See `CLAUDE.md` for the full rules the sessions follow.

## Setup

```bash
npm install
cp .env.example .env    # then follow docs/INSTAGRAM_SETUP.md
npm run ig:check        # verify the Instagram connection
```

## Commands

| Command | What it does |
|---|---|
| `npm run studio` | Opens Remotion Studio to preview and tweak videos in the browser |
| `npm run render -- <CompositionId> out/<file>.mp4` | Renders a video |
| `npm run ig:check` | Checks the token and account, and prints `IG_USER_ID` and the posting quota |
| `npm run ig:post -- --video <file> --caption "..."` | Publishes a Reel (`--caption-file`, `--no-feed`, `--thumb-offset <ms>`, `--dry-run`) |
| `npm run ig:recent` | Lists the latest posts (`--json` for machine output) |
| `npm run ig:refresh-token` | Extends the 60-day token and saves it to `.env` |
| `npm run tts -- <spec.json>` | Voiceover (ElevenLabs or Kokoro) with word timings; `--voices` lists ElevenLabs voices |
| `npm run transcribe -- public/raw/<Id>` | Word-level transcript of raw talking-head clips (pauses, fillers, trims) |

New to the project? `docs/SYSTEM_BRIEF.md` explains the whole system on one page.

Rendering uses the cloud session's built-in Chromium automatically. Elsewhere, Remotion downloads one,
or you can set `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome`.

## Layout

```
src/
  config.ts                 env loading
  instagram/client.ts       Graph API client (container → poll → publish)
  hosting/github.ts         puts a local MP4 at a public URL (Instagram fetches videos by URL)
  cli/                      ig:check, ig:post, ig:refresh-token
  video/
    Root.tsx                registers every composition
    theme.ts                brand colors and fonts
    compositions/           one file per video
docs/INSTAGRAM_SETUP.md     connecting the Instagram account
```
