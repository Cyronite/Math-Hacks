import React, { useState } from 'react';
import HandTracker from './HandTracker';
import PitchTracker from './AudioRecorder';

const FrequencyLink: React.FC = () => {
  const [targetFrequency, setTargetFrequency] = useState<number>(440); // A4 frequency as default

  return (
    <div className="flex w-full h-screen">
      <div className="w-1/2 p-4 border-r border-slate-800">
        {/* SEND INFO TO TRACKER */}
        <HandTracker onYChange={(y) => {
          // Map Y position to a frequency - 0-1 currently, hand up = higher pitch
          const minFreq = 50;
          const maxFreq = 1000; // Maximum frequency
          const mappedFreq = minFreq + (1 - y) * (maxFreq - minFreq); // Invert Y for pitch mapping***
          setTargetFrequency(mappedFreq);
        }} 
        />
      </div>
      <div>
        <PitchTracker targetFrequency={targetFrequency} />
      </div>
    </div>
  )
}

export default FrequencyLink;