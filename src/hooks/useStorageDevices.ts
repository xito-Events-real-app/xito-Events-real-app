import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  StorageDevice,
  getStorageDevices,
  addStorageDevice,
  updateStorageDevice,
  deleteStorageDevice,
} from "@/lib/files-api";
import { scheduleStoragePush } from "@/lib/files-push-scheduler";
import { toast } from "@/hooks/use-toast";

export function useStorageDevices() {
  const [devices, setDevices] = useState<StorageDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingLocalEdits = useRef(new Map<string, number>());

  const loadDevices = useCallback(async ({ withLoading = true } = {}) => {
    try {
      if (withLoading) setIsLoading(true);
      const data = await getStorageDevices();
      setDevices(data);
    } catch (err: any) {
      toast({ title: "Error loading devices", description: err.message, variant: "destructive" });
    } finally {
      if (withLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices({ withLoading: true });

    const channel = (supabase as any)
      .channel("storage_devices_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "storage_devices" }, (payload: any) => {
        setTimeout(() => {
          const newRow = payload.new as StorageDevice | undefined;
          const oldRow = payload.old as { id?: string } | undefined;
          const eventType = payload.eventType as string;

          const rowId = newRow?.id || oldRow?.id;
          if (rowId && pendingLocalEdits.current.has(rowId)) return;

          if (eventType === 'INSERT' && newRow) {
            setDevices(prev => {
              if (prev.some(d => d.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            setDevices(prev => {
              const exists = prev.some(d => d.id === newRow.id);
              if (exists) return prev.map(d => d.id === newRow.id ? { ...d, ...newRow } : d);
              return [...prev, newRow];
            });
          } else if (eventType === 'DELETE' && oldRow?.id) {
            setDevices(prev => prev.filter(d => d.id !== oldRow.id));
          }
        }, 0);
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [loadDevices]);

  const add = async (device: Partial<StorageDevice>) => {
    const result = await addStorageDevice({ ...device, synced_to_sheet: false });
    pendingLocalEdits.current.set(result.id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(result.id), 3000);
    setDevices((prev) => [...prev, result]);
    scheduleStoragePush();
    return result;
  };

  const update = async (id: string, updates: Partial<StorageDevice>) => {
    pendingLocalEdits.current.set(id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(id), 3000);
    const result = await updateStorageDevice(id, { ...updates, synced_to_sheet: false });
    setDevices((prev) => prev.map((d) => (d.id === id ? result : d)));
    scheduleStoragePush();
    return result;
  };

  const remove = async (id: string) => {
    pendingLocalEdits.current.set(id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(id), 3000);
    await deleteStorageDevice(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
    scheduleStoragePush();
  };

  return { devices, isLoading, add, update, remove, refresh: loadDevices };
}
