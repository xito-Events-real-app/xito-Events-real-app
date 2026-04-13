import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, HelpCircle, Copy } from "lucide-react";

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
}

const AlbumSubmissionAlert = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("album_selection_submissions")
        .select("*")
        .eq("handled", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const row = data[0];
        setSubmission({
          id: row.id,
          registered_date_time_ad: row.registered_date_time_ad,
          client_name: row.client_name,
          bride_name: row.bride_name,
          groom_name: row.groom_name,
          selected_date: row.selected_date,
          custom_text: row.custom_text,
          album_details: (row.album_details as any) || [],
          sent_to: row.sent_to,
        });
        setOpen(true);
      }
    };
    fetch();
  }, []);

  const handleResponse = async (response: "yes" | "no" | "unknown" | "copy") => {
    if (!submission) return;

    if (response === "yes") {
      await supabase
        .from("album_selection_submissions")
        .update({ handled: true, handled_response: "yes" } as any)
        .eq("id", submission.id);
      setOpen(false);
    } else if (response === "copy") {
      navigate(`/client-tracker/client/${encodeURIComponent(submission.registered_date_time_ad)}`);
      setOpen(false);
    } else {
      setOpen(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-800">
            Album Selection Completed
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            A client has completed their album selection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Client info */}
          <div className="p-3 rounded-lg bg-gray-50 text-sm space-y-1.5">
            <p><span className="font-medium text-gray-700">Client:</span> {submission.client_name}</p>
            <p><span className="font-medium text-gray-700">Bride:</span> {submission.bride_name}</p>
            <p><span className="font-medium text-gray-700">Groom:</span> {submission.groom_name}</p>
            <p><span className="font-medium text-gray-700">Date:</span> {submission.selected_date}</p>
            {submission.custom_text && (
              <p><span className="font-medium text-gray-700">Album Text:</span> {submission.custom_text}</p>
            )}
          </div>

          {/* Album details */}
          {submission.album_details.length > 0 && (
            <div className="p-3 rounded-lg bg-gray-50 text-sm space-y-1">
              {submission.album_details.map((a, i) => (
                <p key={i} className="text-gray-600">• {a.name}: {a.count} photos</p>
              ))}
            </div>
          )}

          {/* Sent to - prominent */}
          <div className="text-center py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Sent to</p>
            <p className="text-4xl font-bold text-gray-900">{submission.sent_to}</p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleResponse("yes")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Yes, I have sent them for design
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleResponse("no")}
            >
              <XCircle className="mr-2 h-4 w-4" />
              I haven't sent them for design
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleResponse("unknown")}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              I don't know
            </Button>
            <Button
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => handleResponse("copy")}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy original files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlbumSubmissionAlert;
