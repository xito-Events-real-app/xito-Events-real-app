import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Eye, X } from "lucide-react";

const INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const STORAGE_KEY = "file_reminder_last_shown";

interface TodayEvent {
  clientName: string;
  eventName: string;
  registeredDateTimeAD: string;
}

export function FileReminderPopup() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<TodayEvent[]>([]);

  useEffect(() => {
    const check = async () => {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last && Date.now() - Number(last) < INTERVAL_MS) return;

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("files_management")
        .select("client_name, event_name, registered_date_time_ad, event_date_ad")
        .eq("deleted_or_not", false)
        .eq("event_date_ad", today);

      if (!data || data.length === 0) return;

      const unique = new Map<string, TodayEvent>();
      for (const r of data) {
        const key = r.registered_date_time_ad + r.event_name;
        if (!unique.has(key)) {
          unique.set(key, {
            clientName: r.client_name || "Unknown",
            eventName: r.event_name || "",
            registeredDateTimeAD: r.registered_date_time_ad,
          });
        }
      }
      setEvents(Array.from(unique.values()));
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    };

    check();
    const interval = setInterval(check, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md bg-[hsl(220,25%,10%)] text-[hsl(220,15%,95%)] border-[hsl(220,20%,18%)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[hsl(220,15%,95%)]">
            <CalendarClock className="w-5 h-5 text-[hsl(40,95%,50%)]" />
            Today's Events Reminder
          </DialogTitle>
          <DialogDescription className="text-[hsl(220,15%,65%)]">
            {events.length} event{events.length > 1 ? "s" : ""} scheduled for today
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {events.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[hsl(220,25%,14%)] p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{e.clientName}</p>
                  <p className="text-xs text-[hsl(220,15%,55%)]">{e.eventName}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button variant="outline" onClick={() => setOpen(false)} className="w-full border-[hsl(220,20%,25%)] text-[hsl(220,15%,65%)]">
          <X className="w-4 h-4 mr-1" /> Dismiss
        </Button>
      </DialogContent>
    </Dialog>
  );
}
