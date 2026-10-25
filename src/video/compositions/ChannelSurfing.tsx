import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { Music, Sfx } from "../kit/Sfx";
import { Grain } from "../kit/Texture";
import { clamp, ease, rand } from "../kit/motion";
import { CHANNELS, drawChannel, SH, SW, type ChannelId } from "./ChannelSurfingScreens";

// "Channel surfing": a 1970s den, a walnut CRT, and a dial that never stops. Every channel is a different
// motion style from the same studio. Design system: Terracotta Calm. Everything cuts on the 120 BPM grid
// (beat = 15 frames); each channel lasts 8 beats.
const S = systems.terracotta;
const P = S.palette;
const T = S.type;
const OLIVE = P.accent2!;

const BEAT = 15;
const END = 1230;
export const CHANNEL_SURFING_DURATION = END + END_CARD_FRAMES;

// ─── Timeline ───────────────────────────────────────────────────────────────────────────────
type Slot = { from: number; id: ChannelId; offset?: number };
const SLOTS: Slot[] = [
  { from: 0, id: "card" },
  { from: 120, id: "weather" },
  { from: 240, id: "news" },
  { from: 360, id: "cartoon" },
  { from: 480, id: "nature" },
  { from: 600, id: "music" },
  { from: 720, id: "shop" },
  { from: 840, id: "space" },
  // the surf: flips accelerate, each channel resumes mid-show
  { from: 990, id: "weather", offset: 40 },
  { from: 1005, id: "news", offset: 50 },
  { from: 1018, id: "cartoon", offset: 20 },
  { from: 1030, id: "nature", offset: 60 },
  { from: 1040, id: "music", offset: 30 },
  { from: 1048, id: "shop", offset: 40 },
  { from: 1055, id: "space", offset: 80 },
  { from: 1061, id: "weather", offset: 70 },
  { from: 1066, id: "cartoon", offset: 40 },
  { from: 1070, id: "music", offset: 75 },
  { from: 1074, id: "news", offset: 60 },
  { from: 1077, id: "shop", offset: 80 },
  { from: 1080, id: "studio" },
];
const FLIPS = SLOTS.slice(1).map((s) => s.from);

const slotAt = (f: number) => {
  let i = 0;
  for (let k = 0; k < SLOTS.length; k++) if (f >= SLOTS[k].from) i = k;
  const s = SLOTS[i];
  return { id: s.id, t: f - s.from + (s.offset ?? 0), since: f - s.from, index: i };
};

/** 1 at the cut, decaying; a short ramp before it so the burst starts a touch early. */
const staticAmount = (f: number) => {
  let a = 0;
  for (const fl of FLIPS) {
    const s = f - fl;
    const burst = fl >= 990 && fl < 1080 ? 0.55 : 1;
    if (s >= -3 && s < 0) a = Math.max(a, ((s + 3) / 3) * burst);
    else if (s >= 0 && s < 9) a = Math.max(a, (1 - s / 9) ** 1.4 * burst);
  }
  return a;
};

// ─── Camera ─────────────────────────────────────────────────────────────────────────────────
type V3 = [number, number, number];
type Cam = { p: V3; l: V3; f: number };
const SCREEN_C: V3 = [-0.3, 0.95, 0.8];

