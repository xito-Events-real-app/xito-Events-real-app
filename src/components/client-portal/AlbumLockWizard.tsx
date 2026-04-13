import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, ArrowRight, ArrowLeft, Lock, MessageCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlbumDef, AlbumSelection } from "@/lib/album-selection-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { NepaliCalendar } from "@/components/form/NepaliCalendar";
import { NepaliDateObject, getCurrentBSDate, formatBSDate, adToBS } from "@/lib/nepali-date";

interface EventInfo {
  eventName: string;
  eventDateAD: string;
}

interface AlbumLockWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albums: AlbumDef[];
  selections: AlbumSelection[];
  brideName: string;
  groomName: string;
  firstEventDateAD: string;
  clientName?: string;
  registeredDateTimeAD?: string;
  events?: EventInfo[];
}

type DateMode = "ad" | "bs";

const CONTACTS = [
  { name: "Benjona", phone: "9705255025" },
  { name: "Nikit", phone: "9749494560" },
];

const AlbumLockWizard = ({
  open,
  onOpenChange,
  albums,
  selections,
  brideName,
  groomName,
  firstEventDateAD,
  clientName = "",
  registeredDateTimeAD = "",
  events = [],
}: AlbumLockWizardProps) => {
  const [step, setStep] = useState(1);

  // Step 2 state
  const [editBride, setEditBride] = useState(brideName.split(" ")[0] || "");
  const [editGroom, setEditGroom] = useState(groomName.split(" ")[0] || "");
  const [dateMode, setDateMode] = useState<DateMode | null>(null);

  // Smart default date: find wedding event, else first event
  const smartDefaultDateAD = useMemo(() => {
    const weddingEvent = events.find(e => e.eventName.toLowerCase().includes('wedding'));
    const target = weddingEvent || events[0];
    if (target?.eventDateAD) {
      const d = new Date(target.eventDateAD);
      if (!isNaN(d.getTime())) return d;
    }
    if (firstEventDateAD) {
      const d = new Date(firstEventDateAD);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [events, firstEventDateAD]);

  const [adDate, setAdDate] = useState<Date | undefined>(smartDefaultDateAD);

  const smartDefaultBS = useMemo(() => {
    return adToBS(smartDefaultDateAD);
  }, [smartDefaultDateAD]);

  const [bsDates, setBsDates] = useState<NepaliDateObject[]>([smartDefaultBS]);

  const albumCounts = useMemo(() => {
    return albums.map(a => ({
      name: a.name,
      type: a.type,
      count: selections.filter(s => s.album_type === a.type).length,
    }));
  }, [albums, selections]);

  const selectedDateDisplay = useMemo(() => {
    if (dateMode === "ad" && adDate) return `AD: ${format(adDate, "PPP")}`;
    if (dateMode === "bs" && bsDates.length > 0) return `BS: ${formatBSDate(bsDates[0])}`;
    return "No date selected";
  }, [dateMode, adDate, bsDates]);

  const buildWhatsAppMessage = (contactName: string) => {
    const albumLines = albumCounts
      .map(a => `- ${a.name}: ${a.count} photos`)
      .join("\n");

    return `Hi ${contactName},

Album selection completed! 🎉

Bride: ${editBride}
Groom: ${editGroom}
Date: ${selectedDateDisplay}

Album Details:
${albumLines}

Please proceed with the design.`;
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep(1);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl p-0 overflow-hidden bg-white">
        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-5">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={cn(
                "h-1 rounded-full flex-1 transition-colors",
                s <= step ? "bg-[hsl(350,80%,65%)]" : "bg-gray-200"
              )}
            />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="px-5 pb-6 pt-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-gray-800">Confirm Selection</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Have you finalized your photo selection for all albums?
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              {albumCounts.map(a => (
                <div key={a.type} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-sm">
                  <span className="text-gray-700">{a.name}</span>
                  <span className={cn(
                    "font-medium",
                    a.count >= 140 ? "text-green-600" : "text-amber-600"
                  )}>
                    {a.count}/140
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                Not Yet
              </Button>
              <Button
                className="flex-1 bg-[hsl(350,80%,65%)] hover:bg-[hsl(350,80%,58%)] text-white"
                onClick={() => setStep(2)}
              >
                Yes, Proceed <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="px-5 pb-6 pt-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-gray-800">Album Details</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Confirm names and date for the album design
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Bride (First Name)</Label>
                  <Input value={editBride} onChange={e => setEditBride(e.target.value)} className="h-10 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Groom (First Name)</Label>
                  <Input value={editGroom} onChange={e => setEditGroom(e.target.value)} className="h-10 mt-1" />
                </div>
              </div>

              {/* Formal info note */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  The date you select below will be printed on your album. Please ensure it is accurate before proceeding.
                </p>
              </div>

              {/* Date mode selection */}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Choose date format</Label>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setDateMode("ad")}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all",
                      dateMode === "ad"
                        ? "bg-[hsl(350,80%,65%)] text-white border-[hsl(350,80%,65%)] shadow-md"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    AD (English)
                  </button>
                  <button
                    onClick={() => setDateMode("bs")}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all",
                      dateMode === "bs"
                        ? "bg-[hsl(350,80%,65%)] text-white border-[hsl(350,80%,65%)] shadow-md"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    BS (Nepali)
                  </button>
                </div>

                {/* Show calendar only after choosing date mode */}
                {dateMode === "ad" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !adDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {adDate ? format(adDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[600]" align="start">
                      <Calendar
                        mode="single"
                        selected={adDate}
                        onSelect={setAdDate}
                        defaultMonth={smartDefaultDateAD}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {dateMode === "bs" && (
                  <div className="max-h-[260px] overflow-auto rounded-lg border border-gray-200">
                    <NepaliCalendar
                      selectedDates={bsDates}
                      onDateSelect={(dates) => setBsDates(dates.length > 0 ? [dates[dates.length - 1]] : [])}
                      multiSelect={false}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1 bg-[hsl(350,80%,65%)] hover:bg-[hsl(350,80%,58%)] text-white"
                onClick={() => setStep(3)}
                disabled={!editBride || !editGroom || !dateMode}
              >
                Next <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="px-5 pb-6 pt-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-gray-800">Send via WhatsApp</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Choose who to send the album details to
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-600 space-y-1">
              <p><span className="font-medium">Bride:</span> {editBride}</p>
              <p><span className="font-medium">Groom:</span> {editGroom}</p>
              <p><span className="font-medium">Date:</span> {selectedDateDisplay}</p>
              {albumCounts.map(a => (
                <p key={a.type}>• {a.name}: {a.count} photos</p>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {CONTACTS.map(c => (
                <button
                  key={c.phone}
                  onClick={async () => {
                    try {
                      await supabase.from("album_selection_submissions").insert({
                        registered_date_time_ad: registeredDateTimeAD,
                        client_name: clientName,
                        bride_name: editBride,
                        groom_name: editGroom,
                        selected_date: selectedDateDisplay,
                        custom_text: "",
                        album_details: albumCounts.map(a => ({ name: a.name, count: a.count })),
                        sent_to: c.name,
                      } as any);
                    } catch (e) {
                      console.error("Failed to save album submission", e);
                    }
                    openWhatsApp(c.phone, buildWhatsAppMessage(c.name));
                    handleOpenChange(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <MessageCircle className="h-5 w-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AlbumLockWizard;
