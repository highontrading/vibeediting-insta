import { useMemo } from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";
import { Music, Sfx } from "../kit/Sfx";

// Stop Motion / explainer: "The camera, from 1839 to your pocket". Paper cut-out, Risograph system.
// Everything is a piece of torn or cut paper with a real two-stage shadow, animated on 12fps steps
// with a hand-placed jitter. Music: pulse-minimal-120 (beat = 15 frames = 6 animation steps).
// Narration: bm_george, public/voice/CameraHistoryPaper. Cuts are locked to the line starts below.
const S = systems.risograph;
const P = S.palette;
const T = S.type;
const E = ease.of(S); // back-out: paper slides in and settles
const IO = ease.quintInOut;
const OUT = ease.expoOut;
const asset = (f: string) => staticFile(`assets/CameraHistoryPaper/${f}`);
const CREAM = "#FBF6EC"; // the paper core showing at a tear (riso stock is a touch lighter than the printed bg)
const SHADOW = "31,26,23";

// ─── Timeline (frames). Line durations come from public/voice/CameraHistoryPaper/timings.json ──────
const beat = (n: number) => n * 15;
const VO: { id: string; at: number; dur: number }[] = [
  { id: "l01", at: 8, dur: 61 }, // A tiny hole. [30] A dark room.
  { id: "l02", at: beat(5), dur: 99 }, // The world outside appears on the wall, upside down.
  { id: "l03", at: beat(12), dur: 74 }, // People knew this two thousand years ago.
  { id: "l04", at: beat(18), dur: 60 }, // But nobody could keep the picture.
  { id: "l05", at: beat(25), dur: 105 }, // Eighteen thirty-nine. [47] Paris announces the daguerreotype.
  { id: "l06", at: beat(33), dur: 94 }, // An image fixed on silver. [57] Sit still for minutes.
  { id: "l07", at: beat(41), dur: 118 }, // Eighteen eighty-eight. [42] A box camera with a hundred shots inside.
  { id: "l08", at: beat(50), dur: 64 }, // You press the button. [37] We do the rest.
  { id: "l09", at: beat(56), dur: 121 }, // Then thirty-five millimetre film. [70] A camera for your coat pocket.
  { id: "l10", at: beat(66), dur: 146 }, // Nineteen seventy-five. [57] Steven Sasson builds a digital camera at Kodak.
  { id: "l11", at: beat(76), dur: 138 }, // Eight pounds. [30] Ten thousand pixels. [76] Twenty-three seconds to save each one.
  { id: "l12", at: beat(87), dur: 78 }, // By two thousand, [37] phones take photos.
  { id: "l13", at: beat(93), dur: 73 }, // Today, we take over a trillion a year.
  { id: "l14", at: beat(100), dur: 97 }, // Look closer. [27] It's still a tiny hole [71] and a dark room.
  { id: "l15", at: beat(108), dur: 62 }, // Just small enough [36] for your pocket.
];
const at = (id: string) => VO.find((v) => v.id === id)!.at;

// Sections (each starts on a beat; torn-paper wipes cover the cut 15 frames before the next line)
const WIPE1 = beat(24); // obscura → 1839
const WIPE2 = beat(40); // 1839 → 1888
const WIPE3 = beat(55); // 1888 → 35mm
const WIPE4 = beat(65); // 35mm → 1975
const WIPE5 = beat(86); // 1975 → 2000
const PAYOFF = beat(99);
const END = beat(114);
export const CAMERA_HISTORY_PAPER_DURATION = END + END_CARD_FRAMES;

// ─── Stop-motion helpers ───────────────────────────────────────────────────────────────────────────
const STEP = 2.5; // 30fps → 12fps
const sidx = (f: number) => Math.floor(f / STEP);
const sf = (f: number) => sidx(f) * STEP;
/** Eased move sampled on 12fps steps. */
const mv = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(sf(f), [a, b], [from, to], { ...clamp, easing: e });
/** Hand jitter: a new tiny offset every step, as if each piece were re-placed under the camera. */
const jit = (seed: number, f: number, amp = 1) => {
  const k = sidx(f);
  return {
    x: (rand(seed * 31.7 + k * 7.31) - 0.5) * 2 * amp,
    y: (rand(seed * 17.3 + k * 3.17 + 5) - 0.5) * 2 * amp,
    r: (rand(seed * 13.1 + k * 1.71 + 9) - 0.5) * 0.45 * amp,
  };
};

// ─── Paper ─────────────────────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
const PAD = 16;

/** Outline of a w×h piece. `torn` is a string of the torn sides ("tlrb"); other sides are scissor-cut. */
const rectOutline = (w: number, h: number, seed: number, torn: string, grow = 0, amp = 5): Pt[] => {
  const corners: Pt[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const sides = ["t", "r", "b", "l"];
  const normals: Pt[] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const pts: Pt[] = [];
  for (let s = 0; s < 4; s++) {
    const [x0, y0] = corners[s];
    const [x1, y1] = corners[(s + 1) % 4];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const isTorn = torn.includes(sides[s]);
    const n = Math.max(2, Math.round(len / (isTorn ? 8 : 40)));
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const r1 = rand(seed * 7.7 + s * 101 + i * 1.37);
      let off: number;
      if (isTorn) {
        const raw = (r1 - 0.5) * 2;
        off = prev * 0.45 + raw * 0.55; // a little smoothing: fibre edges wander, they don't zig-zag
        prev = off;
        if (rand(seed * 3.3 + s * 57 + i * 2.1) < 0.06) off -= 1.4; // the odd bite
        off = off * amp + grow + rand(seed + s * 13 + i * 0.7) * (grow > 0 ? 2.2 : 0);
      } else {
        off = (r1 - 0.5) * 1.1 + (grow > 0 ? grow * 0.25 : 0);
      }
      pts.push([x0 + (x1 - x0) * t + normals[s][0] * off, y0 + (y1 - y0) * t + normals[s][1] * off]);
    }
  }
  return pts;
};

const ellipseOutline = (w: number, h: number, seed: number, isTorn: boolean, grow = 0, amp = 5): Pt[] => {
  const per = Math.PI * (w + h) * 0.5;
  const n = Math.max(24, Math.round(per / (isTorn ? 8 : 22)));
  const pts: Pt[] = [];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let off: number;
    if (isTorn) {
      const raw = (rand(seed * 5.1 + i * 1.91) - 0.5) * 2;
      off = prev * 0.45 + raw * 0.55;
      prev = off;
      off = off * amp + grow + rand(seed + i * 0.77) * (grow > 0 ? 2.2 : 0);
    } else {
      off = (rand(seed * 5.1 + i * 1.91) - 0.5) * 0.9 + (grow > 0 ? grow * 0.25 : 0);
    }
    pts.push([w / 2 + Math.cos(a) * (w / 2 + off), h / 2 + Math.sin(a) * (h / 2 + off)]);
  }
  return pts;
};

/** Scissor-cut rounded rectangle (phones), sampled every ~12px with a slight hand wobble. */
const roundOutline = (w: number, h: number, r: number, seed: number): Pt[] => {
  const pts: Pt[] = [];
  const arcs: [number, number, number][] = [
    [w - r, r, -90],
    [w - r, h - r, 0],
    [r, h - r, 90],
    [r, r, 180],
  ];
  arcs.forEach(([cx, cy, a0], k) => {
    for (let i = 0; i <= 8; i++) {
      const a = ((a0 + (i / 8) * 90) * Math.PI) / 180;
      const wob = (rand(seed + k * 11 + i * 0.37) - 0.5) * 1.2;
      pts.push([cx + Math.cos(a) * (r + wob), cy + Math.sin(a) * (r + wob)]);
    }
  });
  return pts;
};

const clip = (pts: Pt[]) => `polygon(${pts.map(([x, y]) => `${(x + PAD).toFixed(1)}px ${(y + PAD).toFixed(1)}px`).join(",")})`;

const fibre = (color: string, seed: number): React.CSSProperties => ({
  backgroundColor: color,
  backgroundImage: `url(${asset("fibre.png")})`,
  backgroundBlendMode: "multiply",
  backgroundSize: "512px 512px",
  backgroundPosition: `${(seed * 137) % 512}px ${(seed * 291) % 512}px`,
});

/** Real paper shadow: a tight contact shadow plus a soft cast shadow that grows when the piece is lifted. */
const shadow = (lift: number, k = 1) =>
  `drop-shadow(${0.5 + lift}px ${(1.5 + lift * 2) * k}px ${(1 + lift) * k}px rgba(${SHADOW},0.38)) drop-shadow(${(2 + lift * 6) * k}px ${(5 + lift * 14) * k}px ${(6 + lift * 10) * k}px rgba(${SHADOW},0.2))`;

