import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Plus, ArrowLeft, Send, ChevronLeft, ChevronRight, Clock, User, Phone, Pencil, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddTaskDialog } from "./AddTaskDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDailyTasks, STATUSES, urgencyCardStyles, getDeadlineText, isTaskOverdue } from "@/hooks/useDailyTasks";
import type { DailyTask } from "@/lib/daily-task-api";

export function MobileDailyTasks() {
  const navigate = useNavigate();
  const {
    tasks, setupData, loading, fetchData,
    shiftDates, selectedDate, setSelectedDate,
    handlerFilter, setHandlerFilter,
    dateStrip, taskCountByDate, filteredTasks, activeHandlers,
    handleStatusChange, handleSendToHandler, handleSendToBackupHandler, handleSendToBothHandlers,
  } = useDailyTasks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">WTN Daily Task</h1>
            <p className="text-[10px] text-gray-500">{tasks.length} tasks</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 text-xs bg-purple-600 hover:bg-purple-700">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {/* Compact Date Strip */}
      <div className="px-2 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-0.5">
          <button className="p-1 shrink-0" onClick={() => shiftDates(-1)}>
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-hide">
            {dateStrip.map(d => {
              const count = taskCountByDate[d.ad] || 0;
              const isSelected = selectedDate === d.ad;
              return (
                <button
                  key={d.ad}
                  onClick={() => { setSelectedDate(isSelected ? null : d.ad); setHandlerFilter(null); }}
                  className={cn(
                    "relative flex flex-col items-center px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap shrink-0",
                    isSelected ? "bg-purple-600 text-white shadow" :
                    d.isToday ? "bg-purple-100 text-purple-800 ring-1 ring-purple-400" :
                    "bg-gray-100 text-gray-600"
                  )}
                >
                  <span>{d.label}</span>
                  {count > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center",
                      isSelected ? "bg-white text-purple-600" : "bg-red-500 text-white"
                    )}>{count}</span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => { setSelectedDate(null); setHandlerFilter(null); }}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium shrink-0",
                selectedDate === null ? "bg-purple-600 text-white shadow" : "bg-gray-100 text-gray-600"
              )}
            >All</button>
          </div>
          <button className="p-1 shrink-0" onClick={() => shiftDates(1)}>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Handler pills */}
      {activeHandlers.length > 0 && (
        <div className="px-3 py-1.5 bg-white border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <Button size="sm" variant={handlerFilter === null ? "default" : "outline"} className={cn("h-6 text-[10px] px-2", handlerFilter === null && "bg-violet-600")} onClick={() => setHandlerFilter(null)}>All</Button>
          {activeHandlers.map(h => (
            <Button key={h} size="sm" variant={handlerFilter === h ? "default" : "outline"} className={cn("h-6 text-[10px] px-2", handlerFilter === h && "bg-violet-600")} onClick={() => setHandlerFilter(h)}>{h}</Button>
          ))}
        </div>
      )}

      {/* Stacked Cards */}
      <div className="px-3 py-3 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-medium">No tasks found</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const overdue = isTaskOverdue(task);
            const deadlineInfo = getDeadlineText(task.deadline);
            const style = urgencyCardStyles[task.urgency] || urgencyCardStyles[1];

            return (
              <div
                key={task.rowNumber}
                className={cn(
                  "rounded-xl border-l-4 shadow-sm p-3 flex flex-col gap-2",
                  style.bg, style.border,
                  overdue && "ring-2 ring-red-400"
                )}
              >
                {/* Badges row */}
                <div className="flex items-center justify-between">
                  <Badge className={cn("text-[9px] px-1.5 py-0", style.accent, "text-white border-0")}>
                    U{task.urgency}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {overdue && <Badge className="bg-red-600 text-white text-[9px] px-1 py-0 border-0">OVERDUE</Badge>}
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">{task.status}</Badge>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-[13px] text-gray-900 leading-tight">{task.taskName}</h3>

                {task.description && (
                  <p className="text-[11px] text-gray-600 line-clamp-2">{task.description}</p>
                )}

                {/* Compact details */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {task.handler}
                    {task.backupHandler && <span className="text-gray-400">/ {task.backupHandler}</span>}
                  </span>
                  {deadlineInfo.text && (
                    <span className={cn("flex items-center gap-1", deadlineInfo.isOverdue && "text-red-600 font-semibold")}>
                      <Clock className="w-3 h-3" /> {deadlineInfo.text}
                    </span>
                  )}
                  {(task.contactNo || task.whatsappNo) && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {task.contactNo || task.whatsappNo}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-200/50">
                  <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v)}>
                    <SelectTrigger className="h-7 text-[10px] flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2">
                        <Send className="w-3 h-3" /> <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={() => handleSendToHandler(task)}>
                        {task.handler}
                      </DropdownMenuItem>
                      {task.backupHandler && (
                        <DropdownMenuItem onClick={() => handleSendToBackupHandler(task)}>
                          {task.backupHandler}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
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
