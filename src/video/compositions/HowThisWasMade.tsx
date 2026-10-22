import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Intro reel for the page: shows the pipeline that made (and posted) this very video.
const HOOK = 90;
const PIPELINE = 180;
const OUTRO = 105;
export const HOW_THIS_WAS_MADE_DURATION = HOOK + PIPELINE + OUTRO;

const STEPS = [
  { emoji: "💬", title: "A prompt", detail: "\"Make a motion graphics reel\"", color: theme.accent },
  { emoji: "🤖", title: "Claude writes the code", detail: "React + Remotion animations", color: theme.accent2 },
  { emoji: "🎬", title: "Rendered to MP4", detail: "1080×1920 · 30fps", color: theme.accent3 },
  { emoji: "📲", title: "Auto-posted", detail: "via the Meta Graph API", color: theme.accent },
];

export const HowThisWasMade: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.font, color: theme.text }}>
    <Background />
    <Sequence durationInFrames={HOOK}>
      <Hook />
    </Sequence>
    <Sequence from={HOOK} durationInFrames={PIPELINE}>
      <Pipeline />
    </Sequence>
    <Sequence from={HOOK + PIPELINE}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const blob = (color: string, x: number, y: number, phase: number) => (
    <div
      style={{
        position: "absolute",
        width: 900,
        height: 900,
        left: x + Math.sin((frame + phase) / 40) * 120,
        top: y + Math.cos((frame + phase) / 50) * 160,
        borderRadius: "50%",
        background: color,
        filter: "blur(160px)",
        opacity: 0.35,
      }}
    />
  );
  return (
    <AbsoluteFill>
      {blob(theme.accent, -300, -200, 0)}
      {blob(theme.accent2, 500, 700, 60)}
      {blob(theme.accent3, -200, 1300, 120)}
    </AbsoluteFill>
  );
};

/** Words pop in one by one with a spring. */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = [["This", "video"], ["was", "made"], ["by", "AI."]];
  const exit = interpolate(frame, [HOOK - 12, HOOK], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let i = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: 36 }}>
          {line.map((word) => {
            const s = spring({ frame: frame - i++ * 6, fps, config: { damping: 12 } });
            const highlight = word === "AI.";
            return (
              <span
                key={word}
                style={{
                  fontSize: 170,
                  fontWeight: 900,
                  letterSpacing: -4,
                  transform: `translateY(${(1 - s) * 80}px) scale(${0.6 + s * 0.4})`,
                  opacity: s,
                  backgroundImage: highlight ? `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` : undefined,
                  WebkitBackgroundClip: highlight ? "text" : undefined,
                  color: highlight ? "transparent" : theme.text,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** Pipeline cards slide in, connected by a growing line. */
const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = 32;
  const lineProgress = interpolate(frame, [10, stagger * (STEPS.length - 1) + 10], [0, 1], { extrapolateRight: "clamp" });
  const exit = interpolate(frame, [PIPELINE - 12, PIPELINE], [1, 0], { extrapolateLeft: "clamp" });
  const titleIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ padding: "220px 90px", opacity: exit }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: theme.muted, opacity: titleIn, marginBottom: 80 }}>How it works</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 70 }}>
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 70,
            width: 6,
            height: `${lineProgress * 78}%`,
            background: `linear-gradient(${theme.accent}, ${theme.accent2})`,
            borderRadius: 3,
          }}
        />
        {STEPS.map((step, idx) => {
          const s = spring({ frame: frame - idx * stagger, fps, config: { damping: 14 } });
          return (
            <div key={step.title} style={{ display: "flex", alignItems: "center", gap: 48, opacity: s, transform: `translateX(${(1 - s) * 200}px)` }}>
              <div
                style={{
                  width: 140,
                  height: 140,
                  flexShrink: 0,
                  borderRadius: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 72,
                  background: "rgba(255,255,255,0.06)",
                  border: `3px solid ${step.color}`,
                  boxShadow: `0 0 60px ${step.color}66`,
                }}
              >
                {step.emoji}
              </div>
              <div>
                <div style={{ fontSize: 66, fontWeight: 800 }}>{step.title}</div>
                <div style={{ fontSize: 40, color: theme.muted, marginTop: 8 }}>{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, mass: 0.8 } });
  const sub = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const shimmer = interpolate(frame, [0, OUTRO], [0, 200]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          fontSize: 190,
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: -6,
          transform: `scale(${s})`,
          backgroundImage: `linear-gradient(110deg, ${theme.accent} ${shimmer - 100}%, ${theme.accent2} ${shimmer - 50}%, ${theme.accent3} ${shimmer}%)`,
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        VIBE
        <br />
        EDITING
      </div>
      <div style={{ fontSize: 52, color: theme.muted, marginTop: 60, opacity: sub, transform: `translateY(${(1 - sub) * 30}px)` }}>
        Follow to watch AI edit everything.
      </div>
    </AbsoluteFill>
  );
};
