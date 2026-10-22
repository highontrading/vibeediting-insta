// Verifies the Instagram connection: token works, account is found, and shows the publishing quota.
import { loadInstagramConfig } from "../config.js";
import { InstagramClient } from "../instagram/client.js";

const config = loadInstagramConfig();
const ig = new InstagramClient(config);

const account = await ig.getAccountInfo();
console.log(`✅ Connected to Instagram (${config.loginType} login, ${config.apiVersion})`);
console.log(`   @${account.username}${account.name ? ` — ${account.name}` : ""}`);
console.log(`   IG_USER_ID: ${account.id}`);
if (account.accountType) console.log(`   Account type: ${account.accountType}`);
if (account.followersCount !== undefined) console.log(`   Followers: ${account.followersCount}   Posts: ${account.mediaCount}`);
if (!config.userId) console.log(`\n   Tip: add IG_USER_ID=${account.id} to your .env to skip this lookup.`);

const limit = await ig.getPublishingLimit();
const hours = Math.round(limit.quotaDurationSeconds / 3600);
console.log(`\n   Publishing quota: ${limit.quotaUsage}/${limit.quotaTotal || "?"} posts used in the last ${hours || 24}h`);
