import 'dotenv/config';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { runAiBuildOrchestrator } from '../src/lib/intelligence/ai-build-orchestrator';

type CliArgs = {
  promptPath: string;
  mission: string;
  persistActions: boolean;
  actionOwner: string;
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, 'true');
      continue;
    }
    args.set(key, next);
    i += 1;
  }

  const promptPath =
    args.get('prompt') ||
    process.env.NXT_LINK_MASTER_PROMPT_PATH ||
    '';

  if (!promptPath) {
    throw new Error(
      'Missing prompt path. Use --prompt <path> or set NXT_LINK_MASTER_PROMPT_PATH.',
    );
  }

  return {
    promptPath,
    mission:
      args.get('mission') ||
      'Build NXT LINK – Innovation Command Monitor from master prompt',
    persistActions: parseBool(args.get('persist-actions'), true),
    actionOwner: args.get('owner') || 'NXT Link Team',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const promptContent = (await readFile(args.promptPath, 'utf8')).trim();

  if (promptContent.length < 40) {
    throw new Error('Prompt file is too short.');
  }

  const run = await runAiBuildOrchestrator({
    masterPrompt: promptContent,
    mission: args.mission,
    persistActions: args.persistActions,
    actionOwner: args.actionOwner,
  });

  const outDir = path.resolve(process.cwd(), 'intelligence', 'build-runs');
  await mkdir(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `run-${timestamp}.json`);
  const latestFile = path.join(outDir, 'latest.json');

  const payload = JSON.stringify(run, null, 2);
  await writeFile(outFile, payload, 'utf8');
  await writeFile(latestFile, payload, 'utf8');

  process.stdout.write(
    [
      `run_id: ${run.run_id}`,
      `mission: ${run.mission}`,
      `provider: ${run.llm.selected_provider}`,
      `actions_created: ${run.created_actions.length}`,
      `task_failures: ${run.task_failures.length}`,
      `output: ${outFile}`,
    ].join('\n') + '\n',
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown failure';
  process.stderr.write(`run-ai-builder failed: ${message}\n`);
  process.exitCode = 1;
});
