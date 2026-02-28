import { useState } from "react";
import { HardDrive, Cpu, Database, Plus, AlertTriangle, Shield, ShieldAlert, Zap, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { AddStorageDeviceDrawer } from "./AddStorageDeviceDrawer";
import { StorageDevice } from "@/lib/files-api";
import { cn } from "@/lib/utils";

const deviceIcon = (type: string) => {
  if (type === "PC") return <Cpu className="w-5 h-5" />;
  if (type === "SSD") return <Zap className="w-5 h-5" />;
  return <HardDrive className="w-5 h-5" />;
};

const healthColor = (pct: number) => {
  if (pct > 70) return "text-emerald-500";
  if (pct > 40) return "text-amber-500";
  return "text-red-500";
};

const safetyBadge = (status: string) => {
  if (status === "SAFE") return <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-xs">SAFE</Badge>;
  if (status === "SLOW") return <Badge className="bg-amber-500/20 text-amber-600 border-0 text-xs">SLOW</Badge>;
  return <Badge className="bg-red-500/20 text-red-600 border-0 text-xs"><ShieldAlert className="w-3 h-3 mr-1" />UNSAFE</Badge>;
};

export function StorageDevicesSection() {
  const { devices, isLoading, add, update, remove } = useStorageDevices();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<StorageDevice | null>(null);

  const handleEdit = (device: StorageDevice) => {
    setEditDevice(device);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditDevice(null);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-foreground">Storage Devices</h2>
          <Badge variant="secondary" className="text-xs">{devices.length}</Badge>
        </div>
        <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Device
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center text-muted-foreground">
            <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No storage devices added yet</p>
            <p className="text-sm mt-1">Add your first hard drive, SSD, or PC</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const usedPct = device.total_storage_gb > 0
              ? Math.round((device.used_storage_gb / device.total_storage_gb) * 100)
              : 0;
            const remainingPct = device.total_storage_gb > 0
              ? (device.remaining_storage_gb / device.total_storage_gb)
              : 1;
            const isLowStorage = remainingPct < 0.1;
            const isUnsafe = device.safety_status === "UNSAFE";

            return (
              <Card key={device.id} className={cn(
                "border shadow-sm transition-all hover:shadow-md",
                (isLowStorage || isUnsafe) && "border-red-300 dark:border-red-800"
              )}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                        {deviceIcon(device.device_type)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{device.device_name}</p>
                        <p className="text-xs text-muted-foreground">{device.device_type.replace("_", " ")}
                          {device.pc_drive_letter ? ` (${device.pc_drive_letter}:)` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(device)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => remove(device.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Storage bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{device.used_storage_gb} GB used</span>
                      <span>{device.remaining_storage_gb} GB free</span>
                    </div>
                    <Progress
                      value={usedPct}
                      className={cn("h-2", isLowStorage ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500")}
                    />
                    <p className="text-xs text-right text-muted-foreground">
                      {device.total_storage_gb} GB total
                    </p>
                  </div>

                  {/* Footer badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium", healthColor(device.health_percent))}>
                        <Shield className="w-3 h-3 inline mr-0.5" />
                        {device.health_percent}% Health
                      </span>
                      {safetyBadge(device.safety_status)}
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={cn(
                          "w-1.5 h-3 rounded-sm",
                          i < device.speed_rating ? "bg-blue-500" : "bg-muted"
                        )} />
                      ))}
                    </div>
                  </div>

                  {/* Warnings */}
                  {(isLowStorage || isUnsafe) && (
                    <div className="flex items-center gap-1.5 p-2 rounded-md bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {isLowStorage && <span>Low storage (&lt;10% remaining)</span>}
                      {isLowStorage && isUnsafe && <span>•</span>}
                      {isUnsafe && <span>Device marked UNSAFE</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddStorageDeviceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editDevice={editDevice}
        onSave={async (data) => {
          if (editDevice) {
            await update(editDevice.id, data);
          } else {
            await add(data);
          }
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
