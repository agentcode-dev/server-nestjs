# 14 Cli Commands

**What it does:** NestJS CLI schematics for `agentcode:install`, `agentcode:generate`, `agentcode:blueprint`, `agentcode:export-postman`, `agentcode:export-types`.

**Laravel equivalent:** `Commands/InstallCommand.php`, `Commands/GenerateCommand.php`, `Commands/BlueprintCommand.php`, `Commands/ExportPostmanCommand.php`, `Commands/ExportTypesCommand.php`.

**NestJS implementation:**

Use NestJS CLI plugins (`@nestjs/schematics`) or standalone CLI scripts:

```bash
npx agentcode install          # Interactive setup
npx agentcode generate         # Generate a single model
npx agentcode blueprint        # Generate from YAML blueprints
npx agentcode export-postman   # Generate Postman collection
npx agentcode export-types     # Generate TypeScript types
```

The CLI is a separate entry point in the package:

```json
{
  "bin": {
    "agentcode": "./dist/cli/index.js"
  }
}
```

**Install command** mirrors Laravel's interactive flow: prompts for features (multi-tenant, audit trail), test framework (jest), organization identifier column, roles.

**Files to create:**
- `/src/cli/index.ts`
- `/src/cli/commands/install.command.ts`
- `/src/cli/commands/generate.command.ts`
- `/src/cli/commands/blueprint.command.ts`
- `/src/cli/commands/export-postman.command.ts`
- `/src/cli/commands/export-types.command.ts`

**Dependencies:** 13 (blueprint system).

---
