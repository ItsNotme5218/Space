const dbName = "space-stars-cache";
const storeName = "videos";
const videoKey = "space-stars-prerender";

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(storeName);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const getCachedVideo = async (): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(videoKey);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const setCachedVideo = async (blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(blob, videoKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
};

export const loadOrFetchVideo = async (): Promise<string | null> => {
  const cached = await getCachedVideo();
  if (cached) return URL.createObjectURL(cached);

  try {
    const res = await fetch("/space-stars-prerender.webm");
    if (!res.ok) return null;
    const blob = await res.blob();
    await setCachedVideo(blob);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};
