import React, { useState } from 'react';
import './App.css';
import AudioRecorder from './scripts/AudioRecorder';
import HandTracker from './scripts/HandTracker';

function App() {
  // target frequency derived from hand Y position (0 at top, 1 at bottom)
  const [targetFreq, setTargetFreq] = useState<number>(440);

  const handleYChange = (y: number) => {
    // invert Y so top of frame corresponds to higher pitch
    const minFreq = 80;
    const maxFreq = 1000;
    const freq = maxFreq - y * (maxFreq - minFreq);
    setTargetFreq(freq);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
      {/* hand tracker component renders video/button and reports Y changes */}
      <HandTracker onYChange={handleYChange} />

      {/* audio recorder/pitch tracker listens for target frequency updates */}
      <AudioRecorder targetFrequency={targetFreq} />
    </div>
  );
}

export default App;