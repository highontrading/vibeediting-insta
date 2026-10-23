import { createContext, useContext } from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";
import { Sfx } from "../kit/Sfx";
import { SystemTexture } from "../kit/Texture";

// Explainer: how $1 becomes (almost) $1,000. Paper-collage explainer. Design system: Newsprint.
// Music: pulse-minimal-120 (120 BPM → one beat = 15 frames). Every VO line and every cut starts on a beat.
// Maths (verified): 1.1^72 = 955.59 · simple 1 + 0.1·72 = 8.20 · 72/6 = 12 (exact 11.9) · 1.06^-12 = 0.497.
const S = systems.newsprint;
const P = S.palette;
const T = S.type;
const E = ease.of(S);
const RED = P.accent2!;
const HI = P.accent;
const DISPLAY: React.CSSProperties = { fontFamily: T.display, fontWeight: 400, letterSpacing: `${T.displayTracking}em`, lineHeight: 0.92 };
const MONO: React.CSSProperties = { fontFamily: T.mono, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" };

const beat = (n: number) => n * 15;

// Narration line starts (absolute frames, all on beats) — from public/voice/CompoundInterest/timings.json.
const L = {
  l01: 4, l02: beat(5), l03: beat(10), l04: beat(15), l05: beat(22), l06: beat(27), l07: beat(36), l08: beat(41), l09: beat(47),
  l10: beat(52), l11: beat(58), l12: beat(64), l13: beat(72), l14: beat(78), l15: beat(87), l16: beat(91), l17: beat(98),
} as const;
const LINE_FRAMES: Record<keyof typeof L, number> = {
  l01: 61, l02: 54, l03: 68, l04: 81, l05: 69, l06: 121, l07: 43, l08: 73, l09: 66, l10: 81, l11: 59, l12: 103, l13: 78, l14: 100,
  l15: 52, l16: 99, l17: 70,
};

// Shot boundaries
const ZOOM = beat(3); // 45: smash-in on "$1,000"
const LUCK = L.l02; // 75
const SIMPLE = L.l03; // 150
const TENC = L.l04; // 225
const COMPOUND = L.l05; // 330
const LADDER = L.l06; // 405
const LADDER_CU = beat(34); // 510: close-up on interest-on-interest
const EARNING = L.l07; // 540
const RULE = L.l08; // 615
const CARD = L.l09; // 705
const SIX = L.l10; // 780
const TEN = L.l11; // 870
const CHART = L.l12; // 960
const EARLY = L.l15; // 1305
const STACKS = L.l16; // 1365
const CLOCK = L.l17; // 1470
const END = beat(105); // 1575
export const COMPOUND_INTEREST_DURATION = END + END_CARD_FRAMES; // 1635 = 54.5s
const END_LEAD = 6;

const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const lin = (t: number) => t;

// ─── Shot plumbing: absolute frame inside a shot ─────────────────────────────────────────────

const ShotStart = createContext(0);
const useF = () => useCurrentFrame() + useContext(ShotStart);

/** A shot lives from `at` until 14 frames into the next one, so slide-in sheets cover it. */
const Shot: React.FC<{ at: number; until: number; children: React.ReactNode }> = ({ at, until, children }) => (
  <Sequence from={at} durationInFrames={until - at + 14}>
    <ShotStart.Provider value={at}>{children}</ShotStart.Provider>
  </Sequence>
);

/** Small decaying shake when a stamp lands. */
const shake = (f: number, at: number, amp = 9) => (f < at || f > at + 9 ? 0 : Math.sin((f - at) * 2.7) * amp * (1 - (f - at) / 9));

/** Camera: maps point (cx, cy) to (tx, ty) at scale k. */
const Cam: React.FC<{ k: number; cx: number; cy: number; tx?: number; ty?: number; children: React.ReactNode }> = ({
  k,
  cx,
  cy,
  tx = cx,
  ty = cy,
  children,
}) => (
  <AbsoluteFill style={{ transform: `translate(${tx - cx * k}px, ${ty - cy * k}px) scale(${k})`, transformOrigin: "0 0" }}>{children}</AbsoluteFill>
);

// ─── Paper primitives ────────────────────────────────────────────────────────────────────────

type Edges = { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };

/** Torn-paper polygon for a w×h box. */
const torn = (w: number, h: number, seed: number, edges: Edges, amp = 9, step = 26) => {
  const pts: string[] = [];
  const j = (i: number) => rand(seed * 97 + i) * amp;
  let i = 0;
  for (let x = 0; x <= w; x += step) pts.push(`${Math.min(x, w)}px ${edges.top ? j(i++) : 0}px`);
  for (let y = step; y <= h; y += step) pts.push(`${w - (edges.right ? j(i++) : 0)}px ${Math.min(y, h)}px`);
  for (let x = w - step; x >= 0; x -= step) pts.push(`${Math.max(x, 0)}px ${h - (edges.bottom ? j(i++) : 0)}px`);
  for (let y = h - step; y > 0; y -= step) pts.push(`${edges.left ? j(i++) : 0}px ${Math.max(y, 0)}px`);
  return `polygon(${pts.join(",")})`;
};

const SHADOW = "drop-shadow(0 10px 14px rgba(20,20,20,0.22)) drop-shadow(0 2px 2px rgba(20,20,20,0.18))";

/** A torn clipping of paper. */
const Scrap: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  seed?: number;
  edges?: Edges;
  color?: string;
  style?: React.CSSProperties;
  inner?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, rot = 0, seed = 1, edges = { top: true, bottom: true }, color = P.bg, style, inner, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, filter: SHADOW, ...style }}>
    <div style={{ position: "absolute", inset: 0, clipPath: torn(w, h, seed, edges), background: color, overflow: "hidden", ...inner }}>{children}</div>
  </div>
);

/** A full-frame sheet that slides over the previous shot with a torn leading edge. */
const Sheet: React.FC<{ from: "left" | "right" | "bottom" | "top"; color?: string; seed?: number; children: React.ReactNode }> = ({
  from,
  color = P.bg,
  seed = 3,
  children,
}) => {
  const f = useCurrentFrame();
  const p = m(f, 0, 11);
  const d = 1 - p;
  const tf = { left: `translateX(${-d * 1180}px)`, right: `translateX(${d * 1180}px)`, bottom: `translateY(${d * 2020}px)`, top: `translateY(${-d * 2020}px)` }[from];
  const rot = (from === "left" || from === "bottom" ? -1 : 1) * d * 4;
  const edges: Edges = { left: from === "right", right: from === "left", top: from === "bottom", bottom: from === "top" };
  const W = 1080 + 120;
  const H = 1920 + 120;
  return (
    <AbsoluteFill style={{ transform: `${tf} rotate(${rot}deg)`, filter: "drop-shadow(0 0 30px rgba(20,20,20,0.28))" }}>
      <div style={{ position: "absolute", left: -60, top: -60, width: W, height: H, clipPath: torn(W, H, seed, edges, 16, 22), background: color }}>
        <div style={{ position: "absolute", left: 60, top: 60, width: 1080, height: 1920 }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Highlighter swipe behind inline text. */
const Hi: React.FC<{ at: number; dur?: number; children: React.ReactNode; f: number; color?: string }> = ({ at, dur = 10, children, f, color = HI }) => {
  const p = m(f, at, at + dur, 0, 1, ease.sineInOut);
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${color}, ${color})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${p * 100}% 62%`,
        backgroundPosition: "0 78%",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        padding: "0 0.06em",
        margin: "0 -0.06em",
      }}
    >
      {children}
    </span>
  );
};

/** Red marker stroke that draws across inline text (strike-through or underline). */
const Marker: React.FC<{ at: number; dur?: number; f: number; kind?: "strike" | "under"; children: React.ReactNode }> = ({
  at,
  dur = 9,
  f,
  kind = "strike",
  children,
}) => {
  const p = m(f, at, at + dur, 0, 1, ease.sineInOut);
  const strike = kind === "strike";
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-4%",
          top: strike ? "50%" : "96%",
          width: `${108 * p}%`,
          height: strike ? 16 : 11,
          borderRadius: 8,
          background: RED,
          transform: `rotate(${strike ? -2.5 : -1}deg)`,
          transformOrigin: "0 50%",
        }}
      />
    </span>
  );
};

/** Red marker ellipse drawn around inline text. */
const Ring: React.FC<{ at: number; f: number; children: React.ReactNode }> = ({ at, f, children }) => {
  const p = m(f, at, at + 12, 0, 1, ease.sineInOut);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <svg width={300} height={220} viewBox="0 0 300 220" style={{ position: "absolute", left: -48, top: -20, overflow: "visible" }}>
        <path
          d="M 250 40 C 190 0, 40 10, 22 100 C 8 180, 150 215, 250 175 C 310 150, 300 60, 200 30"
          fill="none"
          stroke={RED}
          strokeWidth={9}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
      </svg>
    </span>
  );
};

/** Rubber stamp in red ink: slams down at `at`. */
const Stamp: React.FC<{ at: number; f: number; x: number; y: number; rot?: number; size: number; children: React.ReactNode; double?: boolean }> = ({
  at,
  f,
  x,
  y,
  rot = -6,
  size,
  children,
  double = true,
}) => {
  if (f < at) return null;
  const s = m(f, at, at + 5, 1.7, 1, (t) => 1 - Math.pow(1 - t, 3));
  const o = m(f, at, at + 3);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`,
        opacity: o,
        filter: "url(#ink)",
        mixBlendMode: "multiply",
      }}
    >
      <div
        style={{
          border: `${Math.max(6, size * 0.045)}px solid ${RED}`,
          borderRadius: size * 0.08,
          padding: double ? size * 0.05 : 0,
        }}
      >
        <div
          style={{
            ...MONO,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1,
            color: RED,
            padding: `${size * 0.1}px ${size * 0.18}px ${size * 0.06}px`,
            border: double ? `${Math.max(3, size * 0.018)}px solid ${RED}` : undefined,
            borderRadius: size * 0.05,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/** Typed text (mono), `cps` characters per second from `at`. */
const Typed: React.FC<{ text: string; at: number; f: number; cps?: number; style?: React.CSSProperties }> = ({ text, at, f, cps = 30, style }) => {
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - at) / 30) * cps)));
  return (
    <span style={style}>
      {text.slice(0, n)}
      <span style={{ opacity: 0 }}>{text.slice(n)}</span>
    </span>
  );
};

