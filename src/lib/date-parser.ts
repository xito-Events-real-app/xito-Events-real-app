// Bilingual Date Parser Utility
// Parses dates from voice/text in both Nepali and English

// Nepali numeral to Arabic numeral mapping
const nepaliDigitMap: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

// Convert Nepali numerals to Arabic numbers
export function nepaliToNumber(str: string): number {
  const arabicStr = str.split('').map(char => nepaliDigitMap[char] || char).join('');
  return parseInt(arabicStr, 10);
}

// Convert number to Nepali numerals
export function numberToNepali(num: number): string {
  const arabicToNepali: Record<string, string> = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
  };
  return String(num).split('').map(char => arabicToNepali[char] || char).join('');
}

// Nepali month patterns (both Devanagari and transliterated)
const nepaliMonthPatterns: { pattern: RegExp; month: number }[] = [
  { pattern: /बैशाख|baisakh|baishakh/i, month: 1 },
  { pattern: /जेठ|jestha|jeth/i, month: 2 },
  { pattern: /असार|ashar|asar|ashadh/i, month: 3 },
  { pattern: /साउन|shrawan|saun|sawan/i, month: 4 },
  { pattern: /भदौ|bhadra|bhadau/i, month: 5 },
  { pattern: /असोज|ashwin|asoj|ashoj/i, month: 6 },
  { pattern: /कार्तिक|kartik/i, month: 7 },
  { pattern: /मंसिर|mangsir|mansir/i, month: 8 },
  { pattern: /पौष|poush|push/i, month: 9 },
  { pattern: /माघ|magh/i, month: 10 },
  { pattern: /फाल्गुन|falgun|phalgun/i, month: 11 },
  { pattern: /चैत|chaitra|chait/i, month: 12 },
];

// English month patterns
const englishMonthPatterns: { pattern: RegExp; month: number }[] = [
  { pattern: /jan(uary)?/i, month: 1 },
  { pattern: /feb(ruary)?/i, month: 2 },
  { pattern: /mar(ch)?/i, month: 3 },
  { pattern: /apr(il)?/i, month: 4 },
  { pattern: /may/i, month: 5 },
  { pattern: /jun(e)?/i, month: 6 },
  { pattern: /jul(y)?/i, month: 7 },
  { pattern: /aug(ust)?/i, month: 8 },
  { pattern: /sep(t(ember)?)?/i, month: 9 },
  { pattern: /oct(ober)?/i, month: 10 },
  { pattern: /nov(ember)?/i, month: 11 },
  { pattern: /dec(ember)?/i, month: 12 },
];

// Detect if input contains Nepali characters
export function containsNepaliChars(input: string): boolean {
  // Devanagari Unicode range: \u0900-\u097F
  return /[\u0900-\u097F]/.test(input);
}

// Keywords that indicate asking for conversion
const nepaliToEnglishKeywords = [
  'अंग्रेजी', 'english', 'ad', 'gregorian', 'इंग्लिश',
];

const englishToNepaliKeywords = [
  'nepali', 'नेपाली', 'bs', 'bikram', 'sambat', 'बिक्रम', 'संवत',
];

// "Today" patterns
const todayPatterns = [
  /आज/i, /today/i, /aaj/i, /aaja/i,
];

export interface ParsedDateResult {
  language: 'nepali' | 'english';
  targetCalendar: 'BS' | 'AD'; // What they want the result in
  year?: number;
  month?: number;
  day?: number;
  isToday: boolean;
  confidence: number;
}

export function parseDateFromInput(input: string): ParsedDateResult {
  const hasNepali = containsNepaliChars(input);
  const lowerInput = input.toLowerCase();
  
  // Detect language based on content
  const language: 'nepali' | 'english' = hasNepali ? 'nepali' : 'english';
  
  // Determine what calendar they want the result in
  let targetCalendar: 'BS' | 'AD';
  
  // If speaking Nepali, they likely want English date
  // If speaking English, they likely want Nepali date
  if (language === 'nepali') {
    // But check if they explicitly asked for something
    const asksForEnglish = nepaliToEnglishKeywords.some(kw => input.includes(kw));
    const asksForNepali = englishToNepaliKeywords.some(kw => input.includes(kw));
    targetCalendar = asksForNepali ? 'BS' : 'AD';
  } else {
    const asksForNepali = englishToNepaliKeywords.some(kw => lowerInput.includes(kw));
    const asksForEnglish = nepaliToEnglishKeywords.some(kw => lowerInput.includes(kw));
    targetCalendar = asksForEnglish ? 'AD' : 'BS';
  }
  
  // Check for "today"
  const isToday = todayPatterns.some(pattern => pattern.test(input));
  
  if (isToday) {
    return {
      language,
      targetCalendar,
      isToday: true,
      confidence: 0.95,
    };
  }
  
  // Extract date components
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  
  // Try to find Nepali month names
  for (const { pattern, month: m } of nepaliMonthPatterns) {
    if (pattern.test(input)) {
      month = m;
      // If we found a Nepali month, the source is BS
      break;
    }
  }
  
  // Try to find English month names (only if no Nepali month found)
  if (!month) {
    for (const { pattern, month: m } of englishMonthPatterns) {
      if (pattern.test(input)) {
        month = m;
        break;
      }
    }
  }
  
  // Extract numbers from input
  // First, convert any Nepali numerals
  let normalizedInput = input;
  Object.entries(nepaliDigitMap).forEach(([nepali, arabic]) => {
    normalizedInput = normalizedInput.replace(new RegExp(nepali, 'g'), arabic);
  });
  
  // Find all numbers
  const numbers = normalizedInput.match(/\d+/g)?.map(n => parseInt(n, 10)) || [];
  
  // Heuristics for year/month/day
  numbers.forEach(num => {
    if (num >= 1900 && num <= 2100) {
      // Likely AD year
      year = num;
    } else if (num >= 2050 && num <= 2150) {
      // Likely BS year
      year = num;
    } else if (num >= 1 && num <= 31 && !day) {
      day = num;
    } else if (num >= 1 && num <= 12 && !month) {
      month = num;
    }
  });
  
  // If we have a 4-digit number in typical BS range, it's BS year
  const hasBSYear = year && year >= 2050 && year <= 2150;
  const hasADYear = year && year >= 1900 && year <= 2100 && !hasBSYear;
  
  // Adjust target calendar based on what we found
  if (hasBSYear && targetCalendar === 'BS') {
    // They gave BS date asking for BS - they probably want AD
    targetCalendar = 'AD';
  } else if (hasADYear && targetCalendar === 'AD') {
    // They gave AD date asking for AD - they probably want BS
    targetCalendar = 'BS';
  }
  
  return {
    language,
    targetCalendar,
    year,
    month,
    day,
    isToday: false,
    confidence: (year ? 0.3 : 0) + (month ? 0.3 : 0) + (day ? 0.2 : 0) + 0.2,
  };
}

// Get Nepali month name
export function getNepaliMonthName(month: number): string {
  const names = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
    'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  return names[month - 1] || '';
}

// Get English month name
export function getEnglishMonthName(month: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[month - 1] || '';
}
