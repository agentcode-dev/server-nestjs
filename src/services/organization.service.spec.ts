import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentCodeConfigService, normalizeConfig } from '../agentcode.config';
import { NotFoundException } from '@nestjs/common';

function setup(orgs: any[], memberships: any[] = [], mt: any = { organizationIdentifierColumn: 'slug' }) {
  const organization = {
    findFirst: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(orgs.find((o) => Object.entries(where).every(([k, v]) => o[k] === v)) ?? null);
    }),
  };
  const userRole = {
    findFirst: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(
        memberships.find((m) => m.userId === where.userId && m.organizationId === where.organizationId) ?? null,
      );
    }),
  };
  const prisma = new PrismaService({ organization, userRole });
  const config = new AgentCodeConfigService(normalizeConfig({ models: {}, multiTenant: mt }));
  return new OrganizationService(prisma, config);
}

describe('OrganizationService', () => {
  it('resolves by slug', async () => {
    const svc = setup([{ id: 1, slug: 'acme' }]);
    const org = await svc.resolve('acme');
    expect(org.slug).toBe('acme');
  });

  it('throws NotFound when org missing', async () => {
    const svc = setup([]);
    await expect(svc.resolve('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws when user not a member', async () => {
    const svc = setup([{ id: 1, slug: 'acme' }], []);
    await expect(svc.resolve('acme', { id: 2 })).rejects.toThrow(NotFoundException);
  });

  it('returns org when user is a member', async () => {
    const svc = setup(
      [{ id: 1, slug: 'acme' }],
      [{ userId: 2, organizationId: 1 }],
    );
    const org = await svc.resolve('acme', { id: 2 });
    expect(org.id).toBe(1);
  });
});
