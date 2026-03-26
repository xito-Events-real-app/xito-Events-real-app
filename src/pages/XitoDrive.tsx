import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { XitoDriveBrowser } from "@/components/xito-drive/XitoDriveBrowser";
import { FreelancerAssignment } from "@/lib/xito-drive-utils";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function XitoDrive() {
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

  const content = (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="shrink-0"
        >
          <LayoutGrid className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
          <HardDrive className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">XITO DRIVE</h1>
          <p className="text-[11px] text-muted-foreground">Virtual file explorer for booked events</p>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <XitoDriveBrowser
          clients={clients}
          assignments={assignments}
          isLoading={clientsLoading || assignmentsLoading}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return <AppLayout>{content}</AppLayout>;
  }

  return content;
}
