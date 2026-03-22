import { pushVideoEditsToSheets } from "@/lib/video-edit-api";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let isPushing = false;

export function scheduleVideoEditPush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (isPushing) return;
    isPushing = true;
    try {
      const result = await pushVideoEditsToSheets();
      console.log(`[VIDEO-EDIT-PUSH] Auto-pushed ${result} rows to Sheets`);
    } catch (err) {
      console.error("[VIDEO-EDIT-PUSH] Push failed:", err);
    } finally {
      isPushing = false;
    }
  }, 3000);
}
