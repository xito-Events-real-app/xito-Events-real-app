import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Search, UserCog, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FreelancerData, getFreelancers, syncFreelancerCategories } from "@/lib/freelancer-api";
import { FreelancerTypeSidebar } from "./FreelancerTypeSidebar";
import { FreelancerTable } from "./FreelancerTable";
import { AddFreelancerDrawer } from "./AddFreelancerDrawer";
import { FreelancerDetailSheet } from "./FreelancerDetailSheet";
import { useToast } from "@/hooks/use-toast";

const MAIN_JOBS = ['Photographer', 'Videographer', 'Video Editor', 'Photo Editor', 'Hybrid Shooter', 'Hybrid Editor', 'Drone Operator', 'FPV Operator'];

const norm = (v?: string | null) => String(v ?? '').trim();
const normLower = (v?: string | null) => norm(v).toLowerCase();
const isYes = (v?: string | null) => norm(v).toUpperCase() === 'YES';

export function DesktopFreelancers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [freelancers, setFreelancers] = useState<FreelancerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCategorySyncing, setIsCategorySyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [mainJobFilter, setMainJobFilter] = useState("");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<FreelancerData | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const loadData = async (showSyncFeedback = false) => {
    if (showSyncFeedback) setIsSyncing(true);
    else setIsLoading(true);
    try {
      const data = await getFreelancers();
      setFreelancers(data);
      if (showSyncFeedback) {
        toast({ title: "Synced ✓", description: `${data.length} freelancers loaded from sheet` });
      }
    } catch (error) {
      console.error('Error loading freelancers:', error);
      toast({ title: "Error", description: "Failed to load freelancers", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Role counts for sidebar
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    freelancers.forEach((f) => {
      const hybridShooter = isYes(f.hybridShooter) || (isYes(f.photographer) && isYes(f.videographer));
      const hybridEditor = isYes(f.hybridEditor) || (isYes(f.photoEditor) && isYes(f.videoEditor));

      if (isYes(f.photographer)) counts['Photographer'] = (counts['Photographer'] || 0) + 1;
      if (isYes(f.videographer)) counts['Videographer'] = (counts['Videographer'] || 0) + 1;
      if (isYes(f.photoEditor)) counts['Photo Editor'] = (counts['Photo Editor'] || 0) + 1;
      if (isYes(f.videoEditor)) counts['Video Editor'] = (counts['Video Editor'] || 0) + 1;
      if (hybridShooter) counts['Hybrid Shooter'] = (counts['Hybrid Shooter'] || 0) + 1;
      if (hybridEditor) counts['Hybrid Editor'] = (counts['Hybrid Editor'] || 0) + 1;
      if (isYes(f.droneOperator)) counts['Drone Operator'] = (counts['Drone Operator'] || 0) + 1;
      if (isYes(f.fpvOperator)) counts['FPV Operator'] = (counts['FPV Operator'] || 0) + 1;
    });

    return counts;
  }, [freelancers]);

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    const cityMap = new Map<string, string>();

    freelancers.forEach((f) => {
      const raw = norm(f.city);
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!cityMap.has(key)) cityMap.set(key, raw);
    });

    return Array.from(cityMap.values()).sort((a, b) => a.localeCompare(b));
  }, [freelancers]);

  // Filter freelancers
  const filteredFreelancers = useMemo(() => {
    const matchesRole = (f: FreelancerData, role: string) => {
      const hybridShooter = isYes(f.hybridShooter) || (isYes(f.photographer) && isYes(f.videographer));
      const hybridEditor = isYes(f.hybridEditor) || (isYes(f.photoEditor) && isYes(f.videoEditor));

      const roleMap: Record<string, boolean> = {
        'Photographer': isYes(f.photographer),
        'Videographer': isYes(f.videographer),
        'Photo Editor': isYes(f.photoEditor),
        'Video Editor': isYes(f.videoEditor),
        'Hybrid Shooter': hybridShooter,
        'Hybrid Editor': hybridEditor,
        'Drone Operator': isYes(f.droneOperator),
        'FPV Operator': isYes(f.fpvOperator),
      };

      return roleMap[role] ?? true;
    };

    const matchesMainJobFilter = (f: FreelancerData, job: string) => {
      const key = normLower(job);
      if (!key) return true;

      const hybridShooter = isYes(f.hybridShooter) || (isYes(f.photographer) && isYes(f.videographer));
      const hybridEditor = isYes(f.hybridEditor) || (isYes(f.photoEditor) && isYes(f.videoEditor));

      switch (key) {
        case 'photographer':
          return isYes(f.photographer) || normLower(f.mainJob) === key;
        case 'videographer':
          return isYes(f.videographer) || normLower(f.mainJob) === key;
        case 'photo editor':
          return isYes(f.photoEditor) || normLower(f.mainJob) === key;
        case 'video editor':
          return isYes(f.videoEditor) || normLower(f.mainJob) === key;
        case 'hybrid shooter':
          return hybridShooter || normLower(f.mainJob) === key;
        case 'hybrid editor':
          return hybridEditor || normLower(f.mainJob) === key;
        case 'drone operator':
          return isYes(f.droneOperator) || normLower(f.mainJob).includes('drone');
        case 'fpv operator':
          return isYes(f.fpvOperator) || normLower(f.mainJob).includes('fpv');
        default:
          return normLower(f.mainJob) === key;
      }
    };

    return freelancers.filter((f) => {
      // Role filter from sidebar
      if (selectedRole && !matchesRole(f, selectedRole)) return false;

      // Search by name
      if (searchQuery && !normLower(f.name).includes(normLower(searchQuery))) return false;

      // City filter
      if (cityFilter && normLower(f.city) !== normLower(cityFilter)) return false;

      // Main Job filter (matches role YES columns + mainJob text)
      if (mainJobFilter && !matchesMainJobFilter(f, mainJobFilter)) return false;

      return true;
    });
  }, [freelancers, selectedRole, searchQuery, cityFilter, mainJobFilter]);

  const handleFreelancerClick = (f: FreelancerData) => {
    setSelectedFreelancer(f);
    setShowDetailSheet(true);
  };

  const handleCategorySync = async () => {
    setIsCategorySyncing(true);
    try {
      const result = await syncFreelancerCategories();
      toast({ title: "Category Sync ✓", description: `${result.mirrored} freelancers synced to all category sheets` });
    } catch (error) {
      console.error('Category sync error:', error);
      toast({ title: "Error", description: "Failed to sync category sheets", variant: "destructive" });
    } finally {
      setIsCategorySyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      <FreelancerTypeSidebar
        roleCounts={roleCounts}
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        totalCount={freelancers.length}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
                ← Back to Suite
              </Button>
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-slate-400" />
                <h1 className="text-xl font-bold text-white">
                  {selectedRole || 'All Freelancers'}
                </h1>
                <span className="text-slate-400 text-sm">({filteredFreelancers.length})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search by name..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white pl-10" />
              </div>

              <Select value={cityFilter} onValueChange={(v) => setCityFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all" className="text-white hover:bg-slate-700">All Cities</SelectItem>
                  {uniqueCities.map(c => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mainJobFilter} onValueChange={(v) => setMainJobFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Main Job" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all" className="text-white hover:bg-slate-700">All Jobs</SelectItem>
                  {MAIN_JOBS.map(j => (
                    <SelectItem key={j} value={j} className="text-white hover:bg-slate-700">{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleCategorySync} disabled={isCategorySyncing}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
                <Database className={`h-4 w-4 mr-2 ${isCategorySyncing ? 'animate-spin' : ''}`} />
                {isCategorySyncing ? 'Syncing...' : 'Sync Categories'}
              </Button>

              <Button variant="ghost" size="icon" onClick={() => loadData(true)} disabled={isSyncing}
                className="text-slate-400 hover:text-white">
                <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>

              <Button onClick={() => setShowAddDrawer(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Freelancer
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading freelancers...</div>
          ) : (
            <FreelancerTable freelancers={filteredFreelancers} onRowClick={handleFreelancerClick} />
          )}
        </div>
      </div>

      <AddFreelancerDrawer open={showAddDrawer} onOpenChange={setShowAddDrawer} onFreelancerAdded={loadData} />
      <FreelancerDetailSheet freelancer={selectedFreelancer} open={showDetailSheet}
        onOpenChange={setShowDetailSheet} onFreelancerUpdated={loadData} />
    </div>
  );
}
