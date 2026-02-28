import { pushStorageDevicesToSheets, pushFilesToSheets } from "@/lib/files-api";

// ── Storage Devices Push Scheduler ──────────────────────
let storagePushTimer: ReturnType<typeof setTimeout> | null = null;
let isStoragePushing = false;

export function scheduleStoragePush(): void {
  if (storagePushTimer) clearTimeout(storagePushTimer);
  storagePushTimer = setTimeout(async () => {
    if (isStoragePushing) return;
    isStoragePushing = true;
    try {
      const result = await pushStorageDevicesToSheets();
      console.log(`[FILES-PUSH] Auto-pushed ${result.pushed} storage devices to Sheets`);
    } catch (err) {
      console.error("[FILES-PUSH] Storage push failed:", err);
    } finally {
      isStoragePushing = false;
    }
  }, 3000);
}

// ── Files Push Scheduler ────────────────────────────────
let filesPushTimer: ReturnType<typeof setTimeout> | null = null;
let isFilesPushing = false;

export function scheduleFilesPush(): void {
  if (filesPushTimer) clearTimeout(filesPushTimer);
  filesPushTimer = setTimeout(async () => {
    if (isFilesPushing) return;
    isFilesPushing = true;
    try {
      const result = await pushFilesToSheets();
      console.log(`[FILES-PUSH] Auto-pushed ${result.pushed} files to Sheets`);
    } catch (err) {
      console.error("[FILES-PUSH] Files push failed:", err);
    } finally {
      isFilesPushing = false;
    }
  }, 3000);
}
