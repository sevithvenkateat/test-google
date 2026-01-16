import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, 
  Settings as SettingsIcon, 
  Phone, 
  MapPin, 
  AlertTriangle,
  CheckCircle, 
  Menu,
  Activity,
  Battery,
  Pencil,
  Trash2,
  Plus,
  Mail,
  Fingerprint,
  Palette,
  History,
  Radio,
  Share2,
  Clock,
  MessageSquare,
  AtSign
} from 'lucide-react';
import { AppStatus, AppSettings, Contact, UserLocation, Tab, LogEntry, TimeUnit } from './types';
import { LockScreen } from './components/LockScreen';
import { CountdownTimer } from './components/CountdownTimer';
import { ContactEditor } from './components/ContactEditor';
import { VoiceRecorder } from './components/VoiceRecorder';
import { generateEmergencyMessage, generateSafetyTips } from './services/geminiService';
import { haptic } from './utils/haptics';

// --- Theme Definitions ---
const THEMES = {
  cyber: {
    name: 'Cyber Dark',
    bg: 'bg-black',
    card: 'bg-slate-900',
    border: 'border-slate-800',
    text: 'text-white',
    textSub: 'text-slate-400',
    primary: 'emerald',
    primaryText: 'text-emerald-500',
    primaryBg: 'bg-emerald-600',
    navActive: 'text-emerald-400',
    navBg: 'bg-slate-900',
  },
  ocean: {
    name: 'Deep Ocean',
    bg: 'bg-slate-950',
    card: 'bg-slate-900',
    border: 'border-slate-800',
    text: 'text-sky-50',
    textSub: 'text-slate-400',
    primary: 'cyan',
    primaryText: 'text-cyan-400',
    primaryBg: 'bg-cyan-600',
    navActive: 'text-cyan-400',
    navBg: 'bg-slate-900',
  },
  midnight: {
    name: 'Midnight Purple',
    bg: 'bg-neutral-950',
    card: 'bg-neutral-900',
    border: 'border-neutral-800',
    text: 'text-purple-50',
    textSub: 'text-neutral-400',
    primary: 'purple',
    primaryText: 'text-purple-400',
    primaryBg: 'bg-purple-600',
    navActive: 'text-purple-400',
    navBg: 'bg-neutral-900',
  },
  contrast: {
    name: 'High Contrast',
    bg: 'bg-white',
    card: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-black',
    textSub: 'text-gray-600',
    primary: 'blue',
    primaryText: 'text-blue-700',
    primaryBg: 'bg-blue-700',
    navActive: 'text-blue-700',
    navBg: 'bg-gray-100',
  }
};

// --- Constants & Default State ---
const DEFAULT_SETTINGS: AppSettings = {
  checkInIntervalValue: 30,
  checkInIntervalUnit: 'minutes',
  warningGracePeriodMinutes: 60,
  pinCode: '1234',
  biometricEnabled: true,
  customSafetyMessage: "I haven't checked in. Please verify my safety.",
  autoCallPolice: true,
  theme: 'cyber',
  liveTrackingEnabled: true,
};

const MOCK_CONTACTS: Contact[] = [
  { 
    id: '1', 
    name: 'Mom', 
    phone: '555-0101', 
    email: 'mom@example.com', 
    notifyOnWarning: true, 
    notifyOnEmergency: true,
    enableSMS: true,
    enableEmail: true
  },
  { 
    id: '2', 
    name: 'Partner', 
    phone: '555-0102', 
    email: 'partner@example.com', 
    notifyOnWarning: true, 
    notifyOnEmergency: true,
    enableSMS: true,
    enableEmail: false
  },
];

// Helper for time conversion
const getDurationInMs = (value: number, unit: TimeUnit): number => {
    const minute = 60000;
    switch(unit) {
        case 'minutes': return value * minute;
        case 'hours': return value * minute * 60;
        case 'days': return value * minute * 60 * 24;
        case 'months': return value * minute * 60 * 24 * 30; // Approx 30 days
        case 'years': return value * minute * 60 * 24 * 365; // Approx 365 days
        default: return value * minute;
    }
};