const CAM: Record<string, Cam> = {
  front: { p: [0, 1.35, 8.8], l: [0, 0.95, 0], f: 36 },
  frontPush: { p: [0, 1.2, 7.7], l: [0, 0.95, 0], f: 36 },
  frontEnd: { p: [0, 1.05, 6.5], l: [0, 0.95, 0], f: 36 },
  screen: { p: [-0.3, 0.95, 5.55], l: SCREEN_C, f: 36 },
  screenIn: { p: [-0.3, 0.95, 5.05], l: SCREEN_C, f: 36 },
  screenClose: { p: [-0.3, 0.95, 4.75], l: SCREEN_C, f: 36 },
  screenL: { p: [-1.2, 1.2, 6.3], l: SCREEN_C, f: 36 },
  screenR: { p: [0.8, 0.8, 6.3], l: SCREEN_C, f: 36 },
  wide34: { p: [3.1, 1.9, 7.6], l: [-0.2, 0.8, 0], f: 38 },
  wide34b: { p: [2.7, 1.7, 6.7], l: [-0.1, 0.85, 0], f: 38 },
  low: { p: [1.7, 0.1, 4.8], l: [-0.2, 1.0, 0.3], f: 44 },
  lowB: { p: [1.4, 0.1, 4.3], l: [-0.15, 1.0, 0.3], f: 44 },
  top: { p: [-2.3, 3.4, 5.4], l: [-0.2, 0.9, 0.4], f: 38 },
  topB: { p: [-1.9, 3.1, 4.9], l: [-0.2, 0.9, 0.4], f: 38 },
  fern: { p: [-2.9, 1.2, 5.6], l: [-1.0, 0.85, 0.5], f: 40 },
  fernB: { p: [-2.5, 1.1, 5.2], l: [-0.8, 0.85, 0.6], f: 40 },
  dial: { p: [0.6, 1.1, 3.7], l: [0.8, 1.06, 0.8], f: 34 },
  dialIn: { p: [0.7, 1.1, 3.2], l: [0.85, 1.06, 0.8], f: 34 },
};

type Shot = { from: number; to: number; a: Cam; b: Cam };
const shots: Shot[] = [];
const addShot = (from: number, to: number, a: keyof typeof CAM, b: keyof typeof CAM = a) => shots.push({ from, to, a: CAM[a], b: CAM[b] });

// hook
addShot(0, 40, "front", "frontPush");
addShot(40, 72, "screen", "screenIn");
addShot(72, 110, "wide34b", "wide34");
// seven channels × (dial cut-away, screen, room angle, second screen angle)
const X: [keyof typeof CAM, keyof typeof CAM][] = [
  ["wide34", "wide34b"],
  ["low", "lowB"],
  ["top", "topB"],
  ["wide34b", "wide34"],
  ["fern", "fernB"],
  ["lowB", "low"],
  ["fern", "fernB"],
];
const Y: [keyof typeof CAM, keyof typeof CAM][] = [
  ["screenL", "screen"],
  ["screenR", "screen"],
  ["screen", "screenIn"],
  ["screenL", "screenIn"],
  ["screenR", "screenIn"],
  ["screenL", "screen"],
  ["screen", "screenIn"],
];
for (let k = 0; k < 7; k++) {
  const s = 120 + k * 120;
  addShot(s - 10, s + 6, "dial", "dialIn");
  addShot(s + 6, s + 40, "screen", "screenIn");
  addShot(s + 40, s + 70, X[k][0], X[k][1]);
  const end = k === 6 ? s + 36 : s + 110;
  addShot(s + 70, end, Y[k][0], Y[k][1]);
}
// space is five seconds long: settle on the screen and push in slowly
addShot(916, 954, "screenR", "screen");
addShot(954, 984, "screen", "screenIn");
// the surf and the payoff
addShot(984, 1020, "screen", "screenIn");
addShot(1020, 1048, "screenL", "screen");
addShot(1048, 1080, "screenIn", "screenClose");
addShot(1080, 1125, "front", "frontPush");
addShot(1125, 1170, "frontPush", "frontEnd");
// the push through the glass lives in cameraAt()

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const cameraAt = (f: number): Cam => {
  if (f >= 1170) {
    // push through the glass: the camera dives at the screen and lands filling the frame
    const u = interpolate(f, [1170, END], [0, 1], { ...clamp, easing: ease.quintInOut });
    const a = CAM.frontEnd;
    const endP: V3 = [-0.3, 0.95, 2.6];
    return { p: lerp3(a.p, endP, u), l: lerp3(a.l, SCREEN_C, Math.min(1, u * 1.6)), f: 36 };
  }
  let sh = shots[0];
  for (const s of shots) if (f >= s.from && f < s.to) sh = s;
  if (f >= shots[shots.length - 1].to) sh = shots[shots.length - 1];
  const u = interpolate(f, [sh.from, sh.to], [0, 1], { ...clamp, easing: ease.sineInOut });
  const p = lerp3(sh.a.p, sh.b.p, u);
  // tiny handheld breath so no framing is dead still
  p[0] += Math.sin(f * 0.11) * 0.012;
  p[1] += Math.cos(f * 0.13) * 0.01;
  return { p, l: lerp3(sh.a.l, sh.b.l, u), f: sh.a.f + (sh.b.f - sh.a.f) * u };
};

