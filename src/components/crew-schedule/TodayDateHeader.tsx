import { getCurrentBSDate, nepaliMonthsEnglish } from "@/lib/nepali-date";
import { Calendar } from "lucide-react";

export default function TodayDateHeader() {
  const today = getCurrentBSDate();
  const bsMonth = nepaliMonthsEnglish[today.month - 1] || "";
  const adDate = new Date();
  const adFormatted = adDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur rounded-xl px-4 py-2">
      <Calendar className="w-4 h-4 text-violet-400" />
      <div className="text-center">
        <p className="text-sm font-semibold text-white">
          {today.day} {bsMonth} {today.year}
        </p>
        <p className="text-[10px] text-violet-400">{adFormatted}</p>
      </div>
    </div>
  );
}
