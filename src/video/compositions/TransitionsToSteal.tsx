import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";
import { Sfx } from "../kit/Sfx";
import { SystemTexture } from "../kit/Texture";
import { EIGHT_ASCENT, EIGHT_BBOX, EIGHT_COUNTERS, EIGHT_D, EIGHT_DESCENT, EIGHT_OUTER, EIGHT_OUTER_D, EIGHT_UPM } from "./TransitionsToStealGlyph";

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

/** Beat 4 of every scene (f+60): a 10% punch-in over 8 frames in the house easing. */
const beat5 = (f: number, amt = 0.1) => 1 + amt * mv(f, 60, 68, 0, 1, E);

// ─── Shared geometry ───────────────────────────────────────────────────────────────────────────────
const DISK = { x: 540, y: 800, r: 340 };
const DISK_PUSH = (f: number) => (1 + 0.045 * mv(f, 0, 120, 0, 1, (t) => t)) * beat5(f, 0.06); // slow push + beat-5 punch
const MATCH_R = DISK.r * DISK_PUSH(120); // radius at the match cut
const EARTH = { cx: 958, cy: 936, r: 795, size: 1920 };
const RING_R = 410; // the visor ring that becomes the 8
/** Visor centre in scene 7: under the 0's counter at the landing, then panning right. */
const visor = (f: number) => ({ x: 340 + 2.2 * Math.max(-20, f), y: 860 });

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
/** Lifts a photo's pure blacks to the system black, so plates and edges never show as grey boxes. */
const Lift: React.FC = () => <div style={{ position: "absolute", left: -1600, top: -1600, width: W + 3200, height: H + 3200, background: P.bg, mixBlendMode: "lighten" }} />;

/** Scale steps inside every scene: punch-in on beat 4 (f+60), a second step on beat 6 (f+90). */
const punch = (f: number, amt = 0.07) =>
  (1 + 0.04 * mv(f, 0, 120, 0, 1, (t) => t)) * beat5(f) * (1 + amt * 0.5 * mv(f, 89, 94, 0, 1, OUT));

// ─── Anton's 8 as a path (same glyph as the frame-0 numeral) ──────────────────────────────────────
const E8_CX_U = (EIGHT_BBOX[0] + EIGHT_BBOX[2]) / 2;
const E8_CY_U = (EIGHT_BBOX[1] + EIGHT_BBOX[3]) / 2;
/** SVG transform that draws the glyph `size` px tall-em, centred on (cx, cy). */
const eightAt = (cx: number, cy: number, size: number) => {
  const k = size / EIGHT_UPM;
  return `translate(${cx - E8_CX_U * k} ${cy + E8_CY_U * k}) scale(${k} ${-k})`;
};
/** Baseline of CSS text with line-height 1 (typo metrics), so the path sits where the text would. */
const baselineAt = (top: number, size: number) => top + (size - ((EIGHT_ASCENT + EIGHT_DESCENT) / EIGHT_UPM) * size) / 2 + (EIGHT_ASCENT / EIGHT_UPM) * size;
const E8 = { cx: 540, cy: 1078, size: 880 };

// ─── Speed lines (Acid Sport signature) ───────────────────────────────────────────────────────────
const SpeedLines: React.FC<{ f: number; seed: number; color: string; dir?: 1 | -1; count?: number; opacity?: number; top?: number; bottom?: number; width?: number }> = ({
  f,
  seed,
  color,
  dir = -1,
  count = 14,
  opacity = 1,
  top = 0,
  bottom = H,
  width = W,
}) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
    {Array.from({ length: count }, (_, i) => {
      const y = top + rand(seed * 17 + i * 3.1) * (bottom - top);
      const len = 180 + rand(seed + i * 7.7) * 520;
      const speed = 70 + rand(seed * 3 + i) * 90;
      const x0 = rand(seed * 5 + i * 1.9) * (width + len);
      const x = dir < 0 ? ((x0 - f * speed) % (width + len) + (width + len)) % (width + len) - len : ((x0 + f * speed) % (width + len)) - len;
      const th = rand(seed + i * 11.3) > 0.7 ? 6 : 3;
      return <div key={i} style={{ position: "absolute", left: x, top: y, width: len, height: th, background: color }} />;
    })}
  </AbsoluteFill>
);

