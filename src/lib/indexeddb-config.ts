// Shared IndexedDB configuration for the entire app
// This ensures cache-manager and sync-queue use the same database version

export const DB_NAME = "wtn_client_tracker_db";
export const DB_VERSION = 3; // Unified version - increment if schema changes

// Object store names
export const CACHE_STORE = "cache";
export const SYNC_QUEUE_STORE = "sync_queue";

// Cache key
export const CACHE_KEY = "app_cache_v1";

// Cache expiry (24 hours)
export const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Delete the local IndexedDB database completely.
 * Useful for recovery from corrupted state.
 */
export function deleteLocalDatabase(): Promise<void> {
  try {
    dbInstance?.close();
  } catch {
    // ignore
  }
  dbInstance = null;
  dbPromise = null;

  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Open the shared IndexedDB database.
 * Creates both cache and sync_queue object stores.
 * Includes self-healing: if version mismatch or missing stores, deletes and recreates.
 */
function openDatabaseInternal(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      const database = request.result;

      // Verify both stores exist
      const hasCache = database.objectStoreNames.contains(CACHE_STORE);
      const hasQueue = database.objectStoreNames.contains(SYNC_QUEUE_STORE);

      if (!hasCache || !hasQueue) {
        database.close();
        reject(new Error(`IndexedDB missing stores: cache=${hasCache}, queue=${hasQueue}`));
        return;
      }

      resolve(database);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create cache store if missing
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE);
      }

      // Create sync queue store if missing
      if (!database.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        database.createObjectStore(SYNC_QUEUE_STORE, { keyPath: "id" });
      }
    };
  });
}

/**
 * Get the shared database instance.
 * Uses singleton pattern with automatic recovery.
 */
export async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  // Deduplicate concurrent calls
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      dbInstance = await openDatabaseInternal();
      return dbInstance;
    } catch (error) {
      console.warn("IndexedDB init failed, resetting local cache DB:", error);
      await deleteLocalDatabase();
      dbInstance = await openDatabaseInternal();
      return dbInstance;
    } finally {
      dbPromise = null;
    }
  })();

  return dbPromise;
}

/**
 * Force reset the database - useful for user-triggered recovery
 */
export async function forceResetDatabase(): Promise<void> {
  await deleteLocalDatabase();
  dbInstance = await openDatabaseInternal();
}
