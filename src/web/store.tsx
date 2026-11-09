// App-wide state: videos, publishing slots, and which card is open.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Slot } from '../shared/constants.ts';
import { api, type Video, type VideoPatch } from './api.ts';

interface Store {
  videos: Video[];
  slots: Slot[];
  loaded: boolean;
  error: string | null;
  openId: number | null;
  open: (id: number | null) => void;
  scriptVideoId: number | null;
  setScriptVideoId: (id: number | null) => void;
  create: (v: VideoPatch & { title: string }) => Promise<Video>;
  update: (id: number, patch: VideoPatch) => Promise<Video>;
  prepare: (id: number) => Promise<Video>;
  remove: (id: number) => Promise<void>;
  saveSlots: (slots: Slot[]) => Promise<void>;
  clearError: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, open] = useState<number | null>(null);
  const [scriptVideoId, setScriptVideoId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.videos(), api.slots()])
      .then(([v, s]) => (setVideos(v), setSlots(s), setLoaded(true)))
      .catch((e: Error) => setError(e.message));
  }, []);

  const replace = useCallback((v: Video) => setVideos((all) => all.map((x) => (x.id === v.id ? v : x))), []);
  const guard = useCallback(async <T,>(p: Promise<T>) => {
    try {
      return await p;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const store: Store = {
    videos,
    slots,
    loaded,
    error,
    openId,
    open,
    scriptVideoId,
    setScriptVideoId,
    clearError: () => setError(null),
    create: async (v) => {
      const row = await guard(api.createVideo(v));
      setVideos((all) => [row, ...all]);
      return row;
    },
    update: async (id, patch) => {
      // Optimistic for snappy drag and drop; the server's answer wins.
      setVideos((all) => all.map((x) => (x.id === id ? ({ ...x, ...patch } as Video) : x)));
      const row = await guard(api.updateVideo(id, patch)).catch(async (e) => {
        setVideos(await api.videos());
        throw e;
      });
      replace(row);
      return row;
    },
    prepare: async (id) => {
      const row = await guard(api.prepare(id));
      replace(row);
      return row;
    },
    remove: async (id) => {
      await guard(api.deleteVideo(id));
      setVideos((all) => all.filter((x) => x.id !== id));
      open(null);
    },
    saveSlots: async (s) => setSlots(await guard(api.saveSlots(s))),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
