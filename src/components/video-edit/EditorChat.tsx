import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, AtSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  created_at: string;
  editor_name: string;
  sender_name: string;
  sender_type: string;
  message: string;
  mentions: string;
  tracker_row_id: string | null;
  is_read: boolean;
}

interface EditorChatProps {
  editorName: string;
  senderName: string;
  senderType: "admin" | "editor";
  trackerRowId?: string;
  mentionOptions?: string[];
  compact?: boolean;
}

export function EditorChat({
  editorName,
  senderName,
  senderType,
  trackerRowId,
  mentionOptions = [],
  compact = false,
}: EditorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    let query = supabase
      .from("video_edit_chat")
      .select("*")
      .eq("editor_name", editorName)
      .order("created_at", { ascending: true });

    if (trackerRowId) {
      query = query.eq("tracker_row_id", trackerRowId);
    }

    const { data } = await query.limit(200);
    if (data) setMessages(data as ChatMessage[]);
  }, [editorName, trackerRowId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${editorName}-${trackerRowId || "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "video_edit_chat" },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.editor_name === editorName) {
            if (trackerRowId && newMsg.tracker_row_id !== trackerRowId) return;
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editorName, trackerRowId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read when admin views editor messages
  useEffect(() => {
    if (senderType === "admin" && messages.length > 0) {
      const unread = messages.filter(
        (m) => m.sender_type === "editor" && !m.is_read
      );
      if (unread.length > 0) {
        supabase
          .from("video_edit_chat")
          .update({ is_read: true })
          .in(
            "id",
            unread.map((m) => m.id)
          )
          .then();
      }
    }
  }, [messages, senderType]);

  const filteredMentions = useMemo(() => {
    if (!mentionFilter) return mentionOptions.slice(0, 10);
    const q = mentionFilter.toLowerCase();
    return mentionOptions.filter((m) => m.toLowerCase().includes(q)).slice(0, 10);
  }, [mentionFilter, mentionOptions]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Check for @ trigger
    const cursorPos = e.target.selectionStart || 0;
    const textBefore = val.substring(0, cursorPos);
    const lastAt = textBefore.lastIndexOf("@");

    if (lastAt >= 0) {
      const afterAt = textBefore.substring(lastAt + 1);
      if (!afterAt.includes(" ") && afterAt.length <= 30) {
        setShowMentions(true);
        setMentionFilter(afterAt);
        setMentionStartIdx(lastAt);
        return;
      }
    }
    setShowMentions(false);
    setMentionFilter("");
  };

  const insertMention = (name: string) => {
    const before = input.substring(0, mentionStartIdx);
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const after = input.substring(cursorPos);
    const newVal = `${before}@${name} ${after}`;
    setInput(newVal);
    setShowMentions(false);
    setMentionFilter("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Extract mentions
    const mentionRegex = /@([\w\s]+?)(?=\s|$|@)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(trimmed)) !== null) {
      const name = match[1].trim();
      if (mentionOptions.includes(name)) mentions.push(name);
    }

    await supabase.from("video_edit_chat").insert({
      editor_name: editorName,
      sender_name: senderName,
      sender_type: senderType,
      message: trimmed,
      mentions: JSON.stringify(mentions),
      tracker_row_id: trackerRowId || null,
    });

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === "Escape" && showMentions) {
      setShowMentions(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isMe = msg.sender_type === senderType;
    const time = new Date(msg.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Highlight @mentions in message
    const parts = msg.message.split(/(@[\w\s]+?)(?=\s|$|@)/g);
    const rendered = parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="bg-primary/20 text-primary font-semibold rounded px-0.5"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });

    return (
      <div
        key={msg.id}
        className={cn("flex flex-col max-w-[80%] mb-2", isMe ? "ml-auto items-end" : "items-start")}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {msg.sender_name}
          </span>
          <span className="text-[9px] text-muted-foreground/60">{time}</span>
        </div>
        <div
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm whitespace-pre-wrap break-words",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {rendered}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col bg-card", compact ? "h-full" : "border rounded-xl h-80")}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-xs py-8">
            No messages yet. Start a conversation!
          </p>
        )}
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Mention popup */}
      {showMentions && filteredMentions.length > 0 && (
        <div className="mx-3 mb-1 border rounded-lg bg-popover shadow-lg max-h-36 overflow-y-auto">
          {filteredMentions.map((name) => (
            <button
              key={name}
              onClick={() => insertMention(name)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2"
            >
              <AtSign className="w-3 h-3 text-primary" />
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-2 flex items-end gap-2">
        <button
          onClick={() => {
            setInput((prev) => prev + "@");
            setShowMentions(true);
            setMentionFilter("");
            setMentionStartIdx(input.length);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <AtSign className="w-4 h-4 text-muted-foreground" />
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm border-0 outline-none placeholder:text-muted-foreground min-h-[32px] max-h-20"
        />
        <Button
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={sendMessage}
          disabled={!input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Chat section with tabs per editor (for sidebar "Chat" view)
export function EditorChatSection({
  editors,
  mentionOptions,
}: {
  editors: string[];
  mentionOptions: string[];
}) {
  const [activeEditor, setActiveEditor] = useState(editors[0] || "");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load unread counts
  useEffect(() => {
    const loadUnread = async () => {
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
    };
    loadUnread();

    const channel = supabase
      .channel("chat-unread-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_edit_chat" },
        () => loadUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (editors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No editors found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor tabs */}
      <div className="flex gap-1 overflow-x-auto p-2 border-b flex-wrap">
        {editors.map((name) => (
          <button
            key={name}
            onClick={() => setActiveEditor(name)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap relative",
              activeEditor === name
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {name}
            {(unreadCounts[name] || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCounts[name]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active chat */}
      <div className="flex-1 p-3">
        {activeEditor && (
          <EditorChat
            editorName={activeEditor}
            senderName="Admin"
            senderType="admin"
            mentionOptions={mentionOptions}
          />
        )}
      </div>
    </div>
  );
}
