import { useMemo, useRef, useState, KeyboardEvent } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeTag, SYSTEM_TAG_ALL_EVENTS } from "@/lib/xito-global-questions-api";

interface HashtagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function HashtagInput({ value, onChange, suggestions = [], placeholder = "Type a tag and press Enter…" }: HashtagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasAllEvents = value.includes(SYSTEM_TAG_ALL_EVENTS);

  const addTag = (raw: string) => {
    const t = normalizeTag(raw);
    if (!t) return;
    if (value.includes(t)) return;
    if (t === SYSTEM_TAG_ALL_EVENTS) {
      onChange([SYSTEM_TAG_ALL_EVENTS]); // reset to system-only
    } else {
      const next = value.filter(v => v !== SYSTEM_TAG_ALL_EVENTS);
      onChange([...next, t]);
    }
    setDraft("");
  };

  const removeTag = (t: string) => {
    onChange(value.filter(v => v !== t));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        addTag(draft);
      }
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filteredSuggestions = useMemo(() => {
    const draftNorm = normalizeTag(draft);
    return suggestions
      .filter(s => s !== SYSTEM_TAG_ALL_EVENTS && !value.includes(s))
      .filter(s => (draftNorm ? s.includes(draftNorm) : true))
      .slice(0, 8);
  }, [suggestions, value, draft]);

  return (
    <div className="space-y-2">
      {/* System pinned tag */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (hasAllEvents) removeTag(SYSTEM_TAG_ALL_EVENTS);
            else addTag(SYSTEM_TAG_ALL_EVENTS);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all",
            hasAllEvents
              ? "bg-blue-500 text-white border-blue-500 shadow-sm"
              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
          )}
        >
          <Sparkles className="h-3 w-3" />
          #all-events
        </button>
        <span className="text-xs text-muted-foreground">
          {hasAllEvents ? "Applies to every event" : "Or type custom tags below"}
        </span>
      </div>

      {/* Chip input */}
      <div
        className="min-h-[44px] flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {value.filter(v => v !== SYSTEM_TAG_ALL_EVENTS).map(t => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2.5 py-0.5 text-xs font-medium"
          >
            #{t}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(t); }}
              className="hover:text-violet-900 dark:hover:text-violet-100"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (draft.trim()) addTag(draft); }}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={hasAllEvents}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Suggestions */}
      {!hasAllEvents && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center">Used before:</span>
          {filteredSuggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center rounded-full bg-muted hover:bg-accent px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}