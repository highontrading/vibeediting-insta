import { AbsoluteFill, useCurrentFrame } from "remotion";
import { systems, type DesignSystem } from "../design/systems";
import { SystemTexture } from "../kit/Texture";

// Internal check (never posted): one second per design system, showing its type, palette and texture.
const list: DesignSystem[] = Object.values(systems);
export const SPECIMEN_DURATION = list.length * 30;

export const SystemSpecimen: React.FC = () => {
  const frame = useCurrentFrame();
  const s = list[Math.min(list.length - 1, Math.floor(frame / 30))];
  const { palette: p, type: t } = s;
  return (
    <AbsoluteFill style={{ background: p.bg, padding: "240px 90px", color: p.ink, fontFamily: t.body }}>
      <div style={{ fontFamily: t.mono ?? t.body, fontSize: 30, color: p.muted, letterSpacing: "0.1em" }}>{s.id}</div>
      <div
        style={{
          fontFamily: t.display,
          fontWeight: t.displayWeight,
          fontSize: 150,
          lineHeight: 0.95,
          letterSpacing: `${t.displayTracking}em`,
          textTransform: t.uppercase ? "uppercase" : "none",
          marginTop: 30,
        }}
      >
        {s.name}
      </div>
      <div style={{ fontSize: 44, marginTop: 40, lineHeight: 1.3, maxWidth: 860 }}>{s.mood}</div>
      <div style={{ display: "flex", gap: 18, marginTop: 60 }}>
        {[p.surface, p.ink, p.muted, p.accent, p.accent2, p.accent3].filter(Boolean).map((c) => (
          <div key={c} style={{ width: 120, height: 120, background: c, border: `2px solid ${p.ink}22` }} />
        ))}
      </div>
      <SystemTexture system={s} />
    </AbsoluteFill>
  );
};
