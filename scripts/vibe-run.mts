/**
 * Drives the vibeediting MCP the way a customer's AI agent does, for Proof posts.
 * Copied into .vibe-mcp/scripts/ by setup-vibe-mcp.sh; run it with `npm run vibe -- <folder> <steps.json>`.
 *
 * steps.json: { "request": "the exact sentence shown on screen", "steps": [{ "tool": "...", "args": {...} }] }
 * All steps run in one server process, so background jobs (transcription, renders) finish.
 * Writes <folder>/vibe-log.md (every call and its full answer: the source for on-screen numbers)
 * and saves any images the tools return next to it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const [folderArg, stepsArg] = process.argv.slice(2);
if (!folderArg || !stepsArg) {
  console.error('usage: npm run vibe -- <footage folder> <steps.json>');
  process.exit(1);
}
if (!process.env.VIBE_LICENSE_KEY) {
  console.error('VIBE_LICENSE_KEY is not set: the owner must add it to the environment.');
  process.exit(2);
}
const folder = path.resolve(folderArg);
const plan = JSON.parse(fs.readFileSync(stepsArg, 'utf8')) as {
  request: string;
  steps: { tool: string; args?: Record<string, unknown> }[];
};

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.resolve(import.meta.dirname, '../dist/cli.js')],
  cwd: folder,
  env: { ...(process.env as Record<string, string>), VIBE_PROJECT_DIR: folder },
  stderr: 'inherit',
});
const client = new Client({ name: 'vibeediting-insta', version: '1.0.0' });
await client.connect(transport);

const log: string[] = [`# vibeediting run\n\nRequest: "${plan.request}"\n`];
let imageNo = 0;
const textOf = (r: any) =>
  r.content
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n');

try {
  for (const { tool, args = {} } of plan.steps) {
    const t0 = Date.now();
    let r: any = await client.callTool({ name: tool, arguments: args }, { timeout: 300_000 });
    let text = textOf(r);
    // Long jobs answer with a job id: keep waiting like an agent would.
    for (let m = /job_id "([^"]+)"/.exec(text); m && !r.isError; m = /job_id "([^"]+)"/.exec(text)) {
      r = await client.callTool(
        { name: 'get_job_status', arguments: { job_id: m[1], wait_seconds: 45 } },
        { timeout: 300_000 },
      );
      text = textOf(r);
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n=== ${tool} (${secs} s)${r.isError ? ' ERROR' : ''}\n${text}`);
    log.push(`## ${tool} ${JSON.stringify(args)} (${secs} s)\n\n\`\`\`\n${text}\n\`\`\`\n`);
    for (const c of r.content) {
      if (c.type !== 'image') continue;
      const f = `vibe-image-${++imageNo}-${tool}.jpg`;
      fs.writeFileSync(path.join(folder, f), Buffer.from(c.data, 'base64'));
      log.push(`![${tool}](${f})\n`);
    }
    if (r.isError) throw new Error(`${tool} failed: ${text}`);
  }
} finally {
  fs.writeFileSync(path.join(folder, 'vibe-log.md'), log.join('\n'));
  await client.close();
}
