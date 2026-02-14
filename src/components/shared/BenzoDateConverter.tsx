import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { adToBS, bsToAD, nepaliMonthsEnglish, getCurrentBSDate } from "@/lib/nepali-date";

const ENGLISH_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const ENGLISH_MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
];

function parseInput(raw: string): { type: "bs" | "ad"; monthIndex: number; day: number; year?: number } | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  // Try Nepali month match first
  for (let i = 0; i < nepaliMonthsEnglish.length; i++) {
    const name = nepaliMonthsEnglish[i].toLowerCase();
    if (trimmed.startsWith(name)) {
      const rest = trimmed.slice(name.length).trim();
      const parts = rest.split(/\s+/).filter(Boolean);
      const day = parseInt(parts[0]);
      if (!day || day < 1 || day > 32) return null;
      const year = parts[1] ? parseInt(parts[1]) : undefined;
      return { type: "bs", monthIndex: i, day, year: year && year > 2000 ? year : undefined };
    }
  }

  // Try English month match
  for (let i = 0; i < ENGLISH_MONTHS.length; i++) {
    const full = ENGLISH_MONTHS[i];
    const short = ENGLISH_MONTHS_SHORT[i];
    if (trimmed.startsWith(full) || trimmed.startsWith(short)) {
      const matchLen = trimmed.startsWith(full) ? full.length : short.length;
      const rest = trimmed.slice(matchLen).trim();
      const parts = rest.split(/\s+/).filter(Boolean);
      const day = parseInt(parts[0]);
      if (!day || day < 1 || day > 31) return null;
      const year = parts[1] ? parseInt(parts[1]) : undefined;
      return { type: "ad", monthIndex: i, day, year: year && year > 1900 ? year : undefined };
    }
  }

  return null;
}

function formatEnglishMonth(monthIndex: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
}

export function BenzoDateConverter() {
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    const parsed = parseInput(input);
    if (!parsed) return null;

    try {
      if (parsed.type === "bs") {
        // Nepali input → convert to AD
        const currentBS = getCurrentBSDate();
        let year = parsed.year || currentBS.year;

        // Future-bias: if no year specified and date is past, bump year
        if (!parsed.year) {
          const adResult = bsToAD(year, parsed.monthIndex + 1, parsed.day);
          if (adResult instanceof Date && adResult < new Date(new Date().setHours(0, 0, 0, 0))) {
            year += 1;
          }
        }

        const adDate = bsToAD(year, parsed.monthIndex + 1, parsed.day);
        if (!(adDate instanceof Date)) return null;

        const monthName = nepaliMonthsEnglish[parsed.monthIndex];
        const adMonth = formatEnglishMonth(adDate.getMonth());
        const adDay = adDate.getDate();
        const adYear = adDate.getFullYear();

        return {
          main: `${monthName} ${parsed.day}`,
          bracket: `${adMonth} ${adDay}, ${adYear}`,
        };
      } else {
        // English input → convert to BS
        const now = new Date();
        let year = parsed.year || now.getFullYear();

        // Future-bias: if no year specified and date is past, bump year
        if (!parsed.year) {
          const testDate = new Date(year, parsed.monthIndex, parsed.day);
          if (testDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            year += 1;
          }
        }

        const adDate = new Date(year, parsed.monthIndex, parsed.day);
        const bs = adToBS(adDate);
        const bsMonthName = nepaliMonthsEnglish[bs.month - 1];

        const adMonth = formatEnglishMonth(parsed.monthIndex);

        return {
          main: `${adMonth} ${parsed.day}`,
          bracket: `${bsMonthName} ${bs.day}, ${bs.year}`,
        };
      }
    } catch {
      return null;
    }
  }, [input]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-xl border border-violet-900/40">
      <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Magh 25 or Feb 24..."
        className="h-7 bg-transparent border-none text-white placeholder:text-slate-500 text-sm px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {result && (
        <div className="shrink-0 flex items-center gap-1.5 text-sm whitespace-nowrap">
          <span className="font-semibold text-white">{result.main}</span>
          <span className="text-slate-400 text-xs">({result.bracket})</span>
        </div>
      )}
    </div>
  );
}
