import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Audio, getInputProps, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { systems } from "../design/systems";
import { boil, ClayMaterial, clayify, latheBody, onTwos, smoothProfile } from "../kit/Clay";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";

// Claymation: "Monday Morning, in Clay". Design system: Pastel Lab (squash-and-stretch is its signature).
// Everything 3D is stop-motion on twos (15fps) with per-step boil. Music: clay-hop-120 (beat = 15 frames).
const S = systems.pastelLab;
const P = S.palette;
const T = S.type;
const BOUNCE = ease.of(S);

// Set colours, all from the palette: cream wall, blue desk, mint hero, pink "noise", white mug and laptop.
const C = {
  wall: P.bg,
  desk: P.accent2,
  hero: P.accent3,
  noise: P.accent,
  white: P.surface,
  ink: P.ink,
  muted: P.muted,
};

// ─── Timeline (frames @30fps; one beat = 15) ────────────────────────────────────────────────
const WIDE_WAKE = 60;
const EYES_CU = 105;
const EYES_OPEN = 112;
const HOP1_CUT = 135;
const HOP1_TAKE = 153;
const HOP1_LAND = 165; // ring stops here
const HOP2_TAKE = 184;
const HOP2_LAND = 198;
const COFFEE = 210;
const SNIFF = 255;
const AWAKE = 300;
const AWAKE_POP = 306;
const LAPTOP = 345;
const LID_OPEN: [number, number] = [347, 371];
const SCREEN_CU = 390;
const PILE = 420;
const DETERMINED = 465;
const SQUISH = 495;
const LANDS = [510, 540, 570, 600, 615, 630, 645];
const GAG_TAKE = 663;
const GAG_LAND = 675;
const PEEL = 705;
const ROLL_BACK = 720;
const BIG_TAKE = 756;
const BIG_LAND = 780;
const OFF_TAKE = 800;
const OFF_LAND = 812;
const STACK = 816; // pancakes fly to the stack, one every 5 frames
const MUG_TAKE = 858;
const MUG_LAND = 870;
const TITLE = 900;
const CALM_CU = 990;
const FINAL = 1080;
const DING = 1110;
const END = 1170;
export const MONDAY_IN_CLAY_DURATION = END + END_CARD_FRAMES;

const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = ease.sineInOut) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
type V3 = [number, number, number];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ─── Layout (desk top is y = 0; camera looks down -z) ────────────────────────────────────────
const HOME: V3 = [-0.42, 0, 0.12];
const CLOCK: V3 = [-0.95, 0, 0.92];
const MUG: V3 = [-1.08, 0, -0.18];
const LAPTOP_AT: V3 = [0.38, 0, -0.85];
const STACK_AT: V3 = [0.32, 0, 0.5];
const REST: V3 = [-0.32, 0, 0.58];
const BALL_R = 0.14;
const PANCAKE_H = 0.055;
const CLOCK_TOP = 0.66;
const CLOCK_SQUASHED_TOP = 0.36;

// Notification balls: where each lands, when it pops out of the screen, and when it gets squished.
const BALLS = [
  { at: [0.18, 0, 0.12] as V3, pop: 393, squish: LANDS[0] },
  { at: [0.62, 0, 0.02] as V3, pop: 399, squish: LANDS[1] },
  { at: [0.95, 0, 0.36] as V3, pop: 405, squish: LANDS[2] },
  { at: [0.55, 0, 0.5] as V3, pop: 411, squish: LANDS[3] },
  { at: [0.12, 0, 0.62] as V3, pop: 417, squish: LANDS[4] },
  { at: [0.42, 0, 0.98] as V3, pop: 423, squish: LANDS[5] },
  { at: [0.85, 0, 0.9] as V3, pop: 429, squish: LANDS[6] },
  { at: [-0.18, 0, 1.15] as V3, pop: 435, squish: BIG_LAND }, // the one that dodges
];
const GAG_DODGE: V3 = [-0.62, 0, 1.45];
const GAG_BACK: V3 = [0.27, 0, 1.4];
const pendingAt = (f: number) => BALLS.filter((b) => f >= b.pop + 4 && f < b.squish).length;

// ─── Blob path: hops between surfaces ────────────────────────────────────────────────────────
type Hop = { take: number; land: number; from: V3; to: V3; h: number; ant?: number; big?: boolean; splat?: boolean };
const BALL_TOP = (i: number): V3 => [BALLS[i].at[0], PANCAKE_H, BALLS[i].at[2]];
const HOPS: Hop[] = [
  { take: HOP1_TAKE, land: HOP1_LAND, from: HOME, to: [CLOCK[0], CLOCK_SQUASHED_TOP, CLOCK[2]], h: 0.85, ant: 14 },
  { take: HOP2_TAKE, land: HOP2_LAND, from: [CLOCK[0], CLOCK_TOP, CLOCK[2]], to: HOME, h: 0.35, ant: 4 },
  ...LANDS.map((land, i) => ({
    take: land - (i < 4 ? 12 : 9),
    land,
    from: i === 0 ? HOME : BALL_TOP(i - 1),
    to: BALL_TOP(i),
    h: i < 4 ? 0.55 : 0.4,
    ant: i < 4 ? 8 : 4,
  })),
  { take: GAG_TAKE, land: GAG_LAND, from: BALL_TOP(6), to: [BALLS[7].at[0], 0, BALLS[7].at[2]], h: 0.5, ant: 6, splat: true },
  { take: BIG_TAKE, land: BIG_LAND, from: [BALLS[7].at[0], 0, BALLS[7].at[2]], to: [GAG_BACK[0], PANCAKE_H, GAG_BACK[2]], h: 1.45, ant: 21, big: true },
  { take: OFF_TAKE, land: OFF_LAND, from: [GAG_BACK[0], PANCAKE_H, GAG_BACK[2]], to: REST, h: 0.45, ant: 5 },
];

