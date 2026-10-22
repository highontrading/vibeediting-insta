import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { DesignSystem } from "../design/systems";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ease = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  quintInOut: Easing.bezier(0.83, 0, 0.17, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  sineInOut: Easing.bezier(0.37, 0, 0.63, 1),
  of: (s: DesignSystem) => Easing.bezier(...s.motion.ease),
};

/** 0→1 progress of a move that starts at `start` and lasts `dur` frames. */
export const useMove = (start: number, dur: number, easing: (t: number) => number = ease.expoOut) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing });
};

/** Linear map with clamping, for one-liners. */
export const map = (v: number, inRange: [number, number], outRange: [number, number], easing?: (t: number) => number) =>
  interpolate(v, inRange, outRange, { ...clamp, easing });

/** Snap a frame to a lower frame rate (stop-motion / riso feel). */
export const stepped = (frame: number, fps = 30, targetFps = 12) => Math.floor(frame / (fps / targetFps)) * (fps / targetFps);

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
