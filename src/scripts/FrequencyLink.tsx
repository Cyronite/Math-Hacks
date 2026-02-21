import React, { useState } from 'react';
import HandTracker from './HandTracker';
import KeyboardTracker from './KeyboardTracker';
import PitchTracker from './AudioRecorder';

const FrequencyLink: React.FC = () => {
  const [yPos, setYPos] = useState<number>(0.5); 
  const [inputMode, setInputMode] = useState<'camera' | 'keyboard'>('keyboard');

  return (
    <div className="flex w-full h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* LEFT SIDE: Conductor Input */}
      <div className="w-1/2 p-8 border-r border-slate-800 flex flex-col items-center justify-center relative bg-black/20">
        
        {/* Header & Toggle */}
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Conductor Input</h2>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setInputMode('keyboard')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                  inputMode === 'keyboard' 
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'text-slate-500 hover:text-cyan-400'
                }`}
              >
                Keyboard
              </button>
              <button 
                onClick={() => setInputMode('camera')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                  inputMode === 'camera' 
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'text-slate-500 hover:text-cyan-400'
                }`}
              >
                Camera
              </button>
            </div>
        </div>
        
        {/* Dynamic Component Rendering */}
        {inputMode === 'camera' ? (
          <HandTracker onYChange={setYPos} />
        ) : (
          <KeyboardTracker onYChange={setYPos} />
        )}
        
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