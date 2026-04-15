# Missing / Partial Features vs Laravel Version

Last updated after post-audit implementation pass. Compared against the 28-feature table in `../server-laravel/CLAUDE.md`.

All 28 features are now at Laravel parity. The remaining entries in this doc are deliberate parity gaps (design choices), not missing functionality.

## Status legend

- ✅ Complete at parity
- 🟡 Partial — works but missing edge case or opinionated default
- ❌ Not implemented

---

## Feature audit

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Automatic CRUD | ✅ | `GlobalController` + `ResourceService`. index/show/store/update/destroy + trashed/restore/force-delete. |
| 2 | Authentication | ✅ | `AuthController` + `AuthService`. JWT, bcrypt, password recovery token, register-with-invitation. |
| 3 | Authorization & Policies | ✅ | `ResourcePolicy` + `ResourcePolicyGuard`. `{slug}.{action}` + `*` / `{slug}.*` wildcards. |
| 4 | Role-Based Access Control | ✅ | `userRoles[].permissions` per org. |
| 5 | Attribute-Level Permissions | ✅ | `permittedAttributesFor{Create,Update,Show}`, `hiddenAttributesForShow`. |
| 6 | Validation | ✅ | Zod schemas, role-keyed `validationStore` / `validationUpdate`. |
| 7 | Cross-Tenant FK Validation | ✅ | `ModelRegistration.fkConstraints` + `ValidationService.verifyTenantFks`. Direct + FK-chain traversal. |
| 8 | Filtering | ✅ | `?filter[field]=a,b` → AND / IN. |
| 9 | Sorting | ✅ | `?sort=-createdAt,title`. |
| 10 | Full-Text Search | ✅ | `?search=term` across `allowedSearch`, supports dot-notation relations. |
| 11 | Pagination | ✅ | `X-Current-Page` / `X-Last-Page` / `X-Per-Page` / `X-Total` headers. |
| 12 | Field Selection | ✅ | `?fields[slug]=a,b` with `id` always kept. |
| 13 | Eager Loading | ✅ | `?include=author,comments.author`. **Include-level `viewAny` authorization enforced**. |
| 14 | Multi-Tenancy | ✅ | `ResolveOrganizationMiddleware` + auto `organizationId` scoping + `organizationId` stripped from input. |
| 15 | Nested Ownership (FK chain) | ✅ | `findOrganizationFkChain` walker used by `ValidationService` for indirect FK checks. |
| 16 | Route Groups | ✅ | Config shape + `RouteGroupMiddleware` surfaces `__routeGroup`/`__skipAuth`. |
| 17 | Soft Deletes | ✅ | `trashed` / `restore` / `force-delete` endpoints + Prisma extension `withSoftDelete`. |
| 18 | Audit Trail | ✅ | `AuditService.log` + `diff` invoked from `GlobalController`. Excludes passwords by default. |
| 19 | Nested Operations | ✅ | `$N.field` references, `create` / `update` / `delete`, atomic, max-op limit, allow-list. |
| 20 | Invitations | ✅ | Token generation, expiry flip, resend, cancel, accept (auth + unauth). |
| 21 | Hidden Columns | ✅ | `SerializerService` applies base + additional + policy blacklist + whitelist + computed attrs. |
| 22 | Auto-Scope Discovery | ✅ | `autoDiscoverScopes(config, { scopesDir })` loads `{ModelName}Scope.{ts,js}` from `src/scopes/` by convention and merges into `ModelRegistration.scopes`. Explicit registration still supported. |
| 23 | UUID Primary Keys | ✅ | `hasUuid` flag preserves string IDs; `withUuid` Prisma extension. |
| 24 | Middleware Support | ✅ | `AgentCodeModule` implements `NestModule.configure(consumer)` — per-model `middleware` and per-action `actionMiddleware` are wired to their routes automatically. Declared middleware classes are auto-registered as providers. Opt out via `autoModelMiddleware: false`. |
| 25 | Action Exclusion | ✅ | `exceptActions` → 404. |
| 26 | Generator CLI | ✅ | `install`, `generate`, `blueprint`, `export-postman`, `export-types`. |
| 27 | Postman Export | ✅ | Collection v2.1 with all groups, CRUD, auth, soft-delete routes. |
| 28 | Blueprint System | ✅ | YAML → Prisma + ResourceDefinition + Policy + Jest test + Seeder. Manifest SHA-256 skip. |

## Deliberate parity gaps

| Area | Decision |
|------|----------|
| Prisma `$extends` audit extension | Not implemented. Audit logging is invoked imperatively from `GlobalController` and callers can optionally use `audit.service.ts` directly. Direct Prisma calls outside AgentCode controllers are not audited — document this when extending. |
| Default email notification for invitations / password reset | Consuming app provides `invitations.notificationHandler`. No default — email delivery is out of scope for a framework. |
| `*.prisma` file mutation on install | `agentcode install` prompts the user to add the required AuditLog/Organization/UserRole/Invitation models to `prisma/schema.prisma`; it does not auto-mutate the schema file. |
| Filesystem auto-discovery of scope classes | Not done. Explicit registration in `ModelRegistration.scopes` keeps the module tree-shakable. |
| Decorator-on-entity pattern (class-validator / TypeORM-style) | Rejected. AgentCode keeps schema (Prisma) and behavior (ModelRegistration) separate. |

## Test coverage

- 48 test suites
- 449 tests
- Covers: CRUD, cross-tenant isolation, soft delete + restore + force, forbidden fields, role-keyed validation, include authorization, FK tenant chain, filter/sort/search/pagination/includes, nested `$N.field` refs + delete, invitation lifecycle, blueprint YAML → code for all 5 generators, CLI command dispatch, Postman export, TypeScript export (with `ts.createProgram` validation), permission wildcards, hidden columns blacklist/whitelist precedence.
