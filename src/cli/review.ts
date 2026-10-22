// Renders still frames of a composition for visual review (styleframes / contact sheet).
// Usage: npm run review -- <CompositionId> [--frames 30,120,450] [--count 12] [--scale 0.5]
// Output: out/review/<Id>/f<frame>.png and out/review/<Id>-sheet.png (all frames tiled, 4 per row).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { frames: { type: "string" }, count: { type: "string", default: "12" }, scale: { type: "string", default: "0.5" } },
});
const id = positionals[0];
if (!id) {
  console.error("Usage: npm run review -- <CompositionId> [--frames 30,120] [--count 12]");
  process.exit(1);
}

const PW = "/opt/pw-browsers";
const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE ||
  (existsSync(PW)
    ? readdirSync(PW)
        .filter((d) => d.startsWith("chromium_headless_shell-"))
        .map((d) => `${PW}/${d}/chrome-linux/headless_shell`)
        .find((p) => existsSync(p))
    : undefined) ||
  null;

const serveUrl = await bundle({ entryPoint: path.resolve("src/video/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: "angle" } });
const frames = values.frames
  ? values.frames.split(",").map((f) => Number(f.trim()))
  : Array.from({ length: Number(values.count) }, (_, i) =>
      Math.round(((i + 0.5) / Number(values.count)) * (composition.durationInFrames - 1)),
    );

const dir = path.resolve("out/review", id);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const files: string[] = [];
for (const frame of frames) {
  const output = path.join(dir, `f${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale: Number(values.scale), browserExecutable, overwrite: true, chromiumOptions: { gl: "angle" } });
  files.push(output);
  console.log(`frame ${frame} → ${path.relative(process.cwd(), output)}`);
}

const sheet = path.resolve("out/review", `${id}-sheet.png`);
const cols = Math.min(4, files.length);
const rows = Math.ceil(files.length / cols);
execFileSync("ffmpeg", [
  "-v", "error", "-y",
  "-pattern_type", "glob", "-i", path.join(dir, "f*.png"),
  "-vf", `scale=270:-1,tile=${cols}x${rows}:padding=6:color=0x808080`,
  "-frames:v", "1", sheet,
]);
console.log(`contact sheet → ${path.relative(process.cwd(), sheet)}`);
