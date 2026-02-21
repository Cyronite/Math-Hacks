import React, { useState } from 'react';
import HandTracker from './HandTracker';
import PitchTracker from './AudioRecorder';

const FrequencyLink: React.FC = () => {
  const [targetFrequency, setTargetFrequency] = useState<number>(440);

  return (
    <div className="flex w-full h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* LEFT SIDE: Camera Input */}
      <div className="w-1/2 p-8 border-r border-slate-800 flex flex-col items-center justify-center relative bg-black/20">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Optic Sensor // Conductor</h2>
        </div>
        
        <HandTracker onYChange={(y) => {
          // Map Y position to a frequency - 0-1 currently, hand up = higher pitch
          const minFreq = 50;
          const maxFreq = 1000; // Maximum frequency
          const mappedFreq = minFreq + (1 - y) * (maxFreq - minFreq); // Invert Y for pitch mapping***
          setTargetFrequency(mappedFreq);
        }} />
      </div>

      <div className="w-1/2 p-8 flex flex-col items-center justify-center relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-green-500 uppercase tracking-widest">Audio Sensor // Receiver</h2>
        </div>
        
        <PitchTracker targetFrequency={targetFrequency} />
      </div>
      
    </div>
  )
}

export default FrequencyLink;