// ─── Hero lines: skewed type smash, one line per beat, a re-smash on beat 3 ──────────────────────
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
  lineScale?: (i: number) => number;
};
const Hero: React.FC<HeroProps> = ({ f, lines, top, size = 150, color = P.ink, align = "left", from = -1, start = 15, exit = 104, slab, accentLast, lineScale }) => {
  const out = mv(f, exit, exit + 8, 0, 1, IN);
  // beat 3: the block re-smashes (jolt + skew snap back) under a burst of speed lines
  const kick = f >= 45 && f < 54 ? 1 - mv(f, 45, 54, 0, 1, OUT) : 0;
  return (
    <>
      {kick > 0 && <SpeedLines f={f} seed={7 + lines.length} color={slab ? P.ink : color} dir={from < 0 ? 1 : -1} count={9} top={top - 20} bottom={top + lines.length * size * 0.95} opacity={kick * 0.7} />}
      <div style={{ position: "absolute", left: 80, right: 80, top, display: "flex", flexDirection: "column", alignItems: align === "left" ? "flex-start" : "flex-end" }}>
        {lines.map((ln, i) => {
          const a = start + i * 15;
          const p = mv(f, a - 2, a + 6, 0, 1, OUT);
          const drift = -from * 0.45 * Math.max(0, f - start - 6); // one drift for the whole block, so lines stay aligned
          const x = (1 - p) * from * 1150 + out * -from * 1300 + drift + kick * -from * 46 * (i % 2 ? -1 : 1);
          const sk = (1 - p) * 18 * from + out * 14 * -from + kick * 12 * from;
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
                transform: `translateX(${x}px) skewX(${-sk}deg) scale(${lineScale ? lineScale(i) : 1})`,
                transformOrigin: align === "left" ? "0% 60%" : "100% 60%",
                background: slab ? P.bg : undefined,
                padding: slab ? "14px 26px 6px" : undefined,
                marginTop: slab && i > 0 ? 10 : 0,
                opacity: f < a - 2 || out >= 1 ? 0 : 1,
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
    </>
  );
};

// ─── Scenes. Each takes f = frames since its landing (can be negative while a transition brings it in).
type SceneProps = { f: number; bare?: boolean; lite?: boolean; overscan?: boolean };

/** 0: hook. Saturn V on the pad, a lime 8 and the title. */
const Scene0: React.FC<SceneProps> = ({ f }) => {
  const s = 1.08 * (1 + (0.04 * Math.max(0, f)) / 28);
  const k = 700 / EIGHT_UPM;
  const settle = 1 - mv(f, 0, 5, 0, 1, OUT);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="saturn.jpg" iw={1466} ih={1920} px={668} py={960} fx={640} fy={960} s={s} />
      <Lift />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,11,11,0.55) 0%, rgba(11,11,11,0.15) 40%, rgba(11,11,11,0.0) 55%, rgba(11,11,11,0.55) 78%, rgba(11,11,11,0.85) 100%)" }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `translateY(${-f * 0.6}px)` }}>
        <path d={EIGHT_D} fill={P.accent} transform={`translate(62 ${baselineAt(285, 700)}) scale(${k} ${-k})`} />
      </svg>
      <div style={{ position: "absolute", left: 80, top: 1010, transform: `translateX(${-f * 0.8 - settle * 14}px) skewX(${settle * -7}deg)` }}>
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

/** A small lime moon on a tilted elliptical orbit; it passes behind the body when it's on the far side. */
const moonAt = (t: number, cx: number, cy: number, sc: number) => {
  const a = t * ((2 * Math.PI) / 120) + 0.4;
  const x = Math.cos(a) * 400 * sc;
  const y = Math.sin(a) * 120 * sc;
  const tilt = (-14 * Math.PI) / 180;
  return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt), front: Math.sin(a) > 0 };
};
const Moon: React.FC<{ t: number; cx: number; cy: number; sc: number; front: boolean; opacity?: number }> = ({ t, cx, cy, sc, front, opacity = 1 }) => {
  const m = moonAt(t, cx, cy, sc);
  if (m.front !== front) return null;
  return (
    <>
      {[4, 3, 2, 1, 0].map((g) => {
        const q = moonAt(t - g * 1.2, cx, cy, sc);
        const r = 30 * sc * (1 - g * 0.12);
        return <div key={g} style={{ position: "absolute", left: q.x - r, top: q.y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: P.accent, opacity: opacity * (g === 0 ? 1 : 0.5 / g) }} />;
      })}
    </>
  );
};

/** 1: graphic. A lime disk on black with a moon in orbit and speed lines. */
const Scene1: React.FC<SceneProps> = ({ f, bare }) => {
  const sc = DISK_PUSH(f);
  const r = DISK.r * sc;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <SpeedLines f={f} seed={11} color={P.surface} count={22} />
      <Moon t={f} cx={DISK.x} cy={DISK.y} sc={sc} front={false} />
      <div style={{ position: "absolute", left: DISK.x - r, top: DISK.y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: P.accent }} />
      <SpeedLines f={f} seed={12} color={P.bg} count={6} top={DISK.y - 300} bottom={DISK.y + 300} opacity={0.9} />
      <Moon t={f} cx={DISK.x} cy={DISK.y} sc={sc} front />
      {!bare && <Hero f={f} lines={["SPIN OUT.", "SPIN IN."]} top={1210} size={150} accentLast />}
    </AbsoluteFill>
  );
};

