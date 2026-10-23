import { createContext, useContext } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease } from "../kit/motion";
import { Sfx } from "../kit/Sfx";

// Explainer: why you can't stop scrolling. Your feed drawn as a blueprint of an isometric "attention machine".
// Design system: Blueprint. Music: pulse-minimal-120 (120 BPM → one beat = 15 frames). Every VO line and cut is on a beat.
// Facts: variable-ratio reinforcement (Ferster & Skinner 1957; the schedule slot machines use); infinite scroll,
// Aza Raskin, 2006. Badges and autoplay are shown as design mechanics only. The schedule chart is labelled illustrative.
const S = systems.blueprint;
const P = S.palette;
const T = S.type;
const E = ease.of(S);
const BG = P.bg;
const SURF = P.surface;
const INK = P.ink;
const MUTED = P.muted;
const ACC = P.accent;

const DISPLAY: React.CSSProperties = {
  fontFamily: T.display,
  fontWeight: 700,
  letterSpacing: `${T.displayTracking}em`,
  textTransform: "uppercase",
  lineHeight: 0.92,
  color: INK,
};
const MONO: React.CSSProperties = { fontFamily: T.mono, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: INK };

const beat = (n: number) => n * 15;

// Narration line starts (absolute frames, all on beats). Durations from public/voice/WhyYouCantStopScrolling/timings.json.
const L = {
  l01: 4, l02: beat(4), l03: beat(12), l04: beat(15), l05: beat(21), l06: beat(25), l07: beat(29), l08: beat(34), l09: beat(38),
  l10: beat(45), l11: beat(52), l12: beat(55), l13: beat(60), l14: beat(63), l15: beat(68), l16: beat(73), l17: beat(78), l18: beat(84),
} as const;
const LINE_FRAMES: Record<keyof typeof L, number> = {
  l01: 44, l02: 55, l03: 33, l04: 72, l05: 51, l06: 48, l07: 60, l08: 43, l09: 86, l10: 86, l11: 29, l12: 63, l13: 34, l14: 57,
  l15: 58, l16: 68, l17: 70, l18: 51,
};

// Shot boundaries
const OPEN = 0;
const REWARD = beat(12); // 180
const OKS = beat(15); // 225
const WHICH = beat(21); // 315
const VARIABLE = beat(25); // 375
const SLOT = beat(29); // 435
const NOBOTTOM = beat(34); // 510
const Y2006 = beat(38); // 570
const CUE = beat(45); // 675
const BADGE = beat(52); // 780
const BADGE_CU = beat(55); // 825
const AUTO = beat(60); // 900
const DIAL = beat(63); // 945
const DESIGN = beat(68); // 1020
const SWITCH = beat(84); // 1260
const REPRISE = beat(90); // 1350
const END = beat(96); // 1440
export const WHY_YOU_CANT_STOP_SCROLLING_DURATION = END + END_CARD_FRAMES; // 1500 = 50s

const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const lin = (t: number) => t;

// ─── Shot plumbing ───────────────────────────────────────────────────────────────────────────

const ShotStart = createContext(0);
const useF = () => useCurrentFrame() + useContext(ShotStart);

type Enter = { kind: "cut" } | { kind: "wipe" } | { kind: "circle"; cx: number; cy: number; r0: number };

/** A shot lives from `at` to `until` (+ `tail` frames so the next shot can transition over it). */
const Shot: React.FC<{ at: number; until: number; tail?: number; enter?: Enter; children: React.ReactNode }> = ({
  at,
  until,
  tail = 0,
  enter = { kind: "cut" },
  children,
}) => (
  <Sequence from={at} durationInFrames={until - at + tail}>
    <ShotStart.Provider value={at}>
      <Entrance enter={enter}>{children}</Entrance>
    </ShotStart.Provider>
  </Sequence>
);

