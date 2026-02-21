import { useState } from 'react';
import './App.css';
import AudioRecorder from './scripts/AudioRecorder';
import HandTracker from './scripts/HandTracker';
import KeyboardTracker from './scripts/KeyboardTracker';
import PitchGame from './scripts/PitchGame';

function App() {
  const [yPos, setYPos] = useState<number>(0.5);
  const [mode, setMode] = useState<'synth' | 'game'>('synth');
  const [inputMode, setInputMode] = useState<'camera' | 'keyboard'>('keyboard'); 

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-700 font-sans selection:bg-orange-100">
      
      {/* ELEGANT TOP NAVIGATION */}
      <header className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center backdrop-blur-md bg-white/60 border-b border-slate-100">
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gradient-to-tr from-orange-300 to-rose-300 rounded-full shadow-sm" />
            <h1 className="text-sm font-light tracking-[0.2em] uppercase text-slate-700"><span className="font-bold">Voca</span></h1>
        </div>

        <nav className="flex gap-8">
            <button 
                onClick={() => setMode('synth')}
                className={`text-[10px] uppercase tracking-[0.3em] transition-all pb-1 ${mode === 'synth' ? 'text-orange-500 font-bold border-b-2 border-orange-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Synthesizer
            </button>
            <button 
                onClick={() => setMode('game')}
                className={`text-[10px] uppercase tracking-[0.3em] transition-all pb-1 ${mode === 'game' ? 'text-emerald-500 font-bold border-b-2 border-emerald-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Training
            </button>
        </nav>
      </header>

      <main className="pt-24 flex flex-col md:flex-row h-screen overflow-hidden">
        
        {/* LEFT: CONDUCTOR SPACE */}
        <section className="w-full md:w-1/2 p-12 flex flex-col justify-center items-center relative">
            {mode === 'synth' && (
                <div className="absolute top-12 flex bg-slate-100 p-1 rounded-full shadow-inner">
                    {['keyboard', 'camera'].map((m) => (
                        <button
                            key={m}
                            onClick={() => setInputMode(m as any)}
                            className={`px-6 py-2 rounded-full text-[9px] uppercase tracking-widest transition-all ${inputMode === m ? 'bg-white text-slate-700 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-500'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}

            <div className="w-full max-w-lg transition-all duration-1000">
                {mode === 'synth' ? (
                    inputMode === 'camera' ? <HandTracker onYChange={setYPos} /> : <KeyboardTracker onYChange={setYPos} />
                ) : (
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl font-light text-slate-400 italic">Warm up your voice.</h3>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">No hands required for training mode.</p>
                    </div>
                )}
            </div>
        </section>

        {/* RIGHT: OUTPUT SPACE */}
        <section className="w-full md:w-1/2 p-12 bg-[#F8F7F5] flex flex-col justify-center items-center border-l border-slate-100">
            <div className="w-full max-w-md transition-all duration-1000">
                {mode === 'synth' ? <AudioRecorder yPosition={yPos} /> : <PitchGame />}
            </div>
        </section>

      </main>
    </div>
  );
}

export default App;