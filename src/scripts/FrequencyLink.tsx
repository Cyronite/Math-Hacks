import React, { useState } from 'react';
import HandTracker from './HandTracker';
import PitchTracker from './AudioRecorder';

const FrequencyLink: React.FC = () => {
  const [yPos, setYPos] = useState<number>(0.5); 

  return (
    <div className="flex w-full h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* LEFT SIDE: Camera Input */}
      <div className="w-1/2 p-8 border-r border-slate-800 flex flex-col items-center justify-center relative bg-black/20">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Conductor Input</h2>
        </div>
        
        <HandTracker onYChange={setYPos} />
      </div>

      {/* RIGHT SIDE: Audio Output */}
      <div className="w-1/2 p-8 flex flex-col items-center justify-center relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Vocal Processor</h2>
        </div>
        
        <PitchTracker yPosition={yPos} />
      </div>
      
    </div>
  )
}

export default FrequencyLink;