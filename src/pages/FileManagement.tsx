import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen, FileText, Users, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AllClientsCrewTable, CrewStats } from "@/components/suite/AllClientsCrewTable";
import { cn } from "@/lib/utils";

export default function FileManagement() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CrewStats | null>(null);
  const [showTable, setShowTable] = useState(false);

  const completionPct = stats && stats.requiredCells > 0
    ? Math.round((stats.assignedCount / stats.requiredCells) * 100)
    : 0;

  const progressColor = completionPct >= 70
    ? "bg-emerald-500"
    : completionPct >= 40
      ? "bg-amber-500"
      : "bg-red-500";

  if (showTable) {
    return (
      <AllClientsCrewTable
        readOnly
        onClose={() => setShowTable(false)}
        onStatsReady={setStats}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <header className="bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 text-white px-4 sm:px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/20 hover:text-white shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <FolderOpen className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">File Management</h1>
              <p className="text-cyan-100 text-xs">Central hub for viewing all event crew files & assignments</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Hero Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Events */}
          <Card className="border-0 shadow-soft bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
                <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Events</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalEvents ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Assigned */}
          <Card className="border-0 shadow-soft bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Assigned Crew</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats ? `${stats.assignedCount}/${stats.requiredCells}` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Remaining */}
          <Card className={cn(
            "border-0 shadow-soft bg-card/80 backdrop-blur-sm",
            stats && stats.remainingCount > 0 && "animate-pulse-red"
          )}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Remaining</p>
                <p className={cn(
                  "text-2xl font-bold",
                  stats && stats.remainingCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                )}>
                  {stats?.remainingCount ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Completion */}
          <Card className="border-0 shadow-soft bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Completion</p>
                  <p className="text-2xl font-bold text-foreground">{stats ? `${completionPct}%` : "—"}</p>
                </div>
              </div>
              {stats && (
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor)}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Files Section */}
        <Card className="border-0 shadow-soft overflow-hidden">
          <button
            onClick={() => setShowTable(true)}
            className="w-full text-left group"
          >
            <div className="p-5 sm:p-6 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    All Files
                  </h2>
                  <p className="text-sm text-muted-foreground">Event Crew Assignments — View all crew files</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                <span className="text-sm hidden sm:inline">Open</span>
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </button>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{stats?.totalEvents ?? 0} event files this month</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{stats?.assignedCount ?? 0} crew assigned</span>
              </div>
              {stats && stats.remainingCount > 0 && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{stats.remainingCount} slots need attention</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