// ─── Materials / textures ───────────────────────────────────────────────────────────────────
const useCanvasTexture = (draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 512, repeat: [number, number] = [1, 1]) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    draw(c.getContext("2d")!, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const woodDraw = (base: string, streak: string) => (ctx: CanvasRenderingContext2D, s: number) => {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 160; i++) {
    const y = rand(i * 1.7) * s;
    ctx.strokeStyle = streak;
    ctx.globalAlpha = 0.05 + rand(i * 4.1) * 0.12;
    ctx.lineWidth = 1 + rand(i * 2.3) * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= s; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.015 + i) * (3 + rand(i) * 6));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const wallDraw = (ctx: CanvasRenderingContext2D, s: number) => {
  ctx.fillStyle = "#A9502F";
  ctx.fillRect(0, 0, s, s);
  // wallpaper: faint vertical stripes with a small diamond motif, 70s den
  for (let x = 0; x < s; x += 64) {
    ctx.fillStyle = "rgba(61,44,41,0.10)";
    ctx.fillRect(x, 0, 32, s);
  }
  ctx.fillStyle = "rgba(233,220,201,0.20)";
  for (let y = 32; y < s; y += 128) {
    for (let x = 16; x < s; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x, y + 14);
      ctx.lineTo(x - 10, y);
      ctx.closePath();
      ctx.fill();
    }
  }
};

