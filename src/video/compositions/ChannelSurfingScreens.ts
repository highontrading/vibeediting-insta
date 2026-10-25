import { Easing, interpolate } from "remotion";
import { systems } from "../design/systems";
import { rand } from "../kit/motion";

// The mini-films that play on the TV. Each channel is drawn on a 1024x768 canvas as a pure function of
// its local frame `t`, using only the Terracotta Calm palette (olive and ink double as the night colours).
const S = systems.terracotta;
const P = S.palette;
export const SW = 1024;
export const SH = 768;

const BG = P.bg;
const SURF = P.surface;
const INK = P.ink;
const MUTED = P.muted;
const ACC = P.accent;
const OLV = P.accent2!;

const DISPLAY = S.type.display;
const BODY = S.type.body;
const MONO = "'JetBrains Mono', monospace";

const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const IO = Easing.bezier(0.37, 0, 0.63, 1);
const BACK = Easing.bezier(0.34, 1.56, 0.64, 1);
const pr = (t: number, a: number, b: number, e: (x: number) => number = OUT) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

type Ctx = CanvasRenderingContext2D;

export type ChannelId = "studio" | "weather" | "news" | "cartoon" | "nature" | "music" | "shop" | "space" | "card";

/** Channel number, name and the colour its glow throws on the room. */
export const CHANNELS: Record<ChannelId, { ch: string; name: string; glow: string }> = {
  card: { ch: "CH 00", name: "TEST", glow: "#E9DCC9" },
  weather: { ch: "CH 03", name: "WEATHER", glow: "#DDCBB3" },
  news: { ch: "CH 04", name: "NEWS", glow: "#C65D3B" },
  cartoon: { ch: "CH 05", name: "CARTOONS", glow: "#E9DCC9" },
  nature: { ch: "CH 06", name: "NATURE", glow: "#8A9070" },
  music: { ch: "CH 07", name: "VIDEO HITS", glow: "#C65D3B" },
  shop: { ch: "CH 08", name: "SHOP", glow: "#E9DCC9" },
  space: { ch: "CH 09", name: "SPACE", glow: "#7D6B5D" },
  studio: { ch: "CH 01", name: "STUDIO", glow: "#E9DCC9" },
};

