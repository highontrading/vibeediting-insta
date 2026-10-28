import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { DesignSystem } from "../design/systems";
import { clamp, ease } from "./motion";
import { SystemTexture } from "./Texture";

// Talking-head editing: raw clips (e.g. generated presenter shots) + transcript → a cut, framed, captioned edit.
// Transcripts come from `npm run transcribe -- public/raw/<Id>` (word times in source seconds).
// The same segments render "plain" for the raw side of a before/after comparison, frame-synced to the edit.

export type Word = { text: string; start: number; end: number };
export type RawClip = {
  file: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  in: number;
  out: number;
  words: Word[];
  pauses: { start: number; end: number }[];
  fillers: Word[];
};
export type Transcript = { clips: RawClip[] };

/** One piece of source footage on the output timeline. */
export type Segment = {
  file: string;
  /** output start frame */
  from: number;
  frames: number;
  /** source start, in seconds */
  src: number;
  /** framing: 1 = wide, >1 = punched in. Alternating framings hide jump cuts. */
  zoom: number;
};
/** A word on the output timeline (frames). */
export type EditWord = { text: string; from: number; to: number };

export type EditOptions = {
  fps?: number;
  /** remove pauses longer than this (seconds); 0 keeps them */
  maxPause?: number;
  /** breath left on each side of a removed pause (seconds) */
  breath?: number;
  cutFillers?: boolean;
  /** framing per segment, cycled */
  zooms?: number[];
  /** per-clip trim overrides, by file */
  trims?: Record<string, { in?: number; out?: number }>;
};

/** Cuts pauses and fillers out of each clip and lays the pieces end to end. */
export const buildEdit = (t: Transcript, o: EditOptions = {}) => {
  const { fps = 30, maxPause = 0.45, breath = 0.12, cutFillers = true, zooms = [1, 1.16], trims = {} } = o;
  const segments: Segment[] = [];
  const words: EditWord[] = [];
  let at = 0;
  for (const c of t.clips) {
    const a = trims[c.file]?.in ?? c.in;
    const b = trims[c.file]?.out ?? c.out;
    const holes = [
      ...(maxPause > 0 ? c.pauses.filter((p) => p.end - p.start > maxPause).map((p) => [p.start + breath, p.end - breath]) : []),
      ...(cutFillers ? c.fillers.map((w) => [w.start - 0.03, w.end + 0.03]) : []),
    ].sort((x, y) => x[0] - y[0]);
    const pieces: [number, number][] = [];
    let s = a;
    for (const [h0, h1] of holes) {
      if (h1 <= s || h0 >= b) continue;
      if (h0 > s) pieces.push([s, h0]);
      s = Math.max(s, h1);
    }
    if (b > s) pieces.push([s, b]);
    for (const [p0, p1] of pieces) {
      const frames = Math.round((p1 - p0) * fps);
      if (frames < 8) continue;
      segments.push({ file: c.file, from: at, frames, src: p0, zoom: zooms[segments.length % zooms.length] });
      for (const w of c.words) {
        const mid = (w.start + w.end) / 2;
        if (mid >= p0 && mid < p1 && !(cutFillers && c.fillers.some((f) => f.start === w.start))) {
          words.push({ text: w.text, from: at + Math.round((w.start - p0) * fps), to: at + Math.round((w.end - p0) * fps) });
        }
      }
      at += frames;
    }
  }
  return { segments, words, frames: at };
};

/** Plays the segments. `plain` = untreated (no framing, grade or texture): the raw side of a comparison. */
export const Footage: React.FC<{
  segments: Segment[];
  system?: DesignSystem;
  plain?: boolean;
  muted?: boolean;
  /** face position (0–1) that punch-ins scale around */
  focus?: { x: number; y: number };
  fps?: number;
}> = ({ segments, system, plain = false, muted = false, focus = { x: 0.5, y: 0.34 }, fps = 30 }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {segments.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={s.frames}>
        <SegmentShot s={s} plain={plain} muted={muted} focus={focus} fps={fps} />
      </Sequence>
    ))}
    {!plain && <Vignette />}
    {!plain && system && <SystemTexture system={system} />}
  </AbsoluteFill>
);

const SegmentShot: React.FC<{ s: Segment; plain: boolean; muted: boolean; focus: { x: number; y: number }; fps: number }> = ({
  s,
  plain,
  muted,
  focus,
  fps,
}) => {
  const f = useCurrentFrame();
  // Slow push keeps every shot alive; 2-frame audio ramps stop clicks at the cuts.
  const scale = plain ? 1 : s.zoom * (1 + 0.025 * (f / s.frames));
  const vol = interpolate(f, [0, 2, s.frames - 2, s.frames], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }}>
      <OffthreadVideo
        src={staticFile(s.file)}
        trimBefore={Math.round(s.src * fps)}
        muted={muted}
        volume={vol}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
          filter: plain ? undefined : "contrast(1.08) saturate(1.06) brightness(1.02)",
        }}
      />
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 40%, transparent 55%, rgba(0,0,0,0.42) 100%)" }} />
);

