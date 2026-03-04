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
  const lastLocalUpdate = useRef<number>(0);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getStorageDevices();
      setDevices(data);
    } catch (err: any) {
      toast({ title: "Error loading devices", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();

    const channel = (supabase as any)
      .channel("storage_devices_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "storage_devices" }, () => {
        setTimeout(() => {
          if (Date.now() - lastLocalUpdate.current > 2000) loadDevices();
        }, 0);
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [loadDevices]);

  const add = async (device: Partial<StorageDevice>) => {
    lastLocalUpdate.current = Date.now();
    const result = await addStorageDevice({ ...device, synced_to_sheet: false });
    setDevices((prev) => [...prev, result]);
    scheduleStoragePush();
    return result;
  };

  const update = async (id: string, updates: Partial<StorageDevice>) => {
    lastLocalUpdate.current = Date.now();
    const result = await updateStorageDevice(id, { ...updates, synced_to_sheet: false });
    setDevices((prev) => prev.map((d) => (d.id === id ? result : d)));
    scheduleStoragePush();
    return result;
  };

  const remove = async (id: string) => {
    lastLocalUpdate.current = Date.now();
    await deleteStorageDevice(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
    scheduleStoragePush();
  };

  return { devices, isLoading, add, update, remove, refresh: loadDevices };
}