// ─── The screen (canvas texture + CRT shader) ───────────────────────────────────────────────
const SCREEN_W = 1.64;
const SCREEN_H = 1.23;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tMap;
uniform float uTime;
uniform float uStatic;
uniform float uRoll;
uniform float uCurve;
uniform float uScan;
uniform float uVig;
uniform float uFlash;
uniform float uTint;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 c = vUv * 2.0 - 1.0;
  // barrel curvature
  vec2 off = abs(c.yx) / vec2(5.2, 4.2) * uCurve;
  c = c + c * off * off;
  vec2 uv = c * 0.5 + 0.5;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  // zoom out a touch so the curvature never crops edge-anchored type
  uv = (uv - 0.5) * 1.07 + 0.5;
  // vertical roll during the static burst
  uv.y = fract(uv.y + uRoll);
  float ab = 0.0016 * uScan + uStatic * 0.012;
  vec3 col;
  col.r = texture2D(tMap, uv + vec2(ab, 0.0)).r;
  col.g = texture2D(tMap, uv).g;
  col.b = texture2D(tMap, uv - vec2(ab, 0.0)).b;
  // cheap bloom: wide taps, only the bright parts bleed
  vec3 bl = vec3(0.0);
  bl += texture2D(tMap, uv + vec2(0.007, 0.0)).rgb;
  bl += texture2D(tMap, uv - vec2(0.007, 0.0)).rgb;
  bl += texture2D(tMap, uv + vec2(0.0, 0.009)).rgb;
  bl += texture2D(tMap, uv - vec2(0.0, 0.009)).rgb;
  bl *= 0.25;
  col += max(bl - 0.62, 0.0) * 0.55 * uScan;
  // scanlines and a faint phosphor mask
  float sl = 0.82 + 0.18 * sin(vUv.y * 192.0 * 6.28318);
  col *= mix(1.0, sl, uScan);
  float mask = 0.94 + 0.06 * sin(vUv.x * 512.0 * 6.28318);
  col *= mix(1.0, mask, uScan * 0.7);
  // mains flicker and a slow rolling brightness band
  col *= 1.0 + 0.025 * sin(uTime * 2.4) * uScan;
  col *= 1.0 - 0.07 * uScan * smoothstep(0.0, 1.0, sin(vUv.y * 3.0 - uTime * 0.7) * 0.5 + 0.5);
  // static
  float n = hash(floor(vUv * vec2(420.0, 300.0)) + floor(uTime * 24.0));
  vec3 snow = vec3(mix(0.18, 1.0, n));
  col = mix(col, snow, clamp(uStatic, 0.0, 1.0) * 0.92);
  col += uFlash;
  // vignette + warm cast
  float vd = length(vUv - 0.5);
  col *= 1.0 - uVig * smoothstep(0.32, 0.78, vd) * 0.75;
  col = mix(col, col * vec3(1.04, 0.99, 0.92), uTint);
  // soft glass sheen: a diagonal highlight in the top-left
  float sheen = smoothstep(0.78, 0.0, distance(vUv, vec2(0.18, 0.86))) * 0.08 * uScan;
  col += sheen;
  // rounded tube corners
  vec2 q = abs(vUv - 0.5) * 2.0;
  float corner = 1.0 - smoothstep(0.93, 1.0, max(q.x, q.y));
  col *= corner;
  gl_FragColor = vec4(col * inside, 1.0);
}`;

const Screen: React.FC<{ f: number; scanAmt: number }> = ({ f, scanAmt }) => {
  const { id, t, since } = slotAt(f);
  const surfing = f >= 990 && f < 1080;
  const osd = !surfing && since >= 6 && since < 56 && id !== "card" && id !== "studio";
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SW;
    canvas.height = SH;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    return { canvas, tex };
  }, []);
  // draw during render so the texture is current before the frame is advanced
  drawChannel(canvas.getContext("2d")!, id, t, osd);
  tex.needsUpdate = true;

  const relax = interpolate(f, [1174, 1224], [0, 1], { ...clamp, easing: ease.sineInOut });
  const uniforms = useMemo(
    () => ({
      tMap: { value: tex },
      uTime: { value: 0 },
      uStatic: { value: 0 },
      uRoll: { value: 0 },
      uCurve: { value: 1 },
      uScan: { value: 1 },
      uVig: { value: 1 },
      uFlash: { value: 0 },
      uTint: { value: 0 },
    }),
    [tex],
  );
  const st = staticAmount(f);
  uniforms.uTime.value = f / 30;
  uniforms.uStatic.value = st;
  uniforms.uRoll.value = st > 0.05 ? (rand(f * 1.7) - 0.5) * 0.18 * st : 0;
  uniforms.uCurve.value = 1 - relax;
  uniforms.uScan.value = scanAmt * (1 - relax);
  uniforms.uVig.value = 1 - relax;
  uniforms.uFlash.value = FLIPS.includes(f) ? 0.12 : 0;
  uniforms.uTint.value = 0.5;

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 32, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (SCREEN_W / 2);
      const y = p.getY(i) / (SCREEN_H / 2);
      p.setZ(i, (1 - (x * x + y * y) * 0.5) * 0.03);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[SCREEN_C[0], SCREEN_C[1], 0.8]}>
      <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} toneMapped={false} />
    </mesh>
  );
};

// ─── The set ────────────────────────────────────────────────────────────────────────────────
const WALNUT = "#5C3F34";
const TEAK = "#8A4B32";

const Knob: React.FC<{ r: number; angle: number; y: number; color: string }> = ({ r, angle, y, color }) => (
  <group position={[0.95, y, 0.77]} rotation={[Math.PI / 2, 0, 0]}>
    <mesh rotation={[0, angle, 0]} castShadow>
      <cylinderGeometry args={[r, r * 1.08, 0.13, 40]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
    {/* grip ridges and the pointer */}
    <group rotation={[0, angle, 0]}>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 16) * Math.PI * 2) * r * 1.02, 0, Math.sin((i / 16) * Math.PI * 2) * r * 1.02]}>
          <boxGeometry args={[0.02, 0.12, 0.02]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.07, -r * 0.62]}>
        <boxGeometry args={[0.03, 0.02, r * 0.55]} />
        <meshStandardMaterial color={P.accent} roughness={0.5} />
      </mesh>
    </group>
  </group>
);

const useFern = () =>
  useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const leaflet = new THREE.SphereGeometry(1, 8, 6);
    const FR = 11;
    for (let k = 0; k < FR; k++) {
      const phi = (k / FR) * Math.PI * 2 + rand(k * 3.3) * 0.5;
      const R = 0.75 + rand(k * 1.9) * 0.55;
      const H = 0.62 + rand(k * 7.7) * 0.5;
      const pt = (u: number) =>
        new THREE.Vector3(Math.cos(phi) * R * u, H * Math.sin(u * Math.PI * 0.62) - 0.22 * u * u * H, Math.sin(phi) * R * u);
      const pts = Array.from({ length: 14 }, (_, i) => pt(i / 13));
      const curve = new THREE.CatmullRomCurve3(pts);
      parts.push(new THREE.TubeGeometry(curve, 18, 0.012, 5, false));
      const L = 17;
      for (let i = 2; i < L; i++) {
        const u = i / (L - 1);
        const p = curve.getPoint(u);
        const tan = curve.getTangent(u);
        const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        const size = 0.16 * (1 - u * 0.7) + 0.02;
        for (const sgn of [-1, 1]) {
          const x = side.clone().multiplyScalar(sgn);
          const z = tan.clone();
          const y = new THREE.Vector3().crossVectors(z, x).normalize();
          const m = new THREE.Matrix4().makeBasis(x, y, z);
          m.setPosition(p.clone().addScaledVector(x, size * 0.9));
          const g = leaflet.clone();
          g.scale(size, size * 0.1, size * 0.34);
          g.applyMatrix4(m);
          parts.push(g);
        }
      }
    }
    const tip = new THREE.SphereGeometry(0.05, 6, 5);
    parts.push(tip);
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
  }, []);

const Scene: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const cam = cameraAt(f);
  useLayoutEffect(() => {
    camera.position.set(...cam.p);
    camera.fov = cam.f;
    camera.near = 0.05;
    camera.far = 80;
    camera.lookAt(...cam.l);
    camera.updateProjectionMatrix();
  });

  const wood = useCanvasTexture(woodDraw(WALNUT, "#2c1c17"), 512);
  const teak = useCanvasTexture(woodDraw(TEAK, "#3a1d12"), 512, [2, 1]);
  const wall = useCanvasTexture(wallDraw, 512, [8, 4]);
  const cabinet = useMemo(() => new RoundedBoxGeometry(2.4, 1.8, 1.5, 6, 0.12), []);
  const bezel = useMemo(() => new RoundedBoxGeometry(1.9, 1.48, 0.14, 5, 0.1), []);
  const tvBody = useMemo(() => new RoundedBoxGeometry(2.4, 1.8, 1.5, 6, 0.12), []);
  void tvBody;
  const fern = useFern();
  const potProfile = useMemo(
    () => new THREE.LatheGeometry([[0.0, 0], [0.3, 0], [0.4, 0.05], [0.46, 0.5], [0.52, 0.56], [0.52, 0.68], [0.0, 0.68]].map(([x, y]) => new THREE.Vector2(x, y)), 36),
    [],
  );
  const lampBase = useMemo(
    () => new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.3, 0.06], [0.2, 0.3], [0.1, 0.6], [0.06, 0.9], [0.04, 1.1], [0, 1.1]].map(([x, y]) => new THREE.Vector2(x, y)), 28),
    [],
  );

  // the knob steps a notch on every flip
  let knob = 0;
  for (const fl of FLIPS) {
    const big = fl < 990 || fl === 1080 ? 1 : 0.45;
    knob += big * interpolate(f, [fl - 10, fl - 1], [0, 1], { ...clamp, easing: ease.expoOut }) * (Math.PI / 5);
  }
  const vol = interpolate(f, [0, END], [0, 1.2]);

  const { id } = slotAt(f);
  const glow = CHANNELS[id].glow;
  const st = staticAmount(f);
  const grow = interpolate(f, [0, END], [0.72, 1.28]);
  const camDist = Math.hypot(cam.p[0] - SCREEN_C[0], cam.p[1] - SCREEN_C[1], cam.p[2] - SCREEN_C[2]);
  const pxHeight = SCREEN_H / (2 * camDist * Math.tan(((cam.f / 2) * Math.PI) / 180)) * 1920;
  const scanAmt = Math.min(1, Math.max(0.12, (pxHeight - 280) / 520));
  const lampFlicker = 1 + Math.sin(f * 0.07) * 0.02;

  return (
    <>
      <ambientLight intensity={0.5} color="#ffe6c8" />
      <hemisphereLight args={["#ffe8cf", "#4a2c22", 0.35]} />
      <directionalLight
        position={[-3.5, 6, 6]}
        intensity={2.4}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      {/* the screen throws its colour on the room */}
      <pointLight position={[SCREEN_C[0], SCREEN_C[1], 2.1]} intensity={4.5 + st * 4} distance={7} decay={1.6} color={glow} />
      <pointLight position={[2.45, 1.45, 0.4]} intensity={2.4 * lampFlicker} distance={5} decay={1.6} color="#ffb870" />

      {/* wall, floor, rug */}
      <mesh position={[0, 3, -1.7]} receiveShadow>
        <planeGeometry args={[24, 10]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.12, 2]} receiveShadow>
        <planeGeometry args={[24, 16]} />
        <meshStandardMaterial color="#3a251d" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, -1.11, 3.2]} receiveShadow>
        <circleGeometry args={[4.6, 48]} />
        <meshStandardMaterial color={P.surface} roughness={1} />
      </mesh>
      {/* framed picture and a shelf, left of the set */}
      <group position={[-3.4, 2.2, -1.64]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 1.5, 0.06]} />
          <meshStandardMaterial color={WALNUT} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[1.0, 1.3]} />
          <meshStandardMaterial color={P.bg} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.2, 0.05]}>
          <circleGeometry args={[0.36, 32]} />
          <meshStandardMaterial color={OLIVE} roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.28, 0.05]}>
          <circleGeometry args={[0.2, 32]} />
          <meshStandardMaterial color={P.accent} roughness={0.9} />
        </mesh>
      </group>

      {/* sideboard */}
      <group>
        <mesh position={[0, -0.07, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[5.4, 0.14, 2.3]} />
          <meshStandardMaterial map={teak} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.55, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[5.0, 0.8, 2.0]} />
          <meshStandardMaterial map={teak} roughness={0.65} />
        </mesh>
        {[-1.5, 0, 1.5].map((x) => (
          <mesh key={x} position={[x, -0.55, 1.215]}>
            <boxGeometry args={[1.4, 0.62, 0.03]} />
            <meshStandardMaterial color="#6b3b27" roughness={0.6} />
          </mesh>
        ))}
        {[-1.5, 0, 1.5].map((x) => (
          <mesh key={`h${x}`} position={[x, -0.4, 1.25]}>
            <boxGeometry args={[0.36, 0.04, 0.04]} />
            <meshStandardMaterial color={P.surface} roughness={0.4} metalness={0.2} />
          </mesh>
        ))}
        {[[-2.5, 1.0], [2.5, 1.0], [-2.5, -0.5], [2.5, -0.5]].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.78, z + 0.2]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
            <cylinderGeometry args={[0.06, 0.045, 0.7, 12]} />
            <meshStandardMaterial color={WALNUT} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* the television */}
      <group>
        <mesh geometry={cabinet} position={[0, 0.9, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={wood} roughness={0.55} />
        </mesh>
        {/* dark tube recess around the glass */}
        <mesh geometry={bezel} position={[SCREEN_C[0], SCREEN_C[1], 0.71]}>
          <meshStandardMaterial color="#1b1310" roughness={0.5} />
        </mesh>
        <Screen f={f} scanAmt={scanAmt} />
        {/* control panel */}
        <mesh position={[0.95, 1.05, 0.755]}>
          <boxGeometry args={[0.62, 1.4, 0.04]} />
          <meshStandardMaterial color={P.surface} roughness={0.5} />
        </mesh>
        <Knob r={0.17} angle={knob} y={1.3} color={P.bg} />
        <Knob r={0.115} angle={vol} y={0.86} color={P.bg} />
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} position={[0.95, 0.5 - i * 0.07 + 0.0, 0.78]}>
            <boxGeometry args={[0.4, 0.025, 0.02]} />
            <meshStandardMaterial color="#2a1b16" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0.75, 1.62, 0.785]}>
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshStandardMaterial color={P.accent} emissive={P.accent} emissiveIntensity={1.4} />
        </mesh>
        {/* feet */}
        {[[-1.0, 0.55], [1.0, 0.55], [-1.0, -0.55], [1.0, -0.55]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.03, z]}>
            <cylinderGeometry args={[0.1, 0.08, 0.08, 14]} />
            <meshStandardMaterial color="#1b1310" roughness={0.7} />
          </mesh>
        ))}
        {/* rabbit ears */}
        <mesh position={[0, 1.83, -0.1]}>
          <sphereGeometry args={[0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1b1310" roughness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[0, 1.9, -0.1]} rotation={[0, 0, -s * 0.55]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.013, 0.013, 1.4, 8]} />
              <meshStandardMaterial color={P.surface} roughness={0.25} metalness={0.7} />
            </mesh>
            <mesh position={[0, 1.4, 0]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color={P.surface} roughness={0.25} metalness={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* fern (it grows between the shots) */}
      <group position={[-2.1, 0, 0.3]}>
        <mesh geometry={potProfile} castShadow receiveShadow>
          <meshStandardMaterial color={P.accent} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 24]} />
          <meshStandardMaterial color="#2a1b16" roughness={1} />
        </mesh>
        <group position={[0, 0.66, 0]} scale={[grow, grow, grow]}>
          <mesh geometry={fern} castShadow>
            <meshStandardMaterial color={OLIVE} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* lamp */}
      <group position={[2.45, 0, 0.4]}>
        <mesh geometry={lampBase} castShadow>
          <meshStandardMaterial color={P.accent2} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.28, 0.46, 0.6, 28, 1, true]} />
          <meshStandardMaterial color={P.bg} emissive="#ffc58a" emissiveIntensity={0.9} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      </group>
    </>
  );
};

// ─── Overlays ───────────────────────────────────────────────────────────────────────────────
const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 52%, rgba(30,15,10,0.38) 100%)", pointerEvents: "none" }} />
);

const hookEase = ease.expoOut;
const Headline: React.FC<{ lines: string[]; at: number; out: number; top: number; size?: number; stagger?: number; align?: "left" | "center" }> = ({
  lines,
  at,
  out,
  top,
  size = 168,
  stagger = 4,
  align = "left",
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top, textAlign: align }}>
      {lines.map((ln, i) => {
        const a = interpolate(f, [at + i * stagger - 3, at + i * stagger + 14], [0, 1], { ...clamp, easing: hookEase });
        const o = interpolate(f, [out - 8 + i * 2, out + i * 2], [1, 0], { ...clamp, easing: ease.sineInOut });
        return (
          <div key={ln} style={{ overflow: "hidden", height: size * 1.12, paddingTop: size * 0.06 }}>
            <div
              style={{
                fontFamily: T.display,
                fontWeight: 600,
                fontSize: size,
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                color: P.bg,
                transform: `translateY(${(1 - a * o) * 108}%)`,
                whiteSpace: "nowrap",
              }}
            >
              {ln}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TvMotif: React.FC = () => {
  const f = useCurrentFrame();
  const s = 1 + Math.sin(f * 0.18) * 0.03;
  return (
    <svg width="230" height="190" viewBox="0 0 230 190" style={{ transform: `scale(${s})` }}>
      <line x1="115" y1="40" x2="70" y2="4" stroke={P.ink} strokeWidth="5" strokeLinecap="round" />
      <line x1="115" y1="40" x2="162" y2="4" stroke={P.ink} strokeWidth="5" strokeLinecap="round" />
      <rect x="8" y="38" width="214" height="140" rx="26" fill={WALNUT} />
      <rect x="26" y="56" width="134" height="104" rx="20" fill={P.bg} />
      <rect x="26" y="56" width="134" height="104" rx="20" fill="none" stroke={P.ink} strokeWidth="5" />
      <circle cx="94" cy="108" r="26" fill="none" stroke={P.accent} strokeWidth="7" />
      <circle cx="94" cy="108" r="8" fill={P.accent} />
      <circle cx="190" cy="82" r="14" fill={P.bg} />
      <circle cx="190" cy="132" r="10" fill={P.bg} />
    </svg>
  );
};

// ─── Sound ──────────────────────────────────────────────────────────────────────────────────
const SoundDesign: React.FC = () => {
  const bed = (name: string, from: number, to: number, volume: number, startFrom = 0) => (
    <Sequence key={`${name}${from}`} from={from} durationInFrames={to - from} layout="none">
      <Audio
        src={staticFile(`audio/ChannelSurfing/tv-${name}.m4a`)}
        startFrom={startFrom}
        volume={(fr) => volume * Math.min(1, fr / 4, (to - from - fr) / 4)}
      />
    </Sequence>
  );
  return (
    <>
      {/* each channel carries its own bed, through the "TV speaker" band-pass */}
      {bed("pulse", 0, 240, 0.8, 0)}
      {bed("drive", 240, 360, 0.75, 8 * 15)}
      {bed("clay", 360, 480, 0.8, 8 * 15)}
      {bed("ambient", 480, 600, 0.7, 6 * 15)}
      {bed("pulse", 600, 720, 0.8, 10 * 15)}
      {bed("clay", 720, 840, 0.8, 20 * 15)}
      {/* space is the valley: almost nothing */}
      {bed("ambient", 840, 990, 0.32, 14 * 15)}
      {/* the surf builds on a riser; the beds chop with the flips */}
      {bed("pulse", 990, 1080, 0.8, 24 * 15)}
      <Sfx name="riser" at={982} volume={0.7} />
      {/* payoff: the room tone is TV-filtered until the push opens the filter */}
      {bed("pulse", 1080, 1176, 0.85, 16 * 15)}
      <Music file="pulse-minimal-120.m4a" durationInFrames={CHANNEL_SURFING_DURATION - 1170} volume={0.5} fadeIn={30} fadeOut={50} startFrom={24 * 30} />

      {/* every flip: knob click, then the static burst (quieter and sparser while surfing) */}
      {FLIPS.map((fl) => {
        const quick = fl >= 990 && fl < 1080;
        return (
          <Sequence key={fl} from={fl - 3} layout="none">
            {(!quick || fl % 2 === 0 || fl === 1080) && <Audio src={staticFile("audio/ChannelSurfing/static.wav")} volume={quick ? 0.3 : 0.55} />}
            {!quick && <Audio src={staticFile("audio/ChannelSurfing/knob.wav")} volume={0.7} />}
          </Sequence>
        );
      })}
      {/* hook: dial click before the first flip is already covered; payoff and push */}
      <Sfx name="impact" at={1080} volume={0.8} />
      <Sfx name="sub-drop" at={1080} volume={0.6} />
      <Sfx name="swish-reverse" at={1160} volume={0.6} />
      <Sfx name="whoosh" at={1176} volume={0.55} />
      <Sfx name="shimmer" at={END} volume={0.55} />
    </>
  );
};

export const ChannelSurfing: React.FC = () => {
  const frame = useCurrentFrame();
  return (
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
            <Scene f={frame} />
          </ThreeCanvas>
        </AbsoluteFill>
        <Vignette />
        {frame < 44 && <Headline lines={["Don't touch", "that dial."]} at={-22} out={40} top={236} />}
        {frame >= 1080 && frame < 1172 && (
          <>
            <Headline lines={["Every channel."]} at={1080} out={1166} top={236} size={122} stagger={0} />
            <Headline lines={["One studio."]} at={1095} out={1168} top={1380} size={122} stagger={0} />
          </>
        )}
        <Grain opacity={0.07} />
      </Sequence>
      <Sequence from={END}>
        <EndCard system={S} motif={<TvMotif />} />
      </Sequence>
      <SoundDesign />
    </AbsoluteFill>
  );
};
