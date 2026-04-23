import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionRow } from "@/lib/xito-global-questions-api";

interface QuestionsTableProps {
  questions: QuestionRow[];
  isFiltered: boolean;
  onEdit: (q: QuestionRow) => void;
  onDelete: (q: QuestionRow) => void;
  onReorder: (orderedIds: string[]) => void;
  onAddFirst: () => void;
}

function YesNoPill({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold">YES</span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-muted text-muted-foreground px-2 py-0.5 text-xs font-bold">NO</span>
  );
}

function TagChip({ tag }: { tag: string }) {
  const isAll = tag === "all-events";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isAll
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      )}
    >
      #{tag}
    </span>
  );
}

function SortableRow({ q, index, onEdit, onDelete }: {
  q: QuestionRow;
  index: number;
  onEdit: (q: QuestionRow) => void;
  onDelete: (q: QuestionRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b hover:bg-muted/30 transition cursor-pointer group"
      onClick={() => onEdit(q)}
    >
      <td className="px-2 py-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
        <button
          {...attributes}
          {...listeners}
          className="opacity-30 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-2 py-3 text-center w-10 text-xs text-muted-foreground font-mono">{index + 1}</td>
      <td className="px-3 py-3 min-w-[220px]">
        <div className="font-medium text-sm leading-snug">{q.question || <span className="text-muted-foreground italic">(no question)</span>}</div>
      </td>
      <td className="px-3 py-3 min-w-[140px] text-sm text-muted-foreground">
        {q.sub_question || <span className="text-muted-foreground/60">—</span>}
      </td>
      <td className="px-3 py-3 min-w-[160px]">
        {q.dropdown_enabled && q.dropdown_options.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {q.dropdown_options.map(o => (
              <span key={o} className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
                {o}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground/60 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center"><YesNoPill value={q.text_input_enabled} /></td>
      <td className="px-3 py-3 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <YesNoPill value={q.number_input_enabled} />
          {q.number_input_enabled && q.number_input_hint && (
            <span className="text-[10px] text-muted-foreground italic max-w-[140px] truncate" title={q.number_input_hint}>
              {q.number_input_hint}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 min-w-[180px]">
        <div className="flex flex-wrap gap-1">
          {q.tags.length === 0 ? (
            <span className="text-muted-foreground/60 text-xs italic">no tags</span>
          ) : (
            q.tags.map(t => <TagChip key={t} tag={t} />)
          )}
        </div>
      </td>
      <td className="px-3 py-3 w-24" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(q)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(q)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function QuestionsTable({ questions, isFiltered, onEdit, onDelete, onReorder, onAddFirst }: QuestionsTableProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex(q => q.id === active.id);
    const newIdx = questions.findIndex(q => q.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...questions];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    onReorder(next.map(q => q.id));
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 px-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
          <Pencil className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-bold mb-1">{isFiltered ? "No questions match your filter" : "No questions yet"}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isFiltered ? "Try clearing the search or tag filter." : "Start building the master list of event-detail questions."}
        </p>
        {!isFiltered && (
          <Button onClick={onAddFirst}>Add your first question</Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr className="text-left">
                <th className="px-2 py-2.5 w-10"></th>
                <th className="px-2 py-2.5 w-10 text-xs font-semibold text-muted-foreground">#</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sub Question</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dropdown Options</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Text</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Number</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Events</th>
                <th className="px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {questions.map((q, i) => (
                  <SortableRow key={q.id} q={q} index={i} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}