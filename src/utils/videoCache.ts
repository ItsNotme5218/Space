const DB_NAME = "space-stars-cache";
const STORE_NAME = "videos";
const VIDEO_KEY = "space-stars-prerender";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedVideo(): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(VIDEO_KEY);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedVideo(blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, VIDEO_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silently fail — video cache is optional
  }
}

export async function loadOrFetchVideo(): Promise<string | null> {
  // Check IndexedDB cache first
  const cached = await getCachedVideo();
  if (cached) return URL.createObjectURL(cached);

  // Fetch from public
  try {
    const res = await fetch("/space-stars-prerender.webm");
    if (!res.ok) return null;
    const blob = await res.blob();
    await setCachedVideo(blob);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