const text = (ctx: Ctx, s: string, x: number, y: number, size: number, color: string, opts: { font?: string; weight?: number; align?: CanvasTextAlign; italic?: boolean; track?: number; base?: CanvasTextBaseline } = {}) => {
  ctx.font = `${opts.italic ? "italic " : ""}${opts.weight ?? 600} ${size}px ${opts.font ?? DISPLAY}`;
  ctx.fillStyle = color;
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = opts.base ?? "alphabetic";
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(opts.track ?? 0) * size}px`;
  ctx.fillText(s, x, y);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
};

const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

// ─── CH 00 · test card (the hook) ───────────────────────────────────────────────────────────
const testCard = (ctx: Ctx, t: number) => {
  rect(ctx, 0, 0, SW, SH, BG);
  const bars = [BG, SURF, OLV, ACC, MUTED, INK, SURF];
  const bw = SW / bars.length;
  const top = 80;
  const bh = 330;
  bars.forEach((c, i) => rect(ctx, i * bw, top, bw + 1, bh, c));
  // thin strip below the bars, mirrored colours
  [INK, BG, MUTED, BG, ACC, BG, OLV].forEach((c, i) => rect(ctx, i * bw, top + bh, bw + 1, 36, c));
  // fine grid
  ctx.strokeStyle = "rgba(61,44,41,0.35)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= SW; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SH);
    ctx.stroke();
  }
  for (let y = 0; y <= SH; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SW, y);
    ctx.stroke();
  }
  // centre circle + crosshair
  const cx = SW / 2;
  const cy = 560;
  rect(ctx, cx - 190, cy - 130, 380, 260, BG);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 190, cy);
  ctx.lineTo(cx + 190, cy);
  ctx.moveTo(cx, cy - 130);
  ctx.lineTo(cx, cy + 130);
  ctx.stroke();
  rect(ctx, cx - 14, cy - 14, 28, 28, ACC);
  text(ctx, "PLEASE STAND BY", cx, 53, 38, INK, { font: MONO, weight: 700, align: "center", track: 0.1 });
  text(ctx, "NO SIGNAL YET", 70, 724, 30, INK, { font: MONO, weight: 700, track: 0.08 });
  text(ctx, "TEST CARD 00", SW - 70, 724, 30, INK, { font: MONO, weight: 700, align: "right", track: 0.08 });
  // a slow sweep line so even a held frame is alive
  const sy = (t * 3) % SH;
  rect(ctx, 0, sy, SW, 6, "rgba(233,220,201,0.5)");
};

// ─── CH 03 · weather map ───────────────────────────────────────────────────────────────────
const coast: [number, number][] = [
  [-20, 250], [60, 232], [120, 270], [170, 330], [150, 400], [210, 450], [290, 430], [330, 500], [300, 570], [360, 640], [450, 660], [520, 620], [600, 650], [700, 640], [780, 590], [860, 600], [920, 540], [1040, 520],
];

const weather = (ctx: Ctx, t: number) => {
  rect(ctx, 0, 0, SW, SH, BG);
  // sea (land is the sand tone above the coast)
  ctx.fillStyle = SURF;
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  coast.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(1040, -20);
  ctx.closePath();
  ctx.fill();
  // coastline draws on
  const draw = pr(t, 0, 36, IO);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.lineJoin = "round";
  ctx.beginPath();
  const n = Math.max(2, Math.floor(draw * (coast.length - 1)) + 1);
  coast.slice(0, n).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // isobars sweep outward from a low-pressure centre
  const lx = 640;
  const ly = 250;
  ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) {
    const g = pr(t, 8 + k * 4, 50 + k * 4);
    const r = (50 + k * 52) * g;
    ctx.strokeStyle = k % 2 ? MUTED : OLV;
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.1) {
      const w = 1 + 0.09 * Math.sin(a * 3 + k * 1.3) + 0.04 * Math.sin(a * 5 + t * 0.05);
      const x = lx + Math.cos(a) * r * 1.35 * w;
      const y = ly + Math.sin(a) * r * 0.95 * w;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  text(ctx, "L", lx, ly + 28, 80, ACC, { weight: 900, align: "center" });
  // cold front marches left to right, with triangles
  const fx = -120 + pr(t, 24, 112, IO) * 900;
  ctx.strokeStyle = ACC;
  ctx.fillStyle = ACC;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(fx, 80);
  ctx.bezierCurveTo(fx + 80, 250, fx - 80, 400, fx + 40, 660);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const u = 0.1 + i * 0.16;
    const y = 80 + u * 580;
    const x = fx + Math.sin(u * 3.2) * 60 + (u - 0.5) * 20;
    ctx.beginPath();
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x + 22, y - 20);
    ctx.lineTo(x + 22, y + 22);
    ctx.closePath();
    ctx.fill();
  }
  // city temperatures tick up
  const cities: [string, number, number, number][] = [
    ["HARBOUR", 210, 320, 11],
    ["MILLTOWN", 470, 545, 14],
    ["PINE END", 780, 480, 9],
  ];
  cities.forEach(([nm, x, y, deg], i) => {
    const g = pr(t, 30 + i * 8, 56 + i * 8);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, 10 * g, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, nm, x + 22, y - 6, 28, INK, { font: MONO, weight: 700, track: 0.04 });
    text(ctx, `${Math.round(deg * pr(t, 40 + i * 8, 86 + i * 8, IO))}°`, x + 22, y + 44, 56, INK, { weight: 900 });
  });
  // header bar + lower strip
  rect(ctx, 0, 0, SW, 74, INK);
  text(ctx, "THE WEEK AHEAD", 40, 52, 40, BG, { weight: 900, track: 0.02 });
  text(ctx, "ISOBARS IN HPA", SW - 40, 50, 28, BG, { font: MONO, weight: 700, align: "right" });
  const sl = pr(t, 70, 90);
  rect(ctx, 0, SH - 74, SW, 74, ACC);
  text(ctx, "FRONT ARRIVES TUESDAY", 40, SH - 22 + (1 - sl) * 40, 38, BG, { weight: 900, track: 0.02 });
};

// ─── CH 04 · news package ──────────────────────────────────────────────────────────────────
const news = (ctx: Ctx, t: number) => {
  rect(ctx, 0, 0, SW, SH, INK);
  // studio backdrop: concentric globe lines
  ctx.strokeStyle = "rgba(233,220,201,0.14)";
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(780, 250, i * 70, i * 70, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // headline slab wipes in
  const w = pr(t, 0, 20);
  ctx.fillStyle = ACC;
  ctx.fillRect(0, 180, SW * w, 300);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 180, SW * w, 300);
  ctx.clip();
  text(ctx, "LOCAL FERN", 54, 330, 130, BG, { weight: 900, track: -0.03 });
  text(ctx, "REACHES WINDOW", 54, 450, 90, BG, { weight: 900, track: -0.03 });
  ctx.restore();
  // lower third
  const l3 = pr(t, 26, 46);
  rect(ctx, 0, 520, 760 * l3, 76, BG);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 520, 760 * l3, 76);
  ctx.clip();
  text(ctx, "Marta Oyelaran", 36, 575, 46, INK, { weight: 900 });
  text(ctx, "reporting live from the sofa", 400, 572, 28, MUTED, { font: BODY, weight: 500 });
  ctx.restore();
  // LIVE chip + clock
  const blink = Math.floor(t / 10) % 2 === 0;
  rect(ctx, 40, 40, 150, 56, ACC);
  text(ctx, "LIVE", 115, 82, 36, BG, { font: MONO, weight: 700, align: "center", track: 0.1 });
  if (blink) {
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(66, 68, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, "09:41", SW - 40, 82, 44, BG, { font: MONO, weight: 700, align: "right" });
  // ticker
  rect(ctx, 0, SH - 96, SW, 96, BG);
  rect(ctx, 0, SH - 96, 190, 96, OLV);
  text(ctx, "NEWS", 95, SH - 34, 38, BG, { weight: 900, align: "center", track: 0.04 });
  const msg = "LOCAL FERN REACHES WINDOW   •   SOFA CUSHION RECOVERS FROM DENT   •   TUESDAY CANCELLED DUE TO LACK OF INTEREST   •   ";
  ctx.save();
  ctx.beginPath();
  ctx.rect(190, SH - 96, SW - 190, 96);
  ctx.clip();
  const off = -(t * 9);
  text(ctx, msg + msg, 220 + off, SH - 34, 38, INK, { font: BODY, weight: 800 });
  ctx.restore();
};

// ─── CH 05 · Saturday cartoon ──────────────────────────────────────────────────────────────
const cartoon = (ctx: Ctx, t0: number) => {
  const t = Math.floor(t0 / 2) * 2; // drawn on twos
  rect(ctx, 0, 0, SW, SH, BG);
  // sunburst
  ctx.save();
  ctx.translate(SW / 2, 320);
  ctx.rotate(t * 0.004);
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.fillStyle = i % 2 ? SURF : BG;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1400, -120);
    ctx.lineTo(1400, 120);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // sun
  ctx.fillStyle = ACC;
  ctx.beginPath();
  ctx.arc(SW / 2, 300, 120, 0, Math.PI * 2);
  ctx.fill();
  // ground
  rect(ctx, 0, 600, SW, 168, OLV);
  rect(ctx, 0, 600, SW, 14, INK);
  // runner: a clay pot with a sprout, hopping left to right and looping back
  const loop = 40;
  const cyc = (t % loop) / loop; // 0..1 per hop
  const hop = Math.sin(cyc * Math.PI);
  const air = hop > 0.04;
  const x = 90 + ((t / 120) * 3 * 760) % 760 + 60;
  const lift = hop * 150;
  const squash = air ? 1 + 0.16 * Math.sin(cyc * Math.PI) : 0.78; // stretch in the air, squash on landing
  const sx = 1 / squash;
  const gy = 600;
  // shadow
  ctx.fillStyle = "rgba(61,44,41,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, gy + 24, 70 * (1 - hop * 0.35), 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // speed lines trail
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const yy = gy - 40 - lift - i * 36;
    ctx.beginPath();
    ctx.moveTo(x - 90 - i * 18, yy);
    ctx.lineTo(x - 170 - i * 40 - (rand(i + t * 0.5) * 20), yy);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, gy - lift);
  ctx.scale(sx, squash);
  // legs (rubber hose)
  const swing = Math.sin(t * 0.7);
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-22, -30);
  ctx.quadraticCurveTo(-30 + swing * 26, 4, -34 + swing * 44, 18);
  ctx.moveTo(22, -30);
  ctx.quadraticCurveTo(30 - swing * 26, 4, 34 - swing * 44, 18);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-34 + swing * 44, 22, 22, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(34 - swing * 44, 22, 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // pot body
  ctx.fillStyle = ACC;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-70, -190);
  ctx.lineTo(70, -190);
  ctx.lineTo(52, -26);
  ctx.quadraticCurveTo(0, -8, -52, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // rim
  ctx.fillStyle = ACC;
  ctx.beginPath();
  ctx.roundRect(-84, -218, 168, 44, 12);
  ctx.fill();
  ctx.stroke();
  // sprout
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.fillStyle = OLV;
  ctx.beginPath();
  ctx.moveTo(0, -218);
  ctx.quadraticCurveTo(-4, -260, 8 + swing * 6, -290);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(34 + swing * 6, -282, 38, 18, -0.5, 0, Math.PI * 2);
  ctx.ellipse(-22 + swing * 6, -268, 34, 16, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // eyes
  for (const ex of [-26, 26]) {
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.ellipse(ex, -128, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + 6, -122, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  // grin
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, -90, 22, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.restore();
  // title card chip
  rect(ctx, 40, 40, 330, 70, INK);
  text(ctx, "POT PALS", 205, 94, 50, BG, { weight: 900, align: "center", track: 0.04 });
  const bounce = Math.sin(t * 0.5) * 3;
  text(ctx, "SATURDAY 8:00", SW - 40, 90 + bounce, 38, INK, { font: BODY, weight: 800, align: "right" });
};

// ─── CH 06 · nature film ───────────────────────────────────────────────────────────────────
const frond = (ctx: Ctx, bx: number, by: number, heading: number, length: number, g: number, curl: number, lean: number) => {
  // Integrate the stem so it uncurls as g goes 0→1, and hang leaflet pairs along it.
  const N = 54;
  let x = bx;
  let y = by;
  let a = heading;
  const pts: [number, number, number][] = [[x, y, a]];
  const seg = (length * Math.max(0.04, g)) / N;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    a += (1 - g) * curl * (0.012 + u * 0.32) * (seg / 10) + lean * 0.002;
    x += Math.cos(a) * seg;
    y += Math.sin(a) * seg;
    pts.push([x, y, a]);
  }
  ctx.strokeStyle = OLV;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
  ctx.fillStyle = OLV;
  pts.forEach(([px, py, pa], i) => {
    if (i < 3) return;
    const u = i / N;
    const size = Math.max(0.5, (1 - u * 0.7) * 36 * Math.max(0, Math.min(1, g * 1.5 - u * 0.8)));
    for (const side of [-1, 1]) {
      const la = pa + side * (1.15 - (1 - g) * 0.7);
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(la) * size * 0.5, py + Math.sin(la) * size * 0.5, size * 0.55, size * 0.17, la, 0, Math.PI * 2);
      ctx.fill();
    }
  });
};

const nature = (ctx: Ctx, t: number) => {
  // dusk: ink sky with an olive hill, soft sun
  rect(ctx, 0, 0, SW, SH, INK);
  const sun = ctx.createRadialGradient(780, 230, 10, 780, 230, 360);
  sun.addColorStop(0, "rgba(198,93,59,0.85)");
  sun.addColorStop(1, "rgba(198,93,59,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, SW, SH);
  ctx.fillStyle = "#4a4a3c";
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.bezierCurveTo(260, 470, 520, 600, SW, 500);
  ctx.lineTo(SW, SH);
  ctx.lineTo(0, SH);
  ctx.fill();
  ctx.fillStyle = "#33332a";
  ctx.fillRect(0, 640, SW, 128);
  // three fronds unfurl, staggered
  const g1 = 0.1 + 0.9 * pr(t, 0, 88, IO);
  const g2 = 0.08 + 0.92 * pr(t, 10, 100, IO);
  const g3 = 0.06 + 0.94 * pr(t, 20, 110, IO);
  frond(ctx, 330, 700, -Math.PI / 2 - 0.35, 520, g1, 5.5, -1);
  frond(ctx, 520, 710, -Math.PI / 2, 600, g2, 5, 0);
  frond(ctx, 700, 700, -Math.PI / 2 + 0.4, 500, g3, 5.5, 1);
  // fireflies: slow drift
  for (let i = 0; i < 14; i++) {
    const fx = rand(i * 3.1) * SW + Math.sin(t * 0.03 + i) * 24;
    const fy = 120 + rand(i * 7.7) * 460 - t * 0.12 * (0.4 + rand(i));
    ctx.fillStyle = `rgba(233,220,201,${0.3 + 0.5 * Math.abs(Math.sin(t * 0.06 + i))})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const ti = pr(t, 40, 70);
  ctx.globalAlpha = ti;
  text(ctx, "The quiet life", 56, 100, 52, BG, { weight: 300, italic: true });
  text(ctx, "of ferns", 56, 152, 52, BG, { weight: 300, italic: true });
  ctx.globalAlpha = 1;
  text(ctx, "A NATURAL HISTORY", SW - 50, SH - 40, 24, BG, { font: MONO, weight: 700, align: "right", track: 0.12 });
};