/** 2: Earth, matched to the disk. Spins, tilts down and keeps growing after the cut; the moon carries over. */
const earthR = (f: number) => MATCH_R * (1 + 0.03 * mv(f, 0, 120, 0, 1, (t) => t)) * beat5(f);
const earthY = (f: number) => DISK.y + 280 * mv(f, 8, 40, 0, 1, E);
const Scene2: React.FC<SceneProps> = ({ f, bare, overscan }) => {
  const r = earthR(f);
  const s = r / EARTH.r;
  const y = earthY(f);
  const msc = r / DISK.r;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: overscan ? "visible" : "hidden" }}>
      <Moon t={f + 120} cx={540} cy={y} sc={msc} front={false} />
      <AbsoluteFill style={{ clipPath: `circle(${r * 0.985}px at 540px ${y}px)` }}>
        <Photo src="earth.jpg" iw={1920} ih={1920} px={EARTH.cx} py={EARTH.cy} fx={540} fy={y} s={s} style={{ transform: `rotate(${f * 0.22}deg)`, transformOrigin: `${EARTH.cx * s}px ${EARTH.cy * s}px` }} />
        <Lift />
      </AbsoluteFill>
      <Moon t={f + 120} cx={540} cy={y} sc={msc} front />
      {!bare && <Hero f={f} lines={["SAME SHAPE.", "SAME SPOT."]} top={340} size={150} from={1} accentLast />}
    </AbsoluteFill>
  );
};

/** 3: the rocket climbing on its diagonal, air streaming past it. */
const ROCKET_DIR = { x: -0.84, y: -0.55 };
const Scene3: React.FC<SceneProps> = ({ f, bare, overscan }) => {
  const s = 1.3 * punch(f, 0.06);
  const t = Math.max(0, f) * 3.2;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: overscan ? "visible" : "hidden" }}>
      <div style={{ position: "absolute", left: -700, top: -700, width: W + 1400, height: H + 1400, transform: "rotate(33deg)", transformOrigin: "50% 50%" }}>
        <SpeedLines f={f} seed={31} color={P.surface} dir={1} count={26} width={W + 1400} bottom={H + 1400} />
      </div>
      <Photo src="rocket.jpg" iw={1920} ih={1523} px={583} py={295} fx={440 + ROCKET_DIR.x * t} fy={680 + ROCKET_DIR.y * t} s={s} />
      <Lift />
      <div style={{ position: "absolute", left: -700, top: -700, width: W + 1400, height: H + 1400, transform: "rotate(33deg)", transformOrigin: "50% 50%" }}>
        <SpeedLines f={f} seed={32} color={P.ink} dir={1} count={7} width={W + 1400} bottom={H + 1400} opacity={0.35} />
      </div>
      {!bare && <Hero f={f} lines={["CUT INSIDE", "THE BLUR."]} top={1190} size={160} accentLast />}
    </AbsoluteFill>
  );
};

/** 4: graphic. Full lime field, black type at frame-filling scale, a chevron band running underneath. */
const Scene4: React.FC<SceneProps> = ({ f, bare }) => {
  const slam = mv(f, 59, 64, 0, 1, OUT);
  const step = 120 + 40 * slam;
  const run = (f * (9 + 6 * slam)) % step;
  const bh = 130 + 70 * slam;
  return (
    <AbsoluteFill style={{ background: P.accent, overflow: "hidden" }}>
      <SpeedLines f={f} seed={41} color={P.bg} count={9} opacity={0.18} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1300, height: bh, background: P.bg, overflow: "hidden", transform: `skewY(${-3 * (1 - mv(f, 59, 66, 0, 1, OUT)) * slam}deg)` }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -2 * step + i * step + run,
              top: 25,
              width: 60 + 30 * slam,
              height: bh - 50,
              background: P.accent,
              clipPath: "polygon(0 0, 45% 0, 100% 50%, 45% 100%, 0 100%, 55% 50%)",
            }}
          />
        ))}
      </div>
      {!bare && (
        <AbsoluteFill style={{ transform: `scale(${(1 + 0.05 * mv(f, 59, 64, 0, 1, OUT)) * beat5(f, 0.04)})`, transformOrigin: "80px 840px" }}>
          <Hero f={f} lines={["RIP THE", "FRAME", "OPEN."]} top={400} size={300} color={P.bg} start={-60} exit={101} lineScale={(i) => (i === 2 ? 1 + 0.12 * mv(f, 89, 94, 0, 1, OUT) : 1)} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** 5: spacewalk over the Earth's limb, panning. Placement shared with the ink-bleed SVG. */
const s5 = (f: number) => {
  const s = 1.51 * punch(f, 0.06);
  return { s, fx: 640 - 3.4 * Math.max(-20, f), fy: 850, px: 936, py: 564 };
};
const Scene5: React.FC<SceneProps> = ({ f, bare }) => {
  const g = s5(f);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="spacewalk.jpg" iw={1920} ih={1280} px={g.px} py={g.py} fx={g.fx} fy={g.fy} s={g.s} />
      <Lift />
      {!bare && <Hero f={f} lines={["LET IT", "SPILL IN."]} top={1150} size={150} slab accentLast />}
    </AbsoluteFill>
  );
};

/** 6: a strip of 1960s home-movie film running through the frame. */
const FRAME_W = 470;
const FRAME_H = 329;
const Scene6: React.FC<SceneProps> = ({ f, bare, lite }) => {
  const scroll = (f * 6.5) % (FRAME_H + 46);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 590, top: -460, width: 600, height: H + 900, transform: `rotate(${7 + 0.6 * mv(f, 59, 64, 0, 1, OUT)}deg) scale(${(1 + 0.04 * mv(f, 0, 120, 0, 1, (t) => t)) * beat5(f)})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, background: P.surface, transform: `translateY(${-scroll}px)` }}>
          {Array.from({ length: 9 }, (_, i) => {
            const clip = i % 2 === 0 ? "clouds" : "aerial";
            return (
              <div key={i} style={{ position: "absolute", left: 65, top: 40 + i * (FRAME_H + 46), width: FRAME_W, height: FRAME_H, overflow: "hidden", background: "#222" }}>
                {lite ? (
                  <Img src={asset(`${clip}-still.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <OffthreadVideo src={asset(`${clip}.mp4`)} muted startFrom={(i * 7) % 20} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
      {!bare && <Hero f={f} lines={["FOUR", "FRAMES.", "NO MORE."]} top={540} size={150} start={-3} exit={84} accentLast />}
    </AbsoluteFill>
  );
};

