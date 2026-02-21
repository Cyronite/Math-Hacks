import React, { useState } from 'react';
import HandTracker from './HandTracker';
import PitchTracker from './AudioRecorder'; // We'll update this next

const FrequencyLink: React.FC = () => {
  // Now we track SEMITONES (-12 to +12) instead of Hz
  const [pitchShiftAmount, setPitchShiftAmount] = useState<number>(0); 

  return (
    <div className="flex w-full h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* LEFT SIDE: Camera Input */}
      <div className="w-1/2 p-8 border-r border-slate-800 flex flex-col items-center justify-center relative bg-black/20">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Conductor Input</h2>
        </div>
        
        <HandTracker onYChange={(y) => {
          // y goes from 0 (top of screen) to 1 (bottom)
          // We want top = +12 semitones (high pitch), bottom = -12 semitones (low pitch)
          const shift = ((1 - y) * 24) - 12; 
          setPitchShiftAmount(shift);
        }} />
      </div>

      {/* RIGHT SIDE: Audio Output */}
      <div className="w-1/2 p-8 flex flex-col items-center justify-center relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Vocal Processor</h2>
        </div>
        
        <PitchTracker pitchShiftAmount={pitchShiftAmount} />
      </div>
      
    </div>
  )
}

export default FrequencyLink;