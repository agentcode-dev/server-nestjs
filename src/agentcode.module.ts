import {
  DynamicModule,
  Global,
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
  RequestMethod,
  Type,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AgentCodeConfigService, normalizeConfig } from './agentcode.config';
import {
  AGENTCODE_CONFIG,
  AGENTCODE_MODULE_OPTIONS,
  AGENTCODE_PRISMA_CLIENT,
} from './constants/tokens';
import type {
  AgentCodeConfig,
  AgentCodeModuleAsyncOptions,
} from './interfaces/agentcode-config.interface';
import { PrismaService } from './prisma/prisma.service';
import { ResourceService } from './services/resource.service';
import { QueryBuilderService } from './services/query-builder.service';
import { SerializerService } from './services/serializer.service';
import { ValidationService } from './services/validation.service';
import { OrganizationService } from './services/organization.service';
import { AuditService } from './services/audit.service';
import { NestedService } from './services/nested.service';
import { ScopeService } from './services/scope.service';
import { AuthService } from './services/auth.service';
import { InvitationService } from './services/invitation.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResourcePolicyGuard } from './guards/resource-policy.guard';
import { GlobalController } from './controllers/global.controller';
import { AuthController } from './controllers/auth.controller';
import { InvitationController } from './controllers/invitation.controller';
import { NestedController } from './controllers/nested.controller';
import { RouteGroupMiddleware } from './middleware/route-group.middleware';
import { ResolveOrganizationMiddleware } from './middleware/resolve-organization.middleware';

const ACTION_TO_METHOD: Record<string, RequestMethod> = {
  index: RequestMethod.GET,
  show: RequestMethod.GET,
  store: RequestMethod.POST,
  update: RequestMethod.PUT,
  destroy: RequestMethod.DELETE,
  trashed: RequestMethod.GET,
  restore: RequestMethod.POST,
  forceDelete: RequestMethod.DELETE,
};

function actionPath(slug: string, action: string): string {
  switch (action) {
    case 'index':
    case 'store':
      return slug;
    case 'trashed':
      return `${slug}/trashed`;
    case 'show':
    case 'update':
    case 'destroy':
      return `${slug}/:id`;
    case 'restore':
      return `${slug}/:id/restore`;
    case 'forceDelete':
      return `${slug}/:id/force-delete`;
    default:
      return slug;
  }
}

export interface AgentCodeModuleOptions {
  /** Register the library's controllers automatically. Default true. */
  registerControllers?: boolean;
  /** Install JwtAuthGuard globally as APP_GUARD. Default false (opt-in). */
  autoAuthGuard?: boolean;
  /** Install ResourcePolicyGuard globally as APP_GUARD. Default false (opt-in). */
  autoPolicyGuard?: boolean;
  /** Install RouteGroupMiddleware globally. Default true. */
  autoRouteGroupMiddleware?: boolean;
  /** Wire per-model `middleware` / `actionMiddleware` via NestModule.configure. Default true. */
  autoModelMiddleware?: boolean;
  /** Wire ResolveOrganizationMiddleware for all routes when multiTenant enabled. Default true. */
  autoTenantMiddleware?: boolean;
}

/**
 * AgentCode NestJS dynamic module.
 *
 * Example (synchronous):
 *
 *   AgentCodeModule.forRoot({
 *     prismaClient: new PrismaClient(),
 *     models: {
 *       posts: { model: 'post', policy: PostPolicy, belongsToOrganization: true },
 *     },
 *   });
 *
 * Example (async — reading from a ConfigService):
 *
 *   AgentCodeModule.forRootAsync({
 *     imports: [ConfigModule],
 *     inject: [ConfigService, PrismaService],
 *     middleware: [MyRateLimitMw],      // <-- list middleware classes here
 *     useFactory: (cfg, prisma) => ({
 *       prismaClient: prisma,
 *       models: { ... },
 *     }),
 *   });
 */
@Global()
@Module({})
export class AgentCodeModule implements NestModule {
  constructor(
    @Inject(AGENTCODE_CONFIG) private readonly config: AgentCodeConfig,
    @Inject(AGENTCODE_MODULE_OPTIONS) private readonly options: AgentCodeModuleOptions,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    const opts = this.options ?? {};
    const cfg = this.config;
    if (!cfg) return;

    if (opts.autoRouteGroupMiddleware !== false) {
      consumer.apply(RouteGroupMiddleware).forRoutes('*');
    }

    if (opts.autoModelMiddleware !== false) {
      for (const [slug, reg] of Object.entries(cfg.models ?? {})) {
        const baseMw = (reg.middleware ?? []) as Type<any>[];
        if (baseMw.length > 0) {
          consumer.apply(...baseMw).forRoutes(
            { path: slug, method: RequestMethod.ALL },
            { path: `${slug}/*`, method: RequestMethod.ALL },
          );
        }
        for (const [action, mwList] of Object.entries(reg.actionMiddleware ?? {})) {
          const list = (mwList ?? []) as Type<any>[];
          if (list.length === 0) continue;
          const method = ACTION_TO_METHOD[action] ?? RequestMethod.ALL;
          consumer.apply(...list).forRoutes({ path: actionPath(slug, action), method });
        }
      }
    }

    if (
      opts.autoTenantMiddleware !== false &&
      (cfg.multiTenant?.organizationIdentifierColumn || cfg.multiTenant?.enabled)
    ) {
      consumer.apply(ResolveOrganizationMiddleware).forRoutes('*');
    }
  }

