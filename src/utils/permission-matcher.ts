/**
 * Match a `{slug}.{action}` permission against a set of granted permissions.
 *
 * Supports wildcards identically to the Laravel version:
 *   - `*`              → grants everything
 *   - `{slug}.*`       → grants all actions on a specific slug
 *   - `{slug}.{act}`   → exact match
 */
export function matchesPermission(
  permission: string,
  granted: string[] | null | undefined,
): boolean {
  if (!granted || granted.length === 0) return false;
  const slug = permission.split('.')[0] ?? '';
  const slugWildcard = `${slug}.*`;
  for (const p of granted) {
    if (p === permission || p === '*' || p === slugWildcard) return true;
  }
  return false;
}

/**
 * Resolve the role slug for a user in a specific organization.
 * Expects a user object shaped like the Laravel user with userRoles relation.
 */
export function resolveUserRoleSlug(user: any, organizationId: number | string | null | undefined): string | null {
  if (!user || organizationId == null) return null;
  const userRoles = user.userRoles ?? user.user_roles ?? [];
  for (const ur of userRoles) {
    const orgId = ur.organizationId ?? ur.organization_id;
    if (orgId === organizationId) {
      return ur.role?.slug ?? ur.roleSlug ?? ur.role_slug ?? null;
    }
  }
  return null;
}

/**
 * Resolve permissions granted to a user in an organization context.
 * Tenant context → aggregates permissions from all user_roles entries
 *                  matching the organization.
 * No org context → returns the user's top-level permissions array.
 */
export function resolveUserPermissions(user: any, organizationId?: number | string | null): string[] {
  if (!user) return [];
  if (organizationId != null) {
    const userRoles = user.userRoles ?? user.user_roles ?? [];
    const all: string[] = [];
    for (const ur of userRoles) {
      const orgId = ur.organizationId ?? ur.organization_id;
      if (orgId === organizationId) {
        const perms = ur.permissions ?? [];
        for (const p of perms) all.push(p);
      }
    }
    return all;
  }
  return user.permissions ?? [];
}

/**
 * Top-level permission check mirroring the Laravel `hasPermission` method.
 */
export function userHasPermission(
  user: any,
  permission: string,
  organization?: { id: number | string } | null,
): boolean {
  if (!user) return false;
  const orgId = organization ? organization.id : null;
  const permissions = resolveUserPermissions(user, orgId);
  return matchesPermission(permission, permissions);
}
