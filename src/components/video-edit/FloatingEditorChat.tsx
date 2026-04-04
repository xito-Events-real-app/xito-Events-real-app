import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, X, Minimize2, Maximize2, ChevronDown } from "lucide-react";
import { EditorChat } from "./EditorChat";
import { cn } from "@/lib/utils";

interface FloatingEditorChatProps {
  editors: string[];
  mentionOptions: string[];
  senderName?: string;
  senderType?: "admin" | "editor";
}

export function FloatingEditorChat({ editors, mentionOptions, senderName = "Admin", senderType = "admin" }: FloatingEditorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeEditor, setActiveEditor] = useState(editors[0] || "");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load unread counts
  const loadUnread = useCallback(async () => {
    const { data } = await supabase
      .from("video_edit_chat")
      .select("editor_name")
      .eq("sender_type", "editor")
      .eq("is_read", false);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        counts[row.editor_name] = (counts[row.editor_name] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const channel = supabase
      .channel("floating-chat-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_edit_chat" }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadUnread]);

  useEffect(() => {
    if (editors.length > 0 && !activeEditor) setActiveEditor(editors[0]);
  }, [editors, activeEditor]);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (editors.length === 0) return null;

  // Collapsed bubble
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    );
  }

  const chatWidth = isExpanded ? "w-[480px]" : "w-[360px]";
  const chatHeight = isExpanded ? "h-[520px]" : "h-[420px]";

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl border bg-card overflow-hidden transition-all duration-200", chatWidth, chatHeight)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground shrink-0">
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-semibold flex-1">Editor Chat</span>
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors">
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setIsOpen(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor tabs - scrollable horizontal */}
      <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b bg-muted/30 shrink-0">
        {editors.map((name) => (
          <button
            key={name}
            onClick={() => setActiveEditor(name)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap relative shrink-0",
              activeEditor === name
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {name}
            {(unreadCounts[name] || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                {unreadCounts[name]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0">
        {activeEditor && (
          <EditorChat
            key={activeEditor}
            editorName={activeEditor}
            senderName={senderName}
            senderType={senderType}
            mentionOptions={mentionOptions}
            compact
          />
        )}
      </div>
    </div>
  );
}
