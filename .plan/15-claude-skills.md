# 15 Claude Skills

**What it does:** Ships 13 Claude Code slash commands (`.md` files) that help developers build features, write tests, create models, etc. These are installed to `.claude/commands/` in the user's project.

**Laravel equivalent:** `stubs/skills/agentcode-*.md` (13 files).

**NestJS implementation:**

Port each of the 13 Laravel skill files, adapting references from PHP/Laravel to TypeScript/NestJS/Prisma:

1. `agentcode-feature.md` -- Add a new feature (TDD flow)
2. `agentcode-model.md` -- Create a model definition
3. `agentcode-policy.md` -- Create an authorization policy
4. `agentcode-scope.md` -- Create a custom scope
5. `agentcode-test.md` -- Write tests
6. `agentcode-review.md` -- Review code
7. `agentcode-refactor.md` -- Refactor code
8. `agentcode-bugfix.md` -- Fix a bug (TDD)
9. `agentcode-audit.md` -- Add audit trail
10. `agentcode-docs.md` -- Update documentation
11. `agentcode-migrate.md` -- Create/update Prisma migration
12. `agentcode-deploy.md` -- Deployment guide
13. `agentcode-plan.md` -- Plan before coding

**Files to create:**
- `/stubs/skills/agentcode-feature.md` (and 12 more)

**Dependencies:** All other features (skills reference them).

---
