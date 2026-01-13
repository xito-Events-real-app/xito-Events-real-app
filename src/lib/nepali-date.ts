// Nepali Date Converter Utilities
import NepaliDate from "nepali-date-converter";

export interface NepaliDateObject {
  year: number;
  month: number;
  day: number;
}

export interface DateConversion {
  ad: Date;
  bs: NepaliDateObject;
  bsFormatted: string;
}

// Nepali month names
export const nepaliMonths = [
  "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत"
];

export const nepaliMonthsEnglish = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

// Convert AD date to BS
export function adToBS(adDate: Date): NepaliDateObject {
  const nepaliDate = new NepaliDate(adDate);
  return {
    year: nepaliDate.getYear(),
    month: nepaliDate.getMonth() + 1, // NepaliDate months are 0-indexed
    day: nepaliDate.getDate(),
  };
}

// Convert BS to AD
export function bsToAD(year: number, month: number, day: number): Date {
  const nepaliDate = new NepaliDate(year, month - 1, day);
  return nepaliDate.toJsDate();
}

// Format BS date as string
export function formatBSDate(bs: NepaliDateObject): string {
  const monthName = nepaliMonthsEnglish[bs.month - 1];
  return `${bs.day} ${monthName} ${bs.year}`;
}

// Format BS date in Nepali
export function formatBSDateNepali(bs: NepaliDateObject): string {
  const monthName = nepaliMonths[bs.month - 1];
  return `${bs.day} ${monthName} ${bs.year}`;
}

// Get current BS date
export function getCurrentBSDate(): NepaliDateObject {
  return adToBS(new Date());
}

// BS calendar data for days in each month (2070-2090)
const bsDaysInMonth: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2084: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2086: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

// Get days in a BS month
export function getDaysInBSMonth(year: number, month: number): number {
  const yearData = bsDaysInMonth[year];
  if (yearData && month >= 1 && month <= 12) {
    return yearData[month - 1];
  }
  // Default fallback
  return month === 2 || month === 4 ? 32 : month >= 7 && month <= 9 ? 29 : 30;
}

// Get BS years range (for year picker)
export function getBSYearsRange(startOffset = -5, endOffset = 5): number[] {
  const currentYear = getCurrentBSDate().year;
  const years: number[] = [];
  for (let i = currentYear + startOffset; i <= currentYear + endOffset; i++) {
    years.push(i);
  }
  return years;
}

// Check if two BS dates are the same
export function isSameBSDate(a: NepaliDateObject, b: NepaliDateObject): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

// Convert date for display (both AD and BS)
export function convertDateForDisplay(adDate: Date): DateConversion {
  const bs = adToBS(adDate);
  return {
    ad: adDate,
    bs,
    bsFormatted: formatBSDate(bs),
  };
}