const Paper: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  seed: number;
  torn?: string; // sides torn ("tlrb"); "" = all scissor-cut
  shape?: "rect" | "ellipse";
  rot?: number;
  lift?: number;
  rim?: string | null;
  texture?: boolean;
  opacity?: number;
  amp?: number;
  shadowK?: number;
  radius?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, color, seed, torn = "", shape = "rect", rot = 0, lift = 0, rim = CREAM, texture = true, opacity = 1, amp = 5, shadowK = 1, radius = 0, children, style }) => {
  const isTorn = torn.length > 0;
  const { face, core } = useMemo(() => {
    if (radius > 0) return { face: roundOutline(w, h, radius, seed), core: null };
    if (shape === "ellipse") {
      return { face: ellipseOutline(w, h, seed, isTorn, 0, amp), core: isTorn ? ellipseOutline(w, h, seed, true, 3.5, amp * 1.3) : null };
    }
    return { face: rectOutline(w, h, seed, torn, 0, amp), core: isTorn ? rectOutline(w, h, seed, torn, 3.5, amp * 1.3) : null };
  }, [w, h, seed, torn, shape, isTorn, amp, radius]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - PAD,
        top: y - PAD,
        width: w + PAD * 2,
        height: h + PAD * 2,
        transform: `rotate(${rot}deg)`,
        filter: shadowK > 0 ? shadow(lift, shadowK) : undefined,
        opacity,
        ...style,
      }}
    >
      {core && rim && <div style={{ position: "absolute", inset: 0, clipPath: clip(core), ...fibre(rim, seed + 3) }} />}
      <div style={{ position: "absolute", inset: 0, clipPath: clip(face), ...(texture ? fibre(color, seed) : { background: color }) }}>
        <div style={{ position: "absolute", left: PAD, top: PAD, width: w, height: h }}>{children}</div>
        {texture && (
          <>
            {/* fibre that also reads on dark stock, and a faint curl: paper is never perfectly flat */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${asset("fibre-overlay.png")})`,
                backgroundSize: "512px 512px",
                backgroundPosition: `${(seed * 71) % 512}px ${(seed * 53) % 512}px`,
                mixBlendMode: "overlay",
                opacity: 0.55,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(${110 + (seed * 47) % 140}deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 45%, rgba(${SHADOW},0.10))`,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

/** Riso print of an archival photo: ink layers multiplied onto the paper, the second layer misregistered. */
const Riso: React.FC<{ name: string; inks?: string[]; w: number; h: number; mis?: { x: number; y: number }; pos?: string; scale?: number }> = ({
  name,
  inks = ["blue", "pink"],
  w,
  h,
  mis = { x: 5, y: 3 },
  pos = "50% 50%",
  scale = 1,
}) => (
  <div style={{ position: "absolute", inset: 0, width: w, height: h, overflow: "hidden" }}>
    {inks.map((ink, i) => (
      <Img
        key={ink}
        src={asset(`${name}-${ink}.png`)}
        style={{
          position: "absolute",
          inset: 0,
          width: w,
          height: h,
          objectFit: "cover",
          objectPosition: pos,
          mixBlendMode: "multiply",
          transform: `translate(${i ? mis.x : 0}px, ${i ? mis.y : 0}px) scale(${scale})`,
        }}
      />
    ))}
  </div>
);

// ─── Type: words cut from paper, placed one per step ───────────────────────────────────────────────

const Words: React.FC<{
  text: string;
  f: number;
  at: number;
  x: number;
  y: number;
  size: number;
  color?: string;
  font?: string;
  weight?: number;
  tracking?: number;
  upper?: boolean;
  seed?: number;
  lh?: number;
  width?: number;
  align?: "left" | "center";
  out?: number;
  pinkWord?: number; // index of a word printed in the accent
  strip?: string; // print each line on a torn strip of this paper (for type over busy scenes)
}> = ({ text, f, at, x, y, size, color = P.ink, font = T.display, weight = T.displayWeight, tracking = T.displayTracking, upper = false, seed = 1, lh = 0.94, width = 920, align = "left", out, pinkWord, strip }) => {
  const lines = text.split("\n");
  let idx = 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, width, textAlign: align, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: `${tracking}em`, textTransform: upper ? "uppercase" : "none" }}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap", position: "relative" }}>
          {strip && f >= (at <= 0 ? -100 : at + idx * STEP) && (
            <Paper
              x={-24}
              y={size * lh * 0.04 - 8}
              w={line.length * size * 0.42 + 56}
              h={size * lh + 10}
              color={strip}
              seed={seed * 7 + li}
              torn="lr"
              rot={(rand(seed + li) - 0.5) * 2}
              lift={(1 - mv(f, at + idx * STEP, at + idx * STEP + 7.5, 0, 1, E)) * 2}
              style={{ zIndex: 0, transform: `rotate(${(rand(seed + li) - 0.5) * 2}deg) translateY(${(1 - mv(f, at + idx * STEP, at + idx * STEP + 7.5, 0, 1, E)) * size * 0.5}px)` }}
            />
          )}
          {line.split(" ").map((word, wi) => {
            const i = idx++;
            const t0 = at <= 0 ? -100 : at + i * STEP; // frame 0 is the thumbnail: everything already placed
            if (f < t0) return <span key={wi} style={{ display: "inline-block", opacity: 0 }}>{word}&nbsp;</span>;
            const p = mv(f, t0, t0 + 7.5, 0, 1, E);
            const gone = out !== undefined ? mv(f, out + i * STEP * 0.5, out + i * STEP * 0.5 + 7.5, 0, 1, IO) : 0;
            const j = jit(seed * 10 + i, f, 0.8);
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  position: "relative",
                  color: i === pinkWord ? P.accent : color,
                  transform: `translate(${j.x}px, ${j.y + (1 - p) * size * 0.5 - gone * 1400}px) rotate(${(rand(seed * 3 + i) - 0.5) * 2.4 + j.r}deg)`,
                  filter: shadow(1 - p, 0.6),
                  marginRight: wi < line.split(" ").length - 1 ? "0.22em" : 0,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Mono label printed on a torn strip of paper. */
const Label: React.FC<{ text: string; f: number; at: number; x: number; y: number; color?: string; ink?: string; size?: number; rot?: number; seed?: number; from?: "left" | "right" | "down" }> = ({
  text,
  f,
  at,
  x,
  y,
  color = P.accent3,
  ink = P.ink,
  size = 48,
  rot = -2,
  seed = 5,
  from = "left",
}) => {
  if (f < at) return null;
  const p = mv(f, at, at + 10, 0, 1, E);
  const w = text.length * size * 0.62 + 44;
  const h = size * 1.5;
  const j = jit(seed, f, 0.9);
  const dx = from === "left" ? (1 - p) * -900 : from === "right" ? (1 - p) * 900 : 0;
  const dy = from === "down" ? (1 - p) * 300 : 0;
  return (
    <Paper x={x + dx + j.x} y={y + dy + j.y} w={w} h={h} color={color} seed={seed} torn="lr" rot={rot + j.r} lift={(1 - p) * 2}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontWeight: 700, fontSize: size, color: ink, letterSpacing: "0.02em" }}>
        {text}
      </div>
    </Paper>
  );
};

/** A year built from four torn cards, slammed down one per step. */
const Year: React.FC<{ year: string; f: number; at: number; y?: number; cardW?: number; colors?: string[] }> = ({ year, f, at, y = 360, cardW = 216, colors = [P.accent, P.accent3, P.accent2, P.accent] }) => {
  const h = cardW * 1.42;
  const gap = (920 - cardW * 4) / 3;
  return (
    <>
      {Array.from(year).map((d, i) => {
        const t0 = at + i * STEP * 1;
        if (f < t0) return null;
        const p = mv(f, t0, t0 + 5, 0, 1, OUT);
        const j = jit(40 + i, f, 1);
        const scale = 1.35 - p * 0.35;
        const rot = (rand(i * 9 + year.charCodeAt(i)) - 0.5) * 7;
        const bg = colors[i % colors.length];
        const fg = bg === P.accent2 ? CREAM : P.ink;
        return (
          <Paper
            key={i}
            x={80 + i * (cardW + gap) + j.x}
            y={y + j.y + (rand(i + 3) - 0.5) * 30}
            w={cardW}
            h={h}
            color={bg}
            seed={60 + i * 7 + year.charCodeAt(i)}
            torn="tblr"
            rot={rot + j.r}
            lift={(1 - p) * 3}
            style={{ transform: `rotate(${rot + j.r}deg) scale(${scale})` }}
          >
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.display, fontWeight: 800, fontSize: cardW * 1.3, letterSpacing: "-0.04em", color: fg, lineHeight: 1, paddingBottom: cardW * 0.08 }}>
              {d}
            </div>
          </Paper>
        );
      })}
    </>
  );
};

/** Camera stage: a stepped push/pan (scale about a focus point, which lands at a frame position). */
const Stage: React.FC<{ k: number; fx: number; fy: number; tx?: number; ty?: number; children: React.ReactNode }> = ({ k, fx, fy, tx = 540, ty = 960, children }) => (
  <AbsoluteFill style={{ transform: `translate(${tx - fx * k}px, ${ty - fy * k}px) scale(${k})`, transformOrigin: "0 0" }}>{children}</AbsoluteFill>
);

// ─── Torn-paper wipe ───────────────────────────────────────────────────────────────────────────────
const WIPE_LEN = 24;
const SHEET_H = 2500;
const sheetTop = (f: number) => mv(f, 0, WIPE_LEN, 1960, -SHEET_H - 60, IO);
const Wipe: React.FC<{ color: string; seed: number }> = ({ color, seed }) => {
  const f = useCurrentFrame();
  if (f > WIPE_LEN) return null;
  const top = sheetTop(f);
  return <Paper x={-60} y={top} w={1200} h={SHEET_H} color={color} seed={seed} torn="tb" amp={9} lift={3} rot={-2} />;
};
/** Frame (relative to the wipe start) at which the sheet fully covers the screen: swap scenes there. */
const WIPE_SWAP = 12;

