import { Injectable } from '@nestjs/common';
import type { ModelRegistration } from '../interfaces/agentcode-config.interface';

export const BASE_HIDDEN_COLUMNS = [
  'password',
  'rememberToken',
  'remember_token',
  'hasTemporaryPassword',
  'has_temporary_password',
  'updatedAt',
  'updated_at',
  'createdAt',
  'created_at',
  'deletedAt',
  'deleted_at',
  'emailVerifiedAt',
  'email_verified_at',
];

/**
 * Serializes a record according to the Laravel `asAgentCodeJson` contract:
 *
 * 1. Merge computed attributes
 * 2. Remove base-hidden columns
 * 3. Remove model-level `additionalHiddenColumns`
 * 4. Apply policy blacklist (`hiddenAttributesForShow`)
 * 5. Apply policy whitelist (`permittedAttributesForShow`) — `id` always kept
 */
@Injectable()
export class SerializerService {
  serializeOne(
    record: Record<string, any> | null | undefined,
    reg: ModelRegistration,
    user?: any,
  ): Record<string, any> | null {
    if (!record) return record as any;
    let result = { ...record };

    if (reg.computedAttributes) {
      Object.assign(result, reg.computedAttributes(record, user));
    }

    for (const col of BASE_HIDDEN_COLUMNS) {
      delete (result as any)[col];
    }

    if (reg.additionalHiddenColumns?.length) {
      for (const col of reg.additionalHiddenColumns) delete (result as any)[col];
    }

    if (reg.policy) {
      const policy = new reg.policy();
      const hidden = policy.hiddenAttributesForShow(user) ?? [];
      for (const col of hidden) delete (result as any)[col];

      const permitted = policy.permittedAttributesForShow(user) ?? ['*'];
      if (!(permitted.length === 1 && permitted[0] === '*')) {
        const keep = new Set([...permitted, 'id']);
        result = Object.fromEntries(
          Object.entries(result).filter(([k]) => keep.has(k)),
        ) as any;
      }
    }

    return result;
  }

  serializeMany(records: any[], reg: ModelRegistration, user?: any): any[] {
    return records.map((r) => this.serializeOne(r, reg, user));
  }
}
