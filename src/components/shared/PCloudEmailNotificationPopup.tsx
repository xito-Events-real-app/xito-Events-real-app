import { useState, useEffect, useCallback } from "react";
import { CloudUpload, Copy, Check, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sharePCloudFolder } from "@/lib/pcloud-api";

const LS_KEY = 'pcloud-email-notif';
const MAX_SHOWS = 3;
const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface EmailEntry {
  id: string;
  email: string;
  client_name: string;
  registered_date_time_ad: string;
  created_at: string;
}

function getShowState(): { count: number; lastShown: number } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lastShown: 0 };
}

function recordShow() {
  const state = getShowState();
  localStorage.setItem(LS_KEY, JSON.stringify({ count: state.count + 1, lastShown: Date.now() }));
}

function canShow(): boolean {
  const { count, lastShown } = getShowState();
  if (count >= MAX_SHOWS) return false;
  if (Date.now() - lastShown < INTERVAL_MS) return false;
  return true;
}

export function PCloudEmailNotificationPopup() {
  const [entries, setEntries] = useState<EmailEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  // Cache client info for folder path resolution
  const [clientInfoMap, setClientInfoMap] = useState<Record<string, { event_month?: string; event_year?: string; client_name?: string }>>({}); 

  useEffect(() => {
    if (!canShow()) return;
    const check = async () => {
      const { data } = await supabase.from('client_pcloud_emails')
        .select('id, email, client_name, registered_date_time_ad, created_at')
        .eq('is_seen', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setEntries(data as EmailEntry[]);
        setOpen(true);
        recordShow();

        // Fetch client info for folder path building
        const uniqueIds = [...new Set(data.map(d => d.registered_date_time_ad))];
        const { data: clients } = await supabase.from('clients_cache')
          .select('registered_date_time_ad, client_name, event_month, event_year')
          .in('registered_date_time_ad', uniqueIds);
        if (clients) {
          const map: Record<string, any> = {};
          for (const c of clients) {
            map[c.registered_date_time_ad] = c;
          }
          setClientInfoMap(map);
        }
      }
    };
    const t = setTimeout(check, 3000);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = useCallback(async () => {
    setOpen(false);
    if (entries.length > 0) {
      const ids = entries.map(e => e.id);
      await supabase.from('client_pcloud_emails').update({ is_seen: true } as any).in('id', ids);
    }
  }, [entries]);

  const handleCopy = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    toast.success(`Copied: ${email}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInvite = async (entry: EmailEntry) => {
    const client = clientInfoMap[entry.registered_date_time_ad];
    const NEPALI_MONTHS: Record<number, string> = {
      1: "BAISAKH", 2: "JESTHA", 3: "ASHADH", 4: "SHRAWAN",
      5: "BHADRA", 6: "ASHWIN", 7: "KARTIK", 8: "MANGSIR",
      9: "POUSH", 10: "MAGH", 11: "FALGUN", 12: "CHAITRA",
    };
    const monthNum = parseInt(client?.event_month || '', 10);
    const monthName = NEPALI_MONTHS[monthNum];
    if (!monthName || !client?.event_year || !client?.client_name) {
      toast.error('Client folder info not available');
      return;
    }
    const folderPath = `/${monthName} EVENTS ${client.event_year}/${client.client_name}`;
    setInvitingId(entry.id);
    try {
      await sharePCloudFolder(folderPath, entry.email);
      setInvitedIds(prev => new Set(prev).add(entry.id));
      toast.success(`Invited ${entry.email} to pCloud folder`);
    } catch (err: any) {
      toast.error(`Invite failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setInvitingId(null);
    }
  };

  if (!open || entries.length === 0) return null;

  const grouped = entries.reduce<Record<string, EmailEntry[]>>((acc, e) => {
    const key = e.client_name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden border border-violet-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CloudUpload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">New pCloud Emails</h3>
              <p className="text-[10px] text-gray-500">{entries.length} new email{entries.length > 1 ? 's' : ''} to invite</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {Object.entries(grouped).map(([clientName, emails]) => (
            <div key={clientName}>
              <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold mb-2">{clientName}</p>
              <div className="space-y-1.5">
                {emails.map(e => (
                  <div key={e.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-gray-700 flex-1 truncate">{e.email}</span>
                    <button
                      onClick={() => handleInvite(e)}
                      disabled={invitingId === e.id || invitedIds.has(e.id)}
                      className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-50"
                      title="Invite to pCloud folder"
                    >
                      {invitingId === e.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                      ) : invitedIds.has(e.id) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopy(e.email, e.id)}
                      className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      {copiedId === e.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <Button onClick={handleDismiss} className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl h-10 text-sm font-semibold">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
