import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";
import { Music, Sfx } from "../kit/Sfx";
import { SystemTexture } from "../kit/Texture";

// UI Motion: product film for a fictional focus app, "Stillwater". Design system: Night Transit.
// Music: ambient-glass-80 (80 BPM → one beat = 22.5 frames). Sections start on beats.
const S = systems.nightTransit;
const P = S.palette;
const T = S.type;
const E = ease.of(S);
const NAVY_DEEP = "#08131F";

const HOOK = 0;
const TITLE = 135;
const PHONE = 270;
const HELD = 495;
const WEEK = 720;
const SUMMARY = 945;
const TRIPTYCH = 1100;
const PAYOFF = 1170;
const END = 1380;
export const STILLWATER_DURATION = END + END_CARD_FRAMES;

const WATERLINE = 960;
const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

export const Stillwater: React.FC = () => (
  <AbsoluteFill style={{ background: P.bg, fontFamily: T.body, color: P.ink }}>
    <Backdrop />
    <Sequence durationInFrames={TITLE}>
      <Hook />
    </Sequence>
    <Sequence from={TITLE - 15} durationInFrames={PHONE - TITLE + 30}>
      <Title />
    </Sequence>
    <Sequence from={PHONE} durationInFrames={PAYOFF - PHONE}>
      <PhoneAct />
    </Sequence>
    <Sequence from={PAYOFF} durationInFrames={END - PAYOFF}>
      <Payoff />
    </Sequence>
    <Sequence from={END}>
      <EndCard system={S} />
    </Sequence>
    <SystemTexture system={S} />
    <SoundDesign />
  </AbsoluteFill>
);

// ─── Backdrop: navy depth with faint drifting "current" lines ─────────────────────────────────

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${P.bg} 0%, ${NAVY_DEEP} 100%)` }}>
      {[0.18, 0.31, 0.47, 0.66, 0.82].map((y, i) => (
        <div
          key={y}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${y * 100}%`,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${P.muted}26 ${30 + i * 8}%, transparent)`,
            transform: `translateX(${Math.sin((frame + i * 40) / 90) * 60}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Hook: notifications pile up around "TOO LOUD.", then drain like water ───────────────────

const NOTES = [
  { app: "Mail", msg: "Re: Re: Re: quick question", x: 60, y: 250, r: -5, z: 0.82 },
  { app: "Team chat", msg: "@you can you jump on a call?", x: 470, y: 330, r: 4, z: 1.0 },
  { app: "Bank", msg: "Your statement is ready", x: 300, y: 470, r: -2, z: 0.78 },
  { app: "Calendar", msg: "Standup moved to 9:15", x: 40, y: 590, r: 3, z: 1.06 },
  { app: "News", msg: "Breaking: everything, again", x: 500, y: 760, r: -3, z: 0.8 },
  { app: "Shop", msg: "Your cart misses you", x: 70, y: 980, r: -6, z: 0.85 },
  { app: "Team chat", msg: "17 new messages in #general", x: 420, y: 1110, r: 5, z: 1.08 },
  { app: "Social", msg: "You have 43 new likes", x: 30, y: 1260, r: 2, z: 0.8 },
  { app: "Mail", msg: "Last chance: 40% off", x: 470, y: 1360, r: -4, z: 1.0 },
];

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const drain = 72;
  const textOut = m(frame, drain + 6, drain + 40, 0, 1, (t) => t * t * t);
  const line = m(frame, 112, 134, 0, 1);

  return (
    <AbsoluteFill>
      {[...NOTES.map((n, i) => ({ ...n, i }))]
        .sort((a, b) => a.z - b.z)
        .map((n) => {
          const i = n.i;
          const appear = i % 3 !== 2 ? 1 : m(frame, i * 2, i * 2 + 10, 0, 1, ease.backOut);
          const fall = m(frame, drain + i * 2.2, drain + 34 + i * 2.2, 0, 1, (t) => t * t * t);
          const buzz = frame < drain ? Math.sin(frame * 2.1 + i * 7) * 3 : 0;
          const far = n.z < 0.9;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: n.x + buzz,
                top: n.y + fall * (1900 - n.y),
                transform: `rotate(${n.r + fall * (rand(i) - 0.5) * 30}deg) scale(${n.z * (0.85 + appear * 0.15)})`,
                transformOrigin: "0 0",
                opacity: appear * (far ? 0.55 : 0.95),
                filter: far ? "blur(3px)" : undefined,
              }}
            >
              <NotificationCard app={n.app} msg={n.msg} width={540} />
            </div>
          );
        })}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 640,
          fontFamily: T.display,
          fontWeight: 900,
          fontSize: 300,
          lineHeight: 0.84,
          letterSpacing: "0.005em",
          color: P.accent,
          textTransform: "uppercase",
          transform: `translateY(${textOut * 1300}px)`,
          textShadow: `0 10px 40px ${NAVY_DEEP}`,
        }}
      >
        Too
        <br />
        loud.
      </div>
      <div
        style={{
          position: "absolute",
          top: WATERLINE,
          left: 540 - line * 460,
          width: line * 920,
          height: 3,
          background: P.accent,
        }}
      />
    </AbsoluteFill>
  );
};

