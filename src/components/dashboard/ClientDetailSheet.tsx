import { useState, useMemo } from "react";
import { ClientData, updateClient } from "@/lib/sheets-api";
import { updateClientInCacheRecord } from "@/lib/clients-supabase-cache";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay, NEPALI_MONTHS } from "@/lib/nepali-months";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormSection, FormInput, FormSelect, CountrySelector, PhoneInputField, NepaliCalendar } from "@/components/form";
import { EventSelector } from "@/components/form/EventSelector";
import { getCountryCodeFromName } from "@/components/form/CountrySelector";
import { valleyCities, nepalCitiesOutsideValley, clientLocationOptions } from "@/lib/form-data";
import { NepaliDateObject, bsToAD, formatBSDate, isUnknownDay, getDayForStorage } from "@/lib/nepali-date";
import { useDropdownData } from "@/hooks/useDropdownData";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Phone, MessageCircle, MapPin, Calendar, User, FileText, Clock, Pencil, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientDetailSheetProps {
  client: ClientData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedClient: ClientData) => void;
}

export function ClientDetailSheet({ client, isOpen, onClose, onSave }: ClientDetailSheetProps) {
  const { data: dropdowns } = useDropdownData();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedClient, setEditedClient] = useState<ClientData | null>(null);
  
  // Extended edit state for form fields
  const [clientLocation, setClientLocation] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [currentCountryCode, setCurrentCountryCode] = useState("NP");
  const [contactNo, setContactNo] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventFromCity, setEventFromCity] = useState("");
  const [eventToCity, setEventToCity] = useState("");
  const [selectedDates, setSelectedDates] = useState<NepaliDateObject[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, string>>({});
  const [source, setSource] = useState("");
  const [whoseWhatsapp, setWhoseWhatsapp] = useState("");
  const [oldClientName, setOldClientName] = useState("");
  const [whoAdded, setWhoAdded] = useState("");
  const [inquiryDate, setInquiryDate] = useState<Date | undefined>(undefined);
  const [inquiryTime, setInquiryTime] = useState("");

  // Combine all event options - MUST be before any conditional returns
  const allEventOptions = useMemo(() => {
    const eventsList: string[] = [];
    if (dropdowns?.preweddingEvents) eventsList.push(...dropdowns.preweddingEvents);
    if (dropdowns?.weddingEvents) eventsList.push(...dropdowns.weddingEvents);
    if (dropdowns?.postweddingEvents) eventsList.push(...dropdowns.postweddingEvents);
    return [...new Set(eventsList)];
  }, [dropdowns]);

  const sortedDates = useMemo(() => {
    return [...selectedDates].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      // Handle unknown day - treat as 99 for sorting
      const dayA: number = isUnknownDay(a.day) ? 99 : (a.day as number);
      const dayB: number = isUnknownDay(b.day) ? 99 : (b.day as number);
      return dayA - dayB;
    });
  }, [selectedDates]);

  // Early return AFTER all hooks
  if (!client) return null;

  const initials = getHandlerInitials(client.whoAdded || '');
  const events = parseEventDetails(
    client.events || '',
    client.eventYear || '',
    client.eventMonth || '',
    client.eventDay || ''
  );
  const location = formatLocationDisplay(client.eventLocation || '', client.eventCity || '');

  const getDateKey = (date: NepaliDateObject) => `${date.year}-${date.month}-${date.day}`;

  const handleEventChange = (date: NepaliDateObject, event: string) => {
    const key = getDateKey(date);
    setEventsByDate(prev => ({ ...prev, [key]: event }));
  };

  const handleRemoveDate = (date: NepaliDateObject) => {
    const key = getDateKey(date);
    setSelectedDates(prev => prev.filter(d => getDateKey(d) !== key));
    setEventsByDate(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Parse existing dates from client data
  const parseExistingDates = (client: ClientData): NepaliDateObject[] => {
    if (!client.eventYear || !client.eventMonth || !client.eventDay) return [];
    
    const years = client.eventYear.split('\n');
    const months = client.eventMonth.split('\n');
    const days = client.eventDay.split('\n');
    const eventNames = (client.events || '').split('\n');
    
    const dates: NepaliDateObject[] = [];
    const eventsMap: Record<string, string> = {};
    
    for (let i = 0; i < years.length; i++) {
      if (years[i] && months[i] && days[i]) {
        // Handle ** (unknown day)
        const dayValue = days[i].trim();
        const date: NepaliDateObject = {
          year: parseInt(years[i]),
          month: parseInt(months[i]),
          day: dayValue === "**" ? "**" : parseInt(dayValue)
        };
        dates.push(date);
        if (eventNames[i]) {
          eventsMap[getDateKey(date)] = eventNames[i];
        }
      }
    }
    
    return dates;
  };

  // Parse source into base and sub-value
  const parseSource = (sourceStr: string): { base: string; sub: string } => {
    if (sourceStr.startsWith('WHATSAPP - ')) {
      return { base: 'WHATSAPP', sub: sourceStr.replace('WHATSAPP - ', '') };
    }
    if (sourceStr.startsWith('HANDLER - ')) {
      return { base: 'HANDLER', sub: sourceStr.replace('HANDLER - ', '') };
    }
    if (sourceStr.startsWith('OLD CLIENT - ')) {
      return { base: 'OLD CLIENT', sub: sourceStr.replace('OLD CLIENT - ', '') };
    }
    return { base: sourceStr, sub: '' };
  };

  // Parse event city
  const parseEventCity = (eventLoc: string, cityStr: string): { city: string; from: string; to: string } => {
    if (eventLoc === 'MIXED' || eventLoc === 'ABROAD') {
      const parts = cityStr.split(' - ');
      return { city: '', from: parts[0] || '', to: parts[1] || '' };
    }
    return { city: cityStr, from: '', to: '' };
  };

  const handleEdit = () => {
    setEditedClient({ ...client });
    
    // Initialize form fields from client data
    setClientLocation(client.clientLocation || '');
    setCurrentCountry(client.currentCountry || '');
    setCurrentCountryCode(getCountryCodeFromName(client.currentCountry || 'Nepal'));
    setContactNo(client.contactNo || '');
    setWhatsappNo(client.whatsappNo || '');
    setEventLocation(client.eventLocation || '');
    
    const cityParsed = parseEventCity(client.eventLocation || '', client.eventCity || '');
    setEventCity(cityParsed.city);
    setEventFromCity(cityParsed.from);
    setEventToCity(cityParsed.to);
    
    // Parse dates
    const dates = parseExistingDates(client);
    setSelectedDates(dates);
    
    // Parse events by date
    if (client.events && client.eventYear && client.eventMonth && client.eventDay) {
      const eventNames = client.events.split('\n');
      const years = client.eventYear.split('\n');
      const months = client.eventMonth.split('\n');
      const days = client.eventDay.split('\n');
      const eventsMap: Record<string, string> = {};
      
      for (let i = 0; i < years.length; i++) {
        if (years[i] && months[i] && days[i]) {
          const key = `${years[i]}-${months[i]}-${days[i]}`;
          eventsMap[key] = eventNames[i] || '';
        }
      }
      setEventsByDate(eventsMap);
    }
    
    const { base, sub } = parseSource(client.source || '');
    setSource(base);
    if (base === 'WHATSAPP') setWhoseWhatsapp(sub);
    else if (base === 'HANDLER') setWhoseWhatsapp(sub);
    else if (base === 'OLD CLIENT') setOldClientName(sub);
    
    setWhoAdded(client.whoAdded || '');
    
    if (client.inquiryDateAD) {
      setInquiryDate(new Date(client.inquiryDateAD));
    }
    setInquiryTime(client.inquiryTime || '');
    
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedClient(null);
    setIsEditing(false);
    resetFormState();
  };

  const resetFormState = () => {
    setClientLocation("");
    setCurrentCountry("");
    setCurrentCountryCode("NP");
    setContactNo("");
    setWhatsappNo("");
    setEventLocation("");
    setEventCity("");
    setEventFromCity("");
    setEventToCity("");
    setSelectedDates([]);
    setEventsByDate({});
    setSource("");
    setWhoseWhatsapp("");
    setOldClientName("");
    setWhoAdded("");
    setInquiryDate(undefined);
    setInquiryTime("");
  };

  const handleClientLocationChange = (location: string) => {
    setClientLocation(location);
    if (location === "INSIDE NEPAL") {
      setCurrentCountry("Nepal");
      setCurrentCountryCode("NP");
    }
  };

  const handleCountryChange = (countryName: string, countryCode?: string) => {
    setCurrentCountry(countryName);
    setCurrentCountryCode(countryCode || getCountryCodeFromName(countryName));
  };

  const getCityOptions = () => {
    if (eventLocation === "INSIDE VALLEY") return valleyCities;
    if (eventLocation === "OUTSIDE VALLEY") return nepalCitiesOutsideValley;
    return [];
  };

  const getEventCityValue = () => {
    if (eventLocation === "INSIDE VALLEY" || eventLocation === "OUTSIDE VALLEY") {
      return eventCity;
    }
    if (eventLocation === "MIXED" || eventLocation === "ABROAD") {
      if (eventFromCity && eventToCity) {
        return `${eventFromCity} - ${eventToCity}`;
      }
      return eventFromCity || eventToCity || "";
    }
    return "";
  };

  const getSourceValue = () => {
    if (source === "WHATSAPP" && whoseWhatsapp) return `WHATSAPP - ${whoseWhatsapp}`;
    if (source === "HANDLER" && whoseWhatsapp) return `HANDLER - ${whoseWhatsapp}`;
    if (source === "OLD CLIENT" && oldClientName) return `OLD CLIENT - ${oldClientName}`;
    return source;
  };

  const handleSave = async () => {
    if (!editedClient) return;
    
    setIsSaving(true);
    
    try {
      // Sort dates and format for saving
      const sortedForSave = [...selectedDates].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        const dayA = a.day === "**" ? 99 : a.day;
        const dayB = b.day === "**" ? 99 : b.day;
        return (dayA as number) - (dayB as number);
      });

      const eventYears = sortedForSave.map(d => d.year).join("\n");
      const eventMonths = sortedForSave.map(d => d.month).join("\n");
      const eventDays = sortedForSave.map(d => getDayForStorage(d.day)).join("\n");
      const eventADDates = sortedForSave.map(d => {
        const adResult = bsToAD(d.year, d.month, d.day);
        if (isUnknownDay(d.day)) {
          return adResult as string;
        }
        return format(adResult as Date, "yyyy-MM-dd");
      }).join("\n");
      const eventsFormatted = sortedForSave
        .map(d => eventsByDate[getDateKey(d)] || "")
        .filter(Boolean)
        .join("\n");

      const countryForSheet = clientLocation === "INSIDE NEPAL" ? "Nepal" : currentCountry;

      const updatedClient: ClientData = {
        ...editedClient,
        clientName: editedClient.clientName,
        source: getSourceValue(),
        clientLocation,
        currentCountry: countryForSheet,
        contactNo,
        whatsappNo,
        eventLocation,
        eventCity: getEventCityValue(),
        events: eventsFormatted,
        eventYear: eventYears,
        eventMonth: eventMonths,
        eventDay: eventDays,
        eventDateAD: eventADDates,
        whoAdded,
        description: editedClient.description,
        inquiryDateAD: inquiryDate ? format(inquiryDate, "yyyy-MM-dd") : editedClient.inquiryDateAD,
        inquiryTime,
      };

      // ── Instant: write to Supabase cache ──
      await updateClientInCacheRecord(updatedClient);

      toast({ title: "Success!", description: "Client updated successfully" });

      if (onSave) {
        onSave(updatedClient);
      }

      setIsEditing(false);
      resetFormState();
      onClose();

      // ── Background: sync to Google Sheets ──
      updateClient(updatedClient).catch(err => {
        console.warn('[BACKGROUND-SHEETS] [updateClient] Sync failed, data safe in Supabase:', err);
      });

    } catch (error) {
      console.error("Update error:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update client", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ClientData, value: string) => {
    if (editedClient) {
      setEditedClient({ ...editedClient, [field]: value });
    }
  };

  const formatPhoneLink = (phone: string) => {
    return `tel:${phone.replace(/\s+/g, '')}`;
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleanNumber = phone.replace(/\s+/g, '').replace(/^\+/, '');
    return `https://wa.me/${cleanNumber}`;
  };

  const formatDate = (dateAD?: string, dateBS?: string) => {
    if (dateBS && dateAD) {
      return `${dateBS} (${dateAD})`;
    }
    return dateAD || dateBS || 'Not set';
  };

  const currentData = isEditing ? editedClient : client;
  if (!currentData) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{isEditing ? "Edit Client" : "Client Details"}</SheetTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving}>
                    <X className="w-5 h-5" />
                  </Button>
                  <Button variant="default" size="icon" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                  <Pencil className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {isEditing ? (
          // Edit Mode - Using same form components as QuickAdd
          <div className="space-y-4 pb-10">
            {/* Client Basic Details */}
            <FormSection title="Client Basic Details">
              <FormInput 
                label="Client Name" 
                value={editedClient?.clientName || ''} 
                onChange={(val) => updateField('clientName', val)} 
                placeholder="Enter client name" 
              />
              <FormSelect 
                label="Source" 
                value={source} 
                onChange={setSource} 
                options={dropdowns?.sources || []} 
                placeholder="How did they find us?" 
              />
              {source === "WHATSAPP" && (
                <FormSelect 
                  label="Whose WhatsApp?" 
                  value={whoseWhatsapp} 
                  onChange={setWhoseWhatsapp} 
                  options={dropdowns?.whatsappOwners || []} 
                />
              )}
              {source === "HANDLER" && (
                <FormSelect 
                  label="Which Handler?" 
                  value={whoseWhatsapp} 
                  onChange={setWhoseWhatsapp} 
                  options={dropdowns?.whatsappOwners || []} 
                />
              )}
              {source === "OLD CLIENT" && (
                <FormInput 
                  label="Old Client Name" 
                  value={oldClientName} 
                  onChange={setOldClientName} 
                  placeholder="Enter old client name" 
                />
              )}
            </FormSection>

            {/* Location & Contact */}
            <FormSection title="Location & Contact">
              <FormSelect 
                label="Client Current Location" 
                value={clientLocation} 
                onChange={handleClientLocationChange} 
                options={clientLocationOptions}
                placeholder="Where is the client currently?"
              />
              {clientLocation === "OUTSIDE NEPAL" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Current Country</label>
                  <CountrySelector 
                    value={currentCountry} 
                    onChange={handleCountryChange}
                    showAllCountries={true}
                    placeholder="Select country..."
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Number</label>
                <PhoneInputField value={contactNo} onChange={setContactNo} defaultCountry="NP" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp Number</label>
                <PhoneInputField 
                  value={whatsappNo} 
                  onChange={setWhatsappNo} 
                  defaultCountry={clientLocation === "OUTSIDE NEPAL" ? currentCountryCode : "NP"} 
                />
              </div>
            </FormSection>

            {/* Event Location */}
            <FormSection title="Event Location">
              <FormSelect 
                label="Event Location" 
                value={eventLocation} 
                onChange={(val) => {
                  setEventLocation(val);
                  setEventCity("");
                  setEventFromCity("");
                  setEventToCity("");
                }} 
                options={dropdowns?.eventLocations || []} 
              />
              {(eventLocation === "INSIDE VALLEY" || eventLocation === "OUTSIDE VALLEY") && (
                <FormSelect 
                  label="City" 
                  value={eventCity} 
                  onChange={setEventCity} 
                  options={getCityOptions()} 
                />
              )}
              {(eventLocation === "MIXED" || eventLocation === "ABROAD") && (
                <>
                  <FormInput 
                    label="From" 
                    value={eventFromCity} 
                    onChange={setEventFromCity} 
                    placeholder="Starting location/city" 
                  />
                  <FormInput 
                    label="To" 
                    value={eventToCity} 
                    onChange={setEventToCity} 
                    placeholder="Destination location/city" 
                  />
                </>
              )}
            </FormSection>

            {/* Event Dates */}
            <FormSection title="Event Dates (BS Calendar)">
              <NepaliCalendar selectedDates={selectedDates} onDateSelect={setSelectedDates} multiSelect />
            </FormSection>

            {/* Event Selection for Each Date */}
            {sortedDates.length > 0 && (
              <FormSection title={`Events (${sortedDates.length} date${sortedDates.length > 1 ? "s" : ""} selected)`}>
                <div className="space-y-3">
                  {sortedDates.map((date) => (
                    <EventSelector
                      key={getDateKey(date)}
                      date={date}
                      selectedEvent={eventsByDate[getDateKey(date)] || ""}
                      onEventChange={(event) => handleEventChange(date, event)}
                      eventOptions={allEventOptions}
                      onRemoveDate={() => handleRemoveDate(date)}
                    />
                  ))}
                </div>
              </FormSection>
            )}

            {/* Inquiry Details */}
            <FormSection title="Inquiry Details">
              <FormSelect 
                label="Who Added" 
                value={whoAdded} 
                onChange={setWhoAdded} 
                options={dropdowns?.whatsappOwners || []} 
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Inquiry Date</label>
                <input
                  type="date"
                  value={inquiryDate ? format(inquiryDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setInquiryDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <FormInput 
                label="Inquiry Time" 
                value={inquiryTime} 
                onChange={setInquiryTime} 
                type="time" 
              />
              <FormInput 
                label="Description" 
                value={editedClient?.description || ''} 
                onChange={(val) => updateField('description', val)} 
                multiline 
                maxLength={500} 
                placeholder="Brief notes about the inquiry..." 
              />
            </FormSection>

            {/* Save Button */}
            <Button 
              type="button"
              onClick={handleSave}
              disabled={isSaving} 
              className="w-full h-14 text-lg font-semibold gradient-primary text-white mt-6"
            >
              {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        ) : (
          // View Mode
          <div className="space-y-5 pb-10">
            {/* Client Header */}
            <div className="flex items-start gap-4 pt-2">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{currentData.clientName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Added by {currentData.whoAdded || 'Unknown'}
                </p>
              </div>
              {/* Location Badge */}
              {location && (
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-sm font-semibold px-3 py-1.5 rounded-lg",
                    location.type === 'IV' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    location.type === 'OV' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    location.type === 'MX' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                    location.type === 'AB' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  )}>
                    {location.type}
                  </span>
                  {location.city && (
                    <p className="text-xs text-muted-foreground mt-1">{location.city}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Contact Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </h3>
              
              <div className="grid gap-3">
                {/* Phone Number */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{currentData.contactNo || 'Not provided'}</p>
                  </div>
                  {currentData.contactNo && (
                    <a 
                      href={formatPhoneLink(currentData.contactNo)} 
                      className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>

                {/* WhatsApp Number */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="font-medium">{currentData.whatsappNo || 'Not provided'}</p>
                  </div>
                  {currentData.whatsappNo && (
                    <a 
                      href={formatWhatsAppLink(currentData.whatsappNo)} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full bg-[#25D366] text-white hover:bg-[#1da851] transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Events Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Events
              </h3>
              
              {events.length > 0 ? (
                <div className="space-y-2">
                  {events.map((event, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">{event.eventName}</p>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                          {event.year} {event.monthName} {event.day}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/50">
                  No events recorded
                </p>
              )}
            </div>

            <Separator />

            {/* Location Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location Details
              </h3>
              
              <div className="grid gap-2">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Event Location</p>
                  <p className="font-medium">{currentData.eventLocation || 'Not specified'}</p>
                  {currentData.eventCity && (
                    <p className="text-sm text-muted-foreground mt-1">{currentData.eventCity}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Current Location</p>
                  <p className="font-medium">{currentData.currentCountry || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Source & Additional Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4" />
                Source & Info
              </h3>
              
              <div className="grid gap-2">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{currentData.source || 'Not specified'}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Client Location Type</p>
                  <p className="font-medium">{currentData.clientLocation || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Date Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Dates
              </h3>
              
              <div className="grid gap-2">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Inquiry Date</p>
                  <p className="font-medium">{formatDate(currentData.inquiryDateAD, currentData.inquiryDateBS)}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Registered</p>
                  <p className="font-medium">{formatDate(currentData.registeredDateTimeAD, currentData.registeredDateBS)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {currentData.description && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </h3>
                  
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">{currentData.description}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}