import { ClinicData } from '../types';
import rawClinicData from '../../clinic-data.json';

const STORAGE_KEY = 'bright_roots_clinic_data';
const SYNC_CHANNEL = 'clinic_sync';

const inMemoryClinicListeners = new Set<(data: ClinicData) => void>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
}

function notifyClinicChange(data: ClinicData) {
  inMemoryClinicListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error('Error notifying clinic listener:', e);
    }
  });
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'CLINIC_DATA_UPDATED', data });
    } catch (e) {
      console.error(e);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clinic_data_updated', { detail: data }));
  }
}

export function getInitialClinicData(): ClinicData {
  return rawClinicData as ClinicData;
}

export function getClinicData(): ClinicData {
  if (typeof window === 'undefined') {
    return rawClinicData as ClinicData;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load clinic data from storage:', e);
  }
  return rawClinicData as ClinicData;
}

export function updateClinicData(newData: ClinicData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    notifyClinicChange(newData);
  } catch (e) {
    console.error('Failed to save clinic data:', e);
  }
}

export function resetClinicData(): ClinicData {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    notifyClinicChange(rawClinicData as ClinicData);
  }
  return rawClinicData as ClinicData;
}

export function onClinicDataChange(callback: (data: ClinicData) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  inMemoryClinicListeners.add(callback);

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'CLINIC_DATA_UPDATED' || event.data?.type === 'CLINIC_DATA_RESET') {
      callback(event.data.data);
    }
  };

  const customHandler = (e: Event) => {
    const ce = e as CustomEvent<ClinicData>;
    if (ce.detail) {
      callback(ce.detail);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handler);
  }
  window.addEventListener('clinic_data_updated', customHandler);

  return () => {
    inMemoryClinicListeners.delete(callback);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handler);
    }
    window.removeEventListener('clinic_data_updated', customHandler);
  };
}
