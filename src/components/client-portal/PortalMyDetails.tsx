import { useState, useEffect, useCallback } from "react";
import { Save, Heart, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ContactData {
  brideFullName: string;
  brideContactNumber: string;
  brideWhatsappNumber: string;
  brideBackupNumber: string;
  brideBackupRelation: string;
  brideInstagram: string;
  brideHomeCity: string;
  brideHomeArea: string;
  groomFullName: string;
  groomContactNumber: string;
  groomWhatsappNumber: string;
  groomBackupNumber: string;
  groomBackupRelation: string;
  groomInstagram: string;
  groomHomeCity: string;
  groomHomeArea: string;
}

const emptyContact: ContactData = {
  brideFullName: '', brideContactNumber: '', brideWhatsappNumber: '',
  brideBackupNumber: '', brideBackupRelation: '', brideInstagram: '',
  brideHomeCity: '', brideHomeArea: '',
  groomFullName: '', groomContactNumber: '', groomWhatsappNumber: '',
  groomBackupNumber: '', groomBackupRelation: '', groomInstagram: '',
  groomHomeCity: '', groomHomeArea: '',
};

interface PortalMyDetailsProps {
  registeredDateTimeAD: string;
  initialData: ContactData | null;
  onSaved: () => void;
}

function isValidPhone(v: string) {
  return /^\d{10}$/.test(v.replace(/\s/g, ''));
}

const PortalMyDetails = ({ registeredDateTimeAD, initialData, onSaved }: PortalMyDetailsProps) => {
  const [form, setForm] = useState<ContactData>(initialData || emptyContact);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const set = useCallback((key: keyof ContactData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const requiredFilled = !!(
    form.brideFullName.trim() && isValidPhone(form.brideContactNumber) && isValidPhone(form.brideWhatsappNumber) &&
    form.groomFullName.trim() && isValidPhone(form.groomContactNumber) && isValidPhone(form.groomWhatsappNumber)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert to cache
      await supabase.from('contact_details_cache').upsert({
        registered_date_time_ad: registeredDateTimeAD,
        bride_full_name: form.brideFullName,
        bride_contact_number: form.brideContactNumber,
        bride_whatsapp_number: form.brideWhatsappNumber,
        bride_backup_number: form.brideBackupNumber,
        bride_backup_relation: form.brideBackupRelation,
        bride_instagram: form.brideInstagram,
        bride_home_city: form.brideHomeCity,
        bride_home_area: form.brideHomeArea,
        groom_full_name: form.groomFullName,
        groom_contact_number: form.groomContactNumber,
        groom_whatsapp_number: form.groomWhatsappNumber,
        groom_backup_number: form.groomBackupNumber,
        groom_backup_relation: form.groomBackupRelation,
        groom_instagram: form.groomInstagram,
        groom_home_city: form.groomHomeCity,
        groom_home_area: form.groomHomeArea,
        synced_to_sheet: false,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'registered_date_time_ad' });

      // Sync to sheets in background
      supabase.functions.invoke('google-sheets', {
        body: {
          action: 'updateClientContactDetails',
          data: {
            registeredDateTimeAD,
            updates: {
              brideFullName: form.brideFullName,
              brideContactNumber: form.brideContactNumber,
              brideWhatsappNumber: form.brideWhatsappNumber,
              brideBackupNumber: form.brideBackupNumber,
              brideBackupRelation: form.brideBackupRelation,
              brideInstagram: form.brideInstagram,
              brideHomeCity: form.brideHomeCity,
              brideHomeArea: form.brideHomeArea,
              groomFullName: form.groomFullName,
              groomContactNumber: form.groomContactNumber,
              groomWhatsappNumber: form.groomWhatsappNumber,
              groomBackupNumber: form.groomBackupNumber,
              groomBackupRelation: form.groomBackupRelation,
              groomInstagram: form.groomInstagram,
              groomHomeCity: form.groomHomeCity,
              groomHomeArea: form.groomHomeArea,
            }
          }
        }
      }).catch(err => console.warn('Sheet sync failed:', err));

      setSaved(true);
      onSaved();
      toast({ title: "Saved ✓", description: "Your details have been saved" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, onChange, required, placeholder, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; type?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-white/40 uppercase tracking-wide flex items-center gap-1">
        {label}
        {required && <span className="text-[hsl(350,80%,65%)]">*</span>}
      </label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-[hsl(350,80%,65%/0.4)] focus:ring-[hsl(350,80%,65%/0.1)] h-10 text-sm rounded-lg"
      />
    </div>
  );

  return (
    <div className="pb-28 px-4 space-y-6">
      {/* Header */}
      <div className="text-center pt-6 pb-2">
        <Heart className="h-5 w-5 text-[hsl(350,80%,65%)] mx-auto mb-2" />
        <h2 className="text-xl font-bold text-white">Your Details</h2>
        <p className="text-xs text-white/30 mt-1">Fields marked * are required</p>
      </div>

      {/* Bride Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
          <h3 className="text-sm font-semibold text-pink-400/80 uppercase tracking-wide">Bride</h3>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
          <Field label="Full Name" value={form.brideFullName} onChange={v => set('brideFullName', v)} required placeholder="Enter bride's full name" />
          <Field label="Contact Number" value={form.brideContactNumber} onChange={v => set('brideContactNumber', v)} required placeholder="10 digit number" type="tel" />
          <Field label="WhatsApp Number" value={form.brideWhatsappNumber} onChange={v => set('brideWhatsappNumber', v)} required placeholder="10 digit WhatsApp" type="tel" />
          <Field label="Backup Number" value={form.brideBackupNumber} onChange={v => set('brideBackupNumber', v)} placeholder="Family member's number" type="tel" />
          <Field label="Backup Relation" value={form.brideBackupRelation} onChange={v => set('brideBackupRelation', v)} placeholder="e.g. Father, Brother" />
          <Field label="Instagram" value={form.brideInstagram} onChange={v => set('brideInstagram', v)} placeholder="@username" />
          <Field label="Home City" value={form.brideHomeCity} onChange={v => set('brideHomeCity', v)} placeholder="City name" />
          <Field label="Home Area" value={form.brideHomeArea} onChange={v => set('brideHomeArea', v)} placeholder="Area / Tole" />
        </div>
      </div>

      {/* Groom Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <h3 className="text-sm font-semibold text-sky-400/80 uppercase tracking-wide">Groom</h3>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
          <Field label="Full Name" value={form.groomFullName} onChange={v => set('groomFullName', v)} required placeholder="Enter groom's full name" />
          <Field label="Contact Number" value={form.groomContactNumber} onChange={v => set('groomContactNumber', v)} required placeholder="10 digit number" type="tel" />
          <Field label="WhatsApp Number" value={form.groomWhatsappNumber} onChange={v => set('groomWhatsappNumber', v)} required placeholder="10 digit WhatsApp" type="tel" />
          <Field label="Backup Number" value={form.groomBackupNumber} onChange={v => set('groomBackupNumber', v)} placeholder="Family member's number" type="tel" />
          <Field label="Backup Relation" value={form.groomBackupRelation} onChange={v => set('groomBackupRelation', v)} placeholder="e.g. Father, Brother" />
          <Field label="Instagram" value={form.groomInstagram} onChange={v => set('groomInstagram', v)} placeholder="@username" />
          <Field label="Home City" value={form.groomHomeCity} onChange={v => set('groomHomeCity', v)} placeholder="City name" />
          <Field label="Home Area" value={form.groomHomeArea} onChange={v => set('groomHomeArea', v)} placeholder="Area / Tole" />
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!requiredFilled || saving}
        className={cn(
          "w-full h-12 rounded-xl text-sm font-semibold transition-all",
          requiredFilled
            ? "bg-gradient-to-r from-[hsl(350,70%,50%)] to-[hsl(20,80%,55%)] hover:from-[hsl(350,70%,45%)] hover:to-[hsl(20,80%,50%)] text-white shadow-lg shadow-[hsl(350,70%,50%/0.25)]"
            : "bg-white/[0.06] text-white/25"
        )}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <><Check className="h-4 w-4 mr-2" /> Saved</>
        ) : (
          <><Save className="h-4 w-4 mr-2" /> Save Details</>
        )}
      </Button>

      {!requiredFilled && (
        <p className="text-center text-[11px] text-white/25">
          Please fill all required (*) fields — Name, Contact & WhatsApp for both bride and groom
        </p>
      )}
    </div>
  );
};

export default PortalMyDetails;
