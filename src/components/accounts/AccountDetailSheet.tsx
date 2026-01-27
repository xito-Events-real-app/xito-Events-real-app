import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Phone, 
  MessageCircle,
  Globe,
  Instagram,
  Facebook,
  KeyRound,
  Mail,
  User,
  Building2,
  Clock,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { AccountData, getExpiryStatus, formatPrice, getEffectiveExpiryDate } from "@/lib/accounts-api";
import { ClickableDateWithBS } from "./ClickableDateWithBS";

interface AccountDetailSheetProps {
  account: AccountData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDetailSheet({ account, open, onOpenChange }: AccountDetailSheetProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (!account) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleCall = (number: string) => {
    if (number) {
      window.open(`tel:${number}`, '_self');
    }
  };

  const handleWhatsApp = (number: string) => {
    if (number) {
      const cleanNumber = number.replace(/[^0-9+]/g, '');
      window.open(`https://wa.me/${cleanNumber.replace('+', '')}`, '_blank');
    }
  };

  const handleSocialLink = (url: string) => {
    if (url) {
      const sanitizedUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(sanitizedUrl, '_blank');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-800 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-pink-400" />
            Account Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Account Type */}
          <div>
            <Badge className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0 text-sm px-3 py-1">
              {account.accountType || 'Unknown Type'}
            </Badge>
          </div>

          {/* Account Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Account Information
            </h3>
            
            {/* ID */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-white">{account.id || 'No ID'}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={() => copyToClipboard(account.id, 'ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <span className="text-white font-mono">
                  {showPassword ? account.password : '••••••••••'}
                </span>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  onClick={() => copyToClipboard(account.password, 'Password')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Recovery Account */}
            {account.recoveryAccount && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-slate-400">Recovery Account</p>
                    <span className="text-white">{account.recoveryAccount}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  onClick={() => copyToClipboard(account.recoveryAccount, 'Recovery Account')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Registered Number */}
            {account.registeredNumber && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-xs text-slate-400">Registered Number</p>
                    <span className="text-white">{account.registeredNumber}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                  onClick={() => handleCall(account.registeredNumber)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Purchase Info Section */}
          {account.whoBoughtIt && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Purchase Information
              </h3>
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                <User className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Bought By</p>
                  <span className="text-white">{account.whoBoughtIt}</span>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Section */}
          {account.vendor && (
            <>
              <Separator className="bg-slate-700" />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Vendor Information
                </h3>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-white">{account.vendor}</span>
                </div>

                {/* Vendor Contact Buttons */}
                {(account.vendorNumber || account.vendorWhatsapp) && (
                  <div className="flex gap-2">
                    {account.vendorNumber && (
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleCall(account.vendorNumber)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Vendor
                      </Button>
                    )}
                    {account.vendorWhatsapp && (
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleWhatsApp(account.vendorWhatsapp)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Subscription Details Section */}
          {(account.dateOfPurchase || account.validity || account.price) && (
            <>
              <Separator className="bg-slate-700" />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Subscription Details
                </h3>
                
                {/* Date of Purchase */}
                {account.dateOfPurchase && (
                  <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-1">Date of Purchase</p>
                      <ClickableDateWithBS 
                        dateString={account.dateOfPurchase} 
                        className="text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Validity Period */}
                {account.validity && (
                  <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">Validity Period</p>
                      <span className="text-white">{account.validity} months</span>
                    </div>
                  </div>
                )}

                {/* Expiry Date with Status */}
                {(() => {
                  const expiryStatus = getExpiryStatus(account);
                  const expiryDateStr = getEffectiveExpiryDate(account);
                  if (!expiryDateStr) return null;
                  
                  return (
                    <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">Expiry Date</p>
                        <ClickableDateWithBS 
                          dateString={expiryDateStr} 
                          className={expiryStatus.colorClass}
                        />
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${expiryStatus.colorClass} border-current`}
                      >
                        {expiryStatus.label}
                      </Badge>
                    </div>
                  );
                })()}

                {/* Price */}
                {account.price && (
                  <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    <div>
                      <p className="text-xs text-slate-400">Price</p>
                      <span className="text-emerald-400 font-semibold">{formatPrice(account.price)}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Social Links Section */}
          {(account.website || account.instagram || account.facebook) && (
            <>
              <Separator className="bg-slate-700" />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Links
                </h3>
                <div className="flex flex-wrap gap-2">
                  {account.website && (
                    <Button 
                      variant="outline"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                      onClick={() => handleSocialLink(account.website)}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Button>
                  )}
                  {account.instagram && (
                    <Button 
                      variant="outline"
                      className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20"
                      onClick={() => handleSocialLink(account.instagram)}
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram
                    </Button>
                  )}
                  {account.facebook && (
                    <Button 
                      variant="outline"
                      className="border-blue-600/50 text-blue-500 hover:bg-blue-500/20"
                      onClick={() => handleSocialLink(account.facebook)}
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
