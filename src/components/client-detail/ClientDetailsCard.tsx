import { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronUp, Save, X, Loader2, ExternalLink, Phone, MessageCircle, Instagram, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { PhoneInputField } from '@/components/form/PhoneInputField';
import { allNepalCities } from '@/lib/nepal-cities';
import { 
  ClientContactDetails, 
  brideBackupRelationOptions, 
  groomBackupRelationOptions,
  hasFilledContactDetails,
  formatWhatsAppLink,
  formatInstagramLink 
} from '@/lib/client-contact-api';
import { ChevronsUpDown, Check } from 'lucide-react';

interface ClientDetailsCardProps {
  data: ClientContactDetails | null;
  isLoading: boolean;
  onSave: (updates: Partial<ClientContactDetails>) => Promise<boolean>;
}

export const ClientDetailsCard = ({ data, isLoading, onSave }: ClientDetailsCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        <span className="ml-2 text-white/40">Loading contact details...</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-300",
      isExpanded 
        ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-white/20" 
        : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600/70"
    )}>
      {/* Header */}
      <button
        onClick={() => !isExpanded && setIsExpanded(true)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/30 text-violet-200">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white">Client Details</div>
            <div className="text-sm text-white/60">
              Bride & Groom contact information
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              hasFilled 
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" 
                : "bg-white/10 border-white/30 text-white/60"
            )}
          >
            {hasFilled ? 'Filled' : 'Empty'}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/60" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/60" />
          )}
        </div>
      </button>

      {/* Collapsed View - Quick Summary */}
      {!isExpanded && hasFilled && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bride Summary */}
            <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <div className="text-xs text-pink-400 font-medium mb-2">BRIDE</div>
              {data?.brideFullName && (
                <div className="text-sm text-white font-medium mb-1">{data.brideFullName}</div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {data?.brideContactNumber && (
                  <a href={`tel:${data.brideContactNumber}`} className="flex items-center gap-1 text-blue-400 hover:underline">
                    <Phone className="h-3 w-3" />
                    {data.brideContactNumber}
                  </a>
                )}
                {data?.brideWhatsappNumber && (
                  <a href={formatWhatsAppLink(data.brideWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-400 hover:underline">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </a>
                )}
                {data?.brideInstagram && (
                  <a href={formatInstagramLink(data.brideInstagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline">
                    <Instagram className="h-3 w-3" />
                    @{data.brideInstagram}
                  </a>
                )}
              </div>
              {(data?.brideHomeCity || data?.brideHomeArea) && (
                <div className="flex items-center gap-1 text-xs text-white/60 mt-2">
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
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-xs text-blue-400 font-medium mb-2">GROOM</div>
              {data?.groomFullName && (
                <div className="text-sm text-white font-medium mb-1">{data.groomFullName}</div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {data?.groomContactNumber && (
                  <a href={`tel:${data.groomContactNumber}`} className="flex items-center gap-1 text-blue-400 hover:underline">
                    <Phone className="h-3 w-3" />
                    {data.groomContactNumber}
                  </a>
                )}
                {data?.groomWhatsappNumber && (
                  <a href={formatWhatsAppLink(data.groomWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-400 hover:underline">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </a>
                )}
                {data?.groomInstagram && (
                  <a href={formatInstagramLink(data.groomInstagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline">
                    <Instagram className="h-3 w-3" />
                    @{data.groomInstagram}
                  </a>
                )}
              </div>
              {(data?.groomHomeCity || data?.groomHomeArea) && (
                <div className="flex items-center gap-1 text-xs text-white/60 mt-2">
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
        <div className="px-4 pb-4">
          <div className="text-center text-white/40 py-4 bg-white/5 rounded-lg border border-dashed border-white/20">
            No contact details recorded. Click to add bride and groom information.
          </div>
        </div>
      )}

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-6">
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>

          {/* BRIDE'S DETAILS Section */}
          <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30">
            <h3 className="text-lg font-semibold text-pink-400 mb-4">BRIDE'S DETAILS</h3>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label className="text-white/80">Full Name</Label>
                <Input
                  value={brideFullName}
                  onChange={(e) => setBrideFullName(e.target.value)}
                  placeholder="Enter bride's full name (as per official records)"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                />
              </div>

              {/* Contact Numbers Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Contact Number</Label>
                  <PhoneInputField
                    value={brideContactNumber}
                    onChange={setBrideContactNumber}
                    placeholder="Enter bride's 10-digit Nepali mobile number"
                    defaultCountry="NP"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80">WhatsApp Number</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-white/50">Same as Contact</Label>
                      <Switch
                        checked={brideSameAsContact}
                        onCheckedChange={setBrideSameAsContact}
                      />
                    </div>
                  </div>
                  <PhoneInputField
                    value={brideSameAsContact ? brideContactNumber : brideWhatsappNumber}
                    onChange={setBrideWhatsappNumber}
                    placeholder="Enter bride's WhatsApp number"
                    defaultCountry="NP"
                    className={cn("bg-white/5 border-white/20", brideSameAsContact && "opacity-50")}
                  />
                </div>
              </div>

              {/* Backup Contacts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Backup Number</Label>
                  <PhoneInputField
                    value={brideBackupNumber}
                    onChange={setBrideBackupNumber}
                    placeholder="Enter alternate Nepali mobile number"
                    defaultCountry="NP"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Backup Relation</Label>
                  <Select value={brideBackupRelation} onValueChange={setBrideBackupRelation}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {brideBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-white hover:bg-white/10">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Backup 2 Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Backup Number 2 (Optional)</Label>
                  <PhoneInputField
                    value={brideBackupNumber2}
                    onChange={setBrideBackupNumber2}
                    placeholder="Enter second alternate mobile (optional)"
                    defaultCountry="NP"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Backup 2 Relation</Label>
                  <Select value={brideBackupRelation2} onValueChange={setBrideBackupRelation2}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {brideBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-white hover:bg-white/10">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label className="text-white/80">Instagram Handle</Label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-white/10 border border-r-0 border-white/20 rounded-l-md text-white/60">@</span>
                  <Input
                    value={brideInstagram}
                    onChange={(e) => setBrideInstagram(e.target.value.replace(/^@/, ''))}
                    placeholder="Enter Instagram username (without @)"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 rounded-l-none"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Home City</Label>
                  <Popover open={brideCityOpen} onOpenChange={setBrideCityOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={brideCityOpen}
                        className="w-full justify-between bg-white/5 border-white/20 text-white hover:bg-white/10"
                      >
                        {brideHomeCity || "Select city..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 bg-slate-800 border-white/20">
                      <Command className="bg-transparent">
                        <CommandInput placeholder="Search city..." className="text-white" />
                        <CommandList>
                          <CommandEmpty className="text-white/50 py-2 text-center text-sm">No city found.</CommandEmpty>
                          <CommandGroup>
                            {allNepalCities.map((city) => (
                              <CommandItem
                                key={city}
                                value={city}
                                onSelect={(value) => {
                                  setBrideHomeCity(value);
                                  setBrideCityOpen(false);
                                }}
                                className="text-white hover:bg-white/10"
                              >
                                <Check className={cn("mr-2 h-4 w-4", brideHomeCity === city ? "opacity-100" : "opacity-0")} />
                                {city}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Home Area</Label>
                  <Input
                    value={brideHomeArea}
                    onChange={(e) => setBrideHomeArea(e.target.value)}
                    placeholder="Enter locality / area name"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Map and Landmark Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Google Map Location</Label>
                  <div className="flex gap-2">
                    <Input
                      value={brideHomeMap}
                      onChange={(e) => setBrideHomeMap(e.target.value)}
                      placeholder="Paste Google Maps location link"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 flex-1"
                    />
                    {brideHomeMap && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(brideHomeMap, '_blank')}
                        className="border-white/20 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Home Landmark</Label>
                  <Input
                    value={brideHomeLandmark}
                    onChange={(e) => setBrideHomeLandmark(e.target.value)}
                    placeholder="Enter nearby landmark"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* GROOM'S DETAILS Section */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">GROOM'S DETAILS</h3>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label className="text-white/80">Full Name</Label>
                <Input
                  value={groomFullName}
                  onChange={(e) => setGroomFullName(e.target.value)}
                  placeholder="Enter groom's full name (as per official records)"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                />
              </div>

              {/* Contact Numbers Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Contact Number</Label>
                  <PhoneInputField
                    value={groomContactNumber}
                    onChange={setGroomContactNumber}
                    placeholder="Enter groom's 10-digit Nepali mobile number"
                    defaultCountry="NP"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80">WhatsApp Number</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-white/50">Same as Contact</Label>
                      <Switch
                        checked={groomSameAsContact}
                        onCheckedChange={setGroomSameAsContact}
                      />
                    </div>
                  </div>
                  <PhoneInputField
                    value={groomSameAsContact ? groomContactNumber : groomWhatsappNumber}
                    onChange={setGroomWhatsappNumber}
                    placeholder="Enter groom's WhatsApp number"
                    defaultCountry="NP"
                    className={cn("bg-white/5 border-white/20", groomSameAsContact && "opacity-50")}
                  />
                </div>
              </div>

              {/* Backup Contacts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Backup Number</Label>
                  <PhoneInputField
                    value={groomBackupNumber}
                    onChange={setGroomBackupNumber}
                    placeholder="Enter alternate Nepali mobile number"
                    defaultCountry="NP"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Backup Relation</Label>
                  <Select value={groomBackupRelation} onValueChange={setGroomBackupRelation}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {groomBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-white hover:bg-white/10">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Backup 2 Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Backup Number 2 (Optional)</Label>
                  <PhoneInputField
                    value={groomBackupNumber2}
                    onChange={setGroomBackupNumber2}
                    placeholder="Enter second alternate mobile (optional)"
                    defaultCountry="NP"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Backup 2 Relation</Label>
                  <Select value={groomBackupRelation2} onValueChange={setGroomBackupRelation2}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {groomBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-white hover:bg-white/10">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label className="text-white/80">Instagram Handle</Label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-white/10 border border-r-0 border-white/20 rounded-l-md text-white/60">@</span>
                  <Input
                    value={groomInstagram}
                    onChange={(e) => setGroomInstagram(e.target.value.replace(/^@/, ''))}
                    placeholder="Enter Instagram username (without @)"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 rounded-l-none"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Home City</Label>
                  <Popover open={groomCityOpen} onOpenChange={setGroomCityOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={groomCityOpen}
                        className="w-full justify-between bg-white/5 border-white/20 text-white hover:bg-white/10"
                      >
                        {groomHomeCity || "Select city..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 bg-slate-800 border-white/20">
                      <Command className="bg-transparent">
                        <CommandInput placeholder="Search city..." className="text-white" />
                        <CommandList>
                          <CommandEmpty className="text-white/50 py-2 text-center text-sm">No city found.</CommandEmpty>
                          <CommandGroup>
                            {allNepalCities.map((city) => (
                              <CommandItem
                                key={city}
                                value={city}
                                onSelect={(value) => {
                                  setGroomHomeCity(value);
                                  setGroomCityOpen(false);
                                }}
                                className="text-white hover:bg-white/10"
                              >
                                <Check className={cn("mr-2 h-4 w-4", groomHomeCity === city ? "opacity-100" : "opacity-0")} />
                                {city}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Home Area</Label>
                  <Input
                    value={groomHomeArea}
                    onChange={(e) => setGroomHomeArea(e.target.value)}
                    placeholder="Enter locality / area name"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Map and Landmark Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Google Map Location</Label>
                  <div className="flex gap-2">
                    <Input
                      value={groomHomeMap}
                      onChange={(e) => setGroomHomeMap(e.target.value)}
                      placeholder="Paste Google Maps location link"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 flex-1"
                    />
                    {groomHomeMap && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(groomHomeMap, '_blank')}
                        className="border-white/20 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Home Landmark</Label>
                  <Input
                    value={groomHomeLandmark}
                    onChange={(e) => setGroomHomeLandmark(e.target.value)}
                    placeholder="Enter nearby landmark"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailsCard;
