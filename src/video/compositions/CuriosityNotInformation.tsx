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
  l01: 60, l02: 150, l03a: 225, l03b: 255, l03c: 285, l04: 345, l05: 420, l06: 495,
  l07: 600, l08: 660, l09: 735, l10: 795, l11: 915, l12: 1050,
};
const FINAL_HOLD_END = 1200;
export const CURIOSITY_DURATION = FINAL_HOLD_END + END_CARD_FRAMES;

/** Absolute frame at which word `i` of a narration line is spoken. */
const w = (id: LineId, i: number) => LINE_START[id] + Math.round(timings[id].words[i].start * 30);
const lineEnd = (id: LineId) => LINE_START[id] + Math.round(timings[id].duration * 30);

const m = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = E) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

/** The first type hit of a scene starts 3 frames before the cut, so the cut frame is never empty. */
const LEAD = 3;

// Scenes: [from, to) in absolute frames. Most cuts are hard grid pushes; Everywhere→Cheap and Curiosity→Gap are match cuts.
const SCENES = {
  hook: [0, 60],
  viewers: [60, 150],
  everywhere: [150, 225],
  cheap: [225, 330],
  curiosity: [330, 420],
  gap: [420, 495],
  know: [495, 600],
  loop: [600, 660],
  timeline: [660, 795],
  second: [795, 915],
  forget: [915, 1050],
  findOut: [1050, FINAL_HOLD_END],
} as const;

export const CuriosityNotInformation: React.FC = () => (
  <AbsoluteFill style={{ background: P.bg, color: P.ink, fontFamily: DISPLAY }}>
    {/* hard grid pushes, alternating up and left, except the two match cuts (no push) */}
    <Scene range={SCENES.hook} out="up"><Hook /></Scene>
    <Scene range={SCENES.viewers} cut="up" out="left"><Viewers /></Scene>
    <Scene range={SCENES.everywhere} cut="left"><Everywhere /></Scene>
    <Scene range={SCENES.cheap} out="left"><Cheap /></Scene>
    <Scene range={SCENES.curiosity} cut="left" bg={P.ink}><Curiosity /></Scene>
    <Scene range={SCENES.gap} out="left"><Gap /></Scene>
    <Scene range={SCENES.know} cut="left" out="up"><Know /></Scene>
    <Scene range={SCENES.loop} cut="up" out="left"><Loop /></Scene>
    <Scene range={SCENES.timeline} cut="left" out="up"><Timeline /></Scene>
    <Scene range={SCENES.second} cut="up" out="left" bg={P.ink}><Second /></Scene>
    <Scene range={SCENES.forget} cut="left" out="up"><Forget /></Scene>
    <Scene range={SCENES.findOut} cut="up" out="left" origin="80px 1000px"><FindOut /></Scene>
    <Scene range={[FINAL_HOLD_END, CURIOSITY_DURATION]} cut="left">
      <Sequence from={FINAL_HOLD_END}>
        <EndCard system={S} align="left" wordmarkSize={230} motif={<EndEye />} />
      </Sequence>
    </Scene>
    <SoundDesign />
  </AbsoluteFill>
);

/** Frames a push transition takes; the outgoing scene keeps rendering this long past its end. */
const PUSH = 9;
type Push = "left" | "up";
const pushOffset = (d: Push, t: number) => (d === "left" ? `translateX(${t * 1080}px)` : `translateY(${t * 1920}px)`);

/**
 * Wraps a scene: absolute-frame children on an opaque background and a slow drift. `cut` is a hard
 * grid push in (Swiss Signal's signature), paired with `out` of the same direction on the previous scene.
 */
