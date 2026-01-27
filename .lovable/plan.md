
## Add Dropdowns and Vendor Management to Add Account Form

This plan implements searchable dropdowns for the Add Account form that fetch data from specific sheets, along with automatic vendor management that saves new vendors and auto-fills existing vendor details.

---

### Overview of Data Flow

```text
+-------------------------+     +------------------------+     +-------------------------+
| WTN SECRETS SETUP DATA  |     | WTN SECRETS VENDOR INFO|     | WTN ID PASSWORD         |
| Col A: Account Types    |     | Col A: Vendor Name     |     | Col G: Vendor Name      |
| Col B: Who Bought It    |     | Col B: Vendor Number   |     | Col H: Vendor Number    |
|                         |     | Col C: Vendor WhatsApp |     | Col I: Vendor WhatsApp  |
|                         |     | Col D: Website         |     | Col J: Website          |
|                         |     | Col E: Instagram       |     | Col K: Instagram        |
|                         |     | Col F: Facebook        |     | Col L: Facebook         |
+-------------------------+     +------------------------+     +-------------------------+
           |                              |                              ^
           |                              |                              |
           +------------> AddAccountDrawer <-------------------------------+
                          - Fetches dropdown options
                          - Checks if vendor exists
                          - Auto-fills vendor details
                          - Saves new vendor if needed
                          - Submits account to WTN ID PASSWORD
```

---

### Sheet Structure Summary

**WTN SECRETS SETUP DATA** (dropdown options):
| Column | Content |
|--------|---------|
| A | Account Types (ADOBE, NETFLIX, etc.) |
| B | Who Bought It (team member names) |

**WTN SECRETS VENDOR INFO** (vendor database):
| Column | Content |
|--------|---------|
| A | Vendor Name |
| B | Vendor Number |
| C | Vendor WhatsApp |
| D | Website |
| E | Instagram |
| F | Facebook |

**WTN ID PASSWORD** (accounts with vendor info):
| Column | Content |
|--------|---------|
| G | Vendor Name |
| H | Vendor Number |
| I | Vendor WhatsApp |
| J | Website |
| K | Instagram |
| L | Facebook |

---

### Implementation Steps

#### 1. Edge Function Updates
**File:** `supabase/functions/google-sheets/index.ts`

Add 3 new actions to fetch dropdown data and manage vendors:

**A. `getAccountSetupData` action**
- Fetches from "WTN SECRETS SETUP DATA" sheet
- Returns: `{ accountTypes: string[], whoBoughtIt: string[] }`

**B. `getSecretsVendors` action**
- Fetches all vendors from "WTN SECRETS VENDOR INFO" sheet (A2:F)
- Returns array of vendor objects with name, number, whatsapp, website, instagram, facebook

**C. `addSecretsVendor` action**
- Adds a new vendor row to "WTN SECRETS VENDOR INFO" sheet
- Appends to end of sheet (not insert at row 2)

**D. Update `addAccount` action**
- Before adding account, check if vendor is new
- If new vendor, save to "WTN SECRETS VENDOR INFO" first
- Then add account with vendor details to "WTN ID PASSWORD"

---

#### 2. API Layer Updates
**File:** `src/lib/accounts-api.ts`

Add new functions:

```typescript
// Vendor data interface
export interface VendorInfo {
  vendorName: string;
  vendorNumber: string;
  vendorWhatsapp: string;
  website: string;
  instagram: string;
  facebook: string;
}

// Fetch dropdown options for form
export async function getAccountSetupData(): Promise<{
  accountTypes: string[];
  whoBoughtIt: string[];
}>

// Fetch all vendors from vendor info sheet
export async function getSecretsVendors(): Promise<VendorInfo[]>

// Add a new vendor
export async function addSecretsVendor(vendor: VendorInfo): Promise<boolean>
```

---

#### 3. AddAccountDrawer Component Updates
**File:** `src/components/accounts/AddAccountDrawer.tsx`

**A. Add State for Dropdown Data**
- `accountTypes: string[]` - from setup data
- `whoBoughtIt: string[]` - from setup data  
- `vendors: VendorInfo[]` - from vendor info sheet
- `isLoadingDropdowns: boolean` - loading state

**B. Fetch Dropdown Data on Mount**
- Call `getAccountSetupData()` for account types and buyers
- Call `getSecretsVendors()` for vendor list
- Store in component state

**C. Replace Input Fields with Searchable Dropdowns**

| Field | Current | New |
|-------|---------|-----|
| Account Type | Input | FormCombobox with options from setup data |
| Who Bought It | Input | FormCombobox with options from setup data |
| Vendor Name | Input | FormCombobox with vendor names + auto-fill logic |

