import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, RefreshCw, Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VendorData, getVendors, getVendorTypes } from "@/lib/vendor-api";
import { VendorCard } from "./VendorCard";
import { AddVendorDrawer } from "./AddVendorDrawer";
import { VendorDetailSheet } from "./VendorDetailSheet";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function MobileVendors() {
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
        vendor.area?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [vendors, selectedType, searchQuery]);

  const handleVendorClick = (vendor: VendorData) => {
    setSelectedVendor(vendor);
    setShowDetailSheet(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-400" />
                <h1 className="text-xl font-bold text-white">Vendors</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white pl-10"
            />
          </div>

          {/* Type Filter Chips */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Badge
                variant={selectedType === null ? "default" : "secondary"}
                className={`cursor-pointer whitespace-nowrap ${
                  selectedType === null 
                    ? 'bg-slate-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                onClick={() => setSelectedType(null)}
              >
                All ({vendors.length})
              </Badge>
              {vendorTypes.map((type) => (
                <Badge
                  key={type}
                  variant={selectedType === type ? "default" : "secondary"}
                  className={`cursor-pointer whitespace-nowrap ${
                    selectedType === type 
                      ? 'bg-slate-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  onClick={() => setSelectedType(type)}
                >
                  {type} ({typeCounts[type] || 0})
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Vendor Cards */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading vendors...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {searchQuery || selectedType ? 'No vendors match your filters' : 'No vendors found'}
          </div>
        ) : (
          filteredVendors.map((vendor) => (
            <VendorCard
              key={vendor.rowNumber}
              vendor={vendor}
              onClick={() => handleVendorClick(vendor)}
            />
          ))
        )}
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
