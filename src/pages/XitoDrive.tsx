import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DesktopAppLayout } from "@/components/desktop/DesktopAppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { XitoDriveBrowser } from "@/components/xito-drive/XitoDriveBrowser";
import { FreelancerAssignment } from "@/lib/xito-drive-utils";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive } from "lucide-react";

export default function XitoDrive() {
  const isMobile = useIsMobile();
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
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
          <HardDrive className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">XITO DRIVE</h1>
          <p className="text-xs text-muted-foreground">Virtual file explorer for booked events</p>
        </div>
      </div>

      <XitoDriveBrowser
        clients={clients}
        assignments={assignments}
        isLoading={clientsLoading || assignmentsLoading}
      />
    </div>
  );

  if (isMobile) {
    return <AppLayout title="XITO DRIVE">{content}</AppLayout>;
  }

  return <DesktopAppLayout>{content}</DesktopAppLayout>;
}
