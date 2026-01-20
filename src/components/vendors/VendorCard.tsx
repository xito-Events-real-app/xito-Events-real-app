import { VendorData } from "@/lib/vendor-api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Instagram, 
  Facebook, 
  Music2, 
  Youtube, 
  Globe, 
  Mail,
  Phone,
  User,
  Building2,
  ChevronRight
} from "lucide-react";

interface VendorCardProps {
  vendor: VendorData;
  onClick: () => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const openLink = (url: string, type: 'link' | 'email' = 'link') => {
    if (!url) return;
    if (type === 'email') {
      window.open(`mailto:${url}`, '_blank');
    } else {
      let finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'https://' + url;
      }
      window.open(finalUrl, '_blank');
    }
  };

  const socialLinks = [
    { icon: MapPin, value: vendor.googleMapLink, color: 'text-red-500', type: 'link' as const },
    { icon: Instagram, value: vendor.instagramLink, color: 'text-pink-500', type: 'link' as const },
    { icon: Facebook, value: vendor.facebookLink, color: 'text-blue-600', type: 'link' as const },
    { icon: Music2, value: vendor.tiktokLink, color: 'text-slate-200', type: 'link' as const },
    { icon: Youtube, value: vendor.youtubeLink, color: 'text-red-600', type: 'link' as const },
    { icon: Globe, value: vendor.websiteLink, color: 'text-blue-500', type: 'link' as const },
    { icon: Mail, value: vendor.email, color: 'text-amber-500', type: 'email' as const },
  ].filter(link => link.value);

  return (
    <Card 
      className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white text-lg">{vendor.vendorName}</h3>
            <Badge variant="secondary" className="mt-1 bg-slate-700 text-slate-300">
              {vendor.vendorType || 'Unknown Type'}
            </Badge>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Location */}
        {(vendor.city || vendor.area) && (
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{[vendor.area, vendor.city].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {/* Company Contact */}
        {vendor.companyContactNo && (
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span>{vendor.companyContactNo}</span>
          </div>
        )}

        {/* Owner 1 */}
        {vendor.owner1Name && (
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <User className="h-4 w-4 text-slate-400" />
            <span>{vendor.owner1Name}</span>
            {vendor.owner1ContactNo && (
              <>
                <Phone className="h-3 w-3 text-slate-500 ml-2" />
                <span className="text-slate-400">{vendor.owner1ContactNo}</span>
              </>
            )}
          </div>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
            {socialLinks.map((link, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={`p-1 h-8 w-8 ${link.color} hover:bg-slate-700`}
                onClick={(e) => {
                  e.stopPropagation();
                  openLink(link.value, link.type);
                }}
              >
                <link.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
