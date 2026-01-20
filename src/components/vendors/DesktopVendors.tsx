import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VendorData, getVendors, getVendorTypes } from "@/lib/vendor-api";
import { VendorTypeSidebar } from "./VendorTypeSidebar";
import { VendorTable } from "./VendorTable";
import { AddVendorDrawer } from "./AddVendorDrawer";
import { VendorDetailSheet } from "./VendorDetailSheet";
import { useToast } from "@/hooks/use-toast";

export function DesktopVendors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [vendorTypes, setVendorTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vendorsData, typesData] = await Promise.all([
        getVendors(),
        getVendorTypes()
      ]);
      setVendors(vendorsData);
      setVendorTypes(typesData);
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    vendors.forEach(vendor => {
      const type = vendor.vendorType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [vendors]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesType = !selectedType || vendor.vendorType === selectedType;
      const matchesSearch = !searchQuery || 
        vendor.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.owner1Name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [vendors, selectedType, searchQuery]);

  const handleVendorClick = (vendor: VendorData) => {
    setSelectedVendor(vendor);
    setShowDetailSheet(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <VendorTypeSidebar
        vendorTypes={vendorTypes}
        typeCounts={typeCounts}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        totalCount={vendors.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white"
              >
                ← Back to Suite
              </Button>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-400" />
                <h1 className="text-xl font-bold text-white">
                  {selectedType ? selectedType : 'All Vendors'}
                </h1>
                <span className="text-slate-400 text-sm">
                  ({filteredVendors.length} vendors)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white pl-10"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                disabled={isLoading}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={() => setShowAddDrawer(true)}
                className="bg-slate-600 hover:bg-slate-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading vendors...</div>
          ) : (
            <VendorTable
              vendors={filteredVendors}
              onRowClick={handleVendorClick}
            />
          )}
        </div>
      </div>

      {/* Add Vendor Drawer */}
      <AddVendorDrawer
        open={showAddDrawer}
        onOpenChange={setShowAddDrawer}
        vendorTypes={vendorTypes}
        onVendorAdded={loadData}
      />

      {/* Vendor Detail Sheet */}
      <VendorDetailSheet
        vendor={selectedVendor}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        vendorTypes={vendorTypes}
        onVendorUpdated={loadData}
      />
    </div>
  );
}