const Scene: React.FC<{
  range: readonly [number, number];
  cut?: Push;
  out?: Push;
  bg?: string;
  /** Pivot of the slow drift; pin it to the left margin when type sits on it. */
  origin?: string;
  children: React.ReactNode;
}> = ({ range, cut, out, bg = P.bg, origin = "50% 50%", children }) => {
  const f = useCurrentFrame();
  const end = out ? range[1] + PUSH : range[1];
  if (f < range[0] || f >= end) return null;
  const local = f - range[0];
  const drift = 1 + 0.04 * Math.min(1, local / (range[1] - range[0]));
  const pushIn = cut ? pushOffset(cut, 1 - m(local, 0, PUSH, 0, 1, ease.quintInOut)) : "";
  const pushOut = out && f >= range[1] ? pushOffset(out, -m(f, range[1], range[1] + PUSH, 0, 1, ease.quintInOut)) : "";
  return (
    <AbsoluteFill style={{ background: bg, transform: `${pushIn} ${pushOut}`, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${drift})`, transformOrigin: origin }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
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
    // the mask only exists while the line is rising, so letters can later fall out of it
    <div style={{ clipPath: p >= 1 ? undefined : from === "below" ? "inset(0 -120px)" : "inset(-20px -120px -20px 0)", height: size * 0.92, ...style }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 0.92,
          letterSpacing: "-0.03em",
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

/** A flat Swiss eye inside an "O" ring. `look` is -1..1 on each axis, `lid` 0 open → 1 closed. */
const EyeO: React.FC<{ size: number; look: [number, number]; lid: number; ring?: string; iris?: string; fill?: string; bare?: boolean }> = ({
  size,
  look,
  lid,
  ring = P.ink,
  iris = P.accent,
  fill = P.bg,
  bare = false,
}) => {
  const R = size / 2;
  const stroke = bare ? 0 : size * 0.2;
  const inner = bare ? R : R - stroke * 0.98;
  const irisR = inner * 0.7;
  const px = look[0] * (inner - irisR) * 0.9;
  const py = look[1] * (inner - irisR) * 0.6;
  const id = `eye${Math.round(size)}`;
  return (
    <svg width={size} height={size} viewBox={`${-R} ${-R} ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle r={inner} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <circle r={inner} fill={fill} />
        <circle cx={px} cy={py} r={irisR} fill={iris} />
        <circle cx={px + irisR * 0.32} cy={py - irisR * 0.34} r={irisR * 0.24} fill={fill === P.bg ? P.bg : P.ink} />
        {/* lids close from top and bottom; when nearly shut, a straight lid line reads as a closed eye */}
        <rect x={-R} y={-R} width={size} height={R * lid * 1.02} fill={ring} />
        <rect x={-R} y={R - R * lid * 1.02} width={size} height={R * lid * 1.02} fill={ring} />
        {lid > 0.55 && (
          <rect x={-inner} y={-R * 0.035} width={inner * 2} height={R * 0.07} fill={fill} opacity={(lid - 0.55) / 0.45} />
        )}
      </g>
      {!bare && <circle r={R - stroke / 2} fill="none" stroke={ring} strokeWidth={stroke} />}
    </svg>
  );
};

/** Blink curve: closed briefly around each frame in `at`. */
const blink = (f: number, at: number[]) => Math.max(0, ...at.map((b) => 1 - Math.min(1, Math.abs(f - b) / 3)));

// ─── Scenes ──────────────────────────────────────────────────────────────────────────────────

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const look: [number, number] = f < 10 ? [0, 0] : f < 22 ? [-0.9, 0.1] : f < 40 ? [0.9, -0.1] : [0, 0.4];
  // beat 2 (f30): the redaction bar and ? take a hit
  const hit = 1 + 0.07 * m(f, 30, 33, 0, 1, ease.expoOut) * (1 - m(f, 33, 42, 0, 1));
  return (
    <AbsoluteFill style={{ padding: "0 80px", justifyContent: "center", paddingBottom: 40 }}>
      <Grid />
      <div style={{ fontFamily: S.type.body, fontWeight: 300, fontSize: 84, letterSpacing: "-0.02em" }}>viewers stay for</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 28 }}>
        <div style={{ width: 700, height: 168, background: P.accent, transform: `scaleX(${hit})`, transformOrigin: "0% 50%" }} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 190, lineHeight: 0.85, color: P.accent, transform: `scale(${hit})`, transformOrigin: "0% 50%" }}>?</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: 420, lineHeight: 0.9, letterSpacing: "-0.04em", marginTop: 28 }}>
        <span>N</span>
        <span style={{ margin: "0 -6px" }}>
          <EyeO size={318} look={look} lid={blink(f, [17, 47])} />
        </span>
        <span>T</span>
      </div>
      <div style={{ fontFamily: S.type.body, fontWeight: 300, fontSize: 80, letterSpacing: "0.3em", marginTop: 40 }}>INFORMATION</div>
    </AbsoluteFill>
  );
};

