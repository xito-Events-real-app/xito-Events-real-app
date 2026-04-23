import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Plus, Search as SearchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useXitoGlobalQuestions } from "@/hooks/useXitoGlobalQuestions";
import { QuestionsTable } from "@/components/xito-global/QuestionsTable";
import { AddEditQuestionDrawer } from "@/components/xito-global/AddEditQuestionDrawer";
import { QuestionRow } from "@/lib/xito-global-questions-api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function XitoGlobalEventDetailsQuestions() {
  const navigate = useNavigate();
  const {
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
  } = useXitoGlobalQuestions();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuestionRow | null>(null);

  const openAdd = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (q: QuestionRow) => { setEditing(q); setDrawerOpen(true); };

  const handleSave = async (input: any) => {
    if (editing) await updateQuestion(editing.id, input);
    else await addQuestion(input);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteQuestion(pendingDelete.id);
      toast.success("Question deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    } finally {
      setPendingDelete(null);
    }
  };

  const isFiltered = !!search.trim() || !!activeTagFilter;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/xito-global")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">Event Details Questions</h1>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading…" : `${questions.length} question${questions.length === 1 ? "" : "s"} in master list`}
              </p>
            </div>
          </div>
          <Button onClick={openAdd} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Search + tag filter */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Filter by tag:</span>
              <button
                onClick={() => setActiveTagFilter(null)}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border transition",
                  !activeTagFilter
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                All
              </button>
              {allTags.map(tag => {
                const active = activeTagFilter === tag;
                const isAll = tag === "all-events";
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTagFilter(active ? null : tag)}
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border transition",
                      active
                        ? isAll
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-violet-500 text-white border-violet-500"
                        : isAll
                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                          : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900"
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">Loading questions…</div>
        ) : (
          <QuestionsTable
            questions={visibleQuestions}
            isFiltered={isFiltered}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            onReorder={reorderQuestions}
            onAddFirst={openAdd}
          />
        )}
      </main>

      <AddEditQuestionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editing={editing}
        tagSuggestions={allTags}
        onSave={handleSave}
        onDelete={async (id) => { await deleteQuestion(id); }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{pendingDelete?.question}" from the master list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}