/** 7: the astronaut's visor, flown into through the 0, panning right. */
const Scene7: React.FC<SceneProps> = ({ f, bare }) => {
  const s = 1.52 * punch(f, 0.06);
  const v = visor(f);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <Photo src="helmet.jpg" iw={1920} ih={1280} px={830} py={580} fx={v.x} fy={v.y} s={s} />
      <Lift />
      {!bare && <Hero f={f} lines={["FIND A HOLE.", "FLY THROUGH."]} top={1180} size={140} align="right" from={1} slab exit={86} accentLast />}
    </AbsoluteFill>
  );
};

/** 8: the lime Anton 8 the morph lands on. */
const Scene8: React.FC<SceneProps> = ({ f, bare }) => {
  const sc = (1 + 0.02 * mv(f, 0, 120, 0, 1, (t) => t)) * beat5(f, 0.045);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <SpeedLines f={f} seed={81} color={P.surface} count={18} />
      <svg
        width={W}
        height={H}
        style={{ position: "absolute", inset: 0, transform: `scale(${sc}) rotate(${Math.sin(f / 22) * 2.5}deg) translateX(${Math.sin(f / 30) * 18}px)`, transformOrigin: `${E8.cx}px ${E8.cy + 0.44 * E8.size}px` }}
      >
        <path d={EIGHT_D} fill={P.accent} transform={eightAt(E8.cx, E8.cy, E8.size)} />
      </svg>
      {!bare && <Hero f={f} lines={["SHAPE INTO", "SHAPE."]} top={340} size={150} accentLast />}
    </AbsoluteFill>
  );
};

const SCENES = [Scene0, Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8];
const Sc: React.FC<{ k: number; f: number; bare?: boolean; lite?: boolean; overscan?: boolean }> = ({ k, f, bare, lite, overscan }) => {
  const C = SCENES[k];
  return <C f={f} bare={bare} lite={lite} overscan={overscan} />;
};

// ─── Transitions. f = frames relative to the landing L[k]. ───────────────────────────────────────

/** 1 ORBIT: the frame spins out around its centre, the next spins in the same direction. */
const ORBIT_PRE = 17;
const Orbit: React.FC<{ f: number }> = ({ f }) => {
  // the hook irises down to a circle first (so no layer edge ever shows), spins out, and hands off to
  // the lime disk at the same size; the disk spins in (its moon and speed lines carry the rotation)
  const outgoing = f < -6;
  const spinOut = mv(f, -13, -6, 0, 1, IN);
  const inP = mv(f, -6, 5, 0, 1, OUT);
  const ang = outgoing ? spinOut * 110 : -110 * (1 - inP);
  const sc = outgoing ? 1 + spinOut * 0.5 : 1.25 - 0.25 * inP;
  // angular speed per frame: backward difference on the way out, forward difference on the way in (so the
  // first incoming frame, which starts at full speed, is smeared too)
  const vel = outgoing ? ang - mv(f - 1, -13, -6, 0, 1, IN) * 110 : -110 * (1 - mv(f + 1, -6, 5, 0, 1, OUT)) - ang;
  const iris =
    f < -13
      ? interpolate(f, [-17, -13], [1300, 540], { ...clamp, easing: OUT })
      : interpolate(f, [-13, -6], [540, DISK.r * 1.25], { ...clamp, easing: IN });
  const origin = `${DISK.x}px ${DISK.y}px`;
  // way out: 20 sub-frame copies across a 0.9-frame shutter (copy k at opacity 1/(k+1), so each weighs 1/20),
  // softened by a small blur so no contour steps show. Way in: one layer (the disk is round), blurred by speed.
  const N_SUB = outgoing && Math.abs(vel) > 0.5 ? 20 : 1;
  const layers = Array.from({ length: N_SUB }, (_, k) => {
    const back = N_SUB === 1 ? 0 : 1 - k / (N_SUB - 1); // 1 = oldest sub-frame
    return (
      <AbsoluteFill key={k} style={{ transform: `rotate(${ang - vel * 0.9 * back}deg) scale(${sc})`, transformOrigin: origin, opacity: 1 / (k + 1) }}>
        <div style={{ position: "absolute", left: -1500, top: -1500, width: W + 3000, height: H + 3000, background: P.bg }} />
        <Sc k={outgoing ? 0 : 1} f={outgoing ? f + L[1] : f} />
      </AbsoluteFill>
    );
  });
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      {outgoing ? (
        <AbsoluteFill style={{ clipPath: `circle(${iris}px at ${DISK.x}px ${DISK.y}px)` }}>
          <AbsoluteFill style={{ filter: N_SUB > 1 ? "blur(3.5px)" : undefined }}>{layers}</AbsoluteFill>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ filter: Math.abs(vel) > 2 ? `blur(${Math.min(6, Math.abs(vel) * 0.12).toFixed(2)}px)` : undefined }}>{layers}</AbsoluteFill>
      )}
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

