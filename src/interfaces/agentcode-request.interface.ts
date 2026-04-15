import type { Request } from 'express';

/**
 * Typed shape of the Express request after AgentCode middleware has run.
 * Internal keys are prefixed `__` to avoid collisions with app data.
 */
export interface AgentCodeRequest<TUser = any, TOrg = any> extends Request {
  user?: TUser;
  organization?: TOrg;
  __routeGroup?: string;
  __skipAuth?: boolean;
  __action?: string;
}