const NotificationCard: React.FC<{ app: string; msg: string; width: number; scale?: number }> = ({ app, msg, width, scale = 1 }) => (
  <div
    style={{
      width,
      padding: `${22 * scale}px ${26 * scale}px`,
      borderRadius: 30 * scale,
      background: "#172C44",
      border: `1px solid ${P.ink}1A`,
      boxShadow: `0 ${18 * scale}px ${40 * scale}px rgba(0,0,0,0.35)`,
      display: "flex",
      gap: 20 * scale,
      alignItems: "center",
    }}
  >
    <div
      style={{
        width: 64 * scale,
        height: 64 * scale,
        borderRadius: 16 * scale,
        background: P.surface,
        border: `1px solid ${P.ink}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.mono,
        fontWeight: 700,
        fontSize: 28 * scale,
        color: P.muted,
        flexShrink: 0,
      }}
    >
      {app[0]}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 22 * scale, color: P.muted, letterSpacing: "0.04em" }}>
        <span>{app.toUpperCase()}</span>
        <span>now</span>
      </div>
      <div style={{ fontSize: 32 * scale, fontWeight: 600, marginTop: 4 * scale, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {msg}
      </div>
    </div>
  </div>
);

// ─── Title: STILLWATER rises out of the waterline with a rippling reflection ─────────────────

const Title: React.FC = () => {
  const frame = useCurrentFrame(); // starts 15 frames before TITLE
  const f = frame - 15;
  const word = "STILLWATER";
  const exit = m(f, PHONE - TITLE - 18, PHONE - TITLE + 10, 0, 1, ease.quintInOut);
  const sub = m(f, 40, 64);
  const size = 196;

  const letters = (
    <div style={{ display: "flex", justifyContent: "center", fontFamily: T.display, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: "0.01em" }}>
      {Array.from(word).map((ch, i) => {
        const p = m(f, i * 2.5, i * 2.5 + 26);
        return (
          <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill style={{ transform: `translateY(${-exit * 420}px)`, opacity: 1 - exit }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="ripple">
          <feTurbulence type="fractalNoise" baseFrequency={`0.004 ${0.06 + 0.01 * Math.sin(f / 10)}`} numOctaves={2} seed={Math.floor(f / 3)} />
          <feDisplacementMap in="SourceGraphic" scale={18} />
        </filter>
      </svg>
      {/* word above the waterline: overflow clips letters until they rise out */}
      <div style={{ position: "absolute", left: 0, right: 0, top: WATERLINE - size * 0.86, height: size * 0.86, overflow: "hidden" }}>
        <div style={{ color: P.ink }}>{letters}</div>
      </div>
      <div style={{ position: "absolute", top: WATERLINE, left: 80, right: 80, height: 3, background: P.accent }} />
      {/* reflection */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: WATERLINE + 6,
          height: size * 0.86,
          overflow: "hidden",
          opacity: 0.22,
          filter: "url(#ripple)",
          maskImage: "linear-gradient(180deg, black 0%, transparent 90%)",
        }}
      >
        <div style={{ transform: "scaleY(-1)", transformOrigin: "50% 43%", color: P.ink }}>{letters}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: WATERLINE + size * 0.86 + 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 46,
          color: P.muted,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        A focus app for deep work.
      </div>
    </AbsoluteFill>
  );
};

// ─── Phone act: four product beats in one continuous phone, then a triptych ──────────────────

const PHONE_W = 480;
const PHONE_H = 1010;
const SCREEN_W = PHONE_W - 28;
const SCREEN_H = PHONE_H - 28;

const CAPTIONS: [number, string, string][] = [
  [0, "01", "Set the session."],
  [HELD - PHONE, "02", "Noise waits outside."],
  [WEEK - PHONE, "03", "Build the habit."],
  [SUMMARY - PHONE, "04", "Close the day."],
];

const PhoneAct: React.FC = () => {
  const f = useCurrentFrame();
  const enter = m(f, 0, 34);
  const tri = m(f, TRIPTYCH - PHONE, TRIPTYCH - PHONE + 40, 0, 1, ease.quintInOut);
  const exit = m(f, PAYOFF - PHONE - 12, PAYOFF - PHONE, 0, 1, ease.quintInOut);
  const scale = 1 - tri * 0.45;
  const cy = 440 + PHONE_H / 2 + (1 - enter) * 1100 + tri * 80;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      {CAPTIONS.map(([at, num, text], i) => {
        const next = CAPTIONS[i + 1]?.[0] ?? TRIPTYCH - PHONE;
        const inP = m(f, at + 6, at + 26);
        const outP = m(f, next - 6, next + 8, 0, 1, ease.quintInOut);
        if (f < at || f > next + 10) return null;
        return (
          <div key={num} style={{ position: "absolute", left: 80, top: 236, right: 80 }}>
            <div style={{ fontFamily: T.mono, fontSize: 32, color: P.accent, letterSpacing: "0.12em", opacity: inP * (1 - outP) }}>{num} / 04</div>
            <div style={{ overflow: "hidden", marginTop: 6 }}>
              <div
                style={{
                  fontFamily: T.display,
                  fontWeight: 900,
                  fontSize: 104,
                  lineHeight: 0.95,
                  textTransform: "uppercase",
                  letterSpacing: "0.01em",
                  transform: `translateY(${(1 - inP) * 105 - outP * 105}%)`,
                }}
              >
                {text}
              </div>
            </div>
          </div>
        );
      })}

      {CAPTIONS.map(([at, num], i) => {
        const next = CAPTIONS[i + 1]?.[0] ?? TRIPTYCH - PHONE;
        const inP = m(f, at, at + 30);
        const outP = m(f, next - 4, next + 20, 0, 1, ease.quintInOut);
        if (f < at || f > next + 20) return null;
        return (
          <div
            key={`g${num}`}
            style={{
              position: "absolute",
              right: -40,
              top: 760,
              fontFamily: T.display,
              fontWeight: 900,
              fontSize: 900,
              lineHeight: 0.8,
              color: "transparent",
              WebkitTextStroke: `3px ${P.muted}38`,
              transform: `translateX(${(1 - inP) * 300 - outP * 300 - (f - at) * 0.4}px)`,
              opacity: inP * (1 - outP) * (1 - tri),
            }}
          >
            {num}
          </div>
        );
      })}

      {/* side phones of the triptych */}
      {[-1, 1].map((side) => {
        const p = m(f, TRIPTYCH - PHONE + 10, TRIPTYCH - PHONE + 46);
        return (
          <PhoneFrame key={side} cx={540 + side * (288 + (1 - p) * 700)} cy={cy} scale={0.55} opacity={p}>
            {side < 0 ? <FocusScreen f={200} /> : <WeekScreen lf={220} />}
          </PhoneFrame>
        );
      })}

      <PhoneFrame cx={540} cy={cy} scale={scale}>
        <Screens f={f} />
      </PhoneFrame>

      {tri > 0 && (
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: m(f, TRIPTYCH - PHONE + 24, TRIPTYCH - PHONE + 44),
          }}
        >
          <div style={{ fontFamily: T.mono, fontSize: 30, color: P.accent, letterSpacing: "0.14em" }}>STILLWATER</div>
          <div style={{ fontFamily: T.display, fontWeight: 900, fontSize: 96, textTransform: "uppercase", marginTop: 8 }}>One calm app.</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const PhoneFrame: React.FC<{ cx: number; cy: number; scale?: number; opacity?: number; children: React.ReactNode }> = ({
  cx,
  cy,
  scale = 1,
  opacity = 1,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: cx - PHONE_W / 2,
      top: cy - PHONE_H / 2,
      width: PHONE_W,
      height: PHONE_H,
      transform: `scale(${scale})`,
      opacity,
      borderRadius: 72,
      background: "#050C14",
      border: `2px solid ${P.ink}24`,
      boxShadow: `0 60px 120px rgba(0,0,0,0.55), inset 0 0 0 10px #0B1622`,
      padding: 14,
    }}
  >
    <div style={{ position: "relative", width: SCREEN_W, height: SCREEN_H, borderRadius: 58, overflow: "hidden", background: "#0B1928" }}>
      {children}
      <StatusBar />
    </div>
  </div>
);