// ─── Scene 1: the dark room ────────────────────────────────────────────────────────────────────────
const HOLE: Pt = [420, 880];
const TREE_TOP: Pt = [212, 760];
const TREE_BASE: Pt = [212, 1060];
const SCREEN_X = 830;
const MAG = (SCREEN_X - HOLE[0]) / (HOLE[0] - TREE_TOP[0]);
const projY = (y: number) => HOLE[1] + (HOLE[1] - y) * MAG;

const Ray: React.FC<{ from: Pt; to: Pt; draw: number; w?: number; color?: string; opacity?: number }> = ({ from, to, draw, w = 7, color = P.accent3, opacity = 1 }) => {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) * draw;
  const ang = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  return <div style={{ position: "absolute", left: from[0], top: from[1] - w / 2, width: len, height: w, background: color, opacity, transformOrigin: `0 ${w / 2}px`, transform: `rotate(${ang}deg)` }} />;
};

const Tree: React.FC<{ cx: number; top: number; base: number; canopy: string; seed: number; f: number }> = ({ cx, top, base, canopy, seed, f }) => {
  const j = jit(seed, f, 0.6);
  const ch = (base - top) * 0.62;
  return (
    <>
      <Paper x={cx - 11 + j.x} y={top + ch * 0.6} w={22} h={base - top - ch * 0.6} color={P.ink} seed={seed + 1} rim={null} />
      <Paper x={cx - 98 + j.x} y={top + j.y} w={196} h={ch} color={canopy} seed={seed + 2} shape="ellipse" torn="x" />
      <Paper x={cx - 120 + j.x} y={top + ch * 0.38 + j.y} w={110} h={ch * 0.6} color={canopy} seed={seed + 3} shape="ellipse" torn="x" />
    </>
  );
};

/** The camera obscura diorama. `light` 0..1 draws the rays; `pic` 0..1 shows the projection; `fall` drops it. */
const Diorama: React.FC<{ f: number; light: number; pic: number; fall?: number; cloud?: number; showSun?: boolean }> = ({ f, light, pic, fall = 0, cloud = 0, showSun = true }) => {
  const j = jit(3, f, 0.5);
  const screenTop = projY(TREE_BASE[1]) - 40;
  const screenBot = projY(TREE_TOP[1]) + 40;
  const pTop = projY(TREE_TOP[1]);
  const pBase = projY(TREE_BASE[1]);
  const fallY = fall * fall * 1300;
  return (
    <AbsoluteFill>
      {/* ground */}
      <Paper x={30} y={1048} w={420} h={64} color={P.muted} seed={11} torn="t" rot={-1} />
      {showSun && <Paper x={96 + j.x} y={500 + j.y} w={136} h={136} color={P.accent3} seed={12} shape="ellipse" torn="x" />}
      {cloud > 0 && <Paper x={-330 + cloud * 360} y={520} w={300} h={110} color={CREAM} seed={13} shape="ellipse" torn="x" lift={1} />}
      <Tree cx={TREE_TOP[0]} top={TREE_TOP[1]} base={TREE_BASE[1]} canopy={P.accent2} seed={20} f={f} />
      {/* the dark room */}
      <Paper x={HOLE[0]} y={470} w={620} h={760} color={P.ink} seed={30} torn="" rot={0.4} />
      <Paper x={SCREEN_X - 170} y={screenTop} w={330} h={screenBot - screenTop} color={P.surface} seed={31} torn="tb" rot={-0.8} />
      {/* light wedge inside the room */}
      {light > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <polygon points={`${HOLE[0]},${HOLE[1]} ${SCREEN_X - 170},${pBase - 20} ${SCREEN_X - 170},${pTop + 20}`} fill={P.accent3} opacity={0.11 * light} />
        </svg>
      )}
      {/* the projection: the tree, upside down, printed in light */}
      {pic > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: pic,
            transform: `translate(${fall * 60}px, ${fallY}px) rotate(${fall * 24}deg)`,
            transformOrigin: `${SCREEN_X}px ${HOLE[1]}px`,
          }}
        >
          <Paper x={SCREEN_X - 150} y={pBase - 10} w={300} h={pTop - pBase + 20} color={CREAM} seed={32} torn="tblr" amp={3} lift={fall * 3}>
            {/* upside down: the ground is at the top, the trunk hangs down, the canopy is at the bottom */}
            <div style={{ position: "absolute", inset: 0 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 34, background: P.muted, opacity: 0.8 }} />
              <div style={{ position: "absolute", left: 150 - 14, top: 20, width: 28, height: (pTop - pBase) * 0.5, background: P.ink, opacity: 0.85 }} />
              <div style={{ position: "absolute", left: 150 - 135, top: (pTop - pBase) * 0.4, width: 270, height: (pTop - pBase) * 0.58, borderRadius: "50%", background: P.accent, mixBlendMode: "multiply" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `radial-gradient(${P.accent2} 30%, transparent 33%)`,
                  backgroundSize: "11px 11px",
                  mixBlendMode: "multiply",
                  opacity: 0.35,
                }}
              />
            </div>
          </Paper>
        </div>
      )}
      {/* rays: tree top → hole → bottom of the picture, and base → hole → top */}
      {light > 0 && (
        <>
          <Ray from={TREE_TOP} to={HOLE} draw={Math.min(1, light * 2)} />
          <Ray from={TREE_BASE} to={HOLE} draw={Math.min(1, light * 2)} />
          <Ray from={HOLE} to={[SCREEN_X - 150, projY(TREE_TOP[1]) - 4]} draw={Math.max(0, light * 2 - 1)} />
          <Ray from={HOLE} to={[SCREEN_X - 150, projY(TREE_BASE[1]) + 4]} draw={Math.max(0, light * 2 - 1)} />
        </>
      )}
      {/* the pinhole */}
      <Paper x={HOLE[0] - 13} y={HOLE[1] - 13} w={26} h={26} color={P.accent3} seed={33} shape="ellipse" torn="" rim={null} shadowK={0} />
    </AbsoluteFill>
  );
};

const SceneObscura: React.FC = () => {
  const f = useCurrentFrame();
  const L2 = at("l02");
  const L3 = at("l03");
  const L4 = at("l04");
  // shot A (0–L2): wide. Shot B (L2–L3): close-up on the wall. Shot C (L3–L4): the object. Shot D: wide, gone.
  if (f < L2) {
    // wide on the thumbnail; cut in on beat 3 ("A dark room.") toward the hole
    const cutIn = f >= beat(3);
    const k = cutIn ? 1.22 + 0.04 * ((sf(f) - beat(3)) / (L2 - beat(3))) : 1.08 + 0.03 * (sf(f) / beat(3));
    return (
      <AbsoluteFill>
        <SetSheet seed={1} color={P.surface} />
        <Stage k={k} fx={cutIn ? 640 : 520} fy={850} ty={cutIn ? 900 : 880}>
          <Diorama f={f} light={1} pic={1} />
        </Stage>
        <Words text="THE CAMERA · 1839 TO NOW" f={f} at={0} x={80} y={232} size={48} font={T.mono!} weight={700} tracking={0.02} />
        <Words text="A tiny hole." f={f} at={0} x={80} y={292} size={150} seed={2} />
        {/* both lines are on the thumbnail; "room." is re-printed pink on the VO beat */}
        <Words text="A dark room." f={f} at={0} x={cutIn ? 104 : 80} y={1335} size={150} seed={3} pinkWord={f >= 8 + 35 ? 2 : undefined} strip={cutIn ? CREAM : undefined} />
      </AbsoluteFill>
    );
  }
  if (f < L3) {
    const lf = f - L2;
    const flip = mv(f, L2 + 87, L2 + 97, 180, 0, E);
    // A (L2→+45): close on the picture. B (+45→+72, beat 8): the room, the picture develops in steps.
    // C (+72→): close again for "upside down".
    const shotB = lf >= 45 && lf < 72;
    const k = shotB ? 1.45 + 0.04 * ((lf - 45) / 27) : lf < 45 ? 1.9 + 0.06 * (sf(lf) / 45) : 2.1 + 0.06 * ((sf(lf) - 72) / 33);
    const pic = shotB ? Math.min(1, Math.floor((sf(lf) - 45) / 2.5) / 5 + 0.1) : 1;
    return (
      <AbsoluteFill>
        <Stage k={k} fx={shotB ? 690 : SCREEN_X - 60} fy={HOLE[1]} ty={shotB ? 860 : 820}>
          <Diorama f={f} light={1} pic={pic} />
        </Stage>
        <Label text="THE WORLD OUTSIDE" f={f} at={L2 + 6} x={80} y={250} color={P.accent3} seed={41} />
        {f >= L2 + 72 && (
          <div style={{ position: "absolute", left: 80, top: 1330, width: 920, height: 150, transformOrigin: "50% 50%", transform: `rotate(${flip}deg)` }}>
            <Words text="Upside down." f={f} at={L2 + 72} x={24} y={0} size={136} seed={7} pinkWord={1} strip={CREAM} />
          </div>
        )}
      </AbsoluteFill>
    );
  }
  if (f < L4) {
    const lf = f - L3;
    const inP = mv(lf, 0, 7.5, 0, 1, E);
    const j = jit(50, f, 0.8);
    return (
      <AbsoluteFill>
        <Paper x={-80} y={200} w={760} h={420} color={P.accent3} seed={51} torn="tblr" amp={8} rot={-4} />
        <Words text={"Camera\nobscura"} f={f} at={L3} x={80} y={270} size={150} seed={8} lh={0.9} />
        <Paper x={90 + (1 - inP) * 380 + j.x} y={640 + j.y} w={900} h={640} color={CREAM} seed={54} torn="tblr" rot={1.5 + j.r} lift={(1 - inP) * 3}>
          <div style={{ position: "absolute", left: 30, top: 20 }}>
            <Riso name="obscura" w={840} h={641 * 0.94} mis={{ x: 6, y: 4 }} />
          </div>
        </Paper>
        <Label text="LATIN: “DARK ROOM”" f={f} at={L3 + 14} x={80} y={1320} color={P.surface} seed={52} rot={1.5} />
        <Label text="2,000+ YEARS AGO" f={f} at={L3 + 23} x={430} y={1420} color={P.accent} seed={53} rot={-3} from="right" />
      </AbsoluteFill>
    );
  }
  const lf = f - L4;
  const cloud = mv(lf, 6, 26, 0, 1, E) + Math.max(0, sf(lf) - 26) * 0.004; // keeps drifting through the silence
  const fall = Math.max(0, (sf(lf) - 32) / 26);
  return (
    <AbsoluteFill>
      <SetSheet seed={1} color={P.surface} />
      <Stage k={1.08} fx={520} fy={850} ty={880}>
        <Diorama f={f} light={1 - mv(lf, 18, 30, 0, 1, IO)} pic={1} fall={Math.min(1.3, fall)} cloud={cloud} />
      </Stage>
      <Words text="Gone." f={f} at={L4 + 44} x={80} y={1335} size={150} seed={9} />
    </AbsoluteFill>
  );
};

