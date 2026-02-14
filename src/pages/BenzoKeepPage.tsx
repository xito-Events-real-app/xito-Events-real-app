import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Star, StickyNote, Clock, Pencil, Trash2, UserPlus, Maximize2, Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useUnassignedBenzoKeepNotes, UnassignedBenzoNote } from "@/hooks/useUnassignedBenzoKeepNotes";
import { AssignNoteDialog } from "@/components/suite/AssignNoteDialog";
import { XitoSearchPanel } from "@/components/shared/XitoSearchPanel";
import { highlightDatesAndMonths } from "@/components/client-detail/BenzoKeepDialog";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BenzoDateConverter } from "@/components/shared/BenzoDateConverter";

const NOTE_COLORS = {
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', dot: 'bg-yellow-400', ring: 'ring-yellow-400', hoverBg: 'hover:bg-yellow-200' },
  green: { bg: 'bg-green-100', border: 'border-green-300', dot: 'bg-green-400', ring: 'ring-green-400', hoverBg: 'hover:bg-green-200' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', dot: 'bg-pink-400', ring: 'ring-pink-400', hoverBg: 'hover:bg-pink-200' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', dot: 'bg-blue-400', ring: 'ring-blue-400', hoverBg: 'hover:bg-blue-200' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', dot: 'bg-orange-400', ring: 'ring-orange-400', hoverBg: 'hover:bg-orange-200' },
} as const;

type MarkerColor = keyof typeof NOTE_COLORS;

function getColors(color: string) {
  return NOTE_COLORS[color as MarkerColor] || NOTE_COLORS.yellow;
}

function XitoSearchCompact({ noteContent }: { noteContent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 bg-black/5 rounded-lg text-xs font-medium text-gray-600 hover:bg-black/10 transition-colors">
        <span className="flex items-center gap-1.5">
          <Search className="w-3 h-3" />
          Xito Search
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 p-2 bg-white/60 rounded-lg max-h-[180px] overflow-y-auto">
          <XitoSearchPanel noteContent={noteContent} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const BenzoKeepPage = () => {
  const navigate = useNavigate();
  const { notes, isLoading, saveNote, deleteNote, toggleStar } = useUnassignedBenzoKeepNotes();

  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullScreenNote, setFullScreenNote] = useState<UnassignedBenzoNote | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [selectedColor, setSelectedColor] = useState<MarkerColor>("yellow");
  const [assigningNote, setAssigningNote] = useState<UnassignedBenzoNote | null>(null);

  const starredNotes = useMemo(() => notes.filter(n => n.isStarred), [notes]);
  const recentNotes = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return notes.filter(n => new Date(n.lastUpdated).getTime() > weekAgo);
  }, [notes]);

  const displayNotes = activeTab === 'starred' ? starredNotes : notes;

  const handleSaveNew = async () => {
    if (!noteContent.trim()) return;
    await saveNote({
      id: Date.now().toString(),
      content: noteContent.trim(),
      markerColor: selectedColor,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isStarred: false,
    });
    setNoteContent("");
    setSelectedColor("yellow");
    setIsAdding(false);
  };

  const handleSaveEdit = async (note: UnassignedBenzoNote) => {
    await saveNote({
      ...note,
      content: noteContent.trim(),
      markerColor: selectedColor,
      lastUpdated: new Date().toISOString(),
    });
    setNoteContent("");
    setEditingId(null);
  };

  const handleStartEdit = (note: UnassignedBenzoNote) => {
    setEditingId(note.id);
    setNoteContent(note.content);
    setSelectedColor(note.markerColor as MarkerColor);
    setExpandedId(null);
  };

  const handleDelete = async (noteId: string) => {
    if (window.confirm("Delete this note?")) {
      await deleteNote(noteId);
      if (fullScreenNote?.id === noteId) setFullScreenNote(null);
      if (expandedId === noteId) setExpandedId(null);
    }
  };

  const renderColorPicker = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Color:</span>
      {(Object.keys(NOTE_COLORS) as MarkerColor[]).map((color) => (
        <button
          key={color}
          onClick={() => setSelectedColor(color)}
          className={cn(
            "w-5 h-5 rounded-full transition-all",
            NOTE_COLORS[color].dot,
            "border-2",
            selectedColor === color
              ? `ring-2 ${NOTE_COLORS[color].ring} border-white scale-110`
              : "border-gray-300 hover:scale-110 opacity-70 hover:opacity-100"
          )}
        />
      ))}
    </div>
  );

  // Full-screen note overlay
  if (fullScreenNote) {
    const colors = getColors(fullScreenNote.markerColor);
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setFullScreenNote(null)} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn("w-3 h-3 rounded-full", colors.dot)} />
            <h1 className="text-lg font-bold text-white">Note Detail</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => toggleStar(fullScreenNote.id)} className={fullScreenNote.isStarred ? "text-yellow-400" : "text-slate-400"}>
              <Star className={cn("h-4 w-4", fullScreenNote.isStarred && "fill-yellow-400")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAssigningNote(fullScreenNote)} className="text-violet-400">
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { handleStartEdit(fullScreenNote); setFullScreenNote(null); }} className="text-slate-300">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(fullScreenNote.id)} className="text-red-400">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFullScreenNote(null)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className={cn("rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto border", colors.bg, colors.border)}>
            <div className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
              {highlightDatesAndMonths(fullScreenNote.content)}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {format(new Date(fullScreenNote.lastUpdated), 'MMM d, yyyy h:mm a')}
              {fullScreenNote.createdAt !== fullScreenNote.lastUpdated && (
                <span className="text-gray-400">(created {format(new Date(fullScreenNote.createdAt), 'MMM d, yyyy')})</span>
              )}
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-4">
            <XitoSearchCompact noteContent={fullScreenNote.content} />
          </div>
        </div>
        {assigningNote && (
          <AssignNoteDialog
            open={!!assigningNote}
            onOpenChange={(open) => !open && setAssigningNote(null)}
            note={assigningNote}
            onSuccess={() => { setAssigningNote(null); setFullScreenNote(null); }}
          />
        )}
      </div>
    );
  }

  // Expanded note overlay
  const expandedNote = expandedId ? displayNotes.find(n => n.id === expandedId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950/20 to-slate-900">
      <GlobalModeToggle />

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-violet-900/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-8 w-8" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <StickyNote className="h-4 w-4 text-violet-400" />
            <h1 className="text-base sm:text-lg font-bold text-white">Benzo Keep</h1>
            <span className="text-xs text-violet-400 ml-1">{notes.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Compact stats */}
            <div className="hidden sm:flex items-center gap-3 mr-3 text-xs">
              <span className="text-yellow-400 flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400" />{starredNotes.length}</span>
              <span className="text-emerald-400 flex items-center gap-1"><Clock className="h-3 w-3" />{recentNotes.length}</span>
            </div>
            {/* Tabs */}
            <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
              <Button
                variant={activeTab === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="text-xs h-7 px-2"
              >
                All
              </Button>
              <Button
                variant={activeTab === 'starred' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('starred')}
                className="text-xs h-7 px-2"
              >
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </Button>
            </div>
            <Button
              onClick={() => { setIsAdding(true); setExpandedId(null); setEditingId(null); }}
              className="bg-violet-600 hover:bg-violet-700 text-white h-7 px-2 text-xs"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-6xl mx-auto">
        {/* Date Converter */}
        <div className="mb-4">
          <BenzoDateConverter />
        </div>
        {/* Add New Note Form */}
        {isAdding && (
          <div className={cn("rounded-xl p-4 mb-4 border", NOTE_COLORS[selectedColor].bg, NOTE_COLORS[selectedColor].border)}>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[100px] bg-white/50 border-gray-300 text-gray-800 placeholder:text-gray-400 mb-2 text-sm"
              autoFocus
            />
            {renderColorPicker()}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNoteContent(""); }} className="text-gray-600 h-7 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSaveNew} disabled={!noteContent.trim()} className="bg-violet-600 hover:bg-violet-700 h-7 text-xs">Save</Button>
            </div>
          </div>
        )}

        {/* Edit Note Form */}
        {editingId && (() => {
          const editNote = notes.find(n => n.id === editingId);
          if (!editNote) return null;
          return (
            <div className={cn("rounded-xl p-4 mb-4 border", NOTE_COLORS[selectedColor].bg, NOTE_COLORS[selectedColor].border)}>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="min-h-[100px] bg-white/50 border-gray-300 text-gray-800 mb-2 text-sm"
                autoFocus
              />
              {renderColorPicker()}
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setNoteContent(""); }} className="text-gray-600 h-7 text-xs">Cancel</Button>
                <Button size="sm" onClick={() => handleSaveEdit(editNote)} disabled={!noteContent.trim()} className="bg-violet-600 hover:bg-violet-700 h-7 text-xs">Save</Button>
              </div>
            </div>
          );
        })()}

        {/* Notes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 bg-slate-800/50 rounded-xl" />)}
          </div>
        ) : displayNotes.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote className="h-12 w-12 mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500">{activeTab === 'starred' ? 'No starred notes' : 'No notes yet'}</p>
            {activeTab === 'all' && (
              <Button variant="ghost" className="mt-2 text-violet-400 text-sm" onClick={() => setIsAdding(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create your first note
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayNotes.map((note) => {
              const colors = getColors(note.markerColor);

              return (
                <div
                  key={note.id}
                  onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                  className={cn(
                    "rounded-xl border p-3 cursor-pointer transition-all duration-200",
                    colors.bg, colors.border, colors.hoverBg,
                    "shadow-sm hover:shadow-md"
                  )}
                >
                  {/* Star + Content */}
                  <div className="flex items-start gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(note.id); }}
                      className={cn("mt-0.5 shrink-0", note.isStarred ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500")}
                    >
                      <Star className={cn("h-3.5 w-3.5", note.isStarred && "fill-yellow-500")} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3 leading-snug">
                        {note.content}
                      </div>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(note.lastUpdated), 'MMM d')}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); setFullScreenNote(note); }} className="p-1 rounded hover:bg-black/10 text-gray-500">
                        <Maximize2 className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleStartEdit(note); }} className="p-1 rounded hover:bg-black/10 text-gray-500">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="p-1 rounded hover:bg-black/10 text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Note Overlay */}
      {expandedNote && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setExpandedId(null)}>
          <div
            className={cn("rounded-2xl border p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl", getColors(expandedNote.markerColor).bg, getColors(expandedNote.markerColor).border)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <button
                onClick={() => toggleStar(expandedNote.id)}
                className={cn(expandedNote.isStarred ? "text-yellow-500" : "text-gray-400")}
              >
                <Star className={cn("h-4 w-4", expandedNote.isStarred && "fill-yellow-500")} />
              </button>
              <Button variant="ghost" size="icon" onClick={() => setExpandedId(null)} className="text-gray-500 hover:text-gray-800 h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed mb-3">
              {highlightDatesAndMonths(expandedNote.content)}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-3">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(expandedNote.lastUpdated), 'MMM d, yyyy h:mm a')}
            </div>
            <XitoSearchCompact noteContent={expandedNote.content} />
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/10">
              <Button variant="outline" size="sm" onClick={() => setAssigningNote(expandedNote)} className="text-violet-600 border-violet-300 hover:bg-violet-50 h-7 text-xs">
                <UserPlus className="h-3 w-3 mr-1" /> Assign
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setFullScreenNote(expandedNote); setExpandedId(null); }} className="text-gray-600 h-7 text-xs">
                <Maximize2 className="h-3 w-3 mr-1" /> Full Screen
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => handleStartEdit(expandedNote)} className="text-gray-600 h-7 text-xs">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(expandedNote.id)} className="text-red-500 hover:bg-red-50 h-7 text-xs">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {assigningNote && (
        <AssignNoteDialog
          open={!!assigningNote}
          onOpenChange={(open) => !open && setAssigningNote(null)}
          note={assigningNote}
          onSuccess={() => setAssigningNote(null)}
        />
      )}
    </div>
  );
};

export default BenzoKeepPage;
