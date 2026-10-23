import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";
import { Music, Sfx } from "../kit/Sfx";
import { SystemTexture } from "../kit/Texture";

// Showreel: "8 transitions every editor should steal". Acid Sport: condensed type at frame-filling
// scale, one acid lime, black, speed. Eight transitions, one every 4s (8 beats at 120 BPM), each
// between two contrasting mini-scenes (graded NASA stills, a Prelinger home-movie clip, bold
// graphics). A small numbered chip names each move as it happens; after it lands, the scene's hero
// line says how to steal it. Circle motif: lime disk → Earth → the 0 you fly through → the visor
// ring that morphs into the 8. Music: pulse-minimal-120 from its 4s mark (kick from frame 0).
const S = systems.acidSport;
const P = S.palette;
const T = S.type;
const E = ease.of(S); // [0.7, 0, 0.2, 1]: hard in, hard out
const OUT = ease.expoOut;
const IN = Easing.bezier(0.55, 0, 1, 0.45);
const asset = (f: string) => staticFile(`assets/TransitionsToSteal/${f}`);
const W = 1080;
const H = 1920;

// ─── Timeline (beat = 15 frames) ───────────────────────────────────────────────────────────────────
/** Landing frame of transition k (k = 1..8). Scene k runs from L[k] to L[k + 1]. */
const L = [0, 45, 165, 285, 405, 525, 645, 765, 885, 1005];
const RECAP = 1005; // eighth-note recap of the eight moves
const PAYOFF = 1065; // NOW / STEAL / THEM.
const END = 1155;
export const TRANSITIONS_TO_STEAL_DURATION = END + END_CARD_FRAMES; // 1215 = 40.5s

const NAMES = ["ORBIT", "MATCH CUT", "WHIP PAN", "PAPER TEAR", "INK BLEED", "GLITCH", "ZOOM-THROUGH", "MORPH"];

const mv = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

// ─── Shared geometry ───────────────────────────────────────────────────────────────────────────────
const DISK = { x: 540, y: 820, r: 380 };
const DISK_PUSH = (f: number) => 1 + 0.045 * mv(f, 0, 120, 0, 1, (t) => t); // slow push through scene 1
const MATCH_R = DISK.r * DISK_PUSH(120); // radius at the match cut
const EARTH = { cx: 958, cy: 936, r: 795, size: 1920 };
const RING = { x: 540, y: 860, r: 410 }; // visor ring that becomes the 8

/** Place an image so its point (px, py) sits at (fx, fy) at scale s. */
const Photo: React.FC<{ src: string; iw: number; ih: number; px: number; py: number; fx: number; fy: number; s: number; style?: React.CSSProperties }> = ({
  src,
  iw,
  ih,
  px,
  py,
  fx,
  fy,
  s,
  style,
}) => (
  <Img
    src={asset(src)}
    style={{ position: "absolute", left: fx - px * s, top: fy - py * s, width: iw * s, height: ih * s, maxWidth: "none", ...style }}
  />
);

/** Beat-4 punch-in: a quick 6-frame step in scale, the "close-up" inside each scene. */
const punch = (f: number, amt = 0.07) => 1 + amt * mv(f, 60, 66, 0, 1, OUT);

// ─── Speed lines (Acid Sport signature) ───────────────────────────────────────────────────────────
const SpeedLines: React.FC<{ f: number; seed: number; color: string; dir?: 1 | -1; count?: number; opacity?: number; top?: number; bottom?: number }> = ({
  f,
  seed,
  color,
  dir = -1,
  count = 14,
  opacity = 1,
  top = 0,
  bottom = H,
}) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
    {Array.from({ length: count }, (_, i) => {
      const y = top + rand(seed * 17 + i * 3.1) * (bottom - top);
      const len = 180 + rand(seed + i * 7.7) * 520;
      const speed = 70 + rand(seed * 3 + i) * 90;
      const x0 = rand(seed * 5 + i * 1.9) * (W + len);
      const x = dir < 0 ? ((x0 - f * speed) % (W + len) + (W + len)) % (W + len) - len : ((x0 + f * speed) % (W + len)) - len;
      const th = rand(seed + i * 11.3) > 0.7 ? 6 : 3;
      return <div key={i} style={{ position: "absolute", left: x, top: y, width: len, height: th, background: color }} />;
    })}
  </AbsoluteFill>
);