/** Section tab: torn strip of paper with a number and label. Slides in from the left. */
const Tab: React.FC<{ num: string; label: string; at: number; f: number }> = ({ num, label, at, f }) => {
  const p = m(f, at + 4, at + 16);
  return (
    <Scrap x={80 - (1 - p) * 900} y={236} w={label.length * 28 + 190} h={84} rot={-1.2} seed={num.charCodeAt(1)} edges={{ top: true, bottom: true, right: true }} color={P.ink}>
      <div style={{ ...MONO, fontSize: 44, color: P.bg, padding: "16px 0 0 26px", whiteSpace: "nowrap" }}>
        <span style={{ color: HI }}>{num}</span>
        <span style={{ opacity: 0.5 }}> / </span>
        {label}
      </div>
    </Scrap>
  );
};

/** Slide-in progress for a cut-out: 0 → 1. */
const slide = (f: number, at: number, dur = 12) => m(f, at, at + dur);

/** A fictional one-dollar token from the "Bank of Patience", engraved in the Newsprint palette. */
const REEDS = Array.from({ length: 90 }, (_, i) => (i / 90) * Math.PI * 2);
const Coin: React.FC<{ x: number; y: number; d: number; rot?: number; style?: React.CSSProperties }> = ({ x, y, d, rot = 0, style }) => (
  <svg
    viewBox="0 0 200 200"
    width={d}
    height={d}
    style={{ position: "absolute", left: x - d / 2, top: y - d / 2, transform: `rotate(${rot}deg)`, filter: SHADOW, overflow: "visible", ...style }}
  >
    <defs>
      <pattern id="coinHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke={P.ink} strokeWidth="1.1" strokeOpacity="0.32" />
      </pattern>
      <path id="coinRing" d="M 100 100 m -70 0 a 70 70 0 1 1 140 0 a 70 70 0 1 1 -140 0" />
    </defs>
    <circle cx="100" cy="100" r="98" fill={P.surface} stroke={P.ink} strokeWidth="4" />
    {REEDS.map((a, i) => (
      <line key={i} x1={100 + Math.cos(a) * 89} y1={100 + Math.sin(a) * 89} x2={100 + Math.cos(a) * 96} y2={100 + Math.sin(a) * 96} stroke={P.ink} strokeWidth="1.6" />
    ))}
    <circle cx="100" cy="100" r="86" fill={P.bg} stroke={P.ink} strokeWidth="2.5" />
    <circle cx="100" cy="100" r="58" fill="url(#coinHatch)" stroke={P.ink} strokeWidth="2" />
    <text fontFamily={T.mono} fontWeight={600} fontSize="13.5" letterSpacing="2.2" fill={P.ink}>
      <textPath href="#coinRing" startOffset="0">
        BANK OF PATIENCE · ONE DOLLAR ·
      </textPath>
    </text>
    <text x="100" y="128" textAnchor="middle" fontFamily={T.display} fontSize="84" fill={P.ink}>
      1
    </text>
  </svg>
);

const NOTE1 = { src: "assets/CompoundInterest/note-1.jpg", ratio: 1500 / 661 };
const NOTE1000 = { src: "assets/CompoundInterest/note-1000.jpg", ratio: 1444 / 711 };

const Note: React.FC<{ note: typeof NOTE1; x: number; y: number; w: number; rot?: number; seed?: number }> = ({ note, x, y, w, rot = 0, seed = 5 }) => {
  const h = w / note.ratio;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, filter: SHADOW }}>
      <Img
        src={staticFile(note.src)}
        style={{ position: "absolute", inset: 0, width: w, height: h, clipPath: torn(w, h, seed, { top: true, bottom: true, left: true, right: true }, 5, 18) }}
      />
    </div>
  );
};

/** Greeked newspaper column text. */
const Greek: React.FC<{ x: number; y: number; w: number; lines: number; seed?: number; gap?: number }> = ({ x, y, w, lines, seed = 1, gap = 26 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w }}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        style={{ height: 9, marginBottom: gap - 9, background: P.muted, opacity: 0.38, width: i === lines - 1 ? `${40 + rand(seed + i) * 30}%` : `${92 + rand(seed + i) * 8}%` }}
      />
    ))}
  </div>
);

// ─── Composition ─────────────────────────────────────────────────────────────────────────────

export const CompoundInterest: React.FC = () => (
  <AbsoluteFill style={{ background: P.surface, fontFamily: T.body, color: P.ink }}>
    <InkFilter />
    <Shot at={0} until={LUCK}>
      <FrontPage mode="hook" />
    </Shot>
    <Shot at={LUCK} until={SIMPLE}>
      <Sheet from="right" color={P.surface} seed={11}>
        <LuckTime />
      </Sheet>
    </Shot>
    <Shot at={SIMPLE} until={TENC}>
      <Sheet from="bottom" seed={12}>
        <Principal />
      </Sheet>
    </Shot>
    <Shot at={TENC} until={COMPOUND}>
      <AbsoluteFill style={{ background: P.bg }}>
        <TenCents />
      </AbsoluteFill>
    </Shot>
    <Shot at={COMPOUND} until={LADDER}>
      <Sheet from="left" color={P.surface} seed={13}>
        <OnTheInterest />
      </Sheet>
    </Shot>
    <Shot at={LADDER} until={EARNING}>
      <AbsoluteFill style={{ background: P.bg }}>
        <Ladder />
      </AbsoluteFill>
    </Shot>
    <Shot at={EARNING} until={RULE}>
      <AbsoluteFill style={{ background: P.surface }}>
        <Earning />
      </AbsoluteFill>
    </Shot>
    <Shot at={RULE} until={CARD}>
      <Sheet from="bottom" seed={14}>
        <RuleOf72 />
      </Sheet>
    </Shot>
    <Shot at={CARD} until={SIX}>
      <AbsoluteFill style={{ background: P.surface }}>
        <IndexCard />
      </AbsoluteFill>
    </Shot>
    <Shot at={SIX} until={TEN}>
      <AbsoluteFill style={{ background: P.bg }}>
        <SixPercent />
      </AbsoluteFill>
    </Shot>
    <Shot at={TEN} until={CHART}>
      <AbsoluteFill style={{ background: P.bg }}>
        <TenPercent />
      </AbsoluteFill>
    </Shot>
    <Shot at={CHART} until={EARLY}>
      <Sheet from="right" color={P.surface} seed={15}>
        <BigChart />
      </Sheet>
    </Shot>
    <Shot at={EARLY} until={STACKS}>
      <Sheet from="bottom" seed={16}>
        <StartEarly />
      </Sheet>
    </Shot>
    <Shot at={STACKS} until={CLOCK}>
      <AbsoluteFill style={{ background: P.bg }}>
        <Stacks />
      </AbsoluteFill>
    </Shot>
    <Shot at={CLOCK} until={END}>
      <Sheet from="top" color={P.surface} seed={17}>
        <FrontPage mode="clock" />
      </Sheet>
    </Shot>
    {/* The end card arrives on a torn sheet that starts sliding 6 frames before the cut, so the cut frame is never blank. */}
    <Sequence from={END - END_LEAD}>
      <Sheet from="bottom" color={P.bg} seed={18}>
        <EndCard system={S} motif={<EndMotif />} />
      </Sheet>
    </Sequence>
    <SystemTexture system={S} />
    <Narration />
    <SoundDesign />
  </AbsoluteFill>
);

