// API functions for My Accounts module
// Fetches credential data from the WTN ID PASSWORD sheet

import { supabase } from "@/integrations/supabase/client";

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