/** A big torn sheet laid on the table behind a scene: gives every set a layer of depth. */
const SetSheet: React.FC<{ seed: number; color: string; y?: number; h?: number; rot?: number }> = ({ seed, color, y = 440, h = 900, rot = -2.5 }) => (
  <Paper x={-120} y={y} w={1320} h={h} color={color} seed={seed + 900} torn="tb" amp={9} rot={rot} />
);

// ─── Scene 2: 1839 ─────────────────────────────────────────────────────────────────────────────────
const OVAL_W = 620;
const OVAL_H = 780;

const Daguerreotype: React.FC<{ f: number; mis: number; x: number; y: number; k?: number }> = ({ f, mis, x, y, k = 1 }) => {
  const j = jit(70, f, 0.6);
  return (
    <div style={{ position: "absolute", left: x + j.x, top: y + j.y, transform: `scale(${k})`, transformOrigin: "50% 40%", width: OVAL_W + 120, height: OVAL_H + 140 }}>
      {/* brass case (yellow card) and a cream mat with an oval window */}
      <Paper x={0} y={0} w={OVAL_W + 120} h={OVAL_H + 140} color={P.accent3} seed={71} torn="" rot={-1.2} />
      <Paper x={60} y={70} w={OVAL_W} h={OVAL_H} color={CREAM} seed={72} shape="ellipse" torn="" rim={null}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
          <Riso name="molard" w={OVAL_W} h={OVAL_H} mis={{ x: mis, y: mis * 0.6 }} pos="50% 30%" />
        </div>
      </Paper>
    </div>
  );
};

