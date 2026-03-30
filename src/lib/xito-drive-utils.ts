import { BookedClientData } from "@/lib/sheets-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";

export interface XitoDriveFolder {
  name: string;
  path: string;
  childCount: number;
  type: "month-year" | "client" | "category" | "event" | "freelancer" | "leaf";
  colorAccent?: string;
}

export interface MonthYearGroup {
  key: string;
  label: string;
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

// ── Category definitions per module ──

/** XITO DRIVE (iDrive E2) — compressed photos only */
export const XITO_CATEGORIES = [
  { name: "Photos", color: "amber" },
] as const;

/** pCloud module — high-quality photos + videos */
export const PCLOUD_CATEGORIES = [
  { name: "Photos", color: "amber" },
  { name: "Videos", color: "red" },
] as const;

/** Barun's Research (pCloud CLIENT DETAILS) — admin/project folders */
export const RESEARCH_CATEGORIES = [
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

/** @deprecated Use XITO_CATEGORIES / PCLOUD_CATEGORIES / RESEARCH_CATEGORIES */
export function getClientCategories() {
  return [...XITO_CATEGORIES, ...PCLOUD_CATEGORIES, ...RESEARCH_CATEGORIES]
    .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);
}

export function getVideoSubfolders() {
  return VIDEO_SUBFOLDERS;
}

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

export function buildMonthYearGroups(clients: BookedClientData[]): MonthYearGroup[] {
  const groupMap = new Map<string, MonthYearGroup>();

  for (const client of clients) {
    const years = (client.eventYear || "").split("\n").filter(Boolean);
    const months = (client.eventMonth || "").split("\n").filter(Boolean);
    const events = (client.events || "").split("\n").filter(Boolean);
    const clientName = client.clientName || "Unknown Client";
    const regDate = client.registeredDateTimeAD || "";

    // Group events by their individual year-month
    const eventsByYearMonth = new Map<string, string[]>();
    const maxLen = Math.max(events.length, years.length, months.length, 1);

    for (let i = 0; i < maxLen; i++) {
      const ev = events[i];
      if (!ev) continue;
      const y = String(parseInt(years[i] || years[0] || "0"));
      const m = String(parseInt(months[i] || months[0] || "0")).padStart(2, "0");
      const key = `${y}-${m}`;
      if (!eventsByYearMonth.has(key)) eventsByYearMonth.set(key, []);
      eventsByYearMonth.get(key)!.push(ev);
    }

    // Place client into each relevant month group
    for (const [key, monthEvents] of eventsByYearMonth) {
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
        clientName,
        registeredDateTimeAD: regDate,
        events: monthEvents,
      });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => {
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    return b.monthNum - a.monthNum;
  });
}

export function getUniqueYears(groups: MonthYearGroup[]): string[] {
  const years = new Set(groups.map(g => g.year));
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
}

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

export function buildStoragePath(segments: string[]): string {
  return "/" + segments.map(s => s.replace(/[/\\]/g, "_")).join("/");
}

// ── Folder tree builders per module ──

const PCLOUD_ROOT = "WEDDING TALES NEPAL";
const RESEARCH_ROOT = "WEDDING TALES NEPAL CLIENT DETAILS";

/**
 * Build iDrive E2 folder tree — Photos only (XITO DRIVE).
 * E2 uses a dedicated bucket, so no root prefix is needed.
 * Paths: MAGH EVENTS 2082 / ClientName / Photos / Event / Photographer
 */
export function buildXitoFolderTree(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[]
): string[] {
  const paths: string[] = [];
  const groups = buildMonthYearGroups(clients);

  for (const group of groups) {
    const groupPath = group.label;
    paths.push(groupPath);

    for (const client of group.clients) {
      const clientPath = `${groupPath}/${client.clientName.replace(/[/\\]/g, "_")}`;
      paths.push(clientPath);

      // Photos only
      const photosPath = `${clientPath}/Photos`;
      paths.push(photosPath);
      for (const ev of client.events) {
        const evPath = `${photosPath}/${ev.replace(/[/\\]/g, "_")}`;
        paths.push(evPath);
        const { photographers } = getFreelancersForEvent(assignments, client.registeredDateTimeAD, ev);
        for (const p of photographers) {
          paths.push(`${evPath}/${p.replace(/[/\\]/g, "_")}`);
        }
      }
      paths.push(`${photosPath}/Selected`);
    }
  }

  return paths;
}

/**
 * Build pCloud folder tree — Photos + Videos under wedding-tales-nepal.
 */
export function buildPCloudFolderTree(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[]
): string[] {
  const paths: string[] = [PCLOUD_ROOT];
  const groups = buildMonthYearGroups(clients);

  for (const group of groups) {
    const groupPath = `${PCLOUD_ROOT}/${group.label}`;
    paths.push(groupPath);

    for (const client of group.clients) {
      const clientPath = `${groupPath}/${client.clientName.replace(/[/\\]/g, "_")}`;
      paths.push(clientPath);

      // Photos
      const photosPath = `${clientPath}/Photos`;
      paths.push(photosPath);
      for (const ev of client.events) {
        const evPath = `${photosPath}/${ev.replace(/[/\\]/g, "_")}`;
        paths.push(evPath);
        const { photographers } = getFreelancersForEvent(assignments, client.registeredDateTimeAD, ev);
        for (const p of photographers) {
          paths.push(`${evPath}/${p.replace(/[/\\]/g, "_")}`);
        }
      }
      paths.push(`${photosPath}/Selected`);

      // Videos
      const videosPath = `${clientPath}/Videos`;
      paths.push(videosPath);
      for (const sub of VIDEO_SUBFOLDERS) {
        paths.push(`${videosPath}/${sub}`);
      }
    }
  }

  return paths;
}

/**
 * Build pCloud folder tree — Research categories under CLIENT DETAILS.
 */
export function buildResearchFolderTree(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[]
): string[] {
  const paths: string[] = [RESEARCH_ROOT];
  const groups = buildMonthYearGroups(clients);

  for (const group of groups) {
    const groupPath = `${RESEARCH_ROOT}/${group.label}`;
    paths.push(groupPath);

    for (const client of group.clients) {
      const clientPath = `${groupPath}/${client.clientName.replace(/[/\\]/g, "_")}`;
      paths.push(clientPath);

      // Quotation (leaf)
      paths.push(`${clientPath}/Quotation`);
      // Payments (leaf)
      paths.push(`${clientPath}/Payments`);
      // Project Managers > events
      const pmPath = `${clientPath}/Project Managers`;
      paths.push(pmPath);
      for (const ev of client.events) {
        paths.push(`${pmPath}/${ev.replace(/[/\\]/g, "_")}`);
      }
      // Lightroom Catalog > events > photographers
      const lrPath = `${clientPath}/Lightroom Catalog`;
      paths.push(lrPath);
      for (const ev of client.events) {
        const evPath = `${lrPath}/${ev.replace(/[/\\]/g, "_")}`;
        paths.push(evPath);
        const { photographers } = getFreelancersForEvent(assignments, client.registeredDateTimeAD, ev);
        for (const p of photographers) {
          paths.push(`${evPath}/${p.replace(/[/\\]/g, "_")}`);
        }
      }
    }
  }

  return paths;
}

/** @deprecated Use buildXitoFolderTree, buildPCloudFolderTree, or buildResearchFolderTree */
export function buildFullFolderTree(
  clients: BookedClientData[],
  assignments: FreelancerAssignment[]
): string[] {
  return buildXitoFolderTree(clients, assignments);
}
