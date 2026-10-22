import { readFile, stat } from "node:fs/promises";
import type { InstagramConfig } from "../config.js";

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

export interface AccountInfo {
  id: string;
  username: string;
  name?: string;
  accountType?: string;
  followersCount?: number;
  mediaCount?: number;
}

export interface PublishingLimit {
  quotaUsage: number;
  quotaTotal: number;
  quotaDurationSeconds: number;
}

export interface PublishReelOptions {
  caption: string;
  /** Public https URL Meta can fetch, or a local .mp4 path (Facebook Login only — uploaded directly to Meta). */
  video: string;
  shareToFeed?: boolean;
  /** Public URL of a cover image; otherwise Instagram uses the frame at thumbOffsetMs. */
  coverUrl?: string;
  thumbOffsetMs?: number;
  onStatus?: (status: string) => void;
}

export interface PublishedMedia {
  id: string;
  permalink?: string;
}

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60_000;

/**
 * Minimal client for Instagram content publishing via the Meta Graph API.
 * Supports both "Instagram API with Instagram Login" (graph.instagram.com)
 * and "Instagram API with Facebook Login" (graph.facebook.com).
 */
export class InstagramClient {
  private readonly graphBase: string;
  private readonly uploadBase: string;
  private resolvedUserId?: string;

  constructor(private readonly config: InstagramConfig) {
    const host = config.loginType === "instagram" ? "graph.instagram.com" : "graph.facebook.com";
    this.graphBase = `https://${host}/${config.apiVersion}`;
    this.uploadBase = `https://rupload.facebook.com/ig-api-upload/${config.apiVersion}`;
    this.resolvedUserId = config.userId;
  }