  /**
   * Synchronous registration. All middleware classes are collected from the
   * passed config at build time, so no extra `middleware` option is needed.
   */
  static forRoot(
    config: AgentCodeConfig,
    options: AgentCodeModuleOptions = {},
  ): DynamicModule {
    const normalized = normalizeConfig(config);
    const middlewareFromConfig = AgentCodeModule.collectModelMiddleware(normalized);
    return AgentCodeModule.build({
      configProviders: [
        { provide: AGENTCODE_CONFIG, useValue: normalized },
        {
          provide: AGENTCODE_PRISMA_CLIENT,
          useValue: normalized.prismaClient ?? null,
        },
      ],
      imports: [],
      options,
      middlewareClasses: middlewareFromConfig,
    });
  }

  /**
   * Asynchronous registration. Middleware classes referenced by models must
   * be declared via `options.middleware` because NestJS providers cannot be
   * resolved from an async useFactory.
   */
  static forRootAsync(
    options: AgentCodeModuleAsyncOptions & AgentCodeModuleOptions,
  ): DynamicModule {
    const configProvider: Provider = {
      provide: AGENTCODE_CONFIG,
      useFactory: async (...args: any[]) => normalizeConfig(await options.useFactory(...args)),
      inject: options.inject ?? [],
    };
    const prismaProvider: Provider = {
      provide: AGENTCODE_PRISMA_CLIENT,
      useFactory: (cfg: AgentCodeConfig) => cfg.prismaClient ?? null,
      inject: [AGENTCODE_CONFIG],
    };
    return AgentCodeModule.build({
      configProviders: [configProvider, prismaProvider],
      imports: options.imports ?? [],
      options,
      middlewareClasses: (options.middleware ?? []) as Type<any>[],
    });
  }

  private static build(args: {
    configProviders: Provider[];
    imports: any[];
    options: AgentCodeModuleOptions;
    middlewareClasses: Type<any>[];
  }): DynamicModule {
    const opts = args.options;
    const guardProviders: Provider[] = [];
    if (opts.autoAuthGuard) guardProviders.push({ provide: APP_GUARD, useClass: JwtAuthGuard });
    if (opts.autoPolicyGuard) guardProviders.push({ provide: APP_GUARD, useClass: ResourcePolicyGuard });

    return {
      module: AgentCodeModule,
      imports: args.imports,
      controllers: opts.registerControllers !== false
        ? [GlobalController, AuthController, InvitationController, NestedController]
        : [],
      providers: [
        ...args.configProviders,
        { provide: AGENTCODE_MODULE_OPTIONS, useValue: opts },
        ...AgentCodeModule.coreProviders(),
        JwtAuthGuard,
        ResourcePolicyGuard,
        RouteGroupMiddleware,
        ResolveOrganizationMiddleware,
        ...dedupeTypes(args.middlewareClasses),
        ...guardProviders,
      ],
      exports: AgentCodeModule.coreExports(),
    };
  }

  private static collectModelMiddleware(config: AgentCodeConfig): Type<any>[] {
    const set = new Set<Type<any>>();
    for (const reg of Object.values(config.models ?? {})) {
      for (const mw of (reg.middleware ?? []) as Type<any>[]) set.add(mw);
      for (const mws of Object.values(reg.actionMiddleware ?? {})) {
        for (const mw of (mws ?? []) as Type<any>[]) set.add(mw);
      }
    }
    return Array.from(set);
  }

  private static coreProviders(): Provider[] {
    return [
      AgentCodeConfigService,
      PrismaService,
      ResourceService,
      QueryBuilderService,
      SerializerService,
      ValidationService,
      OrganizationService,
      AuditService,
      NestedService,
      ScopeService,
      AuthService,
      InvitationService,
    ];
  }

  private static coreExports() {
    return [
      // Injection tokens (BP-010 — surfaced for consumer middleware/services)
      AGENTCODE_CONFIG,
      AGENTCODE_PRISMA_CLIENT,
      AGENTCODE_MODULE_OPTIONS,
      AgentCodeConfigService,
      PrismaService,
      ResourceService,
      QueryBuilderService,
      SerializerService,
      ValidationService,
      OrganizationService,
      AuditService,
      NestedService,
      ScopeService,
      AuthService,
      InvitationService,
      JwtAuthGuard,
      ResourcePolicyGuard,
    ];
  }
}

function dedupeTypes(list: Type<any>[]): Type<any>[] {
  const seen = new Set<any>();
  const out: Type<any>[] = [];
  for (const t of list) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
