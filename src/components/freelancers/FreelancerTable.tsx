import { FreelancerData } from "@/lib/freelancer-api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Instagram, Facebook, Phone, MessageCircle } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

interface FreelancerTableProps {
  freelancers: FreelancerData[];
  onRowClick: (freelancer: FreelancerData) => void;
}

const ROLE_BADGES: { key: keyof FreelancerData; label: string; color: string }[] = [
  { key: 'photographer', label: 'Photo', color: 'bg-blue-600/30 text-blue-300 border-blue-500/30' },
  { key: 'videographer', label: 'Video', color: 'bg-red-600/30 text-red-300 border-red-500/30' },
  { key: 'photoEditor', label: 'P.Edit', color: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/30' },
  { key: 'videoEditor', label: 'V.Edit', color: 'bg-orange-600/30 text-orange-300 border-orange-500/30' },
  { key: 'hybridShooter', label: 'H.Shoot', color: 'bg-purple-600/30 text-purple-300 border-purple-500/30' },
  { key: 'hybridEditor', label: 'H.Edit', color: 'bg-pink-600/30 text-pink-300 border-pink-500/30' },
  { key: 'droneOperator', label: 'Drone', color: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30' },
  { key: 'fpvOperator', label: 'FPV', color: 'bg-amber-600/30 text-amber-300 border-amber-500/30' },
];

const SocialLink = ({ icon: Icon, value, color, tooltip }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string; color: string; tooltip: string;
}) => {
  if (!value) return null;
  const href = value.startsWith('http') ? value : `https://${value}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a href={href} target="_blank" rel="noopener noreferrer"
            className={`p-1 h-7 w-7 flex items-center justify-center rounded-md ${color} hover:bg-slate-700 transition-colors`}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function FreelancerTable({ freelancers, onRowClick }: FreelancerTableProps) {
  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
            <TableHead className="text-slate-300 font-semibold">Name</TableHead>
            <TableHead className="text-slate-300 font-semibold">Main Job</TableHead>
            <TableHead className="text-slate-300 font-semibold">City</TableHead>
            <TableHead className="text-slate-300 font-semibold">Area</TableHead>
            <TableHead className="text-slate-300 font-semibold">Contact</TableHead>
            <TableHead className="text-slate-300 font-semibold">Roles</TableHead>
            <TableHead className="text-slate-300 font-semibold text-center">Links</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {freelancers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                No freelancers found
              </TableCell>
            </TableRow>
          ) : (
            freelancers.map((f) => (
              <TableRow
                key={f.rowNumber}
                className="border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => onRowClick(f)}
              >
                <TableCell className="font-medium text-white">{f.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-indigo-600/30 text-indigo-300 border-indigo-500/30">
                    {f.mainJob || '-'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">{f.city || '-'}</TableCell>
                <TableCell className="text-slate-300">{f.area || '-'}</TableCell>
                <TableCell className="text-slate-300">
                  {f.contactNo ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{f.contactNo}</span>
                      <a href={`tel:${f.contactNo.replace(/\s/g, '')}`}
                        className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                      {f.whatsappNo && (
                        <a href={`https://wa.me/${f.whatsappNo.replace(/[^0-9]/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {ROLE_BADGES.filter(r => f[r.key]?.toString().toUpperCase() === 'YES').map(r => (
                      <Badge key={r.key} variant="outline" className={`text-[10px] px-1.5 py-0 ${r.color}`}>
                        {r.label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-0.5">
                    <SocialLink icon={MapPin} value={f.mapLink} color="text-red-500" tooltip="Google Maps" />
                    <SocialLink icon={Instagram} value={f.instagram} color="text-pink-500" tooltip="Instagram" />
                    <SocialLink icon={Facebook} value={f.facebook} color="text-blue-600" tooltip="Facebook" />
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
