import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Clock, ArrowRight, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAX_RECENT = 10;

interface SearchableItem {
  label: string;
  path: string[]; // breadcrumb path segments
  type: string;
}

interface Props {
  storageKey: string; // e.g. "xito-drive-searches" or "pcloud-searches"
  items: SearchableItem[];
  onNavigate: (path: string[]) => void;
  placeholder?: string;
}

function getRecentSearches(key: string): { label: string; path: string[] }[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecentSearch(key: string, label: string, path: string[]) {
  try {
    const existing = getRecentSearches(key);
    const filtered = existing.filter(r => r.label !== label);
    filtered.unshift({ label, path });
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {}
}

export function DriveSearchPanel({ storageKey, items, onNavigate, placeholder = "Search clients, events..." }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ label: string; path: string[] }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches(storageKey));
  }, [storageKey]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return items
      .filter(item => item.label.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, items]);

  const handleSelect = (item: SearchableItem | { label: string; path: string[] }) => {
    saveRecentSearch(storageKey, item.label, item.path);
    setRecentSearches(getRecentSearches(storageKey));
    setQuery("");
    setOpen(false);
    onNavigate(item.path);
  };

  const handleClearRecent = () => {
    localStorage.removeItem(storageKey);
    setRecentSearches([]);
  };

  const showDropdown = open && (query.trim() ? results.length > 0 : recentSearches.length > 0);

  return (
    <div ref={panelRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-8 pr-8 h-9 text-xs"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[320px]">
            {query.trim() ? (
              <div className="p-1">
                {results.map((item, i) => (
                  <button
                    key={`${item.label}-${i}`}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.path.join(" › ")}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-1">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Recent Searches
                  </span>
                  {recentSearches.length > 0 && (
                    <button onClick={handleClearRecent} className="text-[10px] text-muted-foreground hover:text-destructive">
                      Clear
                    </button>
                  )}
                </div>
                {recentSearches.map((item, i) => (
                  <button
                    key={`recent-${i}`}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.path.join(" › ")}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
