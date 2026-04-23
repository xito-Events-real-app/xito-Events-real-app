import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StarRating } from "@/components/ui/star-rating";
import { CitySelector } from "@/components/vendors/CitySelector";
import {
  OFFICIAL_VENUE_TYPES,
  XitoGlobalVenue,
  addVenue,
  updateVenue,
  deleteVenue,
  VenueDraft,
} from "@/lib/xito-global-venues-api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

interface AddEditVenueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: XitoGlobalVenue | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

const EMPTY: VenueDraft = {
  venue_type: "Banquet",
  venue_name: "",
  city: "",
  area: "",
  location_briefing: "",
  company_whatsapp: "",
  company_contact: "",
  gmail: "",
  owner1_name: "",
  owner1_contact: "",
  owner1_whatsapp: "",
  owner2_name: "",
  owner2_contact: "",
  owner2_whatsapp: "",
  google_map: "",
  website: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  youtube: "",
  rating: 0,
};

export function AddEditVenueDrawer({
  open,
  onOpenChange,
  venue,
  onSaved,
  onDeleted,
}: AddEditVenueDrawerProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<VenueDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      if (venue) {
        const { id, created_at, updated_at, source, ...rest } = venue;
        setDraft(rest);
      } else {
        setDraft(EMPTY);
      }
    }
  }, [open, venue]);

  const set = <K extends keyof VenueDraft>(k: K, v: VenueDraft[K]) =>
    setDraft(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!draft.venue_name.trim()) {
      toast({ title: "Venue name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (venue) {
        await updateVenue(venue.id, draft);
        toast({ title: "Venue updated" });
      } else {
        await addVenue(draft);
        toast({ title: "Venue added" });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const friendly = msg.toLowerCase().includes("duplicate")
        ? "A venue with this name and city already exists."
        : msg;
      toast({ title: "Save failed", description: friendly, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!venue) return;
    setDeleting(true);
    try {
      await deleteVenue(venue.id);
      toast({ title: "Venue deleted" });
      setConfirmDelete(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Delete failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{venue ? "Edit Venue" : "Add Venue"}</SheetTitle>
            <SheetDescription>
              {venue ? "Update the details below." : "Fill in the venue details. Saved to XITO GLOBAL."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
            <Section title="Basics">
              <Field label="Venue Type *">
                <Select value={draft.venue_type} onValueChange={v => set("venue_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(OFFICIAL_VENUE_TYPES as readonly string[]).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Venue Name *">
                <Input value={draft.venue_name} onChange={e => set("venue_name", e.target.value)} placeholder="e.g. Hyatt Regency" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="City">
                  <CitySelector value={draft.city} onChange={v => set("city", v)} />
                </Field>
                <Field label="Area">
                  <Input value={draft.area} onChange={e => set("area", e.target.value)} placeholder="e.g. Boudha" />
                </Field>
              </div>
              <Field label="Location Briefing">
                <Textarea
                  value={draft.location_briefing}
                  onChange={e => set("location_briefing", e.target.value)}
                  placeholder="Notes about access, parking, landmarks..."
                  rows={3}
                />
              </Field>
            </Section>

            <Section title="Company Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="WhatsApp Number">
                  <Input value={draft.company_whatsapp} onChange={e => set("company_whatsapp", e.target.value)} />
                </Field>
                <Field label="Contact Number">
                  <Input value={draft.company_contact} onChange={e => set("company_contact", e.target.value)} />
                </Field>
              </div>
              <Field label="Gmail">
                <Input type="email" value={draft.gmail} onChange={e => set("gmail", e.target.value)} />
              </Field>
            </Section>

            <Section title="Owner 1">
              <Field label="Name">
                <Input value={draft.owner1_name} onChange={e => set("owner1_name", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Contact Number">
                  <Input value={draft.owner1_contact} onChange={e => set("owner1_contact", e.target.value)} />
                </Field>
                <Field label="WhatsApp Number">
                  <Input value={draft.owner1_whatsapp} onChange={e => set("owner1_whatsapp", e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Owner 2">
              <Field label="Name">
                <Input value={draft.owner2_name} onChange={e => set("owner2_name", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Contact Number">
                  <Input value={draft.owner2_contact} onChange={e => set("owner2_contact", e.target.value)} />
                </Field>
                <Field label="WhatsApp Number">
                  <Input value={draft.owner2_whatsapp} onChange={e => set("owner2_whatsapp", e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Online Presence">
              <Field label="Google Map">
                <Input value={draft.google_map} onChange={e => set("google_map", e.target.value)} placeholder="Maps URL" />
              </Field>
              <Field label="Website">
                <Input value={draft.website} onChange={e => set("website", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Instagram">
                  <Input value={draft.instagram} onChange={e => set("instagram", e.target.value)} />
                </Field>
                <Field label="Facebook">
                  <Input value={draft.facebook} onChange={e => set("facebook", e.target.value)} />
                </Field>
                <Field label="TikTok">
                  <Input value={draft.tiktok} onChange={e => set("tiktok", e.target.value)} />
                </Field>
                <Field label="YouTube">
                  <Input value={draft.youtube} onChange={e => set("youtube", e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Rating">
              <div className="flex items-center gap-3">
                <StarRating
                  value={draft.rating || 0}
                  size="lg"
                  readonly={false}
                  onChange={v => set("rating", v)}
                />
                <span className="text-sm text-muted-foreground">{draft.rating || 0} / 5</span>
              </div>
            </Section>
          </div>

          <SheetFooter className="flex-row justify-between sm:justify-between gap-2">
            <div>
              {venue && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {venue ? "Save Changes" : "Add Venue"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this venue?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the venue from XITO GLOBAL. Existing client event records that reference this venue name are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}