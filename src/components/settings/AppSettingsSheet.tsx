import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Lock, Building2, Users, Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_SOURCES = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "HANDLER", "OLD CLIENT"];

type CategoryKey = "companyNames" | "sources" | "whatsappOwners";

export function AppSettingsSheet({ open, onClose }: AppSettingsSheetProps) {
  const [companies, setCompanies] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [handlers, setHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<CategoryKey | null>(null);
  const [newCompany, setNewCompany] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newHandler, setNewHandler] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("dropdowns_cache")
        .select("category, values_json")
        .in("category", ["companyNames", "sources", "whatsappOwners"]);

      if (rows) {
        for (const row of rows) {
          const values: string[] = JSON.parse(row.values_json || "[]");
          if (row.category === "companyNames") setCompanies(values);
          else if (row.category === "sources") setSources(values);
          else if (row.category === "whatsappOwners") setHandlers(values);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const saveCategory = async (category: CategoryKey, values: string[]) => {
    setSaving(category);
    try {
      const { error } = await supabase
        .from("dropdowns_cache")
        .update({ values_json: JSON.stringify(values), updated_at: new Date().toISOString() })
        .eq("category", category);

      if (error) {
        // Row might not exist yet, try upsert
        const { error: upsertErr } = await supabase
          .from("dropdowns_cache")
          .upsert({ category, values_json: JSON.stringify(values), updated_at: new Date().toISOString() }, { onConflict: "category" });
        if (upsertErr) throw upsertErr;
      }

      window.dispatchEvent(new CustomEvent("cache-updated"));
      toast.success(`${category === "companyNames" ? "Companies" : category === "sources" ? "Sources" : "Handlers"} saved!`);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(null);
    }
  };

  const addItem = (list: string[], setList: (v: string[]) => void, value: string, category: CategoryKey) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    if (list.includes(trimmed)) {
      toast.error("Already exists");
      return;
    }
    const updated = [...list, trimmed];
    setList(updated);
    saveCategory(category, updated);
  };

  const removeItem = (list: string[], setList: (v: string[]) => void, value: string, category: CategoryKey) => {
    const updated = list.filter((i) => i !== value);
    setList(updated);
    saveCategory(category, updated);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold">App Settings</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="companies" className="mt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="companies" className="text-xs gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Companies
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-xs gap-1">
                <Megaphone className="w-3.5 h-3.5" />
                Sources
              </TabsTrigger>
              <TabsTrigger value="handlers" className="text-xs gap-1">
                <Users className="w-3.5 h-3.5" />
                Handlers
              </TabsTrigger>
            </TabsList>

            {/* Companies Tab */}
            <TabsContent value="companies" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">
                Manage company names shown in the client form dropdown.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="New company name..."
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(companies, setCompanies, newCompany, "companyNames");
                      setNewCompany("");
                    }
                  }}
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    addItem(companies, setCompanies, newCompany, "companyNames");
                    setNewCompany("");
                  }}
                  disabled={!newCompany.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {companies.map((c) => (
                  <div key={c} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border">
                    <span className="text-sm font-medium">{c}</span>
                    <button
                      onClick={() => removeItem(companies, setCompanies, c, "companyNames")}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {companies.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No companies added yet</p>
                )}
              </div>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">
                Manage client source options. Default sources cannot be removed.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="New custom source..."
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(sources, setSources, newSource, "sources");
                      setNewSource("");
                    }
                  }}
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    addItem(sources, setSources, newSource, "sources");
                    setNewSource("");
                  }}
                  disabled={!newSource.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {/* Ensure defaults are always shown */}
                {[...new Set([...DEFAULT_SOURCES, ...sources])].map((s) => {
                  const isDefault = DEFAULT_SOURCES.includes(s);
                  return (
                    <div key={s} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s}</span>
                        {isDefault && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {!isDefault && (
                        <button
                          onClick={() => removeItem(sources, setSources, s, "sources")}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Handlers Tab */}
            <TabsContent value="handlers" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">
                Handlers are used for "Who Added", "Client Handler", WhatsApp source, and Handler source across the app.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="New handler name..."
                  value={newHandler}
                  onChange={(e) => setNewHandler(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(handlers, setHandlers, newHandler, "whatsappOwners");
                      setNewHandler("");
                    }
                  }}
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    addItem(handlers, setHandlers, newHandler, "whatsappOwners");
                    setNewHandler("");
                  }}
                  disabled={!newHandler.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {handlers.map((h) => (
                  <div key={h} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border">
                    <span className="text-sm font-medium">{h}</span>
                    <button
                      onClick={() => removeItem(handlers, setHandlers, h, "whatsappOwners")}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {handlers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No handlers added yet</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
