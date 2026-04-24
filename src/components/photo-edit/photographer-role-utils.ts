/**
 * Display + color helpers for photographer roles in the Photo Edit Tracker.
 * PB = Bride Side (rose), PG = Groom Side (sky), EP = Extra (amber).
 */
export type PhotographerRoleCode = "PB" | "PG" | "EP" | "";

export const ROLE_LABEL: Record<string, string> = {
  PB: "Bride Side",
  PG: "Groom Side",
  EP: "Extra",
};

export const ROLE_SHORT: Record<string, string> = {
  PB: "PB",
  PG: "PG",
  EP: "EP",
};

/** Tailwind classes for the role pill (light + dark mode safe). */
export const ROLE_PILL_CLASS: Record<string, string> = {
  PB: "bg-pink-100 text-pink-800 border border-pink-300 dark:bg-pink-950/50 dark:text-pink-200 dark:border-pink-800",
  PG: "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800",
  EP: "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800",
};

/** Short colored dot used in compact contexts. */
export const ROLE_DOT_CLASS: Record<string, string> = {
  PB: "bg-pink-500",
  PG: "bg-sky-500",
  EP: "bg-amber-500",
};

export function formatRole(code: string | null | undefined): string {
  const c = (code || "").toUpperCase();
  const label = ROLE_LABEL[c];
  return label ? `${label} (${c})` : "";
}

export const PHOTO_ROLE_CODES: PhotographerRoleCode[] = ["PB", "PG", "EP"];