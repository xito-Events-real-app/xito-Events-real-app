// API functions for My Accounts module
// Fetches credential data from the WTN ID PASSWORD sheet

import { supabase } from "@/integrations/supabase/client";
import { addMonths, parseISO, isValid, differenceInDays, format } from "date-fns";

export interface AccountData {
  rowNumber: number;
  accountType: string;      // Column A
  id: string;               // Column B
  password: string;         // Column C
  recoveryAccount: string;  // Column D
  registeredNumber: string; // Column E
  whoBoughtIt: string;      // Column F
  vendor: string;           // Column G
  vendorNumber: string;     // Column H
  vendorWhatsapp: string;   // Column I
  website: string;          // Column J
  instagram: string;        // Column K
  facebook: string;         // Column L
  dateOfPurchase: string;   // Column M
  validity: string;         // Column N (months)
  expiryDate: string;       // Column O
  price: string;            // Column P
}

// Parse various date formats from the spreadsheet
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
  
  // Try DD/MM/YYYY format
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    date = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
    if (isValid(date)) return date;
  }
  
  // Try native Date parsing as fallback
  date = new Date(dateStr);
  if (isValid(date)) return date;
  
  return null;
}

// Calculate expiry date from purchase date + validity months
export function calculateExpiryDate(purchaseDate: string, validityMonths: string): string {
  const months = parseInt(validityMonths, 10);
  if (isNaN(months) || months <= 0) return '';
  
  const date = parseDate(purchaseDate);
  if (!date) return '';
  
  const expiryDate = addMonths(date, months);
  return format(expiryDate, 'yyyy-MM-dd');
}

// Get the effective expiry date (from sheet or calculated)
export function getEffectiveExpiryDate(account: AccountData): string {
  if (account.expiryDate) return account.expiryDate;
  if (account.dateOfPurchase && account.validity) {
    return calculateExpiryDate(account.dateOfPurchase, account.validity);
  }
  return '';
}

// Get expiry status info
export function getExpiryStatus(account: AccountData): {
  status: 'active' | 'expiring' | 'expired' | 'unknown';
  daysRemaining: number | null;
  label: string;
  colorClass: string;
} {
  const expiryDateStr = getEffectiveExpiryDate(account);
  if (!expiryDateStr) {
    return { status: 'unknown', daysRemaining: null, label: 'Not set', colorClass: 'text-slate-400' };
  }
  
  const expiryDate = parseDate(expiryDateStr);
  if (!expiryDate) {
    return { status: 'unknown', daysRemaining: null, label: 'Invalid date', colorClass: 'text-slate-400' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(expiryDate, today);
  
  if (days < 0) {
    return { status: 'expired', daysRemaining: days, label: 'Expired', colorClass: 'text-red-400' };
  } else if (days <= 30) {
    return { status: 'expiring', daysRemaining: days, label: `${days}d left`, colorClass: 'text-amber-400' };
  } else {
    return { status: 'active', daysRemaining: days, label: 'Active', colorClass: 'text-green-400' };
  }
}

// Format price with NPR
export function formatPrice(price: string): string {
  if (!price) return '-';
  const num = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return price;
  return `NPR ${num.toLocaleString('en-IN')}`;
}

export async function getAccounts(limit = 500): Promise<AccountData[]> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: {
      action: 'getAccounts',
      limit,
    },
  });

  if (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch accounts');
  }

  return data.data || [];
}
