import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MessageSquare, AtSign } from 'lucide-react';
import { Contact } from '../types';

interface ContactEditorProps {
  contact?: Contact | null;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
}

export const ContactEditor: React.FC<ContactEditorProps> = ({ contact, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [enableSMS, setEnableSMS] = useState(true);
  const [enableEmail, setEnableEmail] = useState(true);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setEmail(contact.email);
      setEnableSMS(contact.enableSMS ?? true);
      setEnableEmail(contact.enableEmail ?? true);
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setEnableSMS(true);
      setEnableEmail(true);
    }
  }, [contact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: contact ? contact.id : crypto.randomUUID(),
      name,
      phone,
      email,
      notifyOnWarning: true,
      notifyOnEmergency: true,
      enableSMS,
      enableEmail,
    });
  };

  const Toggle = ({ label, icon: Icon, value, onChange }: { label: string, icon: any, value: boolean, onChange: (v: boolean) => void }) => (
    <div 
        className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
        onClick={() => onChange(!value)}
    >
        <div className="flex items-center gap-3">
            <Icon size={18} className={value ? 'text-emerald-500' : 'text-slate-500'} />
            <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-emerald-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${value ? 'left-6' : 'left-1'}`} />
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {contact ? 'Edit Contact' : 'New Contact'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Contact Info</label>
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-emerald-500 transition-colors">
              <User size={18} className="text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (e.g., Mom)"
                className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                required
              />
            </div>
            
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-emerald-500 transition-colors">
              <Phone size={18} className="text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                required
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-emerald-500 transition-colors">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (Optional)"
                className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Notification Channels</label>
            <div className="grid grid-cols-2 gap-3">
                <Toggle 
                    label="SMS" 
                    icon={MessageSquare} 
                    value={enableSMS} 
                    onChange={setEnableSMS} 
                />
                <Toggle 
                    label="Email" 
                    icon={AtSign} 
                    value={enableEmail} 
                    onChange={setEnableEmail} 
                />
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
                Select how this contact should be notified during an emergency.
            </p>
          </div>

          <div className="pt-4 flex gap-3">
             <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
              <Save size={18} />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};