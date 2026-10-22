import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import timings from "../../../public/voice/CuriosityNotInformation/timings.json";
import { systems } from "../design/systems";
import { EndCard, END_CARD_FRAMES } from "../kit/EndCard";
import { clamp, ease } from "../kit/motion";
import { Sfx } from "../kit/Sfx";

// Kinetic Type: "Viewers stay for curiosity, not information." Swiss Signal design system.
// Narration: Kokoro bm_george. Music: pulse-minimal-120 (beat = 15 frames). Every line starts on a beat.
const S = systems.swissSignal;
const P = S.palette;
const DISPLAY = S.type.display;
const MONO = S.type.mono ?? S.type.body;
const E = ease.of(S);

type LineId = keyof typeof timings;
const LINE_START: Record<LineId, number> = {
  l01: 30, l02: 120, l03a: 195, l03b: 225, l03c: 255, l04: 315, l05: 390, l06: 465,
  l07: 570, l08: 630, l09: 705, l10: 765, l11: 885, l12: 1005,
};
const FINAL_HOLD_END = 1155;
export const CURIOSITY_DURATION = FINAL_HOLD_END + END_CARD_FRAMES;

/** Absolute frame at which word `i` of a narration line is spoken. */
const w = (id: LineId, i: number) => LINE_START[id] + Math.round(timings[id].words[i].start * 30);
const lineEnd = (id: LineId) => LINE_START[id] + Math.round(timings[id].duration * 30);

const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

// Scenes: [from, to) in absolute frames. Each scene cuts in with a short smash-zoom.
const SCENES = {
  hook: [0, 30],
  viewers: [30, 120],
  everywhere: [120, 195],
  cheap: [195, 300],
  curiosity: [300, 390],
  gap: [390, 465],
  know: [465, 570],
  loop: [570, 630],
  timeline: [630, 765],
  second: [765, 885],
  forget: [885, 1005],
  findOut: [1005, FINAL_HOLD_END],
} as const;

export const CuriosityNotInformation: React.FC = () => (
  <AbsoluteFill style={{ background: P.bg, color: P.ink, fontFamily: DISPLAY }}>
    <Scene range={SCENES.hook} smash={false}><Hook /></Scene>
    <Scene range={SCENES.viewers} dir={-1}><Viewers /></Scene>
    <Scene range={SCENES.everywhere} dir={1}><Everywhere /></Scene>
    <Scene range={SCENES.cheap}><Cheap /></Scene>
    <Scene range={SCENES.curiosity}><Curiosity /></Scene>
    <Scene range={SCENES.gap} dir={-1}><Gap /></Scene>
    <Scene range={SCENES.know} dir={1}><Know /></Scene>
    <Scene range={SCENES.loop}><Loop /></Scene>
    <Scene range={SCENES.timeline} dir={-1}><Timeline /></Scene>
    <Scene range={SCENES.second} dir={1}><Second /></Scene>
    <Scene range={SCENES.forget} dir={-1}><Forget /></Scene>
    <Scene range={SCENES.findOut}><FindOut /></Scene>
    <Sequence from={FINAL_HOLD_END}>
      <EndCard system={S} />
    </Sequence>
    <SoundDesign />
  </AbsoluteFill>
);

/** Wraps a scene: absolute-frame children, a 6-frame smash-zoom on the cut, and a slow drift. */
const Scene: React.FC<{ range: readonly [number, number]; smash?: boolean; dir?: -1 | 0 | 1; children: React.ReactNode }> = ({
  range,
  smash = true,
  dir = 0,
  children,
}) => {
  const f = useCurrentFrame();
  if (f < range[0] || f >= range[1]) return null;
  const local = f - range[0];
  const hit = smash ? m(local, 0, 7, 1, 0, ease.expoOut) : 0;
  const drift = 1 + 0.025 * (local / (range[1] - range[0]));
  return <AbsoluteFill style={{ transform: `translateX(${hit * dir * 70}px) scale(${(1 + hit * 0.07) * drift})` }}>{children}</AbsoluteFill>;
};

// ─── Shared pieces ───────────────────────────────────────────────────────────────────────────

const Grid: React.FC<{ color?: string }> = ({ color = P.ink }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: 13 }, (_, i) => (
      <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: 80 + (i * 920) / 12, width: 1, background: `${color}10` }} />
    ))}
  </AbsoluteFill>
);

