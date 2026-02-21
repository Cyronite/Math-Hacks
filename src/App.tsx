import React, { useState } from 'react';
import AudioProcessor from './scripts/AudioRecorder'; // Renamed file
import HandTracker from './scripts/HandTracker';

function App() {
  const [handX, setHandX] = useState(0.5);
  const [handY, setHandY] = useState(0.5);

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden">
      
      {/* BACKGROUND GRID (Visual Polish) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      {/* LEFT SIDE: CONTROLS & CAMERA */}
      <div className="relative z-10 w-1/3 border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-between p-8">
        <div className="text-left w-full">
            <h1 className="text-3xl font-black text-white tracking-tighter italic">
                AETHER<span className="text-purple-500">VOX</span>
            </h1>
            <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Gestural Audio Synthesizer</p>
        </div>

        <HandTracker onHandMove={(x, y) => {
            setHandX(x);
            setHandY(y);
        }} />

        <div className="w-full p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-slate-400 text-[10px] uppercase font-bold mb-4">How to Play</h3>
            <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">Y</span>
                    Move hand UP/DOWN for <b className="text-white">Pitch</b>
                </li>
                <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">X</span>
                    Move hand LEFT/RIGHT for <b className="text-white">Reverb</b>
                </li>
            </ul>
        </div>
      </div>

      {/* RIGHT SIDE: INTERACTIVE CANVAS */}
      <div className="relative z-10 w-2/3 flex items-center justify-center">
         
         <div 
            className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white] pointer-events-none transition-all duration-75 ease-out"
            style={{
                left: `${(1 - handX) * 100}%`,
                top: `${handY * 100}%`
            }}
         />
         
         {/* Crosshairs */}
         <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 bottom-0 w-[1px] bg-cyan-500" style={{ left: `${(1-handX)*100}%` }}></div>
            <div className="absolute left-0 right-0 h-[1px] bg-purple-500" style={{ top: `${handY*100}%` }}></div>
         </div>

         <AudioProcessor x={1-handX} y={handY} />
      </div>
    </div>
  );
}

export default App;