import React, { useEffect, useState } from 'react';

interface KeyboardTrackerProps {
  onYChange: (y: number) => void;
}

const KEY_MAP: Record<string, number> = {
  'a': 0,  // C4 (Middle C)
  'w': 1,  // C#4
  's': 2,  // D4
  'e': 3,  // D#4
  'd': 4,  // E4
  'f': 5,  // F4
  't': 6,  // F#4
  'g': 7,  // G4
  'y': 8,  // G#4
  'h': 9,  // A4
  'u': 10, // A#4
  'j': 11, // B4
  'k': 12  // C5 (High C)
};

const KeyboardTracker: React.FC<KeyboardTrackerProps> = ({ onYChange }) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; 

      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined) {
        setActiveKey(key);
        const noteIndex = KEY_MAP[key];
        const normalizedY = 1 - (noteIndex / 12); 
        onYChange(normalizedY);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === activeKey) {
        setActiveKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeKey, onYChange]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-lg">
      <div className="relative w-full aspect-video bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center p-10">
        
        {/* Subtle background indicator */}
        <div 
          className={`absolute inset-0 transition-colors duration-300 rounded-[40px] ${
            activeKey ? 'bg-orange-50/30' : 'bg-transparent'
          }`}
        />

        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-6 relative z-10">
          Keyboard Interface
        </span>
        
        <div className={`text-6xl font-light transition-all duration-200 relative z-10 ${
            activeKey ? 'text-orange-400 scale-110' : 'text-slate-300'
        }`}>
            {activeKey ? activeKey.toUpperCase() : "--"}
        </div>
        
        <div className="mt-12 space-y-2 relative z-10">
            <div className="flex gap-4 justify-center">
               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                 White Keys: A → K
               </div>
               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                 Black Keys: W E T Y U
               </div>
            </div>
            <p className="text-[9px] text-slate-300 italic text-center pt-2">
                Press keys to shift frequency output
            </p>
        </div>

      </div>
    </div>
  );
};

export default KeyboardTracker;