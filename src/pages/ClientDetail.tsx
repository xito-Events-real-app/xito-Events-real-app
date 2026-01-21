import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import { ArrowLeft, Phone, MessageCircle, Mail, MapPin, Calendar, User, Clock, DollarSign, FileText, Activity, MessageSquare, Briefcase, Pencil, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCachedData } from "@/hooks/useCachedData";
import { useDropdownData } from "@/hooks/useDropdownData";
import { updateClient, ClientData } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  formatBSDateDisplay, 
  parsePayments, 
  getPaymentTypeBadgeColor,
  parseQuotationData,
  getQuotationTierColor,
  parseMindset,
  getMindsetColor,
  parseCallLog,
  parseComments,
  getRelativeTime,
  getCurrentStatus,
  formatNPR,
  parseFinalQuotation,
  getTotalPaid,
  getMonthColorClasses,
  parseInquiryMonth,
  getDetailedEnquiryInfo
} from "@/lib/client-card-utils";
import { nepaliMonthsEnglish, NepaliDateObject, bsToAD, isUnknownDay, getDayForStorage } from "@/lib/nepali-date";
import NepaliDate from "nepali-date-converter";
import { FormSection, FormInput, FormSelect, CountrySelector, PhoneInputField, NepaliCalendar } from "@/components/form";
import { EventSelector } from "@/components/form/EventSelector";
import { getCountryCodeFromName } from "@/components/form/CountrySelector";
import { valleyCities, nepalCitiesOutsideValley, clientLocationOptions } from "@/lib/form-data";

// Helper to convert AD date to BS formatted string
function formatADtoBS(adDateStr: string): string {
  if (!adDateStr) return '';
  try {
    const parts = adDateStr.split(/[-T]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      const np = new NepaliDate(date);
      return `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()}`;
    }
  } catch {}
  return adDateStr;
}

