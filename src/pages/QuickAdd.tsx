import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormSection, FormInput, FormSelect, CountrySelector, NepaliCalendar } from "@/components/form";
import { FormCombobox } from "@/components/form/FormCombobox";
import { EventSelector } from "@/components/form/EventSelector";
import { ServiceTypeSelector } from "@/components/form/ServiceTypeSelector";
import { getCountryCodeFromName } from "@/components/form/CountrySelector";
import { valleyCities, nepalCitiesOutsideValley, clientLocationOptions } from "@/lib/form-data";
import { NepaliDateObject, bsToAD, adToBS, formatBSDate, isUnknownDay, getDayForStorage } from "@/lib/nepali-date";
import { useCachedData } from "@/hooks/useCachedData";
import { addClient, addOldClient, updateClient as updateClientApi, isSheetsConfigured, ClientData } from "@/lib/sheets-api";
import { notifyCacheUpdate } from "@/lib/cache-manager";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, AlertTriangle, User, FileText, MapPin, Calendar, Phone, Sparkles, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function QuickAdd() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Edit mode detection
  const isEditMode = searchParams.get('edit') === 'true';
  const editClientData = location.state?.clientData as ClientData | undefined;

  const { dropdowns, isLoading: dropdownsLoading, isFromCache, isSyncing, refreshData, updateClient: updateClientCache } = useCachedData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [whoseWhatsapp, setWhoseWhatsapp] = useState("");
  const [oldClientName, setOldClientName] = useState("");
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
  const [whoAdded, setWhoAdded] = useState("");
  const [inquiryDate, setInquiryDate] = useState<Date | undefined>(new Date());
  const [inquiryTime, setInquiryTime] = useState("");
  const [description, setDescription] = useState("");
  const [initialStatus, setInitialStatus] = useState("JUST ENQUIRED");
  const [clientHandler, setClientHandler] = useState("");
  const [emailInput, setEmailInput] = useState("");
  
  // Final Quotation state (for BOOKED status)
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [packagePrices, setPackagePrices] = useState({
    BASIC: "",
    STANDARD: "",
    PREMIUM: "",
    "WTN SPECIAL": ""
  });

  // Track if edit data has been loaded
  const [editDataLoaded, setEditDataLoaded] = useState(false);

  // Check if BOOKED status is selected
  const isBookedStatus = initialStatus?.toUpperCase().includes("BOOKED") && !initialStatus?.toUpperCase().includes("SOMEWHERE ELSE");

  const isConfigured = isSheetsConfigured();

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (isEditMode && editClientData && !editDataLoaded) {
      const client = editClientData;
      setClientName(client.clientName || '');
      setCompanyName(client.companyName || '');
      setServiceTypes(client.serviceTypes ? client.serviceTypes.split('/') : []);
      setClientLocation(client.clientLocation || '');
      setCurrentCountry(client.currentCountry || '');
      setCurrentCountryCode(getCountryCodeFromName(client.currentCountry || 'Nepal'));
      setContactNo(client.contactNo || '');
      setWhatsappNo(client.whatsappNo || '');
      setEventLocation(client.eventLocation || '');
      setEmailInput(client.email || '');
      setDescription(client.description || '');
      setWhoAdded(client.whoAdded || '');
      setClientHandler(client.clientHandler || '');
      setInquiryTime(client.inquiryTime || '');

      // Parse event city
      const eventLoc = client.eventLocation || '';
      if (eventLoc === 'MIXED' || eventLoc === 'ABROAD') {
        const parts = (client.eventCity || '').split(' - ');
        setEventFromCity(parts[0] || '');
        setEventToCity(parts[1] || '');
      } else {
        setEventCity(client.eventCity || '');
      }

      // Parse existing dates
      if (client.eventYear && client.eventMonth && client.eventDay) {
        const years = client.eventYear.split('\n');
        const months = client.eventMonth.split('\n');
        const days = client.eventDay.split('\n');
        const dates: NepaliDateObject[] = [];
        const eventsMap: Record<string, string> = {};
        const eventNames = (client.events || '').split('\n');
        
        for (let i = 0; i < years.length; i++) {
          if (years[i] && months[i] && days[i]) {
            const dayValue = days[i].trim();
            const date: NepaliDateObject = {
              year: parseInt(years[i]),
              month: parseInt(months[i]),
              day: dayValue === "**" ? "**" : parseInt(dayValue)
            };
            dates.push(date);
            const key = `${date.year}-${date.month}-${date.day}`;
            eventsMap[key] = eventNames[i] || '';
          }
        }
        setSelectedDates(dates);
        setEventsByDate(eventsMap);
      }

      // Parse source
      const sourceStr = client.source || '';
      if (sourceStr.startsWith('WHATSAPP - ')) {
        setSource('WHATSAPP');
        setWhoseWhatsapp(sourceStr.replace('WHATSAPP - ', ''));
      } else if (sourceStr.startsWith('OLD CLIENT - ')) {
        setSource('OLD CLIENT');
        setOldClientName(sourceStr.replace('OLD CLIENT - ', ''));
      } else {
        setSource(sourceStr);
      }

      // Parse inquiry date
      if (client.inquiryDateAD) {
        setInquiryDate(new Date(client.inquiryDateAD));
      }

      setEditDataLoaded(true);
    }
  }, [isEditMode, editClientData, editDataLoaded]);

  // Set default Company Name when dropdowns load (only for add mode)
  useEffect(() => {
    if (!isEditMode && companyName === "" && dropdowns?.companyNames && dropdowns.companyNames.length > 0) {
      const defaultCompany = dropdowns.companyNames.find(
        (name) => name.trim().toUpperCase() === "WEDDING TALES NEPAL"
      );
      if (defaultCompany) {
        setCompanyName(defaultCompany);
      }
    }
  }, [isEditMode, companyName, dropdowns?.companyNames]);

  // Set default Service Type when dropdowns load (only for add mode)
  useEffect(() => {
    if (!isEditMode && serviceTypes.length === 0) {
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
  }, [isEditMode, serviceTypes.length, dropdowns?.serviceTypes]);

  // Use allEvents from EVENT SETUP DATA sheet, fallback to combined events for backwards compatibility
  const allEventOptions = useMemo(() => {
    if (dropdowns?.allEvents && dropdowns.allEvents.length > 0) {
      return dropdowns.allEvents;
    }
    const events: string[] = [];
    if (dropdowns?.preweddingEvents) events.push(...dropdowns.preweddingEvents);
    if (dropdowns?.weddingEvents) events.push(...dropdowns.weddingEvents);
    if (dropdowns?.postweddingEvents) events.push(...dropdowns.postweddingEvents);
    return [...new Set(events)];
  }, [dropdowns]);

  // Helper to get unique key for a date
  const getDateKey = (date: NepaliDateObject) => `${date.year}-${date.month}-${date.day}`;

  // Sort dates in ascending order
  const sortedDates = useMemo(() => {
    return [...selectedDates].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      const dayA: number = isUnknownDay(a.day) ? 99 : (a.day as number);
      const dayB: number = isUnknownDay(b.day) ? 99 : (b.day as number);
      return dayA - dayB;
    });
  }, [selectedDates]);

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

  const handleClientLocationChange = (location: string) => {
    setClientLocation(location);
    if (location === "INSIDE NEPAL") {
      setCurrentCountry("Nepal");
      setCurrentCountryCode("NP");
    } else {
      setCurrentCountry("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!clientName.trim()) {
      toast({ title: "Error", description: "Client name is required", variant: "destructive" });
      return;
    }

    // Validate final quotation for BOOKED status (add mode only)
    if (!isEditMode && isBookedStatus) {
      if (!selectedPackage) {
        toast({ title: "Error", description: "Please select a package for booked client", variant: "destructive" });
        return;
      }
      const price = packagePrices[selectedPackage as keyof typeof packagePrices];
      if (!price || parseInt(price) <= 0) {
        toast({ title: "Error", description: "Please enter the price for the selected package", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const sortedForSave = [...selectedDates].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        const dayA = isUnknownDay(a.day) ? 99 : (a.day as number);
        const dayB = isUnknownDay(b.day) ? 99 : (b.day as number);
        return dayA - dayB;
      });

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

      const eventsFormatted = sortedForSave
        .map(d => eventsByDate[getDateKey(d)] || "")
        .join("\n");

      const countryForSheet = clientLocation === "INSIDE NEPAL" ? "Nepal" : currentCountry;

      if (isEditMode && editClientData) {
        // === UPDATE MODE ===
        const updatedClient: ClientData = {
          ...editClientData,
          clientName,
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
          clientHandler,
          description,
          inquiryDateAD: inquiryDate ? format(inquiryDate, "yyyy-MM-dd") : editClientData.inquiryDateAD,
          inquiryTime,
        };

        await updateClientApi(updatedClient);
        
        // Update local cache
        if (updateClientCache) {
          updateClientCache(updatedClient);
        }
        
        // Trigger event details refetch
        window.dispatchEvent(new CustomEvent('booked-clients-invalidate'));
        window.dispatchEvent(new CustomEvent('clients-invalidate'));
        
        toast({ title: "Success!", description: "Client updated successfully" });
        
        // Navigate back to client detail
        const clientId = editClientData.registeredDateTimeAD || editClientData.rowNumber;
        navigate(`/client-tracker/client/${encodeURIComponent(String(clientId))}`, {
          state: location.state?.returnState,
          replace: true
        });
      } else {
        // === ADD MODE ===
        const now = new Date();
        const registeredBS = adToBS(now);
        const registeredBSFormatted = `${registeredBS.year}-${String(registeredBS.month).padStart(2, '0')}-${String(registeredBS.day).padStart(2, '0')}`;
        
        const inquiryDateValue = inquiryDate || now;
        const inquiryDateADFormatted = format(inquiryDateValue, "yyyy-MM-dd");
        const inquiryBS = adToBS(inquiryDateValue);
        const inquiryBSFormatted = `${inquiryBS.year}-${String(inquiryBS.month).padStart(2, '0')}-${String(inquiryBS.day).padStart(2, '0')}`;

        let finalQuotationValue = "";
        if (isBookedStatus && selectedPackage) {
          const price = packagePrices[selectedPackage as keyof typeof packagePrices];
          if (price) {
            finalQuotationValue = `${selectedPackage}: NPR ${parseInt(price).toLocaleString()}/-`;
          }
        }

        const clientData = {
          clientName,
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
          inquiryTime,
          description,
          initialStatus,
          clientHandler,
          registeredDateBS: registeredBSFormatted,
          inquiryDateBS: inquiryBSFormatted,
          finalQuotation: finalQuotationValue,
        };

        if (isConfigured) {
          await addClient(clientData);
          toast({ title: "Success!", description: "Client added to Google Sheets" });
          await refreshData();
        } else {
          await new Promise((r) => setTimeout(r, 1000));
          toast({ title: "Demo Mode", description: "Client would be saved (configure Google Sheets first)" });
        }

        // Reset form
        setClientName("");
        setCompanyName("");
        setServiceTypes(["PHOTOGRAPHY"]);
        setSource("");
        setWhoseWhatsapp("");
        setOldClientName("");
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
        setWhoAdded("");
        setInquiryDate(new Date());
        setInquiryTime("");
        setDescription("");
        setInitialStatus("JUST ENQUIRED");
        setClientHandler("");
        setEmailInput("");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save client", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dropdownsLoading) {
    return (
      <AppLayout>
        <PageHeader title={isEditMode ? "Edit Client" : "Quick Add Client"} showBack />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title={isEditMode ? "Edit Client" : "Quick Add Client"} 
        subtitle={isEditMode ? `Editing ${editClientData?.clientName || ''}` : "Add new client entry"} 
        showBack 
      />
      
      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-fade-in">
        {/* Setup Warning - only in add mode */}
        {!isEditMode && !isConfigured && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Demo Mode</p>
                <p className="text-xs text-muted-foreground">
                  <Link to="/settings" className="text-primary underline">Configure Google Sheets</Link> to save clients.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Basic Details */}
        <FormSection title="Client Details" icon={User} gradient="blue">
          <div className="flex items-center justify-between mb-2">
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
          
          <FormInput label="Client Name" value={clientName} onChange={setClientName} placeholder="Enter client name" required />
          
          <FormCombobox 
            label="Company Name"
            value={companyName} 
            onChange={setCompanyName} 
            options={dropdowns?.companyNames || []} 
            placeholder="Select company..."
            searchPlaceholder="Search companies..."
          />
          
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
          {/* Status selector - only in add mode */}
          {!isEditMode && (
            <FormSelect 
              label="Status" 
              value={initialStatus} 
              onChange={setInitialStatus} 
              options={dropdowns?.clientStatuses || []} 
              placeholder="Select initial status"
            />
          )}
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
          <FormInput label="Inquiry Time" value={inquiryTime} onChange={setInquiryTime} type="time" />
          <FormInput 
            label="Description" 
            value={description} 
            onChange={setDescription} 
            multiline 
            maxLength={500} 
            placeholder="Brief notes about the inquiry..." 
          />
          {/* Email - shown in edit mode or always */}
          <FormInput 
            label="Email" 
            value={emailInput} 
            onChange={setEmailInput} 
            placeholder="client@email.com" 
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
          <FormInput 
            label="Contact Number" 
            value={contactNo} 
            onChange={setContactNo} 
            placeholder="Enter contact number (e.g., +977-9841234567)" 
          />
          <FormInput 
            label="WhatsApp Number" 
            value={whatsappNo} 
            onChange={setWhatsappNo} 
            placeholder="Enter WhatsApp number" 
          />
        </FormSection>

        {/* Event Location */}
        <FormSection title="Event Location" icon={MapPin} gradient="amber">
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
        <FormSection title="Event Dates (BS Calendar)" icon={Calendar} gradient="pink">
          <NepaliCalendar selectedDates={selectedDates} onDateSelect={setSelectedDates} multiSelect />
        </FormSection>

        {/* Event Selection for Each Date */}
        {sortedDates.length > 0 && (
          <FormSection title={`Events (${sortedDates.length} date${sortedDates.length > 1 ? "s" : ""} selected)`} icon={Sparkles} gradient="purple">
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

        {/* Client Handler */}
        <FormSection title="Client Handler" icon={User} gradient="green">
          <FormSelect 
            label="Who is handling this client?" 
            value={clientHandler} 
            onChange={setClientHandler} 
            options={dropdowns?.whatsappOwners || []} 
            placeholder="Select handler (optional)"
          />
        </FormSection>

        {/* Final Quotation - Only shows when BOOKED status is selected in ADD mode */}
        {!isEditMode && isBookedStatus && (
          <FormSection title="Final Quotation" icon={Lock} gradient="amber">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the agreed price for {clientName || "this client"}. Select a package and enter the amount.
              </p>
              
              <RadioGroup 
                value={selectedPackage} 
                onValueChange={setSelectedPackage}
                className="space-y-2"
              >
                {(["BASIC", "STANDARD", "PREMIUM", "WTN SPECIAL"] as const).map((pkg) => (
                  <div key={pkg} className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                    <RadioGroupItem value={pkg} id={`pkg-${pkg}`} />
                    <Label htmlFor={`pkg-${pkg}`} className="flex-1 cursor-pointer font-medium">
                      {pkg}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedPackage && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-medium">
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
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 mt-6"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          {isSubmitting ? "Saving..." : isEditMode ? "Update Client" : "Save Client"}
        </Button>
      </form>
    </AppLayout>
  );
}
