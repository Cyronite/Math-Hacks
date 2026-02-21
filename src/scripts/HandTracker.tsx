import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// The smoothing factor for the camera.
const LERP_FACTOR = 0.06;

interface HandTrackerProps {
  onYChange: (y: number) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onYChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 }); 
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastY = useRef<number>(0.5);
  const lastX = useRef<number>(0.5); 
  const reqFrameRef = useRef<number>(0);

  // --- MEDIAPIPE AI SETUP ---
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
    };

    setupLandmarker();
    return () => cancelAnimationFrame(reqFrameRef.current);
  }, []);

  // --- CAMERA CONTROLS ---
  const startWebcam = async () => {
    if (videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predict);
      setIsTracking(true);
    }
  };

  const predict = () => {
    if (landmarkerRef.current && videoRef.current) {
      const startTimeMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      if (results.landmarks && results.landmarks.length > 0) { 
        const rawY = results.landmarks[0][8].y; 
        const rawX = results.landmarks[0][8].x; 

        // LERPING for smooth glass orb movement
        const smoothedY = lastY.current + (rawY - lastY.current) * LERP_FACTOR;
        const smoothedX = lastX.current + (rawX - lastX.current) * LERP_FACTOR; 
        
        lastY.current = smoothedY;
        lastX.current = smoothedX;
        
        setCursorPos({ x: smoothedX, y: smoothedY }); 
        onYChange(smoothedY);
      }
    }
    reqFrameRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      {/* Soft, white, rounded container with gentle shadow */}
      <div className="relative w-full aspect-video bg-white rounded-3xl border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.03)] overflow-hidden flex items-center justify-center">
        
        {/* Softened, desaturated aesthetic video feed */}
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-1000 saturate-50 opacity-40 mix-blend-multiply ${isTracking ? 'block' : 'hidden'}`} 
        />
        
        {/* Aesthetic Glass Orb Visualizer */}
        {isTracking && (
          <div 
            className="absolute w-12 h-12 bg-white/40 backdrop-blur-md rounded-full border border-white/80 shadow-lg pointer-events-none z-20"
            style={{ 
              left: `${(1 - cursorPos.x) * 100}%`, // 1 - x because the video is mirrored!
              top: `${cursorPos.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}

        {!isTracking && <span className="text-slate-400 font-mono text-xs uppercase tracking-widest z-10">Camera Offline</span>}

      </div>

      {!isTracking && (
        <button 
          onClick={startWebcam}
          className="px-8 py-3 bg-white text-orange-400 border border-slate-100 shadow-sm hover:shadow-md hover:text-orange-500 text-[10px] font-bold uppercase tracking-[0.3em] rounded-full transition-all"
        >
          Initialize Camera
        </button>
      )}
    </div>
  );
};

export default HandTracker;