import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, ArrowRight, Flame, Clock, MessageSquare } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  created_at: string;
  editor_name: string;
  notification_type: string;
  title: string;
  description: string;
  tracker_row_id: string | null;
  is_read: boolean;
}

const TYPE_ICONS: Record<string, typeof ArrowRight> = {
  status_change: ArrowRight,
  assignment: Flame,
  urgency: Flame,
  deadline: Clock,
  chat: MessageSquare,
};

const TYPE_COLORS: Record<string, string> = {
  status_change: "text-blue-500",
  assignment: "text-amber-500",
  urgency: "text-red-500",
  deadline: "text-purple-500",
  chat: "text-green-500",
};

export function EditorNotificationBell({ editorName }: { editorName: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("video_edit_notifications")
      .select("*")
      .eq("editor_name", editorName)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) setNotifications(data as Notification[]);
  }, [editorName]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notif-${editorName}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "video_edit_notifications" },
        (payload) => {
          const n = payload.new as Notification;
          if (n.editor_name === editorName) {
            setNotifications((prev) => [n, ...prev].slice(0, 30));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editorName]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("video_edit_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] gap-1"
              onClick={markAllRead}
            >
              <Check className="w-3 h-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-8">
              No notifications yet
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICONS[n.notification_type] || ArrowRight;
              const color = TYPE_COLORS[n.notification_type] || "text-muted-foreground";
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-3 border-b border-border/50 last:border-0 transition-colors",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to push notification from admin side
export async function pushEditorNotification(
  editorName: string,
  type: string,
  title: string,
  description: string,
  trackerRowId?: string
) {
  if (!editorName) return;
  await supabase.from("video_edit_notifications").insert({
    editor_name: editorName,
    notification_type: type,
    title,
    description,
    tracker_row_id: trackerRowId || null,
  });
}
