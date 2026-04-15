import {
  matchesPermission,
  resolveUserRoleSlug,
  resolveUserPermissions,
  userHasPermission,
} from './permission-matcher';

describe('matchesPermission', () => {
  it('returns false when granted list is empty or null', () => {
    expect(matchesPermission('posts.index', [])).toBe(false);
    expect(matchesPermission('posts.index', null as any)).toBe(false);
    expect(matchesPermission('posts.index', undefined as any)).toBe(false);
  });

  it('matches exact permission', () => {
    expect(matchesPermission('posts.index', ['posts.index'])).toBe(true);
    expect(matchesPermission('posts.index', ['posts.show'])).toBe(false);
  });

  it('matches global wildcard *', () => {
    expect(matchesPermission('posts.index', ['*'])).toBe(true);
    expect(matchesPermission('anything.else', ['*'])).toBe(true);
  });

  it('matches slug wildcard {slug}.*', () => {
    expect(matchesPermission('posts.index', ['posts.*'])).toBe(true);
    expect(matchesPermission('posts.show', ['posts.*'])).toBe(true);
    expect(matchesPermission('comments.index', ['posts.*'])).toBe(false);
  });

  it('does not cross-match unrelated slugs', () => {
    expect(matchesPermission('posts.index', ['comments.index', 'tags.*'])).toBe(false);
  });

  it('handles permission without a slug gracefully', () => {
    expect(matchesPermission('wat', ['wat'])).toBe(true);
    expect(matchesPermission('wat', ['*'])).toBe(true);
  });
});

describe('resolveUserPermissions', () => {
  it('returns empty array for null user', () => {
    expect(resolveUserPermissions(null, 1)).toEqual([]);
  });

  it('returns user.permissions when no org context', () => {
    const user = { permissions: ['posts.index'] };
    expect(resolveUserPermissions(user)).toEqual(['posts.index']);
  });

  it('aggregates tenant permissions from userRoles for the org', () => {
    const user = {
      userRoles: [
        { organizationId: 1, permissions: ['posts.*'] },
        { organizationId: 2, permissions: ['comments.index'] },
      ],
    };
    expect(resolveUserPermissions(user, 1)).toEqual(['posts.*']);
    expect(resolveUserPermissions(user, 2)).toEqual(['comments.index']);
    expect(resolveUserPermissions(user, 3)).toEqual([]);
  });

  it('supports snake_case userRoles shape', () => {
    const user = {
      user_roles: [{ organization_id: 5, permissions: ['x.*'] }],
    };
    expect(resolveUserPermissions(user, 5)).toEqual(['x.*']);
  });
});

describe('userHasPermission', () => {
  it('returns false for null user', () => {
    expect(userHasPermission(null, 'posts.index')).toBe(false);
  });

  it('checks non-tenant permissions from user.permissions', () => {
    const user = { permissions: ['posts.index'] };
    expect(userHasPermission(user, 'posts.index')).toBe(true);
    expect(userHasPermission(user, 'posts.show')).toBe(false);
  });

  it('checks tenant permissions from userRoles', () => {
    const user = {
      userRoles: [{ organizationId: 10, permissions: ['posts.*'] }],
    };
    expect(userHasPermission(user, 'posts.show', { id: 10 })).toBe(true);
    expect(userHasPermission(user, 'posts.show', { id: 99 })).toBe(false);
  });

  it('does not leak permissions across organizations', () => {
    const user = {
      userRoles: [
        { organizationId: 1, permissions: ['*'] },
        { organizationId: 2, permissions: [] },
      ],
    };
    expect(userHasPermission(user, 'posts.index', { id: 2 })).toBe(false);
  });
});

describe('resolveUserRoleSlug', () => {
  it('returns null with no org', () => {
    expect(resolveUserRoleSlug({}, null)).toBeNull();
  });

  it('returns the matching role slug', () => {
    const user = {
      userRoles: [
        { organizationId: 1, role: { slug: 'admin' } },
        { organizationId: 2, role: { slug: 'viewer' } },
      ],
    };
    expect(resolveUserRoleSlug(user, 1)).toBe('admin');
    expect(resolveUserRoleSlug(user, 2)).toBe('viewer');
    expect(resolveUserRoleSlug(user, 3)).toBeNull();
  });
});
