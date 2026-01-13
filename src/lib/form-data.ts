// Priority countries for the country selector (shown first)
export const priorityCountries = [
  { code: "NP", name: "Nepal", dialCode: "+977" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "US", name: "USA", dialCode: "+1" },
  { code: "GB", name: "UK", dialCode: "+44" },
  { code: "NZ", name: "New Zealand", dialCode: "+64" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "MY", name: "Malaysia", dialCode: "+60" },
];

// All countries for the full country selector
export const allCountries = [
  // Priority countries first
  { code: "NP", name: "Nepal", dialCode: "+977" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "US", name: "USA", dialCode: "+1" },
  { code: "GB", name: "UK", dialCode: "+44" },
  { code: "NZ", name: "New Zealand", dialCode: "+64" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "MY", name: "Malaysia", dialCode: "+60" },
  // Rest of the countries
  { code: "AF", name: "Afghanistan", dialCode: "+93" },
  { code: "AL", name: "Albania", dialCode: "+355" },
  { code: "DZ", name: "Algeria", dialCode: "+213" },
  { code: "AR", name: "Argentina", dialCode: "+54" },
  { code: "AT", name: "Austria", dialCode: "+43" },
  { code: "BD", name: "Bangladesh", dialCode: "+880" },
  { code: "BE", name: "Belgium", dialCode: "+32" },
  { code: "BT", name: "Bhutan", dialCode: "+975" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "BN", name: "Brunei", dialCode: "+673" },
  { code: "KH", name: "Cambodia", dialCode: "+855" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "DK", name: "Denmark", dialCode: "+45" },
  { code: "EG", name: "Egypt", dialCode: "+20" },
  { code: "FI", name: "Finland", dialCode: "+358" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "GR", name: "Greece", dialCode: "+30" },
  { code: "HK", name: "Hong Kong", dialCode: "+852" },
  { code: "ID", name: "Indonesia", dialCode: "+62" },
  { code: "IE", name: "Ireland", dialCode: "+353" },
  { code: "IL", name: "Israel", dialCode: "+972" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "KE", name: "Kenya", dialCode: "+254" },
  { code: "KW", name: "Kuwait", dialCode: "+965" },
  { code: "LB", name: "Lebanon", dialCode: "+961" },
  { code: "MV", name: "Maldives", dialCode: "+960" },
  { code: "MX", name: "Mexico", dialCode: "+52" },
  { code: "MM", name: "Myanmar", dialCode: "+95" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "NG", name: "Nigeria", dialCode: "+234" },
  { code: "NO", name: "Norway", dialCode: "+47" },
  { code: "OM", name: "Oman", dialCode: "+968" },
  { code: "PK", name: "Pakistan", dialCode: "+92" },
  { code: "PH", name: "Philippines", dialCode: "+63" },
  { code: "PL", name: "Poland", dialCode: "+48" },
  { code: "PT", name: "Portugal", dialCode: "+351" },
  { code: "QA", name: "Qatar", dialCode: "+974" },
  { code: "RU", name: "Russia", dialCode: "+7" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "ZA", name: "South Africa", dialCode: "+27" },
  { code: "KR", name: "South Korea", dialCode: "+82" },
  { code: "ES", name: "Spain", dialCode: "+34" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94" },
  { code: "SE", name: "Sweden", dialCode: "+46" },
  { code: "CH", name: "Switzerland", dialCode: "+41" },
  { code: "TW", name: "Taiwan", dialCode: "+886" },
  { code: "TH", name: "Thailand", dialCode: "+66" },
  { code: "TR", name: "Turkey", dialCode: "+90" },
  { code: "AE", name: "UAE", dialCode: "+971" },
  { code: "VN", name: "Vietnam", dialCode: "+84" },
];

// Nepal cities outside valley
export const nepalCitiesOutsideValley = [
  "Pokhara", "Chitwan", "Biratnagar", "Birgunj", "Dharan", "Butwal",
  "Hetauda", "Janakpur", "Nepalgunj", "Dhangadhi", "Damak", "Itahari",
  "Bharatpur", "Tulsipur", "Ghorahi", "Siddharthanagar", "Bhairahawa",
  "Lumbini", "Dhulikhel", "Nagarkot"
];

// Inside valley cities
export const valleyCities = ["Kathmandu", "Bhaktapur", "Lalitpur"];

// Client location options
export const clientLocationOptions = ["INSIDE NEPAL", "OUTSIDE NEPAL"];

// Form field types
export interface FormSection {
  title: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "dropdown" | "phone" | "date" | "time" | "textarea" | "country" | "search";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  conditionalOn?: {
    field: string;
    value: string | string[];
  };
  maxLength?: number;
}

// Mock dropdown data (will be replaced with Google Sheets data)
export const mockDropdownData = {
  sources: [
    "FACEBOOK", "INSTAGRAM", "WHATSAPP", "OLD CLIENT", "REFERENCE",
    "WEDDING FAIR", "WEBSITE", "OTHER"
  ],
  whatsappOwners: ["Rajesh", "Suman", "Bikash", "Anita"],
  clientLocations: ["INSIDE NEPAL", "OUTSIDE NEPAL"],
  eventLocations: ["INSIDE VALLEY", "OUTSIDE VALLEY", "MIXED", "ABROAD"],
  eventTypes: {
    prewedding: ["Pre-Wedding Shoot", "Engagement Shoot", "Save the Date"],
    wedding: ["Wedding Day", "Reception", "Mehendi", "Haldi", "Sangeet"],
    postwedding: ["Post-Wedding Shoot", "Anniversary Shoot"]
  },
  teamMembers: ["Rajesh", "Suman", "Bikash", "Anita", "Prem"]
};