/** The red growth line returns above the studio wordmark. */
const EndMotif: React.FC = () => {
  const f = useCurrentFrame();
  const p = m(f, END_LEAD + 2, END_LEAD + 30, 0, 1, (t) => 1 - Math.pow(1 - t, 2.2));
  return (
    <svg width={360} height={150} viewBox="0 0 360 150" style={{ overflow: "visible" }}>
      <line x1={0} x2={360} y1={144} y2={144} stroke={P.ink} strokeWidth={4} />
      <path
        d={growthPath(6, 354, 138, 10, 1.1, 72)}
        fill="none"
        stroke={RED}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

/** Rough rubber-stamp ink: knocks speckles out of whatever it's applied to. */
const InkFilter: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves={2} seed={4} result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.95" result="m" />
      <feComposite in="SourceGraphic" in2="m" operator="in" />
    </filter>
  </svg>
);

// ─── 1. Front page (hook, and the callback at the end) ───────────────────────────────────────

const PAGE = { x: 50, y: 150, w: 980, h: 1640 };
const HEAD_Y = 214; // page-local top of the headline block

const FrontPage: React.FC<{ mode: "hook" | "clock" }> = ({ mode }) => {
  const f = useF();
  const hook = mode === "hook";
  // Camera: slow push; smash-in on "$1,000" at ZOOM (hook only); slow push at the end.
  let cam = { k: 1 + 0.03 * m(f, 0, ZOOM, 0, 1, lin), cx: 540, cy: 860, tx: 540, ty: 860 };
  if (hook && f >= ZOOM) cam = { k: 1.21 + 0.025 * m(f, ZOOM, LUCK, 0, 1, lin), cx: 104, cy: 900, tx: 94, ty: 960 };
  if (!hook) cam = { k: 1.0 + 0.05 * m(f, CLOCK, END, 0, 1, lin), cx: 540, cy: 900, tx: 540, ty: 900 };

  const swap = (a: number) => (f >= a ? 1 : 0);
  const headline = hook ? null : f < CLOCK + 26 ? "Same dollar." : f < CLOCK + 44 ? "Less time." : "Start the clock.";
  const sk = hook ? 0 : shake(f, CLOCK + 60, 8);
  const draw = hook ? 1 : m(f, CLOCK + 44, CLOCK + 86, 0, 1, (t) => 1 - Math.pow(1 - t, 2.2));

  return (
    <AbsoluteFill style={{ background: P.surface }}>
      <AbsoluteFill
        style={hook && f >= ZOOM ? { maskImage: "linear-gradient(180deg, transparent 0px, transparent 300px, black 390px, black 1500px, transparent 1610px)" } : undefined}
      >
      <Cam k={cam.k} cx={cam.cx} cy={cam.cy} tx={cam.tx} ty={cam.ty}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${sk}px, ${sk * 0.6}px)` }}>
          <Scrap {...PAGE} rot={-1.2} seed={hook ? 21 : 22} edges={{ top: true, bottom: true, left: true, right: true }}>
            {/* masthead */}
            <div style={{ position: "absolute", left: 50, right: 50, top: 46, borderTop: `3px solid ${P.ink}`, borderBottom: `1px solid ${P.ink}`, height: 6 }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 66, textAlign: "center", ...DISPLAY, fontSize: 92, lineHeight: 1 }}>The Compound Ledger</div>
            <div
              style={{
                position: "absolute",
                left: 50,
                right: 50,
                top: 176,
                borderTop: `1px solid ${P.ink}`,
                borderBottom: `3px solid ${P.ink}`,
                padding: "8px 0 6px",
                display: "flex",
                justifyContent: "space-between",
                ...MONO,
                fontWeight: 400,
                fontSize: 36,
                color: P.muted,
              }}
            >
              <span>Vol. LXXII</span>
              <span>Price one dollar</span>
            </div>
            {/* headline */}
            <div style={{ position: "absolute", left: 52, top: HEAD_Y + 40, width: 880, ...DISPLAY, fontSize: hook ? 196 : 180 }}>
              {hook ? (
                <>
                  How <Ring at={L.l01 + 6} f={f}><Hi at={-10} f={f}>$1</Hi></Ring>
                  <br />
                  becomes
                  <br />
                  <span style={{ fontSize: 268, color: P.ink }}>
                    <Hi at={ZOOM + 4} dur={10} f={f}>$1,000</Hi>
                  </span>
                </>
              ) : (
                <div style={{ transform: `translateY(${(1 - m(f, swap(CLOCK + 44) ? CLOCK + 44 : swap(CLOCK + 26) ? CLOCK + 26 : CLOCK, (swap(CLOCK + 44) ? CLOCK + 44 : swap(CLOCK + 26) ? CLOCK + 26 : CLOCK) + 6)) * 30}px)` }}>
                  {headline === "Start the clock." ? (
                    <>
                      Start the
                      <br />
                      <Hi at={CLOCK + 50} f={f}>clock.</Hi>
                    </>
                  ) : (
                    headline
                  )}
                </div>
              )}
            </div>
            {/* body columns */}
            <Greek x={52} y={hook ? 920 : 760} w={420} lines={hook ? 4 : 9} seed={hook ? 3 : 8} />
            <Greek x={508} y={hook ? 1450 : 1450} w={420} lines={4} seed={9} />
            {/* fig. 1 — the red growth line */}
            <div style={{ position: "absolute", left: 508, top: 900, width: 420, height: 420, borderTop: `1px solid ${P.ink}`, borderBottom: `1px solid ${P.ink}` }}>
              <svg width={420} height={350} style={{ position: "absolute", top: 14 }} viewBox="0 0 420 350">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1={0} x2={420} y1={50 + i * 90} y2={50 + i * 90} stroke={P.muted} strokeOpacity={0.35} strokeWidth={2} />
                ))}
                <path
                  d={growthPath(10, 400, 330, 30, 1.1, 72)}
                  fill="none"
                  stroke={RED}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - draw}
                />
              </svg>
              <div style={{ position: "absolute", left: 0, bottom: 10, ...MONO, fontWeight: 400, fontSize: 36, color: P.muted }}>Fig. 1 — $1 at 10%</div>
            </div>
            <Note note={NOTE1} x={hook ? 30 : 36} y={hook ? 1090 : 1060} w={470} rot={-7} seed={4} />
          </Scrap>
          {!hook && (
            <Stamp at={CLOCK + 60} f={f} x={770} y={830} rot={-9} size={110}>
              Day 1
            </Stamp>
          )}
        </div>
      </Cam>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** SVG path of 1.r^t from (x0, y0) to (x1, y1) for t in 0..years, scaled so the end lands at y1. */
const growthPath = (x0: number, x1: number, y0: number, y1: number, r: number, years: number) => {
  const top = Math.pow(r, years);
  const pts: string[] = [];
  for (let t = 0; t <= years; t += 1) {
    const x = x0 + (t / years) * (x1 - x0);
    const y = y0 - ((Math.pow(r, t) - 1) / (top - 1)) * (y0 - y1);
    pts.push(`${t === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
};

// ─── 2. Not luck. Time. ──────────────────────────────────────────────────────────────────────

const LuckTime: React.FC = () => {
  const f = useF();
  const k = 1 + 0.04 * m(f, LUCK, SIMPLE, 0, 1, lin);
  const timeAt = L.l02 + 42;
  return (
    <Cam k={k} cx={540} cy={900}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${shake(f, timeAt)}px, ${shake(f, timeAt) * 0.5}px)` }}>
        <Scrap x={110} y={430} w={760} h={330} rot={-3} seed={31}>
          <div style={{ ...MONO, fontSize: 44, color: P.muted, position: "absolute", left: 44, top: 30 }}>Not</div>
          <div style={{ ...DISPLAY, fontSize: 250, position: "absolute", left: 40, top: 70 }}>
            <Marker at={L.l02 + 9} f={f}>
              Luck
            </Marker>
          </div>
        </Scrap>
        <div style={{ position: "absolute", left: 128, top: 900, ...MONO, fontSize: 44, color: P.ink, opacity: m(f, L.l02 + 30, L.l02 + 36) }}>Just</div>
        <Stamp at={timeAt} f={f} x={540} y={1150} rot={-5} size={230}>
          Time
        </Stamp>
      </div>
    </Cam>
  );
};

// ─── 3. Simple interest: paid on what you put in ─────────────────────────────────────────────

const Principal: React.FC = () => {
  const f = useF();
  const k = 1 + 0.035 * m(f, SIMPLE, TENC, 0, 1, lin);
  const n = slide(f, SIMPLE + 8, 14);
  return (
    <>
      <Cam k={k} cx={540} cy={1000}>
        <div style={{ position: "absolute", left: 80, top: 360, width: 920, ...DISPLAY, fontSize: 150 }}>
          Paid only
          <br />
          on what
          <br />
          <Hi at={L.l03 + 46} f={f}>you put in.</Hi>
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - n) * -1150}px) rotate(${(1 - n) * -8}deg)` }}>
          <Note note={NOTE1} x={110} y={900} w={860} rot={-4} seed={6} />
        </div>
        <div style={{ position: "absolute", left: 120, top: 1330, ...MONO, fontSize: 48 }}>
          <Typed text="Principal: $1.00" at={L.l03 + 40} f={f} />
        </div>
      </Cam>
      <Tab num="01" label="Simple interest" at={SIMPLE} f={f} />
    </>
  );
};

