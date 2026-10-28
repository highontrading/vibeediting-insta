# Vibe Editing: the system in one page

Paste this into any agent to give it the full picture.

**What it is.** Vibe Editing is a video studio that works in code. We make studio-quality short-form
video (40–60s, 9:16 Instagram Reels): motion graphics, explainers, brand films, title sequences, data
stories, UI demos, and edited talking-head videos. **@vibeediting.app** is the portfolio, and every post
is a sales piece for clients ("Want one for your brand? DM VIBE"). Quality comes first (`docs/CRAFT.md`).

**How a video gets made.**

| Step | Tool |
|---|---|
| Plan the idea, beats, design system and music | Notion content calendar (one row per post) |
| Build the video as code | Remotion (React): `src/video/compositions/<Id>.tsx`, 1080×1920 at 30fps |
| Art direction | One of 12 design systems (`src/video/design/systems.ts`): palette, fonts, easing, texture |
| Voiceover | ElevenLabs (`npm run tts`, engine `elevenlabs`) with word-level timings; Kokoro as a free fallback |
| Talking heads | Presenter clips generated in Google Flow from our prompts (`docs/GOOGLE_FLOW.md`), then edited here |
| Transcripts | ElevenLabs Scribe (`npm run transcribe`): word times, pauses and fillers to cut |
| Images and footage | Licensed sources only (NASA, Met, LOC, Archive, Openverse), with credits logged |
| Sound | Original music beds with known BPMs, an SFX library, and a mastering limiter (≤ −1 dBTP) |
| QA | Styleframes and contact sheets, then an independent critic agent scoring an 8-axis rubric (ships at ≥ 8.5) |
| Publish | MP4 hosted on the repo's `media` branch, posted via the Instagram Graph API |

**Four kinds of work.**

1. **Motion graphics.** Pure design and animation: kinetic type, brand films, title sequences, UI motion.
2. **Explainers and data stories.** Narrated with ElevenLabs. Cuts land on voice lines and music beats.
   Facts are sourced in the caption.
3. **Talking-head edits.** A raw presenter clip goes in. Out comes a cut, reframed, captioned and
   sound-designed edit (pauses and fillers removed, punch-ins on the jump cuts, word-by-word captions,
   hook title on frame 0, music and SFX). The skill is `/edit`.
4. **Raw vs Edit comparison reels.** The untouched raw clip with its dead air, then a divider wipe into
   the finished edit, swinging back mid-way to show the difference.

**Rules that never bend.**

- 9:16, 1080×1920. Text stays inside x 80–1000 and y 220–1500 (Instagram UI covers the rest). Text is
  at least 44px, headlines at least 120px, and no more than about 12 words on screen.
- Frame 0 is the thumbnail and the hook. Every piece ends with the 2s Vibe Editing end card.
- No "AI slop": no purple-to-cyan gradients, glows, orbs, emoji-as-graphics or buzzword copy.
- Fictional brands only. No copyrighted music, logos or footage. No recognisable real people.
- Public-facing copy never mentions automation, APIs, Notion, Claude or AI. The work is
  "made with the Vibe Editing system".
- Secrets (`IG_ACCESS_TOKEN`, `ELEVENLABS_API_KEY`) live in the environment. Never print or commit them.

**Autopilot.** Scheduled agent sessions run `/plan` (fill the calendar), `/produce` (make videos 1–3 days
ahead and move them to Review), and `/publish` (post at 09:00 IST). The owner can set any row to Hold.
Talking-head and comparison reels are owner-started: the owner drops raw clips and runs `/edit`.

**Where to read more.** `CLAUDE.md` (operating rules), `docs/CRAFT.md` (quality bar),
`docs/CONTENT_STRATEGY.md` (what to post), `docs/GOOGLE_FLOW.md` (presenter prompts), and
`.claude/skills/*/SKILL.md` (the workflows).
