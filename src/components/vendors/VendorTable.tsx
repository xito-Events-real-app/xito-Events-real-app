import { VendorData } from "@/lib/vendor-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Instagram, 
  Facebook, 
  Music2, 
  Youtube, 
  Globe, 
  Mail,
  Phone,
  ExternalLink,
  MessageCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VendorTableProps {
  vendors: VendorData[];
  onRowClick: (vendor: VendorData) => void;
}

const SocialIcon = ({ 
  icon: Icon, 
  value, 
  color, 
  tooltip,
  type = 'link' 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  color: string;
  tooltip: string;
  type?: 'link' | 'email';
}) => {
  if (!value) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    let finalUrl: string;
    if (type === 'email') {
      finalUrl = `mailto:${value}`;
    } else {
      finalUrl = value;
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        finalUrl = 'https://' + value;
      }
    }
    
    // Use window.open with noopener for security
    const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Fallback if popup blocked
      window.location.href = finalUrl;
    }
  };

  const href = type === 'email' 
    ? `mailto:${value}` 
    : (value.startsWith('http') ? value : `https://${value}`);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-1 h-7 w-7 flex items-center justify-center rounded-md ${color} hover:bg-slate-700 transition-colors`}
            onClick={handleClick}
          >
            <Icon className="h-3.5 w-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function VendorTable({ vendors, onRowClick }: VendorTableProps) {
  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
            <TableHead className="text-slate-300 font-semibold">Vendor Name</TableHead>
            <TableHead className="text-slate-300 font-semibold">Type</TableHead>
            <TableHead className="text-slate-300 font-semibold">City</TableHead>
            <TableHead className="text-slate-300 font-semibold">Area</TableHead>
            <TableHead className="text-slate-300 font-semibold">Contact</TableHead>
            <TableHead className="text-slate-300 font-semibold">Owner 1</TableHead>
            <TableHead className="text-slate-300 font-semibold text-center">Links</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                No vendors found
              </TableCell>
            </TableRow>
          ) : (
            vendors.map((vendor) => (
              <TableRow 
                key={vendor.rowNumber}
                className="border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => onRowClick(vendor)}
              >
                <TableCell className="font-medium text-white">
                  {vendor.vendorName}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                    {vendor.vendorType || '-'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">
                  {vendor.city || '-'}
                </TableCell>
                <TableCell className="text-slate-300">
                  {vendor.area || '-'}
                </TableCell>
                <TableCell className="text-slate-300">
                  {vendor.companyContactNo ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{vendor.companyContactNo}</span>
                      <a
                        href={`tel:${vendor.companyContactNo.replace(/\s/g, '')}`}
                        className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                        onClick={(e) => e.stopPropagation()}
                        title="Call"
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                      <a
                        href={`https://wa.me/${vendor.companyContactNo.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40"
                        onClick={(e) => e.stopPropagation()}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </a>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-slate-300">
                  {vendor.owner1Name ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{vendor.owner1Name}</span>
                      {vendor.owner1ContactNo && (
                        <a
                          href={`tel:${vendor.owner1ContactNo.replace(/\s/g, '')}`}
                          className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                          onClick={(e) => e.stopPropagation()}
                          title="Call"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
                      {vendor.owner1WhatsappNo && (
                        <a
                          href={`https://wa.me/${vendor.owner1WhatsappNo.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40"
                          onClick={(e) => e.stopPropagation()}
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-0.5">
                    <SocialIcon icon={MapPin} value={vendor.googleMapLink} color="text-red-500" tooltip="Google Maps" />
                    <SocialIcon icon={Instagram} value={vendor.instagramLink} color="text-pink-500" tooltip="Instagram" />
                    <SocialIcon icon={Facebook} value={vendor.facebookLink} color="text-blue-600" tooltip="Facebook" />
                    <SocialIcon icon={Music2} value={vendor.tiktokLink} color="text-slate-200" tooltip="TikTok" />
                    <SocialIcon icon={Youtube} value={vendor.youtubeLink} color="text-red-600" tooltip="YouTube" />
                    <SocialIcon icon={Globe} value={vendor.websiteLink} color="text-blue-500" tooltip="Website" />
                    <SocialIcon icon={Mail} value={vendor.email} color="text-amber-500" tooltip="Email" type="email" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
