import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PitchDetector } from "pitchy";

interface PitchTrackerProps {
  yPosition?: number;
}

// 1. STATISTICAL DATA: Song Timeline
const SONG_TIMELINE = [
  { start: 0, end: 4, lyrics: "DATA POINTS FALLING" },
  { start: 4, end: 8, lyrics: "STOCHASTIC RESONANCE" },
  { start: 8, end: 12, lyrics: "PROBABLY ON KEY" },
  { start: 12, end: 16, lyrics: "MEAN REVERSION" },
];

const NOTE_TO_FREQ: Record<string, number> = {
  "High C": 523.25, "A": 440.00, "G": 392.00, "E": 329.63,
  "D": 293.66, "Middle C": 261.63, "Low A": 220.00, "Low G": 196.00,
};

const SCALE = [
  { label: "High C" }, { label: "A" }, { label: "G" }, { label: "E" },
  { label: "D" }, { label: "Middle C" }, { label: "Low A" }, { label: "Low G" },
];

const AudioRecorder: React.FC<PitchTrackerProps> = ({ yPosition = 0.5 }) => {
  const [isLive, setIsLive] = useState(false);
  const [currentLyric, setCurrentLyric] = useState("ANALYZING...");
  const [activeNote, setActiveNote] = useState(SCALE[5]);
  const [confidence, setConfidence] = useState(0); // P(Success)

  const micRef = useRef<Tone.UserMedia | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const animationFrameRef = useRef<number>();

  // SYNC HAND TO UI
  useEffect(() => {
    const invertedY = 1 - (yPosition || 0.5);
    let index = Math.floor(invertedY * SCALE.length);
    index = Math.max(0, Math.min(index, SCALE.length - 1));
    setActiveNote(SCALE[index]);
  }, [yPosition]);

  const startPerformance = async () => {
    await Tone.start();
    const audioContext = Tone.getContext().rawContext as AudioContext;
    
    // Setup Stochastic Processor
    const shifter = new Tone.PitchShift({ pitch: 0, windowSize: 0.04 }).toDestination();
    pitchShiftRef.current = shifter;

    const mic = new Tone.UserMedia();
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    
    await mic.open();
    mic.connect(analyser);
    analyser.connect(shifter);
    
    detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
    micRef.current = mic;

    Tone.Transport.start();
    setIsLive(true);
    tick();
  };

  const tick = () => {
    if (!detectorRef.current || !analyserRef.current) return;

    // 1. STATISTICAL CLOCK: Update Lyrics
    const time = Tone.Transport.seconds % 16; 
    const section = SONG_TIMELINE.find(s => time >= s.start && time < s.end);
    if (section) setCurrentLyric(section.lyrics);

    // 2. PROBABILITY ANALYSIS: Detect Pitch
    const inputBuffer = new Float32Array(detectorRef.current!.inputLength);
    analyserRef.current.getFloatTimeDomainData(inputBuffer);
    const [pitch, clarity] = detectorRef.current.findPitch(inputBuffer, (Tone.getContext().rawContext as AudioContext).sampleRate);

    setConfidence(Math.round(clarity * 100));

    // 3. CORRECTION: Only if P(Correct) > 80%
    if (pitch > 0 && clarity > 0.8) {
      const targetFreq = NOTE_TO_FREQ[activeNote.label];
      const targetShift = 12 * Math.log2(targetFreq / pitch);
      
      const currentShift = pitchShiftRef.current!.pitch;
      pitchShiftRef.current!.pitch = currentShift + (targetShift - currentShift) * 0.15;
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const stopProcessor = () => {
    micRef.current?.close();
    setIsLive(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900/50 rounded-3xl p-8 border border-cyan-500/20 shadow-2xl backdrop-blur-md">
      <div className="mb-8 text-center">
        <h1 className="text-[10px] tracking-[.4em] text-cyan-400 font-bold mb-4 uppercase opacity-60">Probabilistic Vocal Engine</h1>
        <div className="text-4xl font-black text-white italic tracking-tighter h-12 leading-none uppercase">{currentLyric}</div>
      </div>

      {/* P(Success) Meter */}
      <div className="w-full mb-8 space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-cyan-400/70">
          <span>STATISTICAL_CONFIDENCE</span>
          <span>{confidence}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-75" 
            style={{ width: `${confidence}%` }}
          ></div>
        </div>
      </div>

      {/* Hand Tracker Note Display */}
      <div className="w-full bg-black/40 p-6 rounded-2xl border border-white/5 mb-8 relative overflow-hidden">
        <div className="flex justify-between items-end h-12 gap-1.5">
          {SCALE.map((n) => (
            <div 
              key={n.label}
              className={`flex-1 transition-all duration-500 rounded-sm ${n.label === activeNote.label ? 'bg-cyan-500 h-full shadow-[0_0_20px_rgba(6,182,212,0.6)]' : 'bg-white/10 h-1/4'}`}
            />
          ))}
        </div>
        <div className="mt-4 text-center font-mono text-[10px] text-cyan-400 uppercase tracking-widest">
            Hand Target: {activeNote.label}
        </div>
      </div>

      {!isLive ? (
        <button onClick={startPerformance} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-all shadow-lg shadow-cyan-900/20">
          START ANALYSIS
        </button>
      ) : (
        <button onClick={stopProcessor} className="w-full py-4 bg-red-900/20 border border-red-500/50 text-red-500 font-black rounded-xl">
          STOP
        </button>
      )}
    </div>
  );
};

export default AudioRecorder;