// Device Handler Memory System
// Remembers which handler uses this device for auto-redirect
// Expires after 24 hours

const HANDLER_KEY = 'wtn_device_handler';
const HANDLER_TIMESTAMP_KEY = 'wtn_device_handler_set_at';
const EXPIRY_HOURS = 24;

export interface DeviceHandler {
  name: string;
  setAt: string;
}

export const saveDeviceHandler = (handlerName: string): void => {
  localStorage.setItem(HANDLER_KEY, handlerName);
  localStorage.setItem(HANDLER_TIMESTAMP_KEY, new Date().toISOString());
};

export const getDeviceHandler = (): DeviceHandler | null => {
  const name = localStorage.getItem(HANDLER_KEY);
  const setAt = localStorage.getItem(HANDLER_TIMESTAMP_KEY);
  
  if (!name) return null;
  
  return {
    name,
    setAt: setAt || new Date().toISOString()
  };
};

export const clearDeviceHandler = (): void => {
  localStorage.removeItem(HANDLER_KEY);
  localStorage.removeItem(HANDLER_TIMESTAMP_KEY);
};

export const hasDeviceHandler = (): boolean => {
  return !!localStorage.getItem(HANDLER_KEY);
};

// Check if device handler is still valid (within 24 hours)
export const isDeviceHandlerValid = (): boolean => {
  const name = localStorage.getItem(HANDLER_KEY);
  const setAt = localStorage.getItem(HANDLER_TIMESTAMP_KEY);
  
  if (!name || !setAt) return false;
  
  const setDate = new Date(setAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - setDate.getTime()) / (1000 * 60 * 60);
  
  // Expired after 24 hours - auto-clear
  if (hoursDiff >= EXPIRY_HOURS) {
    clearDeviceHandler();
    return false;
  }
  
  return true;
};

// Get remaining hours until expiry
export const getHandlerExpiryHours = (): number | null => {
  const setAt = localStorage.getItem(HANDLER_TIMESTAMP_KEY);
  if (!setAt) return null;
  
  const setDate = new Date(setAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - setDate.getTime()) / (1000 * 60 * 60);
  const remaining = EXPIRY_HOURS - hoursDiff;
  
  return remaining > 0 ? Math.round(remaining) : 0;
};
