import { Config } from "@remotion/cli/config";
import { existsSync, readdirSync } from "node:fs";

// Instagram Reels: H.264 + AAC, yuv420p, always include an audio track.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);
Config.setEnforceAudioTrack(true);
Config.setOverwriteOutput(true);
// WebGL (three.js scenes) needs a GL backend in headless Chromium.
Config.setChromiumOpenGlRenderer("angle");

// Use an already-installed Chromium instead of letting Remotion download one: the env var if set,
// otherwise the headless shell that Claude Code cloud sessions ship with.
const PW_BROWSERS = "/opt/pw-browsers";
const cloudShell = existsSync(PW_BROWSERS)
  ? readdirSync(PW_BROWSERS)
      .filter((d) => d.startsWith("chromium_headless_shell-"))
      .flatMap((d) => [`${PW_BROWSERS}/${d}/chrome-linux/headless_shell`, `${PW_BROWSERS}/${d}/chrome-headless-shell-linux64/chrome-headless-shell`])
      .find((p) => existsSync(p))
  : undefined;
const browser = process.env.REMOTION_BROWSER_EXECUTABLE || cloudShell;
if (browser) Config.setBrowserExecutable(browser);
