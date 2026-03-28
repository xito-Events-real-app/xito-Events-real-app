import { useState } from "react";
import { ExternalLink, Copy, Send, Check, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getClientPortalUrl, generatePortalWhatsAppMessage } from "@/lib/client-contact-api";
import { toast } from "@/hooks/use-toast";

interface ClientLinkSectionProps {
  registeredDateTimeAD: string;
  clientName: string;
  contactNo: string;
  whatsappNo: string;
  brideFullName: string;
  brideWhatsapp: string;
  groomFullName: string;
  groomWhatsapp: string;
}

const ClientLinkSection = ({
  registeredDateTimeAD,
  clientName,
  contactNo,
  whatsappNo,
  brideFullName,
  brideWhatsapp,
  groomFullName,
  groomWhatsapp,
}: ClientLinkSectionProps) => {
  const [copied, setCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const portalUrl = getClientPortalUrl(registeredDateTimeAD, clientName);
  const message = generatePortalWhatsAppMessage(registeredDateTimeAD, clientName);

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const recipients = [
    { label: `${clientName} (Contact)`, phone: contactNo },
    { label: `${clientName} (WhatsApp)`, phone: whatsappNo },
    { label: `${brideFullName || 'Bride'} (WhatsApp)`, phone: brideWhatsapp },
    { label: `${groomFullName || 'Groom'} (WhatsApp)`, phone: groomWhatsapp },
  ].filter(r => r.phone);

  const sendToWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setShowSendDialog(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[hsl(220,25%,12%)] border-white/10">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <ExternalLink className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Client Portal Link</h3>
              <p className="text-xs text-white/40">Send this to clients via WhatsApp</p>
            </div>
          </div>

          {/* URL Display */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/60 break-all font-mono">{portalUrl}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              onClick={() => setShowSendDialog(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Link
            </Button>
          </div>

          {/* Preview Link */}
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-primary hover:underline"
          >
            Preview portal in new tab →
          </a>
        </CardContent>
      </Card>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-sm bg-[hsl(220,25%,12%)] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              Send Link To
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {recipients.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No contact numbers available</p>
            ) : (
              recipients.map((r, i) => (
                <button
                  key={i}
                  onClick={() => sendToWhatsApp(r.phone)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.label}</p>
                    <p className="text-xs text-white/40">{r.phone}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientLinkSection;