**D. Vendor Selection Logic**
When user selects a vendor from dropdown:
1. Check if vendor exists in `vendors` array
2. If exists: Auto-fill vendor number, whatsapp, website, instagram, facebook
3. If new name: Keep fields editable for user to enter details

**E. Form Submission Logic**
When user submits:
1. Check if vendor name is new (not in existing vendors list)
2. If new vendor:
   - Call `addSecretsVendor()` to save vendor to "WTN SECRETS VENDOR INFO"
   - Then call `addAccount()` with full data
3. If existing vendor:
   - Just call `addAccount()` as normal

---

### Technical Details

#### Edge Function: getAccountSetupData

```typescript
async function getAccountSetupData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'WTN SECRETS SETUP DATA'!A2:B100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await response.json();
  if (!data.values) return { accountTypes: [], whoBoughtIt: [] };
  
  const rows = data.values;
  return {
    accountTypes: rows.map((r: string[]) => r[0]).filter(Boolean),  // Column A
    whoBoughtIt: rows.map((r: string[]) => r[1]).filter(Boolean),   // Column B
  };
}
```

#### Edge Function: getSecretsVendors

```typescript
async function getSecretsVendors(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'WTN SECRETS VENDOR INFO'!A2:F500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await response.json();
  if (!data.values) return [];
  
  return data.values.map((row: string[]) => ({
    vendorName: row[0] || '',
    vendorNumber: row[1] || '',
    vendorWhatsapp: row[2] || '',
    website: row[3] || '',
    instagram: row[4] || '',
    facebook: row[5] || '',
  }));
}
```

#### Edge Function: addSecretsVendor

```typescript
async function addSecretsVendor(accessToken: string, spreadsheetId: string, vendorData: Record<string, unknown>) {
  const rowData = [
    vendorData.vendorName || '',
    vendorData.vendorNumber || '',
    vendorData.vendorWhatsapp || '',
    vendorData.website || '',
    vendorData.instagram || '',
    vendorData.facebook || '',
  ];
  
  // Append to end of sheet
  const range = encodeURIComponent("'WTN SECRETS VENDOR INFO'!A:F");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  return { success: true };
}
```

#### Component: Vendor Auto-fill Logic

```typescript
const handleVendorChange = (vendorName: string) => {
  handleChange('vendor', vendorName);
  
  // Find existing vendor
  const existingVendor = vendors.find(
    v => v.vendorName.toLowerCase() === vendorName.toLowerCase()
  );
  
  if (existingVendor) {
    // Auto-fill vendor details
    setFormData(prev => ({
      ...prev,
      vendor: vendorName,
      vendorNumber: existingVendor.vendorNumber,
      vendorWhatsapp: existingVendor.vendorWhatsapp,
      website: existingVendor.website,
      instagram: existingVendor.instagram,
      facebook: existingVendor.facebook,
    }));
  } else {
    // Clear vendor details for new vendor
    setFormData(prev => ({
      ...prev,
      vendor: vendorName,
      vendorNumber: '',
      vendorWhatsapp: '',
      website: '',
      instagram: '',
      facebook: '',
    }));
  }
};
```

---

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/google-sheets/index.ts` | Modify | Add `getAccountSetupData`, `getSecretsVendors`, `addSecretsVendor` actions |
| `src/lib/accounts-api.ts` | Modify | Add `VendorInfo` interface and new API functions |
| `src/components/accounts/AddAccountDrawer.tsx` | Modify | Replace inputs with dropdowns, add vendor auto-fill logic |

---

### User Experience Flow

1. User opens Add Account form
2. Form fetches dropdown options and vendor list on mount (shows loading spinner)
3. User types in "Account Type" field - gets searchable dropdown with suggestions
4. User types in "Who Bought It" field - gets searchable dropdown with team members
5. User types in "Vendor Name" field:
   - If vendor exists: Fields auto-fill with saved vendor info
   - If new vendor: Fields remain empty for user to enter
6. User fills remaining fields and submits
7. If vendor is new:
   - Vendor saved to "WTN SECRETS VENDOR INFO" sheet
   - Account saved to "WTN ID PASSWORD" sheet with vendor details
8. If vendor exists:
   - Account saved directly with existing vendor details

---

### Edge Cases Handled

1. **Empty setup data**: If sheets have no data, dropdowns allow free-text entry
2. **Case-insensitive vendor matching**: "Prime Nepal" matches "PRIME NEPAL"
3. **Partial vendor match**: Shows suggestions as user types
4. **Network errors**: Shows error toast and allows retry
5. **Loading state**: Shows skeleton/spinner while fetching dropdown options
