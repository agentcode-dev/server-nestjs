import { Test } from '@nestjs/testing';
import { AgentCodeModule } from './agentcode.module';
import { AgentCodeConfigService } from './agentcode.config';
import { AGENTCODE_CONFIG } from './constants/tokens';

describe('AgentCodeModule', () => {
  it('forRoot registers the config and services', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentCodeModule.forRoot({
          models: { posts: { model: 'post' } },
        }),
      ],
    }).compile();

    const config = moduleRef.get(AgentCodeConfigService);
    expect(config.hasModel('posts')).toBe(true);
    const raw = moduleRef.get(AGENTCODE_CONFIG);
    expect(raw.nested.maxOperations).toBe(50);
  });

  it('registers CRUD/Auth/Invitation/Nested controllers by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AgentCodeModule.forRoot({ models: { posts: { model: 'post' } } })],
    }).compile();
    // If controllers were registered, NestJS will have instantiated them during compile()
    // and they'll appear in the DI graph.
    const {
      GlobalController,
    } = require('./controllers/global.controller');
    const ctrl = moduleRef.get(GlobalController);
    expect(ctrl).toBeDefined();
  });

  it('registerControllers:false skips controller registration', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentCodeModule.forRoot(
          { models: { posts: { model: 'post' } } },
          { registerControllers: false },
        ),
      ],
    }).compile();
    const { GlobalController } = require('./controllers/global.controller');
    expect(() => moduleRef.get(GlobalController)).toThrow();
  });

  it('injects the prismaClient from forRoot config', async () => {
    const fakePrisma = { $connect: jest.fn(), $disconnect: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentCodeModule.forRoot({
          prismaClient: fakePrisma as any,
          models: { posts: { model: 'post' } },
        }),
      ],
    }).compile();
    const { PrismaService } = require('./prisma/prisma.service');
    const svc = moduleRef.get(PrismaService);
    expect(svc.client).toBe(fakePrisma);
  });

  it('forRootAsync resolves prismaClient and config via useFactory', async () => {
    const fakePrisma = { $connect: jest.fn(), $disconnect: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentCodeModule.forRootAsync({
          useFactory: async () => ({
            prismaClient: fakePrisma as any,
            models: { posts: { model: 'post' } },
          }),
        }),
      ],
    }).compile();
    const { PrismaService } = require('./prisma/prisma.service');
    const svc = moduleRef.get(PrismaService);
    expect(svc.client).toBe(fakePrisma);
  });

  it('no-static-state: two instances do not cross-pollute', async () => {
    const p1 = { $connect: jest.fn(), $disconnect: jest.fn(), tag: 'one' };
    const p2 = { $connect: jest.fn(), $disconnect: jest.fn(), tag: 'two' };
    const [m1, m2] = await Promise.all([
      Test.createTestingModule({
        imports: [AgentCodeModule.forRoot({ prismaClient: p1 as any, models: {} })],
      }).compile(),
      Test.createTestingModule({
        imports: [AgentCodeModule.forRoot({ prismaClient: p2 as any, models: {} })],
      }).compile(),
    ]);
    const { PrismaService } = require('./prisma/prisma.service');
    expect((m1.get(PrismaService).client as any).tag).toBe('one');
    expect((m2.get(PrismaService).client as any).tag).toBe('two');
  });

  it('forRootAsync resolves the config through a factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AgentCodeModule.forRootAsync({
          useFactory: async () => ({
            models: { comments: { model: 'comment' } },
          }),
        }),
      ],
    }).compile();

    const config = moduleRef.get(AgentCodeConfigService);
    expect(config.hasModel('comments')).toBe(true);
  });
});
