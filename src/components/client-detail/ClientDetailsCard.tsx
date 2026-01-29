import { useState, useEffect, useMemo } from 'react';
import { 
  Users, ChevronDown, ChevronUp, Save, X, Loader2, ExternalLink, 
  Phone, MessageCircle, Instagram, MapPin, RefreshCw, Heart, 
  Crown, UserCheck, Home, Sparkles, Copy, Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { PhoneInputField } from '@/components/form/PhoneInputField';
import { allNepalCities } from '@/lib/nepal-cities';
import { 
  ClientContactDetails, 
  hasFilledContactDetails,
  formatWhatsAppLink,
  formatInstagramLink,
  getClientFormUrl,
  generateFormWhatsAppMessage,
  getRelativeTime
} from '@/lib/client-contact-api';
import { useDropdownData } from '@/hooks/useDropdownData';
import { ChevronsUpDown, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ClientDetailsCardProps {
  data: ClientContactDetails | null;
  isLoading: boolean;
  isResyncing?: boolean;
  onSave: (updates: Partial<ClientContactDetails>) => Promise<boolean>;
  onResync?: () => Promise<boolean>;
  onMarkFormSent?: () => Promise<boolean>;
}

export const ClientDetailsCard = ({ data, isLoading, isResyncing, onSave, onResync, onMarkFormSent }: ClientDetailsCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToWhatsApp, setIsSendingToWhatsApp] = useState(false);
  
  // Get relation options from dropdown data
  const { data: dropdownData } = useDropdownData();
  const relationOptions = dropdownData?.relationOptions || ['Mother', 'Father', 'Sister', 'Brother', 'Other'];
  
  // Bride form state
  const [brideFullName, setBrideFullName] = useState('');
  const [brideContactNumber, setBrideContactNumber] = useState('');
  const [brideWhatsappNumber, setBrideWhatsappNumber] = useState('');
  const [brideSameAsContact, setBrideSameAsContact] = useState(false);
  const [brideBackupNumber, setBrideBackupNumber] = useState('');
  const [brideBackupRelation, setBrideBackupRelation] = useState('');
  const [brideBackupNumber2, setBrideBackupNumber2] = useState('');
  const [brideBackupRelation2, setBrideBackupRelation2] = useState('');
  const [brideInstagram, setBrideInstagram] = useState('');
  const [brideHomeCity, setBrideHomeCity] = useState('');
  const [brideHomeArea, setBrideHomeArea] = useState('');
  const [brideHomeMap, setBrideHomeMap] = useState('');
  const [brideHomeLandmark, setBrideHomeLandmark] = useState('');
  const [brideCityOpen, setBrideCityOpen] = useState(false);
  
  // Groom form state
  const [groomFullName, setGroomFullName] = useState('');
  const [groomContactNumber, setGroomContactNumber] = useState('');
  const [groomWhatsappNumber, setGroomWhatsappNumber] = useState('');
  const [groomSameAsContact, setGroomSameAsContact] = useState(false);
  const [groomBackupNumber, setGroomBackupNumber] = useState('');
  const [groomBackupRelation, setGroomBackupRelation] = useState('');
  const [groomBackupNumber2, setGroomBackupNumber2] = useState('');
  const [groomBackupRelation2, setGroomBackupRelation2] = useState('');
  const [groomInstagram, setGroomInstagram] = useState('');
  const [groomHomeCity, setGroomHomeCity] = useState('');
  const [groomHomeArea, setGroomHomeArea] = useState('');
  const [groomHomeMap, setGroomHomeMap] = useState('');
  const [groomHomeLandmark, setGroomHomeLandmark] = useState('');
  const [groomCityOpen, setGroomCityOpen] = useState(false);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const fields = [
      brideFullName, brideContactNumber, brideWhatsappNumber, brideInstagram,
      brideHomeCity, brideHomeArea,
      groomFullName, groomContactNumber, groomWhatsappNumber, groomInstagram,
      groomHomeCity, groomHomeArea,
    ];
    const filledCount = fields.filter(f => f && f.trim() !== '').length;
    return Math.round((filledCount / fields.length) * 100);
  }, [
    brideFullName, brideContactNumber, brideWhatsappNumber, brideInstagram,
    brideHomeCity, brideHomeArea,
    groomFullName, groomContactNumber, groomWhatsappNumber, groomInstagram,
    groomHomeCity, groomHomeArea,
  ]);

  // Reset form when data changes
  useEffect(() => {
    if (data) {
      setBrideFullName(data.brideFullName || '');
      setBrideContactNumber(data.brideContactNumber || '');
      setBrideWhatsappNumber(data.brideWhatsappNumber || '');
      setBrideSameAsContact(data.brideContactNumber === data.brideWhatsappNumber && !!data.brideContactNumber);
      setBrideBackupNumber(data.brideBackupNumber || '');
      setBrideBackupRelation(data.brideBackupRelation || '');
      setBrideBackupNumber2(data.brideBackupNumber2 || '');
      setBrideBackupRelation2(data.brideBackupRelation2 || '');
      setBrideInstagram(data.brideInstagram || '');
      setBrideHomeCity(data.brideHomeCity || '');
      setBrideHomeArea(data.brideHomeArea || '');
      setBrideHomeMap(data.brideHomeMap || '');
      setBrideHomeLandmark(data.brideHomeLandmark || '');
      
      setGroomFullName(data.groomFullName || '');
      setGroomContactNumber(data.groomContactNumber || '');
      setGroomWhatsappNumber(data.groomWhatsappNumber || '');
      setGroomSameAsContact(data.groomContactNumber === data.groomWhatsappNumber && !!data.groomContactNumber);
      setGroomBackupNumber(data.groomBackupNumber || '');
      setGroomBackupRelation(data.groomBackupRelation || '');
      setGroomBackupNumber2(data.groomBackupNumber2 || '');
      setGroomBackupRelation2(data.groomBackupRelation2 || '');
      setGroomInstagram(data.groomInstagram || '');
      setGroomHomeCity(data.groomHomeCity || '');
      setGroomHomeArea(data.groomHomeArea || '');
      setGroomHomeMap(data.groomHomeMap || '');
      setGroomHomeLandmark(data.groomHomeLandmark || '');
    }
  }, [data]);

  // Handle "Same as Contact" toggles
  useEffect(() => {
    if (brideSameAsContact && brideContactNumber) {
      setBrideWhatsappNumber(brideContactNumber);
    }
  }, [brideSameAsContact, brideContactNumber]);

  useEffect(() => {
    if (groomSameAsContact && groomContactNumber) {
      setGroomWhatsappNumber(groomContactNumber);
    }
  }, [groomSameAsContact, groomContactNumber]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        brideFullName,
        brideContactNumber,
        brideWhatsappNumber: brideSameAsContact ? brideContactNumber : brideWhatsappNumber,
        brideBackupNumber,
        brideBackupRelation,
        brideBackupNumber2,
        brideBackupRelation2,
        brideInstagram,
        brideHomeCity,
        brideHomeArea,
        brideHomeMap,
        brideHomeLandmark,
        groomFullName,
        groomContactNumber,
        groomWhatsappNumber: groomSameAsContact ? groomContactNumber : groomWhatsappNumber,
        groomBackupNumber,
        groomBackupRelation,
        groomBackupNumber2,
        groomBackupRelation2,
        groomInstagram,
        groomHomeCity,
        groomHomeArea,
        groomHomeMap,
        groomHomeLandmark,
      };
      
      const success = await onSave(updates);
      if (success) {
        setIsExpanded(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (data) {
      setBrideFullName(data.brideFullName || '');
      setBrideContactNumber(data.brideContactNumber || '');
      setBrideWhatsappNumber(data.brideWhatsappNumber || '');
      setBrideBackupNumber(data.brideBackupNumber || '');
      setBrideBackupRelation(data.brideBackupRelation || '');
      setBrideBackupNumber2(data.brideBackupNumber2 || '');
      setBrideBackupRelation2(data.brideBackupRelation2 || '');
      setBrideInstagram(data.brideInstagram || '');
      setBrideHomeCity(data.brideHomeCity || '');
      setBrideHomeArea(data.brideHomeArea || '');
      setBrideHomeMap(data.brideHomeMap || '');
      setBrideHomeLandmark(data.brideHomeLandmark || '');
      setGroomFullName(data.groomFullName || '');
      setGroomContactNumber(data.groomContactNumber || '');
      setGroomWhatsappNumber(data.groomWhatsappNumber || '');
      setGroomBackupNumber(data.groomBackupNumber || '');
      setGroomBackupRelation(data.groomBackupRelation || '');
      setGroomBackupNumber2(data.groomBackupNumber2 || '');
      setGroomBackupRelation2(data.groomBackupRelation2 || '');
      setGroomInstagram(data.groomInstagram || '');
      setGroomHomeCity(data.groomHomeCity || '');
      setGroomHomeArea(data.groomHomeArea || '');
      setGroomHomeMap(data.groomHomeMap || '');
      setGroomHomeLandmark(data.groomHomeLandmark || '');
    }
    setIsExpanded(false);
  };

  const hasFilled = hasFilledContactDetails(data);
  const formSentDate = data?.formSentDate;
  const registeredDateTimeAD = data?.registeredDateTimeAD;
  const clientName = data?.clientName;

  // Handle Copy Link
  const handleCopyLink = async () => {
    if (!registeredDateTimeAD) return;
    
    const link = getClientFormUrl(registeredDateTimeAD, clientName);
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied!",
        description: "Form link copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle Send to WhatsApp
  const handleSendToWhatsApp = async () => {
    if (!registeredDateTimeAD) return;
    
    setIsSendingToWhatsApp(true);
    try {
      const message = generateFormWhatsAppMessage(registeredDateTimeAD, clientName);
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Mark form as sent (update formSentDate)
      if (onMarkFormSent) {
        await onMarkFormSent();
      }
      
      toast({
        title: "WhatsApp Opened",
        description: "Form link ready to send",
      });
    } catch (err) {
      console.error('Error opening WhatsApp:', err);
    } finally {
      setIsSendingToWhatsApp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        <span className="ml-2 text-white/40">Loading contact details...</span>
      </div>
    );
  }

  // City Combobox Component
  const CityCombobox = ({ 
    value, 
    onChange, 
    open, 
    onOpenChange, 
    placeholder,
    accentColor 
  }: { 
    value: string; 
    onChange: (val: string) => void; 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    placeholder: string;
    accentColor: 'pink' | 'blue';
  }) => (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-12 rounded-xl text-left font-normal",
            "bg-white/5 border-white/20 text-white hover:bg-white/10",
            !value && "text-white/40"
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-slate-800 border-slate-700" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search city..." className="text-white placeholder:text-white/40" />
          <CommandList>
            <CommandEmpty className="text-white/60 py-4 text-center">No city found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {allNepalCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    onOpenChange(false);
                  }}
                  className="text-white hover:bg-white/10"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === city ? "opacity-100" : "opacity-0")} />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden",
      isExpanded 
        ? "bg-gradient-to-br from-slate-800/90 via-slate-850/90 to-slate-900/90 border-white/20 shadow-2xl" 
        : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600/70 hover:shadow-lg"
    )}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => !isExpanded && setIsExpanded(true)}
            className="flex items-center gap-4 text-left flex-1"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg text-white flex items-center gap-2">
                Client Details
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-sm text-white/60">
                Bride & Groom contact information
              </div>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            {/* Form Sent Badge - only show if sent */}
            {formSentDate && (
              <Badge 
                variant="outline" 
                className="text-xs px-3 py-1 bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
              >
                📤 Form sent {getRelativeTime(formSentDate)}
              </Badge>
            )}
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-3 py-1",
                hasFilled 
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" 
                  : "bg-amber-500/20 border-amber-500/50 text-amber-300"
              )}
            >
              {hasFilled ? '✓ Filled' : 'Pending'}
            </Badge>
            
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-white/60" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/60" />
              )}
            </button>
          </div>
        </div>
        
        {/* Copy Link and WhatsApp Buttons - Always visible */}
        {registeredDateTimeAD && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-slate-600 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
            <Button
              size="sm"
              onClick={handleSendToWhatsApp}
              disabled={isSendingToWhatsApp}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {isSendingToWhatsApp ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send to WhatsApp
            </Button>
          </div>
        )}
      </div>

      {/* Collapsed View - Quick Summary */}
      {!isExpanded && hasFilled && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bride Summary */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/15 to-rose-500/10 border border-pink-500/25">
              <div className="flex items-center gap-2 text-xs text-pink-400 font-semibold mb-2">
                <Crown className="h-3 w-3" />
                BRIDE
              </div>
              {data?.brideFullName && (
                <div className="text-sm text-white font-medium mb-2">{data.brideFullName}</div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {data?.brideContactNumber && (
                  <a href={`tel:${data.brideContactNumber}`} className="flex items-center gap-1 text-blue-400 hover:underline bg-blue-500/10 px-2 py-1 rounded-full">
                    <Phone className="h-3 w-3" />
                    {data.brideContactNumber}
                  </a>
                )}
                {data?.brideWhatsappNumber && (
                  <a href={formatWhatsAppLink(data.brideWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-400 hover:underline bg-green-500/10 px-2 py-1 rounded-full">
                    <MessageCircle className="h-3 w-3" />
                    {data.brideWhatsappNumber}
                  </a>
                )}
                {data?.brideInstagram && (
                  <a href={formatInstagramLink(data.brideInstagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline bg-pink-500/10 px-2 py-1 rounded-full">
                    <Instagram className="h-3 w-3" />
                    @{data.brideInstagram}
                  </a>
                )}
              </div>
              {(data?.brideHomeCity || data?.brideHomeArea) && (
                <div className="flex items-center gap-1 text-xs text-white/60 mt-3">
                  <MapPin className="h-3 w-3" />
                  {[data.brideHomeArea, data.brideHomeCity].filter(Boolean).join(', ')}
                  {data?.brideHomeMap && (
                    <a href={data.brideHomeMap} target="_blank" rel="noopener noreferrer" className="ml-1">
                      <ExternalLink className="h-3 w-3 text-blue-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Groom Summary */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-blue-500/25">
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-2">
                <UserCheck className="h-3 w-3" />
                GROOM
              </div>
              {data?.groomFullName && (
                <div className="text-sm text-white font-medium mb-2">{data.groomFullName}</div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {data?.groomContactNumber && (
                  <a href={`tel:${data.groomContactNumber}`} className="flex items-center gap-1 text-blue-400 hover:underline bg-blue-500/10 px-2 py-1 rounded-full">
                    <Phone className="h-3 w-3" />
                    {data.groomContactNumber}
                  </a>
                )}
                {data?.groomWhatsappNumber && (
                  <a href={formatWhatsAppLink(data.groomWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-400 hover:underline bg-green-500/10 px-2 py-1 rounded-full">
                    <MessageCircle className="h-3 w-3" />
                    {data.groomWhatsappNumber}
                  </a>
                )}
                {data?.groomInstagram && (
                  <a href={formatInstagramLink(data.groomInstagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline bg-pink-500/10 px-2 py-1 rounded-full">
                    <Instagram className="h-3 w-3" />
                    @{data.groomInstagram}
                  </a>
                )}
              </div>
              {(data?.groomHomeCity || data?.groomHomeArea) && (
                <div className="flex items-center gap-1 text-xs text-white/60 mt-3">
                  <MapPin className="h-3 w-3" />
                  {[data.groomHomeArea, data.groomHomeCity].filter(Boolean).join(', ')}
                  {data?.groomHomeMap && (
                    <a href={data.groomHomeMap} target="_blank" rel="noopener noreferrer" className="ml-1">
                      <ExternalLink className="h-3 w-3 text-blue-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isExpanded && !hasFilled && (
        <div className="px-5 pb-5">
          <div className="text-center py-6 bg-gradient-to-br from-white/5 to-white/2 rounded-xl border border-dashed border-white/20">
            <Heart className="h-8 w-8 text-pink-400/50 mx-auto mb-2" />
            <p className="text-white/50 text-sm">No contact details recorded yet</p>
            <p className="text-white/30 text-xs mt-1">Click to add bride and groom information</p>
          </div>
        </div>
      )}

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div className="px-5 pb-6 space-y-6">
          {/* Welcome Header */}
          <div className="text-center py-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Welcome!
              <Sparkles className="h-5 w-5 text-amber-400" />
            </h2>
            <p className="text-white/60 text-sm mt-1">Please fill in your contact details below</p>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Form Completion</span>
              <span className={cn(
                "text-sm font-semibold",
                completionPercentage === 100 ? "text-emerald-400" : 
                completionPercentage >= 50 ? "text-amber-400" : "text-white/60"
              )}>
                {completionPercentage}%
              </span>
            </div>
            <Progress 
              value={completionPercentage} 
              className="h-2 bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-pink-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {onResync && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResync}
                disabled={isResyncing}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
              >
                {isResyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Resync
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Details
            </Button>
          </div>

          {/* BRIDE'S DETAILS Section */}
          <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-pink-500/5 border border-pink-500/30 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-b border-pink-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-pink-300">Bride's Details</h3>
                  <p className="text-xs text-pink-300/60">Personal & contact information</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Personal Info Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                  <UserCheck className="h-4 w-4" />
                  Personal Information
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Full Name *</Label>
                  <Input
                    value={brideFullName}
                    onChange={(e) => setBrideFullName(e.target.value)}
                    placeholder="Enter bride's full name (as per official records)"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Contact Info Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                  <Phone className="h-4 w-4" />
                  Contact Numbers
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Primary Contact *</Label>
                    <PhoneInputField
                      value={brideContactNumber}
                      onChange={setBrideContactNumber}
                      placeholder="Enter 10-digit mobile number"
                      defaultCountry="NP"
                      className="bg-white/5 border-white/20 h-12 rounded-xl"
                    />
                    <p className="text-xs text-white/40">Nepal mobile number</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/80 text-sm">WhatsApp Number</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-white/50">Same as Contact</Label>
                        <Switch
                          checked={brideSameAsContact}
                          onCheckedChange={setBrideSameAsContact}
                        />
                      </div>
                    </div>
                    <Input
                      value={brideSameAsContact ? brideContactNumber : brideWhatsappNumber}
                      onChange={(e) => setBrideWhatsappNumber(e.target.value)}
                      placeholder="Paste any WhatsApp number"
                      type="tel"
                      disabled={brideSameAsContact}
                      className={cn(
                        "bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl",
                        brideSameAsContact && "opacity-50"
                      )}
                    />
                    <p className="text-xs text-white/40">Any format accepted</p>
                  </div>
                </div>
              </div>

              {/* Backup Contacts Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Backup Contacts
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Backup Number 1</Label>
                    <PhoneInputField
                      value={brideBackupNumber}
                      onChange={setBrideBackupNumber}
                      placeholder="Alternate mobile number"
                      defaultCountry="NP"
                      className="bg-white/5 border-white/20 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Relation</Label>
                    <Select value={brideBackupRelation} onValueChange={setBrideBackupRelation}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white h-12 rounded-xl">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {relationOptions.map((rel) => (
                          <SelectItem key={rel} value={rel} className="text-white">{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Backup Number 2 (Optional)</Label>
                    <PhoneInputField
                      value={brideBackupNumber2}
                      onChange={setBrideBackupNumber2}
                      placeholder="Second alternate number"
                      defaultCountry="NP"
                      className="bg-white/5 border-white/20 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Relation</Label>
                    <Select value={brideBackupRelation2} onValueChange={setBrideBackupRelation2}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white h-12 rounded-xl">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {relationOptions.map((rel) => (
                          <SelectItem key={rel} value={rel} className="text-white">{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Social & Address Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                  <Instagram className="h-4 w-4" />
                  Social & Address
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Instagram Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 font-medium">@</span>
                    <Input
                      value={brideInstagram}
                      onChange={(e) => setBrideInstagram(e.target.value.replace(/^@/, ''))}
                      placeholder="instagram_username"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl pl-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Home City</Label>
                    <CityCombobox
                      value={brideHomeCity}
                      onChange={setBrideHomeCity}
                      open={brideCityOpen}
                      onOpenChange={setBrideCityOpen}
                      placeholder="Select city"
                      accentColor="pink"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Home Area / Locality</Label>
                    <Input
                      value={brideHomeArea}
                      onChange={(e) => setBrideHomeArea(e.target.value)}
                      placeholder="Enter locality / area name"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Google Maps Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={brideHomeMap}
                        onChange={(e) => setBrideHomeMap(e.target.value)}
                        placeholder="Paste Google Maps location link"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl flex-1"
                      />
                      {brideHomeMap && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 border-white/20 hover:bg-white/10"
                          onClick={() => window.open(brideHomeMap, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 text-blue-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Nearby Landmark</Label>
                    <Input
                      value={brideHomeLandmark}
                      onChange={(e) => setBrideHomeLandmark(e.target.value)}
                      placeholder="Enter nearby landmark"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GROOM'S DETAILS Section */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-500/5 border border-blue-500/30 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-b border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-300">Groom's Details</h3>
                  <p className="text-xs text-blue-300/60">Personal & contact information</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Personal Info Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <UserCheck className="h-4 w-4" />
                  Personal Information
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Full Name *</Label>
                  <Input
                    value={groomFullName}
                    onChange={(e) => setGroomFullName(e.target.value)}
                    placeholder="Enter groom's full name (as per official records)"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Contact Info Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <Phone className="h-4 w-4" />
                  Contact Numbers
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Primary Contact *</Label>
                    <PhoneInputField
                      value={groomContactNumber}
                      onChange={setGroomContactNumber}
                      placeholder="Enter 10-digit mobile number"
                      defaultCountry="NP"
                      className="bg-white/5 border-white/20 h-12 rounded-xl"
                    />
                    <p className="text-xs text-white/40">Nepal mobile number</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/80 text-sm">WhatsApp Number</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-white/50">Same as Contact</Label>
                        <Switch
                          checked={groomSameAsContact}
                          onCheckedChange={setGroomSameAsContact}
                        />
                      </div>
                    </div>
                    <Input
                      value={groomSameAsContact ? groomContactNumber : groomWhatsappNumber}
                      onChange={(e) => setGroomWhatsappNumber(e.target.value)}
                      placeholder="Paste any WhatsApp number"
                      type="tel"
                      disabled={groomSameAsContact}
                      className={cn(
                        "bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl",
                        groomSameAsContact && "opacity-50"
                      )}
                    />
                    <p className="text-xs text-white/40">Any format accepted</p>
                  </div>
                </div>
              </div>

              {/* Backup Contacts Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Backup Contacts
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Backup Number 1</Label>
                    <PhoneInputField
                      value={groomBackupNumber}
                      onChange={setGroomBackupNumber}
                      placeholder="Alternate mobile number"
                      defaultCountry="NP"
                      className="bg-white/5 border-white/20 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Relation</Label>
                    <Select value={groomBackupRelation} onValueChange={setGroomBackupRelation}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white h-12 rounded-xl">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {relationOptions.map((rel) => (
                          <SelectItem key={rel} value={rel} className="text-white">{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Backup Number 2 (Optional)</Label>
                    <PhoneInputField
                      value={groomBackupNumber2}
                      onChange={setGroomBackupNumber2}
                      placeholder="Second alternate number"
                      defaultCountry="NP"
                      className="bg-white/5 border-white/20 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Relation</Label>
                    <Select value={groomBackupRelation2} onValueChange={setGroomBackupRelation2}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white h-12 rounded-xl">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {relationOptions.map((rel) => (
                          <SelectItem key={rel} value={rel} className="text-white">{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Social & Address Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <Instagram className="h-4 w-4" />
                  Social & Address
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Instagram Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-medium">@</span>
                    <Input
                      value={groomInstagram}
                      onChange={(e) => setGroomInstagram(e.target.value.replace(/^@/, ''))}
                      placeholder="instagram_username"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl pl-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Home City</Label>
                    <CityCombobox
                      value={groomHomeCity}
                      onChange={setGroomHomeCity}
                      open={groomCityOpen}
                      onOpenChange={setGroomCityOpen}
                      placeholder="Select city"
                      accentColor="blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Home Area / Locality</Label>
                    <Input
                      value={groomHomeArea}
                      onChange={(e) => setGroomHomeArea(e.target.value)}
                      placeholder="Enter locality / area name"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Google Maps Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={groomHomeMap}
                        onChange={(e) => setGroomHomeMap(e.target.value)}
                        placeholder="Paste Google Maps location link"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl flex-1"
                      />
                      {groomHomeMap && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 border-white/20 hover:bg-white/10"
                          onClick={() => window.open(groomHomeMap, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 text-blue-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Nearby Landmark</Label>
                    <Input
                      value={groomHomeLandmark}
                      onChange={(e) => setGroomHomeLandmark(e.target.value)}
                      placeholder="Enter nearby landmark"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 px-8 rounded-xl"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              Save All Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
