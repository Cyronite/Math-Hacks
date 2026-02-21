import React, { useEffect, useRef, useState } from 'react';

// Focus on a clean 1-octave range for training
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
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.0);
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
    setScoreHistory([]);
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
      while (adjustedHz < targetNote.hz * 0.707) adjustedHz *= 2;
      while (adjustedHz > targetNote.hz * 1.414) adjustedHz /= 2;

      const centsOff = Math.abs(1200 * Math.log2(adjustedHz / targetNote.hz));
      let calculatedScore = centsOff <= 15 ? 100 : Math.max(0, 100 - (centsOff - 15));
      const finalScore = Math.round(calculatedScore);

      setScore(finalScore);
      setBestScore(prev => Math.max(prev, finalScore));
      setScoreHistory(prev => [...prev.slice(-49), finalScore]); 
    } else {
      setScore(0);
      setScoreHistory(prev => [...prev.slice(-49), 0]);
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
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50 relative overflow-hidden flex flex-col">
        
        {/* COMPACT ANALYTICS HEADER */}
        <div className="flex items-center justify-between mb-8 px-2">
            <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Stability</span>
                <div className="w-24 h-8 bg-slate-50 rounded-lg relative overflow-hidden border border-slate-100">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            points={scoreHistory.map((s, i) => `${(i / 50) * 96},${32 - (s * 0.25)}`).join(' ')}
                        />
                    </svg>
                </div>
            </div>
            <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Accuracy</span>
                <div className="text-2xl font-light text-emerald-500 leading-none">{averageScore}%</div>
            </div>
        </div>

        {/* MAIN GAME CONTENT */}
        <div className="text-center flex-1 py-4">
            {gameState === 'result' ? (
                <div className="animate-in fade-in zoom-in duration-500">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-4">Round Complete</p>
                    <div className="text-8xl font-light text-slate-700 mb-6">{bestScore}%</div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Peak Precision</p>
                </div>
            ) : (
                <>
                    <div className="mb-10">
                        <div className="text-7xl font-light text-slate-700 mb-2">{targetNote.label}</div>
                        <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-6">Target Frequency: {targetNote.hz.toFixed(1)} Hz</div>
                        {gameState === 'playing' && (
                            <button onClick={() => playReferencePitch(targetNote.hz)} className="px-5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold uppercase tracking-widest transition-colors border border-slate-100">
                                Replay Tone
                            </button>
                        )}
                    </div>

                    <div className="h-32 w-full bg-slate-50 rounded-3xl border border-slate-100 mb-8 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-400/10 transition-all duration-100 ease-out" style={{ height: `${score}%` }} />
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest relative z-10 mb-2">Live Matching</span>
                        <div className="text-4xl font-light text-slate-700 relative z-10">{score}%</div>
                    </div>
                </>
            )}
        </div>

        {/* CONTROLS & TIMER */}
        <div className="mt-4 space-y-4">
            {gameState === 'playing' && (
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 10) * 100}%` }} />
                </div>
            )}
            
            {gameState === 'idle' || gameState === 'result' ? (
                <button onClick={startRound} className="w-full py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all">
                    {gameState === 'result' ? 'Try Again' : 'Begin Exercise'}
                </button>
            ) : (
                <button onClick={endRound} className="w-full py-5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all">
                    Stop
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default PitchGame;