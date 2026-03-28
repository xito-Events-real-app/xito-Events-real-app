import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { PCloudDriveBrowser } from "@/components/pcloud-drive/PCloudDriveBrowser";
import { PCloudActivitySidebar } from "@/components/pcloud-drive/PCloudActivitySidebar";
import { FreelancerAssignment } from "@/lib/xito-drive-utils";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, LayoutGrid, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function PCloudDrive() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { clients, isLoading: clientsLoading } = useBookedCachedData();
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("freelancer_assignments")
        .select("registered_date_time_ad, client_name, event, photographer_bride, photographer_groom, videographer_bride, videographer_groom, extra_photographer, extra_videographer, assistant, drone_operator, fpv_operator, iphone_shooter");
      setAssignments((data as FreelancerAssignment[]) || []);
      setAssignmentsLoading(false);
    })();
  }, []);

  const header = (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
        <LayoutGrid className="h-5 w-5" />
      </Button>
      <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
        <Cloud className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold leading-tight">pCloud</h1>
        <p className="text-[11px] text-muted-foreground">High-quality photos & videos</p>
      </div>
      {/* Mobile: sidebar toggle */}
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
              <Activity className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <PCloudActivitySidebar />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );

  const content = (
    <div className="min-h-screen bg-background flex flex-col">
      {header}
      <div className="flex flex-1 min-h-0">
        {/* Main browser */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <PCloudDriveBrowser
            clients={clients}
            assignments={assignments}
            isLoading={clientsLoading || assignmentsLoading}
          />
        </div>
        {/* Desktop: right sidebar */}
        {!isMobile && (
          <div className="w-[280px] shrink-0 border-l border-border">
            <PCloudActivitySidebar />
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) return <AppLayout>{content}</AppLayout>;
  return content;
}
