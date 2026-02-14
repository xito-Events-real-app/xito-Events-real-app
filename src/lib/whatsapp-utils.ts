/**
 * Opens a WhatsApp chat URL.
 * Tries window.top.open (escapes iframes), then window.open, then anchor click,
 * then falls back to location.href as last resort.
 */
export const openWhatsApp = (phoneNumber: string, message?: string) => {
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '').replace('+', '');
  
  if (!cleanNumber) return;
  
  const url = message 
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanNumber}`;
  
  // Try window.top.open first (escapes iframe sandbox)
  try {
    const win = window.top?.open(url, '_blank', 'noopener,noreferrer');
    if (win) return;
  } catch {}

  // Try window.open
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) return;
  } catch {}

  // Fallback: anchor element method
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