// ─── Ledger bars (shared by simple and compound) ─────────────────────────────────────────────

type Bar = { at: number; yellow: number; red: number; label: string };

const LedgerBars: React.FC<{ bars: Bar[]; perDollar: number; base: number; x0: number; w: number; gap: number; f: number; line?: "ink" | "red"; years?: string[] }> = ({
  bars,
  perDollar,
  base,
  x0,
  w,
  gap,
  f,
  line,
  years,
}) => {
  const tops: { x: number; y: number }[] = [];
  return (
    <>
      {bars.map((b, i) => {
        if (i > 0 && f < b.at - 8) return null;
        // Year 0 grows up from the baseline; every later year is a copy of the previous bar that
        // slides across ("carried forward"), then its new interest grows on top.
        const rise = i === 0 ? m(f, b.at, b.at + 10) : 1;
        const carry = i === 0 ? 1 : m(f, b.at - 8, b.at);
        const grow = i === 0 ? 1 : m(f, b.at, b.at + 9, 0, 1, ease.backOut);
        const prev = i > 0 ? bars[i - 1] : b;
        const x = x0 + i * (w + gap) - (1 - carry) * (w + gap);
        const hInk = perDollar;
        const hY = (i === 0 ? b.yellow : prev.yellow + (b.yellow - prev.yellow) * grow) * perDollar;
        const hR = (i === 0 ? b.red : prev.red + (b.red - prev.red) * grow) * perDollar;
        const total = (hInk + hY + hR) * rise;
        if (carry >= 1 && rise >= 1) tops.push({ x: x + w / 2, y: base - total });
        const labelP = m(f, b.at + 3, b.at + 8);
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: x, top: base - total, width: w, height: total, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
                {hR > 0.5 && <div style={{ height: hR, background: RED }} />}
                {hY > 0.5 && (
                  <div
                    style={{
                      height: hY,
                      background: HI,
                      backgroundImage: `repeating-linear-gradient(0deg, ${P.ink} 0 2px, transparent 2px ${perDollar / 10}px)`,
                      backgroundPosition: "bottom",
                    }}
                  />
                )}
                <div
                  style={{
                    height: hInk,
                    boxSizing: "border-box",
                    background: P.bg,
                    border: `3px solid ${P.ink}`,
                    backgroundImage: `repeating-linear-gradient(45deg, ${P.ink} 0 3px, transparent 3px 14px)`,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: x0 + i * (w + gap) - 20,
                width: w + 40,
                top: base - total - 74,
                ...MONO,
                fontSize: 44,
                textAlign: "center",
                opacity: i === 0 ? m(f, b.at + 6, b.at + 12) : labelP,
                transform: `translateY(${(1 - (i === 0 ? m(f, b.at + 6, b.at + 12) : labelP)) * 16}px)`,
              }}
            >
              {b.label}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x0 - 20, width: bars.length * (w + gap) - gap + 40, top: base, height: 4, background: P.ink }} />
      {years &&
        years.map((y, i) => (
          <div key={y} style={{ position: "absolute", left: x0 + i * (w + gap), width: w, top: base + 16, textAlign: "center", ...MONO, fontWeight: 400, fontSize: 44, color: P.muted }}>
            {y}
          </div>
        ))}
      {line && tops.length > 1 && (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <polyline
            points={tops.map((t) => `${t.x},${t.y}`).join(" ")}
            fill="none"
            stroke={line === "red" ? RED : P.ink}
            strokeWidth={6}
            strokeDasharray={line === "ink" ? "16 10" : undefined}
            strokeLinejoin="round"
          />
          {tops.map((t, i) => (
            <circle key={i} cx={t.x} cy={t.y} r={10} fill={line === "red" ? RED : P.ink} />
          ))}
        </svg>
      )}
    </>
  );
};

// ─── 4. Ten cents. Every year. ───────────────────────────────────────────────────────────────

const TEN_BARS: Bar[] = [0, 1, 2, 3, 4].map((y) => ({
  at: y === 0 ? TENC - 6 : L.l04 + 30 + (y - 1) * 15,
  yellow: y * 0.1,
  red: 0,
  label: `$${(1 + y * 0.1).toFixed(2)}`,
}));

const TenCents: React.FC = () => {
  const f = useF();
  const k = 1 + 0.03 * m(f, TENC, COMPOUND, 0, 1, lin);
  return (
    <>
      <Cam k={k} cx={540} cy={1100}>
        <div style={{ position: "absolute", left: 80, top: 330, ...DISPLAY, fontSize: 150 }}>
          <span style={{ display: "inline-block", transform: `scale(${m(f, L.l04 + 30, L.l04 + 36, 1.12, 1)})`, transformOrigin: "0 60%" }}>+10¢ a year.</span>
          <br />
          <Hi at={L.l04 + 55} f={f}>Every year.</Hi>
        </div>
        <LedgerBars bars={TEN_BARS} perDollar={520} base={1390} x0={110} w={140} gap={40} f={f} line="ink" years={["0", "1", "2", "3", "4"]} />
      </Cam>
      <Tab num="01" label="Simple interest" at={SIMPLE} f={TENC + 40} />
    </>
  );
};

// ─── 5. Compound: paid on the interest, too ──────────────────────────────────────────────────

const OnTheInterest: React.FC = () => {
  const f = useF();
  const k = 1 + 0.05 * m(f, COMPOUND, LADDER, 0, 1, lin);
  const c1 = slide(f, COMPOUND + 6, 10);
  const c2 = m(f, L.l05 + 44, L.l05 + 52, 0, 1, ease.backOut);
  const c3 = m(f, L.l05 + 58, L.l05 + 66, 0, 1, ease.backOut);
  return (
    <>
      <Cam k={k} cx={540} cy={900}>
        <div style={{ position: "absolute", left: 80, top: 350, width: 920, ...DISPLAY, fontSize: 150 }}>
          Interest on
          <br />
          <Hi at={L.l05 + 42} dur={14} f={f}>the interest.</Hi>
        </div>
        <Coin x={330 - (1 - c1) * 900} y={1060} d={420} rot={-8 + (1 - c1) * -40} />
        <div style={{ position: "absolute", inset: 0, opacity: c2 }}>
          <Coin x={640 + c2 * 60} y={1180 + c2 * 40} d={210 * c2 + 1} rot={12} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: c3 }}>
          <Coin x={850} y={1300} d={105 * c3 + 1} rot={-6} />
        </div>
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          {[
            { d: "M 470 900 C 560 840, 660 900, 690 1010", at: L.l05 + 40 },
            { d: "M 760 1080 C 830 1060, 880 1120, 870 1210", at: L.l05 + 54 },
          ].map((a, i) => {
            const p = m(f, a.at, a.at + 9, 0, 1, ease.sineInOut);
            return (
              <path key={i} d={a.d} fill="none" stroke={RED} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
            );
          })}
        </svg>
      </Cam>
      <Tab num="02" label="Compound interest" at={COMPOUND} f={f} />
    </>
  );
};

