// Client Contact Details API types and utilities
// Maps to "BOOKED CLIENTS CONTACT DETAILS" sheet (Columns A-AA)

export interface ClientContactDetails {
  rowNumber: number;
  
  // Synced from BOOKED CLIENTS (Columns A-C)
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  
  // Bride Details (Columns D-O)
  brideFullName: string;
  brideContactNumber: string;
  brideWhatsappNumber: string;
  brideBackupNumber: string;
  brideBackupRelation: string;  // Mother / Father / Sister / Other
  brideBackupNumber2: string;
  brideBackupRelation2: string;
  brideInstagram: string;       // Without @
  brideHomeCity: string;
  brideHomeArea: string;
  brideHomeMap: string;         // Google Maps link
  brideHomeLandmark: string;
  
  // Groom Details (Columns P-AA)
  groomFullName: string;
  groomContactNumber: string;
  groomWhatsappNumber: string;
  groomBackupNumber: string;
  groomBackupRelation: string;  // Father / Brother / Other
  groomBackupNumber2: string;
  groomBackupRelation2: string;
  groomInstagram: string;       // Without @
  groomHomeCity: string;
  groomHomeArea: string;
  groomHomeMap: string;         // Google Maps link
  groomHomeLandmark: string;
}

// Empty contact details for new clients
export const emptyContactDetails: Omit<ClientContactDetails, 'rowNumber' | 'registeredDateTimeAD' | 'registeredDateBS' | 'clientName'> = {
  brideFullName: '',
  brideContactNumber: '',
  brideWhatsappNumber: '',
  brideBackupNumber: '',
  brideBackupRelation: '',
  brideBackupNumber2: '',
  brideBackupRelation2: '',
  brideInstagram: '',
  brideHomeCity: '',
  brideHomeArea: '',
  brideHomeMap: '',
  brideHomeLandmark: '',
  groomFullName: '',
  groomContactNumber: '',
  groomWhatsappNumber: '',
  groomBackupNumber: '',
  groomBackupRelation: '',
  groomBackupNumber2: '',
  groomBackupRelation2: '',
  groomInstagram: '',
  groomHomeCity: '',
  groomHomeArea: '',
  groomHomeMap: '',
  groomHomeLandmark: '',
};

// Bride backup relation options
export const brideBackupRelationOptions = ['Mother', 'Father', 'Sister', 'Other'];

// Groom backup relation options
export const groomBackupRelationOptions = ['Father', 'Brother', 'Other'];

// Check if contact details have any filled data
export function hasFilledContactDetails(details: ClientContactDetails | null): boolean {
  if (!details) return false;
  return !!(
    details.brideFullName ||
    details.brideContactNumber ||
    details.brideWhatsappNumber ||
    details.brideInstagram ||
    details.brideHomeCity ||
    details.groomFullName ||
    details.groomContactNumber ||
    details.groomWhatsappNumber ||
    details.groomInstagram ||
    details.groomHomeCity
  );
}

// Format phone number for WhatsApp link
export function formatWhatsAppLink(phone: string): string {
  if (!phone) return '';
  // Remove non-digits except + at start
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `https://wa.me/${cleaned.replace('+', '')}`;
}

// Format Instagram link
export function formatInstagramLink(handle: string): string {
  if (!handle) return '';
  // Remove @ if present
  const cleanHandle = handle.replace(/^@/, '');
  return `https://instagram.com/${cleanHandle}`;
}
