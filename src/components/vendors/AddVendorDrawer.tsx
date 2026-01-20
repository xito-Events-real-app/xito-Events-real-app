import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Building2, User, Phone, MessageCircle } from "lucide-react";
import { CitySelector } from "./CitySelector";
import { SocialLinkInput } from "./SocialLinkInput";
import { addVendor } from "@/lib/vendor-api";
import { useToast } from "@/hooks/use-toast";

interface AddVendorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorTypes: string[];
  onVendorAdded: () => void;
}

export function AddVendorDrawer({ open, onOpenChange, vendorTypes, onVendorAdded }: AddVendorDrawerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [vendorName, setVendorName] = useState("");
  const [vendorType, setVendorType] = useState("");
  const [companyContactNo, setCompanyContactNo] = useState("");
  const [owner1Name, setOwner1Name] = useState("");
  const [owner1ContactNo, setOwner1ContactNo] = useState("");
  const [owner1WhatsappNo, setOwner1WhatsappNo] = useState("");
  const [owner2Name, setOwner2Name] = useState("");
  const [owner2ContactNo, setOwner2ContactNo] = useState("");
  const [owner2WhatsappNo, setOwner2WhatsappNo] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [googleMapLink, setGoogleMapLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [tiktokLink, setTiktokLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [email, setEmail] = useState("");

  const resetForm = () => {
    setVendorName("");
    setVendorType("");
    setCompanyContactNo("");
    setOwner1Name("");
    setOwner1ContactNo("");
    setOwner1WhatsappNo("");
    setOwner2Name("");
    setOwner2ContactNo("");
    setOwner2WhatsappNo("");
    setCity("");
    setArea("");
    setGoogleMapLink("");
    setInstagramLink("");
    setFacebookLink("");
    setTiktokLink("");
    setYoutubeLink("");
    setWebsiteLink("");
    setEmail("");
  };

  const handleSubmit = async () => {
    if (!vendorName.trim()) {
      toast({
        title: "Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addVendor({
        vendorName,
        vendorType,
        companyContactNo,
        owner1Name,
        owner1ContactNo,
        owner1WhatsappNo,
        owner2Name,
        owner2ContactNo,
        owner2WhatsappNo,
        city,
        area,
        googleMapLink,
        instagramLink,
        facebookLink,
        tiktokLink,
        youtubeLink,
        websiteLink,
        email,
      });

      toast({
        title: "Success",
        description: "Vendor added successfully",
      });

      resetForm();
      onOpenChange(false);
      onVendorAdded();
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast({
        title: "Error",
        description: "Failed to add vendor",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-slate-900 border-slate-700 max-h-[90vh]">
        <DrawerHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Add New Vendor
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-4 max-h-[60vh]">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Basic Information</h3>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Vendor Name *</Label>
                <Input
                  placeholder="Enter vendor name"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Vendor Type</Label>
                <Select value={vendorType} onValueChange={setVendorType}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select vendor type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {vendorTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Company Contact Number</Label>
                <Input
                  placeholder="Enter company contact"
                  value={companyContactNo}
                  onChange={(e) => setCompanyContactNo(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Owner 1 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner 1
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <Input
                  placeholder="Owner name"
                  value={owner1Name}
                  onChange={(e) => setOwner1Name(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Contact No"
                      value={owner1ContactNo}
                      onChange={(e) => setOwner1ContactNo(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white pl-10"
                    />
                  </div>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="WhatsApp No"
                      value={owner1WhatsappNo}
                      onChange={(e) => setOwner1WhatsappNo(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Owner 2 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner 2
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <Input
                  placeholder="Owner name"
                  value={owner2Name}
                  onChange={(e) => setOwner2Name(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Contact No"
                      value={owner2ContactNo}
                      onChange={(e) => setOwner2ContactNo(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white pl-10"
                    />
                  </div>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="WhatsApp No"
                      value={owner2WhatsappNo}
                      onChange={(e) => setOwner2WhatsappNo(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Location</h3>
              
              <div className="space-y-2">
                <Label className="text-slate-300">City</Label>
                <CitySelector value={city} onChange={setCity} />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Area</Label>
                <Input
                  placeholder="Enter area name"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Social Links</h3>
              
              <div className="space-y-3">
                <SocialLinkInput platform="google-map" value={googleMapLink} onChange={setGoogleMapLink} />
                <SocialLinkInput platform="instagram" value={instagramLink} onChange={setInstagramLink} />
                <SocialLinkInput platform="facebook" value={facebookLink} onChange={setFacebookLink} />
                <SocialLinkInput platform="tiktok" value={tiktokLink} onChange={setTiktokLink} />
                <SocialLinkInput platform="youtube" value={youtubeLink} onChange={setYoutubeLink} />
                <SocialLinkInput platform="website" value={websiteLink} onChange={setWebsiteLink} />
                <SocialLinkInput platform="gmail" value={email} onChange={setEmail} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t border-slate-700">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !vendorName.trim()}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
            >
              {isSubmitting ? "Adding..." : "Add Vendor"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
