import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PitchDetector } from "pitchy";

interface PitchTrackerProps {
  yPosition?: number;
}

// Map the labels to actual frequencies (Hz)
const NOTE_TO_FREQ: Record<string, number> = {
  "High C": 523.25,
  "A": 440.00,
  "G": 392.00,
  "E": 329.63,
  "D": 293.66,
  "Middle C": 261.63,
  "Low A": 220.00,
  "Low G": 196.00,
  "Low E": 164.81,
  "Low D": 146.83,
  "Low C": 130.81,
};

const SCALE = [
  { val: 12, label: "High C" },
  { val: 9, label: "A" },
  { val: 7, label: "G" },
  { val: 4, label: "E" },
  { val: 2, label: "D" },
  { val: 0, label: "Middle C" },
  { val: -3, label: "Low A" },
  { val: -5, label: "Low G" },
  { val: -8, label: "Low E" },
  { val: -10, label: "Low D" },
  { val: -12, label: "Low C" },
];

const AudioRecorder: React.FC<PitchTrackerProps> = ({ yPosition = 0.5 }) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [activeNote, setActiveNote] = useState(SCALE[5]);

  const micRef = useRef<Tone.UserMedia | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const animationFrameRef = useRef<number>();

  const startProcessor = async () => {
    try {
      await Tone.start();
      const audioContext = Tone.getContext().rawContext as AudioContext;

      // 1. Setup Shifter - Smaller windowSize = less latency
      const shifter = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.05, 
      }).toDestination();
      pitchShiftRef.current = shifter;

      // 2. Setup Mic and Analyser for Pitch Detection
      const mic = new Tone.UserMedia();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      await mic.open();
      
      // Connection Chain: Mic -> Analyser (for detection) -> Shifter (for output)
      mic.connect(analyser);
      analyser.connect(shifter);
      
      micRef.current = mic;
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      
      setIsLive(true);
      beginPitchDetection();
    } catch (e) {
      console.error("Audio Start Error:", e);
      alert("Microphone access denied or AudioContext failed.");
    }
  };

  const beginPitchDetection = () => {
    const audioContext = Tone.getContext().rawContext as AudioContext;
    const inputBuffer = new Float32Array(detectorRef.current!.inputLength);

    const detect = () => {
      if (!analyserRef.current || !pitchShiftRef.current || !detectorRef.current) return;

      analyserRef.current.getFloatTimeDomainData(inputBuffer);
      const [pitch, clarity] = detectorRef.current.findPitch(inputBuffer, audioContext.sampleRate);

      // Only adjust if the sound is a clear vocal note (clarity > 80%)
      if (pitch > 0 && clarity > 0.8) {
        const targetFreq = NOTE_TO_FREQ[activeNote.label];
        // The magic formula: calculates semitone distance between sung pitch and target
        const semitoneDiff = 12 * Math.log2(targetFreq / pitch);
        
        // Apply correction smoothly
        pitchShiftRef.current.pitch = semitoneDiff;
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const stopProcessor = () => {
    if (micRef.current) {
      micRef.current.close();
      cancelAnimationFrame(animationFrameRef.current!);
      setIsLive(false);
    }
  };

  useEffect(() => {
    const safeY = isNaN(yPosition as number) ? 0.5 : (yPosition as number);
    const invertedY = 1 - safeY;
    let index = Math.floor(invertedY * SCALE.length);
    if (index < 0) index = 0;
    if (index >= SCALE.length) index = SCALE.length - 1;

    const targetNote = SCALE[index];
    if (targetNote.val !== activeNote.val) {
      setActiveNote(targetNote);
    }
  }, [yPosition, activeNote.val]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
        <div className="text-center mb-8">
          <div className="text-4xl font-mono font-bold text-white transition-all">
            {activeNote.label}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-2">
            Target Frequency: {NOTE_TO_FREQ[activeNote.label]}Hz
          </span>
        </div>

        <div className="h-48 w-full bg-slate-800/50 rounded-xl relative overflow-hidden border border-slate-700 mb-8 flex flex-col-reverse">
          {SCALE.map((note) => (
             <div 
               key={note.val}
               className={`flex-1 w-full border-t border-slate-700/30 transition-all duration-200 flex items-center justify-center
                 ${note.val === activeNote.val ? "bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] z-10" : "bg-transparent opacity-30"}
               `}
             >
                <span className={`text-[10px] font-mono ${note.val === activeNote.val ? "text-white font-bold" : "text-slate-600"}`}>
                    {note.val === activeNote.val ? note.label : ""}
                </span>
             </div>
          ))}
        </div>

        {!isLive ? (
          <button onClick={startProcessor} className="w-full py-4 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-500 hover:text-black text-purple-400 rounded-2xl font-black uppercase tracking-widest transition-all">
            Start Live Correction
          </button>
        ) : (
          <button onClick={stopProcessor} className="w-full py-4 bg-red-600/20 border border-red-500/50 hover:bg-red-500 hover:text-black text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all">
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;