/** Blueprint transitions: a ruler edge wiping down, or a detail circle opening up. */
const Entrance: React.FC<{ enter: Enter; children: React.ReactNode }> = ({ enter, children }) => {
  const lf = useCurrentFrame();
  if (enter.kind === "circle") {
    const r = interpolate(lf, [0, 12], [enter.r0, 1500], { ...clamp, easing: E });
    return (
      <>
        <AbsoluteFill style={{ clipPath: `circle(${r}px at ${enter.cx}px ${enter.cy}px)` }}>{children}</AbsoluteFill>
        {lf < 12 && (
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <circle cx={enter.cx} cy={enter.cy} r={r} fill="none" stroke={INK} strokeWidth={4} strokeDasharray="18 12" />
          </svg>
        )}
      </>
    );
  }
  if (enter.kind === "wipe") {
    const p = interpolate(lf, [0, 10], [0, 1], { ...clamp, easing: E });
    const y = p * 1960;
    return (
      <>
        <AbsoluteFill style={{ clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` }}>{children}</AbsoluteFill>
        {p < 1 && <Ruler y={y} />}
      </>
    );
  }
  return <>{children}</>;
};

/** A drafting-ruler edge: a hairline with mm ticks. */
const Ruler: React.FC<{ y: number }> = ({ y }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <rect x={0} y={y - 3} width={1080} height={6} fill={INK} />
    {Array.from({ length: 31 }, (_, i) => (
      <rect key={i} x={i * 36} y={y - (i % 5 === 0 ? 30 : 16)} width={3} height={i % 5 === 0 ? 30 : 16} fill={INK} />
    ))}
  </svg>
);

// ─── Paper ───────────────────────────────────────────────────────────────────────────────────

/** Blueprint grid. Scale and offset follow the camera so the paper moves with the drawing. */
const Grid: React.FC<{ s?: number; ox?: number; oy?: number }> = ({ s = 1, ox = 0, oy = 0 }) => {
  const minor = 36 * s;
  const major = 180 * s;
  return (
    <AbsoluteFill
      style={{
        background: BG,
        backgroundImage: [
          `linear-gradient(${INK}17 2px, transparent 2px)`,
          `linear-gradient(90deg, ${INK}17 2px, transparent 2px)`,
          `linear-gradient(${INK}0B 1px, transparent 1px)`,
          `linear-gradient(90deg, ${INK}0B 1px, transparent 1px)`,
        ].join(","),
        backgroundSize: `${major}px ${major}px, ${major}px ${major}px, ${minor}px ${minor}px, ${minor}px ${minor}px`,
        backgroundPosition: `${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px`,
      }}
    />
  );
};

/** Grid that follows an iso camera. */
const IsoGrid: React.FC<{ I: Iso }> = ({ I }) => <Grid s={I.u / 50} ox={I.ox} oy={I.oy} />;

/** Sheet border with corner registration ticks. Constant across cuts. */
const SheetFrame: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <rect x={36} y={36} width={1008} height={1848} fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={2} />
    {[
      [36, 36],
      [1044, 36],
      [36, 1884],
      [1044, 1884],
    ].map(([x, y], i) => (
      <g key={i} stroke={INK} strokeWidth={3} strokeOpacity={0.7}>
        <line x1={x - 18} x2={x + 18} y1={y} y2={y} />
        <line x1={x} x2={x} y1={y - 18} y2={y + 18} />
      </g>
    ))}
  </svg>
);

// ─── Isometric projection (the camera IS the projection, so strokes stay crisp) ─────────────

type V3 = [number, number, number];
type Iso = { ox: number; oy: number; u: number };
const C30 = Math.cos(Math.PI / 6);
const pr = (I: Iso, x: number, y: number, z: number): [number, number] => [I.ox + (x - y) * C30 * I.u, I.oy + (x + y) * 0.5 * I.u - z * I.u];
const prv = (I: Iso, p: V3) => pr(I, p[0], p[1], p[2]);
const path3 = (I: Iso, ps: V3[], close = false) =>
  ps
    .map((p, i) => {
      const [x, y] = prv(I, p);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ") + (close ? " Z" : "");
const lerpIso = (a: Iso, b: Iso, t: number): Iso => ({ ox: a.ox + (b.ox - a.ox) * t, oy: a.oy + (b.oy - a.oy) * t, u: a.u + (b.u - a.u) * t });

/** SVG transform that maps a flat 2D drawing (1 unit = 1 world unit) onto a plane in the iso world. */
const plane = (I: Iso, o: V3, ua: V3, va: V3) => {
  const d = (v: V3) => [(v[0] - v[1]) * C30 * I.u, (v[0] + v[1]) * 0.5 * I.u - v[2] * I.u];
  const [a, b] = d(ua);
  const [c, dd] = d(va);
  const [e, ff] = prv(I, o);
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${dd.toFixed(4)} ${e.toFixed(2)} ${ff.toFixed(2)})`;
};
/** Top face plane at height z: local x → +x, local y → +y. */
const TOP = (I: Iso, x0: number, y0: number, z: number) => plane(I, [x0, y0, z], [1, 0, 0], [0, 1, 0]);
/** Front (+y-facing) plane: local x → +x, local y → down. */
const FRONT = (I: Iso, x0: number, y: number, z0: number) => plane(I, [x0, y, z0], [1, 0, 0], [0, 0, -1]);

const NS = { vectorEffect: "non-scaling-stroke" as const };

/** A drafted block: faces fill in after its edges draw on (one continuous stroke). */
const Box: React.FC<{ I: Iso; o: V3; s: V3; draw?: number; tone?: "paper" | "accent"; sw?: number }> = ({ I, o, s, draw = 1, tone = "paper", sw = 3 }) => {
  if (draw <= 0) return null;
  const [x, y, z] = o;
  const [w, d, h] = s;
  const T0: V3 = [x, y, z + h];
  const T1: V3 = [x + w, y, z + h];
  const T2: V3 = [x + w, y + d, z + h];
  const T3: V3 = [x, y + d, z + h];
  const B1: V3 = [x + w, y, z];
  const B2: V3 = [x + w, y + d, z];
  const B3: V3 = [x, y + d, z];
  const fo = m(draw, 0.4, 1, 0, 1, lin);
  const base = tone === "accent" ? ACC : SURF;
  // hatch lines on the right (+x) face, in face coordinates (u along -y from the front corner, v down)
  const hatch: string[] = [];
  if (tone === "paper") {
    const sp = 0.32;
    for (let c = -h + sp; c < d; c += sp) {
      const v1 = Math.max(0, -c);
      const v2 = Math.min(h, d - c);
      if (v2 <= v1) continue;
      const a = prv(I, [x + w, y + d - (c + v1), z + h - v1]);
      const b = prv(I, [x + w, y + d - (c + v2), z + h - v2]);
      hatch.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }
  }
  return (
    <g>
      <g opacity={fo}>
        <path d={path3(I, [B3, B2, T2, T3], true)} fill={base} />
        <path d={path3(I, [B3, B2, T2, T3], true)} fill={BG} opacity={0.3} />
        <path d={path3(I, [B1, B2, T2, T1], true)} fill={base} />
        <path d={path3(I, [B1, B2, T2, T1], true)} fill={BG} opacity={0.6} />
        {hatch.length > 0 && <path d={hatch.join(" ")} stroke={INK} strokeOpacity={0.2} strokeWidth={2} />}
        <path d={path3(I, [T0, T1, T2, T3], true)} fill={base} />
      </g>
      <path
        d={path3(I, [T1, T0, T3, T2, T1, B1, B2, B3, T3, T2, B2])}
        fill="none"
        stroke={INK}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </g>
  );
};

// ─── Annotation primitives ───────────────────────────────────────────────────────────────────

const monoW = (text: string, size: number) => text.length * size * 0.66;

/** Callout: dot on the anchor, a leader line to an elbow, a shelf, and a typed label. */
const Callout: React.FC<{
  f: number;
  at: number;
  a: [number, number];
  e: [number, number];
  text: string;
  side?: "left" | "right";
  size?: number;
  strike?: number;
}> = ({ f, at, a, e, text, side = "right", size = 44, strike = 0 }) => {
  if (f < at) return null;
  const p = m(f, at, at + 8);
  const n = Math.round(text.length * m(f, at + 4, at + 14, 0, 1, lin));
  const tw = monoW(text, size) + 16;
  const sx = side === "right" ? e[0] + tw : e[0] - tw;
  const dot = m(f, at, at + 5);
  return (
    <g>
      <circle cx={a[0]} cy={a[1]} r={8 * dot} fill={INK} />
      <circle cx={a[0]} cy={a[1]} r={17 * dot} fill="none" stroke={INK} strokeWidth={2} />
      <path
        d={`M${a[0]} ${a[1]} L${e[0]} ${e[1]} L${sx} ${e[1]}`}
        fill="none"
        stroke={INK}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
      <text
        x={side === "right" ? e[0] + 8 : sx + 8}
        y={e[1] - 16}
        fontFamily={T.mono}
        fontWeight={600}
        fontSize={size}
        letterSpacing="0.06em"
        fill={INK}
      >
        {text.slice(0, n).toUpperCase()}
      </text>
      {strike > 0 && (
        <line
          x1={side === "right" ? e[0] : sx}
          x2={(side === "right" ? e[0] : sx) + tw * strike}
          y1={e[1] - 16 - size * 0.34}
          y2={e[1] - 16 - size * 0.34}
          stroke={ACC}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

/** Arrowhead at `tip` pointing along (dx, dy). */
const arrow = (tip: [number, number], dx: number, dy: number, size = 24) => {
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  return `M${tip[0]} ${tip[1]} L${bx - uy * size * 0.4} ${by + ux * size * 0.4} L${bx + uy * size * 0.4} ${by - ux * size * 0.4} Z`;
};

/** Dimension line from a to b with extension ticks; draws from a. `open` leaves the far end without an arrow. */
const Dim: React.FC<{ a: [number, number]; b: [number, number]; p: number; color?: string; open?: boolean; ext?: number }> = ({
  a,
  b,
  p,
  color = INK,
  open = false,
  ext = 26,
}) => {
  if (p <= 0) return null;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  const nx = -dy / l;
  const ny = dx / l;
  const c: [number, number] = [a[0] + dx * p, a[1] + dy * p];
  return (
    <g>
      <line x1={a[0] - nx * ext} y1={a[1] - ny * ext} x2={a[0] + nx * ext} y2={a[1] + ny * ext} stroke={color} strokeWidth={3} />
      <line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke={color} strokeWidth={3} />
      <path d={arrow(a, -dx, -dy)} fill={color} />
      {(!open || p < 1) && p > 0.05 && <path d={arrow(c, dx, dy)} fill={color} />}
      {!open && p >= 1 && <line x1={b[0] - nx * ext} y1={b[1] - ny * ext} x2={b[0] + nx * ext} y2={b[1] + ny * ext} stroke={color} strokeWidth={3} />}
    </g>
  );
};

/** Revision cloud (scalloped outline): dashed ink, revealed by a drawn-on mask. */
const RevCloud: React.FC<{ id: string; cx: number; cy: number; rx: number; ry: number; p: number; n?: number }> = ({ id, cx, cy, rx, ry, p, n = 16 }) => {
  if (p <= 0) return null;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry];
  });
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const r = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * 0.56;
    d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={14} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
        </mask>
      </defs>
      <path d={d} fill="none" stroke={INK} strokeWidth={4} strokeDasharray="14 9" strokeLinecap="round" mask={`url(#${id})`} />
    </g>
  );
};

/** Revision delta: triangle with a letter. */
const Delta: React.FC<{ x: number; y: number; p: number; size?: number; letter?: string }> = ({ x, y, p, size = 76, letter = "B" }) => {
  if (p <= 0) return null;
  const h = size * 0.87;
  return (
    <g transform={`translate(${x} ${y}) scale(${0.6 + 0.4 * p})`} opacity={Math.min(1, p * 2)}>
      <path d={`M0 ${-h * 0.62} L${size / 2} ${h * 0.38} L${-size / 2} ${h * 0.38} Z`} fill={BG} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <text x={0} y={h * 0.3} textAnchor="middle" fontFamily={T.display} fontWeight={700} fontSize={size * 0.52} fill={INK}>
        {letter}
      </text>
    </g>
  );
};

/** Lemniscate (∞), drawn on. */
const Infinity8: React.FC<{ cx: number; cy: number; a: number; p: number; color?: string; w?: number }> = ({ cx, cy, a, p, color = INK, w = 22 }) => {
  if (p <= 0) return null;
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const s = Math.sin(t);
    const k = 1 + s * s;
    pts.push(`${i ? "L" : "M"}${(cx + (a * Math.cos(t)) / k).toFixed(1)} ${(cy + (a * Math.sin(t) * Math.cos(t)) / k).toFixed(1)}`);
  }
  return (
    <path d={pts.join(" ")} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  );
};

/** Display line that rises from behind a mask (and can leave upward). */
const Rise: React.FC<{ f: number; at: number; dur?: number; out?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  f,
  at,
  dur = 9,
  out,
  children,
  style,
}) => {
  const p = m(f, at, at + dur);
  const q = out !== undefined ? m(f, out, out + 7) : 0;
  return (
    <div style={{ overflow: "hidden", padding: "0.1em 0.04em 0.08em", margin: "-0.1em -0.04em -0.08em", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * 112 - q * 112}%)` }}>{children}</div>
    </div>
  );
};

/** Section opener: "0n / 04" with a hairline that draws to the margin, then the big word. */
const Head: React.FC<{ f: number; at: number; num: string; lines: string[]; size?: number; top?: number }> = ({ f, at, num, lines, size = 200, top = 250 }) => {
  const rule = m(f, at - 3, at + 12);
  return (
    <div style={{ position: "absolute", left: 80, top, width: 920 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ ...MONO, fontSize: 44, color: MUTED, whiteSpace: "nowrap" }}>{num}</div>
        <div style={{ height: 3, background: INK, width: `${rule * 100}%`, opacity: 0.8 }} />
      </div>
      <div style={{ ...DISPLAY, fontSize: size, marginTop: 28 }}>
        {lines.map((l, i) => (
          <Rise key={l} f={f} at={at - 3 + i * 3}>
            {l}
          </Rise>
        ))}
      </div>
    </div>
  );
};

// ─── Feed cards ──────────────────────────────────────────────────────────────────────────────

/** Which cards in the endless feed are the occasional great one (irregular on purpose). */
const GREAT = new Set([-3, 3, 5, 12, 20, 23, 30, 39, 43]);
const V = 0.11; // feed speed, world units per frame
const FEED_PITCH = 3.6;

/** Feed scroll position at frame f; optional linear braking between stop[0] and stop[1]. */
const scrollAt = (f: number, stop?: [number, number]) => {
  if (!stop || f <= stop[0]) return f * V;
  const [a, b] = stop;
  const D = b - a;
  const t = Math.min(f, b) - a;
  return a * V + V * (t - (t * t) / (2 * D));
};

/** A post card in local units (w × h): image placeholder (box with an X), two text bars. */
const CardFace: React.FC<{ w: number; h: number; great?: boolean; label?: string; labelSize?: number }> = ({ w, h, great = false, label, labelSize = 1 }) => {
  const fill = great ? ACC : SURF;
  const line = great ? BG : MUTED;
  const ih = label ? h * 0.48 : h * 0.56;
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} rx={0.22} fill={fill} stroke={INK} strokeWidth={3} {...NS} />
      <rect x={0.3} y={0.3} width={w - 0.6} height={ih} fill={great ? ACC : BG} stroke={line} strokeWidth={2} {...NS} />
      <path d={`M0.3 0.3 L${w - 0.3} ${0.3 + ih} M${w - 0.3} 0.3 L0.3 ${0.3 + ih}`} stroke={line} strokeWidth={2} {...NS} />
      {label ? (
        <text
          x={w / 2}
          y={0.3 + ih + (h - 0.3 - ih) * 0.5 + labelSize * 0.36}
          textAnchor="middle"
          fontFamily={T.display}
          fontWeight={700}
          fontSize={labelSize}
          letterSpacing="-0.02em"
          fill={great ? BG : INK}
        >
          {label}
        </text>
      ) : (
        <>
          <rect x={0.3} y={0.3 + ih + 0.32} width={w * 0.62} height={0.2} fill={line} />
          <rect x={0.3} y={0.3 + ih + 0.72} width={w * 0.38} height={0.2} fill={line} />
        </>
      )}
    </g>
  );
};

/** The endless feed: cards flowing along -y on the plane z, entering at yMax, clipped at yMin. */
const Feed: React.FC<{ I: Iso; id: string; s: number; yMax: number; yMin?: number; z?: number; x0?: number; w?: number; h?: number }> = ({
  I,
  id,
  s,
  yMax,
  yMin = -90,
  z = 0.5,
  x0 = 0.5,
  w = 5,
  h = 3.1,
}) => {
  const nLo = Math.floor((s - (yMax - yMin)) / FEED_PITCH) - 1;
  const nHi = Math.ceil(s / FEED_PITCH) + 1;
  const tf = TOP(I, x0, 0, z);
  const cards: React.ReactNode[] = [];
  for (let n = nLo; n <= nHi; n++) {
    const y = yMax - h + n * FEED_PITCH - s;
    if (y > yMax || y + h < yMin) continue;
    cards.push(
      <g key={n} transform={`translate(0 ${y})`}>
        <CardFace w={w} h={h} great={GREAT.has(n)} />
      </g>,
    );
  }
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={-0.6} y={yMin} width={w + 1.2} height={yMax - yMin} transform={tf} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <g transform={tf}>{cards}</g>
      </g>
    </g>
  );
};

/** Dashed rails that carry the feed beyond the phone (out to "infinity"). */
const Rails: React.FC<{ I: Iso; from: number; to: number; z?: number; x0?: number; w?: number; p?: number }> = ({ I, from, to, z = 0.5, x0 = 0.25, w = 5.5, p = 1 }) => {
  if (p <= 0) return null;
  const end = from + (to - from) * p;
  return (
    <g stroke={INK} strokeWidth={3} strokeDasharray="14 12" strokeOpacity={0.7}>
      {[x0, x0 + w].map((x) => {
        const a = pr(I, x, from, z);
        const b = pr(I, x, end, z);
        return <line key={x} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
      })}
    </g>
  );
};

// ─── Machine parts ───────────────────────────────────────────────────────────────────────────

/** The phone: a slab 6 × 11 × 0.5 with a screen border on top. */
const Phone: React.FC<{ I: Iso; o?: V3; draw?: number }> = ({ I, o = [0, 0, 0], draw = 1 }) => (
  <g>
    <Box I={I} o={o} s={[6, 11, 0.5]} draw={draw} />
    {draw > 0.6 && (
      <g transform={TOP(I, o[0], o[1], o[2] + 0.5)} opacity={m(draw, 0.6, 1, 0, 1, lin)}>
        <rect x={0.25} y={0.55} width={5.5} height={9.9} rx={0.2} fill="none" stroke={MUTED} strokeWidth={2} {...NS} />
        <rect x={2.2} y={0.18} width={1.6} height={0.16} rx={0.08} fill={MUTED} />
      </g>
    )}
  </g>
);

const REEL_GAP = 1.25;
/** Reel symbol k: a mini post; every 5th is the great one. */
const reelSymbol = (k: number) => ((k % 5) + 5) % 5 === 0;

/** Reward drum (a slot-style housing) 6 × 4 × 5.5 at o. Reels on the front face, lever on the right face. */
const Drum: React.FC<{ I: Iso; o: V3; draw?: number; spin?: [number, number, number]; lever?: number; id: string }> = ({
  I,
  o,
  draw = 1,
  spin = [0.4, 1.7, 3.2],
  lever = 0,
  id,
}) => {
  if (draw <= 0) return null;
  const [x, y, z] = o;
  const H = 5.5;
  const front = FRONT(I, x, y + 4, z + H);
  const inner = m(draw, 0.7, 1, 0, 1, lin);
  // lever: pivot on the right face, swings toward the viewer (+y) and down
  const th = lever * 1.75;
  const piv: V3 = [x + 6.25, y + 1.6, z + 3.2];
  const tip: V3 = [x + 6.25, y + 1.6 + 3.1 * Math.sin(th), z + 3.2 + 3.1 * Math.cos(th)];
  const pa = prv(I, piv);
  const pb = prv(I, tip);
  return (
    <g>
      <Box I={I} o={o} s={[6, 4, H]} draw={draw} />
      {inner > 0 && (
        <g opacity={inner}>
          <g transform={front}>
            <rect x={0.4} y={0.45} width={5.2} height={0.55} fill={BG} stroke={INK} strokeWidth={2} {...NS} />
            {[0, 1, 2].map((r) => (
              <g key={r}>
                <defs>
                  <clipPath id={`${id}-r${r}`}>
                    <rect x={0.45 + r * 1.75} y={1.4} width={1.55} height={2.7} />
                  </clipPath>
                </defs>
                <rect x={0.45 + r * 1.75} y={1.4} width={1.55} height={2.7} fill={BG} />
                <g clipPath={`url(#${id}-r${r})`}>
                  {Array.from({ length: 6 }, (_, j) => {
                    const k = Math.floor(spin[r]) - 2 + j;
                    const v = 2.75 + (k - spin[r]) * REEL_GAP - 0.45;
                    return (
                      <g key={k} transform={`translate(${0.6 + r * 1.75} ${v})`}>
                        <rect width={1.25} height={0.9} rx={0.1} fill={reelSymbol(k) ? ACC : SURF} stroke={INK} strokeWidth={2} {...NS} />
                        {!reelSymbol(k) && <path d="M0.15 0.15 L1.1 0.75 M1.1 0.15 L0.15 0.75" stroke={MUTED} strokeWidth={2} {...NS} />}
                      </g>
                    );
                  })}
                </g>
                <rect x={0.45 + r * 1.75} y={1.4} width={1.55} height={2.7} fill="none" stroke={INK} strokeWidth={3} {...NS} />
              </g>
            ))}
            <line x1={0.3} x2={5.7} y1={2.75} y2={2.75} stroke={ACC} strokeWidth={3} strokeDasharray="8 8" {...NS} />
            <rect x={0.4} y={4.6} width={5.2} height={0.5} fill="none" stroke={MUTED} strokeWidth={2} {...NS} />
          </g>
          <line x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={INK} strokeWidth={Math.max(6, I.u * 0.16)} strokeLinecap="round" />
          <circle cx={pa[0]} cy={pa[1]} r={I.u * 0.22} fill={BG} stroke={INK} strokeWidth={3} />
          <circle cx={pb[0]} cy={pb[1]} r={I.u * 0.38} fill={INK} />
        </g>
      )}
    </g>
  );
};

