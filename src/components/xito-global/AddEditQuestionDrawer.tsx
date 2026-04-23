import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, Trash2, ListChecks, Type as TypeIcon, Hash } from "lucide-react";
import { toast } from "sonner";
import { HashtagInput } from "./HashtagInput";
import { QuestionRow, QuestionInput } from "@/lib/xito-global-questions-api";

interface AddEditQuestionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: QuestionRow | null;
  tagSuggestions: string[];
  onSave: (input: QuestionInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function AddEditQuestionDrawer({ open, onOpenChange, editing, tagSuggestions, onSave, onDelete }: AddEditQuestionDrawerProps) {
  const [question, setQuestion] = useState("");
  const [subQuestion, setSubQuestion] = useState("");
  const [dropdownEnabled, setDropdownEnabled] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [optionDraft, setOptionDraft] = useState("");
  const [textInputEnabled, setTextInputEnabled] = useState(false);
  const [numberInputEnabled, setNumberInputEnabled] = useState(false);
  const [numberInputHint, setNumberInputHint] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setQuestion(editing?.question ?? "");
      setSubQuestion(editing?.sub_question ?? "");
      setDropdownEnabled(editing?.dropdown_enabled ?? false);
      setDropdownOptions(editing?.dropdown_options ?? []);
      setTextInputEnabled(editing?.text_input_enabled ?? false);
      setNumberInputEnabled(editing?.number_input_enabled ?? false);
      setNumberInputHint(editing?.number_input_hint ?? "");
      setTags(editing?.tags ?? []);
      setOptionDraft("");
    }
  }, [open, editing]);

  const addOption = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (dropdownOptions.includes(v)) return;
    setDropdownOptions(prev => [...prev, v]);
    setOptionDraft("");
  };

  const removeOption = (v: string) => {
    setDropdownOptions(prev => prev.filter(o => o !== v));
  };

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error("Question is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        question,
        sub_question: subQuestion,
        dropdown_enabled: dropdownEnabled,
        dropdown_options: dropdownEnabled ? dropdownOptions : [],
        text_input_enabled: textInputEnabled,
        number_input_enabled: numberInputEnabled,
        number_input_hint: numberInputEnabled ? numberInputHint : "",
        tags,
      });
      toast.success(editing ? "Question updated" : "Question added");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !onDelete) return;
    try {
      await onDelete(editing.id);
      toast.success("Question deleted");
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>{editing ? "Edit Question" : "Add New Question"}</DrawerTitle>
                <DrawerDescription>Configure how this question is asked to clients.</DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 max-w-3xl mx-auto w-full">
            {/* Question */}
            <div className="space-y-2">
              <Label htmlFor="q-question">Question <span className="text-destructive">*</span></Label>
              <Input
                id="q-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Total Number of Guests"
              />
            </div>

            {/* Sub Question */}
            <div className="space-y-2">
              <Label htmlFor="q-sub">Sub Question <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="q-sub"
                value={subQuestion}
                onChange={(e) => setSubQuestion(e.target.value)}
                placeholder="Clarifying line shown under the main question"
                rows={2}
              />
            </div>

            {/* Answer Type */}
            <div className="space-y-3">
              <Label className="text-base">Answer Type</Label>
              <p className="text-xs text-muted-foreground -mt-1">Enable any combination — the client can answer all enabled inputs.</p>

              {/* Dropdown */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="t-dropdown" className="cursor-pointer">Dropdown Options</Label>
                  </div>
                  <Switch id="t-dropdown" checked={dropdownEnabled} onCheckedChange={setDropdownEnabled} />
                </div>
                {dropdownEnabled && (
                  <div className="space-y-2 pl-6">
                    <div
                      className="min-h-[40px] flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5"
                    >
                      {dropdownOptions.map(o => (
                        <span key={o} className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold uppercase">
                          {o}
                          <button type="button" onClick={() => removeOption(o)} className="hover:opacity-70">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={optionDraft}
                        onChange={(e) => setOptionDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addOption(optionDraft);
                          } else if (e.key === "Backspace" && !optionDraft && dropdownOptions.length > 0) {
                            removeOption(dropdownOptions[dropdownOptions.length - 1]);
                          }
                        }}
                        onBlur={() => { if (optionDraft.trim()) addOption(optionDraft); }}
                        placeholder="Type option (e.g. YES) and press Enter"
                        className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="t-text" className="cursor-pointer">Text Input</Label>
                  </div>
                  <Switch id="t-text" checked={textInputEnabled} onCheckedChange={setTextInputEnabled} />
                </div>
              </div>

              {/* Number Input */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="t-number" className="cursor-pointer">Number Input</Label>
                  </div>
                  <Switch id="t-number" checked={numberInputEnabled} onCheckedChange={setNumberInputEnabled} />
                </div>
                {numberInputEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="t-number-hint" className="text-xs text-muted-foreground">Placeholder hint (optional)</Label>
                    <Input
                      id="t-number-hint"
                      value={numberInputHint}
                      onChange={(e) => setNumberInputHint(e.target.value)}
                      placeholder="e.g. Enter number, e.g., 5–7"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-base">Events (Tags)</Label>
              <p className="text-xs text-muted-foreground">Use #all-events for every event, or add custom hashtags like #mehndi, #sangeet.</p>
              <HashtagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
            </div>
          </div>

          <DrawerFooter className="border-t">
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2">
              <div>
                {editing && onDelete && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Question"}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{editing?.question}" from the master list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}