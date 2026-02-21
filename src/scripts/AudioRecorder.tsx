import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

interface PitchTrackerProps {
  pitchShiftAmount: number; // Comes from HandTracker (-12 to 12) for octa
}

const PitchTracker: React.FC<PitchTrackerProps> = ({ pitchShiftAmount }) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  
  // Refs to hold our Tone.js nodes
  const micRef = useRef<Tone.UserMedia | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  const startProcessor = async () => {
    // 1. You MUST call Tone.start() before making any sounds in the browser
    await Tone.start();

    // 2. Create the PitchShifter (WindowSize controls audio quality vs latency)
    const shifter = new Tone.PitchShift({
      pitch: 0,
      windowSize: 0.1, 
    }).toDestination(); // Route directly to speakers/headphones
    
    pitchShiftRef.current = shifter;

    // 3. Setup the Microphone
    const mic = new Tone.UserMedia();
    micRef.current = mic;

    try {
      await mic.open(); // Asks user for mic permission
      // Route Microphone -> PitchShifter -> Destination
      mic.connect(shifter);
      setIsLive(true);
    } catch (e) {
      console.error("Mic access denied or failed", e);
      alert("Microphone access is required!");
    }
  };

  const stopProcessor = () => {
    if (micRef.current) {
      micRef.current.close();
      setIsLive(false);
    }
  };

  // Whenever the hand moves, instantly update the Tone.js PitchShifter
  useEffect(() => {
    if (pitchShiftRef.current && isLive) {
      // Smoothly ramp the pitch over 0.1 seconds to avoid audio "clicks"
      pitchShiftRef.current.pitch = pitchShiftAmount;
    }
  }, [pitchShiftAmount, isLive]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
        
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold tracking-tighter text-white">
            {pitchShiftAmount > 0 ? "+" : ""}
            {pitchShiftAmount.toFixed(1)}
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            Semitones Shift
          </span>
        </div>

        <div className="h-4 w-full bg-slate-800 rounded-full relative overflow-hidden border border-slate-700 mb-8">
          {/* Visualizer showing where the pitch is currently shifted */}
          <div 
            className="absolute h-full w-2 bg-purple-500 shadow-[0_0_15px_purple] transition-all duration-75" 
            style={{ 
              // Map -12 to +12 into a 0% to 100% position on the bar
              left: `${((pitchShiftAmount + 12) / 24) * 100}%`,
              transform: 'translateX(-50%)' 
            }}
          />
          {/* Center Line marker (0 shift) */}
          <div className="absolute h-full w-[1px] bg-slate-500 left-1/2 opacity-50" />
        </div>

        {!isLive ? (
          <button 
            onClick={startProcessor} 
            className="w-full py-4 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-500 hover:text-black text-purple-400 rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            Power On Live Auto-Tune
          </button>
        ) : (
          <button 
            onClick={stopProcessor} 
            className="w-full py-4 bg-red-600/20 border border-red-500/50 hover:bg-red-500 hover:text-black text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            Kill Power
          </button>
        )}
      </div>
      
      <p className="mt-6 text-red-400 text-[10px] uppercase tracking-widest font-bold italic animate-pulse">
        ⚠️ CRITICAL: You MUST use headphones or the mic will record the speakers and create a massive feedback loop.
      </p>
    </div>
  );
};

export default PitchTracker;