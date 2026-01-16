import { ClientData, DropdownData } from "./sheets-api";

const DB_NAME = "wtn_client_tracker_db";
const DB_VERSION = 1;
const CACHE_STORE = "cache";
const CACHE_KEY = "app_cache_v1";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheData {
  clients: ClientData[];
  dropdowns: DropdownData | null;
  lastSyncedAt: number;
  version: string;
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE);
      }
    };
  });
}

// Get cached data
export async function getCachedData(): Promise<CacheData | null> {
  try {
    const database = await initDB();
    
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, "readonly");
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(CACHE_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error("Failed to read cache:", request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

// Set cached data
export async function setCachedData(data: CacheData): Promise<void> {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(CACHE_STORE, "readwrite");
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.put(data, CACHE_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("Failed to write cache:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

// Update clients in cache
export async function setCachedClients(clients: ClientData[]): Promise<void> {
  const cached = await getCachedData();
  await setCachedData({
    clients,
    dropdowns: cached?.dropdowns || null,
    lastSyncedAt: Date.now(),
    version: "v1"
  });
}

// Update dropdowns in cache
export async function setCachedDropdowns(dropdowns: DropdownData): Promise<void> {
  const cached = await getCachedData();
  await setCachedData({
    clients: cached?.clients || [],
    dropdowns,
    lastSyncedAt: Date.now(),
    version: "v1"
  });
}

// Update a single client in cache
export async function updateClientInCache(
  rowNumber: number, 
  updates: Partial<ClientData>
): Promise<void> {
  const cached = await getCachedData();
  if (!cached?.clients) return;

  const updatedClients = cached.clients.map(client => 
    client.rowNumber === rowNumber 
      ? { ...client, ...updates }
      : client
  );

  await setCachedData({
    ...cached,
    clients: updatedClients
  });
}

// Add a new client to cache
export async function addClientToCache(client: ClientData): Promise<void> {
  const cached = await getCachedData();
  const clients = cached?.clients || [];
  
  // Add at the beginning (most recent first)
  await setCachedData({
    ...cached,
    clients: [client, ...clients],
    dropdowns: cached?.dropdowns || null,
    lastSyncedAt: cached?.lastSyncedAt || Date.now(),
    version: "v1"
  });
}

// Check if cache is expired (older than 24 hours)
export async function isCacheExpired(): Promise<boolean> {
  const cached = await getCachedData();
  if (!cached?.lastSyncedAt) return true;
  return Date.now() - cached.lastSyncedAt > CACHE_EXPIRY_MS;
}

// Get cache age in human-readable format
export function getCacheAge(lastSyncedAt: number): string {
  const diffMs = Date.now() - lastSyncedAt;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Clear all cached data
export async function clearCache(): Promise<void> {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(CACHE_STORE, "readwrite");
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.delete(CACHE_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
}

// Dispatch cache update event
export function notifyCacheUpdate(type: 'clients' | 'dropdowns' | 'all', data?: unknown): void {
  window.dispatchEvent(new CustomEvent('cache-updated', { 
    detail: { type, data, timestamp: Date.now() } 
  }));
}
