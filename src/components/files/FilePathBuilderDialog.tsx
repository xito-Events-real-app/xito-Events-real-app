import { useState, useMemo, useEffect, useCallback } from "react";
import { Copy, Check, AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buildFilePath, StorageDevice, FileRecord, getNextBackupNumber, duplicateFileRowForCard } from "@/lib/files-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { scheduleFilesPush } from "@/lib/files-push-scheduler";

const PHOTO_ROLES = ["PB", "PG", "EP"];
const VIDEO_ROLES = ["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"];

const PHOTO_CARD_OPTIONS = ["RAW", "JPEG", "RAW AND JPEG"];
const VIDEO_CARD_OPTIONS = ["NORMAL", "CF", "CF_NORMAL"];

const NEPALI_MONTHS: Record<number, string> = {
  1: "BAISAKH", 2: "JESTHA", 3: "ASHADH", 4: "SHRAWAN",
  5: "BHADRA", 6: "ASHWIN", 7: "KARTIK", 8: "MANGSIR",
  9: "POUSH", 10: "MAGH", 11: "FALGUN", 12: "CHAITRA",
};

const PRIORITY_COPIERS = ["SAUGAT", "JEEWAN", "NIKIT", "BARUN", "ARJUN"];

interface CardFormData {
  storageType: string;
  deviceId: string;
  yearEventFolder: string;
  category: string;
  clientFolder: string;
  eventFolder: string;
  side: string;
  freelancerName: string;
  sizeGb: string;
  numberOfItems: string;
  formatType: string;
}

function getNormalizedYearEventFolder(existingFolder: string | null | undefined, eventMonth: string | null | undefined, eventYear: string | null | undefined): string {
  const existing = (existingFolder || "").trim();
  if (existing && !/^\d+\s+EVENTS\s+\d+$/i.test(existing)) return existing;

  const monthNum = parseInt(eventMonth || "0", 10);
  if (monthNum && eventYear) {
    return `${NEPALI_MONTHS[monthNum] || eventMonth} EVENTS ${eventYear}`;
  }

  return existing;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileRecord: FileRecord | null;
  devices: StorageDevice[];
  onSave: (updates: Partial<FileRecord>) => Promise<void>;
  allFiles?: FileRecord[];
  onRefresh?: () => Promise<void>;
  initialBackupNumber?: number;
}

