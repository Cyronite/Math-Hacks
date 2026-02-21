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
  return sampleRate / maxpos;
}

const PitchGame: React.FC = () => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [targetNote, setTargetNote] = useState(SCALE[5]);
  const [currentHz, setCurrentHz] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  
  // NEW: Tracking performance over time
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const reqFrameRef = useRef<number>(0);

  const playReferencePitch = (hz: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle'; 
    osc.frequency.value = hz;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.5);
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      endRound();
    }
  }, [gameState, timeLeft]);

  const startRound = async () => {
    const randomNote = SCALE[Math.floor(Math.random() * SCALE.length)];
    setTargetNote(randomNote);
    setScore(0);
    setBestScore(0);
    setTimeLeft(10);
    setScoreHistory([]); // Reset history
    setCurrentHz(0);

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
        alert("Mic access denied");
        return;
      }
    }
    setGameState('playing');
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
      let calculatedScore = centsOff <= 15 ? 100 : Math.max(0, 100 - (centsOff - 15));
      const finalScore = Math.round(calculatedScore);

      setScore(finalScore);
      setBestScore(prev => Math.max(prev, finalScore));
      setScoreHistory(prev => [...prev.slice(-100), finalScore]); // Keep last 100 frames
    } else {
      setScore(0);
      setScoreHistory(prev => [...prev.slice(-100), 0]);
    }

    reqFrameRef.current = requestAnimationFrame(detectPitch);
  };

  const endRound = () => {
    setGameState('result');
    cancelAnimationFrame(reqFrameRef.current);
  };

  const averageScore = scoreHistory.length > 0 
    ? Math.round(scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length) 
    : 0;

  return (
    <div className="flex flex-row items-stretch gap-8 w-full max-w-5xl mx-auto p-6">
      
      {/* LEFT SIDE: DYNAMIC EVALUATION MENU */}
      <div className="w-72 bg-white rounded-[40px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col transition-all duration-500">
        <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-8">Performance Analytics</h3>
        
        {/* Live Accuracy Meter */}
        <div className="mb-10">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Avg. Accuracy</span>
            <div className="text-4xl font-light text-emerald-500">{averageScore}%</div>
            <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${averageScore}%` }} />
            </div>
        </div>

        {/* Real-time Percentage Graph */}
        <div className="flex-1 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Pitch Stability</span>
            <div className="flex-1 w-full bg-slate-50/50 rounded-2xl relative overflow-hidden border border-slate-50">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        points={scoreHistory.map((s, i) => `${(i / 100) * 280},${80 - (s * 0.6)}`).join(' ')}
                        className="transition-all duration-75"
                    />
                </svg>
                {scoreHistory.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-300 uppercase font-bold tracking-widest">
                        Waiting for Signal
                    </div>
                )}
            </div>
            <p className="text-[9px] text-slate-300 italic mt-4 leading-relaxed">
                Graph represents the precision of your vocal frequency match over the last 100 frames.
            </p>
        </div>
      </div>

      {/* RIGHT SIDE: MAIN GAME */}
      <div className="flex-1 bg-white rounded-[40px] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50 relative overflow-hidden text-center flex flex-col justify-center">
        
        {gameState === 'playing' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-50">
                <div className="h-full bg-emerald-400 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 10) * 100}%` }} />
            </div>
        )}

        {gameState === 'result' ? (
            <div className="my-10">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-4">Session Result</p>
                <div className="text-8xl font-light text-slate-700 mb-6">{bestScore}%</div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Target: {targetNote.label}</p>
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
                        <button onClick={() => playReferencePitch(targetNote.hz)} className="px-6 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-100">
                            Play Reference Pitch
                        </button>
                    )}
                </div>

                <div className="h-40 w-full bg-slate-50 rounded-3xl border border-slate-100 mb-10 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-100 transition-all duration-100 ease-out" style={{ height: `${score}%` }} />
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest relative z-10 mb-2">Live Accuracy</span>
                    <div className="text-4xl font-light text-slate-700 relative z-10">{score}%</div>
                </div>
            </>
        )}

        <div className="mt-auto">
            {gameState === 'idle' || gameState === 'result' ? (
                <button onClick={startRound} className="w-full py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all">
                    {gameState === 'result' ? 'Restart Session' : 'Begin Exercise'}
                </button>
            ) : (
                <button onClick={endRound} className="w-full py-5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all">
                    End Session
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default PitchGame;