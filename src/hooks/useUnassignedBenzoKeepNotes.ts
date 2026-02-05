import { useState, useEffect, useCallback } from "react";
import { 
  getUnassignedBenzoKeepNotes as apiGetNotes,
  saveUnassignedBenzoKeepNote as apiSaveNote,
  deleteUnassignedBenzoKeepNote as apiDeleteNote
} from "@/lib/sheets-api";
import { toast } from "sonner";

export interface UnassignedBenzoNote {
  id: string;
  content: string;
  markerColor: 'yellow' | 'green' | 'pink' | 'blue' | 'orange';
  createdAt: string;
  lastUpdated: string;
}

export function useUnassignedBenzoKeepNotes() {
  const [notes, setNotes] = useState<UnassignedBenzoNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetNotes();
      // Sort by lastUpdated descending (most recent first)
      const sorted = data.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      setNotes(sorted);
    } catch (err) {
      console.error("Failed to fetch unassigned notes:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch notes"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const saveNote = async (note: UnassignedBenzoNote) => {
    try {
      await apiSaveNote(note);
      // Optimistic update
      setNotes((prev) => {
        const existing = prev.find((n) => n.id === note.id);
        if (existing) {
          return prev.map((n) => (n.id === note.id ? note : n));
        }
        return [note, ...prev];
      });
      toast.success("Note saved");
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error("Failed to save note");
      throw err;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await apiDeleteNote(noteId);
      // Optimistic update
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error("Failed to delete note");
      throw err;
    }
  };

  return {
    notes,
    isLoading,
    error,
    saveNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
