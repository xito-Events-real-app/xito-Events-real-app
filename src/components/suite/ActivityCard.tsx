import { useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  MessageSquare, 
  Activity, 
  UserPlus, 
  Phone, 
  CalendarCheck,
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityItem, getActivityColor } from "@/lib/activity-utils";
import { getClientDetailPath } from "@/lib/client-navigation";

interface ActivityCardProps {
  activity: ActivityItem;
}

const iconMap = {
  payment: CreditCard,
  comment: MessageSquare,
  status: Activity,
  client_added: UserPlus,
  call: Phone,
  booking: CalendarCheck,
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const navigate = useNavigate();
  const colors = getActivityColor(activity.type);
  const Icon = iconMap[activity.type];
  
  const handleClick = () => {
    if (activity.clientId) {
      const path = getClientDetailPath({ registeredDateTimeAD: activity.clientId });
      navigate(path);
    }
  };
  
  return (
    <div 
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer",
        "bg-white border border-gray-100 shadow-sm",
        "hover:shadow-md hover:border-gray-200 transition-all",
        "active:scale-[0.98]"
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
        {/* Client name */}
        <p className="text-sm font-semibold text-gray-900 truncate">
          {activity.clientName}
        </p>
        
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
