import { useCurrentFrame } from "remotion";

/**
 * One split-flap (Solari board) tile. `valueAt(frame)` returns the character to show at any frame;
 * whenever it changes, the tile flips: the old top half folds down, then the new bottom half lands.
 */
export const FlapChar: React.FC<{
  valueAt: (frame: number) => string;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  color: string;
  tile: string;
  seam: string;
  flipFrames?: number;
}> = ({ valueAt, width, height, fontFamily, fontSize, fontWeight = 700, color, tile, seam, flipFrames = 6 }) => {
  const frame = useCurrentFrame();
  const now = valueAt(frame);
  let prev = now;
  let progress = 1;
  for (let k = 1; k <= flipFrames; k++) {
    const v = valueAt(frame - k);
    if (v !== now) {
      prev = v;
      progress = (k - 1) / flipFrames;
      break;
    }
  }
  const half = height / 2;
  const glyph = (ch: string) => (
    <div style={{ width, height, lineHeight: `${height}px`, textAlign: "center", fontFamily, fontSize, fontWeight, color }}>
      {ch === " " ? " " : ch}
    </div>
  );
  const halfBox = (ch: string, top: boolean, extra?: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : half,
        width,
        height: half,
        overflow: "hidden",
        background: tile,
        borderRadius: top ? "10px 10px 0 0" : "0 0 10px 10px",
        backfaceVisibility: "hidden",
        ...extra,
      }}
    >
      <div style={{ marginTop: top ? 0 : -half }}>{glyph(ch)}</div>
    </div>
  );
  const firstHalf = Math.min(1, progress * 2);
  const secondHalf = Math.max(0, progress * 2 - 1);
  return (
    <div style={{ position: "relative", width, height, perspective: 600 }}>
      {halfBox(now, true)}
      {halfBox(progress < 1 ? prev : now, false)}
      {progress < 1 &&
        firstHalf < 1 &&
        halfBox(prev, true, { transform: `rotateX(${-firstHalf * 90}deg)`, transformOrigin: "50% 100%", filter: `brightness(${1 - firstHalf * 0.4})` })}
      {progress < 1 &&
        firstHalf >= 1 &&
        halfBox(now, false, { transform: `rotateX(${(1 - secondHalf) * 90}deg)`, transformOrigin: "50% 0%", filter: `brightness(${0.6 + secondHalf * 0.4})` })}
      <div style={{ position: "absolute", left: 0, right: 0, top: half - 1, height: 2, background: seam }} />
    </div>
  );
};

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** A word on a split-flap board: each tile shuffles through glyphs, then settles in left-to-right order. */
export const FlapWord: React.FC<{
  text: string;
  start: number;
  settleEvery?: number;
  shuffleFrames?: number;
  tileWidth: number;
  height: number;
  gap?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  color: string;
  tile: string;
  seam: string;
}> = ({ text, start, settleEvery = 3, shuffleFrames = 14, tileWidth, height, gap = 8, ...rest }) => {
  const frame = useCurrentFrame();
  const show = Math.max(0, Math.min(1, (frame - (start - 6)) / 6));
  return (
  <div style={{ display: "flex", gap, opacity: show, transform: `translateY(${(1 - show) * 24}px)` }}>
    {Array.from(text).map((ch, i) => {
      const settle = start + shuffleFrames + i * settleEvery;
      const valueAt = (f: number) => {
        if (f < start) return " ";
        if (f >= settle || ch === " " || ch === ".") return ch;
        const step = Math.floor((f - start) / 2);
        return GLYPHS[(i * 7 + step * 11) % GLYPHS.length];
      };
      return <FlapChar key={i} valueAt={valueAt} width={tileWidth} height={height} flipFrames={2} {...rest} />;
    })}
  </div>
  );
};
