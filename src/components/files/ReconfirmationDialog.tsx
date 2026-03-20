import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, MessageCircle, Download } from "lucide-react";
import { FileRecord } from "@/lib/files-api";
import { downloadConfirmationPDF } from "@/lib/file-confirmation-pdf";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReconfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileRecord | null;
  onConfirm: (fileId: string) => Promise<void>;
}

export function ReconfirmationDialog({ open, onOpenChange, file, onConfirm }: ReconfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!file) return null;

  const nepaliDate = file.registered_date_bs ||
    (file.event_year && file.event_month && file.event_day
      ? `${file.event_year}/${file.event_month}/${file.event_day}`
      : "-");

  const handleConfirmOnly = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(file.id);
      toast.success("File confirmed successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmAndWhatsApp = async () => {
    setIsConfirming(true);
    try {
      // Download PDF first
      downloadConfirmationPDF(file);

      // Look up freelancer WhatsApp number
      const { data: freelancerData } = await supabase
        .from("freelancers_cache")
        .select("whatsapp_no, contact_no")
        .eq("name", file.freelancer_name || "")
        .limit(1)
        .single();

      const whatsappNo = freelancerData?.whatsapp_no || freelancerData?.contact_no || "";

      // Compose WhatsApp message
      const message = `*Wedding Tales Nepal - File Backup Confirmation* ✅

Hi ${file.freelancer_name || ""},\nyour files have been copied successfully!

📋 *Details:*
• Client: ${file.client_name || "-"}
• Event: ${file.event_name || "-"}
• Date (BS): ${nepaliDate}
• Card: ${file.card_label || "-"}
• Format: ${file.format_type || "-"}
• Size: ${file.size_gb ? `${file.size_gb} GB` : "-"}
• Backed up to: ${file.backup_1_device_name || "-"}

📄 PDF receipt sent separately.

Thank you! 🙏`;

      if (whatsappNo) {
        openWhatsApp(whatsappNo, message);
      } else {
        toast.info("No WhatsApp number found for this freelancer. PDF downloaded.");
      }

      await onConfirm(file.id);
      toast.success("File confirmed & PDF downloaded");
      onOpenChange(false);
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Confirm File Backup</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* File summary */}
          <div className="bg-muted/60 rounded-lg p-3 space-y-2 text-sm border border-border">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-bold">{file.client_name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Event</span>
              <span className="font-bold">{file.event_name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date (BS)</span>
              <span className="font-bold">{nepaliDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Freelancer</span>
              <span className="font-bold">{file.freelancer_name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="outline" className="text-xs font-bold">{file.freelancer_type || "-"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Card / Format</span>
              <span className="font-bold">{file.card_label || "-"} / {file.format_type || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="font-bold">{file.size_gb ? `${file.size_gb} GB` : "-"}</span>
            </div>

            <div className="h-px bg-border my-1" />

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">1st Backup Device</span>
              <span className="font-bold text-emerald-600">{file.backup_1_device_name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Path</span>
              <span className="font-mono text-xs truncate max-w-[180px]">{file.final_generated_path || "-"}</span>
            </div>
          </div>

          {/* Download PDF only button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => downloadConfirmationPDF(file)}
          >
            <Download className="w-4 h-4" />
            Download PDF Receipt
          </Button>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirmAndWhatsApp}
            disabled={isConfirming}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <MessageCircle className="w-4 h-4" />
            Confirm & Send WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={handleConfirmOnly}
            disabled={isConfirming}
            className="w-full gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm Only (Skip)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
