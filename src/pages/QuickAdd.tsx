import { useState, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormSection, FormInput, FormSelect, CountrySelector, PhoneInputField, NepaliCalendar } from "@/components/form";
import { EventSelector } from "@/components/form/EventSelector";
import { valleyCities, nepalCitiesOutsideValley } from "@/lib/form-data";
import { NepaliDateObject, bsToAD, formatBSDate } from "@/lib/nepali-date";
import { useDropdownData } from "@/hooks/useDropdownData";
import { addClient, isSheetsConfigured } from "@/lib/sheets-api";
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
  const [contactNo, setContactNo] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [selectedDates, setSelectedDates] = useState<NepaliDateObject[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, string>>({});
  const [whoAdded, setWhoAdded] = useState("");
  const [inquiryTime, setInquiryTime] = useState("");
  const [description, setDescription] = useState("");

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

  const getCityOptions = () => {
    if (eventLocation === "INSIDE VALLEY") return valleyCities;
    if (eventLocation === "OUTSIDE VALLEY") return nepalCitiesOutsideValley;
    return [];
  };

  const getSourceValue = () => {
    if (source === "WHATSAPP" && whoseWhatsapp) return `WHATSAPP - ${whoseWhatsapp}`;
    if (source === "OLD CLIENT" && oldClientName) return `OLD CLIENT - ${oldClientName}`;
    return source;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast({ title: "Error", description: "Client name is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Format dates for saving
      const eventDatesFormatted = selectedDates.map(d => formatBSDate(d)).join(", ");
      const eventADDates = selectedDates.map(d => format(bsToAD(d.year, d.month, d.day), "yyyy-MM-dd")).join(", ");
      const firstDate = selectedDates[0];

      // Combine events for all selected dates
      const eventsFormatted = selectedDates
        .map(d => eventsByDate[getDateKey(d)] || "")
        .filter(Boolean)
        .join(", ");

      const clientData = {
        clientName,
        source: getSourceValue(),
        clientLocation,
        currentCountry: clientLocation === "ABROAD" ? currentCountry : "Nepal",
        contactNo,
        whatsappNo,
        eventLocation,
        eventCity,
        events: eventsFormatted,
        eventYear: firstDate?.year?.toString() || "",
        eventMonth: firstDate?.month?.toString() || "",
        eventDay: firstDate?.day?.toString() || "",
        eventDateAD: eventADDates,
        whoAdded,
        inquiryTime,
        description,
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
      setContactNo("");
      setWhatsappNo("");
      setEventLocation("");
      setEventCity("");
      setSelectedDates([]);
      setEventsByDate({});
      setWhoAdded("");
      setInquiryTime("");
      setDescription("");

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
            label="Client Location" 
            value={clientLocation} 
            onChange={setClientLocation} 
            options={dropdowns?.clientLocations || []} 
          />
          {clientLocation === "ABROAD" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Country</label>
              <CountrySelector value={currentCountry} onChange={setCurrentCountry} />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Number</label>
            <PhoneInputField value={contactNo} onChange={setContactNo} defaultCountry="NP" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Number</label>
            <PhoneInputField value={whatsappNo} onChange={setWhatsappNo} defaultCountry={clientLocation === "ABROAD" ? "AU" : "NP"} />
          </div>
        </FormSection>

        {/* Event Location */}
        <FormSection title="Event Location">
          <FormSelect 
            label="Event Location" 
            value={eventLocation} 
            onChange={setEventLocation} 
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
        </FormSection>

        {/* Event Dates */}
        <FormSection title="Event Dates (BS Calendar)">
          <NepaliCalendar selectedDates={selectedDates} onDateSelect={setSelectedDates} multiSelect />
        </FormSection>

        {/* Event Selection for Each Date */}
        {selectedDates.length > 0 && (
          <FormSection title={`Events (${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""} selected)`}>
            <div className="space-y-3">
              {selectedDates.map((date) => (
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

        {/* Inquiry Meta */}
        <FormSection title="Inquiry Details">
          <FormSelect 
            label="Who Added" 
            value={whoAdded} 
            onChange={setWhoAdded} 
            options={dropdowns?.whatsappOwners || []} 
          />
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
