import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCog, Phone, MessageCircle } from "lucide-react";
import { CitySelector } from "@/components/vendors/CitySelector";
import { SocialLinkInput } from "@/components/vendors/SocialLinkInput";
import { addFreelancer } from "@/lib/freelancer-api";
import { useToast } from "@/hooks/use-toast";

const MAIN_JOBS = ['Photographer', 'Videographer', 'Video Editor', 'Photo Editor', 'Drone Operator', 'FPV Operator'];

const SECONDARY_ROLES: { key: string; label: string }[] = [
  { key: 'photographer', label: 'Photographer' },
  { key: 'videographer', label: 'Videographer' },
  { key: 'photoEditor', label: 'Photo Editor' },
  { key: 'videoEditor', label: 'Video Editor' },
  { key: 'droneOperator', label: 'Drone Operator' },
  { key: 'fpvOperator', label: 'FPV Operator' },
];

function getSecondaryRoles(mainJob: string) {
  if (mainJob === 'Drone Operator') {
    return SECONDARY_ROLES.filter(r => r.key !== 'droneOperator');
  }
  if (mainJob === 'FPV Operator') {
    return SECONDARY_ROLES.filter(r => r.key !== 'fpvOperator');
  }
  const mainJobMap: Record<string, string> = {
    'Photographer': 'photographer',
    'Videographer': 'videographer',
    'Photo Editor': 'photoEditor',
    'Video Editor': 'videoEditor',
  };
  const excludeKey = mainJobMap[mainJob];
  return SECONDARY_ROLES.filter(r => r.key !== excludeKey);
}

interface AddFreelancerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFreelancerAdded: () => void;
}

export function AddFreelancerDrawer({ open, onOpenChange, onFreelancerAdded }: AddFreelancerDrawerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [pathaoLandmark, setPathaoLandmark] = useState("");
  const [mainJob, setMainJob] = useState("");
  const [secondaryRoles, setSecondaryRoles] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setName(""); setContactNo(""); setWhatsappNo(""); setInstagram(""); setFacebook("");
    setCity(""); setArea(""); setMapLink(""); setPathaoLandmark(""); setMainJob("");
    setSecondaryRoles({});
  };

  const handleMainJobChange = (value: string) => {
    setMainJob(value);
    setSecondaryRoles({});
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const mainJobMap: Record<string, string> = {
        'Photographer': 'photographer',
        'Videographer': 'videographer',
        'Photo Editor': 'photoEditor',
        'Video Editor': 'videoEditor',
        'Drone Operator': 'droneOperator',
        'FPV Operator': 'fpvOperator',
      };

      const roles: Record<string, string> = {
        photographer: 'NO', videographer: 'NO', photoEditor: 'NO', videoEditor: 'NO',
        droneOperator: 'NO', fpvOperator: 'NO',
      };

      if (mainJobMap[mainJob]) {
        roles[mainJobMap[mainJob]] = 'YES';
      }

      Object.entries(secondaryRoles).forEach(([key, checked]) => {
        if (checked) roles[key] = 'YES';
      });

      const hybridShooter = roles.photographer === 'YES' && roles.videographer === 'YES' ? 'YES' : 'NO';
      const hybridEditor = roles.photoEditor === 'YES' && roles.videoEditor === 'YES' ? 'YES' : 'NO';

      await addFreelancer({
        name, contactNo, whatsappNo, instagram, facebook, city, area, mapLink, pathaoLandmark, mainJob,
        ...roles, hybridShooter, hybridEditor,
      });

      toast({ title: "Success", description: "Freelancer added successfully" });
      resetForm();
      onOpenChange(false);
      onFreelancerAdded();
    } catch (error) {
      console.error('Error adding freelancer:', error);
      toast({ title: "Error", description: "Failed to add freelancer", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableSecondary = mainJob ? getSecondaryRoles(mainJob) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-slate-900 border-slate-700 sm:max-w-lg max-h-[85vh] flex flex-col p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700 flex-shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Add New Freelancer
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Basic Information</h3>
              <div className="space-y-2">
                <Label className="text-slate-300">Name *</Label>
                <Input placeholder="Enter name" value={name} onChange={(e) => setName(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Contact No</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Contact No" value={contactNo} onChange={(e) => setContactNo(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">WhatsApp No</Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="WhatsApp No" value={whatsappNo} onChange={(e) => setWhatsappNo(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white pl-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Social Links</h3>
              <div className="space-y-3">
                <SocialLinkInput platform="instagram" value={instagram} onChange={setInstagram} />
                <SocialLinkInput platform="facebook" value={facebook} onChange={setFacebook} />
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
                <Input placeholder="Enter area" value={area} onChange={(e) => setArea(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Google Map Link</Label>
                <Input placeholder="Paste Google Maps link" value={mapLink} onChange={(e) => setMapLink(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Pathao Landmark</Label>
                <Input placeholder="Enter Pathao landmark" value={pathaoLandmark} onChange={(e) => setPathaoLandmark(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white" />
              </div>
            </div>

            {/* Main Job */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Profession</h3>
              <div className="space-y-2">
                <Label className="text-slate-300">Main Job</Label>
                <Select value={mainJob} onValueChange={handleMainJobChange}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select main job" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {MAIN_JOBS.map((job) => (
                      <SelectItem key={job} value={job} className="text-white hover:bg-slate-700">{job}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mainJob && (
                <div className="space-y-3 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm text-slate-300">
                    Apart from your main profession, do you professionally do the following?
                  </p>
                  <p className="text-xs text-slate-500 italic">Only check if you are professionally skilled.</p>
                  <div className="space-y-2">
                    {availableSecondary.map((role) => (
                      <div key={role.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.key}`}
                          checked={secondaryRoles[role.key] || false}
                          onCheckedChange={(checked) =>
                            setSecondaryRoles(prev => ({ ...prev, [role.key]: !!checked }))
                          }
                          className="border-slate-500 data-[state=checked]:bg-indigo-600"
                        />
                        <label htmlFor={`role-${role.key}`} className="text-sm text-slate-300 cursor-pointer">
                          {role.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-slate-700 flex-shrink-0">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
              {isSubmitting ? "Adding..." : "Add Freelancer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
