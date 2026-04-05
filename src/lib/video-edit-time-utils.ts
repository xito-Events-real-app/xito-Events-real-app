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
  if (pauseStart) {
    total += end.getTime() - pauseStart.getTime();
  }
  return total;
}

/** Per-editor time breakdown during EDIT_ON_PROGRESS phase */
export interface EditorBreakdown {
  editor: string;
  duration: string;
}

function computeEditorBreakdown(
  entries: StageEntry[],
  editStart: Date | null,
  editEnd: Date | null,
  initialEditor: string | null,
  currentStatus: string | null | undefined
): EditorBreakdown[] | null {
  if (!editStart) return null;

  const end = editEnd || (currentStatus === "EDIT_ON_PROGRESS" ? new Date() : null);
  if (!end) return null;

  // Collect editor change events
  const editorChanges: { from: string; to: string; date: Date }[] = [];
  for (const e of entries) {
    const match = e.status.match(/^EDITOR_CHANGED_FROM_(.+?)_TO_(.+)$/);
    if (match && e.date >= editStart && e.date <= end) {
      editorChanges.push({ from: match[1], to: match[2], date: e.date });
    }
  }

  if (editorChanges.length === 0) return null; // Single editor, no breakdown needed

  // Build segments: [startDate, endDate, editorName]
  const segments: { editor: string; start: Date; end: Date }[] = [];
  let currentEditor = initialEditor || editorChanges[0]?.from || "Unknown";
  let segStart = editStart;

  for (const change of editorChanges) {
    segments.push({ editor: currentEditor, start: segStart, end: change.date });
    currentEditor = change.to;
    segStart = change.date;
  }
  // Final segment
  segments.push({ editor: currentEditor, start: segStart, end: end });

  // Aggregate by editor, subtracting paused time per segment
  const editorMs: Record<string, number> = {};
  for (const seg of segments) {
    const wall = seg.end.getTime() - seg.start.getTime();
    const paused = computePausedMs(entries, seg.start, seg.end);
    const actual = Math.max(0, wall - paused);
    editorMs[seg.editor] = (editorMs[seg.editor] || 0) + actual;
  }

  return Object.entries(editorMs).map(([editor, ms]) => ({
    editor,
    duration: formatDuration(ms),
  }));
}

export interface VideoEditTimings {
  editLabTime: string | null;        // EDIT_LAB → EDIT_ON_PROGRESS
  editTime: string | null;           // EDIT_ON_PROGRESS → COLOR_QUEUE/EXPORT_QUEUE
  editTimeBreakdown: EditorBreakdown[] | null;
  colorQueueTime: string | null;     // COLOR_QUEUE → COLOR_ON_PROGRESS
  colorTime: string | null;          // COLOR_ON_PROGRESS → EXPORT_QUEUE
  exportQueueTime: string | null;    // EXPORT_QUEUE → EXPORTED
  exportedTime: string | null;       // EXPORTED → CLIENT_REVIEW/FINALIZED
  clientReviewTime: string | null;   // CLIENT_REVIEW → next stage
  reEdit: boolean;
  reEditTime: string | null;         // RE_EDIT_ON_PROGRESS duration
  finalizedTime: string | null;      // "Xd ago"
  totalTime: string | null;
  actualTime: string | null;
  pausedTime: string | null;
}

