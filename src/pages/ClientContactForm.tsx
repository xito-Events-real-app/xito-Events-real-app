import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Heart, Check, Phone, MessageCircle, Instagram, MapPin, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { allNepalCities } from '@/lib/nepal-cities';
import { brideBackupRelationOptions, groomBackupRelationOptions } from '@/lib/client-contact-api';
import { ChevronsUpDown, Check as CheckIcon } from 'lucide-react';

const ClientContactForm = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const decodedClientId = clientId ? decodeURIComponent(clientId) : '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Bride form state
  const [brideFullName, setBrideFullName] = useState('');
  const [brideContactNumber, setBrideContactNumber] = useState('');
  const [brideWhatsappNumber, setBrideWhatsappNumber] = useState('');
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

  // Load existing data on mount
  useEffect(() => {
    async function loadData() {
      if (!decodedClientId) {
        setError('Invalid form link');
        setIsLoading(false);
        return;
      }
      
      try {
        const { data: result, error: fetchError } = await supabase.functions.invoke('google-sheets', {
          body: {
            action: 'getClientContactDetails',
            data: { registeredDateTimeAD: decodedClientId }
          }
        });

        if (fetchError) throw new Error(fetchError.message);
        if (!result?.success) throw new Error(result?.error || 'Failed to load form');
        
        const data = result.data;
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
      } catch (err) {
        console.error('Error loading form data:', err);
        setError('Unable to load form. Please try again or contact Wedding Tales Nepal.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [decodedClientId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const updates = {
        brideFullName: brideFullName.trim(),
        brideContactNumber: brideContactNumber.trim(),
        brideWhatsappNumber: brideWhatsappNumber.trim(),
        brideBackupNumber: brideBackupNumber.trim(),
        brideBackupRelation,
        brideBackupNumber2: brideBackupNumber2.trim(),
        brideBackupRelation2,
        brideInstagram: brideInstagram.trim().replace(/^@/, ''),
        brideHomeCity,
        brideHomeArea: brideHomeArea.trim(),
        brideHomeMap: brideHomeMap.trim(),
        brideHomeLandmark: brideHomeLandmark.trim(),
        groomFullName: groomFullName.trim(),
        groomContactNumber: groomContactNumber.trim(),
        groomWhatsappNumber: groomWhatsappNumber.trim(),
        groomBackupNumber: groomBackupNumber.trim(),
        groomBackupRelation,
        groomBackupNumber2: groomBackupNumber2.trim(),
        groomBackupRelation2,
        groomInstagram: groomInstagram.trim().replace(/^@/, ''),
        groomHomeCity,
        groomHomeArea: groomHomeArea.trim(),
        groomHomeMap: groomHomeMap.trim(),
        groomHomeLandmark: groomHomeLandmark.trim(),
      };

      const { data: result, error: submitError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'updateClientContactDetails',
          data: { 
            registeredDateTimeAD: decodedClientId,
            updates
          }
        }
      });

      if (submitError) throw new Error(submitError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to submit form');
      
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to submit. Please try again or contact Wedding Tales Nepal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // City Combobox Component
  const CityCombobox = ({ 
    value, 
    onChange, 
    open, 
    onOpenChange, 
    placeholder 
  }: { 
    value: string; 
    onChange: (val: string) => void; 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    placeholder: string;
  }) => (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-12 rounded-xl text-left font-normal",
            "bg-white border-gray-200 text-gray-900 hover:bg-gray-50",
            !value && "text-gray-400"
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-white border-gray-200 z-50" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search city..." className="text-gray-900 placeholder:text-gray-400" />
          <CommandList>
            <CommandEmpty className="text-gray-500 py-4 text-center">No city found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {allNepalCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    onOpenChange(false);
                  }}
                  className="text-gray-900 hover:bg-gray-100"
                >
                  <CheckIcon className={cn("mr-2 h-4 w-4", value === city ? "opacity-100" : "opacity-0")} />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error && !isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Contact us: <a href="tel:9705255025" className="text-pink-600 hover:underline">9705255025</a>
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
            <Check className="h-10 w-10 text-white" />
          </div>
          
          {/* Thank You Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your contact details have been submitted successfully.
          </p>
          
          {/* Wedding Wishes */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6 border border-pink-100">
            <div className="flex justify-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <Heart className="h-5 w-5 text-pink-500" />
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-gray-700 leading-relaxed">
              We wish you a beautiful wedding filled with love, joy, and unforgettable moments!
            </p>
            <p className="text-gray-600 mt-3 text-sm">
              May your journey together be blessed with happiness! 💕
            </p>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Our team will contact you soon for further coordination.
          </p>
          
          {/* Contact Footer */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Questions? Contact us anytime</p>
            <p className="text-sm font-medium text-gray-700">
              📞 9705255025 / 9749494560 / 9847335279
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">💍</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Wedding Tales Nepal
            </h1>
            <span className="text-2xl">✨</span>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto rounded-full" />
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dear Sir/Ma'am,</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We're thrilled to be a part of your special journey! Please fill in your contact details below to help us coordinate your event smoothly.
          </p>
          
          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Anyone can fill the form with this link. Please ensure accurate information.
            </p>
          </div>
        </div>

        {/* Bride's Details */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">👰</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Bride's Details</h3>
                <p className="text-pink-100 text-sm">Personal & contact information</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <Heart className="h-4 w-4" />
                Personal Information
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Full Name</Label>
                <Input
                  value={brideFullName}
                  onChange={(e) => setBrideFullName(e.target.value)}
                  placeholder="Enter bride's full name"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <Phone className="h-4 w-4" />
                Contact Numbers
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Primary Contact</Label>
                  <Input
                    value={brideContactNumber}
                    onChange={(e) => setBrideContactNumber(e.target.value)}
                    placeholder="Enter mobile number"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">WhatsApp Number</Label>
                  <Input
                    value={brideWhatsappNumber}
                    onChange={(e) => setBrideWhatsappNumber(e.target.value)}
                    placeholder="Enter WhatsApp number"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Backup Contacts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                Backup Contacts (Optional)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Backup Number 1</Label>
                  <Input
                    value={brideBackupNumber}
                    onChange={(e) => setBrideBackupNumber(e.target.value)}
                    placeholder="Alternate number"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Relation</Label>
                  <Select value={brideBackupRelation} onValueChange={setBrideBackupRelation}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {brideBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Backup Number 2</Label>
                  <Input
                    value={brideBackupNumber2}
                    onChange={(e) => setBrideBackupNumber2(e.target.value)}
                    placeholder="Another alternate"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Relation</Label>
                  <Select value={brideBackupRelation2} onValueChange={setBrideBackupRelation2}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {brideBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <Instagram className="h-4 w-4" />
                Social Media (Optional)
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Instagram Handle</Label>
                <Input
                  value={brideInstagram}
                  onChange={(e) => setBrideInstagram(e.target.value)}
                  placeholder="username (without @)"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Home Address
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">City</Label>
                  <CityCombobox
                    value={brideHomeCity}
                    onChange={setBrideHomeCity}
                    open={brideCityOpen}
                    onOpenChange={setBrideCityOpen}
                    placeholder="Select city"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Area / Tole</Label>
                  <Input
                    value={brideHomeArea}
                    onChange={(e) => setBrideHomeArea(e.target.value)}
                    placeholder="Enter area/tole name"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Google Maps Link (Optional)</Label>
                <Input
                  value={brideHomeMap}
                  onChange={(e) => setBrideHomeMap(e.target.value)}
                  placeholder="Paste Google Maps link"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Landmark (Optional)</Label>
                <Input
                  value={brideHomeLandmark}
                  onChange={(e) => setBrideHomeLandmark(e.target.value)}
                  placeholder="Near which landmark?"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Groom's Details */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🤵</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Groom's Details</h3>
                <p className="text-blue-100 text-sm">Personal & contact information</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <Heart className="h-4 w-4" />
                Personal Information
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Full Name</Label>
                <Input
                  value={groomFullName}
                  onChange={(e) => setGroomFullName(e.target.value)}
                  placeholder="Enter groom's full name"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <Phone className="h-4 w-4" />
                Contact Numbers
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Primary Contact</Label>
                  <Input
                    value={groomContactNumber}
                    onChange={(e) => setGroomContactNumber(e.target.value)}
                    placeholder="Enter mobile number"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">WhatsApp Number</Label>
                  <Input
                    value={groomWhatsappNumber}
                    onChange={(e) => setGroomWhatsappNumber(e.target.value)}
                    placeholder="Enter WhatsApp number"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Backup Contacts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                Backup Contacts (Optional)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Backup Number 1</Label>
                  <Input
                    value={groomBackupNumber}
                    onChange={(e) => setGroomBackupNumber(e.target.value)}
                    placeholder="Alternate number"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Relation</Label>
                  <Select value={groomBackupRelation} onValueChange={setGroomBackupRelation}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {groomBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Backup Number 2</Label>
                  <Input
                    value={groomBackupNumber2}
                    onChange={(e) => setGroomBackupNumber2(e.target.value)}
                    placeholder="Another alternate"
                    type="tel"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Relation</Label>
                  <Select value={groomBackupRelation2} onValueChange={setGroomBackupRelation2}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {groomBackupRelationOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <Instagram className="h-4 w-4" />
                Social Media (Optional)
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Instagram Handle</Label>
                <Input
                  value={groomInstagram}
                  onChange={(e) => setGroomInstagram(e.target.value)}
                  placeholder="username (without @)"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Home Address
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">City</Label>
                  <CityCombobox
                    value={groomHomeCity}
                    onChange={setGroomHomeCity}
                    open={groomCityOpen}
                    onOpenChange={setGroomCityOpen}
                    placeholder="Select city"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Area / Tole</Label>
                  <Input
                    value={groomHomeArea}
                    onChange={(e) => setGroomHomeArea(e.target.value)}
                    placeholder="Enter area/tole name"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Google Maps Link (Optional)</Label>
                <Input
                  value={groomHomeMap}
                  onChange={(e) => setGroomHomeMap(e.target.value)}
                  placeholder="Paste Google Maps link"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Landmark (Optional)</Label>
                <Input
                  value={groomHomeLandmark}
                  onChange={(e) => setGroomHomeLandmark(e.target.value)}
                  placeholder="Near which landmark?"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mb-6">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl shadow-lg shadow-pink-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Submit Details
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <div className="w-16 h-1 bg-gradient-to-r from-pink-300 to-purple-300 mx-auto rounded-full mb-4" />
          <p className="text-sm text-gray-500 mb-2">Questions? Contact us anytime</p>
          <p className="text-sm font-medium text-gray-700">
            📞 9705255025 / 9749494560 / 9847335279
          </p>
          <p className="text-xs text-gray-400 mt-3">© Wedding Tales Nepal</p>
        </div>
      </div>
    </div>
  );
};

export default ClientContactForm;
