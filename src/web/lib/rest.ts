// Generic REST client + list hook for the simple business tables.
import { useCallback, useEffect, useState } from 'react';

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const rest = {
  get: <T,>(url: string) => req<T>('GET', url),
  create: <T,>(path: string, body: unknown) => req<T>('POST', path, body),
  update: <T,>(path: string, id: number, body: unknown) => req<T>('PATCH', `${path}/${id}`, body),
  remove: (path: string, id: number) => req<{ ok: true }>('DELETE', `${path}/${id}`),
  put: <T,>(url: string, body: unknown) => req<T>('PUT', url, body),
  post: <T,>(url: string, body: unknown) => req<T>('POST', url, body),
};

export function useList<T extends { id: number }>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(() => rest.get<T[]>(path).then((r) => (setItems(r), setLoaded(true))), [path]);
  useEffect(() => void reload(), [reload]);
  return {
    items,
    loaded,
    reload,
    create: async (body: Partial<T>) => {
      const row = await rest.create<T>(path, body);
      setItems((xs) => [row, ...xs]);
      return row;
    },
    update: async (id: number, body: Partial<T>) => {
      const row = await rest.update<T>(path, id, body);
      setItems((xs) => xs.map((x) => (x.id === id ? row : x)));
      return row;
    },
    remove: async (id: number) => {
      await rest.remove(path, id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    },
  };
}

export async function uploadFile(file: File, kind: 'expense' | 'receipt', date?: string | null) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind);
  if (date) fd.append('date', date);
  const res = await fetch('/api/files', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'upload failed');
  return data.path as string;
}

export const fileUrl = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;
export const revealFile = (path: string) => rest.post('/api/files/reveal', { path });