const blobAt = (f: number) => {
  let pos: V3 = HOME;
  let s = 1; // squash: <1 squashed, >1 stretched (volume preserving)
  let air = false;
  for (const hop of HOPS) {
    if (f < hop.take - (hop.ant ?? 6)) break;
    const ant = hop.ant ?? 6;
    if (f < hop.take) {
      pos = hop.from;
      s = 1 - m(f, hop.take - ant, hop.take, 0, hop.big ? 0.5 : 0.3, ease.sineInOut);
    } else if (f < hop.land) {
      const t = (f - hop.take) / (hop.land - hop.take);
      const p = lerp3(hop.from, hop.to, t);
      p[1] += hop.h * 4 * t * (1 - t);
      pos = p;
      s = t < 0.5 ? 1.28 - t * 0.5 : 1.03 + (t - 0.5) * 0.15;
      air = true;
    } else {
      pos = hop.to;
      const k = f - hop.land;
      if (hop.splat) s = k < 2 ? 0.2 : 0.24;
      else {
        const seq = hop.big ? [0.42, 0.55, 1.18, 0.92, 1.04, 1] : [0.6, 0.86, 1.12, 0.96, 1];
        s = seq[Math.min(seq.length - 1, Math.floor(k / 2))];
      }
      air = false;
    }
  }
  // the clock sinks while the blob sits on it, then springs the blob off
  if (f >= HOP1_LAND && f < HOP2_TAKE) pos = [CLOCK[0], clockSquash(f) * CLOCK_TOP, CLOCK[2]];
  // splat: flat for a beat, then it peels itself back up
  if (f >= GAG_LAND && f < BIG_TAKE - 21) {
    const seq = [0.24, 0.24, 0.36, 0.55, 0.8, 1.16, 0.93, 1.03, 1];
    s = f < PEEL ? (f < GAG_LAND + 2 ? 0.2 : 0.24) : seq[Math.min(seq.length - 1, 2 + Math.floor((f - PEEL) / 2))];
  }
  return { pos, s, air };
};

// ─── Clock ───────────────────────────────────────────────────────────────────────────────────
const clockSquash = (f: number) => {
  if (f < HOP1_LAND) return 1;
  if (f < HOP2_TAKE) return f < HOP1_LAND + 2 ? 0.5 : 0.55;
  const seq = [0.55, 1.3, 0.82, 1.12, 0.95, 1.03, 1];
  return seq[Math.min(seq.length - 1, Math.floor((f - HOP2_TAKE) / 2))];
};
const ringing = (f: number) => f < HOP1_LAND;

// ─── Camera: a cut list, each shot drifting slightly (also on twos) ──────────────────────────
type Shot = { at: number; target: V3; from: V3; push?: number; fov: number; shake?: number };
const shot = (at: number, target: V3, offset: V3, fov: number, push = 0.05, shake = 0): Shot => ({
  at,
  target,
  from: [target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]],
  fov,
  push,
  shake,
});
const ballCam = (i: number, offset: V3, fov = 34): Shot => shot(LANDS[i] - 12, [BALLS[i].at[0], 0.22, BALLS[i].at[2]], offset, fov, 0.04);
const SHOTS: Shot[] = [
  shot(0, [CLOCK[0], 0.66, CLOCK[2]], [0.08, 0.1, 2.05], 38, 0.08),
  shot(30, [CLOCK[0] + 0.32, 0.45, CLOCK[2] - 0.35], [1.05, 0.12, 1.45], 38, 0.1),
  shot(WIDE_WAKE, [-0.45, 0.25, 0.35], [0.4, 2.5, 2.8], 40, 0.05),
  shot(EYES_CU, [HOME[0], 0.42, HOME[2]], [0.1, 0.16, 2.05], 34, 0.06),
  shot(HOP1_CUT, [-0.68, 0.55, 0.55], [1.45, 0.45, 1.9], 40, 0.03),
  shot(HOP1_LAND, [CLOCK[0], 0.55, CLOCK[2]], [0.35, 0.05, 2.0], 38, 0.05),
  shot(COFFEE, [MUG[0] - 0.11, 0.52, MUG[2] - 0.11], [-1.2, 0.45, 1.2], 34, 0.07),
  shot(SNIFF, [-0.66, 0.4, 0.0], [-1.25, 1.35, -0.62], 38, 0.05),
  shot(AWAKE, [HOME[0] + 0.08, 0.44, HOME[2]], [0.05, 0.12, 2.1], 34, 0.07),
  shot(LAPTOP, [LAPTOP_AT[0] - 0.05, 0.3, LAPTOP_AT[2] + 0.05], [0.35, 0.62, 1.75], 40, 0.05),
  shot(SCREEN_CU, [LAPTOP_AT[0] - 0.05, 0.5, LAPTOP_AT[2] + 0.2], [-0.15, 0.1, 1.6], 42, 0.03),
  shot(PILE, [0.1, 0, 0.55], [0.0, 4.3, 1.4], 41, 0.05),
  shot(DETERMINED, [HOME[0], 0.46, HOME[2]], [0.3, 0.12, 2.65], 32, 0.08),
  shot(LANDS[0] - 12, [-0.1, 0.35, 0.15], [-0.9, 1.3, 2.4], 38, 0.04),
  ballCam(1, [0.3, 0.85, 1.9], 38),
  shot(LANDS[2] - 12, [0.6, 0.25, 0.42], [0.0, 3.6, 2.2], 40, 0.03),
  shot(LANDS[3] - 12, [BALLS[3].at[0], 0.4, BALLS[3].at[2]], [1.2, 0.5, 1.8], 38, 0.04),
  shot(LANDS[4] - 9, [0.45, 0.3, 0.7], [-0.25, 1.4, 3.1], 38, 0.0),
  ballCam(6, [0.5, 0.2, 2.1], 38),
  shot(GAG_TAKE - 6, [0.3, 0.4, 1.05], [-0.1, 1.1, 2.9], 40, 0.03),
  shot(GAG_LAND, [BALLS[7].at[0], 0.1, BALLS[7].at[2]], [0.0, 2.6, 3.0], 40, 0.06),
  shot(ROLL_BACK, [0.12, 0.3, 1.32], [0.9, 0.45, 1.9], 40, 0.05),
  shot(BIG_TAKE - 6, [0.1, 1.05, 1.25], [0.05, -0.2, 2.7], 46, 0.06),
  shot(BIG_LAND, [GAG_BACK[0] - 0.1, 0.22, GAG_BACK[2] - 0.15], [0.2, 0.55, 2.1], 40, 0.05, 1),
  shot(795, [0.0, 0.45, 0.35], [0.05, 2.4, 4.6], 40, 0.04),
  shot(TITLE, [-0.1, 0.86, 0.5], [0.0, 0.55, 3.9], 36, 0.06),
  shot(CALM_CU, [REST[0] + 0.1, 0.6, REST[2]], [-0.05, 0.12, 2.6], 32, 0.06),
  shot(FINAL, [-0.1, 0.8, 0.45], [-0.15, 1.6, 5.0], 40, -0.06),
];

const cameraAt = (f: number) => {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (f >= SHOTS[k].at) i = k;
  const sh = SHOTS[i];
  const next = SHOTS[i + 1]?.at ?? END;
  const t = m(f, sh.at, next, 0, 1, ease.sineInOut);
  const pos = lerp3(sh.from, sh.target, (sh.push ?? 0) * t);
  // stop-motion camera: tiny per-step nudge, plus a kick on the big squish
  const kick = sh.shake ? Math.max(0, 1 - (f - BIG_LAND) / 14) * 0.05 : 0;
  pos[0] += boil(f, 501) * 0.004 + boil(f, 502) * kick;
  pos[1] += boil(f, 503) * 0.004 + boil(f, 504) * kick;
  return { pos, target: sh.target, fov: sh.fov, index: i };
};

