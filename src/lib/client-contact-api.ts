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
  
  // Form tracking (Column AB)
  formSentDate: string;  // ISO date when form link was sent via WhatsApp
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
  formSentDate: '',
};

// Generate the in-app form URL for a client
// This URL is completely isolated - clients can only see the form
export function getClientFormUrl(registeredDateTimeAD: string): string {
  const encodedId = encodeURIComponent(registeredDateTimeAD);
  // Use published URL for production
  return `https://wtnclienttracker.lovable.app/client-form/${encodedId}`;
}

// Generate WhatsApp message with form link
export function generateFormWhatsAppMessage(registeredDateTimeAD: string): string {
  const formUrl = getClientFormUrl(registeredDateTimeAD);
  return `Hello 👋
Greetings from Wedding Tales Nepal 💍✨

To help us plan and coordinate your event smoothly, we kindly request you to fill in the contact details using the form link below.

The information will be used only for wedding coordination purposes (communication, location access, and scheduling) and will be kept strictly confidential.

👉 Please fill the form at your convenience:
${formUrl}

If you have any questions or face any difficulty while filling the form, feel free to contact us anytime.

Thank you for choosing Wedding Tales Nepal — we're excited to be a part of your special journey ❤️

Warm regards,
Wedding Tales Nepal
📞 Contact: 9705255025 / 9749494560 / 9847335279`;
}

// Get relative time from date string
export function getRelativeTime(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