// ─── CH 07 · music video ───────────────────────────────────────────────────────────────────
const music = (ctx: Ctx, t: number) => {
  const beat = Math.floor(t / 15);
  const within = (t % 15) / 15;
  const schemes: [string, string, string][] = [
    [ACC, BG, INK],
    [INK, ACC, BG],
    [BG, OLV, INK],
    [OLV, BG, ACC],
  ];
  const [bg, fg, ac] = schemes[beat % schemes.length];
  rect(ctx, 0, 0, SW, SH, bg);
  // stacked stripes slide on each beat
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    const dir = i % 2 ? 1 : -1;
    const shift = (pr(within, 0, 0.5) + beat) * dir * 140;
    ctx.fillStyle = i % 2 ? fg : ac;
    const y = (i * SH) / stripes;
    ctx.fillRect(((shift % 300) - 300) , y, SW + 600, SH / stripes / 2.2);
  }
  // beat disc
  const pulse = 1 + 0.18 * (1 - within) ** 3;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(SW / 2, SH / 2, 250 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = ac;
  ctx.stroke();
  const words = ["TURN", "IT", "UP", "TURN", "IT", "UP", "LOUD", "OK?"];
  const wd = words[beat % words.length];
  const sc = 0.8 + 0.2 * OUT(Math.min(1, within * 3));
  ctx.save();
  ctx.translate(SW / 2, SH / 2 + 56);
  ctx.scale(sc, sc);
  text(ctx, wd, 0, 0, wd.length > 3 ? 150 : 230, ac, { weight: 900, align: "center", track: -0.03 });
  ctx.restore();
  rect(ctx, 0, SH - 80, SW, 80, INK);
  text(ctx, "VIDEO HITS · THE COUNTDOWN", 36, SH - 28, 34, BG, { font: MONO, weight: 700, track: 0.06 });
  text(ctx, `#${String(8 - (beat % 8)).padStart(2, "0")}`, SW - 36, SH - 24, 44, ACC === bg ? BG : ACC, { weight: 900, align: "right" });
};

