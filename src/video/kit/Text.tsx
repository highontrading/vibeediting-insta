import { useCurrentFrame } from "remotion";
import { clamp, ease as eases } from "./motion";
import { interpolate } from "remotion";

/** Line that slides up from behind a mask: the editorial reveal. */
export const MaskReveal: React.FC<{
  children: React.ReactNode;
  start: number;
  dur?: number;
  ease?: (t: number) => number;
  from?: "below" | "above";
  style?: React.CSSProperties;
}> = ({ children, start, dur = 18, ease = eases.expoOut, from = "below", style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: ease });
  const dir = from === "below" ? 1 : -1;
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * 110 * dir}%)` }}>{children}</div>
    </div>
  );
};

/** Splits text into words or characters and staggers a custom per-unit animation. */
export const Stagger: React.FC<{
  text: string;
  by?: "word" | "char";
  start: number;
  stagger?: number;
  dur?: number;
  ease?: (t: number) => number;
  render: (unit: string, progress: number, index: number) => React.ReactNode;
  style?: React.CSSProperties;
}> = ({ text, by = "word", start, stagger = 3, dur = 16, ease = eases.expoOut, render, style }) => {
  const frame = useCurrentFrame();
  const units = by === "word" ? text.split(/(\s+)/) : Array.from(text);
  let i = 0;
  return (
    <span style={{ display: "inline", whiteSpace: "pre-wrap", ...style }}>
      {units.map((u, k) => {
        if (/^\s+$/.test(u)) return <span key={k}>{u}</span>;
        const idx = i++;
        const p = interpolate(frame, [start + idx * stagger, start + idx * stagger + dur], [0, 1], { ...clamp, easing: ease });
        return (
          <span key={k} style={{ display: "inline-block" }}>
            {render(u, p, idx)}
          </span>
        );
      })}
    </span>
  );
};

/** Typewriter: reveals characters at `cps` characters per second from `start`. */
export const Typewriter: React.FC<{ text: string; start: number; cps?: number; caret?: boolean; style?: React.CSSProperties }> = ({
  text,
  start,
  cps = 28,
  caret = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - start) / 30) * cps)));
  const on = Math.floor(frame / 15) % 2 === 0 || n < text.length;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {caret && <span style={{ opacity: on ? 1 : 0 }}>▍</span>}
    </span>
  );
};
