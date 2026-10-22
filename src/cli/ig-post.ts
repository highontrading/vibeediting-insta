// Publishes a video as an Instagram Reel.
// Usage: npm run ig:post -- --video out/video.mp4 --caption "Hello" [--caption-file caption.txt] [--no-feed] [--thumb-offset 1500] [--dry-run]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadInstagramConfig } from "../config.js";
import { hostOnGitHub } from "../hosting/github.js";
import { InstagramClient } from "../instagram/client.js";

const { values } = parseArgs({
  options: {
    video: { type: "string" },
    caption: { type: "string" },
    "caption-file": { type: "string" },
    "cover-url": { type: "string" },
    "thumb-offset": { type: "string" },
    "no-feed": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

const video = values.video;
if (!video) {
  console.error("Missing --video <path-or-url>");
  process.exit(1);
}
const isUrl = /^https?:\/\//i.test(video);
if (!isUrl && !existsSync(video)) {
  console.error(`Video not found: ${video}`);
  process.exit(1);
}

const caption = (values["caption-file"] ? readFileSync(values["caption-file"], "utf8") : (values.caption ?? "")).trim();
if (caption.length > 2200) throw new Error(`Caption is ${caption.length} chars; Instagram allows 2200.`);
const hashtags = caption.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
if (hashtags > 30) throw new Error(`Caption has ${hashtags} hashtags; Instagram allows 30.`);

if (!isUrl) checkReelSpecs(video);

if (values["dry-run"]) {
  console.log("Dry run — would publish:");
  console.log({ video, caption, shareToFeed: !values["no-feed"] });
  process.exit(0);
}

const config = loadInstagramConfig();
let videoSource = video;
if (!isUrl && config.loginType === "instagram") {
  console.log("Hosting video on the GitHub media branch…");
  videoSource = hostOnGitHub(video);
  console.log(`  ${videoSource}`);
}

const ig = new InstagramClient(config);
const result = await ig.publishReel({
  video: videoSource,
  caption,
  shareToFeed: !values["no-feed"],
  coverUrl: values["cover-url"],
  thumbOffsetMs: values["thumb-offset"] ? Number(values["thumb-offset"]) : undefined,
  onStatus: (s) => console.log(s),
});
console.log(`\n🎉 Published! Media ID: ${result.id}`);
if (result.permalink) console.log(`   ${result.permalink}`);

/** Warn (don't fail) on things Instagram commonly rejects for Reels. */
function checkReelSpecs(file: string) {
  let probe: any;
  try {
    probe = JSON.parse(
      execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file], { encoding: "utf8" }),
    );
  } catch {
    return; // ffprobe not installed — skip local checks
  }
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const a = probe.streams.find((s: any) => s.codec_type === "audio");
  const duration = Number(probe.format.duration);
  const sizeMb = Number(probe.format.size) / 1024 / 1024;
  const warn = (m: string) => console.warn(`⚠️  ${m}`);
  if (!v) return warn("No video stream found.");
  if (v.codec_name !== "h264" && v.codec_name !== "hevc") warn(`Video codec is ${v.codec_name}; use H.264 or HEVC.`);
  if (a && a.codec_name !== "aac") warn(`Audio codec is ${a.codec_name}; use AAC.`);
  if (Math.abs(v.width / v.height - 9 / 16) > 0.01) warn(`Aspect ratio is ${v.width}x${v.height}; Reels look best at 9:16 (1080x1920).`);
  if (duration < 3 || duration > 15 * 60) warn(`Duration is ${duration.toFixed(1)}s; Reels must be 3s–15min.`);
  if (sizeMb > 300) warn(`File is ${sizeMb.toFixed(0)} MB; the limit is 300 MB.`);
}
