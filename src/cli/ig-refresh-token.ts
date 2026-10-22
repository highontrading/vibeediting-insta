// Extends a long-lived Instagram Login token for another 60 days and writes it back to .env.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadInstagramConfig } from "../config.js";
import { InstagramClient } from "../instagram/client.js";

const ig = new InstagramClient(loadInstagramConfig());
const { accessToken, expiresInSeconds } = await ig.refreshLongLivedToken();
const expires = new Date(Date.now() + expiresInSeconds * 1000).toISOString().slice(0, 10);

if (existsSync(".env")) {
  const env = readFileSync(".env", "utf8");
  writeFileSync(".env", env.replace(/^IG_ACCESS_TOKEN=.*$/m, `IG_ACCESS_TOKEN=${accessToken}`));
  console.log(`✅ Token refreshed and saved to .env (expires ${expires}).`);
} else {
  console.log(`✅ Token refreshed (expires ${expires}). No .env file found — update IG_ACCESS_TOKEN wherever you store it.`);
}
