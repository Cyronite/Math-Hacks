import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface HandTrackerProps {
  onYChange: (y: number) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onYChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const setupLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/hand_landmarker.task", 
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1, // Changed to 1 so it focuses on your conducting hand
      });
      setLandmarker(handLandmarker);
    };

    setupLandmarker();
  }, []);

  const startWebcam = async () => {
    if (videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predict);
      setIsTracking(true);
    }
  };

  const predict = async () => {
    if (landmarker && videoRef.current) {
      const startTimeMs = performance.now();
      const results = landmarker.detectForVideo(videoRef.current, startTimeMs);
      
      if (results.landmarks.length > 0) { 
        const indexTipY = results.landmarks[0][8].y; // Y position of the index fingertip
        onYChange(indexTipY);
      }
    }
    requestAnimationFrame(predict);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="relative w-full aspect-video bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-[0_0_50px_rgba(6,182,212,0.1)] overflow-hidden flex items-center justify-center">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
        />
        {!isTracking && <span className="text-slate-600 font-mono text-xs uppercase tracking-widest z-10">Camera Offline</span>}
      </div>

      {!isTracking && (
        <button 
          onClick={startWebcam}
          className="px-8 py-3 bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest rounded-xl transition-all"
        >
          Initialize Camera Link
        </button>
      )}
    </div>
  );
};

export default HandTracker;