/** App block with a badge. Badge sits on the top-right corner, facing camera. */
const AppBlock: React.FC<{ I: Iso; o: V3; size?: number; draw?: number; count?: string; badge?: number; off?: number; pop?: number }> = ({
  I,
  o,
  size = 4.5,
  draw = 1,
  count = "1",
  badge = 1,
  off = 0,
  pop = 0,
}) => {
  if (draw <= 0) return null;
  const [x, y, z] = o;
  const h = 1.1;
  const inner = m(draw, 0.7, 1, 0, 1, lin);
  const c = pr(I, x + size, y + 0.1, z + h + 0.9);
  const r = I.u * 0.95 * (1 + pop * 0.18) * Math.min(1, badge * 1.2);
  return (
    <g>
      <Box I={I} o={o} s={[size, size, h]} draw={draw} />
      {inner > 0 && (
        <g transform={TOP(I, x, y, z + h)} opacity={inner}>
          <rect x={size * 0.2} y={size * 0.3} width={size * 0.5} height={size * 0.5} rx={0.18} fill={BG} stroke={INK} strokeWidth={3} {...NS} />
          <rect x={size * 0.3} y={size * 0.2} width={size * 0.5} height={size * 0.5} rx={0.18} fill={SURF} stroke={INK} strokeWidth={3} {...NS} />
        </g>
      )}
      {badge > 0 && (
        <g>
          <line x1={c[0]} y1={c[1]} x2={pr(I, x + size, y + 0.1, z + h)[0]} y2={pr(I, x + size, y + 0.1, z + h)[1]} stroke={INK} strokeWidth={2} strokeDasharray="6 6" />
          <circle cx={c[0]} cy={c[1]} r={r} fill={off > 0 ? BG : ACC} stroke={off > 0 ? ACC : INK} strokeWidth={off > 0 ? 6 : 3} />
          <text
            x={c[0]}
            y={c[1] + r * (off > 0 ? 0.2 : 0.36)}
            textAnchor="middle"
            fontFamily={off > 0 ? T.mono : T.display}
            fontWeight={700}
            fontSize={off > 0 ? r * 0.62 : r * (count.length > 1 ? 0.9 : 1.05)}
            letterSpacing={off > 0 ? "0.04em" : "-0.03em"}
            fill={off > 0 ? INK : BG}
          >
            {off > 0 ? "OFF" : count}
          </text>
        </g>
      )}
    </g>
  );
};

const CHUTE_H = 1.4;
/** Autoplay feeder: a block 5 × 4.6 × 1.4 behind the phone's bottom end, a play mark pointing into the phone. */
const Chute: React.FC<{ I: Iso; o: V3; draw?: number }> = ({ I, o, draw = 1 }) => {
  if (draw <= 0) return null;
  const [x, y, z] = o;
  return (
    <g>
      <Box I={I} o={o} s={[5, 4.6, CHUTE_H]} draw={draw} />
      <g transform={TOP(I, x, y, z + CHUTE_H)} opacity={m(draw, 0.7, 1, 0, 1, lin)}>
        <path d="M2.5 0.7 L4.0 3.5 L1.0 3.5 Z" fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" {...NS} />
        <path d="M2.5 1.6 L3.3 3.0 L1.7 3.0 Z" fill={INK} />
      </g>
    </g>
  );
};

/** The off switch: base 8 × 3.6 × 1 with a sliding lever block. t = 0 ON, 1 OFF. */
const Toggle: React.FC<{ I: Iso; o: V3; t: number; draw?: number; scale?: number; labels?: boolean }> = ({ I, o, t, draw = 1, scale = 1, labels = true }) => {
  if (draw <= 0) return null;
  const [x, y, z] = o;
  const W = 8 * scale;
  const D = 3.6 * scale;
  const H = 1 * scale;
  const lw = 2.6 * scale;
  const lx = x + 0.6 * scale + t * (W - 1.2 * scale - lw);
  const inner = m(draw, 0.7, 1, 0, 1, lin);
  return (
    <g>
      <Box I={I} o={o} s={[W, D, H]} draw={draw} />
      {inner > 0 && (
        <g opacity={inner}>
          <g transform={TOP(I, x, y, z + H)}>
            <rect x={0.6 * scale} y={D * 0.18} width={W - 1.2 * scale} height={D * 0.5} rx={0.2 * scale} fill={BG} stroke={INK} strokeWidth={3} {...NS} />
            {labels && (
              <>
                <text x={0.7 * scale} y={D * 0.93} fontFamily={T.mono} fontWeight={600} fontSize={0.62 * scale} letterSpacing="0.06em" fill={t < 0.5 ? INK : MUTED}>
                  ON
                </text>
                <text x={W - 0.7 * scale} y={D * 0.93} textAnchor="end" fontFamily={T.mono} fontWeight={600} fontSize={0.62 * scale} letterSpacing="0.06em" fill={t >= 0.5 ? INK : MUTED}>
                  OFF
                </text>
              </>
            )}
          </g>
          <Box I={I} o={[lx, y + D * 0.12, z + H]} s={[lw, D * 0.62, 1.1 * scale]} tone="accent" />
        </g>
      )}
    </g>
  );
};

