import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";

export interface XitoDriveFolder {
  name: string;
  path: string; // e.g. "/2082-10/Ishan Shakya/Photos/Wedding/Nikit"
  childCount: number;
  type: "month-year" | "client" | "category" | "event" | "freelancer" | "leaf";
  colorAccent?: string;
}

export interface MonthYearGroup {
  key: string; // "2082-10"
  label: string; // "MAGH EVENTS 2082"
  year: string;
  month: string;
  monthNum: number;
  clients: ClientFolder[];
}

export interface ClientFolder {
  clientName: string;
  registeredDateTimeAD: string;
  events: string[];
}

export interface FreelancerAssignment {
  registered_date_time_ad: string;
  client_name: string | null;
  event: string;
  photographer_bride: string | null;
  photographer_groom: string | null;
  videographer_bride: string | null;
  videographer_groom: string | null;
  extra_photographer: string | null;
  extra_videographer: string | null;
  assistant: string | null;
  drone_operator: string | null;
  fpv_operator: string | null;
  iphone_shooter: string | null;
}

const CLIENT_CATEGORIES = [
  { name: "Photos", color: "amber" },
  { name: "Videos", color: "red" },
  { name: "Quotation", color: "blue" },
  { name: "Payments", color: "green" },
  { name: "Project Managers", color: "purple" },
  { name: "Lightroom Catalog", color: "orange" },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Photos: "from-amber-500 to-yellow-600",
  Videos: "from-red-500 to-rose-600",
  Quotation: "from-blue-500 to-indigo-600",
  Payments: "from-green-500 to-emerald-600",
  "Project Managers": "from-purple-500 to-violet-600",
  "Lightroom Catalog": "from-orange-500 to-amber-600",
};

const VIDEO_SUBFOLDERS = ["Highlights", "Reels", "Full Videos"];

export function getClientCategories() {
  return CLIENT_CATEGORIES;
}

export function getVideoSubfolders() {
  return VIDEO_SUBFOLDERS;
}

/**
 * Get the majority year-month from parallel arrays of years and months.
 * Picks the most frequent combo; ties go to first occurrence.
 */
export function getMajorityYearMonth(years: string[], months: string[]): string {
  const freq = new Map<string, number>();
  const order: string[] = [];
  const maxLen = Math.max(years.length, months.length, 1);
  for (let i = 0; i < maxLen; i++) {
    const y = String(parseInt(years[i] || years[0] || "0"));
    const m = String(parseInt(months[i] || months[0] || "0")).padStart(2, "0");
    const key = `${y}-${m}`;
    if (!freq.has(key)) order.push(key);
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  let best = order[0] || "0-00";
  let bestCount = 0;
  for (const k of order) {
    if ((freq.get(k) || 0) > bestCount) {
      best = k;
      bestCount = freq.get(k) || 0;
    }
  }
  return best;
}

/**
 * Build month-year groups from booked clients.
 * Each client is placed in exactly ONE group based on their majority month.
 */
export function buildMonthYearGroups(clients: BookedClientData[]): MonthYearGroup[] {
  const groupMap = new Map<string, MonthYearGroup>();

  for (const client of clients) {
    const years = (client.eventYear || "").split("\n").filter(Boolean);
    const months = (client.eventMonth || "").split("\n").filter(Boolean);
    const events = (client.events || "").split("\n").filter(Boolean);

    const key = getMajorityYearMonth(years, months);
    const [yearStr, monthStr] = key.split("-");
    const monthNum = parseInt(monthStr, 10);

    if (!groupMap.has(key)) {
      const monthName = NEPALI_MONTHS[monthNum] || `MONTH ${monthStr}`;
      groupMap.set(key, {
        key,
        label: `${monthName} EVENTS ${yearStr}`,
        year: yearStr,
        month: monthStr,
        monthNum,
        clients: [],
      });
    }

    groupMap.get(key)!.clients.push({
      clientName: client.clientName || "Unknown Client",
      registeredDateTimeAD: client.registeredDateTimeAD || "",
      events,
    });
  }

  // Sort: by year desc, then month desc
  return Array.from(groupMap.values()).sort((a, b) => {
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    return b.monthNum - a.monthNum;
  });
}

/**
 * Get unique years from groups for filter
 */
export function getUniqueYears(groups: MonthYearGroup[]): string[] {
  const years = new Set(groups.map(g => g.year));
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
}

/**
 * Get photographers/videographers assigned to a specific client+event
 */
export function getFreelancersForEvent(
  assignments: FreelancerAssignment[],
  registeredDateTimeAD: string,
  eventName: string
): { photographers: string[]; videographers: string[] } {
  const matching = assignments.filter(
    a => a.registered_date_time_ad === registeredDateTimeAD && a.event === eventName
  );

  const photographers = new Set<string>();
  const videographers = new Set<string>();

  for (const a of matching) {
    if (a.photographer_bride) photographers.add(a.photographer_bride);
    if (a.photographer_groom) photographers.add(a.photographer_groom);
    if (a.extra_photographer) photographers.add(a.extra_photographer);
    if (a.videographer_bride) videographers.add(a.videographer_bride);
    if (a.videographer_groom) videographers.add(a.videographer_groom);
    if (a.extra_videographer) videographers.add(a.extra_videographer);
  }

  return {
    photographers: Array.from(photographers).filter(Boolean),
    videographers: Array.from(videographers).filter(Boolean),
  };
}

/**
 * Build iDrive E2-compatible path for a given folder level
 */
export function buildStoragePath(segments: string[]): string {
  return "/" + segments.map(s => s.replace(/[/\\]/g, "_")).join("/");
}
