// Tiny typed parser for untrusted JSON patches, driven by a field spec.
export type FieldSpec =
  | { type: 'text'; max?: number; required?: boolean }
  | { type: 'number'; min?: number; max?: number; required?: boolean }
  | { type: 'int'; min?: number; max?: number }
  | { type: 'date' }
  | { type: 'bool' }
  | { type: 'enum'; values: readonly string[]; required?: boolean }
  | { type: 'ref' } // foreign key id or null
  | { type: 'list'; max?: number }; // array of strings

export type Spec = Record<string, FieldSpec>;

export function parseFields(body: Record<string, unknown>, spec: Spec, creating = false): Record<string, unknown> | string {
  const out: Record<string, unknown> = {};
  for (const [key, f] of Object.entries(spec)) {
    if (!(key in body)) {
      if (creating && 'required' in f && f.required) return `${key}: required`;
      continue;
    }
    const v = body[key];
    const empty = v === null || v === undefined || v === '';
    if (empty) {
      if ('required' in f && f.required) return `${key}: required`;
      out[key] = f.type === 'bool' ? false : f.type === 'list' ? [] : null;
      continue;
    }
    switch (f.type) {
      case 'text':
        out[key] = String(v).slice(0, f.max ?? 10_000);
        break;
      case 'number':
      case 'int': {
        const n = Number(v);
        if (!Number.isFinite(n)) return `${key}: not a number`;
        if (f.min !== undefined && n < f.min) return `${key}: min ${f.min}`;
        if (f.max !== undefined && n > f.max) return `${key}: max ${f.max}`;
        out[key] = f.type === 'int' ? Math.round(n) : n;
        break;
      }
      case 'date': {
        const d = new Date(String(v));
        if (Number.isNaN(d.getTime())) return `${key}: invalid date`;
        out[key] = d;
        break;
      }
      case 'bool':
        out[key] = Boolean(v);
        break;
      case 'enum':
        if (!f.values.includes(String(v))) return `${key}: invalid`;
        out[key] = String(v);
        break;
      case 'list':
        if (!Array.isArray(v)) return `${key}: expected a list`;
        out[key] = v.map((x) => String(x).trim()).filter(Boolean).slice(0, f.max ?? 50);
        break;
      case 'ref': {
        const n = Number(v);
        if (!Number.isInteger(n) || n <= 0) return `${key}: invalid id`;
        out[key] = n;
        break;
      }
    }
  }
  return out;
}