const StatusBar: React.FC = () => (
  <>
    <div style={{ position: "absolute", top: 16, left: "50%", width: 124, height: 36, marginLeft: -62, borderRadius: 18, background: "#000" }} />
    <div style={{ position: "absolute", top: 20, left: 40, fontSize: 24, fontWeight: 600 }}>9:41</div>
    <div style={{ position: "absolute", top: 24, right: 36, display: "flex", gap: 6, alignItems: "flex-end" }}>
      {[8, 12, 16, 20].map((h) => (
        <div key={h} style={{ width: 5, height: h, borderRadius: 2, background: P.ink }} />
      ))}
      <div style={{ width: 38, height: 18, borderRadius: 5, border: `2px solid ${P.ink}aa`, marginLeft: 8, padding: 2 }}>
        <div style={{ width: "70%", height: "100%", borderRadius: 2, background: P.ink }} />
      </div>
    </div>
  </>
);

/** Switches between the four app screens with a vertical push. */
const Screens: React.FC<{ f: number }> = ({ f }) => {
  const states = [
    { at: 0, el: <FocusScreen f={f} /> },
    { at: HELD - PHONE, el: <HeldScreen lf={f - (HELD - PHONE)} /> },
    { at: WEEK - PHONE, el: <WeekScreen lf={f - (WEEK - PHONE)} /> },
    { at: SUMMARY - PHONE, el: <SummaryScreen lf={f - (SUMMARY - PHONE)} /> },
  ];
  return (
    <>
      {states.map((s, i) => {
        const next = states[i + 1]?.at ?? 100000;
        const inP = i === 0 ? 1 : m(f, s.at, s.at + 16);
        const outP = m(f, next, next + 16);
        if (f < s.at || f > next + 16) return null;
        return (
          <AbsoluteFill key={i} style={{ transform: `translateY(${(1 - inP) * 120 - outP * 120}px)`, opacity: inP * (1 - outP) }}>
            {s.el}
          </AbsoluteFill>
        );
      })}
    </>
  );
};

