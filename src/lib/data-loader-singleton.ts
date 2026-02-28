import { ClientData, BookedClientData } from "@/lib/sheets-api";
import {
  loadClientsFromCache,
  loadBookedClientsFromCache,
} from "@/lib/clients-supabase-cache";
import {
  getMemoryClients,
  setMemoryClients,
  getMemoryBookedClients,
  setMemoryBookedClients,
  isMemoryLoaded,
  isBookedMemoryLoaded,
} from "@/lib/memory-cache";

// Singleton promises — only one in-flight fetch per data type
let clientsPromise: Promise<ClientData[]> | null = null;
let bookedPromise: Promise<BookedClientData[]> | null = null;

export function loadAllClients(): Promise<ClientData[]> {
  if (isMemoryLoaded()) return Promise.resolve(getMemoryClients()!);
  if (clientsPromise) return clientsPromise;

  clientsPromise = loadClientsFromCache()
    .then((clients) => {
      setMemoryClients(clients);
      clientsPromise = null;
      return clients;
    })
    .catch((err) => {
      clientsPromise = null;
      throw err;
    });

  return clientsPromise;
}

export function loadAllBookedClients(): Promise<BookedClientData[]> {
  if (isBookedMemoryLoaded()) return Promise.resolve(getMemoryBookedClients()!);
  if (bookedPromise) return bookedPromise;

  bookedPromise = loadBookedClientsFromCache()
    .then((clients) => {
      setMemoryBookedClients(clients);
      bookedPromise = null;
      return clients;
    })
    .catch((err) => {
      bookedPromise = null;
      throw err;
    });

  return bookedPromise;
}

export function resetLoaderPromises(): void {
  clientsPromise = null;
  bookedPromise = null;
}
