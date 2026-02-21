import React, { useEffect, useRef, useState } from 'react';

const PitchTracker: React.FC = () => {
  const [pitch, setPitch] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [volumeThreshold, setVolumeThreshold] = useState<number>(0.02);
  const [clarity, setClarity] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const bufRef = useRef<Float32Array>(new Float32Array(2048));

  const currentPitchYIN = (buffer: Float32Array, sampleRate: number) => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    setVolume(rms);

    if (rms < volumeThreshold) return 0;

    const size = buffer.length / 2;
    const yinBuffer = new Float32Array(size);
    for (let t = 0; t < size; t++) {
      for (let i = 0; i < size; i++) {
        const delta = buffer[i] - buffer[i + t];
        yinBuffer[t] += delta * delta;
      }
    }

    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let t = 1; t < size; t++) {
      runningSum += yinBuffer[t];
      yinBuffer[t] *= t / runningSum;
    }

    let tau = -1;
    for (let t = 1; t < size; t++) {
      if (yinBuffer[t] < 0.15) {
        tau = t;
        break;
      }
    }

    if (tau === -1) return 0;
    setClarity(1 - yinBuffer[tau]);
    return sampleRate / tau;
  };

  const update = () => {
    if (analyserRef.current && audioCtxRef.current) {
      analyserRef.current.getFloatTimeDomainData(bufRef.current);
      const freq = currentPitchYIN(bufRef.current, audioCtxRef.current.sampleRate);
      setPitch(freq > 50 && freq < 1200 ? Math.round(freq) : 0);
    }
    requestAnimationFrame(update);
  };

  const startMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    
    const source = ctx.createMediaStreamSource(stream);
    
    // 1. Setup Filter (Cuts off high-end hiss above 2000Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2000; 
    filterRef.current = filter;

    // 2. Setup Analyser (For Math)
    analyserRef.current = ctx.createAnalyser();
    
    // 3. Setup Monitor Gain (For Playback)
    const gain = ctx.createGain();
    gain.gain.value = 0; 
    monitorGainRef.current = gain;

    // --- ROUTING ---
    // Source -> Analyser (Clean signal for accurate pitch detection)
    source.connect(analyserRef.current);
    
    // Source -> Filter -> Gain -> Destination (Filtered signal for your ears)
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    update();
  };

  const toggleMonitor = () => {
    if (monitorGainRef.current && audioCtxRef.current) {
      const newStatus = !isMonitoring;
      setIsMonitoring(newStatus);
      monitorGainRef.current.gain.setTargetAtTime(newStatus ? 1 : 0, audioCtxRef.current.currentTime, 0.05);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Studio Monitor</span>
            <span className={`text-[10px] font-bold ${isMonitoring ? 'text-red-400 animate-pulse' : 'text-slate-600'}`}>
              {isMonitoring ? "● LIVE" : "○ MUTED"}
            </span>
          </div>
          <button 
            onClick={toggleMonitor}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isMonitoring ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-800 text-slate-400'}`}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </button>
        </div>

        <div className="mb-8">
          <div className="text-8xl font-mono font-bold tracking-tighter text-white">
            {pitch > 0 ? pitch : "---"}
            <span className="text-xl text-slate-700 ml-2">Hz</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
             <div 
               className="h-full bg-cyan-500 transition-all duration-150" 
               style={{ width: `${Math.min((pitch / 1000) * 100, 100)}%`, opacity: pitch > 0 ? 1 : 0 }}
             />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Sensitivity Gate</span>
              <span>{(volumeThreshold * 100).toFixed(1)}%</span>
            </div>
            <input 
              type="range" min="0" max="0.1" step="0.001" 
              value={volumeThreshold} 
              onChange={(e) => setVolumeThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-xl border border-white/5">
             <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${volume > volumeThreshold ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-slate-700'}`}
                  style={{ width: `${Math.min(volume * 500, 100)}%` }}
                />
             </div>
             <span className="text-[10px] font-mono text-slate-500">INPUT</span>
          </div>
        </div>

        {!audioCtxRef.current && (
          <button 
            onClick={startMic} 
            className="mt-8 w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-900/20"
          >
            Power On Systems
          </button>
        )}
      </div>
      <p className="mt-6 text-slate-600 text-[10px] uppercase tracking-widest font-bold italic">
        Warning: Use headphones to avoid audio feedback loops
      </p>
    </div>
  );
};

export default PitchTracker;