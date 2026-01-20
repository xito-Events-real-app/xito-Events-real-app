import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Building2, User, Phone, MessageCircle, Save, Trash2 } from "lucide-react";
import { CitySelector } from "./CitySelector";
import { SocialLinkInput } from "./SocialLinkInput";
import { VendorData, updateVendor, deleteVendor } from "@/lib/vendor-api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VendorDetailSheetProps {
  vendor: VendorData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorTypes: string[];
  onVendorUpdated: () => void;
}

export function VendorDetailSheet({ 
  vendor, 
  open, 
  onOpenChange, 
  vendorTypes,
  onVendorUpdated 
}: VendorDetailSheetProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  // Load vendor data when sheet opens
  useEffect(() => {
    if (vendor) {
      setVendorName(vendor.vendorName || "");
      setVendorType(vendor.vendorType || "");
      setCompanyContactNo(vendor.companyContactNo || "");
      setOwner1Name(vendor.owner1Name || "");
      setOwner1ContactNo(vendor.owner1ContactNo || "");
      setOwner1WhatsappNo(vendor.owner1WhatsappNo || "");
      setOwner2Name(vendor.owner2Name || "");
      setOwner2ContactNo(vendor.owner2ContactNo || "");
      setOwner2WhatsappNo(vendor.owner2WhatsappNo || "");
      setCity(vendor.city || "");
      setArea(vendor.area || "");
      setGoogleMapLink(vendor.googleMapLink || "");
      setInstagramLink(vendor.instagramLink || "");
      setFacebookLink(vendor.facebookLink || "");
      setTiktokLink(vendor.tiktokLink || "");
      setYoutubeLink(vendor.youtubeLink || "");
      setWebsiteLink(vendor.websiteLink || "");
      setEmail(vendor.email || "");
    }
  }, [vendor]);

  const handleSave = async () => {
    if (!vendor) return;

    setIsSubmitting(true);
    try {
      await updateVendor({
        rowNumber: vendor.rowNumber,
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
        description: "Vendor updated successfully",
      });

      onOpenChange(false);
      onVendorUpdated();
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!vendor) return;

    setIsDeleting(true);
    try {
      await deleteVendor(vendor.rowNumber);

      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });

      onOpenChange(false);
      onVendorUpdated();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!vendor) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-700 w-full sm:max-w-lg">
        <SheetHeader className="border-b border-slate-700 pb-4">
          <SheetTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vendor Details
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Basic Information</h3>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Vendor Name</Label>
                <Input
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

            {/* Owner 2 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner 2
              </h3>
              
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

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isDeleting}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete Vendor</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Are you sure you want to delete "{vendorName}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