export default function App() {
  // --- State ---
  const [status, setStatus] = useState<AppStatus>(AppStatus.LOCKED);
  const [isLocked, setIsLocked] = useState(true);
  const [isVerifyingReset, setIsVerifyingReset] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Data
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  
  // Timers
  const [lastCheckIn, setLastCheckIn] = useState<number>(Date.now());
  const [nextCheckInDeadline, setNextCheckInDeadline] = useState<number>(() => Date.now() + getDurationInMs(DEFAULT_SETTINGS.checkInIntervalValue, DEFAULT_SETTINGS.checkInIntervalUnit));
  const [emergencyDeadline, setEmergencyDeadline] = useState<number | null>(null);
  
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(1);
  const [safetyTip, setSafetyTip] = useState<string>("");
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  
  const liveTrackingInterval = useRef<number | null>(null);

  // Contact Editor State
  const [isContactEditorOpen, setIsContactEditorOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Derived Values
  const currentTheme = THEMES[settings.theme];

  // --- Effects ---

  // Initialize Battery & Geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
        },
        (err) => console.error("Location error", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }

    const interval = setInterval(() => {
        setBatteryLevel(prev => Math.max(0, prev - 0.001));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    generateSafetyTips().then(setSafetyTip);
  }, []);

  // Main State Machine Logic
  useEffect(() => {
    const checkStatus = () => {
      const now = Date.now();
      if (status === AppStatus.EMERGENCY) return;

      if (status === AppStatus.SAFE && now > nextCheckInDeadline) {
        triggerWarning();
      }

      if (status === AppStatus.WARNING && emergencyDeadline && now > emergencyDeadline) {
        triggerEmergency();
      }
    };

    const intervalId = setInterval(checkStatus, 1000);
    return () => clearInterval(intervalId);
  }, [status, nextCheckInDeadline, emergencyDeadline]);

  // Live Tracking Logic
  useEffect(() => {
    if (status === AppStatus.EMERGENCY && settings.liveTrackingEnabled) {
        if (!liveTrackingInterval.current) {
            // Send immediately
            broadcastLocation();
            // Then every 30 seconds
            liveTrackingInterval.current = window.setInterval(broadcastLocation, 30000);
        }
    } else {
        if (liveTrackingInterval.current) {
            clearInterval(liveTrackingInterval.current);
            liveTrackingInterval.current = null;
        }
    }
    return () => {
        if (liveTrackingInterval.current) {
            clearInterval(liveTrackingInterval.current);
        }
    };
  }, [status, settings.liveTrackingEnabled, location]);

  // --- Helper ---
  const addLog = (status: AppStatus, message: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      status,
      message
    }, ...prev]);
  };

  const broadcastLocation = () => {
      if (location) {
          console.log(`[LIVE TRACKING] Sending coords: ${location.latitude}, ${location.longitude}`);
          addLog(AppStatus.EMERGENCY, `📍 Live Location Sent: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
      }
  };

  const simulateDispatch = (type: 'SMS' | 'EMAIL' | 'CALL', recipient: string, content: string, hasAttachment = false) => {
      setTimeout(() => {
          let logMsg = `📤 [${type}] Sent to ${recipient}`;
          if (type === 'CALL') logMsg = `📞 [CALL] Dialing ${recipient}... Playing automated msg + recording.`;
          if (hasAttachment) logMsg += " 📎(Voice Attached)";
          
          addLog(AppStatus.EMERGENCY, logMsg);
          haptic.tap();
      }, Math.random() * 2000 + 500); // Simulate network delay
  };

  // --- Handlers ---

  const triggerWarning = useCallback(() => {
    setStatus(AppStatus.WARNING);
    const graceMs = settings.warningGracePeriodMinutes * 60 * 1000;
    setEmergencyDeadline(Date.now() + graceMs);
    
    addLog(AppStatus.WARNING, "Check-in deadline missed. Warning Phase started.");
    haptic.warning();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('LifeLine Alert', {
        body: 'Please check in! Emergency contacts will be notified soon.',
        icon: '/vite.svg'
      });
    }
  }, [settings.warningGracePeriodMinutes]);

  const triggerEmergency = useCallback(async () => {
    setStatus(AppStatus.EMERGENCY);
    addLog(AppStatus.EMERGENCY, "SOS Triggered. Emergency protocols initiated.");
    haptic.sos();
    
    // 1. Generate Content
    const textMessage = await generateEmergencyMessage(
      settings.customSafetyMessage,
      location,
      batteryLevel
    );

    // 2. Dispatch to Contacts
    let dispatchCount = 0;
    contacts.forEach(contact => {
        if (contact.notifyOnEmergency) {
            // SMS Channel
            if (contact.enableSMS && contact.phone) {
                simulateDispatch('SMS', contact.phone, textMessage, !!voiceRecording);
                dispatchCount++;
            }
            // Email Channel
            if (contact.enableEmail && contact.email) {
                simulateDispatch('EMAIL', contact.email, textMessage, !!voiceRecording);
                dispatchCount++;
            }
            // Voice Call (Always attempt if phone exists during emergency)
            if (contact.phone) {
                simulateDispatch('CALL', contact.phone, "Automated Alert", !!voiceRecording);
                dispatchCount++;
            }
        }
    });

    // 3. Dispatch to Police (Simulated)
    if (settings.autoCallPolice) {
        simulateDispatch('CALL', '911', "Automated Safety Alert", !!voiceRecording);
        simulateDispatch('SMS', '911', textMessage);
        dispatchCount += 2;
    }
    
    if (dispatchCount === 0) {
         addLog(AppStatus.EMERGENCY, "⚠️ No active contacts or channels configured for dispatch.");
    }

  }, [settings.customSafetyMessage, location, batteryLevel, contacts, voiceRecording, settings.autoCallPolice]);

  const handleCheckIn = () => {
    haptic.button();
    // If we are in EMERGENCY state, require authentication to reset
    if (status === AppStatus.EMERGENCY) {
      setIsVerifyingReset(true);
      return;
    }

    // Otherwise, just reset normally
    performCheckInReset();
  };

  const performCheckInReset = () => {
    const now = Date.now();
    setLastCheckIn(now);
    
    // Calculate new deadline based on unit
    const duration = getDurationInMs(settings.checkInIntervalValue, settings.checkInIntervalUnit);
    setNextCheckInDeadline(now + duration);
    
    const wasEmergency = status === AppStatus.EMERGENCY;
    addLog(AppStatus.SAFE, wasEmergency ? "Emergency Reset: User marked Safe" : "Routine Check-in Confirmed");
    haptic.success();

    setStatus(AppStatus.SAFE);
    setEmergencyDeadline(null);
    setIsVerifyingReset(false); // Close auth modal if open
  };

  const handleSOS = () => {
    haptic.button();
    triggerEmergency();
  };

  const unlockApp = () => {
    setIsLocked(false);
  };

  // Contact Handlers
  const openAddContact = () => {
    setEditingContact(null);
    setIsContactEditorOpen(true);
  };

  const openEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsContactEditorOpen(true);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleSaveContact = (contact: Contact) => {
    if (editingContact) {
      setContacts(contacts.map(c => c.id === contact.id ? contact : c));
    } else {
      setContacts([...contacts, contact]);
    }
    setIsContactEditorOpen(false);
    setEditingContact(null);
  };

  // --- Render Helpers ---

  // Handle Lock Screens
  if (isLocked) {
    return <LockScreen 
      pin={settings.pinCode} 
      biometricEnabled={settings.biometricEnabled} 
      onUnlock={unlockApp} 
      themeColor={currentTheme.primary}
    />;
  }

  if (isVerifyingReset) {
    return <LockScreen 
      pin={settings.pinCode} 
      biometricEnabled={settings.biometricEnabled} 
      onUnlock={performCheckInReset}
      title="Verify Identity to Disable Emergency"
      themeColor={currentTheme.primary}
    />;
  }

  const renderHome = () => (
    <div className="flex flex-col h-full relative">
      {/* Header Info */}
      <div className={`${currentTheme.card} p-4 rounded-b-3xl shadow-lg ${currentTheme.border} border-b z-10 transition-colors duration-300`}>
        <div className="flex justify-between items-center mb-4">
            <h1 className={`text-xl font-bold ${currentTheme.text} flex items-center gap-2`}>
                <Shield className={currentTheme.primaryText} /> LifeLine
            </h1>
            <div className={`flex items-center gap-2 text-xs ${currentTheme.textSub} ${currentTheme.bg} px-3 py-1 rounded-full border border-opacity-10 border-white`}>
                <Battery size={14} className={batteryLevel < 0.2 ? 'text-red-500' : currentTheme.primaryText} />
                {Math.round(batteryLevel * 100)}%
            </div>
        </div>
        
        <div className={`flex items-center gap-2 ${currentTheme.textSub} text-sm`}>
           <MapPin size={16} />
           {location ? (
               <span className="truncate max-w-[200px]">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
           ) : (
               <span className="animate-pulse">Acquiring GPS...</span>
           )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start gap-8 no-scrollbar">
        
        {/* Status Indicator */}
        <div className="w-full transition-all duration-300">
            {status === AppStatus.SAFE && (
                <div className={`bg-${currentTheme.primary}-500/10 border border-${currentTheme.primary}-500/30 p-4 rounded-2xl flex items-center gap-4`}>
                    <CheckCircle className={`${currentTheme.primaryText} w-8 h-8 flex-shrink-0`} />
                    <div>
                        <h3 className={`font-bold ${currentTheme.primaryText}`}>You are Safe</h3>
                        <p className={`text-xs ${currentTheme.textSub}`}>Monitoring active. Check-in required soon.</p>
                    </div>
                </div>
            )}
             {status === AppStatus.WARNING && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                    <AlertTriangle className="text-yellow-500 w-8 h-8 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-yellow-500">Missed Check-in</h3>
                        <p className={`text-xs ${currentTheme.textSub}`}>Grace period active. Police will be called in 1 hour.</p>
                    </div>
                </div>
            )}
            {status === AppStatus.EMERGENCY && (
                <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <AlertTriangle className="text-red-500 w-8 h-8 flex-shrink-0 animate-bounce" />
                        <div>
                            <h3 className="font-bold text-red-500">EMERGENCY TRIGGERED</h3>
                            <p className={`text-xs ${currentTheme.text}`}>Alerts dispatched to contacts & authorities.</p>
                        </div>
                    </div>
                    {settings.liveTrackingEnabled && (
                        <div className="mt-2 text-xs bg-red-500/20 text-red-200 p-2 rounded flex items-center gap-2 border border-red-500/30">
                            <Radio size={12} className="animate-pulse" /> Live Tracking Active (Sent every 30s)
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Timers */}
        <div className="flex-1 flex flex-col justify-center w-full min-h-[200px]">
            {status === AppStatus.SAFE && (
                <CountdownTimer 
                    targetTime={nextCheckInDeadline} 
                    totalDuration={getDurationInMs(settings.checkInIntervalValue, settings.checkInIntervalUnit)}
                    label="Next Check-In"
                    color={`stroke-${currentTheme.primary}-500`}
                />
            )}
            {status === AppStatus.WARNING && emergencyDeadline && (
                <CountdownTimer 
                     targetTime={emergencyDeadline} 
                     totalDuration={settings.warningGracePeriodMinutes * 60000}
                     label="Police Dispatch In"
                     color="stroke-yellow-500"
                 />
            )}
            {status === AppStatus.EMERGENCY && (
                 <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-40 h-40 rounded-full bg-red-600 animate-ping absolute opacity-20"></div>
                    <div className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center relative z-10 shadow-2xl shadow-red-900 mb-6">
                        <span className="text-white font-bold text-2xl">SOS</span>
                    </div>
                    <p className={`text-center ${currentTheme.textSub} max-w-xs text-xs`}>
                        Sending location, text, and voice data...
                    </p>
                 </div>
            )}
        </div>
        
        {/* The Big Button */}
        <button
            onClick={handleCheckIn}
            className={`w-full py-6 rounded-2xl font-bold text-xl shadow-lg transform transition-all active:scale-95 touch-manipulation
                ${status === AppStatus.EMERGENCY 
                    ? 'bg-slate-700 text-slate-400' 
                    : `${currentTheme.primaryBg} hover:opacity-90 text-white`
                }`}
        >
            {status === AppStatus.EMERGENCY ? 'I AM NOW SAFE (RESET)' : 'I AM FINE'}
        </button>

        {/* SOS Button */}
        {status !== AppStatus.EMERGENCY && (
             <button 
                onDoubleClick={handleSOS}
                className="w-full py-4 rounded-xl bg-red-900/10 border border-red-900/50 text-red-500 font-bold tracking-wider hover:bg-red-900/30 transition-colors"
             >
                DOUBLE TAP FOR SOS
             </button>
        )}

        {/* AI Tip */}
        <div className={`w-full ${currentTheme.card} p-4 rounded-xl border ${currentTheme.border}`}>
            <h4 className={`text-xs font-bold ${currentTheme.primaryText} mb-1 flex items-center gap-1`}>
                <Activity size={12}/> Safety Tip (Gemini)
            </h4>
            <p className={`text-xs ${currentTheme.textSub} leading-relaxed italic`}>
                "{safetyTip}"
            </p>
        </div>

      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="p-6 h-full overflow-y-auto no-scrollbar pb-24">
       <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${currentTheme.text}`}><History /> Activity Log</h2>
       <div className="space-y-4">
         {logs.length === 0 ? (
            <div className={`text-center py-10 ${currentTheme.textSub}`}>No activity recorded yet.</div>
         ) : (
            logs.map(log => (
                <div key={log.id} className={`${currentTheme.card} p-4 rounded-xl border ${currentTheme.border} flex flex-col gap-1`}>
                    <div className="flex justify-between items-start">
                        <span className={`text-xs font-mono ${currentTheme.textSub}`}>
                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            log.status === AppStatus.SAFE ? 'bg-emerald-500/20 text-emerald-500' :
                            log.status === AppStatus.WARNING ? 'bg-yellow-500/20 text-yellow-500' :
                            log.status === AppStatus.EMERGENCY ? 'bg-red-500/20 text-red-500' :
                            'bg-slate-700 text-slate-400'
                        }`}>
                            {log.status}
                        </span>
                    </div>
                    <p className={`text-sm ${currentTheme.text}`}>{log.message}</p>
                </div>
            ))
         )}
       </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 h-full overflow-y-auto no-scrollbar pb-24">
      <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${currentTheme.text}`}><SettingsIcon /> Settings</h2>
      
      {/* Theme Picker */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4`}>Appearance</h3>
        <div className={`${currentTheme.card} rounded-xl p-4 border ${currentTheme.border} grid grid-cols-2 gap-3`}>
            {Object.entries(THEMES).map(([key, theme]) => (
                <button 
                    key={key}
                    onClick={() => setSettings({...settings, theme: key as any})}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        settings.theme === key 
                        ? `border-${currentTheme.primary}-500 bg-${currentTheme.primary}-500/10` 
                        : `${currentTheme.border} hover:border-${currentTheme.primary}-500/50`
                    }`}
                >
                    <div className={`w-4 h-4 rounded-full bg-${theme.primary}-500`} />
                    <span className={`text-xs font-medium ${currentTheme.text}`}>{theme.name}</span>
                </button>
            ))}
        </div>
      </section>

      {/* Live Tracking Feature */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4 flex items-center gap-2`}>
            <Radio size={16} /> Live Tracking
        </h3>
        <div className={`${currentTheme.card} rounded-xl p-4 border ${currentTheme.border}`}>
             <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => setSettings({...settings, liveTrackingEnabled: !settings.liveTrackingEnabled})}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${settings.liveTrackingEnabled ? `bg-red-500 bg-opacity-20 text-red-500` : 'bg-slate-800 text-slate-500'}`}>
                        <Share2 size={20} />
                    </div>
                    <div>
                        <span className={`block text-sm ${currentTheme.text} font-medium`}>Broadcast Live Location</span>
                        <span className={`text-xs ${currentTheme.textSub}`}>Constantly send GPS during emergency</span>
                    </div>
                </div>
                <div 
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.liveTrackingEnabled ? 'bg-red-500' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${settings.liveTrackingEnabled ? 'left-7' : 'left-1'}`} />
                </div>
            </div>
        </div>
      </section>

      {/* Voice Recorder Section */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4`}>Emergency Voice Message</h3>
        <div className={`${currentTheme.card} rounded-xl p-4 border ${currentTheme.border}`}>
            <VoiceRecorder 
                onRecordingComplete={setVoiceRecording} 
                themeColor={currentTheme.primary} 
            />
        </div>
      </section>

      {/* Security */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4`}>Security</h3>
        <div className={`${currentTheme.card} rounded-xl p-4 border ${currentTheme.border}`}>
             <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => setSettings({...settings, biometricEnabled: !settings.biometricEnabled})}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${settings.biometricEnabled ? `${currentTheme.primaryBg} bg-opacity-20 ${currentTheme.primaryText}` : 'bg-slate-800 text-slate-500'}`}>
                        <Fingerprint size={20} />
                    </div>
                    <div>
                        <span className={`block text-sm ${currentTheme.text} font-medium`}>Biometric Unlock</span>
                        <span className={`text-xs ${currentTheme.textSub}`}>Enable Fingerprint / Face ID</span>
                    </div>
                </div>
                <div 
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.biometricEnabled ? currentTheme.primaryBg : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${settings.biometricEnabled ? 'left-7' : 'left-1'}`} />
                </div>
            </div>
        </div>
      </section>

      {/* Protocols */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4`}>Protocols</h3>
        <div className={`${currentTheme.card} rounded-xl p-4 space-y-4 border ${currentTheme.border}`}>
            <div>
                <label className={`block text-sm ${currentTheme.textSub} mb-1 flex items-center gap-2`}>
                   <Clock size={14} /> Check-in Interval
                </label>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        value={settings.checkInIntervalValue}
                        onChange={(e) => setSettings({...settings, checkInIntervalValue: parseInt(e.target.value) || 1})}
                        className={`flex-1 ${currentTheme.bg} border ${currentTheme.border} rounded-lg p-3 ${currentTheme.text} focus:border-${currentTheme.primary}-500 outline-none`}
                    />
                    <select
                        value={settings.checkInIntervalUnit}
                        onChange={(e) => setSettings({...settings, checkInIntervalUnit: e.target.value as TimeUnit})}
                        className={`flex-1 ${currentTheme.bg} border ${currentTheme.border} rounded-lg p-3 ${currentTheme.text} focus:border-${currentTheme.primary}-500 outline-none appearance-none`}
                    >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                    </select>
                </div>
            </div>
            <div>
                <label className={`block text-sm ${currentTheme.textSub} mb-1`}>Warning Grace Period (Minutes)</label>
                <input 
                    type="number" 
                    value={settings.warningGracePeriodMinutes}
                    onChange={(e) => setSettings({...settings, warningGracePeriodMinutes: parseInt(e.target.value)})}
                    className={`w-full ${currentTheme.bg} border ${currentTheme.border} rounded-lg p-3 ${currentTheme.text} focus:border-yellow-500 outline-none`}
                />
            </div>
             <div className="flex items-center justify-between pt-2">
                <span className={`text-sm ${currentTheme.textSub}`}>Auto-call Police</span>
                <div 
                    onClick={() => setSettings({...settings, autoCallPolice: !settings.autoCallPolice})}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.autoCallPolice ? currentTheme.primaryBg : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoCallPolice ? 'left-7' : 'left-1'}`} />
                </div>
            </div>
        </div>
      </section>

      {/* Contacts */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4`}>Emergency Contacts</h3>
        <div className="space-y-3">
            {contacts.map(contact => (
                <div key={contact.id} className={`${currentTheme.card} p-4 rounded-xl flex justify-between items-center border ${currentTheme.border} group`}>
                    <div className="flex-1 mr-4">
                        <div className={`font-bold ${currentTheme.text} flex items-center gap-2`}>
                            {contact.name}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                            <div className={`text-xs ${currentTheme.textSub} flex items-center gap-1.5`}>
                                <Phone size={12}/> {contact.phone}
                                {(contact.enableSMS) && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[9px] font-bold">SMS</span>}
                            </div>
                            {contact.email && (
                                <div className={`text-xs ${currentTheme.textSub} flex items-center gap-1.5`}>
                                    <Mail size={12}/> {contact.email}
                                    {(contact.enableEmail) && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[9px] font-bold">EMAIL</span>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                             onClick={() => openEditContact(contact)}
                             className={`p-2 rounded-lg ${currentTheme.bg} ${currentTheme.primaryText} hover:bg-opacity-80 transition-colors`}
                             aria-label="Edit contact"
                        >
                            <Pencil size={16} />
                        </button>
                        <button 
                            onClick={() => handleDeleteContact(contact.id)}
                            className={`p-2 rounded-lg ${currentTheme.bg} text-red-400 hover:bg-red-900/20 transition-colors`}
                            aria-label="Delete contact"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            <button 
                onClick={openAddContact}
                className={`w-full py-4 rounded-xl border border-dashed ${currentTheme.border} ${currentTheme.textSub} hover:${currentTheme.text} hover:border-slate-500 transition-all text-sm flex items-center justify-center gap-2 font-medium`}
            >
                <Plus size={16} /> Add New Contact
            </button>
        </div>
      </section>

      {/* Message */}
      <section className="mb-8">
        <h3 className={`text-sm font-bold ${currentTheme.textSub} uppercase tracking-wider mb-4`}>Custom Message</h3>
        <textarea 
            value={settings.customSafetyMessage}
            onChange={(e) => setSettings({...settings, customSafetyMessage: e.target.value})}
            className={`w-full ${currentTheme.card} border ${currentTheme.border} rounded-xl p-4 ${currentTheme.text} text-sm min-h-[100px] focus:border-${currentTheme.primary}-500 outline-none`}
        />
        <p className={`text-xs ${currentTheme.textSub} mt-2`}>Gemini will append your GPS location and battery status to this message.</p>
      </section>
      
       <div className="h-10"></div>
    </div>
  );

  return (
    <div className={`${currentTheme.bg} h-screen w-screen overflow-hidden flex flex-col font-sans ${currentTheme.text} transition-colors duration-500`}>
      {/* Dynamic Content */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === Tab.HOME && renderHome()}
        {activeTab === Tab.SETTINGS && renderSettings()}
        {activeTab === Tab.LOGS && renderLogs()}
      </main>

      {/* Bottom Navigation */}
      <nav className={`${currentTheme.navBg} border-t ${currentTheme.border} flex items-center justify-around px-2 pb-2 h-20 transition-colors duration-300`}>
        <button 
            onClick={() => setActiveTab(Tab.HOME)}
            className={`flex flex-col items-center gap-1 p-2 w-20 rounded-xl transition-all ${activeTab === Tab.HOME ? `${currentTheme.navActive} bg-white/5` : currentTheme.textSub}`}
        >
            <Shield size={24} />
            <span className="text-[10px] font-medium">Status</span>
        </button>
        <button 
             onClick={() => setActiveTab(Tab.LOGS)}
             className={`flex flex-col items-center gap-1 p-2 w-20 rounded-xl transition-all ${activeTab === Tab.LOGS ? `${currentTheme.navActive} bg-white/5` : currentTheme.textSub}`}
        >
            <History size={24} />
            <span className="text-[10px] font-medium">Logs</span>
        </button>
        <button 
             onClick={() => setActiveTab(Tab.SETTINGS)}
             className={`flex flex-col items-center gap-1 p-2 w-20 rounded-xl transition-all ${activeTab === Tab.SETTINGS ? `${currentTheme.navActive} bg-white/5` : currentTheme.textSub}`}
        >
            <SettingsIcon size={24} />
            <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
      
      {/* Re-Lock Overlay Button (for testing) */}
      <button 
        onClick={() => setIsLocked(true)}
        className={`fixed top-2 right-2 p-2 ${currentTheme.card} rounded-full ${currentTheme.textSub} hover:${currentTheme.text} z-50 opacity-50 hover:opacity-100`}
      >
        <LockScreenIcon size={16} />
      </button>

      {/* Modals */}
      {isContactEditorOpen && (
        <ContactEditor 
          contact={editingContact}
          onSave={handleSaveContact}
          onCancel={() => setIsContactEditorOpen(false)}
        />
      )}
    </div>
  );
}

// Icon helper
const LockScreenIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);