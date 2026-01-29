import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, CheckCircle2, User, Phone, MapPin, Instagram } from "lucide-react";
import { toast } from "sonner";

// Relation options for backup contacts
const relationOptions = ["Mother", "Father", "Sister", "Brother", "Spouse", "Friend", "Other"];

interface PersonDetails {
  fullName: string;
  contactNumber: string;
  whatsappNumber: string;
  backupNumber1: string;
  backupRelation1: string;
  backupNumber2: string;
  backupRelation2: string;
  instagram: string;
  homeCity: string;
  homeArea: string;
  homeMapLink: string;
  homeLandmark: string;
}

const emptyPerson: PersonDetails = {
  fullName: "",
  contactNumber: "",
  whatsappNumber: "",
  backupNumber1: "",
  backupRelation1: "",
  backupNumber2: "",
  backupRelation2: "",
  instagram: "",
  homeCity: "",
  homeArea: "",
  homeMapLink: "",
  homeLandmark: "",
};

export default function ClientContactForm() {
  const { clientId } = useParams<{ clientId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bride, setBride] = useState<PersonDetails>(emptyPerson);
  const [groom, setGroom] = useState<PersonDetails>(emptyPerson);

  // Decode the client ID for display
  const decodedClientId = clientId ? decodeURIComponent(clientId) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement actual submission to Google Sheets via edge function
      // For now, simulate a submission
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
      toast.success("Thank you! Your details have been submitted.");
    } catch (error) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBride = (field: keyof PersonDetails, value: string) => {
    setBride((prev) => ({ ...prev, [field]: value }));
  };

  const updateGroom = (field: keyof PersonDetails, value: string) => {
    setGroom((prev) => ({ ...prev, [field]: value }));
  };

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-0 shadow-2xl bg-white/90 backdrop-blur">
          <CardContent className="pt-12 pb-10 px-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your contact details have been submitted successfully. Our team will use this information to coordinate your special day.
            </p>
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <Heart className="w-5 h-5 fill-current" />
              <span className="font-medium">Wedding Tales Nepal</span>
              <Heart className="w-5 h-5 fill-current" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Wedding Tales Nepal
          </h1>
          <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
        </div>
      </header>

      {/* Form Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Contact Details Form</h2>
          <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
            Dear Sir/Ma'am, please fill in your contact details below. This information will be used only for wedding coordination purposes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Bride Section */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Bride's Details</h3>
                  <p className="text-rose-100 text-xs">Contact & location information</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-gradient-to-b from-rose-50/50 to-white">
              <PersonForm
                person={bride}
                onChange={updateBride}
                accentColor="rose"
              />
            </CardContent>
          </Card>

          {/* Groom Section */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-500 text-white py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Groom's Details</h3>
                  <p className="text-sky-100 text-xs">Contact & location information</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-gradient-to-b from-sky-50/50 to-white">
              <PersonForm
                person={groom}
                onChange={updateGroom}
                accentColor="sky"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-600 hover:via-pink-600 hover:to-rose-600 shadow-lg shadow-rose-200"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Submit Details
                </span>
              )}
            </Button>
          </div>

          {/* Privacy Note */}
          <p className="text-center text-xs text-gray-500 px-4">
            Your information is kept strictly confidential and will only be used for wedding coordination purposes.
          </p>
        </form>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 py-3">
        <div className="text-center text-xs text-gray-500">
          © Wedding Tales Nepal • Contact: 9705255025
        </div>
      </footer>
    </div>
  );
}

// Person Form Component
interface PersonFormProps {
  person: PersonDetails;
  onChange: (field: keyof PersonDetails, value: string) => void;
  accentColor: "rose" | "sky";
}

function PersonForm({ person, onChange, accentColor }: PersonFormProps) {
  const borderColor = accentColor === "rose" ? "focus:border-rose-400" : "focus:border-sky-400";
  const ringColor = accentColor === "rose" ? "focus:ring-rose-200" : "focus:ring-sky-200";

  return (
    <div className="space-y-5">
      {/* Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          Full Name *
        </Label>
        <Input
          required
          placeholder="Enter full name"
          value={person.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
        />
      </div>

      {/* Contact Numbers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            Contact Number *
          </Label>
          <Input
            required
            type="tel"
            placeholder="98XXXXXXXX"
            value={person.contactNumber}
            onChange={(e) => onChange("contactNumber", e.target.value)}
            className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">WhatsApp Number</Label>
          <Input
            type="tel"
            placeholder="98XXXXXXXX"
            value={person.whatsappNumber}
            onChange={(e) => onChange("whatsappNumber", e.target.value)}
            className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
          />
        </div>
      </div>

      {/* Backup Contact 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Backup Number 1</Label>
          <Input
            type="tel"
            placeholder="98XXXXXXXX"
            value={person.backupNumber1}
            onChange={(e) => onChange("backupNumber1", e.target.value)}
            className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Relation</Label>
          <Select value={person.backupRelation1} onValueChange={(v) => onChange("backupRelation1", v)}>
            <SelectTrigger className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}>
              <SelectValue placeholder="Select relation" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              {relationOptions.map((rel) => (
                <SelectItem key={rel} value={rel} className="hover:bg-gray-50">
                  {rel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Backup Contact 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Backup Number 2</Label>
          <Input
            type="tel"
            placeholder="98XXXXXXXX"
            value={person.backupNumber2}
            onChange={(e) => onChange("backupNumber2", e.target.value)}
            className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Relation</Label>
          <Select value={person.backupRelation2} onValueChange={(v) => onChange("backupRelation2", v)}>
            <SelectTrigger className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}>
              <SelectValue placeholder="Select relation" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              {relationOptions.map((rel) => (
                <SelectItem key={rel} value={rel} className="hover:bg-gray-50">
                  {rel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Instagram className="w-4 h-4 text-gray-400" />
          Instagram Handle
        </Label>
        <Input
          placeholder="username (without @)"
          value={person.instagram}
          onChange={(e) => onChange("instagram", e.target.value)}
          className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
        />
      </div>

      {/* Home Location */}
      <div className="pt-2 border-t border-gray-100">
        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-gray-400" />
          Home Address
        </Label>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">City</Label>
            <Input
              placeholder="e.g., Kathmandu"
              value={person.homeCity}
              onChange={(e) => onChange("homeCity", e.target.value)}
              className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Area / Tole</Label>
            <Input
              placeholder="e.g., Baneshwor"
              value={person.homeArea}
              onChange={(e) => onChange("homeArea", e.target.value)}
              className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Google Maps Link</Label>
            <Input
              type="url"
              placeholder="https://maps.google.com/..."
              value={person.homeMapLink}
              onChange={(e) => onChange("homeMapLink", e.target.value)}
              className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Landmark</Label>
            <Textarea
              placeholder="Near temple, opposite to..."
              value={person.homeLandmark}
              onChange={(e) => onChange("homeLandmark", e.target.value)}
              className={`min-h-[80px] bg-white border-gray-200 ${borderColor} ${ringColor} resize-none`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
