import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

interface PitchTrackerProps {
  yPosition?: number; 
}

const SCALE = [
  { val: 12, label: "High C" }, { val: 9, label: "A" }, { val: 7, label: "G" },
  { val: 4, label: "E" }, { val: 2, label: "D" }, { val: 0, label: "Middle C" },
  { val: -3, label: "Low A" }, { val: -5, label: "Low G" }, { val: -8, label: "Low E" },
  { val: -10, label: "Low D" }, { val: -12, label: "Low C" },
];

const AudioRecorder: React.FC<PitchTrackerProps> = ({ yPosition = 0.5 }) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [activeNote, setActiveNote] = useState(SCALE[5]); 
  
  const micRef = useRef<Tone.UserMedia | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  const startProcessor = async () => {
    try {
      await Tone.start();
      const reverb = new Tone.Reverb({ decay: 3, wet: 0.5 }).toDestination();
      const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(reverb).start();
      
      const shifter = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.05, 
      }).connect(chorus); 
      
      pitchShiftRef.current = shifter;
      const mic = new Tone.UserMedia();
      micRef.current = mic;

      await mic.open();
      mic.connect(shifter);
      setIsLive(true);
    } catch (e) {
      console.error("Audio Start Error:", e);
      alert("Microphone access is required.");
    }
  };

  const stopProcessor = () => {
    if (micRef.current) {
      micRef.current.close();
      setIsLive(false);
    }
  };

  useEffect(() => {
    const safeY = isNaN(yPosition as number) ? 0.5 : (yPosition as number);
    const invertedY = 1 - safeY;

    let index = Math.floor(invertedY * SCALE.length);
    if (index < 0) index = 0;
    if (index >= SCALE.length) index = SCALE.length - 1;

    const targetNote = SCALE[index];

    setActiveNote(prevNote => {
        if (prevNote.val !== targetNote.val) {
            if (pitchShiftRef.current && isLive) {
                pitchShiftRef.current.pitch = targetNote.val;
            }
            return targetNote;
        }
        return prevNote;
    });

  }, [yPosition, isLive]);

  if (!activeNote) return <div className="text-slate-400">Loading Scale...</div>;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full bg-white rounded-[40px] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50">
        
        <div className="mb-10 text-center">
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em] mb-2 block">Current Frequency</span>
          <div className="text-7xl font-light text-slate-700 tracking-tighter">
            {activeNote.label}
          </div>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-4 block">
            Pentatonic Scale
          </span>
        </div>

        <div className="h-64 flex items-end gap-1 mb-10 overflow-hidden px-4">
          {SCALE.map((note) => (
            <div 
              key={note.val}
              className={`flex-1 transition-all duration-500 rounded-t-full ${
                  note.val === activeNote.val 
                  ? "h-full bg-gradient-to-t from-orange-300 to-rose-300 shadow-lg" 
                  : "h-8 bg-slate-100"
              }`}
            />
          ))}
        </div>

        <button 
          onClick={isLive ? stopProcessor : startProcessor}
          className={`w-full py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all border ${
              isLive 
              ? "border-rose-100 text-rose-500 bg-rose-50/50 hover:bg-rose-50" 
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white shadow-sm"
          }`}
        >
          {isLive ? "End Session" : "Begin Play"}
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;