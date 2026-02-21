import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const LERP_FACTOR = 0.06;

interface HandTrackerProps {
  onYChange: (y: number) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onYChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Store the model and timestamps in REFS
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastY = useRef<number>(0.5);

  const [isTracking, setIsTracking] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    const setupLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      
      landmarkerRef.current = handLandmarker;
      setIsModelLoaded(true);
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
    const video = videoRef.current;
    const model = landmarkerRef.current;

    if (model && video) {
      // Only process if it's a brand new video frame
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        
        const startTimeMs = performance.now();
        const results = model.detectForVideo(video, startTimeMs);
        
        if (results.landmarks.length > 0) { 
          const rawY = results.landmarks[0][8].y; 

          const smoothedY = lastY.current + (rawY - lastY.current) * LERP_FACTOR;
          lastY.current = smoothedY;

          onYChange(smoothedY);
        }
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
            className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-80" 
        />
        {!isTracking && <span className="text-slate-600 font-mono text-xs uppercase tracking-widest z-10">Camera Offline</span>}
      </div>

      {!isTracking && (
        <button 
          onClick={startWebcam}
          disabled={!isModelLoaded}
          className={`px-8 py-3 font-black uppercase tracking-widest rounded-xl transition-all ${
            isModelLoaded 
                ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black" 
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
          }`}
        >
          {isModelLoaded ? "Initialize Camera Link" : "Loading AI Core..."}
        </button>
      )}
    </div>
  );
};

export default HandTracker;