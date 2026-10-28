import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import transcript from "../../../public/raw/_Demo/transcript.json";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease } from "../kit/motion";
import { Music, Sfx } from "../kit/Sfx";
import { BeforeAfter, buildEdit, Captions, Chip, Footage, type Transcript } from "../kit/TalkingHead";

// Template for the talking-head workflow (.claude/skills/edit/SKILL.md), run on placeholder clips in public/raw/_Demo.
// Copy it to <Id>.tsx for a real job: swap the transcript import, system, hook, emphasis words and music.
// Two compositions: the edit itself, and the before/after comparison reel that wraps it.
const S = systems.swissSignal;
const T = transcript as Transcript;
const EDIT = buildEdit(T);
const E = ease.of(S);
export const TALKING_HEAD_DEMO_DURATION = EDIT.frames + END_CARD_FRAMES;

const HOOK = ["Stop posting", "it raw."];

export const TalkingHeadDemo: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Footage segments={EDIT.segments} system={S} />
    <Captions words={EDIT.words} system={S} emphasis={["raw", "point", "pauses"]} />
    <Sequence durationInFrames={66}>
      <HookTitle />
    </Sequence>
    {EDIT.segments.slice(1).map((s, i) => (
      <Sfx key={i} name={i % 2 ? "tick" : "whoosh-short"} at={s.from} volume={0.22} />
    ))}
    <Music file="pulse-minimal-120.m4a" durationInFrames={TALKING_HEAD_DEMO_DURATION} volume={0.14} fadeOut={45} />
    <Sequence from={EDIT.frames}>
      <EndCard system={S} />
    </Sequence>
  </AbsoluteFill>
);

/** Frame 0 is the thumbnail: the hook is already on screen and leaves on a mask. */
const HookTitle: React.FC = () => {
  const f = useCurrentFrame();
  const out = interpolate(f, [52, 66], [0, 1], { ...clamp, easing: E });
  return (
    <div style={{ position: "absolute", left: 80, top: 250, overflow: "hidden" }}>
      {HOOK.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: S.type.display,
            fontWeight: S.type.displayWeight,
            fontSize: 128,
            letterSpacing: `${S.type.displayTracking}em`,
            lineHeight: 0.95,
            color: i === 1 ? S.palette.bg : S.palette.ink,
            background: i === 1 ? S.palette.accent : S.palette.bg,
            padding: "8px 24px 18px",
            width: "fit-content",
            transform: `translateY(${-out * 260}%)`,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

// ─── Comparison reel ─────────────────────────────────────────────────────────────────────────

const RAW_CLIP = T.clips[0];
const RAW_FRAMES = Math.round(Math.min(RAW_CLIP.duration, 7) * 30);
export const TALKING_HEAD_DEMO_COMPARE_DURATION = RAW_FRAMES + TALKING_HEAD_DEMO_DURATION;

export const TalkingHeadDemoCompare: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={RAW_FRAMES}>
      <RawIntro />
    </Sequence>
    <Sequence from={RAW_FRAMES}>
      <Compare />
    </Sequence>
    <Sfx name="whoosh" at={RAW_FRAMES - 4} volume={0.5} />
  </AbsoluteFill>
);

/** The untouched first clip, dead air and all, with a running source timecode. */
const RawIntro: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(RAW_CLIP.file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Chip system={S} style={{ left: 80, top: 240 }}>
        Raw · {(f / 30).toFixed(1)}s
      </Chip>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 340,
          fontFamily: S.type.display,
          fontWeight: S.type.displayWeight,
          fontSize: 128,
          letterSpacing: `${S.type.displayTracking}em`,
          lineHeight: 0.95,
          color: S.palette.ink,
          background: S.palette.bg,
          padding: "8px 24px 18px",
        }}
      >
        Before.
      </div>
    </AbsoluteFill>
  );
};

/** The edit plays in full; the divider sweeps away the raw, then swings back once mid-way to show the difference. */
const Compare: React.FC = () => {
  const f = useCurrentFrame();
  const mid = Math.round(EDIT.frames * 0.55);
  const split = interpolate(f, [0, 18, mid, mid + 12, mid + 57, mid + 69], [1, 0, 0, 0.5, 0.5, 0], { ...clamp, easing: E });
  return (
    <>
      <BeforeAfter system={S} split={split} raw={<Footage segments={EDIT.segments} plain muted />} edited={<TalkingHeadDemo />} />
      <Sfx name="swish-reverse" at={mid} volume={0.4} />
      <Sfx name="whoosh-short" at={mid + 57} volume={0.4} />
    </>
  );
};
