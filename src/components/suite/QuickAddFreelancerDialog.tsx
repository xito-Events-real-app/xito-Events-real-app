import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { quickAddFreelancer, FreelancerField } from "@/lib/freelancer-assignment-api";
import { Loader2, UserPlus } from "lucide-react";

interface QuickAddFreelancerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleField: FreelancerField;
  roleLabel: string;
  onSuccess: (name: string) => void;
}

const SKILL_OPTIONS = [
  { key: 'photographer', label: 'Photographer' },
  { key: 'videographer', label: 'Videographer' },
  { key: 'photoEditor', label: 'Photo Editor' },
  { key: 'videoEditor', label: 'Video Editor' },
  { key: 'droneOperator', label: 'Drone Operator' },
  { key: 'fpvOperator', label: 'FPV Operator' },
  { key: 'iphoneShooter', label: 'iPhone Shooter' },
] as const;

const MAIN_JOB_OPTIONS = [
  { key: 'photographer', label: 'PHOTOGRAPHER' },
  { key: 'videographer', label: 'VIDEOGRAPHER' },
  { key: 'photoEditor', label: 'PHOTO EDITOR' },
  { key: 'videoEditor', label: 'VIDEO EDITOR' },
  { key: 'droneOperator', label: 'DRONE OPERATOR' },
  { key: 'fpvOperator', label: 'FPV OPERATOR' },
  { key: 'iphoneShooter', label: 'IPHONE SHOOTER' },
  { key: 'hybridShooter', label: 'HYBRID SHOOTER' },
  { key: 'hybridEditor', label: 'HYBRID EDITOR' },
] as const;

const JOB_PRIORITY: [string, string][] = [
  ['photographer', 'PHOTOGRAPHER'],
  ['videographer', 'VIDEOGRAPHER'],
  ['photoEditor', 'PHOTO EDITOR'],
  ['videoEditor', 'VIDEO EDITOR'],
  ['droneOperator', 'DRONE OPERATOR'],
  ['fpvOperator', 'FPV OPERATOR'],
  ['iphoneShooter', 'IPHONE SHOOTER'],
];

type SkillKey = typeof SKILL_OPTIONS[number]['key'];

const ROLE_TO_SKILL: Partial<Record<FreelancerField, SkillKey>> = {
  photographerBride: 'photographer',
  photographerGroom: 'photographer',
  extraPhotographer: 'photographer',
  videographerBride: 'videographer',
  videographerGroom: 'videographer',
  extraVideographer: 'videographer',
  iphoneShooter: 'iphoneShooter',
  droneOperator: 'droneOperator',
  fpvOperator: 'fpvOperator',
};

function getInitialSkills(roleField: FreelancerField): Record<SkillKey, boolean> {
  const skills: Record<SkillKey, boolean> = {
    photographer: false, videographer: false, photoEditor: false,
    videoEditor: false, droneOperator: false, fpvOperator: false, iphoneShooter: false,
  };
  const precheck = ROLE_TO_SKILL[roleField];
  if (precheck) skills[precheck] = true;
  return skills;
}

export function QuickAddFreelancerDialog({ open, onOpenChange, roleField, roleLabel, onSuccess }: QuickAddFreelancerDialogProps) {
  const [name, setName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [skills, setSkills] = useState(() => getInitialSkills(roleField));
  const [mainJob, setMainJob] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-derive main job from skills when skills change
  const derivedMainJob = useMemo(() => {
    const isHybridShooter = skills.photographer && skills.videographer;
    const isHybridEditor = skills.photoEditor && skills.videoEditor;
    if (isHybridShooter) return 'HYBRID SHOOTER';
    if (isHybridEditor) return 'HYBRID EDITOR';
    return JOB_PRIORITY.find(([key]) => skills[key as SkillKey])?.[1] || '';
  }, [skills]);

  // Update mainJob when skills change (only if user hasn't manually overridden)
  useEffect(() => {
    setMainJob(derivedMainJob);
  }, [derivedMainJob]);

  // Reset skills when roleField changes
  useEffect(() => {
    setSkills(getInitialSkills(roleField));
  }, [roleField]);

  const toggleSkill = (key: SkillKey) => {
    setSkills(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnySkill = Object.values(skills).some(Boolean);
  const precheckedSkill = ROLE_TO_SKILL[roleField];

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!contactNo.trim()) { toast.error("Contact number is required"); return; }
    if (!hasAnySkill) { toast.error("Select at least one skill"); return; }
    setSaving(true);
    try {
      await quickAddFreelancer(name.trim(), contactNo.trim(), roleField, skills, mainJob || undefined);
      toast.success(`${name.trim()} added as ${roleLabel}`);
      onSuccess(name.trim());
      setName("");
      setContactNo("");
      setSkills(getInitialSkills(roleField));
      setMainJob("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to add freelancer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm z-[200]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Quick Add Freelancer
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Adding from: <span className="font-semibold">{roleLabel}</span></p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fl-name">Name *</Label>
            <Input id="fl-name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus />
          </div>
          <div>
            <Label htmlFor="fl-contact">Contact Number *</Label>
            <Input id="fl-contact" value={contactNo} onChange={e => setContactNo(e.target.value)} placeholder="98XXXXXXXX" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">What can this freelancer do? (check all that apply)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SKILL_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    skills[key]
                      ? key === precheckedSkill
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                        : 'border-primary bg-accent'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <Checkbox
                    checked={skills[key]}
                    onCheckedChange={() => toggleSkill(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Main Job</Label>
            <Select value={mainJob} onValueChange={setMainJob}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select main job" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {MAIN_JOB_OPTIONS.map(({ key, label }) => (
                  <SelectItem key={key} value={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !hasAnySkill} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Save & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