const Label: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = P.accent, style }) => (
  <div style={{ fontFamily: MONO, fontSize: 44, letterSpacing: "0.12em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

/** One line of display type that rises out of a mask at `at`. */
const Hit: React.FC<{
  at: number;
  size: number;
  color?: string;
  children: React.ReactNode;
  weight?: number;
  from?: "below" | "left";
  style?: React.CSSProperties;
}> = ({ at, size, color = P.ink, weight = 900, from = "below", children, style }) => {
  const f = useCurrentFrame();
  const p = m(f, at, at + 8, 0, 1, ease.expoOut);
  if (f < at) return <div style={{ height: size * 0.92 }} />;
  const enter = from === "below" ? `translateY(${(1 - p) * 100}%)` : `translateX(${(p - 1) * 105}%)`;
  return (
    <div style={{ clipPath: from === "below" ? "inset(0 -120px)" : "inset(-20px -120px -20px 0)", height: size * 0.92, ...style }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 0.92,
          letterSpacing: "-0.045em",
          wordSpacing: "0.12em",
          textTransform: "uppercase",
          color,
          whiteSpace: "nowrap",
          transform: enter,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** A photoreal-ish eye inside an "O" ring. `look` is -1..1 on each axis, `lid` 0 open → 1 closed. */
const EyeO: React.FC<{ size: number; look: [number, number]; lid: number; ring?: string; iris?: string }> = ({
  size,
  look,
  lid,
  ring = P.ink,
  iris = P.accent,
}) => {
  const R = size / 2;
  const stroke = size * 0.2;
  const inner = R - stroke * 0.98;
  const irisR = inner * 0.62;
  const px = look[0] * (inner - irisR) * 0.9;
  const py = look[1] * (inner - irisR) * 0.6;
  const id = `eye${Math.round(size)}`;
  return (
    <svg width={size} height={size} viewBox={`${-R} ${-R} ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <radialGradient id={`${id}-sclera`} cx="0" cy="0" r={inner} gradientUnits="userSpaceOnUse">
          <stop offset="0.6" stopColor="#FBF9F4" />
          <stop offset="1" stopColor="#D9D3C7" />
        </radialGradient>
        <radialGradient id={`${id}-iris`} cx={px} cy={py} r={irisR} gradientUnits="userSpaceOnUse">
          <stop offset="0.25" stopColor="#FF7A5C" />
          <stop offset="0.7" stopColor={iris} />
          <stop offset="1" stopColor="#7A140A" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle r={inner} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <circle r={inner} fill={`url(#${id}-sclera)`} />
        <circle cx={px} cy={py} r={irisR} fill={`url(#${id}-iris)`} />
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          const r0 = irisR * 0.36;
          return (
            <line
              key={i}
              x1={px + Math.cos(a) * r0}
              y1={py + Math.sin(a) * r0}
              x2={px + Math.cos(a) * irisR * (0.86 + (i % 3) * 0.05)}
              y2={py + Math.sin(a) * irisR * (0.86 + (i % 3) * 0.05)}
              stroke="#5A0E06"
              strokeOpacity={0.35}
              strokeWidth={irisR * 0.025}
            />
          );
        })}
        <circle cx={px} cy={py} r={irisR} fill="none" stroke="#3A0904" strokeWidth={irisR * 0.08} />
        <circle cx={px} cy={py} r={irisR * 0.36} fill="#0B0B0B" />
        <ellipse cx={px - irisR * 0.3} cy={py - irisR * 0.34} rx={irisR * 0.16} ry={irisR * 0.11} fill="#fff" opacity={0.92} />
        {/* lids close from top and bottom; when nearly shut, a lash line reads as a closed eye */}
        <rect x={-R} y={-R} width={size} height={R * lid * 1.02} fill={ring} />
        <rect x={-R} y={R - R * lid * 1.02} width={size} height={R * lid * 1.02} fill={ring} />
        {lid > 0.55 && (
          <path
            d={`M ${-inner * 0.9} ${-inner * 0.05} Q 0 ${inner * 0.38} ${inner * 0.9} ${-inner * 0.05}`}
            fill="none"
            stroke="#FBF9F4"
            strokeOpacity={(lid - 0.55) / 0.45}
            strokeWidth={R * 0.07}
            strokeLinecap="round"
          />
        )}
      </g>
      <circle r={R - stroke / 2} fill="none" stroke={ring} strokeWidth={stroke} />
    </svg>
  );
};

/** Blink curve: closed briefly around each frame in `at`. */
const blink = (f: number, at: number[]) => Math.max(0, ...at.map((b) => 1 - Math.min(1, Math.abs(f - b) / 3)));

// ─── Scenes ──────────────────────────────────────────────────────────────────────────────────

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const look: [number, number] = f < 10 ? [0, 0] : f < 20 ? [-0.9, 0.1] : [0.9, -0.1];
  return (
    <AbsoluteFill style={{ padding: "0 80px", justifyContent: "center", paddingBottom: 120 }}>
      <Grid />
      <div style={{ fontFamily: S.type.body, fontWeight: 300, fontSize: 64, letterSpacing: "-0.02em" }}>viewers stay for</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14 }}>
        <div style={{ width: 600, height: 128, background: P.accent }} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, lineHeight: 0.85, color: P.accent }}>?</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: 420, lineHeight: 0.9, letterSpacing: "-0.06em", marginTop: 28 }}>
        <span>N</span>
        <span style={{ margin: "0 -6px" }}>
          <EyeO size={318} look={look} lid={blink(f, [17])} />
        </span>
        <span>T</span>
      </div>
      <div style={{ fontFamily: S.type.body, fontWeight: 300, fontSize: 72, letterSpacing: "0.32em", marginTop: 24 }}>INFORMATION</div>
    </AbsoluteFill>
  );
};

