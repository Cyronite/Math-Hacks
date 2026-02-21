import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PitchDetector } from "pitchy";

interface PitchTrackerProps { yPosition?: number; }

// 1. DATA: Note and Lyrics Timeline
const SONG_TIMELINE = [
  { start: 0, end: 4, note: "C4", lyrics: "DATA POINTS FALLING" },
  { start: 4, end: 8, note: "G4", lyrics: "STOCHASTIC RESONANCE" },
  { start: 8, end: 12, note: "A4", lyrics: "PROBABLY ON KEY" },
  { start: 12, end: 16, note: "G4", lyrics: "MEAN REVERSION" },
];

const NOTE_TO_FREQ: Record<string, number> = {
  "High C": 523.25, "A": 440.00, "G": 392.00, "E": 329.63,
  "D": 293.66, "Middle C": 261.63, "Low A": 220.00, "Low G": 196.00,
};

const SCALE = [{ label: "High C" }, { label: "A" }, { label: "G" }, { label: "E" }, { label: "D" }, { label: "Middle C" }, { label: "Low A" }, { label: "Low G" }];

const AudioRecorder: React.FC<PitchTrackerProps> = ({ yPosition = 0.5 }) => {
  const [isLive, setIsLive] = useState(false);
  const [currentLyric, setCurrentLyric] = useState("PRESS START");
  const [activeNote, setActiveNote] = useState(SCALE[5]);
  const [confidence, setConfidence] = useState(0);

  const micRef = useRef<Tone.UserMedia | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null); // TO HEAR THE SONG
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const invertedY = 1 - (yPosition || 0.5);
    let index = Math.floor(invertedY * SCALE.length);
    index = Math.max(0, Math.min(index, SCALE.length - 1));
    setActiveNote(SCALE[index]);
  }, [yPosition]);

  const startPerformance = async () => {
    try {
      // FORCE AUDIO CONTEXT START
      await Tone.start();
      console.log("Audio Context Started");

      const audioContext = Tone.getContext().rawContext as AudioContext;
      
      // 1. Modified Voice Path
      const shifter = new Tone.PitchShift({ pitch: 0, windowSize: 0.05 }).toDestination();
      pitchShiftRef.current = shifter;

      // 2. Song Playback Synth (So you hear the guide)
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({ volume: -12, oscillator: { type: "triangle" } });
      synthRef.current = synth;

      // 3. Mic Input
      const mic = new Tone.UserMedia();
      const analyser = audioContext.createAnalyser();
      
      await mic.open();
      mic.connect(analyser);
      analyser.connect(shifter); // Your shifted voice goes to speakers
      
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      micRef.current = mic;

      // Reset and Start Clock
      Tone.Transport.cancel();
      Tone.Transport.seconds = 0;
      Tone.Transport.start();
      
      setIsLive(true);
      tick();
    } catch (err) {
      console.error("Start Error:", err);
    }
  };

  const tick = () => {
    if (!detectorRef.current || !pitchShiftRef.current) return;

    const time = Tone.Transport.seconds % 16; 
    const section = SONG_TIMELINE.find(s => time >= s.start && time < s.end);

    if (section) {
      if (currentLyric !== section.lyrics) {
        setCurrentLyric(section.lyrics);
        // Play the guide note so you hear it in headphones
        synthRef.current?.triggerAttackRelease(section.note, "4n");
      }

      // GET MIC DATA
      const inputBuffer = new Float32Array(detectorRef.current!.inputLength);
      const audioContext = Tone.getContext().rawContext as AudioContext;
      const analyser = (micRef.current as any)._node.context.createAnalyser(); // Safety fallback
      
      // Pitch Detection & Correction
      const [pitch, clarity] = detectorRef.current.findPitch(inputBuffer, audioContext.sampleRate);
      setConfidence(Math.round(clarity * 100));

      if (pitch > 0 && clarity > 0.8) {
        const targetFreq = NOTE_TO_FREQ[activeNote.label];
        const targetShift = 12 * Math.log2(targetFreq / pitch);
        pitchShiftRef.current.pitch += (targetShift - pitchShiftRef.current.pitch) * 0.15;
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-8 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
      <div className="text-center mb-6">
        <h2 className="text-cyan-400 font-mono text-[10px] tracking-widest mb-2">STOCHASTIC_VOCAL_LINK</h2>
        <div className="text-3xl font-black text-white italic h-10">{currentLyric}</div>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-cyan-500 transition-all duration-75" style={{ width: `${confidence}%` }}></div>
      </div>

      <div className="w-full bg-black/50 p-6 rounded-xl border border-white/10 mb-8">
        <div className="flex items-end justify-between h-12 gap-1">
            {SCALE.map(s => (
                <div key={s.label} className={`flex-1 ${s.label === activeNote.label ? 'bg-cyan-500 h-full' : 'bg-white/5 h-1/4'}`} />
            ))}
        </div>
        <p className="text-center mt-4 font-mono text-xs text-cyan-400">HAND POSITION: {activeNote.label}</p>
      </div>

      {!isLive ? (
        <button onClick={startPerformance} className="w-full py-4 bg-cyan-600 text-white font-black rounded-xl animate-pulse">
          INITIALIZE ANALYSIS
        </button>
      ) : (
        <div className="text-red-500 font-bold text-xs tracking-tighter">PROCESSING STREAMS...</div>
      )}
    </div>
  );
};

export default AudioRecorder;