#!/usr/bin/env node
/**
 * AgentCode CLI entry point.
 *
 * Usage:
 *   npx agentcode install
 *   npx agentcode generate
 *   npx agentcode blueprint [--force] [--dry-run] [--model=slug]
 *   npx agentcode export-postman [--output=file.json] [--base-url=http://localhost:3000/api]
 *   npx agentcode export-types [--output=path/to/types.d.ts]
 */

import { runInstall } from './commands/install.command';
import { runGenerate } from './commands/generate.command';
import { runBlueprint } from './commands/blueprint.command';
import { runExportPostman } from './commands/export-postman.command';
import { runExportTypes } from './commands/export-types.command';

// -----------------------------------------------------------------------
// Flag parsing helpers
// -----------------------------------------------------------------------

/** Extract --key=value or presence of --flag from argv. */
export function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const withoutDashes = arg.slice(2);
    const eqIdx = withoutDashes.indexOf('=');
    if (eqIdx === -1) {
      flags[withoutDashes] = true;
    } else {
      flags[withoutDashes.slice(0, eqIdx)] = withoutDashes.slice(eqIdx + 1);
    }
  }
  return flags;
}

/** Return the first positional arg (not starting with --) after index `from`. */
export function extractCommand(argv: string[]): string | undefined {
  return argv.find((a) => !a.startsWith('--') && !a.startsWith('-'));
}

// -----------------------------------------------------------------------
// Help
// -----------------------------------------------------------------------

export function printHelp(): void {
  console.log(`
  agentcode <command> [options]

  Commands:
    install          Interactive setup wizard
    generate         Generate a model, policy, or scope stub
    blueprint        Generate code from YAML blueprints
    export-postman   Export a Postman collection
    export-types     Export TypeScript type definitions

  Options (by command):
    blueprint
      --force          Re-generate even if unchanged
      --dry-run        Preview without writing files
      --model=<slug>   Process a single blueprint by slug

    export-postman
      --output=<file>       Output path (default: postman_collection.json)
      --base-url=<url>      Base URL (default: http://localhost:3000/api)

    export-types
      --output=<file>       Output path (default: src/types/agentcode.d.ts)
`);
}

// -----------------------------------------------------------------------
// Main dispatcher
// -----------------------------------------------------------------------

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = extractCommand(argv);
  const flags = parseFlags(argv);

  switch (command) {
    case 'install':
      await runInstall();
      break;

    case 'generate':
      await runGenerate();
      break;

    case 'blueprint':
      await runBlueprint({
        force: flags['force'] === true,
        dryRun: flags['dry-run'] === true,
        model: typeof flags['model'] === 'string' ? flags['model'] : undefined,
      });
      break;

    case 'export-postman':
      await runExportPostman({
        output:
          typeof flags['output'] === 'string' ? flags['output'] : undefined,
        baseUrl:
          typeof flags['base-url'] === 'string' ? flags['base-url'] : undefined,
      });
      break;

    case 'export-types':
      await runExportTypes({
        output:
          typeof flags['output'] === 'string' ? flags['output'] : undefined,
      });
      break;

    default:
      printHelp();
      if (command !== undefined) {
        // Unknown command — exit with error
        console.error(`  Unknown command: ${command}\n`);
        process.exit(1);
      }
      break;
  }
}

// Run only when invoked directly (not when require()'d in tests).
if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