const Clock: React.FC<{ f: number; at: number; x: number; y: number; r: number }> = ({ f, at: t0, x, y, r }) => {
  const turns = Math.max(0, sf(f) - t0) / 5; // the minute hand ticks a "minute" each two steps
  const p = mv(f, t0, t0 + 8, 0, 1, E);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(${(1 - p) * 500}px) rotate(-6deg)` }}>
      <Paper x={0} y={0} w={r * 2} h={r * 2} color={CREAM} seed={81} shape="ellipse" torn="x" lift={(1 - p) * 2}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: r - 4, top: 14, width: 8, height: i % 3 === 0 ? 34 : 18, background: P.ink, transformOrigin: `4px ${r - 14}px`, transform: `rotate(${i * 30}deg)` }} />
        ))}
        <div style={{ position: "absolute", left: r - 6, top: r - r * 0.5, width: 12, height: r * 0.5, background: P.ink, transformOrigin: "6px 100%", transform: `rotate(${120 + Math.floor(turns) * 3}deg)` }} />
        <div style={{ position: "absolute", left: r - 4, top: r - r * 0.78, width: 8, height: r * 0.78, background: P.accent, transformOrigin: "4px 100%", transform: `rotate(${Math.floor(turns) * 30}deg)` }} />
        <div style={{ position: "absolute", left: r - 12, top: r - 12, width: 24, height: 24, borderRadius: 12, background: P.ink }} />
      </Paper>
    </div>
  );
};

const Scene1839: React.FC = () => {
  const f = useCurrentFrame();
  const L5 = at("l05");
  const L6 = at("l06");
  const PORTRAIT = beat(31); // on the beat inside "daguerreotype"
  if (f < PORTRAIT) {
    return (
      <AbsoluteFill>
        <Year year="1839" f={f} at={L5} y={560} />
        <Label text="PARIS" f={f} at={L5 + 47} x={80} y={950} color={P.ink} ink={CREAM} size={56} seed={91} rot={-2} />
        <Words text="Daguerreotype." f={f} at={L5 + 52} x={80} y={1130} size={128} seed={11} />
      </AbsoluteFill>
    );
  }
  if (f < L6) {
    const p = mv(f, PORTRAIT, PORTRAIT + 12, 0, 1, E);
    return (
      <AbsoluteFill>
        <Daguerreotype f={f} mis={7} x={170 + (1 - p) * 1000} y={330} />
        <Label text="SELF-PORTRAIT · 1846–47" f={f} at={PORTRAIT + 4} x={80} y={1360} color={P.accent3} seed={92} rot={1.5} />
      </AbsoluteFill>
    );
  }
  const lf = f - L6;
  // close-up: the riso layers slide out of register, then snap together on "fixed"
  const mis = lf < 19 ? 26 : mv(lf, 19, 24, 26, 0, E);
  const k = 1.45 + 0.05 * (sf(lf) / 94);
  const sit = L6 + 53;
  return (
    <AbsoluteFill>
      <Daguerreotype f={f} mis={mis} x={170} y={250} k={k} />
      <Words text="Fixed." f={f} at={L6 + 19} x={104} y={1180} size={150} seed={12} out={sit - 4} strip={CREAM} />
      <Label text="ON SILVER-PLATED COPPER" f={f} at={L6 + 27} x={80} y={1380} color={P.surface} seed={93} rot={-1} />
      {f >= sit && <Words text="Sit still." f={f} at={sit} x={104} y={1180} size={150} seed={13} strip={CREAM} />}
      {f >= sit && <Clock f={f} at={sit + 4} x={680} y={250} r={150} />}
    </AbsoluteFill>
  );
};

// ─── Scene 3: 1888 ─────────────────────────────────────────────────────────────────────────────────
const BoxCamera: React.FC<{ f: number; press: number; flash: number }> = ({ f, press, flash }) => {
  const j = jit(100, f, 0.6);
  return (
    <div style={{ position: "absolute", left: 230 + j.x, top: 820 + j.y, width: 620, height: 420 }}>
      {/* button on top */}
      <Paper x={410} y={-34 + press * 18} w={70} h={44} color={P.accent} seed={101} torn="" />
      <Paper x={110} y={-22} w={90} h={30} color={P.muted} seed={102} torn="" />
      {/* body */}
      <Paper x={0} y={0} w={620} h={420} color={P.ink} seed={103} torn="">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 30 + i * 56, height: 2, background: "rgba(244,237,225,0.07)" }} />
        ))}
      </Paper>
      {/* lens */}
      <Paper x={210} y={110} w={200} h={200} color={P.surface} seed={104} shape="ellipse" torn="">
        <div style={{ position: "absolute", left: 40, top: 40, width: 120, height: 120, borderRadius: "50%", background: P.ink }} />
        <div style={{ position: "absolute", left: 68, top: 62, width: 26, height: 18, borderRadius: "50%", background: CREAM, opacity: 0.7, transform: "rotate(-30deg)" }} />
      </Paper>
      {/* flash: torn yellow strips thrown out from the lens for two steps */}
      {flash > 0 &&
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * 360 + 9;
          const len = 120 + flash * 160 + rand(i * 3) * 60;
          return (
            <div key={i} style={{ position: "absolute", left: 310, top: 210, transform: `rotate(${a}deg)`, transformOrigin: "0 0" }}>
              <Paper x={130 + (1 - flash) * 60} y={-14} w={len} h={28} color={P.accent3} seed={105 + i} torn="lr" rim={null} lift={0.5} />
            </div>
          );
        })}
    </div>
  );
};

const SNAPS = ["snap-dogman", "snap-house", "snap-street", "snap-church", "snap-tree", "snap-boy"];
const SNAP_SPOTS = [
  { x: 40, y: 560, r: -8, d: 270 },
  { x: 700, y: 520, r: 6, d: 260 },
  { x: 30, y: 1180, r: 5, d: 260 },
  { x: 730, y: 1170, r: -6, d: 250 },
  { x: 380, y: 1260, r: 3, d: 250 },
  { x: 700, y: 250, r: -4, d: 210 },
];

const Snapshot: React.FC<{ name: string; x: number; y: number; d: number; rot: number; seed: number; lift?: number }> = ({ name, x, y, d, rot, seed, lift = 0 }) => (
  <Paper x={x} y={y} w={d + 36} h={d + 60} color={CREAM} seed={seed} torn="" rot={rot} lift={lift}>
    <div style={{ position: "absolute", left: 18, top: 18, width: d, height: d, borderRadius: "50%", overflow: "hidden", background: CREAM }}>
      <Riso name={name} inks={["blue"]} w={d} h={d} />
    </div>
  </Paper>
);

const Scene1888: React.FC = () => {
  const f = useCurrentFrame();
  const L7 = at("l07");
  const L8 = at("l08");
  const CAM = beat(44);
  if (f < CAM) {
    return (
      <AbsoluteFill>
        <Year year="1888" f={f} at={L7} y={600} colors={[P.accent3, P.accent2, P.accent, P.accent3]} />
        <Label text="ROCHESTER, NEW YORK" f={f} at={L7 + 12} x={80} y={990} color={P.ink} ink={CREAM} size={48} seed={112} rot={1.5} />
      </AbsoluteFill>
    );
  }
  if (f < L8) {
    const p = mv(f, CAM, CAM + 10, 0, 1, E);
    const cutIn = f >= beat(47); // cut in on the beat as the VO says "a hundred shots"
    const k = cutIn ? 1.6 + 0.05 * ((sf(f) - beat(47)) / (L8 - beat(47))) : 1.2 + 0.04 * (sf(f - CAM) / (beat(47) - CAM));
    return (
      <AbsoluteFill>
        <Stage k={k} fx={540} fy={1030} ty={cutIn ? 1060 : 1030 + (1 - p) * 320}>
          <BoxCamera f={f} press={0} flash={0} />
        </Stage>
        <Words text={"A box\ncamera."} f={f} at={CAM + 2} x={80} y={300} size={150} seed={14} lh={0.9} />
        <Label text="100 SHOTS INSIDE" f={f} at={L7 + 80} x={420} y={1380} color={P.accent} seed={111} rot={-3} from="right" size={48} />
      </AbsoluteFill>
    );
  }
  const lf = f - L8;
  const REST = 37; // "We do the rest." (pause end in l08)
  const fingerIn = mv(lf, 0, 12, 0, 1, E);
  const press = lf >= 19 && lf < 30 ? 1 : 0;
  const flash = lf >= 21 ? Math.max(0, 1 - (sf(lf) - 21) / 10) : 0;
  const zoom = lf < REST ? 1.55 : mv(lf, REST, REST + 8, 1.55, 0.82, IO);
  const q = (1.55 - zoom) / (1.55 - 0.82);
  return (
    <AbsoluteFill>
      <Stage k={zoom} fx={645 - 105 * q} fy={820 + 210 * q} ty={1000 - 40 * q}>
        <BoxCamera f={f} press={press} flash={lf < REST ? flash : 0} />
        {lf < REST && (
          // a paper finger: comes down, presses, lifts a little
          <div style={{ position: "absolute", left: 645 - 52, top: 786 - 380 - (1 - fingerIn) * 420 + press * 20, transform: "rotate(-6deg)", transformOrigin: "52px 380px" }}>
            <Paper x={0} y={0} w={104} h={380} color={P.surface} seed={120} radius={50} lift={1.2}>
              <div style={{ position: "absolute", left: 22, bottom: 14, width: 60, height: 74, borderRadius: "46% 46% 40% 40%", background: CREAM, boxShadow: `inset 0 -3px 0 rgba(${SHADOW},0.12)` }} />
              <div style={{ position: "absolute", left: 26, bottom: 140, width: 52, height: 5, borderRadius: 3, background: `rgba(${SHADOW},0.18)` }} />
              <div style={{ position: "absolute", left: 30, bottom: 154, width: 44, height: 5, borderRadius: 3, background: `rgba(${SHADOW},0.14)` }} />
            </Paper>
          </div>
        )}
      </Stage>
      {lf < REST && <Words text={"“You press\nthe button,"} f={f} at={L8} x={80} y={250} size={128} seed={15} lh={0.95} />}
      {lf >= REST &&
        SNAPS.map((s, i) => {
          const t0 = REST + 2 + i * STEP;
          if (lf < t0) return null;
          const p = mv(lf, t0, t0 + 10, 0, 1, E);
          const sp = SNAP_SPOTS[i];
          const j = jit(130 + i, f, 0.8);
          return (
            <Snapshot
              key={s}
              name={s}
              x={500 + (sp.x - 500) * p + j.x}
              y={900 + (sp.y - 900) * p + j.y}
              d={sp.d}
              rot={sp.r * p + j.r + (1 - p) * 30}
              seed={140 + i}
              lift={(1 - p) * 3}
            />
          );
        })}
      {lf >= REST && <Words text={"we do\nthe rest.”"} f={f} at={L8 + REST} x={80} y={250} size={128} seed={16} pinkWord={3} lh={0.95} />}
    </AbsoluteFill>
  );
};

// ─── Scene 4: 35mm ─────────────────────────────────────────────────────────────────────────────────
const FILM_FRAMES = ["tram", "bourse", "leon", "caroline", "dog", "tram"];
const FRAME_W = 400;
const FilmStrip: React.FC<{ f: number; advance: number }> = ({ f, advance }) => {
  const j = jit(150, f, 0.7);
  const w = FILM_FRAMES.length * (FRAME_W + 30) + 60;
  return (
    <div style={{ position: "absolute", left: 120 - advance * (FRAME_W + 30) + j.x, top: 760 + j.y, transform: "rotate(-7deg)", transformOrigin: "540px 200px" }}>
      <Paper x={0} y={0} w={w} h={390} color={P.ink} seed={151} torn="">
        {Array.from({ length: Math.floor(w / 46) }, (_, i) => (
          <div key={i}>
            <div style={{ position: "absolute", left: 14 + i * 46, top: 16, width: 24, height: 30, borderRadius: 5, background: P.bg }} />
            <div style={{ position: "absolute", left: 14 + i * 46, bottom: 16, width: 24, height: 30, borderRadius: 5, background: P.bg }} />
          </div>
        ))}
        {FILM_FRAMES.map((name, i) => (
          <div key={i} style={{ position: "absolute", left: 40 + i * (FRAME_W + 30), top: 68, width: FRAME_W, height: 254, background: CREAM, overflow: "hidden" }}>
            <Riso name={name} w={FRAME_W} h={254} mis={{ x: 4, y: 2 }} />
          </div>
        ))}
      </Paper>
    </div>
  );
};

const Compact: React.FC<{ x: number; y: number; rot: number; lift: number }> = ({ x, y, rot, lift }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg)`, width: 360, height: 220 }}>
    <Paper x={0} y={0} w={360} h={220} color={P.ink} seed={161} torn="" lift={lift}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 56, background: P.surface, opacity: 0.92 }} />
      <div style={{ position: "absolute", left: 24, top: 14, width: 54, height: 30, background: P.ink, borderRadius: 4 }} />
      <div style={{ position: "absolute", left: 120, top: 70, width: 120, height: 120, borderRadius: "50%", background: P.surface }} />
      <div style={{ position: "absolute", left: 142, top: 92, width: 76, height: 76, borderRadius: "50%", background: P.ink }} />
      <div style={{ position: "absolute", left: 158, top: 104, width: 18, height: 12, borderRadius: "50%", background: CREAM, opacity: 0.7 }} />
    </Paper>
  </div>
);

/** A coat pocket: blue paper with a stitched pocket. `front` renders only the pocket face (layered above the camera). */
const Pocket: React.FC<{ f: number; front?: boolean; y?: number }> = ({ f, front = false, y = 1020 }) => {
  const j = jit(170, f, 0.4);
  if (!front)
    return <Paper x={-60 + j.x} y={y - 160 + j.y} w={1200} h={1200} color={P.accent2} seed={171} torn="t" amp={7} rot={-1} />;
  return (
    <Paper x={190 + j.x} y={y + j.y} w={700} h={560} color={P.accent2} seed={172} torn="" rot={1.5} lift={0.6}>
      <div style={{ position: "absolute", left: 22, right: 22, top: 22, bottom: 22, border: `4px dashed ${CREAM}`, borderRadius: 6, opacity: 0.75 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: "rgba(31,26,23,0.25)" }} />
    </Paper>
  );
};

const Scene35: React.FC = () => {
  const f = useCurrentFrame();
  const L9 = at("l09");
  const POCKET = beat(60);
  if (f < POCKET) {
    const lf = f - L9;
    // the film advances one frame per beat, like a winding lever
    const advance = -0.6 + [0, 15, 30, 45].reduce((acc, b) => acc + mv(lf, b, b + 6, 0, 1, E), 0);
    return (
      <AbsoluteFill>
        <FilmStrip f={f} advance={advance} />
        <Words text="35mm" f={f} at={L9 + 7} x={80} y={250} size={250} seed={17} lh={0.9} />
        <Label text="MOVIE FILM, FOR STILLS" f={f} at={L9 + 27} x={80} y={1290} color={P.accent3} seed={175} rot={-2} />
      </AbsoluteFill>
    );
  }
  const lf = f - POCKET;
  const drop = mv(lf, 6, 26, 0, 1, ease.backOut);
  return (
    <AbsoluteFill>
      <Pocket f={f} />
      <Compact x={360 + (1 - drop) * 40} y={160 + drop * 730} rot={-12 + drop * 16} lift={(1 - drop) * 4} />
      <Pocket f={f} front />
      <Words text={"Fits a\ncoat pocket."} f={f} at={POCKET + 4} x={80} y={250} size={128} seed={18} lh={0.95} />
    </AbsoluteFill>
  );
};