// ─── 6. The ladder: $1.00 → $1.10 → $1.21 → $1.33 ────────────────────────────────────────────

const LADDER_BARS: Bar[] = [
  { at: LADDER - 6, yellow: 0, red: 0, label: "$1.00" },
  { at: L.l06 + 41, yellow: 0.1, red: 0, label: "$1.10" },
  { at: L.l06 + 66, yellow: 0.2, red: 0.01, label: "$1.21" },
  { at: L.l06 + 96, yellow: 0.3, red: 0.031, label: "$1.33" },
];
const LADDER_PER = 560;
const LADDER_BASE = 1390;
const LADDER_X0 = 130;
const LADDER_W = 170;
const LADDER_GAP = 50;

const Ladder: React.FC = () => {
  const f = useF();
  const cu = f >= LADDER_CU;
  const idx = LADDER_BARS.reduce((a, b, i) => (f >= b.at + 6 ? i : a), 0);
  const hit = LADDER_BARS[idx].at + 6;
  const bar3Top = LADDER_BASE - LADDER_PER * 1.331;
  const k = cu ? 2.15 + 0.06 * m(f, LADDER_CU, EARNING, 0, 1, lin) : 1 + 0.03 * m(f, LADDER, LADDER_CU, 0, 1, lin);
  // Close-up framing: year 1's bar sits fully off the left edge; year 2's bar starts at x ≥ 80.
  const cam = cu ? { cx: 765, cy: bar3Top, tx: 517, ty: 780 } : { cx: 540, cy: 1100, tx: 540, ty: 1100 };
  const callout = m(f, LADDER_CU + 4, LADDER_CU + 12);
  return (
    <>
      <Cam k={k} cx={cam.cx} cy={cam.cy} tx={cam.tx} ty={cam.ty}>
        {!cu && (
          <div style={{ position: "absolute", left: 80, top: 330, ...DISPLAY, fontSize: 230, lineHeight: 1 }}>
            <span style={{ display: "inline-block", transform: `scale(${idx > 0 ? m(f, hit, hit + 6, 1.14, 1) : 1})`, transformOrigin: "0 70%" }}>
              {LADDER_BARS[idx].label}
            </span>
          </div>
        )}
        <LedgerBars bars={LADDER_BARS} perDollar={LADDER_PER} base={LADDER_BASE} x0={LADDER_X0} w={LADDER_W} gap={LADDER_GAP} f={f} line="red" years={["0", "1", "2", "3"]} />
      </Cam>
      {cu && (
        <div style={{ position: "absolute", left: 80, top: 330, width: 460, opacity: callout, transform: `translateX(${(1 - callout) * -60}px)` }}>
          <div style={{ ...MONO, fontSize: 56, color: P.ink, lineHeight: 1.15 }}>
            Interest
            <br />
            on interest
          </div>
        </div>
      )}
      {cu && <CalloutArrow p={m(f, LADDER_CU + 8, LADDER_CU + 18)} />}
      <Tab num="02" label="Compound interest" at={COMPOUND} f={LADDER + 40} />
    </>
  );
};

/** Red arrow from the callout to the year-3 red sliver; it threads between the $1.21 and $1.33 labels. */
const CalloutArrow: React.FC<{ p: number }> = ({ p }) => {
  const end = { x: 550, y: 776 };
  const c2 = { x: 470, y: 600 };
  const a = Math.atan2(end.y - c2.y, end.x - c2.x);
  const head = (s: number) => `${end.x - 30 * Math.cos(a + s * 0.5)},${end.y - 30 * Math.sin(a + s * 0.5)}`;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path
        d={`M 300 488 C 380 520, ${c2.x} ${c2.y}, ${end.x} ${end.y}`}
        fill="none"
        stroke={RED}
        strokeWidth={8}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
      <polyline points={`${head(1)} ${end.x},${end.y} ${head(-1)}`} fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={p >= 1 ? 1 : 0} />
    </svg>
  );
};

// ─── 7. Interest, earning interest ───────────────────────────────────────────────────────────

const Earning: React.FC = () => {
  const f = useF();
  const k = 1 + 0.05 * m(f, EARNING, RULE, 0, 1, lin);
  const strips = [
    { text: "Interest,", at: EARNING, y: 430, from: -1, rot: -2.5, x: 80, w: 690 },
    { text: "earning", at: L.l07 + 15, y: 730, from: 1, rot: 1.8, x: 210, w: 680 },
    { text: "interest.", at: L.l07 + 25, y: 1030, from: -1, rot: -1.5, x: 100, w: 700 },
  ];
  const loop = m(f, L.l07 + 36, L.l07 + 52, 0, 1, ease.sineInOut);
  return (
    <Cam k={k} cx={540} cy={900}>
      {strips.map((s, i) => {
        const p = i === 0 ? 1 : slide(f, s.at - 2, 8);
        if (f < s.at - 2) return null;
        return (
          <Scrap key={i} x={s.x + s.from * (1 - p) * 1200} y={s.y} w={s.w} h={236} rot={s.rot} seed={40 + i}>
            <div style={{ ...DISPLAY, fontSize: 184, position: "absolute", left: 36, top: 22, whiteSpace: "nowrap" }}>
              {i === 2 ? (
                <Marker at={L.l07 + 30} f={f} kind="under">
                  {s.text}
                </Marker>
              ) : (
                s.text
              )}
            </div>
          </Scrap>
        );
      })}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path
          d="M 830 1150 C 990 1060, 1000 640, 900 520"
          fill="none"
          stroke={RED}
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - loop}
        />
        <path d="M 862 548 L 898 516 L 928 556" fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={loop >= 1 ? 1 : 0} />
      </svg>
    </Cam>
  );
};

// ─── 8. The rule of 72 ───────────────────────────────────────────────────────────────────────

