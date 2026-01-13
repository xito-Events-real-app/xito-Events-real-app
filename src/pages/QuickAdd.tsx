import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormSection, FormInput, FormSelect, CountrySelector, PhoneInputField, NepaliCalendar } from "@/components/form";
import { mockDropdownData, valleyCities, nepalCitiesOutsideValley } from "@/lib/form-data";
import { NepaliDateObject } from "@/lib/nepali-date";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";

export default function QuickAdd() {
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
  const [whoAdded, setWhoAdded] = useState("");
  const [inquiryTime, setInquiryTime] = useState("");
  const [description, setDescription] = useState("");

  const getCityOptions = () => {
    if (eventLocation === "INSIDE VALLEY") return valleyCities;
    if (eventLocation === "OUTSIDE VALLEY") return nepalCitiesOutsideValley;
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast({ title: "Error", description: "Client name is required", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Success!", description: "Client added successfully (demo mode)" });
    setIsSubmitting(false);
  };

  return (
    <AppLayout>
      <PageHeader title="Quick Add Client" subtitle="Add new client entry" showBack />
      
      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Client Basic Details */}
        <FormSection title="Client Basic Details">
          <FormInput label="Client Name" value={clientName} onChange={setClientName} placeholder="Enter client name" required />
          <FormSelect label="Source" value={source} onChange={setSource} options={mockDropdownData.sources} placeholder="How did they find us?" />
          {source === "WHATSAPP" && (
            <FormSelect label="Whose WhatsApp?" value={whoseWhatsapp} onChange={setWhoseWhatsapp} options={mockDropdownData.whatsappOwners} />
          )}
          {source === "OLD CLIENT" && (
            <FormInput label="Old Client Name" value={oldClientName} onChange={setOldClientName} placeholder="Enter old client name" />
          )}
        </FormSection>

        {/* Location & Contact */}
        <FormSection title="Location & Contact">
          <FormSelect label="Client Location" value={clientLocation} onChange={setClientLocation} options={mockDropdownData.clientLocations} />
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
          <FormSelect label="Event Location" value={eventLocation} onChange={setEventLocation} options={mockDropdownData.eventLocations} />
          {(eventLocation === "INSIDE VALLEY" || eventLocation === "OUTSIDE VALLEY") && (
            <FormSelect label="City" value={eventCity} onChange={setEventCity} options={getCityOptions()} />
          )}
        </FormSection>

        {/* Event Dates */}
        <FormSection title="Event Dates (BS Calendar)">
          <NepaliCalendar selectedDates={selectedDates} onDateSelect={setSelectedDates} multiSelect />
        </FormSection>

        {/* Inquiry Meta */}
        <FormSection title="Inquiry Details">
          <FormSelect label="Who Added" value={whoAdded} onChange={setWhoAdded} options={mockDropdownData.teamMembers} />
          <FormInput label="Inquiry Time" value={inquiryTime} onChange={setInquiryTime} type="time" />
          <FormInput label="Description" value={description} onChange={setDescription} multiline maxLength={500} placeholder="Brief notes about the inquiry..." />
        </FormSection>

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg font-semibold gradient-primary text-white mt-6">
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          {isSubmitting ? "Saving..." : "Save Client"}
        </Button>
      </form>
    </AppLayout>
  );
}
