import { ClientData, BookedClientData, DropdownData } from "@/lib/sheets-api";

// In-memory singleton cache for instant module switching (0ms reads)
let memoryClients: ClientData[] | null = null;
let memoryBookedClients: BookedClientData[] | null = null;
let memoryDropdowns: DropdownData | null = null;

export function getMemoryClients(): ClientData[] | null {
  return memoryClients;
}

export function setMemoryClients(clients: ClientData[]): void {
  memoryClients = clients;
}

export function getMemoryBookedClients(): BookedClientData[] | null {
  return memoryBookedClients;
}

export function setMemoryBookedClients(clients: BookedClientData[]): void {
  memoryBookedClients = clients;
}

export function getMemoryDropdowns(): DropdownData | null {
  return memoryDropdowns;
}

export function setMemoryDropdowns(dropdowns: DropdownData): void {
  memoryDropdowns = dropdowns;
}

export function isMemoryLoaded(): boolean {
  return memoryClients !== null && memoryClients.length > 0;
}

export function isBookedMemoryLoaded(): boolean {
  return memoryBookedClients !== null && memoryBookedClients.length > 0;
}

export function updateMemoryClient(updatedClient: ClientData): void {
  if (!memoryClients) return;
  memoryClients = memoryClients.map(c => {
    if (updatedClient.registeredDateTimeAD && c.registeredDateTimeAD === updatedClient.registeredDateTimeAD) {
      return { ...c, ...updatedClient };
    }
    if (c.rowNumber === updatedClient.rowNumber && !updatedClient.registeredDateTimeAD) {
      return { ...c, ...updatedClient };
    }
    return c;
  });
}