const RuleOf72: React.FC = () => {
  const f = useF();
  const at72 = L.l08 + 45;
  const k = 1 + 0.04 * m(f, RULE, CARD, 0, 1, lin);
  const ruleIn = m(f, L.l08 + 25, L.l08 + 35);
  return (
    <>
      <Cam k={k} cx={540} cy={1000}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${shake(f, at72, 12)}px, ${shake(f, at72, 12) * 0.5}px)` }}>
          <div style={{ position: "absolute", left: 80, top: 372, overflow: "hidden", ...DISPLAY, fontSize: 112, paddingBottom: 14 }}>
            <div style={{ transform: `translateY(${(1 - m(f, RULE - 4, RULE + 6)) * 110}%)` }}>Want a shortcut?</div>
          </div>
          <div style={{ position: "absolute", left: 80, top: 520, overflow: "hidden", ...DISPLAY, fontSize: 170, paddingBottom: 20 }}>
            <div style={{ transform: `translateY(${(1 - ruleIn) * 110}%)` }}>The rule of</div>
          </div>
          <Stamp at={at72} f={f} x={540} y={1080} rot={-7} size={400}>
            72
          </Stamp>
        </div>
      </Cam>
      <Tab num="03" label="The rule of 72" at={RULE} f={f} />
    </>
  );
};

const IndexCard: React.FC = () => {
  const f = useF();
  const k = 1 + 0.07 * m(f, CARD, SIX, 0, 1, lin);
  const inP = slide(f, CARD - 2, 8);
  return (
    <>
      <Cam k={k} cx={540} cy={860}>
        <Scrap x={80} y={540 + (1 - inP) * 1300} w={920} h={860} rot={-2} seed={52} edges={{}}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 150 + i * 70, height: 2, background: P.muted, opacity: 0.3 }} />
          ))}
          <div style={{ position: "absolute", left: 0, right: 0, top: 128, height: 3, background: RED, opacity: 0.75 }} />
          <div style={{ position: "absolute", left: 50, top: 40, ...MONO, fontWeight: 400, fontSize: 44, color: P.muted }}>Years to double</div>
          <div style={{ position: "absolute", left: 50, top: 200, ...MONO, fontSize: 96, letterSpacing: "0", textTransform: "none", lineHeight: 1.45 }}>
            <Typed text="72 ÷ rate" at={CARD + 4} f={f} cps={22} />
            <br />
            <Typed text="≈ years" at={L.l09 + 34} f={f} cps={22} />
          </div>
          <div style={{ position: "absolute", left: 50, top: 650, ...MONO, fontSize: 56, letterSpacing: "0", textTransform: "none", opacity: m(f, CARD + 10, CARD + 16) }}>
            rate: <Hi at={CARD + 14} f={f}>6% → 6</Hi>
          </div>
        </Scrap>
      </Cam>
      <Tab num="03" label="The rule of 72" at={RULE} f={CARD + 40} />
    </>
  );
};

const SixPercent: React.FC = () => {
  const f = useF();
  const k = 1 + 0.03 * m(f, SIX, TEN, 0, 1, lin);
  const dbl = m(f, L.l10 + 37, L.l10 + 47, 0, 1, ease.backOut);
  const twelve = L.l10 + 63;
  const eq2 = m(f, twelve - 4, twelve + 4);
  return (
    <>
      <Cam k={k} cx={540} cy={1000}>
        <div style={{ position: "absolute", left: 80, top: 350, ...DISPLAY, fontSize: 190, lineHeight: 1.0 }}>
          72 ÷ 6
          <br />
          <span style={{ opacity: eq2, display: "inline-block", transform: `translateY(${(1 - eq2) * 40}px)` }}>
            ≈ <Hi at={twelve + 2} f={f}>12 years</Hi>
          </span>
        </div>
        <Coin x={540 - dbl * 190} y={1150} d={340} rot={-6} />
        {dbl > 0 && <Coin x={540 + dbl * 190} y={1150} d={340} rot={8} />}
        <div style={{ position: "absolute", left: 0, right: 0, top: 1360, textAlign: "center", ...MONO, fontSize: 56 }}>{dbl > 0.5 ? "$1 → $2" : "$1"}</div>
      </Cam>
      <Tab num="03" label="The rule of 72" at={RULE} f={SIX + 40} />
    </>
  );
};

const COLS = [0, 1, 2, 3];
const TenPercent: React.FC = () => {
  const f = useF();
  const k = 1 + 0.03 * m(f, TEN, CHART, 0, 1, lin);
  const colAt = (c: number) => TEN - 6 + c * 12;
  return (
    <>
      <Cam k={k} cx={540} cy={1000}>
        <div style={{ position: "absolute", left: 80, top: 350, ...DISPLAY, fontSize: 190, lineHeight: 1.0 }}>
          72 ÷ 10
          <br />
          <Hi at={L.l11 + 44} f={f}>≈ 7 years</Hi>
        </div>
        {COLS.map((c) => {
          const n = Math.pow(2, c);
          const cx = 200 + c * 227;
          const filled = m(f, colAt(c) + n - 1, colAt(c) + n + 5);
          return (
            <div key={c}>
              {/* dashed ledger slot for the full stack, there from the cut so the frame is never half-empty */}
              <div
                style={{
                  position: "absolute",
                  left: cx - 84,
                  width: 168,
                  top: 1290 - (n - 1) * 58 - 84,
                  height: (n - 1) * 58 + 84 + 94,
                  border: `3px dashed ${P.muted}`,
                  borderBottom: "none",
                  borderRadius: "84px 84px 0 0",
                  opacity: 0.55 * (1 - filled),
                }}
              />
              {Array.from({ length: n }, (_, i) => {
                const at = colAt(c) + i * 1;
                const p = m(f, at, at + 7, 0, 1, ease.backOut);
                if (f < at) return null;
                return <Coin key={i} x={cx} y={1290 - i * 58 - (1 - p) * 120} d={150} rot={(rand(c * 10 + i) - 0.5) * 30} style={{ opacity: m(f, at, at + 3) }} />;
              })}
              <div style={{ position: "absolute", left: cx - 100, width: 200, top: 1395, textAlign: "center", ...MONO, fontSize: 48, color: filled > 0.5 ? P.ink : P.muted }}>
                ${n}
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 80, right: 80, top: 1384, height: 4, background: P.ink }} />
      </Cam>
      <Tab num="03" label="The rule of 72" at={RULE} f={TEN + 40} />
    </>
  );
};

// ─── 9. The big chart: $1 at 10% for 72 years ────────────────────────────────────────────────

const X0 = 275;
const X1 = 950;
const Y1 = 660; // plot top (ymax)
const Y0 = 1290; // baseline ($0)
const SIMPLE_START = CHART + 36;
const SIMPLE_END = L.l13 + 28;
const RED_START = L.l14 + 2;
const RED_END = L.l14 + 37; // lands on "nine hundred"
const NOTE_IN = RED_END + 8;
const APPROX_AT = beat(82); // 1230: "≈ $1,000" stamp on the note, one beat after the $956 hit

const simpleV = (t: number) => 1 + 0.1 * t;
const compV = (t: number) => Math.pow(1.1, t);
const redYears = (f: number) => 72 * m(f, RED_START, RED_END, 0, 1, (t) => t * t * (3 - 2 * t) * 0.5 + t * 0.5);
/** The plot's top tracks the red line, so the curve never flattens against the top and the dot never detaches. */
const ymaxAt = (f: number) => Math.max(10, compV(redYears(f)) * 1.08);
/** Frame where the y-axis starts to rescale (for the whoosh). */
const RESCALE_AT = (() => {
  for (let f = RED_START; f < RED_END; f++) if (ymaxAt(f) > 10.01) return f;
  return RED_START;
})();
/** Candidate tick steps; a step's ticks show while their spacing on screen is comfortable, and neighbours crossfade. */
const TICK_STEPS = [2.5, 5, 10, 25, 50, 100, 250];
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
const tickWeights = (ymax: number) => {
  const w = new Map<number, number>();
  for (const st of TICK_STEPS) {
    const sp = (st / ymax) * (Y0 - Y1);
    // the coarse set fades in exactly as the fine set (2.5x finer) fades out, so labels never crowd or vanish
    const o = smooth((sp - 105) / 25) * (1 - smooth((sp - 262) / 63));
    if (o <= 0.001) continue;
    for (let k = 1; k * st <= ymax * 1.001; k++) w.set(k * st, Math.max(w.get(k * st) ?? 0, o));
  }
  return w;
};

const BigChart: React.FC = () => {
  const f = useF();
  const ymax = ymaxAt(f);
  const yOf = (v: number) => Y0 - (v / ymax) * (Y0 - Y1);
  const xOf = (t: number) => X0 + (t / 72) * (X1 - X0);
  const sYears = 72 * m(f, SIMPLE_START, SIMPLE_END, 0, 1, ease.sineInOut);
  const cYears = redYears(f);
  const path = (fn: (t: number) => number, upto: number) => {
    if (upto <= 0) return "";
    const pts: string[] = [];
    for (let t = 0; t <= upto; t += 0.5) pts.push(`${xOf(t).toFixed(1)},${yOf(fn(t)).toFixed(1)}`);
    pts.push(`${xOf(upto).toFixed(1)},${yOf(fn(upto)).toFixed(1)}`);
    return pts.join(" ");
  };
  const redOn = f >= RED_START;
  // The counter shows the exact value for the whole year on the clock, with cents below $100.
  const year = Math.floor((redOn ? cYears : sYears) + 1e-9);
  const counterV = redOn ? compV(year) : simpleV(year);
  const counter = counterV < 100 ? `$${counterV.toFixed(2)}` : `$${Math.round(counterV).toLocaleString("en-US")}`;
  const landed = f >= RED_END;
  const punch = landed ? m(f, RED_END, RED_END + 8, 1.12, 1) : 1;
  const k = (f < L.l14 ? 1 + 0.02 * m(f, CHART, L.l14, 0, 1, lin) : 1.0 + 0.02 * m(f, L.l14, EARLY, 0, 1, lin)) * (landed ? 1 + 0.02 * m(f, RED_END, RED_END + 6) : 1);
  const ticks = [...tickWeights(ymax).entries()];
  const fmt = (v: number) => (v >= 100 ? `$${v.toLocaleString("en-US")}` : `$${v % 1 ? v.toFixed(2) : v}`);
  const note = slide(f, NOTE_IN, 12);
  const simpleLabel = m(f, SIMPLE_END + 2, SIMPLE_END + 8);
  const compLabel = m(f, RED_END + 4, RED_END + 10);
  const mode = redOn ? "compound" : "simple";

  return (
    <Cam k={k} cx={540} cy={900}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${shake(f, RED_END, 8)}px, 0)` }}>
        <Scrap x={60} y={250} w={960} h={1280} rot={-0.8} seed={61} edges={{ top: true, bottom: true }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${P.muted}26 2px, transparent 2px), linear-gradient(90deg, ${P.muted}26 2px, transparent 2px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </Scrap>
        {/* header */}
        <div style={{ position: "absolute", left: 100, top: 290, ...MONO, fontSize: 44 }}>
          $1 at 10% · <span style={{ color: redOn ? RED : P.ink }}>{mode}</span>
        </div>
        <div style={{ position: "absolute", right: 100, top: 290, ...MONO, fontSize: 44, color: P.muted }}>
          Year <span style={{ color: P.ink, display: "inline-block", minWidth: 56, textAlign: "right" }}>{year}</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 360,
            ...DISPLAY,
            fontSize: 230,
            lineHeight: 1,
            color: redOn ? RED : P.ink,
            transform: `scale(${punch})`,
            transformOrigin: "0 80%",
          }}
        >
          {counter}
        </div>
        {/* axes */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <clipPath id="plot">
              <rect x={X0 - 10} y={Y1 - 60} width={X1 - X0 + 40} height={Y0 - Y1 + 66} />
            </clipPath>
          </defs>
          {ticks.map(([v, w]) => {
            const y = yOf(v);
            const o = w * smooth((y - (Y1 - 30)) / 30) * smooth((Y0 - 40 - y) / 20);
            if (o <= 0.01) return null;
            return (
              <g key={v} opacity={o}>
                <line x1={X0} x2={X1} y1={y} y2={y} stroke={P.ink} strokeOpacity={0.25} strokeWidth={2} strokeDasharray="6 8" />
                <text x={X0 - 18} y={y + 14} textAnchor="end" fontFamily={T.mono} fontWeight={600} fontSize={40} fill={P.muted}>
                  {fmt(v)}
                </text>
              </g>
            );
          })}
          <line x1={X0} x2={X1 + 20} y1={Y0} y2={Y0} stroke={P.ink} strokeWidth={4} />
          {[0, 24, 48].map((t) => (
            <text key={t} x={xOf(t)} y={Y0 + 56} textAnchor="middle" fontFamily={T.mono} fontWeight={600} fontSize={44} fill={P.muted}>
              {t}
            </text>
          ))}
          <text x={X1 + 24} y={Y0 + 56} textAnchor="end" fontFamily={T.mono} fontWeight={600} fontSize={44} fill={P.muted}>
            72 YRS
          </text>
          <g clipPath="url(#plot)">
            <polyline points={path(simpleV, sYears)} fill="none" stroke={P.ink} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
            {redOn && <polyline points={path(compV, cYears)} fill="none" stroke={RED} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />}
          </g>
          {redOn && <circle cx={xOf(cYears)} cy={Math.max(Y1 - 60, yOf(compV(cYears)))} r={landed ? 16 : 12} fill={RED} />}
          {sYears > 0 && <circle cx={xOf(sYears)} cy={yOf(simpleV(sYears))} r={11} fill={P.ink} />}
        </svg>
        {/* simple label rides the end of the ink line */}
        <div
          style={{
            position: "absolute",
            left: xOf(72) + 16 - 200,
            top: Math.min(Y0 - 116, yOf(8.2) - 132),
            width: 200,
            textAlign: "right",
            ...MONO,
            fontSize: 44,
            lineHeight: 1.05,
            opacity: simpleLabel,
          }}
        >
          <span style={{ color: P.muted, fontSize: 36 }}>Simple</span>
          <br />
          $8.20
        </div>
        {/* compound end value rides beside the red dot */}
        <div
          style={{
            position: "absolute",
            left: xOf(72) - 34 - 420,
            width: 420,
            top: yOf(compV(72)) - 30,
            textAlign: "right",
            ...MONO,
            fontSize: 48,
            opacity: compLabel,
            transform: `translateX(${(1 - compLabel) * -20}px)`,
          }}
        >
          <span style={{ background: P.bg, padding: "2px 10px" }}>
            Compound <span style={{ color: RED }}>$956</span>
          </span>
        </div>
        {/* the $1,000 note lands in the empty upper-left of the plot */}
        {f >= NOTE_IN && (
          <div style={{ position: "absolute", inset: 0, transform: `translate(${(1 - note) * -1100}px, ${(1 - note) * 80}px) rotate(${(1 - note) * -10}deg)` }}>
            <Note note={NOTE1000} x={300} y={850} w={480} rot={-5} seed={9} />
          </div>
        )}
        <Stamp at={APPROX_AT} f={f} x={545} y={1085} rot={-8} size={84}>
          ≈ $1,000
        </Stamp>
        {/* footnote */}
        <div style={{ position: "absolute", left: 100, top: 1378, ...MONO, fontWeight: 400, fontSize: 38, letterSpacing: "0.01em", color: P.muted, lineHeight: 1.12 }}>
          Illustrative. {redOn ? "Compounded yearly;" : "Simple interest;"}
          <br />
          no fees, tax or inflation.
        </div>
      </div>
    </Cam>
  );
};

