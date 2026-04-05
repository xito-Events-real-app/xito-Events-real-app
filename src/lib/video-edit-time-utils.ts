/**
 * Granular time computation from video_edit_tracker stage_history.
 *
 * stage_history format (newline-separated):
 *   STATUS [ISO_DATE]
 *   PAUSED [ISO_DATE]
 *   RESUMED [ISO_DATE]
 *   EDITOR_CHANGED_FROM_X_TO_Y [ISO_DATE]
 */

interface StageEntry {
  status: string;
  date: Date;
}

function parseStageHistory(history: string | null | undefined): StageEntry[] {
  if (!history) return [];
  return history
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Match: STATUS [ISO_DATE] or STATUS [MM/DD/YYYY, HH:MM:SS]
      const isoMatch = line.match(/^(.+?)\s+\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]$/);
      if (isoMatch) {
        const d = new Date(isoMatch[2]);
        if (!isNaN(d.getTime())) return { status: isoMatch[1].trim(), date: d };
      }
      const usMatch = line.match(/^(.+?)\s+\[(\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}:\d{2}[^\]]*)\]$/);
      if (usMatch) {
        const d = new Date(usMatch[2]);
        if (!isNaN(d.getTime())) return { status: usMatch[1].trim(), date: d };
      }
      return null;
    })
    .filter(Boolean) as StageEntry[];
}

function findFirst(entries: StageEntry[], status: string): Date | null {
  const e = entries.find((e) => e.status === status);
  return e?.date ?? null;
}

function findLast(entries: StageEntry[], status: string): Date | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].status === status) return entries[i].date;
  }
  return null;
}

function findFirstOfAny(entries: StageEntry[], statuses: string[]): Date | null {
  const set = new Set(statuses);
  const e = entries.find((e) => set.has(e.status));
  return e?.date ?? null;
}

export function formatDuration(ms: number): string {
  if (ms < 0) return "—";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHrs = hours % 24;
    return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
  }
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function computePausedMs(entries: StageEntry[], start: Date, end: Date): number {
  let total = 0;
  let pauseStart: Date | null = null;
  for (const e of entries) {
    if (e.date < start || e.date > end) continue;
    if (e.status === "PAUSED") {
      pauseStart = e.date;
    } else if (e.status === "RESUMED" && pauseStart) {
      total += e.date.getTime() - pauseStart.getTime();
      pauseStart = null;
    }
  }
  // If still paused at `end`, count remaining
  if (pauseStart) {
    total += end.getTime() - pauseStart.getTime();
  }
  return total;
}

// Stages that come after EDIT_ON_PROGRESS
const POST_EDIT_STATUSES = new Set([
  "COLOR_QUEUE", "COLOR_ON_PROGRESS", "EXPORT_QUEUE", "EXPORTED",
  "CLIENT_REVIEW", "RE_EDIT_QUEUE", "RE_EDIT_ON_PROGRESS",
  "FINALIZED", "UPLOADED", "PAUSED", "RESUMED",
]);

export interface VideoEditTimings {
  editTime: string | null;         // EDIT_ON_PROGRESS → COLOR_QUEUE (or EXPORT_QUEUE if no color)
  colorTime: string | null;        // COLOR_ON_PROGRESS → EXPORT_QUEUE
  totalTime: string | null;        // EDIT_ON_PROGRESS → EXPORT_QUEUE (time till export)
  actualTime: string | null;       // totalTime minus paused intervals
  pausedTime: string | null;       // total paused duration
  finalizedTime: string | null;    // EDIT_ON_PROGRESS → FINALIZED
  clientReviewTime: string | null; // CLIENT_REVIEW → next stage
  exportedTime: string | null;     // EXPORT_QUEUE → EXPORTED (or FINALIZED if no EXPORTED entry)
}

