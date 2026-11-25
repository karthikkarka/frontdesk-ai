import { Ticket, TicketMessage, TicketStatus } from '../types';

const STORAGE_KEY = 'bright_roots_tickets';
const SYNC_CHANNEL = 'ticket_sync';

const inMemoryListeners = new Set<(tickets: Ticket[]) => void>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
}

const DEFAULT_INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TICK-EMERG01',
    patientSessionId: 'sess_init_1',
    query: 'My face is swelling and I cannot breathe properly',
    status: 'urgent',
    createdAt: Date.now() - 1000 * 60 * 15,
    updatedAt: Date.now() - 1000 * 60 * 15,
    messages: [
      {
        id: 'msg_init_1a',
        sender: 'patient',
        text: 'My face is swelling and I cannot breathe properly',
        timestamp: Date.now() - 1000 * 60 * 15,
      },
      {
        id: 'msg_init_1b',
        sender: 'bot',
        text: 'EMERGENCY NUMBER: 98000 00123. Please call our emergency dental line right away! Severe or unbearable pain, swelling of the face/neck, heavy bleeding, or breathing difficulty requires immediate care. Please call 98000 00123 or visit the nearest emergency hospital immediately.',
        timestamp: Date.now() - 1000 * 60 * 15 + 1000,
        isFallback: true,
      }
    ]
  },
  {
    id: 'TICK-HUMAN02',
    patientSessionId: 'sess_init_2',
    query: 'Do you do Invisalign?',
    status: 'needs human',
    createdAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now() - 1000 * 60 * 45,
    messages: [
      {
        id: 'msg_init_2a',
        sender: 'patient',
        text: 'Do you do Invisalign?',
        timestamp: Date.now() - 1000 * 60 * 45,
      },
      {
        id: 'msg_init_2b',
        sender: 'bot',
        text: 'I am not sure about this as it is not listed in our clinic file. I have opened a ticket for our front desk team, and someone will call back within 2 working hours.',
        timestamp: Date.now() - 1000 * 60 * 45 + 1000,
        isFallback: true,
      }
    ]
  },
  {
    id: 'TICK-ANS03',
    patientSessionId: 'sess_init_3',
    query: 'What time do you open on Saturday?',
    status: 'answered',
    createdAt: Date.now() - 1000 * 60 * 120,
    updatedAt: Date.now() - 1000 * 60 * 120,
    messages: [
      {
        id: 'msg_init_3a',
        sender: 'patient',
        text: 'What time do you open on Saturday?',
        timestamp: Date.now() - 1000 * 60 * 120,
      },
      {
        id: 'msg_init_3b',
        sender: 'bot',
        text: 'On Saturday, Bright Roots Dental is open from 9:00 am to 8:00 pm.',
        timestamp: Date.now() - 1000 * 60 * 120 + 1000,
        isFallback: true,
      }
    ]
  }
];

function notifyUpdate(tickets: Ticket[]) {
  // 1. Immediately notify all local listeners in the current window / component tree
  inMemoryListeners.forEach((callback) => {
    try {
      callback(tickets);
    } catch (err) {
      console.error('Error in local ticket listener:', err);
    }
  });

  // 2. Broadcast across tabs and windows
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'TICKETS_UPDATED', tickets });
    } catch (e) {
      console.error('BroadcastChannel error:', e);
    }
  }

  // 3. Dispatch window-level event
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tickets_updated', { detail: tickets }));
    } catch (e) {
      // ignore
    }
  }
}

export function getTickets(): Ticket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read tickets from storage:', e);
  }
  // Initialize default seed tickets if storage is empty
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_TICKETS));
  } catch (e) {
    // ignore
  }
  return [...DEFAULT_INITIAL_TICKETS];
}

export function saveTickets(tickets: Ticket[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    notifyUpdate(tickets);
  } catch (e) {
    console.error('Failed to save tickets:', e);
  }
}

export function createTicket(
  ticketData: {
    patientSessionId: string;
    query: string;
    status: TicketStatus;
    bookingTime?: string;
    patientName?: string;
    patientPhone?: string;
  },
  initialBotReply?: string,
  isFallback?: boolean
): Ticket {
  const tickets = getTickets();
  const now = Date.now();
  const ticketId = 'TICK-' + Math.random().toString(36).substring(2, 9).toUpperCase();

  const messages: TicketMessage[] = [
    {
      id: 'MSG-' + Math.random().toString(36).substring(2, 7),
      sender: 'patient',
      text: ticketData.query,
      timestamp: now,
    },
  ];

  if (initialBotReply) {
    messages.push({
      id: 'MSG-' + Math.random().toString(36).substring(2, 7),
      sender: 'bot',
      text: initialBotReply,
      timestamp: now + 50,
      isFallback: !!isFallback,
    });
  }

  const newTicket: Ticket = {
    id: ticketId,
    patientSessionId: ticketData.patientSessionId,
    query: ticketData.query,
    status: ticketData.status,
    bookingTime: ticketData.bookingTime,
    patientName: ticketData.patientName,
    patientPhone: ticketData.patientPhone,
    createdAt: now,
    updatedAt: now,
    messages,
  };

  tickets.unshift(newTicket);
  saveTickets(tickets);
  return newTicket;
}

export function addStaffReply(ticketId: string, replyText: string): Ticket | null {
  const tickets = getTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  const now = Date.now();
  const ticket = tickets[index];

  const newMsg: TicketMessage = {
    id: 'MSG-' + Math.random().toString(36).substring(2, 7),
    sender: 'staff',
    text: replyText,
    timestamp: now,
  };

  ticket.messages.push(newMsg);
  ticket.status = 'answered';
  ticket.updatedAt = now;

  tickets[index] = ticket;
  saveTickets(tickets);
  return ticket;
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): Ticket | null {
  const tickets = getTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  tickets[index].status = status;
  tickets[index].updatedAt = Date.now();
  saveTickets(tickets);
  return tickets[index];
}

export function onTicketsChange(callback: (tickets: Ticket[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Register in-memory callback for instant same-window updates
  inMemoryListeners.add(callback);

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'TICKETS_UPDATED') {
      callback(event.data.tickets);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCustom = (e: Event) => {
    const ce = e as CustomEvent<Ticket[]>;
    if (ce.detail) {
      callback(ce.detail);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('storage', handleStorage);
  window.addEventListener('tickets_updated', handleCustom);

  return () => {
    inMemoryListeners.delete(callback);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('tickets_updated', handleCustom);
  };
}
