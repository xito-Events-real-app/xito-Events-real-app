/**
 * Opens a WhatsApp chat URL using anchor element method.
 * This bypasses popup blockers that can occur in iframe/preview environments.
 */
export const openWhatsApp = (phoneNumber: string, message?: string) => {
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '').replace('+', '');
  
  if (!cleanNumber) return;
  
  const url = message 
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanNumber}`;
  
  // Use anchor element method to bypass popup blockers
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
