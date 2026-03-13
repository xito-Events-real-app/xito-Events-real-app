import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Phone, 
  MessageCircle, 
  ChevronRight,
  Globe,
  Instagram,
  Facebook,
  KeyRound,
  Calendar,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { AccountData, getExpiryStatus, formatPrice, getEffectiveExpiryDate } from "@/lib/accounts-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";

interface AccountCardProps {
  account: AccountData;
  onSelect: (account: AccountData) => void;
}

export function AccountCard({ account, onSelect }: AccountCardProps) {
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleCall = (e: React.MouseEvent, number: string) => {
    e.stopPropagation();
    if (number) {
      window.open(`tel:${number}`, '_self');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, number: string) => {
    e.stopPropagation();
    if (number) {
      const { openWhatsApp } = require('@/lib/whatsapp-utils');
      openWhatsApp(number);
    }
  };

  const handleSocialLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (url) {
      const sanitizedUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(sanitizedUrl, '_blank');
    }
  };

  const hasSocialLinks = account.website || account.instagram || account.facebook;
  const hasVendorContact = account.vendorNumber || account.vendorWhatsapp;
  const expiryStatus = getExpiryStatus(account);
  const hasSubscriptionInfo = account.dateOfPurchase || account.validity || account.price;

  return (
    <Card 
      className="bg-slate-800/50 border-slate-700 p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
      onClick={() => onSelect(account)}
    >
      <div className="flex items-start justify-between mb-3">
        <Badge className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0">
          {account.accountType || 'Unknown'}
        </Badge>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </div>

      {/* ID */}
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="h-4 w-4 text-slate-400" />
        <span className="text-white font-medium truncate flex-1">
          {account.id || 'No ID'}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(account.id, 'ID');
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Password */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-slate-400 text-sm">🔒</span>
        <span className="text-slate-300 font-mono flex-1">
          {showPassword ? account.password : '••••••••'}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            setShowPassword(!showPassword);
          }}
        >
          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(account.password, 'Password');
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Vendor Info */}
      {account.vendor && (
        <div className="flex items-center justify-between border-t border-slate-700 pt-3">
          <span className="text-slate-300 text-sm truncate">
            🏪 {account.vendor}
          </span>
          {hasVendorContact && (
            <div className="flex gap-1">
              {account.vendorNumber && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                  onClick={(e) => handleCall(e, account.vendorNumber)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}
              {account.vendorWhatsapp && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                  onClick={(e) => handleWhatsApp(e, account.vendorWhatsapp)}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subscription Info */}
      {hasSubscriptionInfo && (
        <div className="flex items-center justify-between border-t border-slate-700 pt-3 mt-2">
          <div className="flex items-center gap-2">
            {account.price && (
              <span className="text-emerald-400 text-sm font-medium">
                {formatPrice(account.price)}
              </span>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`${expiryStatus.colorClass} border-current text-xs`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {expiryStatus.label}
          </Badge>
        </div>
      )}

      {/* Social Links */}
      {hasSocialLinks && (
        <div className="flex gap-2 border-t border-slate-700 pt-3 mt-2">
          {account.website && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-blue-400 hover:bg-blue-500/20"
              onClick={(e) => handleSocialLink(e, account.website)}
            >
              <Globe className="h-4 w-4" />
            </Button>
          )}
          {account.instagram && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-pink-400 hover:bg-pink-500/20"
              onClick={(e) => handleSocialLink(e, account.instagram)}
            >
              <Instagram className="h-4 w-4" />
            </Button>
          )}
          {account.facebook && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-blue-500 hover:bg-blue-500/20"
              onClick={(e) => handleSocialLink(e, account.facebook)}
            >
              <Facebook className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