const CameraRig: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { pos, target, fov } = cameraAt(f);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 60;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  });
  return null;
};

// ─── Geometry (built once) ───────────────────────────────────────────────────────────────────
const useGeometries = () =>
  useMemo(() => {
    const blob = clayify(
      latheBody(
        smoothProfile([
          [0.0, 0],
          [0.3, 0.0],
          [0.37, 0.06],
          [0.37, 0.24],
          [0.31, 0.44],
          [0.17, 0.58],
          [0.0, 0.62],
        ]),
        72,
      ),
      {
        amp: 0.022,
        freq: 2.6,
        dents: 9,
        dentDepth: 0.016,
        dentRadius: 0.09,
        seed: 3,
        keepBase: 0.0005,
      },
    );
    const ball = clayify(new THREE.SphereGeometry(BALL_R, 48, 32), { amp: 0.008, freq: 6, dents: 2, dentDepth: 0.008, dentRadius: 0.06, seed: 9 });
    const clockBody = clayify(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 64, 3).rotateX(Math.PI / 2), {
      amp: 0.008,
      freq: 4,
      dents: 4,
      dentDepth: 0.01,
      dentRadius: 0.08,
      seed: 4,
    });
    const rim = clayify(new THREE.TorusGeometry(0.29, 0.045, 24, 72), { amp: 0.006, freq: 5, dents: 3, dentDepth: 0.006, dentRadius: 0.05, seed: 6 });
    const bellGeo = clayify(new THREE.SphereGeometry(0.13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), {
      amp: 0.006,
      freq: 6,
      dents: 2,
      dentDepth: 0.008,
      dentRadius: 0.05,
      seed: 5,
    });
    const mug = clayify(
      latheBody(
        smoothProfile(
          [
            [0.0, 0.0],
            [0.19, 0.0],
            [0.205, 0.04],
            [0.21, 0.2],
            [0.215, 0.36],
            [0.2, 0.38],
            [0.18, 0.36],
            [0.17, 0.3],
            [0.0, 0.3],
          ],
          50,
        ),
        64,
      ),
      { amp: 0.007, freq: 4, dents: 4, dentDepth: 0.009, dentRadius: 0.07, seed: 7, keepBase: 0.0005 },
    );
    const handle = clayify(new THREE.TorusGeometry(0.1, 0.032, 20, 40, Math.PI * 1.25), { amp: 0.004, freq: 6, dents: 1, seed: 8 });
    const desk = clayify(new RoundedBoxGeometry(5.2, 0.5, 4.4, 6, 0.12), { amp: 0.012, freq: 0.9, dents: 14, dentDepth: 0.012, dentRadius: 0.22, seed: 10 });
    const lapBase = clayify(new RoundedBoxGeometry(1.5, 0.08, 1.0, 4, 0.035), { amp: 0.004, freq: 2, dents: 5, dentDepth: 0.006, dentRadius: 0.12, seed: 11 });
    const lapLid = clayify(new RoundedBoxGeometry(1.5, 1.0, 0.06, 4, 0.028), { amp: 0.004, freq: 2, dents: 5, dentDepth: 0.006, dentRadius: 0.12, seed: 12 });
    const steam = clayify(new THREE.SphereGeometry(0.07, 24, 16), { amp: 0.01, freq: 9, dents: 1, seed: 13 });
    const wall = clayify(new THREE.PlaneGeometry(14, 9, 60, 40), { amp: 0.03, freq: 0.7, dents: 18, dentDepth: 0.02, dentRadius: 0.3, seed: 14 });
    return { blob, ball, clockBody, rim, bellGeo, mug, handle, desk, lapBase, lapLid, steam, wall };
  }, []);

type Geos = ReturnType<typeof useGeometries>;

