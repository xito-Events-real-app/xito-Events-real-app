import { useState, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormSection, FormInput, FormSelect, CountrySelector, NepaliCalendar } from "@/components/form";
import { FormCombobox } from "@/components/form/FormCombobox";
import { EventSelector } from "@/components/form/EventSelector";
import { getCountryCodeFromName } from "@/components/form/CountrySelector";
import { valleyCities, nepalCitiesOutsideValley, clientLocationOptions } from "@/lib/form-data";
import { NepaliDateObject, bsToAD, adToBS, formatBSDate, isUnknownDay, getDayForStorage } from "@/lib/nepali-date";
import { useDropdownData } from "@/hooks/useDropdownData";
import { addClient, addOldClient, isSheetsConfigured } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export default function QuickAdd() {
  const { data: dropdowns, isLoading: dropdownsLoading, isUsingMock } = useDropdownData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [clientName, setClientName] = useState("");
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

  const isConfigured = isSheetsConfigured();

  // Combine all event options from D, E, F columns
  const allEventOptions = useMemo(() => {
    const events: string[] = [];
    if (dropdowns?.preweddingEvents) events.push(...dropdowns.preweddingEvents);
    if (dropdowns?.weddingEvents) events.push(...dropdowns.weddingEvents);
    if (dropdowns?.postweddingEvents) events.push(...dropdowns.postweddingEvents);
    return [...new Set(events)]; // Remove duplicates
  }, [dropdowns]);

  // Helper to get unique key for a date
  const getDateKey = (date: NepaliDateObject) => `${date.year}-${date.month}-${date.day}`;

  // Sort dates in ascending order (unknown dates go to end of their month)
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

  // Handle event change for a specific date
  const handleEventChange = (date: NepaliDateObject, event: string) => {
    const key = getDateKey(date);
    setEventsByDate(prev => ({ ...prev, [key]: event }));
  };

  // Handle removing a date
  const handleRemoveDate = (date: NepaliDateObject) => {
    const key = getDateKey(date);
    setSelectedDates(prev => prev.filter(d => getDateKey(d) !== key));
    setEventsByDate(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Handle client location change
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

  // Handle country change
  const handleCountryChange = (countryName: string, countryCode?: string) => {
    setCurrentCountry(countryName);
    setCurrentCountryCode(countryCode || getCountryCodeFromName(countryName));
  };

  const getCityOptions = () => {
    if (eventLocation === "INSIDE VALLEY") return valleyCities;
    if (eventLocation === "OUTSIDE VALLEY") return nepalCitiesOutsideValley;
    return [];
  };

  // Get event city/location value for saving
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

    setIsSubmitting(true);

    try {
      // Sort dates and format for saving (ascending order, single row)
      const sortedForSave = [...selectedDates].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        // Handle unknown day - treat as 99 for sorting
        const dayA = isUnknownDay(a.day) ? 99 : (a.day as number);
        const dayB = isUnknownDay(b.day) ? 99 : (b.day as number);
        return dayA - dayB;
      });

      // Format dates for saving - all in single row, newline separated for vertical stacking
      const eventDatesFormatted = sortedForSave.map(d => formatBSDate(d)).join("\n");
      const eventADDates = sortedForSave.map(d => {
        const adResult = bsToAD(d.year, d.month, d.day);
        // Handle unknown day case
        if (isUnknownDay(d.day)) {
          return adResult as string; // Already formatted as "YYYY-MM-**"
        }
        return format(adResult as Date, "yyyy-MM-dd");
      }).join("\n");
      
      // Get years, months, days as newline-separated for vertical stacking in cells
      const eventYears = sortedForSave.map(d => d.year).join("\n");
      const eventMonths = sortedForSave.map(d => d.month).join("\n");
      const eventDays = sortedForSave.map(d => getDayForStorage(d.day)).join("\n");

      // Combine events for all selected dates (in sorted order), newline separated
      // Don't filter - maintain alignment with dates (empty entries stay as empty strings)
      const eventsFormatted = sortedForSave
        .map(d => eventsByDate[getDateKey(d)] || "")
        .join("\n");

      // Determine country value for Column F
      const countryForSheet = clientLocation === "INSIDE NEPAL" ? "Nepal" : currentCountry;

      // Get current date/time for registration
      const now = new Date();
      const registeredBS = adToBS(now);
      const registeredBSFormatted = `${registeredBS.year}-${String(registeredBS.month).padStart(2, '0')}-${String(registeredBS.day).padStart(2, '0')}`;
      
      // Inquiry date - use selected date or default to today
      const inquiryDateValue = inquiryDate || now;
      const inquiryDateADFormatted = format(inquiryDateValue, "yyyy-MM-dd");
      const inquiryBS = adToBS(inquiryDateValue);
      const inquiryBSFormatted = `${inquiryBS.year}-${String(inquiryBS.month).padStart(2, '0')}-${String(inquiryBS.day).padStart(2, '0')}`;

      const clientData = {
        clientName,
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
        // Send accurate BS dates from frontend
        registeredDateBS: registeredBSFormatted,
        inquiryDateBS: inquiryBSFormatted,
      };

      if (isConfigured) {
        await addClient(clientData);
        toast({ title: "Success!", description: "Client added to Google Sheets" });
      } else {
        // Demo mode
        await new Promise((r) => setTimeout(r, 1000));
        toast({ title: "Demo Mode", description: "Client would be saved (configure Google Sheets first)" });
      }

      // Reset form
      setClientName("");
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
        <PageHeader title="Quick Add Client" showBack />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Quick Add Client" subtitle="Add new client entry" showBack />
      
      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Setup Warning */}
        {!isConfigured && (
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
        <FormSection title="Client Basic Details">
          <FormInput label="Client Name" value={clientName} onChange={setClientName} placeholder="Enter client name" required />
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

        {/* Inquiry Details - Moved up */}
        <FormSection title="Inquiry Details">
          <FormSelect 
            label="Status" 
            value={initialStatus} 
            onChange={setInitialStatus} 
            options={dropdowns?.clientStatuses || []} 
            placeholder="Select initial status"
          />
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

        {/* Client Handler */}
        <FormSection title="Client Handler">
          <FormSelect 
            label="Who is handling this client?" 
            value={clientHandler} 
            onChange={setClientHandler} 
            options={dropdowns?.whatsappOwners || []} 
            placeholder="Select handler (optional)"
          />
        </FormSection>

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full h-14 text-lg font-semibold gradient-primary text-white mt-6"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          {isSubmitting ? "Saving..." : "Save Client"}
        </Button>
      </form>
    </AppLayout>
  );
}