const WHIP_AXIS = 33;
/** 3 WHIP PAN: both shots on one strip, a fast pan with horizontal motion blur, cut mid-blur. */
const WhipPan: React.FC<{ f: number }> = ({ f }) => {
  const outgoing = f < 0;
  // the cut sits mid-blur: f-1 is the last smeared Earth, f0 is already a smeared rocket
  const p = outgoing ? mv(f, -7, 0, 0, 1, IN) : mv(f, -1, 6, 0, 1, OUT);
  const x = outgoing ? p * 1300 : -(1 - p) * 1300;
  const blur = outgoing ? p * 70 : (1 - p) * 70;
  const id = `whip${Math.round(blur)}`;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-150%" y="-100%" width="400%" height="300%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${Math.max(0.01, blur)} 0`} />
        </filter>
      </svg>
      {/* translate and blur along the rocket's axis (33° below horizontal, down-right): one axis for both shots */}
      <AbsoluteFill style={{ transform: `rotate(${WHIP_AXIS}deg)`, transformOrigin: "50% 50%", filter: blur > 1 ? `url(#${id})` : undefined }}>
        <AbsoluteFill style={{ transform: `translateX(${x}px) rotate(${-WHIP_AXIS}deg)`, transformOrigin: "50% 50%" }}>
          {outgoing ? <Sc k={2} f={f + 120} overscan /> : <Sc k={3} f={f} overscan />}
        </AbsoluteFill>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: -700, top: -700, width: W + 1400, height: H + 1400, transform: `rotate(${WHIP_AXIS}deg)` }}>
        <SpeedLines f={f + 40} seed={33} color={P.ink} dir={1} count={14} width={W + 1400} bottom={H + 1400} opacity={0.5 * (blur / 70)} />
      </div>
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
      <AbsoluteFill style={{ transform: `translateX(${split}px)`, mixBlendMode: "screen", opacity: heavy ? 0.45 : 0.2 }}>
        <Sc k={base} f={bf} lite bare />
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
  const zAt = (t: number) => (t < -10 ? 1 + 0.04 * mv(t, -24, -10, 0, 1) : 1.04 + 34 * mv(t, -10, 4, 0, 1, Easing.bezier(0.6, 0, 0.95, 0.6)));
  const z = zAt(f);
  // zoom blur while the scale grows faster than 1.2x per frame (the blur is in layer pixels, so divide by z)
  const ratio = z / zAt(f - 1);
  const zBlur = ratio > 1.15 ? Math.min(10, (ratio - 1) * 14) / z : 0;
  const inner = interpolate(f, [-10, 8], [1.7, 1], { ...clamp, easing: OUT });
  const glyphIn = `translate(${(1 - slam) * -500}px, 0) skewX(${(1 - slam) * 16}deg) scale(${1 + (1 - slam) * 0.3})`;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      {/* the next shot sits behind, already moving */}
      <AbsoluteFill style={{ transform: `scale(${inner})`, transformOrigin: `${visor(f).x}px ${visor(f).y}px` }}>
        <Sc k={7} f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${HOLE_C.x}px ${HOLE_C.y}px`, filter: zBlur > 0.5 ? `blur(${zBlur.toFixed(2)}px)` : undefined }}>
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

/** 8 MORPH: a lime ring locks onto the visor, the picture irises away, the ring twists 180° into the
 *  outline of the Anton 8 (both resampled by arc length), and the glyph fills on the landing. */
type Pt = [number, number];
const N8 = EIGHT_OUTER.length / 2;
const signedArea = (pts: Pt[]) => pts.reduce((a, p, i) => a + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0) / 2;
/** Unit shapes for the circle → Anton 8 morph: ring of radius 1, glyph outline at size 1 (pre-rotated 180°), aligned. */
const MORPH_UNIT = (() => {
  const k = 1 / EIGHT_UPM;
  const target: Pt[] = Array.from({ length: N8 }, (_, i) => [-(EIGHT_OUTER[2 * i] - E8_CX_U) * k, (EIGHT_OUTER[2 * i + 1] - E8_CY_U) * k]);
  let ring: Pt[] = Array.from({ length: N8 }, (_, i) => {
    const t = (i / N8) * Math.PI * 2;
    return [Math.cos(t), Math.sin(t)];
  });
  if (Math.sign(signedArea(ring)) !== Math.sign(signedArea(target))) ring = ring.reverse();
  const R = 0.43; // compare at a radius close to the glyph's half-height
  let best = 0;
  let bestD = Infinity;
  for (let off = 0; off < N8; off++) {
    let d = 0;
    for (let i = 0; i < N8; i += 4) {
      const q = target[(i + off) % N8];
      d += (ring[i][0] * R - q[0]) ** 2 + (ring[i][1] * R - q[1]) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = off;
    }
  }
  return { ring, target: ring.map((_, i) => target[(i + best) % N8]) };
})();
/** Outline path at progress m: a circle (c0, r0) twisting 180° into the Anton 8 outline centred on c1 at `size`. */
const morphPath = (m: number, c0x: number, c0y: number, r0: number, c1x: number, c1y: number, size: number) => {
  const cx = c0x + (c1x - c0x) * m;
  const cy = c0y + (c1y - c0y) * m;
  const rot = Math.PI * m;
  const pts = MORPH_UNIT.ring.map(([x, y], i) => {
    const [tx, ty] = MORPH_UNIT.target[i];
    const lx = x * r0 + (tx * size - x * r0) * m;
    const ly = y * r0 + (ty * size - y * r0) * m;
    return [cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)] as Pt;
  });
  return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
};
/** The 8's two counters, cut back in black, growing from nothing to full size. */
const Counters: React.FC<{ x: number; y: number; size: number; p: number }> = ({ x, y, size, p }) => (
  <g transform={eightAt(x, y, size)}>
    {EIGHT_COUNTERS.map((c, i) => (
      <path key={i} d={c.d} fill={P.bg} transform={`translate(${c.cx} ${c.cy}) scale(${p}) translate(${-c.cx} ${-c.cy})`} />
    ))}
  </g>
);
const Morph: React.FC<{ f: number }> = ({ f }) => {
  const draw = mv(f, -26, -16, 0, 1, OUT);
  const iris = mv(f, -20, -8, 0, 1, E);
  const fade = mv(f, -14, -6, 0, 1, E);
  // the outline lands exactly on the glyph's own outline at f-4, holds a beat, then fills on the hit
  const m = mv(f, -16, -4, 0, 1, E);
  const fill = mv(f, -4, 2, 0, 1, E);
  const v = visor(f + 120);
  const c = 2 * Math.PI * RING_R;
  const holeR = interpolate(iris, [0, 1], [1500, RING_R - 2]);
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: 1 - fade, clipPath: `circle(${holeR}px at ${v.x}px ${v.y}px)` }}>
        <Sc k={7} f={f + 120} bare />
      </AbsoluteFill>
      {f >= -4 && <SpeedLines f={f + 200} seed={81} color={P.surface} count={18} opacity={mv(f, -4, 2)} />}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {m <= 0 ? (
          <circle cx={v.x} cy={v.y} r={RING_R} fill="none" stroke={P.accent} strokeWidth={24 + 20 * fade} strokeDasharray={c} strokeDashoffset={c * (1 - draw)} transform={`rotate(-90 ${v.x} ${v.y})`} />
        ) : (
          <path d={morphPath(m, v.x, v.y, RING_R, E8.cx, E8.cy, E8.size)} fill="none" stroke={P.accent} strokeWidth={(f < -4 ? 30 - 16 * mv(f, -8, -4) : 14) * (1 - fill)} strokeLinejoin="round" />
        )}
        {fill > 0 && (
          <>
            <clipPath id={`fillwipe${f}`}>
              <rect x={0} y={E8.cy + E8.size * 0.47 - fill * E8.size * 0.96} width={W} height={E8.size} />
            </clipPath>
            <g clipPath={`url(#fillwipe${f})`}>
              <path d={EIGHT_OUTER_D} fill={P.accent} transform={eightAt(E8.cx, E8.cy, E8.size)} />
            </g>
            <Counters x={E8.cx} y={E8.cy} size={E8.size} p={fill} />
          </>
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
  7: [32, 8, ZoomThrough],
  8: [26, 3, Morph],
};