// ─── Hero lines: skewed type smash, one line per beat ─────────────────────────────────────────────
type HeroProps = {
  f: number;
  lines: string[];
  top: number;
  size?: number;
  color?: string;
  align?: "left" | "right";
  from?: 1 | -1; // 1 = enters from the right
  start?: number;
  exit?: number;
  slab?: boolean;
  accentLast?: boolean;
};
const Hero: React.FC<HeroProps> = ({ f, lines, top, size = 150, color = P.ink, align = "left", from = -1, start = 15, exit = 92, slab, accentLast }) => {
  const out = mv(f, exit, exit + 8, 0, 1, IN);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top, display: "flex", flexDirection: "column", alignItems: align === "left" ? "flex-start" : "flex-end" }}>
      {lines.map((ln, i) => {
        const a = start + i * 15;
        const p = mv(f, a - 2, a + 6, 0, 1, OUT);
        const x = (1 - p) * from * 1150 + out * -from * 1300;
        const sk = (1 - p) * 18 * from + out * 14 * -from;
        const last = accentLast && i === lines.length - 1;
        return (
          <div
            key={i}
            style={{
              fontFamily: T.display,
              fontSize: size,
              lineHeight: 0.92,
              letterSpacing: `${T.displayTracking}em`,
              color,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              transform: `translateX(${x}px) skewX(${-sk}deg)`,
              background: slab ? P.bg : undefined,
              padding: slab ? "14px 26px 6px" : undefined,
              marginTop: slab && i > 0 ? 10 : 0,
              opacity: f < a - 2 ? 0 : 1,
            }}
          >
            {last ? (
              <>
                {ln.replace(/\.$/, "")}
                <span style={{ color: P.accent }}>{ln.endsWith(".") ? "." : ""}</span>
              </>
            ) : (
              ln
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Scenes. Each takes f = frames since its landing (can be negative while a transition brings it in).
type SceneProps = { f: number; bare?: boolean; lite?: boolean };

/** 0: hook. Saturn V on the pad, a lime 8 and the title. */
const Scene0: React.FC<SceneProps> = ({ f }) => {
  const s = 1.08 * (1 + 0.0012 * Math.max(0, f));
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="saturn.jpg" iw={1466} ih={1920} px={668} py={960} fx={640} fy={960} s={s} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,11,11,0.55) 0%, rgba(11,11,11,0.15) 40%, rgba(11,11,11,0.0) 55%, rgba(11,11,11,0.55) 78%, rgba(11,11,11,0.85) 100%)" }} />
      <div
        style={{
          position: "absolute",
          left: 62,
          top: 285,
          fontFamily: T.display,
          fontSize: 700,
          lineHeight: 1,
          color: P.accent,
          transform: `translateY(${-f * 0.6}px)`,
        }}
      >
        8
      </div>
      <div style={{ position: "absolute", left: 80, top: 1010, transform: `translateX(${-f * 0.8}px)` }}>
        <div style={{ fontFamily: T.display, fontSize: 196, lineHeight: 0.9, color: P.ink, letterSpacing: "-0.01em", background: P.bg, padding: "16px 22px 4px" }}>
          TRANSITIONS
        </div>
        <div style={{ display: "inline-block", fontFamily: T.display, fontSize: 196, lineHeight: 0.9, color: P.bg, background: P.accent, padding: "16px 22px 4px", marginTop: 12 }}>
          TO STEAL.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 1: graphic. A lime disk on black with speed lines. */
const Scene1: React.FC<SceneProps> = ({ f, bare }) => {
  const r = DISK.r * DISK_PUSH(f) * punch(f, 0.0);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <SpeedLines f={f} seed={11} color={P.surface} count={22} />
      <div style={{ position: "absolute", left: DISK.x - r, top: DISK.y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: P.accent }} />
      <SpeedLines f={f} seed={12} color={P.bg} count={6} top={DISK.y - 300} bottom={DISK.y + 300} opacity={0.9} />
      {!bare && <Hero f={f} lines={["SPIN OUT.", "SPIN IN."]} top={1230} size={150} accentLast />}
    </AbsoluteFill>
  );
};

/** 2: Earth, matched to the disk. Tilts down and keeps growing after the cut. */
const earthR = (f: number) => MATCH_R * (1 + 0.012 * Math.max(0, f) / 10) * punch(f, 0.05);
const earthY = (f: number) => DISK.y + 230 * mv(f, 8, 40, 0, 1, E);
const Scene2: React.FC<SceneProps> = ({ f, bare }) => {
  const r = earthR(f);
  const s = r / EARTH.r;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ clipPath: `circle(${r * 0.985}px at 540px ${earthY(f)}px)` }}>
        <Photo src="earth.jpg" iw={1920} ih={1920} px={EARTH.cx} py={EARTH.cy} fx={540} fy={earthY(f)} s={s} />
      </AbsoluteFill>
      {!bare && <Hero f={f} lines={["SAME SHAPE.", "SAME SPOT."]} top={340} size={150} from={1} accentLast />}
    </AbsoluteFill>
  );
};

/** 3: the rocket climbing on a diagonal. */
const Scene3: React.FC<SceneProps> = ({ f, bare }) => {
  const s = 1.8 * punch(f, 0.08) * (1 + 0.0006 * Math.max(0, f));
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="rocket.jpg" iw={1920} ih={1523} px={583} py={295} fx={300 - Math.max(0, f) * 0.9} fy={520 - Math.max(0, f) * 0.6} s={s} />
      {!bare && <Hero f={f} lines={["CUT INSIDE", "THE BLUR."]} top={1190} size={160} accentLast />}
    </AbsoluteFill>
  );
};