// ─── The machine (overview) ──────────────────────────────────────────────────────────────────

const DRUM_O: V3 = [-10, 1, 0];
const BADGE_O: V3 = [7.5, 2.5, 0];
const CHUTE_O: V3 = [0.5, 11.5, 0];
const SWITCH_O: V3 = [8.2, 8.2, 0];
const END_Y = -4.5;

type MachineState = {
  s: number;
  drum: number;
  badge: number;
  chute: number;
  phone?: number;
  rails?: number;
  spin?: [number, number, number];
  lever?: number;
  count?: string;
  badgeOff?: number;
  endBar?: number;
  toggle?: number;
  toggleT?: number;
};

const Machine: React.FC<{ I: Iso; st: MachineState; id: string }> = ({ I, st, id }) => {
  const yMax = 10.45;
  const yMin = (st.endBar ?? 0) > 0 ? END_Y : -90;
  const eb = st.endBar ?? 0;
  const ea = pr(I, -0.2, END_Y, 0.5);
  const ebb = pr(I, 6.2, END_Y, 0.5);
  return (
    <g>
      <Drum I={I} o={DRUM_O} draw={st.drum} spin={st.spin} lever={st.lever} id={`${id}-drum`} />
      <Rails I={I} from={0} to={eb > 0 ? END_Y : -60} p={st.rails ?? 1} />
      <Phone I={I} draw={st.phone ?? 1} />
      <Chute I={I} o={CHUTE_O} draw={st.chute} />
      <Feed I={I} id={`${id}-feed`} s={st.s} yMax={yMax} yMin={yMin} />
      {eb > 0 && (
        <line
          x1={ea[0]}
          y1={ea[1]}
          x2={ea[0] + (ebb[0] - ea[0]) * eb}
          y2={ea[1] + (ebb[1] - ea[1]) * eb}
          stroke={ACC}
          strokeWidth={Math.max(10, I.u * 0.3)}
          strokeLinecap="round"
        />
      )}
      <AppBlock I={I} o={BADGE_O} draw={st.badge} count={st.count ?? "3"} badge={st.badge >= 1 ? 1 : 0} off={st.badgeOff ?? 0} />
      <Toggle I={I} o={SWITCH_O} t={st.toggleT ?? 0} draw={st.toggle ?? 0} scale={0.62} labels={false} />
    </g>
  );
};

// ─── Composition ─────────────────────────────────────────────────────────────────────────────

export const WhyYouCantStopScrolling: React.FC = () => (
  <AbsoluteFill style={{ background: BG, fontFamily: T.body, color: INK }}>
    <Shot at={OPEN} until={REWARD} tail={14}>
      <Opening />
    </Shot>
    <Shot at={REWARD} until={OKS} enter={{ kind: "circle", cx: DRUM_CIRCLE[0], cy: DRUM_CIRCLE[1], r0: DRUM_CIRCLE[2] }}>
      <RewardIntro />
    </Shot>
    <Shot at={OKS} until={WHICH} tail={2}>
      <Cards mode="ok" />
    </Shot>
    <Shot at={WHICH} until={VARIABLE} tail={12}>
      <Cards mode="which" />
    </Shot>
    <Shot at={VARIABLE} until={SLOT} enter={{ kind: "wipe" }}>
      <Schedule />
    </Shot>
    <Shot at={SLOT} until={NOBOTTOM} tail={12}>
      <SlotPull />
    </Shot>
    <Shot at={NOBOTTOM} until={Y2006} enter={{ kind: "wipe" }}>
      <NoBottom />
    </Shot>
    <Shot at={Y2006} until={CUE} tail={12}>
      <Year2006 />
    </Shot>
    <Shot at={CUE} until={BADGE} tail={12} enter={{ kind: "wipe" }}>
      <StoppingCue />
    </Shot>
    <Shot at={BADGE} until={BADGE_CU} enter={{ kind: "wipe" }}>
      <Badge />
    </Shot>
    <Shot at={BADGE_CU} until={AUTO} tail={12}>
      <Badge />
    </Shot>
    <Shot at={AUTO} until={DIAL} enter={{ kind: "wipe" }}>
      <Autoplay />
    </Shot>
    <Shot at={DIAL} until={DESIGN}>
      <Dial />
    </Shot>
    <Shot at={DESIGN} until={SWITCH} tail={14}>
      <Revision />
    </Shot>
    <Shot at={SWITCH} until={REPRISE} enter={{ kind: "circle", cx: SWITCH_CIRCLE[0], cy: SWITCH_CIRCLE[1], r0: SWITCH_CIRCLE[2] }}>
      <OffSwitch />
    </Shot>
    <Shot at={REPRISE} until={END}>
      <Reprise />
    </Shot>
    <Sequence from={END}>
      <EndCard system={S} motif={<EndMotif />} />
    </Sequence>
    <SheetFrame />
    <Narration />
    <SoundDesign />
  </AbsoluteFill>
);

// ─── 1. Hook → the machine ──────────────────────────────────────────────────────────────────

const I_HOOK: Iso = { ox: 560, oy: 1060, u: 54 };
const I_OV: Iso = { ox: 620, oy: 1004, u: 40 };
const PULL = [L.l02, L.l02 + 60] as const;
const DRAW_DRUM = [62, 92] as const;
const DRAW_BADGE = [72, 102] as const;
const DRAW_CHUTE = [82, 112] as const;
const LABELS = [beat(7), beat(8), beat(9), beat(10)] as const;
const RING_A = beat(10) + 10;
const drumCenterOv = () => pr(I_OV, DRUM_O[0] + 3, DRUM_O[1] + 2, 2.8);
const DRUM_CIRCLE = [drumCenterOv()[0], drumCenterOv()[1], 210] as const;