const ScreenHeader: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div style={{ position: "absolute", top: 96, left: 36 }}>
    <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</div>
    <div style={{ fontFamily: T.mono, fontSize: 22, color: P.muted, marginTop: 6, letterSpacing: "0.04em" }}>{sub}</div>
  </div>
);

const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const TAP = 60;
const SWEEP_END = 104;
const remainingAt = (f: number) => (f < SWEEP_END ? 3000 : Math.max(0, 3000 - (f - SWEEP_END) * 1.4));

const FocusScreen: React.FC<{ f: number }> = ({ f }) => {
  const sweep = m(f, TAP + 4, SWEEP_END, 0, 1, ease.expoOut);
  const r = 168;
  const c = 2 * Math.PI * r;
  const ticks = 60;
  const shown = f < TAP + 4 ? 3000 : f < SWEEP_END ? Math.round(sweep * 3000) : remainingAt(f);
  const remainFrac = f < SWEEP_END ? sweep : remainingAt(f) / 3000;
  const tapP = m(f, TAP, TAP + 18, 0, 1, ease.expoOut);
  const started = f >= TAP;

  return (
    <AbsoluteFill>
      <ScreenHeader title="Focus" sub="DEEP WORK" />
      <svg width={SCREEN_W} height={420} style={{ position: "absolute", top: 220 }} viewBox={`0 0 ${SCREEN_W} 420`}>
        <g transform={`translate(${SCREEN_W / 2} 210)`}>
          {Array.from({ length: ticks }, (_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const lit = i / ticks < remainFrac;
            const long = i % 5 === 0;
            return (
              <line
                key={i}
                x1={Math.cos(a) * (r + 26)}
                y1={Math.sin(a) * (r + 26)}
                x2={Math.cos(a) * (r + (long ? 44 : 36))}
                y2={Math.sin(a) * (r + (long ? 44 : 36))}
                stroke={lit ? P.accent : `${P.muted}55`}
                strokeWidth={long ? 4 : 2}
                strokeLinecap="round"
              />
            );
          })}
          <circle r={r} fill="none" stroke={`${P.muted}33`} strokeWidth={14} />
          <circle
            r={r}
            fill="none"
            stroke={P.accent}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - remainFrac)}
            transform="rotate(-90)"
          />
        </g>
      </svg>
      <div style={{ position: "absolute", top: 220 + 210 - 52, left: 0, right: 0, textAlign: "center", fontFamily: T.mono, fontSize: 92, fontWeight: 700, letterSpacing: "-0.02em" }}>
        {fmt(shown)}
      </div>
      <div style={{ position: "absolute", top: 690, left: 0, right: 0, textAlign: "center", fontSize: 26, color: P.muted }}>
        {started ? "Session 1 of 3 · in progress" : "Session 1 of 3"}
      </div>
      <div
        style={{
          position: "absolute",
          top: 790,
          left: 46,
          right: 46,
          height: 96,
          borderRadius: 48,
          background: started ? "transparent" : P.accent,
          border: `2px solid ${started ? P.muted + "88" : P.accent}`,
          color: started ? P.ink : NAVY_DEEP,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          fontWeight: 700,
          transform: `scale(${f >= TAP && f < TAP + 8 ? 0.95 : 1})`,
          overflow: "hidden",
        }}
      >
        {started ? "End early" : "Start session"}
        {f >= TAP && tapP < 1 && (
          <div
            style={{
              position: "absolute",
              width: 520 * tapP,
              height: 520 * tapP,
              borderRadius: "50%",
              background: `${P.accent}`,
              opacity: 0.5 * (1 - tapP),
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

const HELD_TIMES = [18, 44, 70, 96, 122, 148];
const HELD_APPS = [
  { app: "Team chat", msg: "Got a sec?" },
  { app: "Mail", msg: "Invoice #2291 attached" },
  { app: "Social", msg: "Someone mentioned you" },
  { app: "News", msg: "5 stories you missed" },
  { app: "Calendar", msg: "Lunch with Priya, 1pm" },
  { app: "Shop", msg: "Flash sale ends soon" },
];

const HeldScreen: React.FC<{ lf: number }> = ({ lf }) => {
  const absorbed = HELD_TIMES.filter((t) => lf > t + 34).length;
  const remaining = remainingAt(HELD - PHONE + lf);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 110, left: 36, right: 36, display: "flex", alignItems: "center", gap: 22 }}>
        <svg width={76} height={76} viewBox="0 0 76 76">
          <circle cx={38} cy={38} r={32} fill="none" stroke={`${P.muted}33`} strokeWidth={8} />
          <circle
            cx={38}
            cy={38}
            r={32}
            fill="none"
            stroke={P.accent}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 32}
            strokeDashoffset={2 * Math.PI * 32 * (1 - remaining / 3000)}
            transform="rotate(-90 38 38)"
          />
        </svg>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 56, fontWeight: 700 }}>{fmt(remaining)}</div>
          <div style={{ fontSize: 24, color: P.muted }}>Deep work in progress</div>
        </div>
      </div>
      {HELD_TIMES.map((t, i) => {
        const drop = m(lf, t, t + 16, 0, 1, ease.backOut);
        const fadeIn = m(lf, t, t + 8);
        const suck = m(lf, t + 22, t + 36, 0, 1, ease.quintInOut);
        if (lf < t || suck >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 26,
              top: 220 + drop * 110 + suck * 300,
              transform: `scale(${1 - suck * 0.8})`,
              transformOrigin: "50% 50%",
              opacity: fadeIn * (1 - suck),
            }}
          >
            <NotificationCard app={HELD_APPS[i].app} msg={HELD_APPS[i].msg} width={400} scale={0.8} />
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          top: 740,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 30px",
            borderRadius: 40,
            background: P.surface,
            border: `1px solid ${P.ink}1f`,
            fontSize: 32,
            fontWeight: 600,
            transform: `scale(${1 + (HELD_TIMES.some((t) => lf > t + 34 && lf < t + 42) ? 0.06 : 0)})`,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, background: P.accent }} />
          <span style={{ fontFamily: T.mono }}>{14 + absorbed}</span> held for later
        </div>
      </div>
      <div style={{ position: "absolute", top: 836, left: 0, right: 0, textAlign: "center", fontSize: 24, color: P.muted }}>
        Delivered when you surface
      </div>
    </AbsoluteFill>
  );
};

