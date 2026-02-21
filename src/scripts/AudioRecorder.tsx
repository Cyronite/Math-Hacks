import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

interface PitchTrackerProps {
  yPosition?: number; 
}

const SCALE = [
  { val: 12, label: "High C" },
  { val: 9, label: "A" },
  { val: 7, label: "G" },
  { val: 4, label: "E" },
  { val: 2, label: "D" },
  { val: 0, label: "Middle C" },
  { val: -3, label: "Low A" },
  { val: -5, label: "Low G" },
  { val: -8, label: "Low E" },
  { val: -10, label: "Low D" },
  { val: -12, label: "Low C" },
];

const PitchTracker: React.FC<PitchTrackerProps> = ({ yPosition = 0.5 }) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [activeNote, setActiveNote] = useState(SCALE[5]); 
  
  const micRef = useRef<Tone.UserMedia | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  const startProcessor = async () => {
    try {
      await Tone.start();
      
      const shifter = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.1, 
      }).toDestination(); 
      
      pitchShiftRef.current = shifter;

      const mic = new Tone.UserMedia();
      micRef.current = mic;

      await mic.open();
      mic.connect(shifter);
      setIsLive(true);
    } catch (e) {
      console.error("Audio Start Error:", e);
      alert("Microphone access is required or Audio Context failed to start.");
    }
  };

  const stopProcessor = () => {
    if (micRef.current) {
      micRef.current.close();
      setIsLive(false);
    }
  };

  useEffect(() => {
    // 1. If audio isn't ready, wait
    if (!pitchShiftRef.current || !isLive) return;

    const safeY = isNaN(yPosition as number) ? 0.5 : (yPosition as number);
    const invertedY = 1 - safeY;

    // 2. Calculate Scale Index
    let index = Math.floor(invertedY * SCALE.length);
    if (index < 0) index = 0;
    if (index >= SCALE.length) index = SCALE.length - 1;

    const targetNote = SCALE[index];

    // 3. Update Audio
    if (targetNote.val !== activeNote.val) {
        setActiveNote(targetNote);
        
        const pitchSignal = pitchShiftRef.current.pitch;

        try {
            // @ts-ignore - Ignores the TS error, but we catch runtime errors below
            if (pitchSignal.rampTo) {
                 // @ts-ignore
                pitchSignal.rampTo(targetNote.val, 0.1);
            } else {
                // Fallback: If rampTo doesn't exist, just set the value
                pitchShiftRef.current.pitch = targetNote.val;
            }
        } catch (e) {
            // if worst case, force the value so app doesn't crash
            console.warn("Smoothing failed, snapping pitch instead.");
            pitchShiftRef.current.pitch = targetNote.val;
        }
    }

  }, [yPosition, isLive, activeNote]);

  if (!activeNote) return <div className="text-white">Loading Scale...</div>;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
        
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold tracking-tighter text-white transition-all duration-100">
            {activeNote.val > 0 ? "+" : ""}{activeNote.val}
          </div>
          <span className="text-xl text-purple-400 font-bold block mt-2">
            {activeNote.label}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Key of C Pentatonic
          </span>
        </div>

        <div className="h-48 w-full bg-slate-800/50 rounded-xl relative overflow-hidden border border-slate-700 mb-8 flex flex-col-reverse">
          {SCALE.map((note) => (
             <div 
               key={note.val}
               className={`flex-1 w-full border-t border-slate-700/30 transition-all duration-200 flex items-center justify-center
                 ${note.val === activeNote.val ? "bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] z-10" : "bg-transparent opacity-30"}
               `}
             >
                <span className={`text-[10px] font-mono ${note.val === activeNote.val ? "text-white font-bold" : "text-slate-600"}`}>
                    {note.val === activeNote.val ? note.label : ""}
                </span>
             </div>
          ))}
        </div>

        {!isLive ? (
          <button 
            onClick={startProcessor} 
            className="w-full py-4 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-500 hover:text-black text-purple-400 rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            Start Auto-Tune
          </button>
        ) : (
          <button 
            onClick={stopProcessor} 
            className="w-full py-4 bg-red-600/20 border border-red-500/50 hover:bg-red-500 hover:text-black text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default PitchTracker;