const HookHeadline: React.FC<{ f: number; out?: number; reprise?: boolean }> = ({ f, out, reprise = false }) => {
  // Word swap clipped to exactly one line box (0.92em): the old word exits up (3f), then the new one rises in.
  // Revision idiom: strike the old word in orange, hold, then it exits up and the new word rises in.
  // Both words run on ONE schedule (SWAP_AT), so no mixed message is ever on screen.
  const swap = (a: string, b: string) => {
    const strike = m(f, SWAP_AT, SWAP_AT + 4);
    const pOut = m(f, SWAP_AT + 8, SWAP_AT + 11);
    const pIn = m(f, SWAP_AT + 11, SWAP_AT + 17);
    const showB = pOut >= 1;
    return (
      <span style={{ display: "inline-block", position: "relative", height: "0.92em", overflow: "hidden", clipPath: "inset(0)", verticalAlign: "top" }}>
        <span style={{ display: "inline-block", position: "relative", visibility: showB ? "hidden" : "visible", transform: `translateY(${-pOut * 100}%)` }}>
          {showB ? b : a}
          {!showB && strike > 0 && (
            <span style={{ position: "absolute", left: "-0.03em", top: "0.42em", height: "0.09em", width: `${strike * 106}%`, background: ACC }} />
          )}
        </span>
        {showB && <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${(1 - pIn) * 100}%)` }}>{b}</span>}
      </span>
    );
  };
  return (
    <div style={{ position: "absolute", left: 80, top: 236, width: 940 }}>
      <Rise f={f} at={-20} out={out}>
        <div style={{ ...MONO, fontSize: 44, color: MUTED }}>{reprise ? "Fig. 1 — Rev. B" : "Fig. 1 — The feed"}</div>
      </Rise>
      <div style={{ ...DISPLAY, fontSize: 156, marginTop: 30 }}>
        <Rise f={f} at={-20} out={out}>
          {reprise ? swap("Why", "Now") : "Why"}{" "}
you
          {reprise && <Mark at={SWAP_AT + 14} f={f} />}
        </Rise>
        <Rise f={f} at={-20} out={out !== undefined ? out + 2 : undefined}>
          {reprise ? swap("Can't", "Can") : "Can't"}{" "}
stop
          {reprise && <Mark at={SWAP_AT + 14} f={f} />}
        </Rise>
        <Rise f={f} at={-20} out={out !== undefined ? out + 4 : undefined}>
          scrolling.
        </Rise>
      </div>
    </div>
  );
};

/** Small revision delta that pops next to a revised word. */
const Mark: React.FC<{ at: number; f: number }> = ({ at, f }) => {
  const p = m(f, at, at + 6);
  return (
    <svg width={90} height={90} style={{ position: "absolute", left: 790, top: 22, overflow: "visible" }}>
      <Delta x={45} y={48} p={p} size={70} />
    </svg>
  );
};

const Opening: React.FC = () => {
  const f = useF();
  const hookDrift = lerpIso(I_HOOK, { ...I_HOOK, u: 56, oy: 1066 }, m(f, 0, PULL[0], 0, 1, lin));
  const I = f < PULL[0] ? hookDrift : lerpIso(hookDrift, I_OV, m(f, PULL[0], PULL[1], 0, 1, ease.quintInOut));
  const Id = f > PULL[1] ? lerpIso(I_OV, { ...I_OV, u: 41, oy: 1008 }, m(f, PULL[1], REWARD, 0, 1, lin)) : I;
  const st: MachineState = {
    s: scrollAt(f),
    drum: m(f, DRAW_DRUM[0], DRAW_DRUM[1], 0, 1, lin),
    badge: m(f, DRAW_BADGE[0], DRAW_BADGE[1], 0, 1, lin),
    chute: m(f, DRAW_CHUTE[0], DRAW_CHUTE[1], 0, 1, lin),
    count: "3",
  };
  const titleIn = PULL[0] + 5;
  const stripPt = pr(Id, 3, -7, 0.5);
  const badgeTop = pr(Id, BADGE_O[0] + 2.25, BADGE_O[1] + 2.25, 1.1);
  const chuteTop = pr(Id, CHUTE_O[0] + 2.5, CHUTE_O[1] + 3.2, CHUTE_H);
  const drumFront = pr(Id, DRUM_O[0] + 1.5, DRUM_O[1] + 4, 1.2);
  const ringP = m(f, RING_A, RING_A + 10);
  return (
    <AbsoluteFill>
      <IsoGrid I={Id} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Machine I={Id} st={st} id="open" />
        {f >= LABELS[0] - 1 && (
          <>
            <Callout f={f} at={LABELS[0]} a={drumFront} e={[110, 1070]} text="01 Reward" side="right" />
            <Callout f={f} at={LABELS[1]} a={stripPt} e={[stripPt[0] - 40, 730]} text="02 No bottom" side="left" />
            <Callout f={f} at={LABELS[2]} a={badgeTop} e={[badgeTop[0] + 30, 1440]} text="03 Badge" side="left" />
            <Callout f={f} at={LABELS[3]} a={chuteTop} e={[chuteTop[0] - 40, 1480]} text="04 Autoplay" side="right" />
          </>
        )}
        {ringP > 0 && (
          <g>
            <circle
              cx={DRUM_CIRCLE[0]}
              cy={DRUM_CIRCLE[1]}
              r={DRUM_CIRCLE[2]}
              fill="none"
              stroke={INK}
              strokeWidth={4}
              strokeDasharray="18 12"
              pathLength={undefined}
              opacity={ringP}
              transform={`rotate(${-90 + ringP * 30} ${DRUM_CIRCLE[0]} ${DRUM_CIRCLE[1]})`}
            />
            <line x1={DRUM_CIRCLE[0] + DRUM_CIRCLE[2] * 0.71} y1={DRUM_CIRCLE[1] - DRUM_CIRCLE[2] * 0.71} x2={DRUM_CIRCLE[0] + DRUM_CIRCLE[2] * 0.71 + 38} y2={DRUM_CIRCLE[1] - DRUM_CIRCLE[2] * 0.71 - 38} stroke={INK} strokeWidth={3} opacity={ringP} />
            <text x={DRUM_CIRCLE[0] + DRUM_CIRCLE[2] * 0.71 + 46} y={DRUM_CIRCLE[1] - DRUM_CIRCLE[2] * 0.71 - 34} textAnchor="start" fontFamily={T.display} fontWeight={700} fontSize={64} fill={INK} opacity={ringP}>
              A
            </text>
          </g>
        )}
      </svg>
      {f < PULL[0] + 12 && <HookHeadline f={f} out={PULL[0] - 4} />}
      {f >= titleIn - 3 && (
        <div style={{ position: "absolute", left: 80, top: 236, width: 920 }}>
          <Rise f={f} at={titleIn - 3}>
            <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Fig. 2 — Assembly</div>
          </Rise>
          <div style={{ ...DISPLAY, fontSize: 132, marginTop: 26 }}>
            <Rise f={f} at={titleIn}>The attention</Rise>
            <Rise f={f} at={titleIn + 3}>machine</Rise>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── 2. Reward ───────────────────────────────────────────────────────────────────────────────

const RewardIntro: React.FC = () => {
  const f = useF();
  const I: Iso = { ox: 470 - 10 * m(f, REWARD, OKS, 0, 1, lin), oy: 1080, u: 78 + 4 * m(f, REWARD, OKS, 0, 1, lin) };
  const wob = Math.sin((f - REWARD) * 0.5) * 0.04;
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Drum I={I} o={[0, 0, 0]} id="ri" spin={[0.4 + wob, 1.7 - wob, 3.2 + wob]} lever={0.04 * m(f, REWARD + 20, REWARD + 30)} />
      </svg>
      <Head f={f} at={REWARD} num="01 / 04" lines={["Reward"]} size={210} />
    </AbsoluteFill>
  );
};

// cards standing in a row: flip up from flat on a hinge
const CARD_W = 2.8;
const CARD_H = 3.9;
const CARD_STEP = 3.3;
const OK_AT = [OKS - 8, OKS + 15, OKS + 30, beat(19)];
const Q_AT = [WHICH + 2, WHICH + 7, WHICH + 12, WHICH + 17];

const StandingCard: React.FC<{ I: Iso; x: number; flip: number; label: string; great?: boolean; tall?: number }> = ({ I, x, flip, label, great = false, tall = 1 }) => {
  if (flip <= 0) return null;
  const h = CARD_H * tall;
  const w = CARD_W * (great ? 1.12 : 1);
  const phi = (flip * Math.PI) / 2;
  const v: V3 = [0, Math.cos(phi), -Math.sin(phi)];
  const hinge: V3 = [x, 0, 0];
  const o: V3 = [hinge[0], hinge[1] - h * v[1], hinge[2] - h * v[2]];
  const shadow = path3(I, [
    [x, 0, 0],
    [x + w, 0, 0],
    [x + w + 0.5, -0.9, 0],
    [x + 0.5, -0.9, 0],
  ], true);
  return (
    <g>
      <path d={shadow} fill={BG} opacity={0.5 * flip} />
      <g transform={plane(I, o, [1, 0, 0], v)}>
        <CardFace w={w} h={h} great={great} label={label} labelSize={great ? 0.78 : 1.15} />
      </g>
    </g>
  );
};

const Cards: React.FC<{ mode: "ok" | "which" }> = ({ mode }) => {
  const f = useF();
  const which = mode === "which";
  // camera slides along the row (+x) into the unknown cards
  const slide = which ? m(f, WHICH - 2, WHICH + 14, 0, 1) : 0;
  const drift = which ? m(f, WHICH, VARIABLE, 0, 1, lin) : m(f, OKS, WHICH, 0, 1, lin);
  const I: Iso = which
    ? { ox: 95 - slide * 880 - drift * 20, oy: 950 - slide * 880 + drift * 8, u: 78 - slide * 4 + drift * 2 }
    : { ox: 110 - drift * 15, oy: 960 - drift * 10, u: 76 + drift * 2 };
  const labels = ["OK", "OK", "OK", "GREAT"];
  const greatPop = m(f, OK_AT[3], OK_AT[3] + 6);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line {...lineFrom(pr(I, -2, 0, 0), pr(I, 30, 0, 0))} stroke={INK} strokeWidth={3} strokeOpacity={0.6} />
        {labels.map((l, i) => (
          <StandingCard
            key={i}
            I={I}
            x={i * CARD_STEP}
            flip={i === 3 ? m(f, OK_AT[i] - 2, OK_AT[i] + 6) : m(f, OK_AT[i], OK_AT[i] + 8)}
            label={l}
            great={i === 3}
            tall={i === 3 ? 1 + 0.25 * greatPop : 1}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <StandingCard key={`q${i}`} I={I} x={(4 + i) * CARD_STEP + 0.6} flip={which ? m(f, Q_AT[i], Q_AT[i] + 8) : 0} label="?" />
        ))}
        {which && (
          <path
            d={swipePath(I)}
            fill="none"
            stroke={ACC}
            strokeWidth={8}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - m(f, WHICH + 20, WHICH + 34)}
          />
        )}
        {which && m(f, WHICH + 20, WHICH + 34) >= 1 && <path d={swipeHead(I)} fill={ACC} />}
      </svg>
      {!which ? (
        <div style={{ position: "absolute", left: 80, top: 250, width: 920 }}>
          <Rise f={f} at={OKS - 12}>
            <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Swipe, swipe, swipe</div>
          </Rise>
          <div style={{ ...DISPLAY, fontSize: 140, marginTop: 28 }}>
            <Rise f={f} at={OKS - 12}>Most posts</Rise>
            <Rise f={f} at={OKS - 9}>are OK.</Rise>
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 80, top: 1080, width: 920 }}>
          <div style={{ ...DISPLAY, fontSize: 210 }}>
            <Rise f={f} at={WHICH + 4}>Which</Rise>
            <Rise f={f} at={WHICH + 7}>swipe?</Rise>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const lineFrom = (a: [number, number], b: [number, number]) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
const swipePath = (I: Iso) => {
  const a = pr(I, 4 * CARD_STEP + 0.6, -1.6, 5.4);
  const b = pr(I, 7 * CARD_STEP + 2.2, -1.6, 5.4);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2 - 120;
  return `M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`;
};
const swipeHead = (I: Iso) => {
  const a = pr(I, 4 * CARD_STEP + 0.6, -1.6, 5.4);
  const b = pr(I, 7 * CARD_STEP + 2.2, -1.6, 5.4);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2 - 120;
  return arrow(b, b[0] - mx, b[1] - my, 34);
};

// fixed vs variable schedule (illustrative)
const PULLS = 14;
const FIXED_HITS = [3, 7, 11];
const VAR_HITS = [1, 2, 8, 12];
const SCH_X0 = 120;
const SCH_X1 = 960;
const SCH_PLAY = [VARIABLE + 8, VARIABLE + 50] as const;

const Schedule: React.FC = () => {
  const f = useF();
  const head = m(f, SCH_PLAY[0], SCH_PLAY[1], 0, 1, lin);
  const px = (i: number) => SCH_X0 + 30 + (i / (PULLS - 1)) * (SCH_X1 - SCH_X0 - 60);
  const headX = SCH_X0 + head * (SCH_X1 - SCH_X0);
  const k = 1 + 0.03 * m(f, VARIABLE, SLOT, 0, 1, lin);
  const rows = [
    { y: 1000, label: "Fixed: every 4th pull", hits: FIXED_HITS, accent: false },
    { y: 1330, label: "Variable: who knows", hits: VAR_HITS, accent: true },
  ];
  return (
    <AbsoluteFill>
      <Grid s={k} ox={540 - 540 * k} oy={960 - 960 * k} />
      <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: "540px 960px" }}>
        <div style={{ position: "absolute", left: 80, top: 250, width: 940 }}>
          <Rise f={f} at={VARIABLE - 3}>
            <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Reward schedule · illustrative</div>
          </Rise>
          <div style={{ ...DISPLAY, fontSize: 176, marginTop: 28 }}>
            <Rise f={f} at={VARIABLE - 3}>Variable</Rise>
            <Rise f={f} at={VARIABLE}>reward</Rise>
          </div>
        </div>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {rows.map((r, ri) => (
            <g key={ri}>
              <text x={SCH_X0} y={r.y - 150} fontFamily={T.mono} fontWeight={600} fontSize={48} letterSpacing="0.06em" fill={ri ? INK : MUTED}>
                {r.label.toUpperCase()}
              </text>
              <line x1={SCH_X0} x2={SCH_X0 + (SCH_X1 - SCH_X0) * m(f, VARIABLE + ri * 3, VARIABLE + 12 + ri * 3)} y1={r.y} y2={r.y} stroke={INK} strokeWidth={3} />
              {Array.from({ length: PULLS }, (_, i) => {
                const on = headX >= px(i);
                const hit = r.hits.includes(i);
                const pp = on ? m(f, SCH_PLAY[0] + ((px(i) - SCH_X0) / (SCH_X1 - SCH_X0)) * (SCH_PLAY[1] - SCH_PLAY[0]), SCH_PLAY[0] + ((px(i) - SCH_X0) / (SCH_X1 - SCH_X0)) * (SCH_PLAY[1] - SCH_PLAY[0]) + 5) : 0;
                return (
                  <g key={i}>
                    <line x1={px(i)} x2={px(i)} y1={r.y - 22} y2={r.y + 22} stroke={INK} strokeWidth={4} strokeOpacity={on ? 1 : 0.3} />
                    {hit && pp > 0 && (
                      <g transform={`translate(${px(i)} ${r.y - 74}) rotate(${r.accent ? 45 : 0}) scale(${0.4 + 0.6 * pp})`}>
                        <rect x={-30} y={-30} width={60} height={60} fill={r.accent ? ACC : SURF} stroke={INK} strokeWidth={3} />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
          {head > 0 && head < 1 && <line x1={headX} x2={headX} y1={820} y2={1370} stroke={ACC} strokeWidth={4} />}
          <text x={SCH_X1} y={1420} textAnchor="end" fontFamily={T.mono} fontWeight={600} fontSize={44} letterSpacing="0.06em" fill={MUTED}>
            PULLS →
          </text>
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// slot pull: the drum again, lever pulled, reels land on the great post
const PULL_AT = SLOT + 12;
const LAND = [SLOT + 31, SLOT + 38, beat(32)] as const;

const SlotPull: React.FC = () => {
  const f = useF();
  const lever = m(f, PULL_AT, PULL_AT + 5, 0, 1) - m(f, PULL_AT + 8, PULL_AT + 18, 0, 1);
  const spin = [0, 1, 2].map((r) => {
    const start = [0.4, 1.7, 3.2][r];
    const target = 25 + r * 5; // multiples of 5 are the great post
    return start + (target - start) * m(f, PULL_AT + 2, LAND[r], 0, 1, (t) => 1 - Math.pow(1 - t, 3));
  }) as [number, number, number];
  const landed = f >= LAND[2];
  const sk = landed && f < LAND[2] + 8 ? Math.sin((f - LAND[2]) * 2.6) * 7 * (1 - (f - LAND[2]) / 8) : 0;
  const I: Iso = { ox: 430 + sk, oy: 700 - 8 * m(f, SLOT, NOBOTTOM, 0, 1, lin), u: 72 + 4 * m(f, SLOT, NOBOTTOM, 0, 1, lin) };
  const c = pr(I, 3, 4, 2.6);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Drum I={I} o={[0, 0, 0]} id="sp" spin={spin} lever={lever} />
        <Callout f={f} at={LAND[2]} a={[c[0] - 40, c[1] - 30]} e={[130, 330]} text="Jackpot" side="right" size={52} />
      </svg>
      <div style={{ position: "absolute", left: 80, top: 1130, width: 920 }}>
        <Rise f={f} at={SLOT - 3}>
          <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Same trick as a</div>
        </Rise>
        <div style={{ ...DISPLAY, fontSize: 150, marginTop: 24 }}>
          <Rise f={f} at={SLOT}>Slot</Rise>
          <Rise f={f} at={SLOT + 3}>machine.</Rise>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── 3. No bottom ────────────────────────────────────────────────────────────────────────────

const INF_AT = beat(36);

const NoBottom: React.FC = () => {
  const f = useF();
  const t = m(f, NOBOTTOM, Y2006, 0, 1, lin);
  const I: Iso = { ox: 560 + 20 * t, oy: 1180 + 10 * t, u: 46 + 3 * t };
  const s = scrollAt(f);
  const a = pr(I, 7.2, 11, 0.5);
  const b = pr(I, 7.2, -40, 0.5);
  const dimP = m(f, NOBOTTOM + 6, INF_AT + 6, 0, 1, (x) => x * x);
  const inf = m(f, INF_AT, INF_AT + 14, 0, 1, ease.sineInOut);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Rails I={I} from={0} to={-60} />
        <Phone I={I} />
        <Feed I={I} id="nb" s={s} yMax={10.45} />
        <Dim a={a} b={b} p={dimP} open />
        <Infinity8 cx={800} cy={850} a={170} p={inf} w={20} />
        {inf > 0 && (
          <text x={560} y={868} textAnchor="end" fontFamily={T.mono} fontWeight={600} fontSize={56} letterSpacing="0.06em" fill={INK}>
            {"LENGTH =".slice(0, Math.round(8 * m(f, INF_AT, INF_AT + 8, 0, 1, lin)))}
          </text>
        )}
      </svg>
      <Head f={f} at={NOBOTTOM} num="02 / 04" lines={["No", "bottom"]} size={200} />
    </AbsoluteFill>
  );
};

const HIT_2006 = beat(43);

const Year2006: React.FC = () => {
  const f = useF();
  const k = 1 + 0.035 * m(f, Y2006, CUE, 0, 1, lin);
  const slam = m(f, HIT_2006, HIT_2006 + 6, 1.12, 1);
  const on = f >= HIT_2006;
  const s = scrollAt(f);
  const I: Iso = { ox: 620, oy: 1360, u: 30 };
  return (
    <AbsoluteFill>
      <Grid s={k} ox={540 - 540 * k} oy={960 - 960 * k} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Rails I={I} from={0} to={-60} />
        <Phone I={I} />
        <Feed I={I} id="y6" s={s} yMax={10.45} />
      </svg>
      <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: "540px 700px" }}>
        <div style={{ position: "absolute", left: 80, top: 250, width: 940 }}>
          <Rise f={f} at={Y2006 - 3}>
            <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Fig. 3 — Timeline</div>
          </Rise>
          <div style={{ ...DISPLAY, fontSize: 168, marginTop: 28 }}>
            <Rise f={f} at={Y2006 - 3}>Infinite</Rise>
            <Rise f={f} at={Y2006}>scroll</Rise>
          </div>
        </div>
        {f >= Y2006 && (
          <div
            style={{
              position: "absolute",
              left: 66,
              top: 690,
              ...DISPLAY,
              fontSize: 300,
              fontVariantNumeric: "tabular-nums",
              color: on ? ACC : MUTED,
              opacity: 1,
              transform: `scale(${slam})`,
              transformOrigin: "0 80%",
            }}
          >
            {on ? 2006 : Math.min(2005, Math.floor(TL.a + 11 * m(f, Y2006 + 2, HIT_2006 - 4, 0, 1, lin)))}
          </div>
        )}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {on && <Dim a={[84, 1030]} b={[1000, 1030]} p={m(f, HIT_2006 + 4, HIT_2006 + 16)} />}
          <Timeline f={f} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TL = { x0: 120, x1: 760, y: 1190, a: 1995, b: 2025 };
const tlx = (yr: number) => TL.x0 + ((yr - TL.a) / (TL.b - TL.a)) * (TL.x1 - TL.x0);

/** Drafted year axis; a playhead counts up to 2006 and lands on the slam. */
const Timeline: React.FC<{ f: number }> = ({ f }) => {
  const draw = m(f, Y2006 - 2, Y2006 + 12);
  const yr = TL.a + 11 * m(f, Y2006 + 2, HIT_2006 - 4, 0, 1, lin);
  const px = tlx(yr);
  const landed = f >= HIT_2006;
  return (
    <g>
      <line x1={TL.x0} x2={TL.x0 + (TL.x1 - TL.x0) * draw} y1={TL.y} y2={TL.y} stroke={INK} strokeWidth={3} />
      {Array.from({ length: TL.b - TL.a + 1 }, (_, i) => {
        const x = tlx(TL.a + i);
        if (x > TL.x0 + (TL.x1 - TL.x0) * draw + 0.5) return null;
        const major = (TL.a + i) % 5 === 0;
        return <line key={i} x1={x} x2={x} y1={TL.y - (major ? 22 : 12)} y2={TL.y} stroke={INK} strokeWidth={major ? 3 : 2} strokeOpacity={major ? 1 : 0.6} />;
      })}
      {[2000, 2010, 2020].map((y) => (
        <text key={y} x={tlx(y)} y={TL.y + 60} textAnchor="middle" fontFamily={T.mono} fontWeight={600} fontSize={44} fill={MUTED} opacity={draw >= (y - TL.a) / (TL.b - TL.a) ? 1 : 0}>
          {y}
        </text>
      ))}
      {f >= Y2006 + 6 && (
        <g>
          <line x1={px} x2={px} y1={TL.y - 52} y2={TL.y + 14} stroke={ACC} strokeWidth={6} />
          <text x={px} y={TL.y - 72} textAnchor="middle" fontFamily={T.mono} fontWeight={600} fontSize={44} letterSpacing="0.06em" fill={INK}>
            {landed ? "DESIGNED" : ""}
          </text>
        </g>
      )}
    </g>
  );
};

const CUE_ERASE = beat(49);

const StoppingCue: React.FC = () => {
  const f = useF();
  const t = m(f, CUE, BADGE, 0, 1, lin);
  const I: Iso = { ox: 780 + 20 * t, oy: 470 + 30 * t, u: 52 };
  // paged list: 3 cards then an end bar; after the erase the feed keeps coming.
  const s0 = 0;
  const flow = m(f, CUE_ERASE + 4, BADGE + 12, 0, 1, (x) => x * x) * 12;
  const barP = m(f, CUE + 4, CUE + 14) - m(f, CUE_ERASE, CUE_ERASE + 10, 0, 1);
  const a = pr(I, -0.3, 12.2, 0);
  const b = pr(I, 5.3, 12.2, 0);
  const shelf = pr(I, 5.3, 12.2, 0);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Feed I={I} id="sc" s={s0 - flow} yMax={12.0 + flow} yMin={-60} z={0} x0={0} />
        {barP > 0 && (
          <line x1={a[0]} y1={a[1]} x2={a[0] + (b[0] - a[0]) * barP} y2={a[1] + (b[1] - a[1]) * barP} stroke={INK} strokeWidth={14} strokeLinecap="round" />
        )}
        <Callout f={f} at={CUE + 14} a={[shelf[0] + 10, shelf[1] - 4]} e={[shelf[0] + 70, shelf[1] + 150]} text="Stopping cue" side="right" strike={m(f, CUE_ERASE, CUE_ERASE + 8)} />
      </svg>
      <div style={{ position: "absolute", left: 80, top: 1130, width: 920 }}>
        {f < CUE_ERASE ? (
          <div style={{ ...DISPLAY, fontSize: 170 }}>
            <Rise f={f} at={CUE + 2}>No last</Rise>
            <Rise f={f} at={CUE + 5}>page.</Rise>
          </div>
        ) : (
          <div style={{ ...DISPLAY, fontSize: 170 }}>
            <Rise f={f} at={CUE_ERASE - 2}>No place</Rise>
            <Rise f={f} at={CUE_ERASE + 1}>to stop.</Rise>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── 4. Badge ────────────────────────────────────────────────────────────────────────────────

const COUNTS: { at: number; n: string }[] = [
  { at: BADGE + 15, n: "1" },
  { at: BADGE_CU + 15, n: "3" },
  { at: BADGE_CU + 30, n: "8" },
  { at: BADGE_CU + 45, n: "12" },
  { at: BADGE_CU + 60, n: "27" },
];

const Badge: React.FC = () => {
  const f = useF();
  const cu = f >= BADGE_CU;
  const t = cu ? m(f, BADGE_CU, AUTO, 0, 1, lin) : m(f, BADGE, BADGE_CU, 0, 1, lin);
  const I: Iso = cu ? { ox: 170 - 20 * t, oy: 500 + 10 * t, u: 118 + 8 * t } : { ox: 470, oy: 940, u: 92 + 4 * t };
  const cur = COUNTS.reduce((a, c, i) => (f >= c.at ? i : a), -1);
  const lastAt = cur >= 0 ? COUNTS[cur].at : 0;
  const pop = cur >= 0 ? 1 - m(f, lastAt, lastAt + 8) : 0;
  const badgeIn = m(f, COUNTS[0].at - 2, COUNTS[0].at + 4);
  const c = pr(I, 4.5, 0.1, 2.0);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {cu &&
          COUNTS.slice(1).map((k) => {
            const p = m(f, k.at, k.at + 16, 0, 1, lin);
            if (p <= 0 || p >= 1) return null;
            return <circle key={k.at} cx={c[0]} cy={c[1]} r={I.u * (1 + p * 1.6)} fill="none" stroke={INK} strokeWidth={3} opacity={1 - p} />;
          })}
        <AppBlock I={I} o={[0, 0, 0]} count={cur >= 0 ? COUNTS[cur].n : "1"} badge={cu ? 1 : badgeIn} pop={pop} />
      </svg>
      {!cu ? (
        <Head f={f} at={BADGE} num="03 / 04" lines={["Badge"]} size={210} />
      ) : (
        <div style={{ position: "absolute", left: 80, top: 1130, width: 920 }}>
          <Rise f={f} at={BADGE_CU + 2}>
            <div style={{ ...MONO, fontSize: 44, color: MUTED }}>A small number that says</div>
          </Rise>
          <div style={{ ...DISPLAY, fontSize: 150, marginTop: 24 }}>
            <Rise f={f} at={BADGE_CU + 2}>Something</Rise>
            <Rise f={f} at={BADGE_CU + 5}>is waiting.</Rise>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── 5. Autoplay ─────────────────────────────────────────────────────────────────────────────

const Autoplay: React.FC = () => {
  const f = useF();
  const t = m(f, AUTO, DIAL, 0, 1, lin);
  const I: Iso = { ox: 720 - 20 * t, oy: 860 + 10 * t, u: 42 + 3 * t };
  const s = scrollAt(f) * 1.3;
  const arrowA = pr(I, 7.0, 15.5, 0.5);
  const arrowB = pr(I, 7.0, 3, 0.5);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Rails I={I} from={0} to={-60} />
        <Phone I={I} />
        <Chute I={I} o={CHUTE_O} />
        <Feed I={I} id="ap" s={s} yMax={10.45} />
        <line {...lineFrom(arrowA, arrowB)} stroke={ACC} strokeWidth={6} />
        <path d={arrow(arrowB, arrowB[0] - arrowA[0], arrowB[1] - arrowA[1], 30)} fill={ACC} />
        <Callout f={f} at={AUTO + 14} a={pr(I, 3, 14.6, CHUTE_H)} e={[pr(I, 3, 14.6, CHUTE_H)[0] - 30, 1460]} text="Up next: always" side="right" />
      </svg>
      <Head f={f} at={AUTO} num="04 / 04" lines={["Autoplay"]} size={180} />
    </AbsoluteFill>
  );
};

const COUNT_AT = [DIAL, DIAL + 15, DIAL + 30] as const;
const NEXT_AT = DIAL + 45;

const Dial: React.FC = () => {
  const f = useF();
  const cx = 540;
  const cy = 700;
  const R = 270;
  const sweep = m(f, DIAL - 3, NEXT_AT, 0, 1, lin);
  const idx = f >= COUNT_AT[2] ? 2 : f >= COUNT_AT[1] ? 1 : 0;
  const hitAt = COUNT_AT[idx];
  const next = m(f, NEXT_AT, NEXT_AT + 9);
  const k = 1 + 0.03 * m(f, DIAL, DESIGN, 0, 1, lin);
  const arc = (p: number) => {
    const a = -Math.PI / 2 + p * Math.PI * 2 * 0.9999;
    const large = p > 0.5 ? 1 : 0;
    return `M${cx} ${cy - R} A${R} ${R} 0 ${large} 1 ${(cx + Math.cos(a) * R).toFixed(1)} ${(cy + Math.sin(a) * R).toFixed(1)}`;
  };
  return (
    <AbsoluteFill>
      <Grid s={k} ox={540 - 540 * k} oy={700 - 700 * k} />
      <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: "540px 700px" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = R + 26;
            const r2 = R + (i % 5 === 0 ? 62 : 42);
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cy + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2}
                y2={cy + Math.sin(a) * r2}
                stroke={INK}
                strokeWidth={i % 5 === 0 ? 4 : 2}
                strokeOpacity={i % 5 === 0 ? 0.9 : 0.5}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={R} fill={SURF} stroke={INK} strokeWidth={3} />
          {sweep > 0 && <path d={arc(Math.min(sweep, 0.9999))} fill="none" stroke={ACC} strokeWidth={16} strokeLinecap="round" />}
          <line x1={cx - R - 90} x2={cx + R + 90} y1={cy} y2={cy} stroke={INK} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="10 10" />
          <line x1={cx} x2={cx} y1={cy - R - 90} y2={cy + R + 90} stroke={INK} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="10 10" />
          {next < 1 && (
            <text
              x={cx}
              y={cy + 112}
              textAnchor="middle"
              fontFamily={T.display}
              fontWeight={700}
              fontSize={320}
              fill={INK}
              opacity={1 - next}
              style={{ transform: `scale(${m(f, hitAt, hitAt + 5, 1.15, 1)})`, transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
            >
              {3 - idx}
            </text>
          )}
          {next > 0 && (
            <g transform={`translate(${cx - 150} ${cy - 200 + (1 - next) * 420})`} opacity={next}>
              <g transform="scale(100)">
                <CardFace w={3} h={4} />
              </g>
            </g>
          )}
          <text x={cx} y={cy - R - 92} textAnchor="middle" fontFamily={T.mono} fontWeight={600} fontSize={44} letterSpacing="0.06em" fill={INK}>
            {next > 0.5 ? "PLAYING" : "NEXT IN"}
          </text>
        </svg>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 80, top: 1060, width: 920 }}>
        <div style={{ ...DISPLAY, fontSize: 150 }}>
          <Rise f={f} at={DIAL + 4}>Before</Rise>
          <Rise f={f} at={DIAL + 7}>you</Rise>
          <Rise f={f} at={DIAL + 10}>decide.</Rise>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── 6. It's design → Rev. B ────────────────────────────────────────────────────────────────

const I_REV: Iso = { ox: 620, oy: 1110, u: 40 };
const DESIGN_HIT = beat(70);
const REV_AT = L.l16;
const CLOUD_BADGE = L.l16 + 18;
const CLOUD_END = L.l16 + 30;
const TOGGLE_DRAW = [L.l16 + 40, L.l16 + 62] as const;
const BADGE_OFF = L.l17 + 2;
const END_AT = beat(80);
const STOP = [END_AT + 2, END_AT + 26] as const;
const I_CU_BADGE: Iso = { ox: -15, oy: 590, u: 78 };
const I_CU_END: Iso = { ox: -20, oy: 860, u: 80 };
const switchCenter = () => pr(I_REV, SWITCH_O[0] + 2.5, SWITCH_O[1] + 1.1, 0.6);
const SWITCH_CIRCLE = [switchCenter()[0], switchCenter()[1], 170] as const;

const Revision: React.FC = () => {
  const f = useF();
  // camera: overview → badge close-up → strip-end close-up → back to overview
  let I = lerpIso({ ...I_REV, oy: 1125, u: 38 }, I_REV, m(f, DESIGN, DESIGN + 40, 0, 1));
  if (f >= L.l17 - 4) I = lerpIso(I_REV, I_CU_BADGE, m(f, L.l17 - 4, L.l17 + 8));
  if (f >= END_AT - 4) I = lerpIso(I_CU_BADGE, I_CU_END, m(f, END_AT - 4, END_AT + 8));
  if (f >= L.l17 + 74) I = lerpIso(I_CU_END, I_REV, m(f, L.l17 + 74, SWITCH));
  const st: MachineState = {
    s: scrollAt(f, [STOP[0], STOP[1]]),
    drum: 1,
    badge: 1,
    chute: 1,
    count: "27",
    spin: [f * 0.35, 1.7 + f * 0.31, 3.2 + f * 0.27],
    lever: Math.max(0, Math.sin(f * 0.21)) * 0.5,
    badgeOff: m(f, BADGE_OFF, BADGE_OFF + 4),
    endBar: m(f, END_AT, END_AT + 8),
    toggle: m(f, TOGGLE_DRAW[0], TOGGLE_DRAW[1], 0, 1, lin),
    toggleT: 0,
  };
  const bc = pr(I, BADGE_O[0] + 4.5, BADGE_O[1] + 0.1, 2.0);
  const endC = pr(I, 3, END_Y, 0.5);
  const endA = pr(I, 0.4, END_Y, 0.5);
  const phoneEnd = pr(I, 6.6, 0, 0.5);
  const endDim = pr(I, 6.6, END_Y, 0.5);
  const designed = f >= DESIGN_HIT;
  const revised = f >= REV_AT;
  const endCU = f >= END_AT - 4 && f < L.l17 + 74;
  const badgeCU = f >= L.l17 - 4 && f < END_AT - 4;
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Machine I={I} st={st} id="rev" />
        <RevCloud id="cloud-badge" cx={bc[0] - I.u * 1.4} cy={bc[1] + I.u * 1.1} rx={I.u * 4.2} ry={I.u * 3.1} p={m(f, CLOUD_BADGE, CLOUD_BADGE + 12, 0, 1, lin)} n={18} />
        <RevCloud id="cloud-end" cx={endC[0]} cy={endC[1]} rx={I.u * 4.4} ry={I.u * 2.4} p={m(f, CLOUD_END, CLOUD_END + 12, 0, 1, lin)} n={16} />
        {revised && <Delta x={Math.min(950, bc[0] + I.u * 2.6)} y={bc[1] - I.u * 1.6} p={m(f, CLOUD_BADGE + 8, CLOUD_BADGE + 14)} size={Math.max(70, I.u * 2.2)} />}
        {revised && <Delta x={Math.min(950, endC[0] + I.u * 4.4)} y={endC[1] - I.u * 1.6} p={m(f, CLOUD_END + 8, CLOUD_END + 14)} size={Math.max(70, I.u * 2.2)} />}
        {f >= END_AT + 4 && <Dim a={phoneEnd} b={endDim} p={m(f, END_AT + 4, END_AT + 14)} color={INK} />}
        {endCU && <Callout f={f} at={END_AT - 2} a={endA} e={[endA[0] - 30, 480]} text="End point: set" side="right" size={52} />}
        {badgeCU && <Callout f={f} at={BADGE_OFF + 4} a={[bc[0] - I.u * 0.4, bc[1] + I.u * 0.9]} e={[bc[0] - I.u * 2.4, 1460]} text="Badges: off" side="right" size={52} />}
      </svg>
      <div style={{ position: "absolute", left: 80, top: 236, width: 940 }}>
        {!designed && (
          <div style={{ ...DISPLAY, fontSize: 168 }}>
            <Rise f={f} at={DESIGN - 3} out={DESIGN_HIT - 6}>Not just</Rise>
            <Rise f={f} at={DESIGN} out={DESIGN_HIT - 5}>you.</Rise>
          </div>
        )}
        {designed && !revised && (
          <div style={{ ...DISPLAY, fontSize: 196 }}>
            <Rise f={f} at={DESIGN_HIT - 2} out={REV_AT - 6}>It's</Rise>
            <Rise f={f} at={DESIGN_HIT + 1} out={REV_AT - 5}>design.</Rise>
          </div>
        )}
        {revised && (
          <Rise f={f} at={REV_AT}>
            <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Revision B</div>
          </Rise>
        )}
        {revised && f < L.l17 - 4 && (
          <>
            <div style={{ ...DISPLAY, fontSize: 120, marginTop: 24 }}>
              <Rise f={f} at={REV_AT}>Design</Rise>
              <Rise f={f} at={REV_AT + 3}>the stop</Rise>
              <Rise f={f} at={REV_AT + 6}>back in.</Rise>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── 7. The off switch → reprise ─────────────────────────────────────────────────────────────

const SWAP_AT = REPRISE + 3;
const FLIP = beat(89); // l18 ends at 1311; ~0.8s of silence, then the flip

const OffSwitch: React.FC = () => {
  const f = useF();
  // anticipation: the lever eases back a touch, then snaps to OFF
  const t = f < FLIP - 3 ? -0.07 * m(f, FLIP - 16, FLIP - 4, 0, 1, ease.sineInOut) : m(f, FLIP - 3, FLIP + 3, -0.07, 1, ease.expoOut);
  const sk = f >= FLIP && f < FLIP + 9 ? Math.sin((f - FLIP) * 2.7) * 10 * (1 - (f - FLIP) / 9) : 0;
  const d = m(f, SWITCH, REPRISE, 0, 1, lin);
  const I: Iso = { ox: 300 + sk, oy: 960 + sk * 0.5, u: 86 + 6 * d };
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Toggle I={I} o={[0, 0, 0]} t={t} />
      </svg>
      <div style={{ position: "absolute", left: 80, top: 250, width: 920 }}>
        <Rise f={f} at={SWITCH - 3}>
          <div style={{ ...MONO, fontSize: 44, color: MUTED }}>Now the machine has an</div>
        </Rise>
        <div style={{ ...DISPLAY, fontSize: 200, marginTop: 28 }}>
          <Rise f={f} at={SWITCH - 3}>Off</Rise>
          <Rise f={f} at={SWITCH}>switch.</Rise>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Reprise: React.FC = () => {
  const f = useF();
  const t = m(f, REPRISE, END, 0, 1, lin);
  const I: Iso = { ox: I_HOOK.ox - 80, oy: I_HOOK.oy + 10 * t, u: I_HOOK.u + 2.5 * t };
  const stopS = scrollAt(STOP[1], [STOP[0], STOP[1]]);
  const st: MachineState = { s: stopS, drum: 0, badge: 0, chute: 0, endBar: 1 };
  const endC = pr(I, 3, END_Y, 0.5);
  return (
    <AbsoluteFill>
      <IsoGrid I={I} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Machine I={I} st={st} id="rep" />
        <Dim a={pr(I, 6.7, 0, 0.5)} b={pr(I, 6.7, END_Y, 0.5)} p={1} />
        <Callout f={f} at={REPRISE + 24} a={[endC[0] - 6, endC[1] - 4]} e={[endC[0] - 150, 860]} text="The end" side="left" />
      </svg>
      <HookHeadline f={f} reprise />
    </AbsoluteFill>
  );
};

const EndMotif: React.FC = () => {
  const I: Iso = { ox: 40, oy: 70, u: 26 };
  return (
    <svg width={330} height={190} style={{ overflow: "visible" }}>
      <Toggle I={I} o={[0, 0, 0]} t={1} labels={false} />
    </svg>
  );
};

// ─── Sound ───────────────────────────────────────────────────────────────────────────────────

const Narration: React.FC = () => (
  <>
    {(Object.keys(L) as (keyof typeof L)[]).map((id) => (
      <Sequence key={id} from={L[id]} durationInFrames={LINE_FRAMES[id] + 4} layout="none">
        <Audio src={staticFile(`voice/WhyYouCantStopScrolling/${id}.wav`)} volume={1} />
      </Sequence>
    ))}
  </>
);

/** Music bed level: ~0.2 under narration, back up to ~0.5 in the gaps. */
const musicLevel = (f: number) => {
  let under = 0;
  for (const id of Object.keys(L) as (keyof typeof L)[]) {
    const a = L[id] - 4;
    const b = L[id] + LINE_FRAMES[id] + 4;
    const v = f < a - 6 || f > b + 8 ? 0 : f < a ? (f - (a - 6)) / 6 : f > b ? 1 - (f - b) / 8 : 1;
    under = Math.max(under, v);
  }
  // ~2 dB lower bed through the middle stretch (l10–l14) so the arc has a valley
  const valley = 1 - 0.2 * m(f, L.l10 - 10, L.l10 + 10, 0, 1, lin) * (1 - m(f, L.l14 + 50, L.l14 + 70, 0, 1, lin));
  return (0.5 - 0.3 * under) * valley;
};

/** Loudness arc: full bed, then it drains to silence before the switch flips; the reprise is calm (0.3). */
const bedLevel = (f: number) => {
  if (f < SWITCH + 2) return musicLevel(f);
  // the bed sinks to a low hum (~0.16) under l18 and the held beat, then cuts out on the flip
  if (f < FLIP) return Math.min(musicLevel(f), 0.16 + (musicLevel(f) - 0.16) * Math.max(0, 1 - (f - SWITCH - 2) / 20));
  if (f < REPRISE) return 0;
  return 0.3 * Math.min(1, (f - REPRISE) / 10);
};

const SoundDesign: React.FC = () => (
  <>
    <Audio
      src={staticFile("music/pulse-minimal-120.m4a")}
      volume={(f) => bedLevel(f) * Math.max(0, Math.min(1, (f + 6) / 15, (WHY_YOU_CANT_STOP_SCROLLING_DURATION - f) / END_CARD_FRAMES))}
    />
    {/* hook: loud */}
    <Sfx name="impact" at={0} volume={1} />
    <Sfx name="sub-drop" at={0} volume={0.5} />
    {/* machine assembles */}
    <Sfx name="whoosh" at={PULL[0] - 2} volume={0.45} />
    {LABELS.map((a) => (
      <Sfx key={a} name="click" at={a} volume={0.35} />
    ))}
    <Sfx name="whoosh-short" at={REWARD - 2} volume={0.45} />
    {/* reward */}
    {[OKS, OK_AT[1], OK_AT[2]].map((a) => (
      <Sfx key={a} name="tick" at={a} volume={0.4} />
    ))}
    <Sfx name="ding" at={OK_AT[3]} volume={0.45} />
    <Sfx name="swish-reverse" at={WHICH + 20} volume={0.3} />
    <Sfx name="clink" at={PULL_AT} volume={0.45} />
    <Sfx name="ding" at={LAND[2]} volume={0.45} />
    <Sfx name="impact" at={LAND[2]} volume={0.4} />
    {/* no bottom */}
    <Sfx name="whoosh-short" at={NOBOTTOM - 1} volume={0.4} />
    <Sfx name="swish-reverse" at={INF_AT} volume={0.3} />
    <Sfx name="impact" at={HIT_2006} volume={0.6} />
    <Sfx name="tear" at={CUE_ERASE} volume={0.35} />
    {/* badge */}
    <Sfx name="whoosh-short" at={BADGE - 1} volume={0.4} />
    {[COUNTS[0], COUNTS[2], COUNTS[4]].map((c) => (
      <Sfx key={c.at} name="pop" at={c.at} volume={0.38} />
    ))}
    {/* autoplay */}
    {COUNT_AT.map((a) => (
      <Sfx key={a} name="tick" at={a} volume={0.45} />
    ))}
    <Sfx name="whoosh-short" at={NEXT_AT} volume={0.4} />
    {/* design → revision */}
    <Sfx name="whoosh" at={DESIGN - 2} volume={0.4} />
    <Sfx name="impact" at={DESIGN_HIT} volume={0.5} />
    <Sfx name="swish-reverse" at={CLOUD_BADGE} volume={0.25} />
    <Sfx name="click" at={BADGE_OFF} volume={0.45} />
    <Sfx name="click" at={END_AT} volume={0.45} />
    {/* off switch: lands in near-silence */}
    <Sfx name="whoosh-short" at={SWITCH - 2} volume={0.4} />
    <Sfx name="impact" at={FLIP} volume={1} />
    <Sfx name="sub-drop" at={FLIP} volume={0.55} />
    <Sfx name="click" at={FLIP} volume={0.5} />
    <Sfx name="click" at={SWAP_AT} volume={0.35} />
    <Sfx name="click" at={SWAP_AT + 11} volume={0.35} />
    <Sfx name="shimmer" at={END + 2} volume={0.3} />
  </>
);
