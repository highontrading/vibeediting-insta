import { noise3D } from "@remotion/noise";
import { useMemo } from "react";
import * as THREE from "three";
import { rand } from "./motion";

/**
 * Claymation kit for @remotion/three scenes.
 *  - `clayify(geo, …)` displaces a geometry with low-frequency lumps plus a few thumb dents, then
 *    rebuilds seam-safe normals (no visible UV seams on lathes/spheres).
 *  - `useThumbprintTexture()` is a canvas bump map: overlapping fingerprint whorls and fine grit.
 *  - `<ClayMaterial>` is the look: very rough, no metal, a soft sheen rim, the thumbprint bump.
 *  - `onTwos(frame)` steps time to 15fps; `boil(step, id)` gives the per-step replacement jitter.
 */

export const onTwos = (frame: number) => Math.floor(frame / 2) * 2;

/** Per-step jitter in [-1, 1] for an object id and axis: the "boil" of hand-animated clay. */
export const boil = (step: number, id: number, axis = 0) => rand(Math.floor(step / 2) * 97.13 + id * 13.7 + axis * 5.31) * 2 - 1;

/** Average the normals of vertices that share a position, so displaced seams stay smooth. */
const weldNormals = (g: THREE.BufferGeometry) => {
  g.computeVertexNormals();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    const arr = groups.get(key);
    if (arr) arr.push(i);
    else groups.set(key, [i]);
  }
  const v = new THREE.Vector3();
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of idx) v.add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)));
    v.normalize();
    for (const i of idx) n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
};

/**
 * Hand-made irregularity: lumps (`amp` in world units at `freq`), plus `dents` thumb presses.
 * Displacement follows the original normals so flat bases stay flat-ish (pass `keepBase` to pin y≤base).
 */
export const clayify = (
  geo: THREE.BufferGeometry,
  { amp = 0.02, freq = 2.2, dents = 5, dentDepth = 0.018, dentRadius = 0.16, seed = 1, keepBase }: {
    amp?: number;
    freq?: number;
    dents?: number;
    dentDepth?: number;
    dentRadius?: number;
    seed?: number;
    keepBase?: number;
  } = {},
) => {
  const g = geo.clone();
  // Smooth normals first so displacement does not tear hard edges apart.
  weldNormals(g);
  const p = g.attributes.position;
  const n = g.attributes.normal;
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const dentPts: THREE.Vector3[] = [];
  for (let k = 0; k < dents; k++) {
    const i = Math.floor(rand(seed * 31 + k * 7.7) * p.count);
    dentPts.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
  }
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nn.fromBufferAttribute(n, i);
    if (keepBase !== undefined && v.y <= keepBase + 1e-4) continue;
    let d = noise3D(`c${seed}`, v.x * freq, v.y * freq, v.z * freq) * amp;
    d += noise3D(`f${seed}`, v.x * freq * 4.3, v.y * freq * 4.3, v.z * freq * 4.3) * amp * 0.22;
    for (const dp of dentPts) {
      const dist = v.distanceTo(dp) / dentRadius;
      if (dist < 1) d -= dentDepth * (0.5 + 0.5 * Math.cos(Math.PI * dist));
    }
    v.addScaledVector(nn, d);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  weldNormals(g);
  return g;
};

/** Rounded "lathe" body from a 2D profile (x = radius, y = height). */
export const latheBody = (profile: [number, number][], segments = 64) =>
  new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);

/** A smooth profile through control points (Catmull-Rom), for lathes that look sculpted, not turned. */
export const smoothProfile = (pts: [number, number][], samples = 40): [number, number][] => {
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return curve.getPoints(samples).map((p) => [Math.max(0.0001, p.x), p.y]);
};

let thumbTex: THREE.CanvasTexture | null = null;

/** Fingerprint whorls + grit, as a tiling bump map. Created once and shared. */
export const useThumbprintTexture = () =>
  useMemo(() => {
    if (thumbTex) return thumbTex;
    const S = 1024;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, S, S);
    // soft large-scale smudges
    for (let k = 0; k < 40; k++) {
      const x = rand(k * 3.1) * S;
      const y = rand(k * 5.7) * S;
      const r = 40 + rand(k * 1.3) * 120;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = rand(k * 9.1) > 0.5 ? 255 : 0;
      gr.addColorStop(0, `rgba(${tone},${tone},${tone},0.10)`);
      gr.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
      ctx.fillStyle = gr;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    // fingerprint whorls: concentric, slightly wobbly ellipses inside an oval, tiled seamlessly
    for (let k = 0; k < 16; k++) {
      const cx = rand(k * 7.3 + 1) * S;
      const cy = rand(k * 2.9 + 4) * S;
      const rx = 60 + rand(k * 4.4) * 50;
      const ry = rx * (1.2 + rand(k * 8.8) * 0.3);
      const rot = rand(k * 6.6) * Math.PI;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        ctx.save();
        ctx.translate(cx + ox, cy + oy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.lineWidth = 2.2;
        for (let r = 4; r < ry * 1.1; r += 6.5) {
          ctx.strokeStyle = `rgba(0,0,0,${0.16 * (1 - r / (ry * 1.2))})`;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
            const wob = 1 + Math.sin(a * 3 + r * 0.2 + k) * 0.04;
            const px = Math.cos(a) * r * (rx / ry) * wob;
            const py = Math.sin(a) * r * wob;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // grit
    const img = ctx.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = (rand(i * 0.37 + 11) - 0.5) * 26;
      img.data[i] += g;
      img.data[i + 1] += g;
      img.data[i + 2] += g;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    thumbTex = tex;
    return tex;
  }, []);

/** The clay surface. `repeat` scales the thumbprint pattern for big or small pieces. */
export const ClayMaterial: React.FC<{
  color: string;
  roughness?: number;
  bump?: number;
  repeat?: number;
  emissive?: string;
  emissiveIntensity?: number;
  map?: THREE.Texture;
}> = ({ color, roughness = 0.86, bump = 3, repeat = 1, emissive, emissiveIntensity, map }) => {
  const tex = useThumbprintTexture();
  const bumpMap = useMemo(() => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(repeat, repeat);
    return t;
  }, [tex, repeat]);
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={roughness}
      metalness={0}
      bumpMap={bumpMap}
      bumpScale={bump}
      sheen={0.35}
      sheenRoughness={0.75}
      sheenColor="#ffffff"
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissiveIntensity ?? 0}
      map={map}
    />
  );
};
