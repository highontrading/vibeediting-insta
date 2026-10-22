import { existsSync } from "node:fs";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

if (existsSync(".env")) process.loadEnvFile(".env");

// Node's built-in fetch ignores HTTPS_PROXY; route through it when one is configured (e.g. cloud sessions).
if (process.env.HTTPS_PROXY || process.env.https_proxy) setGlobalDispatcher(new EnvHttpProxyAgent());

export type LoginType = "instagram" | "facebook";

export interface InstagramConfig {
  loginType: LoginType;
  accessToken: string;
  userId?: string;
  apiVersion: string;
}

export function loadInstagramConfig(): InstagramConfig {
  const loginType = (process.env.IG_LOGIN_TYPE ?? "instagram") as LoginType;
  if (loginType !== "instagram" && loginType !== "facebook") {
    throw new Error(`IG_LOGIN_TYPE must be "instagram" or "facebook", got "${loginType}"`);
  }
  const accessToken = process.env.IG_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("IG_ACCESS_TOKEN is not set. Copy .env.example to .env and follow docs/INSTAGRAM_SETUP.md.");
  }
  return {
    loginType,
    accessToken,
    userId: process.env.IG_USER_ID?.trim() || undefined,
    apiVersion: process.env.IG_API_VERSION?.trim() || "v25.0",
  };
}
