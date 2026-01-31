import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, User, MessageSquare, UserPlus, Activity, CreditCard, Phone, CalendarCheck, FileText, UserCog, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHandlerActivityFeed, ActivityItem } from "@/hooks/useHandlerActivityFeed";
import { useNavigate } from "react-router-dom";
import { getClientDetailPath } from "@/lib/client-navigation";

// Color schemes for handlers
const colorSchemes = {
  violet: { 
    bg: 'bg-violet-500', 
    light: 'bg-violet-50', 
    text: 'text-violet-700',
    border: 'border-violet-200'
  },
  emerald: { 
    bg: 'bg-emerald-500', 
    light: 'bg-emerald-50', 
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  blue: { 
    bg: 'bg-blue-500', 
    light: 'bg-blue-50', 
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
} as const;

type ColorScheme = keyof typeof colorSchemes;

interface HandlerActivitySectionProps {
  handlerName: string;
  colorScheme: ColorScheme;
}

// Get icon component based on activity type
function getActivityIconComponent(type: string) {
  switch (type) {
    case 'payment': return CreditCard;
    case 'comment': return MessageSquare;
    case 'status': return Activity;
    case 'client_added': return UserPlus;
    case 'call': return Phone;
    case 'booking': return CalendarCheck;
    case 'quotation': return FileText;
    case 'handler_change': return UserCog;
    case 'mindset': return Brain;
    default: return Activity;
  }
}

// Compact activity card for handler sections
function CompactActivityCard({ activity }: { activity: ActivityItem }) {
  const navigate = useNavigate();
  const Icon = getActivityIconComponent(activity.type);
  
  const handleClick = () => {
    if (activity.clientId) {
      navigate(getClientDetailPath({
        registeredDateTimeAD: activity.clientId,
        clientName: activity.clientName,
      } as any));
    }
  };
  
  // Get type-specific styling
  const getTypeBg = () => {
    switch (activity.type) {
      case 'payment': return 'bg-emerald-50 border-emerald-200';
      case 'booking': return 'bg-violet-50 border-violet-200';
      case 'status': return 'bg-blue-50 border-blue-200';
      case 'client_added': return 'bg-purple-50 border-purple-200';
      case 'comment': return 'bg-amber-50 border-amber-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-2 rounded-lg border cursor-pointer transition-all",
        "hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
        getTypeBg()
      )}
    >
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="w-3 h-3 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">
            {activity.clientName}
          </p>
          <p className="text-[10px] text-gray-600 truncate">
            {activity.description}
          </p>
          {activity.details && (
            <p className="text-[10px] text-gray-500 italic truncate mt-0.5">
              {activity.details}
            </p>
          )}
        </div>
        <span className="text-[9px] text-gray-400 shrink-0 whitespace-nowrap">
          {activity.relativeTime}
        </span>
      </div>
    </div>
  );
}

export function HandlerActivitySection({ handlerName, colorScheme }: HandlerActivitySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { todayActivities, yesterdayActivities, isLoading } = useHandlerActivityFeed(handlerName);
  
  const colors = colorSchemes[colorScheme];
  const totalCount = todayActivities.length + yesterdayActivities.length;

  return (
    <Card className={cn("overflow-hidden border", colors.border)}>
      {/* Header */}
      <div 
        className={cn("p-3 flex items-center justify-between cursor-pointer", colors.light)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm", colors.bg)}>
            <User className="w-4 h-4 text-white" />
          </div>
          <span className={cn("font-bold uppercase tracking-wide text-sm", colors.text)}>
            {handlerName}
          </span>
          {totalCount > 0 && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {totalCount}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 transition-transform text-gray-400",
            !isExpanded && "-rotate-90"
          )} 
        />
      </div>
      
      {/* Content */}
      {isExpanded && (
        <CardContent className="p-3 space-y-3 max-h-80 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* TODAY Section */}
              {todayActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Today
                  </h4>
                  {todayActivities.slice(0, 5).map(activity => (
                    <CompactActivityCard key={activity.id} activity={activity} />
                  ))}
                  {todayActivities.length > 5 && (
                    <p className="text-[10px] text-gray-400 text-center">
                      +{todayActivities.length - 5} more today
                    </p>
                  )}
                </div>
              )}
              
              {/* YESTERDAY Section */}
              {yesterdayActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Yesterday
                  </h4>
                  {yesterdayActivities.slice(0, 5).map(activity => (
                    <CompactActivityCard key={activity.id} activity={activity} />
                  ))}
                  {yesterdayActivities.length > 5 && (
                    <p className="text-[10px] text-gray-400 text-center">
                      +{yesterdayActivities.length - 5} more yesterday
                    </p>
                  )}
                </div>
              )}
              
              {/* Empty State */}
              {todayActivities.length === 0 && yesterdayActivities.length === 0 && (
                <div className="text-center py-6">
                  <div className={cn("w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center", colors.light)}>
                    <Activity className={cn("w-5 h-5", colors.text)} />
                  </div>
                  <p className="text-gray-400 text-xs">
                    No recent activity
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
