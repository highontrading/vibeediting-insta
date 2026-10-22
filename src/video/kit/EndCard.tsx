import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { DesignSystem } from "../design/systems";
import { clamp, ease } from "./motion";
import { interpolate } from "remotion";

export const END_CARD_FRAMES = 60;

/**
 * Studio signature, the same structure on every video, dressed in the video's own system.
 * "VIBE EDITING" wordmark + "Made with the Vibe Editing system" + handle.
 * `align="left"` sets it flush on the 80px margin; `motif` is a small piece-specific element
 * (the video's recurring motif) shown above the wordmark so the last hold isn't dead.
 */
export const EndCard: React.FC<{
  system: DesignSystem;
  align?: "center" | "left";
  wordmarkSize?: number;
  motif?: React.ReactNode;
}> = ({ system, align = "center", wordmarkSize = 132, motif }) => {
  const frame = useCurrentFrame();
  const { palette, type } = system;
  // Starts a few frames "before" the cut so frame 0 of the card is never blank.
  const p = interpolate(frame, [-6, 18], [0, 1], { ...clamp, easing: ease.expoOut });
  const line = interpolate(frame, [6, 30], [0, 1], { ...clamp, easing: ease.expoOut });
  const sub = interpolate(frame, [14, 30], [0, 1], { ...clamp, easing: ease.expoOut });
  const left = align === "left";
  return (
    <AbsoluteFill
      style={{
        background: palette.bg,
        justifyContent: "center",
        alignItems: left ? "flex-start" : "center",
        padding: left ? "0 80px 160px" : "0 0 160px",
      }}
    >
      {motif && <div style={{ marginBottom: 40, opacity: p }}>{motif}</div>}
      <div
        style={{
          fontFamily: type.display,
          fontWeight: type.displayWeight,
          fontSize: wordmarkSize,
          letterSpacing: `${Math.max(type.displayTracking, -0.02)}em`,
          color: palette.ink,
          textTransform: "uppercase",
          lineHeight: 0.92,
          textAlign: left ? "left" : "center",
          transform: `translateY(${(1 - p) * 40}px)`,
          opacity: p,
        }}
      >
        Vibe
        <br />
        Editing
      </div>
      <div style={{ width: 420 * line, height: 4, background: palette.accent, margin: "44px 0 36px" }} />
      <div style={{ fontFamily: type.body, fontSize: 44, color: palette.ink, opacity: sub, letterSpacing: "0.02em" }}>
        Made with the Vibe Editing system
      </div>
      <div style={{ fontFamily: type.mono ?? type.body, fontSize: 44, color: palette.ink, opacity: sub, marginTop: 14 }}>@vibeediting.app</div>
    </AbsoluteFill>
  );
};
