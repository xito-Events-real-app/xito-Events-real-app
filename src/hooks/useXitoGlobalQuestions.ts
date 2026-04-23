import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QuestionRow,
  QuestionInput,
  getAllQuestions,
  addQuestion as apiAdd,
  updateQuestion as apiUpdate,
  deleteQuestion as apiDelete,
  reorderQuestions as apiReorder,
} from "@/lib/xito-global-questions-api";

export function useXitoGlobalQuestions() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllQuestions();
      setQuestions(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addQuestion = useCallback(async (input: QuestionInput) => {
    const row = await apiAdd(input);
    setQuestions(prev => [...prev, row]);
    return row;
  }, []);

  const updateQuestion = useCallback(async (id: string, input: QuestionInput) => {
    const row = await apiUpdate(id, input);
    setQuestions(prev => prev.map(q => (q.id === id ? row : q)));
    return row;
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    await apiDelete(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  const reorderQuestions = useCallback(async (orderedIds: string[]) => {
    setQuestions(prev => {
      const map = new Map(prev.map(q => [q.id, q]));
      return orderedIds.map((id, idx) => {
        const q = map.get(id);
        return q ? { ...q, sort_order: idx } : q;
      }).filter(Boolean) as QuestionRow[];
    });
    await apiReorder(orderedIds);
  }, []);

  // All unique tags currently in use
  const allTags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => q.tags.forEach(t => set.add(t)));
    const arr = Array.from(set);
    // Pin all-events first
    arr.sort((a, b) => {
      if (a === "all-events") return -1;
      if (b === "all-events") return 1;
      return a.localeCompare(b);
    });
    return arr;
  }, [questions]);

  // Filtered/searched view
  const visibleQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter(row => {
      if (activeTagFilter && !row.tags.includes(activeTagFilter)) return false;
      if (!q) return true;
      return (
        row.question.toLowerCase().includes(q) ||
        row.sub_question.toLowerCase().includes(q)
      );
    });
  }, [questions, search, activeTagFilter]);

  return {
    questions,
    visibleQuestions,
    loading,
    search,
    setSearch,
    activeTagFilter,
    setActiveTagFilter,
    allTags,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    reload,
  };
}