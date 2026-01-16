import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "wtn_client_tracker_db";
const DB_VERSION = 1;
const QUEUE_STORE = "sync_queue";

export type OperationType = 
  | 'addClient' 
  | 'updateClient' 
  | 'updateStatus' 
  | 'updateHandler' 
  | 'logCall' 
  | 'updateMindset' 
  | 'updateQuotation' 
  | 'updateBargaining'
  | 'addOldClient';

export interface PendingOperation {
  id: string;
  type: OperationType;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

let db: IDBDatabase | null = null;
let isProcessing = false;
let onlineListener: (() => void) | null = null;

// Initialize IndexedDB for sync queue
async function initQueueDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB for queue:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        database.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
  });
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add operation to sync queue
export async function addToQueue(
  type: OperationType, 
  data: Record<string, unknown>
): Promise<void> {
  try {
    const database = await initQueueDB();
    const operation: PendingOperation = {
      id: generateId(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(QUEUE_STORE, "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add(operation);

      request.onsuccess = () => {
        console.log(`Added to sync queue: ${type}`);
        notifyQueueChange();
        resolve();
      };

      request.onerror = () => {
        console.error("Failed to add to queue:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Queue add error:", error);
  }
}

// Get all pending operations
export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const database = await initQueueDB();
    
    return new Promise((resolve) => {
      const transaction = database.transaction(QUEUE_STORE, "readonly");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const operations = request.result || [];
        // Sort by timestamp (oldest first)
        operations.sort((a, b) => a.timestamp - b.timestamp);
        resolve(operations);
      };

      request.onerror = () => {
        console.error("Failed to get queue:", request.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error("Queue read error:", error);
    return [];
  }
}

// Get queue length
export async function getQueueLength(): Promise<number> {
  const operations = await getPendingOperations();
  return operations.length;
}

// Remove operation from queue
async function removeFromQueue(id: string): Promise<void> {
  try {
    const database = await initQueueDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(QUEUE_STORE, "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        notifyQueueChange();
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Queue remove error:", error);
  }
}

// Update operation retry count
async function updateRetryCount(operation: PendingOperation): Promise<void> {
  try {
    const database = await initQueueDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(QUEUE_STORE, "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.put({ ...operation, retries: operation.retries + 1 });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Queue update error:", error);
  }
}

// Map operation types to API actions
function mapTypeToAction(type: OperationType): string {
  const actionMap: Record<OperationType, string> = {
    'addClient': 'addClient',
    'updateClient': 'updateClient',
    'updateStatus': 'updateClientStatus',
    'updateHandler': 'updateClientHandler',
    'logCall': 'logCallAttempt',
    'updateMindset': 'updateClientMindset',
    'updateQuotation': 'updateClientQuotation',
    'updateBargaining': 'updateBargainingRates',
    'addOldClient': 'addOldClient',
  };
  return actionMap[type] || type;
}

// Execute a single operation
async function executeOperation(operation: PendingOperation): Promise<boolean> {
  const { type, data } = operation;
  
  try {
    const action = mapTypeToAction(type);

    const { data: result, error } = await supabase.functions.invoke("google-sheets", {
      body: { action, ...data },
    });

    if (error) {
      console.error(`Sync failed for ${type}:`, error);
      return false;
    }

    if (!result.success) {
      console.error(`Sync failed for ${type}:`, result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error executing ${type}:`, error);
    return false;
  }
}

// Process all pending operations
export async function processQueue(): Promise<void> {
  if (isProcessing || !navigator.onLine) return;
  
  isProcessing = true;
  notifySyncStatus(true);
  
  try {
    const operations = await getPendingOperations();
    
    for (const operation of operations) {
      if (!navigator.onLine) break;
      
      // Skip if too many retries (max 5)
      if (operation.retries >= 5) {
        console.warn(`Removing failed operation after 5 retries: ${operation.type}`);
        await removeFromQueue(operation.id);
        continue;
      }
      
      const success = await executeOperation(operation);
      
      if (success) {
        await removeFromQueue(operation.id);
      } else {
        await updateRetryCount(operation);
      }
    }
  } catch (error) {
    console.error("Queue processing error:", error);
  } finally {
    isProcessing = false;
    notifySyncStatus(false);
  }
}

// Try to sync a single operation immediately if online
export async function tryImmediateSync(
  type: OperationType, 
  data: Record<string, unknown>
): Promise<boolean> {
  if (!navigator.onLine) {
    // Queue for later
    await addToQueue(type, data);
    return false;
  }
  
  // Try immediate sync
  const operation: PendingOperation = {
    id: generateId(),
    type,
    data,
    timestamp: Date.now(),
    retries: 0
  };
  
  const success = await executeOperation(operation);
  
  if (!success) {
    // Failed - add to queue for retry
    await addToQueue(type, data);
  }
  
  return success;
}

// Setup online/offline listeners
export function setupOnlineListener(): void {
  if (onlineListener) return;
  
  onlineListener = async () => {
    console.log('Back online - processing sync queue');
    await processQueue();
  };
  
  window.addEventListener('online', onlineListener);
  
  window.addEventListener('offline', () => {
    console.log('Went offline - operations will be queued');
  });
  
  // Process any pending operations on startup
  if (navigator.onLine) {
    setTimeout(() => processQueue(), 1000);
  }
}

// Clear all pending operations
export async function clearQueue(): Promise<void> {
  try {
    const database = await initQueueDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(QUEUE_STORE, "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        notifyQueueChange();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear queue:", error);
  }
}

// Notify queue change
function notifyQueueChange(): void {
  getQueueLength().then(length => {
    window.dispatchEvent(new CustomEvent('queue-changed', { 
      detail: { pendingCount: length } 
    }));
  });
}

// Notify sync status
function notifySyncStatus(isSyncing: boolean): void {
  window.dispatchEvent(new CustomEvent('sync-status', { 
    detail: { isSyncing } 
  }));
}
