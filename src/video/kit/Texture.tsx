import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { DesignSystem } from "../design/systems";

/** Animated film grain (SVG turbulence, new seed every 2 frames). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Halftone dot screen in the ink colour, multiplied over the frame. */
export const Halftone: React.FC<{ color: string; size?: number; opacity?: number }> = ({ color, size = 9, opacity = 0.14 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      opacity,
      mixBlendMode: "multiply",
      backgroundImage: `radial-gradient(${color} 28%, transparent 30%)`,
      backgroundSize: `${size}px ${size}px`,
    }}
  />
);

/** Static paper fibre + soft vignette. */
export const Paper: React.FC<{ opacity?: number }> = ({ opacity = 0.18 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ mixBlendMode: "multiply", opacity }}>
      <svg width="100%" height="100%">
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.6" numOctaves={3} seed={7} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper)" />
      </svg>
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.18) 100%)" }} />
  </AbsoluteFill>
);

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => (
  <AbsoluteFill
    style={{ pointerEvents: "none", opacity, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0 2px, transparent 2px 5px)" }}
  />
);

/** The texture a design system asks for. Put it last so it sits over everything. */
export const SystemTexture: React.FC<{ system: DesignSystem }> = ({ system }) => {
  switch (system.texture) {
    case "grain":
      return <Grain />;
    case "halftone":
      return <Halftone color={system.palette.ink} />;
    case "paper":
      return <Paper />;
    case "scanlines":
      return <Scanlines />;
    default:
      return null;
  }
};
