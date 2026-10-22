import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease, rand } from "../kit/motion";
import { Music, Sfx } from "../kit/Sfx";
import { FlapChar, FlapWord } from "../kit/SplitFlap";
import { SystemTexture } from "../kit/Texture";

// UI Motion: product film for a fictional focus app, "Stillwater". Design system: Night Transit.
// Music: ambient-glass-80 (80 BPM → one beat = 22.5 frames). Every section boundary sits on a beat.
const S = systems.nightTransit;
const P = S.palette;
const T = S.type;
const E = ease.of(S);
const SEAM = "#0A1520";

const beat = (n: number) => Math.round(n * 22.5);
const LINE_IN = beat(3); // 67: waterline appears at the top and starts draining the noise
const TITLE = beat(5); // 112: waterline reaches its rest; silence; STILLWATER rises
const PHONE = beat(12); // 270
const HELD = beat(20); // 450
const WEEK = beat(28); // 630
const SUMMARY = beat(36); // 810
const TRIPTYCH = beat(44); // 990
const MORPH = beat(48); // 1080
const PAYOFF = beat(49); // 1103
const END = beat(61); // 1373
export const STILLWATER_DURATION = END + END_CARD_FRAMES;

const SECTION = 180; // 8 beats per product beat
const CUT_IN = 90; // beat 4 of each section cuts to a close-up
const WATERLINE = 960;

const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const cubicIn = (t: number) => t * t * t;

