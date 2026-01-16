import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, Unlock, Delete } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface LockScreenProps {
  pin: string;
  biometricEnabled: boolean;
  onUnlock: () => void;
  title?: string;
  themeColor?: string; // e.g. 'emerald', 'cyan', 'purple'
}

export const LockScreen: React.FC<LockScreenProps> = ({ 
  pin, 
  biometricEnabled, 
  onUnlock, 
  title = 'Enter App Passcode',
  themeColor = 'emerald'
}) => {
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleNumberClick = (num: number) => {
    haptic.tap();
    if (inputPin.length < 4) {
      const newPin = inputPin + num.toString();
      setInputPin(newPin);
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const validatePin = (code: string) => {
    if (code === pin) {
      haptic.success();
      onUnlock();
    } else {
      haptic.error();
      setError(true);
      setTimeout(() => {
        setInputPin('');
        setError(false);
      }, 500);
    }
  };

  const handleBiometric = () => {
    if (!biometricEnabled) return;
    haptic.button();
    setIsScanning(true);
    // Simulate scan delay
    setTimeout(() => {
      setIsScanning(false);
      onUnlock();
    }, 1500);
  };

  const handleDelete = () => {
    haptic.tap();
    setInputPin(prev => prev.slice(0, -1));
  };

  // Dynamic color classes
  const activeColor = `text-${themeColor}-500`;
  const activeBg = `bg-${themeColor}-500`;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-between py-12 px-6 backdrop-blur-xl bg-opacity-95">
      <div className="flex flex-col items-center mt-12">
        <div className="mb-8">
          {isScanning ? (
             <Fingerprint className={`w-16 h-16 ${activeColor} animate-pulse`} />
          ) : (
             <Lock className="w-12 h-12 text-slate-400" />
          )}
        </div>
        <h2 className="text-xl font-medium text-white mb-2 text-center px-4">
          {isScanning ? 'Verifying...' : title}
        </h2>
        <div className="flex gap-4 mb-8 h-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-all duration-200 ${
                i < inputPin.length
                  ? error ? 'bg-red-500 border-red-500' : 'bg-white border-white'
                  : 'border-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-xs grid grid-cols-3 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="w-20 h-20 rounded-full bg-slate-800/50 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-2xl font-light text-white transition-colors border border-slate-700"
          >
            {num}
          </button>
        ))}
        <div className="flex items-center justify-center">
           {biometricEnabled && (
             <button onClick={handleBiometric} className="p-4 rounded-full hover:bg-slate-800/50">
               <Fingerprint className={`w-8 h-8 ${activeColor}`} />
             </button>
           )}
        </div>
        <button
          onClick={() => handleNumberClick(0)}
          className="w-20 h-20 rounded-full bg-slate-800/50 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-2xl font-light text-white transition-colors border border-slate-700"
        >
          0
        </button>
        <div className="flex items-center justify-center">
            <button onClick={handleDelete} className="p-4 rounded-full hover:bg-slate-800/50">
               <Delete className="w-8 h-8 text-slate-400" />
             </button>
        </div>
      </div>
      
      <div className="text-slate-500 text-sm">
        LifeLine Protocol Locked
      </div>
    </div>
  );
};