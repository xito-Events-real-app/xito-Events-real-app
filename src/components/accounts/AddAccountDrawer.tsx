import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FormCombobox } from "@/components/form/FormCombobox";
import { 
  KeyRound, 
  Mail, 
  Lock, 
  Phone, 
  Building2, 
  Globe, 
  Instagram, 
  Facebook,
  Calendar,
  Clock,
  CreditCard,
  Loader2,
  User,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { 
  addAccount, 
  getAccountSetupData, 
  getSecretsVendors, 
  addSecretsVendor,
  VendorInfo 
} from "@/lib/accounts-api";

interface AddAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  accountType: string;
  id: string;
  password: string;
  recoveryAccount: string;
  registeredNumber: string;
  whoBoughtIt: string;
  vendor: string;
  vendorNumber: string;
  vendorWhatsapp: string;
  website: string;
  instagram: string;
  facebook: string;
  dateOfPurchase: string;
  validity: string;
  price: string;
}

const initialFormData: FormData = {
  accountType: '',
  id: '',
  password: '',
  recoveryAccount: '',
  registeredNumber: '',
  whoBoughtIt: '',
  vendor: '',
  vendorNumber: '',
  vendorWhatsapp: '',
  website: '',
  instagram: '',
  facebook: '',
  dateOfPurchase: '',
  validity: '',
  price: '',
};