type Chunk = { words: EditWord[]; from: number; to: number };

/** Groups words into short caption lines: max `max` words, broken at punctuation and at gaps. */
export const chunkWords = (words: EditWord[], max = 3, gap = 9): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: EditWord[] = [];
  const flush = () => {
    if (cur.length) chunks.push({ words: cur, from: cur[0].from, to: cur[cur.length - 1].to });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && (cur.length >= max || /[.,!?;:…]$/.test(prev.text) || w.from - prev.to > gap)) flush();
    cur.push(w);
  });
  flush();
  // Each line holds until the next one starts (or 12 frames after its last word).
  return chunks.map((c, i) => ({ ...c, to: Math.min(chunks[i + 1]?.from ?? Infinity, c.to + 12) }));
};

/**
 * Word-by-word captions in the design system's display face. The spoken word is boxed in the accent;
 * `emphasis` words (lower-case, no punctuation) get the box at a larger size. Sits on a soft scrim inside the safe zone.
 */
export const Captions: React.FC<{
  words: EditWord[];
  system: DesignSystem;
  y?: number;
  size?: number;
  maxWords?: number;
  emphasis?: string[];
  textColor?: string;
}> = ({ words, system, y = 1150, size = 92, maxWords = 3, emphasis = [], textColor = "#FFFFFF" }) => {
  const f = useCurrentFrame();
  const { type, palette } = system;
  const chunk = chunkWords(words, maxWords).find((c) => f >= c.from - 2 && f < c.to);
  const E = ease.of(system);
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y - 260,
          height: 620,
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%)",
        }}
      />
      {chunk && (
        <div
          style={{
            position: "absolute",
            left: 80,
            width: 920,
            top: y,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            columnGap: size * 0.26,
            rowGap: 8,
            transform: `translateY(${interpolate(f, [chunk.from - 2, chunk.from + 4], [18, 0], { ...clamp, easing: E })}px)`,
          }}
        >
          {chunk.words.map((w, i) => {
            const active = f >= w.from - 1 && f < (chunk.words[i + 1]?.from ?? chunk.to);
            const big = emphasis.includes(norm(w.text));
            const pop = interpolate(f, [w.from - 1, w.from + 4], [0.86, 1], { ...clamp, easing: ease.backOut });
            return (
              <span
                key={i}
                style={{
                  fontFamily: type.display,
                  fontWeight: type.displayWeight,
                  fontSize: big ? size * 1.3 : size,
                  letterSpacing: `${Math.max(type.displayTracking, -0.03)}em`,
                  textTransform: type.uppercase ? "uppercase" : "none",
                  lineHeight: 1,
                  color: active ? palette.bg : textColor,
                  background: active ? palette.accent : "transparent",
                  padding: "6px 14px 10px",
                  margin: "0 -14px",
                  transform: `scale(${active ? pop : 1})`,
                  display: "inline-block",
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Small mono label chip ("RAW", "EDIT", timecodes). */
export const Chip: React.FC<{ system: DesignSystem; children: React.ReactNode; accent?: boolean; style?: React.CSSProperties }> = ({
  system,
  children,
  accent = false,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      fontFamily: system.type.mono ?? system.type.body,
      fontWeight: 700,
      fontSize: 44,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: accent ? system.palette.bg : system.palette.ink,
      background: accent ? system.palette.accent : system.palette.bg,
      padding: "10px 20px",
      lineHeight: 1,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Before/after wipe: `edited` everywhere, `raw` revealed left of the divider. `split` is 0 (all edit) … 1 (all raw).
 */
export const BeforeAfter: React.FC<{ raw: React.ReactNode; edited: React.ReactNode; split: number; system: DesignSystem; labels?: boolean }> = ({
  raw,
  edited,
  split,
  system,
  labels = true,
}) => {
  const x = split * 1080;
  return (
    <AbsoluteFill>
      <AbsoluteFill>{edited}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}>{raw}</AbsoluteFill>
      {split > 0.001 && split < 0.999 && (
        <div style={{ position: "absolute", left: x - 4, top: 0, width: 8, height: 1920, background: system.palette.accent }} />
      )}
      {labels && split > 0.12 && <Chip system={system} style={{ left: 80, top: 240 }}>Raw</Chip>}
      {labels && split < 0.88 && (
        <Chip system={system} accent style={{ right: 80, top: 240 }}>
          Edit
        </Chip>
      )}
    </AbsoluteFill>
  );
};
