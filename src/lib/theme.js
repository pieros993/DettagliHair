import config from '../config/app.config';

export const theme = config.theme;
export const appConfig = config.app;
export const bookingConfig = config.booking;
export const features = config.features;

// Helper per colori con opacità
export function withOpacity(hex, opacity) {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, '0');
}