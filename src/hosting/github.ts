import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const BRANCH = process.env.VIDEO_HOST_BRANCH || "media";

/**
 * Publishes a local file at a public URL by committing it to the `media` branch of this
 * (public) repo. Instagram Login can't take uploads, only URLs. Each commit's tree holds
 * just the newest video, so the branch tip stays small (old videos remain in its history).
 */
export function hostOnGitHub(filePath: string): string {
  const git = (args: string[], input?: string, quiet = false) =>
    execFileSync("git", args, { encoding: "utf8", input, stdio: ["pipe", "pipe", quiet ? "ignore" : "inherit"] }).trim();

  const repo = (process.env.VIDEO_HOST_REPO || git(["remote", "get-url", "origin"]))
    .match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
  if (!repo) throw new Error("Couldn't work out the GitHub repo from `origin`; set VIDEO_HOST_REPO=owner/repo.");

  let parent: string | undefined;
  try {
    git(["fetch", "--quiet", "origin", BRANCH], undefined, true);
    parent = git(["rev-parse", "FETCH_HEAD"]);
  } catch {
    // Branch doesn't exist yet; the first commit starts it.
  }

  const name = `${Date.now()}-${basename(filePath)}`;
  const blob = git(["hash-object", "-w", filePath]);
  const tree = git(["mktree"], `100644 blob ${blob}\t${name}\n`);
  const commit = git(["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", `Host ${name} for Instagram`]);
  git(["push", "--quiet", "origin", `${commit}:refs/heads/${BRANCH}`]);

  return `https://raw.githubusercontent.com/${repo}/${commit}/${name}`;
}
