import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PotentialDelete {
  id: string;
  image_url: string;
  device_type: string;
  device_name: string;
  client_name: string;
  responsibility: string;
  notes: string;
  deleted: boolean;
  created_at: string;
}

export function usePotentialDeletes() {
  const [records, setRecords] = useState<PotentialDelete[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("potential_deletes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      toast({ title: "Error loading records", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = (supabase as any)
      .channel("potential_deletes_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "potential_deletes" }, () => {
        load();
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [load]);

  const add = async (file: File, metadata: {
    device_type: string;
    device_name: string;
    client_name: string;
    responsibility: string;
    notes: string;
  }) => {
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadError } = await supabase.storage
      .from("potential-deletes")
      .upload(fileName, file, { contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("potential-deletes")
      .getPublicUrl(fileName);

    const { error: insertError } = await (supabase as any)
      .from("potential_deletes")
      .insert({
        image_url: urlData.publicUrl,
        ...metadata,
      });
    if (insertError) throw insertError;
    toast({ title: "Screenshot saved!" });
  };

  const softDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from("potential_deletes")
      .update({ deleted: true })
      .eq("id", id);
    if (error) throw error;
    setRecords(prev => prev.map(r => r.id === id ? { ...r, deleted: true } : r));
  };

  const restore = async (id: string) => {
    const { error } = await (supabase as any)
      .from("potential_deletes")
      .update({ deleted: false })
      .eq("id", id);
    if (error) throw error;
    setRecords(prev => prev.map(r => r.id === id ? { ...r, deleted: false } : r));
  };

  const hardDelete = async (id: string, imageUrl: string) => {
    try {
      const path = imageUrl.split("/potential-deletes/")[1];
      if (path) {
        await supabase.storage.from("potential-deletes").remove([path]);
      }
    } catch {}
    const { error } = await (supabase as any)
      .from("potential_deletes")
      .delete()
      .eq("id", id);
    if (error) throw error;
    setRecords(prev => prev.filter(r => r.id !== id));
    toast({ title: "Permanently deleted" });
  };

  return { records, isLoading, add, softDelete, restore, hardDelete, refresh: load };
}
