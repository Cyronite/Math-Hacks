import React, { useState } from 'react';
import './App.css';
import AudioRecorder from './scripts/AudioRecorder';
import HandTracker from './scripts/HandTracker';

function App() {
  const [pitchShift, setPitchShift] = useState<number>(0);

  const handleYChange = (y: number) => {
    // Top of frame = +12 semitones (chipmunk)
    // Bottom of frame = -12 semitones (demon)
    const shift = ((1 - y) * 24) - 12;
    setPitchShift(shift);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 gap-8 p-8">
      <HandTracker onYChange={handleYChange} />
      <AudioRecorder pitchShiftAmount={pitchShift} />
    </div>
  );
}

export default App;