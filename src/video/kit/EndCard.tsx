import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { DesignSystem } from "../design/systems";
import { clamp, ease } from "./motion";
import { interpolate } from "remotion";

export const END_CARD_FRAMES = 60;

/**
 * Studio signature, the same structure on every video, dressed in the video's own system.
 * "VIBE EDITING" wordmark + "Made with the Vibe Editing system" + handle.
 */
export const EndCard: React.FC<{ system: DesignSystem }> = ({ system }) => {
  const frame = useCurrentFrame();
  const { palette, type } = system;
  const p = interpolate(frame, [0, 22], [0, 1], { ...clamp, easing: ease.expoOut });
  const line = interpolate(frame, [8, 34], [0, 1], { ...clamp, easing: ease.expoOut });
  const sub = interpolate(frame, [18, 36], [0, 1], { ...clamp, easing: ease.expoOut });
  return (
    <AbsoluteFill style={{ background: palette.bg, justifyContent: "center", alignItems: "center", paddingBottom: 160 }}>
      <div
        style={{
          fontFamily: type.display,
          fontWeight: type.displayWeight,
          fontSize: 132,
          letterSpacing: `${Math.max(type.displayTracking, -0.02)}em`,
          color: palette.ink,
          textTransform: "uppercase",
          lineHeight: 0.92,
          textAlign: "center",
          transform: `translateY(${(1 - p) * 40}px)`,
          opacity: p,
        }}
      >
        Vibe
        <br />
        Editing
      </div>
      <div style={{ width: 420 * line, height: 4, background: palette.accent, margin: "44px 0 36px" }} />
      <div style={{ fontFamily: type.body, fontSize: 40, color: palette.muted, opacity: sub, letterSpacing: "0.04em" }}>
        Made with the Vibe Editing system
      </div>
      <div style={{ fontFamily: type.mono ?? type.body, fontSize: 40, color: palette.ink, opacity: sub, marginTop: 14 }}>@vibeediting.app</div>
    </AbsoluteFill>
  );
};