// ─── Canvas textures (clock face, keyboard, laptop screen) ───────────────────────────────────
const canvasTex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const useFaceTexture = () =>
  useMemo(
    () =>
      canvasTex(512, 512, (ctx) => {
        ctx.fillStyle = P.surface;
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = P.ink;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const r = i % 3 === 0 ? 20 : 11;
          ctx.beginPath();
          ctx.arc(256 + Math.sin(a) * 196, 256 - Math.cos(a) * 196, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );

const useKeyboardTexture = () =>
  useMemo(
    () =>
      canvasTex(768, 512, (ctx) => {
        ctx.fillStyle = P.surface;
        ctx.fillRect(0, 0, 768, 512);
        ctx.fillStyle = "#DCD7D1";
        const kw = 52;
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 11; c++) {
            ctx.beginPath();
            ctx.roundRect(70 + c * 58 + (r % 2) * 10, 40 + r * 58, kw, 48, 12);
            ctx.fill();
          }
        ctx.beginPath();
        ctx.roundRect(200, 280, 370, 48, 14);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(260, 360, 250, 120, 18);
        ctx.fill();
      }),
    [],
  );

const screenCache = new Map<string, THREE.CanvasTexture>();
const screenTexture = (key: string, count: number, done: boolean) => {
  const hit = screenCache.get(key);
  if (hit) return hit;
  const tex = canvasTex(720, 480, (ctx) => {
    ctx.fillStyle = P.surface;
    ctx.fillRect(0, 0, 720, 480);
    ctx.fillStyle = P.accent2;
    ctx.beginPath();
    ctx.roundRect(40, 36, 640, 44, 22);
    ctx.fill();
    if (done) {
      ctx.fillStyle = P.accent3;
      ctx.beginPath();
      ctx.arc(360, 250, 96, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 22;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(315, 252);
      ctx.lineTo(348, 285);
      ctx.lineTo(408, 218);
      ctx.stroke();
      return;
    }
    // one big dot per unread message, two rows of four
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i < count ? P.accent : "#ECE8E3";
      ctx.beginPath();
      ctx.arc(360 - 3 * 60 + (i % 4) * 120, 215 + Math.floor(i / 4) * 105, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  screenCache.set(key, tex);
  return tex;
};

// ─── Pieces ──────────────────────────────────────────────────────────────────────────────────

/** Soft contact shadow: a radial gradient decal that shrinks and fades as the object leaves the desk. */
let contactTex: THREE.CanvasTexture | null = null;
const Contact: React.FC<{ x: number; z: number; r: number; lift?: number; y?: number; strength?: number }> = ({
  x,
  z,
  r,
  lift = 0,
  y = 0.003,
  strength = 0.42,
}) => {
  if (!contactTex)
    contactTex = canvasTex(256, 256, (ctx) => {
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(40,30,40,1)");
      g.addColorStop(0.45, "rgba(40,30,40,0.55)");
      g.addColorStop(1, "rgba(40,30,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    });
  const k = Math.max(0, 1 - lift / 1.2);
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[r * (0.7 + 0.5 * k), r * (0.7 + 0.5 * k), 1]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={contactTex} transparent opacity={strength * k} depthWrite={false} />
    </mesh>
  );
};

const Eye: React.FC<{ x: number; open: number; happy: boolean; look: number; brow: number; side: number; sY?: number; sXZ?: number }> = ({
  x,
  open,
  happy,
  look,
  brow,
  side,
  sY = 1,
  sXZ = 1,
}) => (
  <group position={[x + look * 0.035, 0.37, 0.305]} scale={[1 / sXZ, 1 / sY, 1]}>
    {happy ? (
      <mesh rotation={[0, 0, 0]} position={[0, -0.01, 0.005]}>
        <torusGeometry args={[0.045, 0.014, 12, 24, Math.PI]} />
        <ClayMaterial color={C.ink} roughness={0.6} repeat={4} />
      </mesh>
    ) : (
      <>
        <mesh scale={[1, Math.max(0.14, open), 1]}>
          <sphereGeometry args={[0.048, 24, 16]} />
          <ClayMaterial color={C.ink} roughness={0.55} repeat={4} />
        </mesh>
        {open > 0.5 && (
          <mesh position={[0.016, 0.022 * open, 0.04]}>
            <sphereGeometry args={[0.013, 12, 8]} />
            <meshBasicMaterial color={P.surface} />
          </mesh>
        )}
      </>
    )}
    {brow > 0.01 && (
      <mesh position={[0, 0.088 - 0.012 * brow, 0.0]} rotation={[0, 0, Math.PI / 2 + side * 0.42 * brow]}>
        <capsuleGeometry args={[0.012, 0.06, 4, 8]} />
        <ClayMaterial color={C.ink} roughness={0.6} repeat={4} />
      </mesh>
    )}
  </group>
);

/** Eye state over time: asleep → snap open → sniff → wide → determined → happy. */
const eyesAt = (f: number) => {
  let open = 1;
  let happy = false;
  let brow = 0;
  let look = 0;
  if (f < EYES_OPEN) open = f < EYES_OPEN - 4 ? 0.12 : 0.5;
  else if (f < EYES_OPEN + 4) open = 1.35;
  // sniffing: eyes close in bliss, then pop wide
  if (f >= SNIFF + 18 && f < AWAKE_POP) open = 0.12;
  if (f >= AWAKE_POP && f < AWAKE_POP + 30) open = f < AWAKE_POP + 4 ? 1.5 : 1.3;
  if (f >= SNIFF && f < SNIFF + 18) look = -0.6;
  if (f >= PILE && f < DETERMINED) look = 0.8;
  if (f >= DETERMINED && f < OFF_LAND) {
    brow = m(f, DETERMINED + 4, DETERMINED + 10, 0, 1, BOUNCE);
    open = Math.min(open, 0.75);
  }
  if (f >= GAG_LAND && f < PEEL) open = 1.25; // surprised, flat
  if (f >= ROLL_BACK && f < BIG_TAKE) look = 0.7;
  if (f >= TITLE + 18) happy = true;
  if (f >= DING && f < DING + 26) {
    happy = false;
    open = f < DING + 6 ? 1.3 : 1;
    look = -0.4;
  }
  if (f >= DING + 26) happy = true;
  // blinks
  for (const bl of [70, 238, 520, 880, 1040]) if (f >= bl && f < bl + 4 && !happy) open = 0.14;
  return { open, happy, brow, look };
};

const Blob: React.FC<{ f: number; g: Geos }> = ({ f, g }) => {
  const { pos, s, air } = blobAt(f);
  const eye = eyesAt(f);
  let sY = s;
  // sleep breathing, idle breathing
  if (f < EYES_OPEN) sY *= 0.9 + 0.04 * Math.sin(f / 9);
  else if (!air && f >= OFF_LAND) sY *= 1 + 0.025 * Math.sin(f / 11);
  // the sniff: stretch toward the mug and inhale
  let lean = 0;
  let turn = 0;
  if (f >= SNIFF && f < AWAKE) {
    lean = m(f, SNIFF, SNIFF + 10, 0, 0.3, BOUNCE) * (1 - m(f, AWAKE - 8, AWAKE, 0, 1));
    turn = -m(f, SNIFF, SNIFF + 8, 0, 1.99, BOUNCE) * (1 - m(f, AWAKE - 8, AWAKE, 0, 1));
    sY *= 1 + m(f, SNIFF + 14, SNIFF + 34, 0, 0.16) * (1 - m(f, AWAKE - 6, AWAKE, 0, 1));
  }
  if (f >= AWAKE_POP && f < AWAKE_POP + 10) sY *= [1.2, 0.9, 1.08, 0.97, 1][Math.floor((f - AWAKE_POP) / 2)];
  // face the action
  if (f >= PILE && f < OFF_LAND) turn = 0.25;
  if (f >= ROLL_BACK && f < BIG_TAKE) turn = 0.5;
  const sXZ = 1 / Math.sqrt(sY);
  const j = (a: number) => boil(f, 11, a);
  return (
    <group>
      <group position={[pos[0] + j(0) * 0.004, pos[1], pos[2] + j(1) * 0.004]} rotation-y={turn + j(2) * 0.02}>
        <group rotation-x={lean}>
          <group scale={[sXZ, sY, sXZ]}>
            <mesh geometry={g.blob} castShadow receiveShadow>
              <ClayMaterial color={C.hero} repeat={1.6} />
            </mesh>
            <Eye x={-0.11} side={-1} {...eye} sY={sY} sXZ={sXZ} />
            <Eye x={0.11} side={1} {...eye} sY={sY} sXZ={sXZ} />
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.2, 0.28, 0.295]} rotation={[0, sd * 0.55, 0]} scale={[1, 0.62, 0.35]}>
                <sphereGeometry args={[0.055, 16, 12]} />
                <ClayMaterial color={C.noise} repeat={4} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
      {!(f >= HOP1_LAND && f < HOP2_TAKE) && <Contact x={pos[0]} z={pos[2]} r={0.42 * sXZ} lift={pos[1]} y={pos[1] > 0.02 && !air ? pos[1] + 0.003 : 0.003} />}
    </group>
  );
};

const Clock: React.FC<{ f: number; g: Geos }> = ({ f, g }) => {
  const face = useFaceTexture();
  const ring = ringing(f);
  const step = onTwos(f) / 2;
  const sq = clockSquash(f);
  const ding = f >= DING && f < DING + 16 ? [1.12, 0.92, 1.05, 0.98, 1, 1, 1, 1][Math.floor((f - DING) / 2)] : 1;
  const sy = sq * ding;
  const sxz = 1 / Math.sqrt(sy);
  const rattle = ring ? (step % 2 ? 1 : -1) : 0;
  const hammer = ring ? (step % 2 ? 0.55 : -0.55) : f >= DING && f < DING + 6 ? 0.5 : 0;
  // minutes tick forward between sections (7:00 → 7:30)
  const minutes = f < COFFEE ? 0 : f < LAPTOP ? 5 : f < SQUISH ? 10 : f < STACK ? 20 : f < FINAL ? 25 : 30;
  const minA = -(minutes / 60) * Math.PI * 2;
  const hourA = -((7 + minutes / 60) / 12) * Math.PI * 2;
  return (
    <group
      position={[CLOCK[0] + rattle * 0.012, rattle !== 0 && step % 4 === 0 ? 0.012 : 0, CLOCK[2]]}
      rotation={[0, 0.18, rattle * 0.06 + boil(f, 21) * 0.01]}
    >
      <group scale={[sxz, sy, sxz]}>
        {/* feet */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 0.17, 0.035, 0]} castShadow>
            <sphereGeometry args={[0.05, 16, 12]} />
            <ClayMaterial color={C.ink} repeat={4} />
          </mesh>
        ))}
        <group position={[0, 0.34, 0]}>
          <mesh geometry={g.clockBody} castShadow receiveShadow>
            <ClayMaterial color={C.noise} repeat={2} />
          </mesh>
          <mesh geometry={g.rim} position={[0, 0, 0.125]} castShadow>
            <ClayMaterial color={C.noise} repeat={3} />
          </mesh>
          <mesh position={[0, 0, 0.13]}>
            <circleGeometry args={[0.255, 48]} />
            <ClayMaterial color={C.white} map={face} bump={1.5} repeat={3} />
          </mesh>
          {/* hands */}
          <mesh position={[0, 0, 0.14]} rotation={[0, 0, hourA]}>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.032, 0.13, 0.016]} />
              <meshStandardMaterial color={C.ink} roughness={0.7} />
            </mesh>
          </mesh>
          <mesh position={[0, 0, 0.15]} rotation={[0, 0, minA]}>
            <mesh position={[0, 0.085, 0]}>
              <boxGeometry args={[0.022, 0.18, 0.014]} />
              <meshStandardMaterial color={C.ink} roughness={0.7} />
            </mesh>
          </mesh>
          <mesh position={[0, 0, 0.16]}>
            <sphereGeometry args={[0.022, 12, 10]} />
            <ClayMaterial color={C.noise} repeat={4} />
          </mesh>
          {/* bells */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * 0.17, 0.25, -0.01]} rotation={[0, 0, sd * -0.55]}>
              <mesh geometry={g.bellGeo} castShadow>
                <ClayMaterial color={C.white} repeat={3} />
              </mesh>
              <mesh position={[0, 0.14, 0]}>
                <sphereGeometry args={[0.025, 12, 10]} />
                <ClayMaterial color={C.ink} repeat={4} />
              </mesh>
            </group>
          ))}
          {/* hammer */}
          <group position={[0, 0.22, -0.02]} rotation={[0, 0, hammer]}>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
              <meshStandardMaterial color={C.ink} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.035, 14, 10]} />
              <ClayMaterial color={C.ink} repeat={4} />
            </mesh>
          </group>
          {/* clay "ring" lines either side, alternating with the hammer */}
          {ring &&
            [-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.36, 0.28, 0]} rotation={[0, 0, sd > 0 ? -0.35 : Math.PI + 0.35]}>
                {[0, 1].map((k) => (
                  <mesh key={k} rotation={[0, 0, -0.7]} visible={(step + k + (sd > 0 ? 1 : 0)) % 2 === 0 || k === 0}>
                    <torusGeometry args={[0.08 + k * 0.07, 0.012, 8, 20, 1.4]} />
                    <ClayMaterial color={C.ink} repeat={4} />
                  </mesh>
                ))}
              </group>
            ))}
        </group>
      </group>
      <Contact x={0} z={0} r={0.42} />
    </group>
  );
};

