import { useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  MessageSquare, 
  Activity, 
  UserPlus, 
  Phone, 
  CalendarCheck,
  ChevronRight,
  FileText,
  UserCog,
  Brain,
  Bell,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityItem, ActivityType, getActivityColor } from "@/lib/activity-utils";
import { getClientDetailPath } from "@/lib/client-navigation";

interface ActivityCardProps {
  activity: ActivityItem;
}

const iconMap: Record<ActivityType, LucideIcon> = {
  payment: CreditCard,
  comment: MessageSquare,
  status: Activity,
  client_added: UserPlus,
  call: Phone,
  booking: CalendarCheck,
  quotation: FileText,
  handler_change: UserCog,
  mindset: Brain,
  lost: XCircle,
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const navigate = useNavigate();
  const colors = getActivityColor(activity.type);
  const Icon = iconMap[activity.type] ?? Bell;
  
  const handleClick = () => {
    if (activity.clientId) {
      const path = getClientDetailPath({ registeredDateTimeAD: activity.clientId });
      navigate(path, { state: { from: '/' } });  // Suite Landing path for back navigation
    }
  };
  
  // Get card background based on activity type
  const getCardStyle = () => {
    switch (activity.type) {
      case 'status':
        return "bg-blue-100 border-2 border-blue-400 ring-2 ring-blue-200";
      case 'payment':
        return "bg-emerald-100 border-2 border-emerald-400 ring-2 ring-emerald-200";
      case 'booking':
        return "bg-violet-100 border-2 border-violet-400 ring-2 ring-violet-200";
      case 'lost':
        return "bg-red-100 border-2 border-red-400 ring-2 ring-red-200";
      default:
        return "bg-white border border-gray-100";
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl cursor-pointer",
        "shadow-sm hover:shadow-md transition-all",
        "flex items-start gap-3 p-3 rounded-xl cursor-pointer",
        "shadow-sm hover:shadow-md transition-all",
        "active:scale-[0.98]",
        getCardStyle()
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        colors.bg
      )}>
        <Icon className={cn("w-4 h-4", colors.text)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Client name + Handler */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {activity.clientName}
          </p>
          {activity.handlerName && (
            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full shrink-0">
              {activity.handlerName}
            </span>
          )}
        </div>
        
        {/* Description */}
        <p className="text-xs text-gray-600">
          {activity.description}
        </p>
        
        {/* Details */}
        {activity.details && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {activity.details}
          </p>
        )}
      </div>
      
      {/* Time & Arrow */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-gray-400">
          {activity.relativeTime}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      </div>
    </div>
  );
}
