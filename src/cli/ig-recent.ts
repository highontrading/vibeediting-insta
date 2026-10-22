// Lists the latest posts (used to avoid double-posting). Usage: npm run ig:recent [-- --limit 5] [--json]
import { parseArgs } from "node:util";
import { loadInstagramConfig } from "../config.js";
import { InstagramClient } from "../instagram/client.js";

const { values } = parseArgs({ options: { limit: { type: "string", default: "10" }, json: { type: "boolean", default: false } } });
const media = await new InstagramClient(loadInstagramConfig()).getRecentMedia(Number(values.limit));

if (values.json) {
  console.log(JSON.stringify(media, null, 2));
} else {
  for (const m of media) console.log(`${m.timestamp}  ${m.mediaType.padEnd(14)} ${m.permalink}\n    ${m.caption.split("\n")[0].slice(0, 100)}`);
}