const Viewers: React.FC = () => {
  const f = useCurrentFrame();
  const strike = m(f, w("l01", 4) + 6, w("l01", 4) + 18, 0, 1, ease.expoOut);
  const push = 1 + 0.05 * m(f, w("l01", 4) + 18, SCENES.viewers[1], 0, 1, ease.sineInOut);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px 60px", transform: `scale(${push})`, transformOrigin: "80px 1240px" }}>
      <Grid />
      <Hit at={w("l01", 0) - LEAD} size={200}>Viewers</Hit>
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
              letterSpacing: "-0.03em",
              color: mid ? P.ink : `${P.ink}22`,
              opacity: visible ? 1 : 0,
              transform: `translateX(${-1800 + dir * local * 7 - (mid ? 0 : dist * 90)}px)`,
            }}
          >
            {"INFORMATION INFORMATION INFORMATION INFORMATION INFORMATION INFORMATION INFORMATION INFORMATION"}
          </div>
        );
      })}
      <Label style={{ position: "absolute", left: 80, top: 1500 - 120, fontSize: 64, opacity: m(f, w("l02", 2), w("l02", 2) + 8), background: P.ink, color: P.bg, padding: "12px 24px" }}>
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
    const tag = m(f, cheapAt + 4, cheapAt + 12, 0, 1, ease.expoOut);
    return (
      <AbsoluteFill style={{ justifyContent: "flex-start", padding: "0 80px", paddingTop: 960 - 107 }}>
        <Grid />
        <Hit at={SCENES.cheap[0] - LEAD} size={232}>Cheap.</Hit>
        <div
          style={{
            alignSelf: "flex-start",
            marginTop: 36,
            transform: `scaleX(${tag})`,
            transformOrigin: "0% 50%",
            background: P.accent,
            color: P.bg,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 64,
            padding: "14px 28px",
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
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px" }}>
      <Grid />
      {["FORGET-", "TABLE."].map((row, ri) => (
        <Hit key={row} at={forgetAt - 2 + ri * 3} size={210}>
          {Array.from(row).map((ch, i) => {
            const k = ri * 7 + i;
            const gone = m(f, forgetAt + 18 + k * 2, forgetAt + 30 + k * 2, 0, 1, (t) => t * t);
            return (
              <span key={i} style={{ display: "inline-block", opacity: 1 - gone, transform: `translateY(${gone * 160}px)` }}>
                {ch}
              </span>
            );
          })}
        </Hit>
      ))}
    </AbsoluteFill>
  );
};

/** Top of the CURIOSITY stack; the Gap scene uses the same value so the cut between them is a match cut. */
const STACK_TOP = 600;

const Curiosity: React.FC = () => {
  const f = useCurrentFrame();
  const at = w("l04", 3);
  const lid = f < at ? 1 : Math.max(m(f, at, at + 8, 1, 0, ease.expoOut), blink(f, [at + 40]));
  const look: [number, number] = [Math.sin((f - at) / 9) * 0.6, 0.1];
  return (
    <AbsoluteFill style={{ background: P.ink, color: P.bg, justifyContent: "flex-start", padding: "0 80px", paddingTop: STACK_TOP }}>
      <Hit at={SCENES.curiosity[0] - LEAD} size={90} weight={300} color={P.bg}>They stay for</Hit>
      <div style={{ position: "relative", marginTop: 26, fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, lineHeight: 0.9, letterSpacing: "-0.03em", color: P.accent }}>
        {/* the hook's redaction bar returns as one bar per line, then wipes away line by line */}
        {[
          { top: 0, width: 790, delay: 0 },
          { top: 225, width: 610, delay: 2 },
        ].map((bar) => {
          const sx =
            f < at + bar.delay
              ? m(f, SCENES.curiosity[0] - LEAD + bar.delay, SCENES.curiosity[0] + 8 + bar.delay, 0, 1, ease.expoOut)
              : 1 - m(f, at + bar.delay, at + bar.delay + 7, 0, 1, ease.expoOut);
          return sx < 0.02 ? null : (
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
              transform: `scaleX(${sx})`,
              transformOrigin: f < at + bar.delay ? "0% 50%" : "100% 50%",
            }}
          />
          );
        })}
        <div style={{ display: "flex", alignItems: "center", opacity: f >= at ? 1 : 0 }}>
          <span>CURI</span>
          <span style={{ margin: "0 4px" }}>
            <EyeO size={196} look={look} lid={lid} ring={P.bg} iris={P.accent} fill={P.ink} />
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
  const gapPx = open * 170;
  const look: [number, number] = [Math.sin(f / 9) * 0.6, 0.1];
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", padding: "0 80px", paddingTop: STACK_TOP }}>
      <Grid />
      {/* same stack, same position as the Curiosity scene: only the background flips and the gap opens */}
      <div style={{ height: 90 * 0.92 + 26 }} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, lineHeight: 0.9, letterSpacing: "-0.03em", color: P.ink }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>CURI</span>
          <span style={{ margin: "0 4px" }}>
            <EyeO size={196} look={look} lid={0} />
          </span>
        </div>
        <div style={{ height: gapPx, position: "relative" }}>
          {open > 0.05 && (
            <>
              <div style={{ position: "absolute", left: 14, top: 0, width: 16, height: "100%", background: P.accent }} />
              <div style={{ position: "absolute", left: 14, top: 0, width: 90, height: 16, background: P.accent }} />
              <div style={{ position: "absolute", left: 14, bottom: 0, width: 90, height: 16, background: P.accent }} />
              <Label color={P.muted} style={{ position: "absolute", left: 140, top: "50%", marginTop: -34, fontSize: 52, opacity: open }}>the gap</Label>
            </>
          )}
        </div>
        <div>SITY.</div>
      </div>
    </AbsoluteFill>
  );
};