/** 4: graphic. Full lime field, black type at frame-filling scale. */
const Scene4: React.FC<SceneProps> = ({ f, bare }) => (
  <AbsoluteFill style={{ background: P.accent, overflow: "hidden" }}>
    <SpeedLines f={f} seed={41} color={P.bg} count={9} opacity={0.18} />
    {/* torn paper shreds still drifting from the rip */}
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: [120, 760, 430][i] + f * [1.4, -1.1, 0.6][i],
          top: [1430, 300, 1500][i] - f * [0.8, -0.5, 1.2][i],
          width: [90, 70, 50][i],
          height: [26, 22, 18][i],
          background: P.ink,
          clipPath: "polygon(0 20%, 30% 0, 62% 26%, 100% 6%, 92% 80%, 60% 100%, 28% 74%, 4% 100%)",
          transform: `rotate(${[18, -24, 40][i] + f * 0.6}deg)`,
          opacity: bare ? 0 : 1,
        }}
      />
    ))}
    {!bare && (
      <AbsoluteFill style={{ transform: `scale(${punch(f, 0.06)})`, transformOrigin: "80px 900px" }}>
        <Hero f={f} lines={["RIP THE", "FRAME", "OPEN."]} top={430} size={300} color={P.bg} start={-60} exit={101} />
      </AbsoluteFill>
    )}
  </AbsoluteFill>
);

/** 5: spacewalk over the Earth's limb. Placement shared with the ink-bleed SVG. */
const s5 = (f: number) => {
  const s = 1.6 * (1 + 0.0007 * Math.max(-20, f)) * punch(f, 0.06);
  return { s, fx: 600, fy: 860, px: 936, py: 564 };
};
const Scene5: React.FC<SceneProps> = ({ f, bare }) => {
  const g = s5(f);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="spacewalk.jpg" iw={1920} ih={1280} px={g.px} py={g.py} fx={g.fx} fy={g.fy} s={g.s} />
      {!bare && <Hero f={f} lines={["LET IT", "SPILL IN."]} top={380} size={150} slab accentLast />}
    </AbsoluteFill>
  );
};

