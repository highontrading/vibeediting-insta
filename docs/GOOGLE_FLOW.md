# Presenter clips from Google Flow

Talking-head reels start as presenter clips the owner generates in Google Flow. Claude edits them with
`/edit` (`.claude/skills/edit/SKILL.md`). Flow makes **8-second clips**, so one reel is a series of clips,
one line of script each. Six clips make about 40s of edit, plus the hook and the end card.

## Settings in Flow

- **Aspect ratio: 9:16 (portrait).** A 16:9 clip cropped to 9:16 loses about 70% of the frame.
- Highest quality model and resolution available. Download 1080p if your plan offers it.
- **Keep the same presenter across clips:** generate clip 1, then use its best frame as the start image
  (Frames to video) or ingredient for every later clip. Paste the identical character and setting text each time.
- Generate 2–4 takes per line and keep the best. Watch for mouth-sync drift, extra fingers and eye-line jumps.

## Prompt template (one per clip)

Fill in `<LINE>` and keep everything else identical across the series.

```
Vertical 9:16 video. Medium close-up from the chest up, eye-level, 50mm lens, shallow depth of field.
Her eyes sit on the upper third of the frame with a little headroom; the lower third of the frame is her torso.
A woman in her early 30s with short dark curly hair, an olive linen overshirt over a white tee and small gold
hoop earrings, with a warm, confident expression.
A minimal studio with a warm grey wall and an out-of-focus paper lamp glowing on the right.
Soft key light from the left, gentle rim light, natural skin tones.
The camera is locked off on a tripod: no camera movement and no zoom.
She looks straight into the lens and says, in a warm, confident, conversational voice: "<LINE>"
After the line she holds a relaxed one-second pause, still looking at the camera.
Audio: clean close-mic dialogue and quiet room tone only. No music, no sound effects.
No subtitles, no captions, no on-screen text, no logos.
```

Why it's written this way: a locked-off camera lets the edit add its own punch-ins; the face in the upper third
and a plain torso below leave room for captions at y 1150–1500; no music or text means the edit owns the sound and
type; the one-second pause at the end gives a clean cut point. Keep each line to **20 words or fewer** so it fits in 8 seconds.

Swap in a different character or setting when you want a new presenter. Describe an invented person, never a real
or famous one.

## Ready-made scripts

### A. "How Vibe Editing works" (client pitch)

1. You send us one idea. A sentence, a product, a rough voice note. That's the brief.
2. We turn it into a treatment: the hook, the beats, the music, the look.
3. Then we design every frame. Real type, real grids, sound design cut to the beat.
4. Got raw footage? We cut the pauses, punch in on the point, and caption every word.
5. Every piece faces a critic before it ships. If it isn't great, it doesn't leave.
6. Explainers, brand films, edits like this one. Want yours? DM the word VIBE.

Hook title: `Here's how we work.` Pair it with a Raw vs Edit reel using clip 4.

### B. "Five edits that make people stay" (tips, made for a Raw vs Edit reel)

1. Your first second decides everything. Start mid-sentence, never with hello.
2. Cut every pause longer than a breath. Silence feels slow on a phone.
3. Punch in on the jump cuts. It hides the cut and wakes the viewer up.
4. Captions aren't optional. Most people watch on mute, so make every word land.
5. Sound design is half the edit. A whoosh on the cut, a hit on the point.
6. That's the difference between raw and edited. Want this on your videos? DM VIBE.

Hook title: `Stop posting it raw.`

### C. "Brief to Reel" (a client's founder, fictional brand)

1. I run Tidewell, a tiny tea company. I had one sentence and no video team.
2. I sent it on a Monday. By Wednesday I had a treatment and three styleframes.
3. Friday it was live. Type, motion, sound, all of it. It looked like an agency made it.
4. Honestly? The best part was not opening an editing app once.
5. If you have the idea, they'll handle the rest. Message them VIBE.

Check that a fictional brand name isn't a famous real one before you use it. This script is a scripted
demonstration, so label it as such in the caption (for example, "Scripted demo for a fictional brand").

## Hand-off to the edit

1. Name the clips in order (`01.mp4`, `02.mp4`, …) and keep only the best take of each line.
2. Get them into the session in any of these ways:
   - attach them in the chat,
   - put them in a Google Drive folder and share the link, or
   - commit them to `public/raw/<Id>/`.
3. Say `/edit <Id>` with any notes, for example: "script B, comparison reel too, Acid Sport, emphasise 'pause' and 'captions'".
