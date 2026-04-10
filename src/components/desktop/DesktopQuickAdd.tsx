import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Save, RotateCcw, User, MapPin, Calendar, FileText, Phone, Loader2, RefreshCw, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSection, FormInput, FormSelect, CountrySelector, NepaliCalendar } from "@/components/form";
import { FormCombobox } from "@/components/form/FormCombobox";
import { EventSelector } from "@/components/form/EventSelector";
import { ServiceTypeSelector } from "@/components/form/ServiceTypeSelector";
import { getCountryCodeFromName } from "@/components/form/CountrySelector";
import { valleyCities, nepalCitiesOutsideValley, clientLocationOptions } from "@/lib/form-data";
import { 
  NepaliDateObject, 
  bsToAD, 
  adToBS, 
  formatBSDate, 
  isUnknownDay, 
  getDayForStorage 
} from "@/lib/nepali-date";
import { useCachedData } from "@/hooks/useCachedData";
import { addClient, addOldClient, ClientData } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Helper function to get date key for eventsByDate mapping
const getDateKey = (d: NepaliDateObject): string => {
  return `${d.year}-${d.month}-${d.day}`;
};

export function DesktopQuickAdd() {
  const navigate = useNavigate();
  const { dropdowns, isFromCache, isSyncing, refreshData } = useCachedData();
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [whoseWhatsapp, setWhoseWhatsapp] = useState("");
  const [oldClientName, setOldClientName] = useState("");
  const [initialStatus, setInitialStatus] = useState("");
  const [whoAdded, setWhoAdded] = useState("");
  const [clientHandler, setClientHandler] = useState("");
  const [inquiryDate, setInquiryDate] = useState<Date | undefined>(new Date());
  const [inquiryTime, setInquiryTime] = useState(() => format(new Date(), "HH:mm"));
  const [description, setDescription] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventCityValley, setEventCityValley] = useState("");
  const [eventFromCity, setEventFromCity] = useState("");
  const [eventToCity, setEventToCity] = useState("");
  const [selectedDates, setSelectedDates] = useState<NepaliDateObject[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, string>>({});
  
  // Final Quotation state (for BOOKED status)
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [packagePrices, setPackagePrices] = useState({
    BASIC: "",
    STANDARD: "",
    PREMIUM: "",
    "WTN SPECIAL": ""
  });

  // Check if BOOKED status is selected
  const isBookedStatus = initialStatus?.toUpperCase().includes("BOOKED") && !initialStatus?.toUpperCase().includes("SOMEWHERE ELSE");

  // Set default Company Name when dropdowns load
  useEffect(() => {
    if (companyName === "" && dropdowns?.companyNames && dropdowns.companyNames.length > 0) {
      const defaultCompany = dropdowns.companyNames.find(
        (name) => name.trim().toUpperCase() === "WEDDING TALES NEPAL"
      );
      if (defaultCompany) {
        setCompanyName(defaultCompany);
      }
    }
  }, [companyName, dropdowns?.companyNames]);

  // Set default Service Type when dropdowns load
  useEffect(() => {
    if (serviceTypes.length === 0) {
      const effectiveOptions = dropdowns?.serviceTypes && dropdowns.serviceTypes.length > 0 
        ? dropdowns.serviceTypes 
        : ["PHOTOGRAPHY", "VIDEOGRAPHY", "DRONE"];
      
      const defaultService = effectiveOptions.find(
        (s) => s.trim().toUpperCase() === "PHOTOGRAPHY"
      );
      if (defaultService) {
        setServiceTypes([defaultService]);
      } else if (effectiveOptions.length > 0) {
        setServiceTypes([effectiveOptions[0]]);
      }
    }
  }, [serviceTypes.length, dropdowns?.serviceTypes]);

  // Use allEvents from EVENT SETUP DATA sheet, fallback to combined events for backwards compatibility
  const availableEvents = useMemo(() => {
    if (dropdowns?.allEvents && dropdowns.allEvents.length > 0) {
      return dropdowns.allEvents;
    }
    // Fallback to old method (combining from D, E, F columns)
    const all: string[] = [];
    if (dropdowns?.preweddingEvents) all.push(...dropdowns.preweddingEvents);
    if (dropdowns?.weddingEvents) all.push(...dropdowns.weddingEvents);
    if (dropdowns?.postweddingEvents) all.push(...dropdowns.postweddingEvents);
    return [...new Set(all)]; // Remove duplicates
  }, [dropdowns]);

  const valleyCitiesOptions = valleyCities.map(city => city);
  const outsideValleyCitiesOptions = nepalCitiesOutsideValley.map(city => city);

  const handleClientLocationChange = (value: string) => {
    setClientLocation(value);
    if (value !== "OUTSIDE NEPAL") {
      setCurrentCountry("");
      setDialCode("");
    }
  };

  const handleCountryChange = (country: string, code: string) => {
    setCurrentCountry(country);
    setDialCode(code);
  };

  const handleEventLocationChange = (value: string) => {
    setEventLocation(value);
    setEventCity("");
    setEventCityValley("");
    setEventFromCity("");
    setEventToCity("");
  };

  const getSourceValue = () => {
    if (source === "WHATSAPP" && whoseWhatsapp) return `WHATSAPP - ${whoseWhatsapp}`;
    if (source === "HANDLER" && whoseWhatsapp) return `HANDLER - ${whoseWhatsapp}`;
    if (source === "OLD CLIENT" && oldClientName) return `OLD CLIENT - ${oldClientName}`;
    return source;
  };

  const getEventCityValue = () => {
    if (eventLocation === "INSIDE KATHMANDU VALLEY") return eventCityValley;
    if (eventLocation === "OUTSIDE KATHMANDU VALLEY") return eventCity;
    if (eventLocation === "DESTINATION EVENT") return `${eventFromCity} → ${eventToCity}`;
    return "";
  };

  const handleResetForm = () => {
    setClientName("");
    setCompanyName("");
    setServiceTypes(["PHOTOGRAPHY"]);
    setSource("");
    setWhoseWhatsapp("");
    setOldClientName("");
    setInitialStatus("");
    setWhoAdded("");
    setClientHandler("");
    setInquiryDate(new Date());
    setInquiryTime(format(new Date(), "HH:mm"));
    setDescription("");
    setClientLocation("");
    setCurrentCountry("");
    setDialCode("");
    setContactNo("");
    setWhatsappNo("");
    setEventLocation("");
    setEventCity("");
    setEventCityValley("");
    setEventFromCity("");
    setEventToCity("");
    setSelectedDates([]);
    setEventsByDate({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      toast({
        title: "Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate final quotation for BOOKED status
    if (isBookedStatus) {
      if (!selectedPackage) {
        toast({
          title: "Error",
          description: "Please select a package for booked client",
          variant: "destructive",
        });
        return;
      }
      const price = packagePrices[selectedPackage as keyof typeof packagePrices];
      if (!price || parseInt(price) <= 0) {
        toast({
          title: "Error",
          description: "Please enter the price for the selected package",
          variant: "destructive",
        });
        return;
      }
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Sort dates chronologically
      const sortedForSave = [...selectedDates].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        const dayA = isUnknownDay(a.day) ? 99 : (a.day as number);
        const dayB = isUnknownDay(b.day) ? 99 : (b.day as number);
        return dayA - dayB;
      });

      // Format dates for saving
      const eventDatesFormatted = sortedForSave.map(d => formatBSDate(d)).join("\n");
      const eventADDates = sortedForSave.map(d => {
        const adResult = bsToAD(d.year, d.month, d.day);
        if (isUnknownDay(d.day)) {
          return adResult as string;
        }
        return format(adResult as Date, "yyyy-MM-dd");
      }).join("\n");

      const eventYears = sortedForSave.map(d => d.year).join("\n");
      const eventMonths = sortedForSave.map(d => d.month).join("\n");
      const eventDays = sortedForSave.map(d => getDayForStorage(d.day)).join("\n");

      // Events for each date
      const eventsFormatted = sortedForSave
        .map(d => eventsByDate[getDateKey(d)] || "")
        .join("\n");

      // Country value
      const countryForSheet = clientLocation === "INSIDE NEPAL" ? "Nepal" : currentCountry;

      // Registration date
      const now = new Date();
      const registeredBS = adToBS(now);
      const registeredBSFormatted = `${registeredBS.year}-${String(registeredBS.month).padStart(2, '0')}-${String(registeredBS.day).padStart(2, '0')}`;

      // Inquiry date
      const inquiryDateValue = inquiryDate || now;
      const inquiryDateADFormatted = format(inquiryDateValue, "yyyy-MM-dd");
      const inquiryBS = adToBS(inquiryDateValue);
      const inquiryBSFormatted = `${inquiryBS.year}-${String(inquiryBS.month).padStart(2, '0')}-${String(inquiryBS.day).padStart(2, '0')}`;

      // Build final quotation string if BOOKED
      let finalQuotationValue = "";
      if (isBookedStatus && selectedPackage) {
        const price = packagePrices[selectedPackage as keyof typeof packagePrices];
        if (price) {
          finalQuotationValue = `${selectedPackage}: NPR ${parseInt(price).toLocaleString()}/-`;
        }
      }

      const clientData: ClientData = {
        clientName: clientName.trim(),
        companyName,
        serviceTypes: serviceTypes.join("/"),
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
        inquiryDateAD: inquiryDateADFormatted,
        inquiryDateBS: inquiryBSFormatted,
        inquiryTime,
        description: description.trim(),
        initialStatus: initialStatus || "JUST ENQUIRED",
        clientHandler: clientHandler || whoAdded,
        registeredDateBS: registeredBSFormatted,
        finalQuotation: finalQuotationValue,
      };

      await addClient(clientData);
      
      toast({
        title: "Success!",
        description: `${clientName} added successfully`,
      });

      handleResetForm();
      
      // Trigger cache refresh
      window.dispatchEvent(new CustomEvent('cache-updated'));
      
    } catch (error) {
      console.error("Error adding client:", error);
      toast({
        title: "Error",
        description: "Failed to add client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle date selection from NepaliCalendar
  const handleDateSelect = (dates: NepaliDateObject[]) => {
    setSelectedDates(dates);
    // Clean up eventsByDate for removed dates
    const dateKeys = new Set(dates.map(d => getDateKey(d)));
    setEventsByDate(prev => {
      const newEvents: Record<string, string> = {};
      Object.keys(prev).forEach(key => {
        if (dateKeys.has(key)) {
          newEvents[key] = prev[key];
        }
      });
      return newEvents;
    });
  };

  // Handle event change for a specific date
  const handleEventChange = (date: NepaliDateObject, event: string) => {
    const key = getDateKey(date);
    setEventsByDate(prev => ({
      ...prev,
      [key]: event
    }));
  };

  // Handle removing a date
  const handleRemoveDate = (date: NepaliDateObject) => {
    const key = getDateKey(date);
    setSelectedDates(prev => prev.filter(d => getDateKey(d) !== key));
    setEventsByDate(prev => {
      const newEvents = { ...prev };
      delete newEvents[key];
      return newEvents;
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Add New Client
          </h1>
          <p className="text-muted-foreground">Fill in the details to register a new client</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleResetForm} className="shadow-sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Form
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !clientName.trim()}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Client
          </Button>
        </div>
      </div>

      {/* Two-column form layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Client Basic Details */}
          <FormSection title="Client Details" icon={User} gradient="blue">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">
                {isFromCache ? "From cache" : "Fresh data"} • {dropdowns?.companyNames?.length || 0} companies, {dropdowns?.serviceTypes?.length || 0} services
              </span>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => refreshData()}
                disabled={isSyncing}
                className="h-6 text-xs"
              >
                <RefreshCw className={cn("w-3 h-3 mr-1", isSyncing && "animate-spin")} />
                Refresh
              </Button>
            </div>
            
            <FormInput 
              label="Client Name" 
              value={clientName} 
              onChange={setClientName} 
              placeholder="Enter client name" 
              required 
            />
            
            {/* Company Name - Searchable combobox */}
            <FormCombobox 
              label="Company Name"
              value={companyName} 
              onChange={setCompanyName} 
              options={dropdowns?.companyNames || []} 
              placeholder="Select company..."
              searchPlaceholder="Search companies..."
            />
            
            {/* Service Type - Multi-select */}
            <ServiceTypeSelector
              label="Service Type"
              value={serviceTypes}
              onChange={setServiceTypes}
              options={dropdowns?.serviceTypes || []}
              defaultValue="PHOTOGRAPHY"
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
              <FormCombobox 
                label="Which Old Client?" 
                value={oldClientName} 
                onChange={setOldClientName} 
                options={dropdowns?.oldClients || []} 
                placeholder="Search or type old client name..."
                searchPlaceholder="Search old clients..."
                onAddNew={async (name) => {
                  try {
                    const result = await addOldClient(name);
                    if (result.alreadyExists) {
                      toast({ title: "Info", description: "This client already exists in the list" });
                    } else {
                      toast({ title: "Success!", description: `"${name}" added to old clients list` });
                    }
                    return true;
                  } catch (error) {
                    toast({ 
                      title: "Error", 
                      description: "Failed to add old client to the list", 
                      variant: "destructive" 
                    });
                    return false;
                  }
                }}
              />
            )}
          </FormSection>

          {/* Inquiry Details */}
          <FormSection title="Inquiry Details" icon={FileText} gradient="purple">
            <div className="grid grid-cols-2 gap-4">
              <FormSelect 
                label="Status" 
                value={initialStatus} 
                onChange={setInitialStatus} 
                options={dropdowns?.clientStatuses || []} 
                placeholder="Select status"
              />
              <FormSelect 
                label="Who Added" 
                value={whoAdded} 
                onChange={setWhoAdded} 
                options={dropdowns?.whatsappOwners || []} 
              />
            </div>
            <FormSelect 
              label="Client Handler" 
              value={clientHandler} 
              onChange={setClientHandler} 
              options={dropdowns?.whatsappOwners || []} 
              placeholder="Who will handle this client?"
            />

            {/* Final Quotation - Only shows when BOOKED status is selected */}
            {isBookedStatus && (
              <div className="mt-4 p-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400">Final Quotation (Required)</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Enter the agreed price for {clientName || "this client"}. Select a package and enter the amount.
                </p>
                
                <RadioGroup 
                  value={selectedPackage} 
                  onValueChange={setSelectedPackage}
                  className="grid grid-cols-2 gap-2 mb-3"
                >
                  {(["BASIC", "STANDARD", "PREMIUM", "WTN SPECIAL"] as const).map((pkg) => (
                    <div key={pkg} className="flex items-center space-x-2 p-2 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                      <RadioGroupItem value={pkg} id={`desktop-pkg-${pkg}`} />
                      <Label htmlFor={`desktop-pkg-${pkg}`} className="flex-1 cursor-pointer text-sm font-medium">
                        {pkg}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {selectedPackage && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Price for {selectedPackage} <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">NPR</span>
                      <Input
                        type="number"
                        placeholder="e.g., 75000"
                        value={packagePrices[selectedPackage as keyof typeof packagePrices]}
                        onChange={(e) => setPackagePrices(prev => ({
                          ...prev,
                          [selectedPackage]: e.target.value
                        }))}
                        className="flex-1 h-10"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Inquiry Date</label>
                <input
                  type="date"
                  value={inquiryDate ? format(inquiryDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setInquiryDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <FormInput 
                label="Inquiry Time" 
                value={inquiryTime} 
                onChange={setInquiryTime} 
                type="time" 
              />
            </div>
            <FormInput 
              label="Description" 
              value={description} 
              onChange={setDescription} 
              multiline 
              maxLength={500} 
              placeholder="Brief notes about the inquiry..." 
            />
          </FormSection>

          {/* Location & Contact */}
          <FormSection title="Location & Contact" icon={Phone} gradient="green">
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
            <div className="grid grid-cols-2 gap-4">
              <FormInput 
                label="Contact Number" 
                value={contactNo} 
                onChange={setContactNo} 
                placeholder={dialCode ? `${dialCode} ...` : "Phone number"} 
              />
              <FormInput 
                label="WhatsApp Number" 
                value={whatsappNo} 
                onChange={setWhatsappNo} 
                placeholder={dialCode ? `${dialCode} ...` : "WhatsApp number"} 
              />
            </div>
          </FormSection>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Event Location */}
          <FormSection title="Event Location" icon={MapPin} gradient="amber">
            <FormSelect 
              label="Event Location" 
              value={eventLocation} 
              onChange={handleEventLocationChange} 
              options={["INSIDE KATHMANDU VALLEY", "OUTSIDE KATHMANDU VALLEY", "DESTINATION EVENT", "TBD"]}
              placeholder="Select event location type"
            />
            {eventLocation === "INSIDE KATHMANDU VALLEY" && (
              <FormSelect 
                label="City (Valley)" 
                value={eventCityValley} 
                onChange={setEventCityValley} 
                options={valleyCitiesOptions}
                placeholder="Select city in valley"
              />
            )}
            {eventLocation === "OUTSIDE KATHMANDU VALLEY" && (
              <FormSelect 
                label="City (Outside Valley)" 
                value={eventCity} 
                onChange={setEventCity} 
                options={outsideValleyCitiesOptions}
                placeholder="Select city"
              />
            )}
            {eventLocation === "DESTINATION EVENT" && (
              <div className="grid grid-cols-2 gap-4">
                <FormInput 
                  label="From" 
                  value={eventFromCity} 
                  onChange={setEventFromCity} 
                  placeholder="Origin city/country" 
                />
                <FormInput 
                  label="To" 
                  value={eventToCity} 
                  onChange={setEventToCity} 
                  placeholder="Destination city/country" 
                />
              </div>
            )}
          </FormSection>

          {/* Event Dates */}
          <FormSection title="Event Dates (BS Calendar)" icon={Calendar} gradient="pink">
            <NepaliCalendar
              selectedDates={selectedDates}
              onDateSelect={handleDateSelect}
            />
            
            {/* Event Type Selection for Each Date */}
            {selectedDates.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Assign Events to Dates
                </h4>
                {selectedDates.map((dateObj) => {
                  const dateKey = getDateKey(dateObj);
                  return (
                    <EventSelector
                      key={dateKey}
                      date={dateObj}
                      selectedEvent={eventsByDate[dateKey] || ''}
                      onEventChange={(event) => handleEventChange(dateObj, event)}
                      eventOptions={availableEvents}
                      onRemoveDate={() => handleRemoveDate(dateObj)}
                    />
                  );
                })}
              </div>
            )}
          </FormSection>
        </div>
      </form>
    </div>
  );
}
