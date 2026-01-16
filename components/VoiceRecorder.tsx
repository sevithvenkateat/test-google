import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Volume2 } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
  themeColor: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, themeColor }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      haptic.button();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Cannot record voice message.");
    }
  };

  const stopRecording = () => {
    haptic.button();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    haptic.tap();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      onRecordingComplete(null);
      setRecordingTime(0);
    }
  };

  const playRecording = () => {
    haptic.tap();
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeBg = `bg-${themeColor}-600`;
  const activeText = `text-${themeColor}-500`;

  return (
    <div className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-2">
                <Volume2 size={14} /> Voice Message
            </label>
            {isRecording && (
                <span className="text-xs font-mono text-red-500 animate-pulse flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    REC {formatTime(recordingTime)}
                </span>
            )}
        </div>

        <div className="flex items-center gap-3">
            {!isRecording && !audioUrl && (
                <button 
                    onClick={startRecording}
                    className={`flex-1 py-3 rounded-xl border border-dashed border-slate-600 hover:border-${themeColor}-500 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm text-slate-400`}
                >
                    <Mic size={18} /> Tap to Record
                </button>
            )}

            {isRecording && (
                <button 
                    onClick={stopRecording}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white animate-pulse flex items-center justify-center gap-2 text-sm font-bold"
                >
                    <Square size={18} fill="currentColor" /> Stop Recording
                </button>
            )}

            {audioUrl && (
                <div className="flex-1 flex gap-2">
                    <button 
                        onClick={playRecording}
                        className={`flex-1 py-3 rounded-xl ${activeBg} text-white flex items-center justify-center gap-2 text-sm font-bold`}
                    >
                        <Play size={18} fill="currentColor" /> Play Review
                    </button>
                    <button 
                        onClick={deleteRecording}
                        className="w-12 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 flex items-center justify-center"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )}
        </div>
        <p className="text-[10px] text-slate-500">
            This voice message will be sent via SMS/Email and played during automated emergency calls.
        </p>
    </div>
  );
};