// ─── Chip: the small numbered label naming the move as it happens ─────────────────────────────────
const CHIP_AT = [0, 14, 153, 278, 391, 509, 637, 733, 859];
const Chip: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < CHIP_AT[1] || frame >= RECAP) return null;
  let k = 1;
  for (let i = 1; i <= 8; i++) if (frame >= CHIP_AT[i]) k = i;
  const since = frame - CHIP_AT[k];
  const enter = mv(frame, CHIP_AT[1], CHIP_AT[1] + 8, 0, 1, OUT);
  const roll = k === 1 ? 1 : mv(since, 0, 8, 0, 1, OUT);
  const wipe = mv(since, 0, 6, 0, 1, OUT);
  const exitP = mv(frame, RECAP - 8, RECAP, 0, 1, IN);
  const num = (n: number) => String(n).padStart(2, "0");
  // steps aside while the hook irises and spins (f28-41), so it never notches the circle
  const aside = frame < 28 || frame >= 41 ? 1 : frame < 34 ? mv(frame, 28, 30, 1, 0) : mv(frame, 38, 41, 0, 1);
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
        opacity: aside,
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
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.08 - 0.05 * p}) translateX(${k === 8 ? 200 : 0}px)` }}>
        <Sc k={k} f={70 + since} bare lite />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 1010,
          background: P.bg,
          padding: "34px 34px 26px",
          transform: `translateX(${(1 - p) * -60}px) skewX(${-8 * (1 - p)}deg)`,
          transformOrigin: "0% 100%",
        }}
      >
        <div style={{ fontFamily: T.display, fontSize: 300, lineHeight: 0.9, color: P.accent }}>{String(k).padStart(2, "0")}</div>
        <div style={{ fontFamily: T.body, fontWeight: 800, fontSize: 44, letterSpacing: "0.06em", color: P.ink, marginTop: 14 }}>{NAMES[k - 1]}</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── 9th mini-morph: the payoff's lime full stop twists into the end card's 8 ─────────────────────
// Positions measured from renders: the dot at END-12 and the EndCard motif slot (184×360, align left).
const MINI = { at: END - 12, dot: { x: 894.5, y: 1165.5, r: 51 }, eight: { x: 171.5, y: 635.5, size: (360 * EIGHT_UPM) / (EIGHT_BBOX[3] - EIGHT_BBOX[1]) } };

// ─── Payoff: NOW / STEAL / THEM. ──────────────────────────────────────────────────────────────────
const Payoff: React.FC<{ frame: number }> = ({ frame }) => {
  const f = frame - PAYOFF;
  const words = ["NOW", "STEAL", "THEM"];
  const push = 1 + 0.03 * mv(f, 30, 90, 0, 1, (t) => t);
  const dot = mv(f, 27, 33, 0, 1, OUT);
  const save = mv(f, 38, 46, 0, 1, OUT);
  const leaveAt = (t: number) => mv(t, MINI.at - PAYOFF, MINI.at - PAYOFF + 6, 0, 1, IN);
  const leave = leaveAt(f);
  const leaveBlur = Math.min(60, 0.35 * (leaveAt(f) - leaveAt(f - 1)) * 1540);
  const slideAt = (t: number, a: number) => mv(t, a - 6, a, 0, 1, OUT);
  const fm = frame - MINI.at;
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <SpeedLines f={f} seed={91} color={P.surface} count={20} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "80px 900px" }}>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          {words.map((_, i) => {
            const a = i * 15;
            const sb = i === 0 ? 0 : Math.min(30, 0.25 * 1200 * (slideAt(f, a) - slideAt(f - 1, a)));
            return (
              <filter key={i} id={`pw${i}-${frame}`} x="-50%" y="0%" width="200%" height="100%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={`${Math.max(0.01, sb)} 0`} />
              </filter>
            );
          })}
          <filter id={`pl-${frame}`} x="-100%" y="0%" width="300%" height="100%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${Math.max(0.01, leaveBlur)} 0`} />
          </filter>
        </svg>
        <div style={{ position: "absolute", left: 80, top: 300, filter: leaveBlur > 0.5 ? `url(#pl-${frame})` : undefined, opacity: leave >= 1 ? 0 : 1 }}>
          {words.map((w, i) => {
            const a = i * 15;
            // NOW is there on the cut; STEAL and THEM slide in and land exactly on their beats
            const p = i === 0 ? 1 : slideAt(f, a);
            const moving = i > 0 && p > 0 && p < 1;
            const settle = i === 0 ? 1 + 0.06 * (1 - mv(f, 0, 4, 0, 1, OUT)) : 1;
            return (
              <div
                key={w}
                style={{
                  filter: moving ? `url(#pw${i}-${frame})` : undefined,
                  transformOrigin: "0% 100%",
                  fontFamily: T.display,
                  fontSize: 360,
                  lineHeight: 0.88,
                  color: P.ink,
                  letterSpacing: "-0.01em",
                  transform: `translateX(${(1 - p) * -1200 - leave * (1300 + i * 120)}px) skewX(${(1 - p) * 18 + leave * 16}deg) scale(${settle})`,
                  opacity: f < a - 6 ? 0 : 1,
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
                      opacity: fm >= 0 ? 0 : 1,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 86, top: 1380, fontFamily: T.body, fontWeight: 600, fontSize: 52, color: P.ink, opacity: leave >= 1 ? 0 : save, filter: leaveBlur > 0.5 ? `url(#pl-${frame})` : undefined, transform: `translateY(${(1 - save) * 30}px) translateX(${-leave * 1300}px)` }}>
          Save these for your next edit.
        </div>
      </AbsoluteFill>
      {fm >= 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <path d={morphPath(mv(fm, 0, 9, 0, 1, E), MINI.dot.x, MINI.dot.y, MINI.dot.r, MINI.eight.x, MINI.eight.y, MINI.eight.size)} fill={P.accent} />
          {fm >= 8 && <Counters x={MINI.eight.x} y={MINI.eight.y} size={MINI.eight.size} p={mv(fm, 8, 12, 0, 1, E)} />}
        </svg>
      )}
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
  { name: "whoosh-short", at: L[3] - 7, volume: 0.95 },
  { name: "impact", at: L[3], volume: 0.5 },
  { name: "swish-reverse", at: L[3] - 16, volume: 0.25 },
  // 4 paper tear
  { name: "tear", at: L[4] - 12, volume: 1.0 },
  { name: "sub-drop", at: L[4], volume: 0.4 },
  { name: "paper", at: L[4] - 2, volume: 0.5 },
  // 5 ink bleed
  { name: "swish-reverse", at: L[5] - 20, volume: 0.35 },
  { name: "splat", at: L[5] - 4, volume: 0.6 },
  // 6 glitch
  { name: "glitch", at: L[6] - 4, volume: 0.6 },
  { name: "glitch", at: L[6], volume: 0.45 },
  // 7 zoom-through
  { name: "impact", at: L[7] - 32, volume: 0.45 },
  { name: "whoosh", at: L[7] - 11, volume: 0.7 },
  { name: "sub-drop", at: L[7], volume: 0.5 },
  // 8 morph
  { name: "swish-reverse", at: L[8] - 18, volume: 0.45 },
  { name: "pop", at: L[8], volume: 0.6 },
  { name: "impact", at: L[8], volume: 0.6 },
  { name: "sub-drop", at: L[8], volume: 0.45 },
  // recap + payoff
  ...RECAP_AT.slice(0, 8).map((at) => ({ name: "tick" as const, at, volume: 0.55 })),
  { name: "riser", at: PAYOFF - 72, volume: 0.45 },
  { name: "impact", at: PAYOFF, volume: 0.6 },
  { name: "click", at: PAYOFF + 15, volume: 0.6 },
  { name: "impact", at: PAYOFF + 30, volume: 0.7 },
  { name: "sub-drop", at: PAYOFF + 30, volume: 0.55 },
  { name: "swish-reverse", at: MINI.at - 2, volume: 0.4 },
  { name: "pop", at: MINI.at + 9, volume: 0.55 },
  { name: "shimmer", at: END + 4, volume: 0.4 },
];
// type hits: a tick on every hero line
const HERO_LINES = [0, 2, 2, 2, 0, 2, 3, 2, 2];
for (let k = 1; k <= 8; k++) for (let i = 0; i < HERO_LINES[k]; i++) SFX.push({ name: "click", at: L[k] + 15 + i * 15, volume: 0.35 });
// beat 3: the re-smash
for (let k = 1; k <= 8; k++) SFX.push({ name: "tick", at: L[k] + 45, volume: 0.45 });
// beat 4: the punch-in
for (let k = 1; k <= 8; k++) SFX.push({ name: "tick", at: L[k] + 60, volume: 0.4 });

/** End-card element bands (measured from a render) and when each one is wiped open, in frames after END. */
const END_REVEALS = [
  { y0: 846, y1: 1112, at: 0 },
  { y0: 1132, y1: 1160, at: 3 },
  { y0: 1170, y1: 1240, at: 5 },
  { y0: 1240, y1: 1320, at: 7 },
];

/** Music bed: 0.5, dipped about 4 dB in the middle of every scene so the transition hits stand out. */
const musicVolume = (fr: number) => {
  let duck = 0;
  for (let k = 1; k <= 8; k++) {
    const f = fr - L[k];
    duck = Math.max(duck, Math.min(mv(f, 22, 32, 0, 1, (t) => t), 1 - mv(f, 90, 100, 0, 1, (t) => t)));
  }
  const fade = Math.min(1, fr / 4, (TRANSITIONS_TO_STEAL_DURATION - fr) / 60);
  return 0.5 * (1 - 0.37 * duck) * Math.max(0, fade);
};

// ─── Main ──────────────────────────────────────────────────────────────────────────────────────────
export const TransitionsToSteal: React.FC = () => {
  const frame = useCurrentFrame();

  let body: React.ReactNode = null;
  if (frame >= END) {
    const drift = 1 + 0.04 * mv(frame, END, TRANSITIONS_TO_STEAL_DURATION, 0, 1, (t) => t);
    body = (
      <AbsoluteFill style={{ transform: `scale(${drift})`, transformOrigin: "80px 960px" }}>
        <EndCard system={S} align="left" motif={<div style={{ width: 184, height: 360 }} />} />
        {/* staggered reveals over the kit's card: wordmark, rule, then the two lines, each wiped open */}
        {END_REVEALS.map((r, i) => {
          const q = mv(frame, END + r.at, END + r.at + 9, 0, 1, E);
          return q < 1 ? <div key={i} style={{ position: "absolute", left: 60 + 960 * q, top: r.y0, width: 980, height: r.y1 - r.y0, background: P.bg }} /> : null;
        })}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <path d={EIGHT_D} fill={P.accent} transform={eightAt(MINI.eight.x, MINI.eight.y, MINI.eight.size)} />
        </svg>
      </AbsoluteFill>
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
      <Audio src={staticFile("music/pulse-minimal-120.m4a")} startFrom={120} volume={musicVolume} />
      {SFX.map((s, i) => (
        <Sfx key={i} name={s.name} at={s.at} volume={s.volume} />
      ))}
    </AbsoluteFill>
  );
};