// ─── CH 08 · infomercial ───────────────────────────────────────────────────────────────────
const shop = (ctx: Ctx, t: number) => {
  rect(ctx, 0, 0, SW, SH, BG);
  // starburst spins
  ctx.save();
  ctx.translate(SW / 2, 380);
  ctx.rotate(t * 0.01);
  const spikes = 22;
  ctx.fillStyle = ACC;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? 330 : 470;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the Plant-O-Matic: a pot, a funnel, a crank
  const bob = Math.sin(t * 0.1) * 6;
  ctx.save();
  ctx.translate(SW / 2, 470 + bob);
  ctx.fillStyle = SURF;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-150, -110);
  ctx.lineTo(150, -110);
  ctx.lineTo(120, 120);
  ctx.lineTo(-120, 120);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OLV;
  ctx.beginPath();
  ctx.moveTo(-110, -110);
  ctx.lineTo(110, -110);
  ctx.lineTo(40, -200);
  ctx.lineTo(-40, -200);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(175, -40);
  ctx.rotate(t * 0.18);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(54, 0);
  ctx.stroke();
  ctx.fillStyle = ACC;
  ctx.beginPath();
  ctx.arc(54, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // little sprout pops from the funnel
  const sp = pr(t, 10, 30, BACK);
  ctx.strokeStyle = OLV;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -200);
  ctx.lineTo(0, -200 - 70 * sp);
  ctx.stroke();
  ctx.fillStyle = OLV;
  ctx.beginPath();
  ctx.ellipse(28 * sp, -260 * sp - 12, 30 * sp, 14 * sp, -0.4, 0, Math.PI * 2);
  ctx.ellipse(-26 * sp, -245 * sp - 10, 26 * sp, 12 * sp, 0.4, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, "PLANT-O-MATIC", 0, 92, 40, INK, { weight: 900, align: "center", track: 0.01 });
  ctx.restore();
  // headline
  rect(ctx, 0, 0, SW, 100, INK);
  text(ctx, "GROW ANYTHING.", 40, 68, 46, BG, { weight: 900, track: 0.02 });
  // "But wait…"
  const bw = pr(t, 48, 62, BACK);
  if (t >= 48 && t < 82) {
    ctx.save();
    ctx.translate(290, 600);
    ctx.rotate(-0.08);
    ctx.scale(bw, bw);
    rect(ctx, -170, -52, 340, 104, INK);
    text(ctx, "BUT WAIT…", 0, 24, 62, BG, { weight: 900, align: "center" });
    ctx.restore();
  }
  // price slam
  if (t >= 84) {
    const sl = pr(t, 84, 94, BACK);
    ctx.save();
    ctx.translate(SW - 250, 580);
    ctx.rotate(0.07);
    const s = 0.4 + 0.6 * sl;
    ctx.scale(s, s);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(-210, -110, 420, 220, 22);
    ctx.fill();
    text(ctx, "ONLY", -150, -40, 34, BG, { font: MONO, weight: 700, track: 0.12 });
    text(ctx, "$19.99", 0, 70, 112, ACC === INK ? BG : BG, { weight: 900, align: "center" });
    ctx.restore();
  }
  rect(ctx, 0, SH - 70, SW, 70, ACC);
  text(ctx, "CALL NOW · OPERATORS ARE STANDING BY A FERN", SW / 2, SH - 24, 32, BG, { font: MONO, weight: 700, align: "center", track: 0.04 });
};