// ─── 10. Start early ─────────────────────────────────────────────────────────────────────────

const StartEarly: React.FC = () => {
  const f = useF();
  const k = 1 + 0.05 * m(f, EARLY, STACKS, 0, 1, lin);
  return (
    <>
      <Cam k={k} cx={540} cy={900}>
        <div style={{ position: "absolute", left: 80, top: 520, ...DISPLAY, fontSize: 300, lineHeight: 0.9 }}>
          Start
          <br />
          <Hi at={L.l15 + 22} f={f}>early.</Hi>
        </div>
        <Coin x={780} y={1260} d={300} rot={-12} style={{ transform: `translateY(${(1 - slide(f, EARLY + 8, 12)) * 600}px) rotate(-12deg)` }} />
      </Cam>
      <Tab num="04" label="Time" at={EARLY} f={f} />
    </>
  );
};

const STACK_BASE = 1340;
const NOTE_W = 230;
const NOTE_H = NOTE_W / NOTE1.ratio; // ≈ 101px per dollar
const STACK_A = 10.29; // 1.06^40
const STACK_B = 5.11; // 1.06^28

const NoteStack: React.FC<{ x: number; value: number; grow: number }> = ({ x, value, grow }) => {
  const h = value * NOTE_H * 0.76 * grow;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: STACK_BASE - h,
        width: NOTE_W,
        height: h,
        backgroundImage: `url(${staticFile(NOTE1.src)})`,
        backgroundSize: `${NOTE_W}px ${NOTE_H * 0.76}px`,
        backgroundRepeat: "repeat-y",
        backgroundPosition: "bottom",
        boxShadow: `0 0 0 3px ${P.ink}`,
        filter: SHADOW,
      }}
    />
  );
};

const Stacks: React.FC = () => {
  const f = useF();
  const k = 1 + 0.03 * m(f, STACKS, CLOCK, 0, 1, lin);
  const gA = m(f, STACKS - 6, STACKS + 10);
  const gB = m(f, L.l16 + 16, L.l16 + 32);
  const halfAt = L.l16 + 88;
  const dash = m(f, halfAt - 14, halfAt - 2, 0, 1, ease.sineInOut);
  const hA = STACK_A * NOTE_H * 0.76;
  const hB = STACK_B * NOTE_H * 0.76;
  const xa = 150;
  const xb = 560;
  return (
    <>
      <Cam k={k} cx={540} cy={1000}>
        <div style={{ position: "absolute", left: 80, top: 352, ...MONO, fontSize: 48 }}>Each $1 at 6% a year</div>
        <div style={{ position: "absolute", left: 80, top: 414, ...MONO, fontWeight: 400, fontSize: 36, color: P.muted }}>Illustrative · compounded yearly</div>
        <NoteStack x={xa} value={STACK_A} grow={gA} />
        <NoteStack x={xb} value={STACK_B} grow={gB} />
        <div style={{ position: "absolute", left: xa, width: NOTE_W, top: STACK_BASE - hA * gA - 70, textAlign: "center", ...MONO, fontSize: 52, opacity: gA }}>
          $10.29
        </div>
        <div style={{ position: "absolute", left: xb + NOTE_W + 24, top: STACK_BASE - hB * gB - 30, ...MONO, fontSize: 52, opacity: gB }}>
          $5.11
        </div>
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          <line
            x1={xa}
            x2={xa + (xb - 16 - xa) * dash}
            y1={STACK_BASE - hA / 2}
            y2={STACK_BASE - hA / 2}
            stroke={RED}
            strokeWidth={5}
            strokeDasharray="14 10"
          />
        </svg>
        <div style={{ position: "absolute", left: 80, right: 80, top: STACK_BASE, height: 4, background: P.ink }} />
        {[
          { x: xa, t: "40 years", s: "Start now" },
          { x: xb, t: "28 years", s: "12 yrs later" },
        ].map((c) => (
          <div key={c.x} style={{ position: "absolute", left: c.x - 60, width: NOTE_W + 120, top: STACK_BASE + 18, textAlign: "center", ...MONO, fontSize: 44 }}>
            {c.t}
            <div style={{ color: P.muted, fontWeight: 400 }}>{c.s}</div>
          </div>
        ))}
        <Stamp at={halfAt} f={f} x={xb + NOTE_W / 2 + 60} y={STACK_BASE - hA + 40} rot={-10} size={120}>
          Half
        </Stamp>
      </Cam>
      <Tab num="04" label="Time" at={EARLY} f={STACKS + 40} />
    </>
  );
};