const WEEK_HOURS = [2.5, 3, 1.5, 3.5, 4, 0, 0];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const WeekScreen: React.FC<{ lf: number }> = ({ lf }) => {
  const total = WEEK_HOURS.reduce((a, b) => a + b, 0);
  const counted = total * m(lf, 14, 70, 0, 1, ease.expoOut);
  return (
    <AbsoluteFill>
      <ScreenHeader title="This week" sub="MON 19 – SUN 25 OCT" />
      <div style={{ position: "absolute", top: 250, left: 46, right: 46, height: 340, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        {WEEK_HOURS.map((h, i) => {
          const g = m(lf, 10 + i * 4, 40 + i * 4, 0, 1, ease.expoOut);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: Math.max(8, (h / 4) * 280 * g),
                  borderRadius: 12,
                  background: h > 0 ? (i === 4 ? P.accent : `${P.accent}99`) : `${P.muted}33`,
                }}
              />
              <div style={{ fontFamily: T.mono, fontSize: 22, color: i === 4 ? P.ink : P.muted }}>{DAYS[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 640, left: 46 }}>
        <div style={{ fontFamily: T.display, fontWeight: 900, fontSize: 132, lineHeight: 0.9 }}>{counted.toFixed(1)}h</div>
        <div style={{ fontSize: 26, color: P.muted, marginTop: 6 }}>of deep work this week</div>
      </div>
      <div style={{ position: "absolute", top: 850, left: 46, right: 30, display: "flex", alignItems: "center", gap: 10 }}>
        {DAYS.map((_, i) => {
          const on = i < 5 && lf > 60 + i * 6;
          return <div key={i} style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, background: on ? P.accent : `${P.muted}33`, transform: `scale(${on && lf < 66 + i * 6 ? 1.3 : 1})` }} />;
        })}
        <div style={{ fontSize: 28, fontWeight: 600, marginLeft: 10, whiteSpace: "nowrap" }}>5-day streak</div>
      </div>
    </AbsoluteFill>
  );
};

const SUMMARY_ROWS: [string, string][] = [
  ["Sessions", "3"],
  ["Deep work", "2h 30m"],
  ["Notifications held", "23"],
  ["Longest stretch", "58m"],
];

const SummaryScreen: React.FC<{ lf: number }> = ({ lf }) => {
  const check = m(lf, 70, 100);
  return (
    <AbsoluteFill>
      <ScreenHeader title="Today" sub="FRI 23 OCT" />
      <div style={{ position: "absolute", top: 250, left: 36, right: 36 }}>
        {SUMMARY_ROWS.map(([k, v], i) => {
          const p = m(lf, 12 + i * 7, 36 + i * 7);
          return (
            <div key={k} style={{ opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "26px 4px" }}>
                <span style={{ fontSize: 28, color: P.muted }}>{k}</span>
                <span style={{ fontFamily: T.display, fontWeight: 900, fontSize: 64 }}>{v}</span>
              </div>
              <div style={{ height: 1, background: `${P.ink}22`, width: `${p * 100}%` }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 800, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <svg width={84} height={84} viewBox="0 0 84 84">
          <circle cx={42} cy={42} r={38} fill="none" stroke={P.accent} strokeWidth={4} strokeDasharray={240} strokeDashoffset={240 * (1 - check)} transform="rotate(-90 42 42)" />
          <path d="M26 43 L37 54 L59 31" fill="none" stroke={P.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={50} strokeDashoffset={50 * (1 - m(lf, 92, 108))} />
        </svg>
        <div style={{ fontSize: 28, fontWeight: 600, opacity: m(lf, 96, 112) }}>Day complete. Rest well.</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Payoff: icon lands, ripples settle, MAKE IT QUIET. ──────────────────────────────────────

const ICON_Y = 740;

const Payoff: React.FC = () => {
  const f = useCurrentFrame();
  const icon = m(f, 4, 30, 0, 1, ease.backOut);
  const l1 = m(f, 34, 56);
  const l2 = m(f, 42, 64);
  const small = m(f, 70, 92);
  const out = m(f, END - PAYOFF - 14, END - PAYOFF, 0, 1, ease.quintInOut);

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((start) => {
        const p = m(f, start, start + 110, 0, 1, (t) => 1 - Math.pow(1 - t, 2));
        if (f < start) return null;
        const r = 130 + p * 900;
        return (
          <div
            key={start}
            style={{
              position: "absolute",
              left: 540 - r,
              top: ICON_Y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `2px solid ${P.accent}`,
              opacity: (1 - p) * 0.55 * (1 - start / 220),
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 540 - 130,
          top: ICON_Y - 130,
          width: 260,
          height: 260,
          borderRadius: 62,
          background: P.surface,
          border: `2px solid ${P.ink}22`,
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          transform: `scale(${icon})`,
          overflow: "hidden",
        }}
      >
        <svg width={260} height={260} viewBox="0 0 260 260">
          {[34, 64, 94].map((r, i) => (
            <circle key={r} cx={130} cy={130} r={r} fill="none" stroke={P.accent} strokeWidth={i === 0 ? 12 : 6} opacity={1 - i * 0.3} />
          ))}
          <circle cx={130} cy={130} r={10} fill={P.accent} />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 940, left: 0, right: 0, textAlign: "center", fontFamily: T.display, fontWeight: 900, fontSize: 176, lineHeight: 0.9, textTransform: "uppercase" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ transform: `translateY(${(1 - l1) * 105}%)` }}>Make it</div>
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ transform: `translateY(${(1 - l2) * 105}%)`, color: P.accent }}>quiet.</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1316, left: 0, right: 0, textAlign: "center", fontFamily: T.mono, fontSize: 32, color: P.muted, letterSpacing: "0.12em", opacity: small }}>
        STILLWATER · COMING SOON
      </div>
    </AbsoluteFill>
  );
};

// ─── Sound design ────────────────────────────────────────────────────────────────────────────

const SoundDesign: React.FC = () => (
  <>
    <Music file="ambient-glass-80.m4a" durationInFrames={STILLWATER_DURATION} volume={0.5} />
    {[0, 8, 14, 21, 29, 36, 44, 50, 58].map((t, i) => (
      <Sfx key={t} name="pop" at={t} volume={0.18 + (i % 3) * 0.05} />
    ))}
    <Sfx name="swish-reverse" at={56} volume={0.45} />
    <Sfx name="whoosh" at={72} volume={0.55} />
    <Sfx name="sub-drop" at={82} volume={0.55} />
    <Sfx name="shimmer" at={TITLE} volume={0.35} />
    <Sfx name="whoosh-short" at={PHONE} volume={0.45} />
    <Sfx name="click" at={PHONE + TAP} volume={0.7} />
    {Array.from({ length: 10 }, (_, i) => (
      <Sfx key={`t${i}`} name="tick" at={PHONE + TAP + 4 + i * 4} volume={0.25} />
    ))}
    <Sfx name="whoosh-short" at={HELD} volume={0.4} />
    {HELD_TIMES.map((t) => (
      <Sfx key={`h${t}`} name="tick" at={HELD + t + 34} volume={0.35} />
    ))}
    <Sfx name="whoosh-short" at={WEEK} volume={0.4} />
    {WEEK_HOURS.slice(0, 5).map((_, i) => (
      <Sfx key={`w${i}`} name="pop" at={WEEK + 60 + i * 6} volume={0.2} />
    ))}
    <Sfx name="whoosh-short" at={SUMMARY} volume={0.4} />
    <Sfx name="click" at={SUMMARY + 92} volume={0.4} />
    <Sfx name="swish-reverse" at={TRIPTYCH - 12} volume={0.4} />
    <Sfx name="impact" at={PAYOFF + 4} volume={0.5} />
    <Sfx name="shimmer" at={PAYOFF + 30} volume={0.3} />
    <Sfx name="shimmer" at={END + 4} volume={0.25} />
  </>
);