export const Stillwater: React.FC = () => (
  <AbsoluteFill style={{ background: P.bg, fontFamily: T.body, color: P.ink }}>
    <Backdrop />
    <Sequence durationInFrames={TITLE + 1}>
      <Hook />
    </Sequence>
    <Sequence from={TITLE} durationInFrames={PHONE - TITLE + 40}>
      <Title />
    </Sequence>
    <Waterline />
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

// ─── Backdrop ────────────────────────────────────────────────────────────────────────────────

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {[0.18, 0.31, 0.47, 0.66, 0.82].map((y, i) => (
        <div
          key={y}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${y * 100}%`,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${P.muted}22 ${30 + i * 8}%, transparent)`,
            transform: `translateX(${Math.sin((frame + i * 40) / 90) * 60}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── The waterline: one element from the drain through the title ─────────────────────────────

/** y of the waterline at a frame (null when it isn't on screen). */
const waterlineY = (f: number) => {
  if (f < LINE_IN - 10 || f >= PHONE + 40) return null;
  if (f < TITLE) return m(f, LINE_IN, TITLE, 220, WATERLINE, ease.quintInOut);
  return WATERLINE - m(f, PHONE, PHONE + 36, 0, 1, E) * 1300; // pushed up and out by the phone
};

const Waterline: React.FC = () => {
  const f = useCurrentFrame();
  const y = waterlineY(f);
  if (y === null) return null;
  const draw = m(f, LINE_IN - 10, LINE_IN + 2);
  return <div style={{ position: "absolute", top: y, left: 540 - draw * 460, width: draw * 920, height: 3, background: P.accent }} />;
};

// ─── Hook: notifications pile up around "TOO LOUD.", the waterline drains them away ──────────

const NOTES = [
  { app: "Mail", msg: "Re: Re: Re: quick question", x: 60, y: 250, r: -5, z: 0.84, at: 4 },
  { app: "Team chat", msg: "Can you jump on a call?", x: 440, y: 300, r: 4, z: 1.0, at: 0 },
  { app: "Bank", msg: "Your statement is ready", x: 90, y: 430, r: -2, z: 0.8, at: 8 },
  { app: "Calendar", msg: "Standup moved to 9:15", x: 450, y: 470, r: 3, z: 1.02, at: 0 },
  { app: "News", msg: "Breaking: everything, again", x: 560, y: 760, r: -3, z: 0.8, at: 12 },
  { app: "Shop", msg: "Your cart misses you", x: 600, y: 990, r: -6, z: 0.8, at: 16 },
  { app: "Team chat", msg: "17 new in #general", x: 430, y: 1190, r: 5, z: 1.06, at: 0 },
  { app: "Social", msg: "You have 43 new likes", x: 40, y: 1290, r: 2, z: 0.82, at: 20 },
  { app: "Mail", msg: "Last chance: 40% off", x: 440, y: 1390, r: -4, z: 1.0, at: 0 },
];
const POPS = [0, 4, 8, 12, 16, 20];

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const y = waterlineY(frame) ?? 0;
  const push = m(frame, 0, LINE_IN, 1, 1.06, (t) => t);
  const sink = m(frame, LINE_IN, TITLE, 0, 1, cubicIn);

  return (
    <AbsoluteFill style={{ clipPath: frame >= LINE_IN - 10 ? `inset(${y}px 0 0 0)` : undefined }}>
      {[...NOTES]
        .sort((a, b) => a.z - b.z)
        .map((n, k) => {
          const i = NOTES.indexOf(n);
          if (frame < n.at) return null;
          const appear = n.at === 0 ? 1 : m(frame, n.at, n.at + 6);
          const buzz = Math.sin(frame * 2.1 + i * 7) * 3 * (1 - sink);
          const far = n.z < 0.9;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: n.x + buzz,
                top: n.y + sink * (900 + rand(i) * 300),
                transform: `rotate(${n.r + sink * (rand(i + 3) - 0.5) * 20}deg) scale(${n.z * (0.92 + appear * 0.08)})`,
                transformOrigin: "0 0",
                opacity: appear * (far ? 0.5 : 0.95),
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
          top: 650,
          fontFamily: T.display,
          fontWeight: 900,
          fontSize: 300,
          lineHeight: 0.9,
          letterSpacing: "0.005em",
          color: P.accent,
          textTransform: "uppercase",
          transform: `translateY(${sink * 1200}px) scale(${push})`,
          transformOrigin: "0% 50%",
        }}
      >
        Too
        <br />
        loud.
      </div>
    </AbsoluteFill>
  );
};

const NotificationCard: React.FC<{ app: string; msg: string; width: number; scale?: number }> = ({ app, msg, width, scale = 1 }) => (
  <div
    style={{
      width,
      padding: `${22 * scale}px ${26 * scale}px`,
      borderRadius: 30 * scale,
      background: P.surface,
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
        background: P.bg,
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
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 24 * scale, color: P.muted, letterSpacing: "0.04em" }}>
        <span>{app.toUpperCase()}</span>
        <span>now</span>
      </div>
      <div style={{ fontSize: 34 * scale, fontWeight: 600, marginTop: 4 * scale, whiteSpace: "nowrap" }}>{msg}</div>
    </div>
  </div>
);

// ─── Title: STILLWATER rises out of the waterline with a rippling reflection ─────────────────

const Title: React.FC = () => {
  const f = useCurrentFrame();
  const word = "STILLWATER";
  const pushUp = m(f, PHONE - TITLE, PHONE - TITLE + 36, 0, 1, E) * 1300;
  const sub = m(f, 46, 70);
  const size = 196;
  const cap = size * 0.86;

  const letters = (
    <div style={{ display: "flex", justifyContent: "center", fontFamily: T.display, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: "0.01em" }}>
      {Array.from(word).map((ch, i) => (
        <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - m(f, i * 2.5, i * 2.5 + 28)) * 105}%)` }}>
          {ch}
        </span>
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ transform: `translateY(${-pushUp}px)` }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="ripple">
          <feTurbulence type="fractalNoise" baseFrequency={`0.004 ${0.06 + 0.01 * Math.sin(f / 10)}`} numOctaves={2} seed={Math.floor(f / 3)} />
          <feDisplacementMap in="SourceGraphic" scale={18} />
        </filter>
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: WATERLINE - cap, height: cap, overflow: "hidden" }}>{letters}</div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: WATERLINE + 6,
          height: cap,
          overflow: "hidden",
          opacity: 0.22,
          filter: "url(#ripple)",
          maskImage: "linear-gradient(180deg, black 0%, transparent 90%)",
        }}
      >
        <div style={{ transform: "scaleY(-1)", transformOrigin: "50% 43%" }}>{letters}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: WATERLINE + cap + 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 48,
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