/** 6: a strip of 1960s home-movie film running through the frame. */
const FRAME_W = 470;
const FRAME_H = 329;
const Scene6: React.FC<SceneProps> = ({ f, bare, lite }) => {
  const scroll = (f * 3.2) % (FRAME_H + 46);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 470, top: -460, width: 600, height: H + 900, transform: "rotate(7deg)", transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, background: P.surface, transform: `translateY(${-scroll}px)` }}>
          {Array.from({ length: 9 }, (_, i) => {
            const clip = i % 2 === 0 ? "clouds" : "aerial";
            return (
              <div key={i} style={{ position: "absolute", left: 65, top: 40 + i * (FRAME_H + 46), width: FRAME_W, height: FRAME_H, overflow: "hidden", background: "#222" }}>
                {lite ? (
                  <Img src={asset(`${clip}-still.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <OffthreadVideo
                    src={asset(`${clip}.mp4`)}
                    muted
                    startFrom={(i * 7) % 20}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
            );
          })}
          {Array.from({ length: 34 }, (_, i) => (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: 18, top: 30 + i * 94, width: 30, height: 44, borderRadius: 8, background: P.bg }} />
              <div style={{ position: "absolute", right: 18, top: 30 + i * 94, width: 30, height: 44, borderRadius: 8, background: P.bg }} />
            </React.Fragment>
          ))}
        </div>
      </div>
      {!bare && <Hero f={f} lines={["FOUR", "FRAMES.", "NO MORE."]} top={520} size={170} exit={84} accentLast />}
    </AbsoluteFill>
  );
};

/** 7: the astronaut's visor, flown into through the 0. */
const Scene7: React.FC<SceneProps> = ({ f, bare }) => {
  const s = 1.6 * (1 + 0.0008 * Math.max(0, f)) * punch(f, 0.06);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="helmet.jpg" iw={1920} ih={1280} px={830} py={580} fx={RING.x} fy={RING.y} s={s} />
      {!bare && <Hero f={f} lines={["FIND A HOLE.", "FLY THROUGH."]} top={1180} size={140} align="right" from={1} slab exit={86} accentLast />}
    </AbsoluteFill>
  );
};

// The 8: a lemniscate of Gerono, stroked, the same point count as the visor ring so they morph.
const N_PTS = 180;
const eightPts = (cx: number, cy: number, B: number, A: number) =>
  Array.from({ length: N_PTS }, (_, i) => {
    const t = (i / N_PTS) * Math.PI * 2;
    const top = Math.sin(t) > 0;
    const k = top ? 0.88 : 1; // top bowl a little smaller, like a drawn 8
    return [cx + A * k * Math.sin(2 * t), cy - B * k * Math.sin(t) + (top ? 0 : 0)] as [number, number];
  });
const circlePts = (cx: number, cy: number, r: number) =>
  Array.from({ length: N_PTS }, (_, i) => {
    const t = (i / N_PTS) * Math.PI * 2;
    return [cx + r * Math.cos(t), cy - r * Math.sin(t)] as [number, number];
  });
const lerpPts = (a: [number, number][], b: [number, number][], p: number) => a.map(([x, y], i) => [x + (b[i][0] - x) * p, y + (b[i][1] - y) * p] as [number, number]);
const toPath = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
const EIGHT = { x: 540, y: 1080, B: 392, A: 232 };

/** 8: the lime 8, drawn by the morph. */
const Scene8: React.FC<SceneProps> = ({ f, bare }) => {
  const sc = 1 + 0.0006 * Math.max(0, f) + 0.05 * mv(f, 60, 66, 0, 1, OUT);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <SpeedLines f={f} seed={81} color={P.surface} count={16} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `scale(${sc}) rotate(${Math.sin(f / 40) * 1.5}deg)`, transformOrigin: `${EIGHT.x}px ${EIGHT.y}px` }}>
        <path d={toPath(eightPts(EIGHT.x, EIGHT.y, EIGHT.B, EIGHT.A))} fill="none" stroke={P.accent} strokeWidth={104} strokeLinejoin="round" />
      </svg>
      {!bare && <Hero f={f} lines={["SHAPE INTO", "SHAPE."]} top={350} size={150} accentLast />}
    </AbsoluteFill>
  );
};

const SCENES = [Scene0, Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8];
const Sc: React.FC<{ k: number; f: number; bare?: boolean; lite?: boolean }> = ({ k, f, bare, lite }) => {
  const C = SCENES[k];
  return <C f={f} bare={bare} lite={lite} />;
};

// ─── Transitions. f = frames relative to the landing L[k]. ───────────────────────────────────────

/** 1 ORBIT: the frame spins out around its centre, the next spins in the same direction. */
const ORBIT_PRE = 17;
const Orbit: React.FC<{ f: number }> = ({ f }) => {
  const outP = mv(f, -17, -6, 0, 1, IN);
  const inP = mv(f, -6, 5, 0, 1, OUT);
  const outgoing = f < -6;
  const ang = outgoing ? outP * 110 : -110 * (1 - inP);
  const sc = outgoing ? 1 + outP * 1.1 : 2.1 - inP * 1.1;
  const vel = outgoing ? 110 * (outP - mv(f - 1, -17, -6, 0, 1, IN)) : 110 * (inP - mv(f - 1, -6, 5, 0, 1, OUT));
  const ghosts = [3, 2, 1, 0];
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      {ghosts.map((g) => (
        <AbsoluteFill
          key={g}
          style={{ transform: `rotate(${ang - g * vel * 0.33}deg) scale(${sc})`, opacity: g === 0 ? 1 : 0.32 / g, filter: g === 0 ? undefined : `blur(${4 + g * 3}px)` }}
        >
          <Sc k={outgoing ? 0 : 1} f={outgoing ? f + L[1] : f} />
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

/** 2 MATCH CUT: a hard cut, disk → Earth, with a lime registration ring that survives the cut. */
const MatchRing: React.FC<{ f: number }> = ({ f }) => {
  if (f < -12 || f > 16) return null;
  const draw = mv(f, -12, -4, 0, 1, OUT);
  const fade = mv(f, 8, 16, 1, 0, IN);
  const r = (f < 0 ? DISK.r * DISK_PUSH(f + 120) : earthR(f)) + 34;
  const cy = f < 0 ? DISK.y : earthY(f);
  const c = 2 * Math.PI * r;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: fade }}>
      <circle cx={540} cy={cy} r={r} fill="none" stroke={P.accent} strokeWidth={8} strokeDasharray={c} strokeDashoffset={c * (1 - draw)} transform={`rotate(-90 540 ${cy})`} />
      <line x1={540 - r - 40} x2={540 - r + 40} y1={cy} y2={cy} stroke={P.accent} strokeWidth={6} opacity={draw} />
      <line x1={540 + r - 40} x2={540 + r + 40} y1={cy} y2={cy} stroke={P.accent} strokeWidth={6} opacity={draw} />
    </svg>
  );
};

/** 3 WHIP PAN: both shots on one strip, a fast pan with horizontal motion blur, cut mid-blur. */
const WhipPan: React.FC<{ f: number }> = ({ f }) => {
  const outgoing = f < 0;
  const p = outgoing ? mv(f, -7, 0, 0, 1, IN) : mv(f, 0, 6, 0, 1, OUT);
  const x = outgoing ? p * 1300 : -(1 - p) * 1300;
  const blur = outgoing ? p * 70 : (1 - p) * 70;
  const id = `whip${Math.round(blur)}`;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-30%" y="0%" width="160%" height="100%">
          <feGaussianBlur stdDeviation={`${Math.max(0.01, blur)} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: blur > 1 ? `url(#${id})` : undefined }}>
        {outgoing ? <Sc k={2} f={f + 120} /> : <Sc k={3} f={f} />}
      </AbsoluteFill>
      <SpeedLines f={f + 40} seed={33} color={P.ink} dir={1} count={10} opacity={0.5 * (blur / 70)} />
    </AbsoluteFill>
  );
};

/** 4 PAPER TEAR: the shot rips along a jagged diagonal, the halves fly apart with a white paper edge. */
const tearLine = (() => {
  const pts: [number, number][] = [];
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -80 + t * (W + 160);
    const y = 1260 - t * 640 + (rand(i * 4.7 + 1) - 0.5) * 46;
    pts.push([x, y]);
  }
  return pts;
})();
const poly = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
const PaperTear: React.FC<{ f: number }> = ({ f }) => {
  const crack = mv(f, -14, -9, 0, 1, OUT) * 10;
  const p = mv(f, -9, 6, 0, 1, E);
  const topHalf = [[-400, -400] as [number, number], [W + 400, -400] as [number, number], ...[...tearLine].reverse()];
  const botHalf = [...tearLine, [W + 400, H + 400] as [number, number], [-400, H + 400] as [number, number]];
  // paper edge: the same line pushed into the gap, with its own fibre jitter
  const edge = (dir: 1 | -1) => tearLine.map(([x, y], i) => [x, y + dir * (16 + rand(i * 9.1 + (dir > 0 ? 3 : 7)) * 18)] as [number, number]);
  const topEdge = [[-400, -400] as [number, number], [W + 400, -400] as [number, number], ...edge(1).reverse()];
  const botEdge = [...edge(-1), [W + 400, H + 400] as [number, number], [-400, H + 400] as [number, number]];
  const half = (clipImg: string, clipEdge: string, dx: number, dy: number, rot: number) => (
    <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, transformOrigin: "50% 50%" }}>
      <AbsoluteFill style={{ background: "#F4F4F0", clipPath: clipEdge }} />
      <AbsoluteFill style={{ clipPath: clipImg }}>
        <div style={{ position: "absolute", left: -400, top: -400, width: W + 800, height: H + 800, background: P.bg }} />
        <Sc k={3} f={f + 120} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Sc k={4} f={f} />
      {half(poly(topHalf), poly(topEdge), -crack * 0.5 - p * 700, -crack - p * 1500, -p * 9)}
      {half(poly(botHalf), poly(botEdge), crack * 0.5 + p * 700, crack + p * 1500, p * 7)}
    </AbsoluteFill>
  );
};

/** 5 INK BLEED: black ink blooms over the lime field; the next shot spills in inside the ink. */
const INK_SEEDS = [
  { x: 330, y: 760, d: 0 },
  { x: 820, y: 1220, d: 3 },
  { x: 720, y: 420, d: 6 },
  { x: 180, y: 1460, d: 8 },
];
const InkBleed: React.FC<{ f: number }> = ({ f }) => {
  const g = s5(f);
  const rad = (d: number, extra: number) => 2300 * mv(f, -16 + d, 4, 0, 1, Easing.bezier(0.5, 0, 0.75, 1)) * (1 + extra);
  const wob = Math.floor((f + 20) / 2);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Sc k={4} f={f + 120} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={`ink${wob}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={3} seed={4 + (wob % 3)} />
            <feDisplacementMap in="SourceGraphic" scale={150} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id={`inkm${wob}`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <g filter={`url(#ink${wob})`}>
              {INK_SEEDS.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={rad(s.d, 0) * 0.5} fill="white" />
              ))}
            </g>
          </mask>
        </defs>
        <g filter={`url(#ink${wob})`}>
          {INK_SEEDS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={rad(s.d, 0) * 0.5 + 46 + 30 * (1 - mv(f, -16, 4))} fill={P.bg} />
          ))}
        </g>
        <image
          href={asset("spacewalk.jpg")}
          x={g.fx - g.px * g.s}
          y={g.fy - g.py * g.s}
          width={1920 * g.s}
          height={1280 * g.s}
          mask={`url(#inkm${wob})`}
          preserveAspectRatio="none"
        />
      </svg>
    </AbsoluteFill>
  );
};