const mugAt = (f: number) => {
  let pos: V3 = MUG;
  let tilt = 0;
  const stackTop = BALLS.length * PANCAKE_H;
  if (f >= COFFEE && f < SNIFF) {
    const step = Math.floor((f - COFFEE) / 4);
    tilt = (step % 2 ? 1 : -1) * 0.16 * (f < SNIFF - 8 ? 1 : 0.4);
  }
  if (f >= MUG_TAKE) {
    const t = Math.min(1, (f - MUG_TAKE) / (MUG_LAND - MUG_TAKE));
    pos = lerp3(MUG, [STACK_AT[0], stackTop, STACK_AT[2]], t);
    pos[1] += 0.7 * 4 * t * (1 - t);
  }
  let sy = 1;
  if (f >= MUG_TAKE - 6 && f < MUG_TAKE) sy = 0.82;
  if (f >= MUG_LAND && f < MUG_LAND + 8) sy = [0.8, 1.1, 0.96, 1][Math.floor((f - MUG_LAND) / 2)];
  return { pos, tilt, sy, air: f >= MUG_TAKE && f < MUG_LAND };
};

const Mug: React.FC<{ f: number; g: Geos }> = ({ f, g }) => {
  const { pos, tilt, sy, air } = mugAt(f);
  const sxz = 1 / Math.sqrt(sy);
  // pivot the wobble on the bottom edge
  const pivot = tilt > 0 ? 0.2 : -0.2;
  return (
    <group>
      <group position={[pos[0] + pivot, pos[1], pos[2]]} rotation={[0, 0, tilt]}>
        <group position={[-pivot, 0, 0]} scale={[sxz, sy, sxz]} rotation={[0, 0.5 + boil(f, 31) * 0.02, 0]}>
          <mesh geometry={g.mug} castShadow receiveShadow>
            <ClayMaterial color={C.white} repeat={2.4} />
          </mesh>
          <mesh position={[0, 0.315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.172, 40]} />
            <ClayMaterial color={C.ink} roughness={0.45} repeat={2} />
          </mesh>
          <mesh geometry={g.handle} position={[0.215, 0.19, 0]} rotation={[0, 0, -Math.PI * 0.62]} castShadow>
            <ClayMaterial color={C.white} repeat={3} />
          </mesh>
        </group>
      </group>
      {pos[1] < 0.01 && <Contact x={pos[0]} z={pos[2]} r={0.3} />}
      {!air && <Steam f={f} g={g} base={[pos[0], pos[1] + 0.38, pos[2]]} />}
    </group>
  );
};

