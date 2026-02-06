import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays, isAfter, parseISO, differenceInMinutes } from "date-fns";
import NepaliDate from "nepali-date-converter";
import { CheckSquare, Plus, ArrowLeft, Send, ChevronLeft, ChevronRight, Clock, User, Phone, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getDailyTasks, getDailyTaskSetupData, updateDailyTaskStatus } from "@/lib/daily-task-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { AddTaskDialog } from "./AddTaskDialog";
import { cn } from "@/lib/utils";
import type { DailyTask, DailyTaskSetupData } from "@/lib/daily-task-api";

const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

const NEPALI_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

const urgencyCardStyles: Record<number, { bg: string; border: string; accent: string }> = {
  5: { bg: "bg-red-50", border: "border-l-red-500", accent: "bg-red-500" },
  4: { bg: "bg-orange-50", border: "border-l-orange-500", accent: "bg-orange-500" },
  3: { bg: "bg-yellow-50", border: "border-l-yellow-400", accent: "bg-yellow-500" },
  2: { bg: "bg-green-50", border: "border-l-green-400", accent: "bg-green-500" },
  1: { bg: "bg-gray-50", border: "border-l-gray-300", accent: "bg-gray-400" },
};

function getDeadlineText(deadline: string): { text: string; isOverdue: boolean } {
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
    return {
      text: isOverdue ? `OVERDUE by ${timeStr}` : `${timeStr} remaining`,
      isOverdue,
    };
  } catch {
    return { text: deadline, isOverdue: false };
  }
}

function adToNepaliLabel(dateAD: Date): string {
  try {
    const np = new NepaliDate(dateAD);
    const month = NEPALI_MONTHS[np.getMonth()];
    const day = np.getDate();
    return `${month} ${day}`;
  } catch {
    return format(dateAD, "MMM d");
  }
}

export function DesktopDailyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [setupData, setSetupData] = useState<DailyTaskSetupData>({ handlers: [], handlerWhatsApp: {} });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [centerDate, setCenterDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), "yyyy-MM-dd"));
  const [handlerFilter, setHandlerFilter] = useState<string | null>(null);

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, []);

  // Generate 12 dates centered on centerDate
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

  // Task counts per date
  const taskCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { map[t.dateAD] = (map[t.dateAD] || 0) + 1; });
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (selectedDate) {
      result = result.filter(t => t.dateAD === selectedDate);
    }
    if (handlerFilter) {
      result = result.filter(t => t.handler === handlerFilter);
    }
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

  const isTaskOverdue = (task: DailyTask) => {
    if (task.status === "Completed" || task.status === "Cancelled" || !task.deadline) return false;
    try { return isAfter(new Date(), new Date(task.deadline)); } catch { return false; }
  };

  const handleStatusChange = async (task: DailyTask, newStatus: string) => {
    try {
      await updateDailyTaskStatus(task.rowNumber, newStatus);
      setTasks(prev => prev.map(t => t.rowNumber === task.rowNumber ? { ...t, status: newStatus } : t));
      toast.success(`Status updated to ${newStatus}`);
    } catch { toast.error("Failed to update status"); }
  };

  const handleSendToHandler = (task: DailyTask) => {
    const whatsapp = setupData.handlerWhatsApp[task.handler];
    if (!whatsapp) { toast.error(`No WhatsApp number found for ${task.handler}`); return; }
    const message = `Hello ${task.handler},\n\nYou have been assigned the following task:\n\nTask: ${task.taskName}\nDescription: ${task.description}\nDeadline: ${task.deadline}\nUrgency: ${task.urgency}/5\n\nPlease confirm once received.`;
    openWhatsApp(whatsapp, message);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">WTN Daily Task</h1>
              <p className="text-xs text-gray-500">{tasks.length} total tasks</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* 12-Date Nepali Navigation Strip */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCenterDate(prev => subDays(prev, 6))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {dateStrip.map(d => {
              const count = taskCountByDate[d.ad] || 0;
              const isSelected = selectedDate === d.ad;
              return (
                <button
                  key={d.ad}
                  onClick={() => { setSelectedDate(isSelected ? null : d.ad); setHandlerFilter(null); }}
                  className={cn(
                    "relative flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    isSelected ? "bg-purple-600 text-white shadow-md" :
                    d.isToday ? "bg-purple-100 text-purple-800 ring-2 ring-purple-400" :
                    "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <span className={cn("text-[11px]", d.isToday && !isSelected && "font-bold")}>{d.label}</span>
                  {count > 0 && (
                    <span className={cn(
                      "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                      isSelected ? "bg-white text-purple-600" : "bg-red-500 text-white"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* All button */}
            <button
              onClick={() => { setSelectedDate(null); setHandlerFilter(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                selectedDate === null ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All
            </button>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCenterDate(prev => addDays(prev, 6))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Handler Filter Pills */}
      {activeHandlers.length > 0 && (
        <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 mr-1">Handler:</span>
          <Button size="sm" variant={handlerFilter === null ? "default" : "outline"} className={cn("h-7 text-xs", handlerFilter === null && "bg-violet-600")} onClick={() => setHandlerFilter(null)}>All</Button>
          {activeHandlers.map(h => (
            <Button key={h} size="sm" variant={handlerFilter === h ? "default" : "outline"} className={cn("h-7 text-xs", handlerFilter === h && "bg-violet-600")} onClick={() => setHandlerFilter(h)}>{h}</Button>
          ))}
        </div>
      )}

      {/* Task Cards Grid */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">Try changing the date or handler filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTasks.map(task => {
              const overdue = isTaskOverdue(task);
              const deadlineInfo = getDeadlineText(task.deadline);
              const style = urgencyCardStyles[task.urgency] || urgencyCardStyles[1];

              return (
                <div
                  key={task.rowNumber}
                  className={cn(
                    "rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3",
                    style.bg, style.border,
                    overdue && "ring-2 ring-red-400"
                  )}
                >
                  {/* Top: Urgency + Status badges */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-[10px] px-2 py-0.5", style.accent, "text-white border-0")}>
                      Urgency {task.urgency}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {overdue && <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 border-0">OVERDUE</Badge>}
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">{task.status}</Badge>
                    </div>
                  </div>

                  {/* Task Name */}
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">{task.taskName}</h3>

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-3">{task.description}</p>
                  )}

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span className="font-medium text-gray-700">{task.handler}</span>
                      {task.backupHandler && <span className="text-gray-400">/ {task.backupHandler}</span>}
                    </div>

                    {deadlineInfo.text && (
                      <div className={cn("flex items-center gap-1.5", deadlineInfo.isOverdue ? "text-red-600 font-semibold" : "text-gray-500")}>
                        <Clock className="w-3 h-3" />
                        <span>{deadlineInfo.text}</span>
                      </div>
                    )}

                    {(task.contactNo || task.whatsappNo) && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>{task.contactNo || task.whatsappNo}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-200/50">
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v)}>
                      <SelectTrigger className="h-7 text-[11px] flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 shrink-0" onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 shrink-0" onClick={() => handleSendToHandler(task)}>
                      <Send className="w-3 h-3" /> WA
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddTaskDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTask(null); }}
        setupData={setupData}
        onTaskAdded={() => { setDialogOpen(false); setEditingTask(null); fetchData(); }}
        editTask={editingTask}
      />
    </div>
  );
}