const Know: React.FC = () => {
  const f = useCurrentFrame();
  const arrow = m(f, w("l06", 4), w("l06", 7) + 6, 0, 1, ease.expoOut);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "100px 80px 0" }}>
      <Grid />
      <Label color={P.muted}>between</Label>
      <Hit at={LINE_START.l06 - LEAD} size={146} style={{ marginTop: 18 }}>What they</Hit>
      <Hit at={w("l06", 3)} size={146}>know,</Hit>
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
        <Label color={P.muted} style={{ position: "absolute", left: 80, top: 150, fontSize: 52, opacity: arrow }}>the gap</Label>
      </div>
      <Hit at={w("l06", 5)} size={110} color={P.accent} from="left">What they</Hit>
      <Hit at={w("l06", 7)} size={110} color={P.accent} from="left">need to know.</Hit>
    </AbsoluteFill>
  );
};

const Loop: React.FC = () => {
  const f = useCurrentFrame();
  const r = 330;
  const c = 2 * Math.PI * r;
  const draw = m(f, SCENES.loop[0], w("l07", 3) + 10, 0, 0.86, ease.expoOut);
  const a = draw * Math.PI * 2 - Math.PI / 2;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Grid />
      <svg width={800} height={800} viewBox="-400 -400 800 800" style={{ position: "absolute", top: 560 }}>
        <circle r={r} fill="none" stroke={P.ink} strokeWidth={26} strokeDasharray={c} strokeDashoffset={c * (1 - draw)} transform="rotate(-90)" strokeLinecap="butt" />
        <circle cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={30} fill={P.accent} opacity={draw > 0.02 ? 1 : 0} />
      </svg>
      <div style={{ position: "absolute", top: 960 - 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Hit at={SCENES.loop[0] - LEAD} size={130}>Open</Hit>
        <Hit at={w("l07", 2)} size={130} color={P.accent}>a loop.</Hit>
      </div>
    </AbsoluteFill>
  );
};

const Timeline: React.FC = () => {
  const f = useCurrentFrame();
  const qAt = w("l08", 2);
  const lateAt = w("l09", 2);
  const play = f < LINE_START.l09 ? m(f, SCENES.timeline[0], qAt + 6, 0, 0.06) : m(f, w("l09", 0), lateAt + 4, 0.06, 0.94, ease.quintInOut);
  const q = m(f, qAt, qAt + 8, 0, 1, ease.expoOut);
  const bang = m(f, lateAt, lateAt + 8, 0, 1, ease.expoOut);
  const x0 = 80;
  const x1 = 1000;
  return (
    <AbsoluteFill>
      <Grid />
      {(() => {
        const push = m(f, LINE_START.l09 - 2, LINE_START.l09 + 10, 0, 1, ease.quintInOut);
        return (
          <div style={{ position: "absolute", left: 80, top: 250, width: 920, height: 420, overflow: "visible" }}>
            <div style={{ position: "absolute", left: -push * 1100 }}>
              <Hit at={SCENES.timeline[0] - LEAD} size={220}>Ask it</Hit>
              <Hit at={w("l08", 3)} size={220}>early.</Hit>
            </div>
            {push > 0 && (
              <div style={{ position: "absolute", left: (1 - push) * 1100 }}>
                <Hit at={LINE_START.l09 - 2} size={196} color={P.accent}>Answer</Hit>
                <Hit at={w("l09", 1)} size={196} color={P.accent}>it late.</Hit>
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ position: "absolute", left: x0 + 0.06 * (x1 - x0) - 40, top: 740, fontFamily: DISPLAY, fontWeight: 900, fontSize: 470, lineHeight: 0.9, color: P.accent, transform: `scale(${q * (1 + 0.08 * m(f, qAt + 10, LINE_START.l09, 0, 1, ease.sineInOut))})`, transformOrigin: "30% 100%" }}>
        ?
      </div>
      <div style={{ position: "absolute", left: x0 + 0.94 * (x1 - x0) - 135, top: 740, fontFamily: DISPLAY, fontWeight: 900, fontSize: 470, lineHeight: 0.9, color: P.ink, transform: `scale(${bang})`, transformOrigin: "50% 100%" }}>
        !
      </div>
      <div style={{ position: "absolute", left: x0, width: x1 - x0, top: 1230, height: 6, background: `${P.ink}33` }} />
      <div style={{ position: "absolute", left: x0, width: (x1 - x0) * play, top: 1230, height: 6, background: P.ink }} />
      <div style={{ position: "absolute", left: x0 + (x1 - x0) * play - 3, top: 1190, width: 6, height: 86, background: P.accent }} />
      <Label color={P.muted} style={{ position: "absolute", left: x0, top: 1280 }}>0:00 · early</Label>
      <Label color={P.muted} style={{ position: "absolute", right: 80, top: 1280 }}>late · 0:40</Label>
    </AbsoluteFill>
  );
};

/** The counter is the reel's real timecode: it ticks once per second, on every second beat. */
const SECOND_TICKS = Array.from({ length: 6 }, (_, i) => (Math.ceil(SCENES.second[0] / 30) + i) * 30).filter((t) => t < SCENES.second[1]);
const timecode = (f: number) => Math.floor(f / 30);

const Second: React.FC = () => {
  const f = useCurrentFrame();
  const sec = timecode(f);
  const prev = timecode(Math.max(0, (SECOND_TICKS.filter((t) => f >= t).pop() ?? SCENES.second[0]) - 1));
  const earnAt = w("l10", 3);
  const earn = m(f, earnAt, earnAt + 8, 0, 1, ease.expoOut);
  const push = 1 + 0.06 * m(f, lineEnd("l10"), SCENES.second[1], 0, 1, ease.sineInOut);
  const digits = String(sec).padStart(2, "0");
  const prevDigits = String(prev).padStart(2, "0");
  return (
    <AbsoluteFill style={{ background: P.ink, color: P.bg, justifyContent: "center", padding: "0 80px 60px", transform: `scale(${push})`, transformOrigin: "80px 1000px" }}>
      <Label color={P.surface}>you are here</Label>
      <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 280, letterSpacing: "-0.04em", marginTop: 24, lineHeight: 1 }}>
        00:
        {Array.from(digits).map((d, i) => (
          <RollDigit key={i} digit={Number(d)} prev={Number(prevDigits[i])} color={P.accent} size={280} />
        ))}
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 26 }}>
        {["make", "every", "second"].map((word, i) => (
          <Hit key={word} at={i === 0 ? SCENES.second[0] - LEAD : w("l10", i)} size={88} weight={300} color={P.bg}>
            {word}
          </Hit>
        ))}
      </div>
      <div style={{ marginTop: 20, overflow: "hidden", height: 300 * 0.92 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 300, lineHeight: 0.92, letterSpacing: "-0.03em", color: P.accent, transform: `translateY(${(1 - earn) * 100}%)` }}>
          EARN
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <Hit at={w("l10", 4)} size={88} weight={300} color={P.bg}>the next one.</Hit>
      </div>
    </AbsoluteFill>
  );
};

/** A mechanical counter digit that rolls forward from `prev` to `digit` on each tick (9 rolls on to 0). */
const RollDigit: React.FC<{ digit: number; prev: number; color: string; size: number }> = ({ digit, prev, color, size }) => {
  const f = useCurrentFrame();
  const last = SECOND_TICKS.filter((t) => f >= t).pop() ?? -100;
  const steps = (digit - prev + 10) % 10;
  const pos = prev + steps * m(f, last, last + 7, 0, 1, ease.expoOut);
  return (
    <div style={{ height: size, overflow: "hidden", color }}>
      <div style={{ transform: `translateY(${-pos * size}px)` }}>
        {Array.from({ length: 20 }, (_, n) => (
          <div key={n} style={{ height: size, lineHeight: `${size}px` }}>
            {n % 10}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Forget exit: the told lines drop straight out letter by letter, bottom line first. */
const FORGET_DROP = lineEnd("l11") + 4;

const Forget: React.FC = () => {
  const f = useCurrentFrame();
  const lines: [string, number][] = [
    ["People don\u2019t", LINE_START.l11 - LEAD],
    ["remember", w("l11", 2)],
    ["what you", w("l11", 3)],
    ["told them.", w("l11", 5)],
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px 200px" }}>
      <Grid />
      {f >= FORGET_DROP + 36 && Math.floor((f - FORGET_DROP) / 15) % 2 === 0 && (
        <div style={{ position: "absolute", left: 80, top: 868, width: 64, height: 104, background: P.accent }} />
      )}
      {lines.map(([text, at], li) => (
        <Hit key={text} at={at} size={128} color={li >= 2 ? P.accent : P.ink}>
          {li < 2
            ? text
            : Array.from(text).map((ch, i) => {
                const k = li === 3 ? i : 10 + i;
                const gone = m(f, FORGET_DROP + k * 1.5, FORGET_DROP + k * 1.5 + 12, 0, 1, (t) => t * t);
                return (
                  <span key={i} style={{ display: "inline-block", opacity: 1 - gone, transform: `translateY(${gone * 220}px)` }}>
                    {ch === " " ? "\u00a0" : ch}
                  </span>
                );
              })}
        </Hit>
      ))}
    </AbsoluteFill>
  );
};

/** Beat 75 (f1125): the loop opened at "Open a loop" finally closes. */
const LOOP_CLOSE = 1125;
const LOOP_R = 140;
const LOOP_BOX = LOOP_R * 2 + 24;

const FindOut: React.FC = () => {
  const f = useCurrentFrame();
  const outAt = w("l12", 7);
  const eyeOpen = f < LOOP_CLOSE ? 1 : m(f, LOOP_CLOSE, LOOP_CLOSE + 12, 1, 0, ease.expoOut);
  const wink = blink(f, [1170]);
  const lid = Math.max(eyeOpen, wink);
  const look: [number, number] = f < LOOP_CLOSE + 12 ? [-0.7, -0.5] : f < 1150 ? [0.6, 0.2] : [0, 0];
  const push = 1 + 0.03 * m(f, outAt, FINAL_HOLD_END, 0, 1, ease.sineInOut) + 0.03 * m(f, LOOP_CLOSE, LOOP_CLOSE + 2, 0, 1, ease.expoOut) * (1 - m(f, LOOP_CLOSE + 2, LOOP_CLOSE + 10, 0, 1));
  const lines: [string, number][] = [
    ["They", LINE_START.l12 - LEAD],
    ["remember", w("l12", 1)],
    ["what they", w("l12", 2)],
    ["had to", w("l12", 4)],
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 80px 450px", transform: `scale(${push})`, transformOrigin: "80px 1000px" }}>
      <Grid />
      {lines.map(([text, at]) => (
        <Hit key={text} at={at} size={140}>
          {text}
        </Hit>
      ))}
      <div style={{ marginTop: 30, fontFamily: DISPLAY, fontWeight: 900, fontSize: 380, letterSpacing: "-0.03em", lineHeight: 0.9, color: P.ink, opacity: f >= w("l12", 6) ? 1 : 0 }}>
        FIND
      </div>
      <div style={{ display: "flex", alignItems: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: 300, letterSpacing: "-0.03em", lineHeight: 0.9, color: P.ink }}>
        <div style={{ position: "relative", width: LOOP_BOX, height: LOOP_BOX, flexShrink: 0 }}>
          <div style={{ position: "absolute", left: (LOOP_BOX - 250) / 2, top: (LOOP_BOX - 250) / 2, opacity: f >= LOOP_CLOSE - 1 ? 1 : 0 }}>
            <EyeO size={250} look={look} lid={lid} bare />
          </div>
          <ClosingLoop />
        </div>
        <span style={{ marginLeft: 12, opacity: f >= outAt ? 1 : 0 }}>UT.</span>
      </div>
    </AbsoluteFill>
  );
};

/** The loop opened at "Open a loop" returns around the empty slot where OUT will land, then closes with an impact. */
const ClosingLoop: React.FC = () => {
  const f = useCurrentFrame();
  const start = w("l12", 6);
  if (f < start) return null;
  const c = 2 * Math.PI * LOOP_R;
  const draw = f < LOOP_CLOSE - 4 ? m(f, start, LOOP_CLOSE - 4, 0.3, 0.86, ease.quintInOut) : m(f, LOOP_CLOSE - 4, LOOP_CLOSE, 0.86, 1, ease.quintInOut);
  const a = draw * Math.PI * 2 - Math.PI / 2;
  const pulse = 1 + 0.1 * m(f, LOOP_CLOSE, LOOP_CLOSE + 3, 0, 1, ease.expoOut) * (1 - m(f, LOOP_CLOSE + 3, LOOP_CLOSE + 14, 0, 1));
  return (
    <svg width={LOOP_BOX} height={LOOP_BOX} viewBox={`${-LOOP_BOX / 2} ${-LOOP_BOX / 2} ${LOOP_BOX} ${LOOP_BOX}`} style={{ position: "absolute", left: 0, top: 0, transform: `scale(${pulse})` }}>
      <circle r={LOOP_R} fill="none" stroke={P.ink} strokeWidth={24} strokeDasharray={c} strokeDashoffset={c * (1 - draw)} transform="rotate(-90)" />
      <circle cx={Math.cos(a) * LOOP_R} cy={Math.sin(a) * LOOP_R} r={20} fill={P.accent} opacity={draw < 0.999 ? 1 : 0} />
    </svg>
  );
};

/** The eye returns on the end card: looks at the wordmark, then blinks on the downbeat. */
const EndEye: React.FC = () => {
  const f = useCurrentFrame();
  const look: [number, number] = f < 20 ? [0.5, 0.6] : [0, 0];
  return <EyeO size={150} look={look} lid={blink(f, [32])} />;
};

// ─── Sound ───────────────────────────────────────────────────────────────────────────────────

const VO_WINDOWS = (Object.keys(LINE_START) as LineId[]).map((id) => [LINE_START[id], lineEnd(id)] as const);
const PAYOFF_HUSH = [lineEnd("l11") + 8, LINE_START.l12] as const;

const SoundDesign: React.FC = () => (
  <>
    <Audio
      src={staticFile("music/pulse-minimal-120.m4a")}
      volume={(f) => {
        const underVo = VO_WINDOWS.some(([a, b]) => f >= a - 4 && f <= b + 6);
        const fadeOut = Math.min(1, Math.max(0, (CURIOSITY_DURATION - f) / END_CARD_FRAMES));
        // ~1s of silence after "told them." so the payoff line lands in a clean room
        const hush = 1 - m(f, PAYOFF_HUSH[0] - 4, PAYOFF_HUSH[0] + 4, 0, 1, (t) => t) * (1 - m(f, PAYOFF_HUSH[1] - 2, PAYOFF_HUSH[1] + 6, 0, 1, (t) => t));
        const payoff = f >= LOOP_CLOSE - 2 && f < FINAL_HOLD_END ? 1.6 : 1;
        return (underVo ? 0.16 : 0.36) * fadeOut * hush * payoff;
      }}
    />
    {(Object.keys(LINE_START) as LineId[]).map((id) => (
      <Sequence key={id} from={LINE_START[id]} layout="none">
        <Audio src={staticFile(`voice/CuriosityNotInformation/${id}.wav`)} volume={id === "l12" ? 1 : 0.82} />
      </Sequence>
    ))}
    <Sfx name="impact" at={0} volume={1} />
    <Sfx name="sub-drop" at={0} volume={0.6} />
    <Sfx name="click" at={17} volume={0.3} />
    <Sfx name="click" at={47} volume={0.25} />
    {Object.values(SCENES)
      .slice(1)
      .filter(([at]) => at !== SCENES.cheap[0] && at !== SCENES.gap[0])
      .map(([at]) => (
        <Sfx key={`c${at}`} name="whoosh-short" at={at} volume={0.32} />
      ))}
    {/* match cuts get a hit instead of a whoosh */}
    <Sfx name="click" at={SCENES.cheap[0]} volume={0.4} />
    <Sfx name="click" at={SCENES.gap[0]} volume={0.4} />
    <Sfx name="pop" at={30} volume={0.4} />
    <Sfx name="pop" at={w("l03a", 1) + 4} volume={0.4} />
    <Sfx name="impact" at={w("l03b", 1)} volume={0.35} />
    <Sfx name="glitch" at={w("l03c", 1) + 20} volume={0.22} />
    <Sfx name="riser" at={LINE_START.l04 - 66} volume={0.3} />
    <Sfx name="sub-drop" at={w("l04", 3)} volume={0.5} />
    <Sfx name="tick" at={w("l05", 3)} volume={0.35} />
    <Sfx name="whoosh" at={w("l07", 1)} volume={0.35} />
    <Sfx name="pop" at={w("l08", 2)} volume={0.45} />
    <Sfx name="impact" at={w("l09", 2)} volume={0.45} />
    {SECOND_TICKS.map((t) => (
      <Sfx key={`t${t}`} name="tick" at={t} volume={0.3} />
    ))}
    <Sfx name="impact" at={w("l10", 3)} volume={0.35} />
    <Sfx name="swish-reverse" at={FORGET_DROP} volume={0.3} />
    <Sfx name="riser" at={w("l12", 6) - 6} volume={0.3} />
    <Sfx name="impact" at={LOOP_CLOSE} volume={0.9} />
    <Sfx name="sub-drop" at={LOOP_CLOSE} volume={0.7} />
    <Sfx name="click" at={LOOP_CLOSE + 12} volume={0.4} />
    <Sfx name="click" at={1170} volume={0.35} />
    <Sfx name="shimmer" at={FINAL_HOLD_END + 4} volume={0.22} />
    <Sfx name="click" at={FINAL_HOLD_END + 32} volume={0.3} />
  </>
);
