import React, { useState } from 'react';
import './App.css';
import AudioRecorder from './scripts/AudioRecorder';
import HandTracker from './scripts/HandTracker';

function App() {
  const [yPos, setYPos] = useState<number>(0.5);

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-gray-950 text-white overflow-hidden">
      
      {/* Camera */}
      <div className="w-full md:w-1/2 h-screen p-8 border-r border-slate-800 flex flex-col items-center justify-center relative bg-black/20">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Conductor Input</h2>
        </div>
        
        <HandTracker onYChange={setYPos} />
      </div>

      {/* Audio */}
      <div className="w-full md:w-1/2 h-screen p-8 flex flex-col items-center justify-center relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Vocal Processor</h2>
        </div>
        
        <AudioRecorder yPosition={yPos} />
      </div>

    </div>
  );
}

export default App;