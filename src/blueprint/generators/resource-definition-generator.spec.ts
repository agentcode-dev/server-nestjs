import { ResourceDefinitionGenerator } from './resource-definition-generator';
import type { Blueprint } from '../blueprint-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  return {
    model: 'Post',
    slug: 'posts',
    table: 'posts',
    source_file: 'post.yaml',
    options: {
      belongs_to_organization: true,
      soft_deletes: true,
      audit_trail: true,
      has_uuid: false,
      owner: null,
      except_actions: [],
      pagination: false,
      per_page: 25,
    },
    columns: [
      {
        name: 'title',
        type: 'string',
        nullable: false,
        unique: false,
        index: false,
        default: null,
        filterable: true,
        sortable: true,
        searchable: true,
        precision: null,
        scale: null,
        foreignModel: null,
      },
      {
        name: 'content',
        type: 'text',
        nullable: true,
        unique: false,
        index: false,
        default: null,
        filterable: false,
        sortable: false,
        searchable: false,
        precision: null,
        scale: null,
        foreignModel: null,
      },
      {
        name: 'status',
        type: 'enum',
        values: ['draft', 'published'],
        nullable: false,
        unique: false,
        index: false,
        default: null,
        filterable: true,
        sortable: false,
        searchable: false,
        precision: null,
        scale: null,
        foreignModel: null,
      },
    ],
    relationships: [],
    permissions: {
      admin: {
        actions: ['index', 'show', 'store', 'update', 'destroy'],
        show_fields: ['*'],
        create_fields: { title: 'required', content: 'nullable', status: 'nullable' },
        update_fields: { title: 'sometimes', content: 'nullable' },
        hidden_fields: [],
      },
      viewer: {
        actions: ['index', 'show'],
        show_fields: ['id', 'title', 'content', 'status'],
        create_fields: {},
        update_fields: {},
        hidden_fields: [],
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ResourceDefinitionGenerator
// ---------------------------------------------------------------------------

describe('ResourceDefinitionGenerator', () => {
  const gen = new ResourceDefinitionGenerator();

  it('generates a valid TypeScript file with imports', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain("import { z } from 'zod'");
    expect(output).toContain('ModelRegistration');
    expect(output).toContain('PostPolicy');
  });

  it('exports a named ModelRegistration constant', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('postsRegistration');
    expect(output).toContain('ModelRegistration');
  });

  it('sets belongsToOrganization, softDeletes, hasAuditTrail flags', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('belongsToOrganization: true');
    expect(output).toContain('softDeletes: true');
    expect(output).toContain('hasAuditTrail: true');
  });

  it('includes allowedFilters from filterable columns', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('allowedFilters');
    expect(output).toContain('"title"');
    expect(output).toContain('"status"');
  });

  it('includes allowedSorts from sortable columns', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('allowedSorts');
    expect(output).toContain('"title"');
  });

  it('includes allowedSearch from searchable columns', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('allowedSearch');
    expect(output).toContain('"title"');
  });

  it('generates validationStore with role-keyed zod schemas', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('validationStore');
    expect(output).toContain('admin:');
    expect(output).toContain('viewer:');
    expect(output).toContain('z.object(');
  });

  it('generates required fields as z.string() (no .optional())', () => {
    const output = gen.generate(makeBlueprint());
    // title: required → z.string() without optional
    expect(output).toMatch(/title:\s*z\.string\(\)/);
  });

  it('generates nullable fields with .nullable().optional()', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain('.nullable().optional()');
  });

  it('generates sometimes fields with .optional()', () => {
    const output = gen.generate(makeBlueprint());
    // title: sometimes in update_fields
    expect(output).toContain('.optional()');
  });

  it('uses passthrough schema for wildcard create_fields', () => {
    const bp = makeBlueprint({
      permissions: {
        admin: {
          actions: ['store'],
          show_fields: ['*'],
          create_fields: ['*'],
          update_fields: ['*'],
          hidden_fields: [],
        },
      },
    });
    const output = gen.generate(bp);
    expect(output).toContain('passthrough()');
  });

  it('generates enum zod type for enum columns', () => {
    const output = gen.generate(makeBlueprint());
    expect(output).toContain("z.enum(['draft', 'published'])");
  });

  it('omits allowedFilters when no columns are filterable', () => {
    const bp = makeBlueprint({
      columns: [
        {
          name: 'name',
          type: 'string',
          nullable: false,
          unique: false,
          index: false,
          default: null,
          filterable: false,
          sortable: false,
          searchable: false,
          precision: null,
          scale: null,
          foreignModel: null,
        },
      ],
    });
    const output = gen.generate(bp);
    expect(output).not.toContain('allowedFilters');
  });
});
