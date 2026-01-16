export enum AppStatus {
  LOCKED = 'LOCKED',
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  EMERGENCY = 'EMERGENCY'
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  notifyOnWarning: boolean;
  notifyOnEmergency: boolean;
  enableSMS: boolean;
  enableEmail: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  status: AppStatus;
  message: string;
}

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'months' | 'years';

export interface AppSettings {
  checkInIntervalValue: number; // The number part of the interval
  checkInIntervalUnit: TimeUnit; // The unit part
  warningGracePeriodMinutes: number; // Time between missed check-in and calling police
  pinCode: string;
  biometricEnabled: boolean;
  customSafetyMessage: string;
  autoCallPolice: boolean;
  theme: 'cyber' | 'ocean' | 'midnight' | 'contrast';
  liveTrackingEnabled: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export enum Tab {
  HOME = 'HOME',
  SETTINGS = 'SETTINGS',
  LOGS = 'LOGS'
}