// ─── Scene 5: 1975 ─────────────────────────────────────────────────────────────────────────────────
const Prototype: React.FC<{ f: number }> = ({ f }) => {
  const j = jit(200, f, 0.6);
  return (
    <div style={{ position: "absolute", left: 130 + j.x, top: 700 + j.y, width: 820, height: 480 }}>
      <Paper x={0} y={60} w={820} h={420} color={P.muted} seed={201} torn="">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: "absolute", right: 40 + i * 30, top: 40, width: 10, height: 160, background: P.ink, opacity: 0.35 }} />
        ))}
        <div style={{ position: "absolute", left: 40, bottom: 34, width: 280, height: 18, background: P.ink, opacity: 0.4 }} />
      </Paper>
      {/* cassette deck on top */}
      <Paper x={420} y={-40} w={340} h={130} color={P.ink} seed={202} torn="">
        <div style={{ position: "absolute", left: 30, top: 22, width: 280, height: 86, background: P.surface, borderRadius: 8 }} />
        <div style={{ position: "absolute", left: 70, top: 40, width: 50, height: 50, borderRadius: 25, background: P.ink }} />
        <div style={{ position: "absolute", left: 220, top: 40, width: 50, height: 50, borderRadius: 25, background: P.ink }} />
        <div style={{ position: "absolute", left: 128, top: 52, width: 84, height: 26, background: P.accent }} />
      </Paper>
      {/* lens barrel */}
      <Paper x={-40} y={170} w={240} h={240} color={P.ink} seed={203} shape="ellipse" torn="">
        <div style={{ position: "absolute", left: 50, top: 50, width: 140, height: 140, borderRadius: "50%", background: P.surface }} />
        <div style={{ position: "absolute", left: 80, top: 80, width: 80, height: 80, borderRadius: "50%", background: P.ink }} />
      </Paper>
    </div>
  );
};

const Scene1975: React.FC = () => {
  const f = useCurrentFrame();
  const L10 = at("l10");
  const L11 = at("l11");
  const PROTO = beat(69);
  const PIX = L11 + 30;
  const SECS = beat(81);
  if (f < PROTO) {
    return (
      <AbsoluteFill>
        <Year year="1975" f={f} at={L10} y={600} colors={[P.accent2, P.accent, P.accent3, P.accent2]} />
        <Label text="A LAB IN ROCHESTER" f={f} at={L10 + 12} x={80} y={990} color={P.ink} ink={CREAM} size={48} seed={213} rot={-1.5} />
      </AbsoluteFill>
    );
  }
  if (f < L11) {
    const p = mv(f, PROTO, PROTO + 10, 0, 1, E);
    const deck = f >= beat(73); // cut in on the cassette the pictures were saved to
    const k = deck ? 1.4 + 0.04 * ((sf(f) - beat(73)) / (L11 - beat(73))) : 1 + 0.04 * (sf(f - PROTO) / (beat(73) - PROTO));
    return (
      <AbsoluteFill>
        <Stage k={k} fx={deck ? 700 : 540} fy={deck ? 820 : 940} ty={deck ? 960 : 940 + (1 - p) * 320}>
          <Prototype f={f} />
        </Stage>
        <Words text={"The first\ndigital\ncamera."} f={f} at={PROTO + 4} x={80} y={250} size={128} seed={19} lh={0.9} pinkWord={2} />
        <Label text="STEVEN SASSON · KODAK" f={f} at={L10 + 60} x={80} y={1300} color={CREAM} seed={211} rot={-1.5} />
        <Label text="PROTOTYPE" f={f} at={L10 + 104} x={560} y={1400} color={P.accent} seed={212} rot={3} from="right" />
      </AbsoluteFill>
    );
  }
  if (f < PIX) {
    // CU: the 8 lb weight tag
    const k = 1.5;
    const swing = Math.sin(sf(f - L11) / 4) * 6 * (1 - mv(f, L11, L11 + 30, 0, 1, OUT));
    return (
      <AbsoluteFill>
        <Stage k={k} fx={540} fy={940} ty={1180}>
          <Prototype f={f} />
        </Stage>
        <div style={{ position: "absolute", left: 360, top: 330, transformOrigin: "180px -40px", transform: `rotate(${swing}deg)` }}>
          <div style={{ position: "absolute", left: 178, top: -120, width: 4, height: 130, background: P.ink }} />
          <Paper x={0} y={0} w={360} h={300} color={P.accent3} seed={221} torn="" lift={1}>
            <div style={{ position: "absolute", left: 160, top: 22, width: 40, height: 40, borderRadius: 20, background: P.bg }} />
            <div style={{ position: "absolute", inset: 0, top: 70, textAlign: "center", fontFamily: T.display, fontWeight: 800, fontSize: 150, lineHeight: 1, letterSpacing: "-0.04em", color: P.ink }}>8 lb</div>
          </Paper>
        </div>
        <Label text="3.6 KG · TOASTER-SIZED" f={f} at={L11 + 4} x={80} y={1360} color={CREAM} seed={222} rot={1} />
      </AbsoluteFill>
    );
  }
  if (f < SECS) {
    // 100 × 100 pixels: the 1846 portrait rebuilt as 10,000 squares
    const lf = f - PIX;
    const rows = Math.min(100, 35 + Math.floor(sf(lf) * 5));
    const cu = lf >= 24; // cut in on the eye: the squares become obvious
    return (
      <AbsoluteFill>
        <Stage k={cu ? 3.2 + 0.1 * ((sf(lf) - 24) / 22) : 1} fx={cu ? 520 : 540} fy={cu ? 690 : 810} ty={cu ? 880 : 810}>
        <Paper x={150} y={420} w={780} h={780} color={CREAM} seed={231} torn="" rot={-1.5}>
          <div style={{ position: "absolute", left: 30, top: 30, width: 720, height: 720, overflow: "hidden", clipPath: `inset(0 0 ${100 - rows}% 0)` }}>
            <Img src={asset("molard-px-blue.png")} style={{ width: 720, height: 720, imageRendering: "pixelated", mixBlendMode: "multiply" }} />
          </div>
          <div style={{ position: "absolute", left: 30, top: 30, width: 720, height: 720, backgroundImage: `linear-gradient(${CREAM}88 1px, transparent 1px), linear-gradient(90deg, ${CREAM}88 1px, transparent 1px)`, backgroundSize: "7.2px 7.2px", opacity: cu ? 0.7 : 0.5 }} />
        </Paper>
        </Stage>
        <Words text="10,000 pixels." f={f} at={PIX} x={104} y={250} size={128} seed={20} pinkWord={0} strip={CREAM} />
        <Label text="100 × 100" f={f} at={PIX + 10} x={600} y={1250} color={P.accent3} seed={232} rot={3} from="right" size={56} />
      </AbsoluteFill>
    );
  }
  // 23 seconds to save each one: a stepped progress bar onto cassette tape
  const lf = f - SECS;
  const segs = Math.min(23, Math.floor(Math.max(0, sf(lf) - 6) / 2.5));
  return (
    <AbsoluteFill>
      <Paper x={140} y={560} w={800} h={500} color={P.ink} seed={241} torn="" rot={-1}>
        <div style={{ position: "absolute", left: 50, top: 50, width: 700, height: 250, background: P.surface, borderRadius: 18 }} />
        <div style={{ position: "absolute", left: 160, top: 115, width: 120, height: 120, borderRadius: 60, background: P.ink, transform: `rotate(${sidx(lf) * 30}deg)` }}>
          <div style={{ position: "absolute", left: 52, top: 8, width: 16, height: 104, background: P.surface }} />
        </div>
        <div style={{ position: "absolute", left: 520, top: 115, width: 120, height: 120, borderRadius: 60, background: P.ink, transform: `rotate(${sidx(lf) * 30}deg)` }}>
          <div style={{ position: "absolute", left: 52, top: 8, width: 16, height: 104, background: P.surface }} />
        </div>
        <div style={{ position: "absolute", left: 300, top: 150, width: 200, height: 50, background: P.accent }} />
        <div style={{ position: "absolute", left: 50, top: 360, width: 700, height: 90, display: "flex", gap: 6 }}>
          {Array.from({ length: 23 }, (_, i) => (
            <div key={i} style={{ flex: 1, background: i < segs ? P.accent3 : "rgba(244,237,225,0.14)" }} />
          ))}
        </div>
      </Paper>
      <Words text={"23 seconds\nto save one."} f={f} at={SECS} x={80} y={250} size={128} seed={21} lh={0.92} />
      <div style={{ position: "absolute", left: 80, top: 1140, fontFamily: T.mono, fontWeight: 700, fontSize: 96, color: P.ink }}>
        {String(segs).padStart(2, "0")}
        <span style={{ fontSize: 48, color: P.muted }}> / 23 s</span>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 6: 2000 → today ─────────────────────────────────────────────────────────────────────────
const CandyBar: React.FC<{ f: number; shot: number; x: number; y: number }> = ({ f, shot, x, y }) => {
  const j = jit(250, f, 0.6);
  return (
    <div style={{ position: "absolute", left: x + j.x, top: y + j.y, transform: "rotate(-5deg)" }}>
      <Paper x={0} y={0} w={330} h={720} color={P.muted} seed={251} radius={46}>
        <div style={{ position: "absolute", left: 36, top: 70, width: 258, height: 250, background: P.ink, borderRadius: 10 }} />
        <div style={{ position: "absolute", left: 50, top: 84, width: 230, height: 222, background: CREAM, overflow: "hidden" }}>
          {shot > 0 && (
            <div style={{ position: "absolute", inset: 0, opacity: 1 }}>
              <Img src={asset("molard-px-blue.png")} style={{ position: "absolute", left: 0, top: 0, width: 230, height: 230, imageRendering: "pixelated", mixBlendMode: "multiply" }} />
            </div>
          )}
          {shot > 0 && shot < 1 && <div style={{ position: "absolute", inset: 0, background: CREAM, opacity: 1 - shot }} />}
        </div>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 52 + (i % 3) * 80, top: 380 + Math.floor(i / 3) * 74, width: 64, height: 46, borderRadius: 14, background: CREAM, opacity: 0.85 }} />
        ))}
        <div style={{ position: "absolute", left: 125, top: 24, width: 80, height: 16, borderRadius: 8, background: P.ink }} />
      </Paper>
    </div>
  );
};

