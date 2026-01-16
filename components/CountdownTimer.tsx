import React from 'react';

interface CountdownTimerProps {
  targetTime: number;
  totalDuration: number;
  label: string;
  color: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTime, totalDuration, label, color }) => {
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    const calculate = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      setTimeLeft(diff);
      
      const p = Math.min(100, Math.max(0, (diff / totalDuration) * 100));
      setProgress(p);
    };
    
    calculate(); // Initial call
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTime, totalDuration]);

  const formatTime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    // Format for very long durations
    if (days > 365) {
        const years = Math.floor(days / 365);
        const remainingDays = days % 365;
        return `${years}y ${remainingDays}d`;
    }
    
    // Format for days
    if (days > 0) {
        return `${days}d ${hours}h`;
    }

    // Standard format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // SVG Configuration
  const size = 280;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 4; // Padding to ensure no clipping
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full">
      <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
        {/* SVG Container - Rotated so start is at 12 o'clock */}
        <svg 
            className="absolute inset-0 w-full h-full transform -rotate-90" 
            viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
          />
          {/* Progress Indicator */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${color} transition-all duration-1000 ease-linear`}
          />
        </svg>

        {/* Center Content */}
        <div className="flex flex-col items-center z-10 space-y-2">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            {label}
          </span>
          <span className={`text-4xl font-mono font-bold tracking-tight tabular-nums ${color.replace('stroke-', 'text-')}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
    </div>
  );
};