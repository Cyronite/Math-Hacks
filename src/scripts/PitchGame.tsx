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
    
    // Wake up context if the browser put it to sleep
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle'; 
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

      let adjustedHz = hz;
      const lowerBound = targetNote.hz * 0.707; 
      const upperBound = targetNote.hz * 1.414; 

      while (adjustedHz < lowerBound) adjustedHz *= 2;
      while (adjustedHz > upperBound) adjustedHz /= 2;

      const centsOff = Math.abs(1200 * Math.log2(adjustedHz / targetNote.hz));

      let calculatedScore = 0;
      if (centsOff <= 15) {
        calculatedScore = 100;
      } else if (centsOff < 100) {
        calculatedScore = Math.max(0, 100 - (centsOff - 15));
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
    cancelAnimationFrame(reqFrameRef.current);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(reqFrameRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50 relative overflow-hidden text-center">
        
        {/* TIMER BAR */}
        {gameState === 'playing' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-50">
                <div 
                    className="h-full bg-emerald-400 transition-all duration-1000 ease-linear" 
                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                />
            </div>
        )}

        {gameState === 'result' ? (
            <div className="my-16">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-4">Final Accuracy</p>
                <div className="text-8xl font-light text-slate-700 mb-6">
                    {bestScore}%
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">
                    Target: {targetNote.label} <span className="text-[10px] block mt-2 text-slate-300">({targetNote.hz.toFixed(1)} Hz)</span>
                </p>
            </div>
        ) : (
            <>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-8">
                    {gameState === 'playing' ? `${timeLeft} Seconds Left` : "Ear Training"}
                </p>

                <div className="mb-8">
                    <div className="text-7xl font-light text-slate-700 mb-2">{targetNote.label}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-6">{targetNote.hz.toFixed(1)} Hz</div>
                    
                    {gameState === 'playing' && (
                        <button 
                            onClick={() => playReferencePitch(targetNote.hz)}
                            className="px-6 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-100"
                        >
                            Play Reference Pitch
                        </button>
                    )}
                </div>

                {/* VISUALIZER BOX */}
                <div className="h-40 w-full bg-slate-50 rounded-3xl border border-slate-100 mb-10 flex flex-col items-center justify-center relative overflow-hidden">
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-emerald-100 transition-all duration-100 ease-out"
                        style={{ height: `${score}%` }}
                    />
                    
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest relative z-10 mb-2">Live Pitch</span>
                    <div className="text-4xl font-light text-slate-700 relative z-10">
                        {currentHz > 0 ? `${currentHz.toFixed(1)} Hz` : "---"}
                    </div>
                    {currentHz > 0 && (
                        <div className="text-[10px] font-bold text-emerald-600 mt-2 relative z-10 uppercase tracking-widest">
                            Match: {score}%
                        </div>
                    )}
                </div>
            </>
        )}

        {/* BUTTONS */}
        {gameState === 'idle' || gameState === 'result' ? (
          <button 
            onClick={startRound} 
            className="w-full py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all"
          >
            {gameState === 'result' ? 'Train Again' : 'Begin Exercise'}
          </button>
        ) : (
          <button 
            onClick={endRound} 
            className="w-full py-5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all"
          >
            End Early
          </button>
        )}
      </div>
    </div>
  );
};

export default PitchGame;