const RAIN = Array.from({ length: 44 }, (_, i) => {
  const imgs = ["dog", "tram", "bourse", "leon", "caroline", "molard", "snap-dogman", "snap-house", "snap-street", "snap-church", "snap-tree", "snap-boy"];
  const name = imgs[i % imgs.length];
  return {
    name,
    snap: name.startsWith("snap"),
    x: -40 + rand(i * 3.1) * 900,
    y: 820 + rand(i * 5.7) * 760 - (i / 44) * 300,
    rot: (rand(i * 7.3) - 0.5) * 50,
    s: 0.75 + rand(i * 2.2) * 0.45,
    t: Math.floor(i * 1.1),
  };
});

const SceneNow: React.FC = () => {
  const f = useCurrentFrame();
  const L12 = at("l12");
  const L13 = at("l13");
  if (f < L13) {
    const lf = f - L12;
    const p = mv(lf, 10, 20, 0, 1, E);
    const shot = lf >= 37 ? mv(lf, 37, 45, 0, 1, OUT) : 0;
    return (
      <AbsoluteFill>
        <Year year="2000" f={f} at={L12} y={250} cardW={150} colors={[P.accent, P.accent3, P.accent2, P.accent3]} />
        <CandyBar f={f} shot={shot} x={560 + (1 - p) * 700} y={640} />
        <Label text="110,000 PIXELS" f={f} at={L12 + 46} x={80} y={1290} color={P.accent3} size={48} seed={252} rot={-2} />
        <Words text={"Phones\ntake\nphotos."} f={f} at={L12 + 37} x={80} y={760} size={128} seed={22} lh={0.92} pinkWord={2} />
      </AbsoluteFill>
    );
  }
  const lf = f - L13;
  return (
    <AbsoluteFill>
      {RAIN.map((r, i) => {
        if (lf < r.t) return null;
        const p = mv(lf, r.t, r.t + 8, 0, 1, OUT);
        const w = 220 * r.s;
        const h = r.snap ? w + 30 : w * 1.15;
        return (
          <Paper key={i} x={r.x} y={r.y - (1 - p) * 1500} w={w} h={h} color={CREAM} seed={300 + i} torn="" rot={r.rot} lift={(1 - p) * 3}>
            <div style={{ position: "absolute", left: 12, top: 12, width: w - 24, height: w - 24, overflow: "hidden", borderRadius: r.snap ? "50%" : 0 }}>
              <Riso name={r.name} inks={r.snap ? ["blue"] : ["blue", "pink"]} w={w - 24} h={w - 24} mis={{ x: 3, y: 2 }} />
            </div>
          </Paper>
        );
      })}
      {lf >= 26 && <Paper x={50} y={220 - (1 - mv(lf, 26, 33, 0, 1, E)) * 700} w={980} h={520} color={P.bg} seed={330} torn="b" lift={1 + (1 - mv(lf, 26, 33, 0, 1, E)) * 2} rot={-1} amp={7}>
        <Words text={"Over a\ntrillion"} f={f} at={L13 + 30} x={30} y={30} size={170} seed={23} lh={0.88} pinkWord={2} />
        <Words text="PHOTOS A YEAR" f={f} at={L13 + 57} x={34} y={366} size={56} font={T.mono!} weight={700} tracking={0.04} seed={24} />
      </Paper>}
    </AbsoluteFill>
  );
};

// ─── Scene 7: payoff: the phone is still a dark room ───────────────────────────────────────────────
const Lens: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    <div style={{ position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: "50%", background: P.surface, filter: shadow(0.5) }} />
    <div style={{ position: "absolute", left: cx - r * 0.72, top: cy - r * 0.72, width: r * 1.44, height: r * 1.44, borderRadius: "50%", background: P.ink }} />
    <div style={{ position: "absolute", left: cx - r * 0.32, top: cy - r * 0.42, width: r * 0.26, height: r * 0.18, borderRadius: "50%", background: CREAM, opacity: 0.6, transform: "rotate(-30deg)" }} />
  </>
);

const PHONE_X = 280;
const PHONE_Y = 430;
const LENS_C: Pt = [PHONE_X + 150, PHONE_Y + 150];

const ScenePayoff: React.FC = () => {
  const f = useCurrentFrame();
  const L14 = at("l14");
  const L15 = at("l15");
  const PUSH = L14 + 21;
  const INSIDE = beat(102);
  if (f < INSIDE) {
    const lf = f - PAYOFF;
    const enter = 1; // revealed by the torn-paper wipe, already in place
    const k = f < PUSH ? 1 + 0.03 * (sf(lf) / (PUSH - PAYOFF)) : mv(f, PUSH, INSIDE, 1.03, 9, (t) => t * t);
    return (
      <AbsoluteFill>
        <Stage k={k} fx={LENS_C[0]} fy={LENS_C[1]} tx={f < PUSH ? LENS_C[0] : interpolate(k, [1.03, 9], [LENS_C[0], 540])} ty={(f < PUSH ? LENS_C[1] : interpolate(k, [1.03, 9], [LENS_C[1], 960])) + (1 - enter) * 1500}>
          <Paper x={PHONE_X} y={PHONE_Y} w={520} h={1040} color={P.ink} seed={401} radius={78}>
            <div style={{ position: "absolute", left: 40, top: 40, width: 220, height: 220, borderRadius: 56, background: "rgba(244,237,225,0.09)" }} />
          </Paper>
          <Lens cx={LENS_C[0]} cy={LENS_C[1]} r={70} />
        </Stage>
        <Words text="Look closer." f={f} at={L14} x={80} y={250} size={128} seed={25} out={PUSH} />
      </AbsoluteFill>
    );
  }
  if (f < L15) {
    // inside the lens: the same dark room as the very first frame
    const lf = f - INSIDE;
    const iris = mv(lf, 0, 8, 0, 1, OUT);
    const k = 1.0 + 0.1 * (sf(lf) / (L15 - INSIDE)); // a steady push into the room
    return (
      <AbsoluteFill style={{ background: P.ink }}>
        <AbsoluteFill style={{ clipPath: `circle(${iris * 1010}px at 540px 940px)`, background: P.bg }}>
          <Stage k={k} fx={540} fy={900} ty={900}>
            <Diorama f={f} light={mv(lf, 2, 14, 0, 1, OUT)} pic={1} />
          </Stage>
          <Words text="Still a tiny hole." f={f} at={INSIDE + 2} x={80} y={250} size={128} seed={26} />
          <Words text={"And a\ndark room."} f={f} at={L14 + 71} x={80} y={1240} size={128} seed={27} pinkWord={3} lh={0.95} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // pull back out: the phone again, sliding into the pocket from the 35mm scene
  const lf = f - L15;
  const k = mv(lf, 0, 10, 2.4, 0.72, IO);
  const drop = mv(lf, 18, 42, 0, 1, ease.backOut);
  const drift = 1 + 0.025 * (sf(lf) / (END - L15));
  return (
    <AbsoluteFill style={{ transform: `scale(${drift})` }}>
      <Pocket f={f} y={1150} />
      <Stage k={k} fx={LENS_C[0]} fy={LENS_C[1]} tx={interpolate(k, [0.72, 2.4], [470, 540])} ty={interpolate(k, [0.72, 2.4], [420, 960]) + drop * 580}>
        <div style={{ transform: `rotate(${drop * 8}deg)`, transformOrigin: `${LENS_C[0]}px ${LENS_C[1]}px`, position: "absolute", inset: 0 }}>
          <Paper x={PHONE_X} y={PHONE_Y} w={520} h={1040} color={P.ink} seed={401} radius={78} lift={(1 - drop) * 3 + 0.5}>
            <div style={{ position: "absolute", left: 40, top: 40, width: 220, height: 220, borderRadius: 56, background: "rgba(244,237,225,0.09)" }} />
          </Paper>
          <Lens cx={LENS_C[0]} cy={LENS_C[1]} r={70} />
        </div>
      </Stage>
      <Pocket f={f} front y={1150} />
      <Words text={"Now it fits\nin your pocket."} f={f} at={L15 + 36} x={80} y={250} size={128} seed={28} lh={0.95} pinkWord={4} />
    </AbsoluteFill>
  );
};

// ─── Assembly ──────────────────────────────────────────────────────────────────────────────────────
const SCENES: { from: number; to: number; C: React.FC }[] = [
  { from: 0, to: WIPE1 + WIPE_SWAP, C: SceneObscura },
  { from: WIPE1 + WIPE_SWAP, to: WIPE2 + WIPE_SWAP, C: Scene1839 },
  { from: WIPE2 + WIPE_SWAP, to: WIPE3 + WIPE_SWAP, C: Scene1888 },
  { from: WIPE3 + WIPE_SWAP, to: WIPE4 + WIPE_SWAP, C: Scene35 },
  { from: WIPE4 + WIPE_SWAP, to: WIPE5 + WIPE_SWAP, C: Scene1975 },
  { from: WIPE5 + WIPE_SWAP, to: PAYOFF, C: SceneNow },
  { from: PAYOFF, to: END, C: ScenePayoff },
];
const WIPES = [
  { at: WIPE1, color: P.accent, seed: 501 },
  { at: WIPE2, color: P.accent2, seed: 502 },
  { at: WIPE3, color: P.accent3, seed: 503 },
  { at: WIPE4, color: P.accent, seed: 504 },
  { at: WIPE5, color: P.accent2, seed: 505 },
  { at: PAYOFF - WIPE_SWAP, color: P.accent3, seed: 506 },
];

/** Scenes read the absolute frame (no Sequence), so every timing constant above is in composition frames. */
const Scenes: React.FC = () => {
  const f = useCurrentFrame();
  const s = SCENES.find((x) => f >= x.from && f < x.to);
  return s ? <s.C /> : null;
};

export const CameraHistoryPaper: React.FC = () => (
  <AbsoluteFill style={{ ...fibre(P.bg, 1), fontFamily: T.body, color: P.ink }}>
    <Scenes />
    {WIPES.map((w) => (
      <Sequence key={w.at} from={w.at} durationInFrames={WIPE_LEN + 1}>
        <Wipe color={w.color} seed={w.seed} />
      </Sequence>
    ))}
    <Sequence from={END}>
      <EndCard system={S} />
    </Sequence>
    <Vignette />
    <SoundDesign />
  </AbsoluteFill>
);

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% 45%, transparent 58%, rgba(31,26,23,0.16) 100%)" }} />
);

