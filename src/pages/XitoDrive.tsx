import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { XitoDriveBrowser } from "@/components/xito-drive/XitoDriveBrowser";
import { XitoActivitySidebar } from "@/components/xito-drive/XitoActivitySidebar";
import { FreelancerAssignment } from "@/lib/xito-drive-utils";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, LayoutGrid, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function XitoDrive() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { clients, isLoading: clientsLoading } = useBookedCachedData();
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [showNewsMobile, setShowNewsMobile] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("freelancer_assignments")
        .select("registered_date_time_ad, client_name, event, photographer_bride, photographer_groom, videographer_bride, videographer_groom, extra_photographer, extra_videographer, assistant, drone_operator, fpv_operator, iphone_shooter");
      setAssignments((data as FreelancerAssignment[]) || []);
      setAssignmentsLoading(false);
    })();
  }, []);

  const topBar = (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
        <LayoutGrid className="h-5 w-5" />
      </Button>
      <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
        <HardDrive className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold leading-tight">XITO DRIVE</h1>
        <p className="text-[11px] text-muted-foreground">Virtual file explorer for booked events</p>
      </div>
      {isMobile && (
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setShowNewsMobile(true)}>
          <Newspaper className="h-5 w-5 text-destructive" />
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          {topBar}
          <div className="p-4">
            <XitoDriveBrowser clients={clients} assignments={assignments} isLoading={clientsLoading || assignmentsLoading} />
          </div>
          <Sheet open={showNewsMobile} onOpenChange={setShowNewsMobile}>
            <SheetContent side="right" className="w-[85vw] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Breaking News</SheetTitle>
              </SheetHeader>
              <XitoActivitySidebar />
            </SheetContent>
          </Sheet>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {topBar}
      <div className="flex-1 flex overflow-hidden">
        {/* Main browser area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <XitoDriveBrowser clients={clients} assignments={assignments} isLoading={clientsLoading || assignmentsLoading} />
        </div>
        {/* Activity sidebar — desktop only */}
        <div className="w-[300px] shrink-0 border-l border-border overflow-hidden">
          <XitoActivitySidebar />
        </div>
      </div>
    </div>
  );
}
