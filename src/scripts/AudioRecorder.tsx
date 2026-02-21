import React, { useEffect, useRef, useState } from 'react';

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

const AudioRecorder: React.FC = () => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [targetNote, setTargetNote] = useState(SCALE[5]);
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
    <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50 text-center flex flex-col relative overflow-hidden">
      {/* Analytics Header */}
      <div className="flex justify-between items-center mb-10 px-2">
        <div className="text-left">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Stability</span>
          <div className="w-20 h-6 bg-slate-50 rounded border border-slate-100 relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <polyline fill="none" stroke="#fb923c" strokeWidth="1.5" points={scoreHistory.map((s, i) => `${(i / 50) * 80},${24 - (s * 0.2)}`).join(' ')} />
            </svg>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Accuracy</span>
          <div className="text-2xl font-light text-orange-500">{averageScore}%</div>
        </div>
      </div>

      <div className="flex-1">
        {gameState === 'result' ? (
          <div className="py-6">
            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mb-4">Round Complete</p>
            <div className="text-8xl font-light text-slate-700 mb-6">{bestScore}%</div>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Peak Accuracy</p>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em] mb-2 block">Match This Pitch</span>
              <div className="text-8xl font-light text-slate-700 tracking-tighter">{targetNote.label}</div>
              {gameState === 'playing' && (
                <button onClick={() => playReferencePitch(targetNote.hz)} className="mt-6 px-5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border border-slate-100">
                  Hear Tone
                </button>
              )}
            </div>

            <div className="h-32 w-full bg-slate-50 rounded-3xl border border-slate-100 mb-10 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-orange-400/10 transition-all duration-100" style={{ height: `${score}%` }} />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest relative z-10 mb-2">Voice Accuracy</span>
                <div className="text-4xl font-light text-slate-700 relative z-10">{score}%</div>
            </div>
          </>
        )}
      </div>

      {/* Progress & Start */}
      <div className="space-y-4">
        {gameState === 'playing' && (
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 10) * 100}%` }} />
            </div>
        )}
        <button 
          onClick={gameState === 'playing' ? endRound : startRound}
          className={`w-full py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] transition-all border ${
            gameState === 'playing' 
            ? "border-rose-100 text-rose-500 bg-rose-50/50 hover:bg-rose-50" 
            : "bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100"
          }`}
        >
          {gameState === 'playing' ? "Stop" : gameState === 'result' ? "Try Again" : "Begin Exercise"}
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;