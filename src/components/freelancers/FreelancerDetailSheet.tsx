import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCog, Phone, MessageCircle, Save, Trash2 } from "lucide-react";
import { CitySelector } from "@/components/vendors/CitySelector";
import { SocialLinkInput } from "@/components/vendors/SocialLinkInput";
import { FreelancerData, updateFreelancer, deleteFreelancer } from "@/lib/freelancer-api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAIN_JOBS = ['Photographer', 'Videographer', 'Video Editor', 'Photo Editor', 'Drone/FPV Operator'];

interface FreelancerDetailSheetProps {
  freelancer: FreelancerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFreelancerUpdated: () => void;
}

export function FreelancerDetailSheet({ freelancer, open, onOpenChange, onFreelancerUpdated }: FreelancerDetailSheetProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const [roles, setRoles] = useState<Record<string, boolean>>({
    photographer: false, videographer: false, photoEditor: false, videoEditor: false,
    droneOperator: false, fpvOperator: false,
  });

  useEffect(() => {
    if (freelancer) {
      setName(freelancer.name || "");
      setContactNo(freelancer.contactNo || "");
      setWhatsappNo(freelancer.whatsappNo || "");
      setInstagram(freelancer.instagram || "");
      setFacebook(freelancer.facebook || "");
      setCity(freelancer.city || "");
      setArea(freelancer.area || "");
      setMapLink(freelancer.mapLink || "");
      setPathaoLandmark(freelancer.pathaoLandmark || "");
      setMainJob(freelancer.mainJob || "");
      setRoles({
        photographer: freelancer.photographer?.toUpperCase() === 'YES',
        videographer: freelancer.videographer?.toUpperCase() === 'YES',
        photoEditor: freelancer.photoEditor?.toUpperCase() === 'YES',
        videoEditor: freelancer.videoEditor?.toUpperCase() === 'YES',
        droneOperator: freelancer.droneOperator?.toUpperCase() === 'YES',
        fpvOperator: freelancer.fpvOperator?.toUpperCase() === 'YES',
      });
    }
  }, [freelancer]);

  const handleSave = async () => {
    if (!freelancer) return;
    setIsSubmitting(true);
    try {
      const hybridShooter = roles.photographer && roles.videographer ? 'YES' : 'NO';
      const hybridEditor = roles.photoEditor && roles.videoEditor ? 'YES' : 'NO';

      await updateFreelancer({
        rowNumber: freelancer.rowNumber,
        name, contactNo, whatsappNo, instagram, facebook, city, area, mapLink, pathaoLandmark, mainJob,
        photographer: roles.photographer ? 'YES' : 'NO',
        videographer: roles.videographer ? 'YES' : 'NO',
        photoEditor: roles.photoEditor ? 'YES' : 'NO',
        videoEditor: roles.videoEditor ? 'YES' : 'NO',
        hybridShooter, hybridEditor,
        droneOperator: roles.droneOperator ? 'YES' : 'NO',
        fpvOperator: roles.fpvOperator ? 'YES' : 'NO',
      });

      toast({ title: "Success", description: "Freelancer updated successfully" });
      onOpenChange(false);
      onFreelancerUpdated();
    } catch (error) {
      console.error('Error updating freelancer:', error);
      toast({ title: "Error", description: "Failed to update freelancer", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!freelancer) return;
    setIsDeleting(true);
    try {
      await deleteFreelancer(freelancer.rowNumber);
      toast({ title: "Success", description: "Freelancer deleted successfully" });
      onOpenChange(false);
      onFreelancerUpdated();
    } catch (error) {
      console.error('Error deleting freelancer:', error);
      toast({ title: "Error", description: "Failed to delete freelancer", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!freelancer) return null;

  const roleCheckboxes = [
    { key: 'photographer', label: 'Photographer' },
    { key: 'videographer', label: 'Videographer' },
    { key: 'photoEditor', label: 'Photo Editor' },
    { key: 'videoEditor', label: 'Video Editor' },
    { key: 'droneOperator', label: 'Drone Operator' },
    { key: 'fpvOperator', label: 'FPV Operator' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-700 w-full sm:max-w-lg">
        <SheetHeader className="border-b border-slate-700 pb-4">
          <SheetTitle className="text-white flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Freelancer Details
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Basic Information</h3>
              <div className="space-y-2">
                <Label className="text-slate-300">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Contact No</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={contactNo} onChange={(e) => setContactNo(e.target.value)} className="bg-slate-800 border-slate-600 text-white pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">WhatsApp No</Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={whatsappNo} onChange={(e) => setWhatsappNo(e.target.value)} className="bg-slate-800 border-slate-600 text-white pl-10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Social Links</h3>
              <div className="space-y-3">
                <SocialLinkInput platform="instagram" value={instagram} onChange={setInstagram} />
                <SocialLinkInput platform="facebook" value={facebook} onChange={setFacebook} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Location</h3>
              <div className="space-y-2">
                <Label className="text-slate-300">City</Label>
                <CitySelector value={city} onChange={setCity} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Area</Label>
                <Input value={area} onChange={(e) => setArea(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Google Map Link</Label>
                <Input value={mapLink} onChange={(e) => setMapLink(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Pathao Landmark</Label>
                <Input value={pathaoLandmark} onChange={(e) => setPathaoLandmark(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Profession</h3>
              <div className="space-y-2">
                <Label className="text-slate-300">Main Job</Label>
                <Select value={mainJob} onValueChange={setMainJob}>
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

              <div className="space-y-3 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-300 font-medium">Roles</p>
                <div className="space-y-2">
                  {roleCheckboxes.map((r) => (
                    <div key={r.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`detail-role-${r.key}`}
                        checked={roles[r.key] || false}
                        onCheckedChange={(checked) => setRoles(prev => ({ ...prev, [r.key]: !!checked }))}
                        className="border-slate-500 data-[state=checked]:bg-indigo-600"
                      />
                      <label htmlFor={`detail-role-${r.key}`} className="text-sm text-slate-300 cursor-pointer">{r.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting} className="flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete Freelancer</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Are you sure you want to delete "{name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