/** Steam as little white clay puffs that rise, wiggle, swell and shrink away. */
const Steam: React.FC<{ f: number; g: Geos; base: V3 }> = ({ f, g, base }) => {
  if (f < COFFEE - 30) return null;
  const sniffing = f >= SNIFF && f < AWAKE;
  const N = 7;
  const LIFE = 42;
  return (
    <>
      {Array.from({ length: N }, (_, i) => {
        const age = (onTwos(f) + i * (LIFE / N)) % LIFE;
        const t = age / LIFE;
        // while sniffing, the steam bends into the blob's face below its eyes (it faces the mug)
        const pull = sniffing ? m(f, SNIFF + 6, SNIFF + 26) * Math.min(1, t * 1.6) : 0;
        const rise: V3 = [base[0] + Math.sin(t * 6 + i) * 0.05, base[1] + 0.02 + t * 0.62, base[2]];
        const face: V3 = [HOME[0] - 0.3, 0.27, HOME[2] - 0.13];
        const [x, y, z] = lerp3(rise, face, pull);
        const sc = Math.sin(Math.PI * t) * (0.45 + 0.45 * t);
        return (
          <mesh key={i} geometry={g.steam} position={[x, y, z]} scale={[sc, sc * 1.2, sc]} rotation={[0, t * 3, 0]}>
            <ClayMaterial color={C.white} repeat={5} emissive={C.white} emissiveIntensity={0.35} />
          </mesh>
        );
      })}
    </>
  );
};

const lidAngle = (f: number) => {
  if (f < LID_OPEN[0]) return 0;
  const seq = [0.15, 0.45, 0.9, 1.35, 1.7, 1.98, 2.05, 1.92, 1.86, 1.9, 1.88];
  return seq[Math.min(seq.length - 1, Math.floor((f - LID_OPEN[0]) / 2))];
};

const Laptop: React.FC<{ f: number; g: Geos }> = ({ f, g }) => {
  const kb = useKeyboardTexture();
  const a = lidAngle(f);
  const pending = pendingAt(f);
  const done = f >= BIG_LAND;
  const key = done ? "done" : `n${pending}`;
  const scr = screenTexture(key, pending, done);
  const glow = m(f, LID_OPEN[0] + 8, LID_OPEN[1], 0, 1);
  return (
    <group position={LAPTOP_AT} rotation={[0, -0.12, 0]}>
      <mesh geometry={g.lapBase} position={[0, 0.04, 0]} castShadow receiveShadow>
        <ClayMaterial color={C.white} repeat={1.4} />
      </mesh>
      <mesh position={[0, 0.081, 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.32, 0.86]} />
        <ClayMaterial color={C.white} map={kb} bump={0.5} repeat={2} />
      </mesh>
      {/* lid hinged on the back edge; angle 0 = closed */}
      <group position={[0, 0.085, -0.48]} rotation={[Math.PI / 2 - a, 0, 0]}>
        <mesh geometry={g.lapLid} position={[0, 0.5, -0.03]} castShadow receiveShadow>
          <ClayMaterial color={C.white} repeat={1.4} />
        </mesh>
        {a > 0.2 && (
          <mesh position={[0, 0.52, 0.002]}>
            <planeGeometry args={[1.32, 0.84]} />
            <meshBasicMaterial map={scr} color={new THREE.Color(1, 1, 1).multiplyScalar(0.55 + 0.45 * glow)} toneMapped={false} />
          </mesh>
        )}
      </group>
      <Contact x={0} z={0} r={1.0} strength={0.3} />
    </group>
  );
};

/** World position of the screen centre, for balls popping out of it. */
const SCREEN_CENTRE: V3 = [LAPTOP_AT[0] - 0.02, 0.55, LAPTOP_AT[2] - 0.3];

const ballAt = (i: number, f: number) => {
  const b = BALLS[i];
  if (f < b.pop) return null;
  const FLY = 10;
  let pos: V3 = [...b.at];
  let sx = 1;
  let sy = 1;
  let sz = 1;
  let roll = 0;
  let air = false;
  if (f < b.pop + FLY) {
    const t = (f - b.pop) / FLY;
    pos = lerp3(SCREEN_CENTRE, b.at, t);
    pos[1] = SCREEN_CENTRE[1] * (1 - t) + 0.45 * 4 * t * (1 - t) * 0.6;
    const grow = Math.min(1, 0.35 + t * 1.6);
    sx = sy = sz = grow;
    if (t < 0.4) sy *= 1.25;
    air = true;
  } else {
    const k = f - b.pop - FLY;
    // two settling bounces
    const bounces = [0, 0.12, 0.16, 0.12, 0, 0.04, 0.05, 0.03, 0];
    const lift = k < bounces.length * 2 ? bounces[Math.floor(k / 2)] : 0;
    pos[1] = lift;
    if (k < 2 || (k >= 8 && k < 10)) {
      sy = 0.72;
      sx = sz = 1.18;
    }
  }
  // the dodger rolls away, then back to taunt
  if (i === 7 && f >= GAG_TAKE + 2) {
    const tA = m(f, GAG_TAKE + 2, GAG_LAND - 2, 0, 1, ease.sineInOut);
    const tB = m(f, ROLL_BACK, ROLL_BACK + 14, 0, 1, ease.sineInOut);
    const p0 = lerp3(b.at, GAG_DODGE, tA);
    pos = lerp3(p0, GAG_BACK, tB);
    roll = -tA * 4.2 + tB * 3.4;
    if (f >= ROLL_BACK + 16 && f < BIG_TAKE) {
      // taunting wiggle
      const st = Math.floor((f - ROLL_BACK) / 4);
      sy = st % 2 ? 1.12 : 0.9;
      sx = sz = 1 / Math.sqrt(sy);
    }
  }
  // squished
  let flat = false;
  if (f >= b.squish) {
    flat = true;
    const k = f - b.squish;
    const spread = k < 2 ? 1.95 : k < 4 ? 1.75 : 1.8;
    sx = sz = spread;
    sy = (PANCAKE_H / (BALL_R * 2)) * (k < 2 ? 0.8 : 1);
    roll = 0;
    if (i === 7) pos = [...GAG_BACK];
    else pos = [...b.at];
    pos[1] = 0;
    // the big squish makes every other pancake jump
    if (i !== 7 && f >= BIG_LAND && f < BIG_LAND + 8) pos[1] = [0.09, 0.12, 0.05, 0.01][Math.floor((f - BIG_LAND) / 2)];
    // fly to the stack
    const startAt = STACK + i * 5;
    if (f >= startAt) {
      const t = Math.min(1, (f - startAt) / 8);
      const to: V3 = [STACK_AT[0] + (rand(i) - 0.5) * 0.03, i * PANCAKE_H, STACK_AT[2] + (rand(i + 9) - 0.5) * 0.03];
      const from: V3 = i === 7 ? GAG_BACK : b.at;
      pos = lerp3(from, to, t);
      pos[1] = from[1] * (1 - t) + to[1] * t + 0.5 * 4 * t * (1 - t);
      air = t < 1;
    }
  }
  return { pos, sx, sy, sz, roll, air, flat };
};