export function computeVideoEditTimings(
  stageHistory: string | null | undefined,
  currentStatus?: string | null,
  editorName?: string | null
): VideoEditTimings {
  const entries = parseStageHistory(stageHistory);
  const now = new Date();

  const editLab = findFirst(entries, "EDIT_LAB");
  const editStart = findFirst(entries, "EDIT_ON_PROGRESS");
  const colorQueue = findFirst(entries, "COLOR_QUEUE");
  const colorStart = findFirst(entries, "COLOR_ON_PROGRESS");
  const exportQueue = findFirst(entries, "EXPORT_QUEUE");
  const exported = findFirst(entries, "EXPORTED");
  const finalized = findLast(entries, "FINALIZED");
  const clientReview = findLast(entries, "CLIENT_REVIEW");
  const reEditStart = findFirst(entries, "RE_EDIT_ON_PROGRESS");
  const afterReview = findFirstOfAny(
    entries.filter((e) => clientReview && e.date > clientReview),
    ["RE_EDIT_ON_PROGRESS", "RE_EDIT_QUEUE", "FINALIZED"]
  );

  // Helper for ongoing suffix
  const fmt = (start: Date | null, end: Date | null, ongoingStatus: string): string | null => {
    if (!start) return null;
    const e = end || (currentStatus === ongoingStatus ? now : null);
    if (!e) return null;
    const dur = formatDuration(e.getTime() - start.getTime());
    return end ? dur : dur + " (ongoing)";
  };

  // Edit Lab Time: EDIT_LAB → EDIT_ON_PROGRESS
  const editLabTime = fmt(editLab, editStart, "EDIT_LAB");

  // Edit Time: EDIT_ON_PROGRESS → COLOR_QUEUE (or EXPORT_QUEUE if no color)
  let editTime: string | null = null;
  if (editStart) {
    const editEnd = colorQueue || exportQueue;
    if (editEnd) {
      editTime = formatDuration(editEnd.getTime() - editStart.getTime());
    } else if (currentStatus === "EDIT_ON_PROGRESS") {
      editTime = formatDuration(now.getTime() - editStart.getTime()) + " (ongoing)";
    }
  }

  // Per-editor breakdown
  const editEnd = colorQueue || exportQueue || null;
  const editTimeBreakdown = computeEditorBreakdown(entries, editStart, editEnd, editorName || null, currentStatus);

  // Color Queue Time: COLOR_QUEUE → COLOR_ON_PROGRESS
  const colorQueueTime = fmt(colorQueue, colorStart, "COLOR_QUEUE");

  // Color Time: COLOR_ON_PROGRESS → EXPORT_QUEUE
  let colorTime: string | null = null;
  if (colorStart) {
    if (exportQueue) {
      colorTime = formatDuration(exportQueue.getTime() - colorStart.getTime());
    } else if (currentStatus === "COLOR_ON_PROGRESS") {
      colorTime = formatDuration(now.getTime() - colorStart.getTime()) + " (ongoing)";
    }
  }

  // Export Queue Time: EXPORT_QUEUE → EXPORTED
  const exportQueueTime = fmt(exportQueue, exported, "EXPORT_QUEUE");

  // Exported Time: EXPORTED → CLIENT_REVIEW or FINALIZED
  let exportedTime: string | null = null;
  if (exported) {
    const expEnd = clientReview || finalized;
    if (expEnd) {
      exportedTime = formatDuration(expEnd.getTime() - exported.getTime());
    } else if (currentStatus === "EXPORTED") {
      exportedTime = formatDuration(now.getTime() - exported.getTime()) + " (ongoing)";
    }
  }

  // Client Review Time
  let clientReviewTime: string | null = null;
  if (clientReview) {
    const reviewEnd = afterReview || (currentStatus === "CLIENT_REVIEW" ? now : null);
    if (reviewEnd) {
      clientReviewTime = formatDuration(reviewEnd.getTime() - clientReview.getTime());
      if (!afterReview) clientReviewTime += " (ongoing)";
    }
  }

  // Re-edit
  const reEdit = !!reEditStart;
  let reEditTime: string | null = null;
  if (reEditStart) {
    const reEditEnd = finalized || (currentStatus === "RE_EDIT_ON_PROGRESS" ? now : null);
    if (reEditEnd) {
      reEditTime = formatDuration(reEditEnd.getTime() - reEditStart.getTime());
      if (!finalized && currentStatus === "RE_EDIT_ON_PROGRESS") reEditTime += " (ongoing)";
    }
  }

  // Finalized: "Xd ago"
  let finalizedTime: string | null = null;
  if (finalized) {
    finalizedTime = formatDuration(now.getTime() - finalized.getTime()) + " ago";
  }

  // Total Time (edit start → export queue)
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

  return {
    editLabTime,
    editTime,
    editTimeBreakdown,
    colorQueueTime,
    colorTime,
    exportQueueTime,
    exportedTime,
    clientReviewTime,
    reEdit,
    reEditTime,
    finalizedTime,
    totalTime,
    actualTime,
    pausedTime,
  };
}