/** 6 GLITCH: four heavy frames of sliced, displaced, channel-split picture, then clean. */
const Glitch: React.FC<{ f: number }> = ({ f }) => {
  const heavy = f >= -2 && f < 2;
  const base = f < 0 ? 5 : 6;
  const other = f < 0 ? 6 : 5;
  const bf = base === 5 ? f + 120 : f;
  const of = other === 5 ? f + 120 : f;
  const n = heavy ? 9 : 4;
  const slices = Array.from({ length: n }, (_, i) => {
    const seed = f * 31 + i * 7;
    const y = rand(seed) * H;
    const h = 30 + rand(seed + 1) * (heavy ? 260 : 120);
    const dx = (rand(seed + 2) - 0.5) * (heavy ? 320 : 120);
    const useOther = rand(seed + 3) > (heavy ? 0.35 : 0.7);
    return { y, h, dx, useOther };
  });
  const split = heavy ? 26 : 10;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Sc k={base} f={bf} lite />
      <AbsoluteFill style={{ transform: `translateX(${split}px)`, mixBlendMode: "screen", opacity: heavy ? 0.8 : 0.28, isolation: "isolate" }}>
        <Sc k={base} f={bf} lite bare />
        <AbsoluteFill style={{ background: P.accent, mixBlendMode: "multiply" }} />
      </AbsoluteFill>
      {slices.map((s, i) => (
        <AbsoluteFill key={i} style={{ clipPath: `inset(${s.y}px 0 ${Math.max(0, H - s.y - s.h)}px 0)` }}>
          <AbsoluteFill style={{ transform: `translateX(${s.dx}px)` }}>
            <Sc k={s.useOther ? other : base} f={s.useOther ? of : bf} lite bare />
          </AbsoluteFill>
        </AbsoluteFill>
      ))}
      {heavy &&
        Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: rand(f * 13 + i) * 900,
              top: rand(f * 17 + i * 3) * 1700,
              width: 60 + rand(f + i * 5) * 260,
              height: 10 + rand(f * 3 + i) * 30,
              background: i % 2 ? P.accent : P.ink,
            }}
          />
        ))}
    </AbsoluteFill>
  );
};

