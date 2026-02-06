/**
 * Opens a WhatsApp chat URL.
 * Uses window.open first (works outside iframes), falls back to anchor click method.
 */
export const openWhatsApp = (phoneNumber: string, message?: string) => {
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '').replace('+', '');
  
  if (!cleanNumber) return;
  
  const url = message 
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanNumber}`;
  
  // Try window.open first (works in production, may be blocked in iframes)
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  
  // Fallback: anchor element method for iframe environments
  if (!win) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
