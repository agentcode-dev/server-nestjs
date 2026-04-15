import { HttpException } from '@nestjs/common';

export type AgentCodeErrorCode =
  | 'VALIDATION_FAILED'
  | 'FORBIDDEN_FIELDS'
  | 'CROSS_TENANT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ACTION_DISABLED'
  | 'UNKNOWN_RESOURCE'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_USED'
  | 'INVITATION_INVALID_ROLE'
  | 'NESTED_OPERATION_FAILED'
  | 'INCLUDE_NOT_AUTHORIZED';

export interface AgentCodeErrorBody {
  code: AgentCodeErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * Single exception shape surfaced by the library. Frontends can rely on the
 * `{ code, message, details }` envelope regardless of HTTP status.
 */
export class AgentCodeException extends HttpException {
  readonly code: AgentCodeErrorCode;

  constructor(code: AgentCodeErrorCode, message: string, status: number, details?: Record<string, any>) {
    const body: AgentCodeErrorBody = { code, message, ...(details ? { details } : {}) };
    super(body, status);
    this.code = code;
  }

  static validationFailed(errors: Record<string, string[]>): AgentCodeException {
    return new AgentCodeException('VALIDATION_FAILED', 'Validation failed', 422, { errors });
  }

  static forbiddenFields(fields: string[]): AgentCodeException {
    return new AgentCodeException('FORBIDDEN_FIELDS', 'Request contains fields not allowed for your role', 403, {
      fields,
    });
  }

  static crossTenant(errors: Record<string, string[]>): AgentCodeException {
    return new AgentCodeException('CROSS_TENANT', 'Referenced record not in current organization', 422, { errors });
  }

  static unauthorized(message = 'Unauthorized'): AgentCodeException {
    return new AgentCodeException('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'This action is unauthorized.'): AgentCodeException {
    return new AgentCodeException('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Not found'): AgentCodeException {
    return new AgentCodeException('NOT_FOUND', message, 404);
  }

  static actionDisabled(action: string): AgentCodeException {
    return new AgentCodeException('ACTION_DISABLED', 'Action not available', 404, { action });
  }

  static unknownResource(slug: string): AgentCodeException {
    return new AgentCodeException('UNKNOWN_RESOURCE', `Unknown resource: ${slug}`, 404, { slug });
  }

  static includeNotAuthorized(slug: string): AgentCodeException {
    return new AgentCodeException('INCLUDE_NOT_AUTHORIZED', `Include not authorized: ${slug}`, 403, { slug });
  }
}
