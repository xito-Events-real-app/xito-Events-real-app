import { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays, subDays, isAfter, differenceInMinutes } from "date-fns";
import NepaliDate from "nepali-date-converter";
import { toast } from "sonner";
import { getDailyTasks, getDailyTaskSetupData, updateDailyTaskStatus } from "@/lib/daily-task-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import type { DailyTask, DailyTaskSetupData } from "@/lib/daily-task-api";

export const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

export const NEPALI_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

export const urgencyCardStyles: Record<number, { bg: string; border: string; accent: string }> = {
  5: { bg: "bg-red-50", border: "border-l-red-500", accent: "bg-red-500" },
  4: { bg: "bg-orange-50", border: "border-l-orange-500", accent: "bg-orange-500" },
  3: { bg: "bg-yellow-50", border: "border-l-yellow-400", accent: "bg-yellow-500" },
  2: { bg: "bg-green-50", border: "border-l-green-400", accent: "bg-green-500" },
  1: { bg: "bg-gray-50", border: "border-l-gray-300", accent: "bg-gray-400" },
};

export function getDeadlineText(deadline: string): { text: string; isOverdue: boolean } {
  if (!deadline) return { text: "", isOverdue: false };
  try {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffMins = differenceInMinutes(deadlineDate, now);
    const isOverdue = diffMins < 0;
    const absMins = Math.abs(diffMins);
    const days = Math.floor(absMins / 1440);
    const hrs = Math.floor((absMins % 1440) / 60);
    const mins = absMins % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hrs > 0) parts.push(`${hrs}h`);
    parts.push(`${mins}m`);
    const timeStr = parts.join(" ");
    return { text: isOverdue ? `OVERDUE by ${timeStr}` : `${timeStr} remaining`, isOverdue };
  } catch {
    return { text: deadline, isOverdue: false };
  }
}

export function adToNepaliLabel(dateAD: Date): string {
  try {
    const np = new NepaliDate(dateAD);
    return `${NEPALI_MONTHS[np.getMonth()]} ${np.getDate()}`;
  } catch {
    return format(dateAD, "MMM d");
  }
}

export function isTaskOverdue(task: DailyTask): boolean {
  if (task.status === "Completed" || task.status === "Cancelled" || !task.deadline) return false;
  try { return isAfter(new Date(), new Date(task.deadline)); } catch { return false; }
}

export function useDailyTasks() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [setupData, setSetupData] = useState<DailyTaskSetupData>({ handlers: [], handlerWhatsApp: {} });
  const [loading, setLoading] = useState(true);
  const [centerDate, setCenterDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), "yyyy-MM-dd"));
  const [handlerFilter, setHandlerFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, setup] = await Promise.all([getDailyTasks(), getDailyTaskSetupData()]);
      setTasks(tasksData);
      setSetupData(setup);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dateStrip = useMemo(() => {
    const dates: { ad: string; label: string; isToday: boolean }[] = [];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    for (let i = -5; i <= 6; i++) {
      const d = addDays(centerDate, i);
      const ad = format(d, "yyyy-MM-dd");
      dates.push({ ad, label: adToNepaliLabel(d), isToday: ad === todayStr });
    }
    return dates;
  }, [centerDate]);

  const taskCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { map[t.dateAD] = (map[t.dateAD] || 0) + 1; });
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (selectedDate) result = result.filter(t => t.dateAD === selectedDate);
    if (handlerFilter) result = result.filter(t => t.handler === handlerFilter);
    result.sort((a, b) => {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return (a.deadline || "").localeCompare(b.deadline || "");
    });
    return result;
  }, [tasks, selectedDate, handlerFilter]);

  const activeHandlers = useMemo(() => {
    const relevant = selectedDate ? tasks.filter(t => t.dateAD === selectedDate) : tasks;
    return [...new Set(relevant.map(t => t.handler).filter(Boolean))];
  }, [tasks, selectedDate]);

  const handleStatusChange = useCallback(async (task: DailyTask, newStatus: string) => {
    try {
      await updateDailyTaskStatus(task.rowNumber, newStatus);
      setTasks(prev => prev.map(t => t.rowNumber === task.rowNumber ? { ...t, status: newStatus } : t));
      toast.success(`Status updated to ${newStatus}`);
    } catch { toast.error("Failed to update status"); }
  }, []);

  const handleSendToHandler = useCallback((task: DailyTask) => {
    const whatsapp = setupData.handlerWhatsApp[task.handler];
    if (!whatsapp) { toast.error(`No WhatsApp number found for ${task.handler}`); return; }

    const deadlineInfo = task.deadline ? getDeadlineText(task.deadline) : null;
    const deadlineLine = deadlineInfo?.text ? `Deadline: ${deadlineInfo.text}` : "";

    const message = `Hello ${task.handler},\n\nYou have been assigned the following task:\n\nTask: ${task.taskName}\nDescription: ${task.description}\n${deadlineLine}\nUrgency: ${task.urgency}/5\n\nPlease confirm once received.`;
    openWhatsApp(whatsapp, message);
  }, [setupData.handlerWhatsApp]);

  const shiftDates = useCallback((direction: number) => {
    setCenterDate(prev => addDays(prev, direction * 6));
  }, []);

  return {
    tasks, setupData, loading, fetchData,
    centerDate, setCenterDate, shiftDates,
    selectedDate, setSelectedDate,
    handlerFilter, setHandlerFilter,
    dateStrip, taskCountByDate, filteredTasks, activeHandlers,
    handleStatusChange, handleSendToHandler,
  };
}
