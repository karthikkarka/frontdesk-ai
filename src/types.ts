export interface Doctor {
  name: string;
  role: string;
  days: string;
}

export interface Service {
  name: string;
  price: string;
  duration?: string;
  note?: string;
}

export interface ClinicHours {
  monday_to_saturday: string;
  sunday: string;
  lunch_break: string;
  public_holidays: string;
}

export interface ClinicInfo {
  name: string;
  address: string;
  landmark: string;
  phone: string;
  emergency_phone: string;
  whatsapp: string;
  languages: string[];
  parking: string;
}

export interface ClinicData {
  note?: string;
  clinic: ClinicInfo;
  hours: ClinicHours;
  doctors: Doctor[];
  services: Service[];
  policies: Record<string, string>;
  emergency_rules: string;
  bot_rules: string[];
}

export type TicketStatus = 'answered' | 'needs human' | 'urgent' | 'closed';

export interface TicketMessage {
  id: string;
  sender: 'patient' | 'bot' | 'staff';
  text: string;
  timestamp: number;
  isFallback?: boolean;
}

export interface Ticket {
  id: string;
  patientSessionId: string;
  patientName?: string;
  patientPhone?: string;
  query: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  bookingTime?: string;
  messages: TicketMessage[];
}
