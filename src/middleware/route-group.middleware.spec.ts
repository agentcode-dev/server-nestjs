import { RouteGroupMiddleware } from './route-group.middleware';
import { AgentCodeConfigService, normalizeConfig } from '../agentcode.config';

function makeMw(groups: any) {
  const config = new AgentCodeConfigService(normalizeConfig({ models: {}, routeGroups: groups }));
  return new RouteGroupMiddleware(config);
}

describe('RouteGroupMiddleware', () => {
  it('sets __routeGroup and __skipAuth for a matching public prefix', () => {
    const mw = makeMw({ public: { prefix: 'public', models: ['posts'], skipAuth: true } });
    const req: any = { url: '/api/public/posts' };
    const next = jest.fn();
    mw.use(req, {} as any, next);
    expect(req.__routeGroup).toBe('public');
    expect(req.__skipAuth).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('does not set skipAuth when the group has no skipAuth', () => {
    const mw = makeMw({ admin: { prefix: 'admin', models: '*' } });
    const req: any = { url: '/api/admin/posts' };
    mw.use(req, {} as any, jest.fn());
    expect(req.__routeGroup).toBe('admin');
    expect(req.__skipAuth).toBeUndefined();
  });

  it('ignores dynamic :organization prefixes', () => {
    const mw = makeMw({
      tenant: { prefix: ':organization', models: '*' },
      public: { prefix: 'public', models: ['posts'], skipAuth: true },
    });
    const req: any = { url: '/api/acme/posts' };
    mw.use(req, {} as any, jest.fn());
    expect(req.__routeGroup).toBeUndefined();
  });
});
