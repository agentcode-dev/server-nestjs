import 'reflect-metadata';
import {
  AgentCodeModel,
  BelongsToOrganization,
  HasAuditTrail,
  HasUuid,
  HasSoftDeletes,
  ExceptActions,
  HidableColumns,
  getAgentCodeModelMetadata,
} from './index';

describe('model decorators', () => {
  it('@AgentCodeModel registers metadata', () => {
    @AgentCodeModel({ slug: 'posts', model: 'post' })
    class Post {}
    const meta = getAgentCodeModelMetadata(Post);
    expect(meta).toMatchObject({ slug: 'posts', model: 'post' });
  });

  it('decorators compose flags additively', () => {
    @AgentCodeModel({ slug: 'posts', model: 'post' })
    @BelongsToOrganization()
    @HasAuditTrail(['password'])
    @HasUuid()
    @HasSoftDeletes()
    @ExceptActions(['destroy'])
    @HidableColumns(['secret'])
    class Post {}
    const meta = getAgentCodeModelMetadata(Post)!;
    expect(meta.belongsToOrganization).toBe(true);
    expect(meta.hasAuditTrail).toBe(true);
    expect(meta.auditExclude).toEqual(['password']);
    expect(meta.hasUuid).toBe(true);
    expect(meta.softDeletes).toBe(true);
    expect(meta.exceptActions).toEqual(['destroy']);
    expect(meta.additionalHiddenColumns).toEqual(['secret']);
  });
});
