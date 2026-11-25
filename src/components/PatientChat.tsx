import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, AlertTriangle, Clock } from 'lucide-react';
import { ClinicData, TicketMessage } from '../types';
import { getClinicData, onClinicDataChange } from '../services/clinicData';
import { generateClinicAnswer } from '../services/aiService';
import { createTicket, onTicketsChange } from '../services/ticketStore';
import { Language, getTranslation } from '../services/translations';

interface PatientChatProps {
  darkMode: boolean;
  language: Language;
}

export const PatientChat: React.FC<PatientChatProps> = ({ darkMode, language }) => {
  const t = getTranslation(language);
  const [clinicData, setClinicData] = useState<ClinicData>(getClinicData());
  const [messages, setMessages] = useState<TicketMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: getTranslation(language).welcomeMessage,
      timestamp: Date.now(),
      isFallback: true,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bright_roots_patient_session');
      if (saved) return saved;
      const newId = 'sess_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('bright_roots_patient_session', newId);
      return newId;
    }
    return 'sess_' + Math.random().toString(36).substring(2, 9);
  });
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bright_roots_active_ticket_id');
    }
    return null;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoQuestionExecuted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // When language changes, update the initial welcome message if present
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'welcome-1' ? { ...m, text: getTranslation(language).welcomeMessage } : m
      )
    );
  }, [language]);

  // Listen to live clinic data updates (e.g. staff edits)
  useEffect(() => {
    return onClinicDataChange((updatedData) => {
      setClinicData(updatedData);
    });
  }, []);

  // Listen to live ticket updates (e.g. staff replies)
  useEffect(() => {
    const handleTicketList = (tickets: import('../types').Ticket[]) => {
      const targetId = activeTicketId || (typeof window !== 'undefined' ? localStorage.getItem('bright_roots_active_ticket_id') : null);
      let currentTicket = targetId ? tickets.find((t) => t.id === targetId) : null;
      if (!currentTicket) {
        currentTicket = tickets.find((t) => t.patientSessionId === sessionId);
      }
      if (currentTicket) {
        if (!activeTicketId) {
          setActiveTicketId(currentTicket.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('bright_roots_active_ticket_id', currentTicket.id);
          }
        }
        const staffMsgs = currentTicket.messages.filter((m) => m.sender === 'staff');
        if (staffMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newStaff = staffMsgs.filter((m) => !existingIds.has(m.id));
            if (newStaff.length > 0) {
              return [...prev, ...newStaff];
            }
            return prev;
          });
        }
      }
    };

    const unsubscribe = onTicketsChange(handleTicketList);

    // Initial check on mount
    try {
      const raw = localStorage.getItem('bright_roots_tickets');
      if (raw) {
        handleTicketList(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }

    // Fast 500ms polling fallback for cross-tab realtime sync
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem('bright_roots_tickets');
        if (raw) {
          handleTicketList(JSON.parse(raw));
        }
      } catch (e) {
        // ignore
      }
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [activeTicketId, sessionId]);

  // Handle URL parameter ?q=<question> on load
  useEffect(() => {
    if (autoQuestionExecuted.current) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q && q.trim()) {
        autoQuestionExecuted.current = true;
        handleSendMessage(q.trim());
      }
    }
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!text) return;

    // Append patient message
    const patientMsg: TicketMessage = {
      id: 'msg_' + Date.now(),
      sender: 'patient',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, patientMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const currentData = getClinicData();
      const answer = await generateClinicAnswer(text, currentData);

      const botMsg: TicketMessage = {
        id: 'msg_bot_' + Date.now(),
        sender: 'bot',
        text: answer.text,
        timestamp: Date.now(),
        isFallback: answer.isFallback,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Create ticket for queue tracking
      const ticket = createTicket(
        {
          patientSessionId: sessionId,
          query: text,
          status: answer.status,
          bookingTime: answer.bookingTime,
        },
        answer.text,
        answer.isFallback
      );
      setActiveTicketId(ticket.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bright_roots_active_ticket_id', ticket.id);
      }
    } catch (e) {
      console.error(e);
      const fallbackMsg: TicketMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'bot',
        text: `I am not sure about this as it is not listed in our clinic file. I have opened a ticket for our front desk team, and someone will call back within 2 working hours.`,
        timestamp: Date.now(),
        isFallback: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      const ticket = createTicket(
        {
          patientSessionId: sessionId,
          query: text,
          status: 'needs human',
        },
        fallbackMsg.text,
        true
      );
      setActiveTicketId(ticket.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bright_roots_active_ticket_id', ticket.id);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickReplies = [
    t.quickReplies.consultation,
    t.quickReplies.saturdayHours,
    t.quickReplies.rootCanal,
    t.quickReplies.insurance,
    t.quickReplies.childrenDoctor,
    t.quickReplies.bookVisit,
    t.quickReplies.emergencyContact,
  ];

  return (
    <div 
      className="flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto border-x shadow-sm overflow-hidden"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      {/* Clinic Secondary Action Bar */}
      <div 
        className="font-sf px-3 py-1.5 border-b text-[11px] flex items-center justify-between shrink-0"
        style={{ backgroundColor: 'var(--hours-bg)', borderColor: 'var(--card-border)', color: 'var(--hours-text)' }}
      >
        <span className="flex items-center gap-1 truncate text-[10px]">
          <Clock className="w-3 h-3 shrink-0" style={{ color: 'var(--accent-primary)' }} />
          <span>{t.hoursPrefix}: {clinicData.hours.monday_to_saturday}</span>
        </span>
        <a
          id="emergency-call-btn"
          href={`tel:${clinicData.clinic.emergency_phone}`}
          className="font-sf px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-2xs shrink-0 transition-all active:scale-95"
          style={{ backgroundColor: 'var(--emergency-bg)', color: 'var(--emergency-text)' }}
          title="Emergency Dental Line - 24/7"
        >
          <Phone className="w-2.5 h-2.5" />
          <span id="emergency-phone-label">{t.emergencyPrefix}: {clinicData.clinic.emergency_phone}</span>
        </a>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          const isStaff = msg.sender === 'staff';
          const isPatient = msg.sender === 'patient';
          const isEmergency = msg.text.includes('EMERGENCY NUMBER') || msg.text.includes('EMERGENCY ALERT') || msg.text.includes('అత్యవసర నంబర్') || msg.text.includes('इमरजेंसी नंबर');

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
            >
              {/* Message Sender Header */}
              <span 
                className="font-sf text-[10px] mb-0.5 px-1 font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isPatient ? t.senderYou : isStaff ? t.senderStaff : t.senderBot}
              </span>

              {/* Message Bubble - NOTE: class bot-msg is REQUIRED on every bot reply */}
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-2xs border ${
                  isPatient
                    ? 'rounded-br-xs'
                    : isStaff
                    ? 'rounded-bl-xs bot-msg'
                    : isEmergency
                    ? 'rounded-bl-xs bot-msg'
                    : 'rounded-bl-xs bot-msg'
                }`}
                style={
                  isPatient
                    ? { backgroundColor: 'var(--accent-primary)', color: 'var(--accent-primary-text)', borderColor: 'transparent' }
                    : isStaff
                    ? { backgroundColor: 'var(--bubble-staff-bg)', color: 'var(--bubble-staff-text)', borderColor: 'var(--bubble-staff-border)' }
                    : isEmergency
                    ? { backgroundColor: 'var(--emergency-bg)', color: 'var(--emergency-text)', borderColor: 'transparent' }
                    : { backgroundColor: 'var(--bubble-bot-bg)', color: 'var(--bubble-bot-text)', borderColor: 'var(--bubble-bot-border)' }
                }
              >
                {/* Emergency banner inside bubble if emergency */}
                {isEmergency && (
                  <div className="font-sf flex items-center gap-1 font-extrabold text-xs mb-1 pb-1 border-b border-white/30">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.emergencyAlertTitle}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Transparency Badge when answered from clinic file */}
                {isBot && msg.isFallback && (
                  <div 
                    className="mt-1.5 pt-1 border-t flex items-center justify-between text-[10px]"
                    style={{ borderColor: isEmergency ? 'rgba(255,255,255,0.2)' : 'var(--card-border)' }}
                  >
                    <span 
                      className="clinic-file-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        backgroundColor: isEmergency ? 'rgba(255,255,255,0.2)' : 'var(--hours-bg)',
                        color: isEmergency ? '#ffffff' : 'var(--text-secondary)'
                      }}
                    >
                      <span>✓</span>
                      <span>{t.transparencyBadge}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] px-1 mb-0.5" style={{ color: 'var(--text-secondary)' }}>Front Desk</span>
            <div 
              className="rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs flex items-center space-x-1.5 bot-msg shadow-2xs border"
              style={{ backgroundColor: 'var(--bubble-bot-bg)', color: 'var(--text-secondary)', borderColor: 'var(--bubble-bot-border)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse delay-75"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse delay-150"></span>
              <span className="ml-1 text-[11px]">{t.checkingRecords}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick-Reply Action Chips - Fully Occupied, No Sideways Scroll */}
      <div 
        className="px-2.5 py-1.5 border-t flex flex-wrap gap-1.5 shrink-0"
        style={{ backgroundColor: 'var(--hours-bg)', borderColor: 'var(--card-border)' }}
      >
        {quickReplies.map((qr, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qr.query)}
            className="inline-flex items-center text-[11px] font-medium border px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-2xs"
            style={{ backgroundColor: 'var(--chip-bg)', color: 'var(--chip-text)', borderColor: 'var(--chip-border)' }}
          >
            <span>{qr.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Bar - NOTE: input #chat-input and button #chat-send are REQUIRED */}
      <div 
        className="p-2 border-t shrink-0"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      >
        <div className="flex items-center gap-1.5">
          <input
            id="chat-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.inputPlaceholder}
            className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none transition-all"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              color: 'var(--input-text)', 
              borderColor: 'var(--input-border)' 
            }}
            disabled={isTyping}
          />
          <button
            id="chat-send"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className="disabled:opacity-40 p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 min-w-[42px] min-h-[42px] shadow-xs"
            style={{ 
              backgroundColor: 'var(--accent-primary)', 
              color: 'var(--accent-primary-text)' 
            }}
            title={t.sendBtnTitle}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
