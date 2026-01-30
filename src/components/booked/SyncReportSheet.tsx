import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, RefreshCw, AlertCircle, XCircle } from "lucide-react";
import { SyncDetail } from "@/lib/sheets-api";

interface SyncReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    restoredToTrackerCount?: number;
    restoredToTracker?: string[];
    copiedCount: number;
    syncedCount: number;
    skippedCount: number;
    notFoundCount: number;
    totalBooked: number;
    syncDetails?: SyncDetail[];
  } | null;
}

export function SyncReportSheet({ open, onOpenChange, report }: SyncReportSheetProps) {
  if (!report) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-500" />
            Full Sync Report
          </SheetTitle>
        <SheetDescription>
          Summary of booked clients data validation. Note: Clients are no longer copied between sheets - they enter BOOKED CLIENTS only via status change.
        </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{report.totalBooked}</p>
                <p className="text-xs text-muted-foreground">Total Booked Clients</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <RefreshCw className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-500">{report.skippedCount}</p>
                <p className="text-xs text-muted-foreground">Validated</p>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>Single Source of Truth:</strong> Clients are no longer copied between sheets during sync. 
              The only way to add a client to BOOKED CLIENTS is by changing their status to "BOOKED".
            </p>
          </div>

          {/* Detailed Sync List */}
          {report.syncDetails && report.syncDetails.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                Synced Clients ({report.syncDetails.length})
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {report.syncDetails.map((detail, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{detail.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            Row {detail.bookedRow} ← Tracker Row {detail.trackerRow}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {detail.changedColumns.length} fields
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {detail.changedColumns.slice(0, 6).map((col, colIndex) => (
                          <Badge
                            key={colIndex}
                            variant="outline"
                            className="text-[10px] py-0 h-5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                          >
                            {col}
                          </Badge>
                        ))}
                        {detail.changedColumns.length > 6 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-5"
                          >
                            +{detail.changedColumns.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* All Data Validated Message */}
          {report.totalBooked > 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-medium">All Data Validated</p>
              <p className="text-sm text-muted-foreground">
                {report.totalBooked} booked clients verified
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
