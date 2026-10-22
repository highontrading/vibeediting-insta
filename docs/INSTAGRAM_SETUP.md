# Connecting the Vibe Editing Instagram account

This project posts Reels with Meta's official **Instagram API with Instagram Login**
(`graph.instagram.com`). You don't need a Facebook Page for it. Plan on about 15 minutes, once.

You end up with two values for your `.env`: `IG_ACCESS_TOKEN` and `IG_USER_ID`.

---

## Step 1: Make the Instagram account a Professional account

The API only works with **Business** or **Creator** accounts.

1. Open Instagram → your **Vibe Editing** profile → ☰ menu → **Settings and privacy**.
2. **Account type and tools** → **Switch to professional account**.
3. Pick **Creator** (or **Business**), then choose a category such as *Digital creator* or *Video creator*.

## Step 2: Create a Meta developer app

1. Go to <https://developers.facebook.com/> and log in. Register as a developer if it asks you to.
2. **My Apps** → **Create app**.
3. App name: `Vibe Editing Autopilot`, or any name you like.
4. Use case: choose **"Manage messaging & content on Instagram"**. Older dashboards show this as
   App type **Business**, then add the **Instagram** product.
5. Finish creating the app.

## Step 3: Set up Instagram Login and add your account

1. In the app dashboard, open **Instagram** → **API setup with Instagram login**.
2. Under **Generate access tokens**, click **Add account** and log in as **Vibe Editing**.
   - If it says you need a role, go to **App roles → Roles → Add People → Instagram Tester**
     and add your Instagram username. Then on Instagram open **Settings → Apps and websites
     → Tester invites** (on the web: instagram.com → Settings → Apps and websites) and **accept** the invite.
3. Grant the permissions it asks for. Posting needs both of these:
   - `instagram_business_basic`
   - `instagram_business_content_publish`
4. Click **Generate token** next to the account and copy it. This is a **long-lived token
   that lasts 60 days**.

> While the app is in **Development mode**, it can publish to accounts that have a role on the app,
> which includes yours. You don't need App Review to post to your own page.

## Step 4: Put the values in `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```
IG_LOGIN_TYPE=instagram
IG_ACCESS_TOKEN=<the token you copied>
IG_USER_ID=            # leave empty for now
IG_API_VERSION=v25.0
```

## Step 5: Test the connection

```bash
npm install
npm run ig:check
```

You should see something like:

```
✅ Connected to Instagram (instagram login, v25.0)
   @vibeediting — Vibe Editing
   IG_USER_ID: 17841400000000000
   Publishing quota: 0/100 posts used in the last 24h
```

Copy the printed `IG_USER_ID` into `.env`.

## Step 6: Publish a test Reel

```bash
npm run render -- HowThisWasMade out/how-this-was-made.mp4
npm run ig:post -- --video out/how-this-was-made.mp4 \
  --caption "This video was made AND posted by AI 🤖 #vibeediting #aivideo #motiongraphics"
```

Add `--dry-run` to check the video and caption without posting.

---

## Keeping the token alive

Long-lived tokens expire after **60 days**. Any token that is at least 24 hours old can be extended:

```bash
npm run ig:refresh-token   # writes the new token back into .env
```

Autopilot will run this on a schedule. Until that's set up, run it at least once a month.

## Running in the cloud (Claude Code on the web / autopilot)

1. **Network access.** The environment has to allow these hosts: `graph.instagram.com`,
   `graph.facebook.com` and `rupload.facebook.com`. Add them under **Network access →
   Allowed domains** in the environment settings
   ([docs](https://code.claude.com/docs/en/cloud-environments#network-access)).
2. **Secrets.** Add `IG_ACCESS_TOKEN` and `IG_USER_ID` as environment variables in the
   cloud environment's settings. Never commit them to the repo.

## Alternative: Facebook Login

If you'd rather go through a linked Facebook Page, set `IG_LOGIN_TYPE=facebook`. Then generate a
user token in the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) with
`instagram_basic`, `instagram_content_publish`, `pages_show_list` and `pages_read_engagement`.
`npm run ig:check` finds the Instagram account linked to your Page.

## Troubleshooting

| Error | Fix |
|---|---|
| `Invalid OAuth access token` (code 190) | The token expired or was copied incorrectly. Generate a new one in Step 3. |
| `Application does not have permission` (code 10 / 200) | You didn't grant `instagram_business_content_publish`. Re-add the account and accept every permission. |
| `The user must be an assigned tester` | Accept the Instagram Tester invite (Step 3). |
| Container status `ERROR` | The video doesn't meet the specs. Use MP4 with H.264 + AAC, 9:16, 3s–15min, ≤300 MB. `npm run render` already outputs a compliant file. |
| Rate limit | Instagram allows 100 API posts per 24 hours. `npm run ig:check` shows your usage. |
