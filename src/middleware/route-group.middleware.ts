import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AgentCodeConfigService } from '../agentcode.config';

/**
 * Detects which AgentCode route group the current request belongs to
 * (based on URL prefix) and attaches:
 *   - `req.__routeGroup`  — the group name
 *   - `req.__skipAuth`    — true when the group has `skipAuth: true`
 *
 * Install this middleware globally BEFORE `JwtAuthGuard` so the guard can
 * read `req.__skipAuth` and short-circuit.
 */
@Injectable()
export class RouteGroupMiddleware implements NestMiddleware {
  constructor(private readonly config: AgentCodeConfigService) {}

  use(req: Request & Record<string, any>, _res: Response, next: NextFunction) {
    const url = String(req.url ?? '').split('?')[0];
    const groups = this.config.routeGroups();
    let match: { name: string; prefix: string } | null = null;
    for (const [name, group] of Object.entries(groups)) {
      const prefix = group.prefix ?? '';
      if (!prefix) continue;
      if (prefix.startsWith(':')) continue; // dynamic tenant prefix — handled by ResolveOrganizationMiddleware
      if (url.includes(`/${prefix}/`) || url.endsWith(`/${prefix}`)) {
        match = { name, prefix };
        if (group.skipAuth) req.__skipAuth = true;
        break;
      }
    }
    if (match) req.__routeGroup = match.name;
    next();
  }
}
