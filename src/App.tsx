import React, { useState, useEffect } from 'react';
import { Sun, Moon, Key, MessageSquare, Users, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import { PatientChat } from './components/PatientChat';
import { StaffDashboard } from './components/StaffDashboard';
import { getApiKey, setApiKey, removeApiKey } from './services/aiService';
import { Language, getTranslation } from './services/translations';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('patient_language');
      if (saved === 'en' || saved === 'hi' || saved === 'te') return saved;
    }
    return 'en';
  });

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('patient_language', newLang);
    }
  };

  const t = getTranslation(language);

  // Finalized Design: Option 1 (Cupertino Health & Dental)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-palette', '1');
      localStorage.setItem('active_palette', '1');
    }
  }, []);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getApiKey() || '');
  const [activeKey, setActiveKey] = useState<string | null>(() => getApiKey());

  // Staff authorization state - Staff console is accessible directly per specification
  const [isStaffAuthorized, setIsStaffAuthorized] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('staff_locked') !== 'true';
    }
    return true;
  });

  // Sync auth state on path change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsStaffAuthorized(sessionStorage.getItem('staff_locked') !== 'true');
    }
  }, [currentPath]);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Handle URL navigation & popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setActiveKey(apiKeyInput.trim());
    } else {
      removeApiKey();
      setActiveKey(null);
    }
    setApiKeyModal(false);
  };

  const handleRemoveKey = () => {
    removeApiKey();
    setActiveKey(null);
    setApiKeyInput('');
    setApiKeyModal(false);
  };

  const isStaff = currentPath === '/staff';

  return (
    <div 
      className="min-h-[100dvh] w-full flex flex-col font-sans transition-colors overflow-x-hidden antialiased"
      style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}
    >
      {/* 
        =======================================================================
        TOP VERTICAL MOBILE HEADER:
        Fits 100% of any mobile screen (375px, 390px, 412px) with zero overflow.
        Row 1: Brand Logo & Title on left | Gemini API Key & Theme Toggle on right.
        Row 2: Full-width segmented switcher between Patient Chat & Staff Console.
        =======================================================================
      */}
      <header 
        className="w-full max-w-md mx-auto border-b shrink-0 sticky top-0 z-40 shadow-xs"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      >
        {/* ROW 1: Logo & Utility Controls */}
        <div className="px-3 py-2 flex items-center justify-between">
          {/* Logo & Clinic Branding */}
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}
            >
              🦷
            </div>
            <div className="leading-tight">
              <span 
                className="font-sf font-black text-sm tracking-tight block"
                style={{ color: 'var(--text-primary)' }}
              >
                Bright Roots
              </span>
              <span 
                className="font-sf text-[10px] font-semibold block"
                style={{ color: 'var(--text-secondary)' }}
              >
                Dental Clinic • Banjara Hills
              </span>
            </div>
          </button>

          {/* Top Right Utilities: Staff Login (Patient Chat only) + Dark/Light Theme + (Gemini API ONLY when staff is logged in) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Gemini API Key Button - ONLY visible when staff is logged in */}
            {isStaff && isStaffAuthorized && (
              <button
                id="staff-gemini-key-btn"
                onClick={() => setApiKeyModal(true)}
                className="font-sf px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 shadow-2xs whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--chip-bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-primary)',
                }}
                title="Configure Gemini API Key"
              >
                <Key className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <span>Gemini Key</span>
              </button>
            )}

            {/* Staff Login Button - Relocated to top, EXACTLY left to the light/dark mode feature */}
            {/* Special attention styling: prominent badge, emerald live dot, bold border, strictly in English */}
            {/* Visible ONLY on patient chat (NOT shown when already on staff page) */}
            {!isStaff && (
              <button
                id="staff-login-tab-btn"
                data-testid="staff-login-btn"
                onClick={() => navigateTo('/staff')}
                className="font-sf px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all active:scale-95 shadow-xs whitespace-nowrap bg-primary/10 hover:bg-primary/20 text-primary dark:text-amber-300 border-primary/40 dark:border-amber-500/40 ring-1 ring-primary/20 hover:shadow-sm"
                title="Staff Portal Login"
                aria-label="Staff Login"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Staff Login</span>
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>
            )}

            {/* Dark / Light Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-xl border transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center active:scale-95 shadow-2xs"
              style={{
                backgroundColor: 'var(--nav-track-bg)',
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
              }}
              title="Toggle Light / Dark mode"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-900" />}
            </button>
          </div>
        </div>

        {/* ROW 2: Navigation Bar */}
        <div className="px-3 pb-2.5 pt-0.5">
          <div 
            className="flex items-center justify-between p-1 rounded-2xl border transition-colors"
            style={{ backgroundColor: 'var(--nav-track-bg)', borderColor: 'var(--card-border)' }}
          >
            {!isStaff ? (
              <>
                {/* Left: Patient Chat Tab on Patient Screen */}
                <button
                  id="patient-chat-tab-btn"
                  onClick={() => navigateTo('/')}
                  className="font-sf px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                  style={{
                    backgroundColor: 'var(--nav-active-bg)',
                    color: 'var(--nav-active-text)',
                  }}
                  title="Patient Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.patientChatTab}</span>
                </button>

                {/* Right: Language Change Feature ONLY on patient chat */}
                <div 
                  id="language-selector"
                  className="flex items-center p-0.5 rounded-xl border shrink-0 transition-colors shadow-2xs"
                  style={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--card-border)' 
                  }}
                  role="group"
                  aria-label="Language Selector"
                >
                  <button
                    id="lang-btn-en"
                    type="button"
                    data-lang="en"
                    onClick={() => handleLanguageChange('en')}
                    className={`font-sf px-2 py-1 text-[11px] font-bold rounded-lg transition-all active:scale-95 ${
                      language === 'en' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: language === 'en' ? 'var(--nav-active-bg)' : 'transparent',
                      color: language === 'en' ? 'var(--nav-active-text)' : 'var(--nav-inactive-text)',
                    }}
                    title="English"
                  >
                    English
                  </button>
                  <button
                    id="lang-btn-hi"
                    type="button"
                    data-lang="hi"
                    onClick={() => handleLanguageChange('hi')}
                    className={`font-sf px-2 py-1 text-[11px] font-bold rounded-lg transition-all active:scale-95 ${
                      language === 'hi' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: language === 'hi' ? 'var(--nav-active-bg)' : 'transparent',
                      color: language === 'hi' ? 'var(--nav-active-text)' : 'var(--nav-inactive-text)',
                    }}
                    title="हिन्दी (Hindi)"
                  >
                    Hindi
                  </button>
                  <button
                    id="lang-btn-te"
                    type="button"
                    data-lang="te"
                    onClick={() => handleLanguageChange('te')}
                    className={`font-sf px-2 py-1 text-[11px] font-bold rounded-lg transition-all active:scale-95 ${
                      language === 'te' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: language === 'te' ? 'var(--nav-active-bg)' : 'transparent',
                      color: language === 'te' ? 'var(--nav-active-text)' : 'var(--nav-inactive-text)',
                    }}
                    title="తెలుగు (Telugu)"
                  >
                    Telugu
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Staff Page: Single arrow button to move to Patient Chart */}
                <button
                  id="patient-chat-tab-btn"
                  onClick={() => navigateTo('/')}
                  className="font-sf px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                  style={{
                    backgroundColor: 'var(--nav-active-bg)',
                    color: 'var(--nav-active-text)',
                  }}
                  title="Move to Patient Chart"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Patient Chart</span>
                </button>

                {/* Staff Page: Status indicator (Language Selection is ONLY on patient chat) */}
                <div className="font-sf px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 text-primary dark:text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Staff Portal</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 
        =======================================================================
        CONTENT AREA:
        Directly beneath the header, perfectly fitting mobile phones vertically.
        =======================================================================
      */}
      <main className="flex-1 w-full flex flex-col justify-start items-center overflow-x-hidden">
        {isStaff ? (
          <StaffDashboard 
            onBackToChat={() => navigateTo('/')} 
            darkMode={darkMode}
            onAuthChange={(auth) => setIsStaffAuthorized(auth)}
            onOpenApiKeyModal={() => setApiKeyModal(true)}
          />
        ) : (
          <PatientChat darkMode={darkMode} language={language} />
        )}
      </main>

      {/* API Key Modal for Gemini */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-800 border border-khata-200 dark:border-zinc-700 rounded-3xl max-w-sm w-full p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-khata-200 dark:border-zinc-700">
              <h3 className="text-xs font-bold text-khata-900 dark:text-zinc-100 flex items-center gap-1.5 font-sf">
                <Key className="w-4 h-4 text-primary" />
                <span>Google Gemini AI Integration</span>
              </h3>
              <button
                onClick={() => setApiKeyModal(false)}
                className="text-khata-500 hover:text-khata-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-khata-700 dark:text-zinc-400 mb-3 leading-relaxed">
              Google Gemini API is currently connected. If you clear the key, the bot automatically answers offline from <span className="font-mono text-primary dark:text-amber-400">clinic-data.json</span> with the badge <span className="font-semibold text-khata-900 dark:text-zinc-200">Answered from the clinic file</span>.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-khata-600 dark:text-zinc-400 mb-1">
                  Gemini API Key:
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste Gemini API key or clear for offline mode"
                  className="w-full text-xs p-2.5 bg-khata-50 dark:bg-zinc-900 text-khata-900 dark:text-zinc-100 border border-khata-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="text-xs text-credit hover:text-red-800 font-semibold px-2 py-1.5 rounded-lg bg-credit-light dark:bg-red-950/40 border border-red-200 dark:border-red-900"
                >
                  Clear (Offline Mode)
                </button>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setApiKeyModal(false)}
                    className="text-xs px-3 py-1.5 text-khata-700 dark:text-zinc-400 hover:bg-khata-100 dark:hover:bg-zinc-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-xs"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