export function computeVideoEditTimings(stageHistory: string | null | undefined, currentStatus?: string | null): VideoEditTimings {
  const entries = parseStageHistory(stageHistory);

  const editStart = findFirst(entries, "EDIT_ON_PROGRESS");
  const colorQueue = findFirst(entries, "COLOR_QUEUE");
  const colorStart = findFirst(entries, "COLOR_ON_PROGRESS");
  const exportQueue = findFirst(entries, "EXPORT_QUEUE");
  const exported = findFirst(entries, "EXPORTED");
  const finalized = findLast(entries, "FINALIZED");
  const clientReview = findLast(entries, "CLIENT_REVIEW");
  const afterReview = findFirstOfAny(
    entries.filter((e) => clientReview && e.date > clientReview),
    ["RE_EDIT_ON_PROGRESS", "RE_EDIT_QUEUE", "FINALIZED"]
  );

  const now = new Date();

  // Helper: is the current status at or past a given stage?
  const isAtOrPast = (status: string | null | undefined, stages: Set<string>): boolean => {
    return !!status && stages.has(status);
  };

  // Edit Time: EDIT_ON_PROGRESS → COLOR_QUEUE
  // If no color stage, use EXPORT_QUEUE as the end point
  // If still in edit, show ongoing
  let editTime: string | null = null;
  if (editStart) {
    const editEnd = colorQueue || exportQueue;
    if (editEnd) {
      editTime = formatDuration(editEnd.getTime() - editStart.getTime());
    } else if (currentStatus === "EDIT_ON_PROGRESS") {
      editTime = formatDuration(now.getTime() - editStart.getTime()) + " (ongoing)";
    }
  }

  // Color Time: COLOR_ON_PROGRESS → EXPORT_QUEUE
  let colorTime: string | null = null;
  if (colorStart) {
    if (exportQueue) {
      colorTime = formatDuration(exportQueue.getTime() - colorStart.getTime());
    } else if (currentStatus === "COLOR_ON_PROGRESS") {
      colorTime = formatDuration(now.getTime() - colorStart.getTime()) + " (ongoing)";
    }
  }

  // Total Time (edit start → export queue = time till export)
  let totalTime: string | null = null;
  if (editStart) {
    const end = exportQueue || now;
    totalTime = formatDuration(end.getTime() - editStart.getTime());
    if (!exportQueue) totalTime += " (ongoing)";
  }

  // Actual Time (excluding pauses)
  let actualTime: string | null = null;
  let pausedTime: string | null = null;
  if (editStart) {
    const end = exportQueue || now;
    const paused = computePausedMs(entries, editStart, end);
    const wall = end.getTime() - editStart.getTime();
    const actual = Math.max(0, wall - paused);
    actualTime = formatDuration(actual);
    if (!exportQueue) actualTime += " (ongoing)";
    if (paused > 0) {
      pausedTime = formatDuration(paused);
    }
  }

  // Finalized Time: EDIT_ON_PROGRESS → FINALIZED
  let finalizedTime: string | null = null;
  if (editStart && finalized) {
    finalizedTime = formatDuration(finalized.getTime() - editStart.getTime());
  }

  // Client Review Time: CLIENT_REVIEW → next stage
  let clientReviewTime: string | null = null;
  if (clientReview) {
    const reviewEnd = afterReview || (currentStatus === "CLIENT_REVIEW" ? now : null);
    if (reviewEnd) {
      clientReviewTime = formatDuration(reviewEnd.getTime() - clientReview.getTime());
      if (!afterReview) clientReviewTime += " (ongoing)";
    }
  }

  // Exported Time: EXPORT_QUEUE → EXPORTED (rendering/export duration)
  let exportedTime: string | null = null;
  if (exportQueue && exported) {
    exportedTime = formatDuration(exported.getTime() - exportQueue.getTime());
  } else if (exportQueue && !exported && currentStatus === "EXPORT_QUEUE") {
    exportedTime = formatDuration(now.getTime() - exportQueue.getTime()) + " (ongoing)";
  }

  return { editTime, colorTime, totalTime, actualTime, pausedTime, finalizedTime, clientReviewTime, exportedTime };
}
