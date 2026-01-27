import { useState } from "react";
import { Calendar } from "lucide-react";
import { adToBS, formatBSDate } from "@/lib/nepali-date";
import { parseISO, isValid, format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClickableDateWithBSProps {
  dateString: string;
  className?: string;
  showIcon?: boolean;
}

// Parse various date formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  let date = parseISO(dateStr);
  if (isValid(date)) return date;
  
  // Try MM/DD/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    date = new Date(parseInt(mdyMatch[3]), parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
    if (isValid(date)) return date;
  }
  
  // Try native Date parsing as fallback
  date = new Date(dateStr);
  if (isValid(date)) return date;
  
  return null;
}

export function ClickableDateWithBS({ 
  dateString, 
  className = "", 
  showIcon = true 
}: ClickableDateWithBSProps) {
  const [showBS, setShowBS] = useState(false);

  if (!dateString) {
    return <span className={className}>-</span>;
  }

  const parsedDate = parseDate(dateString);
  
  if (!parsedDate) {
    return <span className={className}>{dateString}</span>;
  }

  // Format AD date
  const adFormatted = format(parsedDate, 'MMM dd, yyyy');
  
  // Convert to BS
  const bsDate = adToBS(parsedDate);
  const bsFormatted = formatBSDate(bsDate);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBS(!showBS);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={`inline-flex items-center gap-1.5 hover:text-pink-400 transition-colors cursor-pointer ${className}`}
          >
            {showIcon && <Calendar className="h-3.5 w-3.5 text-slate-500" />}
            <span className={showBS ? 'text-pink-400' : ''}>
              {showBS ? bsFormatted : adFormatted}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="bg-slate-800 border-slate-700 text-white"
          side="top"
        >
          <div className="text-xs">
            <p className="font-medium">{showBS ? 'AD:' : 'BS:'} {showBS ? adFormatted : bsFormatted}</p>
            <p className="text-slate-400 text-[10px] mt-1">Click to toggle</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