export function AddAccountDrawer({ open, onOpenChange }: AddAccountDrawerProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [accountTypes, setAccountTypes] = useState<string[]>([]);
  const [whoBoughtItOptions, setWhoBoughtItOptions] = useState<string[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const queryClient = useQueryClient();

  // Fetch dropdown data on mount
  useEffect(() => {
    if (open) {
      fetchDropdownData();
    }
  }, [open]);

  const fetchDropdownData = async () => {
    setIsLoadingDropdowns(true);
    try {
      const [setupData, vendorData] = await Promise.all([
        getAccountSetupData(),
        getSecretsVendors(),
      ]);
      setAccountTypes(setupData.accountTypes);
      setWhoBoughtItOptions(setupData.whoBoughtIt);
      setVendors(vendorData);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
      toast.error('Failed to load form options');
    } finally {
      setIsLoadingDropdowns(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle vendor selection with auto-fill
  const handleVendorChange = (vendorName: string) => {
    // Find existing vendor (case-insensitive)
    const existingVendor = vendors.find(
      v => v.vendorName.toLowerCase() === vendorName.toLowerCase()
    );

    if (existingVendor) {
      // Auto-fill vendor details
      setFormData(prev => ({
        ...prev,
        vendor: vendorName,
        vendorNumber: existingVendor.vendorNumber,
        vendorWhatsapp: existingVendor.vendorWhatsapp,
        website: existingVendor.website,
        instagram: existingVendor.instagram,
        facebook: existingVendor.facebook,
      }));
    } else {
      // Just update vendor name, clear other fields for new vendor
      setFormData(prev => ({
        ...prev,
        vendor: vendorName,
        vendorNumber: '',
        vendorWhatsapp: '',
        website: '',
        instagram: '',
        facebook: '',
      }));
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.accountType.trim()) {
      toast.error('Account Type is required');
      return;
    }
    if (!formData.id.trim()) {
      toast.error('ID/Email is required');
      return;
    }
    if (!formData.password.trim()) {
      toast.error('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if vendor is new (not in existing list)
      if (formData.vendor.trim()) {
        const isNewVendor = !vendors.some(
          v => v.vendorName.toLowerCase() === formData.vendor.toLowerCase()
        );
        
        if (isNewVendor) {
          // Save new vendor to WTN SECRETS VENDOR INFO
          await addSecretsVendor({
            vendorName: formData.vendor,
            vendorNumber: formData.vendorNumber,
            vendorWhatsapp: formData.vendorWhatsapp,
            website: formData.website,
            instagram: formData.instagram,
            facebook: formData.facebook,
          });
        }
      }

      // Add account to WTN ID PASSWORD
      await addAccount(formData);
      toast.success('Account added successfully!');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setFormData(initialFormData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add account:', error);
      toast.error('Failed to add account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData(initialFormData);
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="bg-slate-900 border-slate-800 max-h-[85vh] overflow-hidden">
        <DrawerHeader className="border-b border-slate-800 pb-4 flex-shrink-0">
          <DrawerTitle className="text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-pink-400" />
            Add New Account
          </DrawerTitle>
          <DrawerDescription className="text-slate-400">
            Fill in the account details below. Required fields are marked with *
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="space-y-6 pb-4">
            {/* Account Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Account Information *
              </h3>
              
              <div className="space-y-3">
                {isLoadingDropdowns ? (
                  <Skeleton className="h-16 bg-slate-800" />
                ) : (
                  <FormCombobox
                    label="Account Type *"
                    value={formData.accountType}
                    onChange={(value) => handleChange('accountType', value)}
                    options={accountTypes}
                    placeholder="Select account type..."
                    searchPlaceholder="Search account types..."
                    required
                    className="[&_label]:text-slate-300 [&_button]:bg-slate-800 [&_button]:border-slate-700 [&_button]:text-white"
                  />
                )}

                <div className="space-y-2">
                  <Label htmlFor="id" className="text-slate-300 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    ID / Email *
                  </Label>
                  <Input
                    id="id"
                    placeholder="username@email.com"
                    value={formData.id}
                    onChange={(e) => handleChange('id', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-400" />
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recoveryAccount" className="text-slate-300">
                    Recovery Account
                  </Label>
                  <Input
                    id="recoveryAccount"
                    placeholder="recovery@email.com"
                    value={formData.recoveryAccount}
                    onChange={(e) => handleChange('recoveryAccount', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registeredNumber" className="text-slate-300 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    Registered Number
                  </Label>
                  <Input
                    id="registeredNumber"
                    placeholder="+977 98XXXXXXXX"
                    value={formData.registeredNumber}
                    onChange={(e) => handleChange('registeredNumber', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                {isLoadingDropdowns ? (
                  <Skeleton className="h-16 bg-slate-800" />
                ) : (
                  <FormCombobox
                    label="Who Bought It"
                    value={formData.whoBoughtIt}
                    onChange={(value) => handleChange('whoBoughtIt', value)}
                    options={whoBoughtItOptions}
                    placeholder="Select buyer..."
                    searchPlaceholder="Search buyers..."
                    className="[&_label]:text-slate-300 [&_button]:bg-slate-800 [&_button]:border-slate-700 [&_button]:text-white"
                  />
                )}
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Vendor Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendor Information
              </h3>
              
              <div className="space-y-3">
                {isLoadingDropdowns ? (
                  <Skeleton className="h-16 bg-slate-800" />
                ) : (
                  <FormCombobox
                    label="Vendor Name"
                    value={formData.vendor}
                    onChange={handleVendorChange}
                    options={vendors.map(v => v.vendorName)}
                    placeholder="Select or add vendor..."
                    searchPlaceholder="Search vendors..."
                    className="[&_label]:text-slate-300 [&_button]:bg-slate-800 [&_button]:border-slate-700 [&_button]:text-white"
                  />
                )}
                {formData.vendor && (
                  <p className="text-xs text-slate-500">
                    {vendors.some(v => v.vendorName.toLowerCase() === formData.vendor.toLowerCase())
                      ? "✓ Existing vendor - details auto-filled"
                      : "• New vendor - enter details below to save"}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vendorNumber" className="text-slate-300">
                      Vendor Number
                    </Label>
                    <Input
                      id="vendorNumber"
                      placeholder="+977 98XXXXXXXX"
                      value={formData.vendorNumber}
                      onChange={(e) => handleChange('vendorNumber', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorWhatsapp" className="text-slate-300">
                      Vendor WhatsApp
                    </Label>
                    <Input
                      id="vendorWhatsapp"
                      placeholder="+977 98XXXXXXXX"
                      value={formData.vendorWhatsapp}
                      onChange={(e) => handleChange('vendorWhatsapp', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Links Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Links
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-slate-300 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    placeholder="https://vendor-website.com"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="text-slate-300 flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-400" />
                      Instagram
                    </Label>
                    <Input
                      id="instagram"
                      placeholder="@username"
                      value={formData.instagram}
                      onChange={(e) => handleChange('instagram', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="text-slate-300 flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-500" />
                      Facebook
                    </Label>
                    <Input
                      id="facebook"
                      placeholder="facebook.com/page"
                      value={formData.facebook}
                      onChange={(e) => handleChange('facebook', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Subscription Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Subscription Details
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dateOfPurchase" className="text-slate-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Date of Purchase
                  </Label>
                  <Input
                    id="dateOfPurchase"
                    type="date"
                    value={formData.dateOfPurchase}
                    onChange={(e) => handleChange('dateOfPurchase', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="validity" className="text-slate-300 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      Validity (months)
                    </Label>
                    <Input
                      id="validity"
                      type="number"
                      min="1"
                      placeholder="12"
                      value={formData.validity}
                      onChange={(e) => handleChange('validity', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-slate-300 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-400" />
                      Price (NPR)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      placeholder="1500"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Submit Button */}
        <div className="border-t border-slate-800 p-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding Account...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-2" />
                Add Account
              </>
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
