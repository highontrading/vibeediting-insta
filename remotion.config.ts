import { Config } from "@remotion/cli/config";

// Instagram Reels: H.264 + AAC, yuv420p, always include an audio track.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);
Config.setEnforceAudioTrack(true);
Config.setOverwriteOutput(true);

// Optional: use an already-installed Chrome/Chromium instead of letting Remotion download one.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