const Ball: React.FC<{ i: number; f: number; g: Geos }> = ({ i, f, g }) => {
  const st = ballAt(i, f);
  if (!st) return null;
  const { pos, sx, sy, sz, roll, air, flat } = st;
  const jit = boil(f, 40 + i) * 0.004;
  return (
    <group>
      <group position={[pos[0] + jit, pos[1], pos[2]]} rotation={[0, flat ? rand(i) * 6 : -0.1 + i * 0.04, roll]}>
        <group scale={[sx, sy, sz]} position={[0, 0, 0]}>
          <mesh geometry={g.ball} position={[0, BALL_R, 0]} castShadow receiveShadow>
            <ClayMaterial color={C.noise} repeat={3} />
          </mesh>
          {/* the "!" pressed into the front */}
          <mesh position={[0, BALL_R + 0.025, BALL_R * 0.93]} rotation={[0.15, 0, 0]}>
            <capsuleGeometry args={[0.016, 0.05, 4, 8]} />
            <ClayMaterial color={C.white} repeat={6} />
          </mesh>
          <mesh position={[0, BALL_R - 0.055, BALL_R * 0.9]}>
            <sphereGeometry args={[0.019, 12, 10]} />
            <ClayMaterial color={C.white} repeat={6} />
          </mesh>
        </group>
      </group>
      {!air && pos[1] < 0.2 && <Contact x={pos[0]} z={pos[2]} r={flat ? 0.3 : 0.2} lift={pos[1]} />}
      {air && <Contact x={pos[0]} z={pos[2]} r={0.2} lift={pos[1]} />}
    </group>
  );
};

const Set: React.FC<{ g: Geos }> = ({ g }) => (
  <>
    <mesh geometry={g.desk} position={[0, -0.25, 0.3]} receiveShadow>
      <ClayMaterial color={C.desk} repeat={0.5} />
    </mesh>
    <mesh geometry={g.wall} position={[0, 4.0, -1.9]} receiveShadow>
      <ClayMaterial color={C.wall} repeat={0.35} />
    </mesh>
  </>
);

const Lights: React.FC<{ f: number }> = ({ f }) => {
  const wallTarget = useMemo(() => new THREE.Object3D(), []);
  const flicker = 1 + boil(f, 77) * 0.012;
  return (
    <>
      <hemisphereLight args={["#FFF4EA", "#B9A9C9", 0.9]} />
      <directionalLight
        position={[3.0, 5.6, 4.2]}
        intensity={2.3 * flicker}
        color="#FFE6CC"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={16}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      <directionalLight position={[-4, 2.2, 3]} intensity={0.6} color="#E8EEFF" />
      <directionalLight position={[1.5, 3, -4]} intensity={0.9} color="#FFE9D6" />
      {/* a warm pool of morning light washing the wall behind the desk */}
      <primitive object={wallTarget} position={[0, 1.3, -1.9]} />
      <spotLight position={[0.6, 3.2, 3.5]} target={wallTarget} angle={0.5} penumbra={1} decay={0} intensity={1.6 * flicker} color="#FFF0E0" />
    </>
  );
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const f = onTwos(frame);
  const g = useGeometries();
  return (
    <>
      <CameraRig f={f} />
      <Lights f={f} />
      <Set g={g} />
      <Laptop f={f} g={g} />
      <Clock f={f} g={g} />
      <Mug f={f} g={g} />
      {BALLS.map((_, i) => (
        <Ball key={i} i={i} f={f} g={g} />
      ))}
      <Blob f={f} g={g} />
    </>
  );
};

// ─── Type: Pastel Lab display, landing like clay (squash on arrival, on twos) ────────────────
const squashIn = (f: number, at: number) => {
  if (f < at) return { s: 0, y: 1 };
  const seq: [number, number][] = [
    [0.5, 1.5],
    [1.18, 0.78],
    [0.92, 1.1],
    [1.04, 0.97],
    [1, 1],
  ];
  const k = Math.min(seq.length - 1, Math.floor((f - at) / 2));
  return { s: seq[k][0], y: seq[k][1] };
};

const ClayWord: React.FC<{ text: string; at: number; f: number; size: number; color?: string; out?: number; origin?: string }> = ({
  text,
  at,
  f,
  size,
  color = P.ink,
  out,
  origin = "0% 100%",
}) => {
  if (f < at && at > 0) return null;
  const { s, y } = at === 0 && f < 6 ? { s: 1, y: 1 } : squashIn(f, at);
  const gone = out !== undefined && f >= out ? Math.min(1, (f - out) / 6) : 0;
  return (
    <div
      style={{
        fontFamily: T.display,
        fontWeight: T.displayWeight,
        fontSize: size,
        letterSpacing: `${T.displayTracking}em`,
        lineHeight: 0.94,
        color,
        transform: `scale(${s * (1 - gone)}, ${y * (1 - gone)})`,
        transformOrigin: origin,
        whiteSpace: "pre",
      }}
    >
      {text}
    </div>
  );
};

const Label: React.FC<{ text: string; f: number; at: number }> = ({ text, f, at }) => (
  <div style={{ fontFamily: T.body, fontWeight: 800, fontSize: 44, letterSpacing: "0.02em", color: P.ink, opacity: f >= at ? 1 : 0, marginBottom: 14 }}>
    {text}
  </div>
);

/** Pastel Lab pill for the hook's time stamp (same pill language as the unread counter). */
const TimePill: React.FC = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 30px 14px 18px",
      borderRadius: 999,
      background: P.surface,
      boxShadow: "0 14px 32px rgba(43,43,43,0.14)",
      marginBottom: 22,
    }}
  >
    <div style={{ width: 26, height: 26, borderRadius: 999, background: P.accent }} />
    <div style={{ fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 48, letterSpacing: "-0.01em", color: P.ink }}>7:00 am</div>
  </div>
);

/** Pastel Lab pill: the unread count, knocked down a number with every squish. */
const CounterPill: React.FC<{ f: number; n: number; at: number; first: number }> = ({ f, n, at, first }) => {
  const enter = squashIn(f, first);
  const hit = squashIn(f, at);
  const done = n === 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 26,
        padding: "22px 46px 22px 30px",
        borderRadius: 999,
        background: P.surface,
        boxShadow: "0 18px 40px rgba(43,43,43,0.16)",
        transform: `scale(${enter.s}, ${enter.y})`,
        transformOrigin: "0% 100%",
      }}
    >
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: 999,
          background: done ? P.accent3 : P.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: T.display,
          fontWeight: T.displayWeight,
          fontSize: 104,
          letterSpacing: "-0.04em",
          color: P.ink,
          transform: `scale(${hit.s}, ${hit.y})`,
        }}
      >
        {n}
      </div>
      <div style={{ fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 64, letterSpacing: `${T.displayTracking}em`, color: P.ink, lineHeight: 1 }}>
        {done ? "all clear" : "unread"}
      </div>
    </div>
  );
};

