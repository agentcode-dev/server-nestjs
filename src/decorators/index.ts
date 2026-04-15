import 'reflect-metadata';
import type { ModelRegistration } from '../interfaces/agentcode-config.interface';

export const AGENTCODE_MODEL_METADATA = Symbol('agentcode:model');

/**
 * Class decorator that tags a resource definition class with its AgentCode
 * model configuration. The metadata is read by the CLI / install helpers and
 * can be merged into `AgentCodeModule.forRoot({models})`.
 *
 * Usage:
 *
 *   @AgentCodeModel({ slug: 'posts', model: 'post', belongsToOrganization: true })
 *   export class PostResource {}
 */
export function AgentCodeModel(config: ModelRegistration & { slug: string }): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as any;
    Reflect.defineMetadata(AGENTCODE_MODEL_METADATA, { ...existing, ...config }, target);
  };
}

export function getAgentCodeModelMetadata(target: any): (ModelRegistration & { slug: string }) | undefined {
  return Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target);
}

/**
 * Marker decorator. Does nothing at runtime — documents intent for generators.
 */
export function BelongsToOrganization(): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as ModelRegistration;
    Reflect.defineMetadata(
      AGENTCODE_MODEL_METADATA,
      { ...existing, belongsToOrganization: true },
      target,
    );
  };
}

export function HasAuditTrail(excludeFields: string[] = []): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as ModelRegistration;
    Reflect.defineMetadata(
      AGENTCODE_MODEL_METADATA,
      { ...existing, hasAuditTrail: true, auditExclude: excludeFields },
      target,
    );
  };
}

export function HasUuid(): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as ModelRegistration;
    Reflect.defineMetadata(AGENTCODE_MODEL_METADATA, { ...existing, hasUuid: true }, target);
  };
}

export function HasSoftDeletes(): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as ModelRegistration;
    Reflect.defineMetadata(AGENTCODE_MODEL_METADATA, { ...existing, softDeletes: true }, target);
  };
}

export function ExceptActions(actions: string[]): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as ModelRegistration;
    Reflect.defineMetadata(
      AGENTCODE_MODEL_METADATA,
      { ...existing, exceptActions: actions },
      target,
    );
  };
}

export function HidableColumns(columns: string[]): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as ModelRegistration;
    Reflect.defineMetadata(
      AGENTCODE_MODEL_METADATA,
      { ...existing, additionalHiddenColumns: columns },
      target,
    );
  };
}

export function PermittedAttrs(config: {
  create?: string[];
  update?: string[];
  show?: string[];
}): ClassDecorator {
  return (target) => {
    const existing = (Reflect.getMetadata(AGENTCODE_MODEL_METADATA, target) ?? {}) as any;
    Reflect.defineMetadata(
      AGENTCODE_MODEL_METADATA,
      { ...existing, permittedAttrs: config },
      target,
    );
  };
}
