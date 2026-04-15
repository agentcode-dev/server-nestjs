import type { Blueprint, BlueprintColumn } from '../blueprint-parser';

// ---------------------------------------------------------------------------
// Prisma type mapping
// ---------------------------------------------------------------------------

const TYPE_MAP: Record<string, string> = {
  string: 'String',
  text: 'String',
  integer: 'Int',
  bigInteger: 'BigInt',
  boolean: 'Boolean',
  date: 'DateTime',
  datetime: 'DateTime',
  timestamp: 'DateTime',
  decimal: 'Decimal',
  float: 'Float',
  json: 'Json',
  uuid: 'String',
  foreignId: 'Int',
  // enum: handled specially
};

// ---------------------------------------------------------------------------
// PrismaSchemaGenerator
// ---------------------------------------------------------------------------

/**
 * Generates a Prisma `model` block from a Blueprint.
 *
 * The output is intended to be **appended** to an existing `prisma/schema.prisma`
 * file — it does not include the datasource/generator header.
 *
 * Design decisions:
 *  - `enum` columns generate a Prisma enum declaration + reference.
 *  - `belongsTo` relationships add an explicit FK field + @relation.
 *  - Timestamps (createdAt / updatedAt) are always included.
 *  - `deletedAt` is added when `soft_deletes: true`.
 *  - `organizationId` FK is added when `belongs_to_organization: true`.
 */
export class PrismaSchemaGenerator {
  generate(blueprint: Blueprint): string {
    const parts: string[] = [];

    // Emit enum declarations first (referenced below in the model block)
    for (const col of blueprint.columns) {
      if (col.type === 'enum' && col.values?.length) {
        parts.push(this.generateEnum(blueprint.model, col));
      }
    }

    parts.push(this.generateModelBlock(blueprint));

    return parts.join('\n\n');
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private generateEnum(modelName: string, col: BlueprintColumn): string {
    const enumName = `${modelName}${this.pascalCase(col.name)}`;
    const values = (col.values ?? []).map((v) => `  ${v.toUpperCase()}`).join('\n');
    return `enum ${enumName} {\n${values}\n}`;
  }

  private generateModelBlock(blueprint: Blueprint): string {
    const lines: string[] = [];

    // -- id ------------------------------------------------------------------
    lines.push('  id        Int      @id @default(autoincrement())');

    // -- organizationId FK ---------------------------------------------------
    if (blueprint.options.belongs_to_organization) {
      lines.push('  organizationId Int');
      lines.push('  organization   Organization @relation(fields: [organizationId], references: [id])');
    }

    // -- user-defined columns ------------------------------------------------
    for (const col of blueprint.columns) {
      lines.push(this.generateField(blueprint.model, col));
    }

    // -- belongsTo relationships (FK + relation fields) ---------------------
    for (const rel of blueprint.relationships) {
      if (rel.type === 'belongsTo') {
        const fkField = `${rel.name}Id`;
        lines.push(`  ${fkField.padEnd(9)} Int`);
        lines.push(
          `  ${rel.name.padEnd(9)} ${rel.model} @relation(fields: [${fkField}], references: [id])`,
        );
      } else if (rel.type === 'hasMany') {
        lines.push(`  ${rel.name.padEnd(9)} ${rel.model}[]`);
      } else if (rel.type === 'hasOne') {
        lines.push(`  ${rel.name.padEnd(9)} ${rel.model}?`);
      }
      // belongsToMany: join table — out of scope for auto-generation
    }

    // -- timestamps ----------------------------------------------------------
    lines.push('  createdAt DateTime @default(now())');
    lines.push('  updatedAt DateTime @updatedAt');

    if (blueprint.options.soft_deletes) {
      lines.push('  deletedAt DateTime?');
    }

    // -- @@map ---------------------------------------------------------------
    lines.push('');
    lines.push(`  @@map("${blueprint.table}")`);

    return `model ${blueprint.model} {\n${lines.join('\n')}\n}`;
  }

  private generateField(modelName: string, col: BlueprintColumn): string {
    let prismaType: string;
    let modifiers = '';

    if (col.type === 'enum') {
      prismaType = `${modelName}${this.pascalCase(col.name)}`;
    } else {
      prismaType = TYPE_MAP[col.type] ?? 'String';
    }

    if (col.nullable) prismaType += '?';

    // @default
    if (col.default !== null && col.default !== undefined) {
      if (col.type === 'boolean') {
        modifiers += ` @default(${col.default})`;
      } else if (col.type === 'enum') {
        modifiers += ` @default(${String(col.default).toUpperCase()})`;
      } else if (typeof col.default === 'string') {
        modifiers += ` @default("${col.default}")`;
      } else {
        modifiers += ` @default(${col.default})`;
      }
    }

    // @unique
    if (col.unique) modifiers += ' @unique';

    // Map snake_case field names to camelCase Prisma fields when needed.
    // (For simplicity we keep the field name as-is since the blueprint uses snake_case
    // and Prisma will map via @@map at the table level.)

    const paddedName = col.name.padEnd(12);
    const paddedType = prismaType.padEnd(10);

    return `  ${paddedName} ${paddedType}${modifiers}`;
  }

  private pascalCase(str: string): string {
    return str
      .split(/[_\s-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }
}