// Helper to convert AD timestamp to BS with time
function formatADtoBSWithTime(adDateStr: string): string {
  if (!adDateStr) return '';
  try {
    let timeStr = '';
    const parts = adDateStr.split('T');
    const dateParts = parts[0].split('-').map(Number);
    
    if (parts.length > 1) {
      const timeMatch = parts[1].match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const mins = parseInt(timeMatch[2]);
        const isPM = hours >= 12;
        const displayHours = hours % 12 || 12;
        timeStr = ` at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      }
    }
    
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const np = new NepaliDate(date);
    return `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()}${timeStr}`;
  } catch {}
  return adDateStr;
}

// Get event type color
function getEventTypeColor(eventName: string): string {
  const upper = eventName.toUpperCase();
  if (upper.includes('WEDDING')) return 'bg-primary/10 text-primary border-primary/30';
  if (upper.includes('RECEPTION')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300';
  if (upper.includes('ENGAGEMENT')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-300';
  if (upper.includes('PRE')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300';
  return 'bg-muted text-muted-foreground border-muted';
}

// Get status color
function getStatusColor(status: string): string {
  const upper = status.toUpperCase();
  if (upper.includes('BOOKED') && !upper.includes('SOMEWHERE')) return 'bg-emerald-500 text-white';
  if (upper.includes('CANCELLED')) return 'bg-red-500 text-white';
  if (upper.includes('QUOTATION SENT')) return 'bg-blue-500 text-white';
  if (upper.includes('BARGAINING')) return 'bg-amber-500 text-white';
  if (upper.includes('ADVANCE')) return 'bg-violet-500 text-white';
  if (upper.includes('POSTPONED')) return 'bg-gray-500 text-white';
  return 'bg-slate-500 text-white';
}

const ClientDetail = () => {
  const { rowNumber } = useParams<{ rowNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, isLoading, updateClient: updateClientCache } = useCachedData();
  const { data: dropdowns } = useDropdownData();

  // Edit mode state
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
  const [inquiryTimeInput, setInquiryTimeInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [clientNameInput, setClientNameInput] = useState("");

  // Get the from state to preserve filter position when going back
  const fromState = location.state as { from?: string; filters?: any; scrollPosition?: number } | null;

  const client = useMemo(() => {
    if (!rowNumber || !clients.length) return null;
    return clients.find(c => String(c.rowNumber) === rowNumber);
  }, [clients, rowNumber]);

  // All event options for the event selector
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
      const dayA: number = isUnknownDay(a.day) ? 99 : (a.day as number);
      const dayB: number = isUnknownDay(b.day) ? 99 : (b.day as number);
      return dayA - dayB;
    });
  }, [selectedDates]);

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
  const parseExistingDates = (clientData: ClientData): NepaliDateObject[] => {
    if (!clientData.eventYear || !clientData.eventMonth || !clientData.eventDay) return [];
    
    const years = clientData.eventYear.split('\n');
    const months = clientData.eventMonth.split('\n');
    const days = clientData.eventDay.split('\n');
    
    const dates: NepaliDateObject[] = [];
    for (let i = 0; i < years.length; i++) {
      if (years[i] && months[i] && days[i]) {
        const dayValue = days[i].trim();
        dates.push({
          year: parseInt(years[i]),
          month: parseInt(months[i]),
          day: dayValue === "**" ? "**" : parseInt(dayValue)
        });
      }
    }
    return dates;
  };

  // Parse source into base and sub-value
  const parseSource = (sourceStr: string): { base: string; sub: string } => {
    if (sourceStr.startsWith('WHATSAPP - ')) {
      return { base: 'WHATSAPP', sub: sourceStr.replace('WHATSAPP - ', '') };
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
    if (!client) return;
    setEditedClient({ ...client });
    
    setClientNameInput(client.clientName || '');
    setClientLocation(client.clientLocation || '');
    setCurrentCountry(client.currentCountry || '');
    setCurrentCountryCode(getCountryCodeFromName(client.currentCountry || 'Nepal'));
    setContactNo(client.contactNo || '');
    setWhatsappNo(client.whatsappNo || '');
    setEventLocation(client.eventLocation || '');
    setEmailInput(client.email || '');
    setDescriptionInput(client.description || '');
    
    const cityParsed = parseEventCity(client.eventLocation || '', client.eventCity || '');
    setEventCity(cityParsed.city);
    setEventFromCity(cityParsed.from);
    setEventToCity(cityParsed.to);
    
    const dates = parseExistingDates(client);
    setSelectedDates(dates);
    
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
    else if (base === 'OLD CLIENT') setOldClientName(sub);
    
    setWhoAdded(client.whoAdded || '');
    
    if (client.inquiryDateAD) {
      setInquiryDate(new Date(client.inquiryDateAD));
    }
    setInquiryTimeInput(client.inquiryTime || '');
    
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
    setInquiryTimeInput("");
    setDescriptionInput("");
    setEmailInput("");
    setClientNameInput("");
  };

  const handleClientLocationChange = (loc: string) => {
    setClientLocation(loc);
    if (loc === "INSIDE NEPAL") {
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
    if (source === "OLD CLIENT" && oldClientName) return `OLD CLIENT - ${oldClientName}`;
    return source;
  };

  const handleSave = async () => {
    if (!editedClient || !client) return;
    
    setIsSaving(true);
    
    try {
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
        clientName: clientNameInput,
        source: getSourceValue(),
        clientLocation,
        currentCountry: countryForSheet,
        contactNo,
        whatsappNo,
        email: emailInput,
        eventLocation,
        eventCity: getEventCityValue(),
        events: eventsFormatted,
        eventYear: eventYears,
        eventMonth: eventMonths,
        eventDay: eventDays,
        eventDateAD: eventADDates,
        whoAdded,
        description: descriptionInput,
        inquiryDateAD: inquiryDate ? format(inquiryDate, "yyyy-MM-dd") : editedClient.inquiryDateAD,
        inquiryTime: inquiryTimeInput,
      };

      await updateClient(updatedClient);
      
      // Update cache
      if (updateClientCache) {
        updateClientCache(updatedClient);
      }
      
      toast({ title: "Success!", description: "Client updated successfully" });
      
      setIsEditing(false);
      resetFormState();
      
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

  const handleBack = () => {
    if (fromState?.from) {
      // Navigate back to the original page with preserved state
      navigate(fromState.from, { 
        state: { 
          ...fromState.filters,
          scrollPosition: fromState.scrollPosition 
        } 
      });
    } else {
      navigate(-1);
    }
  };

  // Parse events
  const events = useMemo(() => {
    if (!client) return [];
    const eventNames = (client.events || '').split('\n').filter(Boolean);
    const years = (client.eventYear || '').split('\n').filter(Boolean);
    const months = (client.eventMonth || '').split('\n').filter(Boolean);
    const days = (client.eventDay || '').split('\n').filter(Boolean);
    
    return eventNames.map((name, i) => ({
      name,
      year: years[i] || '',
      month: months[i] || '',
      day: days[i] || '',
      formatted: `${nepaliMonthsEnglish[parseInt(months[i]) - 1] || months[i]} ${days[i]}, ${years[i]}`
    }));
  }, [client]);

  // Parse inquiry info
  const inquiryInfo = useMemo(() => {
    if (!client) return null;
    return getDetailedEnquiryInfo(client.inquiryDateAD, client.inquiryTime, client.inquiryDateBS);
  }, [client]);

  // Get month for color
  const inquiryMonth = useMemo(() => {
    if (!client) return null;
    return parseInquiryMonth(client.inquiryDateBS);
  }, [client]);

  const currentStatus = client ? getCurrentStatus(client.statusLog) : '';
  const quotationTiers = client ? parseQuotationData(client.quotationData) : [];
  const mindsetData = client ? parseMindset(client.mindset) : null;
  const callEntries = client ? parseCallLog(client.callLog) : [];
  const comments = client ? parseComments(client.comments) : [];
  const finalQuotation = client ? parseFinalQuotation(client.finalQuotation) : null;
  const payments = client ? parsePayments(client.paymentsMade) : [];
  const totalPaid = client ? getTotalPaid(client.paymentsMade) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">Client not found</div>
        <Button onClick={() => navigate('/client-tracker')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className={`text-lg font-bold px-3 py-1 rounded-md ${inquiryMonth ? getMonthColorClasses(inquiryMonth) : 'bg-muted'}`}>
                {isEditing ? "Edit Client" : client.clientName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-5 w-5" />
                </Button>
                <Button variant="default" size="icon" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={handleEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {client.contactNo && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={`tel:${client.contactNo}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {client.whatsappNo && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={`https://wa.me/${client.whatsappNo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        /* Edit Mode */
        <div className="container mx-auto px-4 py-6 space-y-4 pb-20">
          {/* Client Basic Details */}
          <FormSection title="Client Basic Details">
            <FormInput 
              label="Client Name" 
              value={clientNameInput} 
              onChange={setClientNameInput} 
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
            {source === "OLD CLIENT" && (
              <FormInput 
                label="Old Client Name" 
                value={oldClientName} 
                onChange={setOldClientName} 
                placeholder="Enter old client name" 
              />
            )}
            <FormSelect 
              label="Added By" 
              value={whoAdded} 
              onChange={setWhoAdded} 
              options={dropdowns?.whatsappOwners || []} 
              placeholder="Who added this client?" 
            />
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
            <FormInput 
              label="Email" 
              value={emailInput} 
              onChange={setEmailInput} 
              placeholder="client@email.com" 
            />
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
              placeholder="Select location type"
            />
            {(eventLocation === "INSIDE VALLEY" || eventLocation === "OUTSIDE VALLEY") && (
              <FormSelect 
                label="Event City" 
                value={eventCity} 
                onChange={setEventCity} 
                options={getCityOptions()}
                placeholder="Select city"
              />
            )}
            {(eventLocation === "MIXED" || eventLocation === "ABROAD") && (
              <div className="grid grid-cols-2 gap-3">
                <FormInput 
                  label="From City" 
                  value={eventFromCity} 
                  onChange={setEventFromCity} 
                  placeholder="e.g. Kathmandu" 
                />
                <FormInput 
                  label="To City" 
                  value={eventToCity} 
                  onChange={setEventToCity} 
                  placeholder="e.g. Pokhara" 
                />
              </div>
            )}
          </FormSection>

          {/* Events & Dates */}
          <FormSection title="Events & Dates">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Event Dates (BS Calendar)</label>
              <NepaliCalendar
                selectedDates={selectedDates}
                onDateSelect={setSelectedDates}
              />
            </div>
            
            {sortedDates.length > 0 && (
              <div className="space-y-3 mt-4">
                {sortedDates.map((date) => {
                  const key = getDateKey(date);
                  return (
                    <EventSelector
                      key={key}
                      date={date}
                      selectedEvent={eventsByDate[key] || ""}
                      onEventChange={(event) => handleEventChange(date, event)}
                      eventOptions={allEventOptions}
                      onRemoveDate={() => handleRemoveDate(date)}
                    />
                  );
                })}
              </div>
            )}
          </FormSection>

          {/* Inquiry Details */}
          <FormSection title="Inquiry Details">
            <FormInput 
              label="Description" 
              value={descriptionInput} 
              onChange={setDescriptionInput} 
              placeholder="Any details about the inquiry..." 
            />
            <FormInput 
              label="Inquiry Time" 
              value={inquiryTimeInput} 
              onChange={setInquiryTimeInput} 
              placeholder="e.g. 10:30 AM" 
            />
          </FormSection>
        </div>
      ) : (
        /* View Mode */
        <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Section - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Client Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Client Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{client.source || 'Unknown Source'}</Badge>
              </div>
              {client.contactNo && (
                <a href={`tel:${client.contactNo}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3 w-3" />
                  {client.contactNo}
                </a>
              )}
              {client.whatsappNo && (
                <a href={`https://wa.me/${client.whatsappNo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <MessageCircle className="h-3 w-3" />
                  {client.whatsappNo}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Events Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events & Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.map((event, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={getEventTypeColor(event.name)}>
                    {event.name}
                  </Badge>
                  <span className="text-sm font-medium">{event.formatted}</span>
                </div>
              ))}
              {client.eventCity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                  <MapPin className="h-3 w-3" />
                  {client.eventCity}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Details Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Category Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge className={getStatusColor(currentStatus)}>
                {currentStatus || 'UNTOUCHED'}
              </Badge>
              {client.clientHandler && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Handler:</span>{' '}
                  <span className="font-medium">{client.clientHandler}</span>
                </div>
              )}
              {inquiryInfo && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Inquired:</span>{' '}
                  <span className="font-medium">{inquiryInfo.timeAgo} ago</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="registration" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max gap-1 p-1">
              <TabsTrigger value="registration" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Registration
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Events
              </TabsTrigger>
              <TabsTrigger value="inquiry" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Inquiry
              </TabsTrigger>
              <TabsTrigger value="sales" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Sales
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Financials
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* Registration Tab */}
          <TabsContent value="registration" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Registered Date</div>
                    <div className="font-medium">{formatADtoBSWithTime(client.registeredDateTimeAD)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Registered Date (BS)</div>
                    <div className="font-medium">{formatBSDateDisplay(client.registeredDateBS)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Added By</div>
                    <div className="font-medium">{client.whoAdded || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Source</div>
                    <div className="font-medium">{client.source || 'Unknown'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Client Location</div>
                    <div className="font-medium">{client.clientLocation || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Current Country</div>
                    <div className="font-medium">{client.currentCountry || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Contact Number</div>
                    <div className="font-medium">
                      {client.contactNo ? (
                        <a href={`tel:${client.contactNo}`} className="text-primary hover:underline">{client.contactNo}</a>
                      ) : 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">WhatsApp Number</div>
                    <div className="font-medium">
                      {client.whatsappNo ? (
                        <a href={`https://wa.me/${client.whatsappNo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.whatsappNo}</a>
                      ) : 'Not provided'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">
                      {client.email ? (
                        <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
                      ) : 'Not provided'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  {events.map((event, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <Badge variant="outline" className={`${getEventTypeColor(event.name)} text-base px-3 py-1`}>
                        {event.name}
                      </Badge>
                      <div className="text-right">
                        <div className="font-semibold">{event.formatted}</div>
                        <Badge variant="secondary" className="text-xs">{event.year}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Event Location Type</div>
                      <div className="font-medium">{client.eventLocation || 'Not specified'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Event City/Venue</div>
                      <div className="font-medium">{client.eventCity || 'Not specified'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiry Tab */}
          <TabsContent value="inquiry" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Inquiry Date (BS)</div>
                    <div className="font-medium">{inquiryInfo?.bsDisplay || formatBSDateDisplay(client.inquiryDateBS)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Inquiry Date (AD)</div>
                    <div className="font-medium">{client.inquiryDateAD || 'Not recorded'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Inquiry Time</div>
                    <div className="font-medium">{client.inquiryTime || 'Not recorded'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Time Since Inquiry</div>
                    <div className={`font-medium ${
                      inquiryInfo?.urgency === 'critical' ? 'text-red-500' :
                      inquiryInfo?.urgency === 'urgent' ? 'text-orange-500' :
                      inquiryInfo?.urgency === 'warning' ? 'text-amber-500' : ''
                    }`}>
                      {inquiryInfo?.timeAgo ? `${inquiryInfo.timeAgo} ago` : 'Unknown'}
                    </div>
                  </div>
                </div>
                {client.description && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Description</div>
                    <div className="p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">{client.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Initial Quotation */}
                <div>
                  <div className="text-sm text-muted-foreground mb-3">Initial Quotation</div>
                  {quotationTiers.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {quotationTiers.map((tier, i) => (
                        <div key={i} className={`p-3 rounded-lg ${getQuotationTierColor(tier.tier)}`}>
                          <div className="text-xs font-medium opacity-80">{tier.tier}</div>
                          <div className="font-semibold">{tier.amount}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No quotation sent yet</div>
                  )}
                </div>

                {/* Mindset */}
                {mindsetData?.name && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Client Mindset</div>
                    <Badge className={getMindsetColor(mindsetData.name)}>{mindsetData.name}</Badge>
                    {mindsetData.timestamp && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {getRelativeTime(mindsetData.timestamp)}
                      </span>
                    )}
                  </div>
                )}

                {/* Bargaining */}
                {(client.ourBargainedRates || client.clientBargainedRates) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Our Bargained Rates</div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        {client.ourBargainedRates || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Client Bargained Rates</div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        {client.clientBargainedRates || 'Not set'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Quotation */}
                {finalQuotation && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Final Fixed Quotation 🔒</div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Badge className="bg-emerald-500 text-white mb-2">{finalQuotation.package}</Badge>
                      <div className="text-2xl font-bold">NPR {formatNPR(finalQuotation.amount)}/-</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Current Status */}
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Current Status</div>
                  <Badge className={`${getStatusColor(currentStatus)} text-base px-4 py-2`}>
                    {currentStatus || 'UNTOUCHED'}
                  </Badge>
                </div>

                {/* Handler */}
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Client Handler</div>
                  <div className="font-medium">{client.clientHandler || 'Not assigned'}</div>
                </div>

                {/* Status History */}
                {client.statusLog && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Status History</div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {client.statusLog.split('\n').filter(Boolean).reverse().map((status, i) => {
                        // Parse status timestamp for BS display
                        const bracketMatch = status.match(/\[(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]/);
                        let bsDate = '';
                        if (bracketMatch) {
                          const [month, day, year] = bracketMatch[1].split('/').map(Number);
                          const [hours, mins] = bracketMatch[2].split(':').map(Number);
                          try {
                            const date = new Date(year, month - 1, day, hours, mins);
                            const np = new NepaliDate(date);
                            const isPM = hours >= 12;
                            const displayHours = hours % 12 || 12;
                            bsDate = `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()} at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                          } catch {}
                        }
                        const statusName = status.split(' [')[0].trim();
                        return (
                          <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                            <div className="font-medium">{statusName}</div>
                            {bsDate && <div className="text-xs text-muted-foreground">{bsDate}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Call Log */}
                {callEntries.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Call History ({callEntries.length} calls)</div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {callEntries.map((call, i) => {
                        // Parse call date for BS display
                        let bsDate = call.date;
                        if (call.date) {
                          try {
                            const [year, month, day] = call.date.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            const np = new NepaliDate(date);
                            bsDate = `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()}`;
                          } catch {}
                        }
                        return (
                          <div key={i} className="p-2 bg-muted/50 rounded text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {call.type === 'WHATSAPP' ? (
                                <MessageCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Phone className="h-4 w-4 text-blue-500" />
                              )}
                              <span>{call.type}</span>
                            </div>
                            <div className="text-muted-foreground">
                              {bsDate} {call.time && `at ${call.time}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment, i) => {
                      let bsDate = '';
                      if (comment.timestamp) {
                        try {
                          const np = new NepaliDate(comment.timestamp);
                          const hours = comment.timestamp.getHours();
                          const mins = comment.timestamp.getMinutes();
                          const isPM = hours >= 12;
                          const displayHours = hours % 12 || 12;
                          bsDate = `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()} at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                        } catch {}
                      }
                      return (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <div className="whitespace-pre-wrap">{comment.text}</div>
                          {bsDate && (
                            <div className="text-xs text-muted-foreground mt-2">{bsDate}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">No comments yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Summary Cards */}
                {finalQuotation && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">Total Quote</div>
                      <div className="text-lg font-bold">NPR {formatNPR(finalQuotation.amount)}/-</div>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">Total Paid</div>
                      <div className="text-lg font-bold text-emerald-600">NPR {formatNPR(totalPaid)}/-</div>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">Remaining</div>
                      <div className="text-lg font-bold text-amber-600">
                        {client.remainingPayment || `NPR ${formatNPR(parseInt(finalQuotation.amount.replace(/,/g, '')) - totalPaid)}/-`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Progress */}
                {finalQuotation && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">
                        {Math.round((totalPaid / parseInt(finalQuotation.amount.replace(/,/g, ''))) * 100)}%
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (totalPaid / parseInt(finalQuotation.amount.replace(/,/g, ''))) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Payments Table */}
                {payments.length > 0 ? (
                  <div>
                    <div className="text-sm text-muted-foreground mb-3">Payment History</div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Type</th>
                            <th className="text-left p-3 font-medium">Date (BS)</th>
                            <th className="text-left p-3 font-medium">Bank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-3 font-semibold">{payment.amount}</td>
                              <td className="p-3">
                                <Badge className={getPaymentTypeBadgeColor(payment.type)}>{payment.type}</Badge>
                              </td>
                              <td className="p-3">{payment.dateBSFormatted}</td>
                              <td className="p-3">{payment.bank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">No payments recorded</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