const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const f = onTwos(frame);
  const box = (children: React.ReactNode) => <div style={{ position: "absolute", left: 80, top: 236, width: 920 }}>{children}</div>;
  if (f < WIDE_WAKE)
    return box(
      <>
        <TimePill />
        <ClayWord text="Monday." at={0} f={f} size={150} out={WIDE_WAKE - 6} />
      </>,
    );
  if (f >= COFFEE && f < SNIFF) return box(<ClayWord text={"Coffee\nfirst."} at={COFFEE + 2} f={f} size={128} out={SNIFF - 6} />);
  if (f >= DETERMINED && f < STACK - 6) {
    const pending = pendingAt(f);
    const lastChange = [...LANDS, BIG_LAND].filter((l) => l <= f).pop() ?? DETERMINED;
    return box(<CounterPill f={f} n={pending} at={lastChange} first={DETERMINED} />);
  }
  if (f >= TITLE + 6 && f < END)
    return box(
      <>
        <ClayWord text="Monday," at={TITLE + 6} f={f} size={132} />
        <ClayWord text="handled." at={TITLE + 14} f={f} size={132} origin="0% 0%" />
      </>,
    );
  return null;
};

// ─── Sound ───────────────────────────────────────────────────────────────────────────────────
const Fx: React.FC<{ name: string; at: number; volume?: number; dur?: number }> = ({ name, at, volume = 0.6, dur }) => (
  <Sequence from={at} durationInFrames={dur} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

const MUSIC_IN = 180;
const musicVolume = (f: number) => {
  // f is relative to MUSIC_IN
  const g = f + MUSIC_IN;
  const fadeIn = Math.min(1, f / 10);
  const base = g < SQUISH ? 0.5 : g < BIG_LAND ? 0.55 : g < TITLE ? 0.46 : 0.5;
  const out = Math.max(0, Math.min(1, (MONDAY_IN_CLAY_DURATION - g) / 60));
  // a held breath before the big jump
  const breath = g >= BIG_TAKE - 21 && g < BIG_LAND ? 0.55 : 1;
  return base * fadeIn * out * breath;
};

const SoundDesign: React.FC = () => (
  <>
    <Fx name="ring" at={0} volume={0.62} dur={HOP1_LAND} />
    <Fx name="pop" at={EYES_OPEN} volume={0.5} />
    <Fx name="hop" at={HOP1_TAKE} volume={0.5} />
    <Fx name="splat" at={HOP1_LAND} volume={0.75} />
    <Fx name="boing" at={HOP2_TAKE} volume={0.55} />
    <Fx name="squish" at={HOP2_LAND} volume={0.35} />
    <Sequence from={MUSIC_IN} layout="none">
      <Audio src={staticFile("music/clay-hop-120.m4a")} volume={musicVolume} />
    </Sequence>
    {/* coffee */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
      <Fx key={`c${k}`} name="clink" at={COFFEE + 4 + k * 4} volume={k % 2 ? 0.22 : 0.3} />
    ))}
    <Fx name="steam" at={COFFEE + 6} volume={0.3} />
    <Fx name="sniff" at={SNIFF + 10} volume={0.6} />
    <Fx name="pop" at={AWAKE_POP} volume={0.6} />
    <Fx name="boing" at={AWAKE_POP + 2} volume={0.3} />
    {/* laptop */}
    <Fx name="click" at={LID_OPEN[0]} volume={0.6} />
    <Fx name="whoosh-short" at={LID_OPEN[0] + 2} volume={0.25} />
    <Fx name="click" at={LID_OPEN[0] + 12} volume={0.4} />
    {BALLS.map((b, i) => (
      <Fx key={`p${i}`} name="plop" at={b.pop} volume={0.62 + i * 0.03} />
    ))}
    {BALLS.map((b, i) => (
      <Fx key={`t${i}`} name="tick" at={b.pop + 10} volume={0.25} />
    ))}
    {/* squishes */}
    {HOPS.slice(2).map((h, i) => (
      <Fx key={`h${i}`} name="hop" at={h.take} volume={0.35} />
    ))}
    {LANDS.map((l, i) => (
      <Fx key={`s${i}`} name="squish" at={l} volume={0.8 + i * 0.025} />
    ))}
    <Fx name="whoosh-short" at={GAG_TAKE + 2} volume={0.3} />
    <Fx name="splat" at={GAG_LAND} volume={0.7} />
    <Fx name="squish" at={PEEL + 4} volume={0.3} />
    <Fx name="pop" at={PEEL + 10} volume={0.45} />
    <Fx name="tick" at={ROLL_BACK + 18} volume={0.3} />
    <Fx name="tick" at={ROLL_BACK + 22} volume={0.3} />
    <Fx name="tick" at={ROLL_BACK + 26} volume={0.3} />
    <Fx name="riser" at={BIG_LAND - 72} volume={0.4} />
    <Fx name="hop" at={BIG_TAKE} volume={0.5} />
    <Fx name="splat" at={BIG_LAND} volume={0.9} />
    <Fx name="impact" at={BIG_LAND} volume={0.55} />
    {/* payoff */}
    <Fx name="hop" at={OFF_TAKE} volume={0.3} />
    {BALLS.map((_, i) => (
      <Fx key={`k${i}`} name="tick" at={STACK + i * 5 + 8} volume={0.3} />
    ))}
    <Fx name="hop" at={MUG_TAKE} volume={0.35} />
    <Fx name="clink" at={MUG_LAND} volume={0.5} />
    <Fx name="pop" at={TITLE + 6} volume={0.35} />
    <Fx name="pop" at={TITLE + 14} volume={0.35} />
    <Fx name="steam" at={CALM_CU + 10} volume={0.18} />
    <Fx name="ding" at={DING} volume={0.45} />
    <Fx name="shimmer" at={END + 4} volume={0.22} />
  </>
);

// ─── Composition ─────────────────────────────────────────────────────────────────────────────
export const MondayInClay: React.FC = () =>
  // audio-only pass (for a separate audio render): skip the 3D scene entirely
  getInputProps().audioOnly ? (
    <SoundDesign />
  ) : (
    <AbsoluteFill style={{ background: P.bg }}>
      <Sequence durationInFrames={END} layout="none">
        <AbsoluteFill>
          <ThreeCanvas
            width={1080}
            height={1920}
            shadows="percentage"
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.NeutralToneMapping;
              gl.toneMappingExposure = 1.0;
            }}
          >
            <Scene />
          </ThreeCanvas>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(60,40,50,0.16) 100%)" }} />
        <Overlay />
      </Sequence>
      <Sequence from={END}>
        <EndCard system={S} />
      </Sequence>
      <SoundDesign />
    </AbsoluteFill>
  );
