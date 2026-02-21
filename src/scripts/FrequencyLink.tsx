import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

interface PitchTrackerProps {
  yPosition?: number; 
}

// Fixed C Major Scale (One Octave) for a clean "Piano" feel
const SCALE = [
  { val: "C4", label: "C" },
  { val: "B3", label: "B" },
  { val: "A3", label: "A" },
  { val: "G3", label: "G" },
  { val: "F3", label: "F" },
  { val: "E3", label: "E" },
  { val: "D3", label: "D" },
  { val: "C3", label: "C (Low)" },
];

const PitchTracker: React.FC<PitchTrackerProps> = ({ yPosition = 0.5 }) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [activeNote, setActiveNote] = useState(SCALE[SCALE.length - 1]); 
  
  const micRef = useRef<Tone.UserMedia | null>(null);
  const oscRef = useRef<Tone.Oscillator | null>(null);
  const vocoderRef = useRef<Tone.Vocoder | null>(null);

  const startProcessor = async () => {
    try {
      await Tone.start();
      
      // 1. Create a clean Sawtooth Oscillator (The "Talk Box" sound)
      const osc = new Tone.Oscillator().start();
      osc.type = "sawtooth";
      oscRef.current = osc;

      // 2. Create the Vocoder (Mixes voice + oscillator)
      // We keep the range focused on vocal clarity (no reverb/delay)
      const vocoder = new Tone.Vocoder({
        highRes: true,
        q: 2
      }).toDestination();
      vocoderRef.current = vocoder;

      // 3. Connect Microphone
      const mic = new Tone.UserMedia();
      await mic.open();
      micRef.current = mic;

      // MIC = Modulator (the shape of the words)
      // OSC = Carrier (the pitch of the note)
      mic.connect(vocoder);
      osc.connect(vocoder.carrier);

      setIsLive(true);
    } catch (e) {
      console.error("Audio Start Error:", e);
      alert("Microphone access is required.");
    }
  };

  const stopProcessor = () => {
    micRef.current?.close();
    oscRef.current?.stop();
    setIsLive(false);
  };

  useEffect(() => {
    if (!oscRef.current || !isLive) return;

    const safeY = isNaN(yPosition as number) ? 0.5 : (yPosition as number);
    const invertedY = 1 - safeY;

    let index = Math.floor(invertedY * SCALE.length);
    if (index < 0) index = 0;
    if (index >= SCALE.length) index = SCALE.length - 1;

    const targetNote = SCALE[index];

    if (activeNote.val !== targetNote.val) {
        // Change the oscillator frequency to match the "Piano" note
        oscRef.current.frequency.rampTo(targetNote.val, 0.05);
        setActiveNote(targetNote);
    }
  }, [yPosition, isLive, activeNote]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50 text-center">
        
        <div className="mb-8">
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mb-2">Talk Box Mode</p>
          <div className="text-7xl font-light text-slate-700">
            {activeNote.label}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 block">
            Octave: 3-4
          </span>
        </div>

        {/* Visual Piano Scale */}
        <div className="h-32 w-full bg-slate-50 rounded-2xl border border-slate-100 mb-8 flex overflow-hidden">
          {SCALE.slice().reverse().map((note) => (
             <div 
               key={note.val}
               className={`flex-1 border-r border-slate-200 transition-all duration-200 flex items-end justify-center pb-2
                 ${note.val === activeNote.val ? "bg-orange-400" : "bg-white"}
               `}
             >
                <span className={`text-[9px] font-bold ${note.val === activeNote.val ? "text-white" : "text-slate-300"}`}>
                    {note.label}
                </span>
             </div>
          ))}
        </div>

        {!isLive ? (
          <button 
            onClick={startProcessor} 
            className="w-full py-5 bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all"
          >
            Power On Talk-Box
          </button>
        ) : (
          <button 
            onClick={stopProcessor} 
            className="w-full py-5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default PitchTracker;