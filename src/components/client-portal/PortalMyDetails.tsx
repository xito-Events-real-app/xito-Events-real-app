import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Heart, Check, Loader2, User, Phone, MapPin, Instagram, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_RELATION_OPTIONS = ["Mother", "Father", "Sister", "Brother", "Spouse", "Friend", "Other"];

interface PersonDetails {
  fullName: string;
  contactNumber: string;
  whatsappNumber: string;
  backupNumber1: string;
  backupRelation1: string;
  backupNumber2: string;
  backupRelation2: string;
  instagram: string;
  homeCity: string;
  homeArea: string;
  homeMapLink: string;
  homeLandmark: string;
}

const emptyPerson: PersonDetails = {
  fullName: "", contactNumber: "", whatsappNumber: "",
  backupNumber1: "", backupRelation1: "", backupNumber2: "", backupRelation2: "",
  instagram: "", homeCity: "", homeArea: "", homeMapLink: "", homeLandmark: "",
};

interface PortalMyDetailsProps {
  registeredDateTimeAD: string;
  initialData: any;
  onSaved: () => void;
}

function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

function countFilledFields(p: PersonDetails): number {
  return Object.values(p).filter(v => v.trim().length > 0).length;
}

const PortalMyDetails = ({ registeredDateTimeAD, initialData, onSaved }: PortalMyDetailsProps) => {
  const [selectedPerson, setSelectedPerson] = useState<'bride' | 'groom' | null>(null);
  const [bride, setBride] = useState<PersonDetails>(emptyPerson);
  const [groom, setGroom] = useState<PersonDetails>(emptyPerson);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [relationOptions, setRelationOptions] = useState<string[]>(DEFAULT_RELATION_OPTIONS);

  // Load full contact data from DB
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.from('contact_details_cache')
        .select('*')
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .maybeSingle();
      if (data) {
        setBride({
          fullName: data.bride_full_name || '',
          contactNumber: data.bride_contact_number || '',
          whatsappNumber: data.bride_whatsapp_number || '',
          backupNumber1: data.bride_backup_number || '',
          backupRelation1: data.bride_backup_relation || '',
          backupNumber2: data.bride_backup_number2 || '',
          backupRelation2: data.bride_backup_relation2 || '',
          instagram: data.bride_instagram || '',
          homeCity: data.bride_home_city || '',
          homeArea: data.bride_home_area || '',
          homeMapLink: data.bride_home_map || '',
          homeLandmark: data.bride_home_landmark || '',
        });
        setGroom({
          fullName: data.groom_full_name || '',
          contactNumber: data.groom_contact_number || '',
          whatsappNumber: data.groom_whatsapp_number || '',
          backupNumber1: data.groom_backup_number || '',
          backupRelation1: data.groom_backup_relation || '',
          backupNumber2: data.groom_backup_number2 || '',
          backupRelation2: data.groom_backup_relation2 || '',
          instagram: data.groom_instagram || '',
          homeCity: data.groom_home_city || '',
          homeArea: data.groom_home_area || '',
          homeMapLink: data.groom_home_map || '',
          homeLandmark: data.groom_home_landmark || '',
        });
      }
    };
    loadData();
  }, [registeredDateTimeAD]);

  // Fetch relation options
  useEffect(() => {
    supabase.functions.invoke('google-sheets', {
      body: { action: 'getPublicFormData' }
    }).then(({ data }) => {
      if (data?.success && data.data?.relationOptions?.length > 0) {
        setRelationOptions(data.data.relationOptions);
      }
    }).catch(() => {});
  }, []);

  const updatePerson = useCallback((person: 'bride' | 'groom', field: keyof PersonDetails, value: string) => {
    const setter = person === 'bride' ? setBride : setGroom;
    setter(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    const current = selectedPerson === 'bride' ? bride : groom;
    // Validate phone fields
    const phoneFields: { value: string; label: string }[] = [
      { value: current.contactNumber, label: "Contact Number" },
      { value: current.backupNumber1, label: "Backup Number 1" },
      { value: current.backupNumber2, label: "Backup Number 2" },
    ];
    for (const { value, label } of phoneFields) {
      if (value && value.length !== 10) {
        toast({ title: "Error", description: `${label} must be exactly 10 digits`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      await supabase.from('contact_details_cache').upsert({
        registered_date_time_ad: registeredDateTimeAD,
        bride_full_name: bride.fullName,
        bride_contact_number: bride.contactNumber,
        bride_whatsapp_number: bride.whatsappNumber,
        bride_backup_number: bride.backupNumber1,
        bride_backup_relation: bride.backupRelation1,
        bride_backup_number2: bride.backupNumber2,
        bride_backup_relation2: bride.backupRelation2,
        bride_instagram: bride.instagram,
        bride_home_city: bride.homeCity,
        bride_home_area: bride.homeArea,
        bride_home_map: bride.homeMapLink,
        bride_home_landmark: bride.homeLandmark,
        groom_full_name: groom.fullName,
        groom_contact_number: groom.contactNumber,
        groom_whatsapp_number: groom.whatsappNumber,
        groom_backup_number: groom.backupNumber1,
        groom_backup_relation: groom.backupRelation1,
        groom_backup_number2: groom.backupNumber2,
        groom_backup_relation2: groom.backupRelation2,
        groom_instagram: groom.instagram,
        groom_home_city: groom.homeCity,
        groom_home_area: groom.homeArea,
        groom_home_map: groom.homeMapLink,
        groom_home_landmark: groom.homeLandmark,
        synced_to_sheet: false,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'registered_date_time_ad' });

      // Fire-and-forget sheet sync
      supabase.functions.invoke('google-sheets', {
        body: {
          action: 'updateClientContactDetails',
          data: {
            registeredDateTimeAD,
            updates: {
              brideFullName: bride.fullName, brideContactNumber: bride.contactNumber,
              brideWhatsappNumber: bride.whatsappNumber, brideBackupNumber: bride.backupNumber1,
              brideBackupRelation: bride.backupRelation1, brideBackupNumber2: bride.backupNumber2,
              brideBackupRelation2: bride.backupRelation2, brideInstagram: bride.instagram,
              brideHomeCity: bride.homeCity, brideHomeArea: bride.homeArea,
              brideHomeMap: bride.homeMapLink, brideHomeLandmark: bride.homeLandmark,
              groomFullName: groom.fullName, groomContactNumber: groom.contactNumber,
              groomWhatsappNumber: groom.whatsappNumber, groomBackupNumber: groom.backupNumber1,
              groomBackupRelation: groom.backupRelation1, groomBackupNumber2: groom.backupNumber2,
              groomBackupRelation2: groom.backupRelation2, groomInstagram: groom.instagram,
              groomHomeCity: groom.homeCity, groomHomeArea: groom.homeArea,
              groomHomeMap: groom.homeMapLink, groomHomeLandmark: groom.homeLandmark,
            }
          }
        }
      }).catch(err => console.warn('Sheet sync failed:', err));

      setSaved(true);
      onSaved();
      toast({ title: "Saved ✓", description: `${selectedPerson === 'bride' ? 'Bride' : 'Groom'} details saved` });
    } catch {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Landing view — two buttons
  if (!selectedPerson) {
    const brideCount = countFilledFields(bride);
    const groomCount = countFilledFields(groom);
    return (
      <div className="pb-28 px-4 space-y-6">
        <div className="text-center pt-8 pb-4">
          <Heart className="h-6 w-6 text-[hsl(350,80%,65%)] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
          <p className="text-xs text-gray-400 mt-1">Manage your contact & location details</p>
        </div>

        <button
          onClick={() => setSelectedPerson('bride')}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-5 text-left transition-all active:scale-[0.98] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-200">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bride Details</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {bride.fullName || 'Not filled yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {brideCount > 0 && (
                <span className="text-[10px] font-medium text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">
                  {brideCount}/12
                </span>
              )}
              {brideCount >= 3 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelectedPerson('groom')}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 p-5 text-left transition-all active:scale-[0.98] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-200">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Groom Details</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {groom.fullName || 'Not filled yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {groomCount > 0 && (
                <span className="text-[10px] font-medium text-sky-500 bg-sky-100 px-2 py-0.5 rounded-full">
                  {groomCount}/12
                </span>
              )}
              {groomCount >= 3 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Form view
  const isBride = selectedPerson === 'bride';
  const person = isBride ? bride : groom;
  const accentFrom = isBride ? 'from-rose-500' : 'from-sky-500';
  const accentTo = isBride ? 'to-pink-500' : 'to-blue-500';
  const borderAccent = isBride ? 'focus:border-rose-400' : 'focus:border-sky-400';
  const ringAccent = isBride ? 'focus:ring-rose-200' : 'focus:ring-sky-200';

  const onChange = (field: keyof PersonDetails, value: string) => {
    updatePerson(selectedPerson, field, value);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-100px)]">
      {/* Sticky Header */}
      <div className="sticky top-[41px] z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSelectedPerson(null)} className="flex items-center gap-1.5 text-gray-600 active:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <h3 className={cn("text-sm font-semibold", isBride ? "text-rose-600" : "text-sky-600")}>
            {isBride ? 'Bride' : 'Groom'} Details
          </h3>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className={cn(
              "h-8 rounded-lg text-xs font-semibold text-white",
              `bg-gradient-to-r ${accentFrom} ${accentTo}`
            )}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <><Check className="h-3 w-3 mr-1" />Saved</> : <><Save className="h-3 w-3 mr-1" />Save</>}
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-4 py-5 pb-28 space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" /> Full Name *
          </Label>
          <Input
            placeholder="Enter full name"
            value={person.fullName}
            onChange={e => onChange('fullName', e.target.value)}
            className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
          />
        </div>

        {/* Contact Numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" /> Contact *
            </Label>
            <Input
              type="tel" inputMode="numeric" maxLength={10}
              placeholder="98XXXXXXXX"
              value={person.contactNumber}
              onChange={e => onChange('contactNumber', sanitizePhone(e.target.value))}
              className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">WhatsApp *</Label>
            <Input
              type="tel" maxLength={10}
              placeholder="98XXXXXXXX"
              value={person.whatsappNumber}
              onChange={e => onChange('whatsappNumber', e.target.value)}
              className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
            />
          </div>
        </div>

        {/* Backup 1 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Backup Number 1</Label>
            <Input
              type="tel" inputMode="numeric" maxLength={10}
              placeholder="98XXXXXXXX"
              value={person.backupNumber1}
              onChange={e => onChange('backupNumber1', sanitizePhone(e.target.value))}
              className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Relation</Label>
            <Select value={person.backupRelation1} onValueChange={v => onChange('backupRelation1', v)}>
              <SelectTrigger className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                {relationOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Backup 2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Backup Number 2</Label>
            <Input
              type="tel" inputMode="numeric" maxLength={10}
              placeholder="98XXXXXXXX"
              value={person.backupNumber2}
              onChange={e => onChange('backupNumber2', sanitizePhone(e.target.value))}
              className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Relation</Label>
            <Select value={person.backupRelation2} onValueChange={v => onChange('backupRelation2', v)}>
              <SelectTrigger className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                {relationOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Instagram className="w-4 h-4 text-gray-400" /> Instagram Handle
          </Label>
          <Input
            placeholder="username (without @)"
            value={person.instagram}
            onChange={e => onChange('instagram', e.target.value)}
            className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
          />
        </div>

        {/* Home Address */}
        <div className="pt-2 border-t border-gray-100">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-gray-400" /> Home Address
          </Label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">City</Label>
              <Input
                placeholder="e.g., Kathmandu"
                value={person.homeCity}
                onChange={e => onChange('homeCity', e.target.value)}
                className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Area / Tole</Label>
              <Input
                placeholder="e.g., Baneshwor"
                value={person.homeArea}
                onChange={e => onChange('homeArea', e.target.value)}
                className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Google Maps Link</Label>
              <Input
                type="url"
                placeholder="https://maps.google.com/..."
                value={person.homeMapLink}
                onChange={e => onChange('homeMapLink', e.target.value)}
                className={`h-12 bg-white border-gray-200 ${borderAccent} ${ringAccent}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Landmark</Label>
              <Textarea
                placeholder="Near temple, opposite to..."
                value={person.homeLandmark}
                onChange={e => onChange('homeLandmark', e.target.value)}
                className={`min-h-[80px] bg-white border-gray-200 ${borderAccent} ${ringAccent} resize-none`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalMyDetails;
