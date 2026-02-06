import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, addDays, isAfter, parseISO } from "date-fns";
import { CheckSquare, Plus, ArrowLeft, Send, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getDailyTasks, getDailyTaskSetupData, updateDailyTaskStatus } from "@/lib/daily-task-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { AddTaskDrawer } from "./AddTaskDrawer";
import { cn } from "@/lib/utils";
import type { DailyTask, DailyTaskSetupData } from "@/lib/daily-task-api";

const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

const urgencyColors: Record<number, string> = {
  5: "bg-red-100 border-red-300",
  4: "bg-orange-100 border-orange-300",
  3: "bg-yellow-50 border-yellow-300",
  2: "bg-green-50 border-green-300",
  1: "bg-gray-50 border-gray-200",
};

const urgencyBadgeColors: Record<number, string> = {
  5: "bg-red-500 text-white",
  4: "bg-orange-500 text-white",
  3: "bg-yellow-500 text-white",
  2: "bg-green-500 text-white",
  1: "bg-gray-400 text-white",
};

type DateFilter = "yesterday" | "today" | "tomorrow" | "all";

export function DesktopDailyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [setupData, setSetupData] = useState<DailyTaskSetupData>({ handlers: [], handlerWhatsApp: {} });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [handlerFilter, setHandlerFilter] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const today = new Date();
  const getDateForFilter = (filter: DateFilter): string | null => {
    if (filter === "all") return null;
    const d = filter === "yesterday" ? subDays(today, 1) : filter === "tomorrow" ? addDays(today, 1) : today;
    return format(d, "yyyy-MM-dd");
  };

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    const targetDate = getDateForFilter(dateFilter);
    if (targetDate) {
      result = result.filter(t => t.dateAD === targetDate);
    }
    if (handlerFilter) {
      result = result.filter(t => t.handler === handlerFilter);
    }
    // Sort: urgency desc, then deadline asc
    result.sort((a, b) => {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return (a.deadline || "").localeCompare(b.deadline || "");
    });
    return result;
  }, [tasks, dateFilter, handlerFilter]);

  const activeHandlers = useMemo(() => {
    const targetDate = getDateForFilter(dateFilter);
    const relevant = targetDate ? tasks.filter(t => t.dateAD === targetDate) : tasks;
    return [...new Set(relevant.map(t => t.handler).filter(Boolean))];
  }, [tasks, dateFilter]);

  const isOverdue = (task: DailyTask) => {
    if (task.status === "Completed" || task.status === "Cancelled" || !task.deadline) return false;
    try {
      return isAfter(new Date(), parseISO(task.deadline));
    } catch { return false; }
  };

  const handleStatusChange = async (task: DailyTask, newStatus: string) => {
    try {
      await updateDailyTaskStatus(task.rowNumber, newStatus);
      setTasks(prev => prev.map(t => t.rowNumber === task.rowNumber ? { ...t, status: newStatus } : t));
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSendToHandler = (task: DailyTask) => {
    const whatsapp = setupData.handlerWhatsApp[task.handler];
    if (!whatsapp) {
      toast.error(`No WhatsApp number found for ${task.handler}`);
      return;
    }
    const message = `Hello ${task.handler},\n\nYou have been assigned the following task:\n\nTask: ${task.taskName}\nDescription: ${task.description}\nDeadline: ${task.deadline}\nUrgency: ${task.urgency}/5\n\nPlease confirm once received.`;
    openWhatsApp(whatsapp, message);
  };

  const handleTaskAdded = () => {
    setDrawerOpen(false);
    fetchData();
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
          <Button onClick={() => setDrawerOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          {(["yesterday", "today", "tomorrow", "all"] as DateFilter[]).map(f => (
            <Button
              key={f}
              variant={dateFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => { setDateFilter(f); setHandlerFilter(null); }}
              className={cn(
                dateFilter === f && "bg-purple-600 hover:bg-purple-700"
              )}
            >
              {f === "yesterday" && <ChevronLeft className="w-3 h-3 mr-1" />}
              {f === "today" && <Calendar className="w-3 h-3 mr-1" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "tomorrow" && <ChevronRight className="w-3 h-3 ml-1" />}
            </Button>
          ))}
          {dateFilter !== "all" && (
            <span className="ml-3 text-sm text-gray-500">
              {getDateForFilter(dateFilter)}
            </span>
          )}
        </div>
      </div>

      {/* Handler Filter Pills */}
      {activeHandlers.length > 0 && (
        <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 mr-1">Handler:</span>
          <Button
            size="sm"
            variant={handlerFilter === null ? "default" : "outline"}
            className={cn("h-7 text-xs", handlerFilter === null && "bg-violet-600")}
            onClick={() => setHandlerFilter(null)}
          >
            All
          </Button>
          {activeHandlers.map(h => (
            <Button
              key={h}
              size="sm"
              variant={handlerFilter === h ? "default" : "outline"}
              className={cn("h-7 text-xs", handlerFilter === h && "bg-violet-600")}
              onClick={() => setHandlerFilter(h)}
            >
              {h}
            </Button>
          ))}
        </div>
      )}

      {/* Task Table */}
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-xs">Task Name</TableHead>
                  <TableHead className="font-semibold text-xs">Description</TableHead>
                  <TableHead className="font-semibold text-xs">Date</TableHead>
                  <TableHead className="font-semibold text-xs">Deadline</TableHead>
                  <TableHead className="font-semibold text-xs">Handler</TableHead>
                  <TableHead className="font-semibold text-xs">Backup</TableHead>
                  <TableHead className="font-semibold text-xs">Contact</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Urgency</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map(task => {
                  const overdue = isOverdue(task);
                  return (
                    <TableRow
                      key={task.rowNumber}
                      className={cn(
                        "border-l-4 transition-colors",
                        overdue ? "bg-red-50 border-l-red-500" : urgencyColors[task.urgency] || "border-l-gray-200"
                      )}
                    >
                      <TableCell className="font-medium text-sm max-w-[180px]">
                        <div className="flex items-center gap-2">
                          {task.taskName}
                          {overdue && <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">OVERDUE</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">{task.description}</TableCell>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        <div>{task.dateAD}</div>
                        <div className="text-[10px] text-gray-400">{task.dateBS}</div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 whitespace-nowrap">{task.deadline}</TableCell>
                      <TableCell className="text-xs font-medium">{task.handler}</TableCell>
                      <TableCell className="text-xs text-gray-500">{task.backupHandler}</TableCell>
                      <TableCell className="text-xs">
                        {task.contactNo && <div>{task.contactNo}</div>}
                        {task.whatsappNo && <div className="text-green-600">{task.whatsappNo}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs", urgencyBadgeColors[task.urgency])}>
                          {task.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(v) => handleStatusChange(task, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSendToHandler(task)}
                        >
                          <Send className="w-3 h-3" /> Send
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddTaskDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        setupData={setupData}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  );
}
