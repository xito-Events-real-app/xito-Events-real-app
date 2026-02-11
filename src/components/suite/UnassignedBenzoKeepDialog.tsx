import { useState } from "react";
import { Plus, Trash2, UserPlus, Pencil, StickyNote, Clock, Star, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useUnassignedBenzoKeepNotes, UnassignedBenzoNote } from "@/hooks/useUnassignedBenzoKeepNotes";
import { AssignNoteDialog } from "./AssignNoteDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { highlightDatesAndMonths } from "@/components/client-detail/BenzoKeepDialog";
import { XitoSearchPanel } from "@/components/shared/XitoSearchPanel";

// Compact collapsible Xito Search for inline use in note cards
function XitoSearchCompact({ noteContent }: { noteContent: string }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2.5 py-1.5 bg-white/70 rounded-lg border border-gray-200 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors">
        <span className="flex items-center gap-1.5">
          <Search className="w-3 h-3" />
          Xito Search
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 p-2 bg-white/60 rounded-lg border border-gray-200 max-h-[200px] overflow-y-auto">
          <XitoSearchPanel noteContent={noteContent} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const MARKER_COLORS = {
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', ring: 'ring-yellow-400' },
  green: { bg: 'bg-green-100', border: 'border-green-300', ring: 'ring-green-400' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', ring: 'ring-pink-400' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', ring: 'ring-blue-400' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', ring: 'ring-orange-400' },
} as const;

type MarkerColor = keyof typeof MARKER_COLORS;

interface NoteCardProps {
  note: UnassignedBenzoNote;
  onEdit: (note: UnassignedBenzoNote) => void;
  onDelete: (noteId: string) => void;
  onAssign: (note: UnassignedBenzoNote) => void;
  onToggleStar: (noteId: string) => void;
}

function NoteCard({ note, onEdit, onDelete, onAssign, onToggleStar }: NoteCardProps) {
  const colors = MARKER_COLORS[note.markerColor as MarkerColor] || MARKER_COLORS.yellow;

  return (
    <div className={cn("rounded-xl border-2 p-4 transition-all hover:shadow-md", colors.bg, colors.border)}>
      {/* Note Content */}
      <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed mb-2">
        {highlightDatesAndMonths(note.content)}
      </div>

      {/* Xito Search */}
      <XitoSearchCompact noteContent={note.content} />

      {/* Timestamp */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
        <Clock className="h-3 w-3" />
        {format(new Date(note.lastUpdated), 'MMM d, yyyy h:mm a')}
        {note.createdAt !== note.lastUpdated && (
          <span className="ml-1 text-gray-400">
            (created {format(new Date(note.createdAt), 'MMM d, yyyy')})
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-300/50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssign(note)}
          className="flex-1 text-violet-700 border-violet-300 hover:bg-violet-100"
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Assign to Client
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStar(note.id)}
          className={cn(
            note.isStarred ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-yellow-500"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", note.isStarred && "fill-yellow-400")} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(note)} className="text-gray-600 hover:text-gray-800">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(note.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface UnassignedBenzoKeepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnassignedBenzoKeepDialog({ open, onOpenChange }: UnassignedBenzoKeepDialogProps) {
  const { notes, isLoading, saveNote, deleteNote, toggleStar, refetch } = useUnassignedBenzoKeepNotes();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [selectedColor, setSelectedColor] = useState<MarkerColor>("yellow");
  const [assigningNote, setAssigningNote] = useState<UnassignedBenzoNote | null>(null);

  const starredNotes = notes.filter(n => n.isStarred);

  const handleSaveNew = async () => {
    if (!noteContent.trim()) return;
    const newNote: UnassignedBenzoNote = {
      id: Date.now().toString(),
      content: noteContent.trim(),
      markerColor: selectedColor,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isStarred: false,
    };
    await saveNote(newNote);
    setNoteContent("");
    setSelectedColor("yellow");
    setIsAdding(false);
  };

  const handleSaveEdit = async (note: UnassignedBenzoNote) => {
    const updatedNote: UnassignedBenzoNote = {
      ...note,
      content: noteContent.trim(),
      markerColor: selectedColor,
      lastUpdated: new Date().toISOString(),
    };
    await saveNote(updatedNote);
    setNoteContent("");
    setEditingId(null);
  };

  const handleStartEdit = (note: UnassignedBenzoNote) => {
    setEditingId(note.id);
    setNoteContent(note.content);
    setSelectedColor(note.markerColor as MarkerColor);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNoteContent("");
    setSelectedColor("yellow");
  };

  const handleDelete = async (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      await deleteNote(noteId);
    }
  };

  const handleAssignSuccess = () => {
    setAssigningNote(null);
    refetch();
  };

  const renderColorPicker = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">Color:</span>
      {(Object.keys(MARKER_COLORS) as MarkerColor[]).map((color) => (
        <button
          key={color}
          onClick={() => setSelectedColor(color)}
          className={cn(
            "w-6 h-6 rounded-full transition-all",
            MARKER_COLORS[color].bg,
            "border-2",
            selectedColor === color
              ? `ring-2 ${MARKER_COLORS[color].ring} border-gray-600`
              : "border-gray-300 hover:scale-110"
          )}
        />
      ))}
    </div>
  );

  const renderEditForm = (note: UnassignedBenzoNote) => (
    <div className={cn("rounded-xl border-2 p-4 space-y-3", MARKER_COLORS[selectedColor].bg, MARKER_COLORS[selectedColor].border)}>
      <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="min-h-[100px] bg-white/80 border-gray-300" autoFocus />
      {renderColorPicker()}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
        <Button size="sm" onClick={() => handleSaveEdit(note)} disabled={!noteContent.trim()}>Save</Button>
      </div>
    </div>
  );

  const renderNotesList = (notesList: UnassignedBenzoNote[]) => {
    if (isLoading) return <div className="text-center py-8 text-gray-500">Loading notes...</div>;
    if (notesList.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <StickyNote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">No notes found</p>
        </div>
      );
    }
    return (
      <div className="space-y-3 pr-2">
        {notesList.map((note) => {
          if (editingId === note.id) return <div key={note.id}>{renderEditForm(note)}</div>;
          return (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              onAssign={setAssigningNote}
              onToggleStar={toggleStar}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              Unassigned Benzo Keep
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Add New Note Button */}
            {!isAdding && (
              <Button
                onClick={() => setIsAdding(true)}
                variant="outline"
                className="w-full border-dashed border-2 border-amber-300 hover:bg-amber-50 text-amber-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Note
              </Button>
            )}

            {/* New Note Form */}
            {isAdding && (
              <div className={cn("rounded-xl border-2 p-4 space-y-3", MARKER_COLORS[selectedColor].bg, MARKER_COLORS[selectedColor].border)}>
                <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your note here..." className="min-h-[100px] bg-white/80 border-gray-300" autoFocus />
                {renderColorPicker()}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNoteContent(""); }}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveNew} disabled={!noteContent.trim()}>Save Note</Button>
                </div>
              </div>
            )}

            {/* Tabbed Notes View */}
            <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All Notes ({notes.length})</TabsTrigger>
                <TabsTrigger value="starred" className="flex-1">
                  <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-500" />
                  Starred ({starredNotes.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full max-h-[50vh]">
                  {renderNotesList(notes)}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="starred" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full max-h-[50vh]">
                  {renderNotesList(starredNotes)}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {assigningNote && (
        <AssignNoteDialog
          open={!!assigningNote}
          onOpenChange={(open) => !open && setAssigningNote(null)}
          note={assigningNote}
          onSuccess={handleAssignSuccess}
        />
      )}
    </>
  );
}