/** 7 ZOOM-THROUGH: a giant 07 slams in; the camera flies through the counter of the 0. */
const ZERO = { x: 150, y: 640, w: 380, h: 640, r: 150, sw: 110, sh: 120 };
const HOLE = { x: ZERO.x + ZERO.sw, y: ZERO.y + ZERO.sh, w: ZERO.w - 2 * ZERO.sw, h: ZERO.h - 2 * ZERO.sh, r: (ZERO.w - 2 * ZERO.sw) / 2 };
const HOLE_C = { x: HOLE.x + HOLE.w / 2, y: HOLE.y + HOLE.h / 2 };
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const SEVEN = (() => {
  const x = 570;
  const y = ZERO.y;
  const w = 360;
  const h = ZERO.h;
  const bar = 120;
  const stem = 124;
  return `M${x} ${y}H${x + w}V${y + bar + 10}L${x + w * 0.56} ${y + h}H${x + w * 0.56 - stem}L${x + w - stem * 1.05} ${y + bar}H${x}Z`;
})();
const ZoomThrough: React.FC<{ f: number }> = ({ f }) => {
  const slam = mv(f, -32, -24, 0, 1, OUT);
  const z = f < -14 ? 1 + 0.03 * mv(f, -24, -14, 0, 1) : 1 + 34 * mv(f, -14, 2, 0, 1, Easing.bezier(0.6, 0, 0.95, 0.6));
  const inner = interpolate(f, [-14, 6], [1.7, 1], { ...clamp, easing: OUT });
  const glyphIn = `translate(${(1 - slam) * -500}px, 0) skewX(${(1 - slam) * 16}deg) scale(${1 + (1 - slam) * 0.3})`;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      {/* the next shot sits behind, already moving */}
      <AbsoluteFill style={{ transform: `scale(${inner})`, transformOrigin: `${RING.x}px ${RING.y}px` }}>
        <Sc k={7} f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${HOLE_C.x}px ${HOLE_C.y}px` }}>
        <AbsoluteFill style={{ clipPath: `path(evenodd, "M0 0H${W}V${H}H0Z ${rr(HOLE.x + 4, HOLE.y + 4, HOLE.w - 8, HOLE.h - 8, HOLE.r - 4)}")` }}>
          <Sc k={6} f={f + 120} bare />
          <AbsoluteFill style={{ background: `rgba(11,11,11,${0.35 * slam})` }} />
        </AbsoluteFill>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: glyphIn, transformOrigin: `${HOLE_C.x}px ${HOLE_C.y}px`, opacity: f < -32 ? 0 : 1 }}>
          <path d={`${rr(ZERO.x, ZERO.y, ZERO.w, ZERO.h, ZERO.r)} ${rr(HOLE.x, HOLE.y, HOLE.w, HOLE.h, HOLE.r)}`} fill={P.accent} fillRule="evenodd" />
          <path d={SEVEN} fill={P.accent} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 8 MORPH: a lime ring locks onto the visor, the picture irises away, the ring twists into the 8. */
const Morph: React.FC<{ f: number }> = ({ f }) => {
  const draw = mv(f, -26, -16, 0, 1, OUT);
  const iris = mv(f, -20, -8, 0, 1, E);
  const fade = mv(f, -12, -4, 0, 1, E);
  const m = mv(f, -12, 2, 0, 1, E);
  const ring = circlePts(RING.x, RING.y, RING.r);
  const eight = eightPts(EIGHT.x, EIGHT.y, EIGHT.B, EIGHT.A);
  const pts = lerpPts(ring, eight, m);
  const c = 2 * Math.PI * RING.r;
  const holeR = interpolate(iris, [0, 1], [1500, RING.r - 2]);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: 1 - fade, clipPath: `circle(${holeR}px at ${RING.x}px ${RING.y}px)` }}>
        <Sc k={7} f={f + 120} bare />
      </AbsoluteFill>
      {f >= -2 && <SpeedLines f={f + 200} seed={81} color={P.surface} count={16} opacity={mv(f, -2, 4)} />}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {m <= 0 ? (
          <circle
            cx={RING.x}
            cy={RING.y}
            r={RING.r}
            fill="none"
            stroke={P.accent}
            strokeWidth={24 + 80 * fade}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - draw)}
            transform={`rotate(-90 ${RING.x} ${RING.y})`}
          />
        ) : (
          <path d={toPath(pts)} fill="none" stroke={P.accent} strokeWidth={104} strokeLinejoin="round" />
        )}
      </svg>
    </AbsoluteFill>
  );
};

// Transition windows relative to each landing: [pre, post]
const WINDOWS: Record<number, [number, number, React.FC<{ f: number }>]> = {
  1: [ORBIT_PRE, 6, Orbit],
  3: [7, 6, WhipPan],
  4: [14, 6, PaperTear],
  5: [16, 4, InkBleed],
  6: [8, 5, Glitch],
  7: [32, 6, ZoomThrough],
  8: [26, 3, Morph],
};

// ─── Chip: the small numbered label naming the move as it happens ─────────────────────────────────
const CHIP_AT = [0, 14, 137, 257, 377, 497, 617, 733, 859];
const Chip: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < CHIP_AT[1] || frame >= RECAP) return null;
  let k = 1;
  for (let i = 1; i <= 8; i++) if (frame >= CHIP_AT[i]) k = i;
  const since = frame - CHIP_AT[k];
  const enter = mv(frame, CHIP_AT[1], CHIP_AT[1] + 8, 0, 1, OUT);
  const roll = k === 1 ? 1 : mv(since, 0, 8, 0, 1, OUT);
  const wipe = mv(since, 2, 12, 0, 1, OUT);
  const exitP = mv(frame, RECAP - 8, RECAP, 0, 1, IN);
  const num = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 232,
        display: "flex",
        alignItems: "center",
        background: P.bg,
        padding: "10px 26px 10px 20px",
        transform: `translateX(${(1 - enter) * -700 - exitP * 700}px) skewX(${(1 - enter) * 14}deg)`,
        gap: 18,
      }}
    >
      <div style={{ position: "relative", height: 70, width: 66, overflow: "hidden" }}>
        {k > 1 && (
          <div style={{ position: "absolute", top: 0, fontFamily: T.display, fontSize: 64, lineHeight: "70px", color: P.accent, transform: `translateY(${-roll * 70}px)` }}>
            {num(k - 1)}
          </div>
        )}
        <div style={{ position: "absolute", top: 0, fontFamily: T.display, fontSize: 64, lineHeight: "70px", color: P.accent, transform: `translateY(${(1 - roll) * 70}px)` }}>
          {num(k)}
        </div>
      </div>
      <div style={{ fontFamily: T.body, fontWeight: 600, fontSize: 44, color: P.muted, letterSpacing: "0.02em" }}>/08</div>
      <div style={{ width: 3, height: 46, background: P.muted, opacity: 0.6 }} />
      <div style={{ clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, fontFamily: T.body, fontWeight: 800, fontSize: 44, color: P.ink, letterSpacing: "0.04em" }}>{NAMES[k - 1]}</div>
    </div>
  );
};

// ─── Recap: the eight shots on eighth notes, each stamped with its number ─────────────────────────
const RECAP_AT = Array.from({ length: 9 }, (_, i) => RECAP + Math.round(i * 7.5));
const Recap: React.FC<{ frame: number }> = ({ frame }) => {
  let i = 0;
  for (let j = 0; j < 8; j++) if (frame >= RECAP_AT[j]) i = j;
  const k = i + 1;
  const since = frame - RECAP_AT[i];
  const p = mv(since, -1, 4, 0, 1, OUT);
  const onLime = k === 4 || k === 1;
  const photo = [2, 3, 5, 6, 7].includes(k);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.12 - 0.05 * p})` }}>
        {k === 8 ? <SpeedLines f={since + 300} seed={88} color={P.surface} count={20} /> : <Sc k={k} f={70 + since} bare lite />}
      </AbsoluteFill>
      {photo && <AbsoluteFill style={{ background: "rgba(11,11,11,0.4)" }} />}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 560,
          textAlign: "center",
          fontFamily: T.display,
          fontSize: 640,
          lineHeight: 1,
          color: onLime ? P.bg : P.accent,
          transform: `scale(${1.25 - 0.25 * p}) skewX(${-10 * (1 - p)}deg)`,
        }}
      >
        <span style={{ background: onLime ? undefined : P.bg, padding: onLime ? undefined : "40px 44px 0" }}>{String(k).padStart(2, "0")}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1300, textAlign: "center" }}>
        <span style={{ fontFamily: T.body, fontWeight: 800, fontSize: 48, letterSpacing: "0.06em", color: P.ink, background: P.bg, padding: "10px 22px" }}>{NAMES[k - 1]}</span>
      </div>
    </AbsoluteFill>
  );
};

