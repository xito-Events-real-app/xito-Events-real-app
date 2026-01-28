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
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  const hasEvents = todayEvents.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm">
      {/* Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
        hasEvents 
          ? "from-emerald-500 to-teal-600" 
          : "from-gray-300 to-gray-400"
      )} />

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8 pl-5 md:pl-7">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
                hasEvents 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                  : "bg-gradient-to-br from-gray-400 to-gray-500"
              )}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Today's Events
                </h2>
                <p className="text-sm text-gray-500">
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
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-medium text-white uppercase tracking-wide px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm">
                          LIVE
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-semibold truncate group-hover:text-emerald-700 transition-colors">
                          {event.client.clientName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {event.eventName}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                  );
                })}
                
                {todayEvents.length > 3 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{todayEvents.length - 3} more events
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-sm">
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
