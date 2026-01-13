// Priority countries for the country selector
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

// Nepal cities outside valley
export const nepalCitiesOutsideValley = [
  "Pokhara", "Chitwan", "Biratnagar", "Birgunj", "Dharan", "Butwal",
  "Hetauda", "Janakpur", "Nepalgunj", "Dhangadhi", "Damak", "Itahari",
  "Bharatpur", "Tulsipur", "Ghorahi", "Siddharthanagar", "Bhairahawa",
  "Lumbini", "Dhulikhel", "Nagarkot"
];

// Inside valley cities
export const valleyCities = ["Kathmandu", "Bhaktapur", "Lalitpur"];

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
  clientLocations: ["NEPAL", "ABROAD"],
  eventLocations: ["INSIDE VALLEY", "OUTSIDE VALLEY", "MIXED", "ABROAD"],
  eventTypes: {
    prewedding: ["Pre-Wedding Shoot", "Engagement Shoot", "Save the Date"],
    wedding: ["Wedding Day", "Reception", "Mehendi", "Haldi", "Sangeet"],
    postwedding: ["Post-Wedding Shoot", "Anniversary Shoot"]
  },
  teamMembers: ["Rajesh", "Suman", "Bikash", "Anita", "Prem"]
};