// ─── Phone act ───────────────────────────────────────────────────────────────────────────────

const PHONE_W = 480;
const PHONE_H = 1010;
const SCREEN_W = PHONE_W - 28;
const SCREEN_H = PHONE_H - 28;
const BASE = 1.3; // phone scale during the product beats
const PHONE_CY = 420 + (PHONE_H * BASE) / 2;

/** Frame position of a point on the screen when the phone sits at its base framing. */
const onScreen = (sx: number, sy: number) => ({ x: 540 + (14 + sx - PHONE_W / 2) * BASE, y: PHONE_CY + (14 + sy - PHONE_H / 2) * BASE });

const SECTIONS = [
  { at: 0, num: "01", title: "Set the session.", focus: onScreen(SCREEN_W / 2, 400) },
  { at: HELD - PHONE, num: "02", title: "Noise waits.", focus: onScreen(SCREEN_W / 2, 640) },
  { at: WEEK - PHONE, num: "03", title: "Build the habit.", focus: onScreen(SCREEN_W / 2, 400) },
  { at: SUMMARY - PHONE, num: "04", title: "Close the day.", focus: onScreen(SCREEN_W / 2, 690) },
];
const TRI = TRIPTYCH - PHONE;
const MOR = MORPH - PHONE;

const PhoneAct: React.FC = () => {
  const f = useCurrentFrame();
  const enter = m(f, 0, 36);
  const sIdx = SECTIONS.reduce((acc, s, i) => (f >= s.at ? i : acc), 0);
  const sec = SECTIONS[sIdx];
  const local = f - sec.at;

  // Camera: slow push on every hold; hard cut to a 1.8x close-up on beat 4 of each section.
  let k = 1;
  let tx = 0;
  let ty = 0;
  if (f < TRI) {
    const zoomed = local >= CUT_IN;
    k = zoomed ? 1.8 + 0.09 * ((local - CUT_IN) / (SECTION - CUT_IN)) : 1 + 0.05 * (local / CUT_IN);
    const target = zoomed ? { x: 540, y: 1000 } : sec.focus;
    tx = target.x - sec.focus.x * k;
    ty = target.y - sec.focus.y * k;
  }

  return (
    <AbsoluteFill>
      {f < TRI ? (
        <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${k})`, transformOrigin: "0 0" }}>
          <PhoneFrame cx={540} cy={PHONE_CY + (1 - enter) * 1400} scale={BASE}>
            <Screens f={f} />
          </PhoneFrame>
        </AbsoluteFill>
      ) : (
        <Triptych f={f - TRI} />
      )}
      {f < TRI && SECTIONS.map((s) => <RailCaption key={s.num} f={f} at={s.at} until={s.at + CUT_IN} num={s.num} text={s.title} />)}
    </AbsoluteFill>
  );
};

/** Section caption on a signage rail: slides in from the left, leaves to the right. */
const RailCaption: React.FC<{ f: number; at: number; until: number; num: string; text: string }> = ({ f, at, until, num, text }) => {
  if (f < at || f > until) return null;
  const inP = m(f, at + 4, at + 19);
  const outP = m(f, until - 14, until, 0, 1, ease.quintInOut);
  const x = 80 + (inP - 1) * 1100 + outP * 1100;
  return (
    <div style={{ position: "absolute", left: x, top: 214, width: 920 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 54, height: 6, background: P.accent }} />
        <div style={{ fontFamily: T.mono, fontSize: 40, color: P.accent, letterSpacing: "0.12em" }}>{num} / 04</div>
      </div>
      <div style={{ fontFamily: T.display, fontWeight: 900, fontSize: 124, lineHeight: 0.95, textTransform: "uppercase", letterSpacing: "0.01em", marginTop: 8 }}>
        {text}
      </div>
    </div>
  );
};

const PhoneFrame: React.FC<{ cx: number; cy: number; scale?: number; children: React.ReactNode }> = ({ cx, cy, scale = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: cx - PHONE_W / 2,
      top: cy - PHONE_H / 2,
      width: PHONE_W,
      height: PHONE_H,
      transform: `scale(${scale})`,
      borderRadius: 72,
      background: "#05090E",
      border: `2px solid ${P.ink}24`,
      boxShadow: `0 60px 120px rgba(0,0,0,0.55), inset 0 0 0 10px ${SEAM}`,
      padding: 14,
    }}
  >
    <div style={{ position: "relative", width: SCREEN_W, height: SCREEN_H, borderRadius: 58, overflow: "hidden", background: P.bg }}>
      {children}
      <StatusBar />
    </div>
  </div>
);

const StatusBar: React.FC = () => (
  <>
    <div style={{ position: "absolute", top: 16, left: "50%", width: 124, height: 36, marginLeft: -62, borderRadius: 18, background: "#000" }} />
    <div style={{ position: "absolute", top: 20, left: 40, fontSize: 26, fontWeight: 600 }}>9:41</div>
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

/** Each section is a hard cut to its screen (the rail caption carries the transition). */
const Screens: React.FC<{ f: number }> = ({ f }) => {
  if (f < HELD - PHONE) return <FocusScreen f={f} />;
  if (f < WEEK - PHONE) return <HeldScreen lf={f - (HELD - PHONE)} />;
  if (f < SUMMARY - PHONE) return <WeekScreen lf={f - (WEEK - PHONE)} />;
  return <SummaryScreen lf={f - (SUMMARY - PHONE)} />;
};

const ScreenHeader: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div style={{ position: "absolute", top: 90, left: 36 }}>
    <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</div>
    <div style={{ fontFamily: T.mono, fontSize: 26, color: P.muted, marginTop: 6, letterSpacing: "0.04em" }}>{sub}</div>
  </div>
);

// Focus timer: 50:00 holds while the ring sweeps in, then counts down in real seconds.
const TAP = beat(2); // 45
const SWEEP_END = 86;
const secondsLeft = (f: number, startSec: number, countFrom: number) => (f < countFrom ? startSec : startSec - Math.floor((f - countFrom) / 30) - 1);
const digitsAt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}${String(sec % 60).padStart(2, "0")}`;

/** mm:ss on split-flap tiles. `secAt` receives the composition-local frame of the calling screen. */
const FlapClock: React.FC<{ secAt: (f: number) => number; size: number }> = ({ secAt, size }) => {
  const w = size * 0.74;
  const h = size * 1.22;
  const tile = (i: number) => (
    <FlapChar
      key={i}
      valueAt={(fr) => digitsAt(secAt(fr))[i]}
      width={w}
      height={h}
      fontFamily={T.mono ?? T.body}
      fontSize={size}
      color={P.ink}
      tile={P.surface}
      seam={SEAM}
    />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.08 }}>
      {tile(0)}
      {tile(1)}
      <div style={{ fontFamily: T.mono, fontSize: size, fontWeight: 700, color: P.accent, margin: `0 ${size * 0.02}px` }}>:</div>
      {tile(2)}
      {tile(3)}
    </div>
  );
};

/** `f` is frames since the phone act started (FlapChar reads the Sequence frame, which is the same). */
const FocusScreen: React.FC<{ f: number; frozen?: boolean }> = ({ f, frozen }) => {
  const sweep = m(f, TAP + 4, SWEEP_END, 0, 1, ease.expoOut);
  const r = 168;
  const c = 2 * Math.PI * r;
  const ticks = 60;
  const started = f >= TAP;
  const secAt = (fr: number) => (frozen ? 3000 : secondsLeft(fr, 3000, SWEEP_END));
  const ring = f < SWEEP_END ? sweep : secAt(f) / 3000;
  const tapP = m(f, TAP, TAP + 18, 0, 1, ease.expoOut);

  return (
    <AbsoluteFill>
      <ScreenHeader title="Focus" sub="DEEP WORK" />
      <svg width={SCREEN_W} height={420} style={{ position: "absolute", top: 190 }} viewBox={`0 0 ${SCREEN_W} 420`}>
        <g transform={`translate(${SCREEN_W / 2} 210)`}>
          {Array.from({ length: ticks }, (_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const lit = i / ticks < ring;
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
          {ring > 0.995 ? (
            <circle r={r} fill="none" stroke={P.accent} strokeWidth={14} />
          ) : (
            <circle r={r} fill="none" stroke={P.accent} strokeWidth={14} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ring)} transform="rotate(-90)" />
          )}
        </g>
      </svg>
      <div style={{ position: "absolute", top: 190 + 210 - 44, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <FlapClock secAt={secAt} size={72} />
      </div>
      <div style={{ position: "absolute", top: 632, left: 0, right: 0, textAlign: "center", fontSize: 28, color: P.muted }}>
        {started ? "Session 1 of 3 · in progress" : "Session 1 of 3"}
      </div>
      <div
        style={{
          position: "absolute",
          top: 700,
          left: 46,
          right: 46,
          height: 92,
          borderRadius: 46,
          background: started ? "transparent" : P.accent,
          border: `2px solid ${started ? P.muted + "88" : P.accent}`,
          color: started ? P.ink : P.bg,
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
        {started && tapP < 1 && (
          <div
            style={{
              position: "absolute",
              width: 520 * tapP,
              height: 520 * tapP,
              borderRadius: "50%",
              background: P.accent,
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

const HELD_TIMES = [8, 30, 52, 74, 96, 118];
const HELD_APPS = [
  { app: "Team chat", msg: "Got a sec?" },
  { app: "Mail", msg: "Invoice #2291" },
  { app: "Social", msg: "Someone tagged you" },
  { app: "News", msg: "5 stories you missed" },
  { app: "Calendar", msg: "Lunch with Priya, 1pm" },
  { app: "Shop", msg: "Flash sale ends soon" },
];
const HELD_START_SEC = 31 * 60 + 40;

const HeldScreen: React.FC<{ lf: number }> = ({ lf }) => {
  const absorbed = HELD_TIMES.filter((t) => lf >= t + 30).length;
  const offset = HELD - PHONE;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 100, left: 36, right: 36, display: "flex", alignItems: "center", gap: 20 }}>
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
            strokeDashoffset={2 * Math.PI * 32 * (1 - HELD_START_SEC / 3000)}
            transform="rotate(-90 38 38)"
          />
        </svg>
        <div>
          <FlapClock secAt={(fr) => secondsLeft(fr - offset, HELD_START_SEC, 0)} size={40} />
          <div style={{ fontSize: 26, color: P.muted, marginTop: 6 }}>Deep work in progress</div>
        </div>
      </div>
      {HELD_TIMES.map((t, i) => {
        const drop = m(lf, t, t + 14);
        const suck = m(lf, t + 18, t + 30, 0, 1, ease.quintInOut);
        if (lf < t || suck >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 26,
              top: 240 + drop * 90 + suck * 290,
              transform: `scale(${1 - suck * 0.8})`,
              opacity: drop * (1 - suck),
            }}
          >
            <NotificationCard app={HELD_APPS[i].app} msg={HELD_APPS[i].msg} width={400} scale={0.8} />
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 34px",
            borderRadius: 44,
            background: P.surface,
            border: `1px solid ${P.ink}1f`,
            fontSize: 34,
            fontWeight: 600,
            transform: `scale(${HELD_TIMES.some((t) => lf >= t + 30 && lf < t + 37) ? 1.06 : 1})`,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 9, background: P.accent }} />
          <span style={{ fontFamily: T.mono }}>{14 + absorbed}</span> held for later
        </div>
      </div>
      <div style={{ position: "absolute", top: 704, left: 0, right: 0, textAlign: "center", fontSize: 28, color: P.muted }}>
        Delivered when you surface
      </div>
    </AbsoluteFill>
  );
};

const WEEK_HOURS = [2.5, 3, 1.5, 3.5, 2.5, 0, 0];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TODAY = 4;

const WeekScreen: React.FC<{ lf: number }> = ({ lf }) => {
  const total = WEEK_HOURS.reduce((a, b) => a + b, 0);
  const counted = total * m(lf, 10, 60, 0, 1, ease.expoOut);
  return (
    <AbsoluteFill>
      <ScreenHeader title="This week" sub="MON 19 – SUN 25 OCT" />
      <div style={{ position: "absolute", top: 230, left: 46, right: 46, height: 300, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        {WEEK_HOURS.map((h, i) => {
          const g = m(lf, 6 + i * 4, 34 + i * 4, 0, 1, ease.expoOut);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: Math.max(8, (h / 3.5) * 230 * g), borderRadius: 12, background: h === 0 ? `${P.muted}33` : i === TODAY ? P.accent : P.ink }} />
              <div style={{ fontFamily: T.mono, fontSize: 26, color: i === TODAY ? P.accent : P.muted }}>{DAYS[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 572, left: 46 }}>
        <div style={{ fontFamily: T.display, fontWeight: 900, fontSize: 132, lineHeight: 0.9 }}>{counted.toFixed(1)}h</div>
        <div style={{ fontSize: 28, color: P.muted, marginTop: 6 }}>of deep work this week</div>
      </div>
      <div style={{ position: "absolute", top: 768, left: 46, right: 30, display: "flex", alignItems: "center", gap: 10 }}>
        {DAYS.map((_, i) => {
          const on = i <= TODAY && lf > 46 + i * 6;
          return <div key={i} style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, background: on ? P.accent : `${P.muted}33` }} />;
        })}
        <div style={{ fontSize: 30, fontWeight: 600, marginLeft: 10, whiteSpace: "nowrap" }}>5-day streak</div>
      </div>
    </AbsoluteFill>
  );
};

const SUMMARY_ROWS: [string, string][] = [
  ["Sessions", "3"],
  ["Deep work", "2h 30m"],
  ["Held for later", "23"],
  ["Longest stretch", "50m"],
];

const SummaryScreen: React.FC<{ lf: number }> = ({ lf }) => {
  const check = m(lf, 56, 84);
  return (
    <AbsoluteFill>
      <ScreenHeader title="Today" sub="FRI 23 OCT" />
      <div style={{ position: "absolute", top: 210, left: 36, right: 36 }}>
        {SUMMARY_ROWS.map(([k, v], i) => {
          const p = m(lf, 6 + i * 6, 28 + i * 6);
          return (
            <div key={k} style={{ opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 4px" }}>
                <span style={{ fontSize: 30, color: P.muted }}>{k}</span>
                <span style={{ fontFamily: T.display, fontWeight: 900, fontSize: 62 }}>{v}</span>
              </div>
              <div style={{ height: 1, background: `${P.ink}22`, width: `${p * 100}%` }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 610, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <svg width={84} height={84} viewBox="0 0 84 84">
          <circle cx={42} cy={42} r={38} fill="none" stroke={P.accent} strokeWidth={4} strokeDasharray={240} strokeDashoffset={240 * (1 - check)} transform="rotate(-90 42 42)" />
          <path
            d="M26 43 L37 54 L59 31"
            fill="none"
            stroke={P.accent}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={50}
            strokeDashoffset={50 * (1 - m(lf, 78, 92))}
          />
        </svg>
        <div style={{ fontSize: 32, fontWeight: 600, opacity: m(lf, 84, 98) }}>Day complete. Rest well.</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Triptych, then a match cut: the dial ring becomes the app icon ──────────────────────────

const TRI_SCALE = 0.55;
const ICON_Y = 740;
const DIAL_OFFSET = (14 + 190 + 210 - PHONE_H / 2) * TRI_SCALE; // dial centre relative to phone centre

const Triptych: React.FC<{ f: number }> = ({ f }) => {
  const settle = m(f, 0, 30);
  const sideIn = m(f, 6, 36);
  const morph = m(f, MOR - TRI, PAYOFF - PHONE - TRI, 0, 1, ease.quintInOut);
  const cyRest = 1060;
  const cyMorph = ICON_Y - DIAL_OFFSET;
  const cy = cyRest + (cyMorph - cyRest) * morph;
  const scale = BASE + (TRI_SCALE - BASE) * settle;
  const headIn = m(f, 12, 27);
  const headOut = m(f, MOR - TRI, MOR - TRI + 14, 0, 1, ease.quintInOut);
  const side = (dir: number) => 540 + dir * (288 + (1 - sideIn) * 800 + morph * 900);

  return (
    <AbsoluteFill>
      <PhoneFrame cx={side(-1)} cy={cyRest} scale={TRI_SCALE}>
        <SummaryScreen lf={140} />
      </PhoneFrame>
      <PhoneFrame cx={side(1)} cy={cyRest} scale={TRI_SCALE}>
        <WeekScreen lf={140} />
      </PhoneFrame>
      <PhoneFrame cx={540} cy={cy} scale={scale}>
        <FocusScreen f={SWEEP_END} frozen />
      </PhoneFrame>
      <div style={{ position: "absolute", top: 300, left: 80 + (headIn - 1) * 1100 + headOut * 1100, width: 920, textAlign: "center" }}>
        <div style={{ fontFamily: T.mono, fontSize: 40, color: P.accent, letterSpacing: "0.14em" }}>STILLWATER</div>
        <div style={{ fontFamily: T.display, fontWeight: 900, fontSize: 132, textTransform: "uppercase", lineHeight: 0.95, marginTop: 8 }}>One calm app.</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Payoff: the icon, ripples that settle, a split-flap tagline, the waterline returns ──────

const RIPPLES = [0, 22, 67];
const LINE_BACK = 200;

const Payoff: React.FC = () => {
  const f = useCurrentFrame();
  const settle = m(f, 0, 16, 0.96, 1);
  const small = m(f, 84, 99);
  const line = m(f, LINE_BACK, LINE_BACK + 28, 0, 1, ease.quintInOut);

  return (
    <AbsoluteFill>
      {RIPPLES.map((start, i) => {
        if (f < start) return null;
        const p = m(f, start, start + 110, 0, 1, (t) => 1 - Math.pow(1 - t, 2));
        const r = 120 + p * 780;
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
              opacity: (1 - p) * (0.6 - i * 0.18),
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
          transform: `scale(${settle})`,
          overflow: "hidden",
        }}
      >
        <svg width={260} height={260} viewBox="0 0 260 260">
          <defs>
            <clipPath id="above">
              <rect x={0} y={0} width={260} height={130} />
            </clipPath>
            <clipPath id="below">
              <rect x={0} y={130} width={260} height={130} />
            </clipPath>
          </defs>
          <circle cx={130} cy={130} r={84} fill="none" stroke={P.accent} strokeWidth={14} clipPath="url(#above)" />
          <circle cx={130} cy={130} r={84} fill="none" stroke={P.accent} strokeWidth={14} opacity={0.28} clipPath="url(#below)" />
          <rect x={26} y={128} width={208} height={5} fill={P.ink} />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 950, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <FlapWord text="MAKE IT" start={18} tileWidth={96} height={156} fontFamily={T.display} fontSize={140} fontWeight={900} color={P.ink} tile={P.surface} seam={SEAM} />
        <FlapWord text="QUIET." start={26} tileWidth={96} height={156} fontFamily={T.display} fontSize={140} fontWeight={900} color={P.accent} tile={P.surface} seam={SEAM} />
      </div>
      <div style={{ position: "absolute", top: 1300, left: 540 - line * 460, width: line * 920, height: 3, background: P.accent }} />
      <div
        style={{
          position: "absolute",
          top: 1330,
          left: 80 + (small - 1) * 1100,
          width: 920,
          textAlign: "center",
          fontFamily: T.mono,
          fontSize: 40,
          color: P.muted,
          letterSpacing: "0.12em",
        }}
      >
        STILLWATER · COMING SOON
      </div>
    </AbsoluteFill>
  );
};

// ─── Sound design: noisy hook, real silence at the drain, then calm ──────────────────────────

const SoundDesign: React.FC = () => (
  <>
    {POPS.map((t, i) => (
      <Sfx key={`p${t}`} name="pop" at={t} volume={0.3 + i * 0.04} />
    ))}
    <Sfx name="riser" at={0} volume={0.22} />
    <Sfx name="swish-reverse" at={LINE_IN - 18} volume={0.4} />
    <Sfx name="whoosh" at={LINE_IN} volume={0.6} />
    <Sfx name="sub-drop" at={LINE_IN + 4} volume={0.6} />
    <Sequence from={TITLE} durationInFrames={STILLWATER_DURATION - TITLE}>
      <Music file="ambient-glass-80.m4a" durationInFrames={STILLWATER_DURATION - TITLE} volume={0.5} fadeIn={15} fadeOut={END_CARD_FRAMES} />
    </Sequence>
    <Sfx name="shimmer" at={TITLE + 4} volume={0.3} />
    <Sfx name="whoosh-short" at={PHONE} volume={0.45} />
    <Sfx name="click" at={PHONE + TAP} volume={0.7} />
    {Array.from({ length: 8 }, (_, i) => (
      <Sfx key={`s${i}`} name="tick" at={PHONE + TAP + 6 + i * 4} volume={0.22} />
    ))}
    {[1, 2, 3].map((n) => (
      <Sfx key={`c${n}`} name="tick" at={PHONE + SWEEP_END + n * 30} volume={0.3} />
    ))}
    {SECTIONS.map((s) => (
      <Sfx key={`z${s.num}`} name="click" at={PHONE + s.at + CUT_IN} volume={0.25} />
    ))}
    {SECTIONS.slice(1).map((s) => (
      <Sfx key={`r${s.num}`} name="whoosh-short" at={PHONE + s.at} volume={0.4} />
    ))}
    {HELD_TIMES.map((t) => (
      <Sfx key={`h${t}`} name="tick" at={HELD + t + 30} volume={0.35} />
    ))}
    {[0, 1, 2, 3, 4].map((i) => (
      <Sfx key={`w${i}`} name="pop" at={WEEK + 47 + i * 6} volume={0.2} />
    ))}
    <Sfx name="click" at={SUMMARY + 84} volume={0.4} />
    <Sfx name="swish-reverse" at={TRIPTYCH - 20} volume={0.35} />
    <Sfx name="whoosh-short" at={TRIPTYCH} volume={0.4} />
    <Sfx name="whoosh" at={MORPH} volume={0.45} />
    <Sfx name="impact" at={PAYOFF} volume={0.55} />
    {Array.from({ length: 10 }, (_, i) => (
      <Sfx key={`f${i}`} name="tick" at={PAYOFF + 18 + i * 3} volume={0.16} />
    ))}
    <Sfx name="shimmer" at={PAYOFF + LINE_BACK} volume={0.28} />
    <Sfx name="shimmer" at={END + 4} volume={0.2} />
  </>
);
