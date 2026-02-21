import React, { useEffect, useRef, useState } from 'react';

// Scale and Hz Calculations
const SCALE = [
  { val: 12, label: "High C" }, { val: 9, label: "A" }, { val: 7, label: "G" },
  { val: 4, label: "E" }, { val: 2, label: "D" }, { val: 0, label: "Middle C" },
  { val: -3, label: "Low A" }, { val: -5, label: "Low G" }, { val: -8, label: "Low E" },
  { val: -10, label: "Low D" }, { val: -12, label: "Low C" },
].map(note => ({
  ...note,
  hz: 261.63 * Math.pow(2, note.val / 12)
}));

// Autocorrelation algorithm (Extracts Hz from mic data)
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
  }

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  return sampleRate / T0;
}

const PitchGame: React.FC = () => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [targetNote, setTargetNote] = useState(SCALE[5]);
  const [currentHz, setCurrentHz] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const reqFrameRef = useRef<number>(0);

  // --- PLAY REFERENCE PITCH ---
  const playReferencePitch = (hz: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle'; // Triangle waves are easier for the human ear to pitch-match than pure sine waves apparently...
    osc.frequency.value = hz;
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Smooth volume envelope (prevents clicking sounds)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.5);
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      endRound();
    }
  }, [gameState, timeLeft]);

  // --- GAME LOOP ---
  const startRound = async () => {
    const randomNote = SCALE[Math.floor(Math.random() * SCALE.length)];
    setTargetNote(randomNote);
    setScore(0);
    setBestScore(0);
    setTimeLeft(10);
    setCurrentHz(0);

    cancelAnimationFrame(reqFrameRef.current);

    if (!audioCtxRef.current) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (e) {
        console.error("Mic access denied", e);
        alert("Need mic access to detect your pitch!");
        return;
      }
    } else if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
    }

    setGameState('playing');
    
    // Instantly play the note so the user can hear it!
    setTimeout(() => playReferencePitch(randomNote.hz), 100); 
    
    detectPitch();
  };

  const detectPitch = () => {
    if (!analyserRef.current || !audioCtxRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    const hz = autoCorrelate(buffer, audioCtxRef.current.sampleRate);

    if (hz > -1) {
      setCurrentHz(hz);
      const diff = Math.abs(hz - targetNote.hz);
      
      let calculatedScore = 100;
      if (diff > 3) {
        calculatedScore = Math.max(0, 100 - (diff - 3));
      }
      
      const finalScore = Math.round(calculatedScore);
      setScore(finalScore);
      setBestScore(prev => Math.max(prev, finalScore));
    } else {
      setScore(prev => Math.max(0, prev - 5));
    }

    reqFrameRef.current = requestAnimationFrame(detectPitch);
  };

  const endRound = () => {
    setGameState('result');
    // We ONLY stop the loop. We do NOT suspend the audio context anymore!
    cancelAnimationFrame(reqFrameRef.current);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(reqFrameRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.1)] text-center relative overflow-hidden">
        
        {gameState === 'playing' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
                <div 
                    className="h-full bg-green-500 transition-all duration-1000 ease-linear" 
                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                />
            </div>
        )}

        <h2 className="text-xl font-black text-green-400 uppercase tracking-widest mb-2 mt-2">
            Pitch Match
        </h2>
        
        {gameState === 'result' ? (
            <div className="my-12">
                <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">Final Accuracy</p>
                <div className={`text-8xl font-black mb-4 ${bestScore >= 90 ? 'text-green-400' : bestScore >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {bestScore}%
                </div>
                <p className="text-slate-500 text-sm font-mono">
                    Target was {targetNote.label} ({targetNote.hz.toFixed(1)} Hz)
                </p>
            </div>
        ) : (
            <>
                <p className="text-slate-400 text-xs mb-8">
                    {gameState === 'playing' ? `Time remaining: ${timeLeft}s` : "Sing the note shown below."}
                </p>

                <div className="mb-4">
                    <span className="text-sm text-slate-500 uppercase font-bold tracking-widest">Target Note</span>
                    <div className="text-6xl font-mono font-black text-white my-2">{targetNote.label}</div>
                    <div className="text-sm text-green-500/80 font-mono mb-4">Target: {targetNote.hz.toFixed(1)} Hz</div>
                    
                    {/* NEW PLAY REFERENCE BUTTON */}
                    {gameState === 'playing' && (
                        <button 
                            onClick={() => playReferencePitch(targetNote.hz)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors mb-4 border border-slate-700 hover:border-slate-500"
                        >
                            🔊 Hear Pitch
                        </button>
                    )}
                </div>

                <div className="h-32 w-full bg-slate-800/50 rounded-xl border border-slate-700 mb-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-green-500/20 transition-all duration-100 ease-out"
                        style={{ height: `${score}%` }}
                    />
                    
                    <span className="text-sm text-slate-400 uppercase tracking-widest relative z-10">Current Pitch</span>
                    <div className={`text-4xl font-mono font-bold relative z-10 transition-colors ${score > 90 ? 'text-green-400' : 'text-white'}`}>
                        {currentHz > 0 ? `${currentHz.toFixed(1)} Hz` : "--- Hz"}
                    </div>
                    <div className="text-sm font-black text-white mt-2 relative z-10">
                        Accuracy: {score}% <span className="text-green-400 ml-2">(Best: {bestScore}%)</span>
                    </div>
                </div>
            </>
        )}

        {gameState === 'idle' || gameState === 'result' ? (
          <button 
            onClick={startRound} 
            className="w-full py-4 bg-green-600/20 border border-green-500/50 hover:bg-green-500 hover:text-black text-green-400 rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            {gameState === 'result' ? 'Play Again' : 'Start Round'}
          </button>
        ) : (
          <button 
            onClick={endRound} 
            className="w-full py-4 bg-red-600/20 border border-red-500/50 hover:bg-red-500 hover:text-black text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            End Early
          </button>
        )}
      </div>
    </div>
  );
};

export default PitchGame;