// ─── Sound ─────────────────────────────────────────────────────────────────────────────────────────
const voiceAt = (f: number) => VO.some((v) => f >= v.at - 4 && f <= v.at + v.dur + 4);
const MUSIC_UP = 0.5;
const MUSIC_DUCK = 0.2;
/** Smoothed duck: average the VO gate over ±6 frames so the bed eases down and back up. */
const musicVol = (f: number) => {
  let on = 0;
  for (let k = -6; k <= 6; k++) on += voiceAt(f + k) ? 1 : 0;
  const v = MUSIC_UP - (MUSIC_UP - MUSIC_DUCK) * (on / 13);
  // story automation: the bed drains away as the picture is lost ("Gone.") and slams back with 1839;
  // inside the lens it drops to a whisper, then returns for the pocket line.
  const gone = f >= at("l04") + 20 && f < WIPE1 + WIPE_SWAP ? Math.max(0, 1 - (f - at("l04") - 20) / 12) : 1;
  const inside = f >= PAYOFF + 40 && f < at("l15") ? 0.45 : 1;
  const fadeIn = Math.min(1, (f + 1) / 6) * gone * inside;
  const fadeOut = Math.min(1, (CAMERA_HISTORY_PAPER_DURATION - f) / END_CARD_FRAMES);
  return v * fadeIn * fadeOut;
};

const SoundDesign: React.FC = () => (
  <>
    <Audio src={staticFile("music/pulse-minimal-120.m4a")} volume={musicVol} />
    {VO.map((v) => (
      <Sequence key={v.id} from={v.at} durationInFrames={v.dur + 10} layout="none">
        <Audio src={staticFile(`voice/CameraHistoryPaper/${v.id}.wav`)} volume={1} />
      </Sequence>
    ))}
    {/* 1: the dark room */}
    <Sfx name="impact" at={0} volume={0.5} />
    <Sfx name="paper" at={41} volume={0.45} />
    <Sfx name="whoosh-short" at={at("l02") - 2} volume={0.35} />
    <Sfx name="paper" at={at("l02") + 6} volume={0.4} />
    <Sfx name="swish-reverse" at={at("l02") + 80} volume={0.3} />
    <Sfx name="pop" at={at("l02") + 90} volume={0.45} />
    <Sfx name="paper" at={at("l03")} volume={0.5} />
    <Sfx name="pop" at={at("l03") + 23} volume={0.4} />
    <Sfx name="paper" at={at("l04") + 6} volume={0.35} />
    <Sfx name="tear" at={at("l04") + 32} volume={0.4} />
    {/* wipes */}
    {[WIPE1, WIPE2, WIPE3, WIPE4, WIPE5, PAYOFF - WIPE_SWAP].map((w) => (
      <Sfx key={w} name="tear" at={w + 2} volume={w === WIPE1 ? 0.22 : 0.55} />
    ))}
    {/* 1839 */}
    {[0, 1, 2, 3].map((i) => (
      <Sfx key={`a${i}`} name={i === 0 ? "impact" : "pop"} at={at("l05") + i * 2.5} volume={i === 0 ? 0.8 : 0.32} />
    ))}
    <Sfx name="paper" at={at("l05") + 47} volume={0.4} />
    <Sfx name="paper" at={at("l05") + 52} volume={0.45} />
    <Sfx name="shutter" at={at("l06") + 21} volume={0.5} />
    {Array.from({ length: 10 }, (_, i) => (
      <Sfx key={`c${i}`} name="tick" at={at("l06") + 60 + i * 5} volume={0.25} />
    ))}
    {/* 1888 */}
    {[0, 1, 2, 3].map((i) => (
      <Sfx key={`b${i}`} name={i === 0 ? "impact" : "pop"} at={at("l07") + i * 2.5} volume={i === 0 ? 0.55 : 0.3} />
    ))}
    <Sfx name="paper" at={at("l07") + 40} volume={0.45} />
    <Sfx name="pop" at={at("l07") + 80} volume={0.4} />
    <Sfx name="click" at={at("l08") + 19} volume={0.6} />
    <Sfx name="shutter" at={at("l08") + 20} volume={0.7} />
    {SNAPS.map((_, i) => (
      <Sfx key={`s${i}`} name="paper" at={at("l08") + 39 + i * 5} volume={0.25} />
    ))}
    {/* 35mm */}
    {[0, 15, 30, 45].map((t) => (
      <Sfx key={`f${t}`} name="shutter" at={at("l09") + t} volume={0.4} />
    ))}
    <Sfx name="paper" at={at("l09") + 72} volume={0.4} />
    <Sfx name="pop" at={at("l09") + 90} volume={0.35} />
    {/* 1975 */}
    {[0, 1, 2, 3].map((i) => (
      <Sfx key={`d${i}`} name={i === 0 ? "impact" : "pop"} at={at("l10") + i * 2.5} volume={i === 0 ? 0.55 : 0.3} />
    ))}
    <Sfx name="paper" at={at("l10") + 47} volume={0.45} />
    <Sfx name="pop" at={at("l10") + 104} volume={0.35} />
    <Sfx name="click" at={at("l11")} volume={0.45} />
    <Sfx name="glitch" at={at("l11") + 30} volume={0.22} />
    {Array.from({ length: 12 }, (_, i) => (
      <Sfx key={`t${i}`} name="tick" at={at("l11") + 82 + i * 5} volume={0.28} />
    ))}
    {/* 2000 → today */}
    {[0, 1, 2, 3].map((i) => (
      <Sfx key={`e${i}`} name={i === 0 ? "impact" : "pop"} at={at("l12") + i * 2.5} volume={i === 0 ? 0.5 : 0.28} />
    ))}
    <Sfx name="shutter" at={at("l12") + 37} volume={0.55} />
    {RAIN.filter((_, i) => i % 4 === 0).map((r, i) => (
      <Sfx key={`r${i}`} name="paper" at={at("l13") + r.t} volume={0.22} />
    ))}
    <Sfx name="impact" at={at("l13") + 30} volume={0.4} />
    {/* payoff */}
    <Sfx name="riser" at={at("l14") + 21 - 50} volume={0.22} />
    <Sfx name="whoosh" at={at("l14") + 19} volume={0.45} />
    <Sfx name="shutter" at={at("l14") + 27} volume={0.6} />
    <Sfx name="shimmer" at={at("l14") + 30} volume={0.25} />
    <Sfx name="whoosh-short" at={at("l15")} volume={0.35} />
    <Sfx name="paper" at={at("l15") + 24} volume={0.45} />
    <Sfx name="shimmer" at={END + 4} volume={0.22} />
  </>
);