// ─── Payoff: NOW / STEAL / THEM. ──────────────────────────────────────────────────────────────────
const Payoff: React.FC<{ frame: number }> = ({ frame }) => {
  const f = frame - PAYOFF;
  const words = ["NOW", "STEAL", "THEM"];
  const push = 1 + 0.03 * mv(f, 30, 90, 0, 1, (t) => t);
  const dot = mv(f, 27, 33, 0, 1, OUT);
  const save = mv(f, 38, 46, 0, 1, OUT);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <SpeedLines f={f} seed={91} color={P.surface} count={20} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "80px 900px" }}>
        <div style={{ position: "absolute", left: 80, top: 300 }}>
          {words.map((w, i) => {
            const a = i * 15;
            const p = mv(f, a - 3, a + 5, 0, 1, OUT);
            return (
              <div
                key={w}
                style={{
                  fontFamily: T.display,
                  fontSize: 360,
                  lineHeight: 0.88,
                  color: P.ink,
                  letterSpacing: "-0.01em",
                  transform: `translateX(${(1 - p) * -1200}px) skewX(${(1 - p) * 18}deg)`,
                  opacity: f < a - 3 ? 0 : 1,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                {w}
                {i === 2 && (
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: "50%",
                      background: P.accent,
                      marginLeft: 22,
                      marginBottom: 40,
                      transform: `scale(${dot * (1 + 0.5 * (1 - mv(f, 30, 38, 0, 1, OUT)))})`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 86, top: 1380, fontFamily: T.body, fontWeight: 600, fontSize: 52, color: P.ink, opacity: save, transform: `translateY(${(1 - save) * 30}px)` }}>
          Save these for your next edit.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Sound ─────────────────────────────────────────────────────────────────────────────────────────
const SFX: { name: Parameters<typeof Sfx>[0]["name"]; at: number; volume?: number }[] = [
  { name: "impact", at: 0, volume: 0.85 },
  { name: "sub-drop", at: 0, volume: 0.5 },
  // 1 orbit
  { name: "whoosh", at: L[1] - 18, volume: 0.6 },
  { name: "impact", at: L[1], volume: 0.4 },
  // 2 match cut
  { name: "shutter", at: L[2], volume: 0.7 },
  { name: "sub-drop", at: L[2], volume: 0.45 },
  // 3 whip pan
  { name: "whoosh-short", at: L[3] - 7, volume: 0.75 },
  { name: "swish-reverse", at: L[3] - 16, volume: 0.25 },
  // 4 paper tear
  { name: "tear", at: L[4] - 12, volume: 0.8 },
  { name: "paper", at: L[4] - 2, volume: 0.5 },
  // 5 ink bleed
  { name: "swish-reverse", at: L[5] - 20, volume: 0.35 },
  { name: "splat", at: L[5] - 4, volume: 0.6 },
  // 6 glitch
  { name: "glitch", at: L[6] - 4, volume: 0.6 },
  { name: "glitch", at: L[6], volume: 0.45 },
  // 7 zoom-through
  { name: "impact", at: L[7] - 32, volume: 0.45 },
  { name: "whoosh", at: L[7] - 15, volume: 0.7 },
  { name: "sub-drop", at: L[7], volume: 0.5 },
  // 8 morph
  { name: "swish-reverse", at: L[8] - 18, volume: 0.45 },
  { name: "pop", at: L[8], volume: 0.6 },
  // recap + payoff
  ...RECAP_AT.slice(0, 8).map((at) => ({ name: "tick" as const, at, volume: 0.55 })),
  { name: "riser", at: PAYOFF - 72, volume: 0.45 },
  { name: "impact", at: PAYOFF, volume: 0.6 },
  { name: "click", at: PAYOFF + 15, volume: 0.6 },
  { name: "impact", at: PAYOFF + 30, volume: 0.7 },
  { name: "sub-drop", at: PAYOFF + 30, volume: 0.55 },
  { name: "shimmer", at: END + 4, volume: 0.4 },
];
// type hits: a tick on every hero line
const HERO_LINES = [0, 2, 2, 2, 0, 2, 3, 2, 2];
for (let k = 1; k <= 8; k++) for (let i = 0; i < HERO_LINES[k]; i++) SFX.push({ name: "click", at: L[k] + 15 + i * 15, volume: 0.35 });

// ─── Main ──────────────────────────────────────────────────────────────────────────────────────────
export const TransitionsToSteal: React.FC = () => {
  const frame = useCurrentFrame();

  let body: React.ReactNode = null;
  if (frame >= END) {
    body = (
      <EndCard
        system={S}
        align="left"
        motif={
          <svg width={120} height={170} viewBox="0 0 1080 1920">
            <path d={toPath(eightPts(540, 960, 760, 440))} fill="none" stroke={P.accent} strokeWidth={170} strokeLinejoin="round" />
          </svg>
        }
      />
    );
  } else if (frame >= PAYOFF) {
    body = <Payoff frame={frame} />;
  } else if (frame >= RECAP) {
    body = <Recap frame={frame} />;
  } else {
    let k = 0;
    for (let i = 1; i <= 8; i++) if (frame >= L[i]) k = i;
    // is a transition window active?
    let tr: React.ReactNode = null;
    for (let i = 1; i <= 8; i++) {
      const w = WINDOWS[i];
      if (!w) continue;
      const f = frame - L[i];
      if (f >= -w[0] && f < w[1]) {
        const C = w[2];
        tr = <C f={f} />;
      }
    }
    body = (
      <>
        {tr ?? <Sc k={k} f={frame - L[k]} />}
        <MatchRing f={frame - L[2]} />
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: P.bg }}>
      {body}
      <Chip frame={frame} />
      <SystemTexture system={S} />
      <Sequence from={0} durationInFrames={TRANSITIONS_TO_STEAL_DURATION}>
        <Music file="pulse-minimal-120.m4a" durationInFrames={TRANSITIONS_TO_STEAL_DURATION} volume={0.5} fadeIn={4} fadeOut={60} startFrom={120} />
      </Sequence>
      {SFX.map((s, i) => (
        <Sfx key={i} name={s.name} at={s.at} volume={s.volume} />
      ))}
    </AbsoluteFill>
  );
};
