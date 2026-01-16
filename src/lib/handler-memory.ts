// Device Handler Memory System
// Remembers which handler uses this device for auto-redirect

const HANDLER_KEY = 'wtn_device_handler';
const HANDLER_TIMESTAMP_KEY = 'wtn_device_handler_set_at';

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
