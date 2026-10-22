# Vibe Editing

Claude generates motion-graphics videos and posts them to the **Vibe Editing** Instagram page.
The page's topic is the process itself: how AI makes and auto-posts these videos.

## How it works

```
prompt ──► Claude writes a Remotion composition (React)
       ──► npm run render   → 1080×1920 MP4 (H.264/AAC)
       ──► npm run ig:post  → Meta Graph API → Instagram Reel
```

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
| `npm run ig:refresh-token` | Extends the 60-day token and saves it to `.env` |

If Remotion can't download its own browser, point it at an installed one with
`REMOTION_BROWSER_EXECUTABLE=/path/to/chrome`.

## Layout

```
src/
  config.ts                 env loading
  instagram/client.ts       Graph API client (container → upload → poll → publish)
  cli/                      ig:check, ig:post, ig:refresh-token
  video/
    Root.tsx                registers every composition
    theme.ts                brand colors and fonts
    compositions/           one file per video
docs/INSTAGRAM_SETUP.md     connecting the Instagram account
```
