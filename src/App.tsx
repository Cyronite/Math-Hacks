import { useState } from 'react';
import './App.css';
import AudioRecorder from './scripts/AudioRecorder';
import HandTracker from './scripts/HandTracker';
import PitchGame from './scripts/PitchGame';

function App() {
  const [yPos, setYPos] = useState<number>(0.5);
  const [mode, setMode] = useState<'synth' | 'game'>('synth');

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-gray-950 text-white overflow-hidden">
      
      {/* MODE SELECTOR OVERLAY */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex gap-4 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 backdrop-blur-md">
        <button 
            onClick={() => setMode('synth')}
            className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${mode === 'synth' ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'text-slate-400 hover:text-white'}`}
        >
            Synthesizer
        </button>
        <button 
            onClick={() => setMode('game')}
            className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${mode === 'game' ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'text-slate-400 hover:text-white'}`}
        >
            Pitch Game
        </button>
      </div>

      {/* LEFT SIDE: Camera */}
      <div className="w-full md:w-1/2 h-screen p-8 border-r border-slate-800 flex flex-col items-center justify-center relative bg-black/20">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Conductor Input</h2>
        </div>
        
        {/* Only show the camera feed if we are in Synth Mode (since Game Mode doesn't use the hand) */}
        {mode === 'synth' ? (
             <HandTracker onYChange={setYPos} />
        ) : (
            <div className="text-slate-500 text-sm font-mono text-center">
                <p>Camera offline.</p>
                <p>Use your voice directly for the Pitch Game.</p>
            </div>
        )}
      </div>

      {/* RIGHT SIDE: Audio Processing or Game */}
      <div className="w-full md:w-1/2 h-screen p-8 flex flex-col items-center justify-center relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'synth' ? 'bg-purple-500' : 'bg-green-500'}`}></span>
            <h2 className={`text-[10px] font-black uppercase tracking-widest ${mode === 'synth' ? 'text-purple-500' : 'text-green-500'}`}>
                {mode === 'synth' ? 'Vocal Processor' : 'Pitch Analysis'}
            </h2>
        </div>
        
        {/* Toggle between the components based on the state */}
        {mode === 'synth' ? (
            <AudioRecorder yPosition={yPos} />
        ) : (
            <PitchGame />
        )}
      </div>

    </div>
  );
}

export default App;