// ─── CH 09 · space broadcast ───────────────────────────────────────────────────────────────
const space = (ctx: Ctx, t: number) => {
  rect(ctx, 0, 0, SW, SH, INK);
  for (let i = 0; i < 90; i++) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.03 + i * 1.7));
    ctx.fillStyle = `rgba(233,220,201,${tw * 0.9})`;
    ctx.fillRect(rand(i * 2.3) * SW, rand(i * 5.9) * 520, 2 + (i % 3 === 0 ? 1 : 0), 2 + (i % 3 === 0 ? 1 : 0));
  }
  // Earth rises slowly over the lunar horizon
  const rise = pr(t, 0, 150, IO);
  const ex = 590;
  const ey = 560 - rise * 250;
  const er = 150;
  ctx.fillStyle = OLV;
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.clip();
  // continents (sand) drift with rotation
  ctx.fillStyle = SURF;
  const rot = t * 0.4;
  for (let i = 0; i < 5; i++) {
    const cx = ex - 120 + ((rand(i * 3.3) * 420 + rot) % 420) - 40;
    const cy = ey - 90 + rand(i * 9.1) * 180;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52 + rand(i) * 30, 26 + rand(i * 2) * 22, rand(i * 4) - 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // cloud streaks
  ctx.strokeStyle = BG;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const yy = ey - 100 + i * 48;
    const o = ((rot * 1.6 + i * 80) % 300) - 150;
    ctx.beginPath();
    ctx.moveTo(ex - 60 + o, yy);
    ctx.quadraticCurveTo(ex + o, yy - 14, ex + 70 + o, yy + 4);
    ctx.stroke();
  }
  // night side
  const term = ctx.createLinearGradient(ex - er, 0, ex + er, 0);
  term.addColorStop(0, "rgba(61,44,41,0)");
  term.addColorStop(0.55, "rgba(61,44,41,0)");
  term.addColorStop(1, "rgba(61,44,41,0.85)");
  ctx.fillStyle = term;
  ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
  ctx.restore();
  // moon surface
  ctx.fillStyle = MUTED;
  ctx.beginPath();
  ctx.moveTo(0, 640);
  ctx.quadraticCurveTo(SW / 2, 560, SW, 640);
  ctx.lineTo(SW, SH);
  ctx.lineTo(0, SH);
  ctx.fill();
  ctx.fillStyle = "rgba(61,44,41,0.5)";
  [[160, 690, 62], [420, 720, 40], [760, 700, 70], [940, 680, 34]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // telemetry
  const live = Math.floor(t / 15) % 2 === 0;
  text(ctx, "LIVE FEED", 70, 90, 30, BG, { font: MONO, weight: 700, track: 0.12 });
  if (live) {
    ctx.fillStyle = ACC;
    ctx.beginPath();
    ctx.arc(48, 79, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, "DIST 384 400 KM", SW - 50, 90, 30, BG, { font: MONO, weight: 700, align: "right", track: 0.06 });
  text(ctx, `T+${String(Math.floor(t / 30)).padStart(2, "0")}:${String(Math.floor((t % 30) * 2)).padStart(2, "0")}`, SW - 50, 134, 30, BG, { font: MONO, weight: 700, align: "right" });
  // crosshair
  ctx.strokeStyle = "rgba(233,220,201,0.6)";
  ctx.lineWidth = 3;
  ctx.strokeRect(70, 120, 60, 60);
  ctx.beginPath();
  ctx.moveTo(100, 100);
  ctx.lineTo(100, 200);
  ctx.moveTo(50, 150);
  ctx.lineTo(150, 150);
  ctx.stroke();
};

// ─── CH 01 · the studio channel ────────────────────────────────────────────────────────────
const studio = (ctx: Ctx, t: number) => {
  rect(ctx, 0, 0, SW, SH, BG);
  const p = pr(t, 0, 22);
  // concentric rings breathe behind the wordmark
  ctx.strokeStyle = SURF;
  ctx.lineWidth = 26;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(SW / 2, SH / 2 - 10, (i * 118 + Math.sin(t * 0.06 + i) * 8) * p, 0, Math.PI * 2);
    ctx.stroke();
  }
  const fade = 1 - pr(t, 112, 134, IO);
  ctx.save();
  ctx.translate(0, (1 - p) * 40);
  ctx.globalAlpha = p * fade;
  text(ctx, "VIBE", SW / 2, 330, 160, INK, { weight: 600, align: "center", track: -0.03 });
  text(ctx, "EDITING", SW / 2, 490, 160, INK, { weight: 600, align: "center", track: -0.03 });
  ctx.restore();
  rect(ctx, SW / 2 - 130, 548, 260 * pr(t, 10, 30) * fade, 8, ACC);
  ctx.globalAlpha = fade;
  text(ctx, "CH 01 · OUR OWN CHANNEL", SW / 2, 640, 30, MUTED, { font: MONO, weight: 700, align: "center", track: 0.1 });
  ctx.globalAlpha = 1;
};

const DRAW: Record<ChannelId, (ctx: Ctx, t: number) => void> = {
  card: testCard,
  weather,
  news,
  cartoon,
  nature,
  music,
  shop,
  space,
  studio,
};

/** Draws the channel and its on-screen display (the channel number) into the screen canvas. */
export const drawChannel = (ctx: Ctx, id: ChannelId, t: number, osd: boolean) => {
  ctx.save();
  DRAW[id](ctx, t);
  ctx.restore();
  if (osd) {
    const ch = CHANNELS[id];
    // dark plate so the number reads on every channel (including the bright ones)
    rect(ctx, SW - 262, 42, 222, 78, INK);
    text(ctx, ch.ch, SW - 151, 99, 52, BG, { font: MONO, weight: 700, align: "center", track: 0.06 });
  }
};
