import { Activity, Phone, MessageSquare, CreditCard } from "lucide-react";
import { parseStatusTimestamp, getRelativeTime, parseCallLog, parseComments } from "@/lib/client-card-utils";

interface LastActivitiesSummaryProps {
  statusLog?: string;
  callLog?: string;
  comments?: string;
  paymentsMade?: string;
}

interface ActivityItem {
  type: 'status' | 'call' | 'comment' | 'payment';
  text: string;
  time: string;
  timestamp: Date;
  color: string;
}

const LastActivitiesSummary = ({
  statusLog,
  callLog,
  comments,
  paymentsMade,
}: LastActivitiesSummaryProps) => {
  const activities: ActivityItem[] = [];

  // Parse last status change
  if (statusLog) {
    const lines = statusLog.split('\n').filter(Boolean);
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const statusName = lastLine.split(' [')[0].trim();
      const timestamp = parseStatusTimestamp(lastLine);
      if (timestamp) {
        activities.push({
          type: 'status',
          text: `Status → ${statusName}`,
          time: getRelativeTime(timestamp),
          timestamp,
          color: 'text-blue-400',
        });
      }
    }
  }

  // Parse last call
  if (callLog) {
    const callEntries = parseCallLog(callLog);
    if (callEntries.length > 0) {
      const lastCall = callEntries[callEntries.length - 1];
      // Try to parse the date
      if (lastCall.date) {
        try {
          const [year, month, day] = lastCall.date.split('-').map(Number);
          let hours = 0, mins = 0;
          if (lastCall.time) {
            const timeMatch = lastCall.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
              hours = parseInt(timeMatch[1]);
              mins = parseInt(timeMatch[2]);
              const isPM = timeMatch[3].toUpperCase() === 'PM';
              if (isPM && hours !== 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;
            }
          }
          const callDate = new Date(year, month - 1, day, hours, mins);
          activities.push({
            type: 'call',
            text: `${lastCall.type} call logged`,
            time: getRelativeTime(callDate),
            timestamp: callDate,
            color: lastCall.type === 'WHATSAPP' ? 'text-green-400' : 'text-blue-400',
          });
        } catch {}
      }
    }
  }

  // Parse last comment
  if (comments) {
    const parsedComments = parseComments(comments);
    if (parsedComments.length > 0) {
      const lastComment = parsedComments[parsedComments.length - 1];
      if (lastComment.timestamp) {
        const truncatedText = lastComment.text.length > 40 
          ? lastComment.text.substring(0, 40) + '...' 
          : lastComment.text;
        activities.push({
          type: 'comment',
          text: `Comment: "${truncatedText}"`,
          time: getRelativeTime(lastComment.timestamp),
          timestamp: lastComment.timestamp,
          color: 'text-slate-400',
        });
      }
    }
  }

  // Parse last payment
  if (paymentsMade) {
    // Extract payment entries: "NPR X,XX,XXX/- TYPE [DATE] @ BANK"
    const paymentMatch = paymentsMade.match(/NPR\s*([\d,]+)\s*\/-\s*(\w+)\s*\[([^\]]+)\]/g);
    if (paymentMatch && paymentMatch.length > 0) {
      const lastPaymentStr = paymentMatch[paymentMatch.length - 1];
      const detailMatch = lastPaymentStr.match(/NPR\s*([\d,]+)\s*\/-\s*(\w+)\s*\[([^\]]+)\]/);
      if (detailMatch) {
        // Try to parse the date from bracket format
        const dateStr = detailMatch[3];
        const dateParts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateParts) {
          const paymentDate = new Date(
            parseInt(dateParts[3]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
          );
          activities.push({
            type: 'payment',
            text: `Payment: NPR ${detailMatch[1]}/-`,
            time: getRelativeTime(paymentDate),
            timestamp: paymentDate,
            color: 'text-emerald-400',
          });
        }
      }
    }
  }

  // Sort by timestamp (most recent first)
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Take only the top 3
  const recentActivities = activities.slice(0, 3);

  if (recentActivities.length === 0) {
    return null;
  }

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'status': return Activity;
      case 'call': return Phone;
      case 'comment': return MessageSquare;
      case 'payment': return CreditCard;
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/5 p-4">
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Last Activities</div>
      <div className="space-y-2">
        {recentActivities.map((activity, i) => {
          const Icon = getIcon(activity.type);
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${
                activity.type === 'status' ? 'bg-blue-400' :
                activity.type === 'call' ? 'bg-green-400' :
                activity.type === 'comment' ? 'bg-slate-400' :
                'bg-emerald-400'
              }`} />
              <Icon className={`h-3.5 w-3.5 ${activity.color} shrink-0`} />
              <span className="text-white/80 flex-1 truncate">{activity.text}</span>
              <span className="text-white/40 text-xs shrink-0">{activity.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LastActivitiesSummary;