export function FilePathBuilderDialog({ open, onOpenChange, fileRecord, devices, onSave, allFiles, onRefresh, initialBackupNumber }: Props) {
  const [cardCount, setCardCount] = useState(1);
  const [activeCard, setActiveCard] = useState("1");
  const [cardForms, setCardForms] = useState<Record<string, CardFormData>>({});
  const [whoCopied, setWhoCopied] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingBackup, setRemovingBackup] = useState(false);
  const [freelancerNames, setFreelancerNames] = useState<string[]>([]);
  const [newCopierName, setNewCopierName] = useState("");
  const [pcName, setPcName] = useState("");
  const [localCardIds, setLocalCardIds] = useState<Record<string, string>>({});  // card_label -> row id for newly created cards

  const backupNumber = useMemo(() => {
    if (!fileRecord) return 1;
    if (initialBackupNumber !== undefined) return initialBackupNumber;
    return getNextBackupNumber(fileRecord);
  }, [fileRecord, initialBackupNumber]);

  const backupLabel = backupNumber === 1 ? "1st Backup" : backupNumber === 2 ? "2nd Backup" : backupNumber === 3 ? "3rd Backup" : "All Backups Set";

  // Load freelancer names for "Who Copied" dropdown
  useEffect(() => {
    if (!open) return;
    (supabase as any)
      .from("freelancers_cache")
      .select("name")
      .neq("name", "")
      .order("name")
      .then(({ data }: any) => {
        const names = (data || []).map((d: any) => d.name).filter(Boolean);
        setFreelancerNames(names);
      });
  }, [open]);

  // Build priority + rest list for who copied
  const copierOptions = useMemo(() => {
    const prioritySet = new Set(PRIORITY_COPIERS.map(n => n.toUpperCase()));
    const rest = freelancerNames.filter(n => !prioritySet.has((n || "").toUpperCase()));
    return { priority: PRIORITY_COPIERS, rest };
  }, [freelancerNames]);

  const isPhoto = PHOTO_ROLES.includes(fileRecord?.freelancer_type || "");

  // Reset all fields when dialog opens
  useEffect(() => {
    if (!fileRecord || !open) return;
    setLocalCardIds({});
    const role = fileRecord.freelancer_type || "";
    const isPhotoRole = PHOTO_ROLES.includes(role);
    const defaultYearFolder = getNormalizedYearEventFolder(
      fileRecord.year_event_folder,
      fileRecord.event_month,
      fileRecord.event_year
    );

    // Find how many cards exist for this freelancer in this event
    const existingCards = (allFiles || []).filter(f =>
      f.registered_date_time_ad === fileRecord.registered_date_time_ad &&
      f.event_name === fileRecord.event_name &&
      f.freelancer_type === fileRecord.freelancer_type &&
      f.freelancer_name === fileRecord.freelancer_name
    );
    const maxCard = Math.max(1, ...existingCards.map(f => parseInt(f.card_label || "1") || 1));
    setCardCount(maxCard);
    setActiveCard(fileRecord.card_label || "1");

    // Initialize form for the current card
    const formData: CardFormData = {
      storageType: fileRecord.storage_type || "",
      deviceId: fileRecord.storage_device_id || "",
      yearEventFolder: defaultYearFolder,
      category: fileRecord.category || (isPhotoRole ? "PHOTOS" : "VIDEOS"),
      clientFolder: fileRecord.client_folder_name || fileRecord.client_name?.toUpperCase() || "",
      eventFolder: fileRecord.event_folder_name || fileRecord.event_name?.toUpperCase() || "",
      side: fileRecord.side || "",
      freelancerName: fileRecord.freelancer_name || "",
      sizeGb: fileRecord.size_gb ? String(fileRecord.size_gb) : "",
      numberOfItems: fileRecord.number_of_items ? String(fileRecord.number_of_items) : "",
      formatType: fileRecord.format_type || (isPhotoRole ? "RAW AND JPEG" : "NORMAL"),
    };
    setCardForms({ [fileRecord.card_label || "1"]: formData });

    // Load other card forms if they exist
    for (const card of existingCards) {
      if (card.id !== fileRecord.id) {
        setCardForms(prev => ({
          ...prev,
          [card.card_label || "1"]: {
            storageType: card.storage_type || "",
            deviceId: card.storage_device_id || "",
            yearEventFolder: getNormalizedYearEventFolder(card.year_event_folder, card.event_month, card.event_year),
            category: card.category || (isPhotoRole ? "PHOTOS" : "VIDEOS"),
            clientFolder: card.client_folder_name || card.client_name?.toUpperCase() || "",
            eventFolder: card.event_folder_name || card.event_name?.toUpperCase() || "",
            side: card.side || "",
            freelancerName: card.freelancer_name || "",
            sizeGb: card.size_gb ? String(card.size_gb) : "",
            numberOfItems: card.number_of_items ? String(card.number_of_items) : "",
            formatType: card.format_type || (isPhotoRole ? "RAW AND JPEG" : "NORMAL"),
          },
        }));
      }
    }

    setWhoCopied(fileRecord.who_copied || "");
    setNotes(fileRecord.notes || "");
  }, [fileRecord, open]);

  const currentForm = cardForms[activeCard] || {
    storageType: "", deviceId: "", yearEventFolder: "", category: "", clientFolder: "", eventFolder: "",
    side: "", freelancerName: "", sizeGb: "", numberOfItems: "", formatType: "",
  };

  const updateCurrentForm = useCallback((updates: Partial<CardFormData>) => {
    setCardForms(prev => ({
      ...prev,
      [activeCard]: { ...prev[activeCard], ...updates },
    }));
  }, [activeCard]);

  const filteredDevices = useMemo(() => {
    if (!currentForm.storageType) return devices;
    const typeMap: Record<string, string> = { PC: "PC", HARD_DRIVE: "HARD_DRIVE", SSD: "SSD", DRIVE: "DRIVE" };
    return devices.filter((d) => d.device_type === (typeMap[currentForm.storageType] || currentForm.storageType));
  }, [devices, currentForm.storageType]);

  // PC Name + Drive Letter logic
  const uniquePcNames = useMemo(() => {
    if (currentForm.storageType !== "PC") return [];
    const names = new Set(filteredDevices.map(d => d.device_name).filter(Boolean));
    return [...names];
  }, [filteredDevices, currentForm.storageType]);

  const pcDriveOptions = useMemo(() => {
    if (!pcName) return [];
    return filteredDevices.filter(d => d.device_name === pcName);
  }, [filteredDevices, pcName]);

  // Derive pcName from selected device when dialog opens
  useEffect(() => {
    if (!open || currentForm.storageType !== "PC") { setPcName(""); return; }
    if (currentForm.deviceId) {
      const dev = devices.find(d => d.id === currentForm.deviceId);
      if (dev) setPcName(dev.device_name);
    }
  }, [open, fileRecord]);

  const selectedDevice = useMemo(() => devices.find((d) => d.id === currentForm.deviceId), [devices, currentForm.deviceId]);

  const generatedPath = useMemo(() => {
    if (!currentForm.storageType || !selectedDevice) return "";
    return buildFilePath({
      storageType: currentForm.storageType,
      deviceName: selectedDevice.device_name,
      pcDriveLetter: selectedDevice.pc_drive_letter || undefined,
      yearEventFolder: currentForm.yearEventFolder,
      category: currentForm.category,
      clientFolderName: currentForm.clientFolder,
      eventFolderName: currentForm.eventFolder,
      side: currentForm.side,
      freelancerName: currentForm.freelancerName,
      cardLabel: `Card ${activeCard}`,
    });
  }, [currentForm, selectedDevice]);

  const handleCopy = () => {
    if (generatedPath) {
      navigator.clipboard.writeText(generatedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddCard = async () => {
    if (!fileRecord || cardCount >= 4) return;
    const newCardNum = cardCount + 1;
    setCardCount(newCardNum);
    const newKey = String(newCardNum);

    // Initialize empty form for new card
    setCardForms(prev => ({
      ...prev,
      [newKey]: {
        storageType: "",
        deviceId: "",
        yearEventFolder: currentForm.yearEventFolder,
        category: currentForm.category,
        clientFolder: currentForm.clientFolder,
        eventFolder: currentForm.eventFolder,
        side: currentForm.side,
        freelancerName: currentForm.freelancerName,
        sizeGb: "",
        numberOfItems: "",
        formatType: currentForm.formatType,
      },
    }));

    // Create the duplicate row in DB and track its ID locally
    try {
      const newRow = await duplicateFileRowForCard(fileRecord.id, newCardNum);
      setLocalCardIds(prev => ({ ...prev, [newKey]: newRow.id }));
    } catch (err: any) {
      toast.error("Failed to create card row");
    }

    setActiveCard(newKey);
  };

  const handleRemoveCard = async (cardNumber: string) => {
    if (cardNumber === "1") return; // Card 1 is the base record — never delete it
    if (!fileRecord || !allFiles) return;
    const cardFile = allFiles.find(f =>
      f.registered_date_time_ad === fileRecord.registered_date_time_ad &&
      f.event_name === fileRecord.event_name &&
      f.freelancer_type === fileRecord.freelancer_type &&
      f.freelancer_name === fileRecord.freelancer_name &&
      f.card_label === cardNumber
    );
    if (!cardFile) {
      toast.error(`Card ${cardNumber} not found in database`);
      return;
    }
    try {
      await (supabase as any).from("files_management").update({ deleted_or_not: true, synced_to_sheet: false }).eq("id", cardFile.id);
      setCardForms(prev => {
        const next = { ...prev };
        delete next[cardNumber];
        return next;
      });
      const remainingKeys = Object.keys(cardForms).filter(k => k !== cardNumber);
      const newMax = remainingKeys.length > 0 ? Math.max(...remainingKeys.map(Number)) : 1;
      setCardCount(newMax);
      if (activeCard === cardNumber) {
        setActiveCard(remainingKeys[0] || "1");
      }
      // Don't call onRefresh here — it resets form state
      toast.success(`Card ${cardNumber} removed`);
    } catch (err: any) {
      toast.error("Failed to remove card");
    }
  };

  const existingCardKeys = useMemo(() => {
    return Object.keys(cardForms).sort((a, b) => Number(a) - Number(b));
  }, [cardForms]);
  const handleAddNewCopier = async () => {
    if (!newCopierName.trim()) return;
    const name = newCopierName.trim().toUpperCase();
    // Add to freelancers_cache
    await (supabase as any).from("freelancers_cache").insert({ name, synced_to_sheet: false });
    setFreelancerNames(prev => [...prev, name]);
    setWhoCopied(name);
    setNewCopierName("");
    toast.success(`${name} added to freelancers`);
  };

  const handleRemoveBackup = async () => {
    if (!fileRecord || initialBackupNumber === undefined || initialBackupNumber < 1 || initialBackupNumber > 3) return;
    setRemovingBackup(true);
    try {
      const bn = initialBackupNumber;
      const now = new Date();
      const dateStr = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

      // Build history entry like Breaking News format
      let oldPath = "";
      let oldDevice = "";
      if (bn === 1) { oldPath = fileRecord.final_generated_path || ""; oldDevice = fileRecord.backup_1_device_name || ""; }
      else if (bn === 2) { oldPath = fileRecord.backup_2_path || ""; oldDevice = fileRecord.backup_2_device_name || ""; }
      else if (bn === 3) { oldPath = fileRecord.backup_3_path || ""; oldDevice = fileRecord.backup_3_device_name || ""; }

      const historyEntry = `BACKUP ${bn} REMOVED [${dateStr}] | Device: ${oldDevice} | Path: ${oldPath}`;
      const existingHistory = fileRecord.backup_history || "";
      const newHistory = existingHistory ? `${historyEntry}\n${existingHistory}` : historyEntry;

      // Clear the backup fields
      const clearUpdates: any = { backup_history: newHistory, synced_to_sheet: false };
      if (bn === 1) {
        clearUpdates.final_generated_path = "";
        clearUpdates.backup_1_device_name = "";
        clearUpdates.backup_1_recorded_at = null;
        clearUpdates.storage_type = "";
        clearUpdates.storage_device_id = null;
      } else if (bn === 2) {
        clearUpdates.backup_2_path = "";
        clearUpdates.backup_2_device_name = "";
        clearUpdates.backup_2_recorded_at = null;
        clearUpdates.double_backup = false;
      } else if (bn === 3) {
        clearUpdates.backup_3_path = "";
        clearUpdates.backup_3_device_name = "";
        clearUpdates.backup_3_recorded_at = null;
        clearUpdates.triple_backup = false;
      }

      await (supabase as any).from("files_management").update(clearUpdates).eq("id", fileRecord.id);

      onOpenChange(false);
      if (onRefresh) await onRefresh();
      scheduleFilesPush();
      toast.success(`Backup ${bn} removed. History saved.`);
    } catch (err: any) {
      toast.error("Failed to remove backup: " + (err.message || ""));
    } finally {
      setRemovingBackup(false);
    }
  };

  const handleSave = async () => {
    if (!fileRecord || backupNumber === 0) return;

    // Validate all cards have required fields
    const keys = Object.keys(cardForms);
    if (keys.length > 1) {
      for (const key of keys) {
        const cf = cardForms[key];
        if (!cf || !cf.storageType || !cf.deviceId) {
          toast.error(`Please fill details for all cards before saving (Card ${key} is incomplete)`);
          setActiveCard(key);
          return;
        }
      }
    }

    // Validate same-device for 2nd/3rd backups
    if (backupNumber >= 2 && fileRecord) {
      const form = cardForms[fileRecord.card_label || "1"] || currentForm;
      const selectedDeviceName = devices.find(d => d.id === form.deviceId)?.device_name;
      if (backupNumber === 2 && selectedDeviceName && selectedDeviceName === fileRecord.backup_1_device_name) {
        toast.error("2nd backup cannot be on the same device as 1st backup!");
        return;
      }
      if (backupNumber === 3 && selectedDeviceName &&
          (selectedDeviceName === fileRecord.backup_1_device_name || selectedDeviceName === fileRecord.backup_2_device_name)) {
        toast.error("3rd backup cannot be on the same device as 1st or 2nd backup!");
        return;
      }
    }

    setSaving(true);
    try {
      const currentCardKey = fileRecord.card_label || "1";
      const form = cardForms[currentCardKey] || currentForm;
      const dev = devices.find(d => d.id === form.deviceId);
      const path = !form.storageType || !dev ? "" : buildFilePath({
        storageType: form.storageType,
        deviceName: dev.device_name,
        pcDriveLetter: dev.pc_drive_letter || undefined,
        yearEventFolder: form.yearEventFolder,
        category: form.category,
        clientFolderName: form.clientFolder,
        eventFolderName: form.eventFolder,
        side: form.side,
        freelancerName: form.freelancerName,
        cardLabel: `Card ${currentCardKey}`,
      });

      const updates: Partial<FileRecord> = {
        storage_type: form.storageType,
        storage_device_id: form.deviceId || null,
        year_event_folder: form.yearEventFolder,
        category: form.category,
        client_folder_name: form.clientFolder,
        event_folder_name: form.eventFolder,
        side: form.side,
        card_label: currentCardKey,
        format_type: form.formatType,
        size_gb: form.sizeGb ? Number(form.sizeGb) : 0,
        number_of_items: form.numberOfItems ? Number(form.numberOfItems) : 0,
        who_copied: whoCopied,
        notes,
      };

      // Save path to the correct backup slot with per-backup timestamp
      const now = new Date().toISOString();
      if (backupNumber === 1) {
        updates.final_generated_path = path;
        updates.backup_1_device_name = dev?.device_name || "";
        updates.backup_1_recorded_at = now;
      } else if (backupNumber === 2) {
        updates.backup_2_path = path;
        updates.backup_2_device_name = dev?.device_name || "";
        updates.double_backup = true;
        updates.backup_2_recorded_at = now;
      } else if (backupNumber === 3) {
        updates.backup_3_path = path;
        updates.backup_3_device_name = dev?.device_name || "";
        updates.triple_backup = true;
        updates.backup_3_recorded_at = now;
      }

      await onSave(updates);

      // Save other card forms if they exist
      if (Object.keys(cardForms).length > 1 && allFiles) {
        for (const key of Object.keys(cardForms)) {
          if (key === (fileRecord.card_label || "1")) continue;
          const cardForm = cardForms[key];
          if (!cardForm) continue;

          // Try allFiles first, then fall back to locally tracked card IDs
          let cardFile = allFiles?.find(f =>
            f.registered_date_time_ad === fileRecord.registered_date_time_ad &&
            f.event_name === fileRecord.event_name &&
            f.freelancer_type === fileRecord.freelancer_type &&
            f.freelancer_name === fileRecord.freelancer_name &&
            f.card_label === key
          );
          const cardFileId = cardFile?.id || localCardIds[key];
          if (!cardFileId) continue;

          const cardDev = devices.find(d => d.id === cardForm.deviceId);
          const cardPath = !cardForm.storageType || !cardDev ? "" : buildFilePath({
            storageType: cardForm.storageType,
            deviceName: cardDev.device_name,
            pcDriveLetter: cardDev.pc_drive_letter || undefined,
            yearEventFolder: cardForm.yearEventFolder,
            category: cardForm.category,
            clientFolderName: cardForm.clientFolder,
            eventFolderName: cardForm.eventFolder,
            side: cardForm.side,
            freelancerName: cardForm.freelancerName,
            cardLabel: `Card ${key}`,
          });

          const cardUpdates: Partial<FileRecord> = {
            storage_type: cardForm.storageType,
            storage_device_id: cardForm.deviceId || null,
            year_event_folder: cardForm.yearEventFolder,
            category: cardForm.category,
            client_folder_name: cardForm.clientFolder,
            event_folder_name: cardForm.eventFolder,
            side: cardForm.side,
            card_label: key,
            format_type: cardForm.formatType,
            size_gb: cardForm.sizeGb ? Number(cardForm.sizeGb) : 0,
            number_of_items: cardForm.numberOfItems ? Number(cardForm.numberOfItems) : 0,
            who_copied: whoCopied,
            notes,
          };

          const cardBackup = cardFile ? getNextBackupNumber(cardFile) : 1;
          const cardNow = new Date().toISOString();
          if (cardBackup === 1) {
            cardUpdates.final_generated_path = cardPath;
            cardUpdates.backup_1_device_name = cardDev?.device_name || "";
            cardUpdates.backup_1_recorded_at = cardNow;
          } else if (cardBackup === 2) {
            cardUpdates.backup_2_path = cardPath;
            cardUpdates.backup_2_device_name = cardDev?.device_name || "";
            cardUpdates.double_backup = true;
            cardUpdates.backup_2_recorded_at = cardNow;
          } else if (cardBackup === 3) {
            cardUpdates.backup_3_path = cardPath;
            cardUpdates.backup_3_device_name = cardDev?.device_name || "";
            cardUpdates.triple_backup = true;
            cardUpdates.backup_3_recorded_at = cardNow;
          }

          await (supabase as any)
            .from("files_management")
            .update({ ...cardUpdates, synced_to_sheet: false })
            .eq("id", cardFileId);
        }
      }

      onOpenChange(false);
      if (onRefresh) await onRefresh();
      scheduleFilesPush();
      toast.success("File path saved");
    } finally {
      setSaving(false);
    }
  };

  const headerCardNum = fileRecord?.card_label || "1";
  const headerText = `CARD ${headerCardNum} — ${fileRecord?.client_name || ""} — ${fileRecord?.event_name || ""} — ${fileRecord?.freelancer_name || ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-600 dark:text-blue-400">File Path Builder</DialogTitle>
          <DialogDescription>Build and preview the storage path for this file entry</DialogDescription>
        </DialogHeader>

        {/* Top-Level Card Switcher */}
        {existingCardKeys.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 border border-orange-300 dark:border-orange-700">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-400 mr-1">🃏 Active Card:</span>
            {existingCardKeys.map(key => (
              <div key={key} className="flex items-center gap-0.5">
                <Button
                  variant={activeCard === key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs px-3 font-bold",
                    activeCard === key
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/40"
                  )}
                  onClick={() => setActiveCard(key)}
                >
                  Card {key}
                </Button>
                {key !== "1" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/40"
                    onClick={() => handleRemoveCard(key)}
                    title={`Remove Card ${key}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            {cardCount < 4 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/40" onClick={handleAddCard}>
                <Plus className="w-3 h-3 mr-1" /> Add Card
              </Button>
            )}
          </div>
        )}

        {/* Backup Number Indicator + Remove Backup */}
        <div className={cn(
          "p-2 rounded-lg font-bold text-sm flex items-center justify-between",
          backupNumber === 1 && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
          backupNumber === 2 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          backupNumber === 3 && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
          backupNumber === 0 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        )}>
          <span className="flex-1 text-center">
            {backupNumber > 0 ? `Setting ${backupLabel}` : "All 3 Backups Complete ✓"}
          </span>
          {initialBackupNumber !== undefined && initialBackupNumber >= 1 && initialBackupNumber <= 3 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs ml-2"
              onClick={handleRemoveBackup}
              disabled={removingBackup}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {removingBackup ? "Removing..." : `Remove ${backupLabel}`}
            </Button>
          )}
        </div>

        {/* Details Header */}
        <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
          <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 tracking-wide">{headerText}</p>
        </div>

        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ===== COLUMN 1: Storage & Path (Blue) ===== */}
          <div className="space-y-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              📂 Storage & Path
            </p>

            <div className={cn("grid gap-2", currentForm.storageType === "PC" ? "grid-cols-3" : "grid-cols-2")}>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Storage Type</Label>
                <Select value={currentForm.storageType} onValueChange={(v) => { updateCurrentForm({ storageType: v, deviceId: "" }); setPcName(""); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="HARD_DRIVE">Hard Drive</SelectItem>
                    <SelectItem value="SSD">SSD</SelectItem>
                    <SelectItem value="DRIVE">Drive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {currentForm.storageType === "PC" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">PC Name</Label>
                    <Select value={pcName} onValueChange={(v) => { setPcName(v); updateCurrentForm({ deviceId: "" }); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select PC..." /></SelectTrigger>
                      <SelectContent>
                        {uniquePcNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Drive Letter</Label>
                    <Select value={currentForm.deviceId} onValueChange={(v) => updateCurrentForm({ deviceId: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select drive..." /></SelectTrigger>
                      <SelectContent>
                        {pcDriveOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.pc_drive_letter}:\\ ({d.remaining_storage_gb}GB)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Device</Label>
                  <Select value={currentForm.deviceId} onValueChange={(v) => updateCurrentForm({ deviceId: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {filteredDevices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.device_name} ({d.remaining_storage_gb}GB)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {selectedDevice?.safety_status === "UNSAFE" && (
              <div className="flex items-center gap-2 p-1.5 rounded bg-red-100 dark:bg-red-950/30 text-red-600 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>UNSAFE device!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Year Event Folder</Label>
                <Input value={currentForm.yearEventFolder} onChange={(e) => updateCurrentForm({ yearEventFolder: e.target.value })} className="h-8 text-xs" placeholder="e.g. FALGUN EVENTS 2082" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Category</Label>
                <Select value={currentForm.category} onValueChange={(v) => updateCurrentForm({ category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHOTOS">PHOTOS</SelectItem>
                    <SelectItem value="VIDEOS">VIDEOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Client Folder</Label>
                <Input value={currentForm.clientFolder} onChange={(e) => updateCurrentForm({ clientFolder: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Event Folder</Label>
                <Input value={currentForm.eventFolder} onChange={(e) => updateCurrentForm({ eventFolder: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Side</Label>
                <Select value={currentForm.side} onValueChange={(v) => updateCurrentForm({ side: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Side" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRIDE SIDE">BRIDE</SelectItem>
                    <SelectItem value="GROOM SIDE">GROOM</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Freelancer</Label>
                <Input value={currentForm.freelancerName} readOnly className="bg-white/60 dark:bg-white/5 font-bold h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Format</Label>
                <Select value={currentForm.formatType} onValueChange={(v) => updateCurrentForm({ formatType: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Format" /></SelectTrigger>
                  <SelectContent>
                    {(isPhoto ? PHOTO_CARD_OPTIONS : VIDEO_CARD_OPTIONS).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Path Preview */}
            {generatedPath && (
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-300 dark:border-indigo-700">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Generated Path</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-5 text-[10px] text-indigo-600 px-1.5">
                    {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                  </Button>
                </div>
                <p className="text-[11px] font-mono break-all text-foreground font-bold leading-tight">{generatedPath}</p>
              </div>
            )}
          </div>

          {/* ===== COLUMN 2: Cards & File Info (Emerald) ===== */}
          <div className="space-y-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              💾 Cards & File Info
            </p>

            {/* Card Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold">Cards:</Label>
                <Badge variant="outline" className="text-xs bg-white/60 dark:bg-white/5">{existingCardKeys.length} card{existingCardKeys.length > 1 ? "s" : ""}</Badge>
                {cardCount < 4 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-emerald-700 dark:text-emerald-400" onClick={handleAddCard}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                )}
              </div>
              {existingCardKeys.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {existingCardKeys.map(key => (
                    <div key={key} className="flex items-center gap-0.5">
                      <Button
                        variant={activeCard === key ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-6 text-xs px-2",
                          activeCard === key && "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                        onClick={() => setActiveCard(key)}
                      >
                        Card {key}
                      </Button>
                      {key !== "1" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/40"
                          onClick={() => handleRemoveCard(key)}
                          title={`Remove Card ${key}`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-emerald-200 dark:bg-emerald-800" />

            {/* File Size & Items */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">File Size (GB)</Label>
                <Input type="number" value={currentForm.sizeGb} onChange={(e) => updateCurrentForm({ sizeGb: e.target.value })} placeholder="0" step="0.1" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">No. of Items</Label>
                <Input type="number" value={currentForm.numberOfItems} onChange={(e) => updateCurrentForm({ numberOfItems: e.target.value })} placeholder="0" className="h-8 text-xs" />
              </div>
            </div>

            <Separator className="bg-emerald-200 dark:bg-emerald-800" />

          </div>

          {/* ===== COLUMN 3: Meta & Notes (Amber/Rose) ===== */}
          <div className="space-y-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            {backupNumber === 1 && (
              <>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  👤 Who Copied First?
                </p>

                <Select value={whoCopied} onValueChange={setWhoCopied}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select who copied..." /></SelectTrigger>
                  <SelectContent>
                    {copierOptions.priority.map(name => (
                      <SelectItem key={name} value={name}>
                        <span className="font-bold">{name}</span> ⭐
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    {copierOptions.rest.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    value={newCopierName}
                    onChange={(e) => setNewCopierName(e.target.value)}
                    placeholder="Add new name..."
                    className="h-7 text-xs"
                  />
                  <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={handleAddNewCopier} disabled={!newCopierName.trim()}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>

                <Separator className="bg-amber-200 dark:bg-amber-800" />
              </>
            )}

            {/* Notes (Rose sub-section) */}
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-2">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">📝 Notes</p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write notes about this file..." className="min-h-[80px] text-xs bg-white/60 dark:bg-white/5" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || backupNumber === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            {saving ? "Saving..." : `Save ${backupLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
