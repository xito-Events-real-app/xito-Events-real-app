import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Search, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FreelancerData, getFreelancers } from "@/lib/freelancer-api";
import { FreelancerTypeSidebar } from "./FreelancerTypeSidebar";
import { FreelancerTable } from "./FreelancerTable";
import { AddFreelancerDrawer } from "./AddFreelancerDrawer";
import { FreelancerDetailSheet } from "./FreelancerDetailSheet";
import { useToast } from "@/hooks/use-toast";

const MAIN_JOBS = ['Photographer', 'Videographer', 'Video Editor', 'Photo Editor', 'Drone Operator', 'FPV Operator'];

export function DesktopFreelancers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [freelancers, setFreelancers] = useState<FreelancerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [mainJobFilter, setMainJobFilter] = useState("");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<FreelancerData | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getFreelancers();
      setFreelancers(data);
    } catch (error) {
      console.error('Error loading freelancers:', error);
      toast({ title: "Error", description: "Failed to load freelancers", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Role counts for sidebar
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    freelancers.forEach(f => {
      if (f.photographer?.toUpperCase() === 'YES') counts['Photographer'] = (counts['Photographer'] || 0) + 1;
      if (f.videographer?.toUpperCase() === 'YES') counts['Videographer'] = (counts['Videographer'] || 0) + 1;
      if (f.photoEditor?.toUpperCase() === 'YES') counts['Photo Editor'] = (counts['Photo Editor'] || 0) + 1;
      if (f.videoEditor?.toUpperCase() === 'YES') counts['Video Editor'] = (counts['Video Editor'] || 0) + 1;
      if (f.hybridShooter?.toUpperCase() === 'YES') counts['Hybrid Shooter'] = (counts['Hybrid Shooter'] || 0) + 1;
      if (f.hybridEditor?.toUpperCase() === 'YES') counts['Hybrid Editor'] = (counts['Hybrid Editor'] || 0) + 1;
      if (f.droneOperator?.toUpperCase() === 'YES') counts['Drone Operator'] = (counts['Drone Operator'] || 0) + 1;
      if (f.fpvOperator?.toUpperCase() === 'YES') counts['FPV Operator'] = (counts['FPV Operator'] || 0) + 1;
    });
    return counts;
  }, [freelancers]);

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities = new Set(freelancers.map(f => f.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [freelancers]);

  // Filter freelancers
  const filteredFreelancers = useMemo(() => {
    return freelancers.filter(f => {
      // Role filter from sidebar
      if (selectedRole) {
        const roleMap: Record<string, (f: FreelancerData) => boolean> = {
          'Photographer': (f) => f.photographer?.toUpperCase() === 'YES',
          'Videographer': (f) => f.videographer?.toUpperCase() === 'YES',
          'Photo Editor': (f) => f.photoEditor?.toUpperCase() === 'YES',
          'Video Editor': (f) => f.videoEditor?.toUpperCase() === 'YES',
          'Hybrid Shooter': (f) => f.hybridShooter?.toUpperCase() === 'YES',
          'Hybrid Editor': (f) => f.hybridEditor?.toUpperCase() === 'YES',
          'Drone Operator': (f) => f.droneOperator?.toUpperCase() === 'YES',
          'FPV Operator': (f) => f.fpvOperator?.toUpperCase() === 'YES',
        };
        if (roleMap[selectedRole] && !roleMap[selectedRole](f)) return false;
      }
      // Search by name
      if (searchQuery && !f.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // City filter
      if (cityFilter && f.city !== cityFilter) return false;
      // Main job filter
      if (mainJobFilter && f.mainJob !== mainJobFilter) return false;
      return true;
    });
  }, [freelancers, selectedRole, searchQuery, cityFilter, mainJobFilter]);

  const handleFreelancerClick = (f: FreelancerData) => {
    setSelectedFreelancer(f);
    setShowDetailSheet(true);
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

              <Button variant="ghost" size="icon" onClick={loadData} disabled={isLoading}
                className="text-slate-400 hover:text-white">
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
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
