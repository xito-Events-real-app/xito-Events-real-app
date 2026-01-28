import { Link } from "react-router-dom";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { getTodayEvents } from "@/hooks/useSuiteStats";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TodayEventsHero() {
  const { clients: bookedClients, isLoading } = useBookedCachedData();
  const todayEvents = getTodayEvents(bookedClients);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded mb-4" />
        <div className="h-4 w-32 bg-slate-700 rounded" />
      </div>
    );
  }

  const hasEvents = todayEvents.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background gradient - Netflix style */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br",
        hasEvents 
          ? "from-emerald-900/90 via-emerald-800/80 to-teal-900/90" 
          : "from-slate-800/90 via-slate-700/80 to-slate-800/90"
      )} />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r animate-pulse",
          hasEvents
            ? "from-emerald-500/20 via-transparent to-teal-500/20"
            : "from-slate-500/20 via-transparent to-slate-500/20"
        )} />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                hasEvents 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                  : "bg-gradient-to-br from-slate-600 to-slate-700"
              )}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  Today's Events
                </h2>
                <p className="text-sm text-slate-300">
                  {hasEvents 
                    ? `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} scheduled`
                    : "No events scheduled for today"
                  }
                </p>
              </div>
            </div>

            {/* Events List */}
            {hasEvents ? (
              <div className="space-y-3 mt-6">
                {todayEvents.slice(0, 3).map((event, idx) => {
                  const clientId = event.client.registeredDateTimeAD || event.client.originalRowNumber;
                  return (
                    <Link 
                      key={`${event.client.clientName}-${idx}`}
                      to={`/client-tracker/client/${encodeURIComponent(clientId)}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide px-2 py-0.5 bg-emerald-500/20 rounded-full">
                          LIVE
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate group-hover:text-emerald-300 transition-colors">
                          {event.client.clientName}
                        </p>
                        <p className="text-sm text-slate-300 truncate">
                          {event.eventName}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </Link>
                  );
                })}
                
                {todayEvents.length > 3 && (
                  <p className="text-sm text-slate-400 text-center pt-2">
                    +{todayEvents.length - 3} more events
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-slate-700/30 border border-slate-600/50">
                <p className="text-slate-400 text-sm">
                  All caught up! No events scheduled for today. Check your upcoming events in the Booked Clients module.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
