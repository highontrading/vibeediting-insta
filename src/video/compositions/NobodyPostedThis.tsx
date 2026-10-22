import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Behind the scenes: a Notion calendar row walks itself to "Posted" at 9:00 AM with nobody touching it.
const HOOK = 75;
const CALENDAR = 135;
const CLOCK = 120;
const OUTRO = 105;
export const NOBODY_POSTED_THIS_DURATION = HOOK + CALENDAR + CLOCK + OUTRO;

const mono = "'JetBrains Mono', Menlo, 'DejaVu Sans Mono', monospace";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const NobodyPostedThis: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.font, color: theme.text }}>
    <Grid />
    <Sequence durationInFrames={HOOK}>
      <Hook />
    </Sequence>
    <Sequence from={HOOK} durationInFrames={CALENDAR}>
      <Calendar />
    </Sequence>
    <Sequence from={HOOK + CALENDAR} durationInFrames={CLOCK}>
      <Clock />
    </Sequence>
    <Sequence from={HOOK + CALENDAR + CLOCK}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);

/** Slowly drifting dot grid instead of blurred blobs. */
const Grid: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${theme.accent2}33 2px, transparent 2px)`,
        backgroundSize: "60px 60px",
        backgroundPosition: `0px ${-frame * 0.6}px`,
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
      }}
    />
  );
};

/** Typewriter hook; "Nobody" flips to the accent color once typed. */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const text = "Nobody posted this video.";
  const chars = Math.floor(interpolate(frame, [0, 34], [0, text.length], clamp));
  const cursorOn = Math.floor(frame / 8) % 2 === 0;
  const highlight = interpolate(frame, [38, 46], [0, 1], clamp);
  const exit = interpolate(frame, [HOOK - 10, HOOK], [1, 0], clamp);
  const typed = text.slice(0, chars);
  const first = typed.slice(0, 6);
  const rest = typed.slice(6);

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", opacity: exit }}>
      <div style={{ fontFamily: mono, fontSize: 40, color: theme.accent2, marginBottom: 30 }}>$ vibe-editing --autopilot</div>
      <div style={{ fontSize: 136, fontWeight: 900, lineHeight: 1.05, letterSpacing: -4 }}>
        <span style={{ color: highlight > 0 ? theme.accent3 : theme.text, textShadow: `0 0 ${highlight * 50}px ${theme.accent3}` }}>{first}</span>
        {rest}
        <span style={{ opacity: cursorOn ? 1 : 0, color: theme.accent2 }}>▍</span>
      </div>
    </AbsoluteFill>
  );
};

const STATUSES = [
  { label: "Idea", color: "#9CA3AF" },
  { label: "Producing", color: "#60A5FA" },
  { label: "Review", color: theme.accent },
  { label: "Posted", color: "#34D399" },
];

/** A week strip from the Notion calendar; tomorrow's card cycles through every status by itself. */
const Calendar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const step = Math.min(STATUSES.length - 1, Math.max(0, Math.floor((frame - 25) / 24)));
  const status = STATUSES[step];
  const pulse = spring({ frame: frame - 25 - step * 24, fps, config: { damping: 10 } });
  const exit = interpolate(frame, [CALENDAR - 10, CALENDAR], [1, 0], clamp);
  const days = ["MON", "TUE", "WED", "THU", "FRI"];

  return (
    <AbsoluteFill style={{ padding: "260px 80px 0", opacity: exit }}>
      <div style={{ fontSize: 56, fontWeight: 800, marginBottom: 12 }}>The calendar plans it</div>
      <div style={{ fontSize: 40, color: theme.muted, marginBottom: 60 }}>One row in Notion = one Reel</div>
      <div style={{ display: "flex", gap: 16, transform: `translateY(${(1 - enter) * 120}px)`, opacity: enter }}>
        {days.map((d, i) => {
          const active = i === 2;
          return (
            <div
              key={d}
              style={{
                flex: 1,
                height: 520,
                borderRadius: 28,
                padding: 18,
                background: active ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)",
                border: `3px solid ${active ? status.color : "rgba(255,255,255,0.08)"}`,
                boxShadow: active ? `0 0 ${40 + pulse * 30}px ${status.color}55` : undefined,
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 30, color: theme.muted }}>{d}</div>
              <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,0.1)", marginTop: 26, width: "80%" }} />
              <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,0.07)", marginTop: 14, width: "55%" }} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 60,
          alignSelf: "center",
          display: "flex",
          alignItems: "center",
          gap: 28,
          padding: "26px 40px",
          borderRadius: 999,
          background: `${status.color}22`,
          border: `3px solid ${status.color}`,
          transform: `scale(${0.85 + pulse * 0.15})`,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 44, color: theme.muted }}>9:00 AM · Reel</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: status.color }}>{status.label}</div>
      </div>
    </AbsoluteFill>
  );
};

/** 8:59 → 9:00, then an upload bar fills and the post goes live. */
const Clock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flipped = frame >= 30;
  const flip = spring({ frame: frame - 30, fps, config: { damping: 12 } });
  const progress = interpolate(frame, [45, 95], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const done = spring({ frame: frame - 98, fps, config: { damping: 9 } });
  const exit = interpolate(frame, [CLOCK - 10, CLOCK], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit, paddingBottom: 200 }}>
      <div style={{ fontSize: 48, color: theme.muted, marginBottom: 20 }}>{flipped ? "Scheduled run starts" : "Waiting…"}</div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 220,
          fontWeight: 700,
          letterSpacing: -6,
          color: flipped ? theme.text : theme.muted,
          transform: `scale(${flipped ? 1 + (1 - flip) * 0.15 : 1})`,
        }}
      >
        {flipped ? "9:00" : "8:59"}
      </div>
      <div style={{ width: 760, marginTop: 70 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, marginBottom: 18 }}>
          <span>Posting to Instagram</span>
          <span style={{ fontFamily: mono, color: theme.accent2 }}>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{ height: 28, borderRadius: 14, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
              borderRadius: 14,
            }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: 70,
          fontSize: 88,
          fontWeight: 900,
          color: "#34D399",
          opacity: done,
          transform: `scale(${0.5 + done * 0.5})`,
        }}
      >
        ✓ Posted
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = ["Zero clicks.", "Every day."];
  const handle = interpolate(frame, [36, 54], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", paddingBottom: 200 }}>
      {lines.map((line, i) => {
        const s = spring({ frame: frame - i * 10, fps, config: { damping: 14 } });
        return (
          <div
            key={line}
            style={{
              fontSize: 150,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 1.05,
              opacity: s,
              transform: `translateX(${(1 - s) * -160}px)`,
              color: i === 1 ? theme.accent2 : theme.text,
            }}
          >
            {line}
          </div>
        );
      })}
      <div style={{ marginTop: 70, fontSize: 52, color: theme.muted, opacity: handle, transform: `translateY(${(1 - handle) * 30}px)` }}>
        Follow <span style={{ color: theme.text, fontWeight: 700 }}>@vibeediting.app</span> to watch it run
      </div>
    </AbsoluteFill>
  );
};
