import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Star, StickyNote, Clock, Pencil, Trash2, UserPlus, Maximize2, Minimize2, Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useUnassignedBenzoKeepNotes, UnassignedBenzoNote } from "@/hooks/useUnassignedBenzoKeepNotes";
import { AssignNoteDialog } from "@/components/suite/AssignNoteDialog";
import { XitoSearchPanel } from "@/components/shared/XitoSearchPanel";
import { highlightDatesAndMonths } from "@/components/client-detail/BenzoKeepDialog";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MARKER_COLORS = {
  yellow: { border: 'border-l-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-400', dot: 'bg-yellow-400' },
  green: { border: 'border-l-green-400', bg: 'bg-green-500/10', ring: 'ring-green-400', dot: 'bg-green-400' },
  pink: { border: 'border-l-pink-400', bg: 'bg-pink-500/10', ring: 'ring-pink-400', dot: 'bg-pink-400' },
  blue: { border: 'border-l-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-400', dot: 'bg-blue-400' },
  orange: { border: 'border-l-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-400', dot: 'bg-orange-400' },
} as const;

type MarkerColor = keyof typeof MARKER_COLORS;

function XitoSearchCompact({ noteContent }: { noteContent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50 text-xs font-medium text-violet-300 hover:bg-slate-700 transition-colors">
        <span className="flex items-center gap-1.5">
          <Search className="w-3 h-3" />
          Xito Search
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-slate-800/80 rounded-lg border border-slate-700/50 max-h-[200px] overflow-y-auto">
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

  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(n => { counts[n.markerColor] = (counts[n.markerColor] || 0) + 1; });
    return counts;
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
    setExpandedId(note.id);
  };

  const handleDelete = async (noteId: string) => {
    if (window.confirm("Delete this note?")) {
      await deleteNote(noteId);
      if (fullScreenNote?.id === noteId) setFullScreenNote(null);
    }
  };

  const renderColorPicker = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Color:</span>
      {(Object.keys(MARKER_COLORS) as MarkerColor[]).map((color) => (
        <button
          key={color}
          onClick={() => setSelectedColor(color)}
          className={cn(
            "w-6 h-6 rounded-full transition-all",
            MARKER_COLORS[color].dot,
            "border-2",
            selectedColor === color
              ? `ring-2 ${MARKER_COLORS[color].ring} border-white`
              : "border-slate-600 hover:scale-110 opacity-60 hover:opacity-100"
          )}
        />
      ))}
    </div>
  );

  // Full-screen note overlay
  if (fullScreenNote) {
    const colors = MARKER_COLORS[fullScreenNote.markerColor as MarkerColor] || MARKER_COLORS.yellow;
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-violet-900/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setFullScreenNote(null)} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn("w-3 h-3 rounded-full", colors.dot)} />
            <h1 className="text-lg font-bold text-white">Note Detail</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => toggleStar(fullScreenNote.id)} className={fullScreenNote.isStarred ? "text-yellow-400" : "text-slate-400"}>
              <Star className={cn("h-4 w-4", fullScreenNote.isStarred && "fill-yellow-400")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAssigningNote(fullScreenNote)} className="text-violet-400">
              <UserPlus className="h-4 w-4 mr-1.5" /> Assign
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { handleStartEdit(fullScreenNote); setFullScreenNote(null); }} className="text-slate-300">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(fullScreenNote.id)} className="text-red-400 hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFullScreenNote(null)} className="text-slate-400 hover:text-white ml-2">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-3xl mx-auto w-full">
          <div className={cn("rounded-2xl border-l-4 p-8 bg-slate-800/60 border border-slate-700/50", colors.border)}>
            <div className="text-slate-200 whitespace-pre-wrap text-base leading-relaxed">
              {highlightDatesAndMonths(fullScreenNote.content)}
            </div>
            <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {format(new Date(fullScreenNote.lastUpdated), 'MMM d, yyyy h:mm a')}
              {fullScreenNote.createdAt !== fullScreenNote.lastUpdated && (
                <span className="text-slate-600">(created {format(new Date(fullScreenNote.createdAt), 'MMM d, yyyy')})</span>
              )}
            </div>
          </div>
          <XitoSearchCompact noteContent={fullScreenNote.content} />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950/20 to-slate-900">
      <GlobalModeToggle />

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-violet-900/50 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-violet-400" />
                Benzo Keep
              </h1>
              <p className="text-xs text-violet-400">{notes.length} notes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <Button
                variant={activeTab === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="text-xs"
              >
                All ({notes.length})
              </Button>
              <Button
                variant={activeTab === 'starred' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('starred')}
                className="text-xs"
              >
                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                ({starredNotes.length})
              </Button>
            </div>
            <Button
              onClick={() => { setIsAdding(true); setExpandedId(null); setEditingId(null); }}
              className="bg-violet-600 hover:bg-violet-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Note</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <StickyNote className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-violet-400">Total Notes</p>
                  <p className="text-xl font-bold text-violet-300">{notes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-yellow-400">Starred</p>
                  <p className="text-xl font-bold text-yellow-300">{starredNotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Clock className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-emerald-400">This Week</p>
                  <p className="text-xl font-bold text-emerald-300">{recentNotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg flex gap-0.5">
                  {(Object.keys(MARKER_COLORS) as MarkerColor[]).slice(0, 3).map(c => (
                    <div key={c} className={cn("w-2 h-2 rounded-full", MARKER_COLORS[c].dot)} />
                  ))}
                </div>
                <div>
                  <p className="text-xs text-amber-400">Colors Used</p>
                  <p className="text-xl font-bold text-amber-300">{Object.keys(colorCounts).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Note Form */}
        {isAdding && (
          <div className={cn("rounded-2xl border-l-4 p-5 mb-6 bg-slate-800/60 border border-slate-700/50", MARKER_COLORS[selectedColor].border)}>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[120px] bg-slate-900/50 border-slate-600 text-slate-200 placeholder:text-slate-500 mb-3"
              autoFocus
            />
            {renderColorPicker()}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNoteContent(""); }} className="text-slate-400">Cancel</Button>
              <Button size="sm" onClick={handleSaveNew} disabled={!noteContent.trim()} className="bg-violet-600 hover:bg-violet-700">Save Note</Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-slate-800/50 rounded-xl" />)}
          </div>
        ) : displayNotes.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote className="h-16 w-16 mx-auto mb-4 text-slate-700" />
            <p className="text-slate-500 text-lg">
              {activeTab === 'starred' ? 'No starred notes' : 'No notes yet'}
            </p>
            {activeTab === 'all' && (
              <Button variant="ghost" className="mt-3 text-violet-400" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create your first note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayNotes.map((note) => {
              const colors = MARKER_COLORS[note.markerColor as MarkerColor] || MARKER_COLORS.yellow;
              const isExpanded = expandedId === note.id;
              const isEditing = editingId === note.id;

              // Editing state
              if (isEditing) {
                return (
                  <div key={note.id} className={cn("rounded-2xl border-l-4 p-5 bg-slate-800/60 border border-slate-700/50", MARKER_COLORS[selectedColor].border)}>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="min-h-[120px] bg-slate-900/50 border-slate-600 text-slate-200 mb-3"
                      autoFocus
                    />
                    {renderColorPicker()}
                    <div className="flex justify-end gap-2 mt-3">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setNoteContent(""); }} className="text-slate-400">Cancel</Button>
                      <Button size="sm" onClick={() => handleSaveEdit(note)} disabled={!noteContent.trim()} className="bg-violet-600 hover:bg-violet-700">Save</Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={note.id}
                  className={cn(
                    "rounded-2xl border-l-4 transition-all duration-200 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70",
                    colors.border,
                    isExpanded && "ring-1 ring-violet-500/30 bg-slate-800/70"
                  )}
                >
                  {/* Collapsed / Header area - always visible */}
                  <div
                    className="p-4 cursor-pointer flex items-start gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(note.id); }}
                      className={cn("mt-0.5 shrink-0", note.isStarred ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400")}
                    >
                      <Star className={cn("h-4 w-4", note.isStarred && "fill-yellow-400")} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm text-slate-300 whitespace-pre-wrap", !isExpanded && "line-clamp-2")}>
                        {isExpanded ? highlightDatesAndMonths(note.content) : note.content}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {format(new Date(note.lastUpdated), 'MMM d')}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-700/30 mt-0">
                      <XitoSearchCompact noteContent={note.content} />
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/30">
                        <Button variant="outline" size="sm" onClick={() => setAssigningNote(note)} className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10">
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFullScreenNote(note)} className="text-slate-400 hover:text-white">
                          <Maximize2 className="h-3.5 w-3.5 mr-1" /> Full Screen
                        </Button>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(note)} className="text-slate-400 hover:text-white">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(note.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