// ─── Sound ───────────────────────────────────────────────────────────────────────────────────

/** The rule-of-72 working (23–30s) is the quiet, intimate stretch of the loudness arc. */
const QUIET_LINES: (keyof typeof L)[] = ["l09", "l10", "l11"];

const Narration: React.FC = () => (
  <>
    {(Object.keys(L) as (keyof typeof L)[]).map((id) => (
      <Sequence key={id} from={L[id]} durationInFrames={LINE_FRAMES[id] + 4} layout="none">
        <Audio src={staticFile(`voice/CompoundInterest/${id}.wav`)} volume={QUIET_LINES.includes(id) ? 0.78 : 1} />
      </Sequence>
    ))}
  </>
);

/** Music bed level: ~0.2 under narration, back up to ~0.48 in the gaps; ~0.3 through the rule of 72 (23–30s);
 *  near-silent for the second before the payoff hit, then it comes back in on the hit. */
const DIP = [beat(46), beat(60)] as const; // 690–900
const DROP = [RED_END - 30, RED_END] as const;
const musicLevel = (f: number) => {
  const gap = 0.48 - 0.18 * Math.max(0, Math.min(1, (f - (DIP[0] - 15)) / 15, (DIP[1] + 15 - f) / 15));
  const drop = f >= DROP[0] && f < DROP[1] ? 1 - 0.85 * Math.min(1, (f - DROP[0]) / 6) : 1;
  const lift = f < RED_END ? 0 : Math.max(0, Math.min(1, (RED_END + 45 - f) / 12));
  let under = 0;
  for (const id of Object.keys(L) as (keyof typeof L)[]) {
    const a = L[id] - 4;
    const b = L[id] + LINE_FRAMES[id] + 4;
    const v = f < a - 6 || f > b + 8 ? 0 : f < a ? (f - (a - 6)) / 6 : f > b ? 1 - (f - b) / 8 : 1;
    under = Math.max(under, v);
  }
  const base = gap * (1 - 0.58 * under) * drop;
  return base + (0.42 - base) * lift;
};

const SoundDesign: React.FC = () => (
  <>
    <Audio
      src={staticFile("music/pulse-minimal-120.m4a")}
      volume={(f) => musicLevel(f) * Math.max(0, Math.min(1, (f + 6) / 15, (COMPOUND_INTEREST_DURATION - f) / END_CARD_FRAMES))}
    />
    {/* hook */}
    <Sfx name="impact" at={0} volume={0.75} />
    <Sfx name="whoosh-short" at={ZOOM - 2} volume={0.5} />
    <Sfx name="click" at={ZOOM + 4} volume={0.4} />
    {/* luck / time */}
    <Sfx name="whoosh" at={LUCK - 3} volume={0.45} />
    <Sfx name="swish-reverse" at={L.l02 + 8} volume={0.3} />
    <Sfx name="impact" at={L.l02 + 42} volume={0.55} />
    <Sfx name="click" at={L.l02 + 42} volume={0.5} />
    {/* simple */}
    <Sfx name="whoosh" at={SIMPLE - 3} volume={0.4} />
    <Sfx name="whoosh-short" at={SIMPLE + 8} volume={0.35} />
    <Sfx name="type" at={L.l03 + 40} volume={0.35} />
    <Sfx name="click" at={TENC} volume={0.35} />
    {TEN_BARS.slice(1).map((b) => (
      <Sfx key={b.at} name="pop" at={b.at} volume={0.32} />
    ))}
    {/* compound */}
    <Sfx name="whoosh" at={COMPOUND - 3} volume={0.4} />
    <Sfx name="whoosh-short" at={COMPOUND + 6} volume={0.3} />
    <Sfx name="pop" at={L.l05 + 44} volume={0.4} />
    <Sfx name="pop" at={L.l05 + 58} volume={0.35} />
    <Sfx name="click" at={LADDER} volume={0.35} />
    {LADDER_BARS.slice(1).map((b) => (
      <Sfx key={b.at} name="impact" at={b.at + 6} volume={0.3} />
    ))}
    <Sfx name="whoosh-short" at={LADDER_CU - 2} volume={0.4} />
    {/* earning */}
    <Sfx name="whoosh-short" at={EARNING} volume={0.35} />
    <Sfx name="whoosh-short" at={L.l07 + 13} volume={0.35} />
    <Sfx name="whoosh-short" at={L.l07 + 23} volume={0.35} />
    <Sfx name="swish-reverse" at={L.l07 + 34} volume={0.3} />
    {/* rule of 72 */}
    <Sfx name="whoosh" at={RULE - 3} volume={0.4} />
    <Sfx name="whoosh-short" at={RULE + 1} volume={0.3} />
    <Sfx name="impact" at={L.l08 + 45} volume={0.7} />
    <Sfx name="sub-drop" at={L.l08 + 45} volume={0.45} />
    <Sfx name="type" at={CARD + 4} volume={0.3} />
    <Sfx name="type" at={L.l09 + 34} volume={0.3} />
    <Sfx name="click" at={SIX} volume={0.35} />
    <Sfx name="pop" at={L.l10 + 37} volume={0.45} />
    <Sfx name="click" at={TEN} volume={0.35} />
    {COLS.map((c) => (
      <Sfx key={c} name="pop" at={Math.max(TEN, TEN - 6 + c * 12)} volume={0.3 + c * 0.05} />
    ))}
    {/* chart */}
    <Sfx name="whoosh" at={CHART - 3} volume={0.45} />
    <Sfx name="tick" at={SIMPLE_START} volume={0.25} />
    <Sfx name="click" at={SIMPLE_END + 2} volume={0.45} />
    {/* the riser ends 6 frames before the payoff hit, and the music drops out under it */}
    <Sfx name="riser" at={RED_END - 6 - 72} volume={0.45} />
    <Sfx name="whoosh" at={RESCALE_AT} volume={0.35} />
    <Sfx name="impact" at={RED_END} volume={0.7} />
    <Sfx name="sub-drop" at={RED_END} volume={0.55} />
    <Sfx name="whoosh-short" at={NOTE_IN} volume={0.4} />
    <Sfx name="impact" at={APPROX_AT} volume={0.45} />
    <Sfx name="click" at={APPROX_AT} volume={0.4} />
    {/* early */}
    <Sfx name="whoosh" at={EARLY - 3} volume={0.4} />
    <Sfx name="swish-reverse" at={L.l15 + 20} volume={0.25} />
    <Sfx name="click" at={STACKS} volume={0.35} />
    <Sfx name="whoosh-short" at={L.l16 + 16} volume={0.3} />
    <Sfx name="impact" at={L.l16 + 88} volume={0.55} />
    <Sfx name="click" at={L.l16 + 88} volume={0.45} />
    {/* clock */}
    <Sfx name="whoosh" at={CLOCK - 3} volume={0.45} />
    <Sfx name="tick" at={CLOCK + 26} volume={0.35} />
    <Sfx name="tick" at={CLOCK + 44} volume={0.35} />
    <Sfx name="impact" at={CLOCK + 60} volume={0.6} />
    <Sfx name="shimmer" at={END + 2} volume={0.3} />
  </>
);
