import { SerializerService } from './serializer.service';
import { ResourcePolicy } from '../policies/resource-policy';
import type { ModelRegistration } from '../interfaces/agentcode-config.interface';

describe('SerializerService', () => {
  let s: SerializerService;
  beforeEach(() => (s = new SerializerService()));

  it('returns null for null record', () => {
    expect(s.serializeOne(null as any, { model: 'x' })).toBeNull();
  });

  it('strips base hidden columns (camel and snake)', () => {
    const record = {
      id: 1,
      name: 'A',
      password: 'secret',
      rememberToken: 'x',
      remember_token: 'x',
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    };
    const reg: ModelRegistration = { model: 'user' };
    const out = s.serializeOne(record, reg);
    expect(out).toEqual({ id: 1, name: 'A' });
  });

  it('strips additionalHiddenColumns', () => {
    const record = { id: 1, name: 'A', secret: 'x' };
    const reg: ModelRegistration = { model: 'user', additionalHiddenColumns: ['secret'] };
    const out = s.serializeOne(record, reg);
    expect(out).toEqual({ id: 1, name: 'A' });
  });

  it('applies policy blacklist via hiddenAttributesForShow', () => {
    class P extends ResourcePolicy {
      hiddenAttributesForShow() {
        return ['internal'];
      }
    }
    const record = { id: 1, name: 'A', internal: 'x' };
    const reg: ModelRegistration = { model: 'post', policy: P };
    const out = s.serializeOne(record, reg);
    expect(out).toEqual({ id: 1, name: 'A' });
  });

  it('applies policy whitelist but always keeps id', () => {
    class P extends ResourcePolicy {
      permittedAttributesForShow() {
        return ['name'];
      }
    }
    const record = { id: 7, name: 'A', internal: 'x' };
    const reg: ModelRegistration = { model: 'post', policy: P };
    const out = s.serializeOne(record, reg);
    expect(out).toEqual({ id: 7, name: 'A' });
  });

  it('merges computed attributes before filtering', () => {
    class P extends ResourcePolicy {
      permittedAttributesForShow() {
        return ['fullName'];
      }
    }
    const reg: ModelRegistration = {
      model: 'user',
      policy: P,
      computedAttributes: (r) => ({ fullName: `${r.first} ${r.last}` }),
    };
    const out = s.serializeOne({ id: 1, first: 'A', last: 'B' }, reg);
    expect(out).toEqual({ id: 1, fullName: 'A B' });
  });

  it('wildcard permitted keeps everything', () => {
    class P extends ResourcePolicy {
      permittedAttributesForShow() {
        return ['*'];
      }
    }
    const reg: ModelRegistration = { model: 'x', policy: P };
    const out = s.serializeOne({ id: 1, a: 1, b: 2 }, reg);
    expect(out).toEqual({ id: 1, a: 1, b: 2 });
  });

  it('serializeMany applies to each record', () => {
    const reg: ModelRegistration = { model: 'x' };
    const out = s.serializeMany(
      [
        { id: 1, password: 'x' },
        { id: 2, password: 'y' },
      ],
      reg,
    );
    expect(out).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('hiddenAttributesForShow applied before permittedAttributesForShow (blacklist wins over whitelist)', () => {
    class P extends ResourcePolicy {
      hiddenAttributesForShow() {
        return ['internal'];
      }
      permittedAttributesForShow() {
        return ['internal', 'name'];
      }
    }
    const reg: ModelRegistration = { model: 'x', policy: P };
    const out = s.serializeOne({ id: 1, name: 'A', internal: 'x' }, reg);
    expect(out).toEqual({ id: 1, name: 'A' });
  });
});