const Viewers: React.FC = () => {
  const f = useCurrentFrame();
  const strike = m(f, w("l01", 4) + 6, w("l01", 4) + 18, 0, 1, ease.expoOut);
  return (
    <AbsoluteFill style={{ padding: "300px 80px 0" }}>
      <Grid />
      <Hit at={w("l01", 0)} size={200}>Viewers</Hit>
      <Hit at={w("l01", 1)} size={200}>don&rsquo;t</Hit>
      <Hit at={w("l01", 2)} size={200} color={P.accent}>stay</Hit>
      <Hit at={w("l01", 3)} size={90} weight={300} style={{ marginTop: 30 }}>for</Hit>
      <div style={{ position: "relative", marginTop: 8, width: "fit-content" }}>
        <Hit at={w("l01", 4)} size={132}>information.</Hit>
        {strike > 0 && (
          <div style={{ position: "absolute", left: -6, top: 132 * 0.4 - 8, height: 16, width: `calc(${strike} * (100% + 12px))`, background: P.accent }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

const Everywhere: React.FC = () => {
  const f = useCurrentFrame();
  const local = f - SCENES.everywhere[0];
  const rows = 11;
  const spread = m(f, w("l02", 2) - 4, w("l02", 2) + 10, 0, 1, ease.expoOut);
  return (
    <AbsoluteFill style={{ justifyContent: "center", overflow: "hidden" }}>
      {Array.from({ length: rows }, (_, i) => {
        const mid = i === 5;
        const dist = Math.abs(i - 5);
        const visible = mid || spread * 5 >= dist - 0.5;
        const dir = i % 2 === 0 ? 1 : -1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 960 + (i - 5) * 128 - 64,
              left: 0,
              whiteSpace: "nowrap",
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 128,
              lineHeight: 1,
              letterSpacing: "-0.045em",
              color: mid ? P.ink : `${P.ink}22`,
              opacity: visible ? 1 : 0,
              transform: `translateX(${-400 + dir * local * 7 - (mid ? 0 : dist * 90)}px)`,
            }}
          >
            {"INFORMATION INFORMATION INFORMATION INFORMATION"}
          </div>
        );
      })}
      <Label style={{ position: "absolute", left: 80, top: 1500 - 110, opacity: m(f, w("l02", 2), w("l02", 2) + 8), background: P.accent, color: P.bg, padding: "12px 22px" }}>
        is everywhere.
      </Label>
    </AbsoluteFill>
  );
};

const Cheap: React.FC = () => {
  const f = useCurrentFrame();
  const cheapAt = w("l03a", 1);
  const freeAt = w("l03b", 1);
  const forgetAt = w("l03c", 1);
  if (f < freeAt) {
    const tag = m(f, cheapAt + 4, cheapAt + 14, 0, 1, ease.backOut);
    return (
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px" }}>
        <Grid />
        <Hit at={cheapAt} size={232}>Cheap.</Hit>
        <div
          style={{
            alignSelf: "flex-end",
            marginTop: 30,
            marginRight: 40,
            transform: `rotate(-8deg) scale(${tag})`,
            background: P.accent,
            color: P.bg,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 64,
            padding: "14px 28px",
            borderRadius: 8,
          }}
        >
          $0.99
        </div>
      </AbsoluteFill>
    );
  }
  if (f < forgetAt) {
    return (
      <AbsoluteFill style={{ background: P.accent, justifyContent: "center", padding: "0 80px" }}>
        <Hit at={freeAt} size={340} color={P.bg}>Free.</Hit>
      </AbsoluteFill>
    );
  }
  const word = "FORGETTABLE.";
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px" }}>
      <Grid />
      <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 900, fontSize: 116, letterSpacing: "-0.045em", lineHeight: 1 }}>
        {Array.from(word).map((ch, i) => {
          const gone = m(f, forgetAt + 20 + i * 2, forgetAt + 32 + i * 2, 0, 1, (t) => t * t);
          return (
            <span key={i} style={{ display: "inline-block", opacity: 1 - gone, transform: `translateY(${gone * 140}px) rotate(${gone * (i % 2 ? 14 : -10)}deg)` }}>
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Curiosity: React.FC = () => {
  const f = useCurrentFrame();
  const at = w("l04", 3);
  const lid = f < at ? 1 : Math.max(m(f, at, at + 8, 1, 0, ease.expoOut), blink(f, [at + 40]));
  const look: [number, number] = [Math.sin((f - at) / 9) * 0.6, 0.1];
  return (
    <AbsoluteFill style={{ background: P.ink, color: P.bg, justifyContent: "center", padding: "0 80px", paddingBottom: 80 }}>
      <Hit at={SCENES.curiosity[0]} size={90} weight={300} color={P.bg}>They stay for</Hit>
      <div style={{ position: "relative", marginTop: 26, fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, lineHeight: 0.9, letterSpacing: "-0.05em", color: P.accent }}>
        {/* the hook's redaction bar returns as one bar per line, then wipes away line by line */}
        {[
          { top: 0, width: 770, delay: 0 },
          { top: 225, width: 560, delay: 2 },
        ].map((bar) => (
          <div
            key={bar.top}
            style={{
              position: "absolute",
              left: 0,
              top: bar.top,
              height: 215,
              width: bar.width,
              background: P.accent,
              zIndex: 2,
              transform: `scaleX(${
                f < at + bar.delay
                  ? m(f, SCENES.curiosity[0] + 4 + bar.delay, SCENES.curiosity[0] + 14 + bar.delay, 0, 1, ease.expoOut)
                  : 1 - m(f, at + bar.delay, at + bar.delay + 9, 0, 1, ease.expoOut)
              })`,
              transformOrigin: f < at + bar.delay ? "0% 50%" : "100% 50%",
            }}
          />
        ))}
        <div style={{ display: "flex", alignItems: "center", opacity: f >= at ? 1 : 0 }}>
          <span>CURI</span>
          <span style={{ margin: "0 4px" }}>
            <EyeO size={196} look={look} lid={lid} ring={P.accent} iris={P.accent} />
          </span>
        </div>
        <div style={{ opacity: f >= at ? 1 : 0 }}>SITY.</div>
      </div>
    </AbsoluteFill>
  );
};

const Gap: React.FC = () => {
  const f = useCurrentFrame();
  const open = m(f, w("l05", 3) - 4, w("l05", 3) + 12, 0, 1, ease.expoOut);
  const gapPx = open * 200;
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px" }}>
      <Grid />
      <Hit at={w("l05", 0)} size={70} weight={300} style={{ marginBottom: 30 }}>curiosity is a</Hit>
      <div style={{ display: "flex", alignItems: "flex-end", fontFamily: DISPLAY, fontWeight: 900, fontSize: 136, letterSpacing: "-0.05em", lineHeight: 0.9 }}>
        <span>CURIO</span>
        <div style={{ width: gapPx, position: "relative", height: 140 }}>
          {open > 0.05 && (
            <>
              <div style={{ position: "absolute", left: 8, right: 8, top: 66, height: 4, background: P.accent }} />
              <div style={{ position: "absolute", left: 8, top: 46, width: 4, height: 44, background: P.accent }} />
              <div style={{ position: "absolute", right: 8, top: 46, width: 4, height: 44, background: P.accent }} />
              <Label style={{ position: "absolute", top: 98, left: 0, right: 0, textAlign: "center", opacity: open }}>gap</Label>
            </>
          )}
        </div>
        <span>SITY</span>
      </div>
    </AbsoluteFill>
  );
};

const Know: React.FC = () => {
  const f = useCurrentFrame();
  const arrow = m(f, w("l06", 4), w("l06", 7) + 6, 0, 1, ease.expoOut);
  return (
    <AbsoluteFill style={{ padding: "300px 80px 0" }}>
      <Grid />
      <Label color={P.muted}>between</Label>
      <Hit at={w("l06", 1)} size={130} style={{ marginTop: 18 }}>What they</Hit>
      <Hit at={w("l06", 3)} size={130}>know,</Hit>
      <div style={{ height: 360, position: "relative", marginLeft: 6 }}>
        <div style={{ position: "absolute", left: 30, top: 30, width: 6, height: 290 * arrow, background: P.accent }} />
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 30 + 290 * arrow - 30,
            width: 0,
            height: 0,
            borderLeft: "21px solid transparent",
            borderRight: "21px solid transparent",
            borderTop: `36px solid ${P.accent}`,
            opacity: arrow > 0.1 ? 1 : 0,
          }}
        />
        <Label style={{ position: "absolute", left: 80, top: 150, opacity: arrow }}>the gap</Label>
      </div>
      <Hit at={w("l06", 5)} size={118} color={P.accent} from="left">What they</Hit>
      <Hit at={w("l06", 7)} size={118} color={P.accent} from="left">need to know.</Hit>
    </AbsoluteFill>
  );
};

const Loop: React.FC = () => {
  const f = useCurrentFrame();
  const r = 330;
  const c = 2 * Math.PI * r;
  const draw = m(f, w("l07", 1), w("l07", 3) + 10, 0, 0.86, ease.expoOut);
  const a = draw * Math.PI * 2 - Math.PI / 2;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Grid />
      <svg width={800} height={800} viewBox="-400 -400 800 800" style={{ position: "absolute", top: 560 }}>
        <circle r={r} fill="none" stroke={P.ink} strokeWidth={26} strokeDasharray={c} strokeDashoffset={c * (1 - draw)} transform="rotate(-90)" strokeLinecap="butt" />
        <circle cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={30} fill={P.accent} opacity={draw > 0.02 ? 1 : 0} />
      </svg>
      <div style={{ position: "absolute", top: 960 - 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Hit at={w("l07", 1)} size={124}>Open</Hit>
        <Hit at={w("l07", 2)} size={124} color={P.accent}>a loop.</Hit>
      </div>
    </AbsoluteFill>
  );
};

const Timeline: React.FC = () => {
  const f = useCurrentFrame();
  const qAt = w("l08", 2);
  const lateAt = w("l09", 2);
  const play = f < LINE_START.l09 ? m(f, SCENES.timeline[0], qAt + 6, 0, 0.06) : m(f, w("l09", 0), lateAt + 4, 0.06, 0.94, ease.quintInOut);
  const q = m(f, qAt, qAt + 10, 0, 1, ease.backOut);
  const bang = m(f, lateAt, lateAt + 10, 0, 1, ease.backOut);
  const x0 = 80;
  const x1 = 1000;
  return (
    <AbsoluteFill>
      <Grid />
      {(() => {
        const push = m(f, LINE_START.l09 - 2, LINE_START.l09 + 10, 0, 1, ease.quintInOut);
        return (
          <div style={{ position: "absolute", left: 80, top: 260, width: 920, height: 110, overflow: "visible" }}>
            <div style={{ position: "absolute", left: -push * 1100 }}>
              <Hit at={w("l08", 0)} size={110}>Ask it early.</Hit>
            </div>
            {push > 0 && (
              <div style={{ position: "absolute", left: (1 - push) * 1100 }}>
                <Hit at={LINE_START.l09 - 2} size={110} color={P.accent}>Answer it late.</Hit>
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ position: "absolute", left: x0 + 0.06 * (x1 - x0) - 40, top: 620, fontFamily: DISPLAY, fontWeight: 900, fontSize: 520, lineHeight: 0.9, color: P.accent, transform: `scale(${q})`, transformOrigin: "50% 100%" }}>
        ?
      </div>
      <div style={{ position: "absolute", left: x0 + 0.94 * (x1 - x0) - 120, top: 620, fontFamily: DISPLAY, fontWeight: 900, fontSize: 520, lineHeight: 0.9, color: P.ink, transform: `scale(${bang})`, transformOrigin: "50% 100%" }}>
        !
      </div>
      <div style={{ position: "absolute", left: x0, width: x1 - x0, top: 1160, height: 6, background: `${P.ink}33` }} />
      <div style={{ position: "absolute", left: x0, width: (x1 - x0) * play, top: 1160, height: 6, background: P.ink }} />
      <div style={{ position: "absolute", left: x0 + (x1 - x0) * play - 3, top: 1120, width: 6, height: 86, background: P.accent }} />
      <Label color={P.muted} style={{ position: "absolute", left: x0, top: 1210 }}>0:00 · early</Label>
      <Label color={P.muted} style={{ position: "absolute", right: 80, top: 1210 }}>late · 0:40</Label>
    </AbsoluteFill>
  );
};

const Second: React.FC = () => {
  const f = useCurrentFrame();
  const words = timings.l10.words.length;
  const spoken = Array.from({ length: words }, (_, i) => w("l10", i)).filter((t) => f >= t).length;
  const earnAt = w("l10", 3);
  const earn = m(f, earnAt, earnAt + 8, 0, 1, ease.expoOut);
  const sec = String(Math.max(1, spoken)).padStart(2, "0");
  return (
    <AbsoluteFill style={{ background: P.ink, color: P.bg, padding: "300px 80px 0" }}>
      <Label color={P.surface}>every second</Label>
      <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 250, letterSpacing: "-0.04em", marginTop: 30, lineHeight: 1 }}>
        00:
        {Array.from(sec).map((d, i) => (
          <RollDigit key={i} digit={Number(d)} color={P.accent} size={250} />
        ))}
      </div>
      <div style={{ marginTop: 90, overflow: "hidden", height: 300 * 0.92 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 300, lineHeight: 0.92, letterSpacing: "-0.05em", color: P.accent, transform: `translateY(${(1 - earn) * 100}%)` }}>
          EARN
        </div>
      </div>
      <div style={{ marginTop: 26 }}>
        <Hit at={w("l10", 4)} size={100} weight={300} color={P.bg}>the next one.</Hit>
      </div>
    </AbsoluteFill>
  );
};

/** A mechanical counter digit that rolls up to its value each time a word lands. */
const RollDigit: React.FC<{ digit: number; color: string; size: number }> = ({ digit, color, size }) => {
  const f = useCurrentFrame();
  const last = Array.from({ length: timings.l10.words.length }, (_, i) => w("l10", i)).filter((t) => f >= t).pop() ?? 0;
  const from = Math.max(0, digit - 1);
  const pos = from + (digit - from) * m(f, last, last + 7, 0, 1, ease.expoOut);
  return (
    <div style={{ height: size, overflow: "hidden", color }}>
      <div style={{ transform: `translateY(${-pos * size}px)` }}>
        {Array.from({ length: 10 }, (_, n) => (
          <div key={n} style={{ height: size, lineHeight: `${size}px` }}>
            {n}
          </div>
        ))}
      </div>
    </div>
  );
};

const Forget: React.FC = () => {
  const f = useCurrentFrame();
  const lines: [string, number[]][] = [
    ["People don\u2019t", [0, 1]],
    ["remember", [2]],
    ["what you", [3, 4]],
    ["told them.", [5, 6]],
  ];
  const fadeStart = lineEnd("l11") + 4;
  return (
    <AbsoluteFill style={{ padding: "330px 80px 0" }}>
      <Grid />
      {lines.map(([text, idx], li) => {
        const at = w("l11", idx[0]);
        const erase = li >= 2 ? m(f, fadeStart + (li - 2) * 5, fadeStart + 14 + (li - 2) * 5, 0, 1) : 0;
        return (
          <div key={text} style={{ position: "relative" }}>
            <Hit at={at} size={128} color={li >= 2 ? P.accent : P.ink} style={{ opacity: 1 - erase * 0.9, filter: `blur(${erase * 10}px)` }}>
              {text}
            </Hit>
          </div>
        );
      })}
      <Label color={P.muted} style={{ marginTop: 40, opacity: m(f, fadeStart + 10, fadeStart + 20) }}>…forgotten.</Label>
    </AbsoluteFill>
  );
};

const FindOut: React.FC = () => {
  const f = useCurrentFrame();
  const outAt = w("l12", 7);
  const eyeOpen = f < outAt ? 1 : m(f, outAt, outAt + 8, 1, 0, ease.expoOut);
  const wink = blink(f, [1125]);
  const lid = Math.max(eyeOpen, wink);
  const look: [number, number] = f < outAt + 12 ? [-0.7, -0.5] : f < 1095 ? [0.6, 0.2] : [0, 0];
  const push = 1 + 0.12 * m(f, outAt, FINAL_HOLD_END, 0, 1, ease.sineInOut);
  return (
    <AbsoluteFill style={{ padding: "320px 80px 0", transform: `scale(${push})`, transformOrigin: "178px 1057px" }}>
      <Grid />
      <Hit at={w("l12", 0)} size={96} weight={300}>They remember</Hit>
      <Hit at={w("l12", 2)} size={140} style={{ marginTop: 24 }}>what they</Hit>
      <Hit at={w("l12", 4)} size={140}>had to</Hit>
      <div style={{ display: "flex", alignItems: "center", marginTop: 30, fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, letterSpacing: "-0.05em", wordSpacing: "0.12em", lineHeight: 0.9, color: P.accent, opacity: f >= w("l12", 6) ? 1 : 0 }}>
        <span>FIND </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, letterSpacing: "-0.05em", lineHeight: 0.9, color: P.accent, opacity: f >= outAt ? 1 : 0 }}>
        <EyeO size={196} look={look} lid={lid} ring={P.accent} />
        <span>UT.</span>
      </div>
    </AbsoluteFill>
  );
};

// ─── Sound ───────────────────────────────────────────────────────────────────────────────────

const VO_WINDOWS = (Object.keys(LINE_START) as LineId[]).map((id) => [LINE_START[id], lineEnd(id)] as const);

const SoundDesign: React.FC = () => (
  <>
    <Audio
      src={staticFile("music/pulse-minimal-120.m4a")}
      volume={(f) => {
        const underVo = VO_WINDOWS.some(([a, b]) => f >= a - 4 && f <= b + 6);
        const fadeOut = Math.min(1, Math.max(0, (CURIOSITY_DURATION - f) / END_CARD_FRAMES));
        return (underVo ? 0.2 : 0.42) * fadeOut;
      }}
    />
    {(Object.keys(LINE_START) as LineId[]).map((id) => (
      <Sequence key={id} from={LINE_START[id]} layout="none">
        <Audio src={staticFile(`voice/CuriosityNotInformation/${id}.wav`)} volume={0.95} />
      </Sequence>
    ))}
    <Sfx name="impact" at={0} volume={0.9} />
    <Sfx name="sub-drop" at={0} volume={0.6} />
    <Sfx name="click" at={17} volume={0.3} />
    {Object.values(SCENES)
      .slice(1)
      .map(([at]) => (
        <Sfx key={`c${at}`} name="whoosh-short" at={at} volume={0.32} />
      ))}
    <Sfx name="pop" at={w("l03a", 1) + 4} volume={0.4} />
    <Sfx name="impact" at={w("l03b", 1)} volume={0.35} />
    <Sfx name="glitch" at={w("l03c", 1) + 20} volume={0.22} />
    <Sfx name="riser" at={LINE_START.l04 - 66} volume={0.3} />
    <Sfx name="sub-drop" at={w("l04", 3)} volume={0.5} />
    <Sfx name="tick" at={w("l05", 3)} volume={0.35} />
    <Sfx name="whoosh" at={w("l07", 1)} volume={0.35} />
    <Sfx name="pop" at={w("l08", 2)} volume={0.45} />
    <Sfx name="impact" at={w("l09", 2)} volume={0.45} />
    {timings.l10.words.map((_, i) => (
      <Sfx key={`t${i}`} name="tick" at={w("l10", i)} volume={0.3} />
    ))}
    <Sfx name="impact" at={w("l10", 3)} volume={0.35} />
    <Sfx name="swish-reverse" at={lineEnd("l11") + 2} volume={0.3} />
    <Sfx name="sub-drop" at={w("l12", 7)} volume={0.45} />
    <Sfx name="click" at={1125} volume={0.35} />
    <Sfx name="shimmer" at={FINAL_HOLD_END + 4} volume={0.22} />
  </>
);
