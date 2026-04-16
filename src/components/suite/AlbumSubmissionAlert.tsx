import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Copy, AlertTriangle } from "lucide-react";

interface Submission {
  id: string;
  registered_date_time_ad: string;
  client_name: string;
  bride_name: string;
  groom_name: string;
  selected_date: string;
  custom_text: string;
  album_details: { name: string; count: number }[];
  sent_to: string;
  popup_view_count: number;
  created_at: string;
}

function daysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const AlbumSubmissionAlert = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const isLocked = isEmergency && countdown > 0;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("album_selection_submissions")
        .select("*")
        .eq("handled", false)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) return;

      const mapped: Submission[] = data.map((row) => ({
        id: row.id,
        registered_date_time_ad: row.registered_date_time_ad,
        client_name: row.client_name,
        bride_name: row.bride_name,
        groom_name: row.groom_name,
        selected_date: row.selected_date,
        custom_text: row.custom_text,
        album_details: (row.album_details as any) || [],
        sent_to: row.sent_to,
        popup_view_count: (row as any).popup_view_count || 0,
        created_at: row.created_at,
      }));

      setSubmissions(mapped);
      setIsEmergency(mapped.some((s) => s.popup_view_count >= 35));
      setOpen(true);

      // Increment popup_view_count for each
      for (const s of mapped) {
        await supabase
          .from("album_selection_submissions")
          .update({ popup_view_count: s.popup_view_count + 1 } as any)
          .eq("id", s.id);
      }
    };
    load();
  }, []);

  // Countdown timer for emergency mode
  useEffect(() => {
    if (!isEmergency || !open) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isEmergency, open, countdown]);

  const handleMarkSent = useCallback(async (id: string) => {
    await supabase
      .from("album_selection_submissions")
      .update({ handled: true, handled_response: "yes" } as any)
      .eq("id", id);
    setSubmissions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) setOpen(false);
      return next;
    });
  }, []);

  const handleCopyFiles = useCallback((registeredDateTimeAD: string) => {
    navigate(`/client-tracker/client/${encodeURIComponent(registeredDateTimeAD)}`);
    setOpen(false);
  }, [navigate]);

  const handleOpenChange = useCallback((val: boolean) => {
    if (isLocked) return; // Block closing during emergency countdown
    setOpen(val);
  }, [isLocked]);

  if (submissions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-lg rounded-2xl bg-white max-h-[85vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => { if (isLocked) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isLocked) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-800">
            {isEmergency ? "⚠️ EMERGENCY: Pending Albums" : "Pending Album Submissions"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {submissions.length} album{submissions.length > 1 ? "s" : ""} waiting to be sent for design
          </DialogDescription>
        </DialogHeader>

        {/* Emergency banner */}
        {isEmergency && (
          <div className="rounded-lg bg-red-50 border border-red-300 p-3 text-center">
            <AlertTriangle className="inline-block h-5 w-5 text-red-600 mr-1.5 -mt-0.5" />
            <span className="text-red-700 font-semibold text-sm">
              {countdown > 0
                ? `Locked for ${countdown}s — Have you sent these for design?`
                : "Buttons unlocked — please act now!"}
            </span>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {submissions.map((s) => {
            const days = daysAgo(s.created_at);
            return (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm space-y-0.5">
                    <p className="font-semibold text-gray-800">{s.client_name}</p>
                    <p className="text-gray-500 text-xs">
                      {s.bride_name} &amp; {s.groom_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Sent to</p>
                    <p className="text-lg font-bold text-gray-900">{s.sent_to}</p>
                  </div>
                </div>

                {/* Days ago badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    days >= 7 ? "bg-red-100 text-red-700" : days >= 3 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  }`}>
                    {days === 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`}
                  </span>
                  {s.popup_view_count >= 35 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-medium">
                      OVERDUE
                    </span>
                  )}
                </div>

                {/* Album details */}
                {s.album_details.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {s.album_details.map((a, i) => (
                      <p key={i}>• {a.name}: {a.count} photos</p>
                    ))}
                  </div>
                )}

                {/* Per-card actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                    disabled={isLocked}
                    onClick={() => handleMarkSent(s.id)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Yes, sent for design
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-8"
                    disabled={isLocked}
                    onClick={() => handleCopyFiles(s.registered_date_time_ad)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy files
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlbumSubmissionAlert;