  private async request<T>(method: "GET" | "POST", path: string, params: Record<string, string> = {}): Promise<T> {
    const all = new URLSearchParams({ ...params, access_token: this.config.accessToken });
    const url = method === "GET" ? `${this.graphBase}${path}?${all}` : `${this.graphBase}${path}`;
    const res = await fetch(url, method === "GET" ? undefined : { method, body: all });
    const body = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || body?.error) {
      const err = body?.error;
      const detail = err ? `${err.message} (type=${err.type}, code=${err.code}${err.error_subcode ? `, subcode=${err.error_subcode}` : ""})` : `HTTP ${res.status}`;
      throw new GraphApiError(`${method} ${path} failed: ${detail}`, res.status, body);
    }
    return body as T;
  }

  /** Instagram professional account ID used for publishing. */
  async getUserId(): Promise<string> {
    if (this.resolvedUserId) return this.resolvedUserId;
    if (this.config.loginType === "instagram") {
      const me = await this.request<{ id: string; user_id?: string }>("GET", "/me", { fields: "id,user_id" });
      this.resolvedUserId = me.user_id ?? me.id;
    } else {
      const pages = await this.request<{ data: { name: string; instagram_business_account?: { id: string } }[] }>(
        "GET",
        "/me/accounts",
        { fields: "name,instagram_business_account" },
      );
      const linked = pages.data.find((p) => p.instagram_business_account);
      if (!linked) throw new Error("No Facebook Page with a linked Instagram professional account was found for this token.");
      this.resolvedUserId = linked.instagram_business_account!.id;
    }
    return this.resolvedUserId;
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const userId = await this.getUserId();
    const fields =
      this.config.loginType === "instagram"
        ? "username,name,account_type,followers_count,media_count"
        : "username,name,followers_count,media_count";
    const info = await this.request<any>("GET", `/${userId}`, { fields });
    return {
      id: userId,
      username: info.username,
      name: info.name,
      accountType: info.account_type,
      followersCount: info.followers_count,
      mediaCount: info.media_count,
    };
  }

  async getPublishingLimit(): Promise<PublishingLimit> {
    const userId = await this.getUserId();
    const res = await this.request<{ data: { quota_usage: number; config?: { quota_total: number; quota_duration: number } }[] }>(
      "GET",
      `/${userId}/content_publishing_limit`,
      { fields: "config,quota_usage" },
    );
    const entry = res.data[0];
    return {
      quotaUsage: entry?.quota_usage ?? 0,
      quotaTotal: entry?.config?.quota_total ?? 0,
      quotaDurationSeconds: entry?.config?.quota_duration ?? 0,
    };
  }

  /** Create a Reel container, upload the video, wait for processing, and publish it. */
  async publishReel(opts: PublishReelOptions): Promise<PublishedMedia> {
    const isUrl = /^https?:\/\//i.test(opts.video);
    if (!isUrl && this.config.loginType === "instagram") {
      // graph.instagram.com rejects upload_type=resumable ("The parameter video_url is required").
      throw new Error("Instagram Login tokens can't upload local files. Host the video at a public https URL and pass that instead.");
    }
    const userId = await this.getUserId();
    const log = opts.onStatus ?? (() => {});

    const params: Record<string, string> = {
      media_type: "REELS",
      caption: opts.caption,
      share_to_feed: String(opts.shareToFeed ?? true),
    };
    if (opts.coverUrl) params.cover_url = opts.coverUrl;
    if (opts.thumbOffsetMs !== undefined) params.thumb_offset = String(opts.thumbOffsetMs);
    if (isUrl) params.video_url = opts.video;
    else params.upload_type = "resumable";

    log("Creating media container…");
    const container = await this.request<{ id: string }>("POST", `/${userId}/media`, params);

    if (!isUrl) {
      log("Uploading video to Meta…");
      await this.uploadVideo(container.id, opts.video);
    }

    log("Waiting for Instagram to process the video…");
    await this.waitForContainer(container.id, log);

    log("Publishing…");
    const published = await this.request<{ id: string }>("POST", `/${userId}/media_publish`, { creation_id: container.id });
    const media = await this.request<{ permalink?: string }>("GET", `/${published.id}`, { fields: "permalink" }).catch(() => ({ permalink: undefined }));
    return { id: published.id, permalink: media.permalink };
  }

  private async uploadVideo(containerId: string, filePath: string): Promise<void> {
    const { size } = await stat(filePath);
    const data = await readFile(filePath);
    const res = await fetch(`${this.uploadBase}/${containerId}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${this.config.accessToken}`,
        offset: "0",
        file_size: String(size),
      },
      body: data,
    });
    const body = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || body?.success === false || body?.error || body?.debug_info) {
      throw new GraphApiError(`Video upload failed: ${JSON.stringify(body)}`, res.status, body);
    }
  }

  private async waitForContainer(containerId: string, log: (s: string) => void): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let last = "";
    while (Date.now() < deadline) {
      const c = await this.request<{ status_code: string; status?: string }>("GET", `/${containerId}`, { fields: "status_code,status" });
      if (c.status_code !== last) {
        log(`  container status: ${c.status_code}`);
        last = c.status_code;
      }
      if (c.status_code === "FINISHED") return;
      if (c.status_code === "ERROR" || c.status_code === "EXPIRED") {
        throw new Error(`Instagram could not process the video (${c.status_code}): ${c.status ?? "no details"}`);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new Error(`Timed out after ${POLL_TIMEOUT_MS / 60_000} min waiting for container ${containerId}`);
  }

  /** Refresh a long-lived Instagram Login token (must be at least 24h old). Returns the new token. */
  async refreshLongLivedToken(): Promise<{ accessToken: string; expiresInSeconds: number }> {
    if (this.config.loginType !== "instagram") {
      throw new Error("Token refresh here only supports IG_LOGIN_TYPE=instagram. For Facebook Login, regenerate the token in the Graph API Explorer.");
    }
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: this.config.accessToken })}`,
    );
    const body = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || body?.error) throw new GraphApiError(`Token refresh failed: ${body?.error?.message ?? res.status}`, res.status, body);